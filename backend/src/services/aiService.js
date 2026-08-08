const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini SDK
// Note: API key is loaded from process.env.AI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || 'mock-key');

const EXTRACTION_PROMPT = `
You are an expert AI medical assistant specializing in prescription analysis.
Your task is to extract structured information from the provided prescription image.

Extract the following information:
1. PATIENT: Name, UHID/IPD/OPD number, Age, Gender, Weight.
2. PRESCRIBER: Doctor name, Registration number, Signature present (true/false), Department/unit.
3. PRESCRIPTION: Date, Time, Diagnosis, Investigations, Follow-up, Patient instructions.
4. MEDICINES: For every medicine extract:
   - rawText: The exact text written
   - genericName: Possible generic name
   - brandName: Brand name if present
   - strength: Dosage strength
   - dosageForm: Form (tablet, syrup, etc.)
   - dose: Amount to take
   - route: Route of administration
   - frequency: How often
   - duration: How long
   - quantity: Total quantity
   - indication: Indication if available

Provide confidence scores for important fields. If handwriting is unclear, do NOT guess. Set the status to "UNCLEAR". If a field is not present, set it to "NOT_FOUND".

Return the output STRICTLY as a JSON object matching this structure:
{
  "patientInfo": { "name": { "value": "", "confidence": 1.0, "status": "DETECTED|UNCLEAR|NOT_FOUND" }, ... },
  "prescriberInfo": { ... },
  "prescriptionDetails": { ... },
  "medicines": [ { "rawText": { "value": "", "confidence": 1.0, "status": "DETECTED|UNCLEAR|NOT_FOUND" }, ... } ]
}
`;

async function extractPrescriptionData(imageUrl) {
  // Mock logic to save API costs during development
  if (process.env.MOCK_AI === 'true') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          patientInfo: {
            name: { value: "John Doe", confidence: 0.99, status: "DETECTED" },
            identifier: { value: "OPD-9901", confidence: 0.95, status: "DETECTED" },
            age: { value: "45", confidence: 0.98, status: "DETECTED" },
            gender: { value: "M", confidence: 0.99, status: "DETECTED" },
            weight: { value: null, confidence: 0, status: "NOT_FOUND" }
          },
          prescriberInfo: {
            name: { value: "Dr. Gregory House", confidence: 0.95, status: "DETECTED" },
            registrationNumber: { value: "MMC-12345", confidence: 0.92, status: "DETECTED" },
            signaturePresent: { value: true, confidence: 0.99, status: "DETECTED" },
            department: { value: "Internal Medicine", confidence: 0.9, status: "DETECTED" }
          },
          prescriptionDetails: {
            date: { value: "2024-10-25", confidence: 0.95, status: "DETECTED" },
            time: { value: null, confidence: 0, status: "NOT_FOUND" },
            diagnosis: { value: "Gastritis", confidence: 0.85, status: "DETECTED" }
          },
          medicines: [
            {
              rawText: { value: "Pantoprazole 40mg OD x 5 days", confidence: 0.98, status: "DETECTED" },
              genericName: { value: "Pantoprazole", confidence: 0.95, status: "DETECTED" },
              dose: { value: "40mg", confidence: 0.98, status: "DETECTED" },
              frequency: { value: "OD", confidence: 0.95, status: "DETECTED" },
              duration: { value: "5 days", confidence: 0.95, status: "DETECTED" }
            }
          ]
        });
      }, 2000); // 2 second delay to simulate processing
    });
  }

  try {
    // Real implementation: Fetch image from URL and pass to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    // Fetch the image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    const imageParts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType
        }
      }
    ];
    
    const result = await model.generateContent([EXTRACTION_PROMPT, ...imageParts]);
    const aiResponse = await result.response;
    let text = aiResponse.text();
    
    // Clean markdown if present (though responseMimeType should handle it)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Extraction Error:", error);
    throw error;
  }
}

module.exports = {
  extractPrescriptionData
};
