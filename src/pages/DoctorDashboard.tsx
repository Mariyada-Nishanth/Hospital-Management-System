import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDoctorAppointments, getDoctorBillRequests, updateBillRequest, getBillRequestByPatientId, createBillRequestWithTests } from '../lib/supabase';
import type { Database } from '../types/database';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  FileText, 
  DollarSign, 
  Search, 
  Filter,
  Bell,
  Activity,
  CheckCircle,
  LogOut,
  Settings,
  BookOpen
} from 'lucide-react';



const test_costs: { [key: string]: number } = {
  "CBC Test": 400, "Dengue Test": 800, "Malaria Test": 700, "Typhoid Test": 600,
  "Blood Sugar Test": 300, "Liver Function Test": 900, "Kidney Function Test": 1000,
  "ECG": 500, "MRI Scan": 5000, "CT Scan": 4500, "X-Ray": 800, "Ultrasound": 1200
};
const disease_costs: { [key: string]: number } = {
  "fever": 300, "cold": 250, "flu": 350, "pneumonia": 1200, "diabetes": 800,
  "hypertension": 700, "asthma": 600, "migraine": 500, "allergy": 400, "anemia": 750,
  "arthritis": 900, "bronchitis": 650, "chickenpox": 1000, "dengue": 1100, "malaria": 950,
  "typhoid": 1050, "covid-19": 1500,
};
const testList = Object.keys(test_costs);

type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  patient: Pick<Database['public']['Tables']['patients']['Row'], 'first_name' | 'last_name' | 'date_of_birth' | 'gender'>;
};

type BillRequest = Database['public']['Tables']['bill_requests']['Row'] & {
  patient: Pick<Database['public']['Tables']['patients']['Row'], 'first_name' | 'last_name'>;
};

