const { extractPrescriptionData } = require('../services/aiService');
const { evaluateCriteria } = require('../services/auditEngine');
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

async function processPrescription(req, res) {
  try {
    const { imageUrl, userId } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Process the image using AI service
    const extractedData = await extractPrescriptionData(imageUrl);
    
    // Evaluate deterministic criteria via Audit Engine
    const auditResults = evaluateCriteria(extractedData);

    const auditId = `audit-${uuidv4()}`;

    // Save as PENDING in database so it shows up on dashboard
    if (userId) {
      if (!db) {
        throw new Error('Firebase Database (db) is null. This means FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS is not properly set on your Render backend!');
      }
      
      await db.collection('prescriptions').doc(auditId).set({
        imageUrl,
        extractedData,
        auditResults,
        status: 'PENDING_REVIEW',
        finalClassification: 'PENDING',
        finalizedBy: userId,
        createdAt: new Date(),
      });
    }

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
      error: 'Failed to process prescription. Please try again.',
      details: error.message || String(error)
    });
  }
}

module.exports = {
  processPrescription
};
