import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Award, BadgeCheck, Check, ClipboardList, CreditCard, Lock, RotateCcw, Timer, X } from 'lucide-react';
import { getCourse } from '../data/courses';
import { useApp, useCourseProgress } from '../store/AppStore';
import { shuffle } from '../lib/shuffle';
import { Rich } from '../lib/RichText';
import { useExamPrice } from '../lib/useExamPrice';
import { formatPrice, startCheckout } from '../lib/supabase';

function drawExam(course) {
  return shuffle(course.examQuestions)
    .slice(0, course.examSize)
    .map(q => {
      const order = shuffle(q.options.map((_, i) => i));
      return { ...q, options: order.map(i => q.options[i]), a: order.indexOf(q.a) };
    });
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Exam() {
  const { id } = useParams();
  const course = getCourse(id);
  if (!course) return <Navigate to="/" replace />;
  return <ExamFlow course={course} />;
}

function ExamFlow({ course }) {
  const { user, openSignIn, certificates, mode } = useApp();
  const progress = useCourseProgress(course);
  const [phase, setPhase] = useState('intro'); // intro | running | result
  const [questions, setQuestions] = useState([]);
  const [result, setResult] = useState(null);
  const existing = user && certificates.find(c => c.courseId === course.id && c.email === user.email);
  const { price, error: priceError, refresh: refreshPrice } = useExamPrice(course.id, user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const checkout = searchParams.get('checkout'); // success | cancel (back from Stripe)
  const [confirming, setConfirming] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  // Back from Stripe: the webhook records the purchase within seconds; poll until access shows up.
  useEffect(() => {
    if (checkout !== 'success' || !user) return;
    let cancelled = false;
    (async () => {
      setConfirming(true);
      for (let i = 0; i < 15 && !cancelled; i++) {
        const p = await refreshPrice();
        if (p?.has_access) break;
        await new Promise(r => setTimeout(r, 2000));
      }
      if (!cancelled) {
        setConfirming(false);
        setSearchParams({}, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkout, user, refreshPrice, setSearchParams]);

  const buy = async () => {
    setBuying(true);
    setBuyError('');
    try {
      await startCheckout(course.id);
    } catch (err) {
      setBuyError(err.message);
      setBuying(false);
    }
  };

  const start = () => {
    setQuestions(drawExam(course));
    setResult(null);
    setPhase('running');
  };

  if (phase === 'running') {
    return (
      <ExamRunner
        course={course}
        questions={questions}
        onFinish={r => {
          setResult(r);
          setPhase('result');
        }}
      />
    );
  }
  if (phase === 'result') return <ExamResult course={course} questions={questions} result={result} onRetry={start} />;

  const locked = !progress.finished;

  return (
    <div className="container narrow-sm">
      <Link to={`/courses/${course.id}`} className="back-link">
        ← {course.title}
      </Link>
      <div className="glass-panel pad-lg center">
        <ClipboardList size={40} color="var(--accent-color)" />
        <h1>{course.title} Exam</h1>
        <div className="exam-rules">
          <div>
            <strong>{course.examSize}</strong>
            <span>questions</span>
          </div>
          <div>
            <strong>{course.examMinutes} min</strong>
            <span>time limit</span>
          </div>
          <div>
            <strong>{course.passMark}%</strong>
            <span>to pass</span>
          </div>
        </div>
        <p className="muted">Questions and answer order are randomized each attempt. You can move between questions and change answers before submitting. The exam auto-submits when time runs out.</p>

        {existing && (
          <div className="feedback good">
            <BadgeCheck size={18} />
            <div>
              You are already certified. <Link to={`/certificate/${existing.credId}`}>View your certificate</Link>
            </div>
          </div>
        )}

        {locked ? (
          <>
            <div className="feedback bad">
              <Lock size={18} />
              <div>
                Complete all lessons first ({progress.done}/{progress.total} done).
              </div>
            </div>
            <Link to={`/courses/${course.id}/learn/${progress.nextLesson.id}`} className="btn-primary">
              Continue learning
            </Link>
          </>
        ) : !user ? (
          <>
            <p className="muted">Sign in so we can put your name on the certificate.</p>
            <button className="btn-primary" onClick={openSignIn}>
              Sign in to start
            </button>
          </>
        ) : confirming ? (
          <p className="muted">Confirming your payment…</p>
        ) : price && !price.has_access ? (
          <>
            {checkout === 'cancel' && <p className="muted small">Checkout was cancelled — you have not been charged.</p>}
            <div className="price-tag">
              {price.discounted && <s className="muted">{formatPrice(price.base_cents, price.currency)}</s>}
              <strong>{formatPrice(price.price_cents, price.currency)}</strong>
              <span className="muted small">{price.discounted ? 'returning-learner price, 20% off · ' : ''}incl. VAT · one-time</span>
            </div>
            <p className="muted small">Unlocks the exam and your verifiable certificate. Retakes are included.</p>
            <button className="btn-primary" onClick={buy} disabled={buying}>
              <CreditCard size={18} /> {buying ? 'Opening checkout…' : 'Buy exam & certificate'}
            </button>
            {buyError && (
              <div className="feedback bad">
                <X size={18} />
                <div>{buyError}</div>
              </div>
            )}
          </>
        ) : priceError ? (
          <div className="feedback bad">
            <X size={18} />
            <div>{priceError}</div>
          </div>
        ) : mode === 'cloud' && !price ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <p className="muted small">
              Certificate will be issued to <strong>{user.name}</strong>.
            </p>
            <button className="btn-primary" onClick={start}>
              Start exam
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ExamRunner({ course, questions, onFinish }) {
  const { recordAttempt } = useApp();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(course.examMinutes * 60);
  const q = questions[current];
  const answered = Object.keys(answers).length;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const score = questions.reduce((s, qq, i) => s + (answers[i] === qq.a ? 1 : 0), 0);
    const passed = (score / questions.length) * 100 >= course.passMark;
    try {
      const cert = await recordAttempt(course.id, score, questions.length, passed);
      onFinish({ score, passed, answers, cert });
    } catch (err) {
      setSubmitError(err.message || 'Could not submit the exam. Check your connection and try again.');
      setSubmitting(false);
    }
  }, [answers, questions, course, recordAttempt, onFinish, submitting]);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // auto-submit when the external clock runs out
    // eslint-disable-next-line react/set-state-in-effect
    if (secondsLeft === 0) submit();
  }, [secondsLeft, submit]);

  const trySubmit = () => {
    const unanswered = questions.length - answered;
    if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`)) return;
    submit();
  };

  return (
    <div className="container narrow-sm">
      <div className="exam-top">
        <div>
          <h2>{course.title} Exam</h2>
          <p className="muted">
            Question {current + 1} of {questions.length} · {answered} answered
          </p>
        </div>
        <div className={`timer ${secondsLeft < 120 ? 'low' : ''}`}>
          <Timer size={18} /> {fmt(Math.max(0, secondsLeft))}
        </div>
      </div>

      <div className="q-palette">
        {questions.map((_, i) => (
          <button key={i} className={`${i === current ? 'current' : ''} ${answers[i] !== undefined ? 'answered' : ''}`} onClick={() => setCurrent(i)}>
            {i + 1}
          </button>
        ))}
      </div>

      <div className="glass-panel pad-lg">
        <h3 className="q-text">
          <Rich text={q.q} />
        </h3>
        <div className="options">
          {q.options.map((opt, i) => (
            <button key={i} className={`option ${answers[current] === i ? 'selected' : ''}`} onClick={() => setAnswers({ ...answers, [current]: i })}>
              <span className="option-letter">{String.fromCharCode(65 + i)}</span>
              <Rich text={opt} />
            </button>
          ))}
        </div>
        <div className="btn-row between">
          <button className="btn-secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
            Previous
          </button>
          {current < questions.length - 1 ? (
            <button className="btn-primary" onClick={() => setCurrent(current + 1)}>
              Next question
            </button>
          ) : (
            <button className="btn-primary" onClick={trySubmit}>
              Submit exam
            </button>
          )}
        </div>
      </div>
      {submitError && (
        <div className="feedback bad">
          <X size={18} />
          <div>{submitError}</div>
        </div>
      )}
      {submitting && <p className="muted center small" style={{ marginTop: 12 }}>Submitting…</p>}
      {current < questions.length - 1 && answered === questions.length && (
        <div className="center" style={{ marginTop: 16 }}>
          <button className="btn-primary" onClick={trySubmit}>
            All answered — submit exam
          </button>
        </div>
      )}
    </div>
  );
}

function ExamResult({ course, questions, result, onRetry }) {
  const pct = Math.round((result.score / questions.length) * 100);
  return (
    <div className="container narrow-sm">
      <div className="glass-panel pad-lg center">
        {result.passed ? <Award size={48} color="var(--success)" /> : <RotateCcw size={48} color="var(--warning)" />}
        <h1>{result.passed ? 'You passed!' : 'Not quite there yet'}</h1>
        <div className={`score-ring ${result.passed ? 'pass' : 'fail'}`} style={{ '--pct': pct }}>
          <span>{pct}%</span>
        </div>
        <p className="muted">
          {result.score} of {questions.length} correct · pass mark {course.passMark}%
        </p>
        <div className="btn-row center">
          {result.passed && result.cert ? (
            <Link to={`/certificate/${result.cert.credId}`} className="btn-primary">
              <BadgeCheck size={20} /> View your certificate
            </Link>
          ) : (
            <button className="btn-primary" onClick={onRetry}>
              <RotateCcw size={18} /> Retake exam
            </button>
          )}
          <Link to={`/courses/${course.id}`} className="btn-secondary">
            Back to course
          </Link>
        </div>
        {!result.passed && <p className="muted small">Tip: review the explanations below, revisit the related lessons, then retake — you'll get a fresh set of questions.</p>}
      </div>

      <h2 className="section-title">Answer review</h2>
      {questions.map((q, i) => {
        const ok = result.answers[i] === q.a;
        return (
          <div key={i} className={`glass-panel review ${ok ? 'ok' : 'nok'}`}>
            <div className="review-head">
              {ok ? <Check size={18} color="var(--success)" /> : <X size={18} color="var(--danger)" />}
              <strong>
                {i + 1}. <Rich text={q.q} />
              </strong>
            </div>
            {!ok && (
              <p className="small">
                Your answer: <span className="bad-text">{result.answers[i] !== undefined ? <Rich text={q.options[result.answers[i]]} /> : 'No answer'}</span>
              </p>
            )}
            <p className="small">
              Correct answer:{' '}
              <span className="ok-text">
                <Rich text={q.options[q.a]} />
              </span>
            </p>
            {q.explain && (
              <p className="muted small">
                <Rich text={q.explain} />
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
