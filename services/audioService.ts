// Simple synthesized sound effects for retro game feel
class AudioService {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;

    constructor() {
        try {
            // Initialize on first user interaction usually, but we'll try here
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.3; // Default volume
                this.masterGain.connect(this.ctx.destination);
            }
        } catch (e) {
            console.error("AudioContext not supported", e);
        }
    }

    public resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public setVolume(val: number) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, val));
        }
    }

    public toggle(enabled: boolean) {
        this.enabled = enabled;
    }

    private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 1) {
        if (!this.ctx || !this.masterGain || !this.enabled) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    // SFX Methods

    public playJump() {
        if (!this.enabled) return;
        this.playTone(150, 'square', 0.1, 0, 0.5);
        this.playTone(300, 'square', 0.2, 0.05, 0.5);
    }

    public playAttack() {
        if (!this.enabled) return;
        // White noise burst or quick slide
        this.playTone(200, 'sawtooth', 0.1, 0, 0.3);
        if (this.ctx) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(400, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        }
    }

    public playHit() {
        if (!this.enabled) return;
        this.playTone(100, 'square', 0.1, 0, 0.8);
    }

    public playEnemyHit() {
        if (!this.enabled) return;
        this.playTone(200, 'sawtooth', 0.05, 0, 0.5);
    }

    public playEnemyDeath() {
        if (!this.enabled) return;
        this.playTone(150, 'sawtooth', 0.1, 0, 0.6);
        this.playTone(100, 'sawtooth', 0.2, 0.1, 0.6);
        this.playTone(50, 'square', 0.3, 0.2, 0.6);
    }

    public playSkillCast() {
        if (!this.enabled) return;
        this.playTone(400, 'sine', 0.1, 0, 0.5);
        this.playTone(600, 'sine', 0.1, 0.1, 0.5);
        this.playTone(800, 'sine', 0.3, 0.2, 0.5);
    }

    public playStageClear() {
        if (!this.enabled) return;
        const now = 0;
        this.playTone(523.25, 'square', 0.1, now, 0.5); // C5
        this.playTone(659.25, 'square', 0.1, now + 0.1, 0.5); // E5
        this.playTone(783.99, 'square', 0.1, now + 0.2, 0.5); // G5
        this.playTone(1046.50, 'square', 0.4, now + 0.3, 0.5); // C6
    }

    public playGameOver() {
        if (!this.enabled) return;
        const now = 0;
        this.playTone(300, 'sawtooth', 0.3, now, 0.6);
        this.playTone(250, 'sawtooth', 0.3, now + 0.2, 0.6);
        this.playTone(200, 'sawtooth', 0.4, now + 0.4, 0.6);
        this.playTone(100, 'square', 1.0, now + 0.8, 0.8);
    }
}

export const audioService = new AudioService();
