// RTL / Bidi helper — makes xterm.js usable with Arabic/Hebrew
// Strategy:
//  1. Detect RTL chars in a line
//  2. Apply Unicode Bidi Algorithm via Intl-free lightweight implementation
//  3. Shape Arabic presentation forms (isolated/initial/medial/final)
//  4. Mixed LTR+RTL keeps logical order readable (numbers/latin stay LTR)
(function (global) {
  'use strict';

  const RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/;
  const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

  function isRTL(s) { return RTL_RE.test(s); }
  function hasArabic(s) { return ARABIC_RE.test(s); }

  // --- Arabic shaping tables (basic) ---
  // char -> [isolated, initial, medial, final]
  const SHAPE = {
    '\u0627': [0xFE8D, null, null, 0xFE8E], // alef
    '\u0628': [0xFE8F, 0xFE91, 0xFE92, 0xFE90], // beh
    '\u062A': [0xFE95, 0xFE97, 0xFE98, 0xFE96],
    '\u062B': [0xFE99, 0xFE9B, 0xFE9C, 0xFE9A],
    '\u062C': [0xFE9D, 0xFE9F, 0xFEA0, 0xFE9E],
    '\u062D': [0xFEA1, 0xFEA3, 0xFEA4, 0xFEA2],
    '\u062E': [0xFEA5, 0xFEA7, 0xFEA8, 0xFEA6],
    '\u062F': [0xFEA9, null, null, 0xFEAA],
    '\u0630': [0xFEAB, null, null, 0xFEAC],
    '\u0631': [0xFEAD, null, null, 0xFEAE],
    '\u0632': [0xFEAF, null, null, 0xFEB0],
    '\u0633': [0xFEB1, 0xFEB3, 0xFEB4, 0xFEB2],
    '\u0634': [0xFEB5, 0xFEB7, 0xFEB8, 0xFEB6],
    '\u0635': [0xFEB9, 0xFEBB, 0xFEBC, 0xFEBA],
    '\u0636': [0xFEBD, 0xFEBF, 0xFEC0, 0xFEBE],
    '\u0637': [0xFEC1, 0xFEC3, 0xFEC4, 0xFEC2],
    '\u0638': [0xFEC5, 0xFEC7, 0xFEC8, 0xFEC6],
    '\u0639': [0xFEC9, 0xFECB, 0xFECC, 0xFECA],
    '\u063A': [0xFECD, 0xFECF, 0xFED0, 0xFECE],
    '\u0641': [0xFED1, 0xFED3, 0xFED4, 0xFED2],
    '\u0642': [0xFED5, 0xFED7, 0xFED8, 0xFED6],
    '\u0643': [0xFED9, 0xFEDB, 0xFEDC, 0xFEDA],
    '\u0644': [0xFEDF, 0xFEE1, 0xFEE2, 0xFEDE],
    '\u0645': [0xFEE3, 0xFEE5, 0xFEE6, 0xFEE4],
    '\u0646': [0xFEE7, 0xFEE9, 0xFEEA, 0xFEE8],
    '\u0647': [0xFEEB, 0xFEED, 0xFEEE, 0xFEEC],
    '\u0648': [0xFEED, null, null, 0xFEEE],
    '\u0649': [0xFEF1, null, null, 0xFEF0],
    '\u064A': [0xFEF3, 0xFEF5, 0xFEF6, 0xFEF4],
    '\u0629': [0xFE93, null, null, 0xFE94], // teh marbuta
    '\u0621': [0xFE80, null, null, null],   // hamza
    '\u0624': [0xFE84, null, null, 0xFE85],
    '\u0626': [0xFE89, 0xFE8B, 0xFE8C, 0xFE8A],
    '\u0625': [0xFE87, null, null, 0xFE88],
    '\u0623': [0xFE83, null, null, 0xFE84],
    '\u0622': [0xFE81, null, null, 0xFE82],
  };
  const NON_JOIN_NEXT = new Set(['\u0627','\u062F','\u0630','\u0631','\u0632','\u0648','\u0629','\u0621','\u0625','\u0623','\u0622','\u0649',' ','\t','\n','\r','.',',','!','?',';',':','(',')','[',']','{','}','0','1','2','3','4','5','6','7','8','9']);
  const LAM = '\u0644';
  const LAM_ALEF = { '\u0627': '\uFEFB', '\u0623': '\uFEF7', '\u0625': '\uFEF9', '\u0622': '\uFEF5' };

  function shapeArabic(word) {
    // Lam-Alef ligatures first
    let out = '';
    const chars = [...word];
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i], n = chars[i + 1];
      if (c === LAM && n && LAM_ALEF[n]) {
        const prevJoin = i > 0 && SHAPE[chars[i-1]] && !NON_JOIN_NEXT.has(chars[i-1]);
        out += String.fromCharCode(prevJoin ? LAM_ALEF[n] + 1 : LAM_ALEF[n]);
        i++;
        continue;
      }
      if (!SHAPE[c]) { out += c; continue; }
      const prev = chars[i - 1];
      const next = chars[i + 1];
      const joinsPrev = prev && SHAPE[prev] && !NON_JOIN_NEXT.has(prev);
      const joinsNext = next && SHAPE[next] && !NON_JOIN_NEXT.has(c);
      const [iso, ini, med, fin] = SHAPE[c];
      let code = iso;
      if (joinsPrev && joinsNext && med) code = med;
      else if (joinsPrev && fin) code = fin;
      else if (joinsNext && ini) code = ini;
      out += code ? String.fromCharCode(code) : c;
    }
    return out;
  }

  // Split into segments: RTL runs vs LTR/neutral runs, then reorder for display
  function reorderBidi(line) {
    if (!isRTL(line)) return line;
    // tokenize: group consecutive RTL chars (incl. arabic + spaces between them), rest LTR
    const tokens = [];
    let cur = '', curRTL = null;
    for (const ch of line) {
      const r = RTL_RE.test(ch);
      // spaces/numbers attach to current direction, decide at flush
      if (cur === '') { cur = ch; curRTL = r; }
      else if (r === curRTL || ch === ' ' || /[0-9\u0660-\u0669]/.test(ch)) cur += ch;
      else { tokens.push({ t: cur, rtl: curRTL }); cur = ch; curRTL = r; }
    }
    if (cur) tokens.push({ t: cur, rtl: curRTL });
    // shape arabic inside RTL tokens
    tokens.forEach(tok => { if (tok.rtl) tok.t = shapeArabic(tok.t); });
    // If line is predominantly RTL -> reverse token order for visual display
    const rtlCount = tokens.filter(t => t.rtl).length;
    if (rtlCount * 2 >= tokens.length) tokens.reverse();
    return tokens.map(t => t.t).join('');
  }

  // Process full terminal output chunk → line-by-line
  function processOutput(chunk) {
    return chunk.split(/(\r\n|\n|\r)/).map(part => {
      if (/^\r\n$|^\n$|^\r$/.test(part)) return part;
      if (!isRTL(part)) return part;
      // Don't touch ANSI escape sequences: split them out
      const ansi = /(\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[()][0-9A-Z])/g;
      const pieces = part.split(ansi);
      return pieces.map(p => {
        if (!p) return p;
        if (/^\x1b/.test(p)) return p; // escape seq untouched
        return reorderBidi(p);
      }).join('');
    }).join('');
  }

  // Logical (typed) -> visual for echo, and visual -> logical before sending to shell
  const api = { isRTL, hasArabic, shapeArabic, reorderBidi, processOutput };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.RTLBidi = api;
})(typeof window !== 'undefined' ? window : globalThis);
