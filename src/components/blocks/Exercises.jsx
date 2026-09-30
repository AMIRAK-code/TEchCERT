import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, RotateCcw, X } from 'lucide-react';
import Interactive from './Interactive';
import { Rich } from '../../lib/RichText';
import { shuffle } from '../../lib/shuffle';

/* ---------- Knowledge check (single multiple-choice question) ---------- */
export function Quiz({ block, done, onComplete }) {
  const [picked, setPicked] = useState(done ? block.a : null);
  const [checked, setChecked] = useState(done);
  const correct = checked && picked === block.a;
  // display order is shuffled; `i` below is always the original option index
  const order = useMemo(() => shuffle(block.options.map((_, i) => i)), [block.options]);

  const check = () => {
    setChecked(true);
    if (picked === block.a) onComplete();
  };

  return (
    <Interactive kind="Knowledge check" title={<Rich text={block.q} />} done={done}>
      <div className="options">
        {order.map((i, pos) => {
          const opt = block.options[i];
          let cls = 'option';
          if (picked === i) cls += ' selected';
          if (checked && i === block.a && correct) cls += ' correct';
          if (checked && picked === i && !correct) cls += ' wrong';
          return (
            <button
              key={i}
              className={cls}
              disabled={correct}
              onClick={() => {
                setPicked(i);
                setChecked(false);
              }}
            >
              <span className="option-letter">{String.fromCharCode(65 + pos)}</span>
              <Rich text={opt} />
            </button>
          );
        })}
      </div>
      {checked && (
        <div className={`feedback ${correct ? 'good' : 'bad'}`}>
          {correct ? <Check size={18} /> : <X size={18} />}
          <div>
            <strong>{correct ? 'Correct.' : 'Not quite — try again.'}</strong>{' '}
            {correct ? <Rich text={block.explain} /> : block.hint && <Rich text={block.hint} />}
          </div>
        </div>
      )}
      {!correct && (
        <button className="btn-primary btn-sm" disabled={picked === null} onClick={check}>
          Check answer
        </button>
      )}
    </Interactive>
  );
}

