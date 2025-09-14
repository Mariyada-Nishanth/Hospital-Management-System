-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS bill_requests CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'staff', 'patient')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create doctors table
CREATE TABLE doctors (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    specialization TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create patients table
CREATE TABLE patients (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(doctor_id, appointment_date, appointment_time)
);

-- Create bill_requests table
CREATE TABLE bill_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create bills table
CREATE TABLE bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_request_id UUID NOT NULL REFERENCES bill_requests(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create policies for doctors
CREATE POLICY "Anyone can view doctors"
    ON doctors FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only doctors can update their own doctor profile"
    ON doctors FOR UPDATE
    USING (auth.uid() = id);

-- Create policies for patients
CREATE POLICY "Patients can view their own profile"
    ON patients FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Patients can update their own profile"
    ON patients FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Doctors can view their patients' profiles"
    ON patients FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.doctor_id = auth.uid()
            AND appointments.patient_id = patients.id
        )
    );

-- Create policies for appointments
CREATE POLICY "Patients can view their own appointments"
    ON appointments FOR SELECT
    USING (patient_id IN (
        SELECT id FROM patients WHERE id = auth.uid()
    ));

CREATE POLICY "Doctors can view their appointments"
    ON appointments FOR SELECT
    USING (doctor_id = auth.uid());

CREATE POLICY "Patients can create their own appointments"
    ON appointments FOR INSERT
    WITH CHECK (patient_id IN (
        SELECT id FROM patients WHERE id = auth.uid()
    ));

CREATE POLICY "Doctors can update their appointments"
    ON appointments FOR UPDATE
    USING (doctor_id = auth.uid());

-- Create policies for bill_requests
CREATE POLICY "Patients can view their own bill requests"
    ON bill_requests FOR SELECT
    USING (patient_id IN (
        SELECT id FROM patients WHERE id = auth.uid()
    ));

CREATE POLICY "Doctors can view their bill requests"
    ON bill_requests FOR SELECT
    USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can create bill requests"
    ON bill_requests FOR INSERT
    WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update their bill requests"
    ON bill_requests FOR UPDATE
    USING (doctor_id = auth.uid());

-- Create policies for bills
CREATE POLICY "Patients can view their own bills"
    ON bills FOR SELECT
    USING (patient_id IN (
        SELECT id FROM patients WHERE id = auth.uid()
    ));

CREATE POLICY "Patients can update their own bills"
    ON bills FOR UPDATE
    USING (patient_id IN (
        SELECT id FROM patients WHERE id = auth.uid()
    ));

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_bill_requests_updated_at
    BEFORE UPDATE ON bill_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at(); 