import React, { useState, useEffect } from 'react';

function App() {
  const [alerts, setAlerts] = useState([]);
  const [timeStr, setTimeStr] = useState('');
  const [videoKey, setVideoKey] = useState(Date.now());
  const [sensitivity, setSensitivity] = useState(65);

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
    // Retry loading the video feed every 2 seconds if the server is still starting up
    setTimeout(() => {
      setVideoKey(Date.now());
    }, 2000);
  };

  // Use WebSockets for Instant Alerts
  useEffect(() => {
    // Initial fetch to load existing alerts
    const fetchAlerts = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/alerts/');
        if (response.ok) {
          const data = await response.json();
          const validAlerts = data.filter(a => a && a.behavior_type && a.behavior_type !== 'Unknown');
          setAlerts(validAlerts.slice(-10).reverse());
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };
    fetchAlerts();

    // Connect to WebSocket for real-time updates
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/alerts');
    
    ws.onmessage = (event) => {
      try {
        const newAlert = JSON.parse(event.data);
        if (newAlert && newAlert.behavior_type && newAlert.behavior_type !== 'Unknown') {
          setAlerts(prevAlerts => {
            // Add the new alert to the beginning of the list and keep only 10
            const updated = [newAlert, ...prevAlerts];
            return updated.slice(0, 10);
          });
        }
      } catch (e) {
        console.error("WebSocket message parse error:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Update clock every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: true }) + ' ' + now.toLocaleDateString());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Format timestamp nicely
  const formatTimeAgo = (timestampStr) => {
    if (!timestampStr) return '';
    const timeStr = timestampStr.endsWith('Z') ? timestampStr : timestampStr + 'Z';
    const alertTime = new Date(timeStr);
    const now = new Date();
    const diffSec = Math.max(0, Math.floor((now - alertTime) / 1000));
    
    if (diffSec < 60) return `Just now`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  };

  // Helper to determine styling based on behavior
  const getAlertStyle = (behavior) => {
    const lowerBehavior = (behavior || 'unknown').toLowerCase();
    const isWeapon = ['weapon', 'gun', 'knife', 'grenade', 'explosion'].some(w => lowerBehavior.includes(w));
    const isEmotion = lowerBehavior.includes('emotion');
    
    if (lowerBehavior.includes('fall') || isWeapon || lowerBehavior.includes('fight')) {
      return {
        colorClass: 'text-error',
        bgClass: 'bg-error/20',
        borderClass: 'border-error',
        hoverClass: 'hover:bg-error/5 hover:border-error/40 border-l-error ring-error/20',
        icon: 'warning',
        bgFill: 'bg-error',
        borderColor: 'border-error/30'
      };
    } else if (isEmotion) {
      return {
        colorClass: 'text-orange-500',
        bgClass: 'bg-orange-500/20',
        borderClass: 'border-orange-500',
        hoverClass: 'hover:bg-orange-500/5 hover:border-orange-500/40 border-l-orange-500',
        icon: 'mood_bad',
        bgFill: 'bg-orange-500',
        borderColor: 'border-orange-500/30'
      };
    } else if (lowerBehavior.includes('loiter')) {
      return {
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-400/20',
        borderClass: 'border-amber-400',
        hoverClass: 'hover:bg-amber-400/5 hover:border-amber-400/40 border-l-amber-400',
        icon: 'schedule',
        bgFill: 'bg-amber-400',
        borderColor: 'border-amber-400/30'
      };
    } else {
      return {
        colorClass: 'text-primary',
        bgClass: 'bg-primary/20',
        borderClass: 'border-primary',
        hoverClass: 'hover:bg-primary/5 hover:border-primary/40 border-l-primary',
        icon: 'info',
        bgFill: 'bg-primary',
        borderColor: 'border-primary/30'
      };
    }
  };

  return (
    <>
      <header className="flex justify-between items-center w-full px-6 h-16 fixed top-0 z-50 bg-surface-container/60 dark:bg-surface-container/60 backdrop-blur-xl border-b border-primary/10 shadow-[0_0_30px_rgba(125,211,252,0.05)]">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">security</span>
          <span className="text-xl font-headline font-semibold text-primary tracking-tight">CCTV Security Center</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 font-body text-on-surface tracking-tight">
          <a className="text-primary font-bold border-b-2 border-primary pb-1" href="#/">Live View</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#/">Alert History</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#/">Camera Nodes</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#/">Analytics</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#/">System Health</a>
        </nav>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <span className="material-symbols-outlined text-on-surface-variant p-2 rounded-full hover:bg-primary/10 transition-all duration-300 cursor-pointer active:scale-95">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant p-2 rounded-full hover:bg-primary/10 transition-all duration-300 cursor-pointer active:scale-95">settings</span>
          <div className="flex items-center gap-2 pl-2 border-l border-primary/10">
            <span className="material-symbols-outlined text-primary text-3xl">account_circle</span>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-16 bottom-0 flex flex-col z-40 bg-surface-container-low/60 dark:bg-surface-container-low/60 backdrop-blur-2xl border-r border-primary/10 w-64 hidden xl:flex">
        <div className="p-6 flex flex-col items-center border-b border-primary/5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-3 overflow-hidden">
            <img className="w-full h-full object-cover" alt="Operator" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr_qYTskroEce7JweBv7-DAvcAUfX7axGLlCdr8k-g5SiDL9h_LIMrKJUXhZCEisARqfijIR5HEDmJm5Yp0G5tqmqJL3ibrIujpNDl9a7hQ3jdTVv0AtWAB4jBRjEg2v4_suuqwDfEftXBxgx0QeLjux9KvcPR7jxM5N1N-mtmjv0EEl25anrap71L0HdokkWMsGECfohsrgK0A5jsJhUU4WIeeD5Dk_Tw0nVo64eODBIQX6Z4j9NwmH6px9OsbmgkHVZUgZZUhlY"/>
          </div>
          <h3 className="text-on-surface font-bold">Operator Alpha</h3>
          <p className="text-on-surface-variant text-xs">Sector 7G</p>
        </div>
        <nav className="flex-1 py-4 font-body text-sm overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-3 bg-primary/20 text-primary border-r-4 border-primary px-4 py-3 cursor-pointer">
            <span className="material-symbols-outlined">videocam</span>
            <span>Live View</span>
          </div>
          <div className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-variant/30 hover:backdrop-brightness-125 transition-all hover:translate-x-1 duration-200 cursor-pointer">
            <span className="material-symbols-outlined">warning</span>
            <span>Alert History</span>
          </div>
          <div className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-variant/30 hover:backdrop-brightness-125 transition-all hover:translate-x-1 duration-200 cursor-pointer">
            <span className="material-symbols-outlined">router</span>
            <span>Camera Nodes</span>
          </div>
          <div className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-variant/30 hover:backdrop-brightness-125 transition-all hover:translate-x-1 duration-200 cursor-pointer">
            <span className="material-symbols-outlined">monitoring</span>
            <span>Analytics</span>
          </div>
          <div className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-variant/30 hover:backdrop-brightness-125 transition-all hover:translate-x-1 duration-200 cursor-pointer">
            <span className="material-symbols-outlined">health_and_safety</span>
            <span>System Health</span>
          </div>
        </nav>
        <div className="p-6">
          <button className="w-full py-3 bg-error/20 border border-error/50 text-error rounded-xl font-bold hover:bg-error hover:text-on-error transition-all active:scale-95">
            Emergency Lockdown
          </button>
        </div>
      </aside>

      <main className="pt-24 pb-12 px-4 xl:ml-64 transition-all">
        <div className="w-full mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-headline font-bold text-on-surface">Sector 01 - Main Entrance</h2>
                  <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs rounded-full uppercase tracking-widest font-bold">4K Crystal Stream</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-primary/20 backdrop-blur-md">
                    <span className="text-on-surface-variant text-sm font-bold">AI Sensitivity:</span>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={sensitivity} 
                      onChange={handleSensitivityChange}
                      className="w-24 accent-primary"
                    />
                    <span className="text-primary font-mono text-sm w-8">{sensitivity}%</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 glass-card rounded-lg hover:bg-primary/20 transition-all text-on-surface-variant hover:text-primary">
                      <span className="material-symbols-outlined">fullscreen</span>
                    </button>
                    <button className="p-2 glass-card rounded-lg hover:bg-primary/20 transition-all text-on-surface-variant hover:text-primary">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-2xl border-2 border-primary/40 camera-glow overflow-hidden tech-grid group bg-black flex justify-center items-center">
                <div className="absolute inset-0 z-0">
                  <img 
                    key={videoKey}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition-all duration-700 opacity-90" 
                    alt="Camera feed is starting up... Please wait." 
                    src={`http://127.0.0.1:8002/video_feed?t=${videoKey}`}
                    onError={handleVideoError}
                  />
                </div>
                <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <div className="w-2 h-2 bg-error rounded-full animate-pulse-red"></div>
                      <span className="text-error font-bold text-sm tracking-tighter">REC</span>
                    </div>
                    <div className="text-right font-mono text-primary/80 text-xs space-y-1">
                      <p>{timeStr || "Loading time..."}</p>
                      <p>LAT: 40.7128° N | LON: 74.0060° W</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="bg-black/40 backdrop-blur-md border border-primary/20 p-4 rounded-xl">
                      <div className="font-mono text-primary/90 text-sm space-y-1">
                        <p><span className="opacity-50">Camera ID:</span> Cam-01</p>
                        <p><span className="opacity-50">Status:</span> Online (Tracking Active)</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 glass-card rounded-full flex items-center justify-center border-primary/30">
                        <span className="material-symbols-outlined text-primary/60">videocam</span>
                      </div>
                      <div className="w-12 h-12 glass-card rounded-full flex items-center justify-center border-primary/30">
                        <span className="material-symbols-outlined text-primary/60">mic</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-x-0 h-[1px] bg-primary/20 shadow-[0_0_15px_rgba(125,211,252,0.5)] top-0 animate-[scan_8s_linear_infinite] z-20"></div>
              </div>
            </div>
            
            <div className="flex flex-col h-[70vh] gap-4">
              <div className="glass-card p-4 rounded-xl flex items-center justify-between border-primary/20">
                <h2 className="text-xl font-headline font-bold text-on-surface">Recent Security Alerts</h2>
                <span className="material-symbols-outlined text-primary/50">filter_list</span>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-on-surface-variant border border-dashed border-primary/20 rounded-xl">
                    No recent alerts. Monitoring active.
                  </div>
                ) : (
                  alerts.map((alert, index) => {
                    const style = getAlertStyle(alert.behavior_type);
                    const confidencePercent = Math.round((alert.confidence || 0) * 100);
                    const lowerBehavior = (alert.behavior_type || 'unknown').toLowerCase();
                    const isWeapon = ['weapon', 'gun', 'knife', 'grenade', 'explosion'].some(w => lowerBehavior.includes(w));
                    const isEmotion = lowerBehavior.includes('emotion');
                    
                    return (
                      <div key={alert.id || index} className={`glass-card p-4 rounded-xl group cursor-pointer transition-all duration-300 border-l-4 ${style.hoverClass}`}>
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${style.bgClass} ${style.borderColor} ${style.colorClass}`}>
                            <span className="material-symbols-outlined">{style.icon}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h3 className={`font-bold capitalize ${style.colorClass}`}>
                                {(alert.behavior_type || 'unknown').toLowerCase().includes('detect') 
                                  ? (alert.behavior_type || 'unknown').replace('_', ' ') 
                                  : `${(alert.behavior_type || 'unknown').replace('_', ' ')} Detected`}
                              </h3>
                              <span className="text-xs text-on-surface-variant">{formatTimeAgo(alert.timestamp)}</span>
                            </div>
                            <p className="text-sm text-on-surface-variant mt-1">
                              {lowerBehavior.includes('fall') ? 'Person detected on floor in camera view.' : 
                               isWeapon ? 'High-risk object identified in camera view.' :
                               isEmotion ? alert.details :
                               lowerBehavior.includes('person') ? 'New person entered the monitored area.' :
                               'Suspicious movement detected in restricted zone.'}
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex-1 bg-surface-container-highest h-1 rounded-full overflow-hidden">
                                <div className={`${style.bgFill} h-full`} style={{ width: `${confidencePercent}%` }}></div>
                              </div>
                              <span className={`text-xs font-mono font-bold ${style.colorClass}`}>{confidencePercent}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <button className="w-full py-4 text-primary text-sm font-bold border border-dashed border-primary/20 rounded-xl hover:bg-primary/5 transition-all shrink-0">
                View All Incident Reports
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="glass-card p-6 rounded-2xl border-primary/10">
              <p className="text-on-surface-variant text-sm mb-2">Total Active Nodes</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-on-surface">1</span>
                <span className="text-primary text-xs font-bold mb-1">Local Cam-01</span>
              </div>
            </div>
            <div className="glass-card p-6 rounded-2xl border-primary/10">
              <p className="text-on-surface-variant text-sm mb-2">Average Threat Level</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-on-surface">Low</span>
                <div className="w-24 h-2 bg-surface-container-highest rounded-full mb-2.5">
                  <div className="bg-primary h-full w-1/4 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="glass-card p-6 rounded-2xl border-primary/10">
              <p className="text-on-surface-variant text-sm mb-2">System Uptime</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-on-surface">99.9%</span>
                <span className="material-symbols-outlined text-primary mb-1">check_circle</span>
              </div>
            </div>
            <div className="glass-card p-6 rounded-2xl border-primary/10 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-on-surface-variant text-sm mb-2">Database Status</p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold text-on-surface">{alerts.length}</span>
                  <span className="text-xs text-on-surface-variant mb-1">Alerts Logged</span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 group-hover:h-2 transition-all">
                <div className="h-full bg-primary" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
