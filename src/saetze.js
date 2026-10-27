// ==========================================
// ERZÄHLER-SÄTZE (Thorsten) – eine Liste für App und Ton-Erzeugung
// ==========================================
// Jeder Satz liegt als public/audio/thorsten/saetze/<datei>.mp3 vor (werkzeuge/saetze_erzeugen.py).
// Sätze mit Zahlen werden für jede vorkommende Zahl als ganzer Satz erzeugt (natürliche Betonung).

export const ZW_FUENFER = ['Null Fünfer', 'Ein Fünfer', 'Zwei Fünfer', 'Drei Fünfer', 'Vier Fünfer'];
export const ZW_EINER = ['null Einer', 'ein Einer', 'zwei Einer', 'drei Einer', 'vier Einer'];

export const SAETZE = {
  start_hallo: 'Hallo! Was möchtest du üben?',
  start_kraft: 'Kraft der 5',
  start_zerlegen: 'Zerlegen',
  zerlegen_bald: 'Zerlegen kommt bald.',
  kraft_menu: 'Was möchtest du machen?',
  spiel_legen5: 'Legen',
  spiel_blitz5: 'Blitzblick',
  spiel_umkehr5: 'Hören und legen',
  spiel_frei5: 'Frei legen',
  blitz_aufgabe: 'Schau genau hin. Wie viele sind es?',
  umkehr_aufgabe: () => 'Hör gut zu und leg die Zahl.', // danach wird die Zahl gesprochen (nicht anzeigen!)
  umkehr_nochmal: () => 'Hör noch mal genau hin.',
  weniger_teile: 'Das sind genug. Geht es mit weniger Teilen?',
  zerlegen_wahl: 'Welche Zahl möchtest du zerlegen?',
  stufe_wahl: (z) => (z === 'gemischt' ? 'Alle Zahlen gemischt. Welche Übung?' : `Die ${z}. Welche Übung?`),
  spiel_z1: 'Übung 1',
  spiel_z2: 'Übung 2',
  spiel_z3: 'Übung 3',
  spiel_z4: 'Plusaufgaben',
  spiel_zprobe: 'Prüfung',
  // gefragt wird nach dem leeren Zimmer; die bekannte Zahl steht im anderen Zimmer
  zerlege_aufgabe: (t) => `Wie viel muss ich zur ${t.leer === 'r' ? t.a : t.b} dazuzählen, damit ich ${t.n} erhalte?`,
  zerlege_richtig: (t) => `Richtig! ${t.n} ist ${t.a} und ${t.b}.`,
  zerlege_hilfe: 'Schau auf die Würfel. Wie viele fehlen?',
  stufe2_aufgabe: (t) => `${t.n}. Wie viele sind in der Hand?`,
  // Übung 1 und 2 (Hände): die sichtbare Anzahl wird genannt, die versteckte erfragt (Probe der Lehrkraft 27.10.2026)
  zerlege_frage: (t) => `Die ${t.n} zerlege ich in ${t.leer === 'l' ? t.b : t.a} und …?`,
  zahl_ansage: (n) => `${n}.`,
  stufe1_frage: 'Wie viele sind in der Hand?',
  stufe2_hilfe: 'Schau in die Hand und zähl die Würfel.',
  zerlege_tausch: (t) => `Das geht auch andersherum: ${t.b} und ${t.a}.`,
  zerlege_loesung: (t) => `Schau: ${t.n} ist ${t.a} und ${t.b}.`,
  probe_start: 'Jetzt kommt die Prüfung.',
  probe_ende: ({ richtig, gesamt, blitz }) => `${richtig === gesamt ? `Alle ${gesamt}` : `${richtig} von ${gesamt}`} richtig${blitz ? `, davon ${blitz} blitzschnell` : ''}.`,
  bald: 'Das kommt bald.',
  frei_intro: 'Leg Fünfer und Einer ins Feld. Dann schreib, wie viele es sind.',
  legen_aufgabe: ({ f, e }) => `${ZW_FUENFER[f]} und ${ZW_EINER[e]}.`,
  legen_nochmal: 'Schau noch einmal genau.',
  legen_tauschen: 'Schau auf die Tafel. Tausche fünf Einer gegen einen Fünfer.',
  schreib_zahl: 'Wie viele sind es? Schreib die Zahl.',
  geschafft: (s) => `Geschafft! Du hast ${s === 1 ? 'einen Stern' : `${s} Sterne`}.`,
  fuenfer_platz: 'Ein Fünfer passt nur in einen leeren Fünferplatz.',
  fuenfer_naechster: 'Leg den Fünfer auf den nächsten freien Fünferplatz.',
  einer_platz: 'Leg den Einer auf den nächsten freien Platz.',
  feld_voll: 'Das Feld ist voll.',
  nur_letztes: 'Du kannst nur das letzte Teil zurücknehmen.',
  tauschen_tipp: 'Fünf Einer kannst du gegen einen Fünfer tauschen.',
  zehner: 'Zwei Fünfer sind ein Zehner.',
  richtig: (n) => (n === 1 ? 'Richtig! Das ist 1.' : `Richtig! Das sind ${n}.`),
  nochmal: 'Schau noch einmal genau hin. Ein Fünfer, das sind 5.',
  nochmal_kurz: 'Schau noch einmal genau hin.',
  aufloesung: (n) => (n === 1 ? 'Schau: Es ist 1.' : `Schau: Es sind ${n}.`),
  bis10: 'Zahlen bis 10',
  bis20: 'Zahlen bis 20'
};

