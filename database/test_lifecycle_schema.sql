-- Enhanced Test Tracking Schema
-- This schema tracks the complete lifecycle of tests from request to completion

-- 1. Create test_requests table to track individual tests within a bill request
CREATE TABLE IF NOT EXISTS test_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_request_id UUID NOT NULL REFERENCES bill_requests(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    test_type TEXT NOT NULL CHECK (test_type IN ('blood', 'urine', 'imaging', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'sent_to_user', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    estimated_duration INTEGER DEFAULT 30, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    sent_to_user_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    -- Ensure unique test per bill request
    UNIQUE(bill_request_id, test_name)
);

-- 2. Create test_results table to store detailed test results
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_request_id UUID NOT NULL REFERENCES test_requests(id) ON DELETE CASCADE,
    lab_technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    result_value TEXT NOT NULL,
    normal_range TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('normal', 'abnormal', 'positive', 'negative', 'borderline')),
    units TEXT, -- e.g., mg/dL, %, etc.
    reference_range TEXT, -- e.g., "70-110 mg/dL"
    interpretation TEXT, -- Lab technician's interpretation
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create test_status_history table to track status changes
CREATE TABLE IF NOT EXISTS test_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_request_id UUID NOT NULL REFERENCES test_requests(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_requests_bill_request_id ON test_requests(bill_request_id);
CREATE INDEX IF NOT EXISTS idx_test_requests_patient_id ON test_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_test_requests_doctor_id ON test_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_test_requests_status ON test_requests(status);
CREATE INDEX IF NOT EXISTS idx_test_requests_created_at ON test_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_test_results_test_request_id ON test_results(test_request_id);
CREATE INDEX IF NOT EXISTS idx_test_results_lab_technician_id ON test_results(lab_technician_id);

CREATE INDEX IF NOT EXISTS idx_test_status_history_test_request_id ON test_status_history(test_request_id);
CREATE INDEX IF NOT EXISTS idx_test_status_history_created_at ON test_status_history(created_at);

-- 5. Enable RLS
ALTER TABLE test_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_status_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for test_requests
-- Lab technicians can view and update test requests
CREATE POLICY "lab_technicians_can_view_test_requests" ON test_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'lab_technician'
        )
    );

CREATE POLICY "lab_technicians_can_update_test_requests" ON test_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'lab_technician'
        )
    );

-- Doctors can view test requests for their patients
CREATE POLICY "doctors_can_view_patient_test_requests" ON test_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'doctor'
            AND profiles.id = doctor_id
        )
    );

-- Patients can view their own test requests
CREATE POLICY "patients_can_view_own_test_requests" ON test_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'patient'
            AND profiles.id = patient_id
        )
    );

-- Billers can view all test requests
CREATE POLICY "billers_can_view_all_test_requests" ON test_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'biller'
        )
    );

-- 7. RLS Policies for test_results
CREATE POLICY "lab_technicians_can_manage_test_results" ON test_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'lab_technician'
        )
    );

CREATE POLICY "doctors_can_view_patient_test_results" ON test_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'doctor'
            AND EXISTS (
                SELECT 1 FROM test_requests tr
                WHERE tr.id = test_request_id
                AND tr.doctor_id = profiles.id
            )
        )
    );

CREATE POLICY "patients_can_view_own_test_results" ON test_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'patient'
            AND EXISTS (
                SELECT 1 FROM test_requests tr
                WHERE tr.id = test_request_id
                AND tr.patient_id = profiles.id
            )
        )
    );

-- 8. RLS Policies for test_status_history
CREATE POLICY "users_can_view_test_status_history" ON test_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (
                profiles.role = 'lab_technician' OR
                profiles.role = 'doctor' OR
                profiles.role = 'biller' OR
                (profiles.role = 'patient' AND EXISTS (
                    SELECT 1 FROM test_requests tr
                    WHERE tr.id = test_request_id
                    AND tr.patient_id = profiles.id
                ))
            )
        )
    );

-- 9. Functions to automatically populate test_requests from bill_requests
CREATE OR REPLACE FUNCTION create_test_requests_from_bill_request()
RETURNS TRIGGER AS $$
DECLARE
    test_names TEXT[];
    test_name TEXT;
    detected_type TEXT;
BEGIN
    -- Extract test names from notes (simplified version)
    -- This would need to be enhanced based on your test extraction logic
    test_names := string_to_array(
        regexp_replace(
            regexp_replace(NEW.notes, '.*Tests?:\s*', '', 'gi'),
            '[₹,;|&].*', '', 'gi'
        ), 
        ','
    );
    
    -- Create test_request for each test
    FOREACH test_name IN ARRAY test_names
    LOOP
        test_name := trim(test_name);
        IF length(test_name) > 2 THEN
            -- Detect test type
            detected_type := CASE
                WHEN test_name ILIKE '%blood%' OR test_name ILIKE '%cbc%' OR test_name ILIKE '%sugar%' THEN 'blood'
                WHEN test_name ILIKE '%urine%' THEN 'urine'
                WHEN test_name ILIKE '%x-ray%' OR test_name ILIKE '%ct%' OR test_name ILIKE '%mri%' OR test_name ILIKE '%ultrasound%' THEN 'imaging'
                ELSE 'other'
            END;
            
            INSERT INTO test_requests (
                bill_request_id,
                patient_id,
                doctor_id,
                test_name,
                test_type,
                status
            ) VALUES (
                NEW.id,
                NEW.patient_id,
                NEW.doctor_id,
                test_name,
                detected_type,
                'pending'
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger to automatically create test_requests when bill_request is approved
CREATE OR REPLACE TRIGGER create_test_requests_trigger
    AFTER UPDATE OF status ON bill_requests
    FOR EACH ROW
    WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
    EXECUTE FUNCTION create_test_requests_from_bill_request();

-- 11. Function to update test status and log history
CREATE OR REPLACE FUNCTION update_test_status(
    p_test_request_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    old_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO old_status FROM test_requests WHERE id = p_test_request_id;
    
    -- Update test request status
    UPDATE test_requests 
    SET 
        status = p_new_status,
        updated_at = NOW(),
        started_at = CASE WHEN p_new_status = 'in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        sent_to_user_at = CASE WHEN p_new_status = 'sent_to_user' THEN NOW() ELSE sent_to_user_at END
    WHERE id = p_test_request_id;
    
    -- Log status change
    INSERT INTO test_status_history (
        test_request_id,
        old_status,
        new_status,
        changed_by,
        reason
    ) VALUES (
        p_test_request_id,
        old_status,
        p_new_status,
        auth.uid(),
        p_reason
    );
END;
$$ LANGUAGE plpgsql;

-- 12. Function to get test completion status for a bill request
CREATE OR REPLACE FUNCTION get_bill_request_test_status(p_bill_request_id UUID)
RETURNS TABLE (
    test_name TEXT,
    status TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    sent_to_user_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.test_name,
        tr.status,
        tr.started_at,
        tr.completed_at,
        tr.sent_to_user_at
    FROM test_requests tr
    WHERE tr.bill_request_id = p_bill_request_id
    ORDER BY tr.created_at;
END;
$$ LANGUAGE plpgsql;
