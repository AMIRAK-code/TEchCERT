// techCert mark: a verification check whose long stroke ends in a circuit node,
// framed by the same registration corners printed on the certificate.
// Colours come from CSS (.logo-*), so it follows light/dark mode; public/favicon.svg is the fixed-colour copy.
export default function Logo({ size = 32, title }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect className="logo-tile" width="32" height="32" rx="2" />
      <path className="logo-corner" d="M5 11V5h6M27 21v6h-6" />
      <path className="logo-check" d="M9 16.5l4.5 4.5 8-9.5" />
      <circle className="logo-node" cx="23" cy="10" r="2.6" />
    </svg>
  );
}
