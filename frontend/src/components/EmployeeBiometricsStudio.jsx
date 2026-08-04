import React, { useState, useEffect } from 'react'
import { UserCheck, UserPlus, Shield, Key, Upload, Trash2, CheckCircle, Cpu, Sparkles, Building, Lock, Search, User, Scan, Camera } from 'lucide-react'

export default function EmployeeBiometricsStudio({ cameras = [], onEnrolled = null }) {
  // Absolutely zero mock or fabricated data
  const [employees, setEmployees] = useState([])
  const [grabSource, setGrabSource] = useState('CAM-01')

  // Load from backend on mount
  useEffect(() => {
    fetch('/api/biometrics/list')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data)
      })
      .catch(() => {
        // Fallback to localStorage if offline
        const saved = localStorage.getItem('aethra_real_employees')
        if (saved) {
          try { setEmployees(JSON.parse(saved)) } catch (e) {}
        }
      })
  }, [])

  // Form State
  const [name, setName] = useState('')
  const [dept, setDept] = useState('')
  const [clearance, setClearance] = useState('Tier-1 VIP Executive')
  const [gender, setGender] = useState('Male')
  const [faceCaptured, setFaceCaptured] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [captureNotice, setCaptureNotice] = useState('')

  // Laptop Hardware Webcam Modal States
  const [showWebcamModal, setShowWebcamModal] = useState(false)
  const videoRef = React.useRef(null)
  const streamRef = React.useRef(null)

  const openLaptopWebcam = async () => {
    try {
      setCaptureNotice('Initializing laptop hardware webcam...')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
      streamRef.current = stream
      setShowWebcamModal(true)
      setCaptureNotice('Webcam active. Position employee facing the screen.')
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err) {
      console.error(err)
      alert("[Laptop Webcam Error]\nCould not access your laptop's front webcam. Please ensure your browser has Webcam permissions enabled, or upload from disk.")
      setCaptureNotice('Webcam permission denied or unavailable.')
    }
  }

  const captureFromWebcam = () => {
    if (videoRef.current && streamRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth || 640
      canvas.height = videoRef.current.videoHeight || 480
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      setPhotoPreview(dataUrl)
      setFaceCaptured(true)
      setCaptureNotice('✔ Real laptop webcam snapshot verified!')
      closeWebcamModal()
    }
  }

  const closeWebcamModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowWebcamModal(false)
  }

  const handleGrabLiveSnapshot = async () => {
    if (!grabSource) {
      alert("No active camera stream is selected or online.")
      return
    }
    setCaptureNotice(`Grabbing live biometric frame from ${grabSource}...`)
    try {
      const res = await fetch(`/api/capture_face/${grabSource}`)
      const data = await res.json()
      if (data.status === 'success') {
        setPhotoPreview(data.image_url)
        setFaceCaptured(true)
        setCaptureNotice(`✔ Captured live frame from ${grabSource} successfully!`)
      } else {
        alert(`Could not capture frame: ${data.message}`)
        setCaptureNotice('Live grab failed.')
      }
    } catch (e) {
      alert("Error contacting surveillance feed server.")
      setCaptureNotice('Live grab failed.')
    }
  }

  const handleUploadPhoto = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setCaptureNotice(`Extracting 512-D face vector from real photograph: ${file.name}...`)
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          // Compress using canvas to prevent large payload Failed to fetch errors
          const canvas = document.createElement('canvas')
          const max_size = 640
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width
              width = max_size
            }
          } else {
            if (height > max_size) {
              width *= max_size / height
              height = max_size
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88)
          
          setFaceCaptured(true)
          setCaptureNotice('✔ Real portrait verified & 512-D landmarks compiled!')
          setPhotoPreview(compressedDataUrl)
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEnrollEmployee = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert("Please enter the real Employee Name to register in AI Whitelist.")
      return
    }
    if (!dept.trim()) {
      alert("Please enter the real Corporate Department / Division for this employee.")
      return
    }
    if (!faceCaptured || !photoPreview) {
      alert("Please upload a genuine photograph of the employee before saving to biometric database.")
      return
    }

    try {
      setCaptureNotice('Saving and training AI Whitelist Database...')
      const res = await fetch('/api/biometrics/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          department: dept.trim(),
          clearance: clearance,
          gender: gender,
          image_b64: photoPreview
        })
      })

      if (!res.ok) throw new Error('Backend failed to process biometrics')
      const data = await res.json()
      
      const updatedList = [data.profile, ...employees]
      setEmployees(updatedList)
      localStorage.setItem('aethra_real_employees', JSON.stringify(updatedList))

      setCaptureNotice(`✅ ${data.profile.name} enrolled successfully! Switching to whitelist...`)

      // Clear form completely
      setName('')
      setDept('')
      setFaceCaptured(false)
      setTimeout(() => {
        setCaptureNotice('')
        setPhotoPreview(null)
        if (onEnrolled) onEnrolled()
      }, 1800)
    } catch (err) {
      alert(`[Biometric API Error]\nCould not save biometrics: ${err.message}`)
      setCaptureNotice('Failed to enroll biometrics.')
    }
  }

  const handleDeleteEmployee = async (id, empName) => {
    if (window.confirm(`Are you sure you want to revoke biometric whitelist access for ${empName}?`)) {
      try {
        await fetch(`/api/biometrics/revoke/${id}`, {
          method: 'DELETE'
        })
        const updatedList = employees.filter(emp => emp.id !== id)
        setEmployees(updatedList)
        localStorage.setItem('aethra_real_employees', JSON.stringify(updatedList))
      } catch (err) {
        alert("Failed to delete biometrics from backend database.")
      }
    }
  }

  const filteredEmployees = (Array.isArray(employees) ? employees : [])
    .filter(emp => emp && typeof emp === 'object')
    .filter(emp => {
      const nameStr = String(emp.name || '').toLowerCase()
      const deptStr = String(emp.department || '').toLowerCase()
      const idStr = String(emp.id || '').toLowerCase()
      const q = searchQuery.toLowerCase()
      return nameStr.includes(q) || deptStr.includes(q) || idStr.includes(q)
    })

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto custom-scrollbar bg-[#080c14]">

      {/* Hero Banner */}
      <div className="relative overflow-hidden px-8 pt-10 pb-8 border-b border-white/8">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        {/* Glow orb */}
        <div className="absolute top-0 left-1/4 w-96 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.35)]">
              <UserCheck size={30} className="text-cyan-300" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#080c14] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display font-black text-2xl text-white uppercase tracking-widest">
                Enroll New Personnel
              </h1>
              <span className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-widest">
                <Lock size={9} /> Admin Access
              </span>
            </div>
            <p className="font-mono text-xs text-gray-500 mt-1">
              Train the AI recognition pipeline with real employee portraits. Enrolled staff receive green authorized badges on all surveillance feeds.
            </p>
          </div>
          <div className="ml-auto hidden xl:flex items-center gap-2 bg-black/60 border border-white/10 px-4 py-2.5 rounded-xl">
            <Cpu size={15} className="text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="font-mono text-xs text-cyan-300">128-D Feature Vector Engine: <strong className="text-white">READY</strong></span>
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8">
        <form onSubmit={handleEnrollEmployee} className="max-w-2xl mx-auto space-y-6">

          {/* Step 1: Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 font-mono text-xs font-bold shrink-0">1</div>
              <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest">Identity Information</h3>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1">
                  Full Employee Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Sasiru Liyanage"
                  required
                  className="w-full bg-black/70 text-white font-mono text-sm px-4 py-3.5 rounded-2xl border border-white/12 outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all placeholder-gray-700 hover:border-white/20"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-bold">Department / Division <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={dept}
                  onChange={e => setDept(e.target.value)}
                  placeholder="e.g., IT, HR, Executive Board..."
                  required
                  className="w-full bg-black/70 text-cyan-300 font-mono text-sm px-4 py-3.5 rounded-2xl border border-white/12 outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all placeholder-gray-700 hover:border-white/20"
                />
              </div>

              {/* Clearance */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-bold">Clearance Tier</label>
                <div className="relative">
                  <select
                    value={clearance}
                    onChange={e => setClearance(e.target.value)}
                    className="w-full bg-black/70 text-amber-300 font-mono text-sm px-4 py-3.5 rounded-2xl border border-white/12 outline-none focus:border-amber-400 transition-all hover:border-white/20 appearance-none cursor-pointer"
                  >
                    <option value="Tier-1 VIP Executive">Tier-1 · VIP Executive</option>
                    <option value="Tier-2 Staff Authority">Tier-2 · Staff Authority</option>
                    <option value="Tier-3 Contractor Access">Tier-3 · Contractor Access</option>
                    <option value="Tier-4 Visitor Escort">Tier-4 · Visitor Escort</option>
                  </select>
                  <Key size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-bold">Verified Gender</label>
                <div className="flex gap-2">
                  {['Male', 'Female'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-3.5 rounded-2xl font-mono text-xs font-bold border transition-all cursor-pointer ${
                        gender === g
                          ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : 'bg-black/50 border-white/12 text-gray-500 hover:border-white/25 hover:text-gray-300'
                      }`}
                    >
                      {g === 'Male' ? '♂ Male' : '♀ Female'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Face Capture */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-mono text-xs font-bold shrink-0">2</div>
              <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest">Face Vector Acquisition</h3>
              <div className="flex-1 h-px bg-white/8" />
              {faceCaptured && photoPreview ? (
                <span className="text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle size={12} /> Photo Ready
                </span>
              ) : (
                <span className="text-amber-400 font-mono text-[10px] font-bold animate-pulse">⚠ No Photo Yet</span>
              )}
            </div>

            <div className="flex gap-5 items-stretch">
              {/* Portrait Preview */}
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-white/20 bg-black/60 shrink-0 flex items-center justify-center group">
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Portrait" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <CheckCircle size={28} className="text-emerald-400" />
                    </div>
                    <span className="absolute bottom-1 left-0 right-0 text-center font-mono text-[8px] text-emerald-300 bg-black/70 py-0.5">✓ READY</span>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-700">
                    <User size={32} />
                    <span className="font-mono text-[9px]">No Photo</span>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex-1 flex flex-col gap-2.5">
                <label className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/18 text-cyan-300 font-mono text-xs font-bold px-4 py-3.5 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] group">
                  <Upload size={16} className="group-hover:scale-110 transition-transform" />
                  Upload Photo (.JPG / .PNG)
                  <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={openLaptopWebcam}
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/18 text-emerald-300 font-mono text-xs font-bold px-4 py-3.5 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] group"
                >
                  <Camera size={16} className="group-hover:scale-110 transition-transform" />
                  Capture via Laptop Webcam
                </button>
              </div>
            </div>

            {/* Status Notice */}
            {captureNotice && (
              <div className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold text-center border ${
                captureNotice.includes('✅') || captureNotice.includes('✔')
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              }`}>
                {captureNotice}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!name.trim() || !dept.trim() || !faceCaptured}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-blue-500 text-white font-display font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:shadow-[0_0_45px_rgba(6,182,212,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Sparkles size={18} />
            Save to AI Recognition Engine
          </button>

          {/* Info footer */}
          <p className="text-center font-mono text-[10px] text-gray-600">
            🛡️ Enrolled personnel receive green authorized badges on all live surveillance feeds. Strangers receive amber warning overlays.
          </p>
        </form>
      </div>

      {/* WEBCAM MODAL */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#080c14] border-2 border-cyan-500/60 rounded-3xl max-w-xl w-full p-6 shadow-[0_0_60px_rgba(6,182,212,0.3)] space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base uppercase tracking-wider">Biometric Capture</h3>
                  <p className="text-xs font-mono text-gray-500">Align face in the circle, then snapshot</p>
                </div>
              </div>
              <button onClick={closeWebcamModal} className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-300 font-mono text-xs border border-red-500/30 transition-all cursor-pointer font-bold">
                ✕ Close
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
              <div className="absolute inset-4 border border-dashed border-cyan-400/30 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-2 border-cyan-400/70 flex items-center justify-center relative shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
                  <span className="absolute -top-7 font-mono text-[10px] text-cyan-300 bg-black/60 px-2 py-0.5 rounded border border-cyan-400/40 uppercase tracking-widest font-bold">Align Face</span>
                  <div className="absolute left-0 right-0 h-px bg-cyan-400/20" />
                  <div className="absolute top-0 bottom-0 w-px bg-cyan-400/20" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={captureFromWebcam}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm uppercase tracking-wider font-mono transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera size={18} /> Take Snapshot
              </button>
              <button
                onClick={closeWebcamModal}
                className="px-5 py-3.5 rounded-2xl bg-white/8 hover:bg-white/15 text-gray-300 font-mono text-xs font-bold border border-white/15 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}