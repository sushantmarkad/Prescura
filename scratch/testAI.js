const { extractPrescriptionData } = require('../backend/src/services/aiService');

async function test() {
  try {
    // using a dummy image URL for now
    const dummyImage = 'https://upload.wikimedia.org/wikipedia/commons/3/30/Handwritten_Prescription.jpg';
    const result = await extractPrescriptionData(dummyImage, false);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
