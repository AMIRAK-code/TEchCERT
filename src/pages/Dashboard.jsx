import { Link } from 'react-router-dom';
import { BadgeCheck, ClipboardList, PlayCircle } from 'lucide-react';
import { courses, getCourse } from '../data/courses';
import { useApp, useCourseProgress } from '../store/AppStore';
import CourseIcon, { ProgressBar } from '../components/CourseIcon';

function CourseProgressRow({ course }) {
  const { attempts } = useApp();
  const p = useCourseProgress(course);
  const tries = attempts[course.id] || [];
  const last = tries[tries.length - 1];
  return (
    <div className="glass-panel dash-row">
      <CourseIcon name={course.icon} size={24} />
      <div className="grow">
        <h3>{course.title}</h3>
        <ProgressBar percent={p.percent} label={`${p.done}/${p.total} lessons`} />
        {last && (
          <p className="muted small">
            Last exam: {Math.round((last.score / last.total) * 100)}% ({last.passed ? 'passed' : 'not passed'}) · {tries.length} attempt{tries.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
      {p.finished ? (
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

  const mine = certificates.filter(c => c.email === user.email);

  return (
    <div className="container narrow">
      <h1>Welcome back, {user.name.split(' ')[0]}</h1>
      <p className="muted">{user.email}</p>

      <h2 className="section-title">My certificates</h2>
      {mine.length === 0 ? (
        <div className="glass-panel pad muted">No certificates yet. Finish a course and pass its exam to earn one.</div>
      ) : (
        <div className="card-grid small">
          {mine.map(c => (
            <Link key={c.credId} to={`/certificate/${c.credId}`} className="glass-panel cert-tile">
              <BadgeCheck size={28} color="var(--success)" />
              <strong>{getCourse(c.courseId)?.title}</strong>
              <span className="muted small">
                {new Date(c.issuedAt).toLocaleDateString()} · {c.method === 'admin' ? 'admin-issued' : `${c.score}%`} · {c.credId}
              </span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="section-title">My courses</h2>
      {courses.map(c => (
        <CourseProgressRow key={c.id} course={c} />
      ))}
    </div>
  );
}
