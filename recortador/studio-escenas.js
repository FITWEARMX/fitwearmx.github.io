// FITWEARMX Studio · escenas (mapa, caja, marcas, puerta, explica), acabado de cine y render.
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

const EDIFICIOS = (() => {
  const out = []; let r = 7;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let cx = -7; cx < 7; cx++) for (let cz = 0; cz < 16; cz++) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const x0 = cx + 0.12 + rnd() * 0.35, z0 = cz + 0.12 + rnd() * 0.35;
      out.push({ x0, z0, x1: Math.min(cx + 0.88, x0 + 0.2 + rnd() * 0.45), z1: Math.min(cz + 0.88, z0 + 0.2 + rnd() * 0.45), h: 0.06 + rnd() * rnd() * 0.55 });
    }
  }
  return out.sort((a, b) => b.z0 - a.z0);
})();
function dibMapa(c, lt) {
  const a = alfa(c, lt);
  const ruta = [[-1.5, 1], [-1.5, 3.5], [0, 3.5], [0, 6.5], [1.5, 6.5], [1.5, 9.5]];
  const lens = ruta.slice(1).map((p, i) => Math.hypot(p[0] - ruta[i][0], p[1] - ruta[i][1])), total = lens.reduce((x, y) => x + y, 0);
  const prog = eInOut(clamp((lt - 0.25) / (c.dur * 0.7)));
  let falta = total * prog;
  const pts = [ruta[0]];
  for (let i = 1; i < ruta.length && falta > 0; i++) {
    const k = Math.min(1, falta / lens[i - 1]), [x0, z0] = ruta[i - 1], [x1, z1] = ruta[i];
    pts.push([x0 + (x1 - x0) * k, z0 + (z1 - z0) * k]); falta -= lens[i - 1];
  }
  const [hx, hz] = pts[pts.length - 1];
  // la cámara sigue la punta de la ruta, suave
  const camX = Math.sin(lt * 0.35) * 0.9, camZ = -5 + eInOut(clamp(lt / c.dur)) * 1.2, F = 820, camH = 8.5, hor = 330;   // vista desde arriba, de lado (tercera persona)
  const P = (x, y, z) => { const zz = z - camZ; return zz < 0.3 ? null : { x: W / 2 + (x - camX) * F / zz, y: hor + (camH - y) * F / zz }; };
  ctx.save(); ctx.globalAlpha = a;
  const fondo = ctx.createLinearGradient(0, 0, 0, H);
  fondo.addColorStop(0, '#05070c'); fondo.addColorStop(0.3, '#0b1424'); fondo.addColorStop(1, '#04060b');
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H);
  // calles
  ctx.save();
  ctx.strokeStyle = 'rgba(90,180,255,.45)'; ctx.lineWidth = 2.2; ctx.shadowColor = '#3b9cff'; ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let x = -7; x <= 7; x++) { const p = P(x, 0, camZ + 0.4), q = P(x, 0, camZ + 16); if (p && q) { ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); } }
  for (let z = Math.ceil(camZ + 0.4); z <= camZ + 16; z++) { const p = P(-7, 0, z), q = P(7, 0, z); if (p && q) { ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); } }
  ctx.stroke(); ctx.restore();
  // edificios (de atrás hacia adelante)
  for (const b of EDIFICIOS) {
    if (b.z1 < camZ + 0.5 || b.z0 > camZ + 16) continue;
    const q = (x, y, z) => P(x, y, z);
    const f0 = q(b.x0, 0, b.z0), f1 = q(b.x1, 0, b.z0), f2 = q(b.x1, b.h, b.z0), f3 = q(b.x0, b.h, b.z0);
    const t0 = q(b.x0, b.h, b.z1), t1 = q(b.x1, b.h, b.z1);
    if (!f0 || !f1 || !f2 || !f3 || !t0 || !t1) continue;
    const cerca = Math.hypot((b.x0 + b.x1) / 2 - hx, (b.z0 + b.z1) / 2 - hz), luz = clamp(1 - cerca / 1.3) * 0.6;
    // lado que ve la cámara
    const ladoX = (b.x0 + b.x1) / 2 > camX ? b.x0 : b.x1;
    const s0 = q(ladoX, 0, b.z0), s1 = q(ladoX, 0, b.z1), s2 = q(ladoX, b.h, b.z1), s3 = q(ladoX, b.h, b.z0);
    if (s0 && s1 && s2 && s3) { ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.lineTo(s3.x, s3.y); ctx.closePath(); ctx.fillStyle = '#0b1019'; ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(f0.x, f0.y); ctx.lineTo(f1.x, f1.y); ctx.lineTo(f2.x, f2.y); ctx.lineTo(f3.x, f3.y); ctx.closePath();
    ctx.fillStyle = luz > 0 ? `rgb(${20 + luz * 90},${26 + luz * 50},${38})` : '#141b28'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(f3.x, f3.y); ctx.lineTo(f2.x, f2.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t0.x, t0.y); ctx.closePath();
    ctx.fillStyle = luz > 0 ? `rgb(${30 + luz * 140},${38 + luz * 80},${52})` : '#1d2637'; ctx.fill();
    ctx.strokeStyle = 'rgba(140,190,255,.12)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // ruta dorada (encima de los edificios para que siempre se vea)
  const linea = (ancho, blur, color) => {
    ctx.beginPath(); let ok = false;
    for (const [x, z] of pts) { const p = P(x, 0.01, z); if (!p) continue; ok ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); ok = true; }
    ctx.lineWidth = ancho; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.shadowColor = c.color; ctx.shadowBlur = blur; ctx.stroke();
  };
  linea(30, 70, hexA(c.color, 0.3)); linea(13, 35, c.color); linea(4, 0, '#fffbeb');
  ctx.shadowBlur = 0;
  // niebla al horizonte
  const niebla = ctx.createLinearGradient(0, hor - 40, 0, hor + 420);
  niebla.addColorStop(0, '#0b1424'); niebla.addColorStop(1, 'rgba(11,20,36,0)');
  ctx.fillStyle = niebla; ctx.fillRect(0, 0, W, hor + 420);
  // pin en la punta de la ruta
  const pn = P(hx, 0, hz);
  if (pn) {
    const sal = Math.sin(lt * 6) * 6;
    ctx.save(); ctx.translate(pn.x, pn.y - 70 + sal);
    ctx.shadowColor = c.color; ctx.shadowBlur = 50; ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.arc(0, 0, 34, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(0, 62); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#fffbeb'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(pn.x, pn.y, 46 + sal, 14, 0, 0, Math.PI * 2); ctx.fillStyle = hexA(c.color, 0.35); ctx.fill();
  }
  // pines fijos: de dónde sale y a dónde llega
  const etiqueta = (x, z, txt, k) => {
    const p = P(x, 0, z); if (!p || k <= 0) return;
    ctx.save(); ctx.globalAlpha = a * k; ctx.font = `700 46px ${FUENTE}`; ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width + 44;
    ctx.beginPath(); ctx.roundRect(p.x - w / 2, p.y - 150, w, 70, 35); ctx.fillStyle = 'rgba(20,16,30,.85)'; ctx.fill();
    ctx.strokeStyle = hexA(c.color, 0.7); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, p.x, p.y - 100); ctx.restore();
  };
  etiqueta(ruta[0][0], ruta[0][1], c.origen, clamp(lt / 0.4));
  etiqueta(ruta[ruta.length - 1][0], ruta[ruta.length - 1][1], c.destino, clamp((prog - 0.85) / 0.15));
  // tarjeta de seguimiento (arriba)
  const pasos = String(c.pasos || '').split(',').map(x => x.trim()).filter(Boolean);
  if (pasos.length) {
    const tw = 900, th = 270, tx = (W - tw) / 2, ty = 170, kin = eOut(clamp((lt - 0.1) / 0.5));
    ctx.save(); ctx.globalAlpha = a * kin; ctx.translate(0, (1 - kin) * 40);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 34); ctx.fillStyle = 'rgba(28,30,36,.82)'; ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `700 54px ${FUENTE}`; ctx.fillText(c.titulo, tx + 44, ty + 78);
    ctx.fillStyle = '#a1a1aa'; ctx.font = `500 34px ${FUENTE}`; ctx.fillText(c.sub, tx + 44, ty + 124);
    const y = ty + 180, x0 = tx + 70, x1 = tx + tw - 70, paso = (x1 - x0) / (pasos.length - 1), lleno = x0 + (x1 - x0) * prog;
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.strokeStyle = c.color; ctx.shadowColor = c.color; ctx.shadowBlur = 16; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lleno, y); ctx.stroke(); ctx.shadowBlur = 0;
    pasos.forEach((p, i) => {
      const px = x0 + paso * i, hecho = px <= lleno + 1;
      ctx.beginPath(); ctx.arc(px, y, 13, 0, Math.PI * 2); ctx.fillStyle = hecho ? c.color : '#52525b'; ctx.fill();
      ctx.fillStyle = hecho ? '#e4e4e7' : '#71717a'; ctx.font = `600 26px ${FUENTE}`; ctx.textAlign = 'center'; ctx.fillText(p, px, y + 52);
    });
    ctx.restore();
  }
  ctx.restore();
}

