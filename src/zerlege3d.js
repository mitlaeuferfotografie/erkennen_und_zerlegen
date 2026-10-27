// ==========================================
// ZERLEGEN IN 3D (WebGL, three.js – lokal mitgeliefert, keine Verbindung nach außen)
// Zwei Hände halten eine Stange aus Steckwürfeln, ziehen sie auseinander, ein Teil verschwindet in einer Hand.
// Handmodelle: „generic-hand“ aus @webxr-input-profiles/assets (MIT, © 2019 Amazon), public/modelle/.
// Die Gelenke im Modell hängen nicht aneinander – das Beugen der Finger wird hier selbst berechnet.
// ==========================================
import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial,
  CylinderGeometry, PlaneGeometry, CanvasTexture, RepeatWrapping, Fog, PCFSoftShadowMap, SRGBColorSpace, MathUtils, Vector3, Quaternion, Matrix4, Color, Raycaster
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as klone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export const HAUT = ['#f1c7a3', '#e0a47c', '#c4875a', '#97603c', '#6a4027'];
const AERMEL_FARBE = '#f97316';
const GRUEN = '#16a34a';

const C = 1;              // Würfelgröße (ein Steckwürfel ≈ 2 cm)
const SKALA = 38;         // Modell in Metern, etwas verkleinert (Kinderhand) – ein Würfel ≈ 2 cm
const HAND_Y = 0;         // Höhe der Handfläche
const WUERFEL_Y = 1.7;    // Würfelmitte: Würfel liegen oben auf der Handfläche auf
const WUERFEL_Z = 1.3;    // etwas zum Handballen hin (der liegt hinten), damit die Finger nicht hindurchragen
const FINGER = ['index', 'middle', 'ring', 'pinky'];
const GLIEDER = ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'];
const DAUMEN = ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'];
// Beugung (Radiant) je Gelenk: Grundgelenk, Mittelgelenk, Endgelenk
export const POSE = {
  // Daumen: [Beugung, Drehung y, Drehung z] am Grundgelenk, dann Beugung der zwei Glieder.
  // Beim Halten liegt er flach seitlich neben der Hand (hebt sich nicht unter die Würfel),
  // in der Faust legt er sich außen an die eingerollten Finger (nicht durch den Zeigefinger).
  offen: { f: [0.05, 0.08, 0.05], d: [[-0.3, 0.15, 0.35], 0, 0.05] },
  halten: { f: [0.3, 0.3, 0.2], d: [[-0.3, 0.2, 0.45], 0.05, 0.1] },
  zu: { f: [1.45, 1.75, 1.1], d: [[0, 0.5, 1.4], 0.3, 0.4] }
};

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- Handmodell vorbereiten ----------
function bereiteHandVor(gltf, hautFarbe, seite) {
  const modell = gltf.scene;
  const knochen = {};
  let mesh = null;
  modell.traverse((o) => {
    if (o.isBone || (o.name && (o.name.includes('finger') || o.name.includes('thumb') || o.name === 'wrist'))) knochen[o.name] = o;
    if (o.isSkinnedMesh || o.isMesh) mesh = mesh || o;
  });
  if (mesh) {
    mesh.material = new MeshPhysicalMaterial({ color: hautFarbe, roughness: 0.58, sheen: 0.6, sheenColor: new Color('#ffd9c8'), sheenRoughness: 0.6 });
    mesh.castShadow = true;
    mesh.frustumCulled = false;
  }
  // Ruhelage merken
  const ruhe = {};
  Object.entries(knochen).forEach(([n, k]) => { ruhe[n] = { p: k.position.clone(), q: k.quaternion.clone() }; });

  // Ausrichtung bestimmen: Finger zeigen nach hinten (−z), Handfläche nach oben (+y)
  const P = (n) => ruhe[n].p.clone();
  const handgelenk = P('wrist');
  const mitte = P('middle-finger-phalanx-proximal');
  const richtung = mitte.clone().sub(handgelenk).normalize();
  const quer = P('index-finger-phalanx-proximal').sub(P('pinky-finger-phalanx-proximal')).normalize();
  let normale = new Vector3().crossVectors(richtung, quer).normalize();
  // Handrücken = +y des Handgelenks (WebXR); Handfläche zeigt in die Gegenrichtung
  const ruecken = new Vector3(0, 1, 0).applyQuaternion(ruhe.wrist.q);
  if (normale.dot(ruecken) > 0) normale.negate();
  const seitlich = new Vector3().crossVectors(richtung, normale).normalize();
  const vonModell = new Matrix4().makeBasis(seitlich, normale, richtung.clone().negate()); // Modell-Achsen
  const ziel = new Matrix4().makeBasis(new Vector3().crossVectors(new Vector3(0, 0, -1), new Vector3(0, 1, 0)).normalize(), new Vector3(0, 1, 0), new Vector3(0, 0, 1));
  const drehung = new Quaternion().setFromRotationMatrix(ziel.multiply(vonModell.invert()));

  const huelle = new Group();      // dreht das Modell in die richtige Lage
  huelle.quaternion.copy(drehung);
  huelle.scale.setScalar(SKALA);
  huelle.add(modell);
  // Handflächenmitte in den Ursprung schieben
  const palmMitte = P('middle-finger-metacarpal').add(P('middle-finger-phalanx-proximal')).multiplyScalar(0.5)
    .add(P('index-finger-metacarpal').add(P('pinky-finger-metacarpal')).multiplyScalar(0.5)).multiplyScalar(0.5);
  modell.position.copy(palmMitte.clone().negate());

  // Hände zeigen zum Betrachter: Finger nach vorne (+z), Ärmel gehen nach hinten weg
  // (als säße jemand gegenüber und zeigte dem Kind die Würfel)
  const root = new Group();
  const gedreht = new Group(); gedreht.rotation.y = Math.PI; root.add(gedreht);
  gedreht.add(huelle);

  // Unterarm und Ärmel (oranger Ärmel = Zerlegen-Hände)
  const wristWelt = handgelenk.clone().sub(palmMitte).multiplyScalar(SKALA).applyQuaternion(drehung);
  const arm = new Group(); arm.position.copy(wristWelt); arm.rotation.x = -0.12; gedreht.add(arm);
  // Der Ärmel reicht bis an die Hand (kein freier Unterarm), vorne ein etwas dunklerer Bund
  const aermelMat = new MeshStandardMaterial({ color: AERMEL_FARBE, roughness: 0.85 });
  const aermel = new Mesh(new CylinderGeometry(0.035 * SKALA, 0.031 * SKALA, 0.14 * SKALA, 40), aermelMat);
  aermel.rotation.x = Math.PI / 2; aermel.position.z = 0.062 * SKALA; aermel.castShadow = true; arm.add(aermel);
  const bund = new Mesh(new CylinderGeometry(0.0325 * SKALA, 0.0325 * SKALA, 0.014 * SKALA, 40), new MeshStandardMaterial({ color: '#c2410c', roughness: 0.85 }));
  bund.rotation.x = Math.PI / 2; bund.position.z = -0.002 * SKALA; arm.add(bund);

  const hand = { root, knochen, ruhe, seite, k: 0, mesh };
  setzeKruemmung(hand, 0.15);
  return hand;
}

