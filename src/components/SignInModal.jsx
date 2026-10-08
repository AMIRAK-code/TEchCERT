import { useEffect, useRef, useState } from 'react';
import { MailCheck, X } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { BRAND } from '../config';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function friendly(err) {
  const msg = err?.message || '';
  if (/fetch|network/i.test(msg)) return "Can't reach the sign-in service. Check your connection and try again.";
  if (/already registered|already exists/i.test(msg)) return 'An account with this email already exists. Sign in instead.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a few minutes and try again.';
  return msg || 'Something went wrong. Please try again.';
}

export default function SignInModal() {
  const { signInOpen, closeSignIn, mode, passwordRecovery } = useApp();
  if (!signInOpen) return null;
  return (
    <div className="modal-backdrop" onMouseDown={closeSignIn}>
      <div className="modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="signin-title" onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" aria-label="Close" onClick={closeSignIn}>
          <X size={20} />
        </button>
        {mode !== 'cloud' ? <LocalSignIn /> : passwordRecovery ? <NewPassword /> : <CloudSignIn />}
      </div>
    </div>
  );
}

function useEscape() {
  const { closeSignIn } = useApp();
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && closeSignIn();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSignIn]);
}

// Runs an async action with busy/error state.
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async fn => {
    setError('');
    setBusy(true);
    try {
      return await fn();
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

/* ---------- cloud: email + password ---------- */
function CloudSignIn() {
  const { signUp, signInPassword, sendSignInLink, resetPassword } = useApp();
  const [view, setView] = useState('signin'); // signin | signup | reset | link
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(null); // { to, what }
  const { busy, error, setError, run } = useAction();
  const firstRef = useRef(null);
  useEscape();

  useEffect(() => {
    firstRef.current?.focus();
  }, [view]);

  const go = v => {
    setView(v);
    setError('');
  };

  const submit = async e => {
    e.preventDefault();
    const addr = email.trim();
    if (view === 'signup' && name.trim().split(/\s+/).length < 2) return setError('Please enter your full name — it will appear on your certificate.');
    if (!EMAIL_RE.test(addr)) return setError('Please enter a valid email address.');
    if ((view === 'signin' || view === 'signup') && !password) return setError('Please enter your password.');
    if (view === 'signup' && password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);

    await run(async () => {
      if (view === 'signin') await signInPassword(addr, password);
      if (view === 'signup') {
        const result = await signUp(name, addr, password);
        if (result === 'confirm-sent') setSent({ to: addr, what: 'a confirmation link' });
      }
      if (view === 'reset') {
        await resetPassword(addr);
        setSent({ to: addr, what: 'a link to choose a new password' });
      }
      if (view === 'link') {
        await sendSignInLink(addr);
        setSent({ to: addr, what: 'a sign-in link' });
      }
    });
  };

  if (sent) {
    return (
      <>
        <MailCheck size={28} color="var(--ok)" />
        <h2 id="signin-title" style={{ marginTop: 12 }}>
          Check your inbox
        </h2>
        <p className="muted">
          We sent {sent.what} to <strong>{sent.to}</strong>. Open it on this device to continue.
        </p>
        <button
          className="btn-secondary"
          onClick={() => {
            setSent(null);
            go('signin');
          }}
        >
          Back to sign in
        </button>
      </>
    );
  }

  const titles = { signin: `Sign in to ${BRAND}`, signup: 'Create your account', reset: 'Reset your password', link: 'Email me a sign-in link' };
  const buttons = { signin: 'Sign in', signup: 'Create account', reset: 'Send reset link', link: 'Send sign-in link' };

  return (
    <>
      <h2 id="signin-title">{titles[view]}</h2>
      {view === 'signup' && <p className="muted">Lessons are free. Use your real name — it is printed on your certificate.</p>}
      {view === 'reset' && <p className="muted">We'll email you a link to choose a new password.</p>}
      {view === 'link' && <p className="muted">No password needed — we'll email you a one-time link. Opening it also verifies your email.</p>}
      <form onSubmit={submit} className="form" noValidate>
        {view === 'signup' && (
          <label>
            Full name
            <input ref={firstRef} value={name} onChange={e => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" />
          </label>
        )}
        <label>
          Email
          <input
            ref={view === 'signup' ? undefined : firstRef}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ada@example.com"
            autoComplete="email"
          />
        </label>
        {(view === 'signin' || view === 'signup') && (
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
              placeholder={view === 'signup' ? `At least ${MIN_PASSWORD} characters` : ''}
            />
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={busy}>
          {busy ? 'Please wait…' : buttons[view]}
        </button>
      </form>

      <div className="auth-links">
        {view === 'signin' ? (
          <>
            <button className="link-btn" onClick={() => go('signup')}>
              New here? Create an account
            </button>
            <button className="link-btn" onClick={() => go('reset')}>
              Forgot password?
            </button>
            <button className="link-btn" onClick={() => go('link')}>
              Email me a sign-in link instead
            </button>
          </>
        ) : (
          <button className="link-btn" onClick={() => go('signin')}>
            {view === 'signup' ? 'Already have an account? Sign in' : '← Back to sign in'}
          </button>
        )}
      </div>
    </>
  );
}

/* ---------- cloud: after opening a password-reset link ---------- */
function NewPassword() {
  const { setNewPassword } = useApp();
  const [password, setPassword] = useState('');
  const { busy, error, setError, run } = useAction();
  useEscape();

  const submit = async e => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    await run(() => setNewPassword(password));
  };

  return (
    <>
      <h2 id="signin-title">Choose a new password</h2>
      <form onSubmit={submit} className="form" noValidate>
        <label>
          New password
          <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder={`At least ${MIN_PASSWORD} characters`} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </>
  );
}

/* ---------- local mode: name + email in this browser ---------- */
function LocalSignIn() {
  const { signIn } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { busy, error, setError, run } = useAction();
  useEscape();

  const submit = async e => {
    e.preventDefault();
    if (name.trim().split(/\s+/).length < 2) return setError('Please enter your full name — it will appear on your certificate.');
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.');
    await run(() => signIn(name, email));
  };

  return (
    <>
      <h2 id="signin-title">Sign in to {BRAND}</h2>
      <p className="muted">Your progress and certificates are saved to this browser. Use your real name — it is printed on your certificate.</p>
      <form onSubmit={submit} className="form" noValidate>
        <label>
          Full name
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ada@example.com" autoComplete="email" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={busy}>
          {busy ? 'Please wait…' : 'Continue'}
        </button>
      </form>
    </>
  );
}
