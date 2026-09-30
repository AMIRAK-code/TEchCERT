import { Link, Route, Routes } from 'react-router-dom';
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

const YEAR = new Date().getFullYear();

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
