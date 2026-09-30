import { CREDENTIAL_PREFIX } from '../config';

// Credential IDs are derived from the certificate's contents, so the /verify page can
// recompute them and detect edited names, courses or dates in a shared link.
// NOTE: without a backend this is a consistency check, not a cryptographic guarantee.

function fnv1a(str, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function encode(num, len) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[num % ALPHABET.length];
    num = Math.floor(num / ALPHABET.length);
  }
  return out;
}

export function makeCredentialId(name, courseId, issuedAt) {
  const payload = `${name.trim().toLowerCase()}|${courseId}|${issuedAt}`;
  const a = fnv1a(payload);
  const b = fnv1a(payload, a ^ 0x9e3779b9);
  return `${CREDENTIAL_PREFIX}-${encode(a, 4)}-${encode(b, 4)}`;
}

export function buildVerifyUrl(cert) {
  const params = new URLSearchParams({
    id: cert.credId,
    n: cert.name,
    c: cert.courseId,
    t: cert.issuedAt,
  });
  return `${window.location.origin}/verify?${params.toString()}`;
}

export function verifyCredential({ id, n, c, t }) {
  if (!id || !n || !c || !t) return false;
  return makeCredentialId(n, c, t) === id;
}