// Finger beugen: k = 0 offen … 0.45 halten … 1 Faust. Gedreht wird jeweils um die eigene x-Achse des Gelenks.
function beugeKette(hand, namen, winkel) {
  const { knochen, ruhe } = hand;
  const p = namen.map(n => ruhe[n].p.clone());
  const q = namen.map(n => ruhe[n].q.clone());
  // winkel[j]: Zahl = Beugung um die eigene x-Achse des Gelenks; [x, y, z] = zusätzlich Drehung um y und z
  // (für den Daumen, der sich zur Handfläche hin bewegt)
  const drehe = (j, achseLokal, w) => {
    if (!w) return;
    const r = new Quaternion().setFromAxisAngle(achseLokal.clone().applyQuaternion(q[j]), -w);
    for (let k = j; k < namen.length; k++) {
      if (k > j) p[k].sub(p[j]).applyQuaternion(r).add(p[j]);
      q[k].premultiply(r);
    }
  };
  for (let j = 0; j < winkel.length; j++) {
    const w = Array.isArray(winkel[j]) ? winkel[j] : [winkel[j], 0, 0];
    drehe(j, new Vector3(0, 0, 1), w[2]);
    drehe(j, new Vector3(0, 1, 0), w[1]);
    drehe(j, new Vector3(1, 0, 0), w[0]);
  }
  namen.forEach((n, i) => { knochen[n].position.copy(p[i]); knochen[n].quaternion.copy(q[i]); });
}
function setzeKruemmung(hand, k) {
  hand.k = k;
  const mische = (a, b, t) => (Array.isArray(a) || Array.isArray(b)
    ? [0, 1, 2].map(i => lerp(Array.isArray(a) ? a[i] : (i ? 0 : a), Array.isArray(b) ? b[i] : (i ? 0 : b), t))
    : lerp(a, b, t));
  const pose = (art) => (k <= 0.45
    ? POSE.offen[art].map((a, i) => mische(a, POSE.halten[art][i], k / 0.45))
    : POSE.halten[art].map((a, i) => mische(a, POSE.zu[art][i], (k - 0.45) / 0.55)));
  const f = pose('f'), d = pose('d');
  FINGER.forEach((name) => {
    const kette = GLIEDER.map(g => `${name}-finger-${g}`);
    beugeKette(hand, kette, [0, ...f]); // Mittelhandknochen bleibt
  });
  beugeKette(hand, DAUMEN, d);
}

