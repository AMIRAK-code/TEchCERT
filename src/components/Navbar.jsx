import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Award, LayoutDashboard, LogOut, Menu, ShieldCheck, User, X } from 'lucide-react';
import { useApp } from '../store/AppStore';
import { BRAND } from '../config';

export default function Navbar() {
  const { user, isAdmin, openSignIn, signOut } = useApp();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="nav-brand" onClick={close}>
          <span className="brand-mark">
            <Award size={18} />
          </span>
          <span>{BRAND}</span>
        </Link>
        <button className="nav-toggle" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/" end onClick={close}>
            Courses
          </NavLink>
          <NavLink to="/verify" onClick={close}>
            Verify
          </NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" onClick={close}>
                <LayoutDashboard size={16} /> Dashboard
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" onClick={close}>
                  <ShieldCheck size={16} /> Admin
                </NavLink>
              )}
              <span className="nav-user" title={user.email}>
                <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="nav-user-name">{user.name.split(' ')[0]}</span>
              </span>
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  signOut();
                  close();
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <button
              className="btn-secondary btn-sm"
              onClick={() => {
                openSignIn();
                close();
              }}
            >
              <User size={18} /> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
