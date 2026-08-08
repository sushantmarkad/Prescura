const { extractPrescriptionData } = require('../services/aiService');
const { evaluateCriteria } = require('../services/auditEngine');
const { v4: uuidv4 } = require('uuid');

async function processPrescription(req, res) {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Process the image using AI service
    const extractedData = await extractPrescriptionData(imageUrl);
    
    // Evaluate deterministic criteria via Audit Engine
    const auditResults = evaluateCriteria(extractedData);

    const auditId = `audit-${uuidv4()}`;

    // Return the result
    return res.status(200).json({
      success: true,
      auditId,
      extractedData,
      auditResults,
      status: 'PENDING_REVIEW'
    });

  } catch (error) {
    console.error('Error processing prescription:', error);
    return res.status(500).json({ 
      error: 'Failed to process prescription. Please try again.' 
    });
  }
}

module.exports = {
  processPrescription
};
