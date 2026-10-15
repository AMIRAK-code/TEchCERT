export const BRAND = 'techCert';
// Printed as "Issued by" on every certificate and sent to LinkedIn as the issuing organization.
export const ISSUER_NAME = 'techCert365 Academy';
export const ISSUER_PARENT = 'assist365';
export const ISSUER = `${ISSUER_NAME} by ${ISSUER_PARENT}`;
export const CREDENTIAL_PREFIX = 'TC';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
