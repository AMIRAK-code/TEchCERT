import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, BookOpen, FlaskConical, Trophy } from 'lucide-react';
import { courses, allLessons, activityCount } from '../data/courses';
import { useApp, useCourseProgress } from '../store/AppStore';
import CourseIcon, { ProgressBar } from '../components/CourseIcon';

function CourseCard({ course, index }) {
  const { certificates, user } = useApp();
  const p = useCourseProgress(course);
  const cert = user && certificates.find(c => c.courseId === course.id && c.email === user.email);
  const interactiveCount = allLessons(course).reduce((a, l) => a + activityCount(l), 0);

  return (
    <article className="glass-panel course-card">
      <div className="course-card-top">
        <span className="code-label">TRACK {String(index + 1).padStart(2, '0')}</span>
        {cert && (
          <span className="badge badge-success">
            <BadgeCheck size={14} /> Certified
          </span>
        )}
      </div>
      <div className="course-card-title">
        <CourseIcon name={course.icon} size={22} />
        <h3>{course.title}</h3>
      </div>
      <p className="muted grow">{course.description}</p>
      <dl className="spec">
        <div>
          <dt>Level</dt>
          <dd>{course.level}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{course.duration}</dd>
        </div>
        <div>
          <dt>Lessons</dt>
          <dd>{p.total}</dd>
        </div>
        <div>
          <dt>Activities</dt>
          <dd>{interactiveCount}</dd>
        </div>
      </dl>
      {p.done > 0 && <ProgressBar percent={p.percent} label={`${p.done}/${p.total} lessons`} />}
      <Link to={`/courses/${course.id}`} className="btn-secondary full">
        {p.done > 0 ? 'Continue' : 'View course'} <ArrowRight size={18} />
      </Link>
    </article>
  );
}

export default function Home() {
  return (
    <div className="container">
      <header className="hero">
        <span className="code-label">Certification programs / {courses.length} tracks</span>
        <h1>
          Validate Your <span className="gradient-text">AI Skills</span>
        </h1>
        <p className="hero-sub">
          Hands-on courses with simulators, attack labs and exercises — then a proctored-style exam and a verifiable certificate you can add to LinkedIn.
        </p>
        <div className="hero-cta">
          <a href="#courses" className="btn-primary">
            Browse certifications <ArrowRight size={18} />
          </a>
          <Link to="/verify" className="btn-secondary">
            <BadgeCheck size={18} /> Verify a certificate
          </Link>
        </div>
      </header>

      <section className="steps">
        {[
          [BookOpen, 'Learn', 'Short lessons that explain the why, not just the what.'],
          [FlaskConical, 'Practice', 'Interactive labs: tune samplers, build prompts, attack a chatbot.'],
          [Trophy, 'Certify', 'Pass a timed exam (70%+) drawn from a randomized question bank.'],
          [BadgeCheck, 'Share', 'Get a certificate with a verification link and add it to LinkedIn.'],
        ].map(([Icon, title, text], i) => (
          <div key={title} className="step">
            <div className="step-head">
              <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
              <Icon size={18} />
            </div>
            <h3>{title}</h3>
            <p className="muted">{text}</p>
          </div>
        ))}
      </section>

      <h2 id="courses" className="section-title">
        Available Certifications
      </h2>
      <div className="card-grid">
        {courses.map((course, i) => (
          <CourseCard key={course.id} course={course} index={i} />
        ))}
      </div>
    </div>
  );
}
