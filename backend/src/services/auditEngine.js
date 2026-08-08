/**
 * NABH Audit Engine
 * Evaluates extracted AI output against the 34 NABH (6th Ed) Parameters.
 */

const standardCriteria = [
  // SECTION A: Patient Identification
  { id: 'A1', section: 'A', sectionName: 'A. Patient Identification', question: 'UHID/IPD/OPD number mentioned' },
  { id: 'A2', section: 'A', sectionName: 'A. Patient Identification', question: 'Patient name mentioned' },
  { id: 'A3', section: 'A', sectionName: 'A. Patient Identification', question: 'Age mentioned' },
  { id: 'A4', section: 'A', sectionName: 'A. Patient Identification', question: 'Gender mentioned' },
  { id: 'A5', section: 'A', sectionName: 'A. Patient Identification', question: 'Weight documented (where applicable)' },
  { id: 'A6', section: 'A', sectionName: 'A. Patient Identification', question: 'Date and time of prescription' },

  // SECTION B: Prescriber Identification
  { id: 'B1', section: 'B', sectionName: 'B. Prescriber Identification', question: 'Doctor\'s name clearly mentioned' },
  { id: 'B2', section: 'B', sectionName: 'B. Prescriber Identification', question: 'Registration number mentioned' },
  { id: 'B3', section: 'B', sectionName: 'B. Prescriber Identification', question: 'Signature present' },
  { id: 'B4', section: 'B', sectionName: 'B. Prescriber Identification', question: 'Department/unit mentioned' },

  // SECTION C: Medication Order Completeness
  { id: 'C1', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'Generic name used' },
  { id: 'C2', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'Drug strength mentioned' },
  { id: 'C3', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'Dosage form specified' },
  { id: 'C4', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'Dose clearly written' },
  { id: 'C5', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'Route mentioned' },
  { id: 'C6', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'Frequency mentioned' },
  { id: 'C7', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'Duration mentioned' },
  { id: 'C8', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'Indication documented (where applicable)' },
  { id: 'C9', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'Allergy status documented' },
  { id: 'C10', section: 'C', sectionName: 'C. Medication Order Completeness', question: 'High-risk medicine appropriately identified' },
  
  // SECTION D: Medication Safety Parameters
  { id: 'D1', section: 'D', sectionName: 'D. NABH Medication Safety', question: 'Prescription legible' },
  { id: 'D2', section: 'D', sectionName: 'D. NABH Medication Safety', question: 'Capital letters used for handwritten orders' },
  { id: 'D3', section: 'D', sectionName: 'D. NABH Medication Safety', question: 'Dangerous abbreviations avoided' },
  { id: 'D4', section: 'D', sectionName: 'D. NABH Medication Safety', question: 'Decimal errors absent' },
  { id: 'D5', section: 'D', sectionName: 'D. NABH Medication Safety', question: 'Leading zero used (0.5 mg)' },
  { id: 'D6', section: 'D', sectionName: 'D. NABH Medication Safety', question: 'Trailing zero avoided (5 mg not 5.0 mg)' },
  { id: 'D7', section: 'D', sectionName: 'D. NABH Medication Safety', question: 'Look-Alike Sound-Alike (LASA) precautions followed' },

  // SECTION E: Rational Prescribing Indicators
  { id: 'E1', section: 'E', sectionName: 'E. Rational Prescribing Indicators', question: 'Drug from hospital formulary' },
  { id: 'E2', section: 'E', sectionName: 'E. Rational Prescribing Indicators', question: 'Antibiotic prescribed rationally' },
  { id: 'E3', section: 'E', sectionName: 'E. Rational Prescribing Indicators', question: 'Polypharmacy (>5 drugs) avoided' },
  { id: 'E4', section: 'E', sectionName: 'E. Rational Prescribing Indicators', question: 'Duplication of therapy absent' },
  { id: 'E5', section: 'E', sectionName: 'E. Rational Prescribing Indicators', question: 'Potential drug interactions absent' },
  { id: 'E6', section: 'E', sectionName: 'E. Rational Prescribing Indicators', question: 'Dose appropriate for age/renal/hepatic status' },
  { id: 'E7', section: 'E', sectionName: 'E. Rational Prescribing Indicators', question: 'Monitoring instructions documented' },

  // SECTION F: Documentation Quality
  { id: 'F1', section: 'F', sectionName: 'F. Documentation Quality', question: 'Diagnosis documented' },
  { id: 'F2', section: 'F', sectionName: 'F. Documentation Quality', question: 'Relevant investigation findings available' },
  { id: 'F3', section: 'F', sectionName: 'F. Documentation Quality', question: 'Follow-up advice documented' },
  { id: 'F4', section: 'F', sectionName: 'F. Documentation Quality', question: 'Patient instructions documented' },
];

function evaluateCriteria(extractedData) {
  const formattedResults = {};
  
  // The AI has already evaluated the YES/NO for all 34 parameters in extractedData.audit
  // We just map it securely to our format.
  const aiAudit = extractedData?.audit || {};

  standardCriteria.forEach(criteria => {
    const aiData = aiAudit[criteria.id];
    
    // Safely parse AI answer, default to NO if AI missed it
    const answer = aiData?.answer === 'YES' ? 'YES' : 'NO';
    const evidence = aiData?.evidence || 'No data extracted from prescription';

    formattedResults[criteria.id] = {
      criterionId: criteria.id,
      section: criteria.section,
      sectionName: criteria.sectionName,
      question: criteria.question,
      aiAnswer: answer,
      finalAnswer: answer, // User can override this on frontend
      evidence: evidence,
      reviewStatus: 'PENDING'
    };
  });

  return formattedResults;
}

/**
 * Automates the classification to RATIONAL vs IRRATIONAL
 * based on critical parameters being NO.
 */
function autoClassify(auditResults) {
  // Define criteria that immediately make a prescription IRRATIONAL if they are NO
  const criticalCriteria = [
    'B3', // Signature present
    'C4', // Dose clearly written
    'C5', // Route mentioned
    'C6', // Frequency mentioned
    'D1', // Prescription legible
    'D3', // Dangerous abbreviations avoided
    'E2', // Antibiotic prescribed rationally
  ];

  let isRational = true;
  let reason = 'Meets all critical NABH safety and rationality criteria.';

  for (const crit of criticalCriteria) {
    if (auditResults[crit]?.finalAnswer === 'NO') {
      isRational = false;
      reason = `Failed critical safety criteria (Section ${crit}): ${auditResults[crit].question}`;
      break;
    }
  }

  return {
    status: isRational ? 'RATIONAL' : 'IRRATIONAL',
    reason
  };
}

module.exports = {
  evaluateCriteria,
  standardCriteria,
  autoClassify
};
