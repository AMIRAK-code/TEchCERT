import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

// When the env vars are missing the app runs in local mode (localStorage only).
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
export const MODE = supabase ? 'cloud' : 'local';

// ---- mapping between DB rows and the app's shapes ----
const toCert = row =>
  row && {
    credId: row.cred_id,
    courseId: row.course_id,
    name: row.holder_name,
    email: row.email,
    issuedAt: row.issued_at,
    score: row.score,
    method: row.method,
    revoked: row.revoked,
  };

export async function loadAccount(user) {
  const [profile, progress, attempts, certs] = await Promise.all([
    supabase.from('profiles').select('full_name, email, role').eq('id', user.id).single(),
    supabase.from('lesson_progress').select('course_id, lesson_id').eq('user_id', user.id),
    // explicit user filter: admins can read everyone's attempts under RLS
    supabase.from('exam_attempts').select('course_id, score, total, passed, created_at').eq('user_id', user.id).order('created_at'),
    supabase.from('certificates').select('*').eq('user_id', user.id),
  ]);
  for (const r of [profile, progress, attempts, certs]) if (r.error) throw r.error;

  const prog = {};
  for (const r of progress.data) (prog[r.course_id] ??= { completed: [] }).completed.push(r.lesson_id);
  const att = {};
  for (const r of attempts.data) (att[r.course_id] ??= []).push({ date: r.created_at, score: r.score, total: r.total, passed: r.passed });

  return {
    user: { id: user.id, name: profile.data.full_name || user.email, email: profile.data.email, role: profile.data.role },
    progress: prog,
    attempts: att,
    certificates: certs.data.map(toCert),
  };
}

export async function sendMagicLink(name, email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { data: { full_name: name }, emailRedirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
}

export async function saveLesson(courseId, lessonId) {
  const { error } = await supabase.from('lesson_progress').upsert({ course_id: courseId, lesson_id: lessonId }, { onConflict: 'user_id,course_id,lesson_id' });
  if (error) console.error('saveLesson', error);
}

export async function clearCourse(courseId) {
  const { error } = await supabase.from('lesson_progress').delete().eq('course_id', courseId);
  if (error) console.error('clearCourse', error);
}

// Server records the attempt and, if it passes the server-side rules, issues the certificate.
export async function submitExam(courseId, score, total) {
  const { data, error } = await supabase.rpc('submit_exam', { p_course_id: courseId, p_score: score, p_total: total });
  if (error) throw error;
  return { passed: data.passed, cert: toCert(data.certificate) };
}

export async function lookupCertificate(credId) {
  const { data, error } = await supabase.rpc('verify_certificate', { p_cred_id: credId });
  if (error) throw error;
  return toCert(data?.[0]);
}

export async function adminListCertificates() {
  const { data, error } = await supabase.from('certificates').select('*').order('issued_at', { ascending: false });
  if (error) throw error;
  return data.map(toCert);
}

export async function adminIssueCertificate(email, name, courseId) {
  const { data, error } = await supabase.rpc('admin_issue_certificate', { p_email: email, p_name: name, p_course_id: courseId });
  if (error) throw error;
  return toCert(data);
}

export async function adminSetRevoked(credId, revoked) {
  const { error } = await supabase.from('certificates').update({ revoked }).eq('cred_id', credId);
  if (error) throw error;
}
