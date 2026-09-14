require('dotenv').config();
const { extractPrescriptionData } = require('./src/services/aiService');

async function test() {
  try {
    // 1x1 black pixel base64
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const result = await extractPrescriptionData(dataUrl, false);
    console.log("Model Output Keys:", Object.keys(result[0]?.audit || {}));
  } catch (err) {
    console.error(err);
  }
}

test();
