import React, { useState, useEffect } from 'react'
import { speechSiren } from './utils/speechSiren.js'
import SplashScreen from './components/SplashScreen.jsx'
import Ticker from './components/Ticker.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import TVWallMode from './components/TVWallMode.jsx'
import CameraExpandedView from './components/CameraExpandedView.jsx'
import OperatorProvisioningModal from './components/OperatorProvisioningModal.jsx'
import ThreatAlertsView from './components/ThreatAlertsView.jsx'
import AnalyticsView from './components/AnalyticsView.jsx'
import NodeSettingsView from './components/NodeSettingsView.jsx'
import NVRArchiveView from './components/NVRArchiveView.jsx'
import CameraNodesView from './components/CameraNodesView.jsx'
import OperatorAuditView from './components/OperatorAuditView.jsx'
import IntrusionZonesView from './components/IntrusionZonesView.jsx'
import PersonnelHub from './components/PersonnelHub.jsx'

const INITIAL_CAMERAS = [
  { id: 1, code: 'CAM-01', location: 'Main Entrance Gate', streamUrl: 'http://127.0.0.1:8002/api/video_feed/1', attributes: [], threat: null },
  { id: 2, code: 'CAM-02', location: 'North Parking Lot', streamUrl: 'http://127.0.0.1:8002/api/video_feed/2', attributes: [], threat: null },
  { id: 3, code: 'CAM-03', location: 'Loading Dock Area', streamUrl: '', attributes: [], threat: null },
  { id: 4, code: 'CAM-04', location: 'Lobby Reception', streamUrl: '', attributes: [], threat: null },
  { id: 5, code: 'CAM-05', location: 'East Perimeter Corridor', streamUrl: '', attributes: [], threat: null },
  { id: 6, code: 'CAM-06', location: 'Server Room Door', streamUrl: '', attributes: [], threat: null },
  { id: 7, code: 'CAM-07', location: 'West Perimeter Fence', streamUrl: '', attributes: [], threat: null },
  { id: 8, code: 'CAM-08', location: 'Rooftop Access Point', streamUrl: '', attributes: [], threat: null },
  { id: 9, code: 'CAM-09', location: 'Rear Exit Alley', streamUrl: '', attributes: [], threat: null },
]

