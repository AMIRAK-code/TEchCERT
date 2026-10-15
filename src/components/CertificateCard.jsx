import { ISSUER_NAME, ISSUER_PARENT } from '../config';
import Logo from './Logo';

export default function CertificateCard({ cert, course }) {
  const date = new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const awarded = cert.method === 'admin'; // awarded directly, without an exam score
  return (
    <div className="certificate print-area">
      <div className="certificate-bar" />
      <div className="certificate-seal">
        <Logo size={56} />
      </div>
      <h2 className="certificate-kicker">{awarded ? 'Certification Award' : 'Certificate of Completion'}</h2>
      <p className="certificate-presented">This certifies that</p>
      <h3 className="certificate-name">{cert.name}</h3>
      <p className="certificate-presented">
        {awarded
          ? 'has been awarded the professional certification for'
          : 'has successfully completed the coursework and passed the certification exam for'}
      </p>
      <h4 className="certificate-course">{course.title}</h4>
      <div className="certificate-foot">
        <div>
          <p className="label">Date {awarded ? 'awarded' : 'earned'}</p>
          <p>{date}</p>
        </div>
        <div className="center">
          <p className="label">Issued by</p>
          <p>{ISSUER_NAME}</p>
          <p className="certificate-parent">by {ISSUER_PARENT}</p>
        </div>
        <div className="right">
          <p className="label">Credential ID</p>
          <p className="mono">{cert.credId}</p>
        </div>
      </div>
    </div>
  );
}
