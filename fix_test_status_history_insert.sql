-- Fix Missing INSERT Policy for test_status_history Table
-- This resolves the "new row violates row-level security policy for table test_status_history" error

-- Lab technicians can insert test status history records
CREATE POLICY "lab_technicians_can_insert_test_status_history" ON test_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'lab_technician'
        )
    );

-- Billers can also insert test status history records (if needed)
CREATE POLICY "billers_can_insert_test_status_history" ON test_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'biller'
        )
    );

-- Optional: Allow doctors to insert test status history (if they need to update status)
CREATE POLICY "doctors_can_insert_test_status_history" ON test_status_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'doctor'
        )
    );
