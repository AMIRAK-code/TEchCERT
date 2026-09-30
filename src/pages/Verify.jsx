import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Search, ShieldX } from 'lucide-react';
import { getCourse } from '../data/courses';
import { useApp } from '../store/AppStore';
import { verifyCredential } from '../lib/credential';
import { lookupCertificate, supabase } from '../lib/supabase';
import CertificateCard from '../components/CertificateCard';

// Resolves a credential from (1) the built-in registry / this browser, (2) the database,
// (3) a self-consistent verification link (local-mode certificates).
function useCredential(params, certificates) {
  const id = params.get('id')?.trim().toUpperCase() || '';
  const n = params.get('n');
  const c = params.get('c');
  const t = params.get('t');
  const known = id ? certificates.find(x => x.credId === id) : null;
  const linkOk = id && verifyCredential({ id, n, c, t }) ? { credId: id, name: n, courseId: c, issuedAt: t, method: 'exam' } : null;
  const needsRemote = Boolean(id && !known && supabase);
  const [remote, setRemote] = useState({ id: '', status: 'loading', cert: null });

  useEffect(() => {
    if (!needsRemote) return;
    let cancelled = false;
    lookupCertificate(id)
      .then(cert => !cancelled && setRemote({ id, status: cert ? 'valid' : 'invalid', cert }))
      .catch(() => !cancelled && setRemote({ id, status: 'error', cert: null }));
    return () => {
      cancelled = true;
    };
  }, [id, needsRemote]);

  if (!id) return { id, status: 'idle', cert: null };
  if (known) return { id, status: 'valid', cert: known };
  if (needsRemote) {
    if (remote.id !== id) return { id, status: 'loading', cert: null };
    if (remote.status !== 'valid' && linkOk) return { id, status: 'valid', cert: linkOk };
    return remote;
  }
  return { id, status: linkOk ? 'valid' : 'invalid', cert: linkOk };
}

export default function Verify() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { certificates } = useApp();
  const [lookup, setLookup] = useState('');
  const result = useCredential(params, certificates);
  const course = result.cert && getCourse(result.cert.courseId);

  const search = e => {
    e.preventDefault();
    const id = lookup.trim().toUpperCase();
    if (id) navigate(`/verify?id=${encodeURIComponent(id)}`);
  };

  return (
    <div className="container narrow">
      <h1 className="center">Verify a certificate</h1>

      {result.status === 'loading' && <p className="muted center">Checking credential {result.id}…</p>}

      {result.status === 'valid' && course && !result.cert.revoked && (
        <>
          <div className="feedback good" style={{ marginBottom: 24 }}>
            <BadgeCheck size={20} />
            <div>
              <strong>Valid credential.</strong> {result.cert.name} holds the {course.title} certificate (credential ID {result.cert.credId}).
            </div>
          </div>
          <CertificateCard cert={result.cert} course={course} />
        </>
      )}

      {result.status === 'valid' && result.cert?.revoked && (
        <div className="feedback bad" style={{ marginBottom: 24 }}>
          <ShieldX size={20} />
          <div>
            <strong>Revoked credential.</strong> Credential {result.cert.credId} was issued but has since been revoked.
          </div>
        </div>
      )}

      {(result.status === 'invalid' || result.status === 'error') && (
        <div className="feedback bad" style={{ marginBottom: 24 }}>
          <ShieldX size={20} />
          <div>
            <strong>{result.status === 'error' ? 'Could not check this credential.' : 'Credential not found.'}</strong>{' '}
            {result.status === 'error'
              ? 'The verification service is unreachable — try again shortly.'
              : `No certificate with ID ${result.id} exists, or the link was altered.`}
          </div>
        </div>
      )}

      <div className="glass-panel pad" style={{ marginTop: 32 }}>
        <p className="muted">Enter a credential ID (printed on the certificate) or open the verification link the holder shared.</p>
        <form onSubmit={search} className="inline-form">
          <input value={lookup} onChange={e => setLookup(e.target.value)} placeholder="TC-XXXX-XXXX" aria-label="Credential ID" />
          <button className="btn-primary" type="submit">
            <Search size={18} /> Look up
          </button>
        </form>
      </div>
    </div>
  );
}