export default function DoctorDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Add error boundary for the component
  const [componentError, setComponentError] = useState<string | null>(null);

  // Catch any component-level errors
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Component error:', error);
      setComponentError(error.message);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  const [tab, setTab] = useState<'patients' | 'bill-requests'>('patients');
  const [showModal, setShowModal] = useState(false);
  const [consultationFee, setConsultationFee] = useState('');
  const [disease, setDisease] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [diagnoses, setDiagnoses] = useState<{ [patientId: string]: any }>({});
  const [showBillModal, setShowBillModal] = useState(false);
  const [billPatient, setBillPatient] = useState<any>(null);
  const [showBillSent, setShowBillSent] = useState(false);
  const [billRequests, setBillRequests] = useState<BillRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort data based on search term
  const filteredAppointments = appointments
    .filter(appointment => {
      const patientName = `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`.toLowerCase();
      const date = appointment.appointment_date.toLowerCase();
      const time = appointment.appointment_time.toLowerCase();
      const status = appointment.status.toLowerCase();
      
      return patientName.includes(searchTerm.toLowerCase()) ||
             date.includes(searchTerm.toLowerCase()) ||
             time.includes(searchTerm.toLowerCase()) ||
             status.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      // Sort by date (latest first), then by time (latest first)
      const dateA = new Date(a.appointment_date);
      const dateB = new Date(b.appointment_date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime(); // Latest date first
      }
      
      // If same date, sort by time (latest first)
      return b.appointment_time.localeCompare(a.appointment_time);
    });

  const filteredBillRequests = billRequests
    .filter(req => {
      const patientName = `${req.patient?.first_name || ''} ${req.patient?.last_name || ''}`.toLowerCase();
      const amount = req.amount.toString();
      const status = req.status.toLowerCase();
      const notes = req.notes?.toLowerCase() || '';
      
      return patientName.includes(searchTerm.toLowerCase()) ||
             amount.includes(searchTerm.toLowerCase()) ||
             status.includes(searchTerm.toLowerCase()) ||
             notes.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      // Sort by created_at (latest first)
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime(); // Latest first
    });

  // Load doctor data function
  const loadDoctorData = async () => {
    if (!user || !profile || profile.role !== 'doctor') {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Load appointments and bill requests in parallel for faster loading
      const [appointmentsResult, billRequestsResult] = await Promise.all([
        getDoctorAppointments(user.id),
        getDoctorBillRequests(user.id)
      ]);
      
      if (appointmentsResult.error) throw appointmentsResult.error;
      setAppointments(appointmentsResult.data || []);
      
      if (billRequestsResult.error) throw billRequestsResult.error;
      setBillRequests(billRequestsResult.data || []);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load doctor data');
    } finally {
      setLoading(false);
    }
  };

  // Load doctor data
  useEffect(() => {
    loadDoctorData();
  }, [user?.id, profile?.id, profile?.role]);

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      navigate('/staff/login');
    } catch (err: any) {
      setError(err.message || 'An error occurred during logout');
    }
  };

  const handleTestChange = (test: string) => {
    setSelectedTests((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );
  };

  const getDiseaseCost = () => disease_costs[disease.trim().toLowerCase()] || 0;
  const getTestsCost = () => selectedTests.reduce((sum, t) => sum + (test_costs[t] || 0), 0);
  const getTotalCost = () => (parseInt(consultationFee) || 0) + getDiseaseCost() + getTestsCost();

  const handleWriteDiagnosis = (patient: any) => {
    setCurrentPatient(patient);
    setConsultationFee('');
    setDisease('');
    setSelectedTests([]);
    setShowModal(true);
  };

  const handleSaveDiagnosis = () => {
    setDiagnoses((prev) => ({
      ...prev,
      [currentPatient.id]: {
        consultationFee,
        disease,
        selectedTests,
        total: getTotalCost(),
      },
    }));
    setShowModal(false);
  };

  const handleRequestBill = (patient: any, appointmentStatus?: string) => {
    try {
      console.log('handleRequestBill called with:', patient, 'status:', appointmentStatus);
      setBillPatient({ ...patient, appointmentStatus });
    setShowBillModal(true);
    } catch (error) {
      console.error('Error in handleRequestBill:', error);
      setError('Error opening bill request modal');
    }
  };

  const handleSendBill = async () => {
    if (!billPatient || !diagnoses[billPatient.id]) {
      setError('No diagnosis found for this patient');
      return;
    }

    try {
      const totalAmount = diagnoses[billPatient.id].total;
      let existingBillRequest = null;
      
      if (billPatient.appointmentStatus === 'completed') {
        // For completed appointments, update existing bill request
        console.log('Updating existing bill request for patient:', billPatient.id);
        console.log('Patient ID type:', typeof billPatient.id);
        
        // First, find the existing bill request for this patient
        const { data: foundBillRequest, error: findError } = await getBillRequestByPatientId(billPatient.id);
        console.log('Search result:', { foundBillRequest, findError });
        
        if (findError) {
          console.error('Error finding bill request:', findError);
          throw findError;
        }
        
        existingBillRequest = foundBillRequest;
        
        if (existingBillRequest) {
          // Update existing bill request
          console.log('Found existing bill request:', existingBillRequest);
          const { error: updateError } = await updateBillRequest(existingBillRequest.id, {
            amount: totalAmount.toString(),
            notes: `${diagnoses[billPatient.id].disease} - Consultation Fee: ₹${diagnoses[billPatient.id].consultationFee}, Tests: ${diagnoses[billPatient.id].selectedTests?.join(', ')}`,
            updated_at: new Date().toISOString()
          });
          
          if (updateError) throw updateError;
          console.log('Bill request updated successfully');
        } else {
          // No existing bill request found, create a new one
          console.log('No existing bill request found, creating new bill request');
          const { error: createError } = await createBillRequestWithTests({
            patient_id: billPatient.id,
            doctor_id: user?.id || '',
            amount: totalAmount.toString(),
            status: 'pending',
            notes: `${diagnoses[billPatient.id].disease} - Consultation Fee: ₹${diagnoses[billPatient.id].consultationFee}, Tests: ${diagnoses[billPatient.id].selectedTests?.join(', ')}`
          }, diagnoses[billPatient.id].selectedTests || []);
          
          if (createError) throw createError;
          console.log('New bill request created successfully');
        }
      } else {
        // For scheduled appointments, create new bill request
        console.log('Creating new bill request for patient:', billPatient.id);
        
        const { error: createError } = await createBillRequestWithTests({
          patient_id: billPatient.id,
          doctor_id: user?.id || '',
          amount: totalAmount.toString(),
          status: 'pending',
          notes: `${diagnoses[billPatient.id].disease} - Consultation Fee: ₹${diagnoses[billPatient.id].consultationFee}, Tests: ${diagnoses[billPatient.id].selectedTests?.join(', ')}`
        }, diagnoses[billPatient.id].selectedTests || []);
        
        if (createError) throw createError;
        console.log('Bill request created successfully');
      }
      
      // Note: Local state update removed - relying on database refresh only
      // This prevents conflicts between local mock data and real database data
      
    setShowBillModal(false);
    setShowBillSent(true);
    setTimeout(() => setShowBillSent(false), 2000);
      
      // Refresh data from database to ensure UI is in sync
      await loadDoctorData();
      
    } catch (err: any) {
      console.error('Error handling bill:', err);
      setError(err.message || 'Failed to process bill');
    }
  };

  // Simple error boundary
  if (componentError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{componentError}</p>
          <button 
            onClick={() => {
              setComponentError(null);
              window.location.reload();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Error Display */}
      {componentError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 mx-4 mt-4">
          <strong>Error:</strong> {componentError}
          <button 
            onClick={() => setComponentError(null)}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ×
          </button>
          </div>
      )}

      {/* Clean Professional Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Stethoscope className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Doctor Portal
                </h1>
                <p className="text-sm text-gray-600">Dr. {profile?.first_name} {profile?.last_name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-md border border-blue-200">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700 font-medium">{appointments.length} Today</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-2 bg-orange-50 rounded-md border border-orange-200">
                  <Bell className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-700 font-medium">{billRequests.length} Pending</span>
                </div>
              </div>
              
              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <Settings className="h-5 w-5" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading doctor data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
      <div className="flex w-full px-6 py-6 gap-8">
        {/* Left Sidebar */}
        <aside className="hidden xl:block w-80 space-y-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {appointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    appointment.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {appointment.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appointment.patient?.first_name} {appointment.patient?.last_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {appointment.appointment_date} at {appointment.appointment_time}
                    </p>
                    <p className={`text-xs font-medium ${
                      appointment.status === 'completed' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {appointment.status}
                    </p>
                  </div>
                </div>
              ))}
              {appointments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h3>
            <div className="space-y-3">
              {appointments.filter(apt => apt.status === 'scheduled').slice(0, 4).map((appointment) => (
                <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {appointment.appointment_time}
                    </p>
                    <p className="text-xs text-gray-600">
                      {appointment.patient?.first_name} {appointment.patient?.last_name}
                    </p>
                  </div>
                </div>
              ))}
              {appointments.filter(apt => apt.status === 'scheduled').length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No scheduled appointments</p>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
        {/* Clean Professional Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Today's Appointments */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Today's Appointments</p>
                <p className="text-3xl font-bold text-gray-900">{appointments.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {appointments.filter(apt => apt.status === 'scheduled').length} scheduled
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Pending Bills */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pending Bills</p>
                <p className="text-3xl font-bold text-gray-900">{billRequests.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  ₹{billRequests.reduce((sum, bill) => sum + bill.amount, 0).toFixed(0)} total
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Completed Today */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Completed Today</p>
                <p className="text-3xl font-bold text-gray-900">
                  {appointments.filter(apt => apt.status === 'completed').length}
                </p>
                <p className="text-xs text-gray-500 mt-1">patients seen</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Next Appointment */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Next Appointment</p>
                <p className="text-lg font-bold text-gray-900">
                  {appointments.find(apt => apt.status === 'scheduled')?.appointment_time || 'None'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {appointments.find(apt => apt.status === 'scheduled')?.appointment_date || 'No upcoming'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
        {/* Clean Professional Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="flex">
            <button 
              className={`flex-1 py-4 px-6 font-medium transition-colors border-b-2 ${
                tab === 'patients' 
                  ? 'border-blue-600 text-blue-600 bg-blue-50' 
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`} 
              onClick={() => setTab('patients')}
            >
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Appointments</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  tab === 'patients' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  {appointments.length}
            </span>
          </div>
            </button>
            <button 
              className={`flex-1 py-4 px-6 font-medium transition-colors border-b-2 ${
                tab === 'bill-requests' 
                  ? 'border-blue-600 text-blue-600 bg-blue-50' 
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`} 
              onClick={() => setTab('bill-requests')}
            >
              <div className="flex items-center justify-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Bill Requests</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  tab === 'bill-requests' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  {billRequests.length}
            </span>
          </div>
            </button>
          </div>
        </div>
        
        {/* Clean Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${tab === 'patients' ? 'appointments' : 'bill requests'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button className="flex items-center space-x-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>
        {/* Appointments Tab */}
        {tab === 'patients' && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6">Appointments</h2>
            {appointments.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No appointments scheduled</div>
            ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PATIENT NAME</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DATE</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TIME</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NOTES</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">
                        {appointment.patient?.first_name} {appointment.patient?.last_name}
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">{appointment.appointment_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{appointment.appointment_time}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status}
                        </span>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">{appointment.notes || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          className="text-blue-600 hover:underline mr-4" 
                          onClick={() => handleWriteDiagnosis({
                            id: appointment.patient_id,
                            name: `${appointment.patient?.first_name} ${appointment.patient?.last_name}`
                          })}
                        >
                          Write Diagnosis
                        </button>
                        <button 
                          className={`hover:underline ${
                            appointment.status === 'completed' 
                              ? 'text-orange-600' 
                              : 'text-green-600'
                          }`}
                          onClick={() => handleRequestBill({
                            id: appointment.patient_id,
                            name: `${appointment.patient?.first_name} ${appointment.patient?.last_name}`
                          }, appointment.status)}
                        >
                          {appointment.status === 'completed' ? 'Edit Bill' : 'Request Bill'}
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}
        {/* Bill Requests Tab */}
        {tab === 'bill-requests' && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6">Bill Requests</h2>
            {billRequests.length === 0 ? (
              <div className="text-gray-500">No bill requests</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-48">PATIENT</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">AMOUNT</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">STATUS</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider min-w-96">NOTES</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">CREATED</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBillRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {req.patient?.first_name} {req.patient?.last_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">₹{req.amount}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                            req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            req.status === 'approved' ? 'bg-green-100 text-green-800' :
                            req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-md">
                            <div className="break-words whitespace-pre-wrap">
                              {req.notes || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {new Date(req.created_at).toLocaleDateString()}
                          </div>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}
        {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Write Diagnosis for {currentPatient?.name}</h2>
            <div className="mb-4">
              <label className="block font-medium mb-1">Consultation Fee:</label>
              <input type="number" className="border rounded px-2 py-1 w-full" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-1">Enter Disease (e.g., Fever):</label>
              <input type="text" className="border rounded px-2 py-1 w-full" value={disease} onChange={e => setDisease(e.target.value)} />
              {disease && (
                <div className="text-sm mt-1 text-gray-600">Disease Cost: ₹{getDiseaseCost()}</div>
              )}
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-1">Select Tests:</label>
              <div className="grid grid-cols-2 gap-2">
                {testList.map(test => (
                  <label key={test} className="flex items-center">
                    <input type="checkbox" className="mr-2" checked={selectedTests.includes(test)} onChange={() => handleTestChange(test)} />
                    {test} <span className="ml-2 text-xs text-gray-500">₹{test_costs[test]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="font-bold text-lg mt-4">Total Cost: ₹{getTotalCost()}</div>
            <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={handleSaveDiagnosis}>Save Diagnosis</button>
          </div>
        </div>
      )}
      {showBillModal && billPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowBillModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">
              {billPatient?.appointmentStatus === 'completed' ? 'Edit Bill' : 'Send Bill'} for {billPatient?.name || 'Unknown Patient'}
            </h2>
            {billPatient?.id && diagnoses[billPatient.id] ? (
              <div>
                <div className="mb-2">Consultation Fee: <b>₹{diagnoses[billPatient.id].consultationFee}</b></div>
                <div className="mb-2">Disease: <b>{diagnoses[billPatient.id].disease}</b> (₹{getDiseaseCost()})</div>
                <div className="mb-2">Tests: <b>{diagnoses[billPatient.id].selectedTests?.join(', ') || 'None'}</b></div>
                <div className="mb-2">Total: <b>₹{diagnoses[billPatient.id].total}</b></div>
                <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" onClick={handleSendBill}>
                  {billPatient?.appointmentStatus === 'completed' ? 'Update Bill' : 'Send Bill'}
                </button>
              </div>
            ) : (
              <div className="text-red-600">No diagnosis found for this patient. Please write a diagnosis first.</div>
            )}
          </div>
        </div>
      )}
      {showBillSent && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm text-center">
            <div className="text-green-600 text-2xl font-bold mb-4">Bill has successfully sent!</div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => setShowBillSent(false)}>Close</button>
          </div>
        </div>
      )}
        </main>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-80 space-y-6">
          {/* Patient Insights */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Insights</h3>
            <div className="space-y-4">
              {/* Today's Patient Stats */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="p-1 bg-blue-600 rounded">
                    <Calendar className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-900">Today's Patients</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {appointments.filter(apt => apt.appointment_date === new Date().toISOString().split('T')[0]).length}
                </div>
                <div className="text-xs text-blue-700">
                  {appointments.filter(apt => apt.appointment_date === new Date().toISOString().split('T')[0] && apt.status === 'completed').length} completed
                </div>
              </div>

              {/* Common Symptoms */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="p-1 bg-green-600 rounded">
                    <FileText className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-900">Common Symptoms</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-green-800">• Fever (3 cases)</div>
                  <div className="text-xs text-green-800">• Headache (2 cases)</div>
                  <div className="text-xs text-green-800">• Cough (1 case)</div>
                </div>
              </div>

              {/* Follow-up Reminders */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="p-1 bg-orange-600 rounded">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-orange-900">Follow-ups Due</span>
                </div>
                <div className="text-lg font-bold text-orange-900">2</div>
                <div className="text-xs text-orange-700">Patients need follow-up</div>
              </div>

              {/* Medical Resources */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="p-1 bg-purple-600 rounded">
                    <BookOpen className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-purple-900">Quick Reference</span>
                </div>
                <div className="space-y-1">
                  <button className="text-xs text-purple-800 hover:text-purple-900 underline">Drug Interactions</button>
                  <button className="text-xs text-purple-800 hover:text-purple-900 underline block">Dosage Calculator</button>
                  <button className="text-xs text-purple-800 hover:text-purple-900 underline block">Medical Guidelines</button>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Overview */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Weekly Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Patients Seen</span>
                <span className="font-semibold text-blue-900">
                  {appointments.filter(apt => apt.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Pending Bills</span>
                <span className="font-semibold text-blue-900">{billRequests.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Revenue</span>
                <span className="font-semibold text-blue-900">
                  ₹{billRequests.reduce((sum, bill) => sum + bill.amount, 0).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </aside>
        </div>
      )}
    </div>
  );
} 