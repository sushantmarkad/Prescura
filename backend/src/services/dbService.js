const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

// Simple in-memory cache to reduce Firebase reads
const memoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  if (memoryCache.has(key)) {
    const { data, timestamp } = memoryCache.get(key);
    if (Date.now() - timestamp < CACHE_TTL) return data;
  }
  return null;
}

function setCache(key, data) {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

function clearCache(prefix) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
}

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
      transaction.set(statsRef, { ...stats, lastUpdated: FieldValue.serverTimestamp() }, { merge: true });
      if (departmentId !== 'global') {
        transaction.set(globalStatsRef, { ...globalStats, lastUpdated: FieldValue.serverTimestamp() }, { merge: true });
      }

      // 4. Write the single big audit document (Read optimized)
      const auditRecord = {
        status: 'FINALIZED',
        ...prescriptionData,
        auditResults,
        finalClassification: classification,
        classificationReason,
        finalizedBy: userId,
        finalizedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
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

/**
 * Deletes an audit record and updates statistics (non-transactionally for reliability)
 */
async function deleteAudit(auditId, departmentId = 'global') {
  if (!db) {
    return { success: true };
  }

  try {
    const auditRef = db.collection('prescriptions').doc(auditId);

    // 1. Read the audit document first
    const auditDoc = await auditRef.get();
    if (!auditDoc.exists) {
      throw new Error('Audit not found');
    }

    const auditData = auditDoc.data();
    const isFinalized = auditData.status === 'FINALIZED';
    const isRational = auditData.finalClassification === 'RATIONAL';
    const isIrrational = auditData.finalClassification === 'IRRATIONAL';

    // 2. Delete the document
    await auditRef.delete();

    // 3. Update stats separately (best-effort, won't block delete)
    if (isFinalized) {
      try {
        const { FieldValue } = require('firebase-admin/firestore');
        const statsRef = db.collection('dashboardStats').doc(departmentId);
        const globalStatsRef = db.collection('dashboardStats').doc('global');

        const updates = { totalAudited: FieldValue.increment(-1), lastUpdated: FieldValue.serverTimestamp() };
        if (isRational) updates.rational = FieldValue.increment(-1);
        if (isIrrational) updates.irrational = FieldValue.increment(-1);

        await statsRef.update(updates);
        if (departmentId !== 'global') {
          await globalStatsRef.update(updates);
        }
      } catch (statsErr) {
        // Stats update failed but document was deleted — acceptable
        console.warn('Stats update failed after delete (non-critical):', statsErr.message);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting audit:', error);
    throw error;
  }
}


module.exports = {
  saveFinalAudit,
  getDashboardStats,
  deleteAudit,
  getCached,
  setCache,
  clearCache
};
