-- Create test_reports table
CREATE TABLE IF NOT EXISTS test_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_request_id UUID NOT NULL REFERENCES bill_requests(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  lab_technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL, -- 'blood', 'urine', 'imaging', 'other'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  results JSONB, -- Store test results as JSON
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_reports_bill_request_id ON test_reports(bill_request_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_patient_id ON test_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_doctor_id ON test_reports(doctor_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_lab_technician_id ON test_reports(lab_technician_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_status ON test_reports(status);

-- Add RLS policies for test_reports
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;

-- Lab technicians can view and update their own test reports
CREATE POLICY "Lab technicians can view their test reports" ON test_reports
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lab_technician'
      AND profiles.id = test_reports.lab_technician_id
    )
  );

CREATE POLICY "Lab technicians can update their test reports" ON test_reports
  FOR UPDATE TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lab_technician'
      AND profiles.id = test_reports.lab_technician_id
    )
  );

-- Doctors can view test reports for their patients
CREATE POLICY "Doctors can view test reports for their patients" ON test_reports
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
      AND profiles.id = test_reports.doctor_id
    )
  );

-- Patients can view their own test reports
CREATE POLICY "Patients can view their own test reports" ON test_reports
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'patient'
      AND profiles.id = test_reports.patient_id
    )
  );

-- Billers can view test reports for billing purposes
CREATE POLICY "Billers can view test reports" ON test_reports
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Update profiles_role_check to include lab_technician
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('patient', 'doctor', 'biller', 'lab_technician'));
