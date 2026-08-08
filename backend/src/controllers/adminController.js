const { db, auth } = require('../config/firebase');

const getAllUsers = async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ uid: doc.id, ...doc.data() });
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { uid } = req.params;
    
    // 1. Delete user from Firebase Auth
    await auth.deleteUser(uid);
    
    // 2. Anonymize user audits (keep them for analytics, but strip userId)
    const auditsSnapshot = await db.collection('prescriptions').where('finalizedBy', '==', uid).get();
    const batch = db.batch();
    auditsSnapshot.forEach(doc => {
      batch.update(doc.ref, { finalizedBy: 'DELETED_USER' });
    });
    
    // 3. Delete user document from Firestore
    const userRef = db.collection('users').doc(uid);
    batch.delete(userRef);
    
    await batch.commit();
    
    res.json({ success: true, message: "User deleted and audits anonymized" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
};

const toggleMaintenanceMode = async (req, res) => {
  try {
    const { enabled } = req.body;
    await db.collection('settings').doc('system').set({ maintenanceMode: enabled }, { merge: true });
    res.json({ success: true, maintenanceMode: enabled });
  } catch (error) {
    console.error("Error toggling maintenance mode:", error);
    res.status(500).json({ success: false, error: "Failed to toggle maintenance mode" });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    const settingsDoc = await db.collection('settings').doc('system').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : { maintenanceMode: false };
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
};

module.exports = { getAllUsers, deleteUser, toggleMaintenanceMode, getSystemSettings };
