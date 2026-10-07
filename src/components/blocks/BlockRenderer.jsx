import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { Rich } from '../../lib/RichText';
import { Classify, Flashcards, Match, Order, Quiz, Scenario, SpotFlaw } from './Exercises';
import { ChainOfThought, FewShot, PromptBuilder, PromptCompare, Temperature, Tokenizer } from './PromptLabs';
import { ExtractionSim, InjectionLab, PoisonSim } from './SecurityLabs';
import { AbTest, GeoLab } from './MarketingLabs';

const INTERACTIVE = {
  quiz: Quiz,
  flashcards: Flashcards,
  order: Order,
  match: Match,
  classify: Classify,
  spotFlaw: SpotFlaw,
  scenario: Scenario,
  tokenizer: Tokenizer,
  temperature: Temperature,
  promptBuilder: PromptBuilder,
  promptCompare: PromptCompare,
  fewShot: FewShot,
  cot: ChainOfThought,
  injectionLab: InjectionLab,
  poisonSim: PoisonSim,
  extractionSim: ExtractionSim,
  abTest: AbTest,
  geoLab: GeoLab,
};

const CALLOUT_ICONS = { tip: Lightbulb, warning: AlertTriangle, info: Info };

export default function BlockRenderer({ block, done, onComplete }) {
  switch (block.type) {
    case 'heading':
      return <h2 className="lesson-h2">{block.text}</h2>;
    case 'text':
      return (
        <div className="lesson-text">
          {[].concat(block.text).map((p, i) => (
            <p key={i}>
              <Rich text={p} />
            </p>
          ))}
        </div>
      );
    case 'list':
      return (
        <ul className="lesson-list">
          {block.items.map((it, i) => (
            <li key={i}>
              <Rich text={it} />
            </li>
          ))}
        </ul>
      );
    case 'code':
      return (
        <figure className="code-figure">
          {block.caption && <figcaption>{block.caption}</figcaption>}
          <pre className="code-block">{block.text}</pre>
        </figure>
      );
    case 'callout': {
      const Icon = CALLOUT_ICONS[block.variant] || Info;
      return (
        <aside className={`callout callout-${block.variant || 'info'}`}>
          <Icon size={20} />
          <div>
            {block.title && <strong>{block.title}</strong>}
            <p>
              <Rich text={block.text} />
            </p>
          </div>
        </aside>
      );
    }
    default: {
      const Comp = INTERACTIVE[block.type];
      if (!Comp) return null;
      return <Comp block={block} done={done} onComplete={onComplete} />;
    }
  }
}
