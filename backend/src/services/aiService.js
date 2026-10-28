const OpenAI = require('openai');

// Initialize OpenAI SDK for NVIDIA
const openai = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.AI_API_KEY || 'mock-key',
  timeout: 60000, // 60s timeout to prevent hanging forever
});

// NOTE: Keep this prompt 100% ASCII. Unicode emoji (e.g. warning signs, dashes)
// can corrupt multi-part API payloads and cause the model to return empty responses.
const BASE_PROMPT = `You are an expert Clinical Pharmacologist and Quality Manager performing a strict NABH (6th Edition) Prescription Audit.
Your task is to analyze the provided prescription image and evaluate it against all 34 NABH parameters.

CRITICAL INSTRUCTIONS:
1. Return EXACTLY ONE object inside a JSON array: [{ "patientName": "...", "audit": { ... } }]. Do NOT output multiple objects.
2. For EVERY parameter (A1 to F4), output "YES" or "NO".
3. For each parameter, provide an extremely short evidence string of 2 to 6 words (e.g. "Doctor name visible" or "No diagnosis written"). Keep it strictly under 6 words.
4. Do NOT use double quotes or brackets inside evidence strings.
5. Return ONLY the raw JSON array. Start with [ and end with ]. No markdown backticks, no notes, no extra text.

Section A: Patient Identification
A1: UHID/IPD/OPD Number mentioned
A2: Patient Name mentioned
A3: Age mentioned (HINT: Often written together with gender, e.g. "41/M" or "41 M" under Sex/Age. If you see a number like 41 next to M/F, count it as YES for Age).
A4: Gender mentioned (HINT: Often written as M, F, Male, Female. If you see "41/M", count it as YES for Gender).
A5: Weight documented (default YES if adult and not required; NO if pediatric/chemo and missing)
A6: Date and time of prescription (BOTH date AND time required for YES)

Section B: Prescriber Identification
B1: Doctor's name clearly mentioned
B2: Registration number mentioned
B3: Signature present
B4: Department/unit mentioned

Section C: Medication Order Completeness (evaluate across all medicines)
C1: Generic name used (NO if only brand names are used)
C2: Drug strength mentioned
C3: Dosage form specified (tablet, syrup, injection, etc.)
C4: Dose clearly written
C5: Route mentioned
C6: Frequency mentioned
C7: Duration mentioned
C8: Indication documented (where applicable)
C9: Allergy status documented (YES if "No known allergies" or specific allergies listed; NO if completely blank)
C10: High-risk medicine appropriately identified

Section D: NABH Medication Safety Parameters
D1: Prescription legible (YES if you can read everything clearly; NO if handwriting is very difficult to read)
D2: Capital letters used for handwritten orders (YES if block letters; NO if cursive/lowercase. YES if printed/EMR)
D3: Dangerous abbreviations avoided (NO if using U, IU, q.d., etc.)
D4: Decimal errors absent
D5: Leading zero used (e.g. 0.5 mg instead of .5 mg)
D6: Trailing zero avoided (e.g. 5 mg instead of 5.0 mg)
D7: Look-Alike Sound-Alike (LASA) precautions followed

Section E: Rational Prescribing Indicators
E1: Drug from hospital formulary (assume YES unless obviously obscure)
E2: Antibiotic prescribed rationally (assume YES unless obviously inappropriate)
E3: Polypharmacy (more than 5 drugs) avoided (YES if 5 or fewer drugs; NO if 6 or more)
E4: Duplication of therapy absent
E5: Potential drug interactions absent
E6: Dose appropriate for age/renal/hepatic status (assume YES unless obviously wrong)
E7: Monitoring instructions documented

Section F: Documentation Quality
F1: Diagnosis documented (HINT: Look for handwritten text next to "Diagnosis:" e.g. "Acral vitiligo")
F2: Relevant investigation findings available
F3: Follow-up advice documented (HINT: Look closely at the bottom for "F/W", "next visit", "review on", or dates).
F4: Patient instructions documented (e.g. take after food)

Also extract the patient name as a raw string for display on the UI.

Return ONLY a valid JSON array. No markdown, no explanation, no reasoning text. Start with [ and end with ].

Format:
[
  {
    "patientName": "John Doe",
    "audit": {
      "A1": { "answer": "YES", "evidence": "UHID 12345 found at top of form" },
      "A2": { "answer": "YES", "evidence": "Patient name John Doe detected" },
      "A3": { "answer": "YES", "evidence": "Age 45 years stated" },
      "A4": { "answer": "YES", "evidence": "Gender M detected" },
      "A5": { "answer": "YES", "evidence": "Adult patient, weight not required" },
      "A6": { "answer": "NO", "evidence": "Date present but no time written" },
      "B1": { "answer": "YES", "evidence": "Dr. Smith name present" },
      "B2": { "answer": "NO", "evidence": "No registration number found" },
      "B3": { "answer": "YES", "evidence": "Signature visible at bottom" },
      "B4": { "answer": "YES", "evidence": "Department: Cardiology written" },
      "C1": { "answer": "YES", "evidence": "Generic names used throughout" },
      "C2": { "answer": "YES", "evidence": "Strengths listed for all drugs" },
      "C3": { "answer": "YES", "evidence": "Tab, Cap, Inj forms specified" },
      "C4": { "answer": "YES", "evidence": "Doses clearly written" },
      "C5": { "answer": "NO", "evidence": "Route not mentioned for any drug" },
      "C6": { "answer": "YES", "evidence": "Frequency written for all drugs" },
      "C7": { "answer": "YES", "evidence": "Duration specified" },
      "C8": { "answer": "NO", "evidence": "No indication documented" },
      "C9": { "answer": "NO", "evidence": "Allergy field blank" },
      "C10": { "answer": "YES", "evidence": "No high-risk medicines identified" },
      "D1": { "answer": "YES", "evidence": "Prescription is printed and legible" },
      "D2": { "answer": "YES", "evidence": "Printed prescription, not handwritten" },
      "D3": { "answer": "YES", "evidence": "No dangerous abbreviations found" },
      "D4": { "answer": "YES", "evidence": "No decimal errors detected" },
      "D5": { "answer": "YES", "evidence": "Leading zeros used correctly" },
      "D6": { "answer": "YES", "evidence": "No trailing zeros found" },
      "D7": { "answer": "YES", "evidence": "No LASA confusion detected" },
      "E1": { "answer": "YES", "evidence": "All drugs are common formulary items" },
      "E2": { "answer": "YES", "evidence": "No irrational antibiotic use" },
      "E3": { "answer": "YES", "evidence": "Only 4 drugs prescribed" },
      "E4": { "answer": "YES", "evidence": "No duplicate therapy found" },
      "E5": { "answer": "YES", "evidence": "No major interactions detected" },
      "E6": { "answer": "YES", "evidence": "Doses appear appropriate" },
      "E7": { "answer": "NO", "evidence": "No monitoring instructions written" },
      "F1": { "answer": "NO", "evidence": "Diagnosis not documented" },
      "F2": { "answer": "NO", "evidence": "No investigation findings noted" },
      "F3": { "answer": "NO", "evidence": "No follow-up advice given" },
      "F4": { "answer": "NO", "evidence": "No patient instructions written" }
    }
  }
]`;

