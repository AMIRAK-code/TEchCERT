import { useEffect, useState } from 'react';
import { Bot, Check, X } from 'lucide-react';
import Interactive from './Interactive';

/* ================= A/B test significance lab ================= */

// Abramowitz–Stegun 7.1.26 approximation of erf, good to ~1e-7.
function erf(x) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
const normalCdf = z => 0.5 * (1 + erf(z / Math.SQRT2));

// Two-sided two-proportion z-test with equal group sizes.
function twoProportion(pA, pB, n) {
  const pooled = (pA + pB) / 2;
  const se = Math.sqrt(pooled * (1 - pooled) * (2 / n));
  const z = se ? (pB - pA) / se : 0;
  return { z, p: 2 * (1 - normalCdf(Math.abs(z))) };
}

// Sample size per group for 95% confidence and 80% power.
function requiredN(pA, pB) {
  const d = Math.abs(pB - pA);
  if (!d) return Infinity;
  const pBar = (pA + pB) / 2;
  const zA = 1.96;
  const zB = 0.8416;
  return Math.ceil((zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(pA * (1 - pA) + pB * (1 - pB))) ** 2 / d ** 2);
}

export function AbTest({ done, onComplete }) {
  const baseline = 0.04;
  const [lift, setLift] = useState(15); // relative %
  const [logN, setLogN] = useState(Math.log10(1500));
  const [seen, setSeen] = useState({ sig: false, notSig: false });
  const n = Math.round(10 ** logN);
  const pB = baseline * (1 + lift / 100);
  const { z, p } = twoProportion(baseline, pB, n);
  const significant = p < 0.05;
  const need = requiredN(baseline, pB);

  // record which outcomes the learner has produced by moving the sliders
  const update = (nextLift, nextLogN) => {
    setLift(nextLift);
    setLogN(nextLogN);
    const sig = twoProportion(baseline, baseline * (1 + nextLift / 100), Math.round(10 ** nextLogN)).p < 0.05;
    const next = { sig: seen.sig || sig, notSig: seen.notSig || !sig };
    setSeen(next);
    if (!done && next.sig && next.notSig) onComplete();
  };

  return (
    <Interactive
      kind="Simulator"
      title="Is the AI-written subject line really better?"
      instructions="AI drafted two email subject lines. Variant A is your current one (4.0% click rate). Set how much better B appears to be and how many people received each version. Complete the lab by finding one setup that is NOT significant and one that IS."
      done={done}
    >
      <div className="slider-row">
        <label>
          Observed lift of B over A <strong>+{lift}%</strong> ({(baseline * 100).toFixed(1)}% → {(pB * 100).toFixed(2)}%)
          <input type="range" min="1" max="40" step="1" value={lift} onChange={e => update(parseInt(e.target.value, 10), logN)} />
        </label>
        <label>
          Recipients per variant <strong>{n.toLocaleString()}</strong>
          <input type="range" min="2" max="5" step="0.05" value={logN} onChange={e => update(lift, parseFloat(e.target.value))} />
        </label>
      </div>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-val">{z.toFixed(2)}</span>
          <span className="stat-label">z-score</span>
        </div>
        <div className={`stat ${significant ? 'safe' : 'warn'}`}>
          <span className="stat-val">{p < 0.001 ? '<0.001' : p.toFixed(3)}</span>
          <span className="stat-label">p-value (two-sided)</span>
        </div>
        <div className="stat">
          <span className="stat-val">{Number.isFinite(need) ? need.toLocaleString() : '—'}</span>
          <span className="stat-label">needed per variant (95% conf., 80% power)</span>
        </div>
      </div>
      <div className={`feedback ${significant ? 'good' : 'bad'}`}>
        {significant ? <Check size={18} /> : <X size={18} />}
        <div>
          {significant
            ? 'Statistically significant at 95%: a difference this large is unlikely to be random noise. Ship B — and keep monitoring.'
            : `Not significant: with ${n.toLocaleString()} recipients each, a +${lift}% lift could easily be chance. Don't declare a winner yet.`}
        </div>
      </div>
      <div className="lab-progress">
        <span className={seen.notSig ? 'ok' : ''}>{seen.notSig ? '✓' : '○'} Found a non-significant result</span>
        <span className={seen.sig ? 'ok' : ''}>{seen.sig ? '✓' : '○'} Found a significant result</span>
      </div>
      <p className="ix-meta">
        AI makes variants cheap, which tempts teams to test dozens at once and stop as soon as one looks ahead. Decide the sample size up front, test few variants, and don't "peek" and stop early.
      </p>
    </Interactive>
  );
}

