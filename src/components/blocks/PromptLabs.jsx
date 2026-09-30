import { useMemo, useState } from 'react';
import { Bot, Brain, Check, ChevronRight, Dices, Sparkles, User } from 'lucide-react';
import Interactive from './Interactive';
import { Rich } from '../../lib/RichText';

/* ---------- Tokenizer playground ---------- */
// Rough BPE-like approximation: words, numbers in groups of up to 3 digits, punctuation,
// and long words split into sub-word pieces. Real tokenizers differ, but the proportions hold.
function approxTokenize(text) {
  const raw = text.match(/ ?[A-Za-z]+| ?\d{1,3}| ?[^\sA-Za-z\d]|\s+/g) || [];
  const out = [];
  for (const piece of raw) {
    const word = piece.trim();
    if (/^[A-Za-z]+$/.test(word) && word.length > 7) {
      const lead = piece.startsWith(' ') ? ' ' : '';
      let rest = word;
      let first = true;
      while (rest.length > 0) {
        const size = rest.length > 6 ? (first ? 5 : 4) : rest.length;
        out.push((first ? lead : '') + rest.slice(0, size));
        rest = rest.slice(size);
        first = false;
      }
    } else {
      out.push(piece);
    }
  }
  return out;
}

const TOKEN_COLORS = ['#ff6a2c40', '#3b82f640', '#22c55e38', '#eab30840', '#a8a29e40'];

