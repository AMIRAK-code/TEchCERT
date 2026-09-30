// Minimal inline formatting for course content: **bold**, `code`, *italic*.
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

export function Rich({ text }) {
  if (!text) return null;
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}
