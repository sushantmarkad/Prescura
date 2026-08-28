const OpenAI = require('openai');

// Initialize OpenAI SDK for NVIDIA
const openai = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.AI_API_KEY || 'mock-key',
});

const EXTRACTION_PROMPT = `
You are an expert Clinical Pharmacologist and Quality Manager performing a strict NABH (6th Edition) Prescription Audit.
Your task is to analyze the provided prescription image/PDF and evaluate it against the 34 NABH parameters.

For EVERY parameter (A1 to F4), you must output "YES" or "NO".
If a parameter is completely missing, unreadable, or not applicable but required, output "NO".
For each parameter, provide a brief 1-sentence evidence string explaining your choice (e.g. "Detected 'Dr. Smith'" or "No diagnosis written").

Section A: Patient Identification
A1: UHID/IPD/OPD Number mentioned
A2: Patient Name mentioned
A3: Age mentioned
A4: Gender mentioned
A5: Weight documented (where applicable - default YES if adult and not required, but NO if pediatric/chemo and missing)
A6: Date and time of prescription (Must have BOTH date and time for YES)

Section B: Prescriber Identification
B1: Doctor's name clearly mentioned
B2: Registration number mentioned
B3: Signature present
B4: Department/unit mentioned

Section C: Medication Order Completeness (Evaluate across all medicines)
C1: Generic name used (NO if only brand names are used)
C2: Drug strength mentioned
C3: Dosage form specified (tablet, syrup, etc.)
C4: Dose clearly written
C5: Route mentioned
C6: Frequency mentioned
C7: Duration mentioned
C8: Indication documented (where applicable)
C9: Allergy status documented (YES if 'No known allergies' or specific allergies listed. NO if completely blank)
C10: High-risk medicine appropriately identified

Section D: NABH Medication Safety Parameters
D1: Prescription legible (YES if you can read everything easily, NO if handwriting is terrible)
D2: Capital letters used for handwritten orders (YES if written in block letters, NO if cursive/lowercase handwriting. YES if printed/EMR)
D3: Dangerous abbreviations avoided (NO if using U, IU, q.d., etc.)
D4: Decimal errors absent (NO if missing leading zero or using trailing zero)
D5: Leading zero used (e.g., 0.5 mg instead of .5 mg)
D6: Trailing zero avoided (e.g., 5 mg instead of 5.0 mg)
D7: Look-Alike Sound-Alike (LASA) precautions followed (YES if no obvious LASA confusion)

Section E: Rational Prescribing Indicators
E1: Drug from hospital formulary (Assume YES unless obviously obscure)
E2: Antibiotic prescribed rationally (Assume YES unless obviously inappropriate)
E3: Polypharmacy (>5 drugs) avoided (YES if 5 or fewer drugs, NO if 6 or more)
E4: Duplication of therapy absent (YES if no two drugs are in same exact class)
E5: Potential drug interactions absent (YES if no obvious severe interactions)
E6: Dose appropriate for age/renal/hepatic status (Assume YES unless obviously wrong)
E7: Monitoring instructions documented (YES if 'come back in X days' or 'check BP' is written)

Section F: Documentation Quality
F1: Diagnosis documented
F2: Relevant investigation findings available
F3: Follow-up advice documented
F4: Patient instructions documented (e.g., take after food)

Also extract the Patient's Name as a raw string so we can display it on the UI.

Return the output STRICTLY as a JSON array containing one object for each prescription found in the document. Even if there is only one prescription, return it inside an array matching this structure:
[
  {
  "patientName": "John Doe",
  "audit": {
    "A1": { "answer": "YES", "evidence": "..." },
    "A2": { "answer": "YES", "evidence": "..." },
    "A3": { "answer": "YES", "evidence": "..." },
    "A4": { "answer": "YES", "evidence": "..." },
    "A5": { "answer": "YES", "evidence": "..." },
    "A6": { "answer": "YES", "evidence": "..." },
    "B1": { "answer": "YES", "evidence": "..." },
    "B2": { "answer": "YES", "evidence": "..." },
    "B3": { "answer": "YES", "evidence": "..." },
    "B4": { "answer": "YES", "evidence": "..." },
    "C1": { "answer": "YES", "evidence": "..." },
    "C2": { "answer": "YES", "evidence": "..." },
    "C3": { "answer": "YES", "evidence": "..." },
    "C4": { "answer": "YES", "evidence": "..." },
    "C5": { "answer": "YES", "evidence": "..." },
    "C6": { "answer": "YES", "evidence": "..." },
    "C7": { "answer": "YES", "evidence": "..." },
    "C8": { "answer": "YES", "evidence": "..." },
    "C9": { "answer": "YES", "evidence": "..." },
    "C10": { "answer": "YES", "evidence": "..." },
    "D1": { "answer": "YES", "evidence": "..." },
    "D2": { "answer": "YES", "evidence": "..." },
    "D3": { "answer": "YES", "evidence": "..." },
    "D4": { "answer": "YES", "evidence": "..." },
    "D5": { "answer": "YES", "evidence": "..." },
    "D6": { "answer": "YES", "evidence": "..." },
    "D7": { "answer": "YES", "evidence": "..." },
    "E1": { "answer": "YES", "evidence": "..." },
    "E2": { "answer": "YES", "evidence": "..." },
    "E3": { "answer": "YES", "evidence": "..." },
    "E4": { "answer": "YES", "evidence": "..." },
    "E5": { "answer": "YES", "evidence": "..." },
    "E6": { "answer": "YES", "evidence": "..." },
    "E7": { "answer": "YES", "evidence": "..." },
    "F1": { "answer": "YES", "evidence": "..." },
    "F2": { "answer": "YES", "evidence": "..." },
    "F3": { "answer": "YES", "evidence": "..." },
    "F4": { "answer": "YES", "evidence": "..." }
  }
}
]
`;

async function extractPrescriptionData(imageUrl) {
  if (process.env.MOCK_AI === 'true') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            patientName: "Shivaam Varpe (Mock)",
            audit: {
              "A1": { answer: "NO", evidence: "No UHID found" },
              "A2": { answer: "YES", evidence: "Name Shivaam Varpe detected" },
              "C1": { answer: "NO", evidence: "Brand names like Pan used" },
              "D1": { answer: "YES", evidence: "Handwriting is mostly legible" }
            }
          }
        ]);
      }, 2000);
    });
  }

  try {
    let fetchUrl = imageUrl;
    let mimeType = 'image/jpeg';
    
    // Support PDF natively by checking the extension
    if (fetchUrl.toLowerCase().endsWith('.pdf')) {
      mimeType = 'application/pdf';
    }

    const response = await fetch(fetchUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const completion = await openai.chat.completions.create({
      model: "meta/llama-3.2-11b-vision-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      max_tokens: 4096
    });
    
    let text = completion.choices[0].message.content;
    
    const startIndex = text.indexOf('[');
    const endIndex = text.lastIndexOf(']');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      text = text.substring(startIndex, endIndex + 1);
    } else {
      // Fallback if no brackets found (though the prompt explicitly asks for an array)
      text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Extraction Error:", error);
    throw error;
  }
}

module.exports = {
  extractPrescriptionData
};