/* ---------- Flashcards ---------- */
export function Flashcards({ block, done, onComplete }) {
  const [flipped, setFlipped] = useState(() => new Set());
  const [seen, setSeen] = useState(() => new Set());

  const flip = i => {
    const next = new Set(flipped);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setFlipped(next);
    const nextSeen = new Set(seen).add(i);
    setSeen(nextSeen);
    if (nextSeen.size === block.cards.length && !done) onComplete();
  };

  return (
    <Interactive kind="Flashcards" title={block.title} instructions="Click each card to flip it. Try to recall the answer before you flip." done={done}>
      <div className="flashcards">
        {block.cards.map((c, i) => (
          <button key={i} className={`flashcard ${flipped.has(i) ? 'flipped' : ''}`} onClick={() => flip(i)}>
            <div className="flashcard-inner">
              <div className="flashcard-face front">
                <Rich text={c.front} />
              </div>
              <div className="flashcard-face back">
                <Rich text={c.back} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </Interactive>
  );
}

/* ---------- Put items in the correct order ---------- */
export function Order({ block, done, onComplete }) {
  const initial = useMemo(() => {
    let s = shuffle(block.items.map((text, i) => ({ text, i })));
    // make sure it doesn't start solved
    if (s.every((it, idx) => it.i === idx)) s = [...s.slice(1), s[0]];
    return s;
  }, [block.items]);
  const [items, setItems] = useState(done ? block.items.map((text, i) => ({ text, i })) : initial);
  const [checked, setChecked] = useState(done);
  const solved = items.every((it, idx) => it.i === idx);

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
    setChecked(false);
  };

  const check = () => {
    setChecked(true);
    if (solved) onComplete();
  };

  return (
    <Interactive kind="Sequencing" title={block.title} instructions={block.instructions || 'Use the arrows to put the steps in the right order, then check.'} done={done}>
      <ol className="order-list">
        {items.map((it, idx) => (
          <li key={it.i} className={checked ? (it.i === idx ? 'correct' : 'wrong') : ''}>
            <span className="order-num">{idx + 1}</span>
            <span className="order-text">
              <Rich text={it.text} />
            </span>
            <span className="order-controls">
              <button aria-label="Move up" onClick={() => move(idx, -1)} disabled={idx === 0 || (checked && solved)}>
                <ArrowUp size={16} />
              </button>
              <button aria-label="Move down" onClick={() => move(idx, 1)} disabled={idx === items.length - 1 || (checked && solved)}>
                <ArrowDown size={16} />
              </button>
            </span>
          </li>
        ))}
      </ol>
      {checked && (
        <div className={`feedback ${solved ? 'good' : 'bad'}`}>
          {solved ? <Check size={18} /> : <X size={18} />}
          <div>{solved ? <Rich text={block.explain || 'That is the correct order.'} /> : 'Red steps are out of place. Adjust and check again.'}</div>
        </div>
      )}
      {!(checked && solved) && (
        <button className="btn-primary btn-sm" onClick={check}>
          Check order
        </button>
      )}
    </Interactive>
  );
}

/* ---------- Match pairs ---------- */
export function Match({ block, done, onComplete }) {
  const rights = useMemo(() => shuffle(block.pairs.map((p, i) => ({ text: p.right, i }))), [block.pairs]);
  const [matched, setMatched] = useState(() => new Set(done ? block.pairs.map((_, i) => i) : []));
  const [active, setActive] = useState(null);
  const [wrong, setWrong] = useState(null);

  const pickRight = i => {
    if (active === null || matched.has(i)) return;
    if (i === active) {
      const next = new Set(matched).add(i);
      setMatched(next);
      setActive(null);
      if (next.size === block.pairs.length) onComplete();
    } else {
      setWrong(i);
      setTimeout(() => setWrong(null), 600);
    }
  };

  return (
    <Interactive kind="Matching" title={block.title} instructions={block.instructions || 'Select an item on the left, then its match on the right.'} done={done}>
      <div className="match-grid">
        <div className="match-col">
          {block.pairs.map((p, i) => (
            <button
              key={i}
              className={`match-item ${matched.has(i) ? 'matched' : ''} ${active === i ? 'active' : ''}`}
              disabled={matched.has(i)}
              onClick={() => setActive(i)}
            >
              <Rich text={p.left} />
            </button>
          ))}
        </div>
        <div className="match-col">
          {rights.map(r => (
            <button
              key={r.i}
              className={`match-item right ${matched.has(r.i) ? 'matched' : ''} ${wrong === r.i ? 'shake' : ''}`}
              disabled={matched.has(r.i) || active === null}
              onClick={() => pickRight(r.i)}
            >
              <Rich text={r.text} />
            </button>
          ))}
        </div>
      </div>
      <p className="ix-meta">
        {matched.size} / {block.pairs.length} matched
      </p>
    </Interactive>
  );
}

/* ---------- Sort items into categories ---------- */
export function Classify({ block, done, onComplete }) {
  const items = useMemo(() => shuffle(block.items.map((it, i) => ({ ...it, i }))), [block.items]);
  const [answers, setAnswers] = useState(() => (done ? Object.fromEntries(block.items.map((it, i) => [i, it.cat])) : {}));
  const [checked, setChecked] = useState(done);
  const allAnswered = Object.keys(answers).length === items.length;
  const allCorrect = items.every(it => answers[it.i] === it.cat);

  const check = () => {
    setChecked(true);
    if (allCorrect) onComplete();
  };

  return (
    <Interactive kind="Sorting" title={block.title} instructions={block.instructions || 'Assign each item to the correct category.'} done={done}>
      <div className="classify-list">
        {items.map(it => {
          const state = checked ? (answers[it.i] === it.cat ? 'correct' : 'wrong') : '';
          return (
            <div key={it.i} className={`classify-row ${state}`}>
              <div className="classify-text">
                <Rich text={it.text} />
                {checked && state === 'wrong' && it.why && (
                  <div className="classify-why">
                    <Rich text={it.why} />
                  </div>
                )}
              </div>
              <div className="classify-cats">
                {block.categories.map(cat => (
                  <button
                    key={cat}
                    className={`chip ${answers[it.i] === cat ? 'chip-on' : ''}`}
                    disabled={checked && allCorrect}
                    onClick={() => {
                      setAnswers({ ...answers, [it.i]: cat });
                      setChecked(false);
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {checked && (
        <div className={`feedback ${allCorrect ? 'good' : 'bad'}`}>
          {allCorrect ? <Check size={18} /> : <X size={18} />}
          <div>{allCorrect ? <Rich text={block.explain || 'All sorted correctly.'} /> : 'Some items are in the wrong category (marked red). Fix them and check again.'}</div>
        </div>
      )}
      {!(checked && allCorrect) && (
        <button className="btn-primary btn-sm" disabled={!allAnswered} onClick={check}>
          Check answers
        </button>
      )}
    </Interactive>
  );
}

/* ---------- Spot the flaw: click the problematic lines ---------- */
export function SpotFlaw({ block, done, onComplete }) {
  const [flagged, setFlagged] = useState(() => new Set(done ? block.lines.flatMap((l, i) => (l.bad ? [i] : [])) : []));
  const [checked, setChecked] = useState(done);
  const badCount = block.lines.filter(l => l.bad).length;
  const found = block.lines.filter((l, i) => l.bad && flagged.has(i)).length;
  const falsePos = [...flagged].filter(i => !block.lines[i].bad).length;
  const solved = found === badCount && falsePos === 0;

  const toggle = i => {
    if (checked && solved) return;
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
    setChecked(false);
  };

  const check = () => {
    setChecked(true);
    if (solved) onComplete();
  };

  return (
    <Interactive
      kind="Spot the flaw"
      title={block.title}
      instructions={block.instructions || `Click the lines that contain a problem. There ${badCount === 1 ? 'is 1 issue' : `are ${badCount} issues`} to find.`}
      done={done}
    >
      <div className="code-lines">
        {block.lines.map((l, i) => {
          let cls = 'code-line';
          if (flagged.has(i)) cls += ' flagged';
          if (checked && l.bad && flagged.has(i)) cls += ' hit';
          if (checked && !l.bad && flagged.has(i)) cls += ' miss';
          return (
            <div key={i}>
              <button className={cls} onClick={() => toggle(i)}>
                <span className="ln">{i + 1}</span>
                <span className="lc">{l.text || ' '}</span>
              </button>
              {checked && solved && l.bad && (
                <div className="code-why">
                  <Rich text={l.why} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {checked && !solved && (
        <div className="feedback bad">
          <X size={18} />
          <div>
            You found {found} of {badCount}
            {falsePos > 0 ? ` and flagged ${falsePos} line${falsePos > 1 ? 's' : ''} that ${falsePos > 1 ? 'are' : 'is'} fine` : ''}. Keep looking.
          </div>
        </div>
      )}
      {checked && solved && (
        <div className="feedback good">
          <Check size={18} />
          <div>
            <strong>All issues found.</strong> <Rich text={block.explain} />
          </div>
        </div>
      )}
      {!(checked && solved) && (
        <button className="btn-primary btn-sm" disabled={flagged.size === 0} onClick={check}>
          Check
        </button>
      )}
    </Interactive>
  );
}

/* ---------- Branching scenario ---------- */
export function Scenario({ block, done, onComplete }) {
  const [nodeId, setNodeId] = useState(block.start);
  const [history, setHistory] = useState([]);
  const node = block.nodes[nodeId];

  const choose = choice => {
    setHistory([...history, { from: nodeId, label: choice.label, feedback: choice.feedback, good: choice.good }]);
    setNodeId(choice.next);
    const next = block.nodes[choice.next];
    if (next.end === 'success' && !done) onComplete();
  };

  const restart = () => {
    setNodeId(block.start);
    setHistory([]);
  };

  return (
    <Interactive kind="Scenario" title={block.title} done={done}>
      <div className="scenario">
        {history.map((h, i) => (
          <div key={i} className="scenario-step">
            <p className="scenario-choice">→ {h.label}</p>
            {h.feedback && <p className={`scenario-feedback ${h.good ? 'good' : 'bad'}`}><Rich text={h.feedback} /></p>}
          </div>
        ))}
        <div className={`scenario-node ${node.end || ''}`}>
          <Rich text={node.text} />
        </div>
        {node.choices && (
          <div className="options">
            {node.choices.map((c, i) => (
              <button key={i} className="option" onClick={() => choose(c)}>
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                <Rich text={c.label} />
              </button>
            ))}
          </div>
        )}
        {node.end && (
          <button className="btn-secondary btn-sm" onClick={restart}>
            <RotateCcw size={16} /> {node.end === 'success' ? 'Replay scenario' : 'Try again'}
          </button>
        )}
      </div>
    </Interactive>
  );
}
