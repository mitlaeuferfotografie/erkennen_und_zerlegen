# Ergänzt die Ziffer 7 in Fredoka um einen Querstrich (so schreibt die Klasse die 7).
# Fredoka steht unter der SIL Open Font License 1.1 ohne "Reserved Font Name". Die geänderte
# Schrift heißt trotzdem "Fuenfer Fredoka", damit sie nicht mit dem Original verwechselt wird.
#
# Aufruf:  python werkzeuge/sieben_querstrich.py <ordner-mit-original-fredoka> public/fonts
# Benötigt: pip install fonttools brotli

import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

WEIGHTS = [400, 500, 600, 700]
NEW_FAMILY = 'Fuenfer Fredoka'


def contour_points(glyph, glyf):
    coords, ends, _ = glyph.getCoordinates(glyf)
    out, start = [], 0
    for end in ends:
        out.append([tuple(p) for p in coords[start:end + 1]])
        start = end + 1
    return out


def crossings_h(contours, y):
    xs = []
    for pts in contours:
        for i in range(len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
            if (y1 - y) * (y2 - y) < 0:
                xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
    return sorted(xs)


def crossings_v(contours, x):
    ys = []
    for pts in contours:
        for i in range(len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % len(pts)]
            if (x1 - x) * (x2 - x) < 0:
                ys.append(y1 + (x - x1) * (y2 - y1) / (x2 - x1))
    return sorted(ys, reverse=True)


def signed_area(pts):
    return sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))) / 2


def add_bar(font):
    glyf = font['glyf']
    name = font.getBestCmap()[ord('7')]
    g = glyf[name]
    contours = contour_points(g, glyf)
    # Strichstärke: senkrechter Schnitt durch den oberen Balken
    ys = crossings_v(contours, (g.xMin + g.xMax) / 2)
    t = ys[0] - ys[1]
    # Mitte des schrägen Strichs auf halber Höhe
    ymid = (g.yMax + g.yMin) * 0.46
    xs = crossings_h(contours, ymid)
    cx = (xs[0] + xs[-1]) / 2
    half_w = (g.xMax - g.xMin) * 0.30
    h = t * 0.82
    r = h / 2
    x0, x1 = round(cx - half_w), round(cx + half_w)
    y0, y1 = round(ymid - r), round(ymid + r)
    clockwise = signed_area(contours[0]) < 0

    pen = TTGlyphPen(glyf)
    g.draw(pen, glyf)
    # Kapsel (Stadion) mit runden Enden, gleiche Laufrichtung wie die Außenkontur
    pts = [
        ('m', (x0 + r, y1)), ('l', (x1 - r, y1)), ('q', (x1, y1), (x1, round(ymid))), ('q', (x1, y0), (x1 - r, y0)),
        ('l', (x0 + r, y0)), ('q', (x0, y0), (x0, round(ymid))), ('q', (x0, y1), (x0 + r, y1)),
    ]
    if not clockwise:
        # gegen den Uhrzeigersinn: unten anfangen und rückwärts laufen
        pts = [
            ('m', (x0 + r, y1)), ('q', (x0, y1), (x0, round(ymid))), ('q', (x0, y0), (x0 + r, y0)),
            ('l', (x1 - r, y0)), ('q', (x1, y0), (x1, round(ymid))), ('q', (x1, y1), (x1 - r, y1)),
        ]
    for op in pts:
        p = [tuple(map(round, q)) for q in op[1:]]
        if op[0] == 'm':
            pen.moveTo(p[0])
        elif op[0] == 'l':
            pen.lineTo(p[0])
        else:
            pen.qCurveTo(*p)
    pen.closePath()
    new = pen.glyph()
    new.recalcBounds(glyf)
    glyf[name] = new
    return name, (x0, y0, x1, y1), t


def rename(font, weight_label):
    for rec in font['name'].names:
        s = rec.toUnicode()
        if rec.nameID in (1, 4, 16):
            rec.string = s.replace('Fredoka Light', NEW_FAMILY).replace('Fredoka', NEW_FAMILY)
        elif rec.nameID in (3, 6):
            rec.string = s.replace('FredokaLight', 'FuenferFredoka').replace('Fredoka', 'FuenferFredoka')


def main(src, dst):
    for w in WEIGHTS:
        f = TTFont(Path(src) / f'fredoka-latin-{w}-normal.woff2')
        name, box, t = add_bar(f)
        rename(f, w)
        f.flavor = 'woff2'
        out = Path(dst) / f'fuenfer-fredoka-{w}.woff2'
        f.save(out)
        print(w, name, 'Querstrich', box, 'Strich', round(t), '->', out)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