// Nach diesen Sätzen wird noch die Zahl gesprochen (die Zahl steht nicht im Satz – Hör-Übung)
export const NACH_SATZ_ZAHL = ['umkehr_aufgabe', 'umkehr_nochmal'];
// Diese „Sätze“ sind nur die Zahl selbst → Zahl-MP3 (audio/thorsten/<n>.mp3)
export const NUR_ZAHL = ['zahl_ansage'];

export const satzText = (key, n) => (typeof SAETZE[key] === 'function' ? SAETZE[key](n) : SAETZE[key]);

// Dateiname (ohne .mp3) für einen Satz mit seinem Wert
export function satzDatei(key, n) {
  if (typeof SAETZE[key] !== 'function' || n == null || NACH_SATZ_ZAHL.includes(key)) return key;
  if (typeof n === 'object') {
    if (key === 'zerlege_aufgabe') return `${key}_${n.n}_${n.leer === 'r' ? n.a : n.b}`;
    if (key === 'stufe2_aufgabe') return `${key}_${n.n}`;
    if (key === 'zerlege_frage') return `${key}_${n.n}_${n.leer === 'l' ? n.b : n.a}`;
    if ('n' in n && 'a' in n) return `${key}_${n.n}_${n.a}`;
    if ('f' in n) return `${key}_${n.f}_${n.e}`;
    if ('richtig' in n) return `${key}_${n.richtig}_${n.gesamt}_${n.blitz}`;
  }
  return `${key}_${n}`;
}

// Alle Sätze mit allen Werten, die in der App vorkommen können (für die Ton-Erzeugung)
export function alleSaetze() {
  const bis = (a, b) => [...Array(b - a + 1)].map((_, i) => a + i);
  const zerlegungen = bis(4, 10).flatMap(n => bis(0, n).map(a => ({ n, a, b: n - a })));
  const werte = {
    richtig: bis(0, 20),
    aufloesung: bis(0, 20),
    geschafft: bis(0, 10),
    stufe_wahl: [...bis(4, 10), 'gemischt'],
    legen_aufgabe: bis(0, 4).flatMap(f => bis(0, 4).map(e => ({ f, e }))),
    zerlege_aufgabe: zerlegungen.flatMap(t => [{ ...t, leer: 'r' }, { ...t, leer: 'l' }]),
    zerlege_richtig: zerlegungen,
    zerlege_loesung: zerlegungen,
    zerlege_tausch: zerlegungen,
    stufe2_aufgabe: bis(4, 10).map(n => ({ n })),
    zerlege_frage: zerlegungen.map(t => ({ ...t, leer: 'r' })), // sichtbar = a
    // Prüfung (früher Pass-Probe): 3 bis 11 Aufgaben (mit bzw. ohne Null-Zerlegungen)
    probe_ende: bis(3, 11).flatMap(gesamt => bis(0, gesamt).flatMap(richtig => bis(0, richtig).map(blitz => ({ richtig, gesamt, blitz }))))
  };
  const out = new Map();
  Object.keys(SAETZE).forEach((key) => {
    if (NUR_ZAHL.includes(key)) return;
    const liste = werte[key] || [undefined];
    liste.forEach((n) => { const datei = satzDatei(key, n); if (!out.has(datei)) out.set(datei, { datei, schluessel: key, text: satzText(key, n) }); });
  });
  return [...out.values()];
}
