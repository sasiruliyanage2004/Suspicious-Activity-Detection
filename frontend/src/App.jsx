import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, Tooltip, ResponsiveContainer, YAxis, XAxis, CartesianGrid } from 'recharts';
import { LayoutDashboard, Radio, Bell, PlaySquare, BarChart2, HardDrive, Settings, Search, Shield, AlertTriangle, User, Lock, Key, LogOut } from 'lucide-react';

function Dashboard({ token, onLogout }) {
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([{ id: 'Cam-01', streamUrl: 'http://127.0.0.1:8002/video_feed', name: '01-Main' }]);
  const [timeStr, setTimeStr] = useState('');
  const [videoKey, setVideoKey] = useState(Date.now());
  const [sensitivity, setSensitivity] = useState(65);
  const [currentView, setCurrentView] = useState('Live Feeds');
  const [selectedCamera, setSelectedCamera] = useState(null);

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
    } catch (err) {
      console.error("Failed to update threshold", err);
    }
  };

  const handleVideoError = () => {
    setTimeout(() => setVideoKey(Date.now()), 2000);
  };

  // WebSockets for Instant Alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/alerts/');
        if (response.ok) {
          const data = await response.json();
          const validAlerts = data.filter(a => a && a.behavior_type && a.behavior_type !== 'Unknown');
          setAlerts(validAlerts.slice(-20).reverse());
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };
    fetchAlerts();

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
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    };
    return () => ws.close();
  }, []);

  // Clock
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-GB', { hour12: false }) + ' GMT');
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const formatTimeAgo = (timestampStr) => {
    if (!timestampStr) return '';
    const timeStr = timestampStr.endsWith('Z') ? timestampStr : timestampStr + 'Z';
    const diffSec = Math.max(0, Math.floor((new Date() - new Date(timeStr)) / 1000));
    if (diffSec < 60) return `Just now`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  };

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Live Feeds', icon: <Radio size={18} /> },
    { name: 'Alerts', icon: <Bell size={18} /> },
    { name: 'Playback', icon: <PlaySquare size={18} /> },
    { name: 'Analytics', icon: <BarChart2 size={18} /> },
    { name: 'Devices', icon: <HardDrive size={18} /> },
    { name: 'Settings', icon: <Settings size={18} /> }
  ];

  const renderContent = () => {
    if (currentView === 'Alerts') {
      return (
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6">
          <h2 className="text-2xl text-[var(--color-cyan)] font-bold mb-6 flex items-center gap-2">
            <Bell className="text-[var(--color-red)]"/> Alert History Database
          </h2>
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#00f0ff1a] text-[var(--color-cyan)]">
                <tr>
                  <th className="p-4">Time</th>
                  <th className="p-4">Camera Node</th>
                  <th className="p-4">Threat Type</th>
                  <th className="p-4">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => (
                  <tr key={i} className="border-b border-[var(--color-cyan)]/10 hover:bg-[#00f0ff0a] transition-colors">
                    <td className="p-4 opacity-80">{new Date(a.timestamp || Date.now()).toLocaleString()}</td>
                    <td className="p-4 font-mono text-[var(--color-cyan)]">{a.camera_id}</td>
                    <td className="p-4">
                       <span className={`px-2 py-1 rounded text-xs border ${['weapon', 'gun', 'knife'].some(w => (a.behavior_type || '').toLowerCase().includes(w)) ? 'border-[var(--color-red)] text-[var(--color-red)] bg-[#ff003c20]' : 'border-yellow-400 text-yellow-400 bg-yellow-400/20'}`}>
                         {a.behavior_type}
                       </span>
                    </td>
                    <td className="p-4">{(a.confidence * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {alerts.length === 0 && <p className="p-8 text-center opacity-50">No alerts recorded yet.</p>}
          </div>
        </div>
      );
    }

    if (currentView === 'Analytics') {
      return (
        <div className="flex-1 p-6 flex flex-col gap-6">
          <h2 className="text-2xl text-[var(--color-cyan)] font-bold flex items-center gap-2">
            <BarChart2 /> System Analytics Overview
          </h2>
          <div className="grid grid-cols-2 gap-6 h-64">
            <div className="glass-panel p-4 flex flex-col">
              <h3 className="text-sm opacity-70 mb-4 font-mono uppercase">Threat Levels (Weekly)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={threatData}>
                  <XAxis dataKey="name" stroke="#00f0ff50" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#0a0e1a', border: '1px solid #00f0ff' }} cursor={{fill: '#00f0ff10'}} />
                  <Bar dataKey="level" fill="var(--color-red)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-panel p-4 flex flex-col">
              <h3 className="text-sm opacity-70 mb-4 font-mono uppercase">Detection History (24hrs)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detectionHistory}>
                  <XAxis dataKey="time" stroke="#00f0ff50" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#0a0e1a', border: '1px solid #00f0ff' }} />
                  <Line type="monotone" dataKey="val1" stroke="var(--color-cyan)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="val2" stroke="#4ade80" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    // Default: Live Feeds
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
        {/* Top Header inside main content */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-light tracking-wide text-white">UI Dashboard <span className="text-[10px] bg-[#00f0ff20] text-[var(--color-cyan)] border border-[var(--color-cyan)] px-2 py-0.5 rounded ml-2 align-middle font-bold tracking-widest">ONLINE</span></h2>
          <div className="flex items-center gap-6">
            <div className="text-xl font-mono tracking-widest text-white">{timeStr}</div>
            <div className="flex items-center gap-3 glass-panel px-4 py-1.5 border-[var(--color-cyan)]/30">
              <span className="text-xs opacity-70">AI Confidence</span>
              <span className="text-green-400 font-mono font-bold">{sensitivity}%</span>
              <input 
                type="range" min="10" max="99" value={sensitivity} onChange={handleSensitivityChange}
                className="w-24 h-1 bg-[#00f0ff30] rounded-lg appearance-none cursor-pointer accent-[var(--color-cyan)]"
              />
            </div>
            <div className="flex gap-3">
              <button className="cyber-button w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-red)] border-[var(--color-red)]/50 hover:bg-[var(--color-red)]/10"><Bell size={14}/></button>
              <button className="cyber-button w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-cyan)] border-[var(--color-cyan)]/50"><Radio size={14}/></button>
              <div className="flex items-center gap-2 ml-2 cyber-button px-3 py-1 rounded">
                <User size={14} className="text-[var(--color-cyan)]"/>
                <span className="text-sm opacity-80">User: Admin</span>
              </div>
              <button onClick={onLogout} className="cyber-button w-8 h-8 ml-2 rounded-full flex items-center justify-center text-gray-400 hover:text-[var(--color-red)] hover:border-[var(--color-red)] border-gray-600">
                 <LogOut size={14}/>
              </button>
            </div>
          </div>
        </div>

        {/* Camera Grid */}
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 pb-2">
          {cameras.map((cam, idx) => {
            const isAlert = alerts.length > 0 && alerts[0].camera_id === cam.id && (new Date() - new Date(alerts[0].timestamp)) < 8000;
            return (
              <div key={cam.id} onClick={() => setSelectedCamera(cam)} className={`camera-card flex flex-col group cursor-pointer hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] ${isAlert ? 'alert-active' : ''}`}>
                <div className="px-3 py-1.5 bg-[#000] border-b border-[var(--color-cyan)]/20 flex justify-between items-center z-20">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white opacity-90">{cam.name}</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan)]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan)] opacity-50"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan)] opacity-20"></span>
                  </div>
                </div>
                <div className="relative flex-1 bg-black overflow-hidden flex justify-center items-center">
                  <div className="scan-line"></div>
                  <img 
                    key={`${cam.id}-${videoKey}`}
                    className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                    alt="Camera Feed" 
                    src={cam.streamUrl}
                    onError={handleVideoError}
                  />
                  {/* Overlay crosshairs */}
                  <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                        <div className="w-4 h-4 border-t-2 border-l-2 border-[var(--color-cyan)]/50"></div>
                        <div className="w-4 h-4 border-t-2 border-r-2 border-[var(--color-cyan)]/50"></div>
                     </div>
                     <div className="flex justify-between items-end">
                        <div className="w-4 h-4 border-b-2 border-l-2 border-[var(--color-cyan)]/50"></div>
                        <div className="w-4 h-4 border-b-2 border-r-2 border-[var(--color-cyan)]/50"></div>
                     </div>
                  </div>
                  {/* Mockup specific overlay */}
                  {isAlert && (
                     <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#ff003c20] border border-[var(--color-red)] px-3 py-1 rounded">
                         <span className="text-[10px] text-[var(--color-red)] font-bold tracking-widest">THREAT ACTIVE</span>
                     </div>
                  )}
                </div>
                <div className={`px-3 py-2 bg-[#000] border-t ${isAlert ? 'border-[var(--color-red)]/50' : 'border-[var(--color-cyan)]/20'} flex items-center gap-2 z-20`}>
                  <div className={`w-6 h-6 rounded flex justify-center items-center ${isAlert ? 'bg-[var(--color-red)]/20 text-[var(--color-red)]' : 'bg-green-500/20 text-green-400'}`}>
                    {isAlert ? <AlertTriangle size={12}/> : <User size={12}/>}
                  </div>
                  <div>
                    <div className={`text-[9px] font-bold tracking-widest uppercase ${isAlert ? 'text-[var(--color-red)]' : 'text-green-400'}`}>
                      {isAlert ? 'THREAT DETECTED' : 'SECURE / CLEAR'}
                    </div>
                    <div className="text-[8px] font-mono opacity-50 uppercase">Status: {isAlert ? 'Alert!' : 'Secure'}</div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Standby Slots to fill 3x3 depending on camera count */}
          {Array.from({ length: Math.max(0, 9 - cameras.length) }).map((_, idx) => (
            <div key={`standby-${idx}`} className="camera-card flex flex-col border-[var(--color-cyan)]/10">
              <div className="px-3 py-1.5 bg-[#000] border-b border-[var(--color-cyan)]/10 flex justify-between items-center z-20">
                <span className="text-[10px] font-bold tracking-widest uppercase text-white opacity-40">STANDBY - 0{idx + cameras.length + 1}</span>
                <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white opacity-10"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white opacity-10"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white opacity-10"></span>
                </div>
              </div>
              <div className="relative flex-1 bg-[#050810] flex justify-center items-center border border-[var(--color-cyan)]/5 m-4">
                <span className="text-xs font-mono opacity-20 tracking-widest">NO SIGNAL</span>
              </div>
              <div className="px-3 py-2 bg-[#000] border-t border-[var(--color-cyan)]/10 flex items-center gap-2 z-20 opacity-30">
                 <div className="w-6 h-6 rounded bg-gray-500/20"></div>
                 <div>
                    <div className="text-[9px] font-bold tracking-widest uppercase">OFFLINE</div>
                    <div className="text-[8px] font-mono opacity-50 uppercase">Status: Disconnected</div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render Full Screen Camera if one is selected
  const renderSelectedCamera = () => {
    const cam = selectedCamera;
    const isAlert = alerts.length > 0 && alerts[0].camera_id === cam.id && (new Date() - new Date(alerts[0].timestamp)) < 8000;
    
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden p-4 relative z-20">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => setSelectedCamera(null)}
            className="cyber-button px-4 py-2 rounded flex items-center gap-2 hover:bg-[var(--color-cyan)] hover:text-black font-bold tracking-widest text-sm transition-colors"
          >
            ← BACK TO GRID
          </button>
          <div className="text-xl font-mono tracking-widest text-white">{timeStr}</div>
        </div>

        <div className={`camera-card flex-1 flex flex-col w-full h-full ${isAlert ? 'alert-active' : ''}`}>
           <div className="px-6 py-3 bg-[#000] border-b border-[var(--color-cyan)]/20 flex justify-between items-center z-20">
              <span className="text-sm font-bold tracking-widest uppercase text-white">{cam.name} - HIGH RESOLUTION FEED</span>
              <div className="flex items-center gap-4">
                <span className="w-2 h-2 rounded-full bg-[var(--color-cyan)] animate-pulse"></span>
                <span className="text-xs font-mono opacity-50">FPS: 30</span>
              </div>
           </div>
           
           <div className="relative flex-1 bg-black overflow-hidden flex justify-center items-center">
              <div className="scan-line"></div>
              <img 
                key={`${cam.id}-full-${videoKey}`}
                className="absolute inset-0 w-full h-full object-contain" 
                alt="Camera Feed" 
                src={cam.streamUrl}
                onError={handleVideoError}
              />
              
              <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
                 <div className="flex justify-between items-start">
                    <div className="w-8 h-8 border-t-4 border-l-4 border-[var(--color-cyan)]/70"></div>
                    <div className="w-8 h-8 border-t-4 border-r-4 border-[var(--color-cyan)]/70"></div>
                 </div>
                 <div className="flex justify-between items-end">
                    <div className="w-8 h-8 border-b-4 border-l-4 border-[var(--color-cyan)]/70"></div>
                    <div className="w-8 h-8 border-b-4 border-r-4 border-[var(--color-cyan)]/70"></div>
                 </div>
              </div>

              {isAlert && (
                 <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff003c40] border-2 border-[var(--color-red)] px-6 py-2 rounded-lg animate-pulse">
                     <span className="text-lg text-white font-bold tracking-widest">⚠️ CRITICAL THREAT DETECTED ⚠️</span>
                 </div>
              )}
           </div>
           
           <div className={`px-6 py-3 bg-[#000] border-t ${isAlert ? 'border-[var(--color-red)]/50' : 'border-[var(--color-cyan)]/20'} flex items-center gap-3 z-20`}>
              <div className={`w-8 h-8 rounded flex justify-center items-center ${isAlert ? 'bg-[var(--color-red)] text-white' : 'bg-green-500/20 text-green-400'}`}>
                {isAlert ? <AlertTriangle size={16}/> : <Shield size={16}/>}
              </div>
              <div>
                <div className={`text-xs font-bold tracking-widest uppercase ${isAlert ? 'text-[var(--color-red)]' : 'text-green-400'}`}>
                  {isAlert ? 'IMMEDIATE ACTION REQUIRED' : 'SECTOR CLEAR'}
                </div>
                <div className="text-[10px] font-mono opacity-50 uppercase">Network Status: Online | Latency: 12ms</div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-[var(--color-text-main)] font-sans bg-plexus">
      
      {/* Left Sidebar - Glass Panel */}
      <div className="w-64 bg-[#0a0f18]/70 backdrop-blur-2xl border-r border-[var(--color-cyan)]/20 flex flex-col justify-between z-50 shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-cyan)]/10 border border-[var(--color-cyan)]/50 flex justify-center items-center">
              <Shield className="text-[var(--color-cyan)]"/>
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-widest text-white">AI SECURITY</h1>
              <h2 className="text-[9px] text-[var(--color-cyan)] opacity-70 tracking-widest uppercase">Command Center</h2>
            </div>
          </div>
        </div>
        
        <div className="flex-1 py-6 px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <button 
              key={item.name}
              onClick={() => setCurrentView(item.name)}
              className={`cyber-button w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm text-left ${currentView === item.name ? 'active' : 'border-transparent hover:border-[var(--color-cyan)]/20'}`}
            >
              <span className={`${currentView === item.name ? 'text-[var(--color-cyan)]' : 'opacity-60'}`}>{item.icon}</span>
              <span className={currentView === item.name ? 'font-bold' : 'opacity-70'}>{item.name}</span>
              {item.name === 'Live Feeds' && <span className="ml-auto text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded">Active</span>}
              {item.name === 'Alerts' && alerts.length > 0 && <span className="ml-auto text-[9px] bg-[var(--color-red)]/20 text-[var(--color-red)] border border-[var(--color-red)]/30 px-1.5 py-0.5 rounded">{alerts.length} New</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-black/40">
        {selectedCamera ? renderSelectedCamera() : renderContent()}
      </div>

      {/* Right Sidebar - Analytics & Alerts (Always visible unless in Alerts view full page) */}
      {currentView !== 'Alerts' && currentView !== 'Analytics' && (
        <div className="w-80 bg-[#0a0f18]/70 backdrop-blur-2xl border-l border-[var(--color-cyan)]/20 flex flex-col p-4 gap-4 z-50 overflow-y-auto scrollbar-hide shadow-[-5px_0_30px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--color-cyan)]/20">
            <h3 className="text-[11px] font-bold tracking-widest uppercase text-white">AI Security Alerts</h3>
            <span className="text-[10px] text-[var(--color-red)] font-bold">({alerts.length} ACTIVE)</span>
          </div>
          
          <div className="flex flex-col gap-3">
            {alerts.slice(0,4).map((alert, idx) => {
              const isHigh = ['weapon', 'gun', 'knife', 'grenade'].some(w => (alert.behavior_type || '').toLowerCase().includes(w));
              return (
                <div key={idx} className={`p-3 rounded-lg border bg-[#000] flex gap-3 ${isHigh ? 'border-[var(--color-red)]/50' : 'border-yellow-500/30'}`}>
                  <div className={`mt-1 ${isHigh ? 'text-[var(--color-red)]' : 'text-yellow-500'}`}>
                    {isHigh ? <AlertTriangle size={18}/> : <AlertTriangle size={18}/>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] opacity-70 tracking-widest">{new Date(alert.timestamp).toLocaleTimeString('en-GB', {hour12:false})} - {alert.camera_id}</span>
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-widest ${isHigh ? 'text-[var(--color-red)]' : 'text-yellow-500'}`}>
                      {alert.behavior_type}
                    </div>
                  </div>
                </div>
              );
            })}
            {alerts.length === 0 && <div className="text-xs opacity-50 text-center py-4">No recent alerts</div>}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--color-cyan)]/20">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-[11px] font-bold tracking-widest uppercase text-white">Threat Levels</h3>
                <span className="text-[9px] text-[var(--color-red)] opacity-70">Bar Chart</span>
             </div>
             <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={threatData}>
                    <Bar dataKey="level" fill="#ff003c" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--color-cyan)]/20">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-[11px] font-bold tracking-widest uppercase text-white">Detection History</h3>
                <span className="text-[9px] text-[var(--color-cyan)] opacity-70">24hrs</span>
             </div>
             <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detectionHistory}>
                    <Line type="monotone" dataKey="val1" stroke="#00f0ff" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="val2" stroke="#4ade80" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Simplified Hardcoded Authentication for Exhibition
    if (password === 'admin123') {
      onLogin('exhibition_admin_token');
    } else {
      setError('Access Denied. Incorrect Security Cipher.');
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-plexus relative overflow-hidden font-sans">
      
      <div className="bg-[#0f1523]/90 backdrop-blur-md rounded-lg w-96 p-8 relative z-10 border border-[#1a2639] shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full border border-[var(--color-cyan)] flex justify-center items-center mb-4">
            <Shield className="text-[var(--color-cyan)] w-8 h-8" />
          </div>
          <h1 className="text-[17px] font-bold tracking-widest text-white uppercase mt-2">Create Credentials</h1>
          <h2 className="text-[10px] text-[var(--color-cyan)] tracking-widest uppercase mt-2">AI Security Core</h2>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded border text-xs text-center font-bold tracking-widest bg-[#ff003c20] border-[var(--color-red)] text-[var(--color-red)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="OPERATIVE ID (USERNAME)" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#05080f] border border-[#1a2639] rounded px-11 py-3.5 text-xs text-white focus:outline-none focus:border-[var(--color-cyan)] transition-colors placeholder-gray-600 font-mono tracking-wider"
            />
          </div>
          
          <div className="relative">
            <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input 
              type="password" 
              placeholder="SECURITY CIPHER (PASSWORD)" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#05080f] border border-[#1a2639] rounded px-11 py-3.5 text-xs text-white focus:outline-none focus:border-[var(--color-cyan)] transition-colors placeholder-gray-600 font-mono tracking-wider"
              required
            />
          </div>

          <button type="submit" className="w-full py-3.5 rounded text-xs font-bold tracking-widest uppercase mt-4 bg-transparent border border-[#1a2639] text-white hover:border-[var(--color-cyan)] hover:text-[var(--color-cyan)] transition-colors">
            Initialize Account
          </button>
        </form>

        <div className="mt-8 text-center">
          <span className="text-[9px] text-[var(--color-cyan)] opacity-70 uppercase tracking-widest cursor-pointer hover:opacity-100 transition-opacity">
            Return to Authentication Portal
          </span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  const handleLogin = (newToken) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
  };

  if (!token) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}
