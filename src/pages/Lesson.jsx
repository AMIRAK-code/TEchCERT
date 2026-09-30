import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, ClipboardList, Lock, PanelLeft } from 'lucide-react';
import { allLessons, getCourse, isActivity } from '../data/courses';
import { useApp, useCourseProgress } from '../store/AppStore';
import BlockRenderer from '../components/blocks/BlockRenderer';
import { ProgressBar } from '../components/CourseIcon';

export default function Lesson() {
  const { id, lessonId } = useParams();
  const course = getCourse(id);
  const lesson = course && allLessons(course).find(l => l.id === lessonId);
  if (!course) return <Navigate to="/" replace />;
  if (!lesson) return <Navigate to={`/courses/${id}`} replace />;
  // key forces a fresh player (and fresh exercise state) per lesson
  return <LessonPlayer key={lesson.id} course={course} lesson={lesson} />;
}

function LessonPlayer({ course, lesson }) {
  const navigate = useNavigate();
  const { completeLesson, visitLesson } = useApp();
  const progress = useCourseProgress(course);
  const lessons = allLessons(course);
  const index = lessons.findIndex(l => l.id === lesson.id);
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const alreadyDone = progress.completed.includes(lesson.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activityIdx = lesson.blocks.flatMap((b, i) => (isActivity(b) ? [i] : []));
  const [doneBlocks, setDoneBlocks] = useState(() => new Set(alreadyDone ? activityIdx : []));
  const remaining = activityIdx.filter(i => !doneBlocks.has(i)).length;
  const canComplete = remaining === 0;

  useEffect(() => {
    visitLesson(course.id, lesson.id);
    window.scrollTo(0, 0);
  }, [course.id, lesson.id, visitLesson]);

  const markBlock = useCallback(i => setDoneBlocks(s => (s.has(i) ? s : new Set(s).add(i))), []);

  const finish = () => {
    completeLesson(course.id, lesson.id);
    navigate(next ? `/courses/${course.id}/learn/${next.id}` : `/courses/${course.id}`);
  };

  const finishedAfterThis = progress.done + (alreadyDone ? 0 : 1) === progress.total;

  return (
    <div className="lesson-layout">
      <aside className={`lesson-sidebar glass-panel ${sidebarOpen ? 'open' : ''}`}>
        <Link to={`/courses/${course.id}`} className="back-link">
          ← {course.title}
        </Link>
        <ProgressBar percent={progress.percent} label="Progress" />
        {course.modules.map((m, mi) => (
          <div key={m.id} className="side-module">
            <div className="side-module-title">
              {mi + 1}. {m.title}
            </div>
            {m.lessons.map((l, li) => {
              const isDone = progress.completed.includes(l.id);
              return (
                <Link
                  key={l.id}
                  to={`/courses/${course.id}/learn/${l.id}`}
                  className={`side-lesson ${l.id === lesson.id ? 'current' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="side-num">
                    {mi + 1}.{li + 1}
                  </span>
                  <span className="grow">{l.title}</span>
                  {isDone ? <CheckCircle2 size={15} color="var(--success)" /> : <Circle size={15} />}
                </Link>
              );
            })}
          </div>
        ))}
        <Link to={`/exam/${course.id}`} className={`side-lesson exam-link ${progress.finished ? '' : 'is-locked'}`}>
          {progress.finished ? <ClipboardList size={16} /> : <Lock size={16} />} Certification exam
        </Link>
      </aside>

      <article className="lesson-main">
        <button className="btn-ghost sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <PanelLeft size={18} /> Lessons
        </button>
        <div className="lesson-header">
          <span className="eyebrow">
            {lesson.moduleTitle} · Lesson {index + 1} of {lessons.length} · {lesson.minutes} min
          </span>
          <h1>{lesson.title}</h1>
        </div>

        {lesson.blocks.map((b, i) => (
          <BlockRenderer key={i} block={b} done={doneBlocks.has(i)} onComplete={() => markBlock(i)} />
        ))}

        <div className="lesson-footer glass-panel">
          <div>
            {canComplete ? (
              <span className="ok-text">
                <CheckCircle2 size={18} /> All {activityIdx.length} activities completed
              </span>
            ) : (
              <span className="muted">
                {remaining} of {activityIdx.length} activities left — complete them to finish this lesson.
              </span>
            )}
          </div>
          <div className="btn-row">
            {prev && (
              <Link to={`/courses/${course.id}/learn/${prev.id}`} className="btn-secondary">
                <ArrowLeft size={18} /> Previous
              </Link>
            )}
            <button className="btn-primary" disabled={!canComplete} onClick={finish}>
              {next ? (
                <>
                  {alreadyDone ? 'Next lesson' : 'Complete & continue'} <ArrowRight size={18} />
                </>
              ) : (
                <>Finish course</>
              )}
            </button>
          </div>
          {!next && canComplete && finishedAfterThis && (
            <p className="muted small">After finishing, the certification exam unlocks on the course page.</p>
          )}
        </div>
      </article>
    </div>
  );
}
