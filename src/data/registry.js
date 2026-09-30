// Internal staff. Signing in with one of these emails grants the admin role.
export const STAFF = [
  { name: 'Amirhossein Akbari', email: 'amir.akbari@inrebus.it', role: 'admin' },
  { name: 'Faraz Haghgoo', email: 'faraz.haghgoo@inrebus.it', role: 'admin' },
];

// Certificates issued directly by administration. They ship with the site, so they
// verify in any browser — unlike exam-earned certificates, which live in localStorage.
// IDs are pinned (they match supabase/migrations/*_seed.sql) and were generated with
// makeCredentialId(name, courseId, issuedAt), so self-consistency checks also pass.
const ISSUED_AT = '2026-09-30T09:00:00.000Z';
const REGISTRY_ENTRIES = [
  { credId: 'TC-FMDD-AWYL', email: 'amir.akbari@inrebus.it', courseId: 'ai-prompt-engineer' },
  { credId: 'TC-5RZJ-LG5J', email: 'amir.akbari@inrebus.it', courseId: 'ai-security' },
  { credId: 'TC-NERP-6NUB', email: 'faraz.haghgoo@inrebus.it', courseId: 'ai-prompt-engineer' },
  { credId: 'TC-SC7C-EZBE', email: 'faraz.haghgoo@inrebus.it', courseId: 'ai-security' },
];

export const ISSUED_CERTIFICATES = REGISTRY_ENTRIES.map(e => {
  const person = STAFF.find(s => s.email === e.email);
  return {
    credId: e.credId,
    courseId: e.courseId,
    name: person.name,
    email: person.email,
    issuedAt: ISSUED_AT,
    score: null,
    method: 'admin',
  };
});

export function findStaff(email) {
  return STAFF.find(s => s.email === email?.trim().toLowerCase());
}

export function findRegistered(credId) {
  return ISSUED_CERTIFICATES.find(c => c.credId === credId);
}
