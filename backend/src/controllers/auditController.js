const { saveFinalAudit, getDashboardStats, deleteAudit, getCached, setCache, clearCache } = require('../services/dbService');
const { db } = require('../config/firebase');
const { generateExcelReport } = require('../services/excelService');
const { calculatePrescriptionScore, calculateNABHMetrics } = require('../services/auditEngine');

async function finalizeAudit(req, res) {
  try {
    const auditData = req.body;
    
    // Calculate Compliance Score (%) and NABH Grade
    const scoreInfo = calculatePrescriptionScore(auditData.auditResults);
    auditData.complianceScore = scoreInfo.complianceScore;
    auditData.grade = scoreInfo.grade;
    
    const result = await saveFinalAudit(auditData);

    
    clearCache('stats_');
    clearCache('audits_');
    
    return res.status(200).json({
      success: true,
      message: 'Audit finalized and saved successfully',
      id: result.id,
      complianceScore: scoreInfo.complianceScore,
      grade: scoreInfo.grade
    });
  } catch (error) {
    console.error("Finalize Audit Error:", error);
    return res.status(500).json({ error: 'Failed to finalize audit.' });
  }
}

async function getStats(req, res) {
  try {
    const departmentId = req.query.department || 'global';
    
    const cacheKey = `stats_${departmentId}`;
    const cachedStats = getCached(cacheKey);
    if (cachedStats) {
      return res.status(200).json({ success: true, stats: cachedStats });
    }

    const stats = await getDashboardStats(departmentId);
    setCache(cacheKey, stats);
    
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("Get Stats Error:", error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
}

async function getNABHReportSummary(req, res) {
  try {
    const { uid, department = 'Medicine', month, setting = 'OPD' } = req.query;

    if (!db) {
      // Mock metrics for demo / local without db
      const mockMetrics = calculateNABHMetrics([], { department, month, setting });
      return res.status(200).json({ success: true, report: mockMetrics });
    }

    let query = db.collection('prescriptions');
    if (uid) {
      query = query.where('finalizedBy', '==', uid);
    }

    const snapshot = await query.get();
    const audits = [];
    snapshot.forEach(doc => {
      audits.push({ id: doc.id, ...doc.data() });
    });

    const report = calculateNABHMetrics(audits, { department, month, setting });
    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("NABH Report Error:", error);
    return res.status(500).json({ error: 'Failed to calculate NABH report metrics.' });
  }
}

async function exportAudits(req, res) {
  try {
    const { uid, auditId, department = 'Medicine', month, setting = 'OPD' } = req.query;
    
    if (!db) {
      const buffer = await generateExcelReport([], { department, month, setting });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=NABH_Prescription_Audit_Report.xlsx');
      return res.send(buffer);
    }

    let query = db.collection('prescriptions');
    const audits = [];

    if (auditId) {
      const doc = await query.doc(auditId).get();
      if (doc.exists) {
        audits.push({ id: doc.id, ...doc.data() });
      }
    } else {
      if (uid) {
        query = query.where('finalizedBy', '==', uid);
      }
      
      const snapshot = await query.get();
      snapshot.forEach(doc => {
        audits.push({ id: doc.id, ...doc.data() });
      });
    }

    const buffer = await generateExcelReport(audits, { department, month, setting });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=NABH_Prescription_Audit_Report.xlsx');
    
    return res.send(buffer);
  } catch (error) {
    console.error("Export Error:", error);
    return res.status(500).json({ error: 'Failed to generate export.' });
  }
}

async function getUserAudits(req, res) {
  try {
    const { uid } = req.params;
    
    const cacheKey = `audits_${uid}`;
    const cachedAudits = getCached(cacheKey);
    if (cachedAudits) {
      return res.status(200).json({ success: true, audits: cachedAudits });
    }

    const auditsSnapshot = await db.collection('prescriptions')
      .where('finalizedBy', '==', uid)
      .get();
      
    const audits = [];
    auditsSnapshot.forEach(doc => {
      audits.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort in memory to avoid needing a Firestore composite index
    audits.sort((a, b) => {
      const dateA = a.finalizedAt ? new Date(a.finalizedAt) : new Date(0);
      const dateB = b.finalizedAt ? new Date(b.finalizedAt) : new Date(0);
      return dateB - dateA;
    });
    
    setCache(cacheKey, audits);
    
    return res.status(200).json({ success: true, audits });
  } catch (error) {
    console.error("Get User Audits Error:", error);
    return res.status(500).json({ error: 'Failed to fetch user audits.' });
  }
}

async function getAuditById(req, res) {
  try {
    const { id } = req.params;
    const doc = await db.collection('prescriptions').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }
    
    return res.status(200).json({ success: true, audit: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Get Audit By ID Error:", error);
    return res.status(500).json({ error: 'Failed to fetch audit details.' });
  }
}

async function deleteAuditHandler(req, res) {
  try {
    const { id } = req.params;
    await deleteAudit(id);
    
    // Clear caches
    clearCache('stats_');
    clearCache('audits_');

    return res.status(200).json({ success: true, message: 'Audit deleted successfully' });
  } catch (error) {
    console.error("Delete Audit Error:", error);
    return res.status(500).json({ error: 'Failed to delete audit.' });
  }
}

module.exports = {
  finalizeAudit,
  getStats,
  getNABHReportSummary,
  exportAudits,
  getUserAudits,
  getAuditById,
  deleteAuditHandler
};