export function Tokenizer({ block, done, onComplete }) {
  const [text, setText] = useState(block.sample || 'Prompt engineering is the art of communicating clearly with large language models.');
  const tokens = useMemo(() => approxTokenize(text), [text]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const context = block.contextWindow || 200000;
  const pricePerM = block.pricePerMillion || 3;

  return (
    <Interactive
      kind="Playground"
      title="Tokenizer playground"
      instructions="Type or paste any text. Each coloured chunk is (approximately) one token — the unit a model reads, bills and counts toward its context window."
      done={done}
    >
      <textarea
        className="ix-textarea"
        rows={4}
        value={text}
        onChange={e => {
          setText(e.target.value);
          if (!done) onComplete();
        }}
      />
      <div className="token-view">
        {tokens.map((t, i) => (
          <span key={i} className="token" style={{ background: TOKEN_COLORS[i % TOKEN_COLORS.length] }}>
            {t.replace(/ /g, '·').replace(/\n/g, '↵')}
          </span>
        ))}
      </div>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-val">{tokens.length}</span>
          <span className="stat-label">tokens (approx.)</span>
        </div>
        <div className="stat">
          <span className="stat-val">{text.length}</span>
          <span className="stat-label">characters</span>
        </div>
        <div className="stat">
          <span className="stat-val">{words ? (tokens.length / words).toFixed(2) : '—'}</span>
          <span className="stat-label">tokens / word</span>
        </div>
        <div className="stat">
          <span className="stat-val">${((tokens.length / 1e6) * pricePerM).toFixed(6)}</span>
          <span className="stat-label">cost @ ${pricePerM}/M tokens</span>
        </div>
      </div>
      <div className="meter-label">
        Context window used: {((tokens.length / context) * 100).toFixed(3)}% of {context.toLocaleString()} tokens
      </div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${Math.max(0.5, Math.min(100, (tokens.length / context) * 100))}%` }} />
      </div>
      <p className="ix-meta">Try: a long URL, a number like 1234567, code, or a word in another language — notice how token counts jump.</p>
    </Interactive>
  );
}

/* ---------- Temperature & top-p sampler ---------- */
const DEFAULT_CANDIDATES = [
  { tok: 'coffee', logit: 3.2 },
  { tok: 'quiet', logit: 2.2 },
  { tok: 'fresh start', logit: 2.0 },
  { tok: 'silence', logit: 1.3 },
  { tok: 'possibility', logit: 0.9 },
  { tok: 'commute', logit: 0.5 },
  { tok: 'sunrise', logit: 0.3 },
  { tok: 'llama', logit: -1.2 },
];

function distribution(cands, temp, topP) {
  let probs;
  if (temp === 0) {
    const max = Math.max(...cands.map(c => c.logit));
    probs = cands.map(c => (c.logit === max ? 1 : 0));
  } else {
    const exps = cands.map(c => Math.exp(c.logit / temp));
    const sum = exps.reduce((a, b) => a + b, 0);
    probs = exps.map(e => e / sum);
  }
  // nucleus (top-p) filtering
  const order = probs.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]);
  let cum = 0;
  const keep = new Set();
  for (const [p, i] of order) {
    keep.add(i);
    cum += p;
    if (cum >= topP) break;
  }
  const kept = probs.map((p, i) => (keep.has(i) ? p : 0));
  const total = kept.reduce((a, b) => a + b, 0);
  return kept.map(p => p / total);
}

export function Temperature({ block, done, onComplete }) {
  const cands = block.candidates || DEFAULT_CANDIDATES;
  const prefix = block.prefix || 'The best thing about Monday mornings is the';
  const [temp, setTemp] = useState(1);
  const [topP, setTopP] = useState(1);
  const [samples, setSamples] = useState([]);
  const [tempsUsed, setTempsUsed] = useState([]);
  const probs = distribution(cands, temp, topP);

  const sample = () => {
    const out = [];
    for (let k = 0; k < 5; k++) {
      let r = Math.random();
      let idx = probs.findIndex(p => (r -= p) <= 0);
      if (idx < 0) idx = probs.findIndex(p => p > 0);
      out.push(cands[idx].tok);
    }
    setSamples(out);
    const used = [...tempsUsed, temp];
    setTempsUsed(used);
    if (!done && Math.max(...used) - Math.min(...used) >= 0.8) onComplete();
  };

  return (
    <Interactive
      kind="Simulator"
      title="Temperature & top-p sampler"
      instructions="The model has scored every possible next token. Adjust the sampling settings and watch the probability distribution change, then sample 5 completions. Sample at a low AND a high temperature to complete this exercise."
      done={done}
    >
      <div className="prompt-preview">
        {prefix} <span className="blank">___</span>
      </div>
      <div className="slider-row">
        <label>
          Temperature <strong>{temp.toFixed(1)}</strong>
          <input type="range" min="0" max="2" step="0.1" value={temp} onChange={e => setTemp(parseFloat(e.target.value))} />
        </label>
        <label>
          Top-p <strong>{topP.toFixed(2)}</strong>
          <input type="range" min="0.1" max="1" step="0.05" value={topP} onChange={e => setTopP(parseFloat(e.target.value))} />
        </label>
      </div>
      <div className="bars">
        {cands.map((c, i) => (
          <div key={c.tok} className="bar-row">
            <span className="bar-label">{c.tok}</span>
            <div className="bar-track">
              <div className={`bar-fill ${probs[i] === 0 ? 'cut' : ''}`} style={{ width: `${probs[i] * 100}%` }} />
            </div>
            <span className="bar-val">{(probs[i] * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <button className="btn-primary btn-sm" onClick={sample}>
        <Dices size={16} /> Sample 5 completions
      </button>
      {samples.length > 0 && (
        <ul className="samples">
          {samples.map((s, i) => (
            <li key={i}>
              {prefix} <strong>{s}</strong>.
            </li>
          ))}
        </ul>
      )}
      <p className="ix-meta">
        {temp === 0
          ? 'Temperature 0 = greedy decoding: always the single most likely token. Deterministic, good for extraction and classification.'
          : temp < 0.7
            ? 'Low temperature sharpens the distribution toward the top tokens — focused and consistent.'
            : temp <= 1.2
              ? 'Around 1.0 the model samples from its natural distribution — varied but mostly sensible.'
              : 'High temperature flattens the distribution — creative, but unlikely tokens (like "llama") start to appear.'}
      </p>
    </Interactive>
  );
}

/* ---------- Prompt builder ---------- */
const BUILDER_PARTS = [
  {
    key: 'role',
    label: 'Role',
    weight: 1,
    options: ['', 'You are a senior copywriter for a B2B software company.'],
  },
  {
    key: 'task',
    label: 'Task',
    weight: 2,
    essential: true,
    options: ['Write an email.', 'Write an email to existing customers announcing our new "Auto-Sync" feature.'],
  },
  {
    key: 'context',
    label: 'Context',
    weight: 2,
    essential: true,
    options: [
      '',
      'Context: Auto-Sync keeps calendars updated across Google and Outlook every 60 seconds. It is free on all plans and live today. Readers are busy operations managers.',
    ],
  },
  {
    key: 'format',
    label: 'Output format',
    weight: 2,
    essential: true,
    options: ['', 'Format: a subject line, then under 120 words of body text with exactly 3 bullet points, ending with one call-to-action.'],
  },
  {
    key: 'constraints',
    label: 'Tone & constraints',
    weight: 1,
    options: ['', 'Tone: friendly and plain-spoken. Avoid jargon and exclamation marks. Do not invent features or pricing.'],
  },
];

const BUILDER_OUTPUTS = [
  {
    min: 0,
    label: 'Generic',
    text: 'Subject: Hello!\n\nDear Sir/Madam,\n\nI hope this email finds you well. I am writing to reach out regarding an important matter. Please let me know if you have any questions or would like to discuss further.\n\nBest regards,\n[Your Name]',
    note: 'The model had to guess who, what and why. It produced a safe, empty template.',
  },
  {
    min: 4,
    label: 'On topic, but unfocused',
    text: 'Subject: Introducing Auto-Sync — Revolutionary Calendar Magic!!!\n\nWe are THRILLED to announce Auto-Sync, our game-changing, AI-powered synergy engine that will transform your workflow forever! Available for just $9.99/month on Premium... (continues for 400 words)',
    note: 'It knows the topic now, but without context and format it invents details (pricing!) and rambles.',
  },
  {
    min: 7,
    label: 'Useful',
    text: 'Subject: Your calendars now stay in sync automatically\n\nHi there,\n\nStarting today, Auto-Sync keeps your Google and Outlook calendars aligned — no more double bookings.\n\n• Updates every 60 seconds\n• Works across Google and Outlook\n• Free on every plan\n\nTurn it on in Settings → Integrations and let us know what you think.',
    note: 'Specific task + facts + format = accurate, on-brief output you can ship with light edits.',
  },
];

export function PromptBuilder({ done, onComplete }) {
  const [sel, setSel] = useState({ role: 0, task: 0, context: 0, format: 0, constraints: 0 });
  const max = BUILDER_PARTS.reduce((a, p) => a + p.weight, 0);
  const score = BUILDER_PARTS.reduce((a, p) => a + (sel[p.key] ? p.weight : 0), 0);
  const essentialsMet = BUILDER_PARTS.filter(p => p.essential).every(p => sel[p.key]);
  const output = [...BUILDER_OUTPUTS].reverse().find(o => score >= o.min && (o.min < 7 || essentialsMet));
  const prompt = BUILDER_PARTS.map(p => p.options[sel[p.key]]).filter(Boolean).join('\n\n');

  const set = (key, v) => {
    const next = { ...sel, [key]: v };
    setSel(next);
    const s = BUILDER_PARTS.reduce((a, p) => a + (next[p.key] ? p.weight : 0), 0);
    const ess = BUILDER_PARTS.filter(p => p.essential).every(p => next[p.key]);
    if (!done && ess && s >= 7) onComplete();
  };

  return (
    <Interactive
      kind="Builder"
      title="Build a prompt, component by component"
      instructions="Goal: get a shippable product-announcement email. Switch each component on and watch how the simulated output changes."
      done={done}
    >
      <div className="builder">
        <div className="builder-controls">
          {BUILDER_PARTS.map(p => (
            <div key={p.key} className="builder-part">
              <div className="builder-part-head">
                <strong>{p.label}</strong>
                {p.essential && <span className="tag">essential</span>}
              </div>
              <div className="seg">
                {p.options.map((opt, i) => (
                  <button key={i} className={sel[p.key] === i ? 'on' : ''} onClick={() => set(p.key, i)}>
                    {i === 0 ? (opt ? 'Vague' : 'Omit') : 'Specific'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="meter-label">
            Prompt quality: {score}/{max}
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${(score / max) * 100}%` }} />
          </div>
        </div>
        <div className="builder-output">
          <div className="chat-bubble user">
            <User size={16} />
            <pre>{prompt}</pre>
          </div>
          <div className="chat-bubble bot">
            <Bot size={16} />
            <div>
              <span className="tag">{output.label}</span>
              <pre>{output.text}</pre>
            </div>
          </div>
          <p className="ix-meta">{output.note}</p>
        </div>
      </div>
    </Interactive>
  );
}

