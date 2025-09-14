import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = 'https://mmutzjuvbmymcqhhzjhk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdXR6anV2Ym15bWNxaGh6amhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzOTAwMTQsImV4cCI6MjA2NDk2NjAxNH0.uIUhBj3cy9EbpSAMUwmDyoR5oXx_jfYfpJB-gdJ-cPs'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Auth helper functions
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Profile helper functions
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

// Ensure patient record exists for user
export const ensurePatientRecord = async (profileId: string, profileData?: any) => {
  // Check if patient record exists
  const { data: existingPatient, error: checkError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', profileId)
    .single()

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
    return { data: null, error: checkError }
  }

  // If patient record doesn't exist, create it
  if (!existingPatient) {
    // Use provided profile data or fetch if not provided
    let firstName = null;
    let lastName = null;
    
    if (profileData) {
      firstName = profileData.first_name;
      lastName = profileData.last_name;
    } else {
      // Fallback: fetch profile data if not provided
      const { data: fetchedProfileData } = await getProfile(profileId);
      firstName = fetchedProfileData?.first_name || null;
      lastName = fetchedProfileData?.last_name || null;
    }
    
    const { data, error } = await supabase
      .from('patients')
      .insert({
        id: profileId,
        profile_id: profileId,
        first_name: firstName,
        last_name: lastName
      })
      .select()
      .single()
    return { data, error }
  }

  return { data: existingPatient, error: null }
}

// Ensure doctor record exists for user
export const ensureDoctorRecord = async (profileId: string, profileData?: any) => {
  // Check if doctor record exists
  const { data: existingDoctor, error: checkError } = await supabase
    .from('doctors')
    .select('id')
    .eq('id', profileId)
    .single()

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
    return { data: null, error: checkError }
  }

  // If doctor record doesn't exist, create it
  if (!existingDoctor) {
    // Use provided profile data or fetch if not provided
    let firstName = 'Dr.';
    let lastName = 'Doctor';
    
    if (profileData) {
      firstName = profileData.first_name || 'Dr.';
      lastName = profileData.last_name || 'Doctor';
    } else {
      // Fallback: fetch profile data if not provided
      const { data: fetchedProfileData } = await getProfile(profileId);
      firstName = fetchedProfileData?.first_name || 'Dr.';
      lastName = fetchedProfileData?.last_name || 'Doctor';
    }
    
    const { data, error } = await supabase
      .from('doctors')
      .insert({
        id: profileId,
        profile_id: profileId,
        first_name: firstName,
        last_name: lastName,
        specialization: 'General Medicine'
      })
      .select()
      .single()
    return { data, error }
  }

  return { data: existingDoctor, error: null }
}

// Patient helper functions
export const getPatient = async (profileId: string) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', profileId)
    .single()
  return { data, error }
}

export const createPatient = async (patientData: Database['public']['Tables']['patients']['Insert']) => {
  const { data, error } = await supabase
    .from('patients')
    .insert(patientData)
    .select()
    .single()
  return { data, error }
}

// Doctor helper functions
export const getDoctors = async () => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
  return { data, error }
}

export const getDoctor = async (profileId: string) => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', profileId)
    .single()
  return { data, error }
}

// Appointment helper functions
export const getPatientAppointments = async (patientId: string) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      doctor:doctors (
        first_name,
        last_name,
        specialization
      )
    `)
    .eq('patient_id', patientId)
    .order('appointment_date', { ascending: true })
  return { data, error }
}

export const getDoctorAppointments = async (doctorId: string) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patients (
        first_name,
        last_name,
        date_of_birth,
        gender
      )
    `)
    .eq('doctor_id', doctorId)
    .order('appointment_date', { ascending: true })
  return { data, error }
}

export const createAppointment = async (appointmentData: Database['public']['Tables']['appointments']['Insert']) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single()
  return { data, error }
}

// Check if a doctor is available at a specific date and time
export const checkDoctorAvailability = async (doctorId: string, appointmentDate: string, appointmentTime: string) => {
  const { error } = await supabase
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', appointmentDate)
    .eq('appointment_time', appointmentTime)
    .single()
  
  // If we get data, the slot is taken
  // If we get an error (no rows), the slot is available
  return { available: !!error, error }
}

