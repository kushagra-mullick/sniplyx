import { loadStripe, Stripe } from '@stripe/stripe-js';
import { AuthService } from './firebase';
import { SubscriptionPlan } from '../types/subscription';

const STRIPE_PUBLIC_KEY = 'your_stripe_public_key';

export class PaymentService {
  private static instance: PaymentService;
  private stripe: Stripe | null = null;
  private authService: AuthService;

  private constructor() {
    this.authService = AuthService.getInstance();
    this.initializeStripe();
  }

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  private async initializeStripe() {
    this.stripe = await loadStripe(STRIPE_PUBLIC_KEY);
  }

  async createSubscription(plan: SubscriptionPlan) {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Please sign in to subscribe');
    }

    if (!this.stripe) {
      throw new Error('Payment system not initialized');
    }

    try {
      // Create a payment intent on your backend
      const response = await fetch('https://your-backend.com/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          planId: plan.id,
          userId: user.uid
        })
      });

      const { clientSecret } = await response.json();

      // Confirm the payment
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: {
            token: 'tok_visa' // In production, you'd use Elements to collect card details
          },
          billing_details: {
            email: user.email || undefined
          }
        }
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.paymentIntent;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to process payment');
    }
  }
}