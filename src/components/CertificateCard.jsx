import { Award } from 'lucide-react';
import { BRAND } from '../config';

export default function CertificateCard({ cert, course }) {
  const date = new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const adminIssued = cert.method === 'admin';
  return (
    <div className="certificate print-area">
      <div className="certificate-bar" />
      <div className="certificate-seal">
        <Award size={36} />
      </div>
      <h2 className="certificate-kicker">{adminIssued ? 'Certification Award' : 'Certificate of Completion'}</h2>
      <p className="certificate-presented">This certifies that</p>
      <h3 className="certificate-name">{cert.name}</h3>
      <p className="certificate-presented">
        {adminIssued
          ? `has been awarded the ${BRAND} certification for`
          : 'has successfully completed the coursework and passed the certification exam for'}
      </p>
      <h4 className="certificate-course">{course.title}</h4>
      <div className="certificate-foot">
        <div>
          <p className="label">Date {adminIssued ? 'issued' : 'earned'}</p>
          <p>{date}</p>
        </div>
        <div className="center">
          <p className="label">Issued by</p>
          <p>{adminIssued ? `${BRAND} Administration` : BRAND}</p>
        </div>
        <div className="right">
          <p className="label">Credential ID</p>
          <p className="mono">{cert.credId}</p>
        </div>
      </div>
    </div>
  );
}
