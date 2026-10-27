# Erzeugt alle Erzähler-Sätze und die Zahlen 0–20 als MP3 mit der Stimme Thorsten (Piper, Modell de_DE-thorsten-high).
#
# Thorsten spricht jedes S am Wortanfang scharf (die 6 klingt wie „Sex“). Darum wird jedes weiche S (Lautschrift „z“)
# stimmhaft gemacht. Wo es liegt, ist genau bekannt: Das Stimmmodell gibt zusätzlich die Dauer jedes Lautes aus.
# An dieser Stelle dem Zischen wird ein tiefes Summen in der Tonhöhe des folgenden Vokals
# beigemischt (wie werkzeuge/s_stimmhaft.py, Fassung „Z4“: Summen 0.55, Zischen 0.25).
#
# Ablauf:
#   1. Satzliste aus src/saetze.js holen (eine Liste für App und Ton):
#        cd build && npx esbuild src/saetze.js --bundle --format=cjs --outfile=saetze.cjs
#        node -e "require('fs').writeFileSync('saetze.json', JSON.stringify(require('./saetze.cjs').alleSaetze()))"
#   2. python werkzeuge/saetze_erzeugen.py <de_DE-thorsten-high.onnx> build/saetze.json public/audio/thorsten [schluessel1,schluessel2]
#      (mit Schlüsseln: nur diese Sätze neu erzeugen, z. B. nach einer Textänderung)
# Benötigt: pip install piper-tts numpy onnx onnxruntime, ffmpeg im PATH. Danach JEDEN Satz anhören (Anhör-Seite: _site/probe-saetze/).

import sys, os, json, re, wave, subprocess
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

AF = ('silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
      'silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
      'adelay=350,apad=pad_dur=0.3,highpass=f=70,loudnorm=I=-16:TP=-1.5')
MIX, HISS = 0.55, 0.25          # Fassung Z4 (von der Lehrkraft gewählt)
TEMPO_SATZ, TEMPO_ZAHL = 1.15, 1.3

# Aussprache-Korrekturen in der Lautschrift (von der Lehrkraft am 27.10.2026 per Anhörprobe gewählt).
# Ersetzt wird ein ganzes Wort oder der Anfang einer Zusammensetzung (z. B. „Fünferplatz“, „Zehner“).
AUSSPRACHE = {
    'fˈʏnfɜ': 'fˈʏnvɜ',                       # Fünfer → „Fünwer“
    'ˌaɪnɜ': 'ˈaɪnɜ',                         # Einer betont (sonst gesprochen wie das Fürwort „einer“)
    'plˈuːzaʊfɡˌɑːbən': 'plˈʊsʔaʊfɡˌaːbən',   # Plusaufgaben: kurzes u, „Plus | Aufgaben“ (sonst „Pluh-saufgaben“)
    'nˈɔøn': 'nˈɔɪn',                         # neun → „noin“
    'tsˈeːn': 'ttsˈeːn',                      # zehn, Zehner: kräftigeres t (sonst klingt das z wie s)
}
NEUN_AUSBLENDEN = 0.10  # die einzelne 9 wird aus „Neunzehn“ herausgeschnitten (klang als Einzelwort nicht gut), so lange ausblenden


def lautschrift_anpassen(laute):
    woerter = ''.join(laute).split(' ')
    for i, wo in enumerate(woerter):
        for alt, neu in AUSSPRACHE.items():
            if wo.startswith(alt):
                woerter[i] = neu + wo[len(alt):]
    return list(' '.join(woerter))


EINS = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn',
        'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig']


def sprechtext(text, schluessel=''):
    """Ziffern als Wörter (sonst liest die Stimme „6.“ als Ordnungszahl)."""
    t = text.replace('Pass-Probe', 'Passprobe')
    if schluessel == 'probe_ende':  # „eine von 3“, „davon eine blitzschnell“ (die Aufgabe)
        t = re.sub(r'\b1\b', 'eine', t)
    t = re.sub(r'\b(\d{1,2})\b', lambda m: EINS[int(m.group(1))], t)
    return t[0].upper() + t[1:] if t else t


