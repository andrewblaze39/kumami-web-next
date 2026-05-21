'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    features: ['Basic news access', 'Limited articles', 'Community access'],
    popular: false,
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 19.99,
    period: '/month',
    features: ['All premium articles', 'No ads', 'AI tools access', 'Early content access'],
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 199.99,
    period: '/year',
    features: ['All premium articles', 'No ads', 'AI tools access', 'Early content access', '2 months free'],
    popular: false,
  },
];

export default function SubscriptionPlans() {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'crypto'>('fiat');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleSubscribe = async () => {
    if (selectedPlan === 'free') {
      router.push('/signup');
      return;
    }

    if (!currentUser) {
      router.push('/login?returnUrl=/subscribe');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (paymentMethod === 'fiat') {
        const res = await fetch('/api/subscribe-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: currentUser.email,
            planId: selectedPlan,
            referralCode: referralCode.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Checkout failed');
        window.location.href = data.checkoutUrl;
      } else {
        const plan = PLANS.find((p) => p.id === selectedPlan)!;
        const res = await fetch('/api/create-crypto-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: { id: plan.id, name: plan.name, price: plan.price },
            userEmail: currentUser.email,
            userId: currentUser.uid,
            referralCode: referralCode.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Crypto payment failed');
        window.location.href = data.invoiceUrl;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-3" style={{ color: '#40e0d0' }}>
          Upgrade to Pro
        </h1>
        <p className="text-center text-gray-400 mb-12 text-lg">
          Unlock the full Kumami World experience
        </p>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-2xl p-6 cursor-pointer border-2 transition-all duration-200 ${
                selectedPlan === plan.id
                  ? 'border-[#96EDD6] bg-[#0a2020]'
                  : 'border-white/10 bg-[#0f0f0f] hover:border-white/30'
              } ${plan.popular && selectedPlan === plan.id ? 'md:scale-105' : ''}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#96EDD6] text-black text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold mb-4" style={{ color: '#40e0d0' }}>
                {plan.price === 0 ? 'Free' : `$${plan.price}`}
                <span className="text-base font-normal text-gray-400">{plan.period}</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span style={{ color: '#96EDD6' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Referral Code */}
        <div className="max-w-sm mx-auto mb-8">
          <input
            type="text"
            placeholder="Referral code (optional)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-white/20 rounded-full px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#96EDD6] transition-colors"
          />
        </div>

        {/* Payment Method */}
        {selectedPlan !== 'free' && (
          <div className="flex gap-4 justify-center mb-8">
            <button
              onClick={() => setPaymentMethod('fiat')}
              className={`px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                paymentMethod === 'fiat'
                  ? 'border-[#96EDD6] bg-[#0a2020] text-white'
                  : 'border-white/20 bg-transparent text-gray-400 hover:border-white/40'
              }`}
            >
              💳 Pay with Card
            </button>
            <button
              onClick={() => setPaymentMethod('crypto')}
              className={`px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                paymentMethod === 'crypto'
                  ? 'border-[#96EDD6] bg-[#0a2020] text-white'
                  : 'border-white/20 bg-transparent text-gray-400 hover:border-white/40'
              }`}
            >
              ₿ Pay with Crypto
            </button>
          </div>
        )}

        {error && (
          <p className="text-center text-red-400 text-sm mb-6">{error}</p>
        )}

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="px-10 py-4 rounded-full font-bold text-black text-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #96EDD6, #40e0d0)' }}
          >
            {loading
              ? 'Processing...'
              : selectedPlan === 'free'
              ? 'Get Started Free'
              : 'Subscribe Now'}
          </button>
          {!currentUser && selectedPlan !== 'free' && (
            <p className="text-gray-500 text-sm mt-3">You&apos;ll be asked to log in before checkout.</p>
          )}
        </div>
      </div>
    </div>
  );
}
