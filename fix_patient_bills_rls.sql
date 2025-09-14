-- Fix RLS policies for bills and bill_requests tables to allow patients to view their data
-- The issue is that the current policies check patient_id = auth.uid()
-- But auth.uid() should match patients.profile_id, not patients.id

-- ==============================================
-- FIX BILLS TABLE RLS POLICIES
-- ==============================================

-- Drop the existing incorrect policies
DROP POLICY IF EXISTS "Patients can view their bills" ON bills;
DROP POLICY IF EXISTS "Patients can view their own bills" ON bills;
DROP POLICY IF EXISTS "Patients can view bills by profile" ON bills;

-- Create the correct policy that matches auth.uid() with patients.profile_id
CREATE POLICY "Patients can view their own bills" ON bills
FOR SELECT
TO public
USING (
  patient_id IN (
    SELECT patients.id 
    FROM patients 
    WHERE patients.profile_id = auth.uid()
  )
);

-- Also create a simpler policy for direct matching (in case profile_id = patient_id)
CREATE POLICY "Patients can view bills by profile" ON bills
FOR SELECT
TO public
USING (
  patient_id = auth.uid()
);

-- Ensure RLS is enabled on bills table
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- FIX BILL_REQUESTS TABLE RLS POLICIES
-- ==============================================

-- Drop the existing incorrect policies
DROP POLICY IF EXISTS "Patients can view their bill requests" ON bill_requests;
DROP POLICY IF EXISTS "Patients can view their own bill requests" ON bill_requests;
DROP POLICY IF EXISTS "Patients can view bill requests by profile" ON bill_requests;

-- Create the correct policy that matches auth.uid() with patients.profile_id
CREATE POLICY "Patients can view their own bill requests" ON bill_requests
FOR SELECT
TO public
USING (
  patient_id IN (
    SELECT patients.id 
    FROM patients 
    WHERE patients.profile_id = auth.uid()
  )
);

-- Also create a simpler policy for direct matching (in case profile_id = patient_id)
CREATE POLICY "Patients can view bill requests by profile" ON bill_requests
FOR SELECT
TO public
USING (
  patient_id = auth.uid()
);

-- Ensure RLS is enabled on bill_requests table
ALTER TABLE bill_requests ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- VERIFY THE FIX
-- ==============================================

-- Test query to verify the policies work (run this after applying the policies)
-- SELECT 
--   b.id, 
--   b.patient_id, 
--   b.amount, 
--   b.status,
--   p.profile_id,
--   p.first_name,
--   p.last_name
-- FROM bills b
-- LEFT JOIN patients p ON b.patient_id = p.id
-- WHERE p.profile_id = auth.uid();
