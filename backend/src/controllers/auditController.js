const { saveFinalAudit, getDashboardStats } = require('../services/dbService');
const { generateExcelReport } = require('../services/excelService');

async function finalizeAudit(req, res) {
  try {
    const auditData = req.body;
    
    // In production, get user info from JWT middleware
    // const userId = req.user.uid;
    
    const result = await saveFinalAudit(auditData);
    
    return res.status(200).json({
      success: true,
      message: 'Audit finalized and saved successfully',
      id: result.id
    });
  } catch (error) {
    console.error("Finalize Audit Error:", error);
    return res.status(500).json({ error: 'Failed to finalize audit.' });
  }
}

async function getStats(req, res) {
  try {
    const departmentId = req.query.department || 'global';
    const stats = await getDashboardStats(departmentId);
    
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("Get Stats Error:", error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
}

async function exportAudits(req, res) {
  try {
    // In a real application, you would query Firestore here based on req.query (e.g. date range)
    // For this boilerplate, we'll generate a dummy export or fetch a limited set.
    
    const mockData = [
      {
        id: 'audit-1',
        date: new Date().toISOString(),
        department: 'Internal Medicine',
        prescriber: 'Dr. Gregory House',
        classification: 'RATIONAL',
        reviewer: 'Admin',
        answers: { 'A1': 'YES', 'B1': 'YES', 'C1': 'YES' }
      },
      {
        id: 'audit-2',
        date: new Date().toISOString(),
        department: 'Cardiology',
        prescriber: 'Dr. John Watson',
        classification: 'IRRATIONAL',
        reviewer: 'Pharmacologist 1',
        answers: { 'A1': 'NO', 'B1': 'YES', 'C1': 'YES' }
      }
    ];

    const buffer = await generateExcelReport(mockData);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'audit_export.xlsx');
    
    return res.send(buffer);
  } catch (error) {
    console.error("Export Error:", error);
    return res.status(500).json({ error: 'Failed to generate export.' });
  }
}

module.exports = {
  finalizeAudit,
  getStats,
  exportAudits
};
