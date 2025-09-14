-- Complete RLS Fix for Biller Dashboard Issues
-- This fixes all the RLS policy violations preventing bill request updates

-- ============================================
-- 1. FIX BILL_REQUESTS TABLE POLICIES
-- ============================================

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

-- ============================================
-- 2. FIX BILLS TABLE POLICIES
-- ============================================

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

-- ============================================
-- 3. FIX PATIENTS AND DOCTORS POLICIES
-- ============================================

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

-- ============================================
-- 4. FIX TEST_REQUESTS TABLE POLICIES
-- ============================================

-- Billers can insert test requests (needed for auto-population)
CREATE POLICY "billers_can_insert_test_requests" ON test_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- Billers can update test requests (needed for status management)
CREATE POLICY "billers_can_update_test_requests" ON test_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'biller'
    )
  );

-- ============================================
-- 5. FIX TEST_RESULTS TABLE POLICIES
-- ============================================

-- Drop the existing broken policy if it exists
DROP POLICY IF EXISTS "lab_technicians_can_manage_test_results" ON test_results;

-- Create correct policies for test_results
CREATE POLICY "lab_technicians_can_view_test_results" ON test_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'lab_technician'
        )
    );

CREATE POLICY "lab_technicians_can_insert_test_results" ON test_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'lab_technician'
        )
    );

CREATE POLICY "lab_technicians_can_update_test_results" ON test_results
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'lab_technician'
        )
    );

-- Billers can also manage test results (if needed)
CREATE POLICY "billers_can_view_test_results" ON test_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'biller'
        )
    );

CREATE POLICY "billers_can_insert_test_results" ON test_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'biller'
        )
    );

CREATE POLICY "billers_can_update_test_results" ON test_results
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'biller'
        )
    );

-- ============================================
-- 6. FIX TEST_STATUS_HISTORY POLICIES
-- ============================================

-- Billers can insert test status history (needed for audit trail)
CREATE POLICY "billers_can_insert_test_status_history" ON test_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'biller'
        )
    );

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify the policies are working:
-- SELECT * FROM pg_policies WHERE tablename = 'bill_requests' AND policyname LIKE '%biller%';
-- SELECT * FROM pg_policies WHERE tablename = 'bills' AND policyname LIKE '%biller%';
-- SELECT * FROM pg_policies WHERE tablename = 'test_requests' AND policyname LIKE '%biller%';
