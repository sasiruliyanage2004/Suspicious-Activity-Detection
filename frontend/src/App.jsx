import React, { useState } from 'react'
import AuthScreen from './components/AuthScreen.jsx'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard, { INITIAL_CAMERAS } from './components/Dashboard.jsx'
import TVWallMode from './components/TVWallMode.jsx'
import CameraExpandedView from './components/CameraExpandedView.jsx'
import OperatorProvisioningModal from './components/OperatorProvisioningModal.jsx'
import ThreatAlertsView from './components/ThreatAlertsView.jsx'
import AnalyticsView from './components/AnalyticsView.jsx'
import IntrusionZonesView from './components/IntrusionZonesView.jsx'
import NodeSettingsView from './components/NodeSettingsView.jsx'
import NVRArchiveView from './components/NVRArchiveView.jsx'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [activeUser, setActiveUser] = useState(null)
  const [activeTab, setActiveTab] = useState('grid')
  const [tvWall, setTvWall] = useState(false)
  const [expandedCamera, setExpandedCamera] = useState(null)
  const [sensitivity, setSensitivity] = useState(65)
  const [muted, setMuted] = useState(false)
  const [cameras, setCameras] = useState(INITIAL_CAMERAS)
  const [showOperatorModal, setShowOperatorModal] = useState(false)

  const handleRename = (id, newLocation) => {
    setCameras((prev) => prev.map((c) => (c.id === id ? { ...c, location: newLocation } : c)))
  }

  const handleProvisionCamera = (slotId, streamUrl, customName) => {
    const slotNum = Number(slotId)
    setCameras((prev) => prev.map((c) => {
      if (c.id === slotNum) {
        return { ...c, streamUrl: `http://127.0.0.1:8002/api/video_feed/${slotNum}`, location: customName || c.location }
      }
      return c
    }))
  }

  const handleLogin = (user) => {
    setActiveUser(user)
    setAuthenticated(true)
  }

  if (!authenticated) {
    return <AuthScreen onAuthenticated={handleLogin} />
  }

  if (tvWall) {
    return <TVWallMode cameras={cameras} onExit={() => setTvWall(false)} onRename={handleRename} />
  }

  return (
    <div className="min-h-screen flex flex-col">
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
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Render Active View dynamically */}
        {activeTab === 'grid' && (
          <Dashboard cameras={cameras} onExpandCamera={setExpandedCamera} onRename={handleRename} onProvision={handleProvisionCamera} />
        )}

        {activeTab === 'cameras' && (
          <Dashboard cameras={cameras} onExpandCamera={setExpandedCamera} onRename={handleRename} onProvision={handleProvisionCamera} />
        )}

        {activeTab === 'nvr' && (
          <NVRArchiveView cameras={cameras} />
        )}

        {activeTab === 'alerts' && (
          <ThreatAlertsView cameras={cameras} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}

        {activeTab === 'zones' && (
          <IntrusionZonesView cameras={cameras} />
        )}

        {activeTab === 'settings' && (
          <NodeSettingsView sensitivity={sensitivity} onSensitivityChange={setSensitivity} />
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
    </div>
  )
}