// Caja 3D que gira despacio, con el logo en el frente y un anillo de luz alrededor.
function dibCaja(c, lt, t) {
  const a = alfa(c, lt), kin = eOut(clamp(lt / 0.7));
  const yaw = c.quieta ? -0.62 : -0.55 + lt * 0.45, pitch = c.quieta ? 0.22 : 0.32, S = 230 * c.tam * (0.85 + 0.15 * kin);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rot = ([x, y, z]) => { const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
  const pro = ([x, y, z]) => { const d = 5 / (5 + z); return { x: W / 2 + x * S * d, y: c.y + y * S * d * -1 + (1 - kin) * 120, z }; };
  const V = [[-1, -0.8, -1], [1, -0.8, -1], [1, 0.8, -1], [-1, 0.8, -1], [-1, -0.8, 1], [1, -0.8, 1], [1, 0.8, 1], [-1, 0.8, 1]].map(rot);
  const caras = [
    { v: [4, 5, 6, 7], n: [0, 0, 1] }, { v: [1, 0, 3, 2], n: [0, 0, -1], frente: true }, { v: [5, 1, 2, 6], n: [1, 0, 0] },
    { v: [0, 4, 7, 3], n: [-1, 0, 0] }, { v: [7, 6, 2, 3], n: [0, 1, 0] }, { v: [0, 1, 5, 4], n: [0, -1, 0] }];
  ctx.save(); ctx.globalAlpha = a * kin;
  // sombra en el piso
  ctx.beginPath(); ctx.ellipse(W / 2, c.y + S * 1.05, S * 1.5, S * 0.35, 0, 0, Math.PI * 2);
  const so = ctx.createRadialGradient(W / 2, c.y + S * 1.05, 0, W / 2, c.y + S * 1.05, S * 1.5);
  so.addColorStop(0, 'rgba(0,0,0,.7)'); so.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = so; ctx.fill();
  // anillo de luz (parte de atrás)
  const anillo = (desde, hasta) => {
    ctx.save(); ctx.strokeStyle = c.brillo; ctx.lineWidth = 9; ctx.shadowColor = c.brillo; ctx.shadowBlur = 40; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(W / 2, c.y + S * 0.55, S * 1.55, S * 0.42, -0.08, desde, hasta); ctx.stroke(); ctx.restore();
  };
  const giro = lt * 2.2;
  if (!c.quieta) anillo(Math.PI + giro, Math.PI * 1.9 + giro);
  const luz = rot([0.4, 0.7, 0.6]);
  const ordenadas = caras.map(f => ({ ...f, z: f.v.reduce((s, i) => s + V[i][2], 0) / 4, nn: rot(f.n) })).filter(f => f.nn[2] < 0.05 || true).sort((x, y) => y.z - x.z);
  for (const f of ordenadas) {
    if (f.nn[2] > 0.02) continue;                         // cara de atrás: no se ve
    const pts = f.v.map(i => pro(V[i]));
    const l = clamp(0.35 + 0.65 * Math.max(0, -(f.nn[0] * luz[0] + f.nn[1] * luz[1] + f.nn[2] * luz[2])) , 0, 1);
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    const base = c.color.replace('#', ''), r0 = parseInt(base.slice(0, 2), 16), g0 = parseInt(base.slice(2, 4), 16), b0 = parseInt(base.slice(4, 6), 16);
    ctx.fillStyle = `rgb(${Math.min(255, r0 + 34 * l)},${Math.min(255, g0 + 34 * l)},${Math.min(255, b0 + 40 * l)})`; ctx.fill();
    ctx.strokeStyle = hexA(c.brillo, 0.35); ctx.lineWidth = 2; ctx.stroke();
    const m = medios[c.src];
    if (f.frente && m && m.img && m.img.naturalWidth) {
      // logo pegado a la cara: esquina de arriba-izquierda, arriba-derecha y abajo-izquierda de la cara
      const lg = logoSinFondo(m), o = pro(V[3]), u = pro(V[2]), v = pro(V[0]);
      const k = 0.6, alto = k * (lg.height / lg.width) * (2 / 1.6);
      ctx.save();
      ctx.transform(u.x - o.x, u.y - o.y, v.x - o.x, v.y - o.y, o.x, o.y);   // ahora la cara mide 1 x 1
      ctx.globalAlpha = a * kin * 0.95; ctx.shadowColor = c.brillo; ctx.shadowBlur = 25;
      ctx.drawImage(lg, (1 - k) / 2, (1 - alto) / 2, k, alto);
      ctx.restore();
    }
  }
  if (!c.quieta) anillo(giro, Math.PI * 0.9 + giro);   // parte de enfrente del anillo
  ctx.restore();
}

// Look de cine: brillo en lo que brilla, tono cálido, viñeta y grano (como los comerciales de Amazon/Apple).
let lienzoBrillo = null, patronGrano = null;
function acabadoCine(t) {
  if (P.look === 'normal') return;
  if (P.clips.some(c => c.tipo === 'video' && medios[c.src] && c.cine !== 'si' && t >= c.ini && t < c.ini + c.dur && !oculta(c.pista))) return;   // video/foto real: limpio
  if (!lienzoBrillo) {
    lienzoBrillo = document.createElement('canvas'); lienzoBrillo.width = 270; lienzoBrillo.height = 480;
    const g = document.createElement('canvas'); g.width = g.height = 256;
    const gc = g.getContext('2d'), d = gc.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    gc.putImageData(d, 0, 0); patronGrano = ctx.createPattern(g, 'repeat');
  }
  const b = lienzoBrillo.getContext('2d');
  b.filter = 'blur(10px) brightness(1.15) contrast(1.4)'; b.clearRect(0, 0, 270, 480); b.drawImage(lienzo, 0, 0, 270, 480); b.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.32; ctx.drawImage(lienzoBrillo, 0, 0, W, H);
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.22; ctx.fillStyle = P.tono || '#8b5cf6'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07;
  ctx.translate((t * 997) % 256, (t * 613) % 256); ctx.fillStyle = patronGrano; ctx.fillRect(-256, -256, W + 512, H + 512);
  ctx.restore();
}

// Todas las marcas juntas en una pantalla: cada logo en su cajita, aparecen uno tras otro con brillo.
function dibMarcas(c, lt) {
  const nombres = String(c.logos || '').split(',').map(x => x.trim()).filter(n => medios[n] && medios[n].img && medios[n].img.naturalWidth);
  if (!nombres.length) return;
  const cols = Math.max(1, Math.round(c.columnas)), filas = Math.ceil(nombres.length / cols);
  const cw = 440 * c.tam, ch = 170 * c.tam, gx = 50 * c.tam, gy = 60 * c.tam;
  const altoTotal = filas * ch + (filas - 1) * gy;
  ctx.save();
  nombres.forEach((n, i) => {
    const fila = Math.floor(i / cols), enFila = Math.min(cols, nombres.length - fila * cols), col = i % cols;
    const anchoFila = enFila * cw + (enFila - 1) * gx;
    const cx = (W - anchoFila) / 2 + col * (cw + gx) + cw / 2, cy = c.y - altoTotal / 2 + fila * (ch + gy) + ch / 2;
    const k = eOut(clamp((lt - i * 0.12) / 0.5));
    if (k <= 0) return;
    const lg = logoSinFondo(medios[n]), s = Math.min(cw / lg.width, ch / lg.height), w = lg.width * s, h = lg.height * s;
    ctx.globalAlpha = alfa(c, lt) * k;
    ctx.filter = k < 1 ? `blur(${(1 - k) * 10}px)` : 'none';
    ctx.shadowColor = c.color; ctx.shadowBlur = 28;
    ctx.drawImage(lg, cx - w / 2, cy - h / 2 + (1 - k) * 30, w, h);
  });
  ctx.restore();
}

// La caja en la puerta de tu casa (como el comercial de Amazon): puerta, piso de madera, luz desde arriba y la caja con tu logo.
function dibPuerta(c, lt, t) {
  const a = alfa(c, lt), z = 1 + eInOut(clamp(lt / c.dur)) * 0.07;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(W / 2, H * 0.62); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.62);
  const piso = 1240;
  // pared
  const pared = ctx.createLinearGradient(0, 0, 0, piso);
  pared.addColorStop(0, '#0d0a12'); pared.addColorStop(1, '#1c1624');
  ctx.fillStyle = pared; ctx.fillRect(0, 0, W, piso);
  // puerta con marco
  const dx = 250, dw = 560, dy = 250, dh = piso - dy;
  ctx.fillStyle = '#2a2233'; ctx.fillRect(dx - 34, dy - 34, dw + 68, dh + 34);
  const pg = ctx.createLinearGradient(dx, 0, dx + dw, 0);
  pg.addColorStop(0, '#191320'); pg.addColorStop(1, '#241b2e');
  ctx.fillStyle = pg; ctx.fillRect(dx, dy, dw, dh);
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 4;
  ctx.strokeRect(dx + 60, dy + 70, dw - 120, dh * 0.38); ctx.strokeRect(dx + 60, dy + 120 + dh * 0.38, dw - 120, dh * 0.42);
  ctx.beginPath(); ctx.arc(dx + dw - 70, dy + dh * 0.55, 16, 0, Math.PI * 2); ctx.fillStyle = '#8b7aa0'; ctx.fill();
  // piso de madera en perspectiva
  ctx.fillStyle = '#17121c'; ctx.fillRect(0, piso, W, H - piso);
  ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 3;
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 40, piso); ctx.lineTo(W / 2 + i * 260, H); ctx.stroke(); }
  for (let k = 1; k < 8; k++) { const y = piso + (H - piso) * Math.pow(k / 8, 1.6); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // tapete
  ctx.beginPath(); ctx.moveTo(W / 2 - 330, piso + 40); ctx.lineTo(W / 2 + 330, piso + 40); ctx.lineTo(W / 2 + 420, piso + 230); ctx.lineTo(W / 2 - 420, piso + 230); ctx.closePath();
  ctx.fillStyle = '#211a29'; ctx.fill();
  // cono de luz desde arriba
  ctx.globalCompositeOperation = 'screen';
  const cono = ctx.createRadialGradient(W / 2, piso + 80, 0, W / 2, piso + 80, 700);
  cono.addColorStop(0, hexA(c.luz, 0.45)); cono.addColorStop(1, hexA(c.luz, 0));
  ctx.fillStyle = cono; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  // la caja, quieta, encima del tapete
  dibCaja({ ...c, quieta: true, tam: 0.78, y: piso + 150, brillo: c.luz, fadeIn: 0, fadeOut: 0, dur: c.dur }, lt, t);
}

