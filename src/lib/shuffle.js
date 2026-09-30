export function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed ?? Math.floor(Math.random() * 2 ** 31);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
