/**
 * Aethra Vision Autonomous AI Speech Synthesis & Audio Cyber-Siren Engine
 * Provides dual-language English & Sinhala vocal notifications during high-priority intrusions & demonstrations.
 */

// Global array to prevent Chrome from garbage collecting utterances before onend fires
window.activeSpeechUtterances = [];

class SpeechSirenManager {
  constructor() {
    this.audioCtx = null;
    this.speechSynthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.muted = false;
    this.lockdownActive = false;
  }

  setMuted(muteStatus) {
    this.muted = muteStatus;
    if (this.speechSynthesis && muteStatus) {
      this.speechSynthesis.cancel();
    }
  }

  playTacticalBeep(frequency = 880, duration = 0.15, type = 'sawtooth') {
    if (this.muted || typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.value = frequency;

      gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio bypassed:", e);
    }
  }

  playLockdownSiren() {
    if (this.muted || typeof window === 'undefined') return;
    const audio = new Audio('/assets/suspicious_sound.webm');
    audio.volume = 1.0;
    audio.play().catch(e => console.warn("Audio bypassed:", e));
  }

  speakAlarm(behaviorType, cameraId = "CAM-01") {
    if (this.muted || !this.speechSynthesis) return;
    try {
      if (this.speechSynthesis.speaking) {
        this.speechSynthesis.cancel();
      }

      const isHighPriority = behaviorType.toLowerCase().includes('weapon') || 
                             behaviorType.toLowerCase().includes('fight') ||
                             behaviorType.toLowerCase().includes('gun') ||
                             behaviorType.toLowerCase().includes('knife') ||
                             behaviorType.toLowerCase().includes('violence');

      const isBaggage = behaviorType.toLowerCase().includes('bag') ||
                        behaviorType.toLowerCase().includes('luggage') ||
                        behaviorType.toLowerCase().includes('abandon') ||
                        behaviorType.toLowerCase().includes('unattended') ||
                        behaviorType.toLowerCase().includes('object');

      let speechDelay = 100;

      if (isBaggage) {
        // Custom warning chime for baggage / suspicious object
        this.playTacticalBeep(520, 0.35, 'sine');
        setTimeout(() => this.playTacticalBeep(780, 0.45, 'sine'), 400);
        speechDelay = 1100;
      }

      const cleanBehavior = isBaggage 
        ? "Suspicious Unattended Baggage" 
        : (strReplaceAll(strReplaceAll(behaviorType, "Detected", ""), "Activity", "").trim() || behaviorType);
      
      const engText = `Warning: ${cleanBehavior} detected. Security personnel notified.`;
      const utteranceEng = new SpeechSynthesisUtterance(engText);
      utteranceEng.lang = 'en-US';
      utteranceEng.rate = 1.05;
      utteranceEng.pitch = 0.95;
      utteranceEng.volume = 1.0;

      window.activeSpeechUtterances.push(utteranceEng);

      utteranceEng.onend = () => {
        // Play the custom YouTube sound AT THE END of the speech for high priority threats
        if (isHighPriority && !this.muted && typeof window !== 'undefined') {
          this.playLockdownSiren();
        }
        // Cleanup memory
        window.activeSpeechUtterances = window.activeSpeechUtterances.filter(u => u !== utteranceEng);
      };

      setTimeout(() => {
        if (!this.muted) {
          this.speechSynthesis.speak(utteranceEng);
        }
      }, speechDelay);
    } catch (err) {
      console.warn("Speech synthesis notice:", err);
    }
  }

  speakLockdown() {
    if (this.muted || !this.speechSynthesis) return;
    try {
      this.speechSynthesis.cancel();

      const engText = "EMERGENCY LOCKDOWN ACTIVATED! All perimeter doors are now locked. Security alert in progress.";
      const utteranceEng = new SpeechSynthesisUtterance(engText);
      utteranceEng.rate = 1.1;

      window.activeSpeechUtterances.push(utteranceEng);

      utteranceEng.onend = () => {
        // Play the YouTube sound AT THE END of the lockdown speech
        if (!this.muted) {
          this.playLockdownSiren();
        }
        window.activeSpeechUtterances = window.activeSpeechUtterances.filter(u => u !== utteranceEng);
      };

      setTimeout(() => {
        if (!this.muted) {
          this.speechSynthesis.speak(utteranceEng);
        }
      }, 100);
    } catch (e) {
      console.warn("Lockdown speech notice:", e);
    }
  }
}

function strReplaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

export const speechSiren = new SpeechSirenManager();
