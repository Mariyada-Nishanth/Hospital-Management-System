import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
  // Appointment booking props
  doctors?: Array<{id: string, first_name: string | null, last_name: string | null, specialization: string}>;
  medicalFields?: string[];
  timeSlots?: string[];
  onBookAppointment?: (appointmentData: {
    field: string;
    doctor: string;
    date: string;
    time: string;
  }) => Promise<void>;
  // Enhanced self-service props
  patientData?: {
    id: string;
    name: string;
    appointments: any[];
    bills: any[];
    testResults: any[];
    medications: any[];
  };
  onRescheduleAppointment?: (appointmentId: string, newDate: string, newTime: string) => Promise<void>;
  onCancelAppointment?: (appointmentId: string) => Promise<void>;
  onViewTestResults?: () => Promise<any[]>;
  onViewBills?: () => Promise<any[]>;
}

export default function Chatbot({ 
  isOpen, 
  onToggle, 
  doctors = [], 
  medicalFields = [], 
  timeSlots = [], 
  onBookAppointment,
  patientData,
  onRescheduleAppointment,
  onCancelAppointment,
  onViewTestResults,
  onViewBills
}: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello! I'm your comprehensive AI healthcare assistant. I can help you with:

🏥 **Appointment Management**
• Book new appointments
• Reschedule existing appointments  
• Cancel appointments
• Check appointment status

🩺 **Health Services**
• Symptom checking and guidance
• Medication information and reminders
• Test result explanations
• Emergency triage assessment

📋 **Account Management**
• View and pay bills
• Check test results
• Review medical history
• Insurance information

💡 **Health Education**
• Medical condition explanations
• Treatment information
• Preventive care tips
• Lifestyle recommendations

Just ask me anything! For example: "Book me with a cardiologist", "What do my test results mean?", "I have a fever and headache", or "Show me my bills". How can I assist you today?`,
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Detect the type of query and route to appropriate handler
      const queryType = detectQueryType(userMessage.text);
      console.log('Query type detected:', queryType); // Debug log
      console.log('User text:', userMessage.text); // Debug log
      
      switch (queryType) {
        case 'appointment_booking':
          if (onBookAppointment) {
            await handleAppointmentBooking(userMessage.text);
          } else {
            await handleGeneralQuery(userMessage.text);
          }
          break;
        case 'symptom_check':
          await handleSymptomCheck(userMessage.text);
          break;
        case 'test_results':
          await handleTestResults(userMessage.text);
          break;
        case 'billing_info':
          await handleBillingInfo(userMessage.text);
          break;
        case 'emergency_triage':
          await handleEmergencyTriage(userMessage.text);
          break;
        default:
          await handleGeneralQuery(userMessage.text);
          break;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I\'m experiencing technical difficulties. Please try again later or contact our support team.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfAppointmentRequest = (text: string): boolean => {
    const appointmentKeywords = [
      'book', 'schedule', 'appointment', 'visit', 'see doctor', 'meet doctor',
      'cardiology', 'neurology', 'orthopedics', 'pediatrics', 'cardiologist',
      'neurologist', 'orthopedist', 'pediatrician', 'tomorrow', 'next week',
      'dr.', 'doctor', 'specialist'
    ];
    
    const lowerText = text.toLowerCase();
    return appointmentKeywords.some(keyword => lowerText.includes(keyword));
  };

  const formatDate = (dateStr: string): string => {
    if (dateStr.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    if (dateStr.toLowerCase().includes('today')) {
      return new Date().toISOString().split('T')[0];
    }
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Try to parse other date formats
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
    return dateStr;
  };

  // Enhanced self-service functions
  const detectQueryType = (userText: string): string => {
    const text = userText.toLowerCase();
    
    // Appointment management
    if (text.includes('book') || text.includes('schedule') || text.includes('appointment')) {
      return 'appointment_booking';
    }
    if (text.includes('reschedule') || text.includes('change appointment')) {
      return 'reschedule_appointment';
    }
    if (text.includes('cancel') && text.includes('appointment')) {
      return 'cancel_appointment';
    }
    
    // Health services
    if (text.includes('symptom') || text.includes('pain') || text.includes('hurt') || 
        text.includes('fever') || text.includes('headache') || text.includes('cough') ||
        text.includes('nausea') || text.includes('dizzy') || text.includes('tired')) {
      return 'symptom_check';
    }
    if (text.includes('medication') || text.includes('medicine') || text.includes('drug') ||
        text.includes('pill') || text.includes('prescription')) {
      return 'medication_info';
    }
    if (text.includes('test result') || text.includes('lab result') || text.includes('blood test') ||
        text.includes('x-ray') || text.includes('scan')) {
      return 'test_results';
    }
    if (text.includes('emergency') || text.includes('urgent') || text.includes('severe') ||
        text.includes('chest pain') || text.includes('difficulty breathing')) {
      return 'emergency_triage';
    }
    
    // Account management
    if (text.includes('bill') || text.includes('payment') || text.includes('cost') ||
        text.includes('charge') || text.includes('invoice')) {
      return 'billing_info';
    }
    if (text.includes('insurance') || text.includes('coverage')) {
      return 'insurance_info';
    }
    if (text.includes('medical history') || text.includes('records')) {
      return 'medical_history';
    }
    
    // Health education
    if (text.includes('what is') || text.includes('explain') || text.includes('meaning') ||
        text.includes('condition') || text.includes('disease')) {
      return 'health_education';
    }
    if (text.includes('prevent') || text.includes('avoid') || text.includes('healthy')) {
      return 'preventive_care';
    }
    
    return 'general_query';
  };

  const handleSymptomCheck = async (userText: string) => {
    const symptomPrompt = `You are an AI healthcare assistant helping a patient with symptom assessment. The current year is 2025.

Patient symptoms: "${userText}"

Please provide:
1. Possible conditions (list 2-3 most likely)
2. Urgency level (low, medium, high, emergency)
3. Immediate actions to take
4. When to seek medical attention
5. General care recommendations

IMPORTANT: This is NOT a diagnosis. Always recommend consulting a healthcare professional for proper diagnosis and treatment.

Respond in a helpful, reassuring tone. Format your response clearly with sections.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAGYNnfRX9VCMhbMbOpnAJdO6oq3pnwhkM', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: symptomPrompt }] }]
      })
    });

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t process your symptom information.';
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: aiResponse,
      sender: 'bot',
      timestamp: new Date()
    }]);
  };

  const handleTestResults = async (userText: string) => {
    try {
      if (onViewTestResults) {
        const testResults = await onViewTestResults();
        
        if (testResults && testResults.length > 0) {
          let response = "Here are your recent test results:\n\n";
          
          testResults.slice(0, 3).forEach((result, index) => {
            response += `${index + 1}. **${result.test_name || 'Test'}**\n`;
            response += `   Date: ${new Date(result.created_at).toLocaleDateString()}\n`;
            response += `   Status: ${result.status}\n`;
            if (result.results) {
              response += `   Results: ${result.results}\n`;
            }
            response += "\n";
          });
          
          response += "Would you like me to explain any specific test results in more detail?";
          
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: response,
            sender: 'bot',
            timestamp: new Date()
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: "I don't see any test results in your account yet. Test results are typically available 24-48 hours after your tests are completed. Please check back later or contact the lab if you're expecting results.",
            sender: 'bot',
            timestamp: new Date()
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: "I can help you understand test results, but I need access to your test data. Please use the dashboard to view your test results, or contact our lab department for assistance.",
          sender: 'bot',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I encountered an issue retrieving your test results. Please try again later or contact our support team.",
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  };

  const handleBillingInfo = async (userText: string) => {
    try {
      if (onViewBills) {
        const bills = await onViewBills();
        
        if (bills && bills.length > 0) {
          let response = "Here's your billing information:\n\n";
          
          bills.slice(0, 3).forEach((bill, index) => {
            response += `${index + 1}. **Bill #${bill.id.slice(-8)}**\n`;
            response += `   Amount: ₹${bill.amount}\n`;
            response += `   Status: ${bill.status}\n`;
            response += `   Date: ${new Date(bill.created_at).toLocaleDateString()}\n`;
            response += "\n";
          });
          
          const totalPending = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + parseFloat(b.amount), 0);
          if (totalPending > 0) {
            response += `**Total Pending: ₹${totalPending}**\n\n`;
            response += "You can pay your bills online through the dashboard or contact our billing department for assistance.";
          }
          
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: response,
            sender: 'bot',
            timestamp: new Date()
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: "You don't have any outstanding bills at the moment. All your payments are up to date!",
            sender: 'bot',
            timestamp: new Date()
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: "I can help you with billing information, but I need access to your billing data. Please use the dashboard to view your bills or contact our billing department for assistance.",
          sender: 'bot',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I encountered an issue retrieving your billing information. Please try again later or contact our billing department.",
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  };

  const handleEmergencyTriage = async (userText: string) => {
    const emergencyPrompt = `You are an AI healthcare assistant performing emergency triage. The current year is 2025.

Patient description: "${userText}"

Assess the urgency level and provide:
1. Urgency assessment (low, medium, high, emergency)
2. Immediate actions to take
3. Whether to call emergency services (911/ambulance)
4. Whether to go to ER immediately
5. Whether urgent care is appropriate
6. Whether a regular appointment is sufficient

IMPORTANT: If this sounds like a medical emergency, strongly recommend calling emergency services immediately.

Be clear and direct about urgency levels.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAGYNnfRX9VCMhbMbOpnAJdO6oq3pnwhkM', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: emergencyPrompt }] }]
      })
    });

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t assess your situation.';
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: aiResponse,
      sender: 'bot',
      timestamp: new Date()
    }]);
  };

  const handleAppointmentBooking = async (userText: string) => {
    try {
      // Create a comprehensive prompt for appointment booking
      const appointmentPrompt = `You are an AI assistant helping a patient book a medical appointment. The current year is 2025.

Available medical fields: ${medicalFields.join(', ')}
Available doctors: ${doctors.map(d => `Dr. ${d.first_name || 'Unknown'} ${d.last_name || 'Doctor'} (${d.specialization}) - ID: ${d.id}`).join(', ')}
Available time slots: ${timeSlots.join(', ')}

User request: "${userText}"

Please analyze this request and extract:
1. Medical field/specialization needed
2. Preferred doctor (if mentioned) - use the doctor ID
3. Preferred date (if mentioned) - format as YYYY-MM-DD (use 2025 as the current year)
4. Preferred time (if mentioned) - use exact time slot

IMPORTANT: Respond ONLY with a JSON object in this exact format. Do not include any other text before or after the JSON:
{
  "intent": "book_appointment",
  "field": "Cardiology",
  "doctor": "doctor_id_here", 
  "date": "2025-01-15",
  "time": "10:00 AM",
  "message": "I'll help you book an appointment with a cardiologist for tomorrow at 10:00 AM."
}

Rules:
- For "tomorrow", use the actual date in YYYY-MM-DD format (current year is 2025)
- For "today", use today's date in YYYY-MM-DD format (current year is 2025)
- For doctor, use the exact doctor ID from the list above
- For time, use the exact time slot from the available slots
- If any field cannot be determined, use null`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAGYNnfRX9VCMhbMbOpnAJdO6oq3pnwhkM', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: appointmentPrompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t process your appointment request.';

      console.log('AI Response:', aiResponse); // Debug log

      // Try to parse the JSON response
      try {
        // Clean the response to extract JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
        const appointmentData = JSON.parse(jsonString);
        
        console.log('Parsed appointment data:', appointmentData); // Debug log
        
        if (appointmentData.intent === 'book_appointment') {
          // Add the AI's response message
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: appointmentData.message,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMessage]);

          // If we have enough information, attempt to book the appointment
          if (appointmentData.field && appointmentData.doctor && appointmentData.date && appointmentData.time) {
            try {
              const formattedDate = formatDate(appointmentData.date);
              await onBookAppointment({
                field: appointmentData.field,
                doctor: appointmentData.doctor,
                date: formattedDate,
                time: appointmentData.time
              });

              const successMessage: Message = {
                id: (Date.now() + 2).toString(),
                text: 'Great! I\'ve successfully booked your appointment. You should see it in your appointments list shortly.',
                sender: 'bot',
                timestamp: new Date()
              };
              setMessages(prev => [...prev, successMessage]);
            } catch (bookingError: any) {
              console.error('Booking error:', bookingError); // Debug log
              
              // Check if it's an availability error and provide helpful suggestions
              let errorText = 'I encountered an issue while booking your appointment.';
              
              if (bookingError.message && bookingError.message.includes('not available')) {
                errorText = bookingError.message;
              } else if (bookingError.message && bookingError.message.includes('fully booked')) {
                errorText = bookingError.message;
              } else if (bookingError.code === '23505') {
                errorText = 'The requested appointment slot is already taken. Please try a different time or date. You can also use the appointment form on the dashboard to see available slots.';
              } else {
                errorText = 'I encountered an issue while booking your appointment. Please try using the appointment form on the dashboard or contact our support team.';
              }
              
              const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                text: errorText,
                sender: 'bot',
                timestamp: new Date()
              };
              setMessages(prev => [...prev, errorMessage]);
            }
          } else {
            // Missing information, ask for it
            const missingInfoMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: `I need a bit more information to book your appointment. Please specify:
              ${!appointmentData.field ? '- Medical field/specialization' : ''}
              ${!appointmentData.doctor ? '- Preferred doctor' : ''}
              ${!appointmentData.date ? '- Preferred date' : ''}
              ${!appointmentData.time ? '- Preferred time' : ''}`,
              sender: 'bot',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, missingInfoMessage]);
          }
        } else {
          // Not an appointment request, treat as general query
          await handleGeneralQuery(userText);
        }
      } catch (parseError) {
        console.error('Parse error:', parseError); // Debug log
        console.error('Raw AI response:', aiResponse); // Debug log
        
        // If JSON parsing fails, try a simpler approach
        if (aiResponse.toLowerCase().includes('cardiology') || aiResponse.toLowerCase().includes('cardiologist')) {
          // Try to book with default values (using 2025 as current year)
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          
          // Find a cardiologist
          const cardiologist = doctors.find(d => d.specialization.toLowerCase().includes('cardiology'));
          if (cardiologist) {
            try {
              await onBookAppointment({
                field: 'Cardiology',
                doctor: cardiologist.id,
                date: tomorrowStr,
                time: '10:00 AM'
              });

              const successMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'I\'ve booked you an appointment with a cardiologist for tomorrow at 10:00 AM. You should see it in your appointments list shortly.',
                sender: 'bot',
                timestamp: new Date()
              };
              setMessages(prev => [...prev, successMessage]);
            } catch (bookingError: any) {
              console.error('Fallback booking error:', bookingError);
              
              // Check if it's an availability error and provide helpful suggestions
              let errorText = 'I encountered an issue while booking your appointment.';
              
              if (bookingError.message && bookingError.message.includes('not available')) {
                errorText = bookingError.message;
              } else if (bookingError.message && bookingError.message.includes('fully booked')) {
                errorText = bookingError.message;
              } else if (bookingError.code === '23505') {
                errorText = 'The requested appointment slot is already taken. Please try a different time or date. You can also use the appointment form on the dashboard to see available slots.';
              } else {
                errorText = 'I encountered an issue while booking your appointment. Please try using the appointment form on the dashboard or contact our support team.';
              }
              
              const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: errorText,
                sender: 'bot',
                timestamp: new Date()
              };
              setMessages(prev => [...prev, errorMessage]);
            }
          } else {
            await handleGeneralQuery(userText);
          }
        } else {
          // If JSON parsing fails, treat as general query
          await handleGeneralQuery(userText);
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const handleGeneralQuery = async (userText: string) => {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAGYNnfRX9VCMhbMbOpnAJdO6oq3pnwhkM', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a helpful healthcare assistant for a hospital patient portal. The user is asking: "${userText}". 

Please provide helpful, accurate, and empathetic responses about general health topics, appointment guidance, and medical information. Always remind users to consult with their healthcare provider for specific medical advice. Keep responses concise but informative.

User question: ${userText}`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response from AI');
    }

    const data = await response.json();
    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t process your request at the moment. Please try again.';

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponse,
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span className="font-semibold">AI Health Assistant</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-blue-700 rounded transition-colors"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-blue-700 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[380px]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[80%] ${
                    message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {message.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`rounded-lg px-3 py-2 ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2 max-w-[80%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your health..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
