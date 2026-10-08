import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { makeCredentialId } from '../lib/credential';
import { ISSUED_CERTIFICATES, findStaff } from '../data/registry';
import {
  MODE,
  clearCourse,
  loadAccount,
  markEmailVerified,
  saveLesson,
  sendMagicLink,
  sendPasswordReset,
  sendVerificationLink,
  signInWithPassword,
  signUpWithPassword,
  submitExam,
  supabase,
  updatePassword,
} from '../lib/supabase';

// Two storage modes (see lib/supabase.js):
//   cloud — Supabase configured: magic-link auth, progress & certificates in Postgres.
//   local — no env vars: everything lives in this browser's localStorage.

const STORAGE_KEY = 'techcert:v1';

const emptyState = {
  user: null, // { id?, name, email, role, emailVerified? }
  progress: {}, // { [courseId]: { completed: [lessonId], lastLesson } }
  attempts: {}, // { [courseId]: [{ date, score, total, passed }] }
  certificates: [], // [{ credId, courseId, name, email, issuedAt, score, method }]
  purchases: [], // cloud only: [{ courseId, status, date }]
};

function loadLocal() {
  if (MODE === 'cloud') return emptyState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
}

function mergeCerts(own) {
  const seen = new Set(own.map(c => c.credId));
  return [...own, ...ISSUED_CERTIFICATES.filter(c => !seen.has(c.credId))];
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(loadLocal);
  const [signInOpen, setSignInOpen] = useState(false);
  const [authReady, setAuthReady] = useState(MODE === 'local');
  // true after opening a password-reset link: the sign-in modal asks for a new password
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // local mode: persist to localStorage
  useEffect(() => {
    if (MODE !== 'local') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable (private mode) – app still works for the session
    }
  }, [state]);

  // cloud mode: follow the Supabase session
  useEffect(() => {
    if (MODE !== 'cloud') return;
    let cancelled = false;
    const sync = async session => {
      if (!session) {
        if (!cancelled) setState(emptyState);
      } else {
        try {
          // a session opened from an emailed link proves the address (checked server-side)
          await markEmailVerified();
          const account = await loadAccount(session.user);
          if (!cancelled) setState(s => ({ ...account, progress: mergeLastLesson(account.progress, s.progress) }));
        } catch (err) {
          console.error('Failed to load account', err);
        }
      }
      if (!cancelled) setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data }) => sync(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setSignInOpen(true);
      }
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY') sync(session);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Local mode only: name + email, stored in this browser.
  const signIn = useCallback(async (name, email) => {
    const staff = findStaff(email);
    const user = staff
      ? { name: staff.name, email: staff.email, role: staff.role }
      : { name: name.trim(), email: email.trim().toLowerCase(), role: 'learner' };
    setState(s => ({ ...s, user }));
    setSignInOpen(false);
    return 'signed-in';
  }, []);

  // ---- cloud accounts (email + password). Each returns once the request succeeded;
  // SIGNED_IN from onAuthStateChange loads the account.
  const auth = useMemo(
    () => ({
      signUp: async (name, email, password) => {
        const result = await signUpWithPassword(name.trim(), email.trim().toLowerCase(), password);
        if (result === 'signed-in') setSignInOpen(false);
        return result;
      },
      signInPassword: async (email, password) => {
        await signInWithPassword(email.trim().toLowerCase(), password);
        setSignInOpen(false);
      },
      sendSignInLink: email => sendMagicLink(email.trim().toLowerCase()),
      resetPassword: email => sendPasswordReset(email.trim().toLowerCase()),
      setNewPassword: async password => {
        await updatePassword(password);
        setPasswordRecovery(false);
        setSignInOpen(false);
      },
    }),
    [],
  );

  const sendVerification = useCallback(() => sendVerificationLink(state.user.email), [state.user]);

  // Reload the account from the server (e.g. after a purchase completes).
  const refreshAccount = useCallback(async () => {
    if (MODE !== 'cloud') return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const account = await loadAccount(data.session.user);
    setState(s => ({ ...account, progress: mergeLastLesson(account.progress, s.progress) }));
  }, []);

  const signOut = useCallback(async () => {
    if (MODE === 'cloud') await supabase.auth.signOut();
    setState(s => (MODE === 'cloud' ? emptyState : { ...s, user: null }));
  }, []);

  const completeLesson = useCallback((courseId, lessonId) => {
    setState(s => {
      const p = s.progress[courseId] || { completed: [] };
      if (p.completed.includes(lessonId)) return s;
      return {
        ...s,
        progress: { ...s.progress, [courseId]: { ...p, completed: [...p.completed, lessonId] } },
      };
    });
    if (MODE === 'cloud' && state.user) saveLesson(courseId, lessonId);
  }, [state.user]);

  const visitLesson = useCallback((courseId, lessonId) => {
    setState(s => {
      const p = s.progress[courseId] || { completed: [] };
      if (p.lastLesson === lessonId) return s;
      return { ...s, progress: { ...s.progress, [courseId]: { ...p, lastLesson: lessonId } } };
    });
  }, []);

  const resetCourse = useCallback(courseId => {
    setState(s => {
      const progress = { ...s.progress };
      delete progress[courseId];
      return { ...s, progress };
    });
    if (MODE === 'cloud' && state.user) clearCourse(courseId);
  }, [state.user]);

  // Records an exam attempt; resolves to the certificate when one is issued (or already held).
  const recordAttempt = useCallback(
    async (courseId, score, total, passed) => {
      const date = new Date().toISOString();
      const attempt = { date, score, total, passed };
      const { user } = state;

      if (MODE === 'cloud') {
        const res = await submitExam(courseId, score, total);
        setState(s => ({
          ...s,
          attempts: { ...s.attempts, [courseId]: [...(s.attempts[courseId] || []), { ...attempt, passed: res.passed }] },
          certificates: res.cert && !s.certificates.some(c => c.credId === res.cert.credId) ? [...s.certificates, res.cert] : s.certificates,
        }));
        return res.cert;
      }

      let cert = null;
      let isNew = false;
      if (passed && user) {
        cert = mergeCerts(state.certificates).find(c => c.courseId === courseId && c.email === user.email) || null;
        if (!cert) {
          isNew = true;
          cert = {
            credId: makeCredentialId(user.name, courseId, date),
            courseId,
            name: user.name,
            email: user.email,
            issuedAt: date,
            score: Math.round((score / total) * 100),
            method: 'exam',
          };
        }
      }
      setState(s => ({
        ...s,
        attempts: { ...s.attempts, [courseId]: [...(s.attempts[courseId] || []), attempt] },
        certificates: isNew ? [...s.certificates, cert] : s.certificates,
      }));
      return cert;
    },
    [state],
  );

  const value = useMemo(
    () => ({
      ...state,
      mode: MODE,
      authReady,
      // registry certificates are visible to everyone (public verification)
      certificates: mergeCerts(state.certificates),
      isAdmin: state.user?.role === 'admin',
      signIn,
      ...auth,
      sendVerification,
      refreshAccount,
      passwordRecovery,
      signOut,
      completeLesson,
      visitLesson,
      resetCourse,
      recordAttempt,
      signInOpen,
      openSignIn: () => setSignInOpen(true),
      closeSignIn: () => setSignInOpen(false),
    }),
    [state, authReady, signIn, auth, sendVerification, refreshAccount, passwordRecovery, signOut, completeLesson, visitLesson, resetCourse, recordAttempt, signInOpen],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function mergeLastLesson(remote, local) {
  const out = { ...remote };
  for (const [courseId, p] of Object.entries(local)) {
    if (p.lastLesson) out[courseId] = { completed: [], ...out[courseId], lastLesson: p.lastLesson };
  }
  return out;
}

// eslint-disable-next-line react/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

// eslint-disable-next-line react/only-export-components
export function useCourseProgress(course) {
  const { progress } = useApp();
  const completed = progress[course.id]?.completed || [];
  const allLessons = course.modules.flatMap(m => m.lessons);
  const done = allLessons.filter(l => completed.includes(l.id)).length;
  return {
    completed,
    lastLesson: progress[course.id]?.lastLesson,
    done,
    total: allLessons.length,
    percent: allLessons.length ? Math.round((done / allLessons.length) * 100) : 0,
    finished: done === allLessons.length,
    nextLesson: allLessons.find(l => !completed.includes(l.id)) || allLessons[0],
  };
}
