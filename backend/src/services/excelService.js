const ExcelJS = require('exceljs');
const { standardCriteria } = require('./auditEngine');

/**
 * Generates an Excel report from audit data.
 * One row per prescription.
 */
async function generateExcelReport(audits) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Prescription Audit System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Audits');

  // 1. Find all unique question keys dynamically
  const questionKeys = new Set();
  audits.forEach(audit => {
    if (audit.auditResults) {
      Object.keys(audit.auditResults).forEach(key => questionKeys.add(key));
    }
  });
  const sortedKeys = Array.from(questionKeys).sort();

  // 2. Define Columns
  const columns = [
    { header: 'Audit ID', key: 'id', width: 20 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Prescriber', key: 'prescriber', width: 25 },
    { header: 'Classification', key: 'classification', width: 15 },
    { header: 'Reviewer', key: 'reviewer', width: 20 },
    { header: 'Reason', key: 'reason', width: 30 }
  ];

  // Add dynamic question columns
  sortedKeys.forEach(key => {
    const criterion = standardCriteria.find(c => c.id === key);
    const headerText = criterion ? `${key}. ${criterion.question}` : key;
    columns.push({ header: headerText, key: key, width: 18 }); // Reduced width to shrink horizontal length
  });

  worksheet.columns = columns;

  // 3. Add Rows
  audits.forEach(audit => {
    const rowData = {
      id: audit.id,
      date: audit.finalizedAt ? new Date(audit.finalizedAt._seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString(),
      department: audit.department || 'N/A',
      prescriber: audit.prescriber || 'N/A',
      classification: audit.finalClassification || 'UNKNOWN',
      reviewer: audit.finalizedBy || 'N/A',
      reason: audit.classificationReason || ''
    };

    // Add answers to row
    sortedKeys.forEach(key => {
      const resultObj = audit.auditResults?.[key];
      rowData[key] = resultObj ? (resultObj.finalAnswer || resultObj.aiAnswer || 'N/A') : 'N/A';
    });

    worksheet.addRow(rowData);
  });

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  worksheet.getRow(1).alignment = { vertical: 'top', wrapText: true };
  worksheet.getRow(1).height = 100; // Increase height to accommodate wrapped question text

  // Generate buffer
  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  generateExcelReport
};
