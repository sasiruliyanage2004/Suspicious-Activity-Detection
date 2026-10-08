import React, { useState, useEffect, useRef } from 'react'
import { ShieldCheck, UserCheck, RefreshCw, Activity, Search } from 'lucide-react'
import { safeFetch, BACKEND_URL } from '../utils/api'

interface Operator {
  badge_id: string;
  name: string;
  role: string;
  is_online: number;
  last_active?: string;
  last_login?: string;
  last_active_ping?: string;
  is_active?: number;
  shift?: string;
  activity_score?: number;
}

const FALLBACK_OPERATORS: Operator[] = [
  { badge_id: 'SEC-OP-1024-A', name: 'Nimal Silva', role: 'operator', is_online: 1, last_active: new Date().toISOString(), last_login: new Date().toISOString(), shift: 'ALPHA (0600 - 1400)', activity_score: 95 },
  { badge_id: 'SEC-OP-9842-B', name: 'Sunethra Perera', role: 'operator', is_online: 0, last_active: new Date(Date.now() - 3600000).toISOString(), last_login: new Date(Date.now() - 3600000).toISOString(), shift: 'BRAVO (1400 - 2200)', activity_score: 82 },
  { badge_id: 'CISO-EXEC-01', name: 'Master CISO Commander', role: 'admin', is_online: 1, last_active: new Date().toISOString(), last_login: new Date().toISOString(), shift: 'COMMAND', activity_score: 99 }
]

export default function OperatorAuditView() {
  const [operators, setOperators] = useState<Operator[]>(FALLBACK_OPERATORS)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const isOnlineRef = useRef(true)

  const fetchOperators = async () => {
    setIsLoading(true)
    try {
      const res = await safeFetch(`${BACKEND_URL}/api/operators/`, {}, 2500)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setOperators(data)
          isOnlineRef.current = true
        }
      } else {
        isOnlineRef.current = false
      }
    } catch (err) {
      isOnlineRef.current = false
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOperators()
    const interval = setInterval(() => {
      if (isOnlineRef.current) {
        fetchOperators()
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const filtered = operators.filter(op => 
    op.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    op.badge_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const onlineCount = operators.filter(o => o.is_online === 1).length
  const totalCount = operators.length

  return (
    <div className="flex-1 min-w-0 p-6 space-y-6 animate-fade-in text-gray-200 font-sans relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2.5 uppercase tracking-wider">
            <UserCheck size={24} className="text-emerald-400 animate-pulse" />
            Duty Operator Audit & Status
          </h1>
          <p className="font-mono text-xs text-gray-400 mt-1">
            Real-time monitoring of all authorized personnel & active sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOperators}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-all border border-white/10 shadow"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-cyan-400' : 'text-gray-300'} />
            <span>Refresh</span>
          </button>
          <span className="px-3.5 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            {onlineCount} / {totalCount} ONLINE
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-obsidian-900/80 p-4 rounded-2xl border border-white/10 backdrop-blur-md shadow-sm">
        <div className="flex-1 flex items-center gap-2.5 bg-obsidian-950 border border-white/15 rounded-xl px-3.5 h-11 focus-within:border-cyan-400 transition-all shadow-inner">
          <Search size={16} className="text-cyan-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by Name or Badge ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder:text-gray-500 outline-none font-mono"
          />
        </div>
      </div>

      {/* Table Repository */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.6)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/70 font-mono text-[11px] uppercase text-gray-400 tracking-wider">
                <th className="p-4 font-bold">Badge ID</th>
                <th className="p-4 font-bold">Officer Name</th>
                <th className="p-4 font-bold">Assigned Role</th>
                <th className="p-4 font-bold">Shift Rotation</th>
                <th className="p-4 font-bold">Activity Score</th>
                <th className="p-4 font-bold">Last Login (Local)</th>
                <th className="p-4 font-bold text-right">Current Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-gray-500 font-sans space-y-2 bg-obsidian-900/40">
                    <p className="font-mono text-sm font-bold text-gray-300 uppercase tracking-wider">
                      No Operators Found
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((op) => {
                  const isOnline = op.is_online === 1
                  const isSuspended = op.is_active === 0
                  
                  let isIdle = false
                  if (isOnline) {
                    const lastInteraction = op.last_active_ping 
                      ? new Date(op.last_active_ping + 'Z').getTime() 
                      : (op.last_login ? new Date(op.last_login + 'Z').getTime() : 0)
                    
                    const now = new Date().getTime()
                    if (lastInteraction > 0 && (now - lastInteraction > 120000)) { // 2 mins idle
                      isIdle = true
                    }
                  }

                  let dateStr = 'Never'
                  if (op.last_login) {
                     dateStr = new Date(op.last_login + 'Z').toLocaleString()
                  }
                  
                  return (
                    <tr key={op.badge_id} className="hover:bg-white/5 transition-all group">
                      <td className="p-4 text-cyan-400 font-bold font-mono whitespace-nowrap">{op.badge_id}</td>
                      <td className="p-4 text-white font-semibold whitespace-nowrap">{op.name}</td>
                      <td className="p-4 text-gray-300">{op.role}</td>
                      <td className="p-4 text-gray-400 text-[11px] whitespace-nowrap">{op.shift}</td>
                      <td className="p-4 font-mono font-bold text-cyan-400">{op.activity_score || 0}</td>
                      <td className="p-4 text-gray-400 text-[11px] whitespace-nowrap">{dateStr}</td>
                      <td className="p-4 font-mono text-right whitespace-nowrap">
                        {isSuspended ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/30 text-red-400">
                            SUSPENDED
                          </span>
                        ) : isOnline ? (
                          isIdle ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 border border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              IDLE (AWOL?)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gray-500/10 border border-gray-500/30 text-gray-400">
                            OFFLINE
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
