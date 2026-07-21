// audioDeterrence.js
// Synthesizes a loud, alarming siren sound using the Web Audio API
// No external mp3 files needed!

let audioCtx = null;
let oscillator = null;
let gainNode = null;
let sirenInterval = null;

export const playSiren = (durationMs = 3000) => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Stop any existing siren
    stopSiren();

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