// Tarjeta tipo iOS con un dibujo grande (emoji), título y explicación; entra deslizándose.
function dibExplica(c, lt) {
  const k = eOut(clamp(lt / 0.55)), a = alfa(c, lt) * k;
  const w = 940, x = (W - w) / 2 + (1 - k) * 160;
  ctx.save(); ctx.globalAlpha = a;
  const esc = c.escala || 1;   // tarjeta más chica para que se vea lo de atrás
  ctx.translate(W / 2, c.y); ctx.scale(esc, esc); ctx.translate(-W / 2, -c.y);
  ctx.font = `400 42px ${FUENTE}`;
  const lineas = partir(c.texto, w - 260), h = Math.max(230, 140 + lineas.length * 54);
  const y = c.y - h / 2;
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 40); ctx.fillStyle = 'rgba(30,24,40,.86)'; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = hexA(c.color, 0.55); ctx.lineWidth = 3; ctx.stroke();
  const ic = ctx.createRadialGradient(x + 120, c.y, 0, x + 120, c.y, 110);
  ic.addColorStop(0, hexA(c.color, 0.55)); ic.addColorStop(1, hexA(c.color, 0));
  ctx.fillStyle = ic; ctx.fillRect(x, y, 240, h);
  ctx.font = `110px ${FUENTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(c.icono, x + 120, c.y + 6);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `800 56px ${FUENTE}`; ctx.fillText(c.titulo, x + 240, y + 92);
  ctx.font = `400 42px ${FUENTE}`; ctx.fillStyle = '#d4d4d8';
  lineas.forEach((l, i) => ctx.fillText(l, x + 240, y + 150 + i * 54));
  ctx.restore();
}

const DIBUJAR = { puerta: dibPuerta, explica: dibExplica, marcas: dibMarcas, caja: dibCaja, mapa: dibMapa, sombra: dibSombra, fondo: dibFondo, video: dibVideo, celular: dibCelular, producto: dibProducto, texto: dibTexto, notificacion: dibNoti, boton: dibBoton, logo: dibLogo };

function tamCalidad() {
  const e = P.calidad === '4k' ? 2 : 1;
  if (lienzo.width !== W * e) { lienzo.width = W * e; lienzo.height = H * e; }
  return e;
}
function render(t) {
  const E = tamCalidad();
  ctx.setTransform(E, 0, 0, E, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (const p of PISTAS) {
    if (p.audio || oculta(p.id)) continue;
    for (const c of P.clips) {
      if (c.pista !== p.id || t < c.ini || t >= c.ini + c.dur) continue;
      const f = DIBUJAR[c.tipo];
      if (f) { ctx.save(); if (c.mx || c.my) ctx.translate(c.mx || 0, c.my || 0); f(c, t - c.ini, t); ctx.restore(); }
    }
  }
  acabadoCine(t);
}
