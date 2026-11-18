// FITWEARMX Studio · Plantilla "Pared FW" (18-nov-2026): la pauta YoungLA Preview BF v4 tal cual.
// - Fondo: pared de concreto nítida con el logo FW pintado, grande y cortado a la derecha (pared-fw.jpg).
// - Cada prenda grande, sin fondo (recorte mejorado), con aura de luz en 3 capas:
//   roja si la prenda es casi negra, morada si es clara o de color.
// - Letras: Anton (título y precio) + Barlow Condensed (etiquetas), blanco hueso / gris piedra,
//   número y precio del color del aura. Todo a la izquierda y arriba de lo que tapa Instagram.
// - 0.5 s por prenda, ritmo 120 BPM, 4K 60 fps.

const PARED = { paso: 0.5, x: 84, yNombre: 1445, yOrdena: 1585, yLiquida: 1668, empuje: 0.09, hueso: '#EEE9E2', piedra: '#A39C93', gris: '#7E786F',
  rojo: { a: '#d6142a', b: '#ff3347', letra: '#FF4757' }, morado: { a: '#6a5efa', b: '#9a8fff', letra: '#A99FFF' } };
const LETRA_AN = t => `${t}px Anton`, LETRA_BA = (w, t) => `${w} ${t}px "Barlow Condensed"`;

async function letrasPared() {
  await Promise.all(['100px Anton', '600 40px "Barlow Condensed"', '700 40px "Barlow Condensed"'].map(f => document.fonts.load(f)));
}

// ---------- aura de luz ----------
function auraDe(src) {
  if (src.__aura) return src.__aura;
  const c = document.createElement('canvas'); c.width = 64; c.height = 96;
  const q = c.getContext('2d', { willReadFrequently: true }); q.drawImage(src, 0, 0, 64, 96);
  const d = q.getImageData(0, 0, 64, 96).data; let lum = 0, sat = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) {
    lum += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; sat += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); n++;
  }
  const negra = n && lum / n < 72 && sat / n < 38;   // casi negra → rojo; clara o de color → morado
  src.__aura = negra ? PARED.rojo : PARED.morado;
  return src.__aura;
}
function pintaLuz(q, src, X, Y, dw, dh, col, E) {
  for (const [al, bl] of [[0.30, 90], [0.55, 30], [0.85, 8], [0.95, 2.5]]) {   // resplandor, medio, orilla fina
    q.shadowColor = hexA(col, al); q.shadowBlur = bl * E; q.drawImage(src, X, Y, dw, dh);
  }
  q.shadowBlur = 0; q.shadowColor = 'transparent'; q.drawImage(src, X, Y, dw, dh);
}
const prendaCentradaBase = prendaCentrada;
prendaCentrada = function (c, x, y, w, h) {
  if (c.aura !== 'auto') return prendaCentradaBase(c, x, y, w, h);
  const src = fuenteDe(c);
  if (!src) return;
  const sw = src.naturalWidth, sh = src.naturalHeight, AU = auraDe(src);
  ctx.imageSmoothingQuality = 'high';
  const s = Math.max(Math.min(w / sw, h / sh), w * c.ancho / sw), dw = sw * s, dh = sh * s;
  const dy = dh > h ? y - (dh - h) * (c.focoY ?? 0) : y + (h - dh) / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.min(w, h) / 2);
  g.addColorStop(0, hexA(AU.a, 0.26)); g.addColorStop(0.55, hexA(AU.a, 0.08)); g.addColorStop(1, hexA(AU.a, 0));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (dh > h) {   // prenda en grande: se desvanece abajo sin corte
    const E = lienzo.width / W, capa = capaPrenda(w * E, h * E), q = capa.getContext('2d');
    q.setTransform(E, 0, 0, E, 0, 0); q.clearRect(0, 0, w, h); q.imageSmoothingQuality = 'high';
    q.globalCompositeOperation = 'source-over';
    pintaLuz(q, src, (w - dw) / 2, dy - y, dw, dh, AU.b, E);
    q.globalCompositeOperation = 'destination-out';
    const fa = q.createLinearGradient(0, h * 0.84, 0, h);
    fa.addColorStop(0, 'rgba(0,0,0,0)'); fa.addColorStop(1, 'rgba(0,0,0,1)');
    q.fillStyle = fa; q.fillRect(0, h * 0.84, w, h * 0.16);
    ctx.drawImage(capa, x, y, w, h);
    ctx.restore();
    return;
  }
  pintaLuz(ctx, src, x + (w - dw) / 2, dy, dw, dh, AU.b, 1);
  ctx.restore();
};

// ---------- letras en partes (cada pedazo con su letra y su color) ----------
const dibTextoBase = DIBUJAR.texto;
DIBUJAR.texto = function (c, lt) {
  if (!c.partes) return dibTextoBase(c, lt);
  ctx.save(); ctx.globalAlpha = alfa(c, lt); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const usa = p => { ctx.font = p.f; if ('letterSpacing' in ctx) ctx.letterSpacing = (p.ls || 0) + 'px'; };
  const ancho = p => { usa(p); return ctx.measureText(p.t).width; };
  const total = c.partes.reduce((s, p) => s + ancho(p) + (p.gap || 0), 0), cabe = W - c.x - 60;
  if (total > cabe) { ctx.translate(c.x, 0); ctx.scale(cabe / total, 1); ctx.translate(-c.x, 0); }   // nombres largos se aprietan, no se salen
  let x = c.x;
  for (const p of c.partes) {
    usa(p); ctx.fillStyle = p.c;
    if (p.sombra) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4; }
    else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
    ctx.fillText(p.t, x, c.y); x += ancho(p) + (p.gap || 0);
  }
  ctx.restore();
};
const anchoPartes = partes => { const q = document.createElement('canvas').getContext('2d'); let s = 0;
  for (const p of partes) { q.font = p.f; if ('letterSpacing' in q) q.letterSpacing = (p.ls || 0) + 'px'; s += q.measureText(p.t).width + (p.gap || 0); } return s; };
