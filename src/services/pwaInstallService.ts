/**
 * Servicio para gestión y detección del estado de instalación PWA (Progressive Web App).
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaInstallState {
  isStandalone: boolean;
  canPrompt: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isInstalled: boolean;
}

class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners: Set<(state: PwaInstallState) => void> = new Set();
  private isStandaloneMode: boolean = false;
  private isIOSDevice: boolean = false;
  private isAndroidDevice: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isStandaloneMode = this.checkIsStandalone();
      this.isIOSDevice = this.checkIsIOS();
      this.isAndroidDevice = this.checkIsAndroid();

      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevenir el banner invasivo automático del navegador para controlarlo nosotros
        e.preventDefault();
        this.deferredPrompt = e as BeforeInstallPromptEvent;
        this.notify();
      });

      window.addEventListener('appinstalled', () => {
        this.deferredPrompt = null;
        this.isStandaloneMode = true;
        this.notify();
      });

      // Escuchar cambios de visualización (por si se abre la ventana PWA)
      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      if (mediaQuery?.addEventListener) {
        mediaQuery.addEventListener('change', (e) => {
          this.isStandaloneMode = e.matches;
          this.notify();
        });
      }
    }
  }

  private checkIsStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
    const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
    return Boolean(isStandaloneDisplay || isNavigatorStandalone);
  }

  private checkIsIOS(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    const isAppleMacTouch = /macintosh/.test(ua) && window.navigator.maxTouchPoints > 1;
    return isAppleDevice || isAppleMacTouch;
  }

  private checkIsAndroid(): boolean {
    if (typeof window === 'undefined') return false;
    return /android/i.test(window.navigator.userAgent);
  }

  public getState(): PwaInstallState {
    const isStandalone = this.checkIsStandalone() || this.isStandaloneMode;
    return {
      isStandalone,
      canPrompt: Boolean(this.deferredPrompt) && !isStandalone,
      isIOS: this.isIOSDevice,
      isAndroid: this.isAndroidDevice,
      isInstalled: isStandalone
    };
  }

  public subscribe(listener: (state: PwaInstallState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error en listener de pwaInstallService:', err);
      }
    });
  }

  /**
   * Dispara el diálogo nativo de instalación si el navegador lo soporta
   */
  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
    if (!this.deferredPrompt) {
      return 'unsupported';
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.deferredPrompt = null;
        this.notify();
      }
      return choice.outcome;
    } catch (err) {
      console.warn('Error al solicitar instalación PWA:', err);
      return 'unsupported';
    }
  }
}

export const pwaInstallService = new PwaInstallService();
