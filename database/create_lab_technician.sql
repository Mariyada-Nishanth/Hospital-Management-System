-- Create a lab technician account
-- First, create the user in Supabase Auth (you'll need to do this manually in Supabase dashboard)
-- Email: lab@hospital.com
-- Password: password123
-- Then get the UUID from auth.users table and use it below

-- Example UUID (replace with actual UUID from auth.users):
-- INSERT INTO profiles (id, email, first_name, last_name, role) VALUES 
-- ('your-lab-technician-uuid-here', 'lab@hospital.com', 'Lab', 'Technician', 'lab_technician');

-- Or if you want to update an existing profile to lab_technician role:
-- UPDATE profiles SET role = 'lab_technician' WHERE email = 'lab@hospital.com';

-- Sample test data (run after creating the lab technician account):
-- This will create some test reports for demonstration

-- First, let's create some test reports from existing approved bills
-- (Replace the UUIDs with actual values from your database)

-- Example: Create test report for an approved bill
-- INSERT INTO test_reports (
--   bill_request_id,
--   patient_id,
--   doctor_id,
--   lab_technician_id,
--   test_name,
--   test_type,
--   status,
--   notes
-- ) VALUES (
--   'your-approved-bill-request-id',
--   'your-patient-id',
--   'your-doctor-id',
--   'your-lab-technician-uuid',
--   'Complete Blood Count',
--   'blood',
--   'pending',
--   'Routine blood test requested by doctor'
-- );

-- Example: Create another test report
-- INSERT INTO test_reports (
--   bill_request_id,
--   patient_id,
--   doctor_id,
--   lab_technician_id,
--   test_name,
--   test_type,
--   status,
--   notes
-- ) VALUES (
--   'another-approved-bill-request-id',
--   'another-patient-id',
--   'another-doctor-id',
--   'your-lab-technician-uuid',
--   'Urine Analysis',
--   'urine',
--   'completed',
--   'Urine test completed with normal results'
-- );

