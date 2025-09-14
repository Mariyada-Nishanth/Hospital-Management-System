import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getBillRequests, getBills, updateBillRequest, createBill, Database } from '../lib/supabase';
import Header from '../components/Header';
import InvoiceTable, { InvoiceData } from '../components/InvoiceTable';

const mockStats = {
  totalDue: 80,
  pendingRequests: 5,
  insuranceClaims: 12,
};

const mockRequests = [
  {
    id: 'R001',
    patient: 'John Smith',
    doctor: 'Dr. Sarah Johnson',
    services: 'Dengue Test, Typhoid Test, Malaria Test',
    status: 'Pending',
  },
];

const mockBills = [
  {
    id: 'B001',
    patient: 'John Smith',
    date: '2025-06-15',
    service: 'General Checkup',
    total: 150,
    insurance: 120,
    status: 'Pending',
  },
  {
    id: 'B002',
    patient: 'Priya Patel',
    date: '2025-06-16',
    service: 'Blood Test',
    total: 80,
    insurance: 50,
    status: 'Processing',
  },
  {
    id: 'B003',
    patient: 'Rahul Verma',
    date: '2025-06-17',
    service: 'X-Ray',
    total: 200,
    insurance: 180,
    status: 'Successful',
  },
];

type BillRequest = Database['public']['Tables']['bill_requests']['Row'] & {
  patient: Pick<Database['public']['Tables']['patients']['Row'], 'first_name' | 'last_name'>;
  doctor: Pick<Database['public']['Tables']['doctors']['Row'], 'first_name' | 'last_name'>;
};

type Bill = Database['public']['Tables']['bills']['Row'] & {
  patient: Pick<Database['public']['Tables']['patients']['Row'], 'first_name' | 'last_name'>;
  bill_request: Pick<Database['public']['Tables']['bill_requests']['Row'], 'notes' | 'amount'>;
};

