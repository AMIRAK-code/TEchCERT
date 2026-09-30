import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Copy, Download, ExternalLink } from 'lucide-react';
import { getCourse } from '../data/courses';
import { useApp } from '../store/AppStore';
import { buildVerifyUrl } from '../lib/credential';
import CertificateCard from '../components/CertificateCard';
import { BRAND } from '../config';

export default function Certificate() {
  const { credId } = useParams();
  const { certificates } = useApp();
  const cert = certificates.find(c => c.credId === credId);
  const [copied, setCopied] = useState(false);

  if (!cert) {
    return (
      <div className="container narrow-sm center">
        <div className="glass-panel pad-lg">
          <h1>Certificate not found</h1>
          <p className="muted">This certificate isn't linked to your account. If someone shared it with you, verify it instead.</p>
          <Link to={`/verify?id=${encodeURIComponent(credId)}`} className="btn-primary">
            Verify a certificate
          </Link>
        </div>
      </div>
    );
  }

  const course = getCourse(cert.courseId);
  const issued = new Date(cert.issuedAt);
  const verifyUrl = buildVerifyUrl(cert);
  const linkedInUrl =
    'https://www.linkedin.com/profile/add?' +
    new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: course.title,
      organizationName: BRAND,
      issueYear: String(issued.getFullYear()),
      issueMonth: String(issued.getMonth() + 1),
      certUrl: verifyUrl,
      certId: cert.credId,
    }).toString();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this verification link:', verifyUrl);
    }
  };

  return (
    <div className="container narrow">
      <div className="center no-print" style={{ marginBottom: 32 }}>
        <div className="badge badge-success lg">
          <CheckCircle size={20} /> Certification achieved
        </div>
        <h1>Congratulations, {cert.name.split(' ')[0]}!</h1>
        <p className="muted">
          {cert.method === 'admin'
            ? `The ${course.title} certification was issued to you by ${BRAND} administration.`
            : `You passed the ${course.title} exam with a score of ${cert.score}%.`}
        </p>
      </div>

      <CertificateCard cert={cert} course={course} />

      <div className="btn-row center no-print">
        <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="btn-primary linkedin">
          <ExternalLink size={18} /> Add to LinkedIn
        </a>
        <button className="btn-secondary" onClick={() => window.print()}>
          <Download size={20} /> Download PDF
        </button>
        <button className="btn-secondary" onClick={copy}>
          <Copy size={18} /> {copied ? 'Link copied!' : 'Copy verification link'}
        </button>
      </div>
      <p className="muted small center no-print">"Download PDF" opens your browser's print dialog — choose "Save as PDF" as the destination.</p>

      <div className="center no-print" style={{ marginTop: 40 }}>
        <Link to="/dashboard" className="back-link">
          Go to your dashboard
        </Link>
      </div>
    </div>
  );
}
