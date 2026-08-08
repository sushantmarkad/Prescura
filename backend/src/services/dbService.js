const { db, admin } = require('../config/firebase');

/**
 * Saves the finalized audit record and updates global/department statistics
 * transactionally to minimize read/write costs and ensure consistency.
 */
async function saveFinalAudit(auditData) {
  // If we are missing proper Firebase admin init, we'll mock success.
  if (!db) {
    console.log("Mocking Firestore Save - Missing credentials");
    return { success: true, id: auditData.auditId || 'mock-id' };
  }

  const {
    auditId,
    prescriptionData, // Contains imageUrl, patientInfo, etc
    auditResults,     // The A-F answers
    classification,   // RATIONAL / IRRATIONAL
    classificationReason,
    userId,
    departmentId = 'global'
  } = auditData;

  const docId = auditId || `audit-${Date.now()}`;
  const auditRef = db.collection('prescriptions').doc(docId);
  const statsRef = db.collection('dashboardStats').doc(departmentId);
  const globalStatsRef = db.collection('dashboardStats').doc('global');

  try {
    await db.runTransaction(async (transaction) => {
      // 1. Read existing stats
      const statsDoc = await transaction.get(statsRef);
      const globalStatsDoc = await transaction.get(globalStatsRef);

      let stats = statsDoc.exists ? statsDoc.data() : { totalAudited: 0, rational: 0, irrational: 0, pending: 0 };
      let globalStats = globalStatsDoc.exists ? globalStatsDoc.data() : { totalAudited: 0, rational: 0, irrational: 0, pending: 0 };

      // 2. Determine increments
      const isRational = classification === 'RATIONAL';

      stats.totalAudited += 1;
      globalStats.totalAudited += 1;
      
      if (isRational) {
        stats.rational += 1;
        globalStats.rational += 1;
      } else {
        stats.irrational += 1;
        globalStats.irrational += 1;
      }
      
      // If we are replacing a pending review, we'd decrement pending here.

      // 3. Write Stats
      transaction.set(statsRef, { ...stats, lastUpdated: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      if (departmentId !== 'global') {
        transaction.set(globalStatsRef, { ...globalStats, lastUpdated: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }

      // 4. Write the single big audit document (Read optimized)
      const auditRecord = {
        status: 'FINALIZED',
        ...prescriptionData,
        auditResults,
        finalClassification: classification,
        classificationReason,
        finalizedBy: userId,
        finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(auditRef, auditRecord);
    });

    return { success: true, id: docId };
  } catch (error) {
    console.error("Error saving audit:", error);
    throw error;
  }
}

/**
 * Fetches dashboard statistics.
 * This reads ONLY the pre-aggregated summary documents, avoiding 
 * downloading the entire prescriptions collection.
 */
async function getDashboardStats(departmentId = 'global') {
  if (!db) {
     return {
       totalAudited: 1250,
       rational: 1100,
       irrational: 150,
       pending: 45
     };
  }

  try {
    const doc = await db.collection('dashboardStats').doc(departmentId).get();
    if (doc.exists) {
      return doc.data();
    }
    return { totalAudited: 0, rational: 0, irrational: 0, pending: 0 };
  } catch (error) {
    console.error("Error fetching stats:", error);
    throw error;
  }
}

module.exports = {
  saveFinalAudit,
  getDashboardStats
};