class Stimme:
    """Piper-Stimme, deren Modell zusätzlich die Lautdauern ausgibt (Zwischenwert „/Ceil_output_0“).
    So ist für jeden Laut genau bekannt, wo er im Ton liegt."""
    HOP = 256

    def __init__(self, onnx_pfad):
        import onnx, onnxruntime as ort
        self.voice = PiperVoice.load(onnx_pfad)
        self.sr = self.voice.config.sample_rate
        m = onnx.load(onnx_pfad)
        m.graph.output.append(onnx.helper.make_tensor_value_info('/Ceil_output_0', onnx.TensorProto.FLOAT, None))
        self.sess = ort.InferenceSession(m.SerializeToString(), providers=['CPUExecutionProvider'])

    def sprich(self, text, tempo):
        """Ton (float) und Liste der Laute mit Startsample: [(laut, start, ende), …]."""
        teile, laute, offset = [], [], 0
        pause = np.zeros(int(0.12 * self.sr))
        for satz in self.voice.phonemize(text):
            satz = lautschrift_anpassen(satz)
            ids = self.voice.phonemes_to_ids(satz)
            audio, dauer = self.sess.run(None, {
                'input': np.array([ids], dtype=np.int64), 'input_lengths': np.array([len(ids)], dtype=np.int64),
                'scales': np.array([0.4, tempo, 0.4], dtype=np.float32)})
            audio, dauer = audio.squeeze().astype(float), dauer.squeeze()
            if teile:  # kurze Pause zwischen zwei Satzteilen – vor der Zeitrechnung mitzählen
                teile.append(pause); offset += len(pause)
            grenzen = np.concatenate([[0], np.cumsum(dauer)]) * self.HOP
            for k, p in enumerate(satz):  # Laut k hat die ID-Position 2 + 2k (davor BOS und Pausen-IDs)
                pos = 2 + 2 * k
                if pos + 1 < len(grenzen):
                    laute.append((p, offset + int(grenzen[pos]), offset + int(grenzen[pos + 1])))
            teile.append(audio); offset += len(audio)
        return np.concatenate(teile), laute


def frames(a, sr, ms=10):
    fr = int(sr * ms / 1000)
    return fr, [a[i:i + fr] for i in range(0, len(a) - fr, fr)]


def periodizitaet(seg, sr):
    seg = seg - seg.mean()
    if len(seg) < 64 or not seg.any():
        return 0.0, 100
    ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
    lo, hi = int(sr / 320), min(len(ac) - 1, int(sr / 80))
    k = lo + int(np.argmax(ac[lo:hi]))
    return ac[k] / (ac[0] + 1e-9), k


