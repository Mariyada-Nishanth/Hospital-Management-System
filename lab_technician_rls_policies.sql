-- Additional RLS Policies for Lab Technicians
-- Run this after the main test_reports_schema.sql

-- Lab Technicians can view approved bill requests (needed for "Pending Tests" tab)
CREATE POLICY "Lab Technicians can view approved bill requests" ON bill_requests
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lab_technician'
    )
    AND status = 'approved'
  );

-- Lab Technicians can view all patients (needed to display patient names)
CREATE POLICY "Lab Technicians can view all patients" ON patients
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lab_technician'
    )
  );

-- Lab Technicians can view all doctors (needed to display doctor names)
CREATE POLICY "Lab Technicians can view all doctors" ON doctors
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lab_technician'
    )
  );

-- Lab Technicians can insert test reports (needed to create new test reports)
CREATE POLICY "Lab Technicians can insert test reports" ON test_reports
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lab_technician'
    )
    AND lab_technician_id = auth.uid()
  );

-- Lab Technicians can view all test reports (needed for "Test Reports" tab)
CREATE POLICY "Lab Technicians can view all test reports" ON test_reports
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lab_technician'
    )
  );

-- Lab Technicians can update all test reports (needed to update test status and results)
CREATE POLICY "Lab Technicians can update all test reports" ON test_reports
  FOR UPDATE TO public USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lab_technician'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'lab_technician'
    )
  );

