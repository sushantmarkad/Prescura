const diseasePredictionService = require('../services/diseasePredictionService');
const OpenAI = require('openai');

let openai = null;
if (process.env.AI_API_KEY && process.env.MOCK_AI !== 'true') {
  try {
    openai = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: process.env.AI_API_KEY,
      timeout: 60000,
    });
  } catch (e) {
    console.warn('[ChatbotController] OpenAI client init warning:', e.message);
  }
}

// Medical disclaimer constant
const MEDICAL_DISCLAIMER = "⚠️ Important Medical Notice: This AI Symptom Checker is an automated triage tool trained on clinical reference data. It does not replace professional medical advice, clinical diagnosis, or emergency care. If you are experiencing chest pain, difficulty breathing, sudden numbness, or severe trauma, please seek immediate emergency medical care.";

// Generate rich conversational clinical response
function generateDeterministicBotResponse(predictionResult, userMessage) {
  if (!predictionResult.matched) {
    return {
      text: "I couldn't identify specific medical symptoms from your message. Could you please describe what you are feeling in more detail (for example: *fever, headache, vomiting, skin rash, chest pain*), or tap from the quick symptom options below?",
      disclaimer: MEDICAL_DISCLAIMER
    };
  }

  const top = predictionResult.topPrediction;
  const triage = predictionResult.triage;
  const symNames = predictionResult.reportedSymptoms.map(s => s.label).join(', ');

  let statusHeader = `### Clinical Triage Assessment: **${top.disease}** (${top.confidence}% Match)`;
  if (triage.hasEmergency) {
    statusHeader = `🚨 **URGENT EMERGENCY ALERT**: Your symptoms indicate high-risk indicators (${triage.label}). While pattern correlates with **${top.disease}**, please consult an emergency healthcare department immediately.`;
  }

  let precautionsSection = "";
  if (top.precautions && top.precautions.length > 0) {
    precautionsSection = `\n\n**🛡️ Recommended Care & Precautions:**\n` + top.precautions.map(p => `• ${p.charAt(0).toUpperCase() + p.slice(1)}`).join('\n');
  }

  let followUpSection = "";
  if (predictionResult.followUpSuggestions && predictionResult.followUpSuggestions.length > 0) {
    const suggestions = predictionResult.followUpSuggestions.map(s => s.label).join(', ');
    followUpSection = `\n\n**🔍 Further Assessment:** To refine the diagnosis, do you also experience: **${suggestions}**?`;
  }

  const fullText = `${statusHeader}\n\n**Symptoms Analyzed:** ${symNames}\n\n**Clinical Overview:**\n${top.description}${precautionsSection}${followUpSection}`;

  return {
    text: fullText,
    disclaimer: MEDICAL_DISCLAIMER
  };
}

// Controller Methods
const getSymptomsList = (req, res) => {
  try {
    const popular = diseasePredictionService.getPopularSymptoms();
    const all = diseasePredictionService.getAllSymptoms();
    return res.status(200).json({
      success: true,
      popular,
      all
    });
  } catch (error) {
    console.error('[ChatbotController] Error fetching symptoms:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve symptoms list' });
  }
};

const predictCondition = (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms || (!Array.isArray(symptoms) && typeof symptoms !== 'string')) {
      return res.status(400).json({ success: false, error: 'symptoms must be an array of symptom IDs or a string' });
    }

    const result = diseasePredictionService.predict(symptoms);
    return res.status(200).json({
      success: true,
      data: result,
      disclaimer: MEDICAL_DISCLAIMER
    });
  } catch (error) {
    console.error('[ChatbotController] Error predicting condition:', error);
    return res.status(500).json({ success: false, error: 'Prediction error' });
  }
};