export default function BillerDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [tab, setTab] = useState<'requests' | 'bills'>('requests');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [billRequests, setBillRequests] = useState<BillRequest[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('standard');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [showGeneratedInvoice, setShowGeneratedInvoice] = useState(false);
  const [generatedInvoiceData, setGeneratedInvoiceData] = useState<any>(null);

  // Filter data based on search term and status
  const filteredBillRequests = billRequests.filter(req => {
    // Only show pending bill requests in Bill Requests tab
    if (req.status !== 'pending') return false;
    
    const patientName = `${req.patient?.first_name || ''} ${req.patient?.last_name || ''}`.toLowerCase();
    const doctorName = `Dr. ${req.doctor?.first_name || ''} ${req.doctor?.last_name || ''}`.toLowerCase();
    const amount = req.amount.toString();
    const status = req.status.toLowerCase();
    const notes = req.notes?.toLowerCase() || '';
    
    return patientName.includes(searchTerm.toLowerCase()) ||
           doctorName.includes(searchTerm.toLowerCase()) ||
           amount.includes(searchTerm.toLowerCase()) ||
           status.includes(searchTerm.toLowerCase()) ||
           notes.includes(searchTerm.toLowerCase());
  });

  const filteredBills = bills.filter(bill => {
    // Show all bills in Bills tab
    const patientName = `${bill.patient?.first_name || ''} ${bill.patient?.last_name || ''}`.toLowerCase();
    const amount = bill.amount.toString();
    const status = bill.status.toLowerCase();
    const notes = bill.bill_request?.notes?.toLowerCase() || '';
    
    return patientName.includes(searchTerm.toLowerCase()) ||
           amount.includes(searchTerm.toLowerCase()) ||
           status.includes(searchTerm.toLowerCase()) ||
           notes.includes(searchTerm.toLowerCase());
  });

  // Load biller data
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let isLoading = false;
    
    const loadBillerData = async () => {
      if (!user || !profile || profile.role !== 'biller' || isLoading) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      
      isLoading = true;
      
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }
        
        // Load bill requests and bills in parallel for faster loading
        const [billRequestsResult, billsResult] = await Promise.all([
          getBillRequests(),
          getBills()
        ]);
        
        if (!isMounted) return;
        
        if (billRequestsResult.error) throw billRequestsResult.error;
        setBillRequests(billRequestsResult.data || []);
        
        if (billsResult.error) throw billsResult.error;
        setBills(billsResult.data || []);
        
      } catch (err: any) {
        if (isMounted) {
          console.error('BillerDashboard: Error loading data', err);
          setError(err.message || 'Failed to load biller data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
        isLoading = false;
      }
    };

    // Debounce the loading to prevent rapid re-renders during navigation
    timeoutId = setTimeout(loadBillerData, 200);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user?.id, profile?.id, profile?.role]);

  const handleSignOut = () => {
    signOut();
    navigate('/staff/login');
  };

  const handlePaymentTracking = () => {
    setShowPaymentModal(true);
  };

  const handleInvoiceGenerator = () => {
    setShowInvoiceModal(true);
  };

  const handleBillingAnalytics = () => {
    setShowAnalyticsModal(true);
  };

  const handleGenerateInvoice = () => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    const selectedRequest = billRequests.find(req => req.id === selectedPatient);
    if (!selectedRequest) {
      alert('Selected patient not found');
      return;
    }

    const invoiceData = {
      id: `INV-${Date.now()}`,
      patient: selectedRequest.patient,
      doctor: selectedRequest.doctor,
      amount: selectedRequest.amount,
      notes: invoiceNotes,
      template: selectedTemplate,
      generatedDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      services: [
        { name: 'Consultation Fee', price: 500, quantity: 1 },
        { name: 'Medical Tests', price: parseFloat(selectedRequest.amount) - 500, quantity: 1 }
      ]
    };

    setGeneratedInvoiceData(invoiceData);
    setShowGeneratedInvoice(true);
    setShowInvoiceModal(false);
  };

  const handlePrintInvoice = () => {
    const printContents = document.getElementById('print-invoice-content')?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Invoice</title>');
        printWindow.document.write('<style>body{font-family:Arial,sans-serif;margin:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#f2f2f2;}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const handleCloseInvoice = () => {
    setShowGeneratedInvoice(false);
    setGeneratedInvoiceData(null);
    setSelectedPatient('');
    setInvoiceNotes('');
    setSelectedTemplate('standard');
  };

  const handleViewDetails = (billRequest: BillRequest) => {
    setDetailsData({
      consultationFee: 500,
      tests: [
        { name: 'Dengue Test', price: 800 },
        { name: 'Typhoid Test', price: 600 },
        { name: 'Malaria Test', price: 700 },
      ],
    });
    setShowDetailsModal(true);
  };

  const handleCreateBill = (billRequest: BillRequest) => {
    setBillData({
      id: billRequest.id,
      patient_id: billRequest.patient_id,
      amount: billRequest.amount,
      patient: billRequest.patient?.first_name + ' ' + billRequest.patient?.last_name || 'Unknown Patient',
      doctor: billRequest.doctor?.first_name + ' ' + billRequest.doctor?.last_name || 'Unknown Doctor',
      consultationFee: 500,
      tests: [
        { name: 'Dengue Test', price: 800 },
        { name: 'Typhoid Test', price: 600 },
        { name: 'Malaria Test', price: 700 },
      ],
      total: parseFloat(billRequest.amount),
      requestId: billRequest.id,
      status: billRequest.status,
      billNo: 'BILL-' + billRequest.id.substring(0, 8).toUpperCase(),
      admitDate: new Date(billRequest.created_at).toISOString().split('T')[0],
      admitTillDate: new Date().toISOString().split('T')[0],
      address: '123 Main St, City',
      phone: '9876543210',
      email: 'john.smith@email.com',
      gstin: '22AAAAA0000A1Z5',
      discount: 100,
      amountPaid: 100,
    });
    setShowBillModal(true);
  };

  const handlePrint = async () => {
    if (!billData) return;
    
    try {
      console.log('Bill data being updated:', billData);
      console.log('Bill data ID:', billData.id);
      console.log('Bill data amount:', billData.amount, typeof billData.amount);
      
      // Show loading state
      setLoading(true);
      setError(null);
      
      // 1. Update bill request status to 'approved'
      const { error: updateError } = await updateBillRequest(billData.id, {
        status: 'approved'
      });
      
      if (updateError) {
        console.error('Error updating bill request:', updateError);
        setError('Failed to update bill request status');
        return;
      }
      
      // 2. Create a new bill record
      console.log('Creating bill with data:', {
        bill_request_id: billData.id,
        patient_id: billData.patient_id,
        amount: billData.amount,
        status: 'paid',
        payment_date: new Date().toISOString(),
        payment_method: 'cash'
      });
      
      const { error: createError } = await createBill({
        bill_request_id: billData.id,
        patient_id: billData.patient_id,
        amount: billData.amount,
        status: 'paid',
        payment_date: new Date().toISOString(),
        payment_method: 'cash' // Default payment method
      });
      
      if (createError) {
        console.error('Error creating bill:', createError);
        setError('Failed to create bill record');
        return;
      }
      
      // 3. Refresh data to show updated status (without page reload)
      try {
        const [billRequestsResult, billsResult] = await Promise.all([
          getBillRequests(),
          getBills()
        ]);
        
        if (billRequestsResult.data) {
          setBillRequests(billRequestsResult.data);
        }
        if (billsResult.data) {
          setBills(billsResult.data);
        }
        
        // Show success message
        setError(null);
        console.log('Bill processed successfully and data refreshed');
      } catch (refreshError) {
        console.error('Error refreshing data:', refreshError);
        // Don't show error to user, just log it
      }
      
      // 4. Close the modal first
      setShowBillModal(false);
      
      // 5. Hide loading state
      setLoading(false);
      
      // 5. Open print window
    const printContents = document.getElementById('print-bill-content')?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Bill</title>');
        printWindow.document.write('</head><body >');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
      }
      
    } catch (err: any) {
      console.error('Error in handlePrint:', err);
      setError(err.message || 'Failed to process bill');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 mx-4 mt-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading biller data...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && (
        <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="w-full px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center space-x-8">
              <div className="h-20 w-20 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
          </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Biller Portal</h1>
                <p className="text-base text-gray-600">{profile?.first_name} {profile?.last_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-10">
              <div className="flex items-center space-x-5 text-blue-600">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xl font-bold">{billRequests.filter(req => req.status === 'pending').length}</div>
                  <div className="text-base text-gray-600">Pending</div>
                </div>
              </div>
              <div className="flex items-center space-x-5 text-orange-600">
                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="h-10 w-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xl font-bold">{bills.length}</div>
                  <div className="text-base text-gray-600">Bills</div>
                </div>
              </div>
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                <svg className="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <button 
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 flex items-center space-x-4 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-lg font-medium">Logout</span>
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="w-full px-6 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {billRequests.slice(0, 3).map((req, index) => (
                  <div key={req.id} className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      req.status === 'pending' ? 'bg-yellow-500' :
                      req.status === 'approved' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-gray-900 truncate">
                        {req.patient?.first_name} {req.patient?.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString()}
                      </p>
          </div>
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      req.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {req.status}
            </span>
          </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Billing Tools</h3>
              <div className="space-y-3">
                <button 
                  onClick={handlePaymentTracking}
                  className="w-full flex items-center space-x-6 p-5 text-left hover:bg-blue-50 rounded-xl transition-colors"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="h-9 w-9 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Payment Tracking</p>
                    <p className="text-base text-gray-500">Monitor payment status</p>
                  </div>
                </button>
                <button 
                  onClick={handleInvoiceGenerator}
                  className="w-full flex items-center space-x-6 p-5 text-left hover:bg-green-50 rounded-xl transition-colors"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="h-9 w-9 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Invoice Generator</p>
                    <p className="text-base text-gray-500">Create professional invoices</p>
                  </div>
                </button>
                <button 
                  onClick={handleBillingAnalytics}
                  className="w-full flex items-center space-x-6 p-5 text-left hover:bg-purple-50 rounded-xl transition-colors"
                >
                  <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="h-9 w-9 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Billing Analytics</p>
                    <p className="text-base text-gray-500">View revenue insights</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-4 space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{billRequests.length}</p>
                    <p className="text-base text-gray-600">Total Requests</p>
                  </div>
                  <div className="w-20 h-20 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="h-12 w-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{billRequests.filter(req => req.status === 'pending').length}</p>
                    <p className="text-base text-gray-600">Pending Bills</p>
                  </div>
                  <div className="w-20 h-20 bg-orange-100 rounded-xl flex items-center justify-center">
                    <svg className="h-12 w-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{bills.filter(bill => bill.status === 'paid').length}</p>
                    <p className="text-base text-gray-600">Completed Today</p>
                  </div>
                  <div className="w-20 h-20 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">10:00:00</p>
                    <p className="text-base text-gray-600">Next Review</p>
                  </div>
                  <div className="w-20 h-20 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="h-12 w-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
          </div>
        </div>
        {/* Tabs */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-10 px-8">
                  <button
                    onClick={() => setTab('requests')}
                    className={`py-5 px-2 border-b-2 font-medium text-base ${
                      tab === 'requests'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Bill Requests
                  </button>
                  <button
                    onClick={() => setTab('bills')}
                    className={`py-5 px-2 border-b-2 font-medium text-base ${
                      tab === 'bills'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Bills
                  </button>
                </nav>
        </div>
              {/* Search and Filter */}
              <div className="px-8 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        className="block w-96 pl-14 pr-5 py-4 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-lg" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button className="flex items-center space-x-5 px-8 py-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <svg className="h-9 w-9 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                      </svg>
                      <span className="text-lg font-medium text-gray-600">Filter</span>
                    </button>
                  </div>
                </div>
              </div>

        {/* Requests Tab */}
        {tab === 'requests' && (
                <div>
                  {loading ? (
                    <div className="px-8 py-16">
                      <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-6 bg-gray-200 rounded"></div>
                          ))}
            </div>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="px-8 py-16">
                      <div className="text-center">
                        <div className="mx-auto h-16 w-16 text-red-400 mb-6">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">Error loading requests</h3>
                        <p className="text-lg text-red-600">{error}</p>
                      </div>
                    </div>
                  ) : billRequests.length === 0 ? (
                    <div className="px-8 py-16">
                      <div className="text-center">
                        <div className="mx-auto h-16 w-16 text-gray-400 mb-6">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No bill requests</h3>
                        <p className="text-lg text-gray-500">No bill requests found matching your criteria.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">PATIENT NAME</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">DOCTOR</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">AMOUNT</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">NOTES</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                          {filteredBillRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50">
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="text-base font-medium text-gray-900">
                                  {req.patient?.first_name} {req.patient?.last_name}
                                </div>
                    </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="text-base text-gray-900">
                                  Dr. {req.doctor?.first_name} {req.doctor?.last_name}
                                </div>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="text-base font-semibold text-gray-900">₹{req.amount}</div>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className={`px-3 py-2 text-sm rounded-full ${
                                  req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="text-base text-gray-500">{req.notes || '-'}</div>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap text-base font-medium">
                                <div className="flex space-x-3">
                                  <button 
                                    onClick={() => handleViewDetails(req)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    View Details
                                  </button>
                                  <button 
                                    onClick={() => handleCreateBill(req)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Create Bill
                                  </button>
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

        {/* Bills Tab */}
        {tab === 'bills' && (
                <div>
                  {loading ? (
                    <div className="px-8 py-16">
                      <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
                        <div className="space-y-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-6 bg-gray-200 rounded"></div>
                          ))}
            </div>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="px-8 py-16">
                      <div className="text-center">
                        <div className="mx-auto h-16 w-16 text-red-400 mb-6">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">Error loading bills</h3>
                        <p className="text-lg text-red-600">{error}</p>
                      </div>
                    </div>
                  ) : filteredBills.length === 0 ? (
                    <div className="px-8 py-16">
                      <div className="text-center">
                        <div className="mx-auto h-16 w-16 text-gray-400 mb-6">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No approved bills</h3>
                        <p className="text-lg text-gray-500">No approved bills found matching your criteria.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">PATIENT NAME</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">DOCTOR</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">AMOUNT</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">NOTES</th>
                            <th className="px-8 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                          {filteredBills.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50">
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="text-base font-medium text-gray-900">
                                  {req.patient?.first_name} {req.patient?.last_name}
                                </div>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="text-base text-gray-900">
                                  Dr. {req.doctor?.first_name} {req.doctor?.last_name}
                                </div>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="text-base font-semibold text-gray-900">₹{req.amount}</div>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className={`px-3 py-2 text-sm rounded-full ${
                                  req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <div className="text-base text-gray-500">{req.notes || '-'}</div>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap text-base font-medium">
                                <div className="flex space-x-3">
                                  <button 
                                    onClick={() => handleViewDetails(req)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    View Details
                                  </button>
                                  <button 
                                    onClick={() => handleCreateBill(req)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Process Bill
                                  </button>
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
            </div>
          </div>
        </div>
      </main>
      {showDetailsModal && detailsData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative transform transition-all">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Request Details</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Consultation Fee:</span>
                  <span className="font-semibold text-gray-900">₹{detailsData.consultationFee}</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Tests:</h4>
                  <div className="space-y-2">
              {detailsData.tests.map((test: any) => (
                      <div key={test.name} className="flex justify-between items-center py-1">
                        <span className="text-gray-600">{test.name}</span>
                        <span className="font-medium text-gray-900">₹{test.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center py-3 border-t border-gray-200 bg-gray-50 rounded-lg px-4">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-lg font-bold text-green-600">₹{500 + 800 + 600 + 700}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
              <button 
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-150 font-medium"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showBillModal && billData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative transform transition-all max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Generate Bill</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                  onClick={() => setShowBillModal(false)}
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Print-optimized styles */}
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #print-bill-content, #print-bill-content * { visibility: visible; }
                #print-bill-content { position: absolute; left: 0; top: 0; width: 100vw; background: white; }
              }
              #print-bill-content {
                font-family: Arial, sans-serif;
                color: #222;
              }
              #print-bill-content .bill-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #0891b2;
                padding: 8px 16px;
              }
              #print-bill-content .bill-logo {
                height: 48px;
              }
              #print-bill-content .bill-title {
                text-align: center;
                font-weight: bold;
                font-size: 1.3rem;
                background: #e0f2fe;
                border-bottom: 2px solid #0891b2;
                padding: 8px 0;
              }
              #print-bill-content .bill-info {
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #0891b2;
                padding: 8px 16px;
                font-size: 0.95rem;
              }
              #print-bill-content .bill-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 0;
              }
              #print-bill-content .bill-table th, #print-bill-content .bill-table td {
                border: 1px solid #0891b2;
                padding: 4px 8px;
              }
              #print-bill-content .bill-table th {
                background: #e0f2fe;
                text-align: center;
              }
              #print-bill-content .bill-table td {
                text-align: right;
              }
              #print-bill-content .bill-table td.desc {
                text-align: left;
              }
              #print-bill-content .bill-table td.unit, #print-bill-content .bill-table td.qty, #print-bill-content .bill-table td.gst {
                text-align: center;
              }
              #print-bill-content .bill-summary {
                width: 50%;
                margin-left: auto;
                font-size: 0.95rem;
                border-bottom: 2px solid #0891b2;
              }
              #print-bill-content .bill-summary-row {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
              }
              #print-bill-content .bill-summary-row.bold {
                font-weight: bold;
              }
              #print-bill-content .bill-section {
                border-bottom: 2px solid #0891b2;
                padding: 6px 16px;
                font-size: 0.95rem;
              }
              #print-bill-content .bill-signatures {
                display: flex;
                justify-content: space-between;
                padding: 8px 16px;
                border-bottom: 2px solid #0891b2;
                font-size: 0.95rem;
              }
              #print-bill-content .bill-signature-line {
                display: inline-block;
                border-top: 1px solid #222;
                width: 160px;
                margin-top: 16px;
                text-align: center;
              }
              #print-bill-content .bill-footer {
                text-align: center;
                font-size: 0.95rem;
                padding: 8px 0;
              }
            `}</style>
            <div id="print-bill-content">
              <div className="bill-header">
                <div>
                  <div className="font-bold text-lg">Company Name</div>
                  <div className="text-xs">Address:</div>
                  <div className="text-xs">Phone No.: {billData.phone}</div>
                  <div className="text-xs">Email ID: {billData.email}</div>
                  <div className="text-xs">GSTIN: {billData.gstin}</div>
                </div>
                <img src="https://vyaparwebsiteimages.vypcdn.in/vyapar_logo/vyapar_logo/vyapar_logo.png" alt="Vyapar Logo" className="bill-logo" />
              </div>
              <div className="bill-title">Hospital Bill Book</div>
              <div className="bill-info">
                <div>
                  <div>Bill To:</div>
                  <div>Patient Name: {billData.patient}</div>
                  <div>Address: {billData.address}</div>
                  <div>Phone No.: {billData.phone}</div>
                  <div>Email ID: {billData.email}</div>
                  <div>GSTIN: {billData.gstin}</div>
                </div>
                <div>
                  <div>Bill No.: {billData.billNo}</div>
                  <div>Admit Date: {billData.admitDate}</div>
                  <div>Admit Till Date: {billData.admitTillDate}</div>
                </div>
              </div>
              <table className="bill-table">
                <thead>
                  <tr>
                    <th>Sl. No.</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Quantity</th>
                    <th>Price / Unit</th>
                    <th>GST (%)</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td className="desc">Consultation Fee</td>
                    <td className="unit">Hour</td>
                    <td className="qty">1</td>
                    <td>₹{billData.consultationFee}</td>
                    <td className="gst">0%</td>
                    <td>₹{billData.consultationFee}</td>
                  </tr>
                  {billData.tests.map((test: any, idx: number) => (
                    <tr key={test.name}>
                      <td>{idx + 2}</td>
                      <td className="desc">{test.name}</td>
                      <td className="unit">Test</td>
                      <td className="qty">1</td>
                      <td>₹{test.price}</td>
                      <td className="gst">0%</td>
                      <td>₹{test.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bill-summary">
                <div className="bill-summary-row"><span>Sub Total:</span> <span>₹{billData.total}</span></div>
                <div className="bill-summary-row"><span>Discount:</span> <span>₹{billData.discount}</span></div>
                <div className="bill-summary-row bold"><span>Final Amount:</span> <span>₹{billData.total - billData.discount}</span></div>
                <div className="bill-summary-row"><span>Amount Paid:</span> <span>₹{billData.amountPaid}</span></div>
                <div className="bill-summary-row"><span>Balance:</span> <span>₹{billData.total - billData.discount - billData.amountPaid}</span></div>
              </div>
              <div className="bill-section">Amount In Words: Two Thousand Six Hundred Only</div>
              <div className="bill-section">Declaration</div>
              <div className="bill-signatures">
                <div>
                  <div className="bill-signature-line"></div>
                  <div>Client's Signature</div>
                </div>
                <div>
                  <div className="bill-signature-line"></div>
                  <div>Business Signature</div>
                </div>
              </div>
              <div className="bill-footer">Thanks for business with us!!! Please visit us again !!!</div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 sticky bottom-0">
              <div className="flex space-x-3">
                <button 
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-150 font-medium flex items-center justify-center"
                  onClick={handlePrint}
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Bill
                </button>
                <button 
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150 font-medium"
                  onClick={() => setShowBillModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
         </>
       )}
       
       {/* Payment Tracking Modal */}
       {showPaymentModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative transform transition-all max-h-[90vh] overflow-y-auto">
             <div className="px-8 py-6 border-b border-gray-200 sticky top-0 bg-white">
               <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-semibold text-gray-900">Payment Tracking</h3>
                 <button 
                   className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                   onClick={() => setShowPaymentModal(false)}
                 >
                   <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
             </div>
             <div className="px-8 py-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div className="bg-blue-50 rounded-lg p-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-3xl font-bold text-blue-600">{bills.filter(bill => bill.status === 'paid').length}</p>
                       <p className="text-lg text-blue-800">Paid Bills</p>
                     </div>
                     <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                       <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                     </div>
                   </div>
                 </div>
                 <div className="bg-yellow-50 rounded-lg p-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-3xl font-bold text-yellow-600">{bills.filter(bill => bill.status === 'pending').length}</p>
                       <p className="text-lg text-yellow-800">Pending Payments</p>
                     </div>
                     <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center">
                       <svg className="h-10 w-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                     </div>
                   </div>
                 </div>
                 <div className="bg-red-50 rounded-lg p-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-3xl font-bold text-red-600">{bills.filter(bill => bill.status === 'overdue').length}</p>
                       <p className="text-lg text-red-800">Overdue</p>
                     </div>
                     <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                       <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                       </svg>
                     </div>
                   </div>
                 </div>
               </div>
               <div className="bg-white rounded-lg border border-gray-200">
                 <div className="px-6 py-4 border-b border-gray-200">
                   <h4 className="text-xl font-semibold text-gray-900">Recent Payments</h4>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Patient</th>
                         <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Amount</th>
                         <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Status</th>
                         <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase">Date</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {bills.slice(0, 5).map((bill) => (
                         <tr key={bill.id} className="hover:bg-gray-50">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-base font-medium text-gray-900">
                               {bill.patient?.first_name} {bill.patient?.last_name}
                             </div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-base font-semibold text-gray-900">₹{bill.amount}</div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <span className={`px-3 py-1 text-sm rounded-full ${
                               bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                               bill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                               'bg-red-100 text-red-800'
                             }`}>
                               {bill.status}
                             </span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-base text-gray-500">
                               {new Date(bill.created_at).toLocaleDateString()}
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
             <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 sticky bottom-0">
               <button 
                 className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-150 font-medium text-lg"
                 onClick={() => setShowPaymentModal(false)}
               >
                 Close
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Invoice Generator Modal */}
       {showInvoiceModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative transform transition-all">
             <div className="px-8 py-6 border-b border-gray-200">
               <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-semibold text-gray-900">Invoice Generator</h3>
                 <button 
                   className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                   onClick={() => setShowInvoiceModal(false)}
                 >
                   <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
             </div>
             <div className="px-8 py-6">
               <div className="space-y-6">
                 <div>
                   <label className="block text-lg font-medium text-gray-700 mb-2">Select Patient</label>
                   <select 
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                     value={selectedPatient}
                     onChange={(e) => setSelectedPatient(e.target.value)}
                   >
                     <option value="">Choose a patient...</option>
                     {billRequests.map((req) => (
                       <option key={req.id} value={req.id}>
                         {req.patient?.first_name} {req.patient?.last_name} - ₹{req.amount}
                       </option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-lg font-medium text-gray-700 mb-2">Invoice Template</label>
                   <div className="grid grid-cols-2 gap-4">
                     <button 
                       className={`p-4 border-2 rounded-lg transition-colors ${
                         selectedTemplate === 'standard' 
                           ? 'border-green-500 bg-green-50' 
                           : 'border-gray-200 hover:border-green-500'
                       }`}
                       onClick={() => setSelectedTemplate('standard')}
                     >
                       <div className="text-center">
                         <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                           <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                           </svg>
                         </div>
                         <p className="text-sm font-medium text-gray-900">Standard</p>
                       </div>
                     </button>
                     <button 
                       className={`p-4 border-2 rounded-lg transition-colors ${
                         selectedTemplate === 'detailed' 
                           ? 'border-green-500 bg-green-50' 
                           : 'border-gray-200 hover:border-green-500'
                       }`}
                       onClick={() => setSelectedTemplate('detailed')}
                     >
                       <div className="text-center">
                         <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                           <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                           </svg>
                         </div>
                         <p className="text-sm font-medium text-gray-900">Detailed</p>
                       </div>
                     </button>
                   </div>
                 </div>
                 <div>
                   <label className="block text-lg font-medium text-gray-700 mb-2">Additional Notes</label>
                   <textarea 
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                     rows={3}
                     placeholder="Add any additional notes for the invoice..."
                     value={invoiceNotes}
                     onChange={(e) => setInvoiceNotes(e.target.value)}
                   ></textarea>
                 </div>
               </div>
             </div>
             <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
               <div className="flex space-x-4">
                 <button 
                   className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-150 font-medium text-lg"
                   onClick={handleGenerateInvoice}
                 >
                   Generate Invoice
                 </button>
                 <button 
                   className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150 font-medium text-lg"
                   onClick={() => setShowInvoiceModal(false)}
                 >
                   Cancel
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Generated Invoice Modal */}
       {showGeneratedInvoice && generatedInvoiceData && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative transform transition-all max-h-[90vh] overflow-y-auto">
             <div className="px-8 py-6 border-b border-gray-200 sticky top-0 bg-white">
               <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-semibold text-gray-900">Generated Invoice</h3>
                 <button 
                   className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
                   onClick={handleCloseInvoice}
                 >
                   <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
             </div>
             <div id="print-invoice-content" className="px-8 py-6">
               <div className="bg-white border border-gray-200 rounded-lg p-8">
                 <div className="text-center mb-8">
                   <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
                   <p className="text-lg text-gray-600">Invoice #{generatedInvoiceData.id}</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                   <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-2">Bill To:</h3>
                     <p className="text-base text-gray-700">{generatedInvoiceData.patient?.first_name} {generatedInvoiceData.patient?.last_name}</p>
                     <p className="text-base text-gray-700">Patient ID: {generatedInvoiceData.patient?.id || 'N/A'}</p>
                   </div>
                   <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice Details:</h3>
                     <p className="text-base text-gray-700">Date: {new Date(generatedInvoiceData.generatedDate).toLocaleDateString()}</p>
                     <p className="text-base text-gray-700">Due Date: {new Date(generatedInvoiceData.dueDate).toLocaleDateString()}</p>
                     <p className="text-base text-gray-700">Doctor: Dr. {generatedInvoiceData.doctor?.first_name} {generatedInvoiceData.doctor?.last_name}</p>
                   </div>
                 </div>

                 <div className="mb-8">
                   <table className="w-full border-collapse border border-gray-300">
                     <thead>
                       <tr className="bg-gray-50">
                         <th className="border border-gray-300 px-4 py-3 text-left text-base font-semibold text-gray-900">Service</th>
                         <th className="border border-gray-300 px-4 py-3 text-center text-base font-semibold text-gray-900">Quantity</th>
                         <th className="border border-gray-300 px-4 py-3 text-right text-base font-semibold text-gray-900">Price</th>
                         <th className="border border-gray-300 px-4 py-3 text-right text-base font-semibold text-gray-900">Total</th>
                       </tr>
                     </thead>
                     <tbody>
                       {generatedInvoiceData.services.map((service: any, index: number) => (
                         <tr key={index}>
                           <td className="border border-gray-300 px-4 py-3 text-base text-gray-700">{service.name}</td>
                           <td className="border border-gray-300 px-4 py-3 text-center text-base text-gray-700">{service.quantity}</td>
                           <td className="border border-gray-300 px-4 py-3 text-right text-base text-gray-700">₹{service.price}</td>
                           <td className="border border-gray-300 px-4 py-3 text-right text-base text-gray-700">₹{service.price * service.quantity}</td>
                         </tr>
                       ))}
                     </tbody>
                     <tfoot>
                       <tr className="bg-gray-50">
                         <td colSpan={3} className="border border-gray-300 px-4 py-3 text-right text-lg font-semibold text-gray-900">Total Amount:</td>
                         <td className="border border-gray-300 px-4 py-3 text-right text-lg font-bold text-gray-900">₹{generatedInvoiceData.amount}</td>
                       </tr>
                     </tfoot>
                   </table>
                 </div>

                 {generatedInvoiceData.notes && (
                   <div className="mb-8">
                     <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Notes:</h3>
                     <p className="text-base text-gray-700 bg-gray-50 p-4 rounded-lg">{generatedInvoiceData.notes}</p>
                   </div>
                 )}

                 <div className="text-center text-sm text-gray-500">
                   <p>Thank you for choosing our medical services!</p>
                   <p>Please make payment within 30 days of invoice date.</p>
                 </div>
               </div>
             </div>
             <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 sticky bottom-0">
               <div className="flex space-x-4">
                 <button 
                   className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-150 font-medium text-lg"
                   onClick={handlePrintInvoice}
                 >
                   Print Invoice
                 </button>
                 <button 
                   className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150 font-medium text-lg"
                   onClick={handleCloseInvoice}
                 >
                   Close
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
} 