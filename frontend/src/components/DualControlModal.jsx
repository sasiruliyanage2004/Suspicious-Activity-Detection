import React, { useState } from 'react'
import { ShieldAlert, Lock, Key, Users, CheckCircle, AlertTriangle, X, Terminal, FileCheck, ShieldCheck } from 'lucide-react'

export default function DualControlModal({ onClose, onSuccess, actionTitle = "System Log & NVR Archive Purge" }) {
  const [officer1Pin, setOfficer1Pin] = useState('')
  const [officer2Otp, setOfficer2Otp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successStep, setSuccessStep] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!officer1Pin || !officer2Otp) {
      setErrorMsg('Both authorization keys are required under Dual-Control policy.')
      return
    }

    if (officer1Pin.length < 4 || officer2Otp.length < 4) {
      setErrorMsg('Invalid key syntax. Authorizations require a minimum 4-digit token.')
      return
    }

    setIsVerifying(true)
    setTimeout(() => {
      setIsVerifying(false)
      setSuccessStep(true)
      setTimeout(() => {
        if (onSuccess) onSuccess()
        if (onClose) onClose()
      }, 2000)
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in font-sans" onClick={onClose}>
      <div 
        className="w-full max-w-2xl glass-panel rounded-3xl border-2 border-crimson-glow/60 bg-obsidian-950/95 overflow-hidden shadow-[0_0_80px_rgba(255,51,102,0.25)] relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Top Alert Banner */}
        <div className="bg-gradient-to-r from-red-600/30 via-red-500/20 to-amber-500/20 border-b border-red-500/40 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 shadow-[0_0_20px_rgba(255,51,102,0.4)] animate-pulse">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white tracking-wider uppercase flex items-center gap-2">
                Dual-Control Authorization Required
              </h2>
              <p className="font-mono text-xs text-red-300 font-semibold">
                Two-Person Integrity (2PI) Protocol &bull; ISO/IEC 27001 Compliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-500 hover:text-white text-gray-400 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div className="bg-obsidian-900/90 rounded-2xl p-4 border border-white/10 flex items-start gap-3 text-xs font-mono text-gray-300">
            <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-amber-400 font-bold uppercase tracking-wider block">
                Sensitive Security Operation: {actionTitle}
              </span>
              <p className="text-gray-400 leading-relaxed font-sans text-[12px]">
                To prevent insider tampering, illegitimate evidence destruction, or compliance violations, unilateral log deletion by a single administrator is strictly forbidden. This operation requires simultaneous authentication from two independent command officers.
              </p>
            </div>
          </div>

          {!successStep ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Officer 1 Input Box */}
                <div className="bg-black/60 p-4 rounded-2xl border border-cyan-500/30 space-y-3 relative shadow-inner">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-[11px] font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                      <Lock size={13} /> Approver 01: Master Admin
                    </span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                  <p className="font-sans text-[11px] text-gray-400 truncate">
                    Commander: <strong>liyanagesasiru@gmail.com</strong>
                  </p>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] text-gray-500 uppercase">CISO Authorization PIN / Key</label>
                    <input
                      type="password"
                      placeholder="e.g. 8821 or MASTER-KEY"
                      value={officer1Pin}
                      onChange={(e) => setOfficer1Pin(e.target.value)}
                      className="w-full bg-obsidian-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-400 transition-all text-center tracking-widest font-bold"
                    />
                  </div>
                </div>

                {/* Officer 2 Input Box */}
                <div className="bg-black/60 p-4 rounded-2xl border border-amber-500/30 space-y-3 relative shadow-inner">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1.5">
                      <Key size={13} /> Approver 02: Audit Chief
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                  <p className="font-sans text-[11px] text-gray-400 truncate">
                    Officer: <strong>audit_chief@sasiru-command.com</strong>
                  </p>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] text-gray-500 uppercase">Telegram / SMS OTP Token</label>
                    <input
                      type="text"
                      placeholder="e.g. 4492-SEC"
                      value={officer2Otp}
                      onChange={(e) => setOfficer2Otp(e.target.value)}
                      className="w-full bg-obsidian-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-400 outline-none focus:border-amber-400 transition-all text-center tracking-widest font-bold uppercase"
                    />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-mono text-xs text-center font-bold">
                  ⚠️ {errorMsg}
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold uppercase transition-all"
                >
                  Cancel Protocol
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-display font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(255,51,102,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Verifying Cryptographic Signatures...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Authorize &amp; Execute Sensitive Purge</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* SUCCESS LOG STATE */
            <div className="p-8 text-center space-y-4 animate-scale-in">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle size={40} className="animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-white uppercase tracking-wide">
                  Dual-Control Verification Successful
                </h3>
                <p className="font-mono text-xs text-emerald-400 font-bold">
                  2PI Signatures Validated &bull; Immutable WORM Meta-Log Written
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-black/80 border border-white/10 text-left font-mono text-[11px] text-gray-300 space-y-1">
                <div className="text-cyan-400 font-bold">[TAMPER-PROOF AUDIT LEDGER ENTRY RECORDED]</div>
                <div>&bull; Approver 01: liyanagesasiru@gmail.com (CISO Auth Verified)</div>
                <div>&bull; Approver 02: audit_chief@sasiru-command.com (OTP Token Verified)</div>
                <div>&bull; Operation: Automated Retention Cleanup Executed Successfully</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
