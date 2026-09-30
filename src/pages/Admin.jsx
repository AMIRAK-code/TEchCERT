import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { courses, getCourse } from '../data/courses';
import { STAFF } from '../data/registry';
import { useApp } from '../store/AppStore';
import { buildVerifyUrl } from '../lib/credential';
import { adminIssueCertificate, adminListCertificates, adminSetRevoked } from '../lib/supabase';

export default function Admin() {
  const { user, isAdmin, mode, certificates, openSignIn, authReady } = useApp();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', name: '', courseId: courses[0].id });
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!isAdmin || mode !== 'cloud') return;
    adminListCertificates()
      .then(setRows)
      .catch(e => setError(e.message));
  }, [isAdmin, mode]);

  if (!authReady) return null;

  if (!isAdmin) {
    return (
      <div className="container narrow-sm center">
        <div className="glass-panel pad-lg">
          <h1>Admin</h1>
          <p className="muted">This area is restricted to internal staff.</p>
          {!user && (
            <button className="btn-primary" onClick={openSignIn}>
              Sign in
            </button>
          )}
        </div>
      </div>
    );
  }

  const list = mode === 'cloud' ? rows || [] : certificates;

  const issue = async e => {
    e.preventDefault();
    setError('');
    try {
      const cert = await adminIssueCertificate(form.email.trim().toLowerCase(), form.name.trim(), form.courseId);
      setRows(r => [cert, ...(r || [])]);
      setForm({ ...form, email: '', name: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleRevoked = async c => {
    try {
      await adminSetRevoked(c.credId, !c.revoked);
      setRows(r => r.map(x => (x.credId === c.credId ? { ...x, revoked: !c.revoked } : x)));
    } catch (err) {
      setError(err.message);
    }
  };

  const copy = async c => {
    await navigator.clipboard.writeText(buildVerifyUrl(c));
    setCopied(c.credId);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="container">
      <span className="code-label">
        <ShieldCheck size={14} /> Internal
      </span>
      <h1 style={{ marginTop: 12 }}>Administration</h1>
      <p className="muted">Signed in as {user.name} ({user.email}).</p>

      <h2 className="section-title">Staff</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {STAFF.map(s => (
            <tr key={s.email}>
              <td>{s.name}</td>
              <td className="mono">{s.email}</td>
              <td>
                <span className="pill pill-accent">{s.role}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="section-title">Certificates</h2>
      {error && <p className="form-error">{error}</p>}

      {mode === 'cloud' ? (
        <form className="glass-panel pad admin-form" onSubmit={issue}>
          <strong>Issue a certificate</strong>
          <input required placeholder="Holder's full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input required type="email" placeholder="Holder's email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <button className="btn-primary btn-sm" type="submit">
            Issue
          </button>
        </form>
      ) : (
        <p className="muted small" style={{ marginBottom: 16 }}>
          Local mode: showing the built-in registry and certificates earned in this browser. Connect Supabase to issue and revoke certificates.
        </p>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Credential ID</th>
              <th>Holder</th>
              <th>Certification</th>
              <th>Issued</th>
              <th>Method</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.credId} className={c.revoked ? 'revoked' : ''}>
                <td className="mono">{c.credId}</td>
                <td>
                  {c.name}
                  <div className="muted small mono">{c.email}</div>
                </td>
                <td>{getCourse(c.courseId)?.title}</td>
                <td className="mono">{new Date(c.issuedAt).toLocaleDateString()}</td>
                <td>{c.revoked ? <span className="pill">revoked</span> : <span className="pill">{c.method === 'admin' ? 'admin' : `exam ${c.score}%`}</span>}</td>
                <td className="actions">
                  <Link to={`/verify?id=${encodeURIComponent(c.credId)}`} className="btn-ghost btn-sm" title="Open verification page">
                    <ExternalLink size={15} />
                  </Link>
                  <button className="btn-ghost btn-sm" onClick={() => copy(c)} title="Copy verification link">
                    <Copy size={15} /> {copied === c.credId ? 'Copied' : ''}
                  </button>
                  {mode === 'cloud' && (
                    <button className="btn-ghost btn-sm" onClick={() => toggleRevoked(c)}>
                      {c.revoked ? 'Restore' : 'Revoke'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
