// Vector chess piece icons (45x45 viewBox). Font-free so they render identically on every device.
var PIECE_PATHS = {
  p: 'M22.5 8.5a5.6 5.6 0 0 1 3.5 10c2.9 1.4 4.8 4.2 4.8 7.4 0 2.1-.8 3.9-2.1 5.3 2.6 1.3 4.6 3.1 5.3 4.8H11c.7-1.7 2.7-3.5 5.3-4.8-1.3-1.4-2.1-3.2-2.1-5.3 0-3.2 1.9-6 4.8-7.4a5.6 5.6 0 0 1 3.5-10z',
  r: 'M12 9h4.5v3.5h3.5V9h5v3.5h3.5V9H33v8l-3.5 3.5v10.5l3.5 5H12l3.5-5V20.5L12 17z',
  b: 'M22.5 5a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2zM22.5 11.5c4.8 3.6 8 7.8 8 11.6 0 3.2-1.9 5.4-4.3 6.5l3.3 6.4H15.5l3.3-6.4c-2.4-1.1-4.3-3.3-4.3-6.5 0-3.8 3.2-8 8-11.6zm3.6 7.6l-1.8-1.6-4.2 4.6 1.8 1.6z',
  n: 'M14 36l.8-7.4c.8-4.6 3.8-7.3 6.5-9.6-2.4.3-5 1.6-6.9 3.6l-3.6-2.4c1.4-4.3 4.7-8.1 9.1-10.4l1.2-3.6 2.3 3.1c7 .7 11.4 6.5 11.4 14.2 0 4.8-1.3 9.3-3.3 12.5zm8.3-21.3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  q: 'M8.5 11.5a2.3 2.3 0 1 1 0 .1zM15.5 8.5a2.3 2.3 0 1 1 0 .1zM22.5 7.2a2.3 2.3 0 1 1 0 .1zM29.5 8.5a2.3 2.3 0 1 1 0 .1zM36.5 11.5a2.3 2.3 0 1 1 0 .1zM9 14.5l5.5 17h16l5.5-17-6.6 7.2-3.3-10-3.6 10-3.6-10-3.3 10zM14 32.5h17l2 3.5H12z',
  k: 'M21 4.5h3v3h3v3h-3v3.2h-3v-3.2h-3v-3h3zM11 19.5c0-3.4 2.5-5.6 5.6-5.6 2.4 0 4.5 1.3 5.9 3.4 1.4-2.1 3.5-3.4 5.9-3.4 3.1 0 5.6 2.2 5.6 5.6 0 5.2-4.1 8.6-5.3 12.5H16.3C15.1 28.1 11 24.7 11 19.5zM14.5 32.5h16l2 3.5h-20z'
};
var PIECE_BASE = 'M11.5 36.5h22a1.5 1.5 0 0 1 1.5 1.5v.5a1.5 1.5 0 0 1-1.5 1.5h-22A1.5 1.5 0 0 1 10 38.5V38a1.5 1.5 0 0 1 1.5-1.5z';
function pieceSVG(type, color, size) {
  var fill = color === 'w' ? '#f7efdc' : '#1b1a22', stroke = color === 'w' ? '#1b1a22' : '#f7efdc';
  return '<svg class="piece-ico" viewBox="0 0 45 45" width="' + (size || 36) + '" height="' + (size || 36) + '" aria-hidden="true"><g fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5" stroke-linejoin="round" fill-rule="evenodd"><path d="' + PIECE_PATHS[type] + '"/><path d="' + PIECE_BASE + '"/></g></svg>';
}
if (typeof module !== 'undefined') module.exports = { PIECE_PATHS: PIECE_PATHS, PIECE_BASE: PIECE_BASE, pieceSVG: pieceSVG };
