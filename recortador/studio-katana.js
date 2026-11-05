// FITWEARMX Studio · Katana: reel vertical estilo cine con tus prendas o tu material.
// Se carga al final de comercial.html; usa cargarTienda/fotoDe (studio-vistas), crearRitmo (studio-ritmo) y abrirDB (studio-creaciones).
// Material: sólo fotos de la tienda o lo que el dueño suba. Export MP4 con WebCodecs + mp4-muxer (mejor en Chrome de la Mac).

const KW = 1080, KH = 1920, KFPS = 30, KBPM = 120, KTIT = 2.6, KTRANS = 0.28;
const KFILTROS = {
  noche: { nombre: 'Noche', filtro: 'contrast(1.35) saturate(0.75) brightness(0.78)', tinte: 'rgba(20,40,110,.35)', modo: 'soft-light', brillo: '#ff2d55' },
  oro:   { nombre: 'Oro',   filtro: 'contrast(1.15) saturate(1.1) sepia(0.35) brightness(0.95)', tinte: 'rgba(255,170,60,.22)', modo: 'soft-light', brillo: '#f5c76b' },
  acero: { nombre: 'Acero', filtro: 'grayscale(0.88) contrast(1.4) brightness(0.85)', tinte: 'rgba(120,140,170,.25)', modo: 'multiply', brillo: '#cfd8e3' },
};
const K = { material: [], prendas: [], filtro: 'noche', grano: true, franjas: true, titulo: '', sub: 'Ordena con anticipo', dur: 15, audio: null, tocando: false, raf: 0, fuente: null, ac: null };
const kc = document.createElement('canvas'); kc.width = KW; kc.height = KH;
const kx = kc.getContext('2d');

// ---------- ventana ----------
const kEstilo = document.createElement('style');
kEstilo.textContent = `
.k-caja{width:min(1080px,100%)}
.k-cuerpo{display:grid;grid-template-columns:1fr 300px;gap:14px;padding:14px;overflow:auto}
.k-cuerpo h4{margin:12px 0 6px;font-size:.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em}
.k-cuerpo h4:first-child{margin-top:0}
.k-filtros{display:flex;gap:8px;flex-wrap:wrap}
.k-filtros button.on{border-color:var(--accent);background:var(--accent);color:#fff}
.k-campo{width:100%;background:var(--bg);color:#fff;border:1px solid var(--border);border-radius:10px;padding:8px 10px;font:inherit;box-sizing:border-box;margin-bottom:6px}
.k-sel{display:flex;gap:6px;flex-wrap:wrap;min-height:54px}
.k-sel div{width:48px;height:48px;border-radius:8px;background:#222 center/cover;position:relative}
.k-sel button{position:absolute;top:-6px;right:-6px;width:20px;height:20px;padding:0;border-radius:50%;font-size:.65rem}
.k-vista canvas{width:100%;max-width:300px;aspect-ratio:9/16;border-radius:12px;background:#000;display:block}
.k-vista .vacio{margin:6px 0}
.k-acc{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.k-cuerpo .rejilla-prod{padding:0;max-height:46vh}
.k-opc label{display:inline-flex;gap:6px;align-items:center;margin-right:12px;color:var(--text-muted);font-size:.85rem}
@media (max-width:760px){.k-cuerpo{grid-template-columns:1fr}.k-vista canvas{max-width:220px;margin:auto}}`;
document.head.append(kEstilo);

const kModal = document.createElement('div');
kModal.className = 'modal'; kModal.id = 'modalKatana'; kModal.hidden = true;
kModal.innerHTML = `
<div class="modal-caja k-caja">
  <div class="modal-top"><b>⚔️ Katana · reel estilo cine</b><span style="flex:1"></span><button type="button" id="kCerrar">Cerrar</button></div>
  <div class="k-cuerpo">
    <div>
      <h4>1 · Material (4 a 8)</h4>
      <div class="k-sel" id="kSel"></div>
      <div class="k-acc"><button type="button" id="kSubir">＋ Subir fotos o videos</button><input id="kBusca" class="k-campo" style="flex:1;margin:0" type="search" placeholder="Buscar en mi tienda: Cherub, Wolves…"></div>
      <div class="rejilla-prod" id="kRejilla" style="margin-top:10px"><p class="vacio">Cargando tu tienda…</p></div>
      <input type="file" id="kArchivos" accept="image/*,video/*,.mov,.mp4,.m4v" multiple hidden>
    </div>
    <div class="k-vista">
      <h4>2 · Filtro</h4>
      <div class="k-filtros" id="kFiltros"></div>
      <div class="k-opc" style="margin-top:8px"><label><input type="checkbox" id="kGrano" checked> Grano</label><label><input type="checkbox" id="kFranjas" checked> Franjas de cine</label></div>
      <h4>3 · Título</h4>
      <input id="kTitulo" class="k-campo" maxlength="22" placeholder="Ej. VENGEANCE">
      <input id="kSub" class="k-campo" maxlength="40" value="Ordena con anticipo">
      <h4>4 · Duración</h4>
      <select id="kDur" class="k-campo"><option value="10">10 s</option><option value="15" selected>15 s</option><option value="20">20 s</option></select>
      <canvas id="kLienzo" width="540" height="960"></canvas>
      <p class="vacio" id="kAviso">Elige tus prendas o sube tu material.</p>
      <div class="k-acc"><button type="button" id="kVer">▶ Vista previa</button><button type="button" class="pri" id="kCrear">Crear MP4 ⚔️</button></div>
    </div>
  </div>
</div>`;
document.body.append(kModal);
const kv = $('kLienzo').getContext('2d');

for (const [k, f] of Object.entries(KFILTROS)) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = f.nombre; b.dataset.f = k;
  b.onclick = () => { K.filtro = k; pintarFiltros(); kDibujarVista(K.tocando ? null : 0.6); };
  $('kFiltros').append(b);
}
function pintarFiltros() { for (const b of $('kFiltros').children) b.classList.toggle('on', b.dataset.f === K.filtro); }

// ---------- material ----------
function kCargarImg(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
function kCargarVideo(src) {
  return new Promise((res, rej) => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = src;
    v.onloadeddata = () => res(v); v.onerror = rej;
  });
}
async function kAgregarPrenda(p) {
  const i = K.prendas.indexOf(p.id);
  if (i >= 0) { K.prendas.splice(i, 1); K.material = K.material.filter(m => m.id !== p.id); }
  else {
    if (K.material.length >= 8) { kAviso('Máximo 8.'); return; }
    K.prendas.push(p.id);
    try {
      const blob = await (await fetch(fotoDe(p))).blob();
      K.material.push({ id: p.id, img: await kCargarImg(URL.createObjectURL(blob)), mini: fotoDe(p) });
    } catch (e) { K.prendas.splice(K.prendas.indexOf(p.id), 1); kAviso('No pude bajar esa foto.'); }
  }
  kPintarRejilla(); kPintarSel();
}
async function kSubir(files) {
  for (const f of files) {
    if (K.material.length >= 8) { kAviso('Máximo 8.'); break; }
    const url = URL.createObjectURL(f);
    try {
      if (f.type.startsWith('video') || /\.(mov|mp4|m4v)$/i.test(f.name)) K.material.push({ id: 'v' + Date.now() + f.name, vid: await kCargarVideo(url), mini: '' });
      else K.material.push({ id: 'f' + Date.now() + f.name, img: await kCargarImg(url), mini: url });
    } catch (e) { kAviso('No pude abrir ' + f.name); }
  }
  kPintarSel();
}
function kPintarSel() {
  $('kSel').innerHTML = '';
  for (const m of K.material) {
    const d = document.createElement('div');
    if (m.mini) d.style.backgroundImage = `url("${m.mini}")`; else d.textContent = '🎬';
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕';
    x.onclick = () => { K.material = K.material.filter(o => o !== m); K.prendas = K.prendas.filter(id => id !== m.id); kPintarSel(); kPintarRejilla(); };
    d.append(x); $('kSel').append(d);
  }
  kAviso(K.material.length < 4 ? `Llevas ${K.material.length}. Elige al menos 4.` : `Listo: ${K.material.length} tomas.`);
  kDibujarVista(0.6);
}
function kPintarRejilla() {
  if (!tienda) return;
  const q = $('kBusca').value.trim().toLowerCase();
  const lista = tienda.productos.filter(p => !q || (p.nombre + ' ' + p.marca + ' ' + p.categoria).toLowerCase().includes(q)).slice(0, 120);
  $('kRejilla').innerHTML = '';
  for (const p of lista) {
    const d = document.createElement('div');
    d.className = 'prod' + (K.prendas.includes(p.id) ? ' sel' : '');
    d.innerHTML = `<div class="ft"></div><div><b></b><span></span></div>`;
    d.querySelector('.ft').style.backgroundImage = `url("${fotoDe(p)}")`;
    d.querySelector('b').textContent = p.nombre;
    d.querySelector('span').textContent = p.marca;
    d.onclick = () => kAgregarPrenda(p);
    $('kRejilla').append(d);
  }
  if (!lista.length) $('kRejilla').innerHTML = '<p class="vacio">No encontré esa prenda.</p>';
}
const kAviso = t => { $('kAviso').textContent = t; };

// ---------- dibujo de un cuadro ----------
const kGranos = [...Array(4)].map(() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return c;
});
const kFuente = m => m.vid || m.img;
const kTam = m => m.vid ? [m.vid.videoWidth, m.vid.videoHeight] : [m.img.naturalWidth, m.img.naturalHeight];
function kTiempos() {
  const n = Math.max(1, K.material.length), tomas = Math.max(1, K.dur - KTIT);
  return { n, toma: tomas / n, tomas };
}
// toma i con zoom lento, paneo y golpe de zoom en cada beat
function kToma(i, tl, dx, blur) {
  const m = K.material[i]; if (!m) return;
  const [w, h] = kTam(m); if (!w) return;
  const { toma } = kTiempos(), p = Math.min(1, tl / toma);
  const t = i * toma + tl, beat = 60 / KBPM;
  const golpe = t > beat * 4 ? Math.exp(-((t % beat) / beat) * 7) * 0.05 : 0;
  const s = Math.max(KW / w, KH / h) * (1.06 + 0.12 * p + golpe);
  const dir = i % 2 ? 1 : -1, px = dir * (p - 0.5) * 70, py = (i % 3 - 1) * (p - 0.5) * 50;
  kx.save();
  kx.filter = KFILTROS[K.filtro].filtro + (blur ? ` blur(${blur.toFixed(1)}px)` : '');
  kx.drawImage(kFuente(m), (KW - w * s) / 2 + px + dx, (KH - h * s) / 2 + py, w * s, h * s);
  kx.restore();
}
function kCuadro(t) {
  const { n, toma, tomas } = kTiempos(), F = KFILTROS[K.filtro];
  kx.fillStyle = '#000'; kx.fillRect(0, 0, KW, KH);
  if (!K.material.length) { kTexto('KATANA', 'Elige tu material', 1); return kAcabado(t); }
  if (t < tomas) {
    const i = Math.min(n - 1, Math.floor(t / toma)), tl = t - i * toma, falta = toma - tl;
    if (falta < KTRANS && i < n - 1) {
      // barrido borroso hacia la siguiente toma
      const p = 1 - falta / KTRANS, e = p * p * (3 - 2 * p), bl = Math.sin(Math.PI * p) * 28;
      kToma(i, tl, -e * KW, bl);
      kToma(i + 1, 0, (1 - e) * KW, bl);
    } else kToma(i, tl, 0, 0);
    // destello en cada segundo corte
    const desde = tl;
    if (i > 0 && i % 2 === 0 && desde < 0.18) { kx.fillStyle = `rgba(255,255,255,${0.75 * (1 - desde / 0.18)})`; kx.fillRect(0, 0, KW, KH); }
  } else {
    // final: última toma oscura y borrosa + título
    const tt = t - tomas;
    kToma(n - 1, toma, 0, 14);
    kx.fillStyle = `rgba(0,0,0,${Math.min(0.72, tt * 1.4)})`; kx.fillRect(0, 0, KW, KH);
    kTexto(K.titulo || 'FITWEARMX', K.sub, Math.min(1, tt / 0.9));
  }
  kAcabado(t);
}
function kAcabado(t) {
  const F = KFILTROS[K.filtro];
  kx.save(); kx.globalCompositeOperation = F.modo; kx.fillStyle = F.tinte; kx.fillRect(0, 0, KW, KH); kx.restore();
  const vi = kx.createRadialGradient(KW / 2, KH / 2, KH * 0.25, KW / 2, KH / 2, KH * 0.75);
  vi.addColorStop(0, 'rgba(0,0,0,0)'); vi.addColorStop(1, 'rgba(0,0,0,.6)');
  kx.fillStyle = vi; kx.fillRect(0, 0, KW, KH);
  if (K.grano) {
    kx.save(); kx.globalAlpha = 0.09; kx.globalCompositeOperation = 'overlay';
    kx.fillStyle = kx.createPattern(kGranos[Math.floor(t * KFPS) % 4], 'repeat'); kx.fillRect(0, 0, KW, KH); kx.restore();
  }
  if (K.franjas) {
    const h = 150 * Math.min(1, t / 0.6);
    kx.fillStyle = '#000'; kx.fillRect(0, 0, KW, h); kx.fillRect(0, KH - h, KW, h);
  }
}
function kTexto(tit, sub, a) {
  const F = KFILTROS[K.filtro];
  kx.save(); kx.textAlign = 'center'; kx.textBaseline = 'middle';
  kx.globalAlpha = a;
  let tam = 150; kx.font = `600 ${tam}px Georgia, "Times New Roman", serif`;
  const esp = 18 * (1 + (1 - a) * 1.5);
  const ancho = s => kx.measureText(s).width + esp * (s.length - 1);
  const txt = tit.toUpperCase();
  while (ancho(txt) > KW * 0.86 && tam > 60) { tam -= 6; kx.font = `600 ${tam}px Georgia, "Times New Roman", serif`; }
  kx.shadowColor = F.brillo; kx.shadowBlur = 40;
  kx.fillStyle = '#fff';
  let x = KW / 2 - ancho(txt) / 2;
  kx.textAlign = 'left';
  for (const c of txt) { kx.fillText(c, x, KH / 2 - 30); x += kx.measureText(c).width + esp; }
  kx.shadowBlur = 0; kx.textAlign = 'center';
  kx.fillStyle = F.brillo; kx.fillRect(KW / 2 - 60 * a, KH / 2 + tam / 2 + 10, 120 * a, 3);
  kx.font = '500 40px Inter, system-ui, sans-serif'; kx.fillStyle = 'rgba(255,255,255,.9)';
  if (sub) kx.fillText(sub.toUpperCase().split('').join(' '), KW / 2, KH / 2 + tam / 2 + 70);
  kx.font = '500 30px Inter, system-ui, sans-serif'; kx.fillStyle = 'rgba(255,255,255,.55)';
  kx.fillText('@fitwear.mty', KW / 2, KH - 230);
  kx.restore();
}
function kDibujarVista(t) {
  if (t == null) return;
  kCuadro(t); kv.drawImage(kc, 0, 0, 540, 960);
}

// ---------- videos: ir al momento exacto ----------
function kMomentoVideos(t, exacto) {
  const { n, toma, tomas } = kTiempos(), proms = [];
  K.material.forEach((m, i) => {
    if (!m.vid) return;
    const tl = Math.min(Math.max(0, (t >= tomas ? toma : t - i * toma)), toma);
    const obj = (tl % Math.max(0.1, m.vid.duration || 1));
    if (exacto && Math.abs(m.vid.currentTime - obj) > 0.01) proms.push(new Promise(r => { m.vid.addEventListener('seeked', r, { once: true }); m.vid.currentTime = obj; }));
    else if (!exacto && Math.abs(m.vid.currentTime - obj) > 0.3) m.vid.currentTime = obj;
  });
  return Promise.all(proms);
}

// ---------- música (ritmo propio sin derechos) ----------
async function kAudio() {
  if (K.audio && K.audio.duration >= K.dur) return K.audio;
  kAviso('Creando el ritmo…');
  const wav = await crearRitmo(KBPM, K.dur + 1);
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  K.audio = await ac.decodeAudioData(await wav.arrayBuffer());
  ac.close();
  return K.audio;
}

// ---------- vista previa ----------
async function kVer() {
  if (K.tocando) return kParar();
  if (K.material.length < 4) { kAviso('Elige al menos 4 prendas o fotos.'); return; }
  const buf = await kAudio();
  K.ac = new (window.AudioContext || window.webkitAudioContext)();
  K.fuente = K.ac.createBufferSource(); K.fuente.buffer = buf;
  const g = K.ac.createGain(); K.fuente.connect(g); g.connect(K.ac.destination);
  g.gain.setValueAtTime(1, K.dur - 0.8); g.gain.linearRampToValueAtTime(0, K.dur);
  const t0 = K.ac.currentTime + 0.05; K.fuente.start(t0);
  K.tocando = true; $('kVer').textContent = '■ Parar'; kAviso('Viendo…');
  const paso = () => {
    const t = K.ac.currentTime - t0;
    if (t >= K.dur) return kParar();
    kMomentoVideos(Math.max(0, t), false);
    kDibujarVista(Math.max(0, t));
    K.raf = requestAnimationFrame(paso);
  };
  paso();
}
function kParar() {
  cancelAnimationFrame(K.raf); K.tocando = false; $('kVer').textContent = '▶ Vista previa';
  try { K.fuente && K.fuente.stop(); K.ac && K.ac.close(); } catch (e) {}
  kAviso(`Listo: ${K.material.length} tomas.`);
}

// ---------- exportar MP4 ----------
async function kCrear() {
  if (K.material.length < 4) { kAviso('Elige al menos 4 prendas o fotos.'); return; }
  if (!window.VideoEncoder || !window.AudioEncoder) { alert('Para crear el MP4 usa Google Chrome en la Mac.'); return; }
  if (K.tocando) kParar();
  $('kCrear').disabled = true; $('kVer').disabled = true;
  try {
    const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm');
    const buf = await kAudio(), sr = buf.sampleRate, dur = K.dur, n = Math.ceil(dur * KFPS);
    const cfgV = { codec: 'avc1.640028', width: KW, height: KH, bitrate: 18e6, framerate: KFPS };
    if (!(await VideoEncoder.isConfigSupported(cfgV)).supported) cfgV.codec = 'avc1.4d0028';
    const muxer = new Muxer({ target: new ArrayBufferTarget(), fastStart: 'in-memory',
      video: { codec: 'avc', width: KW, height: KH, frameRate: KFPS }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: sr } });
    let error = null;
    const ve = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => error = e });
    ve.configure(cfgV);
    const ae = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: e => error = e });
    ae.configure({ codec: 'mp4a.40.2', numberOfChannels: 2, sampleRate: sr, bitrate: 192000 });
    const largo = Math.floor(dur * sr), L = buf.getChannelData(0), R = buf.getChannelData(buf.numberOfChannels > 1 ? 1 : 0);
    const caida = Math.floor(0.8 * sr);
    for (let i = 0; i < largo; i += 1024) {
      const k = Math.min(1024, largo - i), datos = new Float32Array(k * 2);
      for (let j = 0; j < k; j++) {
        const v = Math.min(1, (largo - i - j) / caida);
        datos[j] = L[i + j] * v; datos[k + j] = R[i + j] * v;
      }
      const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(i / sr * 1e6), data: datos });
      ae.encode(ad); ad.close();
    }
    let poster = null;
    for (let i = 0; i < n && !error; i++) {
      const t = i / KFPS;
      await kMomentoVideos(t, true);
      kCuadro(t);
      if (i % 3 === 0) kv.drawImage(kc, 0, 0, 540, 960);
      if (!poster && t > dur * 0.3) { const m = document.createElement('canvas'); m.width = 270; m.height = 480; m.getContext('2d').drawImage(kc, 0, 0, 270, 480); poster = m.toDataURL('image/jpeg', 0.7); }
      const vf = new VideoFrame(kc, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / KFPS) });
      ve.encode(vf, { keyFrame: i % (KFPS * 2) === 0 }); vf.close();
      if (ve.encodeQueueSize > 8) await new Promise(r => ve.addEventListener('dequeue', r, { once: true }));
      if (i % 10 === 0) kAviso(`Creando cuadro ${i} de ${n}…`);
    }
    await ve.flush(); await ae.flush();
    if (error) throw error;
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    const d = new Date(), dos = x => String(x).padStart(2, '0');
    const nom = `katana-fitwearmx-${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}.mp4`;
    try {
      const db = await abrirDB();
      db.transaction('creaciones', 'readwrite').objectStore('creaciones').put({ id: Date.now(), nombre: nom, fecha: d.toISOString(), blob, poster, dur, modo: 'Katana' });
    } catch (e) { console.warn('no se guardó en creaciones', e); }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom;
    a.textContent = '⬇️ ' + nom + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)';
    $('kAviso').innerHTML = '✅ Listo. También quedó en Mis creaciones. '; $('kAviso').append(a);
    a.click();
  } catch (e) {
    console.warn('katana', e); kAviso('No se pudo crear: ' + (e.message || e) + '. Prueba en Chrome de la Mac.');
  }
  $('kCrear').disabled = false; $('kVer').disabled = false;
}

// ---------- abrir / eventos ----------
async function abrirKatana() {
  kModal.hidden = false; pintarFiltros(); kPintarSel();
  try { await cargarTienda(); kPintarRejilla(); }
  catch (e) { $('kRejilla').innerHTML = '<p class="vacio">No pude abrir tu tienda. Puedes subir tus fotos o videos.</p>'; }
}
function cerrarKatana() { if (K.tocando) kParar(); kModal.hidden = true; }
$('kCerrar').onclick = cerrarKatana;
kModal.onclick = e => { if (e.target === kModal) cerrarKatana(); };
$('kBusca').oninput = kPintarRejilla;
$('kSubir').onclick = () => $('kArchivos').click();
$('kArchivos').onchange = e => { kSubir([...e.target.files]); e.target.value = ''; };
$('kGrano').onchange = e => { K.grano = e.target.checked; kDibujarVista(0.6); };
$('kFranjas').onchange = e => { K.franjas = e.target.checked; kDibujarVista(0.6); };
$('kTitulo').oninput = e => { K.titulo = e.target.value; kDibujarVista(K.dur - 0.5); };
$('kSub').oninput = e => { K.sub = e.target.value; kDibujarVista(K.dur - 0.5); };
$('kDur').onchange = e => { K.dur = +e.target.value; K.audio = null; kDibujarVista(0.6); };
$('kVer').onclick = kVer;
$('kCrear').onclick = kCrear;
document.querySelectorAll('[data-katana]').forEach(b => b.onclick = e => { e.preventDefault(); abrirKatana(); });