def mache_stimmhaft(a, sr, s0, s1):
    """Zischen zwischen s0 und s1 (Samples) mit Summen in der Tonhöhe des folgenden Vokals mischen."""
    fr = int(sr * 0.01)
    periode, vrms = None, None
    for i in range(s1, min(len(a) - 4 * fr, s1 + int(0.2 * sr)), fr):
        p, k = periodizitaet(a[i:i + 3 * fr], sr)
        if p > 0.6:
            periode, vrms = k, np.sqrt(np.mean(a[i:i + 4 * fr] ** 2))
            break
    if not periode:
        return a, False
    n = s1 - s0
    pulse = np.zeros(n); pulse[::periode] = 1.0
    buzz = np.convolve(pulse, np.hanning(max(4, periode // 2)), 'same')
    X = np.fft.rfft(buzz); f = np.fft.rfftfreq(n, 1 / sr); X[f > 450] = 0; buzz = np.fft.irfft(X, n)
    buzz = buzz / (np.sqrt(np.mean(buzz ** 2)) + 1e-9) * vrms * MIX
    rampe = int(0.012 * sr)
    env = np.ones(n); env[:rampe] = np.linspace(0, 1, min(rampe, n)); env[-rampe:] = np.minimum(env[-rampe:], np.linspace(1, 0.6, min(rampe, n)))
    b = a.copy()
    b[s0:s1] = a[s0:s1] * HISS + buzz * env
    return b, True


def ist_zischen(a, sr, i, fr):
    seg = a[i:i + 3 * fr]
    if len(seg) < 3 * fr:
        return False
    fq = np.fft.rfftfreq(len(seg), 1 / sr)
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    hoch = sp[fq > 3500].sum() / (sp.sum() + 1e-12)
    return hoch > 0.4 and periodizitaet(seg, sr)[0] < 0.5


def weiches_s(a, sr, laute):
    """Jedes „z“ (weiches S) an seiner genauen Stelle stimmhaft machen – falls Thorsten dort zischt."""
    fr = int(0.01 * sr)
    z = [(s0, s1) for (p, s0, s1) in laute if p == 'z']
    erledigt = 0
    for s0, s1 in z:
        # nächster Laut nach dem z (Vokal) – bis dahin reicht das Zischen höchstens
        naechster = next((t0 for (p, t0, t1) in laute if t0 > s0 and p not in ('ˈ', 'ˌ', 'ː')), s1)
        von, bis = max(0, s0 - int(0.04 * sr)), min(len(a), max(s1, naechster) + int(0.02 * sr))
        zisch = [i for i in range(von, bis - 3 * fr, fr) if ist_zischen(a, sr, i, fr)]
        if not zisch:
            continue  # dort klingt das S schon weich
        a, ok = mache_stimmhaft(a, sr, zisch[0], min(len(a), zisch[-1] + 2 * fr))
        erledigt += ok
    return a, len(z), erledigt


def speichere(a, sr, ziel):
    tmp = ziel + '.tmp.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(a / (np.abs(a).max() + 1e-9) * 0.9, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-af', AF, '-ar', '24000', '-ac', '1', '-b:a', '48k', ziel], check=True)
    os.remove(tmp)


def main(onnx, liste, ziel, nur=None):
    """nur = Liste von Satz-Schlüsseln: nur diese neu erzeugen (Bericht wird ergänzt, Zahlen bleiben)."""
    stimme = Stimme(onnx)
    sr = stimme.sr
    os.makedirs(os.path.join(ziel, 'saetze'), exist_ok=True)
    alt = os.path.join(ziel, 'saetze', 'bericht.json')
    bericht = [b for b in json.load(open(alt, encoding='utf-8')) if b.get('schluessel') not in nur] if nur and os.path.exists(alt) else []
    # Zahlen 0–20 (gleiches Modell wie die Sätze, damit alles gleich klingt)
    for n in (range(0, 21) if not nur else []):
        t = sprechtext(str(n))
        a, laute = stimme.sprich(t + '.', TEMPO_ZAHL)
        if n == 9:  # „noin“ aus „Neunzehn“: bis zum Ende des n vor „zehn“, dann weich ausblenden
            a, laute = stimme.sprich('Neunzehn.', TEMPO_ZAHL)
            ps = [l[0] for l in laute]
            kn = next(i for i in range(len(ps) - 1) if ps[i] == 'n' and ps[i + 1] == 't')
            ende, fade = laute[kn][2], int(NEUN_AUSBLENDEN * sr)
            a = a[:ende].copy(); a[-fade:] *= np.linspace(1, 0, fade)
            laute = [l for l in laute if l[2] <= ende]
        a, z, ok = weiches_s(a, sr, laute)
        speichere(a, sr, os.path.join(ziel, f'{n}.mp3'))
        bericht.append({'datei': f'{n}', 'text': str(n), 'z': z, 'weich': ok})
    for e in json.load(open(liste, encoding='utf-8')):
        if nur and e['schluessel'] not in nur:
            continue
        t = sprechtext(e['text'], e['schluessel'])
        a, laute = stimme.sprich(t, TEMPO_SATZ)
        a, z, ok = weiches_s(a, sr, laute)
        speichere(a, sr, os.path.join(ziel, 'saetze', e['datei'] + '.mp3'))
        bericht.append({'datei': 'saetze/' + e['datei'], 'schluessel': e['schluessel'], 'text': e['text'], 'gesprochen': t, 'z': z, 'weich': ok})
        if len(bericht) % 50 == 0:
            print(len(bericht), 'fertig', flush=True)
    json.dump(bericht, open(os.path.join(ziel, 'saetze', 'bericht.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    offen = [b for b in bericht if b['z'] > b['weich']]
    print(f'{len(bericht)} Dateien. Weiche S gesucht: {sum(b["z"] for b in bericht)}, bearbeitet: {sum(b["weich"] for b in bericht)}. Sätze mit nicht bearbeitetem S: {len(offen)}')
    for b in offen[:40]:
        print('  ', b['datei'], '|', b['text'], f'({b["weich"]}/{b["z"]})')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(',') if len(sys.argv) > 4 else None)
