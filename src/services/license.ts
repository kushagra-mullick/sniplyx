export interface License {
  key: string;
  tier: 'FREE' | 'PRO';
  expiresAt: number;
}

export class LicenseManager {
  private static instance: LicenseManager;
  private currentLicense: License | null = null;

  private constructor() {
    this.loadLicense();
  }

  static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  private async loadLicense() {
    const result = await chrome.storage.sync.get(['license']);
    this.currentLicense = result.license || {
      key: '',
      tier: 'FREE',
      expiresAt: 0
    };
  }

  async activateLicense(key: string): Promise<boolean> {
    // Simple license key validation (in a real extension, use a more secure method)
    if (this.isValidLicenseKey(key)) {
      const license: License = {
        key,
        tier: 'PRO',
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
      };
      
      await chrome.storage.sync.set({ license });
      this.currentLicense = license;
      return true;
    }
    return false;
  }

  private isValidLicenseKey(key: string): boolean {
    // Simple validation (replace with your own logic)
    return key.length === 20 && key.startsWith('AI-');
  }

  async getCurrentTier(): Promise<'FREE' | 'PRO'> {
    if (!this.currentLicense) {
      await this.loadLicense();
    }
    
    if (this.currentLicense?.tier === 'PRO' && 
        this.currentLicense.expiresAt > Date.now()) {
      return 'PRO';
    }
    return 'FREE';
  }

  async checkFeatureAccess(feature: string): Promise<boolean> {
    const tier = await this.getCurrentTier();
    
    const featureAccess = {
      FREE: ['basic-summary'],
      PRO: ['basic-summary', 'sentiment-analysis', 'text-simplification', 'ad-free']
    };
    
    return featureAccess[tier]?.includes(feature) || false;
  }
}