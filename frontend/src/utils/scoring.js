/**
 * NABH Scoring System & Quality Indicators Engine
 * 
 * Scoring Formula:
 * Compliance (%) = (Number of "Yes" / Applicable Parameters) × 100
 * 
 * Grading:
 * Score Interpretation
 * ≥95%  Excellent
 * 90–94% Good
 * 80–89% Needs Improvement
 * <80%  Non-compliant
 */

export const NABH_STANDARD_CRITERIA = [
  // SECTION A: Patient Identification
  { id: 'A1', section: 'A', sectionName: 'A. Patient Identification', question: 'UHID/IPD/OPD number mentioned' },
  { id: 'A2', section: 'A', sectionName: 'A. Patient Identification', question: 'Patient name mentioned' },
  { id: 'A3', section: 'A', sectionName: 'A. Patient Identification', question: 'Age mentioned' },
  { id: 'A4', section: 'A', sectionName: 'A. Patient Identification', question: 'Gender mentioned' },
  { id: 'A5', section: 'A', sectionName: 'A. Patient Identification', question: 'Weight documented (where applicable)' },
  { id: 'A6', section: 'A', sectionName: 'A. Patient Identification', question: 'Date and time of prescription' },

  // SECTION B: Prescriber Identification
  { id: 'B1', section: 'B', sectionName: 'B. Prescriber Identification', question: "Doctor's name clearly mentioned" },
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

/**
 * Calculates Compliance Score (%) and Grading for an individual prescription
 */
export function calculatePrescriptionScore(auditResults) {
  if (!auditResults || typeof auditResults !== 'object') {
    return {
      yesCount: 0,
      noCount: 0,
      totalApplicable: 0,
      complianceScore: 0,
      grade: 'Non-compliant',
      gradeColor: '#ef4444',
      gradeBg: 'rgba(239, 68, 68, 0.12)',
      gradeBadgeClass: 'badge-noncompliant'
    };
  }

  const entries = Object.values(auditResults);
  const applicableEntries = entries.filter(item => {
    const ans = (item.finalAnswer || item.aiAnswer || '').toUpperCase();
    return ans === 'YES' || ans === 'NO';
  });

  const yesCount = applicableEntries.filter(item => (item.finalAnswer || item.aiAnswer || '').toUpperCase() === 'YES').length;
  const noCount = applicableEntries.filter(item => (item.finalAnswer || item.aiAnswer || '').toUpperCase() === 'NO').length;
  const totalApplicable = applicableEntries.length;

  const complianceScore = totalApplicable > 0 ? Math.round((yesCount / totalApplicable) * 1000) / 10 : 0;

  let grade = 'Non-compliant';
  let gradeColor = '#ef4444';
  let gradeBg = 'rgba(239, 68, 68, 0.12)';
  let gradeBadgeClass = 'badge-noncompliant';

  if (complianceScore >= 95) {
    grade = 'Excellent';
    gradeColor = '#10b981';
    gradeBg = 'rgba(16, 185, 129, 0.12)';
    gradeBadgeClass = 'badge-excellent';
  } else if (complianceScore >= 90) {
    grade = 'Good';
    gradeColor = '#0ea5e9';
    gradeBg = 'rgba(14, 165, 233, 0.12)';
    gradeBadgeClass = 'badge-good';
  } else if (complianceScore >= 80) {
    grade = 'Needs Improvement';
    gradeColor = '#f59e0b';
    gradeBg = 'rgba(245, 158, 11, 0.12)';
    gradeBadgeClass = 'badge-needs-improvement';
  }

  return {
    yesCount,
    noCount,
    totalApplicable,
    complianceScore,
    grade,
    gradeColor,
    gradeBg,
    gradeBadgeClass
  };
}

/**
 * Calculates Section Compliance, 10 Quality Indicators, Non-conformities, and NABH Methodology checks
 */
export function calculateNABHMetrics(audits, options = {}) {
  const department = options.department || 'Medicine';
  const month = options.month || new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const setting = options.setting || 'OPD'; // OPD | IPD | ICU

  const totalAudited = audits.length;

  const processedAudits = audits.map((audit, idx) => {
    const results = audit.auditResults || {};
    const scoreInfo = calculatePrescriptionScore(results);
    return {
      ...audit,
      id: audit.id || audit.auditId || `Rx-${idx + 1}`,
      scoreInfo
    };
  });

  const gradeCounts = {
    excellent: processedAudits.filter(a => a.scoreInfo.grade === 'Excellent').length,
    good: processedAudits.filter(a => a.scoreInfo.grade === 'Good').length,
    needsImprovement: processedAudits.filter(a => a.scoreInfo.grade === 'Needs Improvement').length,
    nonCompliant: processedAudits.filter(a => a.scoreInfo.grade === 'Non-compliant').length
  };

  const avgCompliance = totalAudited > 0
    ? Math.round((processedAudits.reduce((acc, a) => acc + a.scoreInfo.complianceScore, 0) / totalAudited) * 10) / 10
    : 0;

  let overallGrade = 'Non-compliant';
  let overallGradeColor = '#ef4444';
  let overallGradeBg = 'rgba(239, 68, 68, 0.12)';
  if (avgCompliance >= 95) {
    overallGrade = 'Excellent';
    overallGradeColor = '#10b981';
    overallGradeBg = 'rgba(16, 185, 129, 0.12)';
  } else if (avgCompliance >= 90) {
    overallGrade = 'Good';
    overallGradeColor = '#0ea5e9';
    overallGradeBg = 'rgba(14, 165, 233, 0.12)';
  } else if (avgCompliance >= 80) {
    overallGrade = 'Needs Improvement';
    overallGradeColor = '#f59e0b';
    overallGradeBg = 'rgba(245, 158, 11, 0.12)';
  }

  // Section Indicators Compliance
  const sections = [
    { key: 'A', name: 'Patient Identification' },
    { key: 'B', name: 'Prescriber Identification' },
    { key: 'C', name: 'Medication Completeness' },
    { key: 'D', name: 'Medication Safety' },
    { key: 'E', name: 'Rational Prescribing' },
    { key: 'F', name: 'Documentation Quality' }
  ];

  const sectionCompliance = sections.map(sec => {
    let totalYes = 0;
    let totalApp = 0;

    audits.forEach(audit => {
      const results = audit.auditResults || {};
      Object.keys(results).forEach(k => {
        if (k.startsWith(sec.key)) {
          const ans = (results[k].finalAnswer || results[k].aiAnswer || '').toUpperCase();
          if (ans === 'YES' || ans === 'NO') {
            totalApp++;
            if (ans === 'YES') totalYes++;
          }
        }
      });
    });

    const compliance = totalApp > 0 ? Math.round((totalYes / totalApp) * 1000) / 10 : 0;
    return {
      sectionKey: sec.key,
      name: sec.name,
      totalYes,
      totalApplicable: totalApp,
      compliance
    };
  });

  // Top Non-Conformities Observed
  const nonConformitiesMap = {};
  NABH_STANDARD_CRITERIA.forEach(c => {
    nonConformitiesMap[c.id] = {
      id: c.id,
      section: c.section,
      sectionName: c.sectionName,
      question: c.question,
      noCount: 0,
      applicableCount: 0
    };
  });

  audits.forEach(audit => {
    const results = audit.auditResults || {};
    Object.keys(results).forEach(k => {
      if (nonConformitiesMap[k]) {
        const ans = (results[k].finalAnswer || results[k].aiAnswer || '').toUpperCase();
        if (ans === 'YES' || ans === 'NO') {
          nonConformitiesMap[k].applicableCount++;
          if (ans === 'NO') nonConformitiesMap[k].noCount++;
        }
      }
    });
  });

  const nonConformitiesList = Object.values(nonConformitiesMap)
    .filter(item => item.noCount > 0)
    .map(item => ({
      ...item,
      failureRate: item.applicableCount > 0 ? Math.round((item.noCount / item.applicableCount) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.noCount - a.noCount);

  // 10 Key Quality Indicators
  const pct = (cnt) => totalAudited > 0 ? Math.round((cnt / totalAudited) * 1000) / 10 : 0;

  const completePatientIdCount = audits.filter(a => {
    const r = a.auditResults || {};
    return ['A1', 'A2', 'A3', 'A4', 'A6'].every(k => (r[k]?.finalAnswer || r[k]?.aiAnswer) === 'YES');
  }).length;

  const genericCount = audits.filter(a => {
    const r = a.auditResults || {};
    return (r['C1']?.finalAnswer || r['C1']?.aiAnswer) === 'YES';
  }).length;

  const allergyDocCount = audits.filter(a => {
    const r = a.auditResults || {};
    return (r['C9']?.finalAnswer || r['C9']?.aiAnswer) === 'YES';
  }).length;

  const completeMedOrderCount = audits.filter(a => {
    const r = a.auditResults || {};
    return ['C2', 'C3', 'C4', 'C5', 'C6', 'C7'].every(k => (r[k]?.finalAnswer || r[k]?.aiAnswer) === 'YES');
  }).length;

  const unsafeAbbrevCount = audits.filter(a => {
    const r = a.auditResults || {};
    return (r['D3']?.finalAnswer || r['D3']?.aiAnswer) === 'NO';
  }).length;

  const antibioticPrescribedCount = audits.filter(a => {
    const r = a.auditResults || {};
    const e2 = r['E2']?.finalAnswer || r['E2']?.aiAnswer;
    return e2 === 'YES' || e2 === 'NO';
  }).length;

  const polypharmacyCount = audits.filter(a => {
    const r = a.auditResults || {};
    return (r['E3']?.finalAnswer || r['E3']?.aiAnswer) === 'NO';
  }).length;

  const prescriptionErrorCount = audits.filter(a => {
    const r = a.auditResults || {};
    const hasSafetyError = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].some(k => (r[k]?.finalAnswer || r[k]?.aiAnswer) === 'NO');
    return hasSafetyError || a.finalClassification === 'IRRATIONAL';
  }).length;

  const medReconCount = audits.filter(a => {
    const r = a.auditResults || {};
    return ['E1', 'E4', 'E5'].every(k => (r[k]?.finalAnswer || r[k]?.aiAnswer) === 'YES');
  }).length;

  const highAlertCount = audits.filter(a => {
    const r = a.auditResults || {};
    return (r['C10']?.finalAnswer || r['C10']?.aiAnswer) === 'YES';
  }).length;

  const keyQualityIndicators = [
    { id: 1, name: 'Percentage prescriptions with complete patient identifiers', actual: pct(completePatientIdCount), target: '100%', unit: '%', status: pct(completePatientIdCount) >= 95 ? 'Compliant' : 'Needs Action' },
    { id: 2, name: 'Percentage prescriptions with generic prescribing', actual: pct(genericCount), target: '>= 80%', unit: '%', status: pct(genericCount) >= 80 ? 'Compliant' : 'Needs Action' },
    { id: 3, name: 'Percentage prescriptions with allergy documentation', actual: pct(allergyDocCount), target: '100%', unit: '%', status: pct(allergyDocCount) >= 95 ? 'Compliant' : 'Needs Action' },
    { id: 4, name: 'Percentage prescriptions with complete medication orders', actual: pct(completeMedOrderCount), target: '>= 95%', unit: '%', status: pct(completeMedOrderCount) >= 95 ? 'Compliant' : 'Needs Action' },
    { id: 5, name: 'Percentage prescriptions with unsafe abbreviations', actual: pct(unsafeAbbrevCount), target: '0%', unit: '%', status: pct(unsafeAbbrevCount) === 0 ? 'Compliant' : 'Critical' },
    { id: 6, name: 'Antibiotic prescribing rate', actual: pct(antibioticPrescribedCount), target: '<= 30%', unit: '%', status: pct(antibioticPrescribedCount) <= 30 ? 'Compliant' : 'Review' },
    { id: 7, name: 'Polypharmacy rate (>5 drugs)', actual: pct(polypharmacyCount), target: '<= 20%', unit: '%', status: pct(polypharmacyCount) <= 20 ? 'Compliant' : 'Attention' },
    { id: 8, name: 'Prescription error rate', actual: pct(prescriptionErrorCount), target: '0%', unit: '%', status: pct(prescriptionErrorCount) === 0 ? 'Compliant' : 'Critical' },
    { id: 9, name: 'Medication reconciliation compliance', actual: pct(medReconCount), target: '>= 90%', unit: '%', status: pct(medReconCount) >= 90 ? 'Compliant' : 'Needs Action' },
    { id: 10, name: 'High-alert medication compliance', actual: pct(highAlertCount), target: '100%', unit: '%', status: pct(highAlertCount) >= 95 ? 'Compliant' : 'Needs Action' },
  ];

  // Methodology Sample Size check
  const sampleRequirements = {
    OPD: { min: 30, max: 50, label: '30-50 prescriptions per specialty per month' },
    IPD: { min: 20, max: 30, label: '20-30 case sheets per specialty per month' },
    ICU: { min: 10, max: 20, label: '10-20 medication charts monthly' }
  };

  const req = sampleRequirements[setting] || sampleRequirements.OPD;
  const isSampleAdequate = totalAudited >= req.min;

  return {
    meta: {
      department,
      month,
      setting,
      totalAudited,
      sampleRequirement: req.label,
      isSampleAdequate,
      generatedAt: new Date().toISOString()
    },
    scoring: {
      overallCompliance: avgCompliance,
      overallGrade,
      overallGradeColor,
      overallGradeBg,
      gradeCounts
    },
    sectionCompliance,
    keyQualityIndicators,
    nonConformities: nonConformitiesList.slice(0, 8),
    correctiveActions: [
      { id: 1, action: 'Prescriber training', description: 'Conduct clinical audit briefing & generic prescribing workshop', status: 'Planned' },
      { id: 2, action: 'Reminder circular', description: 'Issue notice regarding high-alert medication documentation & dangerous abbreviations', status: 'In Progress' },
      { id: 3, action: 'EMR modification', description: 'Enforce mandatory fields for allergy status, diagnosis, and duration in EMR', status: 'Planned' },
      { id: 4, action: 'Re-audit after one month', description: 'Target re-audit scheduled in 30 days to measure corrective compliance', status: 'Scheduled' }
    ],
    auditTeam: [
      { role: 'Clinical Pharmacologist', title: 'Clinical Pharmacologist' },
      { role: 'Clinical Pharmacist', title: 'Clinical Pharmacist' },
      { role: 'Quality Manager', title: 'Quality Manager' },
      { role: 'Nursing Representative', title: 'Nursing Representative' },
      { role: 'Concerned Clinician', title: 'Concerned Clinician' }
    ],
    audits: processedAudits
  };
}
