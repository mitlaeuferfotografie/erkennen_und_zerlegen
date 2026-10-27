import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { erzeugeZerlegeSzene, HAUT } from './zerlege3d';
import { SAETZE, satzDatei, NACH_SATZ_ZAHL, NUR_ZAHL } from './saetze';
import { Lock, X, Settings, Copy, Smartphone, RotateCw, Printer, Scissors, Hand, Plus as PlusZeichen, ArrowRight, ArrowLeft, RotateCcw, Volume2, Delete, Eraser, Check, Home, Zap, Hourglass, Star, PenLine, Grid3x3, Eye, Ear, Blocks, Shapes, Award, Shuffle } from 'lucide-react';

// ==========================================
// ERKENNEN UND ZERLEGEN (früher „Die Fünfer-Bande“) – Kraft der 5 und Zerlegen (Klasse 1)
// Angelehnt an die Idee des Blitzrechnens, eigene Umsetzung mit eigenen Figuren:
// Frida Fünfer und Eli Einer. Technische Vorlage: Die Zehner-Bande.
// ==========================================

const appStyles = `
  /* Schriften werden mit der App ausgeliefert (public/fonts, SIL Open Font License 1.1) – keine Verbindung zu Google.
     „Fuenfer Fredoka“ = Fredoka mit Querstrich in der 7 (werkzeuge/sieben_querstrich.py). */
  @font-face { font-family: 'Fuenfer Fredoka'; font-style: normal; font-weight: 400; font-display: swap; src: url('fonts/fuenfer-fredoka-400.woff2') format('woff2'); }
  @font-face { font-family: 'Fuenfer Fredoka'; font-style: normal; font-weight: 500; font-display: swap; src: url('fonts/fuenfer-fredoka-500.woff2') format('woff2'); }
  @font-face { font-family: 'Fuenfer Fredoka'; font-style: normal; font-weight: 600; font-display: swap; src: url('fonts/fuenfer-fredoka-600.woff2') format('woff2'); }
  @font-face { font-family: 'Fuenfer Fredoka'; font-style: normal; font-weight: 700; font-display: swap; src: url('fonts/fuenfer-fredoka-700.woff2') format('woff2'); }
  @font-face { font-family: 'Bangers'; font-style: normal; font-weight: 400; font-display: swap; src: url('fonts/bangers-latin-400-normal.woff2') format('woff2'); }

  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes pop-in { 0% { transform: scale(0.8) translateY(15px); opacity: 0; } 70% { transform: scale(1.05) translateY(0); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes nudge { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-18%); } 50% { transform: translateY(0); } 75% { transform: translateY(-10%); } }
  @keyframes shake-short { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-5px); } 40%, 80% { transform: translateX(5px); } }
  @keyframes flip { 0% { transform: perspective(600px) rotateY(0deg); } 100% { transform: perspective(600px) rotateY(180deg); } }
  @keyframes glow { 0%, 100% { stroke-opacity: 0.15; } 50% { stroke-opacity: 1; } }
  @keyframes cheer-pop { 0% { transform: scale(0); opacity: 0; } 25% { transform: scale(1.25); opacity: 1; } 40% { transform: scale(1); } 75% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.1); opacity: 0; } }
  @keyframes cheer-burst { 0% { transform: translate(0, 0) scale(.3) rotate(0deg); opacity: 1; } 80% { opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(1) rotate(var(--rot)); opacity: 0; } }
  @keyframes glow-ok { 0% { box-shadow: 0 0 0 0 rgba(132,204,22,.7); } 100% { box-shadow: 0 0 0 18px rgba(132,204,22,0); } }

  .anim-float { animation: float 4s ease-in-out infinite; }
  .anim-pop { animation: pop-in 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  .anim-shake { animation: shake-short 0.4s ease-in-out; }
  .anim-nudge { animation: nudge 0.6s ease-in-out; transform-box: fill-box; transform-origin: center; }
  .anim-flip { animation: flip 1.2s ease-in-out forwards; }
  .cheer-check { animation: cheer-pop 1.3s ease-out forwards; }
  .cheer-star { position: absolute; left: 50%; top: 50%; animation: cheer-burst 1.1s cubic-bezier(.2,.7,.3,1) forwards; }
  .anim-glow-ok { animation: pop-in 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, glow-ok 0.9s ease-out 0.2s 2; }
  @media (prefers-reduced-motion: reduce) { .cheer-star { display: none; } }
  .anim-glow { animation: glow 0.9s ease-in-out infinite; }
  .anim-glow3 { animation: glow 0.8s ease-in-out 3; stroke-opacity: 0; }

  body { font-family: 'Fuenfer Fredoka', sans-serif; }
  .font-comic { font-family: 'Bangers', 'Fuenfer Fredoka', cursive; letter-spacing: 0.05em; }
  .storm-dots { background-image: radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px); background-size: 18px 18px; }
  .custom-scrollbar::-webkit-scrollbar { width: 8px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(250, 204, 21, 0.5); border-radius: 4px; }
  /* ---------- Arbeitsblätter (A4) ---------- */
  .sheet-page { width: 210mm; height: 297mm; padding: 13mm 14mm 11mm; background: #fff; color: #111827; box-sizing: border-box; position: relative; overflow: hidden; font-family: 'Fuenfer Fredoka', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet-line { border-bottom: 1.5px solid #374151; }
  .blatt-haende svg { width: auto !important; height: 100% !important; max-width: 100% !important; }
  @media print {
    @page { size: A4 portrait; margin: 0; }
    html, body { background: #fff !important; }
    .no-print { display: none !important; }
    .sheet-studio { position: static !important; inset: auto !important; overflow: visible !important; background: #fff !important; padding: 0 !important; display: block !important; }
    .sheet-scroll { overflow: visible !important; padding: 0 !important; background: #fff !important; }
    .sheet-scale { transform: none !important; margin: 0 !important; width: auto !important; height: auto !important; gap: 0 !important; }
    .sheet-scale > div { box-shadow: none !important; }
    .sheet-page { box-shadow: none !important; margin: 0 !important; break-after: page; page-break-after: always; }
    .sheet-scale > div:last-child .sheet-page { break-after: auto; page-break-after: auto; }
  }
  .paper { background-color: #fffbeb; background-image: linear-gradient(rgba(30,27,75,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(30,27,75,0.045) 1px, transparent 1px); background-size: 22px 22px; }
`;

// ==========================================
// FARBEN
// ==========================================
// Wie in der Zehner-Bande: Einer grün, Zehner blau, Lösungen violett.
const COL = {
  e: '#16a34a', eLight: '#dcfce7', eDark: '#14532d',
  z: '#2563eb', zLight: '#dbeafe', zDark: '#1e3a8a',
  empty: '#cbd5e1', ink: '#1e1b4b', sol: '#7c3aed'
};

// ==========================================
// EINSTELLUNGEN (nur für diese Sitzung – oder per Link ?zr=10|20)
// ==========================================
const SettingsContext = createContext(null);
const useSettings = () => useContext(SettingsContext);

function readUrlSettings() {
  const out = { maxN: 20, einerAufTisch: 5, /* Einer-Plättchen auf dem Tisch */ eingabe: 'stift', blitzMs: 2000, mitNull: true, blitzGrenze: 3000, stufeFest: null, zahlFest: null }; // eingabe: stift (Fingerschrift) | tasten; blitzMs 0 = Bild bleibt stehen
  try {
    const p = new URLSearchParams(window.location.search);
    const zr = parseInt(p.get('zr'), 10);
    if ([10, 20].includes(zr)) out.maxN = zr;
    const b = parseFloat(p.get('blitz'));
    if (b >= 0 && b <= 5) out.blitzMs = Math.round(b * 1000); // ?blitz=0 … 5 (Sekunden)
    const st = parseInt(p.get('stufe'), 10);
    if ([1, 2, 3, 4].includes(st)) out.stufeFest = st; // ?stufe=1|2|3|4: Zerlegen-Stufe fest (z. B. für Förderkinder)
    const z = parseInt(p.get('zahl'), 10);
    if (z >= 4 && z <= 10) out.zahlFest = z; // ?zahl=4 … 10: direkt zur Zerlege-Zahl
    const g = parseFloat(p.get('grenze'));
    if (g >= 1 && g <= 10) out.blitzGrenze = Math.round(g * 1000); // ?grenze=3: Blitz-Stern in der Prüfung unter 3 s Bedenkzeit
    if (p.get('eingabe') === 'tippen') out.eingabe = 'tasten'; // ?eingabe=tippen: Ziffernfeld statt Fingerschrift
    if (p.get('null') === '0') out.mitNull = false; // ?null=0: keine Zerlegungen mit 0
  } catch (e) { /* ohne URL-Parameter */ }
  return out;
}

// ==========================================
// ERZÄHLER (Thorsten)
// ==========================================
// Alle Sätze stehen in src/saetze.js (eine Liste für App und Ton-Erzeugung, werkzeuge/saetze_erzeugen.py).
const SAETZE_MP3 = true; // Sätze als MP3 (Thorsten); fehlt eine Datei, steht nur der Text in der Sprechblase
// Hilfe-Satz nach einem Fehler: den Fünfer nur erwähnen, wenn einer im Spiel ist
const hilfeSatz = (n) => (n >= 5 ? 'nochmal' : 'nochmal_kurz');

const NarratorContext = createContext(() => {});
const useSay = () => useContext(NarratorContext);

// ---------- Ton: MP3-Dateien über Web Audio (wie Zehner-Bande) ----------
// Das Tonsystem wird beim ersten Antippen „aufgeweckt“ und bleibt wach – so fehlen keine Wortanfänge.
let playCtx = null;
const audioBuffers = new Map();
let currentSource = null;
function getPlayCtx() {
  if (typeof window === 'undefined') return null;
  if (!playCtx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; playCtx = new C(); }
  if (playCtx.state === 'suspended' && playCtx.resume) playCtx.resume().catch(() => {});
  return playCtx;
}
if (typeof window !== 'undefined') {
  const unlock = () => {
    const c = getPlayCtx(); if (!c) return;
    try { const b = c.createBuffer(1, 1, 22050); const src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0); } catch (e) { /* egal */ }
  };
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
}
function loadAudio(path) {
  if (audioBuffers.has(path)) return audioBuffers.get(path);
  const ctx = getPlayCtx();
  const pr = fetch(path)
    .then((r) => { if (!r.ok) throw new Error('fehlt'); return r.arrayBuffer(); })
    .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)));
  pr.catch(() => audioBuffers.delete(path));
  audioBuffers.set(path, pr);
  return pr;
}
function playFile(path) {
  const ctx = getPlayCtx();
  if (!ctx) return Promise.reject(new Error('kein Ton'));
  return loadAudio(path).then((buf) => new Promise((res) => {
    if (currentSource) { try { currentSource.stop(); } catch (e) { /* schon fertig */ } }
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.onended = res; src.start(); currentSource = src;
  }));
}
// Nach jeder Neuerzeugung der Töne hochzählen – sonst spielen Geräte alte Dateien aus dem Zwischenspeicher
const TON_STAND = '2026-10-27c';
const playNumber = (n) => (n >= 0 && n <= 20 ? playFile(`audio/thorsten/${n}.mp3?v=${TON_STAND}`) : Promise.resolve());
// Gibt ein Versprechen zurück, das erfüllt ist, wenn der Satz zu Ende gesprochen ist (auch wenn der Ton fehlt) –
// so kann ein Folgesatz warten und schneidet den ersten nicht ab.
function playSatz(key, n) {
  if (NUR_ZAHL.includes(key)) return new Promise(ok => setTimeout(() => playNumber(n).catch(() => {}).then(ok), 150));
  const danachZahl = NACH_SATZ_ZAHL.includes(key) && n != null;
  if (SAETZE_MP3) {
    return playFile(`audio/thorsten/saetze/${satzDatei(key, n)}.mp3?v=${TON_STAND}`)
      .then(() => danachZahl && playNumber(n))
      .catch(() => { if (danachZahl) return playNumber(n).catch(() => {}); return undefined; });
  }
  if (danachZahl) return new Promise(ok => setTimeout(() => playNumber(n).catch(() => {}).then(ok), 250));
  return Promise.resolve();
}

// Sprechblase des Erzählers mit „Nochmal hören“
function Erzaehler({ narr, onRepeat }) {
  return (
    <div className="flex items-stretch gap-2 w-full max-w-2xl mx-auto mb-4">
      <div key={narr.stamp} className="flex-1 bg-white border-4 border-indigo-900 rounded-3xl px-4 py-3 flex items-center gap-3 shadow-[4px_4px_0_rgba(30,27,75,0.2)] anim-pop min-h-[72px]">
        <Volume2 className="w-7 h-7 text-indigo-500 flex-shrink-0" />
        <span className="text-xl md:text-2xl font-bold text-indigo-950 leading-snug">{narr.text}</span>
      </div>
      <button onClick={onRepeat} aria-label="Nochmal hören" title="Nochmal hören" className="w-[72px] flex-shrink-0 rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg active:scale-95">
        <Ear className="w-9 h-9" />
      </button>
    </div>
  );
}

// ==========================================
// FÜNFER UND EINER (sachlich, wie das Material – ohne Gesicht, auf Wunsch der Lehrkraft 15.10.2026)
// ==========================================
// Fünfer (Frida): fünf grüne Plättchen in einer Reihe mit Rahmen. blue = Teil eines Zehners.
function FridaSvg({ size = 120, blue = false }) {
  const c = blue ? COL.z : COL.e, light = blue ? COL.zLight : COL.eLight, dark = blue ? COL.zDark : COL.eDark;
  const tr = 'fill 1s ease, stroke 1s ease';
  return (
    <svg width={size} height={size / 5} viewBox="0 0 50 10" aria-label="Fünfer" style={{ overflow: 'visible' }}>
      <rect x="0.5" y="0.5" width="49" height="9" rx="4.5" strokeWidth="0.9" style={{ fill: light, stroke: dark, transition: tr }} />
      {[0, 1, 2, 3, 4].map(i => <circle key={i} cx={5 + i * 10} cy="5" r={DOT_R} strokeWidth="0.7" style={{ fill: c, stroke: dark, transition: tr }} />)}
    </svg>
  );
}

// Einer (Eli): ein einzelnes grünes Plättchen
function EliSvg({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-label="Einer">
      <circle cx="5" cy="5" r={DOT_R} fill={COL.e} stroke={COL.eDark} strokeWidth="0.7" />
    </svg>
  );
}

// Kleines Zahlenhaus (nur als Bild auf der Zerlegen-Karte)
function MiniZahlenhaus({ size = 110, n = 6 }) {
  const rows = [[n - 1, 1], [n - 2, 2], [n - 3, 3]];
  return (
    <svg width={size} height={size * 1.05} viewBox="0 0 100 105">
      <path d="M8 34 L50 4 L92 34 Z" fill="#fde68a" stroke={COL.ink} strokeWidth="2.5" strokeLinejoin="round" />
      <text x="50" y="29" textAnchor="middle" fontSize="20" fontWeight="700" fill={COL.ink} fontFamily="Fuenfer Fredoka, sans-serif">{n}</text>
      {rows.map(([a, b], i) => (
        <g key={i}>
          <rect x="14" y={36 + i * 22} width="36" height="22" fill="#fff" stroke={COL.ink} strokeWidth="2" />
          <rect x="50" y={36 + i * 22} width="36" height="22" fill="#fff" stroke={COL.ink} strokeWidth="2" />
          <text x="32" y={53 + i * 22} textAnchor="middle" fontSize="16" fontWeight="700" fill={COL.e} fontFamily="Fuenfer Fredoka, sans-serif">{a}</text>
          <text x="68" y={53 + i * 22} textAnchor="middle" fontSize="16" fontWeight="700" fill={COL.e} fontFamily="Fuenfer Fredoka, sans-serif">{b}</text>
        </g>
      ))}
    </svg>
  );
}

// ==========================================
// ZWANZIGERFELD MIT FESTEN PLÄTZEN
// ==========================================
// 2 Reihen à 10 Plätze, jede Reihe = zwei Fünferplätze mit Lücke dazwischen (bis 10: eine Reihe).
// Reihenfolge der Plätze: Reihe 1 links → Reihe 1 rechts → Reihe 2 links → Reihe 2 rechts.
// Maße in SVG-Einheiten: U = ein Platz.
const U = 10, GAP = 6, ROW_GAP = 6, PAD = 4;
const FIELD_W = 2 * PAD + 10 * U + GAP;
const fieldH = (rows) => 2 * PAD + rows * U + (rows - 1) * ROW_GAP;
const DOT_R = U * 0.36;
const slotPos = (i) => {
  const row = Math.floor(i / 10), c = i % 10;
  return { x: PAD + c * U + (c >= 5 ? GAP : 0) + U / 2, y: PAD + row * (U + ROW_GAP) + U / 2 };
};
const halfRect = (h) => {
  const row = Math.floor(h / 2), side = h % 2;
  return { x: PAD + side * (5 * U + GAP), y: PAD + row * (U + ROW_GAP), w: 5 * U, h: U };
};

// Gelegte Teile liegen als Stapel vor (Reihenfolge des Legens). Daraus ergeben sich die Plätze lückenlos.
const layoutPieces = (pieces) => {
  let s = 0;
  return pieces.map((p) => { const o = { ...p, start: s, len: p.k === 'f' ? 5 : 1 }; s += o.len; return o; });
};
const countSlots = (pieces) => pieces.reduce((a, p) => a + (p.k === 'f' ? 5 : 1), 0);

// Darf ein Teil hier liegen? pt = Ablagepunkt in SVG-Einheiten (null = angetippt, also kein Ort).
// Großzügig: Ein Fünfer rastet ein, wenn er irgendwo auf der richtigen Hälfte landet,
// ein Einer, wenn er in der Nähe des nächsten freien Platzes landet.
function checkPlace(kind, pt, filled, total) {
  if (filled >= total) return { ok: false, key: 'feld_voll' };
  if (kind === 'f') {
    if (filled % 5 !== 0) return { ok: false, key: 'fuenfer_platz' };
    if (!pt) return { ok: true };
    const target = filled / 5;
    let best = 0, bestD = Infinity;
    for (let h = 0; h < total / 5; h++) {
      const r = halfRect(h);
      const dx = Math.max(r.x - pt.x, 0, pt.x - (r.x + r.w));
      const dy = Math.max(r.y - pt.y, 0, pt.y - (r.y + r.h));
      const d = Math.hypot(dx, dy);
      if (d < bestD) { bestD = d; best = h; }
    }
    if (best === target) return { ok: true };
    return { ok: false, key: best < target ? 'fuenfer_platz' : 'fuenfer_naechster' };
  }
  if (!pt) return { ok: true };
  const c = slotPos(filled);
  if (Math.abs(pt.x - c.x) <= 1.8 * U && Math.abs(pt.y - c.y) <= 1.1 * U) return { ok: true };
  return { ok: false, key: 'einer_platz' };
}

// Ein Teil zum Anfassen: Fünfer = 5 Punkte mit Rahmen, Einer = 1 Punkt. unit = Pixel pro Platz.
function PieceSvg({ kind, unit }) {
  const w = kind === 'f' ? 5 * U : U;
  return (
    <svg width={(w * unit) / U} height={unit} viewBox={`0 0 ${w} ${U}`} style={{ display: 'block', overflow: 'visible' }}>
      {kind === 'f' && <rect x={0.5} y={0.5} width={w - 1} height={U - 1} rx={U * 0.45} fill={COL.eLight} stroke={COL.eDark} strokeWidth={0.9} />}
      {[...Array(kind === 'f' ? 5 : 1)].map((_, i) => <circle key={i} cx={U / 2 + i * U} cy={U / 2} r={DOT_R} fill={COL.e} stroke={COL.eDark} strokeWidth={0.7} />)}
    </svg>
  );
}

// Ein Teil, das nicht passt, gleitet sanft auf den Tisch zurück
function ReturnGhost({ r, onDone }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    let id2;
    const id = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setGo(true)); });
    const t = setTimeout(onDone, 650);
    return () => { cancelAnimationFrame(id); cancelAnimationFrame(id2); clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = go ? { left: r.to.x, top: r.to.y, transform: `scale(${r.toScale})` } : { left: r.from.x, top: r.from.y, transform: 'scale(1)' };
  return (
    <div style={{ position: 'fixed', zIndex: 400, pointerEvents: 'none', transformOrigin: 'top left', transition: 'left .5s ease-in-out, top .5s ease-in-out, transform .5s ease-in-out', ...pos }}>
      <PieceSvg kind={r.kind} unit={r.unit} />
    </div>
  );
}

// Ziffern-Tastatur (wie Zehner-Bande, größer, Symbole statt Wörter)
function NumPad({ value, onChange, onSubmit, maxLen = 2, disabled = false, onStart, kompakt = false, eng = false }) {
  const press = useCallback((d) => { if (disabled) return; onStart && onStart(); if (value.length < maxLen) onChange((value === '0' ? '' : value) + d); }, [value, maxLen, onChange, disabled, onStart]);
  const del = useCallback(() => { if (!disabled) onChange(value.slice(0, -1)); }, [value, onChange, disabled]);
  useEffect(() => {
    const h = (ev) => {
      if (disabled) return;
      if (/^[0-9]$/.test(ev.key)) press(ev.key);
      else if (ev.key === 'Backspace') del();
      else if (ev.key === 'Enter' && value) onSubmit();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [press, del, onSubmit, value, disabled]);
  const hoch = eng ? 'h-10' : kompakt ? 'h-12' : 'h-16'; // kompakt: niedrigere Tasten (Übung 1/2 auf dem iPad quer)
  const key = `${hoch} rounded-2xl bg-white hover:bg-indigo-50 border-2 border-indigo-200 text-4xl font-bold text-indigo-950 shadow-[0_3px_0_#c7d2fe] active:translate-y-0.5 active:shadow-none disabled:opacity-40`;
  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[290px] mx-auto">
      <div className={`w-full bg-white border-4 border-indigo-900 rounded-2xl ${eng ? 'h-12' : kompakt ? 'h-14' : 'h-20'} flex items-center justify-center shadow-inner`}>
        {value ? <span className="text-6xl font-bold leading-none text-indigo-950">{value}</span> : <span className="text-5xl font-bold text-slate-300">?</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <button key={d} disabled={disabled} onClick={() => press(d)} className={key}>{d}</button>)}
        <button disabled={disabled} onClick={del} className={`${hoch} rounded-2xl bg-slate-200 hover:bg-slate-300 border-2 border-slate-300 flex items-center justify-center text-slate-700 active:translate-y-0.5 disabled:opacity-40`} aria-label="Löschen"><Delete className="w-8 h-8" /></button>
        <button disabled={disabled} onClick={() => press('0')} className={key}>0</button>
        <button disabled={disabled || !value} onClick={onSubmit} className={`${hoch} rounded-2xl bg-yellow-400 hover:bg-yellow-300 border-2 border-yellow-500 text-indigo-950 flex items-center justify-center shadow-[0_3px_0_#ca8a04] active:translate-y-0.5 active:shadow-none disabled:opacity-40`} aria-label="Prüfen"><Check className="w-9 h-9" strokeWidth={3} /></button>
      </div>
    </div>
  );
}

// ==========================================
// FINGERSCHRIFT (unverändert aus der Zehner-Bande übernommen)
// ==========================================
// Ziffern-Erkennung (Handschrift): kleines neuronales Netz 784–128–10, trainiert auf MNIST
// (Yann LeCun, Corinna Cortes, Christopher J.C. Burges – CC BY-SA 3.0) mit zusätzlich schräg/dick geschriebenen Ziffern.
// Läuft komplett im Browser, es werden keine Daten verschickt. Gewichte als int8 (Base64) mit Skalierungsfaktor.
const DIGIT_NET = {
  hidden: 128,
  s1: 0.008791151456534863, s2: 0.013044895604252815,
  w1: 'AAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgwQHSIxHxcL//j/AQEAAAAAAAAAAAAAAQAABgoNFQ0QDALz7QADBxIG9P0AAAAAAAABGjAFAPwcEwoNAhD9AfP5Ae7w6unr7iwVAQAABBwUDgb2+gbvFQgO/vP1/P/r+vX13uUMEf4AAAYxIxUE4fj07/fi7/vo6+oGDhgOCOTpB/n3AAAIDRgtEPr/AAD6/gMI8v0DEwcKCwTr+g36/AAAChIbCgsB+AYD+Q0kIhcYEw789/Pg8e7t7wILBw0JFAgBAvX//wsPFyMvHBMQAgbq2eLn3u8CAwID/g349wQOCwYIDi4lHw8QBf4H49za8eHq+wAAEvoJ/OoGDwv+Af8dGAoBAAP5/uDe1f7i4vgBEQsGGu3x9wH3+PXt7ej48/YOBfbm3OH+69T7AQ37CA7J4u35Afvs3eHc8wEHEhAB+97V+PXg7gACCQrm2ej38/X38+fm5Oz9CxkKDxDg5PXy6vAAAyL43N/28fT8BAH45PkA+wERDhcO6fEL9/UAAAAY8eri+vn5/QoB+frn+fz7APb+D+PvAAr1DwABEvju3/j4+AT///jp7vDxAgLxCP3t6xEZJB4AAg8M6Nb18fny8Pby8vD69gH89/7x7d8OLjEFAwgV8t7R9Pr0AAb+BPABBgUMCgP/AvTnDCEh/wINEurk6fX+8wYACgEOEwYXCP/09fbs6QkYCf4EGRv78fX6/AMREhoZHAsQCAcI/fjt8QcXG/j9Ag8TBwIC/gYEEyMeGBUJFREPA/b4/PELIS8vEQABBvj07fgOFxMaEgb/Bw8DAvnu9PPtChsgDAIAAP/p4fDm+gMODw0H9QL69f3x8Qjz8gwSFAEBAAAB1MfF1/EJEP4J+wL/7u0B/gMJAPLr+A0CAAAAAMHH1uYPBwP6//wI/AAJA/IHBgEIBRAGAQAAAADczNrcCx0MA/v/8PID/e/sLBwbHhQBAAAAAAAAAAAGEAQDCwwTJCQH+hUpDRL9+vv9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEE9u8AGhgPEw0FAAIBAAAAAAAAAAAAAAD6/gsbJiAPA/L+E/n0B/PoDQb8/wAAAAAAAAMVDSMeDf0WLDATERkMEy8YCezb5uIiDQEAAP75+gwLDyETEB0LFx0bFAkL/gf56vH3Bwr/AAADJ+/q/wMBAgEH9vLwAvsDAgH6DwTy3PINBwD29QHa3Pnw+wDy+/HxBv4QBgj8+P/6Aez39QEA/PHq49nr5efg6vH8Bg38AQb6/voFBf7T3un/+gDcydXx+PD1CQn8DA/59f35A//59vTvytbq//7+ybXtAv33BwMTCQYAAwAE/P8G+/H58uL64+MAAMHp7gcD/AkEF/v48v3/EAwKA/cA+/kGLe7iAADG//ka//MCEAsB7v8QExULBu/39wDw+hbb7AD/0M/8EP35Afzu+vsTGw3/Avj3Afv9/QQB4fMAANXa4f78+grv8/IOGhEU/gX/9gbzARQa//n0AAEE7ebp9e7o6OcAEQ0CCfoM/AIG6gEODAsLBwACIwHk2+js5OvyBgwB9vP/DA0WBPoB5/sA5gQAAgDo3ODj+/8C//b06fXl/hcXIAkHBOUFEukGAAH6/OD0AwAE9ene2Njm8fcTGxUIAfTu8fffCAIC+Q739QUEBu/w4urq+fcEFA4cDQkA6O700/7++AIbCxMWD/8K+vf6BA8VERUdHQnw9Ozc2sv9/Oz2CBQRFxEVFAwaIBMUFREMGRX/2tjm6erX/f709/URBxgbIBQSIxgWGAgOChIQ/MrL3QMT1ukAAAQGEgUIERQBFRIWAA348/v58vLT0+cHFPf9AAAKQBgICwAQ+wL++ern1Nzb3crf0eMACxL//wAA5BAeDAwN8t/hz+LZzM3az8HM7Obq/w4KAQAAAO0HAfjr7ubm5vXx5v8GDPPx+h0H9vL3/gEAAAAAGR8UAezrDB0SDQsiIhkHGB8yIf3+AAAAAAAAAAD/8vH34O3g3+7l+SEd9f8DBwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAPbz/xINBBEKAv///PwAAAAAAAAAAAAA/wIWDRgGChMZFxMMBfbq+RUSDgsEAAAAAP/79xk3FgILBQkYGBcRJhsdDA73/woA7PkAAAD7ABgSHP78EyAVCgcNBQQFDwnxBQjv5eP+CAAA//4LBw4UGR0TKBgHDA39/QL8/gUPAe7n/hQAAAcfGhoYCAEPERYKBgoIBgESCggCCfQG9O8IAAIONhYZGvfq8f8L8f4H+w8GARAQCwgICPrqDAABDCj1AA375N7n5+btAvEC/QcDDQoNEQoC4/8AAP0WCvv94eHC0NXN2ODq8QQCBBEGByMXHvfuAAD6EOq/ybzR2uHZ4ez9/AAHAgkAAREdHyHo6wAA+fPNr9LiCQ0MExEaCPby6/cG9g8UEiUU4/EAAADt0t/+DDElIRkdFAwG7efw5u8DFAAeG/YFAAAHHQv+BykmIB8XGRkOCe/d6uPq9fD1FyELAv4AAiID7/IEGBn6/wcNAvnu7uL39vfuCxojFAMAAP8dCPrs8Av57fYD+fL29fPw8gAT9AEWHQ8NAAEAHBD94PkE+P3yAwMA5PoC9/0EExv79vAFEQABBCAD/O77+QYC+QP68ef89PT7AB8OANvj/AMAAP4d+fMCCAQFAfILDQMG9/X16fMNA/PO9wsEAAAGGu0FBAUFAf7/FRcPBfsHA+X4Av/x2vIIBAD/Axz6Av///xUODAwSFg8CDwT88QsAB/QIAAEA/vwWDPf6AgT/Cvz9DBYSGBUDA/L5BAYBDvgBAP4WNgv99foLBQ4L/AYEDhYU/Pn59vkB9wD1AAAACkMbHwICCRELD/n0AAH4+fEADP/a6fH7/gEAAPYOCxLz9P8G9en7DQ4PCwkMDP/d4OP1AAABAAD8/wbdqc3l1tPFzPf19h8jD/rj7wH8AAAAAAAAAAAH/N3MyNPby9Ld5ODq7/r/BA0OAAAAAAAAAAAAAP/9/v//AAADBgYEAQAAAAADAwAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAwI/v3++/f79/X/AgMCAAEAAAAAAAAAAAb98w0GCu3f0dS/tb/2Df0KBAEDAgAAAAAAAAId/RchHB3/6vLr+dzw6efq5ef0DxwGAAAAAQATFw4pFikLGQ0HDPr9Df35AP3u7wcuGwAAAAUlIu37BAgIHCEYERIKHxQQCRcRBfD+ITENAAD1CgDj9AcOChYgFAcBDx4UBgD/FA/++A8bAgD97vMN/AsWGxYbDRUI/QT6+/Tu7QMD88fiCQAA/OYHARIPFB8dFg/+DAPv6O0D+PkCCu/F3gj9AADu8vMZDwsTERL6B/Tz4ev39On7Bvv37/cB9AAA7OXnGBb5/fD6+wQB+O/p+wH67gQMEAX3APMAANzO7f755PPrAwYUIhAD/AEM/Nv3BhEcCxX7AAD24OHnz+rv8f4VIikiDf4N+vnq8gP7Gyc5EAAA/QLv0rzx7uLtCxUaFAMCCfjxAfULDBUeMgkAAP/73MnO7ebe6un8DgsNBQIC/wr4/wEDDCcFAP8D6+fI3vr+6+Tk4gMREwwHC/8HAxAHBwsLDgAADBcH6wAS//Pv2Or6AQYCCBITBxsJA/n9EhUAAAY8MRMTDv3z7+X38fUACxkYEhEaGBEH9QEGAf0PMy0bEQr9+/fx8eXg7P8UDQkTDRYoE/fwCAD7DSsvIRoD//wF9Ovt7uX+//gKBgz9FwTpBAYA/ggxJyMS/wb4/fwC/P/08PH3BxMQDRcA/wMAAAAEGRsDGQoGDgb7/PkG+/Ps8f8QDAcSDiAjAQAACCIa8fwPCAkQEAH//fX2Avv8CxAFAPoNDgIAAAUtIv//ARkVFgwQCAQCAv/y+f8OGQ31BgUAAADnBfoIFRQXEhkPJR8SDRsJCvXz8vvw7QsGAAAA9AbS6xX98/wKEiIVHBseBQQSFxUG8vcEAwAAAAAF7+D1AAEbDgoD//357+r97uPh6+36/QAAAAAAAAAAAAD8CuDR7O8IGQ/s8Pn8/P3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//HiQiHQEB/wIC/wAAAAAAAAAAAAAAAP/z+QgxUjwa7vr8+vb9FhcA7PIEBQIAAAAAAAD+9gINMFIYEOrxDgHqBRcV5uYSGPQNBAEAAALy0OjP6RAM7d7Y7wj8A/n4+ezm6/4NBPkDAAAF9b/M6gQlAt/g5QIHCxEQBgEE+QTxB/n6AgAAFQDO4PskHwbq3e8ADBMR9/Ly+Q8L5e30BP0AAQro+94FExUH9uzvABoRDP/28fQHFgrq5PIIAAIJ4e7MDQ8QDQLz7RIaFvjo8AAIBwkU+vX4CwACCL7C0/kFBQX31+MOIS8Q7fQDCAwFCPT2KRwAAgDF1/oC+wT869jyGDAzEen8ARUJCCEKGzQcAAH92REI797wBPTW5u8TKhDp5/cIFhIaHC0TFwAA+fEO+vX0/fvj3N3kDA/28vHt/f0ACh8yOxEAAPv+AeT3AwTy7vX28/wI+ebx7P7q9wAYITAJAAL9E/3t5/f69AQCCPUFD/7m7/T26v3z9QQnBAAD9f38APD/9QIJEBQDEwny8OPs8Pj21PwELgAAAeYH/ekGAfsFDR4XHgsC9vff5/0GCPz6GiL8AADc/Ab1Af8ECxopJhAE+vL0/gkUHyYK/BkIAgAA+eb2BAf/BRMaGhgE7fL5DgEcHB4ZFxgv8AD+7w3g9wkEDxMLDREN8/b5DBccBwgFER0PMv7/+twQAf8CCgcEC/8A9vEAAQ4ZCwsA/gEDDRj1/v7uAxUL8fkDCAr4/vsFDA0B8+0HBOjs+AUjFP8AAPoRDPn3CfT98fT//gT49vHh7+/s5O/sEAgBAAD66fcDBwQF/PYCAQwHAuri7gz46fbP9h8KAQAAAP/oFx4I+/nl7+r69fPJy+fs6OcB9SIlEQEAAAAUFyIIHxUeDPfY/Qnj1Oi/rsHsBfQTGQgAAAAACx0rIhv03dbo69ng9gX43MfV+wIDAwEAAAAAAAD38/f14uD1/wAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/gAAAAAAAAAAAAAAAAAA/wINFxAJCA0IBgAA/v7+AAAAAAAAAAD/AAIBCRb6DBr19g0gFAQIGxUPAQAAAAAAAP/t2e/w29zj5BYL9/8IBfz2+vfy/QUT/wkAAAD99Pn77dvj5QIHDP3+9vkJAfvv+/j17Q0QCQAA/vseIP3j4vH8FB8a/wID/Pbv4+YG+f4JJBgAAAQtHQbz9PYJEhYSA/X4+vn+8uz3BQEB/PoMAAH48Oft7O4GHAYJBen1CwEB+vjw//gBEAfc7f7+5czZ7fH3Dg8H+/X1CAgABgkP/vrz9v8D8wEA/ebm5/b17vv+8vT7AQb9+wgVGxAD+QAKDvsUAP/47QIRBAQD8Ojz8QX58PMFBREOAOvhAPf5DQAAGfAABgQE9/fy9gL/+en4+AMLFQzw3fPy9wYAAAr87QoJEgn++vH4/fLtDBETEg8H+fDk6P0TAAAK7dj4CAgEAPLy+/b4BBwaGBsECgD65foDBAD/9+PS2v8B8/sA9g30BhUZBRsJ/wMEBP8qEwQA/ufw69j28wUKBg4ECxIICAUG+fH2AAEHJBMHAP8MAgDg7u8GEwsL+v0PDgD3/fH48+8EAyoUAQD9GQYB6+D/EhcLD/4LAwPy8/r6CPv+AA5BMwAA7xTvA/brCQ0MDwT9BPf+8e37+g37CwwVFDYEAOsG+ALx5+8NGhcKBvb//vP1AAcFERkKAOIdBQDuDgYE8e75+goMEwz8APLi2/P+CBYUCfbT+QMAABYF8ez47vsPBBgNAe3q3+bs8QAKD//79AAAAAURAPjq6/H3BAYSGxAC9O/d5Ozq/Pvp+/j+AAAAAu30++3y4Oj/CCIbAwL68d3Rv8vb4QTw+P8AAAnx3fv05/P7+QkRJCQRCuPT17/W4vgWA///AAAD/fvy9fHo+RAoGSY4Kxrz7Oa/z9D3AwwCAAAAAPrm3+4HFwQF/wcVLjIY6/L/6/T0AA0VAwAAAAAA/wEFBAwWKSHzExIA+PwEAwABAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//rt6PIBGhwpGQsDAgAAAAAAAAAAAAAA/wMQDuLl0dLfCT90f1pEKxYOFwoBAAAAAAAA3N/5Jf3v6t/r6QUnISEgMi8pGw0TAvwAAAAAAub4Dh79FhMDCgH/AuvxExkW9uv6AvQDAwAAAAcBGjMzExIT/vDvB/vr4Obn6OHw7/8M8N/yAP8ECwQfOBUcFurp9wMV/f76Auzm3eLw99DN/gD//er0ITIOGgDs7vD0CPwDBv369/Pw/hH73g8ABejc/SMRAfr57vr7+wj58/n57+72/gssCNoEAADn6AYW/vP0+u/6/PT+CPnp6/Db+fT+GPgYAAAA+/L7BPADCfbn+PXv9f8D9fD85vjj9ALvEAYAAPTv9PcDDwP7+/z98wD5BAsKChIF8AMG8OQMAADk7fH1BBwO+vn5Eg4HEBgTGxYRCvj8FwYRBgD/8uv1DBEZBwgACBcPAREPCAgaDwL+/A7/DAgB/+T9CQcUEQ8PFAkGExUJDgsLExMACA38ARkRAADUJRcRCRINCgkOEAQMCxkYGR4eCgsKGRQaEwD/8zkrBwAD+wT9AQD5DBwZGBwUExoRIjY0IgYA+R9ELwYF9fkE/wX59P8HFhIgDxYgChIREf/6/+AYLQbo7P3+8vf44eHzChINBgT6GQH7Cf77AP3LFRMb5vr+8eXi7+T09gkH/vrb1+Pk7e/m6wD2zfPwJf74A/Dt7+Pi5+756+Pd07/X0dHP6vIA/ODP2QIMCQoB+Qf6/wz48fDn3NjV1dPW6AnY4QAA+wC20+XvAfsIEgwD+v4I7uLx69/y+QsYCfwAAP740ucI+BECAhAECRL88/X5/fr88gIvDwIAAAD38f4PFgMYLRAF/fgQDQshLyoVDQLzLAkAAAAA/fvo7gMRNiD9CgH9ExYkOiYO+gvm6/gHAQAAAAAA9ObqFiYU//oMIhf7+voD7/gMDv4FCQEAAAAAAAD//v8GCiUa8QH71uP8DQMFDAcAAAAAAAAAAAAAAAAAAAAAAP/9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUMCvfi9f31/REN/fn+/wAAAAAAAAAAAAEJAPQMHf/yHwD34+cB6Mnt/fbx9/0AAAAAAP//Gx8KAfj5Dx4G/vX3AAAOHAXyz+IbFwEAAAEE+/wSFv8JESUSAw4QDg4XAw0GAvoIJgb3AAAEBgDm/P/99hAZIBYdJRsOCRcVBA8gAiH97wAA+v733uD2/fwXHSEdIycgCwj8CQ4WHxIAHP0AAPoH/+f68QH/Bgf5+f4MDwH5AfQEEh0J9Sn96PIOEv72+gv/+/Tl5evs/Ar+D/v38/MW8u8Y//j+ExT38gv9+Pny6urT3OYEERUO+fHx/dTWAQAAAAkB8/sE9Pbz9vXi4dTo+CESEfn2/u3H4gIA/ubs4On/COnxBwP9//X07fcQEQwO8Qj57Q0F//7n7cng9w3s/Qr+CwoK/gTzAP8KEP70+wsQ9/v//ujq5vwK/fj5BwUMBf38/QH9Bwr07OgAAwf//vzdCgcCEvfz5+3t5efz+vzx+AX56fb1BOUGAAD/8BkpCA37+ubr5tfv7O7v/QMG8e3rCfbTCgQAAfgTMCEVBgEC/eXk4+Dg6/0MCPDr9fXn3CAQAALxHCIZDxIPFBkH+Pn18AcJAvPt6eft4wMrCQAJ9CABFA0QHCEoHh4YCQkKDP8A5tjt8f8pOggACvga9Q8QFBkaEBcfHRIaFwkNC/rW4/L3Ly4DAAbu/e/4A/wFA/0A8wQEFhQNBQHv5+Dj9RYH+wD+9+3k7//2Av/39vn/EwURBwcI9+/n6PkP2d0A/wr26/Hs7+Xh8/v1BgwMExILC/0RFAMeEOn8AAAFFdvr/vL26Of87wANEiQeC/0UKC4uJw3+AAAA9QMWGRAjEgYHBwANEx0YGgcdMURMOSsXAAAAAP3+DQH8AgD8HA4EFw0LFg0VMikDCvj4AAAAAAAAAAENDhDsAwv45uDV2frq7RIoG/H5AAAAAAAAAAAACAsFAAD8/O/Z6Nzf6/Ds+fz4/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/8/P4AAAAAAAAAAAAAAAAA//7+/Pf4/wAEBvz8+/n9AAAAAAAAAAAAAP733bios73F2dPg7hoF+vr69fj9AAAAAAAAAPzSz9zf8fzz6en09ezt8QH8JxwOCAYBAAAAAfzk/O3z9vcF8u3iCQ8dE/X/8Qg2JwUH+AAA/vfj8/vy9A4SCPb2AAQHCw0FDQQLJQwK+OwA/erLx+Xl9foM+gD9+/3+8er47//6+A8TGwb2APnoxdbz9PIFCgcF+AUREf/7+wUMDRIRBxAW+P7+5e3t9/j0Bw8O+PDvDQkGAQcABhYL/vccPAsA/d7q4/jz/AsRDf3T2+8QDPwB/gASBQD6Ow0LAP/g6eHzBwofLBcA2MDX+vzy//r/GAf4+S0iEwD679TSAwoQHh0kE+fV1uzt9vYF/wnq5vYcQBcA+wPBze77FQcZLiwO6+Dr9fz1CAny3+vmATsRAQAM1MvY6QgKFys4LxDv8P/5BhgH/uf4/+0G/wIBDs2ry+n5/xESGSMf+fkH/A8BAAEFESALEf4BAATUuMDw6efu+wgdDfkBDw0K//sACBUnKAf5AADkydHR5Onb5vYBCPj+ARP5+PzvAwL+CzkP+wAA6cjr5eT07f4B9AL/AAMJ+ez69xABAAgH3PwA/+3e5ev59AAA+QMH/Q4B9Ofp//cB/AwH2tcAAP/u7djg6O30BwoGDBQYCfj1A/f2AQf1AszcAAAA8tXN6ent/QP/EhEABQL9/AEEAgv4AADc7v8AAPzSy/fz8vsPAg37BPgEAvkHBQYA+Pvg5QX7AAAE5dT1BfXu9AAH/AUHBA4AAP4GAvTe1toP/wAABfPvDwXo5vn4AfkJAf/8DwoKDAbn29vhBAAAAADr9fv16OIE//v0APQA/w4WDQz++fHc6QAAAAAAGgcC++jr/wH85dnV1+kXFvoGBxQVBgMAAAAAAB4hHiMR5/QQEwLw9+j9GCDv5M7m8QQCAAAAAAAA/v30+/Du9RPr3PkL/PDw8QLq5wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBAUBAAAAAAAAAAAAAAAAAPwADBkCAAAHCQoIBwoMAwAAAAAAAAAAAP8ADhMaCAjs8Qz/8+P3AgwWDAcEAgAAAAD/Eh0DFBUXFgP67vX05eXjARIJHiEXAgEBAAAA/AoTBR0MBBEVFvT05+Dv9AEJCgIFDhkdBAMAAAEpJQoUAOwCAQUC+fX38gYAExUFC/IWEgcGAPsDDBH9DPr//wgJ//398woLDRgiGRT7DRIaBAD+Cd4G5wYIAQoO/fj7BPoLDwcBDxQXDxQO8AQDBRXa/vbyAAUMCvL1+gP3CxcPA/0QCwMKBvUCAQEQD+3z/vkGBwEFBQcJBfoCAgAC9ef6/wYeAQAAFUMKAgkM9gP8AwMMCPvz7OXn5e3g6Pv/CvkA+xJEHxMT++rv7vj89PHk7urq2ujt8Q743+n5APwGIhUKBPXt8fz6++Tl7Or59/T39gsXCtzzAQD9+Cki/P/9B/wC/APp6PH9AwoAEP//DADR7gcA+gY1FP0IAgUJAP3w6fMGBQoUBQwFCQLv/AEBAPsVGOsEEA8XBf768vgDBA0NBAMCBvfr8yMI/QD9BgLsBRESHwcC9gYMDQ4QCwD7BgUF9gAzJQcA/RIVAPYAFg8QCQUCBAIJBxIHCfkCBPgTFfoLAPUaDwb5AAYIERMCFQ4aHA8BBwX6+wgHEiH1BADvIPz+DQL6CAcHDhEgGR4N/woT/wL8Fw8K6wIA9RoPDAD5+vkGEAoaFxEPDw8VFA/z9RIjJf0AAAAMEAz1+/Dm7/z2CxUIDAQBEhML8gIIHy4TAgADDCkE9+bt4ufj9wH6/fj4/QIH/vwGAPj6CgIAAAEyIAD29vbv3+zx7vDb2uj6/vjo+vvy9v0AAADvCu3z/gAG+gXp4t3FyrzQ2tvg3enk7+/+AAAA9hQJ7d3Y9e/S8dnWvMHX9wf0+d3l4P/+/wAAAAAZEAwV99Xa5QktFu/5+w8JDBEODQIFAQAAAAAAAAACBAT++tztBfr/BAkC5OEA+AUIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIMDAX18/79///9/fz+AAAAAAAAAAAAAP8A/v/4+NfZ8voJ5vMF+d/Z5/7/AwIAAAAAAOTb+/zy8fr3CvgBDAQeEf3s4e8HBQL5AAAAAAL4FAsR/fT+DQcJExQPD/r38f7z8PgC+AAAAAAGCCUeAu7+ERASGAz+A/v3+d3r5+74Cvb9AAABDykgHf/e+iIhFxID9uXn8vH6/O7q5ObK7v8ABgALEQ385gAUBhcdCgD29QESBvX36e7d1OkBAA/z6vUJ9OkEDxcJGRH9+gMGBP8E+AgE/8bj8wAB4+nyAO3tAQIB+hERAfX8AgEIBv4TEfbB4/UAAPPb3+7u9Pn79wIHCuTe9QYKDgsTGgTw0+j8AQ3uycz98PPx9QQQCfjT1f0CCgkEAvcFEATl/AAJ5OHuEfn4CQENDxTm1eAIBA36+fLv9RsZ/QAABPPUBAn1AxUNChoFxsTi+wQD9OXw++0MCf0CAAgM6voYAxUQFRsa977S5/b8+ADt7wsF+vQHCAACCPv+DQEeGxUdCubJ4O0CBwgJDAEfFgP3IgsA/hsE+fABGggFBujO2Pj+AhYfGRoeHxUaCSQCAPoz/QIEDBEEDPDaz+H8DhMVJBcWGxANJi0XAwDxIAwQCg4P+/TbxtX+Eg4QFxYKFw0E8x48GQoA8xn8DBAZEe7g4+Pr/wgYDQf6+fn/9+4FIR8JAAIfExIdFgLt8vv3CgYFEgv3+AoJBu7b8wECAgAMFxgGDg3y9fn9ERgTEgkABPYLBgn07wMUFwEADhEPBQ0YAAH9+wABCfz/AfQDDA4E+fj6Gwf+AAMH7QQUGgn+/fP0AvXx8/z1DQb1B/Tt1/v2AAAACej9CPbp4/DqCAH9AvT++wr14QXx9tn6AAAAAAPt+QL+/wkB7/4G6Q0CCgsC+/EbCAwR/wAAAAAA+AX//fcgE/kDAAELD/8E9/3vAiAZBQAAAAAAAAAACRIKExoYIiElEgELHCQaASYoAwAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAIGBwIAAAAAAAAAAAAAAAEAAwcKFhIG/wgIBwsFDRMFAAAAAAAAAAD/9QYcKRgMA+T2+u4C/AcA8vsKAQEAAAAAAP0WMBAOKC4rDu7k8BD24O8BFwwYIB4C8f0AAAD0DhoPBQwhHwb27QYOARYOFxQlNykyJxv/AAAA+SkY6vwGHx0bCfsM9QoSHh4cLSEoFDcoCwMAAAP53Mjf+AUQDf3s9PH/FBseFhX98PMyMBQDAPzy1tv4AgQSC/jw8fUEBxcPGBMIAffe9goMAe702N3u+QoGFgbz5/QQHA8JAwUJ+e7o1tLxCwD7/ODo5v4KAAb+8N7nBhIL/fH48/Dt5Ofb9AoAAP/u3PQLEQ4KCOrPyugK++jX4+7k4ugL5fAUAP7pBezsCwsYEQ/u2svi9vLs6eXf5On4Ft/tFAL/8AYMCwIBDRcM+ufX3uP3DvQA8vTxDAsIC/X/AAH3DBUI/gkVEQz7++znBhYQGxAUA/jsABDb8AD87ggcGP8IIBYcDf//Bg4SECIRCfD4+f8F5gEA+AgHBBYPDxMOHxIK/PkRExkREPb69/z7DB/5APv6EPkJDw8GDgoE8ez6BxgjCPr7DQH98xYN6gD5EQr/CR0OBv719ub3CBIUFP35ABH48f4fBv8A5BgM7w0VDfr09fLp7xIVCgv77/QDBf8NGwr//tQgD/8NDQf/+PQKBgQTHAkJ9evt+/gHLykK//rbBf0GGgEEA/bwBgf9BBcIBvb27vsBE0Y7GgD+8fUMCvv47fPx7AwN8vL7AhAC+vgICCInNunpAAYBFhXx1t/f3un5Bv309gAQFRAKDQf9BAYa/gABBAwB89fj4uTh8wUNBwsHERwbISMV/wsCCgAAAAD329LU5dbY7+b4CwgG7/sMGiQZHQ0g/wcAAAAAA/wB9+3pAPDwBykaBPYMDwsUIy4ZIREEAAAAAAD+/QkYFB3v7y4mDfATKRkBBg3/Aw4GAAAAAAAAAAAAAAED+Pb85P799APu8w7w8QQAAAAAAAAAAAAAAAAAAAAAAQIAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/fH07/v8BAABAAAAAAAEAAAAAAAAAAAAAPn9BxcCCBYbLS797eTd6PwFBQIDAQAAAAAAAPr09A0cGxMaKCrvyL2rx8bP/yoP+gYBAAAA//zp/AcaHBEVGxP74+Tq7fn9/vUI9wweBAMAAAHe2ewYEwoLDgH649rn8RQWHBL+APv6NAMCAAAF2eP2/REACPQIAfLu4/v9/A0GAg0GARsnBAAADtvr7vP9CfkMAe7kAP4KCwYBFQ4LEQQVKg8BACvvCQUEAAwDFAfm3PQFEBEUFBARJRoQFCYMAP8tDQTz8fgQIxwJ7un1AA0NCgQGDQcZCA8lCwD/LAf/B/H+ESosDf/d4fP/9uz38fcBAvj1BAgA/xnv5QYFByIoKBgB5ff9APrx89/i6QPg3wkCAAEJAu/z7AkLGR8J+OTo+QX4+vPj8vb9AAID9wADBAcA5eP6DRoIBv/78wMBBu/19fv8EBAR4+0BAwUNDOXtAwwTCRQI8fUDCQMFAPv6CQoK5sLwAAEDFgrs8v/9CRkXA/b5/AoKDgoFAgYNBfP+5wAAFRUH+e3i9vwRBwj05fIACAoRFgkaDwkC7+IA/xT4AgDz4fgFCQL7+ufX9QILFhARFRIJCPnyAP0SAfkH+vkCDAH+BAP58fbv/hQN/woBCPH29gD8CPD08AP4AgkGBhgKCvzq6/8BEP4B/ATy7Pn//Qjg4AcQ/wL/BwIWAAn67fgNCRD7+/L++Pn///4I8t0HGAL6//3s+fH09v4IBwH+BPz6CgUHAAAAAfDe5/cGB/349+0ECxUQFf/9BQnsAQr8+wAAAAD19On95+r6AAYG/v8EBQoLChEB+AkFCQMAAAAA+Ojn7/Hx/QP/8fQABgj9DBQH7/oQBef6AAAAAPvx2vb/AvXX5QkLBxYIFCceBxQTIQHv/AAAAAD/6dz2FBcVFAsjBwQVLikgEBUBDRL37/4AAAAAAPv8/v36+f4BEvv1DBkL3uz+8PcAAAAAAAAAAAAAAAAAAAAAAAEDAAAAAAAAAhETAgAAAAAAAAAAAAAAAAADCPz67ero9f0GHQwRGwwAAAAAAAAAAAAAAP399QL3097/+gb9BxknICQYBwIAAAAA/v316+Tb3uT+38jr8fMC9O30APf+CQfn9f8AAPj68OPv6eb6Lv307u/2DQcCEwn/APb26wAIAAD55eX+DwENGvvy9/H+BwYJDwED+fsCEu0ADwAEEPz9AgAKDAsK9foCAgME/PgCEgH4CBXr7QkAAQf67vj6/A0D+/T4+wQOAw4KAQAFAgse/dcNEQTy5t/6FhAVAPDr8Pf/CAgH+/MCCwv9EezVCAQB8uzs/gwDCvT5+fj5AAwRBfn4AxH59wrm/QQA/wDr7uv6/u/y+v7+DhUJ/Pf/AAEI+/Hiu/8EAQoH3srx8erg9AsXJBcF+fr2AP8MC/Lkw70IAQAICff/+tXH0gMcKigiC/4MCAj5BRb61bzG8AYAAP3nDe7GxuIIEyQhDf4DEgYGAgMK772y49b7Af/z9w/b5eT8EgkcGRX19gQSDxIHDdy0w9jL/wD95xIR8/Hg9wEODBYA/gEIEhMTFvfNxr6zxfoA/gYKB+7a2O/8/AAQAfoTGxAWCQ3iys+6r8zyAADzBA7j4unvAgADExAFDBcUDw0D4tzp4LbdA/8A+/wL6Pj2/vcEDRQLFwgOAgH+6szm4srH/wQBCvr1+vTv7wIB+hEQBPwG+fTv6/Pt59/o7vcEAg7j4OTx//Ly+vgEFQL9+/T15u3y++XX7fcLBAEF2t7T9QX48/H/CgEKA/Ht7Pjv+ffjxfHkFxoAAPD36Pf9AQMGAf4CBvsA9Pr3/P7zztnz6vsDAAD6/xsK9+8N/w8FGQ0X+v/yAgTy38fM5PQC/wAAEiMbDfQBDBQSEgwQCgwNAw8RCQEVG+rz/wAAAAknMB33/gr/DBb37v0M+w04Ig4eMCsE/AAAAAAADCApJRAF+fEBGCwqFhshE+/s/hAPAwAAAAAAAAD6/QD/+vsNC+zh+fny9/37AAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIICgIAAAAAAAAAAAAAAAEA+fsCGiUlERkL/wUBAggGAAAAAAAAAAD89hEzLhMQDwQBAAQe/e3oDAcDGAwEAAAAAP7p6vEU9tru+Ssf/vH29+zk7xf+8QgoIA0BAAD75ffyBOjg8gERFRoVB/z6AwUW/wcZHRsDCAAA/wceBxz99QsPEBQNAAQSBgb58QMbKxkP+wgAAQgiICMjDhAfIwoG9fXn4+Lv7ev1DAviyfgAAAMCGhklIRINFBUU++/i4ez19vP/5e7Z0rkDAQAF8vj/Gh8LGBEaHAf58vX7+PEGBvr4BgbMEhcA/fHl7hUQERMJFg4OBwIF/P8E/P7vDxr+9SUpAP/u497r+gocFAYEB/Lw/QEKBv747/4aGwImIQAACOni2/H6DfPv7tzq+foB+QoDCPUND/7b6h4AAPj9xM3N5/XOx7vZ6/fz9/YD9vgAAgH98gsZAAD/7L/T0cngzsbQ+AkH+QT6AAn1CgQQ/vQdEAAC/eDC8+7r4+zq/yMbDAQC9vb/+v0JF/UKEwoABPn13P8ACfX8FCUdEAwI/AgLEAIF/RIAAvALAAP///QLB/8TERkXDwECDwsQ+f8RBggYDwr/CAABHBgWDwz+Bw4BAQEIDhEICxEOAPwPGwk8LAQA/xEXCwsA9wUF/fj+DgsaDhEHB/r9BQALKTn//eoL9wz89/kD8OjxBxQWCg8QBAH+6vgDChgL/vfgB+0F/O/z/v349QcSGhIAAP7+//zu9vz05v388wLv8P/v5Pz8C/sLBgoA8urs9ubs5+7n7wMAAAUO8On+9tvm+xISDQD4+P7v5N/d+fHf2e7xAQAA/djx/AXx9wT0Avf2+vj639XN4fv1zdrv/QAAAAvi8fn4Cw8U9QAA/voB+Pvw5eP9AdP0FwgAAAAF3er1CBohFu/q/QEOC/sO+uzt/P7X+QgDAAAAAODQ3OYEBv3n1eQDCzUiBgoK29//AAAAAAAAAAAAAPr38ub6FBMOMAkJTEs0Kf0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQcHAwYOFBUI+vj+AAAAAAAAAAAAAAAAAAAA/v4DAPD9FB0bBgoODAv/+/z+AAAAAAABAAD6AgL6BPHi5/gGHh81LxkPEiAaBhYLAQAAAwIA8PT+BBcRFAQKFBgVHSEdLiotIRDz//sAAAgG8eL9CAUJAwgQDwEF9vkAExovKhwL9gP8APz43+b3Eg0IAgAPDgMF+PX0Afv/BPsVARIM+wD97v4EEgwNBPf6FgUMDAr4//sCAg4DHfYRGvMJBhQaGAz1/PH3BAUREwv5DgYSDQsREyoeGwPuBQMUEQT64vb79P4BDgQFAfkFBgIKBREoGv7k5AD/Cvb9BukHEAQFAgwECv34+AwDAP0SGBf03+ECEeLo9fjsCfv18wQF+fr09/kWGw4QAgwaDd/kAg/u+v3s8/z4+u8C//Dk5fQGFh8YGQQGJxz+7gAB9gn97vHp9f///Qvs4dzm9xQVHBMWDRsNBP0AAvsT/vbz1Ojo+QwM7evl5fX8CAgIAg0SBP4AAAIAE/8E6Oj78AwHAvvz2ujl7eri5/wcKxD+AAAA/iUWBfbzBAUFEAbv8+vu2sTNxe31CxwiDwIAAO4SJQ4H+P4ADxUPAvj179bLw8vu9Q0VIBsIAADqAhIC//35BhERCAwDBvPh0NjS/Ov0ERgQCwAA/fYEAQr9DQgPEAsQCv0N//Dx6vPs8/D4CgcAARkQ+QAHBgcGCgAADgsMCwX49uvd4Pn1+/79AAQaE+zlBAIHBPYC8w0ZGg8D+gbz2O8ZGQoD/gAEDAUA7fQMBgcAAPcPBxUGCBoVBOcPJSoOAgIAAAf2De/o+wP7Bg0THwIKIjApGCIsJSwZDgMAAAAA8vz68vLy8vD2Bx8LBhAeIycoNhshFBMFAAAAAPPV7gD3AgP56fkKDQ7+ESMbIS8O9wwLAwAAAAD8/vb8CAYACfjw5/XNtOPt9Ov1/wAAAAAAAAAAAPfn5vYB9+vc/QT3/AECAP/7/AAAAAAAAAAAAAAAAAAAAAD/AP/+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUMCxkXFAkIBP8E+v8AAAAAAAAAAAAAAP8BAv0CDfz9HBsTEw8OAOH35//9+/8AAAAAAvDf6u/g7fTk7ef09AD09foHAuzm//n1/v8AAAj2693R4/kH+RD97+7/BAwKBwoOAPXw7gH7AAAE4t/W5vfxAwgYBggO/wgKAf8KIBD2/wwM+AAA+vbv9erp7O/oAAMJCwkE8fTv+hQJ9/sHB/8AAPn5/fXu3/L8+/oJBAALBgL8+fH35er79fX2/gAG+/jn+eT9AA78BwH+AwIF+QP57Ofu/AASCQABAwHs9Pfq+gUE/Qr3AgEN/wv6/fDy/hsUHyYAAAUE8/r99vsDEg/6+QsWEBgV/f3l9g4gAhIoAAAF+vwL/fL3CAYC9uX5Gx0aD/br0u8KHQ3/CwAACfkGB//08/77+/3zCBkeGAgC6tHz/RcG8vcAAAsUEQcA//Pq6/0C/gghHxcH6uTmCAgN6PcBAAAeIh0Y/vr25+bwAvgPGRoM9uDbBgscA+UIDQAAIiUY8+7z//Li8fcEBg8aAuXU5hUfDRje+QkAAAP9AtXUv+P3ABIGBAsECfDW4/8nGBcf9foAAAD2yejq0OX2CAcYFg0RBezs5/IeHyEYDxwW/wEA58ne89/2EQ8NFgkA9vbr5/j+FBglGgn3/f0AANzW0t/uAhAWFhIJ+fnr+/kA/Pf/FA3i2eX9AP7QxNTrBAkMAgwVHwnw6O/89QL3AAP84trp/QD94MnkCgMKDgoKCBf66/D8+vsDA/fv8d/m/P4AAP/m4PUPGhYJFQYK+QHs9PkJBAX17OXo4gIBAAAC5s7uARcHCA4NCwQAAwoA7v75AgPc7t38AAAA/+XUEP/49/4NCgv98/bX1+X7CTQm9OPq/gAAAADt8fILCPL6+RcO/QPx6/jg5QAaGfz3/P8AAAAAAerk8BAGBgwwLBL27/Tz//0NGxkCAAAAAAAAAAAFCAYJDxMtNBkICenf7/T5BA0JAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/v8AAAAAAAAAAAAAAAAAAwwUEgv/AAAAAP7+/fr+AAAAAAAAAAAAAP/+6er1DhE0GhDw4tHL8Pv5/gAAAAAAAAAKFhEECRsP+PofD+LLztS4t87h7dbq/wAAAAAADhQKFv8GAP77//ry8Pz9Btze3AH5+wUEAAAA//P6Gwz7Bvv18/kK+gH28ffl9AIR2QMA6fsAAhQB+AT6/QH7BgDw/O/u9vD07PoDBNTy7+wAAAIXDfzq9QML/vT8+vvyAgD39PL39fba6v/0AAEDFPQICQYTCfcKBw38/wkB+PP14+z64M7WBgoABAn9DgMTBPn/CQgA/QcK+fr79vD5A+PC1hchAAEe9gjtAw3+CQkSCw0QDhYQEQgF/wb10e4aHQACGuj05wb9CAwMERsNFgshIRQTAgcG7e/38iEAAvoDDOH89wD8DgsCBwoLFCUfFRECAe3xGQ4WAAECGQLx9PDyBQQLAfcH/QYcIgsZAPrw+RwMBQABFx0W9vL46AkL//T66ekDGBAWAg/w7fQEDf4AARscLP7t8/X7DwcL+ef2EiglBv4I+vHq3wsAAP8LKTMA9gT5BwoJBfD3DxkYBPzz8+7u6vXx/gAAJiwQ/ggFCgf+DgD7DwwWE//n9P8J9PwiD/wB/yYXC/Hz9AX9/Pz9+AMCA/306e32APT5GBL9AQYa4gz28e3x6ejq/fID9fP56+v99gTn9xwI/AMP9tQOD//z5+3z8fvz7/To8fT7/xEX7vcX+/sBB+viExoNAu73AgAH/ujl6fHw/A4jKwgE+v0EAAD5COv7CAIGCgYJ+AH1//3r9f8UGBIJE/AHAgAA/P7R9BMbAQkKA/IBBvj2Bv8IBhgcGyoOAgAAAP4A4uz6EQoGDAn7/wH+AgYQCBMlLxoXAv8AAAAA5ufj/R8IERMH5vjn3/gP+vsKCg0NDgoAAAAAAOzc4+4eLBYJCQ0L9Pf5AwUoLCwp/goLAQAAAAAABhATBw4iLi0ZKBnp6AQUFQwcEQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCw0CAAAAAAAAAAAAAAAAAAMD9vX6+u/y7u8IAgkUCAAAAAAAAAAAAAAABf/zC/X45ufc9grc8BUQCgwDAQAAAAAA9ubz7erx7QLzGwXz8BQdCfEB5PYNEf//AAAAAP/z6uv26O/y8gcRGBklEQwDCvf3CQn0AgMAAP7v9NPU4wUG/AP2BwoK/gHy//TqAAUF+xMHAAMFEe/wzusL/P789AD8AQD39ggI/PYOHez3/wADBxX289zw9/f58vL/CvIDBgIDA/8HBAPyCgIQBRwfAfnqCAn68wDu9PL8/Aj6+/4FEPr25Or8BAU2HernAhUN/f779fX9AwIDAAsHBgkH+Nnj+gABNA/24gIQCPPv9vIACA0LFxgPCwgG+uzp9f4BDCL2LA4MC/jx9AHx/wn9AwscFAoLBuXNxu/+AAoIGEgREPIAAf//AAMUBwQLEhIFD/vUta/2AAACBx5DJv/7+AAJFP0JFAr9AwwGBgzrupi1/gD/BDEmIxQA+voBBQwSEPr7BgsJDgUI3rGr3wEAAAc5ARYMAgEM9u4CDA7u/v8VIBoBAOW3r/cNAAAFLuoCDv/19fL1/AT0+f0PGhkLCenewbX1CQQACQLi/wf69f/yAfT5/goDFBYZEPv2z7zMEw0FASX+/wsQAfD/9fwB8/wOCxYUDPrv6dy4yiUOBAIu9QQPEwP27/Xv7/wIGQYSDwbt39K6rfgtEwQEJ+8HCg4LCP0G9u3xCBcGBvkE8eLJycMJNhAEAgP7/A8MBAX//Pj/+woQEf/9+u/h1enfGCggGQD17vD7Awf7DAULAAcQDhoK/vfjy9zp/B0a+wMA/v7v9gwL/f0F+gIIDhUQ7NTJ0d7Z+AoZFQIBAAAPCwb5+f4JAAEEDQoE+Ne4s8vYzvAWLx0CAAAABvMBCQ4G/v4C+wESDuPS08jHwcnnCQgFAQAAAAD4+vT49f37GRHy/fr8+gYXFxsD/wAAAAAAAAAAAAYFAwICA+7q+Q0OAPX7CQwCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD9/Pbw+fcDAgIEAgQIBwAAAAAAAAAAAAAE/d/h5QYUFCkSFRgTDhIKEhAA/v8AAAAAAAD++tXl/QH6+BAjF/jx+uXn9PHz+P8HBAAAAAD/7f0QCQUAAx4Z/AD9+goKDQIGFPL8BQwAAAABzdEBAwYFCAkTFQ74AffzCw0TGxn55fYFAAAAB7jnCP8MDPwGGxMK/Pbv9Pr9C/XyBAIX9v0AAAiz5/z2/gMWGyMS9/rz+fIFBAX29gD8C+4BAAAR1PH9A/wCCiAZCPjwAAX5AAP+++oRD/3p/AAAFvoD9/sL/hwvI/768+7vAPvw8g0BIigkDwMAABrj+vgFDBcrGwf+9ufr+AD49f8GBxszJA3+AAAA5woLDygXEgIH/wHy9fwA/QQG9gYaMfPt+AAB/BAaABIjEf707/QMAvP4Bf0RBvX0Ef/g7f8AAfERHAX+Df0E+uP6Av3z/QUNEQj26u767PD8Af7mAxT7+xEQAvHi7fz0+/EBDfsF+vT8AN/19wD9/wcP8wcTBO788wMC7e7x+A4F/gQA9vcYIfMA/gQK9v3+7/3w9f8D/PXl9wMJCwQK//39DwLyAP//C/X/BvXy8e/6+/vpAA8TCwgPDgcKB+75/QAADBb89wkH/PH8CfXr+AoUDA0ZEwkBCQDr4/gAABMSCeb2BAMJCAAO6/kSFAkIDxMGBAEC5fL5AAAdAR799vb7Ev798fTy/gsCEw8E//z5AvMP/gD+C/MSDQL2/vr08Pjv9gYN/wz8CwUUAxLn6fwA/vLi7vzuAPr8/Pn+9gX+BAsG+wj9+gEcAAH+AAD77u3s5e76AfkF/QMUCxcSCwMMAgMEBgUIAAAAAf3u28zU6/r5+QQZHiIWCQ8IDvcADu3n+AAAAAEC/e/qzu0J+fYTKxgTBiAXGBUUJgsQ/vwAAAAAAObm5+r4Dt7M+wgFFB8aGBIcBO/1BwUAAAAAAAAAAAAECwjGrufc7Pfw5ODrCvLyAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEDAwEAAAAAAAAAAAAAAAAA//kDEggH/v4AAAICAwUCAAAAAAAAAAAAAAEGBAH5AxL7AOvx9AQKAQIDAgAAAAAAAP4AA//+BSERBQgVD/375OHs7vn6/QgI/f0AAAD8Ag7+BwUK+fYKGycRCPbZ1dDZ1ub6BQD/AgAA/R02JSgBAADs9Aj+Bfzz5NnSyMzqAvf3/wIAAPkZKi0sAfL8Afv6AP8EAu/p49/m/QHn+PcAAP/xCic1FP4C//Hx8vn//Qf89fn5Dv8FDioC+ggD8g0bDgn9DQYEBfjv+QkNExMNCA8RDx8q/f0C/vb8+PMGDgQKCg4A9vQGHSQc//wNDggaFPH3AP75Avjw/PYAAQQW9/UBEiQSCwf8BhkJGgr69gEJ+BPw8f/r/P4KCfr59/wE/wf7/QwJ/jAX9/wAB/8J6OUDAP4DAwH99PD+Av/+AAIeEwcKAwf8AAD8/tblAAkHBQj5+/oB9eTtCPfzDAYRDfkC/wD99uLK7RIR/QAEAgUQ+f/i7AT27AcSFwoSFgIA++7s0v8JIwb0BfcJ/gEE9PIDBfIHAxoeEPYFAP766uX5CBcMAvj6+QwEAwL9AwAD9QYRAvT8BwD/DPjy/QQRCAb4CAUDAfz99f31+fcNBw39DQIA+gf+7vj+/QD1BAkZAe3/CwUEAf4ACvgP+BgAAPsIFAEE//vv9gocFP72BAoGA/cK//jq9+8JAAACEhwkA/v6+/AYFQn2AfoKExH9BPLu1Mjf8QAAAhcmKxMK/fX6BP0E+xAbGCQQ9+Pe2dLU7SQLAAELHf/1Afjl3+/3AQMZGRwL++3q4+Taxu0BAQAAAQkP/ezk4tPf4+8IFQsIBP0A6eLj38rh+wAAAAD/BfPb0+Xe7PgMCPz0/PYC+/vn7+ff8PkAAAAAA/3u5/ry8uXl2+Dw6unNw9zl8/Dt7fP8AAAAAAAC/AAG+/IFE/0AA/7m3uD58v8AAAAAAAAAAAAAAQD+/fn1AQ4XFAIECgD6/v7/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxANDAsaDxIC8Oz9AQMCAAAAAAAAAAAAAgj86e399un0+AHw5fkE/AYG+/8AAQAAAAACGyEC8OQJCgD//+7q8+Hy+PD68MnC9jAfAgAACB0C9fzxBwoKIwwGCgkDDgj6Av7v1/EhIf8AAAxD9+Hs5+bpBRwRGQ4SGBcN+/kA6eDxGj4LAPrb9P7vAg0OAgoYEQ4ICQ0VAOf8Ae/pCzE7FAD42foRFx8VGxggFxQHDe309foDBv0A+/ELEwXy8tL/CRcYGRgTFgkABQP7+u36CQn/9RH/EfMA+vrd6RUiKRYIAAgC+/cLBg/8BA4W7vgeBBrv+gAAzOkQKx8B7+vt9PD2ExgNDfz0A+L0BQcd/vMAAM31Ev4D/Orq8Pj69AcDDgv3APzh6/YDCfT0AADt/gYA//fr8Prw/PT/+vwS+Pr56u78BhIC8wD86BIbAgEI6vLx8vnv/PIF//8HEf8EGSb9JQMA+fv7FAH/+fHx6fMB9PgA+AP3Dx8KFSIa4xwHAP0D8gL49+Tl5eTr9PQC8PL/BAgQEwUUBvwaBQAA9fgP++nc3djm3+Dt8/P4AAQNDQoLAgQQCgkA/w4fDQgP9ePUz8vR2Or2AvwA/gAGBPj5+u78APkXIgkMDgfy8O3t9vADBAYD9gf7CQn36fXg/AD2FxD3Ew4aDgEBEBohGhUWA/z+9AEJ8tXs2/0A+g0A5wsQCxkfGx4hJAgSGQMHDwD9H/734Nr9AP/95NsDCRUjIiMuJRIDEBL8Cw8H8AoECPbv/gABBOvb+vUOERYZERgHFQT1/hsM9trs/w719wEAAAUs+gv9+AAKFBIRHhz9+wAZ+O7nAAcjAPwBAADs+vwDBv0M/vrx9fvm7fQJ//Hu7/gRIgEBAQAA8/HQz9Dp7enf6/7o3ez7+uTg9fwQAf0BAAAAAAD+8OHm7ef9Dgfx0NS/1vj78/Ly4+f2AAAAAAAAAAD49PHN4uPa5uXm3efqDvvv7u39AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/vj2/gAAAAAAAAAAAAAAAAD+9ube3+z0+fn6+Pr59fsAAAAAAAAAAAAA/wD339jcEPvy5fv65uX87uzw+/8AAAAAAAcKCAAXGQ8PCAEABAf/+fftDwHw3+nz+gAAAAIMCe/p9Pn1/vL4/PoI/f4B9QIB/vD5BfX6AAD/FQnu4/j8APwTDfoA+PwB/vYB/vYE9ATl6QAA8vjw6Pz9Bvz+BAgH8AYEAf77/v7yAQgKD/UAAO399AcJCgMIAgEC//YEBv4HExEF/fsaCBUC+Pn2+uwGBfYC+wICAwAA/gf8CQsG//H8/BEH/v79AgjuAwX1AP//CQ/+Bv4L+/sKBfb4/gUW9OgA/+0VAPnw8uwE+gQK+QQJ/QIIC/r4+vvs//Hu//PqEwD77P/4/f4RAAYH//sQFhX77PDxzgAT+QD3/PL29f71+vz7AAsLCQsODBYI/+Xi6+sO/fUAAPUB+fL8+QL///kCFQEODxsNCfro7OsHDvz6///6A/Xw9gr/9PLv/xYCBwwLBwDs6unvEwP4/wD/IRX/8/r99/z7/QII+xIXCgD96/MFAwgQF/kAABISFRUMAAcI/woK/PsHCQj3Aer8/QUDHwr3AAEDCxMdDg0IEfr59QoCBwEL+wH2+wkOC/fz/gAIAiQOBPwGAwP+/fgEAgQD9QD/9vMIFgPl9gEAC/4oEAb7Bf73/Pv9/PIBBvYADAQE/APv6/wCAQr3EQr8B/v+Bvf48Pz8/AQAAgL9APsM6ur+AgAB+OgAAQEGAP30/PQB+fz/AAH5BfwJ9uMA2vMA/gDkFxEHBAb2AAYM/f7/8/wFBgP6/O/2FAL/AAADFBQHBQQO+AIC+wb0+fkMAwT/DQgNHxYC/wAA/RkrFg8YHBENAP4HBQcB/gAEBA8ZEQYA/AAAAAAQHB8R9gkICgsACwIHEA8eHBEFFQsEBAAAAAAAESghGwL6AgMSAg4E9QYWEP8GAPj7DxEBAAAAAAD+//wB//7k6NHM9fzm6P/5CgIBAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP7y8P4AAAAAAAAAAAAAAAABBQUKCAD5/v4JEPb47e70AAAAAAAAAAAA/wD+9PMMGA7n6gXi/wjr4tnl9AAAAAAAAAITFgwSEgUKF/gA+QsE8PD76vwD//Lm8fcAAAAIHAsDGhL45u0C+wD6DAT1+Pf0AA8ECOoEAAAABBb8+OTg0d33BAsFDQAIBfj17ff28v4Q//kAAP4F+/Xf7d3o/QDv/+/7B/8B8eDp4dfh7gT0AAH+FQr2+AoD+wr2/wP4/RAKDhD2/PLy6O0C+/j8BCUC/gIA/Af1+vv6/wsE+xMP//zu7Of9FQP+/w8d9/kB7/AC/AMKCgMFBgwAEwf9Af//Hv8AAAD9BgL38fv1A/gFCQQC/QcADQ4SDAX89Qvm///zC/0O9uz++vkEAgD5CQ0NEh0iCv744+QSBv8A+A4GEgIEBgj8+AP0/RITCRURDQTs5dnuH/sCAAAEBQwCCwkLBvoHAhAUDBYkGxQPBfLb/SILAP//CAYA9gYSDwT3+AMGExAUGwkCAQTr2w8FDAAA/iINDgIDCgf68wsLFhkbIhXv8vz8DvP0CBMAAAAVCg8RCwb+Bv4JEgwXGxn46+H5DgXt8BAFAgABB/8KChEIBPDx9AwWE//46OTy+BgL+vUIBgAACAIFAvwE/Pfu5erx9vvw+ubf/fkPDv70/xICAAkFAwT4+QHx6fHp4/Xv8Af08QUKCATx9/MJAwAD8gYDCv/v+vnq+P0A+wkJ/PPy+wsM/vj2AwMAAPr2DRD2+PT9/QQJBwELDfnw9P0P/+/8/OP1AAAF6AETAQQJDhAJAxAT/f386vcFAvrc9AoM/wAAAvP3/w4MBQgSEgMB8/Hv5uPj8Pz86QcKAwAAAAIKIRYKGBkLCwT49PH16+Dv/PoRB/fn8f0AAAAADiYsDQQTEAYE/ggG/wYKCRICDBX57QAAAAAAAAojIiUNEQwcDwILHRUbJA4PDhEJ8fwLAgAAAAAAAwUBCQ0Q9PHd3wsI6e0B+Q0MBAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD++vn+AAAAAAAAAAAAAAAAAP8AAwYKCRsoFQD6+/Lx+wAAAAAAAAAAAA8JCfro6eH4BwQfHikA6yEM8/z9/gAAAAAA5dYOEhUTBgf32As1SUAdBPoQAf4dGvn/AAAAAOv+/f/1+fzj4dcEGxQxMSoVBvXo59/J7gAAAPjW9fHm4/jg2ODt6/QYGiAoCAPs5+fhxsr/AADx9Afv5Nns/QD48+jg6QIRKxkPB97n6dfB8gAA+dvs4uXf+B8SCfLx3+n3FSE6KhPd3ur73eQFBhPu2u/t6gMNCfn/+PXl5/kXPj0O+uPj8OLyAQIf89Xm/fru9Pb6+f73+fHe/yYrHgXz6/Xe8gAAAM3P7P367O38CwoHCAXjz9v6FSAYDf321vEAAiHSzen29v7//gn9EAcA49Tk7QkYNB8tF+byAAIU79foAugBBPn+9QEE7efm5/APGCQkC+r09QAACQH8IQ7y+AYL9Of/9fbw/vsKBRcdEO27AwUA/uP0Ah8WCgwKCPgGBALz+fwPExUaHBLs0A4IAPvC+v8dEBAMIBoDA/v8CPcADBYKIh4M6tQMFwD+3e7xCwkWFRsN/ur4EP74+gEBDRIU/frbMCQAABDw9wcEHBYP/OT9EQ4FC/bt/gUAGRcT/DEIAAEL7fz2GyMTA+7c6A4NAPL28fzu/RAdDPMcAAIF//TzBiMlGwnu4O8LDQcB7wUP+Ov+DfzZEAAEDv8WExISGAsG+/39DQ3+/PINAO/s+/vk3R0AAg8VHRoYEQkWEAAF9v/3+/sFBfbq+ffj5NQEAAAHHxEIDhcVAgT88Pzx7O8BCwr16OPe0NLo/gAAAQ/59PcADg8J/wT48/X6BA3u06yhqqzR6f4AAADsxeL18hQbFhEFBwv/FBEeAfzQtc7M7/8AAAAA+NHL3/8A+fYSEhASBwcO+PAcAubi4v8AAAAAAAD07ODqGRgKAgHrAyQbAOQHLyAC/AAAAAAAAAAAAA8TCxQfF+zYz8fP1ePl4u3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwYCBAoUBvHqAwIBAAD/AAAAAAAAAAAAAPzw7fn41NDU+SAWETsQ//z+/f4AAAAA/wP98OXPtLHk++nf5+8OHRkL3uoaGwUYCAEAAPz/8uzxwb/qDAkF8/D4//z99fXW9RUFCwH/AAABAPX7++PP2AwCBAEVAQwIAf4I2976+wILAwAABgwXCQf82NwOChUIEQoC/wD289noAggKIAcA/wkNAtgAEPnr+AsMFAH97vENBvbr8AIKDSQEAAAcEvvcGhLt8wMRGQj28vT7CAEAAgkcITIrAAABKRoK8w0E9/cB/gINCP4ADAoJExIkMC4uDusAAB0Y//f68Pr0+PkDCQL++/X+AwYjLEs1LRXpAAAJERL5APns6fYACwoVCP/8+ejuDyM8EgEn+gAA/vv99fb5APH1BwoYEPns6N/f4u/3CPLf9/8B//n2/fXt4/fv5wcLHiQFBevoztfO2QIZHQcAAv74GDEQ8vX09P4DCQ8cAwT269fZz8ftAwYCAAD+ATIfIwMAAf4K//0FDf/6/wr44b2ox936AAAA/wsZBBANCAn8+vwHDxMIEP8L+uK+t9jq9/7/AAAJ+OwC+g4P9P78BvwBDg4LFQHwzNHb4/IAAwAABcXu7AAVAPv89/v38QcJGRoN987B19z0DgMAAO696ecEBAoFDAjx4ev0DiMWDeu8vt/eBhUEAADj3tT4B/n5/AAH/eLtBBYjHwzauNzpzvARBAAA48PQ6Pz06vsG//v5AwUOGxry4trky9f3AQIAAPTm8/D2/Pb7+RAGCQoeERUM++zy4Mvh8Pz+AAD/9fnm8ury+AT5/gQIEwsJ+eThwsDB4wL+/wAAAPnv4e0GCAv+AQkM/xYU29HT89DXAPn++gAAAAD+5+H78vkNDvcBCPv9+ufx+xHs/AQB/PwAAAAAAAD5A/fc2/r3FwYBCBwhJw37BwIAAAAAAAAAAAAAAP7+/vTw9BIWGhcTAf0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEDAwEAAAAAAAAAAAAAAAD/+vLk3eTy8vb7/QL/AQQCAAAAAAAAAAAA/AEDDQHx9vr/BQ0aEPcC/fcHBAEAAAAAAADp3wcWJhQFBQQP/AQKFwv7//j6+Qj/6vkAAAD/6/wSDwoG+P/v/PkL/BAB/AsG/AH/6Pv+AgAA/Nz1ERQjAwb28gcLB/oSDwkLBPz4HAUL+wMAAP35/AsUGP8E9P4ICAUHCv8BCQ8CBhsd+v0FAAADCPMCAA8GBfP+AQgJBP4CBQ0GChYWGPT1Bv39DgbxCgn7BQX38PwE/gsD+vb5A/cBBgXs+AP/AA8gBAUFAQkG9vgF9fsD/QYB/wkN/hAQ9QkAAAAGDwX27/YEAff8+PP3Af0F+Ar7+/kQ8dwCAQD79Pz6/f74CAMF/Qb79wD9AQEN9/Hz88vKEQAA/fTy7Q70/wYLCAYF/voDC//09fL58vXu3fAAAAL+6AUHB/0FBvz9BwMDCQwNBAf39/nm8ADw/QACAe/4/fcODfn6AP4KFBcJEgj7BwHw9/L/1/sAAgkJDwQK//oE/PwMDQ4IAhADCQQFEf72+RDxAAEbDQoJCQgGA/cFBAEEBQkICAoD/gz79woD7gAB+gIOBxD/AQb//gD+BvUBAfwEBgEEEwP99fr/BfcPAw7+Dg4A/f8FCwPx/PoECAID/wgA6v7//wT2EQ74CAkK/gsCCQcD+/b1+AwLDf7/APX/Af/78P34AQMBA/75+AIACQT19wH9CA8HBPPpCQP/+vnl7vQD/P/7Av38Bvn37vAFBf0UBuna6uP8AP726PgOAwD6/voB/AP7/PsCAAYNDvn5/gn3/wAA//gOBwgJAwf+AfwB9fn69gkGAwb+9goCAAAAAAUkLx0WEAwPCxsGCQYCDwD7AQ8SDREVBP4AAAABGyssFg8cGRkTEAkNBfz6IBICDv4IBAL/AAAAAAYiJiX3+f758fH6++kBExHb3e4DCwgFAAAAAAAA+/n7///78/Ho6O7yAAMB/QH9/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAA//bu6Ofj7u34BgkCAQIFAAAAAAAAAAAAAP4ACADy7ez2/Av/Bg3vCxINCAcFAQAAAAD/7dr5FRkC+v7v8AkN+f/t3ujy6P4RA+f3/wAA/O3p9/3z59/t2vUGFQUPBQ0M/QMWFQL1/AUAAPjb+RAMDBUG6ej49QX6Ew4UFwYZEiAdAAQLAAAIBw4iCAgNBwD3/gH6AAP/Dh8hJRobG+v5BQABFwz2BAgFBAMFAgH++AIHFggJGxMUHR7y9AMCAyLv6AcOGBQU/wIK9wkDEAoHAQb8//j33fEAAAEZEP//BBYO+/D2DQMEEgoOBQb5AvHz8bfxAQAAHAgI9/oHAvvyAfwCBQwOC/n3+wLv182y7gEAAxkF8fkH/vD4/gkODgcEB/vy8u3569rApewAAAMCDvP38O30+QwGA/bvA/vm9efx9+vLtbrcAAACD/r68eH27QYB/wL18/D47PDw8A3mz8zT1/8AAhv96ujtCf4EDf0E8u3z9PD/+/8S+vHu38X4AAMRCfLuAhYJCBEG+Pno+/QCCgYDDgUE8+356wABGQPv/gIWEggHCvn47v8DDA4UEAgHD/3x6OIAAQMCA/IODg4NBQ4M/vgDAw0PCwYTERYQ+gH0/wYHDAzn/AoUCQgEAQgBAwIFBQcECQAHEf4W+wANAAwC7+vx+QMBCP36EAsIAvz6BQLv+AsPBfwADvsK9+bo49749vL2/hgI/gkB+vnt7tr9BwEAAAL789348Oj79/gFBxAIEw4GCPr1AvHQ8wkTCwAABPno8ujj/PTyBAAE/xACBvwG9fve1AYPAgEAAAEE/QT99gPw9AH+AgkI/PLq9O4B9fwSFP4AAAAYFSgoEA4N/wsfEwAIBRQF/gkIFhwaFP36AAAACggkJgwVDAAQJxcK9PkA7vsH9AgIFQj3/gAAAAD7+QH5/QgJAfwOAwMHGgL0FgoSHRsIAwAAAAAAAAAAAP8AEx4kERcJ/xAPEA4EFA/+AAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAgwOAgAAAAAAAAAAAAAAAP/55Nnk7PDz//n1CgkNEwgAAAAAAAAAAAH9Af0LAvzv+t28ytfa6P7/CP///v8AAAAA/hcjCAcREQ0XFyEJ9QAXBvbl9+fsAAQE+wAAAPYLBwf+DfsXFgUTEA4I/+z5/hQB7g4N5Pj+AAD2JiALDAf49wj5DvQJDfTq+f31Ae/18u/0/gD/4/QPD/8F6ujy+gL//gj/+PkMBvTZ59/5BAAAANzn+RQOD+vY5PgN/wD09+32+gkH+OXgBhf8Egnh4PAXEPLc3NP17/vs4unv/PP2/gnu7f4P7gX/3NDtBgXl49/i9PPy7+Dy9gLr7Pv98eDb8N0A/ebh5f8C5/Dx9vEBAAUBCBAO9wMQEvvq8/PeARTo7PUK+Oz+8vPw9xEXICEjFRYBCRIREfII6AEQ5uzsA/vw6vP56fcaIRohHhoPEg4cKyz0+egAAOf34vUB9egA+OsBEBgeGRcICQcJI0g2CgT8AP33DgP/Dvn29gD4A/4I+PwEDQX27hMtFvj6/QD6DxwaDRIC/vby6urd3eT29/wOAPb6HAH26AAA/gQKGR8ZEgzu9ufm3+n9//UHFRju6PXl+/4FAAXl/BAaDxEXCQ//+PkEEgcJAw0A177b1RUUBgAa6AECExcMDhUQJhsTISsWCPz25sTD1PkZEAIAHuj+5f4PBgwKHysRDx0f+/bu6unRuMfoAA0D/xrz9dvd6vEIDxshAAIT++Ls89z16cPE3vkNAwAH/vTS3e7u+gIMFQgTCvbwAwXn4vLUz87cHhkAAAQA6O/g5Oj08gwGFvzk6AL+8Orw5urb2u8CAAADBwXwwbLO59rY1cTCoZyrtMvh8uPc5e37/gAAAAEWEuTp7ujZv+Hn2p6GlaTRBQng09vr/P8AAAAA+uXR6eTNt7/k0N7p+f4ACA8P/fjz9/8AAAAAAP/27OXa0N7/DPHt/f7/AAAAAAAAAAAAAAAAAAAA+vb8APf2/gUJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAD98Ofs8vsA//8BAwMCAAAAAAAAAAAAAAD//f8CFhgTEPTr/QIL/Pf0Agb//wAAAAAAAAAAABYUDgcJCSMU9vT29PMLEhsbAvn5/gAAAAAAAwYTBP/s9AQBAPMEEB4aCQPyAQ725/H5AAAAAQL0/fsE8fYGCwjz7f8GDP746gMRHgDw7/4AAATt1uvt+ATqBQHz/fn99PH2APPt5xAT//QAAAD/4d8A9erv9Pvu8vcFCgsABQcG9v3w7unnAAAA5c3tEv33A/j29QMADAwV9PIADurn087e2/0AAOO66Qn4AwcABwYP+fj89/Pq8gHs4cPeDOr3AADkyeDwBQ8WBAn9DgHr7vz3+Pb9793dBQ7z+gD/7O3m/AsXGAQKDg8BBxEPCAsHAvsB/xDv5vkA//vs4vINBQMOFR8AFhYGEA0JDAwVGBQWAOn4AAD11uT3AggHFhEVGCoXBAgLAQkLEB4dHw7y+QAA7tLr+ff/EBgGExwpCvj9/P3u9RgiGgkb6PkAAP/Vzfn27wsKBhchCvP2+O7v5wIWKR0VFgn7AAAAwL704+oB/w4VAuvf7vb28fcJEiEuGR8E+wABAsXA9erw8Orx8d3X3ef19fcGDwwXAgX0//wBAxff1fT48Pbu5eLW4e/r9fwFEQD+CQT//gUAAAIf/+D19/0B6t/i7/MA+vv1/QH67/oEGy4GAAAAIBEECQ3++e3n8Pr9/fHz7ff4CPcD+h9EDQAA/g4HGiQTAvb2/gUBBwT69/T7+gUB8vMfNPwAAP3+GBolFQP4BgIPCwIFBAD9/QX/7u7/EBgGAAAA/iQOGREPCQILERwSBgMLBgoK/PT/AxcYBAAAAAMZHQsHIhwTGgcNBgUJCw76/QcIDfv+A/8AAAABEiYxLCoaFhMGChX6+gADBw0hEhwbEAP/AAAAAAwjICUmBh0NDBEBDQMMEBT+B/rw7QQCAAAAAAAAAP34BQAB8Pvs2egGDfj3+QXt7gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQP97u0HBw0A/f3+AAAAAAAAAAAAAAAAAAAA+Nno9woiJhkQBxbV1fb3/P4AAAAAAAABAfr7ERn+CBMJLjgO+w0B5uwP4/H3/gAAAAAABQQNIggXAQAGDBMeFQfx3r/U4d3Q/QsGAAAAAAIHHioRFgb5ChAGCO3w7dfd1bzd9AMPEgMAAAD7LiYYFv0B+gABBwL3/v358NKtscwbHR0EAAD/AS8fCQf38/8FEA8SCxP++OTl0LXpDxwX+QAA/QAcBe/r7/MFAv75ChQdB+ba3dm35wMeEfr5AAAMDhTv7fj7+/8E9hIsGgTp0eDk0cIEIyEH/wAABBoD3u///gIC7vgiLxoA+Obp+Mm4/hkGCwkA/+4dDtnmBwoH/AIAKBsM9Qb8+hTbuPgT+vwKAP/9Bvbb5/r9Dwf7/RYW/wQSCAMO5dryFyI0Cv8A/vfp3eMABQfu/QEM/wALDQYLBvLo4AICIgX+ABX+7NHZ8QDw7fH/BggNEhX1AgPz7+j+7xgG/wAf/+Pf4t336+oBAwwDAhgD+QMH/O7t++EFBQAAAtv0Kw7l4t3pFA0IGg4O+g//BP8LDQb/BwkAAvjkBkAj5+LW5woOAhMSDQAMCQf/Bh8Y/v0GAgjw2w0yHfr5/gT4/wAECgoF+gcJCBwe/QD8BAAF8NwKGf71BBb33OHr9gMB/AL8BAwTHgzzCgQAAPHm9PftCPwO8+Do9wUC/vzu+wEBGSoO4f0DAAD/Gg/c3gwEDfzz+/D9/vn2+AAJCB8YIPjfAAAAACcv6fsH9v4G9APw8//x7gH0BvgTGjIhA/8AAAASJw8D/PH/AAMDBgD78vb1+AL0/BNCMQYAAAAAAAsaHRn89xIgCgQI+wn2+/Px9ez/Lij/AAAAAAAaHhIfCgAhJyYuMBwhCPv08voG+xcfAgAAAAAAAP39AvEZPjcM+wP6BS4qCen+/fwVIQQAAAAAAAAAAAD2+QD/9wUuCfgFOyIWGA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIMFhD+9+z7/v8AAAAAAAAAAAAAAAAAAAAA/vfx/hL7ERrt9evR5OrV5e79AAEAAAAAAgMHBwQGDRELJCYJICH8ABAL/PsVCtLk8wAAAAgKCwn35gUP/AT1DAYJ+BkkFgf7HxwJ89v4AAAE8tbY4d7sDQsKBg8QAP8LDQMC8gUGBPDJ4gAABvLxAe7h4gAM//8LA/De6Pzz+Onv6Orp6vwA/Qr9+v0C8vUACfn1+vTk9v3w+vn0+OTk2/4dAP4D+AEWEQT57vkICPj8/PoA8/z8//j/Bgn6CwACDeXfCAj/7Or9/hMLAhIK/QT8AwUM9f8jFhAAARTj6+sC9PP7+A8NFA8YEfj+BhsUEAsVKS4ZAAAP6NLK+v0ECAMODg0VEPvx7fEPFBobDQX1EAAAB/3n0wT8CgMRFxAUEwIB8ero9fgaByMZDw0BAAkJ9u8MEAEICg4O+gACDP7wyefzAxAoLSMFAv725hMdDRYH/hMLA/IIDwYXBs/e8AIOMCAcBAH84CFDHBITEgAFA/YFBBMTHRDu4vH2CxYADQUA/utEPQEFDgoCAgD8/A4ZCBUCAvX5BBQC7wQEAP/xPiHn5/vy8Pb07A0ZIQv29PMAAwMD7vIIAwD//BwC5ubf6Onu5vcMFxT29eL1+/ft+ej/+v4AAAfoAP3u6/HYz+gBER799vbv/ez46ePxC/v6AAAE3/YABQf12d4DEgwLAALxBvT49fvlBQPm+gAAAOLf7QAF+PgHAAwP+gf2+AP5+PXz9P3+9/0AAADlv9j5/xENExEPA/379Pb86/nt+fnz7QQAAAD/5sPW9uz6BA0MCw4K9/X4D/n+ERoH3fH/AQAA//2y0fPcz+gEEwoMFPDsEg//BSw1JggHBAEAAAD75eL8DQUI/hEYFA7x+hQM8N0QGiUqDQEAAAAA/uXY6fv6AfvyDwTp7gT09/AVKhsaCwAAAAAAAAD+AAX9+xEwJjwu8dPb+PHw/AICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcLA/j7CPv3/AH+/P0AAAAAAAAAAAAAAAL4/AUUIf/37gkaMSws++b9/v3/AAAAAADs2hkkCuba59Hc4+sFEhURKiMpKTMe8/4AAAAB8QQVGAkH+fTv6O77DgLv+BIRBur8APsC/gAA/d/+/AgNC/759gUGAgoKDQkTCwL6//YaEAAAAPoAB/r9BQHw7f75/vwAAAkFCv758vz8AvsFAAEFDu76BQoCBf8HCgoH/e/vBwkE//n18ADw/wD//AXt9wcHBAIECf38APvw+v4R9fX8+PgHAxEA//wP9wQSEQsC/fTy7Pfz9QD3/Ab/A/QDGB0bAAD5DvEDCBgD8voA/PEB+gQOFg/+A/fo2tsFDAD/5gDw9gcHDPz2AQ4QCxMVFhMLAevp1MDhEAAA/wPt4PsA+/X6/QgaDSAcGBIEA/zn3+XW8gL+AAAI8Nnn/PQDBv4UICMrERL+8vcB+PTr7e708P8AA+3A2tzwA/X5FhYoKA4CAO7/AfMD6hMIGP0AARjm1dXq5Pv36f8MEyT89Pj3/PgCGAP9BST9AAAS/ubn4ur09eb89gQI8u37/Pf0CQQG/god/QAEJfcI+u33+/bl5d7u5+Hl9vsE/hL6DvPsCwIBDiEOGhIJDQgA/+/g4uHm7v4IEAoCAwPr9QID/gsVJiMeDgD9+/3x7+zs9/oHERMXAfMKAQEWA/z9BCMuHBIMCQYJAwn3B/0FAfsNBwTx8/7/GQP+8v0IIRcLDRADDhML/wz/9wIDBgv8+e8F//cCAPr38QkMCAYKEwwNFA8OA/37DwEQ9u7tGyUK/gD//+ji6u0KBQX+BwH/+vUGBxQSDwD07RghCf8AAAEC/+jr8/7+7O/n8+jyAvgSIA72+fb5AfoAAAAABQ4LBg0yLCMCBR0CAfT4KCgYBwwH8fr8AAAAAAgZ7uDlBjErHfkRHBEUMCP7+fz14O8AAAAAAAAAAAAACAXw5d/V1e8ACPYODA8NBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgUSEwgCAAAAAAAAAAAAAAAAAAAAAAAABAcE8+/6/hf31dPy9goI/QAAAAAAAAD/Bg356eXs/PADHSIM7e37HwwDAgH4/gYAAAAA/QIB+AUA/fnm+xIeCvsOFgfqABAQ9/37AQAAAAAO/RYHAwH6/fn3+AEJ+gIHDBokGvzuAxwNAAAGAfQABBEMGA4EBvUD/vAFBgEGDhARBgEHAgAACPv/7PwHDhETDQ0NFQoNDA8H9w3+CPHs9PUAAQb1BfYQIhMOFhUMIBUNHwsU/wYGEhAW5PD8AAD79xH3AxQfDA0NGBshFRUJC/oEBBEhKgHyAgAACPUHDQIPDQcMDREeEv8D+wMBBAoUHDP+BAIAACIS/fX69wD6BvwI//398/MA8On5CBEq/f4AAAAbBdzo+/UH/vb69Ovt+u/w9ez4///pDPzx9gABHfvc6e79/QIAAff1//b0/fTg5wff5gUC6fIAAxv75e7w8/kFDwT66PT47/f77fAD8/37IQwFAALz9un4/Q4LDQsR/vL2APP4/u/xAPQF9f70HAAB7Of5BPYSEgf/+P70+frz9fj07QUQCvrtLSYAA9vi+A38/AD4+Pb/+/Ps+foB+AMGCfTs/SkIAgnn3v0F/ef0++357O308fX0+/MTEAP19O4Y/wAH6NQEFf336uvv7O398/379u/wAhEcFxoHCQAAAPz3DgsDAvz7APQG/f3+DA3+BRMUFx0gEvMAAAEAAwcGCAb7GBMREBgWGh0NDgsRFQ4nIy0aAQABCAr/CiAUAQ4YGiEfIA8cFwcUECISGQAHBAEAAADxBhEVCwoMGBYKBQcKDwcEEh4SESHs/vv/AAD/6tnp/AASDw4JEwb/+fEHDxoPCAcE8AECAAAAANvM1vr8AQMM/A4A//oI/OgGC//u+vP1/wAAAADf0NriCwkICf8E6u717+n0HgL9+fvu6/4AAAAAAAAHEQH5BBgcKSMEGC0a/Av1AwT+AAAAAAAAAAAAAAAAAAAAAAECAAAAAAAAAgoMAgAAAAAAAAAAAAAAAP3x9N/f2e/2/QoIBQMMGQcAAAAAAAAAAAAAABEa+fX28Nr47+zw7wX+BxoIAQAAAAAAAPrv+vw8LBsWBPUDA+Dk2drw6Ob/CAnq+gAAAAD6++jsBRMZJBwWDwX3CwL/EAYADg4SCQMDAAAA5ejl9gQRGCIG9vbz8wwKAQkGDA4iHxMLCAAAAuLs5vQBBwQPAwMG9vH29f4TIhwNMjAV+wQAAArw6drn9PUKCQoJ//0C+AgFDigjIS87EtoADQYa8tTM2ej39gYAAQT1//oAAwwZJBIrGfXrAQMBGu/gzOjy9fT9BgUD7fno8QYRDggCHCDoBP8AABn26OH2+/D0/BAT++/25vf8AO7q+hUZ2wH/AAYBAvf2/v7s9wgNAvj0AwL+6OfX3+z98t7+AQAHBgwGBvH+9wf8/vj2+gUL7uTY2+f+AOjh9QgAAvcHAO8A9gIT/+3n6+r7/vHy7PP9//zs9uIAAP8IBAH1DxgPDwn29N/X7vD7BwwRB/71APXL6wD8JwL4BhQYHhcREf/l3+7+Fh4QCgABCQABAtgA/SAIAwMRDSITHQ8E//AADxwRGAv9BAUGBe/gAAMNAQcB/ggbGhUUCwYKBRIMFxkE//8GBuTW8wAPBgUC8AEBEA0HDxINCgr8AQAH6PPx9fbb1fkBGwz+9tjk+QoLCQsWA/v6+P/+CQL39O779tj7AxgE/9TZ0OP0CAAYG/wB8v0MEw8Q+eHg3+j5AAEJCPW+0d/i8e0IGxME+P4AHRD7/unq5NPZGhUAAP7twLzR2u7rCg4SBhgdDxMK+Pj749rl8QMDAAAAAt/V2+nn5e/39f8EIA8P/ury/uXp+wkFAAAAAP/k2voS9+Tr/Pr7ABD73s/T8/D0Eh8LAAAAAAAA9dr0A/rh9gIFEAAJ9drj3+4hGhoH/wAAAAAAAPbw9/0YD/T1BSPr3+LU7esNEgIAAAAAAAAAAAAA//7+AALz8fn7+e7q+gABAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/9/f8AAAAAAAAAAAAAAAABCRwqNTEeGBQMB/7+/fz9AAAAAAAAAAAAAAIG9hgNHRQaIhobANjZHQr5/QAAAAAAAAD7BP0E6eby9ggKIAUQ+/DizuDLzPD6+QAAAAACChr+Atze9eoKGBMLAv7+9ubixt7YztYEBAAABxInFAHp9/L+CQMXFRH/+f7t6e362bPYBQUA/wIUGgYG4fgA/v8SDxgBCvz38en8DdOVtv8AAAD8Cfvy8v79+QIPCAH9FBAAA/zy9wPWvNsF/g4LAO/16/EA/Qr9BfTwAxgdEQsS99/n9tji/f8EBP/Z4dv7Bfv/9/T28/kfGhgVEPzY5enW5PwAAAEE5OXn+AsVBfzp4eD6EhUcFgr54szN2d/o/QEQAgX+4vcLCQn47+Lr7P0GFg4WEuzUvd/l3PsBDPobEvL4+voABPQD//HzBxMTGAP62svh2tLtAP75HhL19fD9/Q//CP307QUGCxEM+Ob9B93v+gAACgES+v3s/hEQEwf89+f/CxYgBf3p9wHoCQYAAhz78fn1+v4OBxIL8t/w+AMPBPrx0tnzCQ4LAAEf//nm9fcHBgsSA+/l8QkD9/wD6+/p/xwGEQD+MATy5PH9AvcNE/74/fwJ8/T9+ejs2P0n/QgA8iXy39fz8/n6ChICC/z+8f8C/f/+6+7/JPkDAfcN7MvT5PT29wQUIBEO++0BDgXx9P4M+QbrAgMPBNbH2+sA9vgWERcaBvj4+AP/CQkWD/oB6v8BDgrgxdDvAgUGDw8fEQb8Cv/09P4BGRYCBiMUAAcR9sjM8QAGCBEDAvoH/f75+AT+BiIaBO0JAgABCQC+yeDx7PcCBw4ABf8EA/0L+RIhAgr4AAEAAADux9PCusbi/AoBD/z19QMOBfwIEQAVEAgBAAAA8trV2t/m6dvv3Nzb2erw5d8CDQftAxYFAAAAAPrm5PD4CPXg3+7c2PcI/fkOKCkL+w0UAgAAAAAAAAAAAAIJGx0VEA4IDhoqGQoYDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/65tv5/Ar48voAAgcFAAAAAAAAAAAAAQD/4M3YAvT7KxonIh4dGf74Afr8/wAAAAADHC4E7uTu+QH8ExMjEwEIGR0JFRH03xYWAQAACxfe/An1AgQOCw8IBf8BBBoeCRMeJxUXA/0AAAf4vwUJ+gwMCwsECAQHCAoPChwWGvf8CtrvAAYQ6+oD+BALBgIB8/j0AgQNAggY/gLw9v4NAQAGBvnu+fkMCgcTBujr/vgNAgUDCgf0+/D4+wD7/wvqCQkFERQMDf/9/QUNBhIF8/0G/fz/AwQJ/wAMBBwPAw4ODAQJAAsfAfUG/+/z+fkCAiMQCwABGQASBAQKAgsPFA0eEPbt+PTv6fLp/AwQ7gIA/hPjBwQLEQsHHQoG/wTy9/v58Nvh5/P82NX3AP/r5QkEAxERCxkM+fb17AEL/vsC+vgHEvgB/AAD8twL+v/xAgMN/+Tk5PADEv//DAAABBUaJQYBBQjuAg357On4AO3k4PX/CQb59QoCAgn8/+T3AAUMDQwJ+ujp9PX26vgEDQT/CPAKB/4J+wP78QAAABUTD/P48enq6t/+EhH69wD//hQLFProzeYAAAIhGRUVDQPz9djT6Q8SBRIUCg74/AIG3tr3/wT9CSQjGhkGEPfZzPsrIhUUCgT47ev4+fj4AAAIDAMdGQ0JDBT85doEJisnHPf68+Tn5v36CP8ABRQAEQQGCxUU/fPyFCYnHRsH/urp5dbuBQb/AP8I/fr59Qb6+fbx/w8QGhkQEQ0LBO3hAevt/gD+5d7j9vDx8+ft8PD9BCIUDw4MBAHh6Av49gAAAPbX3N3k6ODx7+rv9xcSEQ4IAgMA2OfV7QAAAAAUGxPs4+/0+/wBAAULBRUfDAD27+/v4egAAAAADRITDxD48+joAAPx/AYFDQYD6fLb0Pn8AAAAAAAAAw8B5wrp9gECAfgUEfb2EgIPDgoBAAAAAAAAAAAGCQD99QcfISwPAg8dFQ8BGBYCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAQAAAAAAAAAAAAAAAAD9AwwI+/4A/wACAwIDBQIAAAAAAAAAAAAAAAICAfUA9QsfKx4LAg4HARMMBAEAAAAAAOrd5urv6vHm5NL8Cgf7/fYNAw4PFAzb8v8AAADn5e70/PIB/vT7EALr7/oBBP4F9/Tv6fsFAAD93d32APfu9fH4CyIfHRYPBgf+CQIGCwgOEAABA/j9A//q6PDT2v0HGQsDAwcHCBQK/Aj99goAAAoL/wkK+vDi4fX7CQYBBf/38/oEEAYdBtoD+AASEiArB/Pn6PkFAQf/9P31+P35Bf34E+3eAP4EEhQXHf/x5Pr7AgD7AP/59wgFBgYBBgTi3PoAARQQHgb87PsPDQUE/f/9/QYCBfr//QHz1db5//kjAP0E6O7vCQcNCv8DAgoQBAMF+O8D5eTn/QD8DREK4dLe7wUHCQv/8P4MCAsKCwD64dDc7wAAAgr97b3O6wgHAQ0J8+QEEQMEDA/+7rmz3u/+AAD66tjP6Q8ICxUU9Ob9AAMWC/8GAgPlz/Po/gD96u/q7fcPBwcRBv7w/gMHCw4D+/gI/+Lk8fsA/f4U++wHEhEP/AT89AADBwb++fDp/frR3PD2APwRDA/6BRQYGQv//gjy9gsO+Ojr6vb14tLu+QDsC/sE9gsZGB4Q/Af47PD6EPrl6u/w++rL+f7/4wj+C/oCAw4PBf/76/j/CQ377uPh4tz44Pv//uUAAwkLCQIN//z88PQDDQ0TEwPy+u/c6eL9///5AAkQGQkFBwkB9vr8BPoSFRQdDA8I6+jp4vcABAYO/AMMDAf+A/To7/P/DSAgIikuEvj09f7/AAD9GO8JEhsWB/Ts6Ofx8gwSGiIuKhP79foAAAAA/hIFKBkXHiAR9tLa6OL5EA4eICElHwv+AAAAAAASNSYKGCYUCuvIztnZ/hwRBQ8mGycG/wAAAAAA+gglIh8oMBX75vQJCAMH9fIRJigTAgAAAAAAAAD+BAoEBQ0PAfsBB/f0BgT6BhkN/wAAAAAAAAAAAAAAAAAA/wD//gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/QQM8PPs+e8CD/r6/wMAAAAAAAAAAAAACAH57dvh/eoHDg0eQRH3Ce7w9Pr+AAAAAAHw2PcQAcvY9xkQADNCPzgJAQ0JCAP19/sAAAAH7NPU0+ja5ff99f8eKykUAxD1AgMD7ODsAAAAAtPR3uz9Cgz55NXo8wMdGBscB/wCB/vy2/EAAAsS/RwLHxD47ezT3eHpDRMaGhf08+Lh1+j/AAMYRBwK+hgG+QL839vZ8gwfFRL88f3n4sT8AAACFTkaEQYP/BIYCPLa3/4qIxAI8+737uPVAQAABB0qHRYWCQ4RHxYK6NoCIyUWDQDx/PTe1PkAAAItSCsZBgUMGB4eBtTX+hsnHQP+9P7h6c/nAAEKLioJEAsFEx4dCvXI4gYXJA/+8fXw3/kH5wAACR7+/fP6+vvuAO7zzuUECBIA7fDy4vMXLwQAAAYo7gMB6Pjl3O/l3eP2DQwUC+jx8/jvGR4eAgARL+QA9/Hr3Oz48PjxAvgJEgHv9vMI/ff/KQYAEhrM2d/c7+n7C/oDBvj/BxD89/MC//n6AigEAAcd0Ozm9Pz6//sA+v/tBgsC/vj49+3kEQMbAQADGd/9EA8PBv8BDAfn6/YD+vkH+/zr/AwfHQAAAwb8DzEWHBUTFgcA//gE/AMJCBD37gUVK/wAAQr2/QwfIB8aDhEWEggBAQMLDggFBwUL+//4AAIUCQ37Ch8QAAL+AQYGCfwIAw0QAxAJDQnkAAABCj4qBvL7+v77Af4ICwEB/Pfu8eUNFA0O6/H9AAEZGPUG/P0B/fUA8QgB/vj79+v7EScTHBMG/wAACQzwBhIBCQH59/4B/QUF/fsD+QT46AMXDQIAAANKMxgUDQX68v4FCwwA/wgN/PH24vAPJAsBAAAAOEY0FgoJ+u75Fx3/Avn/AvHx++cDBhEDAAAAABYcIibn2tfY6QTl1Nz7+vfq4f0LFAMAAAAAAAAA8uvv8vjq+/8bFcnbDB0QCvb/+PcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP4ABwYJBwUDAP///v3+AAAAAAAAAAAA//z+//0SChABGicyJhwKEf4BDQcBAAAAAAAA5d7t+fzyAf4gHAwLFiAO/hQCBw4jFebz/wAAAewA/wQGAAgWEw4KFAsL/v0CDQXz6+bl9f8AAAHmDvr9CAT+Bw4HAgP/Bw8FFAobEQoE7QYCAP/9//3w9/Dp5ukDE/8CDPbw+vj9BgsBDAH1AQD//gQG4e/g4uTr/AQODQn86/UC/QIE+QEI9QH9/wMKBO3X4ev1BAoFBgADAvb4BQ75Bvbz+vsEAAABBPPX3OwCFA0EBPz0+gL6+REH/Arq6v/+/gAA9Qz87+r5FhYFAPsEBQP8/QYA/fcB+uIG/P4A/vwZGQf8AxEDAu75Bwz4BwYGAA7++unvGAMBAP8GAB0WCvP+9vv3//0N9QQB/v7+8wHp+Pb0AAD++gQNHRL7/Pnx9fD6AwYP+Pb6CPcO/Pfe8gUA/fMUCxEOBw3/9/ro+fULFwIC9wH9APTnBQ4DAP4AFw0SB/0WBPny8/X2BA33+/v19wr9/gQFAgD/9wQAGgn6AA0CAv379/oGAfD19PX7AwQZBv8A//30CBoV//0B+wQCBgX4+fXz9/D++A4PKAoBAPv58gQRDg8F8PD6/AIF/vz5//X0/P8SCBsIBAD48gUGEAwAAfoFDA4DCgYMCAL59gcQFQT5BwMA+AMVBwQK/f38AQ0IBAgXCAD0AQQEDBn+8w0BAAAKHv3sBP3/9/8EChINBgL47QMFAQoJBfjl9QABCAoD9fX77vb0+e/3APwKBv//DwEJ9v4ICf4AAAIM/Orz+vD29PcGCgIEEwcKDBANEgIG/QQAAAAAARMSBfb6+PHu6gP9EBEH+g0XHBYB/f8BAAAAAAsKFgf8APju7fYRCv0XDxIhJRYQC/kBAAAAAAAMKS0jBezuCw8CCQgLHRENCR8WAP4AAAAAAAAAAAACAwH9AgMJ49kAAevz/PsM//oCAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAA/vj2/gAAAAAAAAAAAAAAAAILHi8mJhYWDwsD+P/57PsAAAAAAAAAAAD//ADn+QgGCg8TCw4C5Of18uT9CQQAAAAAABw0HBH5/PoBBRMLA/IDGhYYFgoE+uD+/gEAAAAaIxcR5AD+CwX68+wB+PACDhHzBQAT++cDAAAHFxEd8+z++v7x9gkGDwYMDgQC/QPv/uzjAAAAC/EYJgXy+/0E/vT4+/r/AAv9+vz24/gO/f8AABIAFxkD+wf8APXq6ern9Pv5//Ls6+4EGwoYDg4V+/fl6AkIBQP++N3e6wH0+PYA8fX9Fy0ICAQGBf/RzusNAPXwBPzv6eTrA//6+/z28fogLQwAA/Yu4NDt/vXp8QP/9Oz6/AwC+fP1/OsSExgIARTOLfHO9/P08/EWCQsLAwgJBPcAAff2DQTe8gEN0ez74gT78/UNISsnDQj8AAT6/O0BDREA9ugA/tP3EgcQEPT1JiIeGwb8+wr//ungCRIS7QgCAALQESQgHwUEGicdIgn5/gcNCPrs7wgZDwUwDwAJ4QQKDxII+xAaEhgK8/oPJRsVBvkJ/yoM/h4AA//9Cvn09/YCEQ0QERIYIhocJBX5AQUh/xMjAPwICgUHAvYEABMbGAoWIioVGA0VBP0MBgH4Dv/uBw38DPf3ERUeEhwWFh0hCg8I/fb9BBoY3wIB8RERERj9/gsRGA8B+gYCBQMN/fDv7REfJ/T/AgQjHRL5Af0DEgvq5d/p6PMB/vT23eH1ARvm+wEFJCz94vH09vvm1dvU0dbs7/n87+fg9OkSIA0AAAgX6OQCAvf16ufa0NDe3eHk//X0Cwjj7/wAAAD/CNfs9vj8//vz7ecBDvz/CQMIERn76PQCAAAAAATh4eXh2vsHCgv8/goM/gMBFg32+e4XDwAAAAAC8qO4xtzX0e4K/gUjFPn0/wjy6f38/gUAAAAAAP/v2N/58f7wAwP0AQH19/fv4/AI7uj9AAAAAAAA/Pj8/gEIEBID7QIMCO/z6+b2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/v8AAAAAAAAAAAAAAAAA/fXo5O/8/fz+/v39/Pr+AAAAAAAAAAD/+QECFRHv5/7//Q4REQT+6ef8/v//AAAAAADs3ggdEvoDCQn+9hMZIhAKAe3f3/358v4AAAAB6eoSCxYR/AHj+BgW+v/u+gT0BPP06/4B/wAA/uT7Ah00JQz1/AgMDQwHGQsN9wD5+esZDv8AAQQT+vsMIRcW9/kE/AUGB/n/Cf0EEg3+BA4CAAEOKfr2/RH7AvP59/gK+PMB+vYB+hAN6+X2/vn8Cw/49wgFCv7+8fcB9/Lz+Pz8/vQLBfndEgb+/wsK6g4I+Qf88v76BvwEBv73BP4LDgIL8SkbAAAI9+AGA/T28PL3+QQBDQUEAQEE9AoRAO8ZHQD/8/bs8P/5+O/s7QMZHxUFBv7/+fYB/PLnIgsA//zd3erd7vTx8PkMGxAPBQIGAwgOCPH0/BkNAAAH28/p2N7f6uv9IQ/9Dv8ICfkEAvj45iAcAQAB5+vN5erk7e78CRMGGRMRBvgC+PbxAeEM/QAAAt4E/vD4/vAEBAEABhUMBf/4CQD9BgPx8hX/AAICEg36CwcPEwgOCxMWDvj2CQUGAAkaCgMG9QD/9QcM/g8UERoJExMLAQwJ/QMJ9/wJIREKGPr+/OkaBhUE/xIBAwkLEg7/CQcFBAgE9Q8TDhwB/vj3HBMEEhATDhAF9AcGCwQGAgEABPYECRceAvztBysJDBIZEgT2AAkEBQIQBfgCBgns8/0MEQL++BYvDfgODPsD9AkCDQD/BQH1BQHx4uLyDOv1AAAIFgQECAjw9/oDC//5Bgf89/zy8uLw7w3+/QAAAeb3CRUOBAcBAgsH9QcH8/Hv/OXm5u8IAwAAAAkQ3vkO/PD6/AgECQDn/v30+AAE8ewDDwIAAAACBfTy5u/s7Pf0Be/y7O7s/RAL+OTi/AUBAAAAAPLg7Nfk7Nzbw8fGuNTe5wAI8ejuAAAAAAAAAAAA+O7t9O/yBgYEC/IADA4FCQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIAAAAAAAAAAAAAAAAAAPz28vb+BAAAAP8B//8BAgAAAAAAAAAA//gDDiY0HAb5/BYmIhIECvIACwYBAAAAAAAA5d4GLSMCBxIpGgkSBRwFGhj6Av4fDOv5AAAAAOj+HBsWAgcdDAsEFRAWDAAGAQb099/v/gEAAAP0BPAAC+70/Q0KBff6EBMQGRYVAA30+BIJAP70Afrd+RD8/PwMEQb6AgIHDv/7+fwG/gEHCQD/8AsM+QQBAPkAAw8NCf7xAPn5+QUD++4P9gH0+O4dDPzt+QDzAwUEDPny8gUAD//8/vXnBP74/f30/fAA/vgJ+/4KE/z1/f8J9wUI/v0A5Qrm4gAA4f//BPwEB/D/AQcF/AoAAAj+AvPyAeX87+T/8+ELEQ329wD4APUE9wT5+wIECvv+/PnxBAPvAPYC9P0R9/b8+/MACQEFA/r3/fv09AQIAe787gD/AOj7APsDAPf4/wcPAxIR+PjyAfAACRHlCP8A/vb2/QML+AQD/voCChsPFAX++f/2AAD7CS8EAP8DAfL/EvsHAfD9/Q8ZEgr8/P356Ar59hobAwAB8QYACwv1AgoDBQoQBvkMBQ8L9P0D8/EjIwAAAOn69xMJBwUEAv4DCvn/B/oOCAH89fXtAfoAAAHbDvgUCQn6+/cA/AYJ/wT/BgMIA/cL6QHmA/724ScABQQLBPwABQgHAhAPAQgKBgQDD+nz9wP86vgf8/MFBAj7AAYBBxIMBfkGAAUOAx7o5vsB/vIGC/bn/wH8//MA/w8FBAEJAAQL7/4W8+/g7gAABP4BAPL68fv9+f4E/woGBwMFAf8KFPwE/P4AAAMJBvTzAgX8+wQODAgGDA0K+wYKBwgdBAEAAAD0/BEGEQwC9/T89QL4BBP88PT3Cgb9BhABAAAA+v8CDw4FCgz78wEIBw8KBw8JEAIN/AELAQAAAAAOJyIY+vsE/w3+8/LyBQYD+P8C5/EHBwAAAAAAAP/9+gIB+uDez8rwCvjx8vMC//4BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAQAAAAAAAAAAAAAAAAAACRcbEQwJ/P3/AQADBQIAAAAAAAAAAP7/BRgTFfYJASEYEBAB+QT9+hEOBwIAAAAAAODb7P4QExsHGPv/8uXr4dTo2gMsLBj7+wAAAAHyC/8UFwMMEhME+Ofg5+P4/Pz19gME8fIAAAAI+h4uOxkO/Aj+/QoCAQb+Ag4B/usOJhP6AAACFSQ9OysQ+wwJ/vz78Pn1+AH7/voADh394wIABBAqLSQm/vMQEQb7/QICAwoH9fgKGB8q/ekG/QoUFyItG/0JDAv9+fH7AA4PEQwJBgEGJ/jn8v8CChciGxQAAwMK6+3i6fD5CR4jGgwCCSPt0uQAAP8fMiAMChgK+fLc5ePk+hceIh0TARIR6MztAP0PGSYdECMTBvfq6uLk5/sMExwcCgQiG/vQ/AD/ARUSDhMbFwX18Onr1+T3AQ8NBQoJEib/zP8AA/oQHhEXGBsZAenaz9Lf/wULFA8ICwoF9tAAAP/5BQoNCBEdFwT25trj7PgNFBsRFgP58e7WAAD8CgL2/AwXFhID8vjy6v37EBcfEv8F5en8FvkA/AD07gcTDggDCfoF8/j/DSEWFwTzAev7Jxr1APkY5e33EAv5CPkG/vP8Ex8iHAT+8Pf4HkUK/QDlFOP2+QYSCwb68uLxABEpIg8D7+n09hkj9AAA4gLlAwMICxwJAPjl6gkWLh8bA/Xt9PIf//wBAPD8AgoVCQcIAgTq+vgHDxsWEhH5Cf8EDvsJAQADCh8KIBELBQ0FB/r99REJDA8C/g0VCvzt8wAABwYG+BsnGRgP/vL3+/8A9vXv/fwEEBkG/QkAAAH46OcJGBoYDPX8Cf3/8efj3ej5BwwJCQH+AAAADfgLFhULKRwLDhAXBPnw3ef59e72//36AAAAAAceMhD5//7119Xk/woFEAEF/evfzt/Z9wAAAAAAEh4dHBULBeTM1B0kEhoIEwjz39jd4v8AAAAAAAD9Cg8OGiUoEvP5/93jDCY0IAsEAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAPv+EC4qChAPCQYJCAMAAAAAAAAAAAAAAAAJDBwmBP3sCQsXHjEwFyIDAgAAAAAAAP8ICQ4eDvXl6ePv/wbw9gIQA+zo6Pb5KBcCAAD7AvwIJx8P4tff7gMEBvvq9vz63OXi3gr4+gAA+O7YABQRAvsABQX9+vsF9fcBAPP54NwA8/EAAPn4+Q8IDgoWJCQXBP8JBwcZEAQRERP+F/XgAP8DFP8REQgSDx8MCwYPExwlJxQOCQkSBQX26OjuDxL/AwwMDwL/9QYBBR0VJikiCQQeHQsS9vT3+RIYBu8CBf7+6/UDAQEJ/AgC/wj7DQ4CJvH9AP4BBgEBCfv29e/z5tPZzcna5+QB9e/pDSn1CQD+8u7o5fvl9Pbk39bLy8y/z8/d2uLt2+X+/QYA++zz0sDm+vzv+fT36ezu5uUA5uTjztS+5wn2AP0C/Nfd8gf3AAoGEw0gFhMOC/b328zZzuQK/QH/AgMJ9hUKDQoQDgQUFxAXDQ0L9+3p9fIHDAEAAuMAEgMcEAgPDQwNCBETFAIECgn06fIdCd4NAALm+vz2CgYKBgwHDg4UFg3//wsG/QECF/LuHQAG4xHx+Qb1AP0K+vH/CwP5+gkKEvoBAg/uIwsFFuoV+g3/9+z4/Pz2/QgCCAEFDxIF+f4DDTD7/wnt/+gB/vgA/vv9BxQFCwIQCxYPDfoGGDEY+f3x6+/s+vzvCgn//v4FBvYDAAMVB/v58hcyAfr/8/bU8P0D8Pv9BQQDBP/9AQARBQ/+4uwcG9/gAP33/f8LFfjy8Pj9+fr2+fP0+/EA8dTe9Pv3/QAA+hcGHDUP9fT/BgH8//T39+bp8ezr8QANAwAAABIE/fb/CAUBDwIJ8u7f5wXT2fn88tzuDQAAAAAG9fH9DyweNjYQDvvc3Or7GEI9HRDgHg4BAAAAAO7h3e4VLygnISUO8wVAN2N0VDAH/QoCAAAAAAAAEBcUBwEWLjs/QDhORDsOBvv//P4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//f3/AAAAAAAAAAAAAAAAAAD++vr/AgH////+/v35/gAAAAAAAAAAAP8DDBQG7OP17/jr5u3l7QoPDgH8/gAAAAAA/wPw8evY0cPg3+L09wMIAPgEGAMHEeTw/wAAAv30/g0JCw7+EwkABwDwBPz0AQP89uvoCAAAAAgRERQbAvL9DQT5+wYT/hEBDxIPCAX7+xcFAAAUGiggGwf3APfp5+oD//3v6Pf0Ax4PCP0BBwAACxITCQYJBwL75fH3AgcG+eP5AQsOBggKCe8ABSYg/gT/Avn/CP7//wgE+Pz+/Af9Dg4CBRH5AAMoGvLp6P35BAX6AAIJAfYG+woGDhAFIhn08QABJRX57vQEDQb69AcODgXw9PsCDREIAAkF4+EAAOb0/OjtEP//+wH4FxEM9v4I+w8PAvMPIwTsAADzAObt7w7u9fj2/ggC+fwEAwEEC/wE9wAOCQAAAfLb5Ojr7+zwAA4IAQUF/vgKEAgIBO74JAwAAAAA1tDU6er3Ax4ZB/j4Agf99QUPDAfy8ysGAAAA99PA2/XxBBYrG/vx+A3x7/r7AQYF8wgaBQAA/PHcu+HxFzE4Kw/o7P79+fb+//vt7gElJwIA/erc18/i/xs8OzQDz9fr+gX+Bw8N7/UBLhMDAPPbvuPx8xQmKjQO073i+vsLEAr7/PwACA39BgDz59nr7PsMFSwh/8rF6AEJ/wMMBwkdFwbkBwb/9fEG6OT9ChMWFQPt7PL/BAf7CAIICiEO2gUEAPz4IOTn7gUOCAMK/v728/MBAwsN/gMkCf0pAwAA+/jq5/8P/QcOAAgC/v/78gAIAQgLDREJAAAAAP/G+ej2CwkMCQD9Afb9+wMSB/Xs/gj97fwAAAAA494YAvL1DxAJAP38+PUCGgoB/Q4VHBENAAAAAAjbBQ7y/QwnGf/l49Hq8Pzz+Q8QGv8ABQAAAAD95MfQ7Or9Ef7g7OD758HbBQ8RERLq7P4AAAAAAAD48u3V2PEBBQwODQjq9QL1AwYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/v39/gAAAAAAAAAAAAAAAAAA/vLz6PL1+fn6+/z9/f0AAAAAAAAAAAAG+Obmzdn3GQ7m4wD19vQN9fr6/wAAAAAAAAH1+Of9HgwQ/f0JAQ0A+tfe8+rv3fcUBAAAAP8C/e7yAxMQCAwKAfsK+O3r/gX7/On4FgH6AAD88v8O9A0WEQ0LCw4EBvbu9vf27uv9BBLw7QAB+/sQGQgAAff4+AINAgoDBfX+/v/0CBH++vIAAf/3AxUZFPkA+vkDBAgJFAD7DAIPCCAY9Af7CwMS/ekEFRIL/wLzBQoPCgQKC/YHBQ4RCfYEAAMBHBLrBQ0AAw3/6gIHDAr88Pbr+AYLCCAG//4AAA4U+/4IBwHx8e32DhoE6OTmAgEKBgwW/wMBAQkDCPgLCQ3y8uz8EQ8M/uXwBQsL/wsHCP8X/QAIDBYCGAT44+3s/g0YDfHs+xEC/An2/+rx8gkAAxMMGQgHBPr4Av4QFf3x/Q0RCvkF9PDh//EEAAMV+gQGAwIF8Pr8/w/x+PwaGAn2+vTxF/Pp+QACExAMEPkG9fAB/AMB6/4EBA779/j+DRf/BO4AACsNGBX+AfX1CgD49fQE+gsBAvv7CQwL+/7sAAAaBxQY/AUCAfP2B/n/AwIFBQMHDw0eGuwP//8FDhofEP8DBQD+CQsE+v/79g0QCgQDBQ/sCQACFggQGRH6+/UPBwgHB/rv+QMOBggNAgYZ6QkBBRv1DhEM+wQGDAb9DBL4+vf6AwcBAwIDBuwTAwIK9/UFFgcMBgwDBwQFBv76AfD3AwX65u/4DwYA/fj5ChUXCwsKCvwD9gDy8g8MEgUA+ufuAAD/AAD/8RAT9vsJAwn79PLn/AgdCP8FCP759AQC/wAACSIvEgD7BQIDBfwHDhkD6PX/EAYPBf/7AP8AAAIdLCP64OnrDRcAAQTkzdwMBfb6AgT6/wAAAAAABSUrIwEC7unxAwn619z2A+HY9P0DBQEAAAAAAAD59vn+AAMBAQD8+vX2/wEAAAAA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgEAAAAAAAAAAAAAAAAA/fIAFwMQGyYSBwUEBgcCAAAAAAAAAAAAAAEGCP7b4g78FRMN/gMHGSQTBAAAAAAAAAAJEfkQCv3h1vIYMS4rIwYkJRogAfwE/f4AAAABChAPKhcT+f8IJikkGRkdExH8Ae/9/fL8AQAABRcRABIL9Ovl8P34DQoPBv75/ezrEQf3CgQAAAb32ssA+OTm8P4GCQsTAgL0+vLt9wEZEwABAAAM6NPP7vHq6gcRAvjuAAEMAQEE8/D6JzIF/QQFE/Xc2N759P4KHhXy6vIH/f8EBf/g5vk9+vABAAj48d3p7/EAFSQD5drn+P8CCvX/8ebyBNrVAADy/AX18/MBGSkg9NfQ3vb+/wINFg/16erc0QAB/AwFAuz0/xUdGvjH0ebzAgoSBB0UEP704+EAAQcY9vz06vYYFgv34+D18fUCDBEJBf7mzfPkAAAABu/o+P71EQoSDwUA/fLuBw8DAh0EC+4aBQH++frj9hUGAgIWDRAdC/0D7PoNBP8XAQEkIwUA/AEA1A0gDP0HBhMTFgkBAen5//0HEQ4BOQkDAP75zc7y+fj/AgsHDAX4A/3z/AUPEhQGDhANAwAA+7/i2eH0BREA8w0J8fgAAAP5BwIPCwEA8P8AAu++2eHl/xEJAwEFBOz7BQXz5+jyCgkLAQwJAALd0dHf4PUHGQ0BAfT1AAEJB+f++wMK/fcYCgAC5s/j3+XoAwQQBRMM/wYLDgb3AA4OAvLwGwUAAfnJ0+nm5/oGCQkJDAMEEhX26PYQFPjj2gwEAAAC/fPf4OryAAj+AP8JCxoR+Pj6Dgvs1t8CAQAAAwr589bo+QgB/QP2BAgdCO3u+fb99OnzBQAAAOzo3Q8L9PkbFAUC//f3AfPeytj2CBQSEAsAAAD3Df8CAuDy9vLx7OfS2eny8ODhAA4TGhQHAAAAABscFh8PAfDHztvu2czQ1vAGEwQLDg8IAAAAAAAABQP5ByIoAurl9wXyyeP/AQLy7wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/P8B+PUDA///AAAAAAAAAAAAAAAAAgH25fUEBOLr9/L6GiAoIQ0FAQAAAAD+9e4BDg4G9b/I9O7G5R4nGgERBhktIPX+AAAA+fT/DQn14tC3tebq2QQVBvP/AwMJCQncAgQAAPnl8PP2+e3j5e7v3+YA/fr3AQP9B/zy7BgaAAD25+3x7wAP9+vS0uLr9wQYEhUP/wMgFPnyBQAB7+8EEwTv6OHTwdLzERkbJyMiHxQNBw8eHgUOCe33HTcR5+765PDzBAsSJSIWIiAtJBPvMR8ABALn4xc3DO3w9Pr8+ggKDg8JAAsKCxMOByEW+AAA6tb3AgPs/A4H9voTDAgE9e8A8/gJCAMvCvoAAPra9/X7/QAI+wYBEhgG/PXt6+j8AAn1M/P6AAAI2/72CPP/+P37ABwnB/fu6u3y+/v07SP7/wAA8OQEBgT9Avbt7PwnHAL77vPv6/sA8eQL8v4AAfP4Egr+/QoF8gIPFQTy8e/99vb7Dd7t+uUAAP4I4u4QBfQP/f4LCvDf9QQCBProExL78uPlAAAAEdrzBfz8+gUTBvvd1/4FBAzp9fv17+Pi7/8ABgzt4vX0+fH5DPnp1fH+ExUP/uXh2t/w5PsABBkJ/ufy9v/s+vbr1Nn3Fx4lE+vLxdfy+PMCAgEcCO/1ARgF8wDx8/X1DBgiJyPwy7/g487sBgICFgDs/RATEQoUBvv//QIKCx4D5ritx9rN5gUCAQgA7AofFBIVChAEFgwJEQcM8Nu0zMTW1uADAgD/CQIBDAQPHBIWHBkbFgQC6uPd0MbX29zi/wAAAAcgE/UCBgYDHgwdGwz66eTd8gzmz+Dy3Pv/AAD04gP3/gYLFQv++/ni5d7f7vzzyc3y8OP7/wAA+ePg8BYJFx0aA+T0Av8JEC4pKAoa9+/y/gAAAAAG+eb4AP4NHh4HER8DIzknMEQiCv0AAAAAAAAAAA4B8QgKBN3l9fgYChMPBP8F/v3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/Bw0FAgENDBMVAgL//gAAAAAAAAAAAAALA/nr5womGv0RIAwRDvgDBhIMAAAAAAAAAOHN8O/0/Q0cBtbU6vL19OPhAPYHGB7k8f8AAAHp5+T6+//42/Pq/RkgD/r76/b8CfrsuvIBAAAB3/T/89cD//Xl+ggXERkPDQkH+gX/+dIOEAAAByITFPb8EAgODgIFCAMHDw4aDxIQ/e7Y4f8AAw4kJSAEEw8VDgsWCQgFERcSFQ4PDf/y5dryCwfp6gAZ/RILCQL+/+PvCBEaEx0SEQr48MjfAQMD3vbtCP8GDPP389/S3v8ZGhggJwgcCOiizvgAAegD4+j18Prf6ujcxNH5GBoPFCAiKfbUh9D2ARL5AuLc5u/26u/z4d7s9Qf5BAwSFCLv9LzpAAEK5+vj5wT/DA8OBf3e8vT48PsFBAv/6+nS8QD//ggGAQQOCg4QHBoN9Pb1/f36A/IE8tfh4gAA/gQNGg8YDv8GDBIT/wD4+wUF9vjp++nnAv4EAAAH7wYRGAcDAQny9Pf69woM+PH77/Ty9v3mDwAABP37DQj7/f4B9/P68/UBDv3y7Or9/vP1tw0BAAIM9/H48v3u9wD8/v/6AQcC8/f8/QYH/cgHAQIA+vUEAf3yBAELAgMK8fv/Avzz8fIEBgrd6/4BDej9DgsODAwLDgUNBv75CQoD/e7v+P4dBen9AyD3GRUQFA3/BBIJEgIO9fj/Af3w8u4CHQry/QIQJS8ZFB8KCPcJAg0LCwoKAv4LCgr69xgDHBAAAR0I+gQPEBUHBwINCgoRFQQJDQsA9vIRAvkBAAAK0tQLDhQODA4KAw39EBH/7Ont7AH08/j7AQAAC/f0//ryBAz39AoLEiMRBAYC//r82u0GBAEAAALl6u/9DQoWCgoMAgP73rzT//PY0uP/BQMAAAAA5+Xm3wMJCP4GAR4VIAHo+hAE6/4AAAAAAAAAAAAHBgYFDAoXEBQ7GxkS7+r9/f4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAv4BISEhBQIA/f789PYAAAAAAAAAAAAAAAUgKEAuB/3p+PIjJCkd7uDl/wEBAAAAAP8EFQQdCvD6APXT5NLX69/f8drmDBobDAAAAAD6CBb78fX5Ag4QCvbm5+8E5/sK9egQGx4AAAAA/CYc9PPzAAgQDhcB9eXn3e4DFxL5+BMpDgAA/fQqGOb09f7+FRoJBvHfwbrT2dz70Lz+OiMBAP7wJyL9+vXyBxUmJRT949W7usDJ2cHLGSsaAAAA7RkT+gYKBgYPEwUI+PTz7O3r0+DT5xoJGwEAAOr9CQAYDAQXEAIF/AMJFg0HBOHm8vITKv/2AAD5CxsFEBAVDfX6B/wFJSQUD/z26ur4I0oL9AAAISgtKBIL/wDo8gQJECEgIADx4ujoCS1S+PwA/h4dLSoEBwH49QD/FRoVGA788efeAR8oEPQDAPsSLwscCgr/8+8G/AUP/Pv38vjy9xIzHfcVEAD2GEAF/w0E9/b+//f35uj6/gQVBfQUPB0bOBMA+B02HgwJFP3v9/8D/+f1CAIRGxMCFRYbCf4kAP8EJDUD9gnt3P4PBwYA+QcaExYV+ggOFg8PIAAAAyYjCfMB6tfyDR0TDRMCDRsPBwIL/QkaCBQAAAfU+/31+t3O4AQmGAL5BBAUDxEGCAYKFvr/AAEQ0QcFDw/YutsXKBIM+QMRGhIICgEH/P/0AQAABOII7hYY+LrtDRsZB/gDBf/6//H8CRETBwQAAP/u39r9HfzK6PQDBggLCAj79vHq3f4TFhgFAAAA/tXjBgTy3trqAAMTFA0M+u/v8eb5/wIUAgAAAADo7RcN59bU7+3t9vXw8PryDQL48Ar8+gAAAAAA/fIQAOnZ3d3u3Ofr7vcNHBL67voKDgEAAAAAAADv3dXjAwX9AfkNCQwC+QsNDAT+CxsDAAAAAAAA//sSKTYyGCknKxwA/RARIBsA7QweAwAAAAAAAAECCxcjF/4LCR343ewOEhkcDQQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQIAAAAAAAAAAAAAAAAAAP379vUE/wYDAQEB/wEFAQAAAAAAAAAAAAEEBA0mGBz+Dg4UKTwqHwgWHgoAAAAAAAAA5t0JIv/Z4/oRA//o/BshDAT+CAckJu/0/wAAAe/9HBAR/gD9/A0DCQcWDfoHA/rn+fzv/QIAAP7jBBoRCQX8/AUB/wYTGR0GCxUP+vsF/SEVAAAKJB8B7v7/A//77PP+APcCGBkHGRMSBfr8CgABETEf9vQH7/sD9/v9AAX1/gH7+AgKAgcI7vQAAQsSGxYCEfb9A/gBAPz9+/0C/gkNCPn0/hIFAAH9Cw8EDf72/f36BAYA/f8GBQADCAUDAP0VGgAACfcJ9Pz7Afb29PUREQ3+AgUGBPcEBAb9BxkAAAj7EQUC+vz8/fQHBxIaCwAC9Pbv9P4ABAoJAAAOAwgJAfYA//Hz8wAfFPn4++/+8vMC+AcMEgD/DwT5Cv/zBAbz9vkIEBYK9/T97fbu//wMDwcA/xX/7gAA/fz++wEDByUXC/QE++T1AAPs+wz+AP8Q+/TzAPcEBfkAAxUVAf/2A/Po/Q393d78AAAABv/48/r8CQn2BgkRBwb69v/y9gD/9O/m9QAAAPbr+vT6/f73/PwNFAH09Pj99AH99/3u+QUAAADk5PgD8/8DAQICAwcE9PIEAwUG+fH/8PkTAP/62/YABQ/29vYD+vwC/wMODQcOFAcHBQgGHQL+7+UPBv0GAAf2/w0OAgMLBgoIAw4OAg0NAhUC//gFJhX5FP8GBAEQCQb99hAN/RMODgkeCPMAAQAAAg70+Af7BRAC/Pb79woODgECAQMIDx4ZAP8AAP/f3/IHAvsMAPr99PUYCAYABfwM+QIQDQEAAAAA7er/+fr//Oft9/P89QgOCQT99uX3CAkAAAAAAPj4BgwH+AD69QYS/fgICu7hyrvU8fkCAAAAAAAD/Pb/BfoVDhUBDAH25/4KD+vl8/T3AAAAAAAAAAQD/v35Aw4FBAXw5fAHDwb+/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD++fj7/wAAAAAAAAAAAAAAAAAAAAAA/vzw2dfP4tnyA+PvDhsNAf8AAAAAAAAAAAAACPT1/uvi6PT+GC8W+Abv4Nza1Ob6AAAAAAD+/w36+PAE8/0ECQoA8Pn75ODm8/z6AwEAAAABBgUFCgsJCAgPEP8LA/8PAPr3CgkODgUIAAAA+v7uEBQM+QEABgEMFwML/wD5CAb3FALxBAAA//QCABMUCAcF+PDtDBkJBvv/8vnq8Q8BBfoDAP71GwgEBPwLAfHo8gIYEfwA8/EA9g0jCRL5AgD/+Q34EgYCBvPwAfsEGA4E8+30/v0SHAMhFAQAAAATDAv9+QH4Av7xABIJ6vXxAgAFDBwIHhgGAADfFQrvBfMC9Ar/7fP47u7u+RANAAoRAPwIAgAA+O37+AkFAQMRDe/u6OHx8voPCvAI89z/GAAAAPXjAvAKFw0MEQQEAOTf8QUDCgkC99rqFhMAAAL/7v0KFxoPCg4MFQ0L/Q0M+v8A/Ore7AEJAAADHQ/t/hwiFgkBAgwgGhwQAfz09//18PQAEAAAAiQT6/kQEAn69vAODw4OCQMBBwUD/v/u6QYAAP8TFfgCAfz74+vqBAP4Cf/7DQ0IBwsE9uD5AQD6EyUG9On279Pd2vDs7Pn9AwUJCA8QFP4ADQQA/Bk8DAEA9trW1dbd7N/z/xAHBRIZEBr+FSEDAAAYNxYBDfXn4evl6uPj9QoNBgsODAgT/wwCAAAABzUbA/kB9vbt7/P5AQkP/Aj+/f7z9wQWDQAAAAEgGAr4CRAC9vf3+wEK+vPy/fv89wP5Af8AAAAAHg8UHxwXBAMQFwwHBgf4B/wBAwcOAP4CAAAA6w8C9R00KyYbMiQLCv799/voBQIDCgIDAwAAAPcG9+oGFhICEx8Q6v4H9vP9+AUC9ff89gEAAAAAAgP17v0G//kECdnI0uj48tTc7PQH9/D+AAAAAAD69/b7/Pfm6hL46/4NCN/g+evx/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIPEgIAAAAAAAAAAAAAAAD78vPx6vTv+AQEBxAHCxgLAAAAAAAAAAAA+/8B7d7oBPoJGhshJgr8+QQSEQIAAAAAAAD79PgDC/oAAxIHC/r/AwjzBQ0P6/Hq7/0AAAAA9vPt3Ojr8BURFhUD8wf09fkI9uHv6uUBAAAAAQ4W/fAJCg4SDBUMBPwD+/T01u8FFA7p5fUAAAE1IfwN8/n26fAFDwH78enu+u/8Df8M0N3nAAALIAD0/Ofy6er9Eh8f/t3f6vLn9BYEBNrpAhAICg7x8Ab28eDv+hsrGPLj5e3x/gMN/wHn5vkFBPgFEwkQBvXh7wgjOh/z3tX0Ew8MBAQB1+HyAADu7QL8BPfi4AkjLzUC08fV6wkQDA0J8sre9QER5eAAAfza7QkYKjMN4sfW2v8JAgYIEujS5wUBDfAACwXt6QAYFiQd7tPT7/IJCv8DJy8E+P4e/gD5BgUHAgsOFg4I/+bn/P/7CQ4NAxoeB9rJAP0E+Ora5ugMEBsNDPHp7/8LAvwTCwkHCNmyxfX/B+/p4dzvARAGB/3t2vD5Bf4AAQ0BA+jNvNXgAAT9Au3l8xAGDv4E6On3+/gFBAIB+wjn5tfE0AD/Ghjx7fIMAwL+9ujt9Af59QYQ/wAR8vXiwuQA9REDAvDc9fj3/v7+/fEIBwAFDBEGBPLb08/vAPkF6Qj63fbz6wAJB/XyAAn88QUODOfg6tvU9QAA9ODs7OX46/4GBBgI/g0F8AEFAfre9+vv3QEAAP0A6eXz+uj0+A0aAPz5//EAAgr39vTx+BoaAAD+9OTfAwAJCOzzAfz6+/38DBIZ+QXyCgT5AwAA/uHh4fLx7vzr/xAPDgz68xQRCQ4U+A4KAAAAAADr/Qj83tnn7xkSCw4N/fsECgglIyovBQEAAAAA/h8xIR8ZGv4GAOf/AvHt6+TqJRciJgwCAAAAAPkTIDEXAxER/wn3IBUUC/cgKTpGOyQQAgAAAAAA8vQJ/AEKB/4QGg8ECBoiFAsdDfsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCAoCAAAAAAAAAAAAAAAAAPz5/Pn09vwBAwIJBgoUBgAAAAAAAAAAAPr+AQ4SDhP87e38/PEHFw4WGQoAAAAAAAAA9uz8Bfrv6vf8BOfj8QMLDgj7ExEnKfz8AAAA/vHrBRAK9PIUAALt8gULFQ4UHQ/5Egz6AQEAAPzr9PcSBfUC9e/v5foJDBIQEREC+wsGBycMAAAA/vvu9Qr9+enu9/QFB/8CCAn9Cg8ZGxQTBQAAAvb52+gFAf4F+Q4DEwkH9fvw+AT7CwMfFfoAAAf17e8BA/8DCAcOCwAI+wQF//8FAQMEEyMAAAAGAQb38QYFDP/7AAr9AQgH/Pfv+gcEEfv98wAAAPPvBQf5DP0ECfsP+e/87wD5+AL8BPfz/PcAAAD19A0D9wj7BQkHEBIE+PH09e/2+fjv9xoAAAAADfkI+vcIDfn5CgMS/PP29vD2+/oH+OP7BgAAAQjw/OnvBvb0CA4JExIA/e/+8AAHDwsG+v8AAAr+7+7z+vn9AA4AFBcJ+/8F9fPt/AEAC+/6AP4V/P/8//kB/f3+AgAWCvoADQoAAQgF6vvs/AAABQYBBgkAD//8/fwCCwX79wgCBQQED/X67P4AAAUWAwALDQIR/Ab8Dfru9/4F/wgHAQf6+AD+AAAKEAz+Cgf7AAcHAQb+9vL3+/8ACf4PAvEM///9CAwL+Qz7AQQIA/r39/f69fQFCAf/BfcCAAH+9voD/Pvz7wP5/QsIBvzy+PYCBgoH7wL3+hED//v68frv9ezxBPv79f31AgEGBfv5/f4E7/oFAgAA//Dw3/bw8vr2+AcPDw4UDg7u+AT3/+8JAv8AAAD8B+vt7/b+9Pb+9fUUG//8/AL/7Qj7AwAAAAAA/vsRBP388ez3+vwEFxP+AQPu2OAH/vz9AAAAAAYVEhP17QcSCxkmERMU+v8S/9/zB/z7/gAAAAAHEBAVDAb9ExYPGBwaERoVJhL28vn5/QAAAAAAAAMDAQAA/fz/CgkIDQkB/gEA/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBgkCAAMF/wABAAEBAAAAAAAAAAAAAAEGAwD6+gwEChoQCxUaKiEbDQL+/f8AAAAAAQwbCe3X2uPk49319QYTGykNGBUTCQ4UBQAAAAQIAQgAAPD87Qb/AP4VECEeCyQcHh8U9AP9AAAKFeDg6PT0+A8NCAoMDwQbHRcUEAkC+vEJ/gD/7cLU2ewFAOoDFg8MBgoJBP8C/goRFA4HA/wA/eDL8vH5BQkGGBMIFhgR/QUK/QgK/yEGFw/zAP34FQnw9AgJDhH+ARIGCwcHGBIOCAYLBhMI+QAA+AX49PkXERABAAUB/wgH+gADAQv7/fzw5uQAAPX1/vwKEAb2BfoB/APq9un08/sCA/YX+vDjAP/9EQ/5/AYD9fH8APvt6e/rBAL3/vryGicB+AD+HzkT/AwI/gL7APwF+vzpA/MHDQLu+ggwHgcA/B40GRMVCAH2/gYCAfzx7/cFBgb7APcOFw4CAPwJKQggFwH77PP4AQz86vsK+fL8/wYAIAYZAAD87/sHDgL89fzq8wEFAu/6/wT27QH3BRcEAQAA//L+/vv5+v3y+vYHBg34Cw0A7ury+QUf9AEAAADn/wLz7fj36vkAEBYK/PXz9uz0+foGCdff/QAA6PQRA///8/H/Av379uvw6+//Bff77OzR4AIAAO70JQP++/7/A/QD/fHq8v/5+/r69PXZ1/sEAAAAGzkaCgIRAwYDDhD1AQMMBgH//e8I9+gKAwAABikfExYaDxISDhIUDAwVEwocEfv5GRkKCQEAAPoUFgQLGxYUDQoaFR0TEw8cEAT+CBoWFAf/AAAAAA3s6fH3EQcEER4ZERAhGwMPBBId9vwCAAAA89re5uPj8e/t/AMLA/b4AAwF/f75+t73AAAAAPrju9fn8PHs7er9C/Tp9fb5BQ0AB/z5AAAAAAAA/9ze2ujr5vrq++nm+RAV/gAJ++Xu/QAAAAAAAAAA+/T8++3Is9PU6QEN/+rwAfv/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAP78/fz9/gAAAAEAAAAAAAAAAAAAAAEBAgH4//T09AUB9QkM+PP/AAAAAAAAAAD//AcEAQIE/efm7AwOEQ8YH/v4A/v3AAEAAAAA+vUJCQ0CAQIE+/YQFRIlJyADFQEE8gcAAAAAAgL2/g0M9/0MEBQMBAgIHRYbHhD9HO8C+f8A//Dr9/ofIQrx7v0EAQgBDgMFBQL06QYFAAQCAP7t8f8bEAn67/z4AAUJBw4BAf33+QP8AP4DAP/9/hj1//Lq+fvv+gIBBfcJB/wIAvX+/fgRCAIA/goJ5PoC8ffyBAMC//n9CP8G//j+9v3qFAgAAP/+9/cE9ff09wUE/gH4AQgABwz1+/gN198J/wD/7fkL9fLx+PoHCAcP/AMBCwoOB/H47sjN+vUA/wP7Awn/8wD4CAwREwwDDgQHCQDw6/Tn2efnAP/tAQj4/QQSAfoNFBoDAQ8SAP0F7fz6/vX49AD+5wD3BAEWGg7vAwEWAhELCv/79t3x+AQYEf8A/wIM5/YNERAC9vsNCAADBAEB+vPqAwIROhr9AAD++uj/DQsAAvP6+wYF/PP99frvBAAIDB8KAgAA9vP5DAYDCwT28+/u///2/vH57vv8DQ7z9QIAAu8PBBoaBgT79Pb8+gj1CPX49ejl5QD5+vcD//z6GwYSDvnv7/LqAPn6CQn+AAsE8fX8+QIGA/7v+REDCQ716vDb6/z+Ag4TB/kSBwQECfHxBQP/9/fqAgcF+eXl7QD5/QoTCwQRCQj6/ezS3vkAAAD77AkRCvv48AD+/xELEAYIEwoS+uHcxeP9AAAAAf8FAg0GBgcKCBURBAgXChUMDgD54eD6AAAAAAEBCvP9CwgBEf8GBQIJDwAD+wcKCwb3/wAAAAAACRDz/gIREg4GCAn9CgkJEhggIS4XAP8AAAAAAAEO/v/+AAIHERcNFAkMGBMFDQH0+P8AAAAAAAAAAAH8BAX56PTv4f4JCOvz7f/38v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+/r+AAAAAAAAAAAAAAAAAAMEAf8CAgT//Pz6/Pr0/AAAAAAAAAAAAAD+9Pvy/Q4UFOfn5f4F+fPq7/T6/gAAAAABBAoB5vgIDA8GDBIIGAkJ+Ov89O7q/Q0CAAAABAP//OYE/xH7CA4HEA//CA0CDAP09AMWBwAAAAQR9//vEg0RBfgHDxAJ/v0PBAwL+PT4IRkAAAD9/BIQAwwFA+nyFBkBAe/18/L4/wj0ASsp/gAA+AIVExMTBPP3+w0R+PHm9Pr5AgUHAOgIK/oAAQAVAQYHCP4IAgD/BgcD9AYEAwUDEgf4Fxv6AAD/BO0UCRIH/fzz/AcE+f7z+PH+BhgdHBDq6gAA+P7/HQkQ+/QA9AAC/unq8v8FDhMcCf744+QAAPsGCQ4E//jm6O75DA717ef8Eg39/vztBhnxAAARDP8WBgr08vT4Fg0LA+z7/w0LCfz08xH18AABE/fuBwD39+/qBBkYBgP//gILAv0E6/AaCPwAAwP1AAgLB+zw9/4PFhP6+f/9/PLw+O30ABQBAAMBCAr+DAv7CP/5AhEUDgbv+u3r5OrkAeoGAAABEhwO+QkMAhcJ8+/8GBUD//z29fXr7vXqCwAAAAgFLBwWDxcV+vTp+goQDwX4+wYD+QkL9AYDAP/8DCEb/hIL/fjq7voQEAEMAQ0WBQQgCgTvBAD9+yAbGBECCfn96/b7B/YMDxEBCgsOGv/uAwT//hRKDP8NBgT77QQDCPUFEwoNBwkaExAD9ggDAAAZWQr++f33APr0/P7z/wwICxUQEQwW/vwNAgAAAjsOCAUC/Pb1AfX6+QIDDA4DBBEBFvX8+/8AAADyAfHu9wX57wEHAgINDgIF/P34CAvo6PwAAAAA7tr07fbz+eoFEQoE9ern7OPj6uoN/fP+AAAAAP305OX0Avb09/X39vXe3+vi1+Pu/QD6/gAAAAAAAO7g/Qj78Ovm6ebD4gcE6d7qAxIF9/4AAAAAAAD69vv89vkJFRYKBhYhDwr//fv9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/vz8/QAAAAAAAAAAAAAAAAAA/f4AAQL/AAD++vz8+vwAAAAAAAAAAAAA/vzqy9Xc9fkECAMA/Pj7/Pv8AAAAAAAAABEOCPr3GwTXzbG6xtfq3wT43eD4/wAAAAAAAP8XEwHf9PDq2d3h1NnU297m6uzx4gAEBQEAAAD48ADw4e74+fUAAgMA7uDWzOLg6P78DxADAAAA+uvc0tnu/A4QFQUI/PoD9dbl5dnb6gMLDwIA//7Zy+jq/AQQFREdFwgMCQL17dnr3twQFxYFAPz82d39FQgSHAsGDBYLGA0E//vs8+DrCSAhCQD9CPwEChcDCxL7+woBFxwhEPr8A/cA9wkeDgYA/gwPDw0SCPj/5/Lu+wodFxL5AAIKEvPb+fICAPwa/hsXFwT2/+Hv8QEPEBcI/wAKDRDy1wkHAwD9AgImEg8O+vv2/voHFAgG/gTyBhsZ9bjy4f7//wIMHAQGBQAE9ff7CAoR//8L+f0XDurS5eD8//wUEg70BQb2/QILCwT/Df3/DQQCDAf+CvD4AAD5IhEGBe3w9PD7AwEB/gsXEw4KBxYPE/8DFAEA/v3m+Qr/9P7v7v8C/PkJBxUODgQNCfLpDA7/AAL41/IUBvbw7N77/f3zCAYIDREC/e/g4gUZAgAP8/sFDAAEAfb1Cgnw6fX6BgYE9P7w9vL8IAQCHwH5BQLw/QIDAwYB5eHq/AMTAP39/Ob4BgcDBCIK7w8I/gYGEgn48uny//0IDvoB9vHq8RwPAwINBdkYJQwI/vv87vLv/wQLEQf45OTZ3gAQ/gMAAAbsBxIE8fHr8evyBQ0MDhD0+OXb2vAZHhECAAADDAESEfv03uvr+gYTCQT+8PLq6f0PJRj/AAAABREOAgLy9+jpAv8MC/j7BQ4T//sCAQj89QAAAAH/8Onb9vz2CA/3Cfnj+gQNJwv7APL+/P4AAAAA//T7+ggNJTEb+hgYAgQaGRwLEQf4FBUCAAAAAAAAAgMFDhMH9+YCEvDg9yQZBgUCAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEDBAECAQAAAAAAAAAAAAAAAAAAAAAAAAD3AgkCCAPZ1+LS1RYX/PsB/QAAAAAAAAAA//Hh6vQDByUO1rPLxMXh5MHN8efKGRQBAAAA/fbfzM/b/gX/8ur47u3Y3dDh2N/e4Ab0/QAAAe7t8sbF7wH0DvPj2tTLzdPy8/IB5+T07vcAAP/x7dzU5/AA9+7p6vbi5vwHDvwDAfwCCRMAAP0EAO/IzdzY3vLvCA0FChALGBsWEhD+6vEnEejz+f8G1tbl6P/2/gcGDBQhGyUkHBcRDv8MHA73/AILCuHn8vQJERQbIyUdKB0fHR8SBwsEFwn/AP8K8xQC9vwGEA0aFiwbFBT/DhUJDQEA+CMMDP7sIu8mGA4JDxQGFBkI/fns4fDs7PX06OQA8gz+7Qb1Ew4ICRcJ+gQB9/nx2OLv5PLs7dnr+wMAAQD57+Pv8gEG+Pzx8fP6/fD3+PP48uTe9vj9AAIACdvh7vrp9fH5/Ovv/Q8BAAUHA+3h4vv69AEB/QTS+/sH7gEBAgn8AgMB/QQXCv/z2try698AAP/a1vf+AgD9AP/89vrv7fcBAfnv4OXy1vLz9wAB5/Lk/xQTChD9//P5/vL3+P/t9u3s9LfY/vsEA+Hb8AUNDxAaEwb8+P0C//b/DQrr+QPNyQEA/uzz2P8OEAkNAQX+BP0L+fr+Af///BEk+e0L/vjQ++APEwP7BwAH7u7tAgUHDQMFBwkjLQUTAv394wnyIhIO+PIJ/PL8/P39BAYEAhYNBx34DNXeAAD48hUJ/PYAAQQFBgcADg4MBREUC+kB+ff6/QAA9gT7ExP58v8BDAcLBwkBBwoQE/v2IQ38/v8AAP/14ez4BQ33+QcECPr68QkD/f/u+gjs9v4AAAAA7+/xAwj9CBEUAvwE+gH95ev4+AXe9/YAAAAAAPLg4PUaLRcaICgjExEFHRRDSSkX+vP3AAAAAAAADhkYCQkYKjE6NC0ZEiYMCAAHCAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//nv7u30/gACDxQEAwEAAAAAAAAAAAAAAAH/7vj56vDeARIFAyszCeL0DQQAAAAAAAAA+goI4uz48wATA/QLIBIOFw/eBwr2EAQAAAAAAPv9GPkQGxwwE/sE9fL6BhcS8P3x3eoK/wAAAP7e5QX8KRoS+/b76fAG9ez5ARMcGfvb+AgCAAACCQ8Z9Ab6AO/u5+gADg4K/AQJFAvwwM7pAAADCB4i+OL76er47/HtAwoF/vzyChXr1Kyv5//q/ggLGA3/A/Lu9u/s8P8B/AT//xUT+9m9pez/+PzxARAB//j98/D58v79CQH9BwoZFf/ZwKDyAAAB+/X+CwMA+QL/C/4M//sJ+v8CCggI9Niu5QAAAxT1Aw4X9wUQHRgOA/0IBwr5BxIB8/fa4uwAAAES+QATDg8aGhgiGgDoChcB//8LDQz15vMBAgABIf0BHhkXExAfKxLg2vwOAwP9/QMXBN31Fw8ACQwLGh4fDREhKRXrze78AAL58/7rCv/dvPYAAATe/xEkIxcKBgXnydcPAAH+4vL55/fxv7rx/gAA8QUgECkT8fHKv8D1EwkCBO/5/+7Yv6zW9/EA/ukCGgIK/d7d3NXwCgoIEQb69P7syM6t7ffx/vjm0O7wCOzs2+Hc/wsSFBIPCPXv5dHb2/b8AAD799fm2f/d3dvo6/sMCxMZKBIG7tzM3A0D/QAAAPnw2OTi2uLf+Av/BAYgJykaCgUA4NjwBP8AAADo//wD6t3j+AIE9PwRGhceJB8bEQb8CgDc4wAA6g8WEAPm/P/+//QABQr4BxoWFBYD/gT79fwAAP0NIhf3+foMB/zu7u8B7/IEBAgJAfrwAAAAAAD/+f321db2//gF+/L48PP4ABMOB/gPAvsAAAAA/+ze9NjE5u/i7vLtBAsGAf8C8P/j8wYCAAAAAADu5v3s6Bn73drxBQAV//wDAfYJJBIHAAAAAAAAAPL/FgkXDwD3GDkgBQ8cEB8DJiQEAAAAAAAAAAAAAAAAAAAAAAEBAAAAAAAAAgYGAgAAAAAAAAAAAAAAAAABERYOBgAA/vPyBwUGBgUAAAAAAAAAAAAAAf//AhYTCwoECAL27vYGCQkHAAAAAAAAAfzz9/oP1K2u6gIM/+z+CQLxAQwTEQIGAwAAAAP9/g0YI//oDAAJ9QUMAfD28/jo2PH6EQcAAAD+7/4YCAbp4f4GDQQN/fHm1ebb2tHX2g4B/gADCQASJgv/7OH6D/7y8fDw6Ofq6+Dp9+j7EQIAAwstJiIAA/r1AgYECPcD/gT9/vf6BfTm7yIKAPsQOCsO9gMREQD9BQMAAgcACQkPCvnz7fIfBgABFjMU7PgJERQOCfzz+fT7Aw0GHg8KAA4TAvsAAQkhFvH6FQ0G/Pj6+vft/wEGESUWBwQKAfwBAAD6GCIQCxcE9+/r8u76//0KGRQVEAL92d8iBgACBwY1LB7+6+b0/eb2DAQBFAcXEg8HCuzk8AQAAwDjEgcMAe/x+AQAFBsXCBARFQkMDgD4IPX+AAQT7Nrp8PP9+AgYHSgsEgoC+fsHCAjy8wz+/gAGMvPU5e/l9ggLGCk1JA8PAPj7CxcC7N8EBwAAAyD66AoF7OL3+horGhIHEf0B9vsB8ensBer2AAEO+vgOAOvc6fHrAg4OAAXz8QACBebS1An9AAACCfcEB/fy5ODY5ekABP/69vIB/RDq2bnuAAUABBYGAAL18ejq59/j+wX56foFBwD958rJAwkEAAMX+wYEA/sHA/70BPsKCQD2/PwD/du1xvEIBAD6C/0hGwUFBwIFDPv3BP/77/H7BwbjttMQAQMA+PX4ICMkFxARFwMBCgMM/ez4+Qf65+rtDgIBAP4BAxcVEQIKBP/+AgIDBO3r5/UFCQANAPP+AQAADx03B/cD//4B/PsRBejY1+r7FRYRF/n59wAAAAYcIBsECBUTCgQKHgbq4usSDgYMFhb8+voAAAAAEx8rIQD7BA0LAAYI9hApKSMRAwTp7wAAAAAAAAACAf4HBfXb2NjX+Pj3+g4LEQD/AwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECAgEAAAAAAAAAAAAAAAAA/AMWHPj5+gQGCAUFCAkCAAAAAAAAAAAA/wAA+fDe+wMFGQr/8wEDCBIA/QIBAAAAAAAbMA/67NTCwtj0EhcLBQMODAUMGQL7EgQAAAAAFRgXAN/a29vq8gAK6/H58wwIDRQTIjIHAQAABTUiJg3Quefs8xkgFPj1+/r0//IC5gATEgAAAAcNDAjrwK7h9AMjHBoUAgD++vj89vPtDBAEAP795Af27sKy6wwbJhgC9f3y/wD+Dfbw+A4LDw4H/vgR4vHNueIPGRsZBfD09wL3CAz2BBkJ/fkEAP0TIO3j6c3g/QcTEfrv8AEIAgMP7vMTEQPgAP/+Dx8L49zq6/T/DxIF9vbvAgAGEvj6CPz85wEU3/8a/eLh2e70BQYN//T7BAn3AQUC+v3pA/IBD+ohKfLU5tzy6wMZIwMH+gYJAP0GAwoU9vzsAQDwE/zi6d3x8wYALSAI//8LD/n8BxAbKxYeBwL92ODg5fns7vECAAwH+fwDDAcDA/kGDhca7PsB+sbc4QAC9Pf+EgQM8/r97AX/Cg0DAA8CDM7zAP3fA/0EBRUPAQ8HCAUJ/vYIExYSAw4V7ezY9AD4ExkJAxAUDQoF9QID9PkDCxYYCQkL79LD5AL84hIH+f0MCQv6+vkJ7Pj0Bv0GCQcA+OLk0wEBAOMg/xD4+RcXCw0SB/j27wX+BwoC+O7W5vEKAgD7JRUK+QYEDRIGDPzv9/P8BgsDCvjp09TxCAEABRodCP3/CwoUEAn8Ae8DBP/0/Prl6d7d5yYUAAQBLhbwAAcQCwwaAgb59+/k1Ozn5Qb43usDAgAA+xw8Bvz4AhEPBwP3A/Pt09zx4uDt+NH4AP8AAP8I//b89vcOCv0GDQH9+eXo9+rj9u/oAQT/AAAAFAAI8unnEg39/uH46dC84g4FBhMG/wICAAAAAAIJEw8VDRgQ4dO42fQL4vb99/P0AAAAAAAAAAAA8+zy9gMFDfwEAAQUGQf+AP38/QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+/r+AAAAAAAAAAAAAAAAAQUMDw0GAP/++/z8/fv5/QAAAAAAAAAAAAD+89jhAQ4RFRMHAfnl5fD+/fsAAAAAAAAADw0G5+sK/+vL19TX6fru5tr08/Lx9/8AAAAA/xgP8wD4/fLr6OTc8AT27Ozp9Obl6+j8AAAAAPr69frzBxMI/Pvs5fMAB/f2+wDj1/X/JCMGAAEA9ezr7wYG/vnv8vj48/7t7uPg2NfsEBk2DwAA//rp4uUPAf4DCBEPAgH+9Pno4+Da8fD6MwQI/gL77O38Ev8BExIMDgcTCxQKBwL96+z0/CICAv8Q9e/h8gL9ChgPCxUTDCEfEgoK+/cBAhQC+QD/DPvk3OL5/v8B+ggaGggKBhYVEf75AQIc8/MAAwr/89zi+/zl5+0HCg4F+vwWAwH5/vjlER39AAIME/7p5Pny6+/s/wsI8/f+DQwICgD23PLT+gAADxb7//j37vfuBPQRB/D7DA8H/AAE8urw4/IAACEZChAHCwH67/YA9vX+ARQHCfsIAQQiAv71AP4qBwMSDQ8QCgf++Pfy+QD/AA4CBggSFhL79gAAGfPvEwYRBAf6+ADw9fL79AP/DQgFCA/56vsABQvk8woRFxAB+/sFDgAB7uP+Dgj7BRAUGxQCARkE8/v7FwkD/P8AHQz+9ejvBBDy9+8ADRge/wIoCOvf/w4G+gABDg8OAfn38wkI+fjr8AkcEQAGIgrvz+0C9QkOAfn57/j2+gcID/Tn6wUWJRsCAxMF8d7a3/H5+/bt5e7t/AkZD/va2u/yGBUZDQAAAOjf6fDy9AUB9vgG+/8DDwjyzcPT4g0H/AEAAADh6Ofz7vcHFQz+/vYRGxH43Lq52gAKBv//AAAA7/Hm4A8VDw0JEgTz+QP09e3MxuD4/wAA/wAAAOba3e0JDhIQGhspDfLx5PQC89Ti+/8AAAAAAADx1t3tCxgVJxsDDQb8/hUREAz4+//+/wAAAAAAAAACBAIA9efvAgMGGRQEAP7///8AAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP718urp+/n9/P0FBgL+/gAAAAAAAAAAAAAA/wD+9/j66//uDxoeJzIfEPr/AQAAAAAAAAQFAwMNCf/37AkKBwYXEQ0O/unqAAEYBgAAAAAE+f708Ore697sAxYJCAkTIBwJ+w0MEgYAAAAACN3b6/YGA+7v5Pv5Ag36/gQUCPIE7P4B/gAABAHg6uf+CgXv9vH7/Pv6DAQKGhkaF/4IBwIAAQMC8vz2AvwE9AsABP36+w0CDhD9FRgC7/4DEwnmAg0T+wsFAvoE+/IHBwX9+wkBARsUCf4JAQUB1+oYFA4N/evz/PUMDwoA8/Hr7/MADBMHCgAAAO3wDxIM+Prk9P75DBQUCOzk2NvZ6eMM5vkAAADaEQkcCuXx8f8JCh4cE/X389vT5unK6cj6AAAA8Qb9CP3q9wQKEwYFEQ8BAwD17+7x3cq88QAAAPbzAQ4M+QUcCv30/gkL/RgOHhD/8NnX1Nr6AAII/u0PFgX8CP3w8AAJ+QIJFy0gEvnt+PHl9wAGGfz2FBP0Agn69Of39/bzDBQjEBoNCAn+4fgABB8KCA/57/f5Au3s6eXr9wMDFA8XHBMW5t4AAAb0FxIB+/n48wb15ufh7vf+AgUCGBEMA9nhBAAb7iMdEwX+Av0H+QP9Bw0FEgkE+gsDAvH24/sBI/AqHBgOBhQLB/sMHxUTFxD/9/wA9eXqCPb9Ahr4ERYSBwkQExIHGBwTDAkN/v/4++3V5xIOAAEA+AMKAgUAAgD6/AwCGBEF/hT/Af7p0usMFBIA9e33+/kCB/r98ggABQUB9v4H+vr58fkGCfgBAP777uzo+ebh9/f9Bfz44Mzd6/Hy5e0EABUCAAAAAAT49Q0M+AUD7Ovu282+w+L0DAUAECIpAgAAAAD+AP0EAO8JD/Lm28zr18DCzdfi5vwGBwEAAAAA/fnz7Ov2CxwY2LjSAgPh19v09/b/AAAAAAAAAAAAAAAA//749vwBAP78/f//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQH28v4MC/r+AAAAAAAAAAAAAAAAAAD++wAHBAIUDQAcHRcaGfnn3esFBgEAAAAAAADm2fn7+fD66/r+CwsQGwru5tnsMjED7PoAAAAA5gEO8PcF/Off/hUYCQT/DBclLDAq/eTwAAAAAMwGBO32ERAGCQ4MFfz08AIhGioZJhYM7wAABP/6BQ/w8u7u/vnu8vb3BPv+BAr++xEqIfkAAAT38uz+DRP6BgsG9vb/DwkADwb389bxNTofCAMH99nYCx8bBBEMBQX5BRoQBQgNBvru3xQ3Fv8BAu7k8O8CCwsJCPL4/hUiC/j8/QoMD/sXIQX+AAD2+vfs5QAQGgD98eL0+v/2+QYDBRUVNyL6AAABHwLh7vv9HiEP9NXF3Pv6AAsO/wPuAUs69gAAAxUN9fn3BSMh/NGyxvICBf0QAgQF5wFCMuL9AAYgAf0HCAMSDuqjr+UMB+z8Agn59/cVLBjZ+gAKJAQDMygKAvvdtsX3GAH6/AUBB/8QHDMc5/0ABxsGDR8hEBIJz7fZ/QkQCPv67wMHFBYkCf4AAAIVAQgeFhcB8r+32vMNC/348/sAGBoWCuwRAAAB898LIwgF8OnIxc/i7vDo6+X0/w0MBQ3fBAAAAN3XDRn/+/rp4N/Y4/b07AQE+QgGAv8T6f4AAAHc1x8IDgsPAOzo+vsIBvcMEBIADP70HwUDAAAB8PAcBw4QDg4IBQQBCRr/FgkK9fXm1+n37gAA/wMWLRwYFB4VFSAaDxIeCwsHB+354s/cAP4AAP/3BSMxJSIjGCAfBRAAFwwB/fP3DAbnzfcAAAAA+fcVFvXx7AL/49/u6wX97PjzAyAN4cHvAAAAABYrQzIG8uTk5+Td6w//7AMUGhcTDwvj9wAAAAALLjMmDQcQ8Pj+AhIMBwIcOC8pIhIfCv8AAAAAAAUYIhsIC/0QGiMzJQsIIyQiEBIkGAEAAAAAAAAAAAcK//X5HikoMhr+DiQUCP8aDvoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+8e/+AAAAAAAAAAAAAAAAAAEECfz7/AD/DRH2+fHn9QAAAAAAAAAA/wAA//758wDd1/MPFvbfz+bz8vT9/wAAAAAA59b1BQ/e1PAb+8LIucC6x9Xn9wPo3u8AAAAAAOj6+/v+1uAYHue9uNb1/QMS9gEG+uL5DAAAAPrW5Nr19uHvAOLGyOjz9vn8BwUS/gfwBfj5AAD/9eTg9f7j7OLk9vgA/g0BAwALCu/m29r6AwAEDh0A7PEE9/IAARgQBAUPAwsTDAcA9+bL9wny+yo8Aubg7AL6BwcIBgT9CAAKFRMEAfXo1vcD+wEgPg/n1OP9CxsREffn5vsIChUQCA0G+AUREgABCkER3+P9DhMICPzb2vUNEw0SChAQB/T0Bwz/7/0dG/gGDgYCAvrd0936DhsVFhUG+ufxBvYA//Pt8RkPFhn6/O/y6eH7CxIbERf+8+fo+SIDAf8A8wUgERAMCvgH+erx/RERIBkM/efm2uUI/f3+AgwiCwENFRMPDfn7BAsRICMZ/vXy8eTj/REB/wc8KP/x+QoPBgQBCBsdFB4fCPrs4ffj0fUhAAAEJgMEEBQbAgcEERsUFRMICPHx6+nT6vL/FAIAAw3y/hEJFQP09Pv5Bv0I8/Dn8Ojy2/Tj/f3+AAwHEvr/+//z8d/07PX39fXs+O76Avfqytn1/QAPCw35+/z6CeLq8vX8AgUKBv0C9wXq6dLV5vwACQ8BDgH88P7j7vMAAgcJCQoH+u3y9efk0+n9AAEU5w4H+/rv7wEL+v0GDxL68ejp9f76GgPb6gABE94DGxMFCf0IAvv1AwX86uvv+hEODRwNDf4AAAv19hcTIQ8CBAgE+fz3+vbs/BAQ//UDEg4BAAD/HjwrLSUfFhMD7foGBAEAEAgLGBH55/MAAQAA/x86OwoaLxUGBgQLC/gMFBX68AAB/+v0/wAAAAAPMjkj+goIBAry+wD7BxIF5PkLFQj9/wAAAAAAAAIA/AkSC+7eyrXl7OfxIRUKAgICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICAQAAAAAAAAAAAAAAAAAACh0fEA4LEQsHBQQFBwIAAAAAAAAAAAAAAAIABwUH9/ogLRwKDxYTGhYUCwQAAAAA/wgNCxASCQHe6+nwFBcQFQ8iICgkJQsC/wAAAPsAC/zv8v3/3+j48PIHBRAPFRYCDgMeJAQHAAD7CQT/AvQIAuDm9/4C/+/6BQUF/wvuLCMZDwAAAAX49/XxCAH49PUADQsI/QwBCg8R7RgzLAwA//f08wUICAfj6vD+9wgJCgYB7wYT/foYNf0JAgH76vcC/QsA9fICBgP0+v746fQA/QEAECTnAgEB/vvz/wAH+ur79Ab8B/73+u768PTc6f38/gMAAA329fgF/v7p5vkEDxIMA/Dq8+vz49b89+v/AAIE9/f0AgXt6uoLDxQGBv32+/fx6u7tDwvWAAAB9BMT7xT/+d/wCQoA/vf7CgT99vn2+fwbCgkA//cWCPIT/O/w/AoD9vf8ABAJ5+v08/4D8wcDAP78AAb/BQDyAgcNAQPuABYhF/DvBBkK9Q0OAgD/BfsHChYDBgcRFArw7ggaMxsD+QsJ+CIICAQA/vMcEg0YDAr/BxELAw8kLzQbBAf87u4YFRcJAPwWHwoAFQgLBBMO+wMdMS0ZEgsNBfn3BQL/AADxDBAEAQEDDQcCBfgBCRkNAgP97vzv8A4B+/0A6wsMCQjx/vn/9+oCBAcP+/b75ef58e0L+fr8APEI9A4I/Pb09v7o7/P88/Hw/ezf6+jh+Ab6/AD9EPwMCAUC+vb57fT8+fb7+fj99+nx5AscEf8A/wL06vEB/AL8Au716vvtBPft+AT7+PMIGAwAAAD7CPT8CQD38AP85vUA/fkBAQkYDATl6fH7AQAA//0C7P335/EHAO/7AAL/IxgSICUR19Tp/AEAAAD/9+Li++3vARECDQDvDhjy9R00IQjx9f4AAAAAAQEEGiccE0NILi8iHCIEAwUdHAf3+wAAAAAAAAAAAgQC/gUlJAUJGBEI/vj+BQIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACDAcHExUMDQ0OB/4AAAAAAAAAAAAAAAABBwQDCxcVCCAA9/vw/AXp7gEBAQAAAAAAAAAFExII+QwREBARFP75AgUQ6ePYz+D+DQQAAAACCQf/CxcVEwMZDxoF/P4M+Ozu7eXd2/MRAAAA/yAL8f8A/wgSIhQQEf7y+QH8AxIN6uP1DwAAAPwVDgoJBQAYKisjFRoJAgIMAgQVDejN4P7/AAD9GAwNFQ0OGh4ZJSgcEwgMEAX+/gXosMH7AAIA7vj7+AEHCQL0CAcJFAkPEBP/+u/4AdOy8wAA/unb5e3x/fbx4d/m8gIDCwQCCPnu/wTcx+QBAP70/eHi7PHw3NjX0dri6/4FBRcX9/z64tf1AAAFAgvz3+jp6Onp1NDn4OHy/wYZEfb7/QEL9f4AAQkF59Ps/Qn1//Lt+/Hu5AL+CxYFBuHw6/X7APwWDdrwDBX/DBQRDRML9PX/+fsUFvnX5+cE/wD+Fx79ARMKBQMOBAUEBwfy9fL8CBb18PrZ7wAAAQMQ+xIXBPQLCPvu/AkCAfr37hEV7Ob8CBwSAAL+DPP9C/7x+ffz/QkVDQPy+PQCEggA7g8ZGwAB+wP++QD1Af36A/sBBQcKAvHx+wr/9/ccJwkBB+/2Bvb46OsAAfwD/gUEBf/88uzz+vbsIycBAATz7vX+/fvvBwX9BvwF+Qv98eTr9wAJ4wMC/wAC+vsAFBEL/A8NDvsLCwP7+/H9BQ8HAPsO+/0AAgYCCw0XDvsZHxMHCQn8CwcEGRUQ8wIRKxYBAAAMBAoUGBYEEAcFEQkGABQKDxUgCwkBBx4HAQAAA+/pAxYTCwYN/vMB/wUHBOn/ExoVERMP/gAAAAPn6e75/wsSAvj1+f3+BRwSAA4ZCfjtBwIAAAAA09fZ9RYUEfvm6Pb7ChYO/goJEBsSBQIBAAAAAOHL1twFKyAqGAYmGiUi+e0I/RQoFgEAAAAAAAAAAAED/wMPHQ0XKyQ+Sxn9+fkBAf4AAAAAAAAAAAAAAAAAAAAA/vwAAAAAAAD+7ev9AAAAAAAAAAAAAAAABw8UD/4IEgwA+ffp9ujp8QAAAAAAAAAAAgD+9wAaHh8mEwf/Bg0E6fLt2uP8/wAAAAADHisTCAIPIRkaHPkCBwEZHAwHANPS2+/6AgAADR8NCx8PCgPk6vb45/H8/gbo5Pf47efn8/wAAAs59wEE//rwBg0MBwL3+wUK9/77++/fA/7wAAABHuz8+gX6/wgQEBcM9Pn7Cvv2Awzy0+oH+wABAy0PAf4KB/cDFSEtJA39BPb8+f4D/9vi/v4A/+sQHwXxBAL+DxUZGiUiCAX7EQH5Awb02//6AADr5vf94+vy9voBA/oJCAMBCQEHCQ8A8tX09wAA48/U2sfBzdjV1d7Y1/b7AfwCBf0HCf/y4v8CF+XSu6airLeyxL7Oye71APP9ABD4Cfzi99X8AhDf0NKuub2xwNvl+PX6+f/1+QYQAvXm6QgC6QD92tXl6O/x9PEFFx0XAPX98PUFCwH1+Pb4CvcAAN75CB0pGyQvJiMmFwb/9gT4Aw0J+wX96hMIAAPiDCg6ODcmLBwNDwMLDvoB/vvx9PP3EfUNGAAD6gkkOSkpIxsOBgINCQQH+AT58vb17Q//HSYA+/EXDRMUFAr7/v34DQj+/Pr9+vD49/IJGiMUAPHqF/kH+wDyA/kI+wUK/vf8BA4L+A4ICB0lBQDy6f/s/O3x/Pz0A/YBB/gC+P0B+P8NEv4eJAL+BRTo8QT++wACAPz3/Pn0BgMBAfsBAg4LJwL8/wgk+fwACP/+/wUEAAXw+wn8/AgOAfsGKS8HAAACEQ3wBgYABQMDDQL0AxUM/u7+BPcHDxkK8wEAAAMQ9gEIFwQL+gT7+P8R+/gBARMIFSIhCgABAAAGKAX9BPf6Avf07e4B+QMVAQICEQoXKScSAQAAAiH05PsWJQsA6QXzAfjq1Mjd/d/rDhUmCAAAAADz8uTbDxcQMRTo4gHqtbPC3vX5+v0BAAAAAAAAAADh3N/f4Pr9BR8T/PD0/vXuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAECAQECAQAAAAAAAAAAAAAAAAAAAP/y9O7N2eToFhr88/T6/wAAAAAA/wAAAAAA+trWxcvxBgwB8drHvsnyDQsdBgAAAP3+//38+uvfysXh9fv19gL/8PXy6fH3Dwj9AAABAf7o8evh3+D0+vT66/YJEggL9QPy6vfu9QAABAD27enl4uTa6PD1+Q0UCAYMCAcSDgMM8fUA/wEIAP/05t/m5vABAvgUDBoNCgr99gkJEw7/AAIBFAL9APDy+QMQFAsBBA0LFQ38AAH29TUN+QAAAAP28/z5/A4KDA8K/e35CAMB+//55vMg7OQAAP707P717P8XDhEUAvPk6PX49uv+9AH/GO/vAAAB5unr9Pb6/Q0FDP/t6unz+PTx7PULASIK8AAAD+3+CAfy7vQDEw8cDPv2/AQQ+vYCBP4WBPcAAgT+Egn87u7u/QMQJAL99ggCBP8BFwr5BfsAAQH7BgcLCPrz9PP7FiUB/v4AA/gACgoAA/TtAAD+COwJGBv+6ObtARYKAQb6Bfvz8vz5FQfj3gAA/vr5GxgWAeLt9wQBCv8RBgr38QcA+BP89egAAP/hCigcD/Pw6err9fj5BxMT/PsE5+PvAe31AAEB1BAlJxIH9P3x5NXn7wgRAQYGCeDvAwgK+wAAANsELQ/6+AAC/uXi5/gMBgYGFQ7i8PQG/f0AAP/f7RQJBvwA/gHs8/8GDgYGAP/89PEHCAD9AAD/5eQEGgwPCvb19PULDBDy6vno7wALFP/3/wAAAPr9ExYQGBYF/gMNDQ/z29/h3u4SFx0O/v7/AAABIiQP+gkUFQkUFw3939rP0+Lu9Ps0GQIA/gAAAQsbCf33AAkdCBMJ8vzj7/sB69b1JxMJBf8AAAAN+gPz3+Lw/A4C9AQbDxcyOSUVGBYJBgQAAAAAFCIbFQXv/wkNFxMfHB4RGhUXEQoEAAAAAAAAAAAB+O//9Pnp5/LxGBIK/PDz/wMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAABBwX79f0AAAMDAv////7/AAAAAAAAAAAAAP8LFiohFhr7/PYBBgP4AP///wAAAAAAAAAECgwMGywnI/3v6evU4PHU0t/6AAAAAAAAAAAADCELECUuMSAG/vrm18y0safB3vz2CQgAAAAA/R9PJBAkHyUMEQHx5NvYzN7c0MXl8wgUAAAAAPYYIxIMERoMBQIAAAseDwUE9Oni7Onj4wwBAAL2CAsEDPD0/gEEGy4aJhgGBOra8Prc5dwg+f79A/MD+gD58wUDCSElFRcTA//s6PTp0drgIAUA/f/7+ff38f4LBQQMCAgI/RUT/PPy9+7tGQkNAP77AQjtCPn9Bfrr4+Lt9g8bHRUMAf7z+Af+DwD99QcG+vLx+QP05t/m3fYFGyMbHQz37u0W5wYA/vjy5tj49uns9+rZ6fX9DBUZDhQG9NT6C/wC/wD48Mjc+fv15f/49wIDCQcCCAPxA9+55PrxAf7++fTk3gsE9/QFCwcHAv//BgIM6wHb1/0V/gP//Ar38fUeDgb3/vv/8fn9//QC/QgM5fL/Ae8DAP8o7vQOIw0K+gP49+3vAOsABgEHA/73+vL0AAAFFOn6HxT8AwH9+gLv+wfx/gMAA/v98fgRDQEEEhD+BxAC6wUNChMFBvwE+AMEAwkP9/z2GiMGARUAAh8X9fAHBgoPCf4ECwn1+P//+/79/QsHAwEL5+IkEu78CgsRDPv8Cvn/8+7zBv75CvQNBv4BBPLcHhQA+QgGAwADCwj2/vnu8f368vv/Ifv+AAAH7QQL9fLl9vvw/wP37gYLAAsPEP8MBxILAQAABe7nBALn5+vy9vUC/u4ADA78Bw0jJx0C+wAAAAHp5ene7u339wUA//0FEhYM/+4JHAkF9PsAAAAA4tLV4e8B9wsOAfnp9Q8Q7/T+8u8A9QH/AAAAAPDg3e7t/PwPAOT++Oz9EgocHRgJ+wgNAAAAAAAAAAICAQD+/QUQFRbu4fEgJAkTCAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+7+39AAAAAAAAAAAAAAAAAAD+Avj/+AEA9e3k7+Xi8wEAAAAAAAAAAAD//xIL7QgZ9eXV4vIQ+AL14+j5/gAAAAAAAAAODQ4I+PUJHBgRBfH1+wAB8e8SEhwJAQAAAP///wUfFg328RUrCfHn2vYGGQrY8PkJDPQAAPcPDwX4AOvt7vLqA/4B//7yDAYG9fMXLRXvAAD5IPDi2ezs9uzs8ur/DQ4LBxARDxkgERce7wAAARHXz+b0+/Hx7uv0+gLy8AUJEQ8PDwwPN/EA/w4H4voAEQwMCg0KEQgN8fbz+gEDDQb7C1IQAP4UIRMbJiMgIiEvJCMP+vfz8vQD8/cXHQxBNgD+BzsZMT00KCA3NRYN8uvt9gUBCvT/CRUCLy0AAAw4KygyNBcVCBH64/T1BQoAAQsG8/P68wEdAAEGEw77BhD66NrO3tjtAAcO/PwICQLh7vYhGgAFGQfd0c3fyL660eD8/PoC/vn19wsO9tfiJhAADBv71rC3pKTE0vILFwPw+ffu8/gVDAX6/UIVAAkQ6tCrtLTT+woSJCsB/AP//wgJExsbCu/9GwADJ/PZx+b4AhghJBYN/AEIDAcSDwIEC/nU+R0AAjYKBQsSGSQiHBcAAfD4EAgEAffo7f3u8gIGAP00IRIUExQjGAf09/r+8PsECPjz5/Xy6vUSAP/7EQwIFAoPGv/8++4B+//w+PoC+fHv/vYC+//9/hsOAwwQEhj+CwkDDRAE9/T3+vv8+gcE6uT//wIhFA/wEw3//AwGAAYTCAD2/wX6BgAM9g4TAAABGwL8+gIF6O/5AAUE/f78AgwAAxUICvkMCAEAAAbU8/URDQAA/vr3AAQVEQ0SEg0eEgny9wcAAAAA3OXx++vt8QT/CfzyDAUHCRcVGxUbDwMJAAAAAObi+Pn46e758wf18QwQ/vwW/gL6CuzoAwAAAADo3trZ6eDlDAH/9t36AeryCQwH/hHs4f0AAAAAAAH4+PDu4g0uKiMIFjoyHhHh6+zxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADCw8QFRkQCAMA//8CAwAAAAAAAAAAAAAH//7t/+nq9QouAOju9fsYEAkHBwIAAAAAAPnn39nb7fHz7tgAKCQJCBISCyAwIA3o9AAAAAH9+voRDBQL+gD1DBASFCUjHBUaHxT/+/wEAAAEBQ4YJBIU+vLtBAYRFBoVICkYDxYWEPcEBgAAAf8EFA7u5+j2/QT6AP8LDw8LGxMGCf/79PkAAP8F+hgU6ebxAwX2/AL7/wEB+Q8MCRYnLvz/AAAbLBseBPPs5u/2BPv9BQcE/PwGDe0GKUX7/AAALkAsHAf78vAEAO0E7vj9/g4dHRr0+RhJAgIAACI+MyQcBgEK/f318/To8/gFGB8ZAOz5HQADAAHrEhAqHgIEAAj/8Ojl6trY+BUkGxP9+gsA/QAC6QYZIA8FBP8D+ff+AuDEweICGR0GBP0C7PoAAu4THw8PFxIEAu31AgX0xbja/RsmDPP8Cer/AAHpAxQcDCEcD/nq8QEB8MGz2QkZIQr/DgHpAAABFgrnFQkYFwD57wIAA+PL0vQXIxn58fn86f8A/gry4P3+Dw0C9Pb+DPTb3e0LJiEDC/Xv+Oz7AP8k9u0IAxMaC//78wjz7v8LIiMNAAnf+ff7AAAAIwYLBwkeHQn69/3t9AcOFhodAgsH1vEBFwABCykFCwYPERsQ/vHo6/H7CBgOCgsE99z2FhYAAxoxGg4MBAoEERAC8fr3+xEK8wT5BQ0AABwfAAITHT0TCPP/EPQIARMLFxED/e7w9gMZFv0QAgAABwssDA/x8QAC/wQXHBsOEPDd+wb/IwsEA/4AAAEJHPHs9uX+++wLGiAfEQb09hAC8ePtA/n+AAAAAg0V/PP+HiYbExscAhYE7dv++t7H3ef5AAAAAAEBDPza1OMEAfHT4+3r4cXIART47ev6/wAAAAAAAP8GBP34/N/L4Obm3unIv/QmJg8JAwAAAAAAAAAAAgIJFBv42P3x2+L56t3rBP/+AgAAAAAAAAAAAAAAAAAAAAD//gAAAAAAAP7z8f4AAAAAAAAAAAAAAAABBQ0PCgUB//7//vT18vH3AAAAAAAAAAABBv328Pb/BAUKEg8E3MTW0t/o7gAAAAAAAAArQgfX0gEF9Of16enn8foXHBn14/IGKyADAAAAKhL96ens9f8EAdrW7Pbv/Qr/+wXxHCAX/gAAACL/++fsC/Lu7/T0BPr85er69fgPABAVDf8AAAQE+vLz8f7s+vD58vn8DgP56v718gMLIwoLAAEKAuPa+QT+9vIAAggPGBgQ/fQK//AMAA/yCAACD/LsBiII7PwJBQQGGBsQCvPh7AH2Avvn2QEAAQgBCiAR+vj+BQIDBwoH+fj82/D7/Pvj5PAMAAAN7gwLCPz6CPgB8PsIEPb7BPEKHxAG8OjqDAABH/IDBBgLBf769fD3CgkBAvn6BB4aCfnx4gUAAf4KIwwVDwr6+PHo/QwS/fkE+gAPDADf+/wDAAH/CCURCwQF9Pj59AQW/wEG+vL+AgL88v76+QABAgQfExEAAQkB//oBAvzw7/sEBwQBGir5+vwAAfj0IR0MGhgVDhEH9uTk7PgABRUSBQggCPX7AAD39RUDBBwpKyMiEfXn7Pz8Dg4aCAEEDwPs+AABGvEJBhQkKykcIRcLAAEGAQgDG/8FB//52fkBAyTq/wMPGRQSBQf6+gcIAff4/wEDBe7Z7NMCAhAl2P8LBvXy29zO3/EC+fj18f4A9vPt3PjZAgYYD+wMHRcA3dbJyNwLCwLw8O74AfUI7wET9f8CEAL5KjIL9d3e0tz3DRcA/Pf8+QH6+uwNA/P+AAD9Hw4K89HZ2vb5EAwXEAr/9O/49PfzFBIJ/gAAAB4HB+vL2fQBDwsIBgIJAwP9A/wBAigeAwAAAAAVBu7dwtwKDBEHEgoXCiABAQwKFBMgAfoAAAAA/dzCytcFJRMWERgTAgwMAQsUEwwDC/v8AAAAAP/u2NzrBA8CBxQbGiYUDhQ7Rj8mBAL9AAAAAAAAAAIDAf8EJioUHR/57PwODAgOCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgMBAAAAAAAAAAAAAAAAAQDu4fEBAvUCCAYDAgEBAgAAAAAAAAAAAQMJHSsaCvwXAQLxBgvv6f8UCQUBAAAAAAAA9vgQIBcC+v4ZHxft5fTh6fQHHPX0BAQAAAAA/PACExMVEggoIAjy/wAG7/f9AfTa3wgPAAAAAPrtORsNGgkGEAD+8Pbp4ejtAvjy/QcBDwEAAPv17g8GERQRAwcFDAH1CAgF++3k7N7av/L6AAD8/uf89Q4JEfsH+P4ECfj57vT79erp1M7+7vny+xQP+O/s/fz07vcDCQYSARMOFAb38tvc/dn3/P4PG/ft7v/6+O8FBAYQDgYDEgcABAzszdfU2gD/BB0C9v8L8/38BQP8/fH9+gQIDw4K6srh4uH/7/IX/wsLCggDAPPq2s7S7fkCFRUaDPnl4eLy//EG8P4JBwMC/e7d2NjT7vn2CR0jEgv0+9wA6QD7+Pv1CQfw+P7u4fL2+BEJBgIMEAoLCO7KCP4A+fYR+/8G8O39+vYDEyAmGQsJ/wYA7fzo9CQCAPsMHxIPBAT6+P8GEBkgKxf99vz1Af/8+Pn6AAD/5QkWCggHBA8REiAVGwv66/r+//ju/AHvBv4ABNoSCRcVDAH7CBoiFQr99vX+9ff+5eL3LigDABXcIQ78AAcA/AcTHggIAf78/fUFCPri9UQh/QAT7Q4E+PwF/AH9Ewr7/PoE/AAG/Qfv9OYiF/0ACQPn/u/y/gkCC/Xu+PgFBQcEAwr++ff3KwkAAAIN3fDu9PkK/vbm5gADDf4PBgMDAAkHESHd7gAAB83c9uvw+ebo6/P/BQn68/7++REfLSwD8v8AAAL11dzw8e/k3/T3Dgnm8Oz3+O79HRYA6vUAAAAA+Qrt7fH88gf6BwoE/gMS///5/AD/5fX9AAAAAfT4DfPt8vb56vr8+f0AAREpFubj6uzyAAAAAAD+BhMI6wv128DV5u7N6+rv/uzo8f8AAAAAAAAAAAgI/wYfGfTs4OMFCwP4/vv//gYEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBQEDA//3/wAAAAAAAAAAAAAAAAAAAAEKBf36/PTyDPnrwbW95/z//v//AAAAAAAAAAAAICER/fwOEw8RG/nw3M+6uLflEBoKAgAAAAD/DBYAAfsF/BYZISMG+f356vEA/+zu+gcAAAD8/gsC9gj7BBQiFw0SBv4LHBEM/Anz6wUNAAAA+/f78dzh6v0dKRsTHCUfMCYXFwr87ev0EgEAAQLs8PPp8PsDEA8DCR0lIiMaEAj+8vbW4yMBAAD79gAE8/kKDQP59PoE+wEF/wENC+3z6vMRAgADCOTwBAoJEQD48PLz+O3v+gX9B/Xa9QMcCwIAAPrh/QkPBhD78+vx6/Tq/fEDDwX86f4EERMCAAD18P31//f8C/P49/v68vkHDAoF+Pz8EBkPAwD+Ff8I+vP2+Qv7+vH5/fv1+v7zBAH37f8R/AUA+w0Z7+PrA/0IBAD4CgYCAAT49/f5/+4CAuoC//n+DO7c7Pz/9/n4Cg8HB+v18fzx+/8HA+veAAD77f343/z5+QML/wcJAQL68QX07wIIDgjd6AAAAQgTCObx8QkMCgwFCf7z+f4A//T/CQXuyOf/AAH2Hgnq3vL6CAMD/gDo9P3+Cw/7BAb58M7v/wEA7xP13+3l9AMP+OPT1e0CDhkX/gcH+PMmKwUAAfcN5Pz2//D1/eHV3OHrAgQbFRP98/YENDgFAAH5AOz4DQP17+zk4vXtAw4LBRYRA+rzCUAkAgD/8wP8+wMC+OoA/AoWFBYTBggDDv/W3QE9DgEA/gAM+woRDQUPCx4uHhkbFQYGCgXz9PQRGf8AAAAINCYfIRwlHiEjKB4QEP8R//f//w8WIhj//wAA7x08Kyc+JSUaERIP/e7n8Pz87+/9+RcZBP8AAPcVGRgZBP4KGRX++NfO2en5AAcOGPH2CAMAAAAADiEVB/gHExYO9N/U9vzQyvQOCvrv/wAAAAAAAAAAAAAEDPvEqc70BQEBAQL///8AAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAD+/gAAAAAAAAAAAAAAAAAAAgQF/fHs+f//AP///v3/AAAAAAAAAAAAAP/07OPl8f0A7fzv5PgG//b1+wAAAAAAAAAHEgj1+A389P4J7fsA9Ofn7/cA/eHuBgIAAAAADAoF8/Hx8fzy7dzo6vb5/vj3Exb09An7/gAAAgMNC/X5APsCCgT29vjy7fj5+QgQ9fsC+vIAAAXrAxAHEv8KFgkGA/Hu8Pz+AQz8Bu0OFBr6AAAB4e/t8wUA/wAG+vz9+AcFBwEJAPoHEBgsCPn9/9r07eb28Qr8BgsABhAB+wYA+fECAfkPEAT+//3g9PLl9vwNBxkcDgf+/wsI+fL/9vH3IxoUAAD+1u3o7wIFEwoZEA4E/gMBBQD//gv39i4wFAD5/M/79v0NExEMFAoG+e/7DwcLBPv+Bf0sHgoA+/TnDQcOAhEOCQsJCAED/xAUEQXzBgQJNiUEAADz7g79APkHDgcDDQQB+v4VEfwD6/kFACUU/wEA+/UQ+e/7AAELAhMA9PMFCwwEAeXl+/7/BgAAAAgED/Xn9fz2/QUG/Ojk/v4M9Pnl7fHx/wz/AAD/EAnv5/Pz+O/+BP77AAUEBfbz7u744gIF+gAAAxj86ub87PDz/P3z+AoNEwYF9fX0AvYHBf0A/gkd/vX07/8DCQ349/kFDBEIAgX5BAj/GAQBAQIMCw0H8gMHDgAI9O7w/v8GCQ3/9QX8EDMEAAIJBOcDBf4H+ff89Pnu4vIQBgsA+vsOAhgt//8BBPnmCQr8DwHzAP748/AAAv75/goOD/oXEub1AAD6AhEUChgQBwEH9ejw7uz8+Q8eHgwKGgUB/gAA/h//CSAmLRIKBffw4uXr+v0IGh0SExcPBAAAAAIbEBQhMSssGhMM9/ny6/zp9xkcKR0QAwAAAAAACTQhHC4uKgwF7QEA9QQPDRAmHxwJDAD/AAAAAAAMIB8SGRwGChgO/hQkJh8oJhEGAwD8AAAAAAAA/wABAP8BBAMG/QAIBv/3/AD8/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP4FERcTEA4NBwMBAQD/AAAAAAAAAAAAAAAABQwWE//y9/f6/+wRA+oBBwQCAQAAAAAABAHv6fYPIgr65+oH+fPxDxoHJRoRAvf+AAAA//rn5eYOGAjo4Ob+DPPqCQT/AAv++AX8/gIAAAUE4OgJ+xL95Nfl9PID+BQhDiksKw0aCv4EAAAXD+vm9+7y49jX+foBFg4VJA8YIxYABiIAAgD/GwcE7//x/9bR5QAGBxMUGQkOGCoVExIuBP70/RgUEv307erU1vYUEA8KBgb/9QQUCg9AO/L0/AEdMRb36+fY4vYBGhgZ/wDn4+b29ff1Hhvh4QACCBoi99bq6vbzAiUcCP726OTe6Pbe3O/o797/7Bj+18e+6evq8wsX+v30+u/2+/rn4Nzu6urz//IR5c3H4PXw9OkBEAcD9v0H/AID+erX/fj9/AAAA+j0+QL5EwL0DAAUB//5Af77Auv35QfgCAUA/goSCxoZDhUN+wH6GfX07vD9//bl6PMHDiUFAPsIFgIdIxAQEAcBAAf0/wXz8//25Ofq9hMVCwD82//6GR4SCQIVEgkIDQYD/PL68/kR//AkOxUA/vcBABYnGBcYExUNCgMGCvzt+gMNBQ72JiQPAvYIAv8cFhUKHRYA8fQDDfrz9PP2+gEXHioaB//oEAoTC/kJDwYM/vf3AhX8BAb++/UDKCAiIAX92gYLAPzu8wAFAQIG9vMECAUB+wL5BRYLIC7+//H7CwIA6fj/Af36+v3x6//++voIAQANDQ/l6gAA+fkK+vcDBQoF/f788+b4/gsMDBIHBQgBDP4AAP8mGvn17PQCAPn/8eX0DAT7DwoLCf/1+QUAAAAAECoL9O7w+fP46eL4APfn6uj6FjEX8vgEAAAAAAHm6v37Bgz9//AQDx4PARwaKzZHNhERBAAAAAD+5M7g3/bt4RcmAPsSJCUkG0g3MyYdGQIAAAAAAAAJBQwYAf0UHTAX8PkSGgsUDwkDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEIFxkUCwAAAAECAQICAgAAAAAAAAAAAAAAAPPV5Q4SD/IB6OTQzMsKA+/v+P0AAAAAABkdAez2Hf/o29rM0tzi49bT9AoHxOEkFgMAAAAgGe7s5/7mydv99vPx/P32+g//GPoAF/z1AAD8GCEH6dbr4NbU4eXo4vXk3urzDB4F+v/27QAABxb2+u7l6enw6+bw7fL46Nri3O0F9/foHv8AAAcF8ujv+u3+9v4OA/L0Af/6AvbzB/384ywN/v/54uwB/vkBDRUgExMMDBEEBQQNCg4GBvgcDAAC/tsFEAoODhUcLxwkJiUhHhMQCwwF+wgWEBcAARTZChAPCAohIhkZHCgcIx0SFQYEB/34ICojAP8j7RoYJQ4TDwUTEhMMDQoKAQD6AQP1APsEHAAABv4hDRkIEwb69vr9B/v8+QoNDA77+uv8Af0AAfoIFA8A+wr39PX0/v3l8P/8BwH1+PLz9/X+AAAdFAPw7fP+8PTvAAbx9vf4BQ79+/H2DPn9BAD/H/j/8+Hp8+f9+fz36fru/QoKAP7n+Qr57gsAAAvp9Pfq7evt6gID9uj2+wUJCPj78wD88PcBAAMP+eb9/fj75u7u6OvvAPsH/P4E8/j77e74/wIKGhD7CQz8+gPzAwgICwQKAv8A+AcJAAEKFAADGx8LCCUMBwsG//QBDQcIAPz9BvX7FAgRHgYABh0k8BYgCxAEBPzw/f/5Avv/CvsABR4YCzH0AAMREPIaFQwaFAkRBv/8/fv7CQ0E+AsT/QEQ/AAAAAcKCwgOGSIWCQUC9v0ADAQSCwMI//cOCQACAAABJ+oBAwUHCQL7+fn++goG/wr+8f0oJhn7AAAAAAfy+fH6Dero7P37Avf/DPX/8/EHFRwJ+wAAAAD1//fn5NfJ6/HsAgL+Efvb5fkBDQTz8f8AAAAA8eLv9xcYChcWJB4QGwcMABMdGBL+9/sAAAAAAAAJDw8GBxcqJTI8LhsIBxERAQ8MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgAAAAAAAAAAAAAAAAAA/ffz+P4DAQAA/wEAAAICAAAAAAAAAAAA+QMKJDkYD/3/DyUXFgsL8/8GAwAAAAAAAADu7gYnGgAVGjYpCxEcIAsXG/8EBSIP7/wAAAAA6v0UGh4TERsKDBkcAAcPBhUKFv0M9P0CAAAABPkI8vkQAP8UBw7+CAwHDw4JBhESFfYQHQUA/vH7AvsSGgIMCA8L/w0TAvgDBfX4/Q79CRYGAP7uBBMNCQ4QB/8C/wMH9/726+rs9QUD7wYLAf//8BoMAfr9DP4F+vwK+/QD//IH+v0CC/MKCvgA/vQD+v78CA7/9QD/9vYBA/wBBvUA/xIQBvHdAADrBfIR/Pr3+QEABfvu9PYCAfn5/wQM/vv23QAA5v7zC/T1/v76/v0E9fbv7QD9+/P2AO78DugA/wvt2QkD//f1/gkZBf3+/PzxBPgBAer68ArnAAAP4uH5CwX7BPIJGBANBgMG9gEF+P32B+YH/gAB+vPmBBQLBPj0DAcVHxkQDPr/+/Tv8OgUMAMAAuQE8vkUAP37+vgFFCMTEfb09vvnA/fzGxcCAAH8+fr8DwoG/vj5+gsPAQL5/Pz8+wgEACYlAQD/7fP+CxQFFgT3APH/+wX8AAcNAgb+CvsB7wH//OQD+g8QAQL/9Pv+Bv4HBPz9DBIOAxn+BOMD//HxJAYNDAX7BAb1/AUHDAb5BgMPBA0Z9O72BP3qDS/99P/+CAP+DQADCw4OCQQPDBYHFfD0AwL+9xMx6+YA+v3++/v+AQYIDgURGhALChTxAvX2AAAEIQnx8gX5A/P+///+BvkMEAkLBhUP8AL1/gAAARQK3+X7CwH4BQv/AwAADwgEDAoRCOvzAAAAAPMC++L+AvT88/rx+f78+/v87+4A9gDyDgMAAAD6BOzK3tv8+vPi++/4BAL1D/z49vP5APwAAAAAAAD+6d7z+erj4fHn4fEG/vnTytbcAfP0/wAAAAAAAP/+/wD33+D96/opJgjt7vr4/QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//f3/AAAAAAAAAAAAAAAAAAMLHyUOCQYRCwT+/vv4/gAAAAAAAAAAAAIDBwsg+gMJ/RwSAgHz6hIMBwYFAgAAAAD/8+v5AAME+/sFDhoSEg4J9PsP/QcMB+f2/wAA/QIdBfro3PL+DBUTHhQHFQAP/wEC/vjk+QQAAAcURBn91s7p+PP48/wNAgoeDwAMIRsI+g0QAPgBJUQQ6c7d7PTy+eH0AwoLAwQJAwj97eDvDAD8AwAg+Ozq5enj8u7k7AMaEAMCC/0F/AYAygIOCw/v+dvw9vf28uv7/gERGBsBAPny9/L3+8EABAEAFv7i+gL2///w9PwKDg4W/wP7/On29BgH9gAA+kgf/v0NCwf4CQUDAf8KDgUC/f/x4f0MAPEBDek3EPj0EAoIA/gF/uzr9/cACgUI9PgQBOH0AQkHCgIJ/AMSAQb4Cfrm3egDC/sJBAP2+ND7AgD/DQ0C/QD/CQX7+gsB3dTj+v8A/Q0P/eLK+w0AAPIY+AgACxECBgYUAuTd9Pbz/fwIDQn+CSQJAAHmHuUBDQcKDBkUG/73+gkC+Pf5AxQaFiIfCwAA/BADCgATFA8PGRYKBQMLEfL59RMXDRUlMxoA+w8Q/wz/+wUMEgUJCxQWGf349/gIGwoaCRUXAOkR/fwBAgf6CAgGBw8SFRL/9PPm/xILFhf9CwDsCQL/BgECCgIGCwcPCyEPCf8B8QENCAH7BAcB/BgY/vPvBQULGAcAAgMZChQMEAUG8/MHBPkBAAYTGvDy8A0UAAYCBQUDDAgMAQP++vIJEzEoDgAFER/+9PMBCQz7A+7e1+H+BPf+BwwRCPsVBQAAAQwYFebj5vPv8vHfzL/O1fX67/QA/+7t8wAAAAAADBH17+Lg3vDhwMjDzd/k8QIKAu7v3AQHAAAAABUP9NW0xszt89333uDo8O7k7uDqD/cCBAAAAAAVGh0gAvH65Ps5OvLvEP3z4v7p6f36/f8AAAAAAPr08/wLFPny/vz28gAI6+cA+f0BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAMGBwT86d3o8PLz9Pr7+/wAAAAAAAAAAAD++/wYMwvy4NPnBBDs1+Hh+Ovn9AwgFAEAAAD+9fMTFA7+7unj9+/u5Obt8QH37NDyIQ36AAD+/wcH7vP13d7p3ubs5ezm7/n+8v7u8g4S/QAABA0E5t716Ov3+/P99wMEEQgF9/sDDREsIv8AAAv57+Tq9esCCgcSFSMgCgkX/gD+9AIZJCX7AP/79eTzCwgDEBkVFyQMCxMEFwQMAvfvBikR/AAA++kEEgoMERYOFxIKCQYHCwMIAP/06AgW9O8AAPPjCxkVAQkKCgoB/gfs/v4TCPv3BQAOHvbxAAD8+hsZCPf79/z2Bgb8+/P7Cfrr8wkEBBAe/gD/BxEgE/X+BPbz+/sODgf5+fPl8PwO+/PzAfwA/Q0aCvTr6Qjy7vr8EQkGAP3x+fL9/wPs7wH5APwDHvLr5/j48ewC/RL/+eztBQP7/AICA/AH/QD+8+fz+vsFAfoEBvgD+Pn58A8LEAcDFObg5P8AAPbgBRED+P8IAgIA9wHz//3/CQAC8f3q4vkAAAD45/kB/wIF+Ov2Bfn2/fT5EQ8G+uns4dMAAgIB9ff49AP0BP3x/fz48/kE+wodEAH18+nPBQMBC//39ewBCgMDAe0BAQYDAf0FGhQD+uTr5QADAxL95+vv9QcFAgL48QcF+v0GCwEI9/gJ+PYAAwEI/uz1A/YO/QkF/fsABQsDFwz4Bv35EQn0BAUAAAHqBQL3CQUNAgMEFQn1AAz48PX09hIH/v8CAAAA+//22ev/+AUDCQX7/AkG/PsG6g0qEf38/wAAAP7q29Tq/+30AwMNBQYBCvz88/T3Fvn1/AAAAADy5eP4/O3+DAcRGwkLIA/sEhD3Cfr29/8AAAAA+N/h8gkbDSAoHSwkFBAZHDs3B/ns+AEAAAAAAAAA//7/+fTr9AYKFR4G9/8BAQAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/+/f8AAAAAAAAAAAAAAAABAvbv/AUFBQcD//7//Pv+AAAAAAAAAAAAAQYXPEAIAPDlFyD75wodNCgdCQMBAAAAAP8ADg0WFA8n/ffv5ecFBQP/EB0SDA8o6O//AAD8+vvz8g0kKxD88+38BCAkBwUQKPz0BO8IAAAA+gkUChgcJyQaBwX/7+vzAgD1Ag0LEPztKBcAAPgQGgoLFCAaBPXz8/X//QX6CQAeFSkWBfwJAAD4GRYHJSInE/3r+f31Dw0GCwb1/v0fIx/w4v8CAQIGJjoqFwr5/vb/A/739g4HAPTsHSEbBfQA//4EEBwlDf789wUDBPfl7ev+/fj+7QkgB/QBAP/8BR0VJQn+7gIMGg339P74+f75BPUREvvx+gAAFwoTCRD8AQMUGB0V//X4/PTo/QT+FwMDF/wAAAUQ/+/w7/MJAQsODP/69vbu9/j6DCD6+wwJAAAFHOzj2tbk5fcCAPT4/Abv6/4BHDI9DR8jDAD+DyDg5/Ls6eDs6vDyAQ4F/QAHEBgtOh0qNwsA+x44A/gC9Pvj8Pb2/AURB/sIERQPKSQLIBAQAP4MKxEH8tbd6QkRAun1BQ4EBQsEAOby9ur6BgACAwwS9NvP5QIaHgr/BhAMBwb/BwHj7eDs//8BBQT489fb3+sQGhcG9/8LAQIA9+/95fL+/x8BAAMH5rfS+Pr7EiMWCO/0+v8A9vHy6errBQEbAgD7BuG+4u/3+QgOHAz6APj39u/p8/Pn/fz8DwMAAP7Q0PXt7fMPEhMgEfsB+PHk9vn3/BHz7/4AAAD8zvHr7e/8/P0UExELAv3q5vr7CxcOAeYJAAAAAL33+vfx9fwLCA8REQr//ff9ABYZB/bf/f8AAP7P1vrj7PbwCAASFRsVC/4GHAoK/gj25Pr/AAD/5NLe7NbN6BgkHBswIyAYDfPl6OQC7vb+AAAAAPni2/IQCw8KHhU/OSITBPzw4OHp6foAAAAAAAAAAAYKBhIgNTIGISn39AEBAwEA//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABCQ8CAQAEAgEBAAEBAAAAAAAAAAAAAAAABw0Q9gAG+gv88+3s7Q0JAgEBAAAAAAAA/v75/BgwLhEV+xcaGBYA7+wCCQMHD/f9AAAA/v8K/fQCFiMSFiMWDAUOEQMaJRsTEgn0/QEAAAIOIPD3AQMPBO3u7ObxAvwG/fcADxLv9gUCAP77HC8HBPT7B/H39/H3Cgj59fgCCQgU4uz4AQD/AP8gAxQACfv+8vjv7wP+APny/gsIEQUF8f8LCPfmBPwKBvv7+gQA8ff/ARH7+gIO/w8C++nyAwLx5uT3//oG9fbx7/X2/g8KAgD6B/0PEQTf2QAB5RH48wIHDPT++fEA9fn89/b/9wPw+wr75OIBDuER6P71AQb4/u72+fn6AvQC/APz7PkVCwHmAQrx9OD19QgFAAj3CxL0+f8H+vbz+f7+D+/55gAA9v/s7wMD+Pr3DSMN7+f8Bg7/Ag8UEwjtBP4AAOMA3uoCBfYCCQchAPL0/f4BBA0NGQkfIRADAADc+t34AAf5AAwKDgPyAfr/6/cCBxgNKEEMAQAA/wHw+PwZDxYVDw4KCPoFAPYMEg0HESI4IgcA/g0IEv3+DRgYEgMRCgIL/wMFEAwGBgoMDe0FAPQOBP4BBQoPCgL7Eg8RERH2+QMDA/38Fwjp/wD2DgX9/AAECgYL/gUQCxUK9wTzBvn7+/rs+AEBAhgdAP30/voCAQYHEAoFBAgLBf4K6fLy5uoBAAMXLvjpB/z29gcMEQ0HFg38Avn/8+v78BoyDwABBiwM8QECBPsPERMM/AIB/fYB/wkA8tz8+AEAAAIVGunm8AUCAfn4/PP19/8P+PD27uDL7/3/AAD/AwPw+uvr8PP43+3y5fH7+u3u8eXb6AICAAAA/gP2z77Myc7s3tHBz+Dq7eHj6fXw8foCAQAAAAAA//v19uzs5+XW0cXF0tje2cjP6f///wAAAAAAAAD+/f7//fn6/QAAAP/59//79/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADCAgBDAYMAv78//79/gAAAAAAAAAAAAECBwQaNSMaCy4ZGRgpFBwcEBQGAAAAAAAAAQANMTkODQ4F/NftARMZEvoTGhjw7hIB/gAAAAX9/x8F9QID7t/u+v/+//kTKCY4AvQGBBoDAAAF+REF+hj7/+0BFwsLCw39CA8OIxEkCAo2HAAACxU7FPPy197eBg4VHgb98/MHEBciIAMHKyMAARY1RxD69t3l6vUDGyQN/e3u+wsKBQkF/xcJAAMbQDIUBgXn3/j4AhUQ+/Pq8QEL/v7/A/cnBAAABigGEhQP9fHw5e4DCPv48gUCEPfyDPbxGwMAAQYW9gUSGAAC/urvCQQC9gECBgMEARgD4A8JAAErFvYQJB4gGg739AQJBvPxAwcLCvj679D+DwABISn5KCMdJSoG9uT0Bv369AX6+fz+8+nF+wUABkQkHT8gHiUQ/OXn/g8E8vIC+fTu+OvF4AcDAA0kLTE6KxIE7NjW7wwUBPD2AfvW2d3hyw4eBAAI/BknJB0F5tDH2wshE/T++Qf97dPi3/MqIQQAAiQiEP3y4cCxyPoeIw0A9wLz/fnr8wQJEg8AAAEM6+LKs7G80/8lMysHBfv/+xkGDA4VDAT0AgAA79jWw6i70/keNSgdCP0J/wIQFw0CCvjy8QMA/ujUztbh5vELJCobBQADBA4PDAkA+A3y2QIEAAL86+XvDQP8/hQcFAADDRH/BRH2A/X/9ssMAwADBv3l8RL9+gH1//r+CQvzBP4J9gT7//XpDAEAAPkS4vYCCPwFAAYKDQT9//wD/u8KA/z/Dg7/AAD/1PHe9QoEGgoIDQX++wT/+/b9//Ph+/0OAQAA//Lh+f72+wcOFwP2+/ID/PT5CPjh4O8IDwAAAP4EAgYQ5/D8Af4B7P0F+fn38Ofi7PUZFAYAAAAA7AcpFADy+/P298/MxcPL1dbR3gIDDQAAAAAAAADpABkQExUsKSUaGAQG/ez7EBP/9QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBhAWDQr/AAAAAAAAAAAAAAAAAAAAAAAABPrt1d3/Bwfr07/g7t/zDwv8/gAAAAAAAAANDAHq6Pnl1Mbm8QIRGAP46wEDBPPtAgIAAAD/EBTs9On28NrX5ev3C/z/Aebt9wPo6xEI/wAA+/0OGgj5Ewvr4PDz8AD5/REEAwUB9gkH6vcAAg4VCRMJCg0O+vsD9PHi+PQGABD9BPMM+BQDAAIdGAcTGhETBv0FCfzm6vX++v4C/gX8DO8tEQH/HQULHB0XEQwFERL6+f0G9P76BPr19gf7Bf8AAA4HDRogBgMOEBsOFRgJ/gYGB/8D+QEP4t7zAAAZ/wAHAgj+/hEaFhcYBQQGBxEM+wj+D+Xp/wEMGQHx7Pr/8AACDBIR/QDz+/4IDQsNAf7p+wYACPsGDvP69Oro/wYF/O/s5+4DBf4RD/fv9/L/AAAOBwDo9vb19xAQBO7l4+L39/wPCQTx9wLy/wACJBLw/fYC9AoMAwPr9u3p9PT0+AkK+hEeDQUAAxUQ9QL4EwsECv8C9wDw9/oD+foKCAwlE/ULAAD6CvX6+RcaEPwCAwL99PoDFAT+Dx8WJQP9CwAB9xL99/AJD/L27uzt/QALFBP+Dx4pJh4cJgEABAkU8u/z9Pjy4+Py+fgTDx8XDQcWDPkLGyD/AAYPFfnp3efo3tTf+wsEBhAKEAgM8OzpAyAN/wAIBiEK8O397vbuAP4GDv/y8/oF9vD46vgcAAAAAgcpCvb1BwwBAAUMCQTu+Ovt+uvy/fLyFQMAAAALIAAHDREYEAUPAwXt7PHi+/vz7/jzDwv8AAAAAgT5Cw8cFBQeEQcLAPLx/w3/8/j3BR4AAAAAABAI/xAJFSEiCQYPCAT5BQcHCAQXCf0V/QAAAAAF4fL7Cg8UAfcCBAj/9woD+ALv+Ojb+fwAAAAAAOLV3uv5CAL8AAoN/BT7+PgLAQUeBvz8AAAAAAAAAwkPA/4IGRIiMB39DRgeGwQXE/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+vn+AAAAAAAAAAAAAAAAAP7r4vT6/gAGAPj29vDw/AAAAAAAAAAA//v9/vv0z9Hg6vsNEA4O9u/s9f8BAAAAAAD/9efm8vDcz8vUxuYBBgft7fr15tjU5PwAAAAA/evn9e38+Pr79+0ADxQYEvLq9OzVzd/5+wAAAP3z6wb27vnp2eb9CQMEDwYM6Oz76PbvAAQBAAAJ9uTw9fkE/vXv9fv7AgQHBwbn7eT/+/gMAQAADvLj4gf+AhEJB/72//r4CAX9Awf19wMSEf/q9QTw3PYDCBMTERD7AAcJ9un6CP//+woPGQ7y+f0E+O0ADPsGBBIHBgoRBvzx8P75EAUPIxfx+AAAB+nyAAUF+/z5BAT5CQbv4Ozq+AQbHQsCAQP+6RvX+xX7CRAQ+/4E/vHr4uLv8/8QDhj4/woK/+8N5P0YAgoS//kF+ODV5fD0/gEcIQ8GBgMBBwAAA+gCFg4TAAAC+urk2PUCAgYSGBIV+PcdHwMAAAQJFQf1Avj3FAXw8v0YFxIeJhgLDQH7EiQCAP//Ij0CA/UE+QT9AAMXJyUdGR0eBRcS7/QeAAAA/hYzBhH4DQX+6/8SECQYD//8Cv/9DebdA/0AABAPGA8GCfkA7fUIJBUWBwr29PH4//vM1vf8AAAJEyEH9v/r6+j/GBUKBwH9/uLb+Pz41M4I/wD/EhonAPj18/j+FAH3/P73/f7j0/PvC/HVDv8A/xUTH/wBAAYC/QkA7+36AgsF5ejp8vPj7g4BAAAV8QcW//P1AAIA9v/v+PwL++rwB/HL18XU5AAAC9L8EAHa3eb7/vr35/j9Bfj8AA/zydPI6f0AAAPZ/Bga/+vx9gUFAO7qAQsECQwVCegF5P8AAAAD4/MsGg0I/goa/wUD7BEPAf37LzgeEQEAAAAAAQb7Hg39+P4gMBkKBvYaEgjZ4xIbJRgSAAAAAAADBQQGEg8LCgQNISwWFxkM7uojRyMdFQAAAAAAAAIDBAkXGBkO4voL+Oj8HhMMHhABAAAAAAAAAAAAAAAAAAAAAAEBAAAAAAAAAgwOAgAAAAAAAAAAAAAAAP4CEQT4+/sF9+vxDAgOEAgAAAAAAAAAAAAEAgD8GD0wICEE9OHV7RopHxcUAQEAAAAAAAQDBAYkODUvFf4A5+Pn7ers7u8QMSID/wAAAAAPFfTl9/Pz7gIREv8PCvfz+RIJ+hER5f4CAAAHGiD7BPr2CO7v9QIPDAYB+vYFBOz/CO0ICwACIDAdAAoHEAPz3+Pz5erp8vv+DQ3+HhH7+QEAASQ0MRYOEgwH89ve6Oz1+/gD/gMH+Q7+7QEDEggqPywjGgj79vLo5OLyAxQLCAIG/ATz38oIBgUFMBwUBxcI8/v5APTu+BcSHg4PCvsE+/XQ7wcAAibz+uz7+v0JBQn/8gYcIR8bFf7/CAUe6OAEARAa+PLa8ewGCBwT+vr/GhEPGQAJBwEEEOrfAQEMFRP43vT4BxAcE9fc/A4KBAQKBgAKHgzr5wYAABcJBvUG+BEaGQHb4QQK/QIEDgsYFhQH8+4AAAIwEgYKFf8dHhTn4uwA/vz9Bv8IGxQaFOLU+AACMe74AQMCHRYF6OzxAvMB9AUACBYRDiD3yvkAARnd8wf3BA8N8eHl//n4CvL87AQDCgMM+OECAAUA1ej46gMMCwP8/AH39gb1+QAB9/oCAwr2BQIZ/Oj3Cfr/CQcMDQUI/v4DBgX8B/jz8w0gAAICJPfs+RgLCfb6BgQLAfsHBBUI+QDnzdkWKAMCBB/m9A4NExj/ChIaFRD69AsL//Dd1srYHzL+AAIN7vINGhIQ/vj/BPr+9+33+ebV1c/K1g8xKRsAAP33DxAEAQH++/b3AQDw7N3Zxbm7yN32CgkDAAAB1u4G+vja7voBEh4YCu/Xvp+2xsjc7AUAAAAAANjkAfnwBPMBEBMWHBP53Ly74+Xg2O8BAAAAAADr3/ojLyEh/OTuBBHx2dbyDRML/voAAAAAAAAA//Tt8ff1BRL74d7t+9zX/wICCwQAAAAAAAAAAAAICwkDAgIDChcaC/n7//8AAAgFAAAAAAAAAAAAAAAAAAAA/wD//gAAAAAAAP7x7/4AAAAAAAAAAAAAAAAEDhgpJxkbFA8ECfX98+j1AAAAAAAAAAAB//z+Aw8fExUbFhoUFfLS4OHj9QAAAAAAAAENAfT2BhUXIjQoGRQbBA8VDf3579XgGQ4CAAAGBuDyIB8iIAwJ7e4AFg8HA/v8+v4NCwj3AQAACfnc/B8MBAIJDwLq5ub8AQgFAPjvAPTx6vcA+gLy5+336+vj/Pj0+fLw8/4ZCfHs5uHpAQ34AP0KAe7t28/28uTn9AH3+vr5DwcA9wLx7fILE+jzERH73cbD7u3t+/387/T+9QwLDQQJGA8J+PL5/vwg+sC86AUB//4ACPby/vsAAvkEAxECD/nhAAH0GADP3QACAQUFDQAOEwb9Awr5DwYE8w4V5/7kBAkM9PgG//b1Ag4HABkVDwj79PgKBu4P/QP/5Q784eH9Bfrz/gn5BhcTFQf/99zq/e3wDBz2AP4G+PDl//n69/4H+Q4bGA0dBtnO2Pjg7977AgABFQ4LBfnsBvvw8vMKCREUHwXqzNXn8/oAHhAAAxscEgUH8AoCAvz09QAPIAv73dfR5BAfIQoeAADiICEXFhQMBwcFAf8MDwv51s3c7QkkKiksHwD7ASwJEB4fEgURGQoJDgf008Hc+QoNDwsVIBQE7womExkKCRQhIhcVDgP35tHW9gYQGRcVEfwKAOoMJBMP/woPBhANBAPz6fDt/AwOEg4YFg7wBQDq/gcMBQAE+v/3+vru7PrxCAULDQYIECkqBv8A+u/vGf/59vX49uH08f4BDQ8OCyISBREsMg8AAAD/2AwFBw349+zh7+rzBwn9FREpFgoMMS0kAgAAAfff8wT25fHz3+n0AwD+/BYcFQsUACctDwEAAAH/IBUIAvTm8e317/IG+/gHBvnz/wHwBwYBAAABAAcSHiojHxAY8u8GGxMQDw8XBxUTDBEFAAAAAA4K7fb8+v8SMRv5Ey8j/vr0DBoKDxkbAwAAAAAAEhsKDgoCEDb6+z4xCfX+9xIY/QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBAUBAAAAAAAAAAAAAAAAAAAJFA4iFBUJBgUGBQYHAwAAAAAAAAAAAP8EDP4jHgnzBxElHx0lIRMUDAcAAAAAAAAA//73FvTh+t3m1Nvm8fslJyn45NLm+wL9AAAAAv/59w3u8wEVBe/4AAIADwPy0sfCz+z/CAQAAAIAAPT+8+fpAwf5AwkPBAkJ/ezs4vIEAR0OAPr89gDw8t/T2+3//wUMBfIA/fLvEwny3fIVCgD9/dn59gX86fMIFAIIEAMI5Onq8AgI1s/7CAADBf7b6+br6/n+BAoFFw7+7/H/+wQD/NTP5fP8Af/tDvXe9gsA/AMBDRUN+OXu/wgEAOvj7erV3wD/6DUO6gL7/QD9CBcdCuvo5vsMGv7u1OLr2tcA/v9BE/72CAIA//8OBPLg4uzxBxoEBvcN49LfAP4PAfwN+vry+v39AvL94+3s+gUYBQPn99Hi3gD/AgP/Bv/9BwAE9PXxCvbu6eEDEAEH9+2+8/sAARYfCA3/+BIBBv/4CgsG9/f4+QYRFPftEjUJAAMUDvUNFQoaDw0NDg8ZBwb9+AgOERD3+yAMEAAA+gL9FQQGCPwUHxIbHBEG+P8BCRkJDx4sHRkAARYJAf0A+frzExEMEh4V9/z/Cw4IBA0hJfINAAQf/fz39/Lw7AQICBkpBwL6CwX+AQAQHxXkAwD+Ix4I9/X19PcCDBsjJRP+DREF/PkHKRv46QT/9SIZ++z37wAA/BIYIhkOBf/6Cfv+BCkjBAEBAPsOHfPW4e/y8ecCAAcC+Pz57gMQAQsNDvPz/wAAABQB9/Tv+u/a4erj+fPz8vIBBgIJBAPvBQAAAAAjKQzt3enn8Onc7+jy8/D7B/zu9PUE7AUBAAABEBoT/O/k9/7s3vX6BP7m4/bl6+P+BA0LAQAAAQ8HC9LK1tjn9OgMBPYI9PEACgT+DBkgBgAAAAAPDB4I59zTyvMYGfb/D9/lDCkSDhYQFgIAAAAAAAkK/QAFCPT7/+335OH5+vUP9wALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECAAAAAAAAAAAAAAAAAP/5+QECBP0BAwgNCAkLCQEAAAAAAAAAAAAAAAX76vID1+L/DQjuDRYRIhMC//8AAAAAAP79/fwF7d/Z3tXV/wr88fj27Rs3IRATBAAAAAD9/Pvo1OT26Ofc6woPBvjy8/UCDSQfFAMAAAAGAfr23NDo6ef7CggIA/XyCPwZGBUbEgL8/gAAAwL45ty6r77k/RoYHw/59QkDExAOIRoQ/wAA/PwDB/Ljwaa23QIfIgkDEfkGDBEP8AIVExT8AP8HGhsC98OuyusYJhH9/wT1+/X9BwgFNykX/QAADSEc/tOur9oNIyAa8/T66unv8AsGCSMR5ukAAAECGu/KvdH1GycUEfPe4eLh7ef5DQL+7ejlAAD79QPTz8vNAhchGwX47PLm7uvo8wUA8Nf99gAA/u8B8dDT3v4GJBcdBPvv/e728PoV++ja+/cBAP71A/rp6PUAEhocEAj2/v389PoTJBEF4Pz+Av357/oF9u7/BxAaBgbyAvgA/PEAHSIhMfX/+wH68+P5/vTkAQv/BwP8+P7y7QEBEgkLGSQa6voA++Ly8e/z7f0FCQv59/8B7PLz/R4WBx0eGu/8AP7dDfL6+ur9AwUA+vX+AfLx9PoJAeoC7fjt/QIC3f8MEvr9/g0I//XpAwT++QP/A+/X6ugBAv8AAujuBAv8/g0ICAb78wcL+QP6B/LX5/z5CAT/AADt7PUMBQIFAwgI8vL7+v4CAP/y2fITCAoCAAAA5eL6AgD+BwkMCfz0+PL3Cg4B8fISGAT6/wAAAPLvBP33DQMHCPf5+fr4/QIXFAgaKygF+QAAAAD8/wUDB/z9Aw3u+P0KAhoaIBIdIBYL7P0AAAAAAO7p/hEQCQYB7/kPBhcR+f4BD/jg+t79AAAAAAD30uAKEBH28/D+BAIICvIWKRHn4wEBAAAAAAAABODb8RHv1NDxD/rj8f33BAX5/AAAAAAAAAAAAAAB+/D6/gD1+gkdEer7AwUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/QAAAAAAAAAAAAAAAAD///7+/vf1+Pn18fn+Af7/AAAAAAAAAAAAAPvo89va3N/S4uf89xElAPz6/wAAAAAAAAAB/Az7ChwJ//Ph8gke9tzg4MG5y9T5CwAAAAD/AgEG9fn89/Hj7AD79/Pg/PLM2c/c/iQAAAAA/fwK/PUDCggIAfb36+v8//j369no4wIS/P4AAP0A/ggNIRMaFwABAP0BEQf4BAX2/v8SLAgAAAAIAu76BSAYJhL+/f4DAQgB9vT+8wj7ABYFAAD9BgrsCPwVFiIbAPDuCQsHAfHx9fIHEwQD9wAA/woM+xL9+w4YCgX1+P0J/gHw9u8CDgX+4vEAAAABGwkdAPH+AwsNA/b3+wD78vns9gIB79DwAAAA+AwXFATo/hEJFwYR/gAA//j+6fr58uTK9f8A//3U/QTy8gMPEhkLBgH7AwcG+f38Dv725P39AAAA1fHl1fP/CBMWIQ36AwoSDPcADgX08w32+AAB8ufe1Njq5PgIChEODQ8IHxQMEQID+QkWAPoAA+3t3tPW4eTm/vgKFBEeEBoREQkWGBYIFBT1AAL7+AT67evr6vDnAwwPEQcVCgkMFQ4XAer45gAC+voaHxAIBvji4ePt4fAPDgwYCQ8IFPrd+vj/CvUVGR8jChAD8uPs4+Ht/wb8DQIKBA8E8gIAAA8CChUeHQoNEBH19efv9v7/Avf2Bfr7+BUUAAAM9/MOBgoLCAoI9fLr/vgDCQD3+Q/1AfoeDgAAAPnu+fYFCgn+++3u+vcE9ggO/QUUBOzxF/8AAP708fb3BQHy8vnz+/X46/sGFBcXDvDS7ATzAAAAAAf36gkRDwMJDwn39/MFCBoXFvTuA+wEAAAAAAEgCOL7DgICBRIFAAYBCRMJBQAHEB79/fwAAAAACP76Dfr1+AIQEwgB/gIFIRr/8vDw8/X9AAAAAPvt7/Pq7vHm7gX47/YIBfzv1drqBv/6/gAAAAAA+vr9/wD96uwP+/AfJQPu8/r1+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+vn+AAAAAAAAAAAAAAAAAAIHFxQIAPr8BAb7/Pnw/AAAAAAAAAAAAAD/AwgLAxsJ5/MH9u7n1/n36vD8/wAAAAAADiAPAhARCesE9uvu+v/59u8JBfXU8wwDAAAA/xEb/fAHD/nx+P726e/wCQgMHQYg+QgXAf0AAPkOEADl4+/k5/gDA/Xx5/j/AwwCGPsDEvT4AADw7+bi2+j09uvs/f799QULC/8LBAH3/QH8+gAB+PHw9fsEBfXz7ff2AwcF/gMLEwD3/yEgD/0DAwb49f0PFQ4I7+3k8wsZ/vQC+QH26QsgKP0BAQIUFwkIHxMD/w7z8vISFfzw/AMB//P+FyUHDwAAGhAXDwgK9QQJ9e8EDxL96PsQEw8A9AggCxIAAwfk6/oC9foKCQL4DhME8vYLChYL/vwbOfYDAAP78vTl+PX4DhMACQYQAO/8GgX8Bfzw/SoRCgAB/wrw5vMHAA0N9wYBCPL3CREHAvTy3PEfDwEAAQD+9/DvFgP5/PMA/fj4+/wJ9gQB8u34+PYAAAH79QPw/QoJ9Pn79Pv5CA0J+O8L/Qf9+efwAAAAAxAQ//gKFAH5+/D4BAoIEAcJAvb19fnr+gEA/xoRC/oABQ0J9/T8BBkEEiYO/gfw6efw8/gAAPkdBgDw/QAGAwH9BgwJ/QwSEQfu4eTn5ez4/gH+KAUG+fkM9//36/cPAv8ACP/82eDr7PPu+P4DDCAQBQcC+wAF8fMFDgX09REM9evy/PURBgT/AQkNDBEnFwIA/wL2BAb8+QcN/PPn/AXyEhsXBgABDQ79ERsPEAwK/Avw4uQJ/gUA8wX47gQMBQMAAAIaBiIUFxwE/Ovbw8ffAhkQDfgIA/gJ7vwAAAAGCAEHDxcRBvbl19PY5fYYIBkZCgXz9un8AAAAAggQ/Ono2+Ho9+fU5OEBDQUDFiULAfX1/wAAAAD+8e/7GR4L+fz0CRL5/QD0ChAjKgYAAAAAAAAAAP8CBQEFDxAFBxMR8uwEFg4DDAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAIICQIAAAAAAAAAAAAAAAAA/vPu+gsSBgf69QYFBg4FAAAAAAAAAAD+AQQaWE8wFPACBwgcKzA0JRMkFwMAAAAAAP7r4uL7CytEMTkJ8ejqAfbh+O3+F1w7DP0AAAD53vLd2eQQFg0GFAoW8v3+8O779QUWBPzzAAAA+tTq2wELCfzo6gwG9PgLDgH1DAoJCQMADQQAAAT7DPsBAvcHAfv29Oj2BwcPCgH1+//x8+oCAAIHAgwCBgcGDBEM++nd3/oDDfr6/t3o9AT4AQkG/QIIBhYUChQK9Ojk3O/uAwv8AADg7/fu/QEE/979+QcIExULDO7j2uTv/f/6/PgJ6f8ICfwJAADjDhAVDgAPEAv8/O34B/3y+/Lu6OT2CxEMFwIOABcSDPj2DQkEBfn1BxgM7uny8O3wDxIX+w4BDBE9Fgny9fL7+wUW+Aca/vEAAgAUEgkVAeb3AAQWIBX9+QD2/gcADgT6Dwj/DBYJJRME+Abm/AAF4gLv/AkUDQoNAhEDGQ3/Ch0YFQQO+PEX+gAAANUB5fAKCyANBfr+DSMRAP8FEgP5A/7fASUAAP7wNP0DGRAa+O/a6CAiHhAM+gQDBgL45xYo/wD6DDkmChcUAfDY3fIjHRMFC/UC/Pfy//MwHv4A6AwlJQIVFAHq0M8OJScSCAv57wv37e36GBL/AOUNGB0GGgT96eLjDCocEAkQAvMA7OjtAvEIAQDwCv8KDAsI9eLV3RIiEQ8OAvz7Af7sA/PkBQIA/+v2DgUKA/zr3OQGFAIFAv79AQAH/A7p+BEIAAD49e3/8P3389nc6ur3+PwJ9f73BvcO4wb+AQAA//3s+Ojh5+3Z4/rxA/8O/vX9DAz5/u34AQAAAP8CAvno183Ayuzz6f8IBAUC/vTm4vr7BgYAAAD/AAAA/vnq4d/j5en9AAgRAOHFzcfa6QUDAAAAAAAAAAAJHxD969Hs6d72DRLjsrrQ9v4AAAAAAAAAAAAAAAABDf8CLBTqBxohDPD1/f4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQkK+/Pj6Ofz8fL7/gMDAAAAAAAAAAAAAQX47uPT19sR+9ze4t3g5e3g6PEAAQAAAAAAFxcMABMYEQ8FHgkeDwn58uby3OjQ4CITAQAA/xMOEgH4CQ37+AoYEgcP/Qb/APgRBAopCP4AAP8hBxnz+yMVCAsBDRkRBgT3Au3zBf/2A+nfAAABEwspISEhCvsLAw4ZEwkF9f8JBfjv9/gT+AAAChIHGxwWFAHo//8XCgsC6/HuDQQXBvL5JBoLBv757AsVCP335/D9BRUE/+7v+xQWHBUYEA0HAwLv2eYKAfz55efn8AIHBvv6BgcQEQYOHTAM6QAB7u/h+AAC8Nvi6wYLCPr97/4UAwYCACI3FOkAAODx3Oz78+jj+AcYGg/37wIHAffo6Nnv9Qj9AADk7ucAAf8D/QYTFw8I+P8BEv7k9eHX0vj4/wAA8QH2+fYOGxIQEhgF8+0ACwTy4+rf4+IeBQEAAuX3+AYJAwsBBAkH7ujx9QD76vbr8QQJEhP/AAXl/+8C/QX9Aff88ujg5OsC+u8AFQUhIRYo+QADFB0QCP0F8vDq+vDv7f//BwoSDRgbJCcIHf0A/xM1EQf97+Di6Ory5fL+GRoODQocHxgH4wAA/PwOTAwL+PXn5fP5AwYLHxcTGgQDCRwM++r8/wELIT78DQX7A/0DDQ8WExIKDgj89wgL/fED7v0CHB0T//0DBRYRHBkSFxMG9gH+9fABDPLvEuL7AQsL9+3y/gQRHQ0NFgL+AQUE+O/l/ATfAiETDQD/BwL2//ruDg8MDQb4+AX8AfP4+v8E2AwP9QEAAAQfAxAA+xkPEwT+6wzz6/cB9f4TDR0mLQAAAAD+GwDt7vsIFPrv5uPvx8bb+vwHFBYfIRr/AAAA//TXvLTT7vHj6ff69OLM3v7+9fP1/wX/AAAAAADp2d/j6gAP+sHI9u/h08fY+Pf6Dw4GAAAAAAAAAAAEBwETJR3+9voICwAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECwH++/z6/OrtAwAAAAAAAAAAAAAAAAAAAP79BBAGDxcNBPzqAisD9vH0+P0AAAAAAAAA+OQBDQbzBf4JHw3n4Pn/CPgEIR8D/gAAAAABBwnl4vEGBwAI/Az58/n+GAr34/4X7/z7AAD9CyXu2tHW7fgD/PsA9vUEAf0cBvP44v/59AADAgYiFv/36/3/Dv72++30//j9/wwFDAXt/vYAAQ4WEgv8AgkPCwT2+vH+8vL9EQkKBQr85yv8APkoJf4C+vwPAvkBAPj5AgkOEQX8Af7x5P8yDQADOC3z6QAJDhABAATs7QklEhMSFAj46Ac0DPEA/y0K8vb6AQkQDhQH1dT5BP4FDBQI9/8HIRPw//AL5+r4BQ8IDhUW+9bO5OPzCwgQGBEAAB4c8//0HvHo8Pj/AfgUJg7p2uHe7/IACxwOBPYQ9t4A/gTq5uHq4vgDDSQWEvTm5erm/g8dCvHl+NztAPz17M/E1eoQIB4eJh3+/e3f7Or9CfrW5ebVAAAAEgTawK+97gwlHR4NDQoI7Obm5ejqyNnS4QAAAhwC2qubscPsDBQYHA0YFwTo1NLe7N7n4uHtAAAgDfzg0cHK6PIHDR8ZJSAO5t/N5P8BCOPt+gD/DxQTBvDf1fAGBxMdDR0fEgf/5ujk//XN2gEAAf8TEgsQCf778+sJBfoCERALC/7c0uXezNYAAAT2+woLERb/A/Xy+fbyBgoRCf3w5N7PtcDf/wAD9eDv+QwL/v/3/PL2AwENDPnw6gLpzsvM5/8AAPvNBfX1/PTz4/j+Cf0LDgLr9fn74Nfc1/UAAAAF2v/2BvkJ8O/5/frzAwv+9/X25vHs+vP/AAAABwYQAwAADAMBDQ8D/BMOB/QEBQcdDe70/QAAAAMQCv/y4fPn/vwJ9QEVIhk/NCQiRDQG9/4AAAAAFRMOE/nv+f0E8/oRAiQ/ShsA7Af/AAAAAAAAAAD97uX4CAzm5NvX9x0VEQUEDAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEDAwEAAAAAAAAAAAAAAAABAQ0aIi4eGhIGAgMCBAcDAAAAAAAAAAAA+v8LDSsyMwkeIy4oBgINDQoQCwUCAAAAAAAA/+z64eL38AMIDxInDNjv9PcWJiER6/n/AAD+++TnDgH+/v8MEBYeEAP+8woOFBYH/eL8BAAAAPHW4RAJ/RMLC/z6AgP98/4RB/oJ/gwBGBYA/gPj0uD+CgcBCgv68Ors7wH6AQoIEQHwGAMLAP8C6trdCQwZCw8IAezs+/j4+v4ED/v79w4F+wAC/uj54O4LFxQWAvfw8PYBBwUCCRYIGQ0OCfgAAgD/6d/0DA8UFwgB9PHx+AkICQ8QHxsSCPDlAAH9D+Hd+hAbFRkC8fgBCgHzCwUJJB0SHQn04gAA+xHR4fILEwMFAPj2AQEC/PLuFxkWAhYH8/EAAPoV2/IB/gH8BwL59PoD7/Dx8QEBDv0Q7gPyAAD8EfkC6+3+8fH6/fn88+r28Pf99AT5/+oTAwAA/RIUDOTd7O/9CQgFAfPt+AXu/vsMABQhMAoAAPshHAfr5PTtDAkZE/vv+wP75PQIF/8cIBsPAAD/HRoB8PkEBhsqGQf+3ezu7u3wAATx8vb+/wAA9wsM+vYC9QQUIx0R8O7x7e3r6PP69eUBCAIAAPPj7Pn39/L1EBMSDwnw8vb26OXv8unxCv0E//3p2ezyAvj2/QsZHxkF/fT9AeDh7wEN/BsKAv767d7pAAkC+PsUGhcVHgUNDv34/QgLEBgdB/7//PcB5/Px/voCCwwXHiMLFgQCAwkMBgoGHBgAAAAAKvHp7/rt+QQCCA8FEBIOCxIWBvzx3wMOAQAAABoc2sW/yur4BQwHB/8RDA8ABQD36OP4BAAAAAARHf3Qx9Xe6/gKCAX/AQgPAOXo6PHzCAYAAAD/A/flDAH57OvlBBH7+PQDAOjv/N/xBwoBAAAAAP7x5/4H4tb08/P36+b48vP6CQT29vT4/QAAAAAAAAD/9OPfAA4YMBYUFAkA//v9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEDwwFAwcIDxH9/wAAAAAAAAAAAAAAAQAAAAEE+wYKDwLuBhgB8QH3+vn6/QAAAAACEiAFAwYNCN3PztzU4ePw8OL8DgL9GSUTAQAACRQEDBILCP4HBOTb1Nrm7vT19vPv5AQiHwEAAAceAwfz7dzk9xH8CwsEB/cD/v7w8eb4HhUAAAABCAbp4dHP0vn6ChQDDgQYF/rm5+Po6PgXAwAAAgsC297Yz/oQBhUWHxoOCBAL9fLw6vb4NAb5/fnv4uzs6/MHFwUOExEXDhASAwX54dftGTwI/gDy493r/gYGBhIF+QoEBQUEDgT+9+zxDDAbDQAB9ev2+vkJEwn47u4DAgMDBBIJEvn1+gEaBgYA+BEUGA34AQD2+PPpAQkIDw4UBAnu/PL/FhABAPkYEiQO+PX27Ozt6/EEDQ4JDf4F+P7m4+8FAQD+FQkGAv367Ov28e3vBwcACwQG7O/t6NTW+v8A/A0CBAUHA/nyAPvh/ggB+fYKBe/28ur01wgAAPsC8hsGEQL+APrz6vcFAPT8BvHz9wrt3NfzAAD/C/0EEQP+/AT/A//z/vgB/P/v9QMM/+/lAQAA/xTu/Q0RBPz7+xEOBQAAB/rz7/T9/PoHDAYCAvsA5voFERYE/PsB+fj++gj//PbyBQT28PsPBQID+u8IEBIUEAj8BgD9CPoJB//4+fb8+/n7EwQDC/ULDwURFxsPCf73AgX8DgsGAvrz+RAnHB4CAgkDFCIQ+/UNFgP+B/kEAAQNBQQICO0RHwPp9QABBQQN+/Hu7v789/oODQYFAggHB/PpESwJDv4AAALi3dvg2+n+CAMDAwcKDPjs6vrvAyAtAAQAAAAA4uru2ej3/PHzBwYABgL98wAGDCYlGfQBAAAAAODS2Ob49wr99u8JE/cYBvD+HQL/BwQKAgAAAADs3dfY9QkWCwb2Dx8C+QYGHzYxEQ0TDQIAAAAAAAADBQUJDxEL9QMc8tTmAgsHBAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQFAgAAAAAAAAAAAAAAAP/47/YH/gwDBwH9BwYJDQMAAAAAAAAAAP7y+QMG/vb38QQfGRHs5eP2AQkDAQAAAAAAAPr35/To2eHxGg8MGwwG9gEIAP/4+fz9AAAAAAD49PDnvM/pDxMOExAHExMG8+/9BPf2AP8AAAAA+O3VuLS85QsSIyb+BwUZDfb79+32+/j5/QAABPbgt7HK4Qv+ERIECQL+Eg/07/Xn2/n9AgAAAAcB/NzE1/kD/wYK+/zr7QD7+/Dp3NUOGQMFAAD29APsx+0GAQoW/PLy+PP5+/nv7eHgCyICAgAA9PEJ3dLsDQkaGAfv8O788/Lp3u/l5vEXGgoAAPnl7+zi8gwSHRTx3vL4A/T98Pr06vTmAhAI//T87+T27vQPFwz9+vjxAgcOFQ0HBQb27gXwAf/3Avrr+OjoBQ7+BvjzCAwZIBMkEQwhESEk/f8AAAnx2+nl7/sGAAUICv4XFw0MEA0KJR0hLvn/Af4A4N7X3fXzBQAEAQD9DQ76BwMKBg8fCh7tAAD99+rr8PPy/fgA/wP0Bv4EAP35BfsFDgsZ9/8A/er99/j/6fYI+wnx9QH79PUG/v/s+g78KAX5APz9EgIGAvIBBwQA9f/y9/gE+wH09/cC/hH9+gDxBgoCEw0KBvsE+gUIBvn0//vx+uzzBwTuAf8A7Qr/EgYLEg39+vkN/wkD8Pj1+/4DBxMW7/gAAPPx5B0aIAkN/O/49woNBP7y9QUD+AISEvr7AAD/5OYOIxkDEQb78/n18/L1BwMAB+sNDwzj3ugAAv0KGwoWEgQQCgLq9u/0/g0FCfz6CQn04P/9AAD+GAsNFRYaDBQOAeXs8e388Qj9DhcMDfcEAAAAA/X+Bw8TEw0PHwwA9/ji3MzpEBYjDwL+BQAAAAEFFhwSDAD+DRgUGQLy7/f+/gwZFggDBAMAAAAAAhYdHi0kECEnMicaBAoIBwMLBv38/f0AAAAAAAD+AAIAAAISFAT+/Orl9P36/f7/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/6+f4AAAAAAAAAAAAAAAAA/vj2/f3+AwUKC/v9+PP8AAAAAAAAAAAAAAAFBfbX3NzL0/4OEQTg/fz5/f8AAAAAAAAC/AQHBgX3/fng2OL/GAb28AYF/AD6/QAAAAAAAggS9d/b3NXr9/4BBwgQ8Ofu+/bq3REFAAAA/wgbF97Z4egE/voA+fwF+gUB7/P9B/EVDgEAAPsbCgL53/kMFAcTA/r7CQH+BA4MAA399QYEAAL7IwoK+wgQHhsUBATz//wA/AkEDwYCCgQIBAABASj8BQcMGSAfEQwEBAP38wP7BAoI+/L8CQEAAAgcAg0FDQ4QDQsQCA0LAPz8+hYXEwoM/w0GAAD9GP/+AALy6Pr9APPw/PLy/QwHFADuBfYGDQAD9Aj4//D37u36+/br7vv8DgMOEQz05Pzv5PsAAvPl6AT07/nz7fT5+uT3DhUWEhMC5+Xq+/wAAAD34OwK/wP4APj4CvXr8wgIFQr9APnW7BkSAgAC8/TxBwoNAAgHEBPz9PsLBvr0AP4A8O4VEwIAA+oHCwEJFAMNEgQOAQ4NCQH25wMDAgP0+QsEAAISEwMKDRQNCggCCgoH/wsN8fkIBQb7AOsKBQAAHQEUDgkLBPz1Af8NEgMD+/vtAQAEAAj7BwL//QYHEQT6+v7+6+/9GxUF/Pb69gcKBwj7BQQEAP0BDwsNCQP//P/x/QYGEAH2+/r7BAwN9/L+AgABDP4AEAIABPP9APoOFQYG8//+CwsIDP3k/f8AAR0C/AMC/QL0+vP79fz6+e8CCgQdBgf3/Pz/AAAV8/QECv/16/z36/Dy8wD3AxINIwoQAAT7AAAAB+bmGBwN/Pr5Avnz8QH8Awz9BgkF9v7y/AAAAP0B9xAVCwP9CgQD9wkADAIACvcU//0CAQMAAAD//P317OTt/RIMEPgQEhoN+fjl8+7t+wsDAAAAAPrz9/P9+/Ly8fT8/QUDAQn7+woDBw0PAgAAAAAA+/j8/P8ECf39HQ36/hgfGQAVCv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCQsCAAAAAAAAAAAAAAAAAPr8AQMXExANCggNCwoMBgAAAAAAAAAA/ez4B/oEDQTs5P0gDPTz//0YHBcHAgAAAAAADQ76BvXh8vPy8egKFgQDDREDExAnFxUDAQAA/gUB+Avx7+3c3/IABP7t+AoGBRMCKiM0DAQAAP3y7usD//307+Hp+QMHDQ4IAwgVIhciIRwHAAAD+vj9DwQLDQkNB/cLCQAGFgwNCyAiDB4UAgAAEhX/EQr/Ag0aGxMWDg8JCRcQCwIW7/D/+gAAABf7CQj2Dg0QGhgOFAwFBAcBBgTy/9LD3+4AAP8F/w8C/hYVDgUEAQX59PP41d/g4+W8tuj7AAD//P4I9gP9+PL669zj5PXm6NrJvNXYzb7X5/4AAPwNBgIR6dbi6eXl7wEE/O7t39PT69rR1dr8AP/5CwEB6eLj5Pn4BQoREw4AEA/+/gUJ6tLl8gAABAIA/erk9wf9AwoMGBkPDQscDBUBAenm6fMABQYKGAkWBQMKCPwABBcAAQsREhQG/QP1DhIEAAf3DBkTHhEQ9/T1/QcEAPcIGBUTGAb7BAXiFQAD5woBCBsNDPr3A/YL+vQNBAcOFRsbDx75ABoAAt8eAf4KAQb7+f746+/7DAT1CRcZHCQaHxsFAAreGf0aDPv+/QL3CAcD9/wBCBMfHQwOGCQf/f715hUQAQH5/gYD+wgKBgD4C/UFDw0A+h43C/333/YQ/vfz9gMQBQoC//zx8vn7+gP39foOHwIA/eX0/u7u+Oz3BBYQ+/T78fbw8/Lo6urw+wgCAAAAAAAG7wEDBv/5A/b36/cG/PLi8ejV4e/29QAAAP76DwocGAcC+gUGAv8M9u/48/vj1O7nAfkBAAAQCxQLFhcF+fsE/Oj0+AwW+wDy0MLhChT/AAAABgwiESEyGvwLJy0TCgMVJBw4E+Xr9hMIAAAAAAABBAQBEhUZKzkzKCc3NiwlRRHr9Pj/AAAAAAAAAAAAAP7/Bi8vFiUiSE9JGhz/AgP9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYIAAAAAAAAAAAAAAAAAAD/+w4nMyoVHg4DDAwPEQUAAAAAAAAAAAAAAAUI8tfp6vgHAwkDNzImGxIHAAAAAAAA/gcLAAH26d7H3esE+PsFDioTAf7s4vX+/wAAAPb/AvTl083W4v8HCAoOGBwO+uzX07/V3fwAAAD5/fbn5OHy+QP39QEMGhoYDfz247zO8/kNDQAA++X56trj7f4RDSEcMS8nJyQbEQjv/AcSDQUA//nvFwbW5AD/FhIbIR8sEgUJDQcJAAD/7vP+AAAABxz54vEKBwgSAwb46+fi9/Ps/PTj3NPwAAD/DBD88/7//wELAPrz1dTP0OLe2+/r5tLM6/8A/wgB6fEX/wH7DAD64trW8OL06/Pw9+jo1PkBAAAeCt4PFvXn+AoCDwDwAwYTDfT3AP//7dL1/gD+GBAD/h/v7gYA//nz9gYdIgwJ//n3AfPY4PgA/BYfBf8T8uUCBfzs+fcIEhID/gj28g4J3t3tAfb6HgzjCgXoBP396+4AEgr6BfMGCgcYAezU/QDx1Q8fABQLA+328/EIBwQNAAX0+ezy/QsW8AAA++f/FAsL+fnb6fgOBgwBCQQA8/fe5gMZGvT7AP4IDf8NB/7p3OQDFAwIBggJ++Px5fbzDSX9/AAAFAHyAxMB8e78Ahn88vv9Cv7o/v7+4vUUBfsA/wzn8/UK+/sEExIL/PcC+//6Af4LEu4EDPr8AP8C7AoRCwT2ARYZBP76Au/2AQUNDQX0/gL6/gAB7eYAIBgR9QIQCxkZDwP38wb0CfoKAgf0DwQAAf8B/RslKxD1+f8DCwsBDQbzBQoJFBX50f8DAAD8+AwaKRL7APLw8O0GEA8N+QcfJCQZDeL6/wAABtr8GxcF6fD29xECAg4C/vv0GhslCf4HA/8AAAP1GSIc+N/z3M7/+P4lJAkSLC4UFv0ABwIAAAAAB//7+RYxKAPY9xkFRUEQBBsZGA33+gAAAAAAAAAAAAAAAAD7+wX/9+XM4vUIBAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+zb2+b28/Xr6v8AAAAAAAAAAAAAAAABAAD89ePu6P7j3tLz7w0R9QHz7vn+AAAAAP8eMwr+7Mm06+cKCu/bByQWDw4LDwn/HBQBAAD7Gwv+7vHm6Pbr/wb5DCQQ+voFAf4SDw4J+AAA+TQU/ev5BRIHBQgOBgQCAO/r497tA/0HFPgAAvUAFgvtBBAWHQQD8e/8+fL2/QHx9A0FEBX6AADs+AT55eP1/vfu9evy7/j9+Ov59er/Bw0u+Q0C8v316evp1+L1+PgA8/8BCw70+g0FBBAaMAID/wEC7Ord6t/i+vECBwkHCxwO/wcKCAcVHQXwAP4SGOPAyvXv6O7o/QkSCQscGBAQBw0VICMN+AELDh3gzsnq5Ojs5e4PDA4EGx0P/QIPDRIQKgQACPwN1s7p6Pb8/tTm9QUE+xUIDf4DCx0QIAsLAAD0/dHu/+3zBPDg6vsAAAUG+vcBBA0VDS3//AD9B/b4/hX+/fYH9gAECAEJ+vHr9wcD8N4C7/0A+yX6FxoaBfT3Awj8BQ4IAuzl7vT06O7H/uQAAP4O/QkUGP7+8QXz/fgFAgL+8uP98NvhzPfz/gAG+wIHBQsC9Pj0/f/wCQ8QFe3X18e+z+MUCAEBHvb4AwATDPvyCw/0/AcYGhHwyrvHzOX/IBMCAScE//sLEhIH+w0A8/3/FCgO6Kqux/oSHjAbBAMg+Af4/Q0SEAoNBv8KERglAcuPkMoACPkZHwQBC/YIAQwOE/8LEhIPFA0UCN23orrdAPrf8CkWAAD5AhMEDw/2+wUMFCccEevKvc7U3vv/5+gGAwAA/soVBf8O+wUA9QD89vLCmaTT2NvoDePn/f8AAA3V6On0BgYGBwYO8+fUvbPI6NzX8gvv7P3/AAAE3dHa8/by+vbi3cvLz9LY+fv87gUXAfn/AAAAAPTV2uXy59LKu8HW6e7s/PT5//8AAAAAAAAAAAAAAwP//wH56tvzA/wAAP/4/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBAUBAAAAAAAAAAAAAAAAAP4DFhsTEhIJAwIEAwYKAwAAAAAAAAAAAAAFDhkfAg4wKDI5FSEODCUaEggCAQAAAAAA/froAQP8BOYFGRgcIRwBAgYCDvn6Dtzx/gAAAP39+QsMAvLs8fgLFhMA8PLx+ffz5uvqBAcAAAIJCAYH8end9PPv9AsH/gPz/Oz9AQPv3w4ZAP0BHxMH+vft9ODn4Pb5AAr9+efvAwv/9vDpDQD/ByklD+vt8uvg4fgDARoJC/vw6QgMDRD73u0CBQQkGvzo6ezp5/kDDQMVFBEJBgD39QcIAejrAQL/HwrS5PD89AP1DgUGEAkJARMJBAX1+v3A3AAB+BTzz+YECAsAAQH4//0G+RAPEQX03Orry+AAAfoA/PDqFhUU+QMA9fME+PgMDx4N9MfN59nuAAAH+gwABwcJDvgB//4ICgH0+xISDPfMvMP1+QAA///vBBQBEAUHCQIDEQT7APwWCgYE5OHG+vwAARD5/hUC6wQJDBgHCQf7//ISDvf7+/ALAicEAAAV8gcP/O0IGg0NEPn59wbs/f379Q77C/7+BQAA/OIBD/PrABYaEgXq7/T36/Hs7/YRBQr5FgoAAvX6Dgfu5w4FHB/96+Hz8uzh3+76CQ7//RYJAgb67Qv/3+cHFBcU/fXz7+be3+j7AQsH9vYHB/8A/gAdAdro+BAPBPYE++/l4uz6+xcSEvrhBAT+8wwAEujn7f4ADgoRDwT39fcCCBAODQYC5wj+//oM9vPk1uL1+wcPFxEI+w0QDQYTCAT2+ez4/AAAAuP52+ns+f7/CxcVGBoNDPj/AvDp4/D8Dv4AAADv58vP29j2BggSBQwWFxD68+bf1OUDDQkBAAAA6vTiy83a5//xAvoIDg3/7gMGCO3wAgYDAAAAAADr3+Ln49jW1+r+A/IJDv0OEQT0AwwXBAAAAAAAAAkV7dDSzOnx/wL2B/jq8xIOCwsVGgIAAAAAAAAEBwYMBfgB7vQa/+n2Bv4LDQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9uXf8PYE/QIHAAIEAgAAAAAAAAAAAAAAAO7i8vzy5ADyDyYXGxTv+gUB/wAAAAAAAQkTCwLWv83YyeQAAwQI7/cI8/n9/O0SCAAAAAYG/hEPAQYLJxUNBhQMBQsN/f4ABOvkGAQAAAAHEvoVDeTy+iITGxMOBwkA+fQGBwn17PP/AAAA/vfj897q9fgJBfAIBAMFAgz48/L1+OH09fwA//j56ePi8fPy+//6BQj/Bgj+B/7q8O/m5u///fzt29vp4fH/Ag0HBQ0RBAD87wAC7v7x9e7y////7NT89e8CCPwAAgf2CgME7fHz/gT7ARYT8e8AAPbi++fvDg0JAAAHChcWAPjz9v36+PsaGO7tAP8J4fPV7CAhCAf9BBQdDP35AP70AQT08uPj+AD/Cv3V0+kSGAwGDRAOF/X1+f8ACQH5+Prm8v8AAAP23dfq9wT68wcODRYA+QYEAP4F8fTpAgv9AAEXBsrJ3OH18v4BCQ3/9v0M+QUK9dXT2wUR+wACKeTL09K4ytr0+wz58e7//wwGAP3QzNP9EvwAAezU2uvWwMK7yOfn7/j6Bf0BDQcA8uoG8AgBAATZ/fLy+evc2M/C2eX29gX48gj+AQoMHejuAgEN7RQJFxkNFgrt2N/xAfkG+wAI+v//BP/98QMADQcXKS4gHSwdC/4H/AgMBv7zCfPn9AgGBwIEAAUDEB4mIyswJhIeEwkC9wH+/AP/5PwPHAMQAwD58/MVFw0MDxIYGRb8+PwGEBAQE/b/Cg3t5gEA+eXZ9Pjp7u8B+wsSAv36DxQbIBLq7AEjAO8BAP/09tTtAOXm9/kOCQD08Pf+DwkG8eXv/wsBAQAA9vX9AhUeD/8R/uTs4eXy8+72+/Ty8+T9AQEAAP4eGBgOJxUQDgb+/PcBFwULDh4bKCX5/QAAAAAAJCocFQLh8wkiD/YNGCMtNhD58Qb5/gAAAAAAAAAI+ejw4uTc5sjD8yMU/RAGBQIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//fry5drm+/n6/P78/gAAAAAAAAAAAAD/AADs5trS7gz/7+wUGgkK8/L//wEAAAAAAADr2/IEBfj89hwZ8u7zEhQKCPLq3tvZ/QAAAAAA4t3q9wH++v4IE/jw8fnxChX6Eh0R5/v7AgAAAd3k6u8KAQQeHw0D9fPy/w4SFA8MGfME5vEAAxj99P4ACAsQDhMXA+rZ4+QDFykPCBIJ/wkDAAUkFP4ABQn5ARYcIhHn09Ps+hgiCwAJ9uUEB/0AFQL3A/fx7voRICAR9+n19BAdIAz0+fHe9/8AAQHx8//k8/T+BhgbEvnn9wUdHBcM8e/v7O36AAEB9ebi1t3o7Pf9Cvj49/QVIx0MAO/q9+73Av/25+/95ubm4uTrA/z07fsGARII9+PX5+bzAQIA+d/rBO7n6efz9PT/BPsGBP/77NnW1/cD/eEAAAbo7gL67wEAAQwTCfn2AgYD/OHj4dj05wLiAAAPEQYeIhIQBxcLAff1/P78DP/y+AMFEvj46f0AEyUnNSQWFRITCwD1/g4E9gICAxAQIisO9QruAAcpLCwpIgwYD/sDBQACB/gLBBwSFhYuB/7r4gAF/R0RFRQB/AUA/AUGCgP+8wQOB/8JIxMAAOv8DAAk+vfw+fXv/QwGBA///AT/9v/68wHrAAT7ABIIIvL49wH68/IPBAARCQP99/sAAv/x8RX3+wAPKB4A9v3//fPzAP0BBwL5+P3y/v789gMN4/8AABksI/0EA/Tu8wYM/fkK8vD2AwYJ9fMFAuYAAPz+JCYW//wFAg8ICQMH/v4ACQYI8eLqEvTrAAAAAx4LEg0MCP34BgMFBAUBAgT79OPJzur5/QAAABJJEgL5/u78ABcBCv/y//vo5eb3BAUTAgAAAAAGNSsbBRAXB/0IFAwH/QEC++rXDAr5BAAAAAAAAAXyDwYIEhMD8/Di9BIlGSYE5fb3+QAAAAAAAAAA9ejq9AAEA/sX8NUCNyUKBP7//v4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP7v6ff3+Pf+AAAAAAAAAAAAAAAAAAAAAAAAAAD96OTx1cz/AOjrBfr4+v3//wAAAAD/AP/28PH6DePX2MW0zs7j/PPZ/iYg/wsEAAAA/P8A7dXT28uxxtfv8/ABDxLzARUwJgoUAf0AAP0CAN7a4ev19PgAA/gDAgsCAwQTGwL7CA/9AP4ACQIH+fYEFxUQDggEAfgD+xD9DSAH/RcWBQD/DRAJ+gX+DxIQBf3x9PH8+QL5+goLEAoSGP3r+QsaF/v8CAsB+u/1/fn4/P4EBgr+DSwqGhn9+fvlHAkWDfwI//X8AwwFAPTyDg0SFxcdHAoaBQD/5yMRIRQMBf8PDgsXBgf3AgkQDRcHDfjvJA0AAQ0hABoTCgsXIR0iEgQHAAAEDAQF8eTd6zQJAAEJ/OgFDx8jKB4hGeXZ9PYIAPsDAObUw+kuAgADIgvsBAcdFhgM/dzR1+7x+/7r+u3X07TiJQUABSAmDPr9A/jx9dfOy/z79fLs5/jw//HP+iULAP//DAPn6+PT2dTK3QMR+PTn6ur0+RohDA0NEgD/DPTJt8vNycbd6hIcFQPy/fP9+QcgJQQV/AIAAADwxrC91tjl+hYlIRP9CRIMB/b8Bw3v6vEBAAAC6OjZ7/vwARADCxIE/gcFFwLr8QL6994CAAD9F/f68RMUCgcLDg0OCwLzAwnx7u/yCO7q9wAA/hQPCAoYFAoTDQL+Cwz2//kD/eX++Qju7u8AAAAMAgYPFwYPEA0N/goOC/gLCwP7+/z/9xII/gACBQYJEQL+DxP/BAULEhQIEQHw8Pv79e/vDQEAAQIBFBH/+/8BBAgLCf0MCwT0+wcMC+rs8f//AADx9d4A+e3t/Pj88vX8AQYVCQcSFAb9/gIA/wAA+ufo8Pfx2vX8+PwDBAAKCvwJBRUD/AwEAAAAAADm3PLz/gj08fgF+/Tt69/oCgohOB8GAAAAAAAAAPMAGg8LCBQZIDIS+QgVCBIRIygDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD7+fbz9gELAAEFAwQFAwAAAAAAAAAAAAEDAQDu7vvtFDouNEM+REQsDwAAAAAAAAAAABUdDAb4AQX99gAcKyQK+hYrJhoE/PUEAQAAAP8O+Bka9wsAB/z/BQ0MEgkNFAoeGxMMDQQAAAD/7+wvIw8eFvj+DQIPER4RFxYQCw0KDQYEAAAA8dcOPScVFg/8AAIDERMLGAwPBQHx7/oaEgEAAPHJ+hAODhkXHBAC/BcoKhcbDfsD4+0JBvYAAAT8wOH0+wQLCBAYFw8iJRv/DPv7DvHzDfgGCAAABOz+5/kDDwwWExQR9+fl3OHh3vYD7QAoHhoAABcYKfj1AA8dCgMA3sfa3dnbwtbt8NQLHB8ZAAEmMBoUDwIDAf8B6Nfc6/L4CujV4eHl/wHi/AABAgwQAw389w3/8ufn7O8F+xXt4untBAj11PsAAwr47OgL7vYC++vf3gH+9Pny9+vt7BISDOEAAQkZE+Ha8vP1+QDe0eoCEPP26/MI/P4nChHYAQAHBB/p7fH5+vUA8erq/QH79Pv6/QT6LBgh3gAAAwIS9vz2/P/5BPL47fYBAfPvAP4BFiATA9f/AAH7Cu74DRwA+/Tq39Hj7PPp9AMDDBUI/sm49wAABRYV/wYSB/Xv5dPR5v8I/w0QERIEBf3g2PIAAQ8YKAXqEBME+vr03/8BBxEFDBASEggaD/n1AAAmGgzm5wgMBwQA8/4BCQUGFAwTDRcECxID/gD/FA4g9/EHCvD4CgcUFRP8AhgUFx0QCBn69v8A/u7+DAHp/hL9/hQOFxUSCPsNFRcTCBoMAAMAAAD3FBwcFwgABw4ADBkJ++75CAcDAP3+3QsDAAAAHCc9GRAN/hIQBvkJBiAGDQDw+v377eTw9gAAAA8RNiAXFBAUChYmCgYBAxQRKxsU/Aoa/PoAAAAACScwLhksLS0xMzAlNkhDN0QkIBcaDgIAAAAAAAAAAAD49Pw8QCIdFi9IWA4E/RYU/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEDAwEAAAAAAAAAAAAAAAAA+/Hk5N/v6/b6/QIAAwUCAAAAAAAAAAAAAAD/Ce7l6A33+uf37+j7AvwD/f7/AAAAAAD99v/8IikJDe/2AwMADPve5e/5+f0M+v4AAAD9/P/98AgC+AX7BAcMChgFBQISBQP59//+/wAA++sD/QQO//0B/vsFCfwNBQECAwD5GfkC+/4AAPPk9AQCDwX27vQA/AkTCwUFDgoE/B4WCPwAAADt3/gPCgkOAAT1+AULEw0UFhQIAfgjKBUIAwMAAQHt+A0DDAP69/QH/QIUFA3/+QsABAwRCfsB//0A7/IEBQcIBfz6AQb9CAoGBQL7+w4WB/TpAP/z/fj3BQ8AAf7y+/P5A/j5+gT6+f4KEejz6QAB7wXwBPQK/AcB9/gE++/2+wgC9fXz/+zjGPcAAQUK8g0HCvf5AvcLCAYAAwoD/e4A//bs7fLwAAH79/gHFAz+9+38ERAOBA4LBQUBB/r//vnh+AD/9fIAChESDfbx/BISCQULCRD8CPn0/wv92PcA/wf9AAwZDQH98vYDAf0FAwP/BwH/CQ8BDQPrAAAfDAwhDQwN/wX+/Pf6CAwMAgADCAwKAxP/6gAB/woMEAYPFBD68gj/CPz++woI/Q8MEhrm5v3/BgwWEwsFFgIL+wMKDQv49voAC/sDDxEc6fUAAA0GFwj3/vwAAQQBCv0B+/v49Q8VDgYJEOb9AQEO+wn58wQBBQP9/g0CBAH++/YBEwkADf3uDgMAAvPg9QIAAQT5AP4C/QP++/719v8EC/3w9QgIAP305hIF/QD59gIKFA8D9wIKBwoMEQL+9QgAAQAA/wch+efo+/sDAQj/9wMHEg4MC/8FBw4GAP8AAAAWHQr+/fj/Af0KDQUTE/oODxgMBhL69fwAAAAAGhQX//UCBgoNBAkGEvj/JR8bEBgR+/n+AAAAAA8mICH69P0DDv4FBP4KIBXw/PDn/AUDAAAAAAAA/Pn4/wPz5t7j0+wFBPTu7gH5+QEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIBAAAAAAAAAAAAAAAAAP3++fHq8PX0+f8DAwYFAQAAAAAAAAAAAAAA9+3k7/D+CfTwBQIoIefk8vr9/wAAAAAAFCH16+jm5vX77QAPKx0eJhUGFQr77BIJAQAAAQro+f/n7eb1+vn9BOjd5AEJ+wn9DwooCP4AAAEi+AQN+f0F/QUVEQb16vP68/n15ucJGvDzAAUPHAEM/QIEFxsQFRIB8PbyAhQF/gL4GRMY/gAEEhT7+fb4+woRB//7AvQKCggDDgL29/j2Hwv3+Pb39Or5+e/9+gsQCf8KBgQIBfoN/QYc/CAR/f3y4uzp+fnq9QESFhMbGBcWGQcCEAIICgYkKwAA/tbq7OXh5PP6DQYTCRgLCgQNEQ76DQr+JSn/9wnY3+Lr9+jzAgAPEgMH/gD49AADBRLv6B8gAPkE6MrI3PDk6uv+/f8HFQcA+fn09vL68g4UHAAAB+vHx+Xs0/L9/P/5AhEI+Pbw+vLi5AE0CwABAPTT5PDo9tnmAgj89hgXEA8B6PT63+74C9n0AADh+h8U/wXl9AP5+wQREwUN//Tu7+sE+ejt6wAA6g4kEAD+8gL48voUFhMRCAL05/b5/vrXzOcA/9QPE/kQCvsHAwYSGxkRAwX+6fX3BBsLA/7z///F6/r9Bwn3+ggZGh4WDQb+8uv1AAgCAfkW+//8z8Tz7/H49f7+EBcXD/3zAfDs/RUG/A4TCfz+9NrOAPr0BPf7AAwPGRYB9f/u7PQND+D5/xQA//ne5AIFAfPmBA8MDw4G//j47+HfBPjc7d3f9AAA8QICBgAD/QgKFQUQCff77+fb2eLJz+3y+v4AAPXpAhkPEgsREQ8J+gL29vTm7d7R1NnT8AMAAAAXDesDAf0LDgUVHhMK9QD4+/PN0QEK6PcBAAAADAUa/wIQCAYLER378/Hz9ffRwNIAFQYBAAAAAADu7u30Cw4Q9fj87tr7Av/g0/D9AAAAAAAAAAAAAPwCDAINGicnMRTe5vMIAv//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEhMGAAcE8N/eAAAAAAAAAAAAAAAAAAABBAsXJSEWCfTXw8LB2wcGFAYICAMAAAAA/wAQHRESGSgJ8+HKusfa8P8F9ucJDg4OBAEAAPwHJhEDA+jn+M/Y2tjp8ff29wDq5f8xEQEGAAD/FCYqLgrx6/vX0+cF//r87e0O7fMDLvwDDAAFISovLS0fC+js1+f8++v49QX8BQIAEikMDQ0A/xs4My4UCwP25975/P38/gEDCQH9BgcK9hUdAAEOQDIjBv4ECQXv9ePh9A0DAwUBBw4EAQX7BgACDD4oDg0PJh0L8NLo9hIVGRUaCQD2Avr0CwsAAg4qEeICEywR7tTN6RYVHBwfGxYDCRIMHDMRAAEUIPDV9hYSA+jpAhUnG/8HCf8HBxInCRIjHQAAEg0E8vkA6OneBgcZIhoLA+3q7eoPISQeARAAAPryBQr39ODn4wkUISISAu/W49/pAAklLvv/AAEV9v0WBQkE9+kHFSAkAfPe4+PJ2fsHDAv1/QACJwPjEA8AAPfvAQ0MCQwE/PT11uf5COkF9QAAAQ3t0fkL9uzj7P3+BggVHgPr09UMFQH8/t0BAAAT3t3yAv7m8vwJCgYTGAnm6tbxISogERsUBAECEevo5wX7AAIJFSQgD/n16eHb+hkdAgUZHAUABgO92voMBv38/AgcDvzq6OXk0wcN++sILS0EAADZz9LzCf32Bff8CQb219nj6OT+HP3uByYnAQD/0tz8APkC9v8CAAEE8Ovf4eLZ8wwQ8fj+9v8AAO0IFPoJ9gQUEAIMCQn45unv+yEtFwjw5fn9AAD6+BsOJRQLEhkSGBH+9ta12QEyLCUmAvf+AQAAAPUQBQD+/wH6DQn199upg7D2GCwgI/8I+QEAAAABGw4FEg0CBfjyDxnjwcLe/xovICYgA/sAAAAABgYACxH39gT/9BcrJP/9HSwrFgUIDAAAAAAAAAAIEhEJAAQaNxT9DAT8/AT+/fj7AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP759/4AAAAAAAAAAAAAAAAAAAMGAP38+PH8Bfz89/D7AAAAAAAAAAAAAAD17OvzBAbu7fLg39PAwdPh7vr+AAAAAAEbKgj64NbYztjV5/kN797j2/UIBNzZAwcBAAAGGg8JCvfg2fT68Or1BQP8+PryFQr2/A3/+gAABSH0/Qj28PwQEA4KDff4/QT6Agb2BQYJ5ugAAQsVEhkE9tzp9gACAfbl8vzy6P3+AAASBwDyAAEEBwkK/e/m9Af6+/74+A0EDA39/gcKFQINA/r77er8BAP08/ELC/0D/wANBBoO/fn/+gkTHQf+/+PpA/4H+ev1/gECFwYFBAIN/AL+/PICCRsPAADu5P31AvPq/v0NCBEK/fz4CQsB9gL/AQwUE//2B/X28/j27vwKBhUWDRIACAsJ/u7+AfQHIAkA+RAYA+rq8+P2AAMFFg4JExoHDPz3/AH6IAwJAAANG/jk+PX7BQYE/A0VExAZEv3/9PX4Bzn//QAABPvn6PkGBAX78/sLDgEVFAPy+Pz7/BAZ4/oAAP/++ef3Af4EAwDy/xEXIBf45OrvAgIIDvn0AAD48Pn68/vwAwQDBBEJHyUK6uHm9fgO/RXz+AAA6uQHAQEB9QXx+PsRHAsU/d/e7AYD/g0YAvsA/uLcAAMJBAr6/Pz8DQH4/fLj3+kAAQUEExUAAQPl2f78/gEEAPz8APX9+QH06er3EgLxBw0XAQIK7Pb6AvcG9vr6/gcMBQIJ++rh9RYG6gb4CQMBBOn3BQ8B//0D+QIC+w4EAALm5v8M8uQI//P7AADz9gP1Agf9/wMNAwMLBP/8+gUJB9/P8PoAAAAA/Pnq8vIHDQYL+vnv9+/4APz36u3i1+j7AQEAAAAB/QAACQ0NBQ/58Pn28+j7Af0KFgr4AP8AAAAAEyEWCQ8dFA4K6fQEAg0iEevo9wUSBwH/AAAAAAYVJBoJDRUADP4dHiAkKhADEhkIAgEAAAAAAAAA/gMFBAsMFxLs5Qn46fb79wME/wAAAAAAAAAAAAAAAAAAAAEAAQMAAAAAAAACERMDAAAAAAAAAAAAAAAA/PDs4vLj8PsDFyEUDBAZDgAAAAAAAAAAAP8DFBkNCRkUAw0bFRciLSUVEBABAAAAAAAA/PUPFiYYFBAEBxwiGhAUJSEZEB8S9wAAAAAA/vz0DCARDAkUEQ0KHh0bFSQbDhEA8+Pm+wAAAPrs/A4gHBQX+fv8AxARBPn9+Ofr8u3Z2+QAAAcdBf8G+wYA9O779/8CCP/y9v3r6tnjwMfVAAAFLwH+BQgBAvn4/f4F9/8D//8M+vnn5fbOxP8BATPlEhoNDAT2+goE9ez29PADBf/09QEB0ukRAAIpECoZFxEICgsfEQwH7fX2Avf8/vILDcEQJgABNxgsDQwBAyEbGRoJ+/sLCRMJBv73IB7QExwBDTgUFhcbBRgiHxwWBwYNFxYZFAEUEBgUvO4WAAobGxcNFxEgIgr95ewFDhMPC/wEExEhI/n0GQADGg4SGBsHFhn85+jtFwkF/vLp8w0YMiYi7PwABCoCAA8cGCAX++jc6e78+/cD6P4VIjMrD8frAAQV9QAYDRYSEQb33d3v7OP2/gAJHiMqHwju4wACFvn8HBYLEQ0M8fPq5t7p7wEVGBgkKBUD1uYAAR4BEBgKEhb6+fD09PPm5uwOGxohGRQV8NbtAAAoJRULCQYAAQ0OB/vh3eXzEiQoFg4FD+ro8AAAHh/57vn8DQ8JFQP+9ebnAgYWLBII9iYN5/UA/w3k8/Hy+woMAQwPBfnv9vkBFhYB+eoSG/39APoD09j98gn9/P8ECgUIAQULCgoMB/r2EQgOFgD48czW/QPz8Pb79PYB/w4VGBQXFwr18BYX/gMA//nR2QX7+vfo9+TqBhkNCxUhEwoM7g8XJwIAAAAA+PHq7f4EAejZ6PUMGR4sLiAJCwsIBgT4AAAAAP8OEBkpHQz/EAcMAOcFBAEpCAUF+fvv/AAAAAAAChQcFQr/M1ZGIxgTDgEPQicUFATy9/8AAAAAAAACA//z+RstJjAZCRIYDw8ADwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQMDAQAAAAAAAAAAAAAAAAD+/v39/v/+/P7/AgIDBgIAAAAAAAAAAAD/AAEGAvrx5/f/8ejg9/T7AwIBAAAAAAAAAAoVB/8MGxb74PgRGg4EBwYJ+v4A+PoKAgAAAAAFAgQAEBsgAAYCBAMWFBcOARERIRUcHQUAAAABEP/yDQsYHg3x5OgBCBwfDgD19QP4BgkFAAAAAuj+CBUiFxMH/vjy/hMYD//46+33/AMHDQEAAAHQBA8RChgH/PH9/AQHEBIB+e/69/b/ChMECAP63/v7AQoUD/348/oCChMe/frz+PEJDRMG+gIB7NHg7vEEDAwC/fH/+gcRCvbw/wL2EBQaAukAAOrW3wAECw7/BfTx7e7y//n9//H3/BUeCvrqAQbk3N31+gIGAAT86vvp9fsCAPr4BwcUD/4R+QAF/gXV9QgNBggGCwj47u/5CAANCAkAHR39D/oAAP8C9eoEDhAKCQUM//Hy//r/DQYbDBwpCwoGAAAA6/D7FAEICQYAEAL/9QT89vUGDgsQHCT7/gABA/zt/QwXBPf49gQAAv799QH6+wEPGyc3AvkAABMQ/gUUHBsD9vLz+gkGBf3x9wcLHiIgLAD5AAANGgb8FRYkEPrz/wD0Bff2BAT8CxoPC+/i/f8BEBoJCxwWEQMG8PT7+vz+6Ovz/QICCAj35wAAAhcaAwILEwcPBP8D//j9/eno+AYLBg0G+PIAAAIMEgD7DQYG/QQBA/ryAf769wISCgIA/wTzAAAB//Xs/Qb3/gAI/PH4+AoD/AQKDAgHAwoVJwsAAP8K+vYH/P36AhIHBgAJ//4FBP8UBgvzAgECAAAAFhgF+QUNEhQDCwEABQsBFw4HDwz/5ff+/wAA+A/+BxcOBw0IExMGGRIRCRQHBPLz9ef0AP8AAP0FBOr/+PoH/gsJDg8pDQke+f72+gT88P4AAAAAAQHr8AUD/vICEgz9EBEHAeHu3fH+7u/+AAAAAAAA/vz8+fXw9w388xgmCdnj9eTv/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxMaEhYXFPnw8Pv/AAAAAAAAAAAAAAAAAQHy4tr+FScdBRoWJAkF+OMAAQEBAAAAAAMB/AsY/+7nCgT48uT+Dv/q6+Xj2fQBAQAAAAALBPwJ9/Tz8vn9Afju8Ovj8ubU4b7QAgUBAAAA/QMP/+oM/AUBBhAW/fQABQby0M3RoNcE/P8AAPQzEvkB8ez3AQ/+Bf4EChAH/dfVyrfaFfr3AAD9MQX18vfuCQoGDvf7AhEQA/Xl2uP3ARsa/QAA+RHY7vTv+/8F+PsFAiEaEvzjxMwJFQ0cHAEAAOr+4e0LAe358vrzARMwPCH9z7HGBBIdJDcaAADsCfL5/Pfz5vYA+wUpPCsX57Cs5BMlDy0mHgAA7AgS8/Hw+AYA+QUYJi4N6L231PUjMR8nIRMAAPXoC/r//Pv5DPr9DiAL9tzF1vgQKicdJRAM/wD94fALFRb8AgMABAMUCAXz5u4PICMBBB4QBP0A6evoAQkI+A35BPgJFf0E+fMUJCYkDAb7Dwf/ANrb7wUJ+/r/+AP8BQgFAvkNEicZIAkT+ikBAADt6OYABPr+DgP9/gYX+vP3CQr/Avz5COsS8gAA8+D0//zw8Af1+PsVCPb1/P8F9vf9Awv8DfoAAOvSCAfu9vz96vb0Bfz1/f4BBPr18QgG6gwFAP7q4QQE9gL5/Pfz9Pn36/b9Bv8D/QEQAfsbBP/68/Hq/wME+wP7+fUBAPUCBv4B/wz8DQ78IwIA/gsK+/MBDAH/BwL59/8LDvv6+PgJDAUD9e//AAAKHxHyBQcCCgsDBvwCA/sADgoMAgoQLh8H/wAAAQL7/AERCBf8DA0AAwwCDAUK9vMPEkAkDAEAAADuDA4FFgoB/gn7CADxCw0LHPULERgmEQIBAAAA/jU3DAT28OPi9hUC6O35GRb+2Nn0BwEDAAAAAAAYHAH0ARQJ2MPf9vEBBRAU6Nz5FRENAwAAAAAAAAACAgEHBOzp//UAAwotGv7+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAQEAAAAA/v3+/v39AAAAAAAAAAAAAAEB9fbz6+7n3ubk6/gCAfj4+///AAAAAAAA+fD7A/rc29v7EP8GE/LR4fjf1fgCAgAAAAAA//PvBhMV++n16fPx5fD45vH97OHw/BAMAQAAAPvm+QMCDQYB8/3v7N3a7d/l6fTq6+QEFwgAAAEHA/LkBBUVCv8B/gcD+/gF+OX8AP3sDhsD/wABDQ7w3/QOBREJDhMLBwT17/Dj4v4I5un+AQAA/v/z+QIBCAAVGBwaHA/+/Oz2+u34/eDX1ggFAAEDAwgJBwUICwkeEg8AA//6AAb89frw2rYCDwAB+wIF/g8DBf8EBf4CAQIPChINC/wOEerIAQ4AAPr9FRkK+fz96+/6/wMAAwUDCRQCERjlu/0EAAD48yYRAu3v6Ofm9AANA/kI9/sE+REg8d0AAgAA/O4SEvzj4Pr0BAcJGAcICgLs+QoMHAT6GAX/ARYODQb36erzAgcSGxcV//r8BPsDFSYI6wT/AAMe/wT89Ob6/AMHFxgTCgILDwcOGg4Z7eUGAQAC/+32Dwv1APfz+voB/gAACxIOBQn9++rh8wAAAen0+wYRB/Dt8end2/j+AwATEwMO/f/d8xYAAQDt+xIPAwUABf7q7ufi8f4PCA0B/vX90gEbAP765Ov+DAAFFhsc+uf1+Pv6//oCA//58dsKGAD89eTf7/sRDxcXCP34/fHx//36Bfr5APzo/goA/vj02v8LAQz+CxMNEADs9/zxBQb5Agv6Cfjo/gAABNzy/fwC+PP6///98fH5BAgMCg31CC8J/P4AAAMC7gECBgb+AwXz+uju/QUOCAYL/R1BKAIAAAAB//Dw7fX77Pj98f3m5BQVFwgCCwkIJRf9AAAAAO7k9eoE+fL5BAYX8/UaFAslE/gF/QwP/wAAAAD38fH0BiUuOCf/Gw7+CRwfJxgVAu8NDwIAAAAAAAABAgQIBfjt6/sG/On1Hg4HEAoBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//39/f78+/j5AAEAAAAAAAAAAAAAAP8CAQsJEPLkByP4w7jn5fQkOzUP/v4AAAAAAOLR6uHp6u/m9wUO/t7b6vn8Eh1BOxze6P4AAAHn/O3299Kx0AMhFQP77ujc9RYNFBv/zN77AAAF4wn6A+ja7AsA8/MCIBgSA/D8+PP09tvm9AAABQT94+DW4fsF8vvo+hoSCvbs9vYIBPrhx+UAAADg6OXl6fYN+P767O8GERQWCv0HC/8G6tvkAAIW/uLn9PDvBQEGAvkEEAcbDRwGBwsDBP/9/gD/FQLh3Ozr7gwF7v37CBYSAAcJFREbFhMSFhIAAP3h1Nri6+8F4eftAREYAvz1Bw4FCRAeAAkNAADm5cjP4/X6+d7s/A4aC/b5+u71CAwPNxki+AAA8RfQ0+Px9ATy/fsCAwEH++f0+vQHGzUBKBUAAPr72ej67PQQBA0RDvsNC/YB7/Py/xQmCx8LAP/36uYQEQMBDBwNEPfy/AwD9fD1DQUFGfgHAAAA9dXdABQKERgqE/De7gMI+Pn3BBMNAvva8AMAAOzN0PwRHxMrJgzg4/z5++TvAP8LFg4A+gULAADfwv0KCSYgKwPUzeT+7eb29/0BARIkLSEI//8A2tcTGhokJSjmvrHo7+rw6vj8CwwSJDAd9QEBB9n+HQUPFRQa7sXK5fP49Pz9BBUaJycfAOsAAhX8LQn8BgwSHgnp8vn6+ff7AQoPEhQOD+nrAAEJBToF+gUHCxIK/PDs7vn//O/+DhAL+fDY/AAAAPgI//wF/wQCEATy8/jw7u/o8xQJ79vA3OkAAAD+3gsPCQcDCv/8BhABCfHg4/n64uTZvNzzAAAA/+UHPy8bHB8dFRUbICQJ5fEB6t/j7fYLAQAAAAAB4A4YGzZLNxr+0PAL+OMRIQ376/sCBAAAAAAA/ObKz+oIHhsC7AMXIAICEQ8JDP///AAAAAAAAAAA8+rk4vUPAB4lICAM8fH//BENAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+/v8AAAAAAAAAAAAAAAAA/vz17eLk8fL5/vz8//7/AAAAAAAAAAAA//ru49oL6b3aCRj67f/h6QAO//8AAAAAAAD78fDMxri85ejr9xIaBhgmDhYPHiH59AMAAAD+9QQN7e/U3fIL/O7rBQgUEAUC9xgi/efz9QAA9ePyA/Ps5uj5DwMBDgcNERUBCQcFBfL/7tcAAQ7+BhUSB/DzAhQGAwT/8fgC8gYABRkW/gTeAAAbDAsJD/L1Av3/AQcM/vL2DvwBDAseEAAt9AD+/vjzBhX39uz08AARDwX9AADq6fb/Bfb9WRIA/uz59QwKAPr74/UDGRwPDQP6+/oL6v8CGC0YAP/l//wUBgn36Ozm7QwcDQ0LBRUUCO8TIhogFv7jHQ0HGAkWBv8D3cXpBgsMDAwYEAIBEwEEG/7/6zMM/iEaJg4KAduzyeDu9v4ADQ0SChIN7+jnAAIT9ggoJhwlHhH0ysrc8PDt6fgF/gH1A+/Y+gD+AOgADh0XISMsC+Pt6O31/Obz//j0AfjLxfkA/RL5AQb7EBQsQywJ/vIACwv07PnxDB4B5vnqAAAb887o6foLJDQwNREQAwUH/QX19QcH9Pnw6gAACeenzuLw+xgSLCs1FwTzBQ4WAgwL9vjW4PcA/wHfhtHb4OnzARgTKhwC8vzuAwERAP/14fP/AP/7x6Dh6+fd3+Li7wgFCfXt7wgOBwf3/O4BAgAABd7M7gP65tjGvN7+Ag4E+vYPBAf9CSMJGAUAAAju2/oRCfHy6enr9/0E7gQB+vwPDxglEfPsAP8F8Q4AJhD4EyEa/vrz7vjz+/X+ExgbGhIH/gAAAwEaAgsQHw4WCQDu8e32AQUJHQkSIgMSCP8AAAMWGAIQ/AT4BgoHGAz69QP9/QD9EhPm6Pj/AAACGhoYDfHw/wsE9SH++eoNLR8Z/RYA9e38AAAAABgiJiMA+/cDFxsdEfQEKSYOCO/i6/H0/wAAAAAA/wD/BhUE2+QZBwP49vzv6QHf4gQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMGCAcAAAAAAAAAAAAAAAAAAAAAAQj55MzL3+/6Bfz0DxAOFgIAAAAAAAAAAAAAAPL68QMMBwrp3+Dk4dXe2d3U4AIOCQAAAAAAAAEC8gcZFwgAAvoB7OLn6uS9we8tJ/bz9wAAAAMWHgMN/AwJDAX09fT+CgkQ+/H8Dy4C8fMAAAAJHAsOExEKDBUE/xAPDgkOCPDm7wcTCff6/AD/BQ4ZIiH/CAP8AxclHQQD+/ft/PTt8O7i4fkA/vUHHR0PAQMDDQwiIhUDBw30/AIA8PHkz9L4AP/97BwbEwIHEw0ZEBAGBBITFPf5Bvbv+vDX8QAA8/gFCfwBFA0I+QP9AA8TFR4F+QbyBx4W9/sA/+L8A/fzBAMM9ALy6vX6Dh0TEQH7BgwiLAkBAP/7FAvnAwcG/Pnz8fv88/z/BQ8MFwTx/BDx+gD++TH73fD9BgX89en2//Xu9vQBEg3t9/L05fkA/vEe+tjyBPL1+Pf9AvT94uXyAxEQ6QYG8QEAAP/6+vIA/Pzv8f8BBwUE+OXX6fP/EfcFAvTgAAACCAEB/fTs8vUKFBIS8fPk3fX/9QQIDQTr7P8AAQYW/e/wAffs8vcHA+Pr6en++Qj9EPv43PAAAAAIGvfo7PX49fv4AuLm8vb4/RIKEh8NBgAiBQAADxL57uz9BP7v7enw6gQRDA8QIiIXBgkjJgQAAA4CDfX5AAH8A/Xr9fv9EQkNIBoJEPT5IvwAAAAGFhj53vf38QT9AhIPDAQGEQcCAufW5wwFAwAAABccFvPz/P4E/AkQEhASEQcJAejd3dPj/QMAAAAlDxEGDBAJFhYiJBgTEREKAfbe6wX87/8AAADtHBDxDhonFBcSIxkDCPcO8uHo6PH0Cw0GAAAA+Q0PFhUSDf8I/gME6vwEAOvh7+f66/P8BAAAAAADEwwUCg4GFRMNCQMJBhMICPne3Ozv9f8AAAAAAAAA///58OXb+ur8JBXx9PX67/QBAAAAAAAAAAAAAAAAAAAAAAD/AAAAAAAA//z7/gAAAAAAAAAAAAAAAAAA8fIMHBsEAQQB/P359v0AAAAAAAAAAAAAAAEDBPP9DQEiHBwhKxb69fH1+f0AAAAA/QgSEAjv6dbZ6vQIEBoV3MvdBAsVKjEN/gAAAPUNGhAD8PHJyN77/BQjG/3l7wsKDBwl/fz+AAD1ER0Q3srv4tnS4N34/QXu8/UMAP30BuP19gAC9PrgwLzE1NzezMDLz9Dl+/7x5fXr8/j46fEAAPL53LrD3tbZ08zE0tbm5+P49fXp3/YGCgj4/Pv3/f3i8vjt4N/k2t/l6/XtBvoBCe4EFBQbBf/8CAwSDxEC6/T/BQcD9Pv/8vcFCPkB9AYZ8RwA/h0MICcZGvv6Dh4sIAH9B/EAA/r0/fcNJ+weAAAlARckHhL8BREoOx4WGv/6Dffi+OvqBzj1FgABCQoZJBwSDxYXNCUNEwz6BwX85vj2Av4/IyMAAAIJCRUR9fUGCigcEAYT/gQRBe8BARUVRjcaAPgPEPsA/uLc6wUVFvoLBPUCEhX89QcWEDE5CgDyEAP2/u/z9ugABQEMBAUD+QMR+Qf6BgodHhAA+vn69PftAgUBCgYIDBgUCv78AggD6O0EESUNAAQRA/vr+AEDDRYMEw8OCAcM+vf68/zzDh8dAAQPIxz86+/l6f0QBgoPCP4FBfr87fH4AQ0UAQABEjIW4dno7eT6BfT/BwMH9vwEAebt+O/w6fIAAw8ZD9jV6Ozm9QDzBwsI/gIQCwT7AxYM8Pn4AAEGBRTq797d5uz2//z5+fwD9wD98AQO+u70/gAAAAD06fDs3+nt6ujs6fgIBPv3Au7k59jk6P4AAAAABPYa/fvw9/P33uXwAgYHBAz74M3D09/0AAAAACJCWioREeTd4d3k5dzV+AMD8MrNu9Xa7wAAAAAoZnJIGOLc6wcEAvnb3u7k09/f/9Dg5fcAAAAAG1FwXRn5/hs1Qgji5tEA+eznCxkAAAAAAAAAAAAMFhcNDhsmKDY5KAjvDg38+QIEAAAAAAAAAAAAAAAAAAAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAADEhwhEQj9B/0BB///AAAAAAAAAAAAAAD+/wD07/oJGkA3HRUKFv7h6uP6AQEBAAAAAAL07Pn4/AwMDhQaF/Pn8/nd6/Tlv+on8/b/AAAIAAX01fT9A/vvCgPz7+DZ6eXf7d/dBAgNAgAABPoB48r3/wb+EAwZ//wEBAPz9PH19P4VIgIAAPc1HP/08PAC9gkHDvsGAgv7AuX06uH1DQPzAAL+Phn+FAP7/wH8AADz+gYSAgHw2NbiFBIQ9gUD/kIJ+BMF+fgD+v0EBBYfJBj82r+87hgSBvQBAv0r8gAM/vHz/vUBChQjKzoiAdCpvuMBDPDvAAECPgb59Ors8wEG/wEfJyM4HvS4rMjI6xYD9wAA/y8d6drl8/4KAv4LExYjFfbPvafP3QEkDv4AAAMRGvrj7fQCGP0MDBMQHRHtvb/R8v0hKxf+/wAMCBwK8gD8EBIGAfkGExwV7Mve/xkaDRQcBf4A9P0IBfkIExP/BPv5AQ0KB+vs8AsfGhgUMwn/AdbyAvACEwsSAPT5BgMB/AD28xAPIAUKEz8FAAD26P3jEg4B9/P0Agr/B/j78/4LCAcIDBo+BAD/+9MA5/788/LtAg0SFhkG/fQDCgUDDh4eGwb/+uTS/PT3BvLo7P4LCQv6APn/DRAH/RIfMAQFAQPk8gL7+/jo8/cI/AYA8f/+DRD++QIA7QQQAwIU6fv+BRAQ6+70BAkD/AUMCQoLAwvz9/TzG/8CCQ02GAYGDfPn6/X+ABAHAfj6DQ0B+fLZ+gj/AAAXKg/49Pz7/fr4BQUJCPv+EQkJA/jv8RUIAAAADB3o0tHm/BABDw8bA/wECBII+Qf+7PUJBQEAAAEMGuvTzef8+BEFBQP17OcKDAshD+3xBgQAAAAA/ikyGAD8A/P25fz+6/DyDhEMEQXo4P8CAAAAAAADGRgPBgj56NDT5NzQ6//p7/b/6e4AAAAAAAAAAAAAAAT88OXh7dzX0esZEQMOCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCw4CAAAAAAAAAAAAAAAAAPz69/b7+f7+Eh0PBQcVCAAAAAAAAAAAAAEGDvYK/ALg5g4UMDEIESksIBgA/wAAAAAA+uj9Hwjf6hYM/f4C+QYVBxIUGx0RD/oD/gAA//TuAxwA6ufw6e8A/woE/gECBQgTKCERDAIAAP8IAAoV/wP4AP719fMJEw38A/byAwcSBiATAAALHR8ZD/0QDAfz8u0ACw8JExX42eHX9xUuFwAEFxwTB/D7BQb/8+/sBQsDCPj279vN4vkQHgcAABoKJgLh8AEMAuzo8AkWCgro/AHsxuYNDwcAAAAbEiH/BBQE8+ns5PQKGQr86fvs2MHuBfsFBQAAIx0pEx8aA/ju8fYSHhYH/u7u5NDZ/wMH8QcAARApLB8bDfjj8/4GIR4S7u7v9v73/QTeAeIUAAD6NjIfFP3p4fQRGxwbA/D19wAIAhAM4RkeHQAEEiYnEgTu2u8HFxv/AAD2CAgPEgUOCfISFw4AB/ESCwP94uP1DSMf9fn38goOExkVERfh8ff/AAXZ/ffh+Ojj/RokFe3w6PkHCREOGBMO+dbz/AAAAQzp4wQDBAoUEgsGBfEDBAoNCgcXBQHx3fgA/gUaCOr09gQACwMDEf/9EBH5+PENFgbv5uf6/vn8HQPa8/IDAO/z/BgRCw4DAeXt/Q7izMsG///3EQvp6Ozp5eXh2O4EDwQIAf7r7vr45uHx+/7+9xYJ5e/5+O755uTqDQ0CBgcIB/D87uDl6/L+//wfBO0FCf76DPfz+wUIBgYECf/29fHa8fjz/gABE/QFDxgH+gH8CPb19fj4+/f1AubY8hcMAAAAAAf7EhcOAfsEAvsFBQEJ+v8C9OnQ1PoqHwkBAAAWJjgO+/wGCQ8XAP/+/gUJ9fPh5AINHSAKAQAACBAfC/H9+AARCAkeAfjq4vsA08fcAxAQBAAAAAAAAf33KSQYJgboAw369NYEGffb8Pj4/AAAAAAAAAAAAPz7BB0h/BURNyorLSUH+QIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQFAQAAAAAAAAAAAAAAAAD+/gcSJRUODAcCBQUFCAMAAAAAAAAAAAD9AgkYNzkw/gkPCwMNJRsLGw8JAQAAAAAAAP3+Ch/4+wcDHSALBf0HCBMKB/0LJhwHAQAAAAD7CCEpExAQByQpMRf77/f3AAH3+gobBgcBAAAFGR4KFQz9/AAC8uj16fDqAfzw6ff8APoPAwD+CC89ISb98un29wP3/QD6CA0I+vgG+/kUBwIA/ggSIw/+6+He8PL9/AD89/P1/PkO/O3pHhD2BgX79wsC7fL46fID++348wD8AvkBAgjx8w4b+QEC7/X4/fwF9+zv/PDv7fMHCP/89wAB5e376ecAAfIc/QgQCv/2BPT69u7yBQ0P7ubx7eHzAO/kAADcJQ8NDgwM/Prw8Pb2Af79Cff7BvjxEAT08AD/5BQKIxsNB/Ly8f8LA/v7+/3+/QD0ARbwCu8A/ecWBBYcFQz+/P0OFRwEBP0EBvb+FhYV6R8EAP7UEvcPGgoFAv4FExsYDAT+Cgj2+gwNBhY0BwD+xf/f9gQQ/Pn0AiEiJAYEAAMI/BINEAoP8RIAAPEO6vEHEgIA+v4NJSYCBgMEEQYUIRIb+QsSAAD3DO3zAhYQ+fX8DRoKCP8MDAQKCQYF/wn6BgD+/QTyDQEKAfH2Af4KCxgcGAoFCAIA++0T5gD/+QAOCw8GCPXy/P3/BBIaGR0IBwwQBeXj/+kC/vgaKgL++P369v8FBAENBhAMDgoTC+3W0PPnAf8AKVIQ9P//+/4ABAQGDwYTGgsRAP3Y2cwDIg8AAA1JF/z3/v8C/AoFAfgK/vsA8PX84trYAwQBAAACFQzv8P3y8vLt+uLk4+nh2ebd5dvN0AAFAAAAAQz45+Lr6s/Sz93MxMTNvMLLz+DSyesZCAAAAAAGAd7S3OTI0N77wq270NTa4d/v2e0JDQQAAAAAAAD27+ze6eDY3sjJxeoNAuHP5Pr/AAAAAAAAAAAA+fb7APwDCAMBAAMYGA0A9f0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEEBQEAAAAAAAAAAAAAAAAA/vPj7vcA+//69gD8+wQDAAAAAAAAAAD9AAAAAAP/DBMFBwsM+vIQ//wBBQMBAAAAAP/m0PUF9N/jAAodHx3/FP/+Aw3zAhEWCwkAAAD74vLy+Pn9/A70+AcbAREdAPz/4e3v8iMXAwAA+cwC8voDEQjp7wEC8f0G//Pi5+ns+PoPEw0AAPbt7erp/vz35vQI/v//CQ4HBPD27/Pt7P0VAAL27+Xj7/r//f0QFwX7+fYCEwT+Avn0APzuDAD/Avr39QEAEvwCDgv05er3BhIXDAjz4fv+AwsA/xEY+gEFBAECBA0E5+Pu+AcUJRL68eoFFP0FAP4AIxIDChgMAwr5/+nv7wUfHRMOA+fi+fPz+gD+/xMNCAQVBggA8u0A7OkJHycfFBDt2uff+wcA/wQPEhgNAAb+CPX3+fMIDBMRFQMI/N/K1+UD/wAHFADzBgQEBgT2/gYNFyARHBr7CRDguvD2Af7/ERvW0OgMAfHz/QsYBhwQBwIS/PwA4OII+QD//yga29Le6/Ly8/0OChQVBPr/CP/2AuvnBgMAAAEk9u719fL0AwkGCAUCC+75/QT/+PHq9BsDAQADDOn0+u7x9fsHAwsCDQHu7/MB9vvs6O4OCAAACwUIAgDz/gkNCf77BhoGCwEDAfPx+Pf/9g4BAAwADAf7/gb3BwL5AAkJEf368wT6AfP7+PMDAv8C9/AB/Pb0/fv9+vX/CAP08fb8AAIHBffn/wMA/v7SAxMDAAML+Qb7+gPw4ObsAgUAAwUUAPEDAP8J1eX4//kJCQMKCQT6+un4AvkA/vkFDAr8AQAADPHw/fPw++8IBf/3APgJBvr29vj9CBkL+v8AAAEQLQLv+gPt/wf/ChcWIxQW/QAC/QAICP3/AAAACiQa5Njt6hMSChoo//gDCvn0/PT1/Q0BAAAAAAUiJhP8/AgGCgwZIPfwDRgWDw8C8woWAwAAAAAAAgH/BA4P+evk5wrk3vMnExAZDwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9/UAAAAAAAAAAAAAAAAAAAEDBAH///8BBAL3/PHw+gAAAAAAAAAAAP/249W5w8jh/gHsvdMRCM3K2O39AAAAAAAAAwQK4cfWy8XDwOEF8Mjm9fj09wH42OHw/wAAAAD638W9s8rV8PzuAg4JCwcC/gcPDgHv4+4AAADyA/7d2dDg+/4B/vj7/xMGAwAPBAX9BODbAAD94w4H+Pfy6/Lx7vn16O/n8ez19AUFFgwO7wD8/e0EB/r39gL+8Njt7gH2BwgCCAYEAQ0DLxIA//oEEvz77vQC9/Xj6wEIEhIL/wIJCPcAMicIAP/z9+MA+/75C/L57u/tAwgUA/sHBfry/Coj+AAA9ufjFwj+CxUA+vTe7/QJA/f+BQgC+PciNwUAAP7N7xUeHxwcCRD78PgIAwT8AgMKA/vsCEMPAAL+2e8OEiQjGCEjGQb09QP39gwXCxcLAxsr/QAD8uL9HRYhIxsvNCgL+f8AAukJIx0aDxQIHPoAA+zmDh0YJCsjNCEbGhb8CwIA/iAMGhId8f3+AAP3DgsA+g0NDyIpJxUCAAANBPsMCg8TExcT/gAAAADl4OPx8/wBDRoNDQD+/fYH+vX7Awst8PMA//Tb3tzc2dPY1fH18PP4/PkC+AHu+P0RFN/5//zysejmzMzRydXR2ent5/H79/b46foOB//iAQD98bL2BOHm5eb0+/z39/nu9PL1+Pr4CgEb/wEAAPWkzQIQDPDyAxITBv0DCfj66voEBQP+HgoBAAD3scnwChj6AAYNBg8I/fr9/vjzA/gIChcMAAAA++ze7QQFB/cKCgcOBgH98v39AxEJFBYFAgAAAP4L5foB8f/59/kDBwTt5+j19PUIHiIY/gEAAAAAEPz6/fb/BRIeFg4H++T1/eT4ETAfE/sAAAAAAPLk1OnnAA4SChYREg/tDhQADiIdGg3z/gAAAAD00cnG5/UD//weGRMbIBgS9A72/Az67/4AAAAAAPz8+v35/wQFFOPuCxD619745OkAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAQQFAQAAAAAAAAAAAAAAAP/4+/z16OntAAMFBQYLDAMAAAAAAAAAAAAAAPcBAwcfGg0QBuzp4vkHDwf+/P8AAAAAAAD/9OP7HyodLDUrLxkH5+bx+hkd+ugIBAAAAAAA//kC5vIDCREgFgXy5dri+w8cOSgWD/7+AAAA8vD079/yFiYKBv/04u7p/gcJEB0gEf7n9AAAANHS8dnl9hAWJB8G5tra7P8PGgYPEQECBf0AAfzF0+zV4xQULSgdBevZ5foDEw0BAfr4ERMMAAIC2dW81OQCBBYeGgbf1OsJFw4UCfQHGRjz8gABCAffvLnm7wcLFxUB4NvlDxYC+PDo7g0K59QAAQUC993F6e/9ABYg+97a8AMJ/ebi8+zr4uDeAhvn9Pjy5/3y7PQVHQX18v8SDfPo9Pv25d3i6wIU/Rr8CPsI4uv7BCgb/v4GAA/+7QEQDQfg5OIBBRYpDwnz8fn1+Q4VC/D5BQAGCwsbIhgKzdXrAgjuGhcFCQMA/PwDFgnz9vgKFBAjLS8qEMzL9wAG4xkUCAn++/EHDhH+/Oj5DAwGEBASGwLj2u4AARAdBvwA/wsAAg4NEAHx+u/z/g8E/gsFCur6AAD/AQsC/v0IBgEOCQoC8/jh7/bu+vDv+Arb+AD/9eP8CQv97/EJEgr2/P/p7+378OLF1wUA+wAAAPnt/g7/8vv7DRIE9/nt7fT99/f2zLvq7QMAAAAO+e76A/X1CQsOEwEE/QAGCQ8B9NTK7e8CAAAAC/jj7PPr7QQKEggFCgf+DxAOAP307vb5AAAAAAAC++/n8O0AARYJ/hAKBBb/+vcG9f36/AAAAAD/FRwU5N/k7/8OExMRFhgTAvsBBev7/v0CAAAA/xQD6Ozm6Ons7fsPIw8RDwXw7wYQDQcCAAAAAP8A6dPjAwX36vADCQf09/oR/On1/QQDAAAAAAAAAAD99xQeEgkABvv/5AYJAtbLxc7zAAAAAAAAAAAAAAD67tDR4PEB/hUsEe707d/uAAAAAAA=',
  b1: [-0.0982699990272522, -0.03472999855875969, -0.16389000415802002, 0.11206000298261642, -0.0251499991863966, -0.08709999918937683, 0.21595999598503113, -0.08019000291824341, -0.17493000626564026, 0.04478999972343445, -0.00791999977082014, 0.08739999681711197, 0.11524999886751175, 0.00749000022187829, -0.04913000017404556, 0.0471699982881546, -0.13200999796390533, -0.08020000159740448, -0.11488000303506851, -0.06821999698877335, -0.06074000149965286, -0.23983000218868256, 0.13755999505519867, 0.058889999985694885, -0.06176000088453293, 0.08682999759912491, 0.01425000000745058, -0.10515999794006348, 0.1293099969625473, -0.07315000146627426, 0.16075000166893005, -0.12730999290943146, 0.02566000074148178, 0.016680000349879265, -0.058729998767375946, -0.1252100020647049, 0.07546000182628632, 0.07912000268697739, 0.048820000141859055, -0.02466999925673008, 0.06171000003814697, -0.12018000334501266, 0.037780001759529114, 0.1404999941587448, -0.11062999814748764, 0.02944999933242798, 0.06222999840974808, -0.10450000315904617, 0.013559999875724316, -0.2134999930858612, 0.08845999836921692, -0.04743000119924545, 0.08596999943256378, 0.24060000479221344, 0.05200999975204468, 0.07291000336408615, 0.1649799942970276, 0.06503999978303909, -0.014600000344216824, -0.10847000032663345, -0.026979999616742134, 0.03595000132918358, -0.009589999914169312, -0.020099999383091927, -0.20962999761104584, 0.32273000478744507, -0.12680000066757202, 0.06384000182151794, -0.04157000035047531, -0.12598000466823578, 0.1887200027704239, -0.15347999334335327, -0.07129000127315521, 0.11649999767541885, 0.2394700050354004, -0.08585000038146973, -0.1228799968957901, 0.11125999689102173, 0.3591099977493286, -0.23023000359535217, 0.14726999402046204, -0.004600000102072954, -0.020080000162124634, 0.24567000567913055, -0.03156000003218651, 0.11954999715089798, 0.011789999902248383, 0.10918000340461731, 0.1027199998497963, 0.43939000368118286, 0.03796999901533127, 0.25080999732017517, -0.07648999989032745, 0.11062999814748764, -0.05423000082373619, -0.07977999746799469, -0.0771000012755394, 0.1261100023984909, 0.0522099994122982, 0.05917000025510788, 0.11764000356197357, -0.20146000385284424, -0.07182999700307846, 0.05584999918937683, 0.3578299880027771, -0.15449999272823334, -0.1860799938440323, -0.10790999978780746, 0.06323999911546707, 0.33507999777793884, 0.13922999799251556, -0.06855999678373337, 0.14614999294281006, 0.16539999842643738, -0.048909999430179596, 0.11710000038146973, 0.08393000066280365, 0.1173200011253357, -0.11125999689102173, 0.08771999925374985, -0.018549999222159386, -0.025129999965429306, -0.045249998569488525, -0.11984000355005264, 0.0018599999602884054, 0.0013599999947473407, 0.31512999534606934, 0.004519999958574772],
  w2: 'EusK5eIH0OEBCPre+hLcCvUIFwIS+PL6Kev3/wPWGwHJDhEf6ffz+Rbl7wim/xEUHxct9PsF+hP28wbNuOoPCg0a6hYD1y8QzRf74xz69A7xDwf+Eu0S3Bv3BwXWEgAIB9MIA+UDthoEBs/EuR4C4Ar2GQLc0CPLIgsIAgYHtwgE8ezyGvfZ17Xt9cb27PsJDAH+Ic8P8wPI+APs0OEPFAn5rgM1BzENGgkPFtsd+rXpI94Q6zIEFggQy+M4EOr/CSYb6/oZvtoGxibX0BL/3Qzs8vUAKArOKQUcCvrVAf7j1RAT3/0J3+MSFyXtQvH7BQvG9R0VFsTIpxQRDusIEwcXEhQWDikTA/8t9dvMGyUi89TdDxv7/CTC9uft2fsV3AnWGOD9EwcmBQz++w3uEvwRHv4Xt/EBBQf/GS/DBODg4QgTDyj5FSoH8hIEBg8RChT7Hg8TAAzYKAjx8QkADA2eHQ0IEwP+1xPd+EDu7eWu8c35BfABzBIODewPAO3l/BksDqjq3iS/5tLI8+btDuroI+8DEQkGAfoHASgIHdcJ/gTp7tsV/gILD8kO0wTrGw/yAhdEAv0KAxX04BbiFCTxHugLFgAfINnxKhsD5g8K8AvbBuwSDQL32cQU/gDEGyHdAukRDuwR8QwaAPsD6e/wCPodEtIYFgMFJAoS6ua02b/yKwgU9hsGKCUYHODcCPLoCPjiEgzd9BMNy/7yCwy9Ke0EFjwC8g8LI6MLGgnHx8nsFxv34BQHB9AACyLt6RYUCJX2CsXOKfzmrQ0A5goH3+cOEN8R1Pbt+BILABgmEe3qEwjPndfgESn+2RAJ7hftCSDx0RLTyxP65AcjLAYU/QsbxvDzEA/PERj47BLPAAEYChP6788k/PIrE8Qf7QwF2w7q2vAO/QLZMt75DxHa4vISvwUHCv/tNOfqGw8Y8sgKAAoV3erkF/UEEgMbBO4L3gni+sUFEe0aEvwA3RQMCvkQ3BsPJdcZ9Bcb/gcu+RAJtfjdJRz2xegOziwX6/8SyBEKJMP3DvYaGB8r99HvA/EQ1uTC9hEHCBAT7+b/DxMB6AnJCP0BDw0BBeYUHvMaC8IXEP4I8c4F9vwS0A4zyxbsvNj9uve2DvXdC7QMBuwIDwrl+greEBHP9QAu6/wgzx/7HBr8F+zzBBIB8yrgHwXN8R7Z8+jZIBISqQgLtAraEBkLBdu+L/AC+ivKExL/9f7h+AH07AAb3ur0E+0H7vwdHB3t6BL0Eh37AdfQIfkU5xsC3Ov4DxQo9PcC4x4ADxYw2BMpBRfg3grLG+y//wnpDxwS+uPE4fsTAA8L0/YJDgseDPfj2iAYLu8b9AcT4hEJ9t7yLgQg7gIA6fUI0SjwEb71LvAHEAb61gsD1/D8Ce8CBxgKAu8X6uTYEwcJ4tr55gbDCg7y3SoNEAf1DAwC2A4ODBcF+yb8CCAH+/bR/eIXBRTJ6fcK/gTuDvULMA4exRgB3vERBgoALeEeBREACfAIHgbh5hHBCPjpAfgDAfU4Me0f/9YPBv8M7QTGA/IIAjoTFdsVAf+1thkJABr6OA4UJfgB/MoRGAMS6Aj69xDTDeDmCBYJxvoSCvIa/vbbAvwM4RgT0hLgBuLLGBLxgRQWsB8RCwgMKRP04wwF75n4Ffk+CiL6Cv/I1wrKFw361h/wAyTZzOb/+w4TBOj1Dr4QChX30ckLD68=',
  b2: [-0.21318000555038452, 0.032669998705387115, -0.07742000371217728, 0.06210000067949295, 0.3040800094604492, 0.32074999809265137, 0.04185999929904938, 0.022439999505877495, -0.026319999247789383, -0.17303000390529633]
};

let DIGIT_W = null;
function digitWeights() {
  if (DIGIT_W) return DIGIT_W;
  const dec = (b64) => { const bin = atob(b64); const a = new Int8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = (bin.charCodeAt(i) << 24) >> 24; return a; };
  DIGIT_W = { w1: dec(DIGIT_NET.w1), w2: dec(DIGIT_NET.w2) };
  return DIGIT_W;
}

// Bild aus dem Schreibfeld → 28×28 wie bei MNIST (längste Seite 20 px, nach Schwerpunkt zentriert) → Ziffer.
// Gibt es den Schreibweg (strokes), wird die Ziffer daraus neu gezeichnet – immer mit gleich dünnem Strich,
// egal wie groß das Kind schreibt. Vorher wurde das Bild nur verkleinert: Kleine Ziffern bekamen dadurch einen sehr
// dicken Strich, Schleifen liefen zu, und aus 6, 8 oder 9 wurde z. B. eine 5 oder 3 (gefunden am 11.10.2026).
const DIGIT_LW = 2.4; // Strichbreite im 28×28-Bild (wie bei MNIST)
function recognizeDigit(canvas, strokes) {
  const pts = strokes ? strokes.flat() : [];
  let mid, dw, dh;
  if (pts.length) {
    const xs = pts.map(q => q.x), ys = pts.map(q => q.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const bw = Math.max(...xs) - minX, bh = Math.max(...ys) - minY;
    const sc = (20 - DIGIT_LW) / Math.max(bw, bh, 1);
    dw = bw * sc + DIGIT_LW; dh = bh * sc + DIGIT_LW;
    const k = 4; // vierfach größer zeichnen, dann glatt verkleinern
    mid = document.createElement('canvas'); mid.width = Math.max(1, Math.round(dw * k)); mid.height = Math.max(1, Math.round(dh * k));
    const mc = mid.getContext('2d');
    mc.strokeStyle = '#000'; mc.fillStyle = '#000'; mc.lineWidth = DIGIT_LW * k; mc.lineCap = 'round'; mc.lineJoin = 'round';
    const tx = (q) => [((q.x - minX) * sc + DIGIT_LW / 2) * k, ((q.y - minY) * sc + DIGIT_LW / 2) * k];
    for (const st of strokes) {
      if (!st.length) continue;
      mc.beginPath(); const [x0, y0] = tx(st[0]);
      if (st.length === 1) { mc.arc(x0, y0, DIGIT_LW * k / 2, 0, 2 * Math.PI); mc.fill(); continue; }
      mc.moveTo(x0, y0); for (let i = 1; i < st.length; i++) mc.lineTo(...tx(st[i])); mc.stroke();
    }
  } else {
    const w = canvas.width, h = canvas.height;
    const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 40) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    if (maxX < 0) return null;
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const sc = 20 / Math.max(bw, bh);
    dw = bw * sc; dh = bh * sc;
    // in zwei Schritten verkleinern (glatter)
    mid = document.createElement('canvas'); mid.width = Math.max(1, Math.round(dw * 4)); mid.height = Math.max(1, Math.round(dh * 4));
    const mc = mid.getContext('2d'); mc.imageSmoothingEnabled = true; mc.imageSmoothingQuality = 'high';
    mc.drawImage(canvas, minX, minY, bw, bh, 0, 0, mid.width, mid.height);
  }
  const draw = (ox, oy) => {
    const c = document.createElement('canvas'); c.width = 28; c.height = 28;
    const cx = c.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    cx.drawImage(mid, 0, 0, mid.width, mid.height, ox, oy, dw, dh);
    return cx.getImageData(0, 0, 28, 28).data;
  };
  let px = draw((28 - dw) / 2, (28 - dh) / 2);
  let m = 0, mx = 0, my = 0;
  for (let i = 0; i < 784; i++) { const v = px[i * 4 + 3] / 255; m += v; mx += v * (i % 28); my += v * Math.floor(i / 28); }
  if (m > 0) px = draw((28 - dw) / 2 + (13.5 - mx / m), (28 - dh) / 2 + (13.5 - my / m));
  const x = new Float32Array(784);
  for (let i = 0; i < 784; i++) x[i] = Math.min(1, px[i * 4 + 3] / 255);
  const { w1, w2 } = digitWeights();
  const H = DIGIT_NET.hidden;
  const hid = new Float32Array(H);
  for (let j = 0; j < H; j++) {
    let sum = 0; const off = j * 784;
    for (let i = 0; i < 784; i++) if (x[i]) sum += w1[off + i] * x[i];
    hid[j] = Math.max(0, sum * DIGIT_NET.s1 + DIGIT_NET.b1[j]);
  }
  const out = [];
  for (let k = 0; k < 10; k++) { let sum = 0; for (let j = 0; j < H; j++) sum += w2[k * H + j] * hid[j]; out.push(sum * DIGIT_NET.s2 + DIGIT_NET.b2[k]); }
  const mxo = Math.max(...out); const ex = out.map(v => Math.exp(v - mxo)); const tot = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map(v => v / tot);
  const digit = probs.indexOf(Math.max(...probs));
  return { digit, conf: probs[digit], aspect: dh / dw, p1: probs[1], p7: probs[7], probs };
}

// Geschlossene Schleifen zählen (Löcher im Schriftbild). Eine 3 oder 5 hat keine Schleife, eine 8 zwei, eine 9 oben
// eine, eine 6 unten eine. Gezeichnet wird mit etwas dickerem Strich, damit kleine Lücken in der Schleife zugehen.
// Winzige Löcher (z. B. ein Kringel in der Mitte der 3) zählen nicht.
function findLoops(strokes) {
  const pts = strokes.flat(); if (pts.length < 3) return [];
  const xs = pts.map(q => q.x), ys = pts.map(q => q.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const bw = Math.max(...xs) - minX, bh = Math.max(...ys) - minY;
  if (Math.max(bw, bh) < 15) return [];
  const N = 56, LW = 6.5, sc = (N - 12) / Math.max(bw, bh, 1);
  const c = document.createElement('canvas'); c.width = N; c.height = N;
  const cx = c.getContext('2d'); cx.lineWidth = LW; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#000';
  const ox = (N - bw * sc) / 2, oy = (N - bh * sc) / 2;
  for (const st of strokes) {
    if (st.length < 2) continue;
    cx.beginPath(); cx.moveTo(ox + (st[0].x - minX) * sc, oy + (st[0].y - minY) * sc);
    for (const q of st) cx.lineTo(ox + (q.x - minX) * sc, oy + (q.y - minY) * sc);
    cx.stroke();
  }
  const d = cx.getImageData(0, 0, N, N).data;
  const ink = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) ink[i] = d[i * 4 + 3] > 100 ? 1 : 0;
  const seen = new Uint8Array(N * N); const loops = [];
  const minArea = 0.035 * (bw * sc) * (bh * sc);
  for (let i = 0; i < N * N; i++) {
    if (ink[i] || seen[i]) continue;
    const stack = [i]; seen[i] = 1; let area = 0, sy = 0, top = N, bot = 0, edge = false;
    while (stack.length) {
      const k = stack.pop(); const x = k % N, y = (k - x) / N; area++; sy += y; if (y < top) top = y; if (y > bot) bot = y;
      if (x === 0 || y === 0 || x === N - 1 || y === N - 1) edge = true;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const nk = ny * N + nx; if (!ink[nk] && !seen[nk]) { seen[nk] = 1; stack.push(nk); }
      }
    }
    // cy, top, bot: Lage der Schleife, 0 = oben, 1 = unten
    const rel = (v) => (v - oy) / (bh * sc);
    if (!edge && area >= minArea) loops.push({ area, cy: rel(sy / area), top: rel(top), bot: rel(bot) });
  }
  return loops;
}

// Liest das Netz eine 3 oder 5, obwohl das Kind eine Schleife geschlossen hat, war es eine 8, 9 oder 6.
// Liest es eine 0, die Schleife sitzt aber nur unten (bzw. nur oben), war es eine 6 (bzw. 9).
// (Rückmeldung der Lehrkraft, 11.10.2026: 8 und 9 wurden manchmal als 3 gelesen, 6 als 0.)
function refineLoops(r, strokes) {
  if (!r || !r.probs || !strokes || ![0, 1, 3, 5, 7].includes(r.digit)) return r;
  const loops = findLoops(strokes);
  if (!loops.length) return r;
  const P = r.probs; const best = (list) => list.reduce((a, b) => (P[b] > P[a] ? b : a));
  const L = loops[0];
  let digit = null;
  if (r.digit === 1 || r.digit === 7) {
    if (loops.length >= 2) digit = 8;
    else if (L.cy < 0.5) digit = 9;                         // schmale 9: Schleife oben
  } else if (r.digit === 0) {
    if (loops.length === 1 && L.top > 0.3) digit = 6;       // Bogen oben, Schleife unten
    else if (loops.length === 1 && L.bot < 0.7) digit = 9; // Schleife oben, Strich unten
  } else if (loops.length >= 2) digit = 8;
  else if (L.cy < 0.45) digit = best([9, 8]);
  else if (L.cy > 0.55) digit = r.digit === 5 ? 6 : best([6, 8]); // eine 5 mit geschlossenem Bauch ist eine 6
  else if (r.digit === 3) digit = best([8, 0]);
  if (digit === null) return r;
  return { ...r, digit, conf: Math.max(r.conf, 0.85), loops: loops.length };
}

// Die deutsche 1 mit Aufstrich sieht für das Netz (gelernt an amerikanischen Ziffern) oft wie eine 7 aus – und umgekehrt.
// In der Klasse wird die 7 immer mit Querstrich geschrieben (Vorgabe der Lehrkraft, 11.10.2026). Darum entscheidet
// bei 1 oder 7 allein der Querstrich: ein eigener, flacher Strich etwa in der Mitte → 7, sonst → 1.
function refineOneSeven(r, strokes) {
  if (!r || !strokes || !strokes.length || r.loops) return r; // mit Schleife ist es keine 1 oder 7
  if (r.digit !== 1 && r.digit !== 7 && r.p1 + r.p7 < 0.5) return r;
  const all = strokes.flat();
  const ys = all.map(p => p.y);
  const minY = Math.min(...ys), h = Math.max(...ys) - minY;
  if (h < 15) return r;
  const len = (s) => s.reduce((a, p, i) => (i ? a + Math.hypot(p.x - s[i - 1].x, p.y - s[i - 1].y) : 0), 0);
  const main = strokes.reduce((a, s) => (len(s) > len(a) ? s : a), strokes[0]);
  const bar = strokes.some(s => {
    if (s === main || s.length < 2) return false;
    const sx = s.map(p => p.x), sy = s.map(p => p.y);
    const bw = Math.max(...sx) - Math.min(...sx), bh = Math.max(...sy) - Math.min(...sy);
    const cy = (sy.reduce((a, v) => a + v, 0) / sy.length - minY) / h;
    return bw > 0.2 * h && bh < 0.5 * bw && cy > 0.25 && cy < 0.85;
  });
  return { ...r, digit: bar ? 7 : 1, conf: Math.max(r.conf, 0.85), checked: true };
}

// Die deutsche 4 wird mit zwei Strichen geschrieben (Winkel + langer senkrechter Strich). Das Netz liest sie dann
// manchmal als 2 (Rückmeldung der Lehrkraft 27.10.2026). Eine 2 hat nie einen eigenen langen senkrechten Strich –
// gibt es einen, war es eine 4.
function refineVier(r, strokes) {
  if (!r || !strokes || strokes.length < 2 || r.digit !== 2) return r;
  const ys = strokes.flat().map(p => p.y);
  const h = Math.max(...ys) - Math.min(...ys);
  if (h < 15) return r;
  const senkrecht = strokes.some(st => {
    if (st.length < 2) return false;
    const sx = st.map(p => p.x), sy = st.map(p => p.y);
    const bw = Math.max(...sx) - Math.min(...sx), bh = Math.max(...sy) - Math.min(...sy);
    return bh >= 0.5 * h && bw <= 0.35 * bh;
  });
  return senkrecht ? { ...r, digit: 4, conf: Math.max(r.conf, 0.85), checked: true } : r;
}

// Alle Prüfungen nacheinander: Netz (aus dem Schreibweg neu gezeichnet) → Schleifen → 4/2 → 1/7
const erkenneZiffer = (canvas, strokes) => refineOneSeven(refineVier(refineLoops(recognizeDigit(canvas, strokes), strokes), strokes), strokes);

// Ein Schreibfeld für eine Ziffer (Finger, Stift oder Maus).
// side: Lage in der Reihe (left | middle | right | single). Die Felder liegen ohne Abstand nebeneinander,
// damit die Ziffern wie eine Zahl zusammenstehen; Rahmen nur zart in der Stellenwert-Farbe.
function WritePad({ label, color, light, dark, onResult, disabled, resetKey, size = 150, hint = 'Schreib hier eine Ziffer', side = 'single', onStart, ohneRadierer = false }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const timer = useRef(null);
  const strokes = useRef([]); // Schreibweg (für die Unterscheidung 1/7)
  const [res, setRes] = useState(null);
  const SIZE = size;
  const W = Math.round(size * 0.8), H = Math.round(size * 1.25); // schmaler als hoch: Ziffern rücken zusammen
  useEffect(() => {
    const c = ref.current; const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    strokes.current = [];
    setRes(null); onResult && onResult(null);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);
  const pos = (ev) => { const r = ref.current.getBoundingClientRect(); return { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (W / r.width) }; };
  const stroke = (a, b) => {
    const ctx = ref.current.getContext('2d');
    ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = SIZE * 0.087; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  const down = (ev) => { if (disabled) return; ev.preventDefault(); onStart && onStart(); ref.current.setPointerCapture && ref.current.setPointerCapture(ev.pointerId); drawing.current = true; clearTimeout(timer.current); const p = pos(ev); last.current = p; strokes.current.push([p]); stroke(p, { x: p.x + 0.1, y: p.y + 0.1 }); };
  const move = (ev) => { if (!drawing.current) return; const p = pos(ev); stroke(last.current, p); last.current = p; strokes.current[strokes.current.length - 1].push(p); };
  const up = () => {
    if (!drawing.current) return; drawing.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { const r = erkenneZiffer(ref.current, strokes.current); setRes(r); onResult && onResult(r); }, 450);
  };
  const clear = () => {
    const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); strokes.current = []; setRes(null); onResult && onResult(null);
  };
  const unsure = res && res.conf < 0.6;
  const soft = `${color}59`; // Stellenwert-Farbe, ca. 35 % deckend
  const r = 18;
  const radius = { left: `${r}px 0 0 ${r}px`, right: `0 ${r}px ${r}px 0`, middle: '0', single: `${r}px` }[side];
  const frame = {
    border: `3px solid ${soft}`,
    // Zwischen zwei Feldern nur eine dünne gestrichelte Linie
    ...(side === 'left' || side === 'middle' ? { borderRight: `2px dashed ${soft}` } : {}),
    ...(side === 'right' || side === 'middle' ? { borderLeft: 'none' } : {}),
    borderRadius: radius, background: '#fff', width: W + (side === 'right' || side === 'middle' ? 0 : 3) + (side === 'left' || side === 'middle' ? 2 : 3), height: H + 6,
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-black text-lg" style={{ color }}>{label}</span>
      <div className="relative overflow-hidden" style={frame}>
        {/* Schreiblinien */}
        <div className="absolute inset-x-0 pointer-events-none" style={{ top: '22%', borderTop: `2px dashed ${light}` }} />
        <div className="absolute inset-x-0 pointer-events-none" style={{ top: '82%', borderTop: `3px solid ${color}`, opacity: 0.35 }} />
        <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
          style={{ width: W, height: H, touchAction: 'none', position: 'relative', cursor: disabled ? 'default' : 'crosshair' }} />
      </div>
      <div className={`${ohneRadierer ? 'min-h-[1.5rem]' : 'min-h-[2.5rem]'} text-sm leading-tight font-bold text-center`} style={{ color: unsure ? '#c2410c' : dark, width: W }}>
        {res ? (unsure ? 'Nicht lesbar – schreib nochmal' : <>Ich lese: <span className="text-lg">{res.digit}</span></>) : <span className="text-slate-400">{hint}</span>}
      </div>
      {!disabled && !ohneRadierer && <button onClick={clear} aria-label="Wegradieren" title="Wegradieren" className="w-14 h-11 rounded-xl bg-pink-100 border-2 border-pink-300 text-pink-600 hover:bg-pink-200 active:translate-y-0.5 inline-flex items-center justify-center shadow-[0_3px_0_#f9a8d4] active:shadow-none"><Eraser className="w-7 h-7" /></button>}
    </div>
  );
}

// Schreibfelder: zuerst Zehner, dann Einer (optional Hunderter-Feld, z. B. in „Wie viele sind es?“ für die 100).
// optional = Z und H dürfen leer bleiben (für einstellige Zahlen); das E-Feld muss immer beschrieben sein.
// nurEiner = nur ein Schreibfeld (Antwort sicher unter 10, z. B. Zerlegen 4–9) – ein leeres Zehnerfeld verwirrt nur.
// kompakt = kleineres Feld, Prüfen-Haken (und extra, z. B. der Tippen-Schalter) neben statt unter dem Feld – für Übung 1/2,
// damit auf dem iPad quer nichts unter den Bildschirmrand rutscht. knoepfeLinks = Knöpfe links vom Feld.
function HandwriteNumber({ onSubmit, disabled, withH = false, optional = false, onStart, nurEiner = false, kompakt = false, knoepfeLinks = false, extra = null, klein = false, eng = false }) {
  const [rh, setRh] = useState(null);
  const [rz, setRz] = useState(null);
  const [re, setRe] = useState(null);
  const okRes = (r) => r && r.conf >= 0.6;
  const fine = (r) => !r || okRes(r);
  const ready = okRes(re) && (nurEiner || ((optional ? fine(rz) : okRes(rz)) && (!withH || fine(rh)) && !(rh && !rz)));
  const value = () => (nurEiner ? re.digit : (withH && rh ? rh.digit * 100 : 0) + (rz ? rz.digit * 10 : 0) + re.digit);
  const size = withH ? 108 : eng ? 90 : kompakt || klein ? 120 : 150;
  const [loesch, setLoesch] = useState(0); // kompakt: gemeinsamer Radiergummi leert alle Felder
  const pad = { ohneRadierer: kompakt, resetKey: kompakt ? loesch : undefined };
  const pruefen = <button onClick={() => onSubmit(value())} disabled={!ready || disabled} className={`bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-indigo-950 font-black text-xl py-3 ${kompakt ? 'px-4' : 'px-10'} rounded-xl shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:shadow-none`} aria-label="Prüfen"><Check className="w-8 h-8" strokeWidth={3} /></button>;
  return (
    <div className={kompakt ? `flex items-center ${eng ? 'gap-2' : 'gap-3'} ${knoepfeLinks ? 'flex-row-reverse' : ''}` : 'flex flex-col items-center gap-3'}>
      <div className="flex">
        {nurEiner && <WritePad {...pad} size={size} side="single" label="" color={COL.e} light={COL.eLight} dark={COL.eDark} onResult={setRe} disabled={disabled} hint="" onStart={onStart} />}
        {!nurEiner && withH && <WritePad {...pad} size={size} side="left" label="H" color={COL.h} light={COL.hLight} dark={COL.hDark} onResult={setRh} disabled={disabled} hint="nur bei 100" />}
        {!nurEiner && <WritePad {...pad} size={size} side={withH ? 'middle' : 'left'} label="Z" color={COL.z} light={COL.zLight} dark={COL.zDark} onResult={setRz} disabled={disabled} hint={optional ? 'Zehner' : undefined} onStart={onStart} />}
        {!nurEiner && <WritePad {...pad} size={size} side="right" label="E" color={COL.e} light={COL.eLight} dark={COL.eDark} onResult={setRe} disabled={disabled} hint={optional ? 'Einer' : undefined} onStart={onStart} />}
      </div>
      {kompakt ? (
        <div className="flex flex-col items-center gap-3">
          {pruefen}
          {!disabled && <button onClick={() => setLoesch(k => k + 1)} aria-label="Wegradieren" title="Wegradieren" className="w-14 h-11 rounded-xl bg-pink-100 border-2 border-pink-300 text-pink-600 hover:bg-pink-200 active:translate-y-0.5 inline-flex items-center justify-center"><Eraser className="w-6 h-6" /></button>}
          {extra}
        </div>
      ) : pruefen}
    </div>
  );
}

// Zahl eingeben: mit dem Finger schreiben (Standard, Z | E wie in der Zehner-Bande) oder tippen
// eng = Handy hoch: noch kleinere Felder bzw. schmaleres Tastenfeld, damit Feld, Knöpfe und Zahl nebeneinander passen
function ZahlEingabe({ onSubmit, resetKey, onStart, nurEiner = false, kompakt = false, knoepfeLinks = false, klein = false, eng = false }) {
  const { eingabe, setSettings } = useSettings();
  const [value, setValue] = useState('');
  useEffect(() => { setValue(''); }, [resetKey]);
  const submitTasten = () => { const n = parseInt(value, 10); if (!Number.isNaN(n)) onSubmit(n); };
  const stift = eingabe === 'stift';
  const umschalter = (
    <button onClick={() => setSettings(s => ({ ...s, eingabe: stift ? 'tasten' : 'stift' }))} aria-label={stift ? 'Lieber tippen' : 'Lieber mit dem Finger schreiben'} title={stift ? 'Lieber tippen' : 'Lieber mit dem Finger schreiben'} className="flex items-center gap-2 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 font-bold active:scale-95">
      {stift ? <Grid3x3 className="w-6 h-6" /> : <PenLine className="w-6 h-6" />}
    </button>
  );
  // kompakt (Übung 1/2): Knöpfe neben dem Feld, damit auf dem iPad quer alles ohne Scrollen sichtbar bleibt
  if (kompakt && stift) return <HandwriteNumber key={resetKey} onSubmit={onSubmit} optional onStart={onStart} nurEiner={nurEiner} kompakt knoepfeLinks={knoepfeLinks} extra={umschalter} eng={eng} />;
  if (kompakt) {
    return (
      <div className={`flex items-center gap-3 ${knoepfeLinks ? 'flex-row-reverse' : ''}`}>
        <div className={eng ? 'w-[190px]' : 'w-[240px]'}><NumPad value={value} onChange={setValue} onSubmit={submitTasten} onStart={onStart} maxLen={nurEiner ? 1 : 2} kompakt eng={eng} /></div>
        {umschalter}
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-center gap-3 ${klein ? '' : 'w-full'}`}>
      {stift
        ? <HandwriteNumber key={resetKey} onSubmit={onSubmit} optional onStart={onStart} nurEiner={nurEiner} klein={klein} />
        : <NumPad value={value} onChange={setValue} onSubmit={submitTasten} onStart={onStart} maxLen={nurEiner ? 1 : 2} kompakt={klein} />}
      {umschalter}
    </div>
  );
}

// Jubel bei richtiger Antwort (wie Zehner-Bande): großer grüner Haken, bunte Sterne fliegen heraus.
// Liegt über allem, fängt aber keine Fingertipps ab.
const CHEER_COLORS = ['#16a34a', '#2563eb', '#facc15', '#7c3aed', '#f97316'];
function Cheer() {
  const [stars] = useState(() => Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * 2 * Math.PI + Math.random() * 0.3; const d = 130 + Math.random() * 110;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, rot: Math.round(Math.random() * 360 - 180), size: 18 + Math.round(Math.random() * 16), color: CHEER_COLORS[i % CHEER_COLORS.length], delay: Math.random() * 0.12 };
  }));
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 1400); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[250] pointer-events-none flex items-center justify-center" aria-hidden="true">
      <div className="relative">
        {stars.map((st, i) => (
          <Star key={i} className="cheer-star" fill={st.color} color={st.color}
            style={{ width: st.size, height: st.size, marginLeft: -st.size / 2, marginTop: -st.size / 2, '--dx': `${st.dx}px`, '--dy': `${st.dy}px`, '--rot': `${st.rot}deg`, animationDelay: `${st.delay}s` }} />
        ))}
        <div className="cheer-check w-36 h-36 rounded-full bg-lime-500 border-8 border-white shadow-2xl flex items-center justify-center">
          <Check className="w-24 h-24 text-white" strokeWidth={4} />
        </div>
      </div>
    </div>
  );
}

// Ergebnis nach dem Schreiben: richtig (Jubel, Haken + Zahl leuchtet grün) oder Lösung (violett)
function Ergebnis({ ok, n, onNext, jubel = true }) {
  return (
    <div className="flex flex-col items-center gap-3 anim-pop">
      {ok && jubel && <Cheer />}
      <div className={`flex items-center gap-3 rounded-3xl px-5 py-2 ${ok ? 'bg-lime-50 border-4 border-lime-500 anim-glow-ok' : ''}`}>
        {ok && <Check className="w-14 h-14 text-lime-600" strokeWidth={3} />}
        <span className="text-7xl font-bold" style={{ color: ok ? COL.ink : COL.sol }}>{n}</span>
      </div>
      {onNext && <button onClick={onNext} aria-label="Weiter" title="Weiter" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-10 py-4 shadow-lg active:scale-95"><ArrowRight className="w-10 h-10" /></button>}
    </div>
  );
}

// ==========================================
// LEGE-BRETT: Zwanzigerfeld + Material-Tisch (für alle Lege-Übungen)
// ==========================================
// pieces/setPieces kommen von der Übung. locked = nichts mehr bewegen (z. B. beim Schreiben).
// glow = Zeitstempel: Fünfer leuchten kurz auf („Schau, das sind 5“). side = rechte Spalte (Tafel, Schreiben …).
// knoepfe = Knöpfe (z. B. Fertig-Haken), die auf schmalen Bildschirmen direkt unter dem Feld stehen (über dem Tisch, ohne Scrollen)
function LegeBrett({ pieces, setPieces, locked = false, glow = 0, side = null, knoepfe = null }) {
  const { maxN, einerAufTisch } = useSettings();
  const say = useSay();
  const total = maxN;
  const halves = total / 5;
  const rows = total / 10;

  const nextId = useRef(1000);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const [returning, setReturning] = useState(null);
  const [nudge, setNudge] = useState(0);
  const [shakeKind, setShakeKind] = useState(null);
  const [blueRows, setBlueRows] = useState([]);
  const svgRef = useRef(null);
  const [unitPx, setUnitPx] = useState(40);

  // Pixel pro Platz messen (für Ziehen und für die Größe der Teile auf dem Tisch)
  useEffect(() => {
    const measure = () => { const r = svgRef.current && svgRef.current.getBoundingClientRect(); if (r && r.width) setUnitPx((r.width / FIELD_W) * U); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [maxN]);
  const unitRef = useRef(unitPx); unitRef.current = unitPx;
  // Teile auf dem Tisch so groß wie die Plätze im Feld (auf dem Handy kleiner) – so passen immer zwei Fünfer nebeneinander
  const trayUnit = Math.max(22, Math.min(48, unitPx));

  const laid = layoutPieces(pieces);
  const filled = countSlots(pieces);
  const filledRef = useRef(filled); filledRef.current = filled;
  const nF = pieces.filter(p => p.k === 'f').length;
  const nE = pieces.length - nF;

  // Fünferplatz voller Einer → Tausch möglich (Fünfer liegen immer auf ganzen Hälften, also ist eine volle Hälfte ohne Fünfer = 5 Einer)
  const fStarts = laid.filter(p => p.k === 'f').map(p => p.start);
  let tauschHalf = -1;
  for (let h = 0; h < halves; h++) if (filled >= 5 * h + 5 && !fStarts.includes(5 * h)) { tauschHalf = h; break; }
  const zehnerRows = [];
  for (let r = 0; r < rows; r++) if (fStarts.includes(10 * r) && fStarts.includes(10 * r + 5)) zehnerRows.push(r);

  // Zwei Fünfer in einer Reihe → nach kurzer Pause langsam blau (= ein Zehner)
  const zKey = zehnerRows.join(',');
  const prevZ = useRef([]);
  useEffect(() => {
    const neu = zehnerRows.filter(r => !prevZ.current.includes(r));
    prevZ.current = zehnerRows;
    setBlueRows(b => b.filter(r => zehnerRows.includes(r)));
    if (!neu.length) return undefined;
    // Nur der Farbwechsel zu Blau – ohne Ansage „Zwei Fünfer sind ein Zehner.“ (störte den Arbeitsfluss, Lehrkraft 27.10.2026)
    const t = setTimeout(() => { setBlueRows(zehnerRows); }, 450);
    return () => clearTimeout(t);
  }, [zKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tausch-Hinweis einmal ansagen, wenn ein Fünferplatz voller Einer liegt
  const prevTausch = useRef(-1);
  useEffect(() => {
    if (tauschHalf >= 0 && prevTausch.current < 0 && !locked) say('tauschen_tipp');
    prevTausch.current = tauschHalf;
  }, [tauschHalf]); // eslint-disable-line react-hooks/exhaustive-deps

  const lifting = (kind, from) => (drag && drag.moved && drag.kind === kind && drag.from === from ? 1 : 0);
  const retLift = (kind) => (returning && returning.kind === kind ? 1 : 0);
  const trayF = halves - nF - lifting('f', 'tray') - retLift('f');
  const trayE = Math.max(0, einerAufTisch - nE) - lifting('e', 'tray') - retLift('e');
  const lastLifted = drag && drag.moved && drag.from === 'field';

  const add = (kind) => setPieces(ps => [...ps, { k: kind, id: nextId.current++ }]);
  const removeLast = () => setPieces(ps => ps.slice(0, -1));
  const tauschen = () => {
    if (locked || tauschHalf < 0 || halves - nF < 1) return;
    setPieces((ps) => {
      const lay = layoutPieces(ps);
      const i = lay.findIndex(p => p.start === 5 * tauschHalf);
      if (i < 0) return ps;
      return [...ps.slice(0, i), { k: 'f', id: nextId.current++, neu: true }, ...ps.slice(i + 5)];
    });
  };
  const clearAll = () => { if (!locked) setPieces([]); };

  // Bildschirm-Punkt → Feld-Koordinaten (null = neben dem Feld)
  const toField = (x, y) => {
    const svg = svgRef.current; if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const sc = r.width / FIELD_W, m = 0.6 * U * sc;
    if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) return null;
    return { x: (x - r.left) / sc, y: (y - r.top) / sc };
  };

  const tryTap = (kind) => {
    const res = checkPlace(kind, null, filledRef.current, total);
    if (res.ok) add(kind); else { say(res.key); setShakeKind(kind + Date.now()); }
  };

  // Ziehen mit Finger oder Maus (Pointer-Events). Kurzes Antippen legt ein Teil hin bzw. nimmt das letzte zurück.
  const startDrag = (ev, kind, from) => {
    if (returning || locked) return;
    ev.preventDefault();
    const r = ev.currentTarget.getBoundingClientRect();
    const d = { kind, from, x: ev.clientX, y: ev.clientY, fx: (ev.clientX - r.left) / r.width, fy: (ev.clientY - r.top) / r.height, sx: ev.clientX, sy: ev.clientY, moved: false, src: { x: r.left, y: r.top, h: r.height } };
    dragRef.current = d; setDrag(d);
  };
  const dragging = !!drag;
  useEffect(() => {
    if (!dragging) return undefined;
    const move = (ev) => {
      const d = dragRef.current; if (!d) return;
      const nd = { ...d, x: ev.clientX, y: ev.clientY, moved: d.moved || Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 8 };
      dragRef.current = nd; setDrag(nd);
    };
    const up = (ev) => {
      const d = dragRef.current; dragRef.current = null; setDrag(null);
      if (!d) return;
      if (!d.moved) { if (d.from === 'tray') tryTap(d.kind); else removeLast(); return; }
      const gu = unitRef.current, gw = d.kind === 'f' ? 5 * gu : gu;
      const left = ev.clientX - d.fx * gw, top = ev.clientY - d.fy * gu;
      const pt = toField(left + gw / 2, top + gu / 2);
      if (d.from === 'field') { if (!pt) removeLast(); return; }
      const res = pt ? checkPlace(d.kind, pt, filledRef.current, total) : { ok: false, key: null };
      if (res.ok) { add(d.kind); return; }
      if (res.key) say(res.key);
      setReturning({ kind: d.kind, unit: gu, from: { x: left, y: top }, to: { x: d.src.x, y: d.src.y }, toScale: d.src.h / gu });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Zeichnen ----------
  const H = fieldH(rows);
  const shown = lastLifted ? laid.slice(0, -1) : laid;
  const shownFilled = shown.reduce((a, p) => a + p.len, 0);
  const lastId = laid.length ? laid[laid.length - 1].id : null;
  const tr = 'fill 1s ease, stroke 1s ease';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-4 items-start">
      <div>
        {/* ZWANZIGERFELD */}
        <div className="relative bg-white rounded-3xl border-4 border-indigo-900 shadow-[6px_6px_0_rgba(30,27,75,0.25)] p-2 sm:p-4">
          <svg ref={svgRef} viewBox={`0 0 ${FIELD_W} ${H}`} width="100%" style={{ maxWidth: 700, display: 'block', margin: '0 auto', touchAction: 'none', overflow: 'visible' }}>
            {/* Fünferplätze */}
            {[...Array(halves)].map((_, h) => { const r = halfRect(h); return <rect key={`h${h}`} x={r.x - 0.6} y={r.y - 0.6} width={r.w + 1.2} height={r.h + 1.2} rx={U * 0.5} fill="#f8fafc" stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="1.6 1.2" />; })}
            {/* leere Plätze */}
            {[...Array(total)].map((_, i) => i >= shownFilled && <circle key={`s${i}`} cx={slotPos(i).x} cy={slotPos(i).y} r={DOT_R} fill="none" stroke={COL.empty} strokeWidth={0.6} />)}
            {/* gelegte Teile */}
            {shown.map((p) => {
              const isLast = p.id === lastId && !locked;
              const handlers = locked ? {} : isLast
                ? { onPointerDown: (ev) => startDrag(ev, p.k, 'field'), style: { cursor: 'grab' } }
                : { onPointerDown: () => { setNudge(Date.now()); say('nur_letztes'); } };
              if (p.k === 'f') {
                const h = p.start / 5, r = halfRect(h), blue = blueRows.includes(Math.floor(h / 2));
                return (
                  <g key={p.id} {...handlers} className={p.neu ? 'anim-pop' : ''} style={{ ...(handlers.style || {}), transformBox: 'fill-box', transformOrigin: 'center' }}>
                    <g key={isLast ? nudge : 0} className={isLast && nudge ? 'anim-nudge' : ''}>
                      <rect x={r.x - 0.2} y={r.y + 0.3} width={r.w + 0.4} height={r.h - 0.6} rx={U * 0.45} strokeWidth={0.9} style={{ fill: blue ? COL.zLight : COL.eLight, stroke: blue ? COL.zDark : COL.eDark, transition: tr }} />
                      {[0, 1, 2, 3, 4].map(k => { const c = slotPos(p.start + k); return <circle key={k} cx={c.x} cy={c.y} r={DOT_R} strokeWidth={0.7} style={{ fill: blue ? COL.z : COL.e, stroke: blue ? COL.zDark : COL.eDark, transition: tr }} />; })}
                    </g>
                    {glow > 0 && <rect key={`g${glow}`} x={r.x - 1.6} y={r.y - 1.6} width={r.w + 3.2} height={r.h + 3.2} rx={U * 0.6} fill="none" stroke="#facc15" strokeWidth={1.6} className="anim-glow3" />}
                  </g>
                );
              }
              const c = slotPos(p.start);
              return (
                <g key={p.id} {...handlers}>
                  <g key={isLast ? nudge : 0} className={isLast && nudge ? 'anim-nudge' : ''}>
                    <circle cx={c.x} cy={c.y} r={DOT_R} fill={COL.e} stroke={COL.eDark} strokeWidth={0.7} />
                  </g>
                  <circle cx={c.x} cy={c.y} r={U * 0.5} fill="transparent" />
                </g>
              );
            })}
            {/* Fünferplatz voller Einer: Tausch möglich */}
            {tauschHalf >= 0 && !drag && !locked && (() => { const r = halfRect(tauschHalf); return <rect x={r.x - 1.4} y={r.y - 1.4} width={r.w + 2.8} height={r.h + 2.8} rx={U * 0.6} fill="none" stroke="#f97316" strokeWidth={1.3} className="anim-glow" pointerEvents="none" />; })()}
          </svg>
        </div>

        {/* KNÖPFE UNTER DEM FELD */}
        <div className={`flex flex-wrap items-center justify-center gap-3 mt-3 ${locked ? "" : "min-h-[64px]"}`}>
          {tauschHalf >= 0 && !locked && (
            <button onClick={tauschen} aria-label="5 Einer gegen 1 Fünfer tauschen" title="5 Einer gegen 1 Fünfer tauschen" className="anim-pop flex items-center gap-2 rounded-2xl bg-orange-100 hover:bg-orange-200 border-4 border-orange-400 px-4 py-2 shadow-md active:scale-95">
              <span className="flex gap-0.5">{[0, 1, 2, 3, 4].map(i => <span key={i} className="block w-4 h-4 rounded-full border border-green-900 bg-green-600" />)}</span>
              <ArrowRight className="w-7 h-7 text-orange-700" />
              <PieceSvg kind="f" unit={22} />
            </button>
          )}
          {knoepfe && !locked && <div className="flex items-center gap-3 lg:hidden">{knoepfe}</div>}
          {pieces.length > 0 && !locked && (
            <button onClick={clearAll} aria-label="Alles zurück" title="Alles zurück" className="rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-600 p-3 active:scale-95"><RotateCcw className="w-7 h-7" /></button>
          )}
        </div>

        {/* MATERIAL-TISCH (beim Schreiben ausgeblendet, damit die Schreibfelder direkt unter dem Feld stehen) */}
        {!locked && (
        <div className="mt-2 rounded-3xl border-4 border-amber-700 p-3 sm:p-4 shadow-[6px_6px_0_rgba(30,27,75,0.25)]" style={{ background: 'repeating-linear-gradient(90deg, #f3d9a4 0px, #edd096 18px, #f3d9a4 36px)' }}>
          <div className="flex flex-wrap gap-3 justify-center">
            {[...Array(halves)].map((_, i) => i < trayF
              ? <div key={i} onPointerDown={(ev) => startDrag(ev, 'f', 'tray')} className={`rounded-full ${shakeKind && shakeKind.startsWith('f') ? 'anim-shake' : ''}`} style={{ touchAction: 'none', cursor: 'grab', padding: 4 }}><PieceSvg kind="f" unit={trayUnit} /></div>
              : <div key={i} style={{ width: 5 * trayUnit + 8, height: trayUnit + 8, borderRadius: 999, border: '2px dashed rgba(120,53,15,0.3)' }} />)}
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2 sm:mt-4">
            {[...Array(einerAufTisch)].map((_, i) => i < trayE
              ? <div key={i} onPointerDown={(ev) => startDrag(ev, 'e', 'tray')} className={shakeKind && shakeKind.startsWith('e') ? 'anim-shake' : ''} style={{ touchAction: 'none', cursor: 'grab', padding: 4 }}><PieceSvg kind="e" unit={trayUnit} /></div>
              : <div key={i} style={{ width: trayUnit + 8, height: trayUnit + 8, borderRadius: 999, border: '2px dashed rgba(120,53,15,0.3)' }} />)}
          </div>
        </div>
        )}
      </div>

      {/* RECHTE SPALTE (Tafel, Schreiben, Ergebnis) */}
      <div className="flex flex-col items-center gap-4 lg:pt-1">{side}</div>

      {drag && drag.moved && (
        <div style={{ position: 'fixed', left: drag.x - drag.fx * (drag.kind === 'f' ? 5 * unitPx : unitPx), top: drag.y - drag.fy * unitPx, pointerEvents: 'none', zIndex: 400, filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.3))' }}>
          <PieceSvg kind={drag.kind} unit={unitPx} />
        </div>
      )}
      {returning && <ReturnGhost r={returning} onDone={() => setReturning(null)} />}
    </div>
  );
}

// Fortschritt der Runde (wie Zehner-Bande)
const ROUND = 10;
function RoundDots({ current, total, results }) {
  return (
    <div className="flex justify-center gap-1.5 mb-4">
      {[...Array(total)].map((_, i) => {
        const r = results[i];
        const cls = r === true ? 'w-6 bg-lime-500' : r === false ? 'w-6 bg-amber-500' : i === current ? 'w-10 bg-indigo-600' : 'w-6 bg-indigo-200';
        return <div key={i} className={`h-3 rounded-full transition-all duration-500 ${cls}`} />;
      })}
    </div>
  );
}

// Angabe als Tafel: Fünfer-Symbol | Einer-Symbol mit Ziffern (kein Bild der Teile, sonst nur Abgleichen)
function Tafel({ f, e, puls = 0 }) {
  const schmal = useMedia(SCHMAL); // Handy: etwas kleiner, damit der Material-Tisch ganz ins Bild passt
  return (
    <div key={puls} className={`inline-flex items-stretch bg-white border-4 border-indigo-900 rounded-3xl overflow-hidden shadow-[4px_4px_0_rgba(30,27,75,0.2)] ${puls ? 'anim-shake' : ''}`}>
      <div className="flex items-center gap-3 px-3 py-1 sm:px-4 sm:py-2">
        <FridaSvg size={schmal ? 76 : 95} />
        <span className="text-5xl sm:text-6xl font-bold leading-none" style={{ color: COL.eDark }}>{f}</span>
      </div>
      <div className="w-1 bg-indigo-900" />
      <div className="flex items-center gap-3 px-3 py-1 sm:px-4 sm:py-2">
        <EliSvg size={30} />
        <span className="text-5xl sm:text-6xl font-bold leading-none" style={{ color: COL.eDark }}>{e}</span>
      </div>
    </div>
  );
}

// Zufallszahlen für eine Runde: verschiedene Zahlen, über 5 (bis 10) bzw. über 15 (bis 20) etwas häufiger
function legeZahlen(count, maxN) {
  const items = [];
  for (let n = 1; n <= maxN; n++) items.push({ n, w: n > maxN - 5 ? 2 : 1 });
  const out = [];
  while (out.length < count && items.length) {
    const tot = items.reduce((a, i) => a + i.w, 0);
    let r = Math.random() * tot, k = 0;
    while (r >= items[k].w) { r -= items[k].w; k++; }
    out.push(items[k].n); items.splice(k, 1);
  }
  return out;
}

// ==========================================
// ÜBUNG LEGEN (legen5): Tafel → Teile legen → Zahl mit dem Finger schreiben
// ==========================================
function LegenGame({ onFinish }) {
  const { maxN } = useSettings();
  const say = useSay();
  const [tasks] = useState(() => legeZahlen(ROUND, maxN));
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [phase, setPhase] = useState('legen'); // legen | schreiben | fertig
  const [fehler, setFehler] = useState(false); // schon ein Fehlversuch in dieser Aufgabe → kein Stern
  const [schreibTries, setSchreibTries] = useState(0);
  const [ok, setOk] = useState(false);
  const [glow, setGlow] = useState(0);
  const [puls, setPuls] = useState(0);
  const [rk, setRk] = useState(0);
  const n = tasks[idx];
  const f = Math.floor(n / 5), e = n % 5;

  useEffect(() => { say('legen_aufgabe', { f, e }); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = (good) => setResults(r => { const c = [...r]; c[idx] = good; return c; });

  const pruefeLegen = () => {
    const nF = pieces.filter(p => p.k === 'f').length, nE = pieces.length - nF;
    if (nF === f && nE === e) { setPhase('schreiben'); say('schreib_zahl'); return; }
    setFehler(true); setPuls(Date.now());
    say(countSlots(pieces) === n ? 'legen_tauschen' : 'legen_nochmal');
  };

  const pruefeZahl = (a) => {
    if (a === n) { setOk(true); setPhase('fertig'); record(!fehler && schreibTries === 0); say('richtig', n); return; }
    if (schreibTries === 0) { setSchreibTries(1); setFehler(true); setRk(k => k + 1); setGlow(Date.now()); say(hilfeSatz(n)); return; }
    setOk(false); setPhase('fertig'); record(false); setGlow(Date.now()); say('aufloesung', n);
  };

  const weiter = () => {
    if (idx + 1 >= ROUND) { onFinish(results.filter(Boolean).length); return; }
    setIdx(i => i + 1); setPieces([]); setPhase('legen'); setFehler(false); setSchreibTries(0); setOk(false); setRk(k => k + 1);
  };

  const side = (
    <>
      <div className="hidden lg:block"><Tafel f={f} e={e} puls={puls} /></div>
      {phase === 'legen' && (
        <button onClick={pruefeLegen} disabled={pieces.length === 0} aria-label="Fertig gelegt" title="Fertig gelegt" className="hidden lg:block bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-indigo-950 rounded-2xl px-12 py-4 shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:shadow-none">
          <Check className="w-12 h-12" strokeWidth={3} />
        </button>
      )}
      {phase === 'schreiben' && <ZahlEingabe onSubmit={pruefeZahl} resetKey={rk} />}
      {phase === 'fertig' && <Ergebnis ok={ok} n={n} onNext={weiter} />}
    </>
  );

  return (
    <div>
      <RoundDots current={idx} total={ROUND} results={results} />
      <div className="flex justify-center mb-2 sm:mb-4 lg:hidden"><Tafel f={f} e={e} puls={puls} /></div>
      <LegeBrett pieces={pieces} setPieces={setPieces} locked={phase !== 'legen'} glow={glow} side={side} knoepfe={phase === 'legen' && (
        <button onClick={pruefeLegen} disabled={pieces.length === 0} aria-label="Fertig gelegt" title="Fertig gelegt" className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-indigo-950 rounded-2xl px-7 py-2 shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:shadow-none"><Check className="w-10 h-10" strokeWidth={3} /></button>
      )} />
    </div>
  );
}

// ==========================================
// FREI LEGEN (frei5): offene Aufgabe – legen, dann schreiben, wie viele es sind
// ==========================================
function FreiLegen() {
  const say = useSay();
  const [pieces, setPieces] = useState([]);
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState(null); // 'ok' | 'reveal'
  const [glow, setGlow] = useState(0);
  const [rk, setRk] = useState(0);
  // Nach jeder Änderung im Feld beginnt das Schreiben neu
  useEffect(() => { setTries(0); setResult(null); setRk(k => k + 1); }, [pieces]);
  const imFeld = countSlots(pieces);
  const check = (a) => {
    if (a === imFeld) { setResult('ok'); say('richtig', imFeld); return; }
    if (tries === 0) { setTries(1); setRk(k => k + 1); setGlow(Date.now()); say(hilfeSatz(imFeld)); return; }
    setResult('reveal'); setGlow(Date.now()); say('aufloesung', imFeld);
  };
  const side = result
    ? <Ergebnis ok={result === 'ok'} n={imFeld} />
    : pieces.length > 0 ? <ZahlEingabe onSubmit={check} resetKey={rk} /> : null;
  return <LegeBrett pieces={pieces} setPieces={setPieces} glow={glow} side={side} />;
}

// ==========================================
// ZWANZIGERFELD ALS BILD (nicht zum Legen)
// ==========================================
// Zahl in Legeordnung: zuerst Fünfer (volle Reihe = blau), dann Einer. Leere Plätze bleiben sichtbar.
function FeldBild({ n, maxN, glow = 0, maxWidth = 560 }) {
  const rows = maxN / 10, H = fieldH(rows);
  const f = Math.floor(n / 5), e = n % 5;
  return (
    <svg viewBox={`0 0 ${FIELD_W} ${H}`} width="100%" style={{ maxWidth, display: 'block', margin: '0 auto', overflow: 'visible' }}>
      {[...Array(maxN / 5)].map((_, h) => { const r = halfRect(h); return <rect key={`h${h}`} x={r.x - 0.6} y={r.y - 0.6} width={r.w + 1.2} height={r.h + 1.2} rx={U * 0.5} fill="#f8fafc" stroke="#94a3b8" strokeWidth={0.5} strokeDasharray="1.6 1.2" />; })}
      {[...Array(maxN)].map((_, i) => i >= n && <circle key={`s${i}`} cx={slotPos(i).x} cy={slotPos(i).y} r={DOT_R} fill="none" stroke={COL.empty} strokeWidth={0.6} />)}
      {[...Array(f)].map((_, h) => {
        const r = halfRect(h), blue = f >= 2 * Math.floor(h / 2) + 2;
        return (
          <g key={`f${h}`}>
            <rect x={r.x - 0.2} y={r.y + 0.3} width={r.w + 0.4} height={r.h - 0.6} rx={U * 0.45} strokeWidth={0.9} fill={blue ? COL.zLight : COL.eLight} stroke={blue ? COL.zDark : COL.eDark} />
            {[0, 1, 2, 3, 4].map(k => { const c = slotPos(5 * h + k); return <circle key={k} cx={c.x} cy={c.y} r={DOT_R} strokeWidth={0.7} fill={blue ? COL.z : COL.e} stroke={blue ? COL.zDark : COL.eDark} />; })}
            {glow > 0 && <rect key={`g${glow}`} x={r.x - 1.6} y={r.y - 1.6} width={r.w + 3.2} height={r.h + 3.2} rx={U * 0.6} fill="none" stroke="#facc15" strokeWidth={1.6} className="anim-glow3" />}
          </g>
        );
      })}
      {[...Array(e)].map((_, k) => { const c = slotPos(5 * f + k); return <circle key={`e${k}`} cx={c.x} cy={c.y} r={DOT_R} fill={COL.e} stroke={COL.eDark} strokeWidth={0.7} />; })}
    </svg>
  );
}

// Darstellungen für den Blitzblick – austauschbar. Später kann hier „finger“ (Fingerbild) andocken.
const DARSTELLUNGEN = { plaettchen: FeldBild };

// ==========================================
// ÜBUNG BLITZBLICK (blitz5): Feld erscheint kurz → Zahl mit dem Finger schreiben
// ==========================================
const MAX_PEEKS = 3;
function BlitzGame({ onFinish }) {
  const { maxN, blitzMs } = useSettings();
  const say = useSay();
  const [tasks] = useState(() => legeZahlen(ROUND, maxN));
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [phase, setPhase] = useState('bereit'); // bereit | zeigen | antworten | fertig
  const [peeks, setPeeks] = useState(0);
  const [peeking, setPeeking] = useState(false);
  const [tries, setTries] = useState(0);
  const [hilfe, setHilfe] = useState(false); // nach Fehler bleibt das Bild stehen
  const [ok, setOk] = useState(false);
  const [glow, setGlow] = useState(0);
  const [rk, setRk] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const n = tasks[idx];
  const Bild = DARSTELLUNGEN.plaettchen;

  useEffect(() => { say('blitz_aufgabe'); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const zeig = () => {
    setPhase('zeigen');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase('antworten'), blitzMs > 0 ? blitzMs : 0);
  };
  const peek = () => {
    if (peeks >= MAX_PEEKS) return;
    const k = peeks + 1; setPeeks(k);
    if (k >= MAX_PEEKS) return; // beim 3. Mal bleibt das Bild stehen
    setPeeking(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPeeking(false), blitzMs);
  };
  const record = (good) => setResults(r => { const c = [...r]; c[idx] = good; return c; });
  const pruefe = (a) => {
    if (a === n) { setOk(true); setPhase('fertig'); record(tries === 0); say('richtig', n); return; }
    if (tries === 0) { setTries(1); setHilfe(true); setGlow(Date.now()); setRk(k => k + 1); say(hilfeSatz(n)); return; }
    setOk(false); setPhase('fertig'); record(false); setGlow(Date.now()); say('aufloesung', n);
  };
  const weiter = () => {
    if (idx + 1 >= ROUND) { onFinish(results.filter(Boolean).length); return; }
    clearTimeout(timer.current);
    setIdx(i => i + 1); setPhase('bereit'); setPeeks(0); setPeeking(false); setTries(0); setHilfe(false); setOk(false); setRk(k => k + 1);
  };

  const sichtbar = phase === 'zeigen' || phase === 'fertig' || (phase === 'antworten' && (blitzMs === 0 || peeking || peeks >= MAX_PEEKS || hilfe));

  return (
    <div>
      <RoundDots current={idx} total={ROUND} results={results} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-4 items-start">
        <div className="relative bg-white rounded-3xl border-4 border-indigo-900 shadow-[6px_6px_0_rgba(30,27,75,0.25)] p-3 sm:p-5">
          <div style={{ visibility: sichtbar ? 'visible' : 'hidden' }}><Bild n={n} maxN={maxN} glow={glow} /></div>
          {!sichtbar && (
            <div className="absolute inset-0 flex items-center justify-center gap-4">
              {phase === 'bereit'
                ? <button onClick={zeig} aria-label="Zeig her" title="Zeig her" className="bg-yellow-400 hover:bg-yellow-300 text-indigo-950 rounded-3xl px-12 py-5 shadow-[0_5px_0_#ca8a04] active:translate-y-1 active:shadow-none"><Eye className="w-14 h-14" /></button>
                : <>
                    <Zap className="w-16 h-16 fill-yellow-300 text-yellow-400" />
                    {blitzMs > 0 && peeks < MAX_PEEKS && (
                      <button onClick={peek} aria-label="Nochmal ansehen" title="Nochmal ansehen" className="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-2xl px-5 py-3 active:scale-95">
                        <Eye className="w-9 h-9" />
                        <span className="flex gap-1">{[...Array(MAX_PEEKS - peeks)].map((_, i) => <span key={i} className="block w-3 h-3 rounded-full bg-indigo-500" />)}</span>
                      </button>
                    )}
                  </>}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-4 lg:pt-1">
          {phase === 'antworten' && <ZahlEingabe onSubmit={pruefe} resetKey={rk} />}
          {phase === 'fertig' && <Ergebnis ok={ok} n={n} onNext={weiter} />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ÜBUNG HÖREN UND LEGEN (umkehr5): Zahl hören → mit möglichst wenigen Teilen legen
// ==========================================
function UmkehrGame({ onFinish }) {
  const { maxN } = useSettings();
  const say = useSay();
  const [tasks] = useState(() => legeZahlen(ROUND, maxN));
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [phase, setPhase] = useState('legen'); // legen | fertig
  const [fehler, setFehler] = useState(false);
  const [tries, setTries] = useState(0);
  const [ok, setOk] = useState(false);
  const [glow, setGlow] = useState(0);
  const n = tasks[idx];

  useEffect(() => { say('umkehr_aufgabe', n); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = (good) => setResults(r => { const c = [...r]; c[idx] = good; return c; });
  const pruefe = () => {
    const menge = countSlots(pieces);
    const nE = pieces.filter(p => p.k === 'e').length;
    if (menge === n && nE <= 4) { setOk(true); setPhase('fertig'); record(!fehler); say('richtig', n); return; }
    if (menge === n) { setFehler(true); say('weniger_teile'); return; } // richtige Menge, aber nicht die wenigsten Teile
    if (tries === 0) { setTries(1); setFehler(true); setGlow(Date.now()); say('umkehr_nochmal', n); return; }
    setOk(false); setPhase('fertig'); record(false); say('aufloesung', n);
  };
  const weiter = () => {
    if (idx + 1 >= ROUND) { onFinish(results.filter(Boolean).length); return; }
    setIdx(i => i + 1); setPieces([]); setPhase('legen'); setFehler(false); setTries(0); setOk(false);
  };

  const side = phase === 'legen'
    ? (
      <>
        <button onClick={() => say('umkehr_aufgabe', n)} aria-label="Zahl nochmal hören" title="Zahl nochmal hören" className="hidden lg:block bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl px-10 py-5 shadow-lg active:scale-95"><Ear className="w-14 h-14" /></button>
        <button onClick={pruefe} disabled={pieces.length === 0} aria-label="Fertig gelegt" title="Fertig gelegt" className="hidden lg:block bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-indigo-950 rounded-2xl px-12 py-4 shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:shadow-none">
          <Check className="w-12 h-12" strokeWidth={3} />
        </button>
      </>
    )
    : (
      <>
        <Ergebnis ok={ok} n={n} onNext={weiter} />
        {!ok && <div className="w-full bg-white rounded-2xl border-4 p-2" style={{ borderColor: COL.sol }}><FeldBild n={n} maxN={maxN} maxWidth={260} /></div>}
      </>
    );

  return (
    <div>
      <RoundDots current={idx} total={ROUND} results={results} />
      <LegeBrett pieces={pieces} setPieces={setPieces} locked={phase !== 'legen'} glow={glow} side={side} knoepfe={phase === 'legen' && (
        <>
          <button onClick={() => say('umkehr_aufgabe', n)} aria-label="Zahl nochmal hören" title="Zahl nochmal hören" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-5 py-2 shadow-lg active:scale-95"><Ear className="w-10 h-10" /></button>
          <button onClick={pruefe} disabled={pieces.length === 0} aria-label="Fertig gelegt" title="Fertig gelegt" className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-indigo-950 rounded-2xl px-7 py-2 shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:shadow-none"><Check className="w-10 h-10" strokeWidth={3} /></button>
        </>
      )} />
    </div>
  );
}

// ==========================================
// ZERLEGEN (4 bis 10)
// ==========================================
const ZERLEGE_ZAHLEN = [4, 5, 6, 7, 8, 9, 10];
// Tauschpaare (2|4 und 4|2) bekommen dieselbe Farbe
const PAAR_FARBEN = ['#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#ddd6fe', '#fed7aa'];
const paarFarbe = (a, b) => PAAR_FARBEN[Math.min(a, b) % PAAR_FARBEN.length];
// Alle Zerlegungen von n, geordnet n|0, n−1|1 … 0|n (mit 0 und Tauschaufgaben einzeln)
const zerlegungen = (n, mitNull = true) => [...Array(n + 1)].map((_, k) => [n - k, k]).filter(([a, b]) => mitNull || (a > 0 && b > 0));
const mischen = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const zufallsSeite = () => (Math.random() < 0.5 ? 'l' : 'r');
// Im Zahlenhaus wird immer nur eine Ziffer eingetragen: Wäre die 10 gesucht (0 | 10), ist stattdessen das Zimmer mit der 0 leer.
const leeresZimmer = (a, b) => (a >= 10 ? 'r' : b >= 10 ? 'l' : zufallsSeite());
const gesuchtVon = (t) => (t.leer === 'l' ? t.a : t.b);

// Zahlenhaus: Dach mit n, darunter Etagen mit zwei Zimmern (gleiche Form in App und Arbeitsblättern).
// zeilen: [{ a, b, leer: 'l'|'r'|null, frage: bool, farbe, blitz, sol }] – a/b = null → Zimmer leer
function Zahlenhaus({ n, zeilen, zimmer = 84 }) {
  const w = 2 * zimmer, dachH = Math.round(zimmer * 0.85), rand = 4;
  // Gesuchtes Zimmer: leer, nur zart gelb hinterlegt (kein Fragezeichen – Wunsch der Lehrkraft)
  // schreib = Schreibfeld, das genau in das gesuchte Zimmer passt (Kind schreibt direkt ins Haus)
  const Zimmer = ({ wert, frage, links, sol, schreib, hoch }) => (
    <div className="flex items-center justify-center font-bold leading-none overflow-hidden" style={{ width: zimmer, height: Math.round(zimmer * (hoch ? 0.9 : 0.72)), fontSize: zimmer * 0.5, borderRight: links ? `3px solid ${COL.ink}` : 'none', color: sol ? COL.sol : COL.ink, background: frage && !schreib ? '#fef9c3' : undefined }}>
      {frage ? (schreib || null) : wert}
    </div>
  );
  return (
    <div className="inline-flex flex-col items-center">
      <svg width={w + 2 * rand + 16} height={dachH} viewBox={`0 0 ${w + 2 * rand + 16} ${dachH}`} style={{ display: 'block', marginBottom: -2 }}>
        <path d={`M2 ${dachH - 2} L${(w + 2 * rand + 16) / 2} 3 L${w + 2 * rand + 14} ${dachH - 2} Z`} fill="#fde68a" stroke={COL.ink} strokeWidth="4" strokeLinejoin="round" />
        <text x={(w + 2 * rand + 16) / 2} y={dachH * 0.8} textAnchor="middle" fontSize={zimmer * 0.46} fontWeight="700" fill={COL.ink} fontFamily="Fuenfer Fredoka, sans-serif">{n}</text>
      </svg>
      <div className="bg-white" style={{ border: `${rand}px solid ${COL.ink}`, borderTop: 'none' }}>
        {zeilen.map((z, i) => (
          <div key={i} className={`relative flex ${z.neu ? 'anim-pop' : ''}`} style={{ borderTop: `3px solid ${COL.ink}`, background: z.farbe || '#fff', animationDelay: z.delay || '0s' }}>
            {/* als Funktion aufgerufen (nicht als eigene Komponente), sonst würde das Schreibfeld bei jeder Änderung neu aufgebaut */}
            {Zimmer({ links: true, wert: z.a, frage: z.frage && z.leer === 'l', sol: z.sol && z.leer === 'l', schreib: z.leer === 'l' ? z.schreib : null, hoch: z.hoch })}
            {Zimmer({ wert: z.b, frage: z.frage && z.leer === 'r', sol: z.sol && z.leer === 'r', schreib: z.leer === 'r' ? z.schreib : null, hoch: z.hoch })}
            {z.blitz && <Zap className="absolute w-7 h-7 fill-yellow-300 text-yellow-500" style={{ right: -36, top: '50%', transform: 'translateY(-50%)' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Geordnetes Zahlenhaus n|0 … 0|n; nur die Zeilen in „voll“ (Schlüssel "a|b") werden ausgefüllt, Tauschpaare gleich gefärbt
function GeordnetesHaus({ n, voll = null, blitz = {}, zimmer = 56, animiert = false }) {
  const zeilen = zerlegungen(n, true).map(([a, b], i) => {
    const k = `${a}|${b}`, drin = !voll || voll[k];
    return drin ? { a, b, farbe: paarFarbe(a, b), blitz: !!blitz[k], neu: animiert, delay: animiert ? `${i * 0.12}s` : undefined } : { a: null, b: null };
  });
  return <Zahlenhaus n={n} zeilen={zeilen} zimmer={zimmer} />;
}

// Steckwürfel-Stange: linker Teil a, rechter Teil b, kleine Lücke dazwischen. leer = Seite, deren Würfel nur umrissen sind (Hilfe).
function Stange({ a, b, leer = null, wuerfel = 44 }) {
  const gap = wuerfel * 0.45, n = a + b;
  const width = n * wuerfel + (a && b ? gap : 0);
  const cube = (x, key, hohl) => (
    <g key={key}>
      <rect x={x + wuerfel * 0.3} y={0} width={wuerfel * 0.4} height={wuerfel * 0.18} rx={2} fill={hohl ? '#fff' : COL.eDark} stroke={hohl ? COL.e : 'none'} strokeWidth={1.5} strokeDasharray={hohl ? '3 2' : undefined} />
      <rect x={x + 1} y={wuerfel * 0.16} width={wuerfel - 2} height={wuerfel - 2} rx={4} fill={hohl ? '#fff' : COL.e} stroke={hohl ? COL.e : COL.eDark} strokeWidth={2} strokeDasharray={hohl ? '5 3' : undefined} />
    </g>
  );
  const items = [];
  for (let i = 0; i < a; i++) items.push(cube(i * wuerfel, `a${i}`, leer === 'l'));
  for (let i = 0; i < b; i++) items.push(cube(a * wuerfel + (a ? gap : 0) + i * wuerfel, `b${i}`, leer === 'r'));
  return <svg width={Math.max(width, 10)} height={wuerfel * 1.2} viewBox={`0 0 ${Math.max(width, 10)} ${wuerfel * 1.2}`} style={{ maxWidth: '100%', height: 'auto', overflow: 'visible' }}>{items}</svg>;
}

// 10 Aufgaben für eine Stufen-Runde (eine Zahl oder gemischt 4–10); nie zweimal dieselbe hintereinander
// einstellig = Zahlenhaus-Übung: gesucht wird immer eine einzelne Ziffer (bei den Händen nicht: dort darf die Hand alles halten)
function stufenAufgaben(zahl, mitNull, einstellig = false) {
  const out = [];
  let pool = [];
  let guard = 0;
  while (out.length < ROUND && guard++ < 500) {
    let n, a, b;
    if (zahl === 'gemischt') {
      n = ZERLEGE_ZAHLEN[Math.floor(Math.random() * ZERLEGE_ZAHLEN.length)];
      const zs = zerlegungen(n, mitNull); [a, b] = zs[Math.floor(Math.random() * zs.length)];
    } else {
      if (!pool.length) pool = mischen(zerlegungen(zahl, mitNull));
      [a, b] = pool.pop(); n = zahl;
    }
    const last = out[out.length - 1];
    if (last && last.n === n && last.a === a && last.b === b) continue;
    out.push({ n, a, b, leer: einstellig ? leeresZimmer(a, b) : zufallsSeite() });
  }
  return out;
}

// Prüfung: alle Zerlegungen genau einmal, zufällig, Tauschpaare nie direkt hintereinander
function probeAufgaben(n, mitNull) {
  const zs = zerlegungen(n, mitNull);
  let o = mischen(zs);
  for (let t = 0; t < 1000; t++) {
    if (o.every((p, i) => i === 0 || !(p[0] === o[i - 1][1] && p[1] === o[i - 1][0]))) break;
    o = mischen(zs);
  }
  // Darstellung gemischt: etwa die Hälfte im Zahlenhaus (schreiben), die andere Hälfte als Plusaufgabe (antippen)
  const formen = mischen(o.map((_, i) => (i % 2 ? 'plus' : 'haus')));
  return o.map(([a, b], i) => ({ n, a, b, leer: leeresZimmer(a, b), form: formen[i] }));
}

// Zahl aus einem Schreibfeld lesen – auch zwei Ziffern nebeneinander (z. B. „10“):
// Die Schrift wird an senkrechten Lücken in Ziffern getrennt, jede Ziffer einzeln erkannt (inkl. 7 mit Querstrich).
function erkenneZahl(canvas, strokes, dpr) {
  const w = canvas.width, h = canvas.height;
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const spalte = new Array(w).fill(false);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3] > 40) { spalte[x] = true; break; }
  // zusammenhängende Spalten mit Schrift; kleine Lücken (innerhalb einer Ziffer) überbrücken
  const laeufe = [];
  let start = -1;
  for (let x = 0; x <= w; x++) {
    if (x < w && spalte[x]) { if (start < 0) start = x; } else if (start >= 0) { laeufe.push([start, x - 1]); start = -1; }
  }
  const minLuecke = w * 0.07;
  const teile = [];
  laeufe.forEach((l) => { const t = teile[teile.length - 1]; if (t && l[0] - t[1] < minLuecke) t[1] = l[1]; else teile.push([...l]); });
  if (!teile.length) return null;
  if (teile.length > 2) return { wert: null, conf: 0 };
  const ziffern = teile.map(([x0, x1]) => {
    const pad = Math.round(4 * dpr);
    const a = Math.max(0, x0 - pad), b = Math.min(w, x1 + pad);
    const c = document.createElement('canvas'); c.width = b - a; c.height = h;
    c.getContext('2d').drawImage(canvas, a, 0, b - a, h, 0, 0, b - a, h);
    // Striche, die zu dieser Ziffer gehören (für die Unterscheidung 1/7)
    const zu = strokes.filter((s) => { const mx = s.reduce((acc, p) => acc + p.x, 0) / s.length * dpr; return mx >= a && mx <= b; })
      .map(s => s.map(p => ({ x: p.x * dpr - a, y: p.y * dpr })));
    return erkenneZiffer(c, zu);
  });
  if (ziffern.some(z => !z)) return { wert: null, conf: 0 };
  return { wert: ziffern.reduce((acc, z) => acc * 10 + z.digit, 0), conf: Math.min(...ziffern.map(z => z.conf)) };
}

// Ein Schreibfeld genau in Zimmergröße: weiß, mit blassem Stift als Hinweis „hier schreiben“
function ZimmerPad({ breite, hoehe, onResult, onStart }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const timer = useRef(null);
  const strokes = useRef([]);
  const dprRef = useRef(1);
  const [leer, setLeer] = useState(true);
  useEffect(() => {
    const c = ref.current; const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    dprRef.current = dpr;
    c.width = breite * dpr; c.height = hoehe * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return () => clearTimeout(timer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = (ev) => { const r = ref.current.getBoundingClientRect(); return { x: (ev.clientX - r.left) * (breite / r.width), y: (ev.clientY - r.top) * (hoehe / r.height) }; };
  const linie = (a, b) => {
    const ctx = ref.current.getContext('2d');
    ctx.strokeStyle = '#1e1b4b'; ctx.lineWidth = hoehe * 0.075; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  const down = (ev) => { ev.preventDefault(); if (onStart) onStart(); if (ref.current.setPointerCapture) { try { ref.current.setPointerCapture(ev.pointerId); } catch (e) { /* egal */ } } drawing.current = true; setLeer(false); clearTimeout(timer.current); const p = pos(ev); last.current = p; strokes.current.push([p]); linie(p, { x: p.x + 0.1, y: p.y + 0.1 }); };
  const move = (ev) => { if (!drawing.current) return; const p = pos(ev); linie(last.current, p); last.current = p; strokes.current[strokes.current.length - 1].push(p); };
  const up = () => {
    if (!drawing.current) return; drawing.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onResult(erkenneZahl(ref.current, strokes.current, dprRef.current)), 500);
  };
  return (
    <div className="relative" style={{ width: breite, height: hoehe, background: '#fff' }}>
      {leer && <PenLine className="absolute pointer-events-none" style={{ left: '50%', top: '50%', width: hoehe * 0.55, height: hoehe * 0.55, transform: 'translate(-50%, -50%)', color: '#000', opacity: 0.1 }} />}
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} style={{ position: 'relative', width: breite, height: hoehe, display: 'block', touchAction: 'none', cursor: 'crosshair' }} />
    </div>
  );
}

// Aufgabe im Zahlenhaus: Das Kind schreibt die Zahl direkt in das leere Zimmer – ein einziges weißes Feld,
// auch für zweistellige Zahlen. Darunter: was erkannt wurde, Radiergummi, Prüfen. „Tippen“ bleibt als Ausweich.
function HausFrage({ t, zimmer = 140, resetKey, onSubmit, onStart }) {
  const { eingabe, setSettings } = useSettings();
  const stift = eingabe === 'stift';
  const [radiert, setRadiert] = useState(0);
  const [res, setRes] = useState(null);
  useEffect(() => { setRes(null); }, [resetKey, radiert]);
  const bereit = !!res && res.wert != null && res.conf >= 0.6;
  const unsicher = !!res && !bereit;
  const pads = stift ? <ZimmerPad key={`${resetKey}-${radiert}`} breite={zimmer} hoehe={Math.round(zimmer * 0.9)} onResult={setRes} onStart={onStart} /> : null;
  const zeile = { a: t.leer === 'l' ? null : t.a, b: t.leer === 'r' ? null : t.b, leer: t.leer, frage: true, schreib: pads, hoch: true };
  const wechsel = (
    <button onClick={() => setSettings(s => ({ ...s, eingabe: stift ? 'tasten' : 'stift' }))} aria-label={stift ? 'Lieber tippen' : 'Lieber mit dem Finger schreiben'} title={stift ? 'Lieber tippen' : 'Lieber mit dem Finger schreiben'} className="flex items-center gap-2 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 font-bold active:scale-95">
      {stift ? <Grid3x3 className="w-6 h-6" /> : <PenLine className="w-6 h-6" />}
    </button>
  );
  return (
    <div className="flex flex-col items-center gap-3">
      <Zahlenhaus n={t.n} zeilen={[zeile]} zimmer={zimmer} />
      {stift ? (
        <>
          <div className="min-h-[2.25rem] text-lg font-bold text-center" style={{ color: unsicher ? '#c2410c' : COL.eDark }}>
            {unsicher ? 'Nicht lesbar – schreib nochmal' : bereit ? <>Ich lese: <span className="text-2xl">{res.wert}</span></> : null}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setRadiert(x => x + 1)} aria-label="Wegradieren" title="Wegradieren" className="w-16 h-14 rounded-xl bg-pink-100 border-2 border-pink-300 text-pink-600 hover:bg-pink-200 active:translate-y-0.5 inline-flex items-center justify-center shadow-[0_3px_0_#f9a8d4] active:shadow-none"><Eraser className="w-8 h-8" /></button>
            <button onClick={() => onSubmit(res.wert)} disabled={!bereit} aria-label="Prüfen" title="Prüfen" className="h-14 px-10 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-indigo-950 shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:shadow-none inline-flex items-center justify-center"><Check className="w-9 h-9" strokeWidth={3} /></button>
          </div>
          {wechsel}
        </>
      ) : <ZahlEingabe onSubmit={onSubmit} resetKey={resetKey} onStart={onStart} nurEiner={t.n < 10} />}
    </div>
  );
}

// ==========================================
// ZERLEGEN STUFE 3: Zahlenhaus mit Ziffern, ein Zimmer leer
// ==========================================
function Stufe3Game({ onFinish, zahl }) {
  const { mitNull } = useSettings();
  const say = useSay();
  const [tasks] = useState(() => stufenAufgaben(zahl, mitNull, true));
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [phase, setPhase] = useState('frage'); // frage | fertig
  const [tries, setTries] = useState(0);
  const [hilfe, setHilfe] = useState(false);
  const [ok, setOk] = useState(false);
  const [rk, setRk] = useState(0);
  const t = tasks[idx];
  const gesucht = gesuchtVon(t);

  useEffect(() => { say('zerlege_aufgabe', t); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = (good) => setResults(r => { const c = [...r]; c[idx] = good; return c; });
  const pruefe = (x) => {
    if (x === gesucht) { setOk(true); setPhase('fertig'); record(tries === 0); say('zerlege_richtig', t); return; }
    if (tries === 0) { setTries(1); setHilfe(true); setRk(k => k + 1); say('zerlege_hilfe'); return; }
    setOk(false); setPhase('fertig'); record(false); say('zerlege_loesung', t);
  };
  const weiter = () => {
    if (idx + 1 >= ROUND) { onFinish(results.filter(Boolean).length); return; }
    setIdx(i => i + 1); setPhase('frage'); setTries(0); setHilfe(false); setOk(false); setRk(k => k + 1);
  };

  const zeile = phase === 'frage'
    ? { a: t.leer === 'l' ? null : t.a, b: t.leer === 'r' ? null : t.b, leer: t.leer, frage: true }
    : { a: t.a, b: t.b, leer: t.leer, sol: !ok, farbe: ok ? '#dcfce7' : undefined };

  return (
    <div>
      <RoundDots current={idx} total={ROUND} results={results} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-6 items-start">
        <div className="flex flex-col items-center gap-5 pt-2">
          {phase === 'frage'
            ? <HausFrage key={idx} t={t} resetKey={rk} onSubmit={pruefe} />
            : <Zahlenhaus key={idx} n={t.n} zeilen={[{ ...zeile, hoch: true }]} zimmer={140} />}
          {hilfe && phase === 'frage' && <div className="anim-pop bg-white rounded-2xl border-4 border-indigo-200 px-4 py-3"><Stange a={t.a} b={t.b} leer={t.leer} /></div>}
        </div>
        <div className="flex flex-col items-center gap-4">
          {phase === 'fertig' && <Ergebnis ok={ok} n={gesucht} onNext={weiter} />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// HÄNDE (Zerlegen): sachlich gezeichnet, wechselnde Hauttöne, eigene Ärmelfarbe (orange),
// damit sie später nicht mit Finger-Bildern (zeigen eine Zahl) verwechselt werden.
// ==========================================
const HAUTTOENE = [
  { haut: '#f6d5b3', rand: '#c58f62' },
  { haut: '#e8b48a', rand: '#a8714a' },
  { haut: '#c98d5c', rand: '#8a5a33' },
  { haut: '#9c6640', rand: '#5f3a20' },
  { haut: '#6f4428', rand: '#3e2513' }
];
const AERMEL = { farbe: '#f97316', rand: '#9a3412' };
const WUERFEL = 40;   // Größe eines Steckwürfels in der Szene
const FAUST_B = 140;  // Faust immer gleich breit – die Größe darf die Anzahl nicht verraten
const SZENE_H = 250;

function wuerfelSvg(x, y, key, hohl = false) {
  const c = WUERFEL;
  return (
    <g key={key}>
      <rect x={x + c * 0.3} y={y} width={c * 0.4} height={c * 0.18} rx={2} fill={hohl ? '#fff' : COL.eDark} stroke={hohl ? COL.e : 'none'} strokeWidth={1.5} strokeDasharray={hohl ? '3 2' : undefined} />
      <rect x={x + 1} y={y + c * 0.16} width={c - 2} height={c - 2} rx={4} fill={hohl ? '#fff' : COL.e} stroke={hohl ? COL.e : COL.eDark} strokeWidth={2} strokeDasharray={hohl ? '5 3' : undefined} />
    </g>
  );
}

// Offene Hand von unten, die k Würfel trägt (Breite passt sich an). spiegel = rechte Hand.
function OffeneHand({ x, w, k, ton, spiegel = false, neu = false }) {
  const palmY = 158, palmH = 40, cx = x + w / 2;
  const daumenX = spiegel ? x + w - 6 : x + 6;
  return (
    <g className={neu ? 'anim-pop' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <rect x={cx - 24} y={palmY + palmH - 8} width={48} height={SZENE_H - palmY - palmH + 8} rx={6} fill={AERMEL.farbe} stroke={AERMEL.rand} strokeWidth={2.5} />
      <rect x={x} y={palmY} width={w} height={palmH} rx={20} fill={ton.haut} stroke={ton.rand} strokeWidth={2.5} />
      <ellipse cx={daumenX} cy={palmY + 6} rx={12} ry={18} fill={ton.haut} stroke={ton.rand} strokeWidth={2.5} />
      {[...Array(k)].map((_, i) => wuerfelSvg(cx - (k * WUERFEL) / 2 + i * WUERFEL, palmY - WUERFEL * 1.12, i))}
    </g>
  );
}

// Geschlossene Hand (Faust), immer gleich groß. hilfe = Würfel darin nur umrissen andeuten.
function Faust({ x, ton, spiegel = false, k = 0, hilfe = false }) {
  const w = FAUST_B, top = 70, h = 128, cx = x + w / 2;
  const fingerX0 = spiegel ? x + 34 : x + 18, fingerX1 = spiegel ? x + w - 18 : x + w - 34;
  return (
    <g>
      <rect x={cx - 24} y={top + h - 10} width={48} height={SZENE_H - top - h + 10} rx={6} fill={AERMEL.farbe} stroke={AERMEL.rand} strokeWidth={2.5} />
      <rect x={x + 8} y={top} width={w - 16} height={h} rx={34} fill={ton.haut} stroke={ton.rand} strokeWidth={2.5} />
      {[0, 1, 2].map(i => <path key={i} d={`M${fingerX0} ${top + 32 + i * 26} Q${(fingerX0 + fingerX1) / 2} ${top + 40 + i * 26} ${fingerX1} ${top + 32 + i * 26}`} fill="none" stroke={ton.rand} strokeWidth={2.5} strokeLinecap="round" />)}
      <path d={spiegel ? `M${x + w - 10} ${top + 20} Q${x + w - 44} ${top + 50} ${x + w - 30} ${top + 96}` : `M${x + 10} ${top + 20} Q${x + 44} ${top + 50} ${x + 30} ${top + 96}`} fill="none" stroke={ton.rand} strokeWidth={3} strokeLinecap="round" />
      {hilfe && k > 0 && (
        <g opacity={0.9}>
          {[...Array(k)].map((_, i) => {
            const col = i % 5, row = Math.floor(i / 5), s = 0.5;
            return <g key={i} transform={`translate(${cx - (Math.min(k, 5) * WUERFEL * s) / 2 + col * WUERFEL * s} ${top + 22 + row * WUERFEL * s * 1.15}) scale(${s})`}>{wuerfelSvg(0, 0, i, true)}</g>;
          })}
        </g>
      )}
    </g>
  );
}

// Szene für Stufe 2: Dach mit n, links Teil a, rechts Teil b; die verdeckte Seite (t.leer) ist eine Faust, solange offen = false
function HaendeSzene({ t, offen, ton, hilfe = false }) {
  const breite = (k) => Math.max(110, k * WUERFEL + 36);
  const zuL = !offen && t.leer === 'l', zuR = !offen && t.leer === 'r';
  const wl = zuL ? FAUST_B : breite(t.a), wr = zuR ? FAUST_B : breite(t.b);
  const gap = 56, W = wl + gap + wr, dachH = 66;
  return (
    <svg viewBox={`0 -${dachH + 10} ${W} ${SZENE_H + dachH + 10}`} width="100%" style={{ maxWidth: W, display: 'block', margin: '0 auto', overflow: 'visible' }}>
      {/* Dach mit der Zahl – bleibt immer sichtbar */}
      <path d={`M${W / 2 - 80} -6 L${W / 2} -${dachH} L${W / 2 + 80} -6 Z`} fill="#fde68a" stroke={COL.ink} strokeWidth={4} strokeLinejoin="round" />
      <text x={W / 2} y={-16} textAnchor="middle" fontSize={40} fontWeight="700" fill={COL.ink} fontFamily="Fuenfer Fredoka, sans-serif">{t.n}</text>
      {zuL ? <Faust x={0} ton={ton} k={t.a} hilfe={hilfe} /> : <OffeneHand x={0} w={wl} k={t.a} ton={ton} neu={offen && t.leer === 'l'} />}
      {zuR ? <Faust x={wl + gap} ton={ton} spiegel k={t.b} hilfe={hilfe} /> : <OffeneHand x={wl + gap} w={wr} k={t.b} ton={ton} spiegel neu={offen && t.leer === 'r'} />}
    </svg>
  );
}

// ==========================================
// 3D-HÄNDE (WebGL) als Baustein: Szene aus src/zerlege3d.js
// ==========================================
// stufe 1: Hände greifen die ganze Stange, brechen sie, ein Teil verschwindet in der Hand (dann onFertig)
// stufe 2: Stange schon geteilt, eine Hand schon zu (sofort onFertig). offen = true → Hand öffnet sich.
// lauf: hochzählen, um die Animation noch einmal abzuspielen. Ohne WebGL: onFehler → gezeichnete Hände.
function Haende3D({ t, stufe, offen, tausch = false, lauf = 0, onFertig, onFehler, platzUnten = 520, quer = false, minHoehe = 160 }) {
  const box = useRef(null);
  const szene = useRef(null);
  const fertigRef = useRef(onFertig); fertigRef.current = onFertig;
  const fehlerRef = useRef(onFehler); fehlerRef.current = onFehler;
  useEffect(() => {
    try {
      szene.current = erzeugeZerlegeSzene(box.current, { modellPfad: 'modelle/' });
      szene.current.bereit.catch(() => fehlerRef.current && fehlerRef.current());
    } catch (e) { fehlerRef.current && fehlerRef.current(); }
    return () => { if (szene.current) szene.current.aufraeumen(); };
  }, []);
  useEffect(() => {
    const s = szene.current; if (!s) return undefined;
    let abbruch = false;
    (async () => {
      await s.setze({ n: t.n, a: t.a, b: t.b, leer: t.leer, haut: HAUT[t.hautNr] });
      if (abbruch) return;
      if (stufe === 1) { await new Promise(r => setTimeout(r, 900)); if (abbruch) return; await s.abspielen(); } else s.setzeGeschlossen();
      if (!abbruch && fertigRef.current) fertigRef.current();
    })().catch(() => fehlerRef.current && fehlerRef.current());
    return () => { abbruch = true; };
  }, [t, lauf]); // eslint-disable-line react-hooks/exhaustive-deps
  // Hand öffnen, danach (Tauschaufgabe) Stange umdrehen – nacheinander, nicht gleichzeitig
  const oeffnenRef = useRef(Promise.resolve());
  useEffect(() => { if (offen && szene.current) oeffnenRef.current = szene.current.oeffnen().catch(() => {}); }, [offen]);
  useEffect(() => { if (tausch && szene.current) oeffnenRef.current.then(() => szene.current && szene.current.tauschen()).catch(() => {}); }, [tausch]);
  return (
    <div className="w-full">
      {/* Die Zahl liegt als Karte vorne auf dem Tisch (in der 3D-Szene) und bleibt immer sichtbar */}
      {/* Höhe passt sich dem Bildschirm an (iPad quer: Schreibfeld und Prüfen-Haken bleiben ohne Scrollen sichtbar) */}
      <div ref={box} className="w-full rounded-2xl overflow-hidden" style={quer ? { aspectRatio: '1.45', maxHeight: `calc(100dvh - ${platzUnten}px)` } : { height: `min(56vw, 400px, max(${minHoehe}px, calc(100dvh - ${platzUnten}px)))` }} />
    </div>
  );
}

// Querformat mit wenig Höhe (iPad quer, mit Safari-Leisten): dort stehen Schreibfeld und Zahl NEBEN den Händen,
// sonst reicht die Höhe nicht für Bild + Schreibfeld übereinander.
const QUER = '(orientation: landscape) and (max-height: 900px)';
const SCHMAL = '(max-width: 639px)'; // Handy hoch: zu schmal für Feld + Knöpfe nebeneinander unter einer Hand
function useMedia(abfrage) {
  const [an, setAn] = useState(() => typeof window !== 'undefined' && window.matchMedia(abfrage).matches);
  useEffect(() => {
    const mq = window.matchMedia(abfrage), h = () => setAn(mq.matches);
    mq.addEventListener('change', h); return () => mq.removeEventListener('change', h);
  }, [abfrage]);
  return an;
}
const useQuerFormat = () => useMedia(QUER);
// Handy quer (sehr wenig Höhe): Dafür reicht keine Anordnung der Übungen – die App bittet mit einem Bild ums Drehen
const HANDY_QUER = '(orientation: landscape) and (max-height: 480px)';
function DrehHinweis() {
  return (
    <div className="no-print fixed inset-0 z-[240] bg-indigo-950 flex flex-col items-center justify-center gap-4 text-yellow-300" role="alert" aria-label="Bitte das Handy hochkant drehen">
      <div className="relative">
        <Smartphone className="w-24 h-24 rotate-90" strokeWidth={1.6} />
        <RotateCw className="w-12 h-12 absolute -right-8 -top-6 text-white" strokeWidth={2.4} />
      </div>
      <Smartphone className="w-20 h-20" strokeWidth={1.6} />
    </div>
  );
}

// ==========================================
// ZERLEGEN STUFE 1 und 2 (Hände): „Wie viele sind in der Hand?“
// ==========================================
// Stufe 1: volle Animation (Zahl wird genannt, Hände greifen, brechen, eine Hand schließt sich), dann Frage.
// Stufe 2: Stange ist schon geteilt, eine Hand ist schon zu. Danach bei beiden: Hand öffnet sich zur Kontrolle,
// Zahlenhaus-Zeile n | a | b, Tauschaufgabe (Stange dreht sich um).
function ZerlegeHandGame({ onFinish, zahl, stufe }) {
  const { mitNull, eingabe } = useSettings();
  const quer = useQuerFormat();
  const schmal = useMedia(SCHMAL) && !quer;
  const say = useSay();
  const [tasks] = useState(() => stufenAufgaben(zahl, mitNull).map(t => {
    const hautNr = Math.floor(Math.random() * HAUT.length);
    return { ...t, hautNr, ton: HAUTTOENE[hautNr % HAUTTOENE.length] };
  }));
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [phase, setPhase] = useState(stufe === 1 ? 'zeigen' : 'frage'); // zeigen | frage | offen | tausch | fertig
  const [tries, setTries] = useState(0);
  const [hilfe, setHilfe] = useState(false);
  const [ok, setOk] = useState(false);
  const [rk, setRk] = useState(0);
  const [lauf, setLauf] = useState(0);
  const [ohne3D, setOhne3D] = useState(false);
  const timers = useRef([]);
  const aufgabeNr = useRef(0); // wechselt bei jeder neuen Aufgabe – alte Folgesätze verfallen dann
  useEffect(() => () => { timers.current.forEach(clearTimeout); aufgabeNr.current += 1; }, []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const t = tasks[idx];
  const gesucht = gesuchtVon(t);

  // „Die 5 zerlege ich in 3 und …?“ – Stufe 1: während die Hände zerlegen (kurz nach dem Start der Animation),
  // Stufe 2: sofort. Die sichtbare Anzahl wird genannt, die versteckte gesucht.
  const sichtbar = t.leer === 'l' ? t.b : t.a;
  useEffect(() => {
    if (stufe === 1) later(() => say('zerlege_frage', t), 700); else say('zerlege_frage', t);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps
  const animationFertig = () => { if (stufe === 1 && phase === 'zeigen') setPhase('frage'); };
  useEffect(() => { if (ohne3D && phase === 'zeigen') animationFertig(); }, [ohne3D, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = (good) => setResults(r => { const c = [...r]; c[idx] = good; return c; });
  const pruefe = (x) => {
    if (x === gesucht) {
      setOk(true); setPhase('offen'); record(tries === 0);
      const gesagt = say('zerlege_richtig', t) || Promise.resolve();
      // Tauschaufgabe: Stange dreht sich einmal um (nicht bei gleichen Teilen, z. B. 3|3).
      // Erst wenn „Richtig! 4 ist 3 und 1.“ zu Ende ist (mindestens 2,2 s, damit die Hand offen ist) – sonst fehlt die letzte Zahl.
      if (t.a !== t.b) {
        const nr = aufgabeNr.current;
        Promise.all([gesagt.catch(() => {}), new Promise(ok => setTimeout(ok, 2200))]).then(() => {
          if (nr !== aufgabeNr.current) return;
          setPhase('tausch'); say('zerlege_tausch', t);
          later(() => setPhase('fertig'), ohne3D ? 1400 : 3100);
        });
      } else later(() => setPhase('fertig'), 1400);
      return;
    }
    if (tries === 0) { setTries(1); setHilfe(true); setRk(k => k + 1); say(ohne3D ? 'stufe2_hilfe' : 'zerlege_hilfe'); return; }
    setOk(false); setPhase('fertig'); record(false); say('zerlege_loesung', t);
  };
  const weiter = () => {
    if (idx + 1 >= ROUND) { onFinish(results.filter(Boolean).length); return; }
    timers.current.forEach(clearTimeout); timers.current = []; aufgabeNr.current += 1;
    setIdx(i => i + 1); setPhase(stufe === 1 ? 'zeigen' : 'frage'); setTries(0); setHilfe(false); setOk(false); setRk(k => k + 1);
  };
  const nochmalAnsehen = () => { if (phase === 'frage') { setPhase('zeigen'); setLauf(l => l + 1); } };

  const offen = phase === 'offen' || phase === 'tausch' || phase === 'fertig';
  const zeilen = [{ a: t.a, b: t.b, leer: t.leer, sol: !ok, farbe: ok ? paarFarbe(t.a, t.b) : undefined }];
  if (ok && t.a !== t.b && (phase === 'tausch' || phase === 'fertig')) zeilen.push({ a: t.b, b: t.a, farbe: paarFarbe(t.a, t.b), neu: true });

  // Bausteine der Seite: Schreibfeld (unter bzw. neben der geschlossenen Hand), sichtbare Anzahl (Stufe 2), Ergebnis
  const eingabeFeld = (seite) => <ZahlEingabe onSubmit={pruefe} resetKey={rk} nurEiner={t.n < 10} kompakt={!quer} knoepfeLinks={seite === 'r'} klein={quer} eng={schmal} />;
  const zahlKasten = stufe === 2 && (
    <div className="flex items-center justify-center bg-white border-4 border-indigo-900 rounded-2xl font-bold text-indigo-950 leading-none shadow-[4px_4px_0_rgba(30,27,75,0.2)]" style={schmal ? { width: 60, height: 112, fontSize: 54 } : { width: 96, height: 150, fontSize: 80 }}>{sichtbar}</div>
  );
  const nochmalKnopf = stufe === 1 && phase === 'frage' && !ohne3D && (
    <button onClick={nochmalAnsehen} aria-label="Nochmal ansehen" title="Nochmal ansehen" className="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-2xl px-5 py-3 active:scale-95"><Eye className="w-8 h-8" /><RotateCcw className="w-6 h-6" /></button>
  );
  const ergebnisTeil = (
    <>
      {offen && <Zahlenhaus key={`h${idx}`} n={t.n} zeilen={zeilen} zimmer={64} />}
      {phase === 'offen' && ok && <Cheer />}
      {phase === 'fertig' && <Ergebnis ok={ok} n={gesucht} onNext={weiter} jubel={false} />}
    </>
  );
  // Querformat: Spalte links bzw. rechts neben dem Bild – auf der Seite der geschlossenen Hand Schreibfeld, danach das Ergebnis
  const seitenSpalte = (seite) => {
    const gesuchte = t.leer === seite;
    let inhalt = null;
    if (phase === 'frage') inhalt = gesuchte ? eingabeFeld(seite) : (zahlKasten || nochmalKnopf);
    else if (offen && gesuchte) inhalt = ergebnisTeil;
    return <div className="w-[215px] shrink-0 flex flex-col items-center justify-center gap-4 self-stretch">{inhalt}</div>;
  };
  const szene = (
    <div className={`${quer ? 'flex-1 min-w-0' : 'w-full'} bg-white rounded-3xl border-4 border-indigo-900 shadow-[6px_6px_0_rgba(30,27,75,0.25)] p-2`}>
      {ohne3D
        ? <div className="pt-4 pb-2"><HaendeSzene key={idx} t={t} offen={offen} ton={t.ton} hilfe={hilfe && !offen} /></div>
        : <Haende3D t={t} stufe={stufe} offen={offen} tausch={ok && t.a !== t.b && (phase === 'tausch' || phase === 'fertig')} lauf={lauf} onFertig={animationFertig} onFehler={() => setOhne3D(true)} platzUnten={quer ? 305 : eingabe === 'tasten' ? (schmal ? 530 : 600) : (schmal ? 470 : 505)} quer={quer} minHoehe={schmal ? 130 : 160} />}
    </div>
  );

  return (
    <div>
      <RoundDots current={idx} total={ROUND} results={results} />
      <div className="flex flex-col items-center gap-4 w-full">
        {quer ? (
          // Querformat: [Spalte links] [Hände] [Spalte rechts]
          <div className="w-full flex items-stretch gap-3">{seitenSpalte('l')}{szene}{seitenSpalte('r')}</div>
        ) : (
          // Hochformat: Hände über die ganze Breite, Schreibfeld unter der geschlossenen Hand (Stufe 2: Zahl unter der offenen)
          <>
            {szene}
            {phase === 'frage' && (schmal ? (
              // Handy hoch: Schreibfeld (Knöpfe darunter) und Zahl links/rechts außen – auf der Seite ihrer Hand
              <div className={`w-full flex items-start justify-between gap-2 px-1 ${t.leer === 'r' ? 'flex-row-reverse' : ''}`}>
                {eingabeFeld(t.leer)}
                {zahlKasten || <div />}
              </div>
            ) : (
              <div className="w-full grid grid-cols-2 gap-2 items-start justify-items-center">
                {['l', 'r'].map(seite => <div key={seite} className="min-w-0 flex justify-center">{t.leer === seite ? eingabeFeld(seite) : zahlKasten}</div>)}
              </div>
            ))}
            {nochmalKnopf}
          </>
        )}
        {hilfe && phase === 'frage' && !ohne3D && <div className="anim-pop bg-white rounded-2xl border-4 border-indigo-200 px-4 py-3"><Stange a={t.a} b={t.b} leer={t.leer} /></div>}
        {/* Ohne WebGL: Tausch als flache Stange */}
        {ohne3D && phase === 'tausch' && <div className="anim-flip"><Stange a={t.a} b={t.b} /></div>}
        {ohne3D && phase === 'fertig' && ok && t.a !== t.b && <div className="anim-pop"><Stange a={t.b} b={t.a} /></div>}
        {!quer && <div className="flex flex-wrap items-center justify-center gap-6">{ergebnisTeil}</div>}
      </div>
    </div>
  );
}
const Stufe1Game = (props) => <ZerlegeHandGame {...props} stufe={1} />;
const Stufe2Game = (props) => <ZerlegeHandGame {...props} stufe={2} />;

// ==========================================
// PLUSAUFGABE als Baustein (Stufe 4 und Prüfung): „7 = ___ + 4“
// ==========================================
// Gleichung groß; wert = Zahl in der Lücke (null = leer), farbe für die Zahl, leuchten = richtig
function PlusGleichung({ t, wert = null, farbe = '#4f46e5', leuchten = false }) {
  const luecke = (
    <span className={`inline-flex items-center justify-center rounded-2xl border-4 ${wert == null ? 'border-dashed border-indigo-400 bg-white' : 'border-indigo-300 bg-indigo-50'} ${leuchten ? 'anim-glow-ok' : ''}`}
      style={{ width: '1.25em', height: '1.25em', color: farbe }}>{wert == null ? '' : wert}</span>
  );
  return (
    <div className="flex items-center gap-3 sm:gap-5 bg-white rounded-3xl border-4 border-indigo-900 shadow-[6px_6px_0_rgba(30,27,75,0.25)] px-5 sm:px-8 py-4 text-6xl sm:text-7xl font-bold text-indigo-950 leading-none">
      <span>{t.n}</span><span className="text-indigo-400">=</span>
      {t.leer === 'l' ? luecke : <span>{t.a}</span>}
      <span className="text-indigo-400">+</span>
      {t.leer === 'r' ? luecke : <span>{t.b}</span>}
    </div>
  );
}

// Eingabe: Zahlenfelder zum Draufdrücken, die gewählte Zahl erscheint in der Lücke, dann ✓.
// onStart beim ersten Tipp (Bedenkzeit in der Prüfung).
function PlusFrage({ t, onSubmit, onStart, unten = null }) {
  const [wahl, setWahl] = useState(null);
  const getippt = useRef(false);
  const maxZahl = Math.min(9, t.n); // gesucht ist immer eine einzelne Ziffer
  const tippe = (k) => { if (!getippt.current) { getippt.current = true; if (onStart) onStart(); } setWahl(k); };
  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6">
      <PlusGleichung t={t} wert={wahl} />
      {unten}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-[300px] sm:max-w-xl">
        {[...Array(maxZahl + 1)].map((_, k) => (
          <button key={k} onClick={() => tippe(k)} aria-label={`Zahl ${k}`}
            className={`w-[52px] h-[52px] sm:w-20 sm:h-20 rounded-2xl border-4 text-3xl sm:text-5xl font-bold shadow-[0_4px_0_#c7d2fe] active:translate-y-1 active:shadow-none ${wahl === k ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-950 border-indigo-200 hover:bg-indigo-50'}`}>{k}</button>
        ))}
      </div>
      <button onClick={() => wahl != null && onSubmit(wahl)} disabled={wahl == null} aria-label="Prüfen" title="Prüfen" className="h-16 px-12 rounded-2xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-indigo-950 shadow-[0_4px_0_#ca8a04] active:translate-y-1 active:shadow-none inline-flex items-center justify-center"><Check className="w-10 h-10" strokeWidth={3} /></button>
    </div>
  );
}

// ==========================================
// ZERLEGEN STUFE 4: Plusaufgabe „7 = ___ + 4“ – die fehlende Zahl durch Antippen eintragen
// ==========================================
function PlusGame({ onFinish, zahl }) {
  const { mitNull } = useSettings();
  const say = useSay();
  const [tasks] = useState(() => stufenAufgaben(zahl, mitNull, true));
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [phase, setPhase] = useState('frage'); // frage | fertig
  const [tries, setTries] = useState(0);
  const [hilfe, setHilfe] = useState(false);
  const [ok, setOk] = useState(false);
  const t = tasks[idx];
  const gesucht = gesuchtVon(t);

  // gleicher Satz wie im Zahlenhaus: „Wie viel muss ich zur 4 dazuzählen, damit ich 7 erhalte?“
  useEffect(() => { say('zerlege_aufgabe', t); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = (good) => setResults(r => { const c = [...r]; c[idx] = good; return c; });
  const pruefe = (x) => {
    if (x === gesucht) { setOk(true); setPhase('fertig'); record(tries === 0); say('zerlege_richtig', t); return; }
    if (tries === 0) { setTries(1); setHilfe(true); say('zerlege_hilfe'); return; }
    setOk(false); setPhase('fertig'); record(false); say('zerlege_loesung', t);
  };
  const weiter = () => {
    if (idx + 1 >= ROUND) { onFinish(results.filter(Boolean).length); return; }
    setIdx(i => i + 1); setPhase('frage'); setTries(0); setHilfe(false); setOk(false);
  };
  const stange = hilfe ? <div className="anim-pop bg-white rounded-2xl border-4 border-indigo-200 px-4 py-3"><Stange a={t.a} b={t.b} leer={t.leer} /></div> : null;

  return (
    <div>
      <RoundDots current={idx} total={ROUND} results={results} />
      <div className="flex flex-col items-center gap-6 pt-2">
        {phase === 'frage'
          ? <PlusFrage key={`${idx}-${tries}`} t={t} onSubmit={pruefe} unten={stange} />
          : (
            <>
              <PlusGleichung t={t} wert={gesucht} farbe={ok ? COL.ink : COL.sol} leuchten={ok} />
              <Ergebnis ok={ok} n={gesucht} onNext={weiter} />
            </>
          )}
      </div>
    </div>
  );
}

// kleines Bild für die Menükarte: „7 = □ + 4“
function PlusSymbol({ n = 7 }) {
  return (
    <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-1.5 text-3xl font-bold text-indigo-950 leading-none">
      <span>{n}</span><span className="text-indigo-400">=</span>
      <span className="inline-block w-7 h-8 rounded-md border-[3px] border-dashed border-indigo-400" />
      <span className="text-indigo-400">+</span><span>{Math.max(1, n - 3)}</span>
    </div>
  );
}

// ==========================================
// PASS-PROBE: alle Zerlegungen einmal, ohne Hilfe; daneben füllt sich das geordnete Zahlenhaus
// ==========================================
// Gemessen wird nur die Bedenkzeit (Aufgabe sichtbar bis erster Strich bzw. erster Tipp), nicht die Schreibzeit.
function ProbeGame({ zahl }) {
  const { mitNull, blitzGrenze } = useSettings();
  const say = useSay();
  const [lauf, setLauf] = useState(0);
  const [tasks, setTasks] = useState(() => probeAufgaben(zahl, mitNull));
  const [idx, setIdx] = useState(0);
  const [voll, setVoll] = useState({}); // "a|b" → richtig
  const [blitz, setBlitz] = useState({});
  const [zuletzt, setZuletzt] = useState(null); // kurz zeigen: richtig eingetragen
  const [ende, setEnde] = useState(false);
  const [rk, setRk] = useState(0);
  const startRef = useRef(0);
  const denkRef = useRef(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const t = tasks[idx];

  useEffect(() => { if (lauf === 0) say('probe_start'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ende) return;
    startRef.current = Date.now(); denkRef.current = null;
    const s = setTimeout(() => say('zerlege_aufgabe', t), lauf === 0 && idx === 0 ? 1200 : 0);
    return () => clearTimeout(s);
  }, [idx, lauf]); // eslint-disable-line react-hooks/exhaustive-deps

  const onStart = () => { if (denkRef.current == null) denkRef.current = Date.now() - startRef.current; };
  const pruefe = (x) => {
    if (zuletzt) return;
    const k = `${t.a}|${t.b}`;
    const richtig = x === gesuchtVon(t);
    const schnell = richtig && denkRef.current != null && denkRef.current < blitzGrenze;
    const nv = richtig ? { ...voll, [k]: true } : voll;
    const nb = schnell ? { ...blitz, [k]: true } : blitz;
    setVoll(nv); setBlitz(nb); setZuletzt({ richtig, k });
    timer.current = setTimeout(() => {
      setZuletzt(null);
      if (idx + 1 >= tasks.length) {
        setEnde(true);
        say('probe_ende', { richtig: Object.keys(nv).length, gesamt: tasks.length, blitz: Object.keys(nb).length });
      } else { setIdx(i => i + 1); setRk(r => r + 1); }
    }, 900);
  };
  const nochmal = () => {
    setTasks(probeAufgaben(zahl, mitNull)); setIdx(0); setVoll({}); setBlitz({}); setEnde(false); setZuletzt(null); setRk(r => r + 1); setLauf(l => l + 1);
  };

  if (ende) {
    const r = Object.keys(voll).length, b = Object.keys(blitz).length;
    return (
      <div className="flex flex-col items-center gap-6 py-2">
        <div className="flex flex-wrap items-center justify-center gap-6 text-5xl font-bold text-indigo-950">
          <span className="flex items-center gap-2"><Check className="w-12 h-12 text-lime-600" strokeWidth={3} />{r} / {tasks.length}</span>
          <span className="flex items-center gap-2"><Zap className="w-12 h-12 fill-yellow-300 text-yellow-500" />{b}</span>
        </div>
        <GeordnetesHaus n={zahl} voll={voll} blitz={blitz} zimmer={64} animiert />
        <button onClick={nochmal} aria-label="Nochmal" title="Nochmal" className="bg-yellow-400 hover:bg-yellow-300 text-indigo-950 rounded-2xl p-5 active:scale-95"><RotateCcw className="w-10 h-10" /></button>
      </div>
    );
  }

  const zeile = zuletzt
    ? { a: t.a, b: t.b, leer: t.leer, farbe: zuletzt.richtig ? '#dcfce7' : '#f1f5f9' }
    : { a: t.leer === 'l' ? null : t.a, b: t.leer === 'r' ? null : t.b, leer: t.leer, frage: true };
  if (zuletzt && !zuletzt.richtig) { if (t.leer === 'l') zeile.a = null; else zeile.b = null; } // ohne Hilfe: keine Lösung zeigen

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1.5">{tasks.map((_, i) => <div key={i} className={`h-3 rounded-full ${i === idx ? 'w-10 bg-indigo-600' : i < idx ? 'w-6 bg-indigo-400' : 'w-6 bg-indigo-200'}`} />)}</div>
        {t.form === 'plus'
          ? (zuletzt
            ? <PlusGleichung t={t} wert={zuletzt.richtig ? gesuchtVon(t) : null} farbe={COL.ink} leuchten={zuletzt.richtig} />
            : <PlusFrage key={`${lauf}-${idx}`} t={t} onSubmit={pruefe} onStart={onStart} />)
          : (zuletzt
            ? <Zahlenhaus key={`${lauf}-${idx}`} n={t.n} zeilen={[{ ...zeile, hoch: true }]} zimmer={140} />
            : <HausFrage key={`${lauf}-${idx}`} t={t} resetKey={`${lauf}-${rk}`} onSubmit={pruefe} onStart={onStart} />)}
      </div>
      <div className="flex flex-col items-center gap-2 bg-white/60 rounded-3xl p-3 pr-12">
        <GeordnetesHaus n={zahl} voll={voll} blitz={blitz} zimmer={48} />
      </div>
    </div>
  );
}

// ==========================================
// LISTE DER ÜBUNGEN (erweiterbar)
// ==========================================
const GAMES = [
  { id: 'legen5', title: 'Legen', icon: Blocks, comp: LegenGame },
  { id: 'blitz5', title: 'Blitzblick', icon: Eye, comp: BlitzGame },
  { id: 'umkehr5', title: 'Hören und legen', icon: Ear, comp: UmkehrGame },
  { id: 'frei5', title: 'Frei legen', icon: Shapes, comp: FreiLegen, intro: 'frei_intro' }
].map(g => ({ ...g, bereich: 'kraft' }));
const ZGAMES = [
  { id: 'z1', title: 'Stufe 1', stufe: 1, comp: Stufe1Game, bild: 'stufe1' }, // zwei Hände halten die ganze Stange
  { id: 'z2', title: 'Stufe 2', stufe: 2, comp: Stufe2Game, bild: 'stufe2' }, // eine Hand zu, eine offen
  { id: 'z3', title: 'Stufe 3', stufe: 3, comp: Stufe3Game },
  { id: 'z4', title: 'Plusaufgaben', stufe: 4, comp: PlusGame }, // „7 = ___ + 4“, Zahl antippen
  { id: 'zprobe', title: 'Prüfung', icon: Award, comp: ProbeGame, ohneGemischt: true, eigenesEnde: true }
].map(g => ({ ...g, bereich: 'zerlegen' }));
const gameById = (id) => [...GAMES, ...ZGAMES].find(g => g.id === id);

const BEREICHE = [
  { id: 'kraft', satz: 'start_kraft', title: 'Kraft der 5' },
  { id: 'zerlegen', satz: 'start_zerlegen', title: 'Zerlegen' }
];

// ==========================================
// ARBEITSBLÄTTER (A4 hoch, Druck über den Browser – funktionieren auch in Schwarz-Weiß)
// ==========================================
// Kinder in Klasse 1 können großteils nicht lesen: Jedes Blatt hat oben ein großes Symbol und als erste Aufgabe
// ein gelöstes Beispiel (gestrichelter Rahmen, Stern). Der Aufgabentext ist klein und für die Lehrkraft.
const BLAETTER = {
  malen: { bereich: 'kraft', titel: 'Zahlen malen', icon: PenLine, anzahl: 6,
    text: 'Male so viele Punkte an, wie die Tafel zeigt: zuerst die Fünfer, dann die Einer. Schreib dann die Zahl in das Kästchen.' },
  wieviele: { bereich: 'kraft', titel: 'Wie viele?', icon: Eye, anzahl: 8,
    text: 'Wie viele Punkte sind es? Nutze die Fünfer – nicht einzeln zählen. Schreib die Zahl in das Kästchen.' },
  karten: { bereich: 'kraft', titel: 'Blitz-Karten', icon: Scissors, anzahl: 8, ohneLoesung: true,
    text: 'Karten ausschneiden und an der gestrichelten Linie nach hinten knicken. Kind A zeigt die Punkte ganz kurz, Kind B sagt die Zahl. Umdrehen zur Kontrolle, dann tauschen.' },
  hoeren: { bereich: 'kraft', titel: 'Hör-Diktat', icon: Ear, anzahl: 6, vorlesen: true,
    text: 'Hör gut zu! Male die Zahl ins Feld: zuerst die Fünfer, dann die Einer. (Die Zahlen stehen auf der Vorlese-Liste für die Lehrkraft.)' },
  fuenfer: { bereich: 'kraft', titel: 'Fünfer und Einer', icon: Blocks, anzahl: 8,
    text: 'Wie viele Fünfer und wie viele Einer hat die Zahl? Schreib es in die Tafel.' },
  versteck: { bereich: 'zerlegen', titel: 'Versteck-Bilder', icon: Hand, anzahl: 6,
    text: 'Wie viele Würfel sind in der Hand versteckt? Die Zahl im Dach sagt, wie viele es zusammen sind. Schreib die Zahl in das Kästchen unter der Hand.' },
  haeuser: { bereich: 'zerlegen', titel: 'Zahlenhäuser', icon: Home, bild: true,
    text: 'Welche Zahl fehlt? Schreib sie in das leere Zimmer. Beide Zimmer zusammen ergeben die Zahl im Dach.' },
  ganzes: { bereich: 'zerlegen', titel: 'Ganzes Zahlenhaus', icon: Award,
    text: 'Fülle das Zahlenhaus der Reihe nach: oben die ganze Zahl und 0, dann immer einen weniger links und einen mehr rechts.' },
  plus: { bereich: 'zerlegen', titel: 'Plusaufgaben', icon: PlusZeichen, anzahl: 10, bild: true,
    text: 'Welche Zahl fehlt? Schreib sie in das Kästchen.' }
};

// Das gelöste Beispiel vorne soll das Vorgehen zeigen – also keine Zerlegung mit 0
const beispielVorn = (liste) => {
  const k = liste.findIndex(t => t.a > 0 && t.b > 0);
  if (k > 0) [liste[0], liste[k]] = [liste[k], liste[0]];
  return liste;
};

// Aufgaben für ein Blatt (Zufall; „Neue Zahlen“ erzeugt neue)
function blattAufgaben(typ, { maxN, zahl, mitNull }) {
  const b = BLAETTER[typ];
  const zahlen = (k) => zahl === 'gemischt' ? mischen(ZERLEGE_ZAHLEN).concat(mischen(ZERLEGE_ZAHLEN)).slice(0, k) : Array(k).fill(zahl);
  switch (b.bereich === 'kraft' ? 'kraft' : typ) {
    case 'kraft': return legeZahlen(b.anzahl, maxN).map(n => ({ n }));
    case 'versteck': return beispielVorn(stufenAufgaben(zahl, mitNull).slice(0, b.anzahl));
    case 'plus': return beispielVorn(stufenAufgaben(zahl, mitNull, true).slice(0, b.anzahl));
    case 'haeuser': {
      // eine Zahl: zwei Häuser mit allen Zerlegungen (gemischt); gemischt: sechs Häuser mit je vier Zeilen
      const proHaus = zahl === 'gemischt' ? 4 : null;
      return zahlen(zahl === 'gemischt' ? 6 : 2).map((n, i) => {
        const zeilen = mischen(zerlegungen(n, mitNull)).slice(0, proHaus || undefined).map(([a, c]) => ({ a, b: c, leer: leeresZimmer(a, c) }));
        return { n, zeilen: i === 0 ? beispielVorn(zeilen) : zeilen };
      });
    }
    case 'ganzes': return zahlen(zahl === 'gemischt' ? 3 : 2).map(n => ({ n }));
    default: return [];
  }
}

// ---------- Bausteine (Maße in mm) ----------
const mm = (v) => `${v}mm`;

// Zwanzigerfeld zum Anmalen (n = 0) bzw. als Bild. Druckfest: dunkle Umrisse, gefüllte gegen leere Punkte.
// Volle Reihen (zwei Fünfer) blau wie in der App.
function BlattFeld({ n = 0, maxN = 20, breite = 80 }) {
  const rows = maxN / 10, H = fieldH(rows), f = Math.floor(n / 5);
  const blau = (i) => i < 5 * f && f >= 2 * Math.floor(i / 10) + 2;
  return (
    <svg viewBox={`0 0 ${FIELD_W} ${H}`} style={{ width: mm(breite), height: mm(breite * H / FIELD_W), display: 'block', overflow: 'visible' }}>
      {[...Array(maxN / 5)].map((_, h) => { const r = halfRect(h); return <rect key={`h${h}`} x={r.x - 0.7} y={r.y - 0.7} width={r.w + 1.4} height={r.h + 1.4} rx={U * 0.55} fill="none" stroke="#6b7280" strokeWidth={0.45} strokeDasharray="1.6 1.2" />; })}
      {[...Array(f)].map((_, h) => { const r = halfRect(h); const bl = blau(5 * h); return <rect key={`f${h}`} x={r.x - 0.2} y={r.y + 0.3} width={r.w + 0.4} height={r.h - 0.6} rx={U * 0.45} fill={bl ? COL.zLight : COL.eLight} stroke="#111827" strokeWidth={0.8} />; })}
      {[...Array(maxN)].map((_, i) => { const c = slotPos(i), voll = i < n; return <circle key={i} cx={c.x} cy={c.y} r={DOT_R} fill={voll ? (blau(i) ? COL.z : COL.e) : '#fff'} stroke={voll ? '#111827' : '#6b7280'} strokeWidth={voll ? 0.6 : 0.5} />; })}
    </svg>
  );
}

// Schreibkästchen; wert = Lösung (violett) oder Beispiel
function Kasten({ wert = null, sol = false, breite = 20, hoehe = 15 }) {
  return (
    <div style={{ width: mm(breite), height: mm(hoehe), border: '0.5mm solid #374151', borderRadius: '2mm', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: mm(hoehe * 0.72), fontWeight: 700, lineHeight: 1, color: sol ? COL.sol : '#111827', flexShrink: 0 }}>{wert}</div>
  );
}

// Tafel „Fünfer | Einer“ wie in der App (leer = Kästchen zum Ausfüllen)
function BlattTafel({ f, e, leer = false, sol = false, beispiel = false, klein = false }) {
  const feld = (wert) => leer
    ? <Kasten wert={sol || beispiel ? wert : null} sol={sol && !beispiel} breite={12} hoehe={12} />
    : <span style={{ fontSize: '10mm', fontWeight: 700, lineHeight: 1, color: COL.eDark }}>{wert}</span>;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'stretch', border: '0.7mm solid #1e1b4b', borderRadius: '3mm', background: '#fff', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: klein ? '1.5mm' : '2.5mm', padding: klein ? '1.5mm 2mm' : '1.5mm 3mm' }}><FridaSvg size={klein ? 54 : 70} />{feld(f)}</div>
      <div style={{ width: '0.7mm', background: '#1e1b4b' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: klein ? '1.5mm' : '2.5mm', padding: klein ? '1.5mm 2mm' : '1.5mm 3mm' }}><EliSvg size={klein ? 17 : 20} />{feld(e)}</div>
    </div>
  );
}

// Steckwürfel-Stange für Blätter: bekannter Teil grün, gesuchter Teil nur gestrichelt umrissen (zum Nachzählen).
// Die Fünfer-Gliederung zählt über die GANZE Stange: nach dem 5. Würfel eine ganz kleine Lücke, damit immer
// zwei Fünferpakete erkennbar sind (10 = 2 + 8: 2 grün, 3 gestrichelt | 5 gestrichelt). Zwischen den Teilen die größere Lücke;
// fällt sie auf die Fünfergrenze (5 + 5), gibt es nur sie. Ein Teil mit genau 10 Würfeln ist ein Zehner und wird blau.
// start = Platz des ersten Würfels in der ganzen Stange (bei den Plusaufgaben steht jeder Teil einzeln unter seiner Zahl).
const fuenferLuecke = (w) => w * 0.16;
function stangeLage(a, b, w, start = 0) {
  const gap = w * 0.5, xs = [];
  for (let g = 0; g < a + b; g++) {
    const ges = start + g;
    const teilLuecke = a > 0 && b > 0 && g >= a;
    const fuenfer = ges >= 5 && start < 5 && !(teilLuecke && start + a === 5);
    xs.push(g * w + (fuenfer ? fuenferLuecke(w) : 0) + (teilLuecke ? gap : 0));
  }
  return { xs, breite: xs.length ? xs[xs.length - 1] + w : 0 };
}
function stangeTeile(a, b, leer, w, start = 0) {
  const { xs } = stangeLage(a, b, w, start);
  const wuerfel = (x, key, hohl, blau) => (
    <g key={key}>
      <rect x={x + w * 0.3} y={0} width={w * 0.4} height={w * 0.18} rx={0.2} fill={hohl ? '#fff' : blau ? COL.zDark : COL.eDark} stroke={hohl ? '#374151' : 'none'} strokeWidth={0.15} />
      <rect x={x + 0.1} y={w * 0.16} width={w - 0.2} height={w - 0.2} rx={0.4} fill={hohl ? '#fff' : blau ? COL.z : COL.e} stroke={hohl ? '#374151' : blau ? COL.zDark : COL.eDark} strokeWidth={0.22} strokeDasharray={hohl ? '0.6 0.4' : undefined} />
    </g>
  );
  return xs.map((x, g) => (g < a ? wuerfel(x, `a${g}`, leer === 'l', a === 10) : wuerfel(x, `b${g}`, leer === 'r', b === 10)));
}
const stangeBreite = (a, b, w, start = 0) => stangeLage(a, b, w, start).breite;
function BlattStange({ a, b, leer = null, w = 3.6, start = 0 }) {
  const width = stangeBreite(a, b, w, start), teile = stangeTeile(a, b, leer, w, start);
  return <svg viewBox={`0 0 ${Math.max(width, 1)} ${w * 1.2}`} style={{ width: mm(Math.max(width, 1)), height: mm(w * 1.2), display: 'block', overflow: 'visible' }}>{teile}</svg>;
}

// Zahlenhaus für Blätter (gleiche Form wie in der App): zeilen = [{ a, b, zeigeA, zeigeB, farbe, leer }]
function BlattHaus({ n, zeilen, z = 15, sol = false, bild = false }) {
  const h = z * 0.68, dach = z * 0.85, W = 2 * z, rand = 0.9;
  const zahl = (wert, zeige, x, y) => (wert == null ? null : (zeige || sol) && (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={h * 0.72} fontWeight="700" fill={zeige ? '#111827' : COL.sol} fontFamily="Fuenfer Fredoka, sans-serif">{wert}</text>
  ));
  const sw = z * 0.19, stangeX = W + 3, maxStange = n * sw + sw * 0.5 + 2 * fuenferLuecke(sw);
  const breite = bild ? stangeX + maxStange : W;
  const hoeheGes = dach + zeilen.length * h + rand;
  return (
    <svg viewBox={`-1 -1 ${breite + 2} ${hoeheGes + 2}`} style={{ width: mm(breite + 2), height: mm(hoeheGes + 2), display: 'block', overflow: 'visible' }}>
      <path d={`M${-0.5} ${dach} L${W / 2} 0.5 L${W + 0.5} ${dach} Z`} fill="#fde68a" stroke="#1e1b4b" strokeWidth={rand} strokeLinejoin="round" />
      <text x={W / 2} y={dach * 0.66} textAnchor="middle" dominantBaseline="central" fontSize={z * 0.5} fontWeight="700" fill="#1e1b4b" fontFamily="Fuenfer Fredoka, sans-serif">{n}</text>
      {zeilen.map((r, i) => {
        const y = dach + i * h;
        return (
          <g key={i}>
            <rect x={0} y={y} width={z} height={h} fill={r.farbe || '#fff'} stroke="#1e1b4b" strokeWidth={rand * 0.7} />
            <rect x={z} y={y} width={z} height={h} fill={r.farbe || '#fff'} stroke="#1e1b4b" strokeWidth={rand * 0.7} />
            {zahl(r.a, r.zeigeA, z / 2, y + h / 2)}
            {zahl(r.b, r.zeigeB, z * 1.5, y + h / 2)}
            {bild && <g transform={`translate(${stangeX} ${y + (h - sw * 1.2) / 2})`}>{stangeTeile(r.a, r.b, r.leer, sw)}</g>}
          </g>
        );
      })}
      <rect x={0} y={dach} width={W} height={zeilen.length * h} fill="none" stroke="#1e1b4b" strokeWidth={rand} />
    </svg>
  );
}

// Rahmen um ein Aufgabenfeld; das erste ist das gelöste Beispiel (gestrichelt, mit Stern)
function Aufgabe({ i, beispiel, children, stil = {} }) {
  return (
    <div style={{ position: 'relative', border: beispiel ? '0.5mm dashed #6b7280' : '0.3mm solid #d1d5db', borderRadius: '3mm', padding: '6mm 3mm 3mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5mm', breakInside: 'avoid', ...stil }}>
      <div style={{ position: 'absolute', top: '1.5mm', left: '2.5mm', fontSize: '3.4mm', fontWeight: 700, color: '#6b7280', display: 'flex', alignItems: 'center', gap: '1mm' }}>
        {beispiel ? <><Star style={{ width: '4mm', height: '4mm', fill: '#facc15', color: '#a16207' }} /> Beispiel</> : i}
      </div>
      {children}
    </div>
  );
}

const ZAHLFARBEN = (a, b) => paarFarbe(a, b);

// Versteck-Bilder: Standbilder aus der 3D-Szene der Übung (eine Hand zu, Zahlenkarte auf dem Tisch).
// Die Szene läuft unsichtbar außerhalb des Bildschirms; Ergebnis: Liste von Bild-Adressen, null (läuft) oder 'fehler'.
function useVersteckFotos(aktiv, items) {
  const [fotos, setFotos] = useState(null);
  useEffect(() => {
    if (!aktiv) return undefined;
    let abbruch = false, szene = null;
    const box = document.createElement('div');
    Object.assign(box.style, { position: 'fixed', left: '-10000px', top: '0', width: '640px', height: '400px' });
    document.body.appendChild(box);
    setFotos(null);
    (async () => {
      szene = erzeugeZerlegeSzene(box, { modellPfad: 'modelle/' });
      await szene.bereit;
      const urls = [];
      for (let i = 0; i < items.length && !abbruch; i++) {
        const t = items[i];
        await szene.setze({ n: t.n, a: t.a, b: t.b, leer: t.leer, haut: HAUT[i % HAUT.length] });
        szene.setzeGeschlossen();
        urls.push(szene.foto(960, 600, true));
      }
      if (!abbruch) setFotos(urls);
    })().catch(() => { if (!abbruch) setFotos('fehler'); }).finally(() => {
      if (szene) szene.aufraeumen();
      if (box.parentNode) box.parentNode.removeChild(box);
    });
    return () => { abbruch = true; };
  }, [aktiv, items]);
  return fotos;
}

// Inhalt eines Blatts
function BlattInhalt({ typ, items, sol, maxN, bild, fotos = null }) {
  const raster = (spalten, gap = '4mm') => ({ display: 'grid', gridTemplateColumns: `repeat(${spalten}, 1fr)`, gap });
  const feldBreite = maxN <= 10 ? 70 : 72;
  switch (typ) {
    case 'malen': return (
      <div style={raster(2, '5mm')}>
        {items.map((it, i) => { const zeig = sol || i === 0; return (
          <Aufgabe key={i} i={i} beispiel={i === 0} stil={{ minHeight: maxN <= 10 ? '50mm' : '62mm' }}>
            <BlattTafel f={Math.floor(it.n / 5)} e={it.n % 5} />
            <BlattFeld n={zeig ? it.n : 0} maxN={maxN} breite={feldBreite} />
            <Kasten wert={zeig ? it.n : null} sol={sol && i > 0} />
          </Aufgabe>
        ); })}
      </div>
    );
    case 'wieviele': return (
      <div style={raster(2, '5mm')}>
        {items.map((it, i) => (
          <Aufgabe key={i} i={i} beispiel={i === 0} stil={{ minHeight: maxN <= 10 ? '38mm' : '48mm', flexDirection: 'row', gap: '5mm' }}>
            <BlattFeld n={it.n} maxN={maxN} breite={58} />
            <Kasten wert={sol || i === 0 ? it.n : null} sol={sol && i > 0} />
          </Aufgabe>
        ))}
      </div>
    );
    case 'hoeren': return (
      <div style={raster(2, '5mm')}>
        {items.map((it, i) => { const zeig = sol || i === 0; return (
          <Aufgabe key={i} i={i} beispiel={i === 0} stil={{ minHeight: maxN <= 10 ? '40mm' : '52mm' }}>
            {i === 0 && <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', fontSize: '4mm', color: '#374151' }}><Ear style={{ width: '6mm', height: '6mm' }} /> „{it.n}“</div>}
            <BlattFeld n={zeig ? it.n : 0} maxN={maxN} breite={feldBreite} />
            {sol && i > 0 && <div style={{ fontSize: '6mm', fontWeight: 700, color: COL.sol }}>{it.n}</div>}
          </Aufgabe>
        ); })}
      </div>
    );
    case 'fuenfer': return (
      <div style={raster(2, '5mm')}>
        {items.map((it, i) => (
          <Aufgabe key={i} i={i} beispiel={i === 0} stil={{ minHeight: '34mm', flexDirection: 'row', gap: '3mm' }}>
            <span style={{ fontSize: '12mm', fontWeight: 700, lineHeight: 1, minWidth: '12mm', textAlign: 'center' }}>{it.n}</span>
            <span style={{ fontSize: '6mm', color: '#6b7280' }}>→</span>
            <BlattTafel f={Math.floor(it.n / 5)} e={it.n % 5} leer klein sol={sol} beispiel={i === 0} />
          </Aufgabe>
        ))}
      </div>
    );
    case 'versteck': return (
      <div style={raster(2, '5mm')}>
        {items.map((t, i) => {
          const wert = t.leer === 'l' ? t.a : t.b, sichtbar = t.leer === 'l' ? t.b : t.a;
          const kasten = <Kasten wert={sol || i === 0 ? wert : null} sol={sol && i > 0} breite={15} hoehe={15} />;
          const gegeben = <Kasten wert={sichtbar} breite={15} hoehe={15} />; // unter der offenen Hand: Anzahl steht schon da
          // Ohne 3D (fotos = 'fehler'): gezeichnete Hände, Kästchen daneben
          if (fotos === 'fehler') {
            return (
              <Aufgabe key={i} i={i} beispiel={i === 0} stil={{ flexDirection: 'row', gap: '2mm', minHeight: '64mm' }}>
                {t.leer === 'l' ? kasten : gegeben}
                <div className="blatt-haende" style={{ width: '60mm', height: '54mm', display: 'flex', justifyContent: 'center' }}><HaendeSzene t={t} offen={false} ton={HAUTTOENE[i % HAUTTOENE.length]} /></div>
                {t.leer === 'r' ? kasten : gegeben}
              </Aufgabe>
            );
          }
          return (
            <Aufgabe key={i} i={i} beispiel={i === 0}>
              <div style={{ position: 'relative', width: '80mm', height: '50mm', borderRadius: '2mm', overflow: 'hidden', background: '#eadcc5' }}>
                {fotos && fotos[i]
                  ? <img src={fotos[i]} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5mm', color: '#6b7280' }}>Bild wird erzeugt …</div>}
                {/* Kästchen unten in den Ecken: leer auf der Seite der geschlossenen Hand, mit Anzahl unter der offenen Hand */}
                <div style={{ position: 'absolute', bottom: '2mm', left: '2mm' }}>{t.leer === 'l' ? kasten : gegeben}</div>
                <div style={{ position: 'absolute', bottom: '2mm', right: '2mm' }}>{t.leer === 'r' ? kasten : gegeben}</div>
              </div>
            </Aufgabe>
          );
        })}
      </div>
    );
    case 'haeuser': {
      const viele = items.length > 2;
      return (
        <div style={raster(2, viele ? '3mm' : '5mm')}>
          {items.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '2mm 0' }}>
              <BlattHaus n={h.n} z={viele ? 15 : 16} bild={bild} sol={sol} zeilen={h.zeilen.map((r, k) => {
                const bsp = i === 0 && k === 0; // erste Zeile im ersten Haus = Beispiel
                return { a: r.a, b: r.b, leer: r.leer, zeigeA: r.leer !== 'l' || bsp, zeigeB: r.leer !== 'r' || bsp, farbe: bsp ? '#f3f4f6' : '#fff' };
              })} />
            </div>
          ))}
        </div>
      );
    }
    case 'ganzes': return (
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', gap: '6mm' }}>
        {items.map((h, i) => (
          <BlattHaus key={i} n={h.n} z={items.length > 2 ? 15 : 18} sol={sol} zeilen={zerlegungen(h.n, true).map(([a, b], k) => ({ a, b, zeigeA: k === 0, zeigeB: k === 0, farbe: sol ? ZAHLFARBEN(a, b) : '#fff' }))} />
        ))}
      </div>
    );
    case 'plus': return (
      <div style={raster(2, '5mm')}>
        {items.map((t, i) => {
          const zeig = sol || i === 0, wert = gesuchtVon(t);
          const luecke = <Kasten wert={zeig ? wert : null} sol={sol && i > 0} breite={14} hoehe={14} />;
          // Würfel stehen genau unter der Zahl, zu der sie gehören (bei 0 steht dort nichts); gesuchter Teil gestrichelt
          const w = Math.min(4.4, 30 / Math.max(t.a, t.b, 1));
          const teil = (k, hohl, start) => (k > 0 ? <BlattStange a={k} b={0} leer={hohl ? 'l' : null} w={w} start={start} /> : <span />);
          const grau = { color: '#6b7280' };
          return (
            <Aufgabe key={i} i={i} beispiel={i === 0} stil={{ minHeight: bild ? '34mm' : '26mm' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, auto)', columnGap: '3mm', rowGap: '2.5mm', alignItems: 'center', justifyItems: 'center', fontSize: '11mm', fontWeight: 700, lineHeight: 1 }}>
                <span>{t.n}</span><span style={grau}>=</span>{t.leer === 'l' ? luecke : <span>{t.a}</span>}<span style={grau}>+</span>{t.leer === 'r' ? luecke : <span>{t.b}</span>}
                {bild && <><span /><span />{teil(t.a, t.leer === 'l', 0)}<span />{teil(t.b, t.leer === 'r', t.a)}</>}
              </div>
            </Aufgabe>
          );
        })}
      </div>
    );
    default: return null;
  }
}

// Eine A4-Seite mit Kopf (Name, Datum, Symbol, Titel, Text für die Lehrkraft)
function BlattSeite({ typ, sol = false, untertitel, children }) {
  const b = BLAETTER[typ], Icon = b.icon;
  return (
    <div className="sheet-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '3.8mm', marginBottom: '4mm' }}>
        <span>Name: <span style={{ display: 'inline-block', width: '62mm' }} className="sheet-line" /></span>
        <span>Datum: <span style={{ display: 'inline-block', width: '32mm' }} className="sheet-line" /></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', borderBottom: '0.8mm solid #1e1b4b', paddingBottom: '2mm' }}>
        <div style={{ width: '17mm', height: '17mm', borderRadius: '3mm', border: '0.6mm solid #1e1b4b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon style={{ width: '11mm', height: '11mm', color: '#1e1b4b' }} strokeWidth={2.2} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '3.2mm', letterSpacing: '0.3mm', color: '#6b7280', fontWeight: 600 }}>ERKENNEN UND ZERLEGEN · {untertitel}</div>
          <div style={{ fontSize: '8mm', fontWeight: 700, lineHeight: 1.1 }}>{b.titel}{sol ? <span style={{ color: COL.sol }}> – Lösung</span> : ''}</div>
        </div>
      </div>
      <div style={{ background: '#f3f4f6', borderRadius: '2.5mm', padding: '2mm 4mm', margin: '3mm 0 4mm', fontSize: '3.6mm', lineHeight: 1.35, color: '#374151' }}>{b.text}</div>
      {children}
      <div style={{ position: 'absolute', bottom: '6mm', left: '14mm', right: '14mm', display: 'flex', justifyContent: 'space-between', fontSize: '2.8mm', color: '#9ca3af' }}>
        <span>Erkennen und Zerlegen · Arbeitsblatt</span><span>{b.bereich === 'kraft' ? 'Kraft der 5' : 'Zerlegen'}</span>
      </div>
    </div>
  );
}

// Blitz-Karten: 8 Karten zum Ausschneiden; oben das Punktebild, unten (auf dem Kopf) die Zahl – nach hinten knicken
function KartenSeite({ items, maxN, untertitel }) {
  return (
    <div className="sheet-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '3mm', fontSize: '3.4mm', color: '#374151', marginBottom: '3mm' }}>
        <Scissors style={{ width: '6mm', height: '6mm' }} />
        <span><b>Blitz-Karten</b> · ERKENNEN UND ZERLEGEN · {untertitel} – {BLAETTER.karten.text}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: '62mm', border: '0.4mm dashed #6b7280' }}>
        {items.map((it, i) => (
          <div key={i} style={{ border: '0.4mm dashed #6b7280', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BlattFeld n={it.n} maxN={maxN} breite={70} /></div>
            <div style={{ borderTop: '0.5mm dashed #9ca3af', position: 'relative' }}><span style={{ position: 'absolute', right: '2mm', top: '-3.2mm', fontSize: '2.6mm', color: '#9ca3af', background: '#fff', padding: '0 1mm' }}>knicken</span></div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20mm', fontWeight: 700, lineHeight: 1, transform: 'rotate(180deg)' }}>{it.n}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Vorlese-Liste für das Hör-Diktat
function VorleseListe({ items, maxN }) {
  return (
    <div className="sheet-page">
      <div style={{ fontSize: '3.2mm', color: '#6b7280', fontWeight: 600 }}>ERKENNEN UND ZERLEGEN · Für die Lehrkraft</div>
      <div style={{ fontSize: '7mm', fontWeight: 700, borderBottom: '0.8mm solid #1e1b4b', paddingBottom: '2mm', marginBottom: '4mm' }}>Vorlese-Liste: Hör-Diktat</div>
      <p style={{ fontSize: '4mm', marginBottom: '4mm' }}>Jede Zahl deutlich und zweimal vorlesen. Die Kinder malen erst, wenn die Zahl ganz gesprochen ist. Nummer 1 ist das Beispiel und schon gelöst.</p>
      <div style={{ fontSize: '7mm', lineHeight: 1.8 }}>
        {items.map((it, i) => <div key={i}><b style={{ color: '#6b7280', display: 'inline-block', width: '14mm' }}>{i === 0 ? '★' : `${i}.`}</b>{it.n}</div>)}
      </div>
      <div style={{ position: 'absolute', bottom: '6mm', left: '14mm', fontSize: '2.8mm', color: '#9ca3af' }}>Zahlenraum bis {maxN}</div>
    </div>
  );
}

// Generator: Blatt wählen, Einstellungen, Vorschau, Drucken
function BlattStudio({ onClose, maxN: startMax = 20, mitNull = true }) {
  const [typ, setTyp] = useState('malen');
  const [maxN, setMaxN] = useState(startMax);
  const [zahl, setZahl] = useState(6);
  const [bild, setBild] = useState(true);
  const [loesung, setLoesung] = useState(true);
  const [seed, setSeed] = useState(0);
  const b = BLAETTER[typ];
  const items = useMemo(() => blattAufgaben(typ, { maxN, zahl, mitNull }), [typ, maxN, zahl, mitNull, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const fotos = useVersteckFotos(typ === 'versteck', items);
  const scrollRef = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => { const w = scrollRef.current ? scrollRef.current.clientWidth - 32 : 800; setScale(Math.min(1, w / 794)); };
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, []);
  const untertitel = b.bereich === 'kraft' ? `Kraft der 5 · Zahlen bis ${maxN}` : `Zerlegen · ${zahl === 'gemischt' ? 'Zahlen 4 bis 10' : `Zahl ${zahl}`}`;
  const mitBild = b.bild && bild;
  const seiten = typ === 'karten'
    ? [<KartenSeite key="k" items={items} maxN={maxN} untertitel={untertitel} />]
    : [<BlattSeite key="a" typ={typ} untertitel={untertitel}><BlattInhalt typ={typ} items={items} maxN={maxN} bild={mitBild} fotos={fotos} sol={false} /></BlattSeite>];
  if (b.vorlesen) seiten.push(<VorleseListe key="v" items={items} maxN={maxN} />);
  if (loesung && !b.ohneLoesung) seiten.push(<BlattSeite key="s" typ={typ} sol untertitel={untertitel}><BlattInhalt typ={typ} items={items} maxN={maxN} bild={mitBild} fotos={fotos} sol /></BlattSeite>);
  const knopf = (aktiv) => `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border-2 ${aktiv ? 'bg-yellow-400 text-indigo-950 border-yellow-300' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`;
  const klein = (aktiv) => `px-3 py-1.5 rounded-lg font-bold ${aktiv ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`;
  return (
    <div className="sheet-studio fixed inset-0 z-[270] bg-slate-950/95 flex flex-col">
      <div className="no-print bg-slate-900 border-b-2 border-yellow-400/40 p-3 md:p-4 text-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-comic text-yellow-300 flex items-center gap-2"><Printer className="w-7 h-7" /> Arbeitsblätter</h3>
            <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 rounded-full p-2" aria-label="Schließen"><X className="w-6 h-6" /></button>
          </div>
          {[['kraft', 'Kraft der 5'], ['zerlegen', 'Zerlegen']].map(([bereich, name]) => (
            <div key={bereich} className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-sm w-24">{name}:</span>
              {Object.entries(BLAETTER).filter(([, x]) => x.bereich === bereich).map(([id, x]) => (
                <button key={id} onClick={() => setTyp(id)} className={knopf(typ === id)}><x.icon className="w-4 h-4" />{x.titel}</button>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {b.bereich === 'kraft' ? (
              <>
                <span className="text-slate-400">Zahlenraum:</span>
                {[10, 20].map(v => <button key={v} onClick={() => setMaxN(v)} className={klein(maxN === v)}>bis {v}</button>)}
              </>
            ) : (
              <>
                <span className="text-slate-400">Zahl:</span>
                {ZERLEGE_ZAHLEN.map(v => <button key={v} onClick={() => setZahl(v)} className={klein(zahl === v)}>{v}</button>)}
                <button onClick={() => setZahl('gemischt')} className={klein(zahl === 'gemischt')}>gemischt</button>
                {b.bild && <label className="flex items-center gap-2 ml-2"><input type="checkbox" checked={bild} onChange={ev => setBild(ev.target.checked)} /> mit Würfel-Bild</label>}
              </>
            )}
            {!b.ohneLoesung && <label className="flex items-center gap-2 ml-2"><input type="checkbox" checked={loesung} onChange={ev => setLoesung(ev.target.checked)} /> Lösungsblatt</label>}
            <button onClick={() => setSeed(s => s + 1)} className="ml-auto inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl font-bold"><Shuffle className="w-4 h-4" /> Neue Zahlen</button>
            <button onClick={() => window.print()} disabled={typ === 'versteck' && fotos === null} className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-indigo-950 px-5 py-2 rounded-xl font-bold"><Printer className="w-5 h-5" /> Drucken</button>
          </div>
          <p className="text-xs text-slate-400">{seiten.length} Seite{seiten.length > 1 ? 'n' : ''} · Im Druckfenster „A4“ und „Ränder: keine“ wählen. Für Farbe „Hintergrundgrafiken“ einschalten – die Blätter funktionieren aber auch in Schwarz-Weiß.{b.bereich === 'zerlegen' && !mitNull ? ' Zerlegungen mit 0 sind im Lehrer-Bereich ausgeschaltet.' : ''}</p>
        </div>
      </div>
      <div ref={scrollRef} className="sheet-scroll flex-1 overflow-auto p-4 bg-slate-700">
        <div className="sheet-scale flex flex-col items-center gap-6 mx-auto" style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: '210mm', height: `${seiten.length * (297 * 3.78 + 24) * scale}px` }}>
          {seiten.map(p => <div key={p.key} className="shadow-2xl">{p}</div>)}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// LEHRER-BEREICH (Zahnrad unter dem Startbild)
// ==========================================
const ADMIN_PASSWORD = 'Zerlegen123';

function Fenster({ onClose, children, wide, border = 'border-slate-500' }) {
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[250] flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(ev) => ev.stopPropagation()} className={`bg-slate-900 border-4 ${border} rounded-3xl w-full ${wide ? 'max-w-3xl' : 'max-w-sm'} anim-pop relative max-h-[90vh] overflow-y-auto custom-scrollbar p-5 md:p-6 text-slate-100`}>
        <button onClick={onClose} aria-label="Schließen" className="absolute top-3 right-3 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2"><X className="w-5 h-5" /></button>
        {children}
      </div>
    </div>
  );
}

function AdminAuthModal({ onLogin, onClose, onImpressum }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);
  const login = () => { if (pwd === ADMIN_PASSWORD) onLogin(); else { setError(true); setTimeout(() => setError(false), 500); setPwd(''); } };
  return (
    <Fenster onClose={onClose} border="border-cyan-500">
      <div className="text-center">
        <Settings className="w-12 h-12 text-cyan-400 mx-auto mb-4 anim-float" />
        <h3 className="text-2xl font-bold mb-6">Lehrer-Bereich</h3>
        <input type="password" autoFocus value={pwd} onChange={(ev) => setPwd(ev.target.value)} onKeyDown={(ev) => ev.key === 'Enter' && login()} placeholder="Passwort" className={`w-full bg-slate-950 border-2 rounded-xl p-4 text-white text-center text-xl mb-4 outline-none ${error ? 'border-red-500 anim-shake' : 'border-slate-700 focus:border-cyan-500'}`} />
        <button onClick={login} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl">Einloggen</button>
        <button onClick={onImpressum} className="mt-5 text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2">Impressum &amp; Datenschutz</button>
      </div>
    </Fenster>
  );
}

// Link mit allen Einstellungen (gelesen von readUrlSettings) – nur, was vom Standard abweicht
function klassenLink(s) {
  try {
    const url = new URL(window.location.href);
    const p = new URLSearchParams();
    if (s.maxN !== 20) p.set('zr', s.maxN);
    if (s.blitzMs !== 2000) p.set('blitz', s.blitzMs / 1000);
    if (s.blitzGrenze !== 3000) p.set('grenze', s.blitzGrenze / 1000);
    if (s.eingabe === 'tasten') p.set('eingabe', 'tippen');
    if (!s.mitNull) p.set('null', '0');
    if (s.stufeFest) p.set('stufe', s.stufeFest);
    url.search = p.toString(); url.hash = '';
    return url.toString();
  } catch (e) { return ''; }
}

function AdminControlModal({ onClose, settings, setSettings, onBlaetter }) {
  const [copied, setCopied] = useState(false);
  const set = (k) => (v) => setSettings(s => ({ ...s, [k]: v }));
  const link = klassenLink(settings);
  const Seg = ({ value, options, onChange }) => (
    <div className="flex bg-slate-950 rounded-xl p-1 gap-1">
      {options.map(o => <button key={String(o.v)} onClick={() => onChange(o.v)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${value === o.v ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>{o.l}</button>)}
    </div>
  );
  const Label = ({ children }) => <label className="text-sm text-slate-400 mt-1">{children}</label>;
  return (
    <Fenster onClose={onClose} wide>
      <h3 className="text-2xl font-bold mb-4 text-center">Lehrer-Bereich</h3>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <h4 className="font-bold text-cyan-300">Kraft der 5</h4>
          <Label>Zahlenraum</Label>
          <Seg value={settings.maxN} options={[{ v: 10, l: 'bis 10' }, { v: 20, l: 'bis 20' }]} onChange={set('maxN')} />
          <Label>Blitzblick: Bild sichtbar</Label>
          <Seg value={settings.blitzMs} options={[{ v: 1000, l: '1 s' }, { v: 2000, l: '2 s' }, { v: 3000, l: '3 s' }, { v: 0, l: 'bleibt stehen' }]} onChange={set('blitzMs')} />
          <h4 className="font-bold text-cyan-300 mt-3">Eingabe</h4>
          <Label>Zahlen eingeben (das Kind kann jederzeit umschalten)</Label>
          <Seg value={settings.eingabe} options={[{ v: 'stift', l: 'Fingerschrift' }, { v: 'tasten', l: 'Tippen' }]} onChange={set('eingabe')} />
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="font-bold text-cyan-300">Zerlegen</h4>
          <Label>Übung festlegen (die Übungswahl wird übersprungen)</Label>
          <Seg value={settings.stufeFest} options={[{ v: null, l: 'frei' }, { v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: '3' }, { v: 4, l: '4' }]} onChange={set('stufeFest')} />
          <Label>Zerlegungen mit 0 (z. B. 6 = 6 + 0)</Label>
          <Seg value={settings.mitNull} options={[{ v: true, l: 'an' }, { v: false, l: 'aus' }]} onChange={set('mitNull')} />
          <Label>Prüfung: Blitz-Stern bei Bedenkzeit unter</Label>
          <Seg value={settings.blitzGrenze} options={[2000, 3000, 4000, 5000].map(v => ({ v, l: `${v / 1000} s` }))} onChange={set('blitzGrenze')} />
          <p className="text-xs text-slate-500">Gemessen wird nur die Zeit bis zum ersten Strich bzw. Tipp, nicht die Schreibzeit.</p>
        </div>
      </div>
      <div className="mt-5 border-t-2 border-slate-800 pt-4 flex flex-col gap-2">
        <button onClick={onBlaetter} className="self-start bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-bold inline-flex items-center gap-2"><Printer className="w-5 h-5" /> Arbeitsblätter</button>
        <p className="text-xs text-slate-400">Sterne gibt es nur für die einzelne Runde, gespeichert wird nichts. Die Einstellungen gelten, bis die Seite neu geladen wird. Dauerhaft für die Klasse: diesen Link (oder einen QR-Code davon) verwenden:</p>
        <div className="flex gap-2 items-center"><code className="flex-1 text-xs bg-slate-950 p-2 rounded-lg break-all">{link}</code><button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }} aria-label="Link kopieren" title="Link kopieren" className="bg-slate-700 hover:bg-slate-600 rounded-lg p-2">{copied ? <Check className="w-4 h-4 text-lime-400" /> : <Copy className="w-4 h-4" />}</button></div>
      </div>
    </Fenster>
  );
}

// ==========================================
// IMPRESSUM & DATENSCHUTZ (Text von der Lehrkraft am 27.10.2026 freigegeben – nur nach Freigabe ändern!)
// ==========================================
const IMPRESSUM_EMAIL = 'p.brandsch@ggs-roesrath.de';
const GITHUB_PRIVACY_URL = 'https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement';

function ImpressumModal({ onClose, section }) {
  const datenschutzRef = useRef(null);
  useEffect(() => {
    if (section !== 'datenschutz') return;
    const t = setTimeout(() => datenschutzRef.current && datenschutzRef.current.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [section]);
  const Mail = () => <a href={`mailto:${IMPRESSUM_EMAIL}`} className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200 break-all">{IMPRESSUM_EMAIL}</a>;
  const H2 = ({ children, innerRef }) => <h4 ref={innerRef} className="text-xl font-bold text-yellow-200 mt-6 mb-2 scroll-mt-2">{children}</h4>;
  const H3 = ({ children }) => <h5 className="font-bold text-slate-100 mt-4 mb-1">{children}</h5>;
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[260] flex items-center justify-center p-4">
      <div className="bg-slate-900 border-4 border-slate-500 rounded-3xl max-w-2xl w-full anim-pop relative flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-start gap-4 p-5 md:p-6 pb-3 border-b-2 border-slate-800">
          <div className="text-left">
            <h3 className="text-2xl md:text-3xl font-bold text-white">Impressum &amp; Datenschutz</h3>
            <p className="text-slate-400 italic">Infos für Erwachsene</p>
          </div>
          <button onClick={onClose} aria-label="Schließen" className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2 flex-shrink-0"><X className="w-6 h-6" /></button>
        </div>
        <div className="overflow-y-auto custom-scrollbar px-5 md:px-6 pb-6 text-left text-slate-300 leading-relaxed">
          <H2>Impressum</H2>
          <p>Angaben gemäß § 18 Abs. 1 Medienstaatsvertrag (MStV)</p>
          <p className="mt-3">Peter Brandsch<br />Sandweg 13<br />51503 Rösrath</p>
          <p className="mt-3">E-Mail: <Mail /></p>
          <p className="mt-3">„Erkennen und Zerlegen“ ist ein kostenloses Lernangebot ohne Werbung.</p>
          <H3>Haftung für Inhalte</H3>
          <p>Die Inhalte dieser App wurden mit großer Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann ich jedoch keine Gewähr übernehmen. Hinweise auf Fehler nehme ich gern per E-Mail entgegen.</p>
          <H3>Urheberrecht und Lizenzen</H3>
          <p>
            Texte, Aufgaben und Gestaltung der App: © 2026 Peter Brandsch.<br />
            Verwendete Bausteine anderer Urheber:<br />
            – Schriftart „Fredoka“ (SIL Open Font License 1.1), für diese App verändert: Die Ziffer 7 hat einen Querstrich (verwendet unter dem Namen „Fuenfer Fredoka“); Schriftart „Bangers“ (SIL Open Font License 1.1)<br />
            – Symbole: Lucide (ISC-Lizenz)<br />
            – React (MIT-Lizenz), Tailwind CSS (MIT-Lizenz)<br />
            – 3D-Darstellung: three.js (MIT-Lizenz); Handmodelle „generic-hand“ aus den WebXR Input Profiles, © 2019 Amazon (MIT-Lizenz)<br />
            – Sprachausgabe, erzeugt mit Piper (MIT-Lizenz): Stimme „Thorsten“, Piper-Modell „thorsten-high“ mit den Sprachdaten von Thorsten-Voice von Thorsten Müller (CC0), feingetunt aus der englischen Piper-Stimme „Lessac“ (deren Sprachdaten nur für nicht-kommerzielle Nutzung)<br />
            – Ziffern-Erkennung: trainiert mit dem MNIST-Datensatz von Y. LeCun, C. Cortes und C. J. C. Burges (CC BY-SA 3.0)
          </p>
          <H2 innerRef={datenschutzRef}>Datenschutz</H2>
          <H3>1. Verantwortlich</H3>
          <p>Peter Brandsch, Sandweg 13, 51503 Rösrath, E-Mail: <Mail /></p>
          <H3>2. Das Wichtigste in Kürze</H3>
          <p>Die App funktioniert ohne Anmeldung und ohne Namen. Sie setzt keine Cookies, speichert nichts im Browser und verwendet keine Analyse-, Werbe- oder Trackingdienste. Sterne gibt es nur für die aktuelle Runde. Es wird kein Spielstand und kein Lernfortschritt gespeichert. Schriften, Tondateien, Bilder und 3D-Modelle werden direkt mit der App ausgeliefert; es werden keine Verbindungen zu Google oder anderen Drittanbietern aufgebaut.</p>
          <H3>3. Fingerschrift, Vorlesen und 3D-Darstellung</H3>
          <p>Die App benutzt kein Mikrofon und keine Kamera. Die mit dem Finger geschriebenen Ziffern werden nur auf dem Gerät erkannt; die Schrift wird nicht gespeichert und nicht übertragen. Aufgaben, Hinweise und Zahlen werden mit aufgenommenen Sprachdateien vorgelesen, die mit der App ausgeliefert werden. Die Hände und Steckwürfel beim Zerlegen werden auf dem Gerät selbst berechnet und dargestellt (WebGL). In der Prüfung misst die App die Bedenkzeit bis zur ersten Eingabe, um blitzschnelle Antworten zu kennzeichnen; diese Zeit wird nur während der laufenden Probe auf dem Gerät verwendet und weder gespeichert noch übertragen.</p>
          <H3>4. Bereitstellung über GitHub Pages</H3>
          <p>Die App wird über GitHub Pages bereitgestellt, einen Dienst der GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. Beim Aufruf der App verarbeitet GitHub technisch notwendige Daten, insbesondere die IP-Adresse, Datum und Uhrzeit des Abrufs sowie Angaben zum verwendeten Browser. Dies ist erforderlich, um die Seite auszuliefern und ihre Sicherheit zu gewährleisten. Dabei können Daten in die USA übermittelt werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Mein berechtigtes Interesse liegt in einer sicheren und zuverlässigen Bereitstellung der App. Ich selbst erhalte keine Zugriffsdaten und werte keine aus. Weitere Informationen: Datenschutzerklärung von GitHub (<a href={GITHUB_PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200 break-all">{GITHUB_PRIVACY_URL}</a>).</p>
          <H3>5. Deine Rechte</H3>
          <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Widerspruch (Art. 21). Wende dich dazu an die oben genannte E-Mail-Adresse. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, in Nordrhein-Westfalen bei der Landesbeauftragten für Datenschutz und Informationsfreiheit NRW (LDI NRW).</p>
          <p className="mt-6 text-slate-400">Stand: Oktober 2026</p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// HAUPT-APP
// ==========================================
export default function App() {
  const [settings, setSettings] = useState(readUrlSettings);
  // start | kraft | zerlegen (Kacheln) | zstufe (Stufe wählen) | spiel | geschafft
  // Link mit ?zahl= (und ?stufe=): direkt zur Stufen-Auswahl bzw. direkt in die feste Stufe
  const direkt = settings.zahlFest && settings.stufeFest ? ZGAMES.find(g => g.stufe === settings.stufeFest && !g.bald) : null;
  const [screen, setScreen] = useState(() => (direkt ? 'spiel' : settings.zahlFest ? 'zstufe' : 'start'));
  const [zerlegZahl, setZerlegZahl] = useState(() => settings.zahlFest || 6);
  const [activeGame, setActiveGame] = useState(() => (direkt ? direkt.id : null));
  const [runId, setRunId] = useState(0);
  const [stars, setStars] = useState(0);
  const [impressum, setImpressum] = useState(null); // null | 'impressum' | 'datenschutz'
  const [admin, setAdmin] = useState(null); // null | 'auth' | 'offen'
  const [blaetter, setBlaetter] = useState(false);
  const handyQuer = useMedia(HANDY_QUER);
  const [narr, setNarr] = useState(() => (settings.zahlFest && !direkt
    ? { key: 'stufe_wahl', n: settings.zahlFest, text: SAETZE.stufe_wahl(settings.zahlFest), stamp: 0 }
    : { key: 'start_hallo', text: SAETZE.start_hallo, stamp: 0 }));

  const say = useCallback((key, n) => {
    const s = SAETZE[key];
    setNarr({ key, n, text: typeof s === 'function' ? s(n) : s, stamp: Date.now() });
    return playSatz(key, n);
  }, []);

  const go = (id) => {
    setScreen(id);
    if (id === 'kraft') say('kraft_menu');
    else if (id === 'zerlegen') say('zerlegen_wahl');
    else if (id === 'zstufe') say('stufe_wahl', zerlegZahl);
    else if (id === 'start') say('start_hallo');
  };
  const startGame = (id) => {
    const g = gameById(id);
    if (g.bald) { say('bald'); return; }
    setActiveGame(id); setRunId(r => r + 1); setScreen('spiel');
    if (g.intro) say(g.intro);
  };
  // Kachel gewählt: Stufe wählen – oder direkt los, wenn ?stufe= im Link steht
  const waehleZahl = (z) => {
    setZerlegZahl(z);
    if (settings.stufeFest) {
      const g = ZGAMES.find(x => x.stufe === settings.stufeFest);
      if (g && !g.bald) { setActiveGame(g.id); setRunId(r => r + 1); setScreen('spiel'); return; }
    }
    setScreen('zstufe'); say('stufe_wahl', z);
  };
  const finish = (s) => { setStars(s); setScreen('geschafft'); say('geschafft', s); };
  const setZr = (zr) => {
    if (zr === settings.maxN) return;
    setSettings(s => ({ ...s, maxN: zr })); say(zr === 10 ? 'bis10' : 'bis20');
    if (screen === 'spiel') setRunId(r => r + 1);
  };

  const bg = 'bg-indigo-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-800 via-indigo-950 to-slate-950';
  const settingsValue = { ...settings, setSettings };
  const game = activeGame ? gameById(activeGame) : null;
  const ActiveComp = game ? game.comp : null;
  const imKraft = screen === 'kraft' || ((screen === 'spiel' || screen === 'geschafft') && game && game.bereich === 'kraft');
  const zurueck = screen === 'zstufe' ? 'zerlegen' : (screen === 'spiel' || screen === 'geschafft') && game ? (game.bereich === 'kraft' ? 'kraft' : 'zstufe') : null;
  const repeat = () => say(narr.key, narr.n);
  const iconBtn = 'w-16 h-16 rounded-2xl bg-slate-900/80 border-2 border-yellow-400/60 flex items-center justify-center hover:bg-slate-800 active:scale-95';
  const karte = 'w-full flex flex-col items-center justify-center gap-3 rounded-[2rem] p-5 border-4 transition-all';
  const karteAktiv = 'bg-slate-900/80 border-yellow-400/50 hover:border-yellow-300 hover:bg-slate-800 text-yellow-300 active:scale-95';
  const karteBald = 'bg-slate-900/50 border-slate-700 text-slate-500';
  const VorleseKnopf = ({ satz, n }) => <button onClick={() => say(satz, n)} aria-label="Vorlesen" className="absolute top-3 right-3 w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shadow-lg active:scale-95"><Volume2 className="w-5 h-5 text-white" /></button>;

  return (
    <SettingsContext.Provider value={settingsValue}>
      <NarratorContext.Provider value={say}>
        <style>{appStyles}</style>
        {admin === 'auth' && <AdminAuthModal onClose={() => setAdmin(null)} onLogin={() => setAdmin('offen')} onImpressum={() => { setAdmin(null); setImpressum('impressum'); }} />}
        {admin === 'offen' && <AdminControlModal onClose={() => setAdmin(null)} settings={settings} setSettings={setSettings} onBlaetter={() => { setAdmin(null); setBlaetter(true); }} />}
        {blaetter && <BlattStudio onClose={() => setBlaetter(false)} maxN={settings.maxN} mitNull={settings.mitNull} />}
        {impressum && <ImpressumModal section={impressum} onClose={() => setImpressum(null)} />}
        {handyQuer && !impressum && !admin && !blaetter && <DrehHinweis />}
        <div className={`min-h-screen overflow-x-hidden ${bg} text-indigo-50 ${blaetter ? 'no-print' : ''}`}>
          <div className="min-h-screen storm-dots px-3 md:px-4 pb-10">
            {/* KOPFLEISTE */}
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 pt-3 md:pt-4 mb-3 min-h-[64px]">
              <div className="flex gap-2">
                {screen !== 'start' && <button onClick={() => go('start')} aria-label="Startseite" title="Startseite" className={iconBtn}><Home className="w-8 h-8 text-yellow-300" /></button>}
                {zurueck && <button onClick={() => go(zurueck)} aria-label="Zurück" title="Zurück" className={iconBtn}><ArrowLeft className="w-8 h-8 text-yellow-300" /></button>}
              </div>
              <div className="flex items-center gap-2">
                {/* Hinweis für die Lehrkraft: Stufe ist über den Link (?stufe=) festgelegt, die Stufen-Auswahl wird übersprungen */}
                {settings.stufeFest && (
                  <span title="Die Übung ist festgelegt (Lehrer-Bereich oder ?stufe= im Link). Auf „frei“ gestellt kann das Kind die Übung wählen." className="flex items-center gap-1 text-xs font-bold text-sky-200 border border-sky-300/50 rounded-full px-3 py-1">
                    <Lock className="w-3.5 h-3.5" /> Übung {settings.stufeFest}
                  </span>
                )}
              </div>
              <div>
                {imKraft && screen !== 'geschafft' && (
                  <div className="flex rounded-2xl overflow-hidden border-2 border-yellow-400 bg-slate-900/90" role="group" aria-label="Zahlenraum">
                    {[10, 20].map(zr => (
                      <button key={zr} onClick={() => setZr(zr)} className={`h-14 px-4 flex items-center gap-1 font-bold text-2xl ${settings.maxN === zr ? 'bg-yellow-400 text-indigo-950' : 'text-yellow-200 hover:bg-slate-800'}`}>
                        <Zap className={`w-5 h-5 ${settings.maxN === zr ? 'fill-indigo-950' : 'fill-yellow-300 text-yellow-300'}`} />{zr}
                      </button>
                    ))}
                  </div>
                )}
                {game && game.bereich === 'zerlegen' && screen === 'spiel' && (
                  <div className="h-14 min-w-[56px] px-4 rounded-2xl border-2 border-yellow-400 bg-slate-900/90 flex items-center justify-center text-yellow-300 font-bold text-2xl">{zerlegZahl === 'gemischt' ? <Shuffle className="w-7 h-7" /> : zerlegZahl}</div>
                )}
              </div>
            </div>

            {/* STARTBILD */}
            {screen === 'start' && (
              <div className="max-w-4xl mx-auto flex flex-col items-center">
                <h1 className="text-5xl md:text-7xl font-comic text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-400 drop-shadow-lg pb-1 leading-none text-center mb-5">Erkennen <span className="whitespace-nowrap">und Zerlegen</span></h1>
                <Erzaehler narr={narr} onRepeat={repeat} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full mt-2">
                  {BEREICHE.map(b => (
                    <div key={b.id} className="relative">
                      <button onClick={() => go(b.id)} className="w-full flex flex-col items-center justify-between gap-3 bg-slate-900/80 hover:bg-slate-800 border-4 border-yellow-400/50 hover:border-yellow-300 rounded-[2rem] p-5 md:p-6 active:scale-95 hover:scale-[1.02] transition-all min-h-[260px]">
                        <span className="text-4xl md:text-5xl font-comic text-yellow-300 leading-none">{b.title}</span>
                        <div className="bg-white rounded-2xl p-3 w-full flex items-center justify-center gap-3 min-h-[150px]">
                          {b.id === 'kraft'
                            ? <><FridaSvg size={150} /><EliSvg size={30} /><EliSvg size={30} /></>
                            : <MiniZahlenhaus size={120} />}
                        </div>
                      </button>
                      <VorleseKnopf satz={b.satz} />
                    </div>
                  ))}
                </div>
                <div className="mt-8 text-sm text-slate-400 flex items-center">
                  <button onClick={() => setImpressum('impressum')} className="underline underline-offset-2 hover:text-slate-200 px-2 py-1">Impressum</button>
                  <span aria-hidden="true">·</span>
                  <button onClick={() => setImpressum('datenschutz')} className="underline underline-offset-2 hover:text-slate-200 px-2 py-1">Datenschutz</button>
                  <button onClick={() => setBlaetter(true)} className="opacity-40 hover:opacity-100 p-2 ml-2" aria-label="Arbeitsblätter" title="Arbeitsblätter"><Printer className="w-5 h-5" /></button>
                  <button onClick={() => setAdmin('auth')} className="opacity-40 hover:opacity-100 p-2" aria-label="Lehrer-Bereich" title="Lehrer-Bereich"><Settings className="w-5 h-5" /></button>
                </div>
              </div>
            )}

            {/* KRAFT DER 5: Übungen */}
            {screen === 'kraft' && (
              <div className="max-w-4xl mx-auto flex flex-col items-center">
                <Erzaehler narr={narr} onRepeat={repeat} />
                <div className="grid grid-cols-2 gap-4 w-full mt-2">
                  {GAMES.map(g => (
                    <div key={g.id} className="relative">
                      <button onClick={() => startGame(g.id)} className={`${karte} min-h-[180px] ${g.bald ? karteBald : karteAktiv}`}>
                        <g.icon className="w-16 h-16" />
                        <span className="text-xl md:text-2xl font-bold text-center leading-tight">{g.title}</span>
                        {g.bald && <Hourglass className="w-5 h-5" />}
                      </button>
                      <VorleseKnopf satz={`spiel_${g.id}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ZERLEGEN: Zahl wählen */}
            {screen === 'zerlegen' && (
              <div className="max-w-4xl mx-auto flex flex-col items-center">
                <Erzaehler narr={narr} onRepeat={repeat} />
                <div className="grid grid-cols-4 gap-3 sm:gap-4 w-full mt-2">
                  {[...ZERLEGE_ZAHLEN, 'gemischt'].map(z => (
                    <button key={z} onClick={() => waehleZahl(z)} aria-label={z === 'gemischt' ? 'gemischt' : `Zahl ${z}`} className={`w-full flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-[1.5rem] sm:rounded-[2rem] p-2 sm:p-4 border-4 transition-all ${karteAktiv} min-h-[130px] sm:min-h-[170px]`}>
                      {z === 'gemischt'
                        ? (
                          <>
                            <Shuffle className="w-8 h-8 sm:w-10 sm:h-10" />
                            {/* alle Zahlen, die gemischt vorkommen */}
                            <div className="flex flex-wrap justify-center gap-x-2 gap-y-0 text-xl sm:text-3xl font-bold leading-tight">{ZERLEGE_ZAHLEN.map(k => <span key={k}>{k}</span>)}</div>
                          </>
                        )
                        : (
                          <>
                            <span className="text-5xl sm:text-7xl font-bold leading-none">{z}</span>
                            {/* Punktebild der Zahl (Fünferstruktur wie im Zwanzigerfeld) */}
                            <div className="w-full bg-white rounded-xl p-1 sm:p-2"><FeldBild n={z} maxN={10} maxWidth={170} /></div>
                          </>
                        )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ZERLEGEN: Stufe wählen */}
            {screen === 'zstufe' && (
              <div className="max-w-4xl mx-auto flex flex-col items-center">
                <Erzaehler narr={narr} onRepeat={repeat} />
                <div className="mb-4 text-yellow-300">{zerlegZahl === 'gemischt' ? <Shuffle className="w-16 h-16" /> : <span className="text-7xl font-bold">{zerlegZahl}</span>}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 w-full">
                  {ZGAMES.map(g => {
                    const aus = g.bald || (g.ohneGemischt && zerlegZahl === 'gemischt');
                    return (
                      <div key={g.id} className="relative h-full">
                        <button onClick={() => (aus ? say('bald') : startGame(g.id))} disabled={g.ohneGemischt && zerlegZahl === 'gemischt'} className={`w-full h-full flex flex-col items-center justify-center rounded-[2rem] p-4 pt-14 border-4 transition-all ${aus ? karteBald : karteAktiv}`}>
                          {/* Bilder statt „Stufe 1/2/3“ – Kinder können noch nicht lesen. Alle Karten gleich groß:
                              gleich großer Bildbereich (16:10), Inhalt mittig */}
                          <div className="w-full aspect-[16/10] flex flex-col items-center justify-center gap-1">
                            {g.bild
                              // Bild passend zur gewählten Zahl (public/bilder/stufe1_<n>.jpg), bei „gemischt“ die 6
                              ? <img src={`bilder/${g.bild}_${zerlegZahl === 'gemischt' ? 6 : zerlegZahl}.jpg`} alt={g.title} className="w-full h-full object-cover rounded-xl border-2 border-white/30" draggable="false" />
                              : g.id === 'z3'
                                ? <div className="h-full bg-white rounded-xl p-1.5 flex items-center"><MiniZahlenhaus size={84} n={zerlegZahl === 'gemischt' ? 6 : zerlegZahl} /></div>
                                : g.id === 'z4' ? <PlusSymbol n={zerlegZahl === 'gemischt' ? 7 : zerlegZahl} />
                                : <>
                                    {g.icon ? <g.icon className="w-14 h-14" /> : <span className="text-6xl font-bold leading-none">{g.stufe}</span>}
                                    <span className="text-lg font-bold">{g.title}</span>
                                  </>}
                          </div>
                          {g.bald && <Hourglass className="w-5 h-5 mt-1" />}
                        </button>
                        <VorleseKnopf satz={`spiel_${g.id}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ÜBUNG */}
            {screen === 'spiel' && ActiveComp && (
              <div className="max-w-5xl mx-auto">
                <Erzaehler narr={narr} onRepeat={repeat} />
                <div className="paper w-full rounded-[2.5rem] shadow-2xl border-4 border-indigo-900 p-3 md:p-6 text-slate-800">
                  <ActiveComp key={`${activeGame}-${runId}-${settings.maxN}-${zerlegZahl}`} onFinish={finish} zahl={zerlegZahl} />
                </div>
              </div>
            )}

            {/* GESCHAFFT */}
            {screen === 'geschafft' && (
              <div className="max-w-lg mx-auto flex flex-col items-center">
                <Erzaehler narr={narr} onRepeat={repeat} />
                <div className="bg-slate-900/80 w-full rounded-[3rem] border-4 border-yellow-400/50 p-8 text-center anim-pop">
                  <div className="flex justify-center flex-wrap gap-1 mb-6">
                    {[...Array(ROUND)].map((_, i) => <Star key={i} className={`w-9 h-9 ${i < stars ? 'text-yellow-300 fill-yellow-300 anim-pop' : 'text-slate-700'}`} style={{ animationDelay: `${i * 0.08}s` }} />)}
                  </div>
                  {/* Zerlegen: Zahlenhaus der Zahl füllt sich geordnet, Tauschpaare gleich gefärbt */}
                  {game && game.bereich === 'zerlegen' && zerlegZahl !== 'gemischt' && (
                    <div className="flex justify-center mb-6"><GeordnetesHaus n={zerlegZahl} zimmer={56} animiert /></div>
                  )}
                  <div className="flex justify-center gap-4">
                    <button onClick={() => startGame(activeGame)} aria-label="Nochmal" title="Nochmal" className="bg-yellow-400 hover:bg-yellow-300 text-indigo-950 rounded-2xl p-5 active:scale-95"><RotateCcw className="w-10 h-10" /></button>
                    <button onClick={() => go(zurueck || 'start')} aria-label="Zurück" title="Zurück" className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl p-5 active:scale-95"><ArrowLeft className="w-10 h-10" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </NarratorContext.Provider>
    </SettingsContext.Provider>
  );
}
