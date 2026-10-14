import { useState } from 'react';
import { CreditCard, X } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { formatPrice, startCheckout } from '../lib/supabase';

// Starts Stripe Checkout for a course's exam & certificate. Signed-out visitors are asked to sign in first.
// `price` comes from useExamPrice; Stripe returns the buyer to /exam/:id?checkout=success|cancel.
export default function BuyCertificateButton({ courseId, price, label = 'Buy exam & certificate', className = 'btn-primary', showPrice = false }) {
  const { user, openSignIn } = useApp();
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');

  const buy = async () => {
    if (!user) return openSignIn();
    setBuying(true);
    setError('');
    try {
      await startCheckout(courseId);
    } catch (err) {
      setError(err.message);
      setBuying(false);
    }
  };

  return (
    <>
      <button className={className} onClick={buy} disabled={buying}>
        <CreditCard size={18} /> {buying ? 'Opening checkout…' : showPrice && price ? `${label} · ${formatPrice(price.price_cents, price.currency)}` : label}
      </button>
      {error && (
        <div className="feedback bad">
          <X size={18} />
          <div>{error}</div>
        </div>
      )}
    </>
  );
}
