import { useEffect, useRef, useState } from 'react';
import { MailCheck, X } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { BRAND } from '../config';

export default function SignInModal() {
  const { signInOpen, closeSignIn, signIn, mode } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    if (!signInOpen) return;
    nameRef.current?.focus();
    const onKey = e => e.key === 'Escape' && closeSignIn();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [signInOpen, closeSignIn]);

  if (!signInOpen) return null;

  const submit = async e => {
    e.preventDefault();
    if (name.trim().split(/\s+/).length < 2) return setError('Please enter your full name — it will appear on your certificate.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Please enter a valid email address.');
    setError('');
    setBusy(true);
    try {
      const result = await signIn(name, email);
      if (result === 'link-sent') setSentTo(email.trim());
    } catch (err) {
      const offline = /fetch|network/i.test(err.message || '');
      setError(offline ? "Can't reach the sign-in service. Check your connection and try again." : err.message || 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={closeSignIn}>
      <div className="modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="signin-title" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" aria-label="Close" onClick={closeSignIn}>
          <X size={20} />
        </button>
        {sentTo ? (
          <>
            <MailCheck size={28} color="var(--ok)" />
            <h2 id="signin-title" style={{ marginTop: 12 }}>
              Check your inbox
            </h2>
            <p className="muted">
              We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this device to finish signing in.
            </p>
            <button className="btn-secondary" onClick={() => setSentTo('')}>
              Use a different email
            </button>
          </>
        ) : (
          <>
            <h2 id="signin-title">Sign in to {BRAND}</h2>
            <p className="muted">
              {mode === 'cloud'
                ? "We'll email you a one-time sign-in link — no password needed. Use your real name; it is printed on your certificate."
                : 'Your progress and certificates are saved to this browser. Use your real name — it is printed on your certificate.'}
            </p>
            <form onSubmit={submit} className="form">
              <label>
                Full name
                <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" />
              </label>
              <label>
                Email
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ada@example.com" autoComplete="email" />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={busy}>
                {busy ? 'Sending…' : mode === 'cloud' ? 'Email me a sign-in link' : 'Continue'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
