import React from 'react';

export default function Sidebar({ navItems, currentView, setCurrentView, alerts, systemHealth }) {
  return (
    <aside className="bg-[#0B0E13]/90 backdrop-blur-2xl h-full w-60 border-r border-white/10 flex flex-col py-5 shadow-[4px_0_25px_rgba(0,0,0,0.7)] z-40 shrink-0 select-none">
      <div className="px-5 mb-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FF6B35] p-0.5 shadow-[0_0_12px_rgba(255,138,0,0.5)]">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-cover rounded-full" />
        </div>
        <div className="flex flex-col">
          <span className="font-space text-sm font-bold text-white tracking-wider uppercase">Aethra Vision</span>
          <span className="font-mono-data text-[9px] text-[#0EA5E9] tracking-widest">CONTROL NODE</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(item => {
          const isActive = currentView === item.name;
          return (
            <button 
              key={item.name} 
              onClick={() => setCurrentView(item.name)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded transition-all duration-300 ${
                isActive 
                  ? 'text-[#FF8A00] bg-[#FF8A00]/10 border-l-2 border-[#FF8A00] shadow-[inset_10px_0_15px_-10px_rgba(255,138,0,0.4)] font-bold' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
              }`}
            >
              <span className={`material-symbols-outlined text-lg ${isActive ? 'text-[#FF8A00]' : 'text-gray-400'}`}>{item.icon}</span>
              <span className="font-mono-data text-xs flex-1 text-left tracking-wide">{item.name}</span>
              {item.name === 'Live Feeds' && <span className="w-2 h-2 rounded-full bg-[#00E676] pulsing-dot-green"></span>}
              {item.name === 'Alerts' && alerts.length > 0 && (
                <span className="bg-[#FF8A00] text-black text-[10px] font-mono-data font-bold px-1.5 py-0.5 rounded">
                  {alerts.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 mt-auto">
        <div className="p-3.5 rounded bg-black/60 border border-white/10">
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-mono-data text-[10px] text-gray-400">NODE LOAD</span>
            <span className="font-mono-data text-[10px] text-[#0EA5E9] font-bold">{systemHealth.cpu_percent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#0EA5E9] to-[#FF8A00] h-full transition-all duration-1000" 
              style={{ width: `${Math.max(5, systemHealth.cpu_percent)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </aside>
  );
}

