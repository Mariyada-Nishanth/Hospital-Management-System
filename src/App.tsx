import React, { useState, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  Building2 as Hospital, 
  CreditCard, 
  FileText, 
  Shield, 
  DollarSign,
  Search,
  User,
  UserPlus,
  ClipboardList,
  Stethoscope,
  Calendar,
  LockKeyhole
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import PatientSignIn from './pages/PatientSignIn';
import StaffSignIn from './pages/StaffSignIn';
import PatientDashboard from './pages/PatientDashboard';
import PatientSignUp from './pages/PatientSignUp';
import StaffDashboard from './pages/StaffDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import BillerDashboard from './pages/BillerDashboard';
import LabDashboard from './pages/LabDashboard';
import AuthTest from './pages/AuthTest';

interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  lastVisit: string;
  insuranceProvider: string;
  policyNumber: string;
}

interface BillRequest {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  services: string[];
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
}

interface Bill {
  id: string;
  requestId: string;
  patientName: string;
  date: string;
  service: string;
  amount: number;
  insurance: number;
  remaining: number;
  status: 'pending' | 'paid' | 'overdue';
}

// Protected route component
const ProtectedRoute = memo(function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, loading } = useAuth();

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/patient/login" />;
  }

  return <>{children}</>;
});

// Dashboard router component
const DashboardRouter = memo(function DashboardRouter() {
  const { user, profile } = useAuth();

  // Check authenticated user and route based on role
  if (user && profile) {
    if (profile.role === 'doctor') {
      return <DoctorDashboard />;
    }
    if (profile.role === 'biller') {
      return <BillerDashboard />;
    }
    if (profile.role === 'lab_technician') {
      return <LabDashboard />;
    }
    if (profile.role === 'admin' || profile.role === 'staff') {
      return <StaffDashboard />;
    }
  }

  // Default fallback - redirect to login if no valid role
  return <Navigate to="/staff/login" />;
});

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/patient/login" element={<PatientSignIn />} />
        <Route path="/patient/signup" element={<PatientSignUp />} />
        <Route path="/staff/login" element={<StaffSignIn />} />
        <Route path="/auth-test" element={<AuthTest />} />
        <Route path="/" element={<Navigate to="/patient/login" />} />
        
        {/* Protected routes */}
        <Route
          path="/patient/dashboard"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/dashboard"
          element={
            <ProtectedRoute allowedRoles={['doctor', 'admin', 'biller']}>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;