const handleChatMessage = async (req, res) => {
  try {
    const { message, activeSymptoms = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    // 1. Detect new symptoms from user message
    const detectedFromMsg = diseasePredictionService.extractSymptomsFromText(message);
    
    // 2. Merge with any existing active symptoms
    const combinedSymptomIds = Array.from(new Set([
      ...activeSymptoms.map(s => (typeof s === 'string' ? s : s.id)),
      ...detectedFromMsg
    ]));

    // 3. Run prediction engine
    const predictionResult = diseasePredictionService.predict(combinedSymptomIds);

    // 4. Generate conversational reply
    let botReplyText = '';
    let usedLLM = false;

    // AI LLM enhancement using active AI key for detailed clinical guidance
    if (openai && predictionResult.matched) {
      try {
        const top = predictionResult.topPrediction;
        const triage = predictionResult.triage;
        const symList = predictionResult.reportedSymptoms.map(s => s.label).join(', ');
        const modelName = process.env.AI_MODEL || "meta/llama-3.2-11b-vision-instruct";

        const systemPrompt = `You are Prescura AI, an expert, compassionate clinical triage assistant.
The patient reported symptoms: ${symList}.

Our clinical reference dataset has evaluated this case:
- Primary Correlated Condition: ${top.disease} (${top.confidence}% confidence match)
- Clinical Triage Urgency: ${triage.label} (Level: ${triage.level})
- Dataset Clinical Overview: ${top.description}
- Official Precautions: ${top.precautions.join('; ')}
${predictionResult.followUpSuggestions?.length ? `- Follow-up Symptoms to inquire about: ${predictionResult.followUpSuggestions.map(s => s.label).join(', ')}` : ''}

CRITICAL INSTRUCTIONS FOR YOUR DETAILED RESPONSE:
1. **Empathy & Identification**: Acknowledge their symptoms with compassion and clearly explain how their reported symptoms link to ${top.disease}.
2. **Clinical Overview**: Explain the underlying mechanism of ${top.disease} in clear, patient-friendly terms.
3. **Recommended Medical Next Steps**: Suggest common diagnostic tests a doctor might order (e.g., blood tests, imaging, physical exams) to confirm or rule it out.
4. **Care & Precautions (Do's & Don'ts)**: Integrate the official precautions (${top.precautions.join(', ')}) into practical home-care, hydration, and dietary advice.
5. **Red Flag Warnings**: Clearly highlight emergency red-flag symptoms that warrant immediate emergency medical care.
${predictionResult.followUpSuggestions?.length ? `6. **Refinement Question**: Gently ask if they are experiencing any of: ${predictionResult.followUpSuggestions.map(s => s.label).join(', ')}.` : ''}

Tone: Warm, professional, structured with clear markdown headings and bullet points.`;

        const completionPromise = openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          max_tokens: 350,
          temperature: 0.3
        });

        // Strict 6.5s timeout so user NEVER gets stuck waiting
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('LLM call timed out after 6.5s')), 6500)
        );

        const completion = await Promise.race([completionPromise, timeoutPromise]);

        const reply = completion.choices?.[0]?.message?.content;
        if (reply && reply.trim().length > 0) {
          botReplyText = reply.trim();
          usedLLM = true;
        }
      } catch (llmErr) {
        console.warn('[ChatbotController] Fast fallback triggered:', llmErr.message);
      }
    }

    // Fallback if LLM was skipped or failed
    if (!botReplyText) {
      const fallback = generateDeterministicBotResponse(predictionResult, message);
      botReplyText = fallback.text;
    }

    return res.status(200).json({
      success: true,
      reply: botReplyText,
      prediction: predictionResult,
      activeSymptoms: predictionResult.reportedSymptoms || [],
      disclaimer: MEDICAL_DISCLAIMER,
      usedLLM
    });

  } catch (error) {
    console.error('[ChatbotController] Chat handler error:', error);
    return res.status(500).json({
      success: false,
      reply: "I encountered an issue analyzing your symptoms. Please try selecting your symptoms directly or rephrasing your message.",
      disclaimer: MEDICAL_DISCLAIMER
    });
  }
};

module.exports = {
  getSymptomsList,
  predictCondition,
  handleChatMessage
};
