export class AdManager {
  private static instance: AdManager;
  private adsEnabled: boolean = true;

  private constructor() {
    this.initializeAds();
  }

  static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  private async initializeAds() {
    const subscriptionManager = await import('./subscription').then(m => m.SubscriptionManager.getInstance());
    const tier = await subscriptionManager.checkSubscriptionStatus();
    this.adsEnabled = tier === 'FREE';

    if (this.adsEnabled) {
      // Initialize Google AdSense
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      script.setAttribute('data-ad-client', 'ca-pub-YOUR_PUBLISHER_ID');
      document.head.appendChild(script);
    }
  }

  async showAd(container: HTMLElement, type: 'banner' | 'inline' = 'banner') {
    if (!this.adsEnabled) return;

    const adUnit = document.createElement('ins');
    adUnit.className = 'adsbygoogle';
    adUnit.style.display = 'block';
    adUnit.setAttribute('data-ad-client', 'ca-pub-4810184198644687');
    adUnit.setAttribute('data-ad-slot', type === 'banner' ? 'BANNER_SLOT_ID' : 'INLINE_SLOT_ID');
    adUnit.setAttribute('data-ad-format', 'auto');
    adUnit.setAttribute('data-full-width-responsive', 'true');

    container.appendChild(adUnit);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
}