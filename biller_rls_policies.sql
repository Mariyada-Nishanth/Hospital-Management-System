-- Missing RLS Policies for Billers
-- Run this to fix the "Failed to update bill request status" error

-- Billers can view all bill requests (needed for Bill Requests tab)
CREATE POLICY "billers_can_view_all_bill_requests" ON bill_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Billers can update all bill requests (needed to approve/reject requests)
CREATE POLICY "billers_can_update_all_bill_requests" ON bill_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Billers can view all bills (needed for Bills tab)
CREATE POLICY "billers_can_view_all_bills" ON bills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Billers can create bills (needed to create bills from approved requests)
CREATE POLICY "billers_can_create_bills" ON bills
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Billers can update all bills (needed to update bill status)
CREATE POLICY "billers_can_update_all_bills" ON bills
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Billers can view all patients (needed to display patient names)
CREATE POLICY "billers_can_view_all_patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Billers can view all doctors (needed to display doctor names)
CREATE POLICY "billers_can_view_all_doctors" ON doctors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Additional policies for test_requests table (if billers need to access it)
-- Billers can insert test requests (if needed for auto-population)
CREATE POLICY "billers_can_insert_test_requests" ON test_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Billers can update test requests (if needed for status management)
CREATE POLICY "billers_can_update_test_requests" ON test_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );
