// FITWEARMX Studio · recorte mejorado (18-nov-2026): la IA a veces se comía partes de la prenda
// (playera negra, crewneck crema, estampados claros). Ahora:
// 1) si la foto tiene fondo liso de estudio, también quita el fondo por color desde la orilla (no toca la ropa)
//    y lo junta con lo que dejó la IA, sin manchitas sueltas;
// 2) rellena los huecos que la IA dejó dentro de la prenda.
// Las fotos con escena (calle, carro, cuarto) siguen solo con la IA. Después recorta y desvanece igual que antes.

const prendaSinFondoIA = prendaSinFondo;

async function mascaraBuena(blob, avisar) {
  if (!quitaFondo) quitaFondo = (await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm')).removeBackground;
  const orig = await createImageBitmap(blob), W0 = orig.width, H0 = orig.height, N = W0 * H0;
  const ai = await createImageBitmap(await quitaFondo(blob, { output: { format: 'image/png', quality: 1 },
    progress: (k, a, t) => { if (avisar && k.startsWith('fetch') && t) avisar(`Descargando la IA (solo la primera vez)… ${Math.round(100 * a / t)}%`); } }));
  const cv = document.createElement('canvas'); cv.width = W0; cv.height = H0;
  const q = cv.getContext('2d', { willReadFrequently: true });
  q.drawImage(ai, 0, 0, W0, H0); const A = q.getImageData(0, 0, W0, H0).data;
  const al = new Uint8Array(N); for (let i = 0; i < N; i++) al[i] = A[i * 4 + 3];
  q.clearRect(0, 0, W0, H0); q.drawImage(orig, 0, 0);
  const img = q.getImageData(0, 0, W0, H0), D = img.data;
  const vecinos = (p, x) => [x > 0 ? p - 1 : -1, x < W0 - 1 ? p + 1 : -1, p - W0, p + W0];
  // ¿fondo liso? mira la orilla
  const bord = []; for (let x = 0; x < W0; x += 2) bord.push(x, (H0 - 1) * W0 + x); for (let y = 0; y < H0; y += 2) bord.push(y * W0, y * W0 + W0 - 1);
  let s = 0, s2 = 0; for (const p of bord) { const l = (D[p * 4] + D[p * 4 + 1] + D[p * 4 + 2]) / 3; s += l; s2 += l * l; }
  const media = s / bord.length, desv = Math.sqrt(Math.max(0, s2 / bord.length - media * media));
  if (desv < 14) {
    // prenda clarita (crema, gris, blanca): se parece al fondo, entonces se cuida más
    let sf = 0, nf = 0; for (let i = 0; i < N; i += 7) if (al[i] > 200) { sf += (D[i * 4] + D[i * 4 + 1] + D[i * 4 + 2]) / 3; nf++; }
    const clara = nf && Math.abs(sf / nf - media) < 70, uLum = clara ? 40 : 55, uSat = clara ? 25 : 30, uDif = clara ? 9 : 11;
    const lejos = p => { const r = D[p * 4], g = D[p * 4 + 1], b = D[p * 4 + 2];
      return Math.abs((r + g + b) / 3 - media) > uLum || Math.max(r, g, b) - Math.min(r, g, b) > uSat; };
    const dif = (a, b) => Math.abs(D[a * 4] - D[b * 4]) + Math.abs(D[a * 4 + 1] - D[b * 4 + 1]) + Math.abs(D[a * 4 + 2] - D[b * 4 + 2]);
    const bg = new Uint8Array(N), cola = new Int32Array(N); let h = 0, t = 0;
    for (const p of bord) if (!bg[p] && !lejos(p)) { bg[p] = 1; cola[t++] = p; }
    while (h < t) { const p = cola[h++]; for (const v of vecinos(p, p % W0)) { if (v < 0 || v >= N || bg[v]) continue; if (dif(p, v) < uDif && !lejos(v)) { bg[v] = 1; cola[t++] = v; } } }
    // solo pedazos grandes (sin manchitas)
    const comp = new Int32Array(N).fill(-1), cc = new Int32Array(N), grande = []; let id = 0;
    for (let i = 0; i < N; i++) { if (bg[i] || comp[i] >= 0) continue; let hh = 0, tt = 0; cc[tt++] = i; comp[i] = id;
      while (hh < tt) { const p = cc[hh++]; for (const v of vecinos(p, p % W0)) { if (v < 0 || v >= N || bg[v] || comp[v] >= 0) continue; comp[v] = id; cc[tt++] = v; } }
      grande[id++] = tt > N * 0.004; }
    for (let i = 0; i < N; i++) if (!bg[i] && grande[comp[i]]) al[i] = 255;
  }
  // rellena huecos dentro de la prenda (lo transparente que no toca la orilla)
  const fuera = new Uint8Array(N), c2 = new Int32Array(N); let h = 0, t = 0;
  const pon = p => { if (!fuera[p] && al[p] < 128) { fuera[p] = 1; c2[t++] = p; } };
  for (let x = 0; x < W0; x++) { pon(x); pon((H0 - 1) * W0 + x); } for (let y = 0; y < H0; y++) { pon(y * W0); pon(y * W0 + W0 - 1); }
  while (h < t) { const p = c2[h++], x = p % W0; if (x > 0) pon(p - 1); if (x < W0 - 1) pon(p + 1); if (p >= W0) pon(p - W0); if (p < N - W0) pon(p + W0); }
  for (let i = 0; i < N; i++) { if (!fuera[i]) al[i] = 255; D[i * 4 + 3] = al[i]; }
  q.putImageData(img, 0, 0);
  return new Promise(ok => cv.toBlob(ok, 'image/png'));
}

prendaSinFondo = async function (blob, avisar) {
  try {
    const limpia = await mascaraBuena(blob, avisar);
    const ia = quitaFondo; quitaFondo = async b => b;   // ya trae el fondo quitado: solo recorta y desvanece
    try { return await prendaSinFondoIA(limpia, avisar); } finally { quitaFondo = ia; }
  } catch (e) { console.warn('recorte mejorado falló, uso el de siempre', e); return prendaSinFondoIA(blob, avisar); }
};
