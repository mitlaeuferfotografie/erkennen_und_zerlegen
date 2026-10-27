# Baut eine Anhör-Seite für alle erzeugten Sätze und Zahlen: _site/probe-saetze/index.html
# Aufruf (nach saetze_erzeugen.py und lokal_bauen.sh):  python werkzeuge/anhoerseite.py
# Nur zum Anhören für die Lehrkraft – nicht Teil der App.

import json, os, html, time
STAND = time.strftime('%Y%m%d%H%M')  # an jede Ton-Adresse hängen – sonst spielt das iPad alte Töne aus dem Zwischenspeicher
from collections import OrderedDict

bericht = json.load(open('public/audio/thorsten/saetze/bericht.json', encoding='utf-8'))
gruppen = OrderedDict()
for b in bericht:
    gruppen.setdefault(b.get('schluessel', 'Zahlen 0–20'), []).append(b)

teile = []
for name, liste in gruppen.items():
    offen = ' open' if len(liste) <= 3 else ''
    zeilen = []
    for b in liste:
        weich = f'<span class="w">weiches S: {b["weich"]}/{b["z"]}</span>' if b['z'] else ''
        zeilen.append(f'<div class="z"><span class="t">{html.escape(b["text"])}</span>{weich}'
                      f'<audio controls preload="none" src="../audio/thorsten/{b["datei"]}.mp3?v={STAND}"></audio></div>')
    teile.append(f'<details{offen}><summary>{html.escape(name)} <small>({len(liste)})</small></summary>{"".join(zeilen)}</details>')

seite = f'''<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Anhören: Erzähler-Sätze</title>
<style>
body{{font-family:sans-serif;background:#1e1b4b;color:#fff;margin:0;padding:16px;max-width:760px;margin:auto}}
details{{background:#312e81;border-radius:14px;margin:8px 0;padding:6px 12px}}
summary{{font-size:20px;font-weight:700;cursor:pointer;padding:6px 0}}
small{{opacity:.6;font-weight:400}}
.z{{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:8px 0;border-top:1px solid #4338ca}}
.t{{flex:1 1 260px;font-size:17px}} .w{{font-size:12px;color:#fde68a}}
audio{{height:34px;flex:1 1 240px}}
</style></head><body>
<h1>Erzähler-Sätze (Thorsten)</h1>
<p>{len(bericht)} Dateien. Aufklappen und anhören. „weiches S“ zeigt, wie viele S am Wortanfang weich gemacht wurden.</p>
{"".join(teile)}
</body></html>'''
os.makedirs('_site/probe-saetze', exist_ok=True)
open('_site/probe-saetze/index.html', 'w', encoding='utf-8').write(seite)
print('Anhör-Seite:', len(bericht), 'Dateien in', len(gruppen), 'Gruppen')
