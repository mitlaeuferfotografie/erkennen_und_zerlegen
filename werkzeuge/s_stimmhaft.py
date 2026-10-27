# Macht das scharfe S am Wortanfang (Thorsten zischt es immer) stimmhaft wie in "Sonne":
# dem Zischen wird ein tiefes Summen in der Tonhöhe des folgenden Vokals beigemischt.
# Von der Lehrkraft am 15.10.2026 gewählt: Fassung "Z4" = Summen 0.55, Zischen 0.25 (Standardwerte unten).
# Erzeugt mit de_DE-thorsten-high (huggingface.co/rhasspy/piper-voices).
#
# Aufruf:  python werkzeuge/s_stimmhaft.py <pfad/de_DE-thorsten-high.onnx> <wort> <ausgabe.mp3> [summen] [zischen]
# Beispiel: python werkzeuge/s_stimmhaft.py ../modelle/de_DE-thorsten-high.onnx sechs public/audio/thorsten/6.mp3
# Benötigt: pip install piper-tts numpy, ffmpeg im PATH

import sys, wave, subprocess, os
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

# 0,35 s Stille vorne (sonst schneiden Tablets den Wortanfang ab), 0,3 s hinten, Lautstärke angleichen (wie stimmen_erzeugen.py)
AF = ('silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
      'silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
      'adelay=350,apad=pad_dur=0.3,highpass=f=70,loudnorm=I=-16:TP=-1.5')


def stimmhaft(voice, wort, ziel, mix=0.55, hiss=0.25, tempo=1.3):
    sr = voice.config.sample_rate
    ph = voice.phonemize(wort + '.')[0]
    a = voice.phoneme_ids_to_audio(voice.phonemes_to_ids(ph), SynthesisConfig(length_scale=tempo, noise_scale=0.4, noise_w_scale=0.4)).astype(float)
    # Beginn (hörbar) und Beginn des Vokals (Stimme schwingt regelmäßig) finden
    fr = int(0.01 * sr)
    rms = np.array([np.sqrt(np.mean(a[i:i + fr] ** 2)) for i in range(0, len(a) - fr, fr)])
    start = int(np.argmax(rms > 0.03 * rms.max()))

    def periodic(seg):
        seg = seg - seg.mean(); ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
        lo, hi = int(sr / 320), int(sr / 80); k = lo + int(np.argmax(ac[lo:hi]))
        return ac[k] / (ac[0] + 1e-9), k

    vowel = start
    for i in range(start, len(rms)):
        if periodic(a[i * fr:i * fr + 3 * fr])[0] > 0.6:
            vowel = i; break
    period = periodic(a[vowel * fr:vowel * fr + 4 * fr])[1]
    s0, s1 = start * fr, vowel * fr
    vrms = np.sqrt(np.mean(a[s1:s1 + 4 * fr] ** 2))

    def lowpass(x, fc):
        X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / sr); X[f > fc] = 0
        return np.fft.irfft(X, len(x))

    # Glottis-Pulse in der Tonhöhe des Vokals, tiefpassgefiltert = Summen; weich eingeblendet
    n = s1 - s0
    pulses = np.zeros(n); pulses[::period] = 1.0
    buzz = lowpass(np.convolve(pulses, np.hanning(period // 2), 'same'), 450)
    buzz = buzz / (np.sqrt(np.mean(buzz ** 2)) + 1e-9) * vrms * mix
    env = np.minimum(1, np.arange(n) / (0.02 * sr))
    y = np.concatenate([a[:s0], a[s0:s1] * hiss + buzz * env, a[s1:]])
    tmp = ziel + '.tmp.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(y / np.abs(y).max() * 0.9, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-af', AF, '-ar', '24000', '-ac', '1', '-b:a', '48k', ziel], check=True)
    os.remove(tmp)
    return round(n / sr * 1000), period


if __name__ == '__main__':
    onnx, wort, ziel = sys.argv[1], sys.argv[2], sys.argv[3]
    mix = float(sys.argv[4]) if len(sys.argv) > 4 else 0.55
    hiss = float(sys.argv[5]) if len(sys.argv) > 5 else 0.25
    ms, per = stimmhaft(PiperVoice.load(onnx), wort, ziel, mix, hiss)
    print(f'{wort}: {ms} ms Zischen bearbeitet -> {ziel}')
