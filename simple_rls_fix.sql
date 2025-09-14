-- Simple fix for patient bills RLS policies
-- This script drops existing policies and creates the correct ones

-- Fix bills table
DROP POLICY IF EXISTS "Patients can view their bills" ON bills;
DROP POLICY IF EXISTS "Patients can view their own bills" ON bills;
DROP POLICY IF EXISTS "Patients can view bills by profile" ON bills;

CREATE POLICY "Patients can view their bills" ON bills
FOR SELECT
TO public
USING (
  patient_id IN (
    SELECT patients.id 
    FROM patients 
    WHERE patients.profile_id = auth.uid()
  )
);

-- Fix bill_requests table
DROP POLICY IF EXISTS "Patients can view their bill requests" ON bill_requests;
DROP POLICY IF EXISTS "Patients can view their own bill requests" ON bill_requests;
DROP POLICY IF EXISTS "Patients can view bill requests by profile" ON bill_requests;

CREATE POLICY "Patients can view their bill requests" ON bill_requests
FOR SELECT
TO public
USING (
  patient_id IN (
    SELECT patients.id 
    FROM patients 
    WHERE patients.profile_id = auth.uid()
  )
);
