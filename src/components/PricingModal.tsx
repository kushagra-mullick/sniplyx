import React from 'react';
import { X } from 'lucide-react';
import { SubscriptionPlan } from '../types/subscription';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (plan: SubscriptionPlan) => void;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Basic text summarization',
      'Up to 5 summaries per day',
      'Ad-supported experience'
    ],
    billingPeriod: 'monthly'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    features: [
      'Advanced AI summarization',
      'Unlimited summaries',
      'Sentiment analysis',
      'Text simplification',
      'Ad-free experience'
    ],
    billingPeriod: 'monthly'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    features: [
      'Custom summarization models',
      'API access',
      'Team management',
      'Priority support',
      'Custom branding',
      'Advanced analytics'
    ],
    billingPeriod: 'monthly'
  }
];

export function PricingModal({ isOpen, onClose, onSubscribe }: PricingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="border rounded-lg p-6 flex flex-col">
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold mb-4">
                ${plan.price}
                <span className="text-sm text-gray-500 font-normal">
                  /{plan.billingPeriod}
                </span>
              </div>
              <ul className="mb-6 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center mb-2">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onSubscribe(plan)}
                className={`w-full py-2 px-4 rounded-lg font-medium ${
                  plan.id === 'pro'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.price === 0 ? 'Get Started' : 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>All plans include a 14-day money-back guarantee</p>
          <p className="mt-2">
            Need a custom solution?{' '}
            <a href="#contact" className="text-indigo-600 hover:text-indigo-500">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}