// ---------- Holztisch: Bretter mit Maserung, im Programm gezeichnet (keine Bilddatei) ----------
// Nahtlos: Alle Wellen haben eine ganze Zahl an Schwingungen über die Bildbreite, die Bretter teilen die Höhe
// ohne Rest – so passen die Kanten beim Wiederholen genau aneinander.
function holzTextur() {
  const W = 1024, H = 1024, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  let seed = 11;
  const zufall = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const BRETTER = 4, brett = H / BRETTER;
  const toene = [[206, 158, 108], [199, 150, 100], [210, 164, 114], [202, 154, 104]];
  const welle = (x, k, ph) => Math.sin((x / W) * Math.PI * 2 * k + ph);
  for (let b = 0; b < BRETTER; b++) {
    const y0 = b * brett, [r, gg, bb] = toene[b];
    // Grundton mit sanften, nahtlosen Hell-Dunkel-Verläufen entlang des Bretts
    for (let x = 0; x < W; x += 4) {
      const v = 1 + 0.035 * welle(x, 1, b * 1.7) + 0.02 * welle(x, 3, b);
      g.fillStyle = `rgb(${r * v | 0}, ${gg * v | 0}, ${bb * v | 0})`;
      g.fillRect(x, y0, 4, brett);
    }
    // Maserung: feine, weiche, leicht gewellte Linien
    for (let l = 0; l < 34; l++) {
      const y = y0 + 6 + zufall() * (brett - 12), amp = 2 + zufall() * 6, k = 1 + Math.floor(zufall() * 3), ph = zufall() * 6;
      g.strokeStyle = `rgba(120, 75, 40, ${0.04 + zufall() * 0.07})`;
      g.lineWidth = 1.5 + zufall() * 3;
      g.beginPath();
      for (let x = 0; x <= W; x += 8) { const yy = y + welle(x, k, ph) * amp; if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
      g.stroke();
    }
    // Fuge: weicher Schattenverlauf statt harter Linie
    const fuge = g.createLinearGradient(0, y0 - 5, 0, y0 + 7);
    fuge.addColorStop(0, 'rgba(90,55,25,0)'); fuge.addColorStop(0.45, 'rgba(90,55,25,0.22)'); fuge.addColorStop(1, 'rgba(90,55,25,0)');
    g.fillStyle = fuge; g.fillRect(0, y0 - 5, W, 12);
  }
  // obere Fuge auch unten zeichnen (nahtlos in der Höhe)
  const fuge = g.createLinearGradient(0, H - 5, 0, H);
  fuge.addColorStop(0, 'rgba(90,55,25,0)'); fuge.addColorStop(1, 'rgba(90,55,25,0.12)');
  g.fillStyle = fuge; g.fillRect(0, H - 5, W, 5);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace; t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(5, 6); t.anisotropy = 8;
  return t;
}

// ---------- Zahlenkarte: weiße Karte mit der Zahl, liegt vorne auf dem Tisch ----------
function zeichneKarte(canvas, n) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  const r = 46;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(r, 0); g.arcTo(W, 0, W, H, r); g.arcTo(W, H, 0, H, r); g.arcTo(0, H, 0, 0, r); g.arcTo(0, 0, W, 0, r); g.closePath(); g.fill();
  g.strokeStyle = '#1e1b4b'; g.lineWidth = 14; g.stroke();
  g.fillStyle = '#1e1b4b';
  g.font = `700 ${n >= 10 ? 260 : 300}px "Fuenfer Fredoka", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), W / 2, H / 2 + 18);
}
function baueKarte() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 384;
  const tex = new CanvasTexture(canvas); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 8;
  const karte = new Group();
  const unterseite = new Mesh(new RoundedBoxGeometry(3.3, 0.08, 2.5, 2, 0.04), new MeshStandardMaterial({ color: '#e7e5e4', roughness: 0.9 }));
  unterseite.castShadow = true; unterseite.receiveShadow = true; karte.add(unterseite);
  const oben = new Mesh(new PlaneGeometry(3.3, 2.5), new MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85 }));
  oben.rotation.x = -Math.PI / 2; oben.position.y = 0.045; karte.add(oben);
  karte.rotation.y = -0.04; // leicht schräg hingelegt
  return { karte, canvas, tex };
}

// ---------- Ein Steckwürfel ----------
function baueWuerfel(mat, noppeMat) {
  const g = new Group();
  const k = new Mesh(new RoundedBoxGeometry(C * 0.94, C * 0.94, C * 0.94, 3, 0.09), mat);
  k.castShadow = true; k.receiveShadow = true; g.add(k);
  const noppe = new Mesh(new CylinderGeometry(0.2, 0.2, 0.18, 20), noppeMat);
  noppe.position.y = C * 0.47 + 0.08; g.add(noppe);
  return g;
}

// ---------- Die Szene ----------
export function erzeugeZerlegeSzene(container, { modellPfad = 'modelle/' } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });

  const scene = new Scene();
  const camera = new PerspectiveCamera(26, 2, 0.1, 200);
  scene.add(new HemisphereLight('#ffffff', '#c9b8a0', 1.3));
  const sonne = new DirectionalLight('#ffffff', 1.8);
  sonne.position.set(4, 14, 9); sonne.castShadow = true;
  sonne.shadow.mapSize.set(1024, 1024);
  Object.assign(sonne.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10, near: 1, far: 40 });
  scene.add(sonne);
  scene.background = new Color('#eadcc5');
  // Der Tisch läuft nach hinten weich in den Hintergrund aus – keine harte Tischkante
  scene.fog = new Fog('#eadcc5', 34, 70);

  const wMat = new MeshStandardMaterial({ color: GRUEN, roughness: 0.42 });
  const nMat = new MeshStandardMaterial({ color: '#15803d', roughness: 0.42 });

  const loader = new GLTFLoader();
  const lade = (datei) => new Promise((ok, fehler) => loader.load(modellPfad + datei, ok, undefined, fehler));
  const bereit = Promise.all([lade('hand-links.glb'), lade('hand-rechts.glb')]);

  let links = null, rechts = null, wuerfel = [], zustand = null, laeuft = 0, raf = 0;

  const render = () => renderer.render(scene, camera);
  const groesse = () => {
    const w = container.clientWidth || 600, h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const breite = 18.5;
    const vFov = MathUtils.degToRad(camera.fov);
    const dist = Math.max(15, (breite / 2) / (Math.tan(vFov / 2) * camera.aspect)) + 2;
    camera.position.set(0, dist * 0.42, dist);
    camera.lookAt(0, -0.2, 2.2);
    camera.updateProjectionMatrix();
    render();
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(groesse) : null;
  if (ro) ro.observe(container);

  const animiere = (dauer, schritt) => new Promise((fertig) => {
    const t0 = performance.now();
    laeuft++;
    const tick = (jetzt) => {
      const t = Math.min(1, (jetzt - t0) / dauer);
      schritt(ease(t));
      render();
      if (t < 1) raf = requestAnimationFrame(tick); else { laeuft--; fertig(); }
    };
    raf = requestAnimationFrame(tick);
  });

  const lage = (z, getrennt) => {
    const { n, a } = z;
    const gap = getrennt ? 3.4 : 0;
    const xs = [];
    for (let i = 0; i < n; i++) xs.push((i - (n - 1) / 2) * C + (i < a ? -gap / 2 : gap / 2));
    const mitte = (von, bis) => (bis > von ? (xs[von] + xs[bis - 1]) / 2 : null);
    let ml = mitte(0, a), mr = mitte(a, n);
    if (ml == null) ml = (xs[0] ?? 0) - 2.8 - gap / 2;
    if (mr == null) mr = (xs[n - 1] ?? 0) + 2.8 + gap / 2;
    // Hände etwas nach außen rücken: Der Daumen zeigt nach außen und liegt so weniger unter den Würfeln
    ml -= 0.7; mr += 0.7;
    if (mr - ml < 4.6) { const m = (ml + mr) / 2; ml = m - 2.3; mr = m + 2.3; }
    return { xs, ml, mr };
  };
  const haufenPos = (i, k, mitte, basis = HAND_Y + 1.0) => {
    const proReihe = Math.min(5, Math.max(1, k)), s = 0.36;
    const col = i % proReihe, row = Math.floor(i / proReihe);
    return { x: mitte + (col - (proReihe - 1) / 2) * s * 1.05, y: basis + s / 2 + row * s * 1.02, z: WUERFEL_Z, s };
  };

  // Hände und Würfel liegen in einer gemeinsamen Gruppe, die leicht zur Kamera gekippt ist –
  // so sieht man besser auf die Handflächen.
  const welt = new Group(); welt.rotation.x = 0.38; welt.position.y = -0.4; scene.add(welt);
  // Holztisch unter den Händen (kippt mit, die Hände werfen Schatten darauf)
  const tisch = new Mesh(new PlaneGeometry(120, 140), new MeshStandardMaterial({ map: holzTextur(), roughness: 0.8, metalness: 0 }));
  tisch.rotation.x = -Math.PI / 2; tisch.position.set(0, -2.1, -40); tisch.receiveShadow = true; welt.add(tisch);
  // Zahlenkarte vorne mittig auf dem Tisch
  const karte = baueKarte();
  karte.karte.position.set(0, -2.06, 4.55); welt.add(karte.karte);
  const zeigeZahl = (n) => {
    const male = () => { zeichneKarte(karte.canvas, n); karte.tex.needsUpdate = true; render(); };
    male();
    if (document.fonts && document.fonts.load) document.fonts.load('700 100px "Fuenfer Fredoka"').then(male).catch(() => {});
  };

  // Wie hoch liegt die Handfläche unter einem Punkt? Strahl von oben auf die Hand(oberfläche).
  const strahl = new Raycaster();
  const hoeheBei = (x, zLok, haende) => {
    welt.updateMatrixWorld(true);
    const o = welt.localToWorld(new Vector3(x, 8, zLok));
    strahl.set(o, new Vector3(0, -1, 0).applyQuaternion(welt.quaternion));
    let best = null;
    haende.forEach((h) => {
      h.mesh.boundingSphere = null; // Pose hat sich geändert – Hülle neu berechnen lassen
      const hit = strahl.intersectObject(h.mesh, false)[0];
      if (hit) { const y = welt.worldToLocal(hit.point.clone()).y; if (best == null || y > best) best = y; }
    });
    return best;
  };
  // Eine Reihe Würfel liegt gerade auf dem höchsten Punkt der Hände darunter (nichts versinkt)
  // Die Stange liegt auf dem höchsten Punkt der Hand(fläche) unter den Würfeln – liegt dort der Daumen,
  // liegt sie eben auf dem Daumen auf, aber nichts geht durch die Würfel hindurch.
  const liegeHoehe = (xsTeil, haende) => {
    let max = null;
    xsTeil.forEach(x => [-0.45, -0.22, 0, 0.22, 0.45].forEach(dz => [-0.45, -0.22, 0, 0.22, 0.45].forEach((dx) => {
      const y = hoeheBei(x + dx, WUERFEL_Z + dz, haende);
      if (y != null && (max == null || y > max)) max = y;
    })));
    return max == null ? WUERFEL_Y : max + C * 0.47 + 0.04;
  };
  const teile = (z, xs) => ({ l: xs.slice(0, z.a), r: xs.slice(z.a) });

  async function setze(z) {
    const [gl, gr] = await bereit;
    zustand = { ...z };
    if (links) welt.remove(links.root);
    if (rechts) welt.remove(rechts.root);
    wuerfel.forEach(w => welt.remove(w));
    // jede Hand bekommt ihr eigenes Modell (Kopie mit eigenen Knochen)
    // Person gegenüber: von uns aus links liegt ihre rechte Hand
    links = bereiteHandVor({ scene: klone(gr.scene) }, z.haut || HAUT[0], 'l');
    rechts = bereiteHandVor({ scene: klone(gl.scene) }, z.haut || HAUT[0], 'r');
    welt.add(links.root, rechts.root);
    wuerfel = [...Array(z.n)].map(() => { const w = baueWuerfel(wMat, nMat); welt.add(w); return w; });
    const { xs } = lage(z, false);
    const ende = (z.n * C) / 2;
    links.root.position.set(Math.min(-ende + 1.4, -2.3), HAND_Y, 0);
    rechts.root.position.set(Math.max(ende - 1.4, 2.3), HAND_Y, 0);
    setzeKruemmung(links, 0.3); setzeKruemmung(rechts, 0.3);
    const y = liegeHoehe(xs, [links, rechts]);
    wuerfel.forEach((w, i) => { w.position.set(xs[i], y, WUERFEL_Z); w.scale.setScalar(1); w.visible = true; });
    zustand.yStart = y;
    zeigeZahl(z.n);
    groesse();
  }

  // Höhen der beiden Teile, wenn die Hände auseinandergezogen sind (Haltepose)
  const zielHoehen = (z, ziel) => {
    const lx = links.root.position.x, rx = rechts.root.position.x, lk = links.k, rk = rechts.k;
    links.root.position.x = ziel.ml; rechts.root.position.x = ziel.mr;
    setzeKruemmung(links, 0.45); setzeKruemmung(rechts, 0.45);
    const t = teile(z, ziel.xs);
    const h = { l: liegeHoehe(t.l, [links]), r: liegeHoehe(t.r, [rechts]) };
    links.root.position.x = lx; rechts.root.position.x = rx; setzeKruemmung(links, lk); setzeKruemmung(rechts, rk);
    return h;
  };
  // Mitte der Handfläche (für die Würfel, die in der Hand verschwinden)
  const haufenBasis = (hand, mitte) => { const y = hoeheBei(mitte, WUERFEL_Z, [hand]); return y == null ? HAND_Y + 1.0 : y + 0.2; };

  function setzeGeschlossen() {
    const z = zustand;
    const ziel = lage(z, true);
    const h = zielHoehen(z, ziel);
    links.root.position.x = ziel.ml; rechts.root.position.x = ziel.mr;
    const [von, bis] = z.leer === 'l' ? [0, z.a] : [z.a, z.n];
    wuerfel.forEach((w, i) => { if (i >= von && i < bis) w.visible = false; else w.position.set(ziel.xs[i], i < z.a ? h.l : h.r, WUERFEL_Z); });
    setzeKruemmung(z.leer === 'l' ? links : rechts, 1); setzeKruemmung(z.leer === 'l' ? rechts : links, 0.45);
    zustand.h = h;
    render();
  }

  async function abspielen() {
    const z = zustand;
    const start = lage(z, false), ziel = lage(z, true);
    const h = zielHoehen(z, ziel); zustand.h = h;
    const l0 = links.root.position.x, r0 = rechts.root.position.x;
    await animiere(500, t => { setzeKruemmung(links, lerp(0.3, 0.45, t)); setzeKruemmung(rechts, lerp(0.3, 0.45, t)); });
    await animiere(900, t => {
      links.root.position.x = lerp(l0, ziel.ml, t);
      rechts.root.position.x = lerp(r0, ziel.mr, t);
      wuerfel.forEach((w, i) => { w.position.x = lerp(start.xs[i], ziel.xs[i], t); w.position.y = lerp(z.yStart, i < z.a ? h.l : h.r, t); });
    });
    await new Promise(r => setTimeout(r, 350));
    const zuHand = z.leer === 'l' ? links : rechts;
    const mitte = z.leer === 'l' ? ziel.ml : ziel.mr;
    const [von, bis] = z.leer === 'l' ? [0, z.a] : [z.a, z.n];
    const k = bis - von;
    const basis = haufenBasis(zuHand, mitte);
    const vorher = wuerfel.map(w => w.position.clone());
    await animiere(700, t => {
      for (let i = von; i < bis; i++) {
        const p = haufenPos(i - von, k, mitte, basis), v = vorher[i];
        wuerfel[i].position.set(lerp(v.x, p.x, t), lerp(v.y, p.y, t), lerp(v.z, p.z, t));
        wuerfel[i].scale.setScalar(lerp(1, p.s, t));
      }
    });
    await animiere(800, t => setzeKruemmung(zuHand, lerp(0.45, 1, t)));
    for (let i = von; i < bis; i++) wuerfel[i].visible = false;
    render();
  }

  async function oeffnen() {
    const z = zustand;
    const ziel = lage(z, true);
    const zuHand = z.leer === 'l' ? links : rechts;
    const mitte = z.leer === 'l' ? ziel.ml : ziel.mr;
    const [von, bis] = z.leer === 'l' ? [0, z.a] : [z.a, z.n];
    const k = bis - von;
    const hZiel = (zustand.h || {})[z.leer] ?? WUERFEL_Y;
    setzeKruemmung(zuHand, 0.45);
    const basis = haufenBasis(zuHand, mitte);
    setzeKruemmung(zuHand, 1);
    for (let i = von; i < bis; i++) { const p = haufenPos(i - von, k, mitte, basis); wuerfel[i].visible = true; wuerfel[i].position.set(p.x, p.y, p.z); wuerfel[i].scale.setScalar(p.s); }
    await animiere(650, t => setzeKruemmung(zuHand, lerp(1, 0.45, t)));
    await animiere(650, t => {
      for (let i = von; i < bis; i++) {
        const p = haufenPos(i - von, k, mitte, basis);
        wuerfel[i].position.set(lerp(p.x, ziel.xs[i], t), lerp(p.y, hZiel, t), lerp(p.z, WUERFEL_Z, t));
        wuerfel[i].scale.setScalar(lerp(p.s, 1, t));
      }
    });
  }

  // Tauschaufgabe: Die Teile heben sich von den Händen, rücken zur Stange zusammen, die Stange dreht sich
  // einmal um die senkrechte Achse (aus a | b wird b | a) und legt sich wieder auf die Hände.
  async function tauschen() {
    const z = zustand;
    if (!z || z.a === z.b) return;
    const neuZ = { ...z, a: z.b, b: z.a };
    const neu = lage(neuZ, true);
    const hNeu = zielHoehen(neuZ, neu);
    const hAlt = z.h || { l: WUERFEL_Y, r: WUERFEL_Y };
    const hebeY = Math.max(hAlt.l, hAlt.r, hNeu.l, hNeu.r) + 1.6;
    const mx = wuerfel.map((_, i) => (i - (z.n - 1) / 2) * C + (i < z.a ? -0.35 : 0.35));
    wuerfel.forEach((w) => { w.visible = true; w.scale.setScalar(1); });
    const s1 = wuerfel.map(w => w.position.clone());
    await animiere(750, t => wuerfel.forEach((w, i) => w.position.set(lerp(s1[i].x, mx[i], t), lerp(s1[i].y, hebeY, t), lerp(s1[i].z, WUERFEL_Z, t))));
    await animiere(1200, (t) => {
      const th = Math.PI * t;
      wuerfel.forEach((w, i) => { w.position.x = mx[i] * Math.cos(th); w.position.z = WUERFEL_Z - mx[i] * Math.sin(th); w.rotation.y = th; });
    });
    // Reihenfolge von links nach rechts ist jetzt umgekehrt
    wuerfel.reverse();
    wuerfel.forEach((w) => { w.rotation.y = 0; });
    const s2 = wuerfel.map(w => w.position.clone());
    const l0 = links.root.position.x, r0 = rechts.root.position.x;
    await animiere(850, (t) => {
      links.root.position.x = lerp(l0, neu.ml, t);
      rechts.root.position.x = lerp(r0, neu.mr, t);
      wuerfel.forEach((w, i) => w.position.set(lerp(s2[i].x, neu.xs[i], t), lerp(s2[i].y, i < neuZ.a ? hNeu.l : hNeu.r, t), lerp(s2[i].z, WUERFEL_Z, t)));
    });
    zustand = { ...neuZ, h: hNeu, yStart: z.yStart };
  }

  function aufraeumen() {
    cancelAnimationFrame(raf);
    if (ro) ro.disconnect();
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  // Standbild der aktuellen Szene als PNG (für Menü-Bilder), optional ohne Zahlenkarte
  function foto(breite = 480, hoehe = 300, mitKarte = false) {
    const alt = { w: container.clientWidth, h: container.clientHeight };
    karte.karte.visible = mitKarte;
    renderer.setSize(breite, hoehe, false);
    camera.aspect = breite / hoehe; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    karte.karte.visible = true;
    renderer.setSize(alt.w || breite, alt.h || hoehe, false);
    groesse();
    return url;
  }

  // Nur zum Ausprobieren (Probeseite): Kamera nah an eine Hand ('l' | 'r'), Blick von vorne-oben oder von der Seite
  function nah(seite = 'r', winkel = 0, hoehe = 0.5) {
    const h = seite === 'l' ? links : rechts; if (!h) return;
    welt.updateMatrixWorld(true);
    const ziel = h.root.getWorldPosition(new Vector3());
    camera.position.set(ziel.x + Math.sin(winkel) * 9, ziel.y + 9 * hoehe + 1, ziel.z + Math.cos(winkel) * 9);
    camera.lookAt(ziel.x, ziel.y + 0.5, ziel.z);
    render();
  }
  return { setze, setzeGeschlossen, abspielen, oeffnen, tauschen, foto, aufraeumen, beschaeftigt: () => laeuft > 0, bereit, nah, normal: groesse, neuZeichnen: (k, seite) => { const h = seite === 'l' ? links : rechts; setzeKruemmung(h, k); render(); } };
}
