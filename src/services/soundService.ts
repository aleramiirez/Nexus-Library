/**
 * Servicio ceremonial de efectos sonoros táctiles para Nexus Library.
 * Utiliza Web Audio API de forma procedimental (0 latencia, sin descarga de archivos externos, funciona 100% offline).
 */

export type HapticFeedbackType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'waxSeal'
  | 'bell'
  | 'levelUp'
  | 'stamp'
  | 'scan'
  | 'error';

export interface SoundPreferences {
  enabled: boolean;
  volume: number; // 0.0 a 1.0 (0.75 por defecto)
  waxSeal: boolean; // Sonido de golpe sordo y resonancia al completar libro / reto
  pageTurn: boolean; // Susurro de pergamino al hojear fichas de libro
  brassBell: boolean; // Campanilla de latón de biblioteca al alcanzar hitos
  haptics: boolean; // Feedback táctil vibratorio ceremonial en móviles
}

const DEFAULT_PREFERENCES: SoundPreferences = {
  enabled: true,
  volume: 0.55,
  waxSeal: true,
  pageTurn: true,
  brassBell: true,
  haptics: true
};

const STORAGE_KEY = 'nexus_sound_preferences';

class SoundService {
  private ctx: AudioContext | null = null;
  private preferences: SoundPreferences = DEFAULT_PREFERENCES;
  private listeners: Set<(prefs: SoundPreferences) => void> = new Set();
  private noiseBuffer: AudioBuffer | null = null;
  private ambientGain: GainNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      this.preferences = DEFAULT_PREFERENCES;
    }
  }

  public getPreferences(): SoundPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(partial: Partial<SoundPreferences>) {
    this.preferences = { ...this.preferences, ...partial };
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
      }
    } catch {
      // Ignorar errores en modo incógnito estricto
    }
    this.notify();
  }

  public subscribe(listener: (prefs: SoundPreferences) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.getPreferences());
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtxClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Genera o reutiliza un búfer de ruido blanco para síntesis de fricción de papel
   */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const bufferSize = Math.floor(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Dispara una vibración háptica táctil en dispositivos móviles compatibles (0ms lag)
   */
  public triggerHaptic(type: HapticFeedbackType = 'light') {
    if (!this.preferences.enabled || !this.preferences.haptics) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

    try {
      switch (type) {
        case 'light':
          navigator.vibrate(12);
          break;
        case 'medium':
          navigator.vibrate(22);
          break;
        case 'heavy':
          navigator.vibrate(40);
          break;
        case 'waxSeal':
          // Golpe sordo de lacre ceremonial (impacto inicial + asentamiento de cera)
          navigator.vibrate([18, 30, 22]);
          break;
        case 'bell':
          // Campanilla de latón
          navigator.vibrate([12, 35, 14]);
          break;
        case 'stamp':
          // Sello consular ex libris
          navigator.vibrate(28);
          break;
        case 'scan':
          // Lectura de código de barras
          navigator.vibrate([15, 30, 15]);
          break;
        case 'levelUp':
          // Fanfarria ceremonial de ascenso en la Orden
          navigator.vibrate([22, 40, 25, 40, 35]);
          break;
        case 'error':
          navigator.vibrate([35, 40, 35]);
          break;
      }
    } catch {
      // Ignorar restricciones en entornos sin soporte de vibración
    }
  }

  /**
   * Informa si el dispositivo actual soporta la API de vibración háptica
   */
  public isHapticsSupported(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  /**
   * 1. Sello de Lacre Ceremonial (Impacto sordo sobre pergamino + resonancia de latón + chasquido de cera)
   */
  public playWaxSeal(force = false) {
    if (!force && (!this.preferences.enabled || !this.preferences.waxSeal)) return;
    this.triggerHaptic('waxSeal');
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterVol = this.preferences.volume;

      // Master gain para controlar volumen general
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVol, now);
      masterGain.connect(ctx.destination);

      // A. Golpe táctil sordo de lacre sobre pergamino (thump sordo)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.22);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.25);

      // B. Resonancia cálida de latón (chime D5)
      const bellOsc = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(587.33, now + 0.04);
      bellGain.gain.setValueAtTime(0.18, now + 0.04);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      bellOsc.connect(bellGain);
      bellGain.connect(masterGain);
      bellOsc.start(now + 0.04);
      bellOsc.stop(now + 0.56);

      // C. Chasquido de cera caliente (micro burst de ruido filtrado)
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.16, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.07);
    } catch {
      // Ignorar bloqueos de audio sin gesto previo
    }
  }

  /**
   * 2. Pase de Página / Susurro de Pergamino (Fricción suave de papel seco de biblioteca antigua)
   */
  public playPageTurn(force = false) {
    if (!force && (!this.preferences.enabled || !this.preferences.pageTurn)) return;
    this.triggerHaptic('light');
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterVol = this.preferences.volume;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVol * 0.65, now);
      masterGain.connect(ctx.destination);

      // Fricción de papel: ruido blanco pasado por filtro paso banda variable
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(900, now + 0.2);
      filter.Q.setValueAtTime(1.1, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.24);

      // Cuerpo sordo de la hoja al doblarse (subtle low flutter)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(95, now + 0.02);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      subGain.gain.setValueAtTime(0.08, now + 0.02);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      subOsc.connect(subGain);
      subGain.connect(masterGain);
      subOsc.start(now + 0.02);
      subOsc.stop(now + 0.15);
    } catch {
      // Ignorar
    }
  }

  /**
   * 3. Campanilla de Latón de Mostrador (Antique library desk bell)
   */
  public playBrassBell(force = false) {
    if (!force && (!this.preferences.enabled || !this.preferences.brassBell)) return;
    this.triggerHaptic('bell');
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterVol = this.preferences.volume;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVol * 0.75, now);
      masterGain.connect(ctx.destination);

      // Tono fundamental (C6 - 1046.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now);
      gain1.gain.setValueAtTime(0.24, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.7);

      // Armónico cálido (E6 - 1318.5 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.5, now);
      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now);
      osc2.stop(now + 0.5);

      // Brillo metálico agudo breve (C7 - 2093 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(2093, now);
      gain3.gain.setValueAtTime(0.06, now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc3.connect(gain3);
      gain3.connect(masterGain);
      osc3.start(now);
      osc3.stop(now + 0.28);
    } catch {
      // Ignorar
    }
  }

  /**
   * 4. Sello Ex Libris de Tinta (Sello de biblioteca sobre papel)
   */
  public playInkStamp(force = false) {
    if (!force && !this.preferences.enabled) return;
    this.triggerHaptic('stamp');
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterVol = this.preferences.volume;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVol, now);
      masterGain.connect(ctx.destination);

      // Golpe sordo de madera/caucho
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);

      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.15);

      // Succión/adherencia breve de tinta húmeda
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(2.0, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.06);
    } catch {
      // Ignorar
    }
  }

  /**
   * 5. Fanfarria de Ascenso en la Orden (Arpegio áureo ceremonial + golpe de lacre)
   */
  public playLevelUp(force = false) {
    if (!force && !this.preferences.enabled) return;
    this.triggerHaptic('levelUp');
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterVol = this.preferences.volume;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVol, now);
      masterGain.connect(ctx.destination);

      // Arpegio áureo ascendente: C5, E5, G5, C6 (sonoridad clásica de biblioteca y triunfo)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + i * 0.085;
        const noteDuration = i === notes.length - 1 ? 0.9 : 0.45;

        osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.24, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(noteStart);
        osc.stop(noteStart + noteDuration + 0.05);
      });

      // Golpe sordo de lacre ceremonial al llegar a la nota culminante
      setTimeout(() => {
        this.playWaxSeal(true);
      }, 260);
    } catch {
      // Audio context bloqueado
    }
  }

  /**
   * 6. Chime de Escaneo de Código de Barras ISBN (Campana armónica de descubrimiento)
   */
  public playBarcodeScanSuccess(force = false) {
    if (!force && !this.preferences.enabled) return;
    this.triggerHaptic('scan');
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterVol = this.preferences.volume;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVol, now);
      masterGain.connect(ctx.destination);

      // Dos tonos armónicos limpios y brillantes (A5: 880Hz -> E6: 1318.5Hz)
      const tones = [
        { freq: 880, start: now, dur: 0.18, vol: 0.22 },
        { freq: 1318.51, start: now + 0.08, dur: 0.38, vol: 0.28 }
      ];

      tones.forEach(({ freq, start, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(vol, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(start);
        osc.stop(start + dur + 0.02);
      });
    } catch {
      // Audio context bloqueado
    }
  }

  /**
   * 7. Sonido ambiental de biblioteca / lectura (Ruido marrón cálido + resonancia acústica suave)
   */
  public startAmbientLibrarySound(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    this.stopAmbientLibrarySound();

    try {
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 2.5);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Filtro marrón orgánico suave
        data[i] = (lastOut + 0.022 * white) / 1.022;
        lastOut = data[i];
        data[i] *= 2.8;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(0.6, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      const targetVol = Math.max(0.02, 0.07 * (this.preferences.volume || 1));
      gain.gain.linearRampToValueAtTime(targetVol, now + 1.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      this.ambientSource = noise;
      this.ambientGain = gain;
    } catch {
      // Audio context bloqueado
    }
  }

  public stopAmbientLibrarySound(): void {
    if (this.ambientGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
        setTimeout(() => {
          if (this.ambientSource) {
            try {
              this.ambientSource.stop();
            } catch {
              // ya detenido
            }
          }
          this.ambientSource = null;
          this.ambientGain = null;
        }, 650);
      } catch {
        this.ambientSource = null;
        this.ambientGain = null;
      }
    } else {
      this.ambientSource = null;
      this.ambientGain = null;
    }
  }
}

export const soundService = new SoundService();