const textoPartes = (ini, dur, y, partes) => pautaTexto(ini, dur, partes.map(p => p.t).join(' '), { tam: 40, peso: 700, color: '#ffffff', y, x: PARED.x, partes });

// ---------- armado ----------
async function armarPared(prendas, letrero, _fecha, titulo = 'BLACK FRIDAY') {
  await letrasPared();
  if (!medios['pared-fw.jpg']) {
    const b = await (await fetch('pared-fw.jpg')).blob();
    await agregarArchivo(new File([b], 'pared-fw.jpg', { type: 'image/jpeg' }), 'pared-fw.jpg');
  }
  const paso = PARED.paso, F = +(prendas.length * paso).toFixed(2), din = n => '$' + n.toLocaleString('es-MX'), T = [];
  for (let i = 0; i < prendas.length; i++) {
    const p = prendas[i], t = +(i * paso).toFixed(2), m = montosTarjeta({ precio: p.precio, envio: 90 });
    const im = medios[p.src] && medios[p.src].img;
    if (im && !im.naturalWidth) await im.decode().catch(() => {});
    const ac = (im && im.naturalWidth ? auraDe(im) : PARED.morado).letra;
    T.push(nuevoClip('tarjeta', { ini: t, dur: paso, src: p.src, estilo: 'post', num: '', ancho: 0.36, empuje: PARED.empuje, cinta: '', subeEn: 0, subeDur: 0, subePx: 0,
      marcoY: 0, marcoAlto: 1920, nombre: '', precio: 0, envio: 90, x: 20, y: 440, w: 1040, h: 880, focoY: 0, fadeIn: 0, fadeOut: 0, sonido: 'whoosh', aura: 'auto' }));
    T.push(textoPartes(t, paso, PARED.yNombre, [{ t: String(i + 1).padStart(2, '0'), f: LETRA_AN(58), c: ac, gap: 20 },
      { t: p.nombre.toUpperCase(), f: LETRA_BA(600, 34), c: PARED.piedra, ls: 3 }]));
    const ordena = [{ t: 'ORDENA CON', f: LETRA_BA(700, 46), c: PARED.hueso, ls: 5, gap: 22 }, { t: din(m.ordena), f: LETRA_AN(128), c: ac, ls: 1, sombra: 1 }];
    T.push(textoPartes(t, paso, PARED.yOrdena, ordena));
    // "Liquidas con" del mismo largo que la línea de "Ordena con"
    const liq = 'LIQUIDAS CON ' + din(m.liquida), meta = anchoPartes(ordena), base = anchoPartes([{ t: liq, f: LETRA_BA(600, 40), ls: 4 }]);
    const tam = Math.max(40, Math.min(66, Math.round(40 * meta / base)));
    T.push(textoPartes(t, paso, PARED.yLiquida, [{ t: liq, f: LETRA_BA(600, tam), c: PARED.piedra, ls: Math.round(tam / 10) }]));
    if (i) T.push(nuevoClip('transicion', { ini: t, dur: 0.18, crece: 0.12 }));
  }
  const [uno, ...resto] = String(letrero || '').toUpperCase().split('·').map(s => s.trim()).filter(Boolean);
  const etiqueta = [{ t: uno || 'YOUNGLA', f: LETRA_BA(600, 40), c: PARED.piedra, ls: 14, gap: 22 }];
  if (resto.length) etiqueta.push({ t: '·  ' + resto.join(' · '), f: LETRA_BA(600, 40), c: PARED.gris, ls: 10 });
  T.push(textoPartes(0, F, 132, etiqueta));
  T.push(textoPartes(0, F, 305, [{ t: String(titulo).toUpperCase(), f: LETRA_AN(168), c: PARED.hueso, ls: 2, sombra: 1 }]));
  P.clips = [nuevoClip('video', { ini: 0, dur: F, src: 'pared-fw.jpg', nota: '', desde: 0, zoomIni: 1, zoomFin: 1, focoX: 0.5, focoY: 0.5, cine: 'no',
    volumen: 0, anillo: '', fadeIn: 0, fadeOut: 0, sonido: 'no' }), ...T];
  Object.assign(P, { look: 'normal', fps: 60, calidad: '4k' });
  if ($('selCalidad')) $('selCalidad').value = '4k';
  if ($('selFps')) $('selFps').value = '60';
  await ritmoAlProyecto(120);
  const mu = P.clips.find(c => c.tipo === 'musica');
  if (mu) Object.assign(mu, { ini: 0, dur: F, desde: 2, volumen: 0.6, fadeOut: 1 });
  cambio();
}
PAUTA_ARMADORES.pared = armarPared;

function tarjetaPared() {
  const d = document.createElement('button');
  d.type = 'button'; d.className = 'tarjeta';
  d.innerHTML = '<div class="poster" style="background-image:url(plantilla-pared.jpg)"></div><div class="info"><b>Pauta Pared FW ★</b>'
    + '<span>La pauta Preview BF: pared con tu logo, cada prenda con luz roja o morada, número, "Ordena con" y "Liquidas con". 0.5 s por prenda, 4K 60 fps.</span></div>';
  d.onclick = () => { verVista('editor'); abrirPauta('pared'); };
  return d;
}
$('rejillaPlantillas').prepend(tarjetaPared());
$('atajos').prepend(tarjetaPared());
