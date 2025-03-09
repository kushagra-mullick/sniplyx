export type SubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface User {
  id: string;
  email: string;
  tier: SubscriptionTier;
  subscriptionEnd?: Date;
}

export interface PaymentStatus {
  success: boolean;
  message: string;
  transactionId?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  billingPeriod: 'monthly' | 'yearly';
}