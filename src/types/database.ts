export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'patient' | 'doctor' | 'biller' | 'lab_technician'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'patient' | 'doctor' | 'biller' | 'lab_technician'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'patient' | 'doctor' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          profile_id: string | null
          first_name: string | null
          last_name: string | null
          date_of_birth: string | null
          gender: 'male' | 'female' | 'other' | null
          phone_number: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          first_name?: string | null
          last_name?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | null
          phone_number?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          first_name?: string | null
          last_name?: string | null
          date_of_birth?: string | null
          gender?: 'male' | 'female' | 'other' | null
          phone_number?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      doctors: {
        Row: {
          id: string
          profile_id: string | null
          first_name: string | null
          last_name: string | null
          specialization: string
          phone_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          first_name?: string | null
          last_name?: string | null
          specialization: string
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          first_name?: string | null
          last_name?: string | null
          specialization?: string
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          appointment_date: string
          appointment_time: string
          status: 'scheduled' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          appointment_date: string
          appointment_time: string
          status?: 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          appointment_date?: string
          appointment_time?: string
          status?: 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bill_requests: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          appointment_id: string | null
          amount: number
          notes: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          appointment_id?: string | null
          amount: number
          notes: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          appointment_id?: string | null
          amount?: number
          notes?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          bill_request_id: string
          patient_id: string
          amount: number
          status: 'pending' | 'paid' | 'overdue'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bill_request_id: string
          patient_id: string
          amount: number
          status?: 'pending' | 'paid' | 'overdue'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bill_request_id?: string
          patient_id?: string
          amount?: number
          status?: 'pending' | 'paid' | 'overdue'
          created_at?: string
          updated_at?: string
        }
      }
      test_reports: {
        Row: {
          id: string
          bill_request_id: string
          patient_id: string
          doctor_id: string
          lab_technician_id: string
          test_name: string
          test_type: 'blood' | 'urine' | 'imaging' | 'other'
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          results: Json | null
          notes: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          bill_request_id: string
          patient_id: string
          doctor_id: string
          lab_technician_id: string
          test_name: string
          test_type: 'blood' | 'urine' | 'imaging' | 'other'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          results?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          bill_request_id?: string
          patient_id?: string
          doctor_id?: string
          lab_technician_id?: string
          test_name?: string
          test_type?: 'blood' | 'urine' | 'imaging' | 'other'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          results?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      test_requests: {
        Row: {
          id: string
          bill_request_id: string
          patient_id: string
          doctor_id: string
          test_name: string
          test_type: 'blood' | 'urine' | 'imaging' | 'other'
          status: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled'
          priority: 'low' | 'normal' | 'high' | 'urgent'
          estimated_duration: number
          created_at: string
          updated_at: string
          started_at: string | null
          completed_at: string | null
          sent_to_user_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          bill_request_id: string
          patient_id: string
          doctor_id: string
          test_name: string
          test_type: 'blood' | 'urine' | 'imaging' | 'other'
          status?: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled'
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          estimated_duration?: number
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
          sent_to_user_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          bill_request_id?: string
          patient_id?: string
          doctor_id?: string
          test_name?: string
          test_type?: 'blood' | 'urine' | 'imaging' | 'other'
          status?: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled'
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          estimated_duration?: number
          created_at?: string
          updated_at?: string
          started_at?: string | null
          completed_at?: string | null
          sent_to_user_at?: string | null
          notes?: string | null
        }
      }
      test_results: {
        Row: {
          id: string
          test_request_id: string
          lab_technician_id: string
          result_value: string
          normal_range: string
          status: 'normal' | 'abnormal' | 'positive' | 'negative' | 'borderline'
          units: string | null
          reference_range: string | null
          interpretation: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          test_request_id: string
          lab_technician_id: string
          result_value: string
          normal_range: string
          status: 'normal' | 'abnormal' | 'positive' | 'negative' | 'borderline'
          units?: string | null
          reference_range?: string | null
          interpretation?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          test_request_id?: string
          lab_technician_id?: string
          result_value?: string
          normal_range?: string
          status?: 'normal' | 'abnormal' | 'positive' | 'negative' | 'borderline'
          units?: string | null
          reference_range?: string | null
          interpretation?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      test_status_history: {
        Row: {
          id: string
          test_request_id: string
          old_status: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled'
          new_status: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled'
          changed_by: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          test_request_id: string
          old_status: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled'
          new_status: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled'
          changed_by: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          test_request_id?: string
          old_status?: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled'
          new_status?: 'pending' | 'in_progress' | 'completed' | 'sent_to_user' | 'cancelled'
          changed_by?: string
          reason?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 