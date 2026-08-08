import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import Upload from './pages/Upload';
import AuditReview from './pages/AuditReview';
import { useAuth } from './context/AuthContext';

const RoleBasedDashboard = () => {
  const { userRole } = useAuth();
  if (userRole === 'SUPER_ADMIN') {
    return <AdminDashboard />;
  }
  return <UserDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<RoleBasedDashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="audit-review/:id" element={<AuditReview />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
