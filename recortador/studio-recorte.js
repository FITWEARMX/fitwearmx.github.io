// FITWEARMX Studio · recorte fino: persona en sombra y la prenda 100% visible.
// Se carga después de studio-generar.js; usa cargarIAFotos, cargarImagen, tienda y quitaFondo.
// Por qué existe: la IA por sí sola ve la foto en 256×256 y confunde tela con piel. Aquí se revisa el torso
// con más detalle, se aprende el color de la tela de cada foto y se prueban varias fotos para quedarse con la mejor.

const REC_RECUERDO = 'fw_recorte_mejor_foto';   // aprende: guarda qué foto salió mejor de cada prenda

async function alfaPersona(lienzo, respaldo) {
  try {
    if (!quitaFondo) quitaFondo = (await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm')).removeBackground;
    const azul = await new Promise(r => lienzo.toBlob(r, 'image/png'));
    const sale = await quitaFondo(azul, { output: { format: 'image/png', quality: 1 } });
    const im = await createImageBitmap(sale), k = document.createElement('canvas');
    k.width = lienzo.width; k.height = lienzo.height;
    const c = k.getContext('2d', { willReadFrequently: true }); c.drawImage(im, 0, 0, k.width, k.height);
    const d = c.getImageData(0, 0, k.width, k.height).data, a = new Uint8Array(k.width * k.height);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
    return a;
  } catch (e) { console.warn('recorte: sin quitar fondo, uso la máscara de la IA', e); return respaldo; }
}

function coloresDe(muestras, k = 3) {   // los colores principales de la tela (una playera con estampado tiene varios)
  if (!muestras.length) return [];
  let cs = [];
  for (let j = 0; j < k; j++) cs.push(muestras[Math.floor((j + 0.5) * muestras.length / k)].slice());
  let cuenta = [];
  for (let it = 0; it < 6; it++) {
    const s = cs.map(() => [0, 0, 0]); cuenta = cs.map(() => 0);
    for (const m of muestras) {
      let b = 0, bd = 1e9;
      cs.forEach((c, i) => { const d = (m[0] - c[0]) ** 2 + (m[1] - c[1]) ** 2 + (m[2] - c[2]) ** 2; if (d < bd) { bd = d; b = i; } });
      s[b][0] += m[0]; s[b][1] += m[1]; s[b][2] += m[2]; cuenta[b]++;
    }
    cs = cs.map((c, i) => cuenta[i] ? [s[i][0] / cuenta[i], s[i][1] / cuenta[i], s[i][2] / cuenta[i]] : c);
  }
  return cs.filter((c, i) => cuenta[i] > muestras.length * 0.08);
}

function suaviza(m, w, h, r) {   // desenfoque de caja, regresa 0-255
  const a = new Float32Array(w * h), b = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += m[y * w + clampI(x, w)];
    for (let x = 0; x < w; x++) { a[y * w + x] = s / n; s += m[y * w + clampI(x + r + 1, w)] - m[y * w + clampI(x - r, w)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += a[clampI(y, h) * w + x];
    for (let y = 0; y < h; y++) { b[y * w + x] = s / n; s += a[clampI(y + r + 1, h) * w + x] - a[clampI(y - r, h) * w + x]; } }
  return b;
}
const clampI = (v, n) => v < 0 ? 0 : v >= n ? n - 1 : v;

function poseAproximada(seg, img) {
  const r = seg.segment(img), c = r.categoryMask, mw = c.width, mh = c.height, cat = c.getAsUint8Array().slice(); c.close();
  let n = 0, sx = 0, x0 = mw, x1 = 0, y0 = mh, caraFin = -1;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const k = cat[y * mw + x];
    if (k === 3 && y > caraFin) caraFin = y;
    if (k === 4) { n++; sx += x; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  }
  if (n < mw * mh * 0.05) return null;
  const centro = sx / n / mw, medio = (x1 - x0) / mw * 0.32, hombro = Math.max(y0, caraFin + 1) / mh + 0.02;
  const p = { x: centro, y: hombro, visibility: 1 }, q = [];
  q[0] = { x: centro, y: hombro - 0.1, visibility: caraFin >= 0 ? 1 : 0 };
  q[11] = { ...p, x: centro + medio }; q[12] = { ...p, x: centro - medio };
  return q;
}

// Regresa { blob, puntos } o null si en esa foto no se distingue a la persona.
async function recorteFino(img) {
  const { seg, pos } = await cargarIAFotos();
  let lm = (pos.detect(img).landmarks || [])[0], sinPose = false;
  if (!lm || ![11, 12].every(i => lm[i] && (lm[i].visibility ?? 1) > 0.5)) {
    lm = poseAproximada(seg, img);   // foto muy de cerca: la IA de pose no ve hombros, se ubica por la cara y la ropa
    if (!lm) return null;
    sinPose = true;
  }
  const ver = i => lm[i] && (lm[i].visibility ?? 1) > 0.3;
  const W0 = img.naturalWidth, H0 = img.naturalHeight, esc = Math.min(1, 1600 / H0), w = Math.round(W0 * esc), h = Math.round(H0 * esc);
  const base = document.createElement('canvas'); base.width = w; base.height = h;
  const bc = base.getContext('2d', { willReadFrequently: true }); bc.imageSmoothingQuality = 'high'; bc.drawImage(img, 0, 0, w, h);
  const px = bc.getImageData(0, 0, w, h).data;

  const hombroY = (lm[11].y + lm[12].y) / 2;
  const hayCadera = ver(23) && ver(24) && Math.max(lm[23].y, lm[24].y) < 1;
  const corte = hayCadera ? Math.max(lm[23].y, lm[24].y) : 1.2;
  const centro = (lm[11].x + lm[12].x) / 2, medio = Math.abs(lm[11].x - lm[12].x) / 2;

  // 1) la IA dos veces: foto completa, y el torso de cerca (ve más detalle de tela contra piel)
  const r0 = seg.segment(img), c0 = r0.categoryMask, m0w = c0.width, m0h = c0.height, cat0 = c0.getAsUint8Array().slice(); c0.close();
  const xs = [11, 12, 13, 14, 15, 16, 23, 24].filter(ver).map(i => lm[i].x);
  const bx0 = clampI(Math.floor((Math.min(...xs) - 0.1) * w), w), bx1 = clampI(Math.ceil((Math.max(...xs) + 0.1) * w), w);
  const by0 = clampI(Math.floor((hombroY - 0.14) * h), h), by1 = clampI(Math.ceil((Math.min(corte, 1) + 0.16) * h), h);
  const bw = Math.max(8, bx1 - bx0), bh = Math.max(8, by1 - by0);
  const rec = document.createElement('canvas'); rec.width = bw; rec.height = bh;
  rec.getContext('2d').drawImage(base, bx0, by0, bw, bh, 0, 0, bw, bh);
  const r1 = seg.segment(rec), c1 = r1.categoryMask, m1w = c1.width, m1h = c1.height, cat1 = c1.getAsUint8Array().slice(); c1.close();
  const cat = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dentro = x >= bx0 && x < bx0 + bw && y >= by0 && y < by0 + bh;
    cat[y * w + x] = dentro
      ? cat1[Math.floor((y - by0) / bh * m1h) * m1w + Math.floor((x - bx0) / bw * m1w)]
      : cat0[Math.floor(y / h * m0h) * m0w + Math.floor(x / w * m0w)];
  }
  const resp = new Uint8Array(w * h); for (let i = 0; i < resp.length; i++) resp[i] = cat[i] ? 255 : 0;
  const alfa = await alfaPersona(base, resp);

  // 2) aprende de esta foto: color de la tela (centro del pecho), de la piel (la cara) y del pantalón
  const yIni = hombroY + (Math.min(corte, 1) - hombroY) * 0.1, yFin = hombroY + (Math.min(corte, 1) - hombroY) * 0.9;
  const muestras = [], muestrasRopa = [], cara = [], cuerpo = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const i = y * w + x, nx = x / w, ny = y / h;
    if (alfa[i] < 128) continue;
    const col = [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];
    if (cat[i] === 3) cara.push(col);
    if (cat[i] !== 1 && cat[i] !== 3 && Math.abs(nx - centro) < medio * 0.55 && ny > yIni && ny < yFin) { muestras.push(col); if (cat[i] === 4) muestrasRopa.push(col); }
    if (cat[i] === 2 && Math.abs(nx - centro) > medio * 0.9) cuerpo.push(col);   // brazos: otra luz que la cara
  }
  // si el pecho va descubierto (tirantes), la piel no debe contar como color de tela
  const soloRopa = muestrasRopa.length > muestras.length * 0.25 ? muestrasRopa : muestras;
  const tela = coloresDe(soloRopa);
  if (!tela.length) return null;
  const media = a => a.length ? [0, 1, 2].map(j => a.reduce((s, c) => s + c[j], 0) / a.length) : null;
  const mPiel = media(cara);
  const mCuerpo0 = media(cuerpo);
  const dC = (i, m) => Math.hypot(px[i * 4] - m[0], px[i * 4 + 1] - m[1], px[i * 4 + 2] - m[2]);
  const dTela = i => { let b = 1e9; for (const c of tela) { const d = dC(i, c); if (d < b) b = d; } return b; };
  // si lo que la IA llamó "brazo" tiene el color de la tela, es manga larga: ese color no cuenta como piel
  const mCuerpo = mCuerpo0 && tela.every(c => Math.hypot(mCuerpo0[0] - c[0], mCuerpo0[1] - c[1], mCuerpo0[2] - c[2]) > 40) ? mCuerpo0 : null;
  const cercaDe = (i, p) => p && dC(i, p) < dTela(i) * 0.9 && dC(i, p) < 70;
  const esPiel = i => cercaDe(i, mPiel) || cercaDe(i, mCuerpo);
  // manos: junto a muñecas y dedos, lo que tenga tono de piel se queda en sombra aunque la IA diga que es ropa
  const calidoTela = soloRopa.reduce((s, c) => s + c[0] - c[2], 0) / soloRopa.length;
  const manos = [15, 16, 17, 18, 19, 20, 21, 22].filter(ver).map(i => lm[i]);
  const aspecto = h / w;
  const esMano = (i, x, y) => {
    if (!manos.length) return false;
    const nx = x / w, ny = y / h;
    if (!manos.some(p => Math.hypot(nx - p.x, (ny - p.y) * aspecto) < 0.09)) return false;
    return cat[i] === 2 || px[i * 4] - px[i * 4 + 2] > calidoTela + 18;
  };

  // afuera del tronco: lo que tenga tono cálido y no se parezca a la tela es brazo, aunque la IA diga "ropa"
  const enTronco = x => Math.abs(x / w - centro) < medio * 1.15;
  const brazoPiel = (i, x) => !enTronco(x) && px[i * 4] - px[i * 4 + 2] > calidoTela + 8 && dTela(i) > 20;
  // lo que la IA llamó brazo pero tiene casi el color de la tela es manga, no brazo
  const brazoReal = (i, x) => cat[i] === 2 && mCuerpo && !enTronco(x) && dTela(i) >= 28;

  // 3) qué puede ser prenda: lo que la IA ve como ropa, o lo que confundió con piel pero tiene color de la tela
  // Regla del dueño: sólo se tapa la piel (y el pelo); toda la ropa se queda visible.
  const puede = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, ct = cat[i];
    if (alfa[i] < 110 || ct === 1 || ct === 3 || esMano(i, x, y)) continue;
    if (ct === 4 || ct === 5) { if (!esPiel(i) && !brazoPiel(i, x)) puede[i] = 1; }
    else if (brazoReal(i, x)) continue;       // brazo de verdad (con o sin tatuajes): en sombra
    else if (dTela(i) < 48 && !esPiel(i)) puede[i] = 1;
  }

  // 4) quita manchitas sueltas (piel que se coló); la ropa separada, como el pantalón, se queda
  const m = new Uint8Array(w * h), visita = new Uint8Array(w * h), minimo = w * h * 0.002;
  for (let i0 = 0; i0 < puede.length; i0++) {
    if (!puede[i0] || visita[i0]) continue;
    const comp = [], cola = [i0]; visita[i0] = 1;
    while (cola.length) {
      const i = cola.pop(); comp.push(i); const x = i % w, y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx; if (puede[j] && !visita[j]) { visita[j] = 1; cola.push(j); }
      }
    }
    if (comp.length >= minimo) comp.forEach(i => { m[i] = 1; });
  }

  // 5) tapa hoyos: logos y estampados encerrados en la prenda se quedan a color (la piel no)
  const fuera = new Uint8Array(w * h), q = [];
  for (let x = 0; x < w; x++) { q.push(x, (h - 1) * w + x); } for (let y = 0; y < h; y++) { q.push(y * w, y * w + w - 1); }
  q.forEach(i => { if (!m[i]) fuera[i] = 1; });
  while (q.length) { const i = q.pop(); if (m[i]) continue; const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (!m[j] && !fuera[j]) { fuera[j] = 1; q.push(j); } } }
  let area = 0; for (let i = 0; i < m.length; i++) area += m[i];
  const visto = new Uint8Array(w * h);
  for (let i0 = 0; i0 < m.length; i0++) {
    if (m[i0] || fuera[i0] || visto[i0]) continue;
    const comp = [], pila = [i0]; visto[i0] = 1; let piel = 0;
    while (pila.length) { const i = pila.pop(); comp.push(i); if (esPiel(i)) piel++; const x = i % w, y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx; if (!m[j] && !fuera[j] && !visto[j]) { visto[j] = 1; pila.push(j); } } }
    if (piel < comp.length * 0.5 && comp.length < area * 0.25) comp.forEach(i => { m[i] = 1; });
  }

  // 6) orillas: crece hasta el borde real de la tela y luego suaviza para que no se vea escalonado
  for (let it = 0; it < 8; it++) {
    const nuevos = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (m[i] || alfa[i] < 110 || cat[i] === 1 || cat[i] === 3 || esMano(i, x, y)) continue;
      if (!(m[i - 1] || m[i + 1] || m[i - w] || m[i + w])) continue;
      if (brazoReal(i, x)) continue;
      if (dTela(i) < 62 && !esPiel(i) && !brazoPiel(i, x)) nuevos.push(i);
    }
    nuevos.forEach(i => { m[i] = 1; });
  }
  const cierre = suaviza(m, w, h, 3);
  for (let i = 0; i < m.length; i++) m[i] = cierre[i] > 0.5 && alfa[i] > 60 && !esMano(i, i % w, (i / w) | 0) ? 1 : 0;
  const suave = suaviza(m, w, h, 1);

  // 7) arma la imagen: persona negra con la prenda encima, intacta
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const o = out.getContext('2d'), sal = o.createImageData(w, h), d = sal.data;
  for (let i = 0; i < m.length; i++) {
    const pa = alfa[i] / 255, a = Math.min(pa, suave[i]) ;
    d[i * 4] = px[i * 4] * a + 6 * (1 - a); d[i * 4 + 1] = px[i * 4 + 1] * a + 6 * (1 - a); d[i * 4 + 2] = px[i * 4 + 2] * a + 8 * (1 - a);
    d[i * 4 + 3] = alfa[i];
  }
  o.putImageData(sal, 0, 0);
  const g = o.createLinearGradient(0, h * 0.84, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  o.globalCompositeOperation = 'destination-in'; o.fillStyle = g; o.fillRect(0, 0, w, h);

  // 8) calificación: pecho cubierto, de frente y prenda grande en la foto
  let pech = 0, cub = 0;
  for (let y = Math.floor(yIni * h); y < Math.floor(yFin * h) && y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (Math.abs(x / w - centro) > medio * 0.7) continue;
    const i = y * w + x; if (alfa[i] < 128) continue; pech++; cub += m[i];
  }
  const cubre = pech ? cub / pech : 0, alto = Math.min(corte, 1) - hombroY;
  const frente = Math.min(1, (medio * 2 * w) / (Math.max(alto, 0.01) * h) / 0.55), tam = Math.min(1, alto / 0.4);
  const deEspaldas = !sinPose && lm[12].x > lm[11].x ? 0.7 : 1;       // de frente, el hombro derecho sale a la izquierda de la foto
  const luz = tela.reduce((s, c) => s + (c[0] + c[1] + c[2]) / 3, 0) / tela.length;
  const resalta = 0.75 + 0.25 * Math.min(1, luz / 90);                // una prenda clara se nota más sobre la sombra
  const puntos = cubre * cubre * frente * deEspaldas * resalta * (0.55 + 0.45 * tam) * (sinPose ? 0.8 : 1);
  return { blob: await new Promise(res => out.toBlob(res, 'image/png')), puntos, cubre };
}

// Prueba las fotos de la prenda, se queda con la mejor y la recuerda para la próxima.
async function mejorRecorte(id, fotos) {
  let mem = {}; try { mem = JSON.parse(localStorage.getItem(REC_RECUERDO) || '{}'); } catch (e) {}
  const lista = mem[id] && fotos.includes(mem[id]) ? [mem[id]] : fotos.slice(0, 8);
  let mejor = null;
  for (const f of lista) {
    try {
      const im = await cargarImagen(await (await fetch(tienda.base + f)).blob());
      const r = await recorteFino(im);
      if (r && (!mejor || r.puntos > mejor.puntos)) mejor = { ...r, foto: f };
    } catch (e) { console.warn('recorte: foto sin procesar', f, e); }
  }
  if (mejor && mejor.puntos > 0.3) { mem[id] = mejor.foto; try { localStorage.setItem(REC_RECUERDO, JSON.stringify(mem)); } catch (e) {} }
  return mejor;
}
