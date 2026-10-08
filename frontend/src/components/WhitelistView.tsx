import React, { useState, useEffect } from 'react'
import { Shield, Search, Filter, SortAsc, User, Building, Key, CheckCircle, XCircle, ChevronDown } from 'lucide-react'

const CLEARANCE_TIERS = [
  'All Tiers',
  'Tier-1 VIP Executive',
  'Tier-2 Staff Authority',
  'Tier-3 Contractor Access',
  'Tier-4 Visitor Escort',
]

const CLEARANCE_ORDER = {
  'Tier-1 VIP Executive': 1,
  'Tier-2 Staff Authority': 2,
  'Tier-3 Contractor Access': 3,
  'Tier-4 Visitor Escort': 4,
}

export default function WhitelistView({ isOperator = false }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTier, setFilterTier] = useState('All Tiers')
  const [filterStatus, setFilterStatus] = useState('All')
  const [sortBy, setSortBy] = useState('tier') // tier | name | date
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [editData, setEditData] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/biometrics/list')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data)
        setLoading(false)
      })
      .catch(() => {
        const saved = localStorage.getItem('aethra_real_employees')
        if (saved) try { setEmployees(JSON.parse(saved)) } catch(e) {}
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const filtered = employees
    .filter(e => {
      const q = searchQuery.toLowerCase()
      if (q && !`${e.name} ${e.department} ${e.id}`.toLowerCase().includes(q)) return false
      if (filterTier !== 'All Tiers' && e.clearance !== filterTier) return false
      if (filterStatus === 'Active' && e.active === false) return false
      if (filterStatus === 'Inactive' && e.active !== false) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'tier') return (CLEARANCE_ORDER[a.clearance] || 99) - (CLEARANCE_ORDER[b.clearance] || 99)
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'date') return (b.registered_date || '').localeCompare(a.registered_date || '')
      return 0
    })

  const handleToggleActive = async (emp) => {
    const res = await fetch(`/api/biometrics/toggle-active/${emp.id}`, { method: 'POST' })
    const data = await res.json()
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, active: data.active } : e))
    if (selectedEmp?.id === emp.id) setSelectedEmp(prev => ({ ...prev, active: data.active }))
  }

  const handleSaveEdit = async () => {
    if (!editData) return
    setSaving(true)
    await fetch(`/api/biometrics/update/${selectedEmp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    })
    setEmployees(prev => prev.map(e => e.id === selectedEmp.id ? { ...e, ...editData } : e))
    setSelectedEmp(prev => ({ ...prev, ...editData }))
    setEditData(null)
    setSaving(false)
  }

  const handleDelete = async (emp) => {
    if (!window.confirm(`Permanently revoke biometric access for ${emp.name}?`)) return
    await fetch(`/api/biometrics/revoke/${emp.id}`, { method: 'DELETE' })
    setEmployees(prev => prev.filter(e => e.id !== emp.id))
    if (selectedEmp?.id === emp.id) setSelectedEmp(null)
  }

  const tierColor = (tier) => {
    if (!tier) return 'text-gray-400 border-gray-500/30 bg-gray-500/10'
    if (tier.includes('Tier-1')) return 'text-amber-300 border-amber-500/40 bg-amber-500/10'
    if (tier.includes('Tier-2')) return 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10'
    if (tier.includes('Tier-3')) return 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
    return 'text-gray-300 border-gray-500/30 bg-gray-500/10'
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-[#0B0E13]/90">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white uppercase tracking-wider">
                Personnel Whitelist
              </h1>
              <p className="font-mono text-xs text-gray-400 mt-0.5">
                {employees.filter(e => e.active !== false).length} Active · {employees.filter(e => e.active === false).length} Inactive · {employees.length} Total
              </p>
            </div>
          </div>

          {isOperator && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
              🔒 Read-Only Access
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, dept, ID..."
              className="w-full bg-black/60 text-white font-mono text-xs pl-8 pr-3 py-2 rounded-xl border border-white/15 outline-none focus:border-cyan-400 transition-all placeholder-gray-600"
            />
          </div>

          <div className="relative">
            <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <select
              value={filterTier}
              onChange={e => setFilterTier(e.target.value)}
              className="bg-black/70 text-white border border-white/15 rounded-xl pl-8 pr-8 py-2 text-xs font-mono outline-none focus:border-cyan-400 appearance-none cursor-pointer"
            >
              {CLEARANCE_TIERS.map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-black/70 text-white border border-white/15 rounded-xl px-3 pr-8 py-2 text-xs font-mono outline-none focus:border-cyan-400 appearance-none cursor-pointer"
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative">
            <SortAsc size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-black/70 text-white border border-white/15 rounded-xl pl-8 pr-8 py-2 text-xs font-mono outline-none focus:border-cyan-400 appearance-none cursor-pointer"
            >
              <option value="tier">Sort: Tier</option>
              <option value="name">Sort: Name</option>
              <option value="date">Sort: Date</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Employee List */}
        <div className={`${selectedEmp ? 'w-[340px] min-w-[280px]' : 'flex-1'} flex-shrink-0 overflow-y-auto custom-scrollbar border-r border-white/8`}>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-xs">
              Loading whitelist...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500 font-mono text-xs text-center p-6">
              <Shield size={36} className="text-gray-700" />
              <p>No personnel match current filters</p>
            </div>
          ) : (
            <div className={`grid ${selectedEmp ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'} gap-2 p-4`}>
              {filtered.map(emp => {
                const isActive = emp.active !== false
                const isSelected = selectedEmp?.id === emp.id
                return (
                  <button
                    key={emp.id}
                    onClick={() => { setSelectedEmp(emp); setEditData(null) }}
                    className={`text-left rounded-2xl border p-3.5 transition-all group cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                        : isActive
                          ? 'border-white/12 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                          : 'border-white/8 bg-black/40 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/15 bg-black shrink-0 relative">
                        {emp.photo_url
                          ? <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><User size={18} className="text-gray-600" /></div>
                        }
                        {/* Active status dot */}
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${isActive ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] text-cyan-400 font-bold">{emp.id}</p>
                        <p className="font-display font-bold text-sm text-white truncate">{emp.name}</p>
                        <p className="font-mono text-[10px] text-gray-400 flex items-center gap-1 truncate">
                          <Building size={9} /> {emp.department}
                        </p>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold inline-flex items-center gap-1 ${tierColor(emp.clearance)}`}>
                      <Key size={9} /> {emp.clearance}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail / Edit Panel */}
        {selectedEmp && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-lg space-y-5">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 bg-black shrink-0 shadow-xl">
                  {selectedEmp.photo_url
                    ? <img src={selectedEmp.photo_url} alt={selectedEmp.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-gray-600" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-cyan-400 font-bold">{selectedEmp.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${selectedEmp.active !== false ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                      {selectedEmp.active !== false ? '● ACTIVE' : '○ INACTIVE'}
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-xl text-white mt-1">{selectedEmp.name}</h2>
                  <p className="font-mono text-xs text-gray-400 mt-0.5">{selectedEmp.department}</p>
                  <p className="font-mono text-[10px] text-gray-500 mt-1">Registered: {selectedEmp.registered_date || '—'}</p>
                </div>
              </div>

              {/* Edit Fields (admin only) */}
              {!isOperator && (
                <div className="space-y-3 bg-black/40 rounded-2xl border border-white/10 p-4">
                  <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    ✏️ Edit Profile
                  </h3>
                  {['name', 'department'].map(field => (
                    <div key={field}>
                      <label className="font-mono text-[10px] text-gray-500 uppercase">{field}</label>
                      <input
                        type="text"
                        value={editData?.[field] ?? selectedEmp[field] ?? ''}
                        onChange={e => setEditData(prev => ({ ...selectedEmp, ...(prev || {}), [field]: e.target.value }))}
                        className="w-full mt-1 bg-black/70 text-white font-mono text-xs px-3 py-2 rounded-xl border border-white/15 outline-none focus:border-cyan-400 transition-all"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="font-mono text-[10px] text-gray-500 uppercase">Clearance Tier</label>
                    <select
                      value={editData?.clearance ?? selectedEmp.clearance ?? ''}
                      onChange={e => setEditData(prev => ({ ...selectedEmp, ...(prev || {}), clearance: e.target.value }))}
                      className="w-full mt-1 bg-black/70 text-white font-mono text-xs px-3 py-2 rounded-xl border border-white/15 outline-none focus:border-cyan-400 appearance-none"
                    >
                      {CLEARANCE_TIERS.filter(t => t !== 'All Tiers').map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-gray-500 uppercase">Gender</label>
                    <select
                      value={editData?.gender ?? selectedEmp.gender ?? ''}
                      onChange={e => setEditData(prev => ({ ...selectedEmp, ...(prev || {}), gender: e.target.value }))}
                      className="w-full mt-1 bg-black/70 text-white font-mono text-xs px-3 py-2 rounded-xl border border-white/15 outline-none focus:border-cyan-400 appearance-none"
                    >
                      <option>Male</option><option>Female</option>
                    </select>
                  </div>
                  {editData && (
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs font-mono transition-all cursor-pointer disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : '💾 Save Changes'}
                    </button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {!isOperator && (
                  <>
                    <button
                      onClick={() => handleToggleActive(selectedEmp)}
                      className={`flex-1 py-2.5 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        selectedEmp.active !== false
                          ? 'bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25'
                          : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                      }`}
                    >
                      {selectedEmp.active !== false
                        ? <><XCircle size={14} /> Deactivate</>
                        : <><CheckCircle size={14} /> Activate</>
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(selectedEmp)}
                      className="px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 font-mono font-bold text-xs transition-all cursor-pointer"
                    >
                      🗑️ Revoke
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setSelectedEmp(null); setEditData(null) }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-gray-400 hover:bg-white/10 font-mono text-xs transition-all cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {/* Vector Info */}
              <div className="bg-black/60 rounded-xl border border-white/10 p-3 font-mono text-[10px] text-gray-500 space-y-1">
                <p className="text-gray-400 font-bold uppercase tracking-wider">AI Biometric Vector Status</p>
                <p>128-D Feature Vector: <span className="text-emerald-400">{selectedEmp.feature_vector ? '✔ Trained' : '✗ Not trained'}</span></p>
                <p>Face Recognition: <span className="text-emerald-400">{selectedEmp.active !== false ? 'Active in pipeline' : 'Suspended'}</span></p>
                <p>Gender Profile: <span className="text-cyan-400">{selectedEmp.gender}</span></p>
                <p>Clearance Level: <span className="text-amber-400">{selectedEmp.clearance}</span></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
