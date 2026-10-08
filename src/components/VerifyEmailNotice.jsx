import { useState } from 'react';
import { AlertTriangle, MailCheck } from 'lucide-react';
import { useApp } from '../store/AppStore';

// Shown to signed-in learners who have paid for an exam but not yet proven they own
// their email address. Renders nothing otherwise (or in local mode).
export default function VerifyEmailNotice({ force = false }) {
  const { mode, user, purchases, sendVerification } = useApp();
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  const paid = purchases.some(p => p.status === 'paid');
  if (mode !== 'cloud' || !user || user.emailVerified || !(paid || force)) return null;

  const send = async () => {
    setState('sending');
    try {
      await sendVerification();
      setState('sent');
    } catch (err) {
      setError(/rate limit|too many/i.test(err.message || '') ? 'Too many emails sent. Please wait a few minutes and try again.' : err.message || 'Could not send the email.');
      setState('error');
    }
  };

  return (
    <aside className="callout callout-warning verify-notice" role="status">
      {state === 'sent' ? <MailCheck size={20} /> : <AlertTriangle size={20} />}
      <div>
        <strong>Verify your email to secure your purchase</strong>
        {state === 'sent' ? (
          <p>
            We sent a verification link to <strong>{user.email}</strong>. Open it on this device — that confirms the address and syncs your payment and certificate to it.
          </p>
        ) : (
          <>
            <p>
              Your payment and certificate are linked to <strong>{user.email}</strong>, which is not verified yet. If you don't verify it, your payment and certificate
              might be lost — for example if the address has a typo or you forget your password, we can't recover your account.
            </p>
            <button className="btn-primary btn-sm" onClick={send} disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Send verification link'}
            </button>
            {state === 'error' && <p className="form-error">{error}</p>}
          </>
        )}
      </div>
    </aside>
  );
}
