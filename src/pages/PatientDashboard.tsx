import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Clock, LogOut, Menu, Bell, Home, FileText, CreditCard, Settings, HelpCircle, Phone, Shield, X, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDoctors, getPatientAppointments, createAppointment, ensurePatientRecord, getTestReportsForPatient, getTestRequestsForBill, getTestResults, getPatientBills, checkDoctorAvailability, getAvailableTimeSlots } from '../lib/supabase';
import Chatbot from '../components/Chatbot';
import type { Database } from '../types/database';

type Doctor = Database['public']['Tables']['doctors']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  doctor: Pick<Doctor, 'first_name' | 'last_name' | 'specialization'>;
};
type TestReport = Database['public']['Tables']['test_reports']['Row'] & {
  doctor: {
    first_name: string | null;
    last_name: string | null;
    specialization: string;
  } | null;
  lab_technician: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  bill_request: {
    notes: string;
    amount: number;
  } | null;
};

type TestRequest = Database['public']['Tables']['test_requests']['Row'] & {
  patient: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  doctor: {
    first_name: string | null;
    last_name: string | null;
    specialization: string;
  } | null;
};

type TestResult = Database['public']['Tables']['test_results']['Row'] & {
  lab_technician: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};


export default function PatientDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [testReports, setTestReports] = useState<TestReport[]>([]);
  const [testRequests, setTestRequests] = useState<TestRequest[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [bills, setBills] = useState<Database['public']['Tables']['bills']['Row'][]>([]);
  const [selectedField, setSelectedField] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [visibleAppointmentsCount, setVisibleAppointmentsCount] = useState(3);

  // Available medical fields/specializations
  const medicalFields = [
    'Cardiology',
    'Neurology', 
    'Orthopedics',
    'Pediatrics'
  ];

  // Mock available time slots
  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM',
    '02:00 PM', '03:00 PM', '04:00 PM',
  ];

  useEffect(() => {
    const loadData = async () => {
      if (!user || !profile) return;

      try {
        // Ensure patient record exists first (needed for appointments)
        const { data: patientData, error: patientError } = await ensurePatientRecord(user.id, profile);
        if (patientError) throw patientError;
        if (!patientData) throw new Error('Patient profile not found');
        setPatientId(patientData.id);

        // Load doctors, appointments, test reports, and bills in parallel for faster loading
        const [doctorsResult, appointmentsResult, testReportsResult, billsResult] = await Promise.all([
          getDoctors(),
          getPatientAppointments(patientData.id),
          getTestReportsForPatient(patientData.id),
          getPatientBills(patientData.id)
        ]);

        if (doctorsResult.error) throw doctorsResult.error;
        setDoctors(doctorsResult.data || []);

        if (appointmentsResult.error) throw appointmentsResult.error;
        setAppointments(appointmentsResult.data || []);

        if (testReportsResult.error) throw testReportsResult.error;
        setTestReports(testReportsResult.data || []);

        if (billsResult.error) throw billsResult.error;
        setBills(billsResult.data || []);

        // Load test requests for all appointments that have bill requests
        const allTestRequests = [];
        const allTestResults = [];
        
        for (const appointment of appointmentsResult.data || []) {
          // Try to find bill request for this appointment
          // Note: This is a simplified approach - in a real app you'd have a direct relationship
          const billRequests = testReportsResult.data?.filter(report => 
            report.bill_request?.notes?.includes(appointment.id) || 
            report.created_at === appointment.created_at
          );
          
          for (const report of billRequests || []) {
            const testRequestsResult = await getTestRequestsForBill(report.bill_request_id);
            if (testRequestsResult.data) {
              allTestRequests.push(...testRequestsResult.data);
              
              // Get test results for each test request
              for (const testRequest of testRequestsResult.data) {
                const testResultsResult = await getTestResults(testRequest.id);
                if (testResultsResult.data) {
                  allTestResults.push(...testResultsResult.data);
                }
              }
            }
          }
        }
        
        setTestRequests(allTestRequests);
        setTestResults(allTestResults);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading data');
      }
    };

    loadData();
  }, [user, profile]);

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      navigate('/patient/login');
    } catch (err: any) {
      setError(err.message || 'An error occurred during logout');
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!patientId || !selectedField || !selectedDate || !selectedTime || !selectedDoctor) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await createAppointment({
        patient_id: patientId,
        doctor_id: selectedDoctor,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        status: 'scheduled'
      });

      if (error) throw error;

      // Refresh appointments list
      const { data: appointmentsData, error: appointmentsError } = await getPatientAppointments(patientId);
      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);

      // Reset form
      setSelectedField('');
      setSelectedDate('');
      setSelectedTime('');
      setSelectedDoctor('');
    } catch (err: any) {
      setError(err.message || 'An error occurred while booking the appointment');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !profile || !patientId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{background: 'linear-gradient(to bottom, #1e3a8a, #2563eb)'}}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6" style={{borderBottom: '1px solid #2563eb'}}>
            <h1 className="text-2xl font-bold text-white">Menu</h1>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="text-white" style={{color: 'white'}} onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#93c5fd'} onMouseLeave={(e) => (e.target as HTMLElement).style.color = 'white'}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* User Profile */}
          <div className="p-6" style={{borderBottom: '1px solid #2563eb'}}>
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-2xl mb-4 flex items-center justify-center">
                <User className="h-10 w-10" style={{color: '#2563eb'}} />
              </div>
              <h2 className="text-lg font-bold text-white text-center">
                {profile?.email?.split('@')[0]?.toUpperCase() || user?.email?.split('@')[0]?.toUpperCase() || 'PATIENT'}
              </h2>
              <p className="text-sm text-center mt-1" style={{color: '#93c5fd'}}>
                ID: {patientId || 'PATIENT-001'}
              </p>
            </div>
              </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-6">
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setCurrentView('dashboard')}
                  className="w-full flex items-center px-4 py-3 text-left text-white rounded-lg transition-colors"
                  style={{
                    backgroundColor: currentView === 'dashboard' ? '#2563eb' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (currentView !== 'dashboard') {
                      (e.target as HTMLElement).style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== 'dashboard') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('appointments')}
                  className="w-full flex items-center px-4 py-3 text-left text-white rounded-lg transition-colors"
                  style={{
                    backgroundColor: currentView === 'appointments' ? '#2563eb' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (currentView !== 'appointments') {
                      (e.target as HTMLElement).style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== 'appointments') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Calendar className="h-5 w-5 mr-3" />
                  Appointments
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('bills')}
                  className="w-full flex items-center px-4 py-3 text-left text-white rounded-lg transition-colors"
                  style={{
                    backgroundColor: currentView === 'bills' ? '#2563eb' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (currentView !== 'bills') {
                      (e.target as HTMLElement).style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== 'bills') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <CreditCard className="h-5 w-5 mr-3" />
                  Bills
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('reports')}
                  className="w-full flex items-center px-4 py-3 text-left text-white rounded-lg transition-colors"
                  style={{
                    backgroundColor: currentView === 'reports' ? '#2563eb' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (currentView !== 'reports') {
                      (e.target as HTMLElement).style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== 'reports') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <FileText className="h-5 w-5 mr-3" />
                  Reports
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('settings')}
                  className="w-full flex items-center px-4 py-3 text-left text-white rounded-lg transition-colors"
                  style={{
                    backgroundColor: currentView === 'settings' ? '#2563eb' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (currentView !== 'settings') {
                      (e.target as HTMLElement).style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentView !== 'settings') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Settings
                </button>
              </li>
            </ul>
          </nav>

          {/* Bottom Menu */}
          <div className="p-6" style={{borderTop: '1px solid #2563eb'}}>
            <ul className="space-y-2">
              <li>
                <button className="w-full flex items-center px-4 py-3 text-left text-white rounded-lg transition-colors"
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}>
                  <HelpCircle className="h-5 w-5 mr-3" />
                  Help Desk
                </button>
              </li>
              <li>
                <button className="w-full flex items-center px-4 py-3 text-left text-white rounded-lg transition-colors"
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}>
                  <Phone className="h-5 w-5 mr-3" />
                  Contact Us
                </button>
              </li>
              <li>
                <button className="w-full flex items-center px-4 py-3 text-left text-white rounded-lg transition-colors"
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}>
                  <Shield className="h-5 w-5 mr-3" />
                  Privacy Policy
                </button>
              </li>
              <li>
              <button 
                onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-left text-red-300 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
              >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
              </button>
              </li>
            </ul>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">
                <Bell className="h-6 w-6" />
              </button>
          </div>
        </div>
      </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Hi {profile?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Patient'}
                </h1>
                <p className="text-gray-600">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
              <button className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                View Schedule
              </button>
            </div>
          </div>

          {/* Essentials Section */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">ESSENTIALS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Appointments Card */}
              <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                      <Calendar className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
                      <p className="text-sm text-gray-600">Upcoming</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{appointments.length}</div>
                    <div className="text-xs text-gray-500">Scheduled</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Next: {appointments.length > 0 ? new Date(appointments[0].appointment_date).toLocaleDateString() : 'None'}
                </div>
              </div>

              {/* Health Records Card */}
              <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Health Records</h3>
                      <p className="text-sm text-gray-600">Reports</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">{testReports.length}</div>
                    <div className="text-xs text-gray-500">Available</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Latest: {testReports.length > 0 ? new Date(testReports[0].created_at).toLocaleDateString() : 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* Tools Section */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">TOOLS</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow text-center"
              >
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700">Book Appointment</span>
              </button>
              <button 
                onClick={() => setCurrentView('bills')}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow text-center"
              >
                <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700">View Bills</span>
              </button>
              <button 
                onClick={() => setCurrentView('reports')}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow text-center"
              >
                <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700">Reports</span>
              </button>
              <button 
                onClick={() => setCurrentView('settings')}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow text-center"
              >
                <Settings className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-700">Settings</span>
              </button>
              <button 
                onClick={() => setChatbotOpen(!chatbotOpen)}
                className={`rounded-xl p-4 border transition-shadow text-center ${
                  chatbotOpen 
                    ? 'bg-blue-100 border-blue-300 shadow-md' 
                    : 'bg-white border-gray-200 hover:shadow-md'
                }`}
              >
                <MessageCircle className={`h-8 w-8 mx-auto mb-2 ${
                  chatbotOpen ? 'text-blue-600' : 'text-gray-600'
                }`} />
                <span className={`text-sm font-medium ${
                  chatbotOpen ? 'text-blue-700' : 'text-gray-700'
                }`}>AI Assistant</span>
              </button>
            </div>
          </div>

          {/* Conditional Content Based on Current View */}
          {currentView === 'dashboard' && (
            <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Book Appointment Section */}
              <div className="bg-white/70 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Book an Appointment</h2>
                </div>
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label htmlFor="field" className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Medical Field
                </label>
                <select
                  id="field"
                  value={selectedField}
                  onChange={(e) => {
                    setSelectedField(e.target.value);
                    setSelectedDoctor(''); // Reset doctor selection when field changes
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
                  required
                >
                  <option value="">Select a medical field</option>
                  {medicalFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="doctor" className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Doctor
                </label>
                <select
                  id="doctor"
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:shadow-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                  disabled={!selectedField}
                >
                  <option value="">Select a doctor</option>
                  {doctors
                    .filter(doctor => doctor.specialization === selectedField)
                    .map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
                  required
                />
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Time
                </label>
                <select
                  id="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
                  required
                >
                  <option value="">Select a time</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-200 hover:scale-105 ${
                  isLoading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Booking...
                  </div>
                ) : (
                  'Book Appointment'
                )}
              </button>
            </form>
          </div>

          {/* Appointments List */}
          <div className="bg-white/70 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Your Appointments</h2>
            </div>
            {appointments.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">No appointments scheduled</p>
                <p className="text-gray-400 text-sm mt-1">Book your first appointment above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments
                  .sort((a, b) => {
                    // Sort by date first (latest first)
                    const dateA = new Date(a.appointment_date);
                    const dateB = new Date(b.appointment_date);
                    if (dateA.getTime() !== dateB.getTime()) {
                      return dateB.getTime() - dateA.getTime(); // Latest date first
                    }
                    // If same date, sort by time (latest first)
                    return b.appointment_time.localeCompare(a.appointment_time);
                  })
                  .slice(0, visibleAppointmentsCount)
                  .map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">{appointment.doctor.specialization}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                          {new Date(appointment.appointment_date).toLocaleDateString()}
                        </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-green-500" />
                            {appointment.appointment_time}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        appointment.status === 'scheduled'
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : appointment.status === 'completed'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Load More Button */}
                {appointments.length > visibleAppointmentsCount && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => setVisibleAppointmentsCount(prev => Math.min(prev + 3, appointments.length))}
                      className="w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-200 hover:scale-105"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Your Bills */}
          <div className="bg-white/70 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Your Bills</h2>
            </div>
            {bills.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">No bills found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bills.map(bill => (
                  <div key={bill.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">Bill #{bill.id}</h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            bill.status === 'paid'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : bill.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {bill.status?.charAt(0).toUpperCase() + bill.status?.slice(1)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">Date: {new Date(bill.created_at).toLocaleDateString()}</div>
                        <div className="text-lg font-bold text-gray-900">₹{bill.amount}</div>
                      </div>
                    </div>
                    </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Your Reports */}
          <div className="bg-white/70 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Your Test Reports</h2>
            </div>
            
            {/* Test Status Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{testRequests.filter(t => t.status === 'pending').length}</div>
                <div className="text-sm text-red-700">Pending</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{testRequests.filter(t => t.status === 'in_progress').length}</div>
                <div className="text-sm text-yellow-700">In Progress</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{testRequests.filter(t => t.status === 'completed').length}</div>
                <div className="text-sm text-green-700">Completed</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{testRequests.filter(t => t.status === 'sent_to_user').length}</div>
                <div className="text-sm text-blue-700">Ready</div>
              </div>
            </div>

            {/* Test Requests List */}
            {testRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">No test requests found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testRequests.map(testRequest => {
                  const testResult = testResults.find(result => result.test_request_id === testRequest.id);
                  
                  return (
                    <div key={testRequest.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            testRequest.status === 'pending' ? 'bg-red-500' :
                            testRequest.status === 'in_progress' ? 'bg-yellow-500' :
                            testRequest.status === 'completed' ? 'bg-green-500' :
                            testRequest.status === 'sent_to_user' ? 'bg-blue-500' :
                            'bg-gray-500'
                          }`}></div>
                          <h3 className="font-semibold text-gray-900">{testRequest.test_name}</h3>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            testRequest.status === 'pending' ? 'bg-red-100 text-red-700' :
                            testRequest.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                            testRequest.status === 'completed' ? 'bg-green-100 text-green-700' :
                            testRequest.status === 'sent_to_user' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {testRequest.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">{new Date(testRequest.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        Doctor: Dr. {testRequest.doctor?.first_name} {testRequest.doctor?.last_name} ({testRequest.doctor?.specialization})
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        Test Type: {testRequest.test_type.charAt(0).toUpperCase() + testRequest.test_type.slice(1)}
                      </div>
                      
                      {testRequest.priority !== 'normal' && (
                        <div className="text-sm text-gray-600 mb-2">
                          Priority: <span className={`font-medium ${
                            testRequest.priority === 'urgent' ? 'text-red-600' :
                            testRequest.priority === 'high' ? 'text-orange-600' :
                            testRequest.priority === 'low' ? 'text-blue-600' :
                            'text-gray-600'
                          }`}>{testRequest.priority.toUpperCase()}</span>
                        </div>
                      )}
                      
                      {testResult && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-2">
                          <div className="text-sm font-medium text-gray-700 mb-1">Test Results:</div>
                          <div className="text-sm text-gray-600">
                            <div>Result Value: {testResult.result_value}</div>
                            <div>Normal Range: {testResult.normal_range}</div>
                            <div>Status: <span className={`font-medium ${
                              testResult.status === 'normal' ? 'text-green-600' :
                              testResult.status === 'abnormal' ? 'text-red-600' :
                              testResult.status === 'positive' ? 'text-red-600' :
                              testResult.status === 'negative' ? 'text-green-600' :
                              'text-gray-600'
                            }`}>{testResult.status}</span></div>
                            {testResult.units && <div>Units: {testResult.units}</div>}
                            {testResult.interpretation && <div>Interpretation: {testResult.interpretation}</div>}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Lab Tech: {testResult.lab_technician?.first_name} {testResult.lab_technician?.last_name}
                          </div>
                        </div>
                      )}
                      
                      {testRequest.notes && (
                        <div className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3">
                          <div className="font-medium text-gray-700 mb-1">Notes:</div>
                          {testRequest.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
            </>
          )}

          {/* Appointments View */}
          {currentView === 'appointments' && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Appointments</h2>
              {appointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No appointments scheduled</p>
                  <p className="text-gray-400 text-sm mt-1">Book your first appointment from the dashboard</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments
                    .sort((a, b) => {
                      // Sort by date first (latest first)
                      const dateA = new Date(a.appointment_date);
                      const dateB = new Date(b.appointment_date);
                      if (dateA.getTime() !== dateB.getTime()) {
                        return dateB.getTime() - dateA.getTime(); // Latest date first
                      }
                      // If same date, sort by time (latest first)
                      return b.appointment_time.localeCompare(a.appointment_time);
                    })
                    .slice(0, visibleAppointmentsCount)
                    .map((appointment) => (
                    <div key={appointment.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">{appointment.doctor.specialization}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                              {new Date(appointment.appointment_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-green-500" />
                              {appointment.appointment_time}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          appointment.status === 'scheduled'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : appointment.status === 'completed'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Load More Button */}
                  {appointments.length > visibleAppointmentsCount && (
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={() => setVisibleAppointmentsCount(prev => Math.min(prev + 3, appointments.length))}
                        className="w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-200 hover:scale-105"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bills View */}
          {currentView === 'bills' && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Bills</h2>
              {bills.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No bills found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bills.map(bill => (
                    <div key={bill.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-gray-900">Bill #{bill.id}</h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              bill.status === 'paid'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : bill.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {bill.status?.charAt(0).toUpperCase() + bill.status?.slice(1)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-1">Date: {new Date(bill.created_at).toLocaleDateString()}</div>
                          <div className="text-lg font-bold text-gray-900">₹{bill.amount}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reports View */}
          {currentView === 'reports' && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Test Reports</h2>
              
              {/* Test Status Overview */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-600">{testRequests.filter(t => t.status === 'pending').length}</div>
                  <div className="text-sm text-red-700">Pending</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-yellow-600">{testRequests.filter(t => t.status === 'in_progress').length}</div>
                  <div className="text-sm text-yellow-700">In Progress</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{testRequests.filter(t => t.status === 'completed').length}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">{testRequests.filter(t => t.status === 'sent_to_user').length}</div>
                  <div className="text-sm text-blue-700">Ready</div>
                </div>
              </div>

              {testRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No test requests found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testRequests.map(testRequest => {
                    const testResult = testResults.find(result => result.test_request_id === testRequest.id);
                    
                    return (
                      <div key={testRequest.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              testRequest.status === 'pending' ? 'bg-red-500' :
                              testRequest.status === 'in_progress' ? 'bg-yellow-500' :
                              testRequest.status === 'completed' ? 'bg-green-500' :
                              testRequest.status === 'sent_to_user' ? 'bg-blue-500' :
                              'bg-gray-500'
                            }`}></div>
                            <h3 className="font-semibold text-gray-900">{testRequest.test_name}</h3>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            testRequest.status === 'pending' ? 'bg-red-100 text-red-700' :
                            testRequest.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                            testRequest.status === 'completed' ? 'bg-green-100 text-green-700' :
                            testRequest.status === 'sent_to_user' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {testRequest.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          Doctor: Dr. {testRequest.doctor?.first_name} {testRequest.doctor?.last_name}
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          Type: {testRequest.test_type.charAt(0).toUpperCase() + testRequest.test_type.slice(1)}
                        </div>
                        
                        {testResult && (
                          <div className="bg-white rounded-lg p-3 mb-2">
                            <div className="text-sm font-medium text-gray-700 mb-1">Results:</div>
                            <div className="text-sm text-gray-600">
                              <div>Value: {testResult.result_value}</div>
                              <div>Range: {testResult.normal_range}</div>
                              <div>Status: <span className={`font-medium ${
                                testResult.status === 'normal' ? 'text-green-600' :
                                testResult.status === 'abnormal' ? 'text-red-600' :
                                testResult.status === 'positive' ? 'text-red-600' :
                                testResult.status === 'negative' ? 'text-green-600' :
                                'text-gray-600'
                              }`}>{testResult.status}</span></div>
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          {new Date(testRequest.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Settings View */}
          {currentView === 'settings' && (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
                  <p className="text-sm text-gray-600">Email: {profile?.email || user?.email}</p>
                  <p className="text-sm text-gray-600">Patient ID: {patientId || 'PATIENT-001'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Preferences</h3>
                  <p className="text-sm text-gray-600">Notification settings and other preferences will be available here.</p>
                </div>
              </div>
            </div>
          )}
      </main>
      </div>
      
      {/* Enhanced Chatbot */}
      <Chatbot 
        isOpen={chatbotOpen} 
        onToggle={() => setChatbotOpen(!chatbotOpen)}
        doctors={doctors.map(d => ({
          id: d.id,
          first_name: d.first_name,
          last_name: d.last_name,
          specialization: d.specialization
        }))}
        medicalFields={medicalFields}
        timeSlots={timeSlots}
        patientData={{
          id: patientId || '',
          name: profile?.first_name + ' ' + profile?.last_name || 'Patient',
          appointments: appointments,
          bills: bills,
          testResults: testResults,
          medications: [] // Add medications data if available
        }}
        onBookAppointment={async (appointmentData) => {
          if (!patientId) {
            throw new Error('Patient ID not found');
          }
          
          // Check if the doctor is available at the requested time
          const { available, error: availabilityError } = await checkDoctorAvailability(
            appointmentData.doctor,
            appointmentData.date,
            appointmentData.time
          );
          
          if (availabilityError && availabilityError.code !== 'PGRST116') {
            throw availabilityError;
          }
          
          if (!available) {
            // Doctor is not available, try to find alternative slots
            const { availableSlots, error: slotsError } = await getAvailableTimeSlots(
              appointmentData.doctor,
              appointmentData.date
            );
            
            if (slotsError) throw slotsError;
            
            if (availableSlots.length === 0) {
              throw new Error(`Dr. ${doctors.find(d => d.id === appointmentData.doctor)?.first_name || 'Unknown'} is fully booked on ${appointmentData.date}. Please choose a different date or doctor.`);
            } else {
              throw new Error(`The requested time slot (${appointmentData.time}) is not available. Available slots for ${appointmentData.date}: ${availableSlots.join(', ')}. Please try again with an available time.`);
            }
          }
          
          const { error } = await createAppointment({
            patient_id: patientId,
            doctor_id: appointmentData.doctor,
            appointment_date: appointmentData.date,
            appointment_time: appointmentData.time,
            status: 'scheduled'
          });

          if (error) throw error;

          // Refresh appointments list
          const { data: appointmentsData, error: appointmentsError } = await getPatientAppointments(patientId);
          if (appointmentsError) throw appointmentsError;
          setAppointments(appointmentsData || []);
        }}
        onRescheduleAppointment={async (appointmentId: string, newDate: string, newTime: string) => {
          // TODO: Implement reschedule functionality
          console.log('Reschedule requested:', { appointmentId, newDate, newTime });
          throw new Error('Reschedule functionality coming soon!');
        }}
        onCancelAppointment={async (appointmentId: string) => {
          // TODO: Implement cancel functionality
          console.log('Cancel requested:', appointmentId);
          throw new Error('Cancel functionality coming soon!');
        }}
        onViewTestResults={async () => {
          return testResults;
        }}
        onViewBills={async () => {
          return bills;
        }}
      />
    </div>
  );
} 