-- Fixed RLS Policies for test_results table
-- This fixes the syntax error in test_lifecycle_schema.sql

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
