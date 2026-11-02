// FITWEARMX Studio · generar el video solo (fotos de prendas, modelo en sombra, armado).
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

// ---------- generar el video solo ----------
let quitaFondo = null;
// ---------- modelo en sombra: si la foto trae modelo, la persona queda negra y la prenda a color ----------
const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/';
let iaFotos = null;
async function cargarIAFotos() {
  if (iaFotos) return iaFotos;
  const { FilesetResolver, ImageSegmenter, PoseLandmarker } = await import(VISION + 'vision_bundle.mjs');
  const fs = await FilesetResolver.forVisionTasks(VISION + 'wasm');
  const crear = async (Clase, op) => { try { return await Clase.createFromOptions(fs, op('GPU')); } catch (e) { return Clase.createFromOptions(fs, op('CPU')); } };
  const seg = await crear(ImageSegmenter, d => ({ runningMode: 'IMAGE', outputCategoryMask: true, outputConfidenceMasks: false,
    baseOptions: { delegate: d, modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite' } }));
  const pos = await crear(PoseLandmarker, d => ({ runningMode: 'IMAGE', numPoses: 1,
    baseOptions: { delegate: d, modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task' } }));
  return (iaFotos = { seg, pos });
}
function cargarImagen(blob) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(blob); });
}
// Regresa un PNG (fondo transparente, modelo negro, prenda a color) o null si la foto no trae modelo.
async function modeloEnSombra(img) {
  const { seg, pos } = await cargarIAFotos();
  const lm = (pos.detect(img).landmarks || [])[0];
  if (!lm || ![11, 12, 23, 24].every(i => lm[i] && (lm[i].visibility ?? 1) > 0.5)) return null;
  const r = seg.segment(img), cm = r.categoryMask, mw = cm.width, mh = cm.height, cat = cm.getAsUint8Array();
  // Qué se queda a color: sólo la playera. Todo lo demás (cara, brazos, tatuajes, pantalón) queda en sombra.
  const corte = Math.max(lm[23].y, lm[24].y);                 // altura de la cadera: de ahí para abajo es pantalón
  const centro = (lm[11].x + lm[12].x) / 2, medio = Math.abs(lm[11].x - lm[12].x) / 2;
  const codo = Math.min(lm[13].y, lm[14].y);                   // de los codos para abajo, sólo lo que está sobre el torso
  // colores de la foto en chiquito: piel real del modelo vs. color de la playera (para no confundir tatuajes con ropa)
  const chico = document.createElement('canvas'); chico.width = mw; chico.height = mh;
  const cc = chico.getContext('2d'); cc.drawImage(img, 0, 0, mw, mh);
  const px = cc.getImageData(0, 0, mw, mh).data;
  const hombroY0 = (lm[11].y + lm[12].y) / 2, piel = [0, 0, 0, 0], tela = [0, 0, 0, 0];
  for (let i = 0; i < cat.length; i++) {
    const x = (i % mw) / mw, y = Math.floor(i / mw) / mh;
    if (cat[i] === 2) { piel[0] += px[i * 4]; piel[1] += px[i * 4 + 1]; piel[2] += px[i * 4 + 2]; piel[3]++; }
    if (cat[i] === 4 && Math.abs(x - centro) < medio * 0.6 && y > hombroY0 && y < corte) { tela[0] += px[i * 4]; tela[1] += px[i * 4 + 1]; tela[2] += px[i * 4 + 2]; tela[3]++; }
  }
  const media = a => a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : null;
  const pant = [0, 0, 0, 0];
  for (let i = 0; i < cat.length; i++) {
    const x = (i % mw) / mw, y = Math.floor(i / mw) / mh;
    if (cat[i] === 4 && y > corte + 0.07 && Math.abs(x - centro) < medio * 1.2) { pant[0] += px[i * 4]; pant[1] += px[i * 4 + 1]; pant[2] += px[i * 4 + 2]; pant[3]++; }
  }
  const mPiel = media(piel), mTela = media(tela), mPant = media(pant);
  const dist = (i, m) => Math.hypot(px[i * 4] - m[0], px[i * 4 + 1] - m[1], px[i * 4 + 2] - m[2]);
  const ropa = new Uint8Array(cat.length);
  for (let i = 0; i < cat.length; i++) {
    if (cat[i] !== 4) continue;
    const x = (i % mw) / mw, y = Math.floor(i / mw) / mh;
    if (y > corte) {
      if (y > corte + 0.16) continue;
      if (!mTela || dist(i, mTela) > 85 || (mPant ? dist(i, mTela) >= dist(i, mPant) * 0.7 : y > corte + 0.06)) continue;
    }
    const fuera = Math.abs(x - centro) > medio * 1.05;
    if (y > codo && fuera) continue;
    if (fuera && mPiel && mTela && dist(i, mPiel) < dist(i, mTela) * 0.7) continue;   // claramente piel (brazo/tatuaje), no manga
    ropa[i] = 1;
  }
  // sólo la playera que está pegada al pecho: brazos tatuados u otras manchas sueltas quedan en sombra
  {
    const hombroY = (lm[11].y + lm[12].y) / 2, caderaY = corte;
    const sx = Math.round(centro * mw), sy = Math.round((hombroY + (caderaY - hombroY) * 0.35) * mh);
    const visto = new Uint8Array(cat.length), cola = [];
    // arranca desde el pixel de playera más cercano al pecho
    for (let r = 0; r < 12 && !cola.length; r++) for (let dy = -r; dy <= r && !cola.length; dy++) for (let dx = -r; dx <= r; dx++) {
      const i = (sy + dy) * mw + sx + dx;
      if (ropa[i]) { cola.push(i); visto[i] = 1; break; }
    }
    // los hombros: más allá de su ancho sólo pasa si la manga sigue pegada en la misma fila (no un brazo aparte)
    while (cola.length) {
      const i = cola.pop(), x = i % mw, y = (i / mw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue;
        const j = ny * mw + nx;
        if (visto[j] || !ropa[j]) continue;
        visto[j] = 1; cola.push(j);
      }
    }
    if (visto.some(v => v)) ropa.set(visto);
  }
  // limpia puntitos sueltos: un pixel se queda si la mayoría de sus vecinos también es playera
  const limpia = new Uint8Array(cat.length);
  for (let y = 1; y < mh - 1; y++) for (let x = 1; x < mw - 1; x++) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += ropa[(y + dy) * mw + x + dx];
    limpia[y * mw + x] = n >= 5 ? 1 : 0;
  }
  const persona = document.createElement('canvas'), prenda = document.createElement('canvas');
  persona.width = prenda.width = mw; persona.height = prenda.height = mh;
  const dp = persona.getContext('2d').createImageData(mw, mh), dq = prenda.getContext('2d').createImageData(mw, mh);
  for (let i = 0; i < cat.length; i++) {
    if (cat[i] !== 0) dp.data[i * 4 + 3] = 255;
    if (limpia[i]) dq.data[i * 4 + 3] = 255;
  }
  cm.close();
  persona.getContext('2d').putImageData(dp, 0, 0); prenda.getContext('2d').putImageData(dq, 0, 0);
  const w = img.naturalWidth, h = img.naturalHeight, out = document.createElement('canvas'), capa = document.createElement('canvas');
  out.width = capa.width = w; out.height = capa.height = h;
  const o = out.getContext('2d'), k = capa.getContext('2d');
  o.imageSmoothingQuality = k.imageSmoothingQuality = 'high';
  o.drawImage(persona, 0, 0, w, h);                       // silueta suave (máscara chica estirada)
  o.globalCompositeOperation = 'source-in'; o.fillStyle = '#060608'; o.fillRect(0, 0, w, h);
  k.drawImage(img, 0, 0); k.globalCompositeOperation = 'destination-in'; k.drawImage(prenda, 0, 0, w, h);
  o.globalCompositeOperation = 'source-over'; o.drawImage(capa, 0, 0);
  // la foto suele cortar en la cintura: que se desvanezca abajo en vez de verse el corte
  const g = o.createLinearGradient(0, h * 0.84, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  o.globalCompositeOperation = 'destination-in'; o.fillStyle = g; o.fillRect(0, 0, w, h);
  return new Promise(res => out.toBlob(res, 'image/png'));
}
// Prepara la foto de la prenda. Regresa { src, modelo }.
async function fotoPrenda(p, quitar) {
  if (quitar) {
    const n = 'prenda-' + p.id + '-modelo.png';
    if (medios[n]) return { src: n, modelo: true };
    try {
      estado('Buscando fotos con modelo…');
      for (const f of p.colores[0].fotos.slice(0, 4)) {
        const im = await cargarImagen(await (await fetch(tienda.base + f)).blob());
        const png = await modeloEnSombra(im);
        if (png) return { src: await agregarArchivo(new File([png], n, { type: 'image/png' }), n), modelo: true };
      }
    } catch (e) { console.warn('sin IA de modelo', e); }
  }
  return { src: await fotoSola(p, quitar), modelo: false };
}
async function fotoSola(p, quitar) {
  const nombre = 'prenda-' + p.id + (quitar ? '-negro.png' : '.jpg');
  if (medios[nombre]) return nombre;
  let blob = await (await fetch(fotoDe(p))).blob();
  if (quitar) {
    try {
      if (!quitaFondo) quitaFondo = (await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm')).removeBackground;
      blob = await quitaFondo(blob, {
        output: { format: 'image/png', quality: 1 },
        progress: (clave, a, t) => { if (clave.startsWith('fetch') && t) estado(`Descargando la IA para quitar fondos (sólo la primera vez)… ${Math.round(100 * a / t)}%`); },
      });
    } catch (e) { console.warn('sin quitar fondo', e); }
  }
  return agregarArchivo(new File([blob], nombre, { type: blob.type }), nombre);
}
function leerPedido(txt) {
  const t = txt.toLowerCase(), o = {};
  const m = t.match(/(\d{1,2})\s*(s\b|seg)/);
  if (m) o.dur = +m[1];
  if (/c[oó]mo (comprar|pedir|ordenar)|paso a paso|tutorial|compra/.test(t)) o.modo = 'comprar';
  else if (/remate|liquida|oferta|descuento/.test(t)) o.modo = 'remate';
  else if (/una (sola )?prenda|protagonista|breathe|negro/.test(t)) o.modo = 'negro';
  else if (/drop|nuev|lleg/.test(t)) o.modo = 'drop';
  o.marca = ['YoungLA', 'Gymshark', 'Darc Sport', 'Controlled Insanity', 'DFYNE'].find(x => t.includes(x.toLowerCase().split(' ')[0]));
  o.cat = [['playera', 'Playeras'], ['hoodie', 'Hoodies'], ['sudadera', 'Hoodies'], ['pants', 'Pants'], ['short', 'Shorts'], ['chamarra', 'Chamarras']].find(([k]) => t.includes(k));
  if (o.cat) o.cat = o.cat[1];
  return o;
}
const estado = txt => { $('estadoGen').textContent = txt; };
const LUCES = ['#7c3aed', '#a1a1aa', '#3b82f6', '#ef4444'];
const PANTALLAS = [
  { src: 'pantalla-1.jpg', texto: 'Búscala.', toque: [0.82, 0.064, 1.3] },
  { src: 'pantalla-2.jpg', texto: 'Elígela.', toque: [0.26, 0.29, 1.2] },
  { src: 'pantalla-3.jpg', texto: 'Ordena con anticipo.', linea: true, zoom: [1.15, 0.75] },
  { src: 'pantalla-4.jpg', texto: 'Tu talla.', toque: [0.5, 0.96, 1.3] },
  { src: 'pantalla-5.jpg', texto: 'A tu bolsa.' },
  { src: 'pantalla-6.jpg', texto: 'Pídela por WhatsApp.', toque: [0.5, 0.93, -0.6], zoom: [1.12, 0.85] },
];
function armar(m, prods, fotos, dur) {
  const C = [], tx = (ini, d, texto, x = {}) => C.push({ tipo: 'texto', pista: 'T1', ini: r1(ini), dur: r1(d), texto, ...x });
  const pr = (ini, d, i, x = {}) => C.push({ tipo: 'producto', pista: 'V2', ini: r1(ini), dur: r1(d), src: fotos[i].src, luz: LUCES[i % 4],
    ...(fotos[i].modelo ? { cuerpo: 'foto', luz: '#7c3aed', girar: 'no', escala: 0.7, y: 880 } : {}), ...x });
  const cierre = (T, p) => {
    C.push({ tipo: 'boton', pista: 'FX', ini: T, dur: 2.4, y: 960 });
    C.push({ tipo: 'notificacion', pista: 'FX', ini: r1(T + 0.7), dur: 2.4, titulo: 'Tu pedido llegó 📦', cuerpo: p.nombre });
    tx(T + 0.2, 2.2, 'Te llega a tu puerta.', { tam: 100, y: 1500 });
    C.push({ tipo: 'logo', pista: 'FX', ini: T + 2.4, dur: 3 });
    return T + 5.4;
  };
  const logo = T => { C.push({ tipo: 'logo', pista: 'FX', ini: T, dur: 3 }); return T + 3; };
  let T = 0, n = prods.length;
  if (m === 'comprar') {
    const d = dur || 28;
    const usa = d <= 12 ? [2, 5] : d <= 16 ? [0, 2, 3, 5] : d <= 22 ? [0, 1, 2, 3, 5] : [0, 1, 2, 3, 4, 5];
    n = Math.min(n, d <= 12 ? 1 : d <= 16 ? 2 : d <= 22 ? 3 : 4);
    const pt = d <= 16 ? 1.6 : 2, st = d <= 16 ? 1.7 : 2;
    for (let i = 0; i < n; i++) { pr(T, pt, i); tx(T + 0.3, pt - 0.3, nombreCorto(prods[i]), { tam: 96, y: 1600 }); T += pt; }
    tx(0.3, T - 0.3, 'Ya en la tienda', { tam: 46, peso: 600, y: 230, color: '#a1a1aa' });
    tx(T, 1.6, '¿Cómo la pides?', { tam: 130, y: 960 }); T += 1.6;
    usa.forEach((k, j) => {
      const S = PANTALLAS[k], dd = j === usa.length - 1 ? st + 0.6 : st;
      const c = { tipo: 'celular', pista: 'V2', ini: r1(T), dur: dd, src: S.src, y: 140, entrada: j ? 'nada' : 'subir', fadeOut: j === usa.length - 1 ? 0.25 : 0 };
      if (S.toque) Object.assign(c, { toque: 'si', toqueX: S.toque[0], toqueY: S.toque[1], toqueT: S.toque[2] < 0 ? dd + S.toque[2] : Math.min(S.toque[2], dd - 0.5) });
      if (S.zoom) Object.assign(c, { zoomFin: S.zoom[0], focoY: S.zoom[1] });
      C.push(c);
      tx(r1(T + 0.2), dd - 0.2, S.texto, { tam: S.texto.length > 14 ? 95 : 120, y: 230, linea: S.linea ? 'si' : 'no', colorLinea: '#22c55e' });
      T += dd;
    });
    T = cierre(r1(T), prods[0]);
  } else if (m === 'drop' || m === 'remate') {
    const rem = m === 'remate';
    tx(0, 1.6, rem ? 'Remate.' : 'Drop nuevo.', { tam: 200, y: 960, color: rem ? '#ef4444' : '#ffffff', brillo: rem ? '#ef4444' : '' });
    T = 1.6;
    const pt = dur ? clamp((dur - 1.6 - 3) / n, 1.2, 4) : 2.4;
    prods.forEach((p, i) => {
      pr(r1(T), pt, i, { luz: rem ? '#ef4444' : fotos[i].modelo ? '#7c3aed' : LUCES[i % 4] });
      tx(r1(T + 0.2), pt - 0.2, p.marca.toUpperCase(), { tam: 44, peso: 600, y: 230, color: '#a1a1aa' });
      tx(r1(T + 0.3), pt - 0.3, nombreCorto(p), { tam: 92, y: 1560 });
      tx(r1(T + 0.6), pt - 0.6, rem ? '$' + p.precio.toLocaleString('es-MX') : 'Ordena con $' + anticipoDe(p.precio), { tam: 60, peso: 700, y: 1700, color: rem ? '#f87171' : '#22c55e' });
      T += pt;
    });
    if (rem) { tx(r1(T), 1.4, 'Últimas piezas.', { tam: 130, y: 960 }); T += 1.4; }
    T = logo(r1(T));
  } else {
    const p = prods[0], d = dur || 9, pd = Math.max(3, d - 3);
    pr(0, pd, 0, { entrada: 'zoom', zoomFin: 1.12 });
    tx(0.4, pd - 0.4, p.marca.toUpperCase(), { tam: 44, peso: 600, y: 230, color: '#a1a1aa' });
    tx(1.0, pd - 1.0, nombreCorto(p), { tam: 110, y: 1560 });
    tx(Math.min(2.2, pd - 1), pd - Math.min(2.2, pd - 1), 'Ordena con $' + anticipoDe(p.precio) + '.', { tam: 64, peso: 700, y: 1710, color: '#22c55e', linea: 'si', colorLinea: '#22c55e' });
    T = logo(pd);
  }
  C.unshift({ tipo: 'fondo', pista: 'V1', ini: 0, dur: r1(T), color1: MODOS[m].fondo, color2: '#000000' });
  C.push({ tipo: 'musica', pista: 'A1', ini: 0, dur: r1(T), volumen: 0.8, fadeOut: 2 });
  return C;
}
async function generar() {
  const b = $('bGenerar');
  if (b.disabled) return;
  b.disabled = true;
  try {
    const pedido = leerPedido($('prompt').value);
    if (pedido.modo) elegirModo(pedido.modo);
    estado('Leyendo tu tienda…');
    await cargarTienda();
    let prods = prendasSel.map(prendaDe).filter(Boolean);
    if (!prods.length) {
      let c = tienda.productos.filter(p => (!pedido.marca || p.marca === pedido.marca) && (p.categoria === (pedido.cat || 'Playeras')));
      if (!c.length) c = tienda.productos.filter(p => !pedido.marca || p.marca === pedido.marca);
      if (!c.length) c = tienda.productos;
      // una de cada diseño (sin repetir colores del mismo modelo)
      const vistos = new Set();
      prods = c.filter(p => { const k = p.nombre.split(' ').slice(0, 2).join(' '); if (vistos.has(k)) return false; vistos.add(k); return true; });
    }
    prods = prods.slice(0, modo === 'negro' ? 1 : 4);
    const dur = +$('cDur').value || pedido.dur || null;
    const quitar = $('cFondo').value === 'si';
    const fotos = [];
    for (let i = 0; i < prods.length; i++) {
      estado(`${quitar ? 'Poniendo en negro' : 'Cargando'} la prenda ${i + 1} de ${prods.length}…`);
      fotos.push(await fotoPrenda(prods[i], quitar));
    }
    if (modo === 'comprar') {
      estado('Preparando el celular…');
      for (const S of PANTALLAS) if (!medios[S.src]) {
        const bl = await (await fetch('pantallas/' + S.src)).blob();
        await agregarArchivo(new File([bl], S.src, { type: 'image/jpeg' }), S.src);
      }
    }
    guardarHist();
    cargar({ clips: armar(modo, prods, fotos, dur) });
    if ($('cRitmo').value === 'si') { estado('Componiendo el ritmo…'); audioListo(); await ritmoAlProyecto(120); }
    estado('');
    verVista('editor');
    $('aviso').textContent = '✦ Listo: dale ▶ Ver. Puedes mover cualquier bloque o tocarlo para cambiarlo.';
  } catch (e) {
    estado('😕 ' + e.message);
  } finally { b.disabled = false; }
}
$('bGenerar').onclick = generar;
$('prompt').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generar(); });
