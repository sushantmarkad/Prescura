/**
 * Classification Engine
 * 
 * Determines whether a prescription is RATIONAL or IRRATIONAL based on the 
 * finalized YES/NO audit results, avoiding any percentage-based scoring.
 */

// This would typically be fetched from Firestore (systemConfig/classificationRule)
// We cache it here to avoid reads.
const currentClassificationRule = {
  version: "1.0",
  type: "CONFIGURABLE",
  description: "Fails if any critical safety or rational prescribing indicator is NO",
  // Example rules: if any of these conditions are met, it's IRRATIONAL
  rules: [
    {
      conditionType: "ANY_FAIL_IN_SECTIONS",
      sections: ["C", "D", "E"], // e.g., if any question in C, D, or E is NO
    },
    {
      conditionType: "SPECIFIC_CRITERIA_FAIL",
      criteriaIds: ["B1", "B3"] // e.g., Doctor name or Signature missing
    }
  ]
};

function classifyPrescription(auditResults) {
  if (!currentClassificationRule) {
    return {
      classification: "UNKNOWN",
      reason: "Rationality classification rule not configured.",
      ruleVersion: null
    };
  }

  const resultsArray = Object.values(auditResults);
  let isIrrational = false;
  let reasons = [];

  for (const rule of currentClassificationRule.rules) {
    if (rule.conditionType === "ANY_FAIL_IN_SECTIONS") {
      const failedSections = resultsArray.filter(r => 
        rule.sections.includes(r.section) && r.finalAnswer === 'NO'
      );
      
      if (failedSections.length > 0) {
        isIrrational = true;
        reasons.push(`Failed critical sections: ${[...new Set(failedSections.map(f => f.section))].join(', ')}`);
      }
    }

    if (rule.conditionType === "SPECIFIC_CRITERIA_FAIL") {
      const failedCriteria = resultsArray.filter(r => 
        rule.criteriaIds.includes(r.criterionId) && r.finalAnswer === 'NO'
      );

      if (failedCriteria.length > 0) {
        isIrrational = true;
        reasons.push(`Failed critical criteria: ${failedCriteria.map(f => f.criterionId).join(', ')}`);
      }
    }
  }

  if (isIrrational) {
    return {
      classification: "IRRATIONAL",
      reason: reasons.join(' | '),
      ruleVersion: currentClassificationRule.version
    };
  }

  return {
    classification: "RATIONAL",
    reason: "Passed all critical classification rules",
    ruleVersion: currentClassificationRule.version
  };
}

module.exports = {
  classifyPrescription,
  currentClassificationRule
};
