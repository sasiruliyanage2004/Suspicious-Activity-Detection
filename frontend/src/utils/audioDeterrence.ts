// audioDeterrence.ts
// Synthesizes a loud, alarming siren sound using the Web Audio API

let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

export const playSiren = (durationMs = 3000) => {
    try {
        if (typeof window === 'undefined') return;
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (!audioCtx) return;
        
        // Stop any existing siren
        stopSiren();

        if (audioCtx.state === 'suspended') audioCtx.resume();

        oscillator = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();

        oscillator.type = 'square';
        
        // Create an aggressive pulsing siren effect (wailing up and down)
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime); // Start low
        
        // Sweep up and down repeatedly
        let now = audioCtx.currentTime;
        for(let i=0; i< (durationMs/1000) * 2; i++) {
            oscillator.frequency.linearRampToValueAtTime(800, now + 0.25);
            now += 0.25;
            oscillator.frequency.linearRampToValueAtTime(400, now + 0.25);
            now += 0.25;
        }

        // Volume control
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1); // Attack
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + (durationMs/1000) - 0.2); // Sustain
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (durationMs/1000)); // Release

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + (durationMs/1000));
    } catch (err) {
        console.warn("Audio siren error:", err);
    }
};

export const stopSiren = () => {
    try {
        if (oscillator) {
            oscillator.stop();
            oscillator.disconnect();
            oscillator = null;
        }
        if (gainNode) {
            gainNode.disconnect();
            gainNode = null;
        }
    } catch (e) {
        // Ignore errors if already stopped
    }
};
