import React from 'react';

export default function Sidebar({ navItems, currentView, setCurrentView, alerts, systemHealth }) {
  return (
    <aside className="bg-[#070b14]/60 backdrop-blur-xl h-full w-64 border-r border-white/10 flex flex-col py-panel-padding shadow-[0_0_15px_rgba(0,219,233,0.1)] z-40 shrink-0">
      <div className="px-6 mb-10 flex items-center gap-3">
         <span className="material-symbols-outlined text-primary text-3xl">security</span>
         <span className="font-headline-md text-sm font-bold text-white tracking-widest uppercase">Aethra Vision</span>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <button 
            key={item.name} 
            onClick={() => setCurrentView(item.name)}
            className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-300 ${currentView === item.name ? 'text-primary border-l-4 border-primary bg-primary/10 shadow-[inset_10px_0_15px_-10px_rgba(0,219,233,0.3)] brightness-125' : 'text-on-surface-variant hover:text-primary hover:bg-white/5 border-l-4 border-transparent'}`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="font-label-caps text-label-caps flex-1 text-left">{item.name}</span>
            {item.name === 'Live Feeds' && <span className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse shadow-[0_0_8px_#00f0ff]"></span>}
            {item.name === 'Alerts' && alerts.length > 0 && <span className="bg-secondary text-on-secondary text-[10px] font-bold px-1.5 py-0.5 rounded-sm">{alerts.length}</span>}
          </button>
        ))}
      </nav>
      <div className="px-6 mt-auto">
        <div className="p-4 rounded bg-surface-container-lowest border border-white/5">
          <div className="flex justify-between items-center mb-2">
            <span className="font-label-caps text-[10px] text-on-surface-variant">OPS_UNIT_01</span>
            <span className="font-data-mono text-[10px] text-primary">LOAD: {systemHealth.cpu_percent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-surface-variant h-1 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${systemHealth.cpu_percent}%` }}></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
