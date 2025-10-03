/**
 * PWA Manager Module
 * Handles Progressive Web App functionality including service workers,
 * installation prompts, and offline capabilities
 */

import { Platform } from 'react-native';
import { logger } from '../logger';
import { PWAConfig } from './types';

export class PWAManager {
  private serviceWorkerRegistration?: ServiceWorkerRegistration;
  private deferredPrompt: any;
  private isInstalled = false;

  constructor(private config: PWAConfig) {}

  /**
   * Initialize PWA functionality
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'web') return;

    try {
      logger.info('PWAManager', 'Initializing PWA functionality');

      // Setup PWA meta tags
      this.setupPWAMeta();

      // Initialize service worker
      await this.initializeServiceWorker();

      // Setup install prompt
      this.setupInstallPrompt();

      // Check if already installed
      this.checkInstallStatus();

      logger.info('PWAManager', 'PWA initialized successfully');
    } catch (error) {
      logger.error('PWAManager', 'Failed to initialize PWA', error);
    }
  }

  /**
   * Setup PWA meta tags
   */
  private setupPWAMeta(): void {
    // Theme color
    this.updateMetaTag('theme-color', this.config.themeColor);

    // Apple mobile web app capable
    this.updateMetaTag('apple-mobile-web-app-capable', 'yes');
    this.updateMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    this.updateMetaTag('apple-mobile-web-app-title', this.config.shortName || this.config.appName);

    // Application name
    this.updateMetaTag('application-name', this.config.appName);

    // Mobile web app capable
    this.updateMetaTag('mobile-web-app-capable', 'yes');

    logger.info('PWAManager', 'PWA meta tags configured');
  }

  /**
   * Initialize service worker
   */
  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('PWAManager', 'Service workers not supported');
      return;
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/service-worker.js');

      logger.info('PWAManager', 'Service worker registered', {
        scope: this.serviceWorkerRegistration.scope,
      });

      // Handle service worker updates
      this.serviceWorkerRegistration.addEventListener('updatefound', () => {
        const newWorker = this.serviceWorkerRegistration?.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateAvailableBanner();
            }
          });
        }
      });
    } catch (error) {
      logger.error('PWAManager', 'Service worker registration failed', error);
    }
  }

  /**
   * Setup install prompt
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      logger.info('PWAManager', 'Install prompt available');

      // Show custom install button/banner
      this.showInstallBanner(e);
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideInstallBanner();
      logger.info('PWAManager', 'PWA installed successfully');
    });
  }

  /**
   * Check if PWA is installed
   */
  private checkInstallStatus(): void {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      logger.info('PWAManager', 'PWA is running in standalone mode');
    }
  }

  /**
   * Show install banner
   */
  private showInstallBanner(deferredPrompt: any): void {
    // Create install banner
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: ${this.config.themeColor};
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 9999;
    `;

    banner.innerHTML = `
      <span>Install ${this.config.appName} for a better experience</span>
      <button id="pwa-install-button" style="
        background: white;
        color: ${this.config.themeColor};
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      ">Install</button>
    `;

    document.body.appendChild(banner);

    // Setup install button handler
    const installButton = document.getElementById('pwa-install-button');
    installButton?.addEventListener('click', async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      logger.info('PWAManager', 'Install prompt outcome', { outcome });

      this.hideInstallBanner();
      this.deferredPrompt = null;
    });
  }

  /**
   * Hide install banner
   */
  private hideInstallBanner(): void {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.remove();
    }
  }

  /**
   * Show update available banner
   */
  private showUpdateAvailableBanner(): void {
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #4CAF50;
      color: white;
      padding: 12px;
      text-align: center;
      z-index: 9999;
    `;

    banner.innerHTML = `
      <span>A new version is available!</span>
      <button id="pwa-reload-button" style="
        margin-left: 16px;
        background: white;
        color: #4CAF50;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
      ">Reload</button>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwa-reload-button')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  /**
   * Update meta tag
   */
  private updateMetaTag(name: string, content: string): void {
    let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;

    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', content);
  }

  /**
   * Get service worker registration
   */
  getServiceWorker(): ServiceWorkerRegistration | undefined {
    return this.serviceWorkerRegistration;
  }

  /**
   * Check if PWA is installed
   */
  isPWAInstalled(): boolean {
    return this.isInstalled;
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<void> {
    if (this.serviceWorkerRegistration) {
      await this.serviceWorkerRegistration.unregister();
      logger.info('PWAManager', 'Service worker unregistered');
    }
  }
}