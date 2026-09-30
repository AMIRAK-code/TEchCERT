import { BrainCircuit, GraduationCap, ShieldAlert } from 'lucide-react';

const ICONS = { BrainCircuit, ShieldAlert };

export default function CourseIcon({ name, size = 32 }) {
  const Icon = ICONS[name] || GraduationCap;
  return (
    <div className="course-icon">
      <Icon size={size} color="var(--accent-color)" />
    </div>
  );
}

export function ProgressBar({ percent, label }) {
  return (
    <div className="progress">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div className="meter">
        <div className="meter-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
