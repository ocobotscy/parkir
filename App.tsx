import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  LogOut, 
  Search, 
  Camera, 
  Loader2, 
  Banknote, 
  Car, 
  ParkingSquare, 
  TrendingUp,
  Send,
  History,
  MessageSquareText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Sidebar from './components/Sidebar';
import StatCard from './components/StatCard';
import { scanLicensePlate, askParkingAssistant } from './services/geminiService';
import { ParkingTicket, VehicleType, Stats } from './types';

// Pricing Constants
const RATES = {
  [VehicleType.CAR]: { firstHour: 5000, hourly: 3000 },
  [VehicleType.MOTORCYCLE]: { firstHour: 2000, hourly: 1000 },
  [VehicleType.TRUCK]: { firstHour: 10000, hourly: 5000 },
};

const TOTAL_SPOTS = 50;

const App: React.FC = () => {
  // State
  const [currentView, setCurrentView] = useState('dashboard');
  const [tickets, setTickets] = useState<ParkingTicket[]>([]);
  
  // Entry Form State
  const [plateInput, setPlateInput] = useState('');
  const [typeInput, setTypeInput] = useState<VehicleType>(VehicleType.CAR);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assistant State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derived State
  const activeTickets = tickets.filter(t => t.status === 'ACTIVE');
  const completedTickets = tickets.filter(t => t.status === 'COMPLETED');
  
  const stats: Stats = {
    totalSpots: TOTAL_SPOTS,
    occupiedSpots: activeTickets.length,
    todayTransactions: tickets.filter(t => t.entryTime.getDate() === new Date().getDate()).length,
    totalRevenue: completedTickets.reduce((acc, t) => acc + (t.fee || 0), 0)
  };

  // Mock initial data
  useEffect(() => {
    // Only run once on mount if empty
    if (tickets.length === 0) {
        const mockTickets: ParkingTicket[] = [
        { id: '1', licensePlate: 'B 1234 CD', vehicleType: VehicleType.CAR, entryTime: new Date(Date.now() - 3600000 * 2), status: 'ACTIVE' },
        { id: '2', licensePlate: 'D 5678 EF', vehicleType: VehicleType.MOTORCYCLE, entryTime: new Date(Date.now() - 3600000 * 0.5), status: 'ACTIVE' },
        { id: '3', licensePlate: 'F 9012 GH', vehicleType: VehicleType.CAR, entryTime: new Date(Date.now() - 3600000 * 5), exitTime: new Date(), fee: 17000, status: 'COMPLETED' },
        ];
        setTickets(mockTickets);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);


  // --- Actions ---

  const handleEntry = () => {
    if (!plateInput) return;
    
    const newTicket: ParkingTicket = {
      id: Math.random().toString(36).substr(2, 9),
      licensePlate: plateInput.toUpperCase(),
      vehicleType: typeInput,
      entryTime: new Date(),
      status: 'ACTIVE'
    };
    
    setTickets(prev => [newTicket, ...prev]);
    setPlateInput('');
    alert(`Check-in successful! Ticket ID: ${newTicket.id}`);
  };

  const handleExit = (ticket: ParkingTicket) => {
    const exitTime = new Date();
    const durationHours = Math.ceil((exitTime.getTime() - ticket.entryTime.getTime()) / (1000 * 60 * 60));
    const rate = RATES[ticket.vehicleType];
    const fee = durationHours <= 1 ? rate.firstHour : rate.firstHour + ((durationHours - 1) * rate.hourly);

    if (window.confirm(`Checkout ${ticket.licensePlate}?\nDuration: ${durationHours} hours\nFee: Rp ${fee.toLocaleString()}`)) {
      setTickets(prev => prev.map(t => 
        t.id === ticket.id 
          ? { ...t, exitTime, fee, status: 'COMPLETED' } 
          : t
      ));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAI(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const result = await scanLicensePlate(base64String);
      
      if (result) {
        setPlateInput(result.licensePlate);
        setTypeInput(result.vehicleType);
        // Automatically switch to entry view if not already there
        if (currentView !== 'entry') setCurrentView('entry');
      } else {
        alert("Could not detect vehicle info clearly. Please try again or enter manually.");
      }
      setIsProcessingAI(false);
    };
    reader.readAsDataURL(file);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);

    const answer = await askParkingAssistant(userMsg, { tickets, stats });
    
    setChatHistory(prev => [...prev, { role: 'model', text: answer }]);
    setIsChatting(false);
  };


  // --- Render Helpers ---

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Revenue" value={`Rp ${stats.totalRevenue.toLocaleString()}`} icon={Banknote} color="text-emerald-600 bg-emerald-100" trend="+12% today" />
        <StatCard label="Occupied Spots" value={`${stats.occupiedSpots} / ${stats.totalSpots}`} icon={ParkingSquare} color="text-blue-600 bg-blue-100" />
        <StatCard label="Active Vehicles" value={stats.occupiedSpots} icon={Car} color="text-indigo-600 bg-indigo-100" />
        <StatCard label="Daily Transactions" value={stats.todayTransactions} icon={TrendingUp} color="text-purple-600 bg-purple-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Occupancy Overview</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Cars', count: activeTickets.filter(t => t.vehicleType === 'CAR').length },
                  { name: 'Bikes', count: activeTickets.filter(t => t.vehicleType === 'MOTORCYCLE').length },
                  { name: 'Trucks', count: activeTickets.filter(t => t.vehicleType === 'TRUCK').length },
                ]}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                    <Cell fill="#6366f1" />
                  </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2">AI Quick Scan</h3>
            <p className="text-blue-100 mb-6 text-sm">Upload a vehicle image to instantly recognize the license plate and check-in.</p>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingAI}
              className="w-full bg-white text-blue-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors disabled:opacity-70"
            >
              {isProcessingAI ? <Loader2 className="animate-spin w-5 h-5" /> : <Camera className="w-5 h-5" />}
              {isProcessingAI ? 'Analyzing...' : 'Scan Vehicle'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>
          {/* Decorative shapes */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
        </div>
      </div>
    </div>
  );

  const renderEntryExit = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Entry Form */}
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit sticky top-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Plus className="w-6 h-6 text-blue-600" /> Vehicle Check-In
        </h2>
        
        <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Upload Image (Auto-Fill)</label>
               <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingAI}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                {isProcessingAI ? <Loader2 className="animate-spin mb-2" /> : <Camera className="mb-2" />}
                <span className="text-xs">{isProcessingAI ? 'Processing with Gemini...' : 'Click to Scan Plate'}</span>
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">Or Manual Entry</span></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">License Plate</label>
              <input 
                type="text" 
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                placeholder="B 1234 XXX"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono uppercase text-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Vehicle Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(VehicleType) as Array<keyof typeof VehicleType>).map((type) => (
                   <button
                    key={type}
                    onClick={() => setTypeInput(VehicleType[type])}
                    className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all ${
                      typeInput === VehicleType[type] 
                        ? 'bg-slate-900 text-white border-slate-900' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                   >
                     {type}
                   </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleEntry}
              disabled={!plateInput || stats.occupiedSpots >= stats.totalSpots}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stats.occupiedSpots >= stats.totalSpots ? 'Parking Full' : 'Check In Vehicle'}
            </button>
        </div>
      </div>

      {/* Active List */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Car className="w-6 h-6 text-emerald-600" /> Active Vehicles
          <span className="ml-auto text-sm font-normal bg-slate-100 px-3 py-1 rounded-full text-slate-600">
            {activeTickets.length} / {TOTAL_SPOTS} Spots
          </span>
        </h2>

        <div className="space-y-3">
          {activeTickets.length === 0 ? (
            <div className="text-center py-10 text-slate-400">No vehicles currently parked.</div>
          ) : (
            activeTickets.map(ticket => (
              <div key={ticket.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow bg-slate-50">
                <div className="flex items-center gap-4 mb-3 sm:mb-0 w-full sm:w-auto">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    ticket.vehicleType === VehicleType.CAR ? 'bg-blue-100 text-blue-600' : 
                    ticket.vehicleType === VehicleType.MOTORCYCLE ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-mono text-lg font-bold text-slate-900">{ticket.licensePlate}</h4>
                    <p className="text-xs text-slate-500">In: {ticket.entryTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                  <div className="text-right hidden sm:block">
                     <span className="text-xs font-bold text-slate-400 block tracking-wider">{ticket.vehicleType}</span>
                     <span className="text-xs text-slate-400">ID: {ticket.id}</span>
                  </div>
                  <button 
                    onClick={() => handleExit(ticket)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-bold w-full sm:w-auto justify-center"
                  >
                    <LogOut className="w-4 h-4" /> Check Out
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <History className="w-6 h-6 text-purple-600" /> Transaction History
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Plate</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Exit</th>
              <th className="px-4 py-3 text-right">Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {completedTickets.length === 0 ? (
               <tr><td colSpan={5} className="text-center py-8 text-slate-400">No history available</td></tr>
            ) : (
                completedTickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">{t.licensePlate}</td>
                    <td className="px-4 py-3 text-sm text-slate-600"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{t.vehicleType}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{t.entryTime.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{t.exitTime?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">Rp {t.fee?.toLocaleString()}</td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAssistant = () => (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
         <div className="bg-gradient-to-tr from-blue-500 to-purple-600 p-2 rounded-lg">
             <Search className="w-5 h-5 text-white" />
         </div>
         <div>
             <h3 className="font-bold text-slate-800">SmartPark Assistant</h3>
             <p className="text-xs text-slate-500">Ask about revenue, busy hours, or capacity</p>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <MessageSquareText className="w-12 h-12 opacity-20" />
                <p>Try asking: "How much revenue did we make today?"</p>
            </div>
        )}
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white border border-slate-200 text-slate-700 shadow-sm rounded-bl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isChatting && (
           <div className="flex justify-start">
             <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
             </div>
           </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            placeholder="Ask AI about your parking data..."
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button 
            onClick={handleChat}
            disabled={!chatInput.trim() || isChatting}
            className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">
        <header className="flex justify-between items-center mb-8">
          <div>
             <h1 className="text-2xl font-bold text-slate-900 capitalize">{currentView === 'entry' ? 'Check In / Out' : currentView}</h1>
             <p className="text-slate-500 text-sm">Welcome back, Admin.</p>
          </div>
          <div className="flex items-center gap-3">
             <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
               <span className="w-2 h-2 bg-green-500 rounded-full"></span> System Online
             </span>
          </div>
        </header>

        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'entry' && renderEntryExit()}
        {currentView === 'history' && renderHistory()}
        {currentView === 'assistant' && renderAssistant()}
      </main>
    </div>
  );
};

export default App;