// Injected when the image has been privacy-masked by the user
const MASKING_ADDENDUM = `

IMPORTANT - PRIVACY MASKING NOTE:
Some regions of this image have been deliberately blacked out (redacted) by hospital staff before sending to you. These appear as solid dark/black rectangular boxes, sometimes with the word "REDACTED" printed on them. This was done intentionally to protect patient personal information (PII).

Rules for handling masked regions:
1. If you see a dark redacted box where a patient field label is visible (e.g. the label "Patient's Full Name:" or "Name:" is visible but the content next to it is blacked out), treat that parameter as YES. The field EXISTS on the form; only its content was hidden for privacy.
2. If a field label is NOT visible and the area is completely blacked out with no context, treat it as NO.
3. Do NOT penalize the prescription for having redacted boxes. These are a deliberate privacy control measure.
4. For patientName: if the name is in a redacted box, return "[Redacted]" as the patientName value.
5. Continue evaluating ALL other non-masked sections (medications, prescriber details, etc.) normally.`;

async function extractPrescriptionData(imageUrl, privacyMasked = false) {
  if (process.env.MOCK_AI === 'true') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            patientName: privacyMasked ? "[Redacted]" : "Shivaam Varpe (Mock)",
            audit: {
              "A1": { answer: "NO",  evidence: "No UHID found on prescription" },
              "A2": { answer: privacyMasked ? "YES" : "YES", evidence: privacyMasked ? "Patient name field present; content redacted for privacy" : "Name Shivaam Varpe detected" },
              "A3": { answer: "YES", evidence: "Age 45 years stated" },
              "A4": { answer: "YES", evidence: "Gender M detected" },
              "A5": { answer: "YES", evidence: "Adult patient, weight field not required" },
              "A6": { answer: "NO",  evidence: "Date present but no time written" },
              "B1": { answer: "YES", evidence: "Doctor name detected" },
              "B2": { answer: "NO",  evidence: "No registration number found" },
              "B3": { answer: "YES", evidence: "Signature visible at bottom" },
              "B4": { answer: "YES", evidence: "Department General Medicine noted" },
              "C1": { answer: "NO",  evidence: "Brand name Pan used instead of generic Pantoprazole" },
              "C2": { answer: "YES", evidence: "Strengths listed for all drugs" },
              "C3": { answer: "YES", evidence: "Tablet form specified" },
              "C4": { answer: "YES", evidence: "Doses clearly written" },
              "C5": { answer: "NO",  evidence: "Route not mentioned" },
              "C6": { answer: "YES", evidence: "Frequency written for all drugs" },
              "C7": { answer: "YES", evidence: "Duration specified" },
              "C8": { answer: "NO",  evidence: "No indication documented" },
              "C9": { answer: "NO",  evidence: "Allergy field blank" },
              "C10":{ answer: "YES", evidence: "No high-risk medicines" },
              "D1": { answer: "YES", evidence: "Handwriting is mostly legible" },
              "D2": { answer: "NO",  evidence: "Cursive handwriting used" },
              "D3": { answer: "YES", evidence: "No dangerous abbreviations" },
              "D4": { answer: "YES", evidence: "No decimal errors" },
              "D5": { answer: "YES", evidence: "Leading zeros used" },
              "D6": { answer: "YES", evidence: "No trailing zeros" },
              "D7": { answer: "YES", evidence: "No LASA confusion" },
              "E1": { answer: "YES", evidence: "Common formulary drugs" },
              "E2": { answer: "YES", evidence: "No irrational antibiotics" },
              "E3": { answer: "YES", evidence: "5 drugs prescribed" },
              "E4": { answer: "YES", evidence: "No duplication" },
              "E5": { answer: "YES", evidence: "No major interactions" },
              "E6": { answer: "YES", evidence: "Doses appropriate" },
              "E7": { answer: "NO",  evidence: "No monitoring instructions" },
              "F1": { answer: "NO",  evidence: "Diagnosis not documented" },
              "F2": { answer: "NO",  evidence: "No investigation findings" },
              "F3": { answer: "NO",  evidence: "No follow-up advice" },
              "F4": { answer: "NO",  evidence: "No patient instructions" },
            }
          }
        ]);
      }, 2000);
    });
  }

  try {
    let fetchUrl = imageUrl;
    // Optimize Cloudinary image delivery: limit dimensions to max 1200px width and auto compress to JPEG for fast vision inference
    if (fetchUrl.includes('cloudinary.com') && fetchUrl.includes('/upload/')) {
      if (fetchUrl.toLowerCase().endsWith('.pdf')) {
        fetchUrl = fetchUrl.replace('/upload/', '/upload/w_1200,c_limit,q_auto/').replace(/\.pdf$/i, '.jpg');
      } else {
        fetchUrl = fetchUrl.replace('/upload/', '/upload/w_1200,c_limit,q_auto/');
      }
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);

    let mimeType = 'image/jpeg';
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.startsWith('image/')) {
      mimeType = contentType.split(';')[0].trim();
    } else if (fetchUrl.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Build prompt: inject masking addendum if the user redacted any regions
    let prompt = privacyMasked ? BASE_PROMPT + MASKING_ADDENDUM : BASE_PROMPT;
    prompt += `\n\nCRITICAL: You MUST include all keys in the "audit" object, from "A1" through "F4". Do not skip ANY parameter.`;

    console.log(`[AI] Processing prescription. privacyMasked=${privacyMasked}, imageSize=${buffer.length} bytes`);

    const modelName = process.env.AI_MODEL || "meta/llama-3.2-11b-vision-instruct";
    console.log(`[AI] Calling model: ${modelName}`);

    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.1, // Low temperature = deterministic, follows instructions better
    });

    let text = completion.choices[0]?.message?.content || '';
    console.log('[AI] Raw response length:', text.length, 'chars');

    const parsedArray = safeParseAuditArray(text);
    console.log(`[AI] Parsed ${parsedArray.length} prescription(s) successfully`);
    return parsedArray;
  } catch (error) {
    console.error('[AI] Extraction Error:', error.message);
    throw error;
  }
}

function safeParseAuditArray(rawText) {
  if (!rawText) return [];

  // 1. Strip markdown fences and whitespace
  let clean = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // Helper to repair common LLM JSON defects (trailing commas, control chars)
  const tryParse = (str) => {
    try {
      return JSON.parse(str);
    } catch (_) {
      try {
        const fixed = str
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/[\u0000-\u001F]+/g, ' ');
        return JSON.parse(fixed);
      } catch (e) {
        return null;
      }
    }
  };

  // Try direct parse first
  let result = tryParse(clean);
  if (result) return Array.isArray(result) ? result : [result];

  // 2. Extract JSON array [ ... ]
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = clean.substring(firstBracket, lastBracket + 1);
    result = tryParse(candidate);
    if (result) return Array.isArray(result) ? result : [result];
  }

  // 3. Fallback: extract single JSON object { ... }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = clean.substring(firstBrace, lastBrace + 1);
    result = tryParse(candidate);
    if (result) return Array.isArray(result) ? result : [result];
  }

  console.warn('[AI] All JSON parse attempts failed. Snippet:', clean.substring(0, 300));
  return [];
}

module.exports = { extractPrescriptionData };