// Get available time slots for a doctor on a specific date
export const getAvailableTimeSlots = async (doctorId: string, appointmentDate: string) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('appointment_time')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', appointmentDate)
  
  if (error) return { availableSlots: [], error }
  
  const bookedTimes = data?.map(apt => apt.appointment_time) || []
  const allTimeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM',
    '02:00 PM', '03:00 PM', '04:00 PM',
  ]
  
  const availableSlots = allTimeSlots.filter(slot => !bookedTimes.includes(slot))
  return { availableSlots, error: null }
}

export const updateAppointmentStatus = async (
  appointmentId: string,
  status: Database['public']['Tables']['appointments']['Update']['status']
) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .select()
    .single()
  return { data, error }
}

// Bill request helper functions
export const getPatientBillRequests = async (patientId: string) => {
  const { data, error } = await supabase
    .from('bill_requests')
    .select(`
      *,
      doctor:doctors (
        first_name,
        last_name,
        specialization
      )
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getDoctorBillRequests = async (doctorId: string) => {
  const { data, error } = await supabase
    .from('bill_requests')
    .select(`
      *,
      patient:patients (
        first_name,
        last_name
      )
    `)
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const createBillRequest = async (billRequestData: Database['public']['Tables']['bill_requests']['Insert']) => {
  const { data, error } = await supabase
    .from('bill_requests')
    .insert(billRequestData)
    .select()
    .single()
  return { data, error }
}

// Create bill request with test requests
export const createBillRequestWithTests = async (
  billRequestData: Database['public']['Tables']['bill_requests']['Insert'],
  selectedTests: string[]
) => {
  try {
    // 1. Create the bill request
    const { data: billRequest, error: billError } = await supabase
      .from('bill_requests')
      .insert(billRequestData)
      .select()
      .single()

    if (billError) {
      console.error('Error creating bill request:', billError)
      return { data: null, error: billError }
    }

    console.log('Bill request created successfully:', billRequest)

    // 2. Create test requests for each selected test
    if (selectedTests && selectedTests.length > 0) {
      const testRequestsToCreate = selectedTests.map(testName => ({
        bill_request_id: billRequest.id,
        patient_id: billRequestData.patient_id,
        doctor_id: billRequestData.doctor_id,
        test_name: testName,
        test_type: detectTestType(testName),
        status: 'pending' as const,
        priority: 'normal' as const,
        estimated_duration: 30
      }))

      console.log('Creating test requests:', testRequestsToCreate)

      const { data: testRequests, error: testError } = await supabase
        .from('test_requests')
        .insert(testRequestsToCreate)
        .select()

      if (testError) {
        console.error('Error creating test requests:', testError)
        // Don't fail the whole operation, just log the error
        return { data: billRequest, error: null, testRequestsError: testError }
      }

      console.log('Test requests created successfully:', testRequests)
      return { data: billRequest, error: null, testRequests }
    }

    return { data: billRequest, error: null }
  } catch (err: any) {
    console.error('Error in createBillRequestWithTests:', err)
    return { data: null, error: err }
  }
}

// Bill helper functions
export const getPatientBills = async (patientId: string) => {
  const { data, error } = await supabase
    .from('bills')
    .select(`
      *,
      bill_request:bill_requests (
        notes,
        doctor:doctors (
          first_name,
          last_name,
          specialization
        )
      )
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const updateBillStatus = async (
  billId: string,
  status: Database['public']['Tables']['bills']['Update']['status']
) => {
  const { data, error } = await supabase
    .from('bills')
    .update({ status })
    .eq('id', billId)
    .select()
    .single()
  return { data, error }
}

// Update bill amount and details
export const updateBill = async (
  billId: string,
  updates: Database['public']['Tables']['bills']['Update']
) => {
  const { data, error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', billId)
    .select()
    .single()
  return { data, error }
}

// Get bill request by patient ID (to find existing bill requests)
export const getBillRequestByPatientId = async (patientId: string) => {
  const { data, error } = await supabase
    .from('bill_requests')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
  return { data: data?.[0] || null, error }
}

// Create bill
export const createBill = async (billData: Database['public']['Tables']['bills']['Insert']) => {
  const { data, error } = await supabase
    .from('bills')
    .insert(billData)
    .select()
    .single()
  return { data, error }
}

// Update bill request
export const updateBillRequest = async (
  billRequestId: string,
  updates: Database['public']['Tables']['bill_requests']['Update']
) => {
  const { data, error } = await supabase
    .from('bill_requests')
    .update(updates)
    .eq('id', billRequestId)
    .select()
    .single()
  return { data, error }
}

export const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
  // Always sign out first to clear any existing session
  await supabase.auth.signOut();

  console.log('Starting signUp', { email, password, firstName, lastName });
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  console.log('SignUp result:', { data, error });
  if (error || !data.user) return { data, error };

  // Wait for session to be available
  let session = (await supabase.auth.getSession()).data.session;
  console.log('Session after signUp:', session);
  if (!session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    console.log('SignIn after signUp:', { signInData, signInError });
    if (signInError) return { data, error: signInError };
    session = signInData.session;
  }

  // Add a short delay to allow session propagation
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Insert into profiles
  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    role: 'patient',
  });
  console.log('Insert into profiles:', { profileError });
  if (profileError) return { data, error: profileError };

  // Insert into patients
  const { error: patientError } = await supabase.from('patients').insert({
    id: data.user.id,
    // Add other required fields if needed
  });
  console.log('Insert into patients:', { patientError });
  return { data, error: patientError };
};

