import { Link, Navigate, useParams } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, Circle, ClipboardList, Clock, Lock, PlayCircle, RotateCcw, Target } from 'lucide-react';
import { activityCount, getCourse, totalMinutes } from '../data/courses';
import { useApp, useCourseProgress } from '../store/AppStore';
import CourseIcon, { ProgressBar } from '../components/CourseIcon';
import { useExamPrice } from '../lib/useExamPrice';
import { formatPrice } from '../lib/supabase';

export default function Course() {
  const { id } = useParams();
  const course = getCourse(id);
  const { user, certificates, attempts, resetCourse } = useApp();
  if (!course) return <Navigate to="/" replace />;
  return <CourseView course={course} user={user} certificates={certificates} attempts={attempts[course.id] || []} resetCourse={resetCourse} />;
}

function CourseView({ course, user, certificates, attempts, resetCourse }) {
  const p = useCourseProgress(course);
  const cert = user && certificates.find(c => c.courseId === course.id && c.email === user.email);
  const best = attempts.reduce((b, a) => Math.max(b, Math.round((a.score / a.total) * 100)), 0);
  const startLesson = p.done === 0 ? course.modules[0].lessons[0] : p.nextLesson;
  const { price } = useExamPrice(course.id, user?.id);

  return (
    <div className="container narrow">
      <Link to="/" className="back-link">
        ← Back to courses
      </Link>

      <div className="glass-panel course-hero">
        <div className="course-hero-head">
          <CourseIcon name={course.icon} size={22} />
          <span className="code-label">Certification track</span>
        </div>
        <h1>{course.title}</h1>
        <p className="lead">{course.description}</p>
        <dl className="spec spec-row">
          <div>
            <dt>Level</dt>
            <dd>{course.level}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{course.duration}</dd>
          </div>
          <div>
            <dt>
              <Clock size={12} /> Lessons
            </dt>
            <dd>{totalMinutes(course)} min of lessons</dd>
          </div>
          <div>
            <dt>Exam</dt>
            <dd>
              {course.examSize} Q · {course.passMark}% pass
            </dd>
          </div>
          {price && (
            <div>
              <dt>Certificate</dt>
              <dd>
                {price.has_access ? (
                  'Unlocked'
                ) : price.discounted ? (
                  <>
                    <s className="muted">{formatPrice(price.base_cents, price.currency)}</s> {formatPrice(price.price_cents, price.currency)}
                  </>
                ) : (
                  formatPrice(price.price_cents, price.currency)
                )}
              </dd>
            </div>
          )}
        </dl>

        <ProgressBar percent={p.percent} label={`Course progress · ${p.done}/${p.total} lessons`} />

        <div className="btn-row">
          <Link to={`/courses/${course.id}/learn/${startLesson.id}`} className="btn-primary">
            <PlayCircle size={20} /> {p.done === 0 ? 'Start course' : p.finished ? 'Review lessons' : 'Continue learning'}
          </Link>
          {cert ? (
            <Link to={`/certificate/${cert.credId}`} className="btn-secondary">
              <BadgeCheck size={20} /> View certificate
            </Link>
          ) : (
            <Link to={`/exam/${course.id}`} className={`btn-secondary ${p.finished ? '' : 'is-locked'}`}>
              {p.finished ? <ClipboardList size={20} /> : <Lock size={18} />} Take exam to certify
            </Link>
          )}
          {p.done > 0 && (
            <button
              className="btn-ghost"
              onClick={() => {
                if (confirm('Reset your lesson progress for this course? Certificates are kept.')) resetCourse(course.id);
              }}
            >
              <RotateCcw size={16} /> Reset progress
            </button>
          )}
        </div>
        {!p.finished && !cert && (
          <p className="muted small">
            Lessons are free. Complete them all to unlock the exam{price && !price.has_access ? ` — exam & certificate ${formatPrice(price.price_cents, price.currency)} incl. VAT` : ''}.
          </p>
        )}
        {attempts.length > 0 && (
          <p className="muted small">
            Exam attempts: {attempts.length} · Best score: {best}%
          </p>
        )}
      </div>

      <h2 className="section-title">
        <Target size={22} /> What you'll be able to do
      </h2>
      <div className="glass-panel pad outcomes">
        {course.outcomes.map(o => (
          <div key={o} className="outcome-item">
            <CheckCircle2 size={20} color="var(--success)" />
            {o}
          </div>
        ))}
      </div>

      <h2 className="section-title">Syllabus</h2>
      {course.modules.map((m, mi) => (
        <div key={m.id} className="glass-panel module">
          <h3>
            <span className="module-num">{String(mi + 1).padStart(2, '0')}</span>
            <span className="muted">Module {mi + 1}</span> · {m.title}
          </h3>
          <ul className="lesson-rows">
            {m.lessons.map((l, li) => {
              const isDone = p.completed.includes(l.id);
              const activities = activityCount(l);
              return (
                <li key={l.id}>
                  <Link to={`/courses/${course.id}/learn/${l.id}`}>
                    <span className="lesson-num">
                      {mi + 1}.{li + 1}
                    </span>
                    {isDone ? <CheckCircle2 size={18} color="var(--success)" /> : <Circle size={18} color="var(--text-secondary)" />}
                    <span className="grow">{l.title}</span>
                    <span className="muted small">
                      {activities} activities · {l.minutes} min
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="glass-panel module">
        <h3>
          <span className="module-num">EX</span>
          <span className="muted">Final</span> · Certification exam
        </h3>
        <p className="muted">
          {course.examSize} questions drawn from a bank of {course.examQuestions.length} · {course.examMinutes} minutes · pass mark {course.passMark}%
        </p>
      </div>
    </div>
  );
}
