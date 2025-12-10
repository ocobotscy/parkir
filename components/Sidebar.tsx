import React from 'react';
import { LayoutDashboard, CarFront, History, MessageSquareText } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'entry', label: 'Check-In / Out', icon: CarFront },
    { id: 'history', label: 'History', icon: History },
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquareText },
  ];

  return (
    <div className="w-20 md:w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300">
      <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3 border-b border-slate-700">
        <div className="bg-blue-600 p-2 rounded-lg">
          <CarFront className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold hidden md:block">SmartPark</span>
      </div>

      <nav className="flex-1 mt-6 px-2 md:px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6 min-w-[24px]" />
              <span className="hidden md:block font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500 hidden md:block text-center">
        Powered by Gemini 2.5
      </div>
    </div>
  );
};

export default Sidebar;
