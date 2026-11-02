// FITWEARMX Studio · sombra + prenda (pose con IA, silueta negra con luz de contorno).
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

// ---------- sombra + prenda: la persona queda negra con luz de contorno y la prenda sigue sus hombros ----------
// Usa MediaPipe (IA de Google que corre en el navegador, gratis): detecta el cuerpo y su silueta.
let pose = null, poseCargando = false;
async function cargarPose() {
  if (pose || poseCargando) return;
  poseCargando = true;
  $('aviso').textContent = 'Cargando la IA que detecta el cuerpo (sólo la primera vez)…';
  try {
    const { FilesetResolver, PoseLandmarker } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
    const fs = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    const opciones = d => ({ baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task', delegate: d },
      runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: true });
    try { pose = await PoseLandmarker.createFromOptions(fs, opciones('GPU')); } catch (e) { pose = await PoseLandmarker.createFromOptions(fs, opciones('CPU')); }
    $('aviso').textContent = '👤 Listo: la IA ya detecta el cuerpo.';
  } catch (e) { $('aviso').textContent = 'No pude cargar la IA del cuerpo: ' + e.message; }
  poseCargando = false;
  render(tAct);
}
const SOMBRAS = new Map();   // id del bloque -> { t, sil, lm }
let tPose = 0;
function analizar(c, el) {
  let s = SOMBRAS.get(c.id);
  if (!s) { s = { t: -1, sil: document.createElement('canvas'), lm: null }; SOMBRAS.set(c.id, s); }
  if (!pose || Math.abs(s.t - el.currentTime) < 0.001) return s;
  s.t = el.currentTime;
  tPose = Math.max(tPose + 1, performance.now());
  let r;
  try { r = pose.detectForVideo(el, tPose); } catch (e) { return s; }
  const m = r.segmentationMasks && r.segmentationMasks[0];
  // si en este cuadro no encuentra a la persona, se queda con la última sombra buena (no enseña el video original)
  if (!(m && r.landmarks && r.landmarks[0])) { if (m) m.close(); return s; }
  s.hay = true;
  if (m) {
    const w = m.width, h = m.height, conf = m.getAsFloat32Array();
    if (s.sil.width !== w || s.sil.height !== h) { s.sil.width = w; s.sil.height = h; }
    const sc = s.sil.getContext('2d'), img = sc.createImageData(w, h), d = img.data;
    for (let i = 0; i < conf.length; i++) d[i * 4 + 3] = conf[i] > 0.35 ? Math.min(255, conf[i] * 300) : 0;
    sc.putImageData(img, 0, 0);
    if (c.detalle > 0) {       // un poquito del cuerpo real, gris y oscuro, adentro de la sombra
      sc.save(); sc.globalCompositeOperation = 'source-atop'; sc.globalAlpha = c.detalle;
      sc.filter = 'grayscale(1) brightness(.55) contrast(1.5)'; sc.drawImage(el, 0, 0, w, h); sc.restore();
    }
    m.close();
  }
  const lm = r.landmarks && r.landmarks[0];
  if (lm) {
    const pts = [11, 12, 23, 24].map(i => lm[i]);
    if (!s.lm) s.lm = pts.map(p => ({ x: p.x, y: p.y }));
    else s.lm.forEach((q, i) => { q.x = q.x * 0.55 + pts[i].x * 0.45; q.y = q.y * 0.55 + pts[i].y * 0.45; });   // suaviza el temblor
  }
  return s;
}
function dibSombra(c, lt) {
  const a = alfa(c, lt);
  const el = fuenteDe(c);
  if (!el) { if (!medios[c.src]) { ctx.save(); ctx.globalAlpha = a; relleno(0, 0, W, H, c.nota || 'Sube un video de alguien moviéndose'); ctx.restore(); } return; }
  if (!pose) cargarPose();
  const vw = el.videoWidth, vh = el.videoHeight;
  const z = lerp(c.zoomIni, c.zoomFin, eInOut(clamp(lt / c.dur)));
  const s = Math.max(W / vw, H / vh) * z, dw = vw * s, dh = vh * s, dx = (W - dw) / 2, dy = (H - dh) / 2;
  ctx.save(); ctx.globalAlpha = a;
  if (!pose) { ctx.filter = 'brightness(.25) grayscale(1)'; ctx.drawImage(el, dx, dy, dw, dh); ctx.restore(); return; }
  const r = analizar(c, el);
  if (!r.hay) {            // en esta toma no se ve a nadie: el video oscuro y gris, para que no quede vacío
    ctx.restore(); return;
  }
  if (r.sil.width) {
    ctx.shadowColor = c.luz; ctx.shadowBlur = 45;
    ctx.drawImage(r.sil, dx, dy, dw, dh);
    ctx.shadowBlur = 18; ctx.drawImage(r.sil, dx, dy, dw, dh);
    ctx.shadowColor = 'transparent';
  }
  const pr = medios[c.prenda];
  if (r.lm && pr && pr.img && pr.img.naturalWidth) {
    const P2 = q => ({ x: dx + q.x * dw, y: dy + q.y * dh });
    const [L, R, LH, RH] = r.lm.map(P2);
    const hom = Math.hypot(L.x - R.x, L.y - R.y);
    const cuello = { x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 }, cadera = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 };
    const torso = Math.hypot(cadera.x - cuello.x, cadera.y - cuello.y);
    const ang = Math.atan2(L.y - R.y, L.x - R.x);
    const ancho = hom * c.anchoPrenda, alto = ancho * pr.img.naturalHeight / pr.img.naturalWidth;
    ctx.save();
    ctx.translate(cuello.x, cuello.y);
    ctx.rotate(Math.abs(ang) > Math.PI / 2 ? ang - Math.sign(ang) * Math.PI : ang);
    ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 30;
    ctx.drawImage(pr.img, -ancho / 2, -alto * 0.1 - torso * c.subirPrenda, ancho, alto);
    ctx.restore();
  }
  ctx.restore();
}

