const ExcelJS = require('exceljs');
const { standardCriteria, calculateNABHMetrics, calculatePrescriptionScore } = require('./auditEngine');

/**
 * Generates an official NABH Prescription Audit Excel workbook
 * Sheet 1: NABH Summary Report (Department, Month, Section Compliance, 10 Key Quality Indicators, Non-Conformities, Corrective Actions)
 * Sheet 2: Prescription Audit Checklist (Live Excel formulas for Compliance % and Grading)
 */
async function generateExcelReport(audits, reportOptions = {}) {
  const metrics = calculateNABHMetrics(audits, reportOptions);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Prescura AI - NABH Prescription Audit System';
  workbook.created = new Date();

  /* ─────────────────────────────────────────────────────────────
     SHEET 1: NABH AUDIT REPORT SUMMARY
     ───────────────────────────────────────────────────────────── */
  const summarySheet = workbook.addWorksheet('NABH Audit Report', {
    views: [{ showGridLines: true }]
  });

  summarySheet.columns = [
    { key: 'colA', width: 6 },
    { key: 'colB', width: 38 },
    { key: 'colC', width: 22 },
    { key: 'colD', width: 24 },
    { key: 'colE', width: 24 },
    { key: 'colF', width: 22 },
  ];

  // Header Title
  summarySheet.mergeCells('B2:E2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = 'NATIONAL ACCREDITATION BOARD FOR HOSPITALS & HEALTHCARE PROVIDERS (NABH)';
  titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  summarySheet.mergeCells('B3:E3');
  const subTitleCell = summarySheet.getCell('B3');
  subTitleCell.value = 'PRESCRIPTION AUDIT SUMMARY REPORT — 6TH EDITION (MOM CHAPTER)';
  subTitleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0284C7' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Metadata block
  const metaRows = [
    ['Department:', metrics.meta.department, 'Audit Month / Year:', metrics.meta.month],
    ['Audit Setting:', metrics.meta.setting, 'Sample Size Requirement:', metrics.meta.sampleRequirement],
    ['Total Audited Prescriptions:', metrics.meta.totalAudited, 'Sample Adequacy Status:', metrics.meta.isSampleAdequate ? 'Target Met (Compliant)' : 'Under Recommended Target'],
    ['Overall Compliance Score:', `${metrics.scoring.overallCompliance}%`, 'Overall NABH Grade:', metrics.scoring.overallGrade]
  ];

  let curRow = 5;
  metaRows.forEach(r => {
    const row = summarySheet.getRow(curRow);
    row.getCell(2).value = r[0];
    row.getCell(2).font = { bold: true, color: { argb: 'FF475569' } };
    row.getCell(3).value = r[1];
    row.getCell(3).font = { bold: true, color: { argb: 'FF0F172A' } };

    row.getCell(4).value = r[2];
    row.getCell(4).font = { bold: true, color: { argb: 'FF475569' } };
    row.getCell(5).value = r[3];
    row.getCell(5).font = { bold: true, color: { argb: r[3] === 'Excellent' || r[3] === 'Good' || r[3] === 'Target Met (Compliant)' ? 'FF059669' : 'FF0284C7' } };
    curRow++;
  });

  // Section Indicators Table
  curRow += 1;
  summarySheet.mergeCells(`B${curRow}:E${curRow}`);
  const secHeader = summarySheet.getCell(`B${curRow}`);
  secHeader.value = 'SUGGESTED AUDIT REPORT FORMAT — SECTION COMPLIANCE';
  secHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  secHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
  secHeader.alignment = { horizontal: 'left', indent: 1 };
  curRow++;

  const colH = summarySheet.getRow(curRow);
  colH.getCell(2).value = 'NABH Indicator Section';
  colH.getCell(3).value = 'Yes Count';
  colH.getCell(4).value = 'Applicable Parameters';
  colH.getCell(5).value = 'Compliance (%)';
  [2, 3, 4, 5].forEach(c => {
    colH.getCell(c).font = { bold: true };
    colH.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    colH.getCell(c).border = { bottom: { style: 'thin' }, top: { style: 'thin' } };
  });
  curRow++;

  metrics.sectionCompliance.forEach(sec => {
    const row = summarySheet.getRow(curRow);
    row.getCell(2).value = sec.name;
    row.getCell(3).value = sec.totalYes;
    row.getCell(4).value = sec.totalApplicable;
    row.getCell(5).value = `${sec.compliance}%`;
    [2, 3, 4, 5].forEach(c => {
      row.getCell(c).border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
    });
    curRow++;
  });

  // Overall row
  const ovRow = summarySheet.getRow(curRow);
  ovRow.getCell(2).value = 'Overall Compliance';
  ovRow.getCell(2).font = { bold: true };
  ovRow.getCell(3).value = metrics.sectionCompliance.reduce((s, i) => s + i.totalYes, 0);
  ovRow.getCell(3).font = { bold: true };
  ovRow.getCell(4).value = metrics.sectionCompliance.reduce((s, i) => s + i.totalApplicable, 0);
  ovRow.getCell(4).font = { bold: true };
  ovRow.getCell(5).value = `${metrics.scoring.overallCompliance}%`;
  ovRow.getCell(5).font = { bold: true, color: { argb: metrics.scoring.overallGradeColor.replace('#', 'FF') } };
  [2, 3, 4, 5].forEach(c => {
    ovRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    ovRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' } };
  });

  // 10 Key Quality Indicators
  curRow += 2;
  summarySheet.mergeCells(`B${curRow}:E${curRow}`);
  const qiHeader = summarySheet.getCell(`B${curRow}`);
  qiHeader.value = 'KEY QUALITY INDICATORS TO REPORT (NABH MOM)';
  qiHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  qiHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  qiHeader.alignment = { horizontal: 'left', indent: 1 };
  curRow++;

  const qiCols = summarySheet.getRow(curRow);
  qiCols.getCell(2).value = 'Quality Indicator';
  qiCols.getCell(3).value = 'Target Benchmark';
  qiCols.getCell(4).value = 'Current Value (%)';
  qiCols.getCell(5).value = 'NABH Status';
  [2, 3, 4, 5].forEach(c => {
    qiCols.getCell(c).font = { bold: true };
    qiCols.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    qiCols.getCell(c).border = { bottom: { style: 'thin' }, top: { style: 'thin' } };
  });
  curRow++;

  metrics.keyQualityIndicators.forEach(qi => {
    const row = summarySheet.getRow(curRow);
    row.getCell(2).value = `${qi.id}. ${qi.name}`;
    row.getCell(3).value = qi.target;
    row.getCell(4).value = `${qi.actual}%`;
    row.getCell(5).value = qi.status;
    row.getCell(5).font = { bold: true, color: { argb: qi.status === 'Compliant' ? 'FF059669' : qi.status === 'Critical' ? 'FFDC2626' : 'FFD97706' } };
    [2, 3, 4, 5].forEach(c => {
      row.getCell(c).border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
    });
    curRow++;
  });

  // Non-Conformities Observed
  curRow += 2;
  summarySheet.mergeCells(`B${curRow}:E${curRow}`);
  const ncHeader = summarySheet.getCell(`B${curRow}`);
  ncHeader.value = 'NON-CONFORMITIES OBSERVED';
  ncHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  ncHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
  ncHeader.alignment = { horizontal: 'left', indent: 1 };
  curRow++;

  if (metrics.nonConformities.length === 0) {
    const row = summarySheet.getRow(curRow);
    row.getCell(2).value = 'No non-conformities observed across audited prescriptions.';
    curRow++;
  } else {
    metrics.nonConformities.forEach((nc, idx) => {
      const row = summarySheet.getRow(curRow);
      row.getCell(2).value = `${idx + 1}. [${nc.id}] ${nc.question}`;
      row.getCell(3).value = `${nc.noCount} failures`;
      row.getCell(4).value = `Failure Rate: ${nc.failureRate}%`;
      row.getCell(5).value = nc.sectionName;
      curRow++;
    });
  }

  // Corrective Actions
  curRow += 2;
  summarySheet.mergeCells(`B${curRow}:E${curRow}`);
  const caHeader = summarySheet.getCell(`B${curRow}`);
  caHeader.value = 'CORRECTIVE & PREVENTIVE ACTIONS (CAPA)';
  caHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  caHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
  caHeader.alignment = { horizontal: 'left', indent: 1 };
  curRow++;

  metrics.correctiveActions.forEach(ca => {
    const row = summarySheet.getRow(curRow);
    row.getCell(2).value = `${ca.id}. ${ca.action}`;
    row.getCell(3).value = ca.description;
    row.getCell(5).value = `Status: ${ca.status}`;
    row.getCell(5).font = { bold: true, color: { argb: 'FF059669' } };
    curRow++;
  });

  // Audit Team Sign-offs
  curRow += 2;
  summarySheet.mergeCells(`B${curRow}:E${curRow}`);
  const teamHeader = summarySheet.getCell(`B${curRow}`);
  teamHeader.value = 'NABH AUDIT TEAM SIGN-OFF';
  teamHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  teamHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
  teamHeader.alignment = { horizontal: 'left', indent: 1 };
  curRow++;

  metrics.auditTeam.forEach(t => {
    const row = summarySheet.getRow(curRow);
    row.getCell(2).value = `• ${t.role}`;
    row.getCell(4).value = 'Signature: __________________';
    row.getCell(5).value = 'Date: ______________';
    curRow++;
  });

  /* ─────────────────────────────────────────────────────────────
     SHEET 2: DETAILED PRESCRIPTION CHECKLIST (WITH FORMULAS)
     ───────────────────────────────────────────────────────────── */
  const checklistSheet = workbook.addWorksheet('Prescription Checklist', {
    views: [{ showGridLines: true }]
  });

  const columns = [
    { header: 'Sr No', key: 'srNo', width: 8 },
    { header: 'Prescription ID', key: 'id', width: 22 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Patient Name', key: 'patient', width: 20 },
    { header: 'Doctor / Unit', key: 'prescriber', width: 20 },
    { header: 'Department', key: 'department', width: 16 },
    { header: 'Classification', key: 'classification', width: 15 },
  ];

  standardCriteria.forEach(crit => {
    columns.push({
      header: `${crit.id}: ${crit.question}`,
      key: crit.id,
      width: 15
    });
  });

  columns.push(
    { header: 'Applicable', key: 'appCount', width: 12 },
    { header: 'Yes Count', key: 'yesCount', width: 12 },
    { header: 'Compliance (%)', key: 'compliancePct', width: 16 },
    { header: 'NABH Grade', key: 'grade', width: 18 }
  );

  checklistSheet.columns = columns;

  // Header styling
  const checkHeaderRow = checklistSheet.getRow(1);
  checkHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  checkHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
  checkHeaderRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  checkHeaderRow.height = 36;

  // Question criteria column letter range:
  // Sr No (A), ID (B), Date (C), Patient (D), Prescriber (E), Department (F), Classification (G)
  // First criteria is column H (col 8)
  // 38 criteria: Col 8 to 45 -> H to AS
  // Applicable is Col 46 (AT)
  // Yes Count is Col 47 (AU)
  // Compliance % is Col 48 (AV)
  // NABH Grade is Col 49 (AW)

  audits.forEach((audit, index) => {
    const rowIdx = index + 2;
    const pData = audit.prescriptionData || audit.extractedData || {};
    const patientName = pData.patientName?.value || pData.patientName || 'Patient';
    const doctorName = pData.doctorName?.value || pData.doctorName || 'Attending Physician';
    const dept = audit.department || pData.department?.value || metrics.meta.department;
    const dateStr = audit.finalizedAt?._seconds
      ? new Date(audit.finalizedAt._seconds * 1000).toLocaleDateString()
      : new Date().toLocaleDateString();

    const rowObj = {
      srNo: index + 1,
      id: audit.id || audit.auditId || `Rx-${index + 1}`,
      date: dateStr,
      patient: patientName,
      prescriber: doctorName,
      department: dept,
      classification: audit.finalClassification || 'PENDING'
    };

    standardCriteria.forEach(crit => {
      const res = audit.auditResults?.[crit.id];
      rowObj[crit.id] = res ? (res.finalAnswer || res.aiAnswer || 'NO') : 'NO';
    });

    const addedRow = checklistSheet.addRow(rowObj);

    // Dynamic Excel Formulas for automatic calculation
    // COUNTIF(H{row}:AS{row}, "YES")
    addedRow.getCell('yesCount').value = {
      formula: `COUNTIF(H${rowIdx}:AS${rowIdx},"YES")`,
      result: calculatePrescriptionScore(audit.auditResults).yesCount
    };

    // COUNTA(H{row}:AS{row})
    addedRow.getCell('appCount').value = {
      formula: `COUNTA(H${rowIdx}:AS${rowIdx})`,
      result: calculatePrescriptionScore(audit.auditResults).totalApplicable
    };

    // Compliance: (Yes / Applicable) * 100
    addedRow.getCell('compliancePct').value = {
      formula: `ROUND((AU${rowIdx}/AT${rowIdx})*100, 1)`,
      result: calculatePrescriptionScore(audit.auditResults).complianceScore
    };

    // Grade: IF(AV >= 95, "Excellent", IF(AV >= 90, "Good", IF(AV >= 80, "Needs Improvement", "Non-compliant")))
    addedRow.getCell('grade').value = {
      formula: `IF(AV${rowIdx}>=95,"Excellent",IF(AV${rowIdx}>=90,"Good",IF(AV${rowIdx}>=80,"Needs Improvement","Non-compliant")))`,
      result: calculatePrescriptionScore(audit.auditResults).grade
    };

    // Alignment and zebra styling
    addedRow.alignment = { vertical: 'middle', horizontal: 'center' };
    addedRow.getCell('patient').alignment = { vertical: 'middle', horizontal: 'left' };
    addedRow.getCell('prescriber').alignment = { vertical: 'middle', horizontal: 'left' };

    if (rowIdx % 2 === 0) {
      addedRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    }
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  generateExcelReport
};
