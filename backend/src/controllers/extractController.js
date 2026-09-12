const { extractPrescriptionData } = require('../services/aiService');
const { evaluateCriteria } = require('../services/auditEngine');
const { db } = require('../config/firebase');
const { clearCache } = require('../services/dbService');
const { v4: uuidv4 } = require('uuid');

/**
 * When privacyMasked=true, the user deliberately redacted patient PII on the image.
 * The AI may still return NO for those fields because it cannot read the dark box.
 * Post-process: override A2 (patient name) to YES when it was masked.
 */
function applyPrivacyMaskingOverrides(auditResults, privacyMasked) {
  if (!privacyMasked) return auditResults;

  const result = { ...auditResults };

  // A2 = Patient Name — most commonly masked field
  if (result['A2'] && result['A2'].finalAnswer === 'NO') {
    result['A2'] = {
      ...result['A2'],
      aiAnswer: 'YES',
      finalAnswer: 'YES',
      evidence: 'Patient name field present on prescription; content redacted for privacy before AI processing.',
      reviewStatus: 'PENDING',
    };
  }

  return result;
}

async function processPrescription(req, res) {
  try {
    const { imageUrl, userId, privacyMasked = false } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Pass privacyMasked to AI service so it adjusts prompt accordingly
    const extractedDataArray = await extractPrescriptionData(imageUrl, privacyMasked);

    let dataArray = Array.isArray(extractedDataArray) ? extractedDataArray : [extractedDataArray];

    // If AI returned empty array, still create an audit record
    if (dataArray.length === 0) {
      dataArray = [{}];
    }

    const savedAudits = [];

    for (const extractedData of dataArray) {
      let auditResults = evaluateCriteria(extractedData);

      // Override masked patient identification fields
      auditResults = applyPrivacyMaskingOverrides(auditResults, privacyMasked);

      const auditId = `audit-${uuidv4()}`;

      if (userId) {
        if (!db) {
          throw new Error('Firebase db is null. Check FIREBASE_SERVICE_ACCOUNT or serviceAccountKey.json!');
        }

        await db.collection('prescriptions').doc(auditId).set({
          imageUrl,
          extractedData,
          auditResults,
          status: 'PENDING_REVIEW',
          finalClassification: 'PENDING',
          finalizedBy: userId,
          privacyMasked: !!privacyMasked,
          createdAt: new Date(),
        });
      }

      savedAudits.push({ auditId, extractedData, auditResults });
    }

    if (userId) {
      clearCache(`audits_${userId}`);
      clearCache('stats_');
    }

    return res.status(200).json({
      success: true,
      audits: savedAudits,
      auditId: savedAudits.length > 0 ? savedAudits[0].auditId : null,
      status: 'PENDING_REVIEW',
    });

  } catch (error) {
    console.error('Error processing prescription:', error);
    return res.status(500).json({
      error: 'Failed to process prescription. Please try again.',
      details: error.message || String(error),
    });
  }
}

module.exports = { processPrescription };