// Silueta de persona de frente (cabeza, cuello, brazos y piernas) que "lleva puesta" la prenda.
// Se dibuja aparte, se desvanece hacia abajo y brilla con la luz del contorno.
const lienzoCuerpo = document.createElement('canvas');
function cuerpoSombra(w, h, luz) {
  const top = -h / 2, cw = Math.ceil(w * 1.3), ch = Math.ceil(h + w * 1.6), ox = cw / 2, oy = w * 0.42;
  if (lienzoCuerpo.width !== cw || lienzoCuerpo.height !== ch) { lienzoCuerpo.width = cw; lienzoCuerpo.height = ch; }
  const k = lienzoCuerpo.getContext('2d');
  k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, cw, ch);
  k.translate(ox, oy - top);
  k.fillStyle = k.strokeStyle = '#040404'; k.lineCap = 'round'; k.lineJoin = 'round';
  // cabeza y cuello
  k.beginPath(); k.ellipse(0, top - w * 0.17, w * 0.105, w * 0.135, 0, 0, Math.PI * 2); k.fill();
  k.beginPath(); k.roundRect(-w * 0.07, top - w * 0.08, w * 0.14, h * 0.12, w * 0.04); k.fill();
  // hombros y torso (debajo de la playera)
  k.beginPath(); k.moveTo(-w * 0.36, top + h * 0.1); k.quadraticCurveTo(-w * 0.2, top - w * 0.02, 0, top - w * 0.01);
  k.quadraticCurveTo(w * 0.2, top - w * 0.02, w * 0.36, top + h * 0.1); k.lineTo(w * 0.3, h / 2 + w * 0.35); k.lineTo(-w * 0.3, h / 2 + w * 0.35); k.closePath(); k.fill();
  // brazos: salen de las mangas y bajan a los lados
  k.lineWidth = w * 0.115;
  for (const sg of [-1, 1]) {
    k.beginPath(); k.moveTo(sg * w * 0.4, top + h * 0.28); k.quadraticCurveTo(sg * w * 0.47, h * 0.15, sg * w * 0.43, h / 2 + w * 0.22); k.stroke();
    k.beginPath(); k.ellipse(sg * w * 0.43, h / 2 + w * 0.27, w * 0.05, w * 0.07, 0, 0, Math.PI * 2); k.fill();
  }
  // piernas
  k.lineWidth = w * 0.17;
  for (const sg of [-1, 1]) { k.beginPath(); k.moveTo(sg * w * 0.14, h / 2 + w * 0.3); k.lineTo(sg * w * 0.16, h / 2 + w * 1.15); k.stroke(); }
  // se desvanece hacia abajo
  k.setTransform(1, 0, 0, 1, 0, 0);
  const g = k.createLinearGradient(0, ch * 0.55, 0, ch);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  k.globalCompositeOperation = 'destination-in'; k.fillStyle = g; k.fillRect(0, 0, cw, ch);
  k.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.shadowColor = luz || '#7c3aed'; ctx.shadowBlur = 50;
  ctx.drawImage(lienzoCuerpo, -ox, top - oy);
  ctx.shadowBlur = 16; ctx.drawImage(lienzoCuerpo, -ox, top - oy);
  ctx.restore();
}

// Mapa 3D nocturno estilo comercial de Amazon: edificios con volumen, calles azules que brillan,
// ruta dorada que avanza con la cámara siguiéndola, pin y tarjeta de seguimiento.
