const ExcelJS = require('exceljs');

/**
 * Generates an Excel report from audit data.
 * One row per prescription.
 */
async function generateExcelReport(audits) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Prescription Audit System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Audits');

  // Define Columns
  const columns = [
    { header: 'Audit ID', key: 'id', width: 20 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Prescriber', key: 'prescriber', width: 25 },
    { header: 'Classification', key: 'classification', width: 15 },
    { header: 'Reviewer', key: 'reviewer', width: 20 },
    // Example criteria columns
    { header: 'A1 (UHID)', key: 'A1', width: 10 },
    { header: 'B1 (Dr. Name)', key: 'B1', width: 15 },
    { header: 'C1 (Generic)', key: 'C1', width: 15 }
  ];

  worksheet.columns = columns;

  // Add Rows
  audits.forEach(audit => {
    worksheet.addRow({
      id: audit.id,
      date: new Date(audit.date).toLocaleDateString(),
      department: audit.department || 'N/A',
      prescriber: audit.prescriber || 'N/A',
      classification: audit.classification || 'UNKNOWN',
      reviewer: audit.reviewer || 'N/A',
      A1: audit.answers?.['A1'] || 'N/A',
      B1: audit.answers?.['B1'] || 'N/A',
      C1: audit.answers?.['C1'] || 'N/A',
    });
  });

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Generate buffer
  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  generateExcelReport
};
