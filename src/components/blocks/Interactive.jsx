import { CheckCircle2, MousePointerClick } from 'lucide-react';

export default function Interactive({ kind, title, instructions, done, children }) {
  return (
    <section className={`ix ${done ? 'ix-done' : ''}`}>
      <header className="ix-head">
        <span className="ix-kind">
          <MousePointerClick size={14} /> {kind}
        </span>
        {done && (
          <span className="ix-status">
            <CheckCircle2 size={16} /> Completed
          </span>
        )}
      </header>
      {title && <h3 className="ix-title">{title}</h3>}
      {instructions && <p className="ix-instructions">{instructions}</p>}
      {children}
    </section>
  );
}
