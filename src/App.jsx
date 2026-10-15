import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import SignInModal from './components/SignInModal';
import Home from './pages/Home';
import Course from './pages/Course';
import Lesson from './pages/Lesson';
import Exam from './pages/Exam';
import Certificate from './pages/Certificate';
import Verify from './pages/Verify';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import { BRAND } from './config';
import { MODE } from './lib/supabase';
import { allLessons, getCourse } from './data/courses';

const YEAR = new Date().getFullYear();

// Keeps the tab title in step with client-side navigation. The first load already has the
// right title from the prerendered HTML (scripts/prerender-seo.mjs uses the same format).
function pageTitle(pathname) {
  const [, section, id, , lessonId] = pathname.split('/');
  const course = section === 'courses' && getCourse(id);
  if (course && lessonId) {
    const lesson = allLessons(course).find(l => l.id === lessonId);
    if (lesson) return `${lesson.title} | ${course.title} | ${BRAND}`;
  }
  if (course) return `${course.title} Certification | ${BRAND}`;
  if (section === 'verify') return `Verify a ${BRAND} certificate`;
  return `${BRAND} | AI Certifications in Prompt Engineering, AI Security, SEO & GEO and Marketing`;
}

function usePageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = pageTitle(pathname);
  }, [pathname]);
}

function NotFound() {
  return (
    <div className="container narrow-sm center">
      <div className="glass-panel pad-lg">
        <h1>Page not found</h1>
        <Link to="/" className="btn-primary">
          Back to courses
        </Link>
      </div>
    </div>
  );
}

function App() {
  usePageTitle();
  return (
    <>
      <Navbar />
      <SignInModal />
      <main className="page-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses/:id" element={<Course />} />
          <Route path="/courses/:id/learn/:lessonId" element={<Lesson />} />
          <Route path="/exam/:id" element={<Exam />} />
          <Route path="/certificate/:credId" element={<Certificate />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer no-print">
        <div className="container">© {YEAR} {BRAND} · {MODE === 'cloud' ? 'Progress is synced to your account.' : 'Progress is stored locally in your browser.'}</div>
      </footer>
    </>
  );
}

export default App;