// Get all bill requests (for biller)
export const getBillRequests = async () => {
  const { data, error } = await supabase
    .from('bill_requests')
    .select(`
      *,
      patient:patients!bill_requests_patient_id_fkey (
        first_name,
        last_name
      ),
      doctor:doctors!bill_requests_doctor_id_fkey (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Get all bills (for biller)
export const getBills = async () => {
  const { data, error } = await supabase
    .from('bills')
    .select(`
      *,
      patient:patients!bills_patient_id_fkey (
        first_name,
        last_name
      ),
      bill_request:bill_requests!bills_bill_request_id_fkey (
        notes,
        amount
      )
    `)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Test Reports Functions

// Get approved bill requests for lab technician (these will become test reports)
export const getApprovedBillRequestsForLab = async () => {
  const { data, error } = await supabase
    .from('bill_requests')
    .select(`
      *,
      patient:patients!bill_requests_patient_id_fkey (
        first_name,
        last_name,
        date_of_birth,
        gender
      ),
      doctor:doctors!bill_requests_doctor_id_fkey (
        first_name,
        last_name,
        specialization
      )
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
  return { data, error }
}

// Create test report from approved bill request
export const createTestReport = async (testReportData: {
  bill_request_id: string
  patient_id: string
  doctor_id: string
  lab_technician_id: string
  test_name: string
  test_type: 'blood' | 'urine' | 'imaging' | 'other'
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  notes?: string
  completed_at?: string
  results?: any
}) => {
  const { data, error } = await supabase
    .from('test_reports')
    .insert(testReportData)
    .select(`
      *,
      patient:patients!test_reports_patient_id_fkey (
        first_name,
        last_name
      ),
      doctor:doctors!test_reports_doctor_id_fkey (
        first_name,
        last_name,
        specialization
      ),
      bill_request:bill_requests!test_reports_bill_request_id_fkey (
        notes,
        amount
      )
    `)
    .single()
  return { data, error }
}

// Get test reports for lab technician
export const getTestReportsForLab = async (labTechnicianId: string) => {
  const { data, error } = await supabase
    .from('test_reports')
    .select(`
      *,
      patient:patients!test_reports_patient_id_fkey (
        first_name,
        last_name,
        date_of_birth,
        gender
      ),
      doctor:doctors!test_reports_doctor_id_fkey (
        first_name,
        last_name,
        specialization
      ),
      bill_request:bill_requests!test_reports_bill_request_id_fkey (
        notes,
        amount
      )
    `)
    .eq('lab_technician_id', labTechnicianId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Get test reports for a specific patient
export const getTestReportsForPatient = async (patientId: string) => {
  const { data, error } = await supabase
    .from('test_reports')
    .select(`
      *,
      doctor:doctors!test_reports_doctor_id_fkey (
        first_name,
        last_name,
        specialization
      ),
      lab_technician:profiles!test_reports_lab_technician_id_fkey (
        first_name,
        last_name
      ),
      bill_request:bill_requests!test_reports_bill_request_id_fkey (
        notes,
        amount
      )
    `)
    .eq('patient_id', patientId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
  return { data, error }
}

// Update test report
export const updateTestReport = async (
  testReportId: string,
  updateData: {
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    results?: any
    notes?: string
    completed_at?: string
  }
) => {
  const { data, error } = await supabase
    .from('test_reports')
    .update(updateData)
    .eq('id', testReportId)
    .select(`
      *,
      patient:patients!test_reports_patient_id_fkey (
        first_name,
        last_name
      ),
      doctor:doctors!test_reports_doctor_id_fkey (
        first_name,
        last_name,
        specialization
      ),
      bill_request:bill_requests!test_reports_bill_request_id_fkey (
        notes,
        amount
      )
    `)
    .single()
  return { data, error }
}

// Enhanced Test Tracking Functions

// Get test requests for a specific bill request
export const getTestRequestsForBill = async (billRequestId: string) => {
  const { data, error } = await supabase
    .from('test_requests')
    .select(`
      *,
      patient:patients!test_requests_patient_id_fkey (
        first_name,
        last_name
      ),
      doctor:doctors!test_requests_doctor_id_fkey (
        first_name,
        last_name,
        specialization
      )
    `)
    .eq('bill_request_id', billRequestId)
    .order('created_at', { ascending: true })
  return { data, error }
}

// Update test request status
export const updateTestRequestStatus = async (
  testRequestId: string,
  newStatus: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled',
  reason?: string
) => {
  const { data, error } = await supabase.rpc('update_test_status', {
    p_test_request_id: testRequestId,
    p_new_status: newStatus,
    p_reason: reason
  })
  return { data, error }
}

// Create test request
export const createTestRequest = async (testRequestData: {
  bill_request_id: string
  patient_id: string
  doctor_id: string
  test_name: string
  test_type: 'blood' | 'urine' | 'imaging' | 'other'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  estimated_duration?: number
  notes?: string
}) => {
  const { data, error } = await supabase
    .from('test_requests')
    .insert(testRequestData)
    .select()
    .single()
  return { data, error }
}

// Get test results for a test request
export const getTestResults = async (testRequestId: string) => {
  const { data, error } = await supabase
    .from('test_results')
    .select(`
      *,
      lab_technician:profiles!test_results_lab_technician_id_fkey (
        first_name,
        last_name
      )
    `)
    .eq('test_request_id', testRequestId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Create test result
export const createTestResult = async (testResultData: {
  test_request_id: string
  lab_technician_id: string
  result_value: string
  normal_range: string
  status: 'normal' | 'abnormal' | 'positive' | 'negative' | 'borderline'
  units?: string
  reference_range?: string
  interpretation?: string
  notes?: string
}) => {
  const { data, error } = await supabase
    .from('test_results')
    .insert(testResultData)
    .select()
    .single()
  return { data, error }
}

// Get test status history for a test request
export const getTestStatusHistory = async (testRequestId: string) => {
  const { data, error } = await supabase
    .from('test_status_history')
    .select(`
      *,
      changed_by_user:profiles!test_status_history_changed_by_fkey (
        first_name,
        last_name,
        role
      )
    `)
    .eq('test_request_id', testRequestId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Populate test_requests from existing bill_requests (for migration)
export const populateTestRequestsFromBills = async () => {
  // Get all approved bill requests that don't have test_requests yet
  const { data: approvedBills, error: billsError } = await supabase
    .from('bill_requests')
    .select(`
      id,
      patient_id,
      doctor_id,
      notes,
      created_at
    `)
    .eq('status', 'approved')

  if (billsError) return { data: null, error: billsError }

  const testRequestsToCreate = []

  for (const bill of approvedBills || []) {
    // Extract test names from notes
    const testNames = extractTestNamesFromNotes(bill.notes || '')
    
    for (const testName of testNames) {
      const testType = detectTestType(testName)
      
      testRequestsToCreate.push({
        bill_request_id: bill.id,
        patient_id: bill.patient_id,
        doctor_id: bill.doctor_id,
        test_name: testName,
        test_type: testType,
        status: 'pending' as const,
        priority: 'normal' as const,
        estimated_duration: 30,
        created_at: bill.created_at
      })
    }
  }

  if (testRequestsToCreate.length > 0) {
    const { data, error } = await supabase
      .from('test_requests')
      .insert(testRequestsToCreate)
      .select()
    return { data, error }
  }

  return { data: [], error: null }
}

// Fix existing bills that don't have test requests created
export const fixMissingTestRequests = async () => {
  console.log('Starting to fix missing test requests...')
  
  // Get all approved bill requests that don't have test_requests yet
  const { data: approvedBills, error: billsError } = await supabase
    .from('bill_requests')
    .select(`
      id,
      patient_id,
      doctor_id,
      notes,
      created_at
    `)
    .eq('status', 'approved')

  if (billsError) {
    console.error('Error fetching approved bills:', billsError)
    return { data: null, error: billsError }
  }

  console.log(`Found ${approvedBills?.length || 0} approved bills`)

  const testRequestsToCreate = []

  for (const bill of approvedBills || []) {
    // Check if this bill already has test requests
    const { data: existingRequests } = await supabase
      .from('test_requests')
      .select('id')
      .eq('bill_request_id', bill.id)
      .limit(1)

    if (existingRequests && existingRequests.length > 0) {
      console.log(`Bill ${bill.id} already has test requests, skipping`)
      continue
    }

    // Extract test names from notes
    const testNames = extractTestNamesFromNotes(bill.notes || '')
    console.log(`Bill ${bill.id} notes: "${bill.notes}"`)
    console.log(`Extracted tests:`, testNames)
    
    for (const testName of testNames) {
      const testType = detectTestType(testName)
      
      testRequestsToCreate.push({
        bill_request_id: bill.id,
        patient_id: bill.patient_id,
        doctor_id: bill.doctor_id,
        test_name: testName,
        test_type: testType,
        status: 'pending' as const,
        priority: 'normal' as const,
        estimated_duration: 30,
        created_at: bill.created_at
      })
    }
  }

  console.log(`Creating ${testRequestsToCreate.length} test requests`)

  if (testRequestsToCreate.length > 0) {
    const { data, error } = await supabase
      .from('test_requests')
      .insert(testRequestsToCreate)
      .select()

    if (error) {
      console.error('Error creating test requests:', error)
      return { data: null, error }
    }

    console.log(`Successfully created ${data?.length || 0} test requests`)
    return { data, error: null }
  }

  return { data: [], error: null }
}

// Helper function to extract test names from notes
const extractTestNamesFromNotes = (notes: string): string[] => {
  if (!notes) return []
  
  // Remove consultation fee information and clean up the text
  let cleanNotes = notes
    .replace(/Consultation Fee:.*?(?=Tests?|$)/gi, '')
    .replace(/fever\s*-\s*/gi, '')
    .replace(/₹\d+/g, '') // Remove currency amounts
    .trim()
  
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
  ]

  for (const pattern of testPatterns) {
    const match = cleanNotes.match(pattern)
    if (match && match[1]) {
      // Split by common separators and clean up
      const tests = match[1]
        .split(/[,;|&]/)
        .map(test => test.trim())
        .filter(test => test.length > 0 && !test.match(/^(and|or|with|for)$/i))
        .map(test => test.replace(/^(test|tests?)\s*/i, '').trim())
        .filter(test => test.length > 2 && !test.match(/^(₹|rupee|dollar|amount|fee)/i))
      
      if (tests.length > 0) {
        console.log('Extracted tests from notes:', tests)
        return tests
      }
    }
  }

  // If no specific pattern found, try to extract from the general text
  const words = cleanNotes.split(/\s+/)
  const potentialTests = words
    .filter(word => 
      word.length > 3 && 
      /^[A-Z]/.test(word) && 
      !word.match(/^(Patient|Doctor|Amount|Consultation|Fee|Tests?|Blood|Urine|Imaging|₹|Rupee|Dollar)$/i)
    )
    .slice(0, 5)

  console.log('No pattern match found, using potential tests:', potentialTests)
  return potentialTests.length > 0 ? potentialTests : []
}

// Helper function to detect test type
const detectTestType = (testName: string): 'blood' | 'urine' | 'imaging' | 'other' => {
  const name = testName.toLowerCase()
  
  if (name.includes('blood') || name.includes('cbc') || name.includes('sugar') || 
      name.includes('malaria') || name.includes('dengue') || name.includes('typhoid') ||
      name.includes('liver') || name.includes('kidney') || name.includes('ecg')) {
    return 'blood'
  }
  
  if (name.includes('urine')) {
    return 'urine'
  }
  
  if (name.includes('x-ray') || name.includes('ct') || name.includes('mri') || 
      name.includes('ultrasound') || name.includes('scan')) {
    return 'imaging'
  }
  
  return 'other'
}