import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  getApprovedBillRequestsForLab, 
  getTestReportsForLab, 
  createTestReport, 
  updateTestReport,
  getTestRequestsForBill,
  updateTestRequestStatus,
  createTestRequest,
  createTestResult
} from '../lib/supabase';
import type { Database } from '../types/database';
import { 
  FlaskConical,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  FileText,
  User,
  Calendar,
  LogOut,
  Settings,
  TestTube,
  Microscope,
  Activity
} from 'lucide-react';

type BillRequest = Database['public']['Tables']['bill_requests']['Row'] & {
  patient: {
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
  } | null;
  doctor: {
    first_name: string | null;
    last_name: string | null;
    specialization: string;
  } | null;
};

type TestReport = Database['public']['Tables']['test_reports']['Row'] & {
  patient: {
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
  } | null;
  doctor: {
    first_name: string | null;
    last_name: string | null;
    specialization: string;
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

const LabDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [approvedBills, setApprovedBills] = useState<BillRequest[]>([]);
  const [testReports, setTestReports] = useState<TestReport[]>([]);
  const [testRequests, setTestRequests] = useState<TestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'reports'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillRequest | null>(null);
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null);
  const [formData, setFormData] = useState({
    test_name: '',
    test_type: 'blood' as 'blood' | 'urine' | 'imaging' | 'other',
    result_value: '',
    normal_range: '',
    status: 'normal' as 'normal' | 'abnormal' | 'positive' | 'negative' | 'borderline',
    notes: ''
  });
  const [extractedTests, setExtractedTests] = useState<string[]>([]);
  const [updateData, setUpdateData] = useState({
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    results: '',
    notes: ''
  });

  useEffect(() => {
    if (user && profile && profile.role === 'lab_technician') {
      loadData();
    } else if (user?.id && profile?.id) {
      navigate('/staff/login');
    }
  }, [user?.id, profile?.id, profile?.role]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [approvedBillsResult, testReportsResult] = await Promise.all([
        getApprovedBillRequestsForLab(),
        getTestReportsForLab(user.id)
      ]);

      if (approvedBillsResult.error) throw approvedBillsResult.error;
      setApprovedBills(approvedBillsResult.data || []);

      if (testReportsResult.error) throw testReportsResult.error;
      setTestReports(testReportsResult.data || []);

      // Load test requests for all approved bills
      const allTestRequests = [];
      for (const bill of approvedBillsResult.data || []) {
        const testRequestsResult = await getTestRequestsForBill(bill.id);
        if (testRequestsResult.data) {
          allTestRequests.push(...testRequestsResult.data);
        }
      }
      setTestRequests(allTestRequests);

    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Function to detect test type based on test name
  const detectTestType = (testName: string): 'blood' | 'urine' | 'imaging' | 'other' => {
    const name = testName.toLowerCase();
    
    // Blood test keywords
    const bloodKeywords = [
      'blood', 'serum', 'plasma', 'hemoglobin', 'hba1c', 'glucose', 'sugar', 'cholesterol',
      'lipid', 'triglyceride', 'creatinine', 'urea', 'bilirubin', 'alt', 'ast', 'liver',
      'kidney', 'thyroid', 'tsh', 't3', 't4', 'vitamin', 'iron', 'ferritin', 'b12',
      'folate', 'malaria', 'dengue', 'typhoid', 'hepatitis', 'hiv', 'syphilis',
      'cbc', 'complete blood count', 'wbc', 'rbc', 'platelet', 'esr', 'crp',
      'prothrombin', 'aptt', 'inr', 'd-dimer', 'troponin', 'ck-mb', 'bnp',
      'psa', 'ca-125', 'cea', 'afp', 'hcg', 'progesterone', 'estradiol',
      'testosterone', 'cortisol', 'insulin', 'c-peptide', 'glucagon'
    ];
    
    // Urine test keywords
    const urineKeywords = [
      'urine', 'urinalysis', 'protein', 'albumin', 'ketone', 'nitrite', 'leukocyte',
      'bacteria', 'culture', 'sensitivity', 'microalbumin', 'creatinine clearance',
      'urine pregnancy', 'hcg urine', 'drug screen', 'toxicology'
    ];
    
    // Imaging test keywords
    const imagingKeywords = [
      'x-ray', 'xray', 'ct', 'mri', 'ultrasound', 'sonography', 'echo', 'ecg', 'ekg',
      'chest x-ray', 'abdominal', 'pelvic', 'mammogram', 'bone scan', 'pet scan',
      'angiography', 'fluoroscopy', 'endoscopy', 'colonoscopy', 'gastroscopy',
      'bronchoscopy', 'laparoscopy', 'arthroscopy', 'biopsy', 'pathology'
    ];
    
    // Check for blood tests
    if (bloodKeywords.some(keyword => name.includes(keyword))) {
      return 'blood';
    }
    
    // Check for urine tests
    if (urineKeywords.some(keyword => name.includes(keyword))) {
      return 'urine';
    }
    
    // Check for imaging tests
    if (imagingKeywords.some(keyword => name.includes(keyword))) {
      return 'imaging';
    }
    
    // Default to other if no match
    return 'other';
  };

  // Function to extract test names from bill request notes (excluding consultation fees)
  const extractTestsFromNotes = (notes: string): string[] => {
    if (!notes) return [];
    
    // Remove consultation fee information and clean up the text
    let cleanNotes = notes
      .replace(/Consultation Fee:.*?(?=Tests?|$)/gi, '')
      .replace(/fever\s*-\s*/gi, '')
      .replace(/₹\d+/g, '') // Remove currency amounts
      .trim();
    
    // Common test patterns to look for
    const testPatterns = [
      /Tests?:\s*([^.]+)/i,
      /Test\s+Names?:?\s*([^.]+)/i,
      /Laboratory\s+Tests?:?\s*([^.]+)/i,
      /Lab\s+Tests?:?\s*([^.]+)/i,
      /Blood\s+Tests?:?\s*([^.]+)/i,
      /Urine\s+Tests?:?\s*([^.]+)/i,
      /Imaging\s+Tests?:?\s*([^.]+)/i,
      /Diagnostic\s+Tests?:?\s*([^.]+)/i
    ];

    for (const pattern of testPatterns) {
      const match = cleanNotes.match(pattern);
      if (match && match[1]) {
        // Split by common separators and clean up
        const tests = match[1]
          .split(/[,;|&]/)
          .map(test => test.trim())
          .filter(test => test.length > 0 && !test.match(/^(and|or|with|for)$/i))
          .map(test => test.replace(/^(test|tests?)\s*/i, '').trim())
          .filter(test => test.length > 2 && !test.match(/^(₹|rupee|dollar|amount|fee)/i)); // Filter out currency and fee words
        
        if (tests.length > 0) {
          return tests;
        }
      }
    }

    // If no specific pattern found, try to extract from the general text
    // Look for capitalized words that might be test names
    const words = cleanNotes.split(/\s+/);
    const potentialTests = words
      .filter(word => 
        word.length > 3 && 
        /^[A-Z]/.test(word) && 
        !word.match(/^(Patient|Doctor|Amount|Consultation|Fee|Tests?|Blood|Urine|Imaging|₹|Rupee|Dollar)$/i)
      )
      .slice(0, 5); // Limit to 5 potential tests

    return potentialTests.length > 0 ? potentialTests : [];
  };

  // Function to get test completion status for a bill request
  const getTestCompletionStatus = (billRequestId: string) => {
    const completedTests = testRequests
      .filter(request => request.bill_request_id === billRequestId && request.status === 'completed')
      .map(request => request.test_name.toLowerCase().trim());
    
    return completedTests;
  };

  // Function to check if all tests are completed for a bill request
  const areAllTestsCompleted = (billRequestId: string) => {
    const billTestRequests = testRequests.filter(request => request.bill_request_id === billRequestId);
    
    if (billTestRequests.length === 0) return false;
    
    return billTestRequests.every(request => request.status === 'completed');
  };

  // Function to render test status indicators
  const renderTestStatus = (billRequestId: string) => {
    const billTestRequests = testRequests.filter(request => request.bill_request_id === billRequestId);
    
    if (billTestRequests.length === 0) {
      return <span className="text-gray-500 text-sm">No tests detected</span>;
    }
    
    return (
      <div className="space-y-1">
        {billTestRequests.map((test) => (
          <div key={test.id} className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              test.status === 'pending' ? 'bg-red-500' :
              test.status === 'in_progress' ? 'bg-yellow-500' :
              test.status === 'completed' ? 'bg-green-500' :
              test.status === 'sent_to_user' ? 'bg-blue-500' :
              'bg-gray-500'
            }`}></div>
            <span className={`text-sm ${
              test.status === 'pending' ? 'text-red-700' :
              test.status === 'in_progress' ? 'text-yellow-700' :
              test.status === 'completed' ? 'text-green-700' :
              test.status === 'sent_to_user' ? 'text-blue-700' :
              'text-gray-700'
            }`}>
              {test.test_name}
            </span>
            <span className="text-xs text-gray-500">({test.status})</span>
          </div>
        ))}
      </div>
    );
  };

  const handleCreateTestReport = async () => {
    if (!selectedBill || !user) return;

    try {
      // Find the test request for this test
      const testRequest = testRequests.find(req => 
        req.bill_request_id === selectedBill.id && 
        req.test_name === formData.test_name
      );

      if (!testRequest) {
        throw new Error('Test request not found');
      }

      // Create test result
      const testResultData = {
        test_request_id: testRequest.id,
        lab_technician_id: user.id,
        result_value: formData.result_value,
        normal_range: formData.normal_range,
        status: formData.status as 'normal' | 'abnormal' | 'positive' | 'negative' | 'borderline',
        units: formData.units || '',
        reference_range: formData.normal_range,
        interpretation: formData.notes,
        notes: formData.notes
      };

      const result = await createTestResult(testResultData);
      if (result.error) throw result.error;

      // Update test request status to completed
      const updateResult = await updateTestRequestStatus(testRequest.id, 'completed', 'Test results created');
      if (updateResult.error) throw updateResult.error;

      setShowCreateModal(false);
      setSelectedBill(null);
      setFormData({ 
        test_name: '', 
        test_type: 'blood', 
        result_value: '',
        normal_range: '',
        status: 'normal' as 'normal' | 'abnormal' | 'positive' | 'negative' | 'borderline',
        notes: '' 
      });
      setExtractedTests([]);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create test report');
    }
  };

  const handleUpdateTestReport = async () => {
    if (!selectedReport) return;

    try {
      const updatePayload = {
        status: updateData.status,
        notes: updateData.notes,
        completed_at: updateData.status === 'completed' ? new Date().toISOString() : null,
        results: updateData.results ? JSON.parse(updateData.results) : null
      };

      const { error } = await updateTestReport(selectedReport.id, updatePayload);
      if (error) throw error;

      setShowUpdateModal(false);
      setSelectedReport(null);
      setUpdateData({ status: 'pending', results: '', notes: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update test report');
    }
  };

  const filteredApprovedBills = approvedBills.filter(bill => {
    // Filter by search term
    const matchesSearch = `${bill.patient?.first_name} ${bill.patient?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Only hide bills when ALL tests are completed
    const allTestsCompleted = areAllTestsCompleted(bill.id);
    
    return matchesSearch && !allTestsCompleted;
  });

  const filteredTestReports = testReports.filter(report =>
    `${report.patient?.first_name} ${report.patient?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.test_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading laboratory data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FlaskConical className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Laboratory Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome, {profile?.first_name} {profile?.last_name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Pending Tests</div>
                <div className="text-xl font-bold text-orange-600">
                  {filteredApprovedBills.length}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Completed Today</div>
                <div className="text-xl font-bold text-green-600">
                  {testReports.filter(r => r.status === 'completed' && 
                    new Date(r.completed_at || '').toDateString() === new Date().toDateString()).length}
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex w-full px-6 py-6 gap-8">
        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Tests</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredApprovedBills.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TestTube className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {testReports.filter(r => r.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {testReports.filter(r => r.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{testReports.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pending'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Pending Tests</span>
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      {filteredApprovedBills.length}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'reports'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Test Reports</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {testReports.length}
                    </span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients or tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Pending Tests Tab */}
          {activeTab === 'pending' && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-xl font-bold mb-6">Pending Tests</h2>
              {filteredApprovedBills.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No pending tests</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-48">PATIENT</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">DOCTOR</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider min-w-96">TESTS REQUESTED</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">AMOUNT</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">CREATED</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-48">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredApprovedBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {bill.patient?.first_name} {bill.patient?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {bill.patient?.gender} • {bill.patient?.date_of_birth ? 
                                new Date(bill.patient.date_of_birth).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              Dr. {bill.doctor?.first_name} {bill.doctor?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{bill.doctor?.specialization}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-md">
                              {renderTestStatus(bill.id)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">₹{bill.amount}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {new Date(bill.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {areAllTestsCompleted(bill.id) ? (
                              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium text-center">
                                ✅ All Tests Completed
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedBill(bill);
                                  const billTestRequests = testRequests.filter(request => request.bill_request_id === bill.id);
                                  setExtractedTests(billTestRequests.map(req => req.test_name));
                                  // Pre-populate form with first pending test if available
                                  const pendingTest = billTestRequests.find(req => req.status === 'pending');
                                  if (pendingTest) {
                                    setFormData({
                                      test_name: pendingTest.test_name,
                                      test_type: pendingTest.test_type,
                                      result_value: '',
                                      normal_range: '',
                                      status: 'normal',
                                      notes: ''
                                    });
                                  } else {
                                    setFormData({
                                      test_name: '',
                                      test_type: 'blood',
                                      result_value: '',
                                      normal_range: '',
                                      status: 'normal',
                                      notes: ''
                                    });
                                  }
                                  setShowCreateModal(true);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                              >
                                Create Test Report
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Test Reports Tab */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-xl font-bold mb-6">Test Reports</h2>
              {filteredTestReports.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No test reports</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-48">PATIENT</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">TEST NAME</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">TYPE</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">STATUS</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-32">CREATED</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-48">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTestReports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {report.patient?.first_name} {report.patient?.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{report.test_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 capitalize">{report.test_type}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              report.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              report.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {report.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {new Date(report.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setUpdateData({
                                  status: report.status,
                                  results: report.results ? JSON.stringify(report.results, null, 2) : '',
                                  notes: report.notes || ''
                                });
                                setShowUpdateModal(true);
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                              Update Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create Test Report Modal */}
      {showCreateModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
            <button 
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" 
              onClick={() => {
                setShowCreateModal(false);
                setSelectedBill(null);
                setFormData({ 
                  test_name: '', 
                  test_type: 'blood', 
                  result_value: '',
                  normal_range: '',
                  status: 'normal',
                  notes: '' 
                });
                setExtractedTests([]);
              }}
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-4">Create Test Report</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                  <p className="text-sm text-gray-900">
                    {selectedBill.patient?.first_name} {selectedBill.patient?.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                  <p className="text-sm text-gray-900">
                    Dr. {selectedBill.doctor?.first_name} {selectedBill.doctor?.last_name}
                  </p>
                </div>
              </div>

              {/* Extracted Tests Section */}
              {extractedTests.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tests Found in Bill Request
                  </label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-3">
                      The following tests were automatically detected from the bill request:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {extractedTests.map((test, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            const detectedType = detectTestType(test);
                            setFormData({ 
                              ...formData, 
                              test_name: test,
                              test_type: detectedType
                            });
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            formData.test_name === test
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          }`}
                        >
                          {test}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Click on a test name to select it, or enter a custom test name below.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                <input
                  type="text"
                  value={formData.test_name}
                  onChange={(e) => {
                    const testName = e.target.value;
                    const detectedType = detectTestType(testName);
                    setFormData({ 
                      ...formData, 
                      test_name: testName,
                      test_type: detectedType
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter test name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                <select
                  value={formData.test_type}
                  onChange={(e) => setFormData({ ...formData, test_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="blood">Blood Test</option>
                  <option value="urine">Urine Test</option>
                  <option value="imaging">Imaging</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result Value</label>
                <input
                  type="text"
                  value={formData.result_value}
                  onChange={(e) => setFormData({ ...formData, result_value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 145 mg/dL or Parasite detected"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Normal Range</label>
                <input
                  type="text"
                  value={formData.normal_range}
                  onChange={(e) => setFormData({ ...formData, normal_range: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 70–110 mg/dL or Not detected"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'normal' | 'abnormal' | 'positive' | 'negative' | 'borderline' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="normal">Normal</option>
                  <option value="abnormal">Abnormal</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="borderline">Borderline</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateTestReport}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  Create Report
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedBill(null);
                    setFormData({ 
                      test_name: '', 
                      test_type: 'blood', 
                      result_value: '',
                      normal_range: '',
                      status: 'normal',
                      notes: '' 
                    });
                    setExtractedTests([]);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Test Report Modal */}
      {showUpdateModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
            <button 
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" 
              onClick={() => setShowUpdateModal(false)}
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-4">Update Test Report</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                  <p className="text-sm text-gray-900">
                    {selectedReport.patient?.first_name} {selectedReport.patient?.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                  <p className="text-sm text-gray-900">{selectedReport.test_name}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData({ ...updateData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Results (JSON)</label>
                <textarea
                  value={updateData.results}
                  onChange={(e) => setUpdateData({ ...updateData, results: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                  placeholder='{"parameter": "value", "normal_range": "range", "result": "value"}'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleUpdateTestReport}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
                >
                  Update Report
                </button>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabDashboard;