/* ================= GEO lab: ranking vs. AI citation ================= */

// Illustrative model only — real search and answer engines use far more signals.
const GEO_FACTORS = [
  { key: 'answerFirst', label: 'Answer-first summary', desc: 'A direct 2–3 sentence answer right under the heading.', rank: 6, cite: 22 },
  { key: 'stats', label: 'Statistics with sources', desc: 'Specific numbers, each linked to where it came from.', rank: 4, cite: 20 },
  { key: 'quotes', label: 'Expert quotations', desc: 'Attributed quotes from named, credible people.', rank: 3, cite: 14 },
  { key: 'headings', label: 'Question-shaped headings', desc: 'H2s that match how people actually ask.', rank: 10, cite: 10 },
  { key: 'schema', label: 'Structured data (JSON-LD)', desc: 'Article / Product / Organization markup.', rank: 10, cite: 4 },
  { key: 'eeat', label: 'Author & first-hand experience', desc: 'Named author, credentials, original photos or tests.', rank: 14, cite: 10 },
  { key: 'speed', label: 'Fast, crawlable page', desc: 'Good Core Web Vitals; content in the HTML, not only via JS.', rank: 14, cite: 6 },
  { key: 'stuffing', label: 'Keyword stuffing', desc: 'Repeat "best running shoes" 40 times.', rank: -18, cite: -12, bad: true },
  { key: 'blockAi', label: 'Block AI search bots', desc: 'Disallow OAI-SearchBot and PerplexityBot in robots.txt.', rank: 0, cite: 0, bad: true },
];

export function GeoLab({ done, onComplete }) {
  const [on, setOn] = useState({ stuffing: true });
  const base = { rank: 25, cite: 8 };
  const rank = Math.max(0, Math.min(100, GEO_FACTORS.reduce((s, f) => s + (on[f.key] ? f.rank : 0), base.rank)));
  let cite = Math.max(0, Math.min(100, GEO_FACTORS.reduce((s, f) => s + (on[f.key] ? f.cite : 0), base.cite)));
  if (on.blockAi) cite = Math.min(cite, 5);
  const goal = rank >= 70 && cite >= 75 && !on.stuffing && !on.blockAi;

  useEffect(() => {
    if (!done && goal) onComplete();
  }, [done, goal, onComplete]);

  const cited = cite >= 60 && !on.blockAi;

  return (
    <Interactive
      kind="Simulator"
      title="Optimize a page for search AND AI answers"
      instructions="Your page: “How long do running shoes last?”. Toggle page features and watch two scores — classic ranking and the chance an AI answer engine cites you. Goal: ranking ≥ 70 and citation ≥ 75."
      done={done}
    >
      <div className="defense-grid">
        {GEO_FACTORS.map(f => (
          <label key={f.key} className={`defense ${on[f.key] ? (f.bad ? 'bad-on' : 'on') : ''}`}>
            <input type="checkbox" checked={!!on[f.key]} onChange={e => setOn({ ...on, [f.key]: e.target.checked })} />
            <div>
              <strong>{f.label}</strong>
              <span>{f.desc}</span>
            </div>
          </label>
        ))}
      </div>
      <div className="meter-label">Classic search ranking signals: {rank}/100</div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${rank}%` }} />
      </div>
      <div className="meter-label">Likelihood of being cited in an AI answer: {cite}/100</div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${cite}%` }} />
      </div>

      <div className="mini-label">Simulated AI answer</div>
      <div className="chat-bubble bot">
        <Bot size={16} />
        <div>
          <pre>
            {cited
              ? 'Most running shoes last 450–800 km (about 300–500 miles), depending on runner weight, surface and midsole foam. [1]\n\nSources:\n[1] yoursite.com — How long do running shoes last?'
              : 'Most running shoes last roughly 450–800 km before the cushioning wears out.\n\nSources:\n[1] competitor-running-blog.com\n[2] big-retailer.com/guides'}
          </pre>
        </div>
      </div>
      <p className="ix-meta">
        {on.blockAi
          ? 'Blocking AI search crawlers keeps your page out of their answers entirely — no amount of content quality helps if they cannot fetch it.'
          : on.stuffing
            ? 'Keyword stuffing lowers both scores: search engines treat it as spam, and answer engines prefer clear, specific, well-sourced passages.'
            : 'Notice which features move citation most: direct answers, sourced statistics and quotations make a passage easy to lift into an answer.'}{' '}
        This is a teaching model, not a real ranking formula.
      </p>
    </Interactive>
  );
}
