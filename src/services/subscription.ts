import { User, SubscriptionTier, PaymentStatus } from '../types/subscription';

export class SubscriptionManager {
  private static instance: SubscriptionManager;
  private currentUser: User | null = null;

  private constructor() {}

  static getInstance(): SubscriptionManager {
    if (!SubscriptionManager.instance) {
      SubscriptionManager.instance = new SubscriptionManager();
    }
    return SubscriptionManager.instance;
  }

  async checkSubscriptionStatus(): Promise<SubscriptionTier> {
    if (!this.currentUser) {
      return 'FREE';
    }
    
    const status = await chrome.storage.sync.get(['subscriptionStatus']);
    return status.subscriptionStatus || 'FREE';
  }

  async upgradeSubscription(tier: SubscriptionTier): Promise<PaymentStatus> {
    // Implement Stripe payment integration here
    return { success: true, message: 'Subscription upgraded successfully' };
  }

  async checkFeatureAccess(feature: string): Promise<boolean> {
    const tier = await this.checkSubscriptionStatus();
    const featureAccess = {
      FREE: ['basic-summary'],
      PRO: ['basic-summary', 'sentiment-analysis', 'text-simplification'],
      ENTERPRISE: ['basic-summary', 'sentiment-analysis', 'text-simplification', 'custom-models', 'api-access']
    };
    
    return featureAccess[tier]?.includes(feature) || false;
  }
}