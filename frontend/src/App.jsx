import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, Tooltip, ResponsiveContainer, XAxis } from 'recharts';

function Dashboard({ token, onLogout }) {
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [timeStr, setTimeStr] = useState('');
  const [videoKey, setVideoKey] = useState(Date.now());
  const [sensitivity, setSensitivity] = useState(65);
  const [currentView, setCurrentView] = useState('Live Feeds');
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [systemHealth, setSystemHealth] = useState({ cpu_percent: 0, memory_percent: 0 });
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const playVoiceAlert = (messageText) => {
    if (isMutedRef.current) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(messageText);
      utterance.rate = 1.1;
      utterance.pitch = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const exportToCSV = () => {
    if (alerts.length === 0) return;
    const headers = ['Time', 'Camera Node', 'Threat Type', 'Confidence'];
    const rows = alerts.map(a => [
      new Date(a.timestamp || Date.now()).toLocaleString(),
      a.camera_id,
      a.behavior_type,
      `${(a.confidence * 100).toFixed(1)}%`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aegis_evidence_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart Data
  const threatData = [
    { name: 'Mon', level: 45 }, { name: 'Tue', level: 75 }, { name: 'Wed', level: 30 },
    { name: 'Thu', level: 90 }, { name: 'Fri', level: 60 }, { name: 'Sat', level: 25 },
    { name: 'Sun', level: Math.min(100, alerts.length * 10) }
  ];

  const detectionHistory = [
    { time: '0h', val1: 800, val2: 400 }, { time: '6hrs', val1: 1200, val2: 800 },
    { time: '12hrs', val1: 600, val2: 1500 }, { time: '18hrs', val1: 1800, val2: 900 },
    { time: '24hrs', val1: 1000, val2: 1200 }
  ];

  const handleSensitivityChange = async (e) => {
    const val = parseInt(e.target.value);
    setSensitivity(val);
    try {
      await fetch('http://127.0.0.1:8002/api/settings/threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: val / 100 })
      });
    } catch (err) {}
  };

  const handleVideoError = () => setTimeout(() => setVideoKey(Date.now()), 2000);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/alerts');
        if (response.ok) {
          const data = await response.json();
          const validAlerts = data.filter(a => a && a.behavior_type && a.behavior_type !== 'Unknown');
          setAlerts(validAlerts.slice(-20).reverse());
        }
      } catch (error) {}
    };
    const fetchCameras = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/cameras');
        if (response.ok) {
          const data = await response.json();
          setCameras(data);
        }
      } catch (error) {}
    };
    fetchAlerts();
    fetchCameras();

    const ws = new WebSocket('ws://127.0.0.1:8000/ws/alerts');
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'new_camera') {
            setCameras(prev => {
                if (prev.find(c => c.id === message.camera_id)) return prev;
                return [...prev, { id: message.camera_id, streamUrl: message.stream_url, name: message.camera_id }];
            });
            return;
        }
        if (message && message.behavior_type && message.behavior_type !== 'Unknown') {
          setAlerts(prev => [message, ...prev].slice(0, 50));
          
          const isHighThreat = ['weapon', 'gun', 'knife', 'grenade', 'suspicious activity', 'falling'].some(w => message.behavior_type.toLowerCase().includes(w));
          if (isHighThreat) {
            playVoiceAlert(`Warning. ${message.behavior_type} detected on ${message.camera_id}.`);
          }
        }
      } catch (e) {}
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-GB', { hour12: false }) + ' GMT');
    }, 1000);

    const healthInterval = setInterval(async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/system/health');
        if (res.ok) {
          const data = await res.json();
          setSystemHealth(data);
        }
      } catch (err) {}
    }, 3000);

    return () => {
       clearInterval(clockInterval);
       clearInterval(healthInterval);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', icon: 'dashboard' },
    { name: 'Live Feeds', icon: 'videocam' },
    { name: 'Alerts', icon: 'notification_important' },
    { name: 'Playback', icon: 'history' },
    { name: 'Analytics', icon: 'monitoring' },
    { name: 'Settings', icon: 'settings' }
  ];

  return (
    <div className="bg-background text-on-background font-body-base overflow-hidden selection:bg-primary/30 h-screen w-screen flex flex-col">
      {/* Top AppBar */}
      <header className="bg-[#070b14]/60 backdrop-blur-xl w-full h-16 border-b border-white/10 flex justify-between items-center px-margin-edge sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-8">
          <span className="font-label-caps text-label-caps font-bold text-primary tracking-widest uppercase glow-cyan">AEGIS_COMMAND</span>
          <div className="flex items-center gap-4 border-l border-white/10 pl-6 h-8 hidden md:flex">
            <span className="font-data-mono text-data-mono text-primary-fixed-dim bg-primary/10 px-3 py-1 rounded-sm border border-primary/20 animate-[pulse-glow_3s_infinite]">SYSTEM ONLINE</span>
            <div className="flex items-center gap-3">
              <span className="font-label-caps text-[10px] text-on-surface-variant">CONFIDENCE_THRESHOLD</span>
              <input type="range" min="0" max="100" value={sensitivity} onChange={handleSensitivityChange} className="w-32 h-1 bg-surface-variant rounded-full appearance-none cursor-pointer accent-primary-fixed-dim"/>
              <span className="font-data-mono text-data-mono text-primary">{sensitivity}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="font-data-mono text-data-mono text-primary tracking-tighter">{timeStr}</span>
            <span className="font-label-caps text-[9px] text-on-surface-variant tracking-widest">REALTIME_SYNC_ENABLED</span>
          </div>
          <div className="flex gap-4 border-l border-white/10 pl-6 items-center">
            <span 
              onClick={() => setIsMuted(!isMuted)} 
              className={`material-symbols-outlined cursor-pointer transition-all ${isMuted ? 'text-secondary hover:text-secondary/80' : 'text-on-surface-variant hover:text-primary'}`}
              title={isMuted ? "Unmute Voice Alerts" : "Mute Voice Alerts"}
            >
              {isMuted ? 'notifications_off' : 'notifications_active'}
            </span>
            <span className="material-symbols-outlined text-on-surface-variant hover:text-primary cursor-pointer transition-all">admin_panel_settings</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded border border-white/5">
            <div className="w-8 h-8 rounded-sm bg-surface-container-high border border-primary/20 overflow-hidden flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">shield_person</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-[11px] leading-none text-primary">Admin</span>
              <button onClick={onLogout} className="font-label-caps text-[9px] leading-none text-on-surface-variant hover:text-secondary cursor-pointer transition-colors mt-1 uppercase text-left">LOG_OUT</button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="bg-[#070b14]/60 backdrop-blur-xl h-full w-64 border-r border-white/10 flex flex-col py-panel-padding shadow-[0_0_15px_rgba(0,219,233,0.1)] z-40 shrink-0">
          <div className="px-6 mb-10 flex items-center gap-3">
             <span className="material-symbols-outlined text-primary text-3xl">security</span>
             <span className="font-headline-md text-sm font-bold text-white tracking-widest uppercase">Sentinel AI</span>
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

        {/* Main Content Area */}
        <main className="flex-1 bg-background p-gutter overflow-y-auto custom-scrollbar relative">
          
          {currentView === 'Live Feeds' && (
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 grid-rows-3 gap-gutter h-full min-h-[800px] ${selectedCamera ? 'hidden' : ''}`}>
              {cameras.map((cam, idx) => {
                const isAlert = alerts.length > 0 && alerts[0].camera_id === cam.id && (new Date() - new Date(alerts[0].timestamp)) < 8000;
                return (
                  <div key={cam.id} onClick={() => setSelectedCamera(cam)} className={`relative bg-surface-container-low border ${isAlert ? 'border-secondary animate-pulse' : 'border-primary/20'} hud-bracket scanline-container group overflow-hidden cursor-pointer`}>
                    <img 
                      key={`${cam.id}-${videoKey}`}
                      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
                      alt="Camera Feed" 
                      src={cam.streamUrl}
                      onError={handleVideoError}
                    />
                    <div className={`absolute inset-0 border-2 ${isAlert ? 'border-secondary' : 'border-primary/40'} pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                    <div className={`absolute top-2 left-2 font-data-mono text-[10px] bg-black/60 px-1 ${isAlert ? 'text-secondary' : 'text-primary/80'}`}>{cam.name} | {isAlert ? 'ALARM_ACTIVE' : 'MONITORING'}</div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isAlert ? 'bg-secondary shadow-[0_0_8px_#ff525c]' : 'bg-primary-fixed-dim'}`}></span>
                      <span className={`font-label-caps text-[10px] px-2 py-0.5 rounded-sm ${isAlert ? 'text-on-secondary bg-secondary' : 'text-primary bg-black/60'}`}>
                        {isAlert ? `${cam.id}: THREAT DETECTED` : `${cam.id}: SECURE`}
                      </span>
                    </div>
                    <div className={`absolute top-2 right-2 font-data-mono text-[10px] ${isAlert ? 'text-secondary animate-pulse' : 'text-primary/60'}`}>
                      {isAlert ? 'ACTION_REQUIRED' : '60 FPS'}
                    </div>
                  </div>
                );
              })}
              
              {/* Standby Slots */}
              {Array.from({ length: Math.max(0, 9 - cameras.length) }).map((_, idx) => (
                <div key={`standby-${idx}`} className="relative bg-surface-container-lowest border border-white/5 flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  <div className="text-center z-10">
                    <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl mb-2">signal_disconnected</span>
                    <p className="font-label-caps text-[10px] text-on-surface-variant/60 tracking-widest">NO_SIGNAL_RECEIVED</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentView === 'Live Feeds' && selectedCamera && (
             <div className="absolute inset-0 m-gutter bg-surface-container-low border border-primary/40 hud-bracket scanline-container overflow-hidden flex flex-col z-20">
                <div className="p-4 bg-black/80 flex justify-between items-center z-20">
                   <button onClick={() => setSelectedCamera(null)} className="font-label-caps text-primary hover:text-white flex items-center gap-2">
                     <span className="material-symbols-outlined text-sm">arrow_back</span> BACK TO GRID
                   </button>
                   <span className="font-data-mono text-primary">{selectedCamera.name} | HIGH RESOLUTION FEED</span>
                </div>
                <div className="flex-1 relative bg-black flex items-center justify-center">
                  <img src={selectedCamera.streamUrl} className="max-w-full max-h-full object-contain" onError={handleVideoError} />
                </div>
             </div>
          )}

          {currentView === 'Alerts' && (
            <div className="h-full bg-surface-container-lowest border border-white/10 rounded-lg p-6 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-headline-md text-primary glow-cyan flex items-center gap-2">
                   <span className="material-symbols-outlined">notification_important</span> Alert Database
                </h2>
                <button onClick={exportToCSV} className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 font-label-caps text-[10px] px-3 py-1.5 rounded-sm transition-colors flex items-center gap-2 uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[14px]">download</span> Export Evidence
                </button>
              </div>
              <table className="w-full text-left font-data-mono text-sm">
                <thead className="bg-primary/10 text-primary">
                  <tr>
                    <th className="p-4 font-normal tracking-widest uppercase">Time</th>
                    <th className="p-4 font-normal tracking-widest uppercase">Camera Node</th>
                    <th className="p-4 font-normal tracking-widest uppercase">Threat Type</th>
                    <th className="p-4 font-normal tracking-widest uppercase">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors text-on-surface-variant">
                      <td className="p-4">{new Date(a.timestamp || Date.now()).toLocaleString()}</td>
                      <td className="p-4 text-primary">{a.camera_id}</td>
                      <td className="p-4">
                         <span className={`px-2 py-1 rounded text-xs border ${['weapon', 'gun', 'knife'].some(w => (a.behavior_type || '').toLowerCase().includes(w)) ? 'border-secondary text-secondary bg-secondary/10' : 'border-yellow-400 text-yellow-400 bg-yellow-400/10'}`}>
                           {a.behavior_type}
                         </span>
                      </td>
                      <td className="p-4">{(a.confidence * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {currentView === 'Dashboard' && (
             <div className="h-full flex flex-col gap-6 p-6">
                <h2 className="font-headline-md text-primary glow-cyan flex items-center gap-2"><span className="material-symbols-outlined">dashboard</span> System Overview</h2>
                <div className="grid grid-cols-3 gap-6">
                   <div className="bg-surface-container-low border border-primary/20 p-6 rounded-lg hud-bracket">
                      <div className="text-on-surface-variant font-label-caps text-xs tracking-widest uppercase mb-2">Active Nodes</div>
                      <div className="text-4xl font-data-mono text-primary glow-cyan">{cameras.length}</div>
                   </div>
                   <div className="bg-surface-container-low border border-secondary/20 p-6 rounded-lg hud-bracket">
                      <div className="text-on-surface-variant font-label-caps text-xs tracking-widest uppercase mb-2">Total Alerts (24H)</div>
                      <div className="text-4xl font-data-mono text-secondary glow-red">{alerts.length}</div>
                   </div>
                   <div className="bg-surface-container-low border border-primary/20 p-6 rounded-lg hud-bracket">
                      <div className="text-on-surface-variant font-label-caps text-xs tracking-widest uppercase mb-2">System Load</div>
                      <div className="text-4xl font-data-mono text-primary glow-cyan">{systemHealth.cpu_percent.toFixed(0)}%</div>
                   </div>
                </div>
             </div>
          )}

          {currentView === 'Playback' && (
             <div className="h-full flex flex-col gap-6 p-6">
                <h2 className="font-headline-md text-primary glow-cyan flex items-center gap-2"><span className="material-symbols-outlined">history</span> Video Playback & Archive</h2>
                <div className="flex-1 bg-black border border-primary/20 rounded-lg flex items-center justify-center flex-col gap-4 hud-bracket scanline-container">
                   <span className="material-symbols-outlined text-6xl text-primary/20">movie</span>
                   <div className="font-label-caps tracking-widest text-primary/50">ARCHIVE SYSTEM OFFLINE IN EXHIBITION MODE</div>
                </div>
                <div className="h-24 bg-surface-container-low border border-primary/20 rounded p-4">
                   <div className="font-label-caps text-[10px] text-primary mb-2 tracking-widest">TIMELINE (24H)</div>
                   <div className="w-full h-8 bg-black relative border border-white/10">
                      <div className="absolute top-0 bottom-0 left-1/4 w-1 bg-secondary animate-pulse"></div>
                      <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-500"></div>
                   </div>
                </div>
             </div>
          )}

          {currentView === 'Analytics' && (
             <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto">
                <h2 className="font-headline-md text-primary glow-cyan flex items-center gap-2"><span className="material-symbols-outlined">monitoring</span> System Analytics</h2>
                <div className="grid grid-cols-2 gap-6 h-80">
                   <div className="bg-surface-container-low border border-primary/20 p-6 rounded-lg flex flex-col">
                      <div className="font-label-caps text-xs text-primary tracking-widest mb-4">THREAT LEVELS (WEEKLY)</div>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={threatData}>
                          <XAxis dataKey="name" stroke="#00f0ff50" fontSize={10} />
                          <Tooltip contentStyle={{ background: '#0a0e1a', border: '1px solid #00f0ff' }} cursor={{fill: '#00f0ff10'}} />
                          <Bar dataKey="level" fill="var(--color-secondary)" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="bg-surface-container-low border border-primary/20 p-6 rounded-lg flex flex-col">
                      <div className="font-label-caps text-xs text-primary tracking-widest mb-4">DETECTION HISTORY (24H)</div>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={detectionHistory}>
                          <XAxis dataKey="time" stroke="#00f0ff50" fontSize={10} />
                          <Tooltip contentStyle={{ background: '#0a0e1a', border: '1px solid #00f0ff' }} />
                          <Line type="monotone" dataKey="val1" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="val2" stroke="var(--color-secondary)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>
          )}

          {currentView === 'Settings' && (
             <div className="h-full flex flex-col gap-6 p-6">
                <h2 className="font-headline-md text-primary glow-cyan flex items-center gap-2"><span className="material-symbols-outlined">settings</span> System Configuration</h2>
                
                <div className="max-w-2xl bg-surface-container-low border border-primary/20 p-8 rounded-lg hud-bracket flex flex-col gap-8">
                   
                   <div>
                      <h3 className="font-label-caps text-primary tracking-widest mb-2 border-b border-primary/20 pb-2">AI ENGINE PARAMETERS</h3>
                      <div className="mt-6 flex flex-col gap-2">
                         <div className="flex justify-between">
                            <span className="font-data-mono text-sm text-on-surface-variant">Confidence Threshold</span>
                            <span className="font-data-mono text-sm text-primary">{sensitivity}%</span>
                         </div>
                         <input type="range" min="10" max="95" value={sensitivity} onChange={handleSensitivityChange} className="w-full h-1 bg-surface-variant rounded-full appearance-none cursor-pointer accent-primary-fixed-dim mt-2"/>
                         <p className="text-[10px] text-on-surface-variant/60 font-label-caps mt-2">Higher values reduce false positives but may miss partial threats.</p>
                      </div>
                   </div>

                   <div>
                      <h3 className="font-label-caps text-primary tracking-widest mb-2 border-b border-primary/20 pb-2">NOTIFICATION PROTOCOLS</h3>
                      <div className="mt-4 flex flex-col gap-4">
                         <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary bg-surface-variant border-primary/20" />
                            <span className="font-data-mono text-sm text-on-surface-variant">Push Alerts to Mobile Command</span>
                         </label>
                         <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-primary bg-surface-variant border-primary/20" />
                            <span className="font-data-mono text-sm text-on-surface-variant">Auto-Dispatch Patrol on Critical</span>
                         </label>
                      </div>
                   </div>

                </div>
             </div>
          )}
        </main>

        {/* Right Sidebar: Alerts & Charts */}
        {(currentView === 'Live Feeds' || currentView === 'Dashboard') && (
          <aside className="w-80 bg-[#070b14]/60 backdrop-blur-xl border-l border-white/10 flex flex-col p-panel-padding gap-6 overflow-y-auto custom-scrollbar shadow-[0_0_15px_rgba(0,0,0,0.5)] shrink-0 z-30">
            {/* AI Security Alerts */}
            <section className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-label-caps text-label-caps text-primary tracking-widest uppercase">AI Security Alerts</h3>
                <span className="font-data-mono text-[10px] text-secondary animate-pulse">LIVE</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {alerts.slice(0, 10).map((alert, idx) => {
                  const isHigh = ['weapon', 'gun', 'knife', 'grenade'].some(w => (alert.behavior_type || '').toLowerCase().includes(w));
                  return (
                    <div key={idx} className={`p-3 border-l-4 rounded-r-sm hover:bg-white/5 transition-colors cursor-pointer ${isHigh ? 'bg-secondary/5 border-secondary' : 'bg-yellow-500/5 border-yellow-500'}`}>
                      <div className="flex gap-3">
                        <span className={`material-symbols-outlined text-sm ${isHigh ? 'text-secondary' : 'text-yellow-500'}`}>{isHigh ? 'warning' : 'info'}</span>
                        <div className="flex-1">
                          <p className={`font-label-caps text-[11px] leading-tight uppercase ${isHigh ? 'text-secondary' : 'text-yellow-500'}`}>{alert.behavior_type}</p>
                          <p className="font-data-mono text-[10px] text-on-surface-variant mt-1">{alert.camera_id} | {new Date(alert.timestamp).toLocaleTimeString('en-GB', {hour12:false})}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {alerts.length === 0 && (
                  <div className="p-3 bg-white/5 border-l-4 border-tertiary-fixed-dim/30 rounded-r-sm opacity-60">
                    <div className="flex gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-sm">security</span>
                      <div className="flex-1">
                        <p className="font-label-caps text-[11px] text-on-surface-variant leading-tight uppercase">System Secure</p>
                        <p className="font-data-mono text-[10px] text-on-surface-variant mt-1">No recent threats</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Threat Levels Chart */}
            <section>
              <h3 className="font-label-caps text-label-caps text-primary tracking-widest uppercase mb-4">Threat Levels</h3>
              <div className="h-24 px-2 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={threatData}>
                    <Bar dataKey="level" fill="var(--color-secondary)" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between mt-2 px-1">
                <span className="font-data-mono text-[9px] text-on-surface-variant uppercase">MON</span>
                <span className="font-data-mono text-[9px] text-on-surface-variant uppercase">SUN</span>
              </div>
            </section>

            {/* Detection History Chart */}
            <section>
              <h3 className="font-label-caps text-label-caps text-primary tracking-widest uppercase mb-4">Detection History (24H)</h3>
              <div className="h-32 w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detectionHistory}>
                    <XAxis dataKey="time" hide />
                    <Tooltip contentStyle={{ background: '#0a0e1a', border: '1px solid #00f0ff' }} cursor={{stroke: '#00f0ff', strokeWidth: 1}}/>
                    <Line type="monotone" dataKey="val1" stroke="var(--color-primary)" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="val2" stroke="var(--color-secondary)" strokeWidth={1.5} dot={false} opacity={0.5}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-data-mono text-[9px] text-on-surface-variant">00:00</span>
                <span className="font-data-mono text-[9px] text-on-surface-variant">12:00</span>
                <span className="font-data-mono text-[9px] text-on-surface-variant">23:59</span>
              </div>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (password === 'admin123') {
      onLogin('aegis_command_token');
    } else {
      setError('ACCESS DENIED. INCORRECT SECURITY CIPHER.');
    }
  };

  return (
    <div className="bg-background text-on-background font-body-base h-screen w-screen flex items-center justify-center relative overflow-hidden">
      <div className="scanline-container absolute inset-0 opacity-30"></div>
      
      <div className="bg-[#0f1c2f]/90 backdrop-blur-xl rounded-lg w-96 p-8 relative z-10 border border-primary/20 shadow-[0_0_30px_rgba(0,240,255,0.15)] hud-bracket">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full border border-primary flex justify-center items-center mb-4 text-primary bg-primary/5 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <span className="material-symbols-outlined text-3xl">security</span>
          </div>
          <h1 className="font-label-caps text-lg font-bold tracking-widest text-primary uppercase mt-2 glow-cyan">AEGIS_COMMAND</h1>
          <h2 className="font-data-mono text-[10px] text-on-surface-variant tracking-widest uppercase mt-2">Initialize Authorization</h2>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-sm border text-[10px] font-data-mono text-center tracking-widest bg-error-container border-error text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-sm">key</span>
            <input 
              type="password" 
              placeholder="SECURITY CIPHER" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-sm px-10 py-3.5 text-xs text-white focus:outline-none focus:border-primary transition-colors placeholder-on-surface-variant/50 font-data-mono tracking-wider"
              required
            />
          </div>

          <button type="submit" className="w-full py-3.5 rounded-sm text-xs font-label-caps tracking-widest uppercase mt-4 bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all glow-cyan hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            Authenticate
          </button>
        </form>

        <div className="mt-8 text-center">
          <span className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest">
            Exhibition Mode Active
          </span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const handleLogin = (newToken) => { localStorage.setItem('auth_token', newToken); setToken(newToken); };
  const handleLogout = () => { localStorage.removeItem('auth_token'); setToken(null); };
  if (!token) return <AuthScreen onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