function loadCamerasFromStorage() {
  try {
    const saved = localStorage.getItem('aethra_cameras')
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return INITIAL_CAMERAS
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [activeUser, setActiveUser] = useState(null)
  const [activeTab, setActiveTab] = useState('grid')
  const [tvWall, setTvWall] = useState(false)
  const [expandedCamera, setExpandedCamera] = useState(null)
  const [sensitivity, setSensitivity] = useState(80)
  const [muted, setMuted] = useState(false)
  const [cameras, setCameras] = useState(loadCamerasFromStorage)
  const [showOperatorModal, setShowOperatorModal] = useState(false)

  const saveCameras = (updated) => {
    setCameras(updated)
    localStorage.setItem('aethra_cameras', JSON.stringify(updated))
  }

  const handleRename = (id, newLocation) => {
    const updated = cameras.map((c) => (c.id === id ? { ...c, location: newLocation } : c))
    saveCameras(updated)
  }

  // streamUrl can be: RTSP url, HTTP mjpeg url, or empty to use local AI server
  const handleProvisionCamera = (slotId, streamUrl, customName) => {
    const slotNum = Number(slotId)
    const updated = cameras.map((c) => {
      if (c.id === slotNum) {
        let finalUrl = `http://127.0.0.1:8002/api/video_feed/${slotNum}`
        if (streamUrl && streamUrl.trim()) {
          const urlStr = streamUrl.trim()
          // Browsers cannot play RTSP directly. Proxy it through our local AI server.
          if (urlStr.toLowerCase().startsWith('rtsp://')) {
            finalUrl = `http://127.0.0.1:8002/api/video_feed/${slotNum}`
          } else if (urlStr === '0' || urlStr.toLowerCase() === 'webcam') {
            finalUrl = `http://127.0.0.1:8002/api/video_feed/webcam`
          } else {
            finalUrl = urlStr
          }
        }
        return { ...c, streamUrl: finalUrl, location: customName || c.location }
      }
      return c
    })
    saveCameras(updated)
  }

  const handleRemoveCamera = (id) => {
    const slotNum = Number(id)
    
    // Call the unregister endpoint on the AI Pipeline backend to stop tracking and alert admin
    fetch(`http://127.0.0.1:8002/api/discovery/unregister/CAM-0${slotNum}`, {
      method: 'POST'
    }).catch((e) => console.error("Failed to unregister camera backend:", e))

    const updated = cameras.map((c) => {
      if (c.id === slotNum) {
        return { ...c, streamUrl: '', location: `${c.code} (Searching)` }
      }
      return c
    })
    saveCameras(updated)
  }

  const handleLogin = (user) => {
    setActiveUser(user)
    setAuthenticated(true)
  }

  // Global WebSocket listener for Threat Alerts (Siren & Dashboard updates)
  useEffect(() => {
    if (!authenticated) return;
    
    let ws = null;
    let reconnectTimeout = null;

    const connectWS = () => {
      try {
        ws = new WebSocket('ws://127.0.0.1:8000/ws/alerts');
        
        ws.onopen = () => {
          console.log('Threat Alerts WebSocket Connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.behavior_type) {
              speechSiren.speakAlarm(data.behavior_type, data.camera_id);
              
              const targetCamIdRegex = /\d+/;
              const camIdMatch = data.camera_id ? String(data.camera_id).match(targetCamIdRegex) : null;
              const camIdNum = camIdMatch ? parseInt(camIdMatch[0]) : null;

              setCameras(prev => prev.map(c => {
                if (c.code === data.camera_id || c.id === camIdNum) {
                  return { ...c, threat: { label: data.behavior_type, confidence: data.confidence || 0.99, x: 2, y: 15 } };
                }
                return c;
              }));

              setTimeout(() => {
                setCameras(prev => prev.map(c => {
                  if (c.code === data.camera_id || c.id === camIdNum) {
                    return { ...c, threat: null };
                  }
                  return c;
                }));
              }, 15000);
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWS, 2000);
        };
        
        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {}
    };

    connectWS();
    
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    }
  }, [authenticated]);

  // Global Idle Tracker Engine for Operators
  useEffect(() => {
    if (!authenticated || activeUser?.role !== 'operator' || !activeUser?.badgeId) return;

    let activityCount = 0;
    const handleActivity = () => { activityCount++; };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    const interval = setInterval(() => {
      if (activityCount > 0) {
        fetch(`http://127.0.0.1:8000/api/operators/${activeUser.badgeId}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activity_count: activityCount })
        }).catch(() => {});
        activityCount = 0; // reset after sending
      }
    }, 15000); // Send heartbeat every 15s if active

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      clearInterval(interval);
    };
  }, [authenticated, activeUser]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={handleLogin} />
  }

  if (tvWall) {
    return <TVWallMode cameras={cameras} onExit={() => setTvWall(false)} onRename={handleRename} />
  }

  return (
    <div className="min-h-screen flex flex-col pb-7">
      {/* 🚨 Emergency Lockdown Strobe Warning Banner */}
      <div id="lockdown-strobe-banner" className="hidden z-[99999] bg-red-700 text-white font-mono px-6 py-3.5 border-b-2 border-yellow-300 shadow-[0_0_40px_rgba(255,0,0,0.9)] animate-bounce flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-ping">🚨</span>
          <div>
            <h2 className="text-sm md:text-base font-extrabold uppercase tracking-widest text-yellow-300 drop-shadow">
              EMERGENCY LOCKDOWN IN PROGRESS &mdash; ALL PERIMETERS SECURED
            </h2>
            <p className="text-[11px] md:text-xs text-red-100 font-bold">
              English Voice warning alarms active &bull; All automated access gates locked &bull; Police &amp; Security Armed Units Notified
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            const banner = document.getElementById('lockdown-strobe-banner');
            if (banner) banner.classList.add('hidden');
          }}
          className="px-5 py-2 bg-yellow-400 text-black font-extrabold text-xs uppercase rounded-xl shadow-lg hover:bg-yellow-300 transition-all cursor-pointer shrink-0"
        >
          🔐 DISARM LOCKDOWN (AUTHENTICATED)
        </button>
      </div>

      <Header
        sensitivity={sensitivity}
        onSensitivityChange={setSensitivity}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onEnterTvWall={() => setTvWall(true)}
        onOpenOperatorModal={() => setShowOperatorModal(true)}
        activeUser={activeUser}
        onLogout={() => {
          setAuthenticated(false)
          setActiveUser(null)
        }}
      />

      <div className="flex-1 max-w-[1600px] w-full mx-auto flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRole={activeUser?.role} />
        
        {/* Render Active View dynamically */}
        {activeTab === 'grid' && (
          <Dashboard cameras={cameras} onExpandCamera={setExpandedCamera} onRename={handleRename} onProvision={handleProvisionCamera} onRemove={handleRemoveCamera} />
        )}

        {activeTab === 'cameras' && (
          <CameraNodesView cameras={cameras} onExpandCamera={setExpandedCamera} onProvision={handleProvisionCamera} />
        )}

        {activeTab === 'nvr' && (
          <NVRArchiveView cameras={cameras} />
        )}

        {activeTab === 'alerts' && (
          <ThreatAlertsView cameras={cameras} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView cameras={cameras} />
        )}

        {activeTab === 'zones' && (
          <IntrusionZonesView cameras={cameras} />
        )}

        {activeTab === 'whitelist' && (
          <PersonnelHub cameras={cameras} isOperator={activeUser?.role === 'operator'} />
        )}

        {activeTab === 'audit' && (
          <OperatorAuditView />
        )}

        {activeTab === 'settings' && (
          activeUser?.role === 'operator' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0B0E13]/90">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
                <span className="text-2xl font-bold">🔒</span>
              </div>
              <h2 className="font-display text-xl font-extrabold text-white uppercase tracking-wider mb-2">
                ACCESS DENIED: SYSTEM SETTINGS RESTRICTED
              </h2>
              <p className="font-mono text-xs text-red-300/80 max-w-md">
                Duty Operators are strictly prohibited from modifying System Settings, Master Admin configurations, or 2FA credentials. Contact your Master CISO Administrator for assistance.
              </p>
            </div>
          ) : (
            <NodeSettingsView sensitivity={sensitivity} onSensitivityChange={setSensitivity} />
          )
        )}
      </div>

      {expandedCamera && (
        <CameraExpandedView
          camera={expandedCamera}
          index={cameras.indexOf(expandedCamera)}
          onClose={() => setExpandedCamera(null)}
        />
      )}

      {showOperatorModal && (
        <OperatorProvisioningModal onClose={() => setShowOperatorModal(false)} />
      )}
      
      <Ticker />
    </div>
  )
}
