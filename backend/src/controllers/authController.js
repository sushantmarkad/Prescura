const { db, auth } = require('../config/firebase');

const registerUser = async (req, res) => {
  try {
    const { uid, email } = req.body;
    
    // Check if this is the first user in the database
    const usersSnapshot = await db.collection('users').limit(1).get();
    
    let role = 'USER';
    if (usersSnapshot.empty) {
      role = 'SUPER_ADMIN'; // The first user gets admin privileges
    }

    // Save to Firestore
    await db.collection('users').doc(uid).set({
      email,
      role,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, role });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ success: false, error: "Failed to register user" });
  }
};

module.exports = { registerUser };
