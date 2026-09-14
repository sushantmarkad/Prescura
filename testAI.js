require('dotenv').config({path: 'backend/.env'});
const { extractPrescriptionData } = require('./backend/src/services/aiService');

async function test() {
  try {
    // using a dummy image URL for now
    const dummyImage = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Example_of_a_medical_prescription_in_the_UK.jpg/800px-Example_of_a_medical_prescription_in_the_UK.jpg';
    const result = await extractPrescriptionData(dummyImage, false);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
