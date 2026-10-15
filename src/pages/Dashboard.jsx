import { Link } from 'react-router-dom';
import { BadgeCheck, ClipboardList, ExternalLink, PlayCircle, ShieldX } from 'lucide-react';
import { courses, getCourse } from '../data/courses';
import { useApp, useCourseProgress } from '../store/AppStore';
import CourseIcon, { ProgressBar } from '../components/CourseIcon';
import VerifyEmailNotice from '../components/VerifyEmailNotice';
import { ISSUER_NAME } from '../config';

const formatDate = iso => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// How the holder obtained it: awarded by the academy (staff, granted learners) or earned by passing the paid exam.
function howObtained(cert) {
  if (cert.revoked) return 'Revoked — no longer valid';
  if (cert.method === 'admin') return `Awarded by ${ISSUER_NAME}`;
  return cert.score != null ? `Earned by passing the exam · ${cert.score}%` : 'Earned by passing the exam';
}

function CertificateRow({ cert }) {
  const course = getCourse(cert.courseId);
  return (
    <div className={`glass-panel dash-row cert-row ${cert.revoked ? 'revoked' : ''}`}>
      {cert.revoked ? <ShieldX size={28} color="var(--danger)" /> : <BadgeCheck size={28} color="var(--success)" />}
      <div className="grow">
        <h3>{course?.title || cert.courseId}</h3>
        <p className="cert-how">{howObtained(cert)}</p>
        <p className="muted small mono">
          {formatDate(cert.issuedAt)} · {cert.credId}
        </p>
      </div>
      <div className="btn-row tight">
        {!cert.revoked && (
          <Link to={`/certificate/${cert.credId}`} className="btn-primary btn-sm">
            View certificate
          </Link>
        )}
        <Link to={`/verify?id=${encodeURIComponent(cert.credId)}`} className="btn-secondary btn-sm">
          <ExternalLink size={16} /> Verify
        </Link>
      </div>
    </div>
  );
}

function CourseProgressRow({ course, cert }) {
  const { attempts } = useApp();
  const p = useCourseProgress(course);
  const tries = attempts[course.id] || [];
  const last = tries[tries.length - 1];
  return (
    <div className="glass-panel dash-row">
      <CourseIcon name={course.icon} size={24} />
      <div className="grow">
        <h3>
          {course.title} {cert && <span className="pill pill-ok">Certified</span>}
        </h3>
        <ProgressBar percent={p.percent} label={`${p.done}/${p.total} lessons`} />
        {last && (
          <p className="muted small">
            Last exam: {Math.round((last.score / last.total) * 100)}% ({last.passed ? 'passed' : 'not passed'}) · {tries.length} attempt{tries.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
      {cert ? (
        <Link to={`/certificate/${cert.credId}`} className="btn-secondary btn-sm">
          <BadgeCheck size={16} /> Certificate
        </Link>
      ) : p.finished ? (
        <Link to={`/exam/${course.id}`} className="btn-secondary btn-sm">
          <ClipboardList size={16} /> Exam
        </Link>
      ) : (
        <Link to={`/courses/${course.id}/learn/${p.nextLesson.id}`} className="btn-primary btn-sm">
          <PlayCircle size={16} /> {p.done ? 'Continue' : 'Start'}
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user, certificates, openSignIn } = useApp();

  if (!user) {
    return (
      <div className="container narrow-sm center">
        <div className="glass-panel pad-lg">
          <h1>Your dashboard</h1>
          <p className="muted">Sign in to see your progress and certificates.</p>
          <button className="btn-primary" onClick={openSignIn}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const email = user.email.toLowerCase();
  const mine = certificates.filter(c => c.email?.toLowerCase() === email).sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  const valid = mine.filter(c => !c.revoked);
  const heldFor = courseId => valid.find(c => c.courseId === courseId);

  return (
    <div className="container narrow">
      <h1>Welcome back, {user.name.split(' ')[0]}</h1>
      <p className="muted">{user.email}</p>
      <VerifyEmailNotice />

      <h2 className="section-title">
        Certificates obtained <span className="pill">{valid.length}</span>
      </h2>
      {mine.length === 0 ? (
        <div className="glass-panel pad muted">
          No certificates yet. Complete a course's lessons, then take its exam to earn your first certificate.
        </div>
      ) : (
        <div className="cert-list">
          {mine.map(c => (
            <CertificateRow key={c.credId} cert={c} />
          ))}
        </div>
      )}

      <h2 className="section-title">My courses</h2>
      {courses.map(c => (
        <CourseProgressRow key={c.id} course={c} cert={heldFor(c.id)} />
      ))}
    </div>
  );
}
