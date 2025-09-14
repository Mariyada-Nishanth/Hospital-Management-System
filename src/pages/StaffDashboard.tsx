import React, { useEffect, useState } from 'react';

const dummyUser = JSON.parse(localStorage.getItem('dummyUser') || 'null');

export default function StaffDashboard() {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);

  useEffect(() => {
    if (dummyUser) {
      setUser(dummyUser);
      if (dummyUser.role === 'doctor') {
        setAppointments([
          {
            id: 'appt1',
            patient: 'Dummy Patient',
            date: '2025-06-10',
            time: '10:00 AM',
            status: 'scheduled',
          },
        ]);
      } else if (dummyUser.role === 'biller') {
        setBills([
          {
            id: 'bill1',
            patient: 'Dummy Patient',
            amount: 100,
            status: 'pending',
          },
        ]);
      }
    }
  }, []);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Welcome, {user.first_name} {user.last_name} ({user.role})</h1>
        {user.role === 'doctor' && (
          <>
            <h2 className="text-lg font-semibold mb-2">Appointments</h2>
            <ul>
              {appointments.map(appt => (
                <li key={appt.id} className="mb-2 p-2 border rounded">
                  Patient: {appt.patient} | Date: {appt.date} | Time: {appt.time} | Status: {appt.status}
                </li>
              ))}
            </ul>
          </>
        )}
        {user.role === 'biller' && (
          <>
            <h2 className="text-lg font-semibold mb-2">Bills</h2>
            <ul>
              {bills.map(bill => (
                <li key={bill.id} className="mb-2 p-2 border rounded">
                  Patient: {bill.patient} | Amount: ${bill.amount} | Status: {bill.status}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
} 