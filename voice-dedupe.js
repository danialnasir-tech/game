// Build-time only. Lines with the same text share one recording: the kit asks for each sentence once,
// and the site build points every other id with that text at the recorded clip.
module.exports = function dedupe(lines, have, okClip) {
  const groups = new Map(), alias = {};
  lines.forEach(l => { const k = l.text.trim().toLowerCase(); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(l); });
  groups.forEach(g => {
    const rec = g.find(l => have[l.id] && okClip(l)) || g[0];
    g.forEach(l => { if (l !== rec) alias[l.id] = rec.id; });
  });
  // keep anything already recorded (its manifest entry stays valid); drop only unrecorded copies
  const keep = lines.filter(l => !alias[l.id] || (have[l.id] && okClip(l)));
  return { keep, alias };
};