/* ---------- Side-by-side prompt comparison ---------- */
export function PromptCompare({ block, done, onComplete }) {
  const [tab, setTab] = useState(0);
  const [viewed, setViewed] = useState(() => new Set([0]));
  const v = block.versions[tab];

  const open = i => {
    setTab(i);
    const next = new Set(viewed).add(i);
    setViewed(next);
    if (!done && next.size === block.versions.length) onComplete();
  };

  return (
    <Interactive kind="Compare" title={block.title} instructions="Switch between the versions and compare the prompts and the model's responses." done={done}>
      <div className="tabs">
        {block.versions.map((ver, i) => (
          <button key={i} className={tab === i ? 'on' : ''} onClick={() => open(i)}>
            {ver.label}
            {viewed.has(i) && <Check size={14} />}
          </button>
        ))}
      </div>
      <div className="chat-bubble user">
        <User size={16} />
        <pre>{v.prompt}</pre>
      </div>
      <div className="chat-bubble bot">
        <Bot size={16} />
        <pre>{v.output}</pre>
      </div>
      {v.notes && (
        <ul className="notes">
          {v.notes.map((n, i) => (
            <li key={i}>
              <Rich text={n} />
            </li>
          ))}
        </ul>
      )}
    </Interactive>
  );
}

/* ---------- Few-shot simulator ---------- */
export function FewShot({ block, done, onComplete }) {
  const [shots, setShots] = useState(0);
  const [seen, setSeen] = useState(() => new Set([0]));

  const change = n => {
    setShots(n);
    const next = new Set(seen).add(n);
    setSeen(next);
    if (!done && next.has(0) && [...next].some(x => x >= 2)) onComplete();
  };

  const prompt = [
    block.instruction,
    ...block.examples.slice(0, shots).map(e => `Input: ${e.input}\nOutput: ${e.output}`),
    'Input: {each test item}\nOutput:',
  ].join('\n\n');

  const outputs = block.outputs[Math.min(shots, block.outputs.length - 1)];
  const consistent = outputs.filter(o => o.ok).length;

  return (
    <Interactive kind="Simulator" title={block.title} instructions="Add examples to the prompt (0 = zero-shot) and watch how the outputs change on the same test inputs." done={done}>
      <div className="seg seg-wide">
        {Array.from({ length: block.examples.length + 1 }, (_, n) => (
          <button key={n} className={shots === n ? 'on' : ''} onClick={() => change(n)}>
            {n === 0 ? 'Zero-shot' : `${n}-shot`}
          </button>
        ))}
      </div>
      <div className="two-col">
        <div>
          <div className="mini-label">Prompt</div>
          <pre className="code-block">{prompt}</pre>
        </div>
        <div>
          <div className="mini-label">Model outputs</div>
          <table className="io-table">
            <tbody>
              {block.tests.map((t, i) => (
                <tr key={i}>
                  <td>{t}</td>
                  <td className={outputs[i].ok ? 'ok' : 'nok'}>
                    <code>{outputs[i].text}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="meter-label">
            Usable, correctly-formatted outputs: {consistent}/{block.tests.length}
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${(consistent / block.tests.length) * 100}%` }} />
          </div>
        </div>
      </div>
    </Interactive>
  );
}

/* ---------- Chain-of-thought demo ---------- */
export function ChainOfThought({ block, done, onComplete }) {
  const [mode, setMode] = useState(null); // 'direct' | 'cot'
  const [step, setStep] = useState(0);
  const [triedDirect, setTriedDirect] = useState(false);

  const next = () => {
    const s = step + 1;
    setStep(s);
    if (!done && s >= block.steps.length && triedDirect) onComplete();
  };

  return (
    <Interactive kind="Experiment" title={block.title} instructions="Run the same problem two ways: once asking for the answer directly, once asking the model to reason step by step." done={done}>
      <div className="prompt-preview">
        <Rich text={block.problem} />
      </div>
      <div className="seg seg-wide">
        <button
          className={mode === 'direct' ? 'on' : ''}
          onClick={() => {
            setMode('direct');
            setTriedDirect(true);
            if (!done && step >= block.steps.length) onComplete();
          }}
        >
          <Sparkles size={14} /> "Answer with just the number."
        </button>
        <button
          className={mode === 'cot' ? 'on' : ''}
          onClick={() => {
            setMode('cot');
            setStep(0);
          }}
        >
          <Brain size={14} /> "Think step by step, then answer."
        </button>
      </div>
      {mode === 'direct' && (
        <div className="chat-bubble bot">
          <Bot size={16} />
          <div>
            <pre>{block.directAnswer}</pre>
            <div className="feedback bad inline">✗ Wrong. The correct answer is {block.correct}. {block.directWhy}</div>
          </div>
        </div>
      )}
      {mode === 'cot' && (
        <div className="chat-bubble bot">
          <Bot size={16} />
          <div className="cot-steps">
            {block.steps.slice(0, step).map((s, i) => (
              <div key={i} className="cot-step">
                <span className="cot-num">{i + 1}</span>
                <Rich text={s} />
              </div>
            ))}
            {step < block.steps.length ? (
              <button className="btn-secondary btn-sm" onClick={next}>
                Generate next reasoning step <ChevronRight size={16} />
              </button>
            ) : (
              <div className="feedback good inline">
                ✓ Final answer: {block.correct}. {!triedDirect && 'Now try the direct version to compare.'}
              </div>
            )}
          </div>
        </div>
      )}
    </Interactive>
  );
}
