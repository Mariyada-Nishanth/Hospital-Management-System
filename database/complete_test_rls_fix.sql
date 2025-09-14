-- Complete Fix for Missing RLS Policies
-- This resolves all RLS violations when creating test reports

-- ============================================
-- 1. FIX TEST_STATUS_HISTORY TABLE
-- ============================================

-- Lab technicians can insert test status history records
CREATE POLICY "lab_technicians_can_insert_test_status_history" ON test_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'lab_technician'
        )
    );

-- Billers can insert test status history records
CREATE POLICY "billers_can_insert_test_status_history" ON test_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'biller'
        )
    );

-- ============================================
-- 2. FIX TEST_RESULTS TABLE
-- ============================================

-- Drop the existing broken policy if it exists
DROP POLICY IF EXISTS "lab_technicians_can_manage_test_results" ON test_results;

-- Create proper individual policies for test_results
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

-- Billers can also manage test results
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
-- 3. VERIFICATION QUERIES
-- ============================================

-- Run these to verify the policies are working:
-- SELECT * FROM pg_policies WHERE tablename = 'test_status_history' AND cmd = 'INSERT';
-- SELECT * FROM pg_policies WHERE tablename = 'test_results' AND cmd = 'INSERT';
