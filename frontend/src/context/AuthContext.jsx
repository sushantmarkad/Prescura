import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mocking auth for development if Firebase is not properly configured
  const isMock = import.meta.env.VITE_MOCK_AUTH === 'true';

  useEffect(() => {
    if (isMock) {
      setCurrentUser({ uid: 'mock-123', email: 'admin@hospital.com' });
      setUserRole('ADMIN');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch user role from Firestore to avoid sending full user object everywhere
          // This read happens only once per session/login
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            setUserRole('VIEWER'); // Default fallback
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole('VIEWER');
        }
      } else {
        setUserRole(null);
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [isMock]);

  const login = (email, password) => {
    if (isMock) {
      setCurrentUser({ uid: 'mock-123', email });
      setUserRole('ADMIN');
      return Promise.resolve();
    }
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    if (isMock) {
      setCurrentUser(null);
      setUserRole(null);
      return Promise.resolve();
    }
    return signOut(auth);
  };

  const value = {
    currentUser,
    userRole,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
