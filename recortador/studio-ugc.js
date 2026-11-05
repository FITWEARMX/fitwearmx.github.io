// FITWEARMX Studio · UGC: arma un video "me llegó mi pedido" con clips grabados con el celular.
// Se carga después de studio-katana.js; usa crearRitmo (studio-ritmo), abrirDB (studio-creaciones) y $ (studio-base).
// Gancho arriba, subtítulos palabra por palabra, cortes rápidos, voz original + ritmo bajito, cierre "Ordena con anticipo".

const UW = 1080, UH = 1920, UFPS = 30;
const UGUION = [
  { txt: 'Pedí esto desde USA sin salir de Monterrey…', dur: 2.5, tipo: 'gancho' },
  { txt: '', dur: 3, tipo: 'normal' },
  { txt: 'Miren la tela, es original', dur: 3, tipo: 'normal' },
  { txt: 'Y el fit está brutal', dur: 4, tipo: 'normal' },
  { txt: 'Llegó en 2 semanas y me la trajeron a la casa', dur: 3, tipo: 'normal' },
  { txt: 'Ordena con anticipo', dur: 3, tipo: 'cierre' },
];
const U = { tomas: UGUION.map(g => ({ ...g, m: null })), ritmo: true, mezcla: null, tocando: false, raf: 0, ac: null, fuente: null };
const uc = document.createElement('canvas'); uc.width = UW; uc.height = UH;
const ux = uc.getContext('2d');

// ---------- ventana ----------
const uEstilo = document.createElement('style');
uEstilo.textContent = `
.u-fila{display:grid;grid-template-columns:28px 64px 1fr 64px;gap:8px;align-items:center;margin-bottom:8px}
.u-fila b{color:var(--text-muted);font-size:.8rem;text-align:center}
.u-mini{width:64px;height:64px;border-radius:10px;background:#222 center/cover;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:var(--text-muted);cursor:pointer;border:1px dashed var(--border);overflow:hidden}
.u-mini video{width:100%;height:100%;object-fit:cover}
.u-fila input{margin:0}
.u-fila input[type=number]{padding:8px 4px;text-align:center}
.u-etq{font-size:.68rem;color:var(--accent-2);display:block;margin-bottom:2px}`;
document.head.append(uEstilo);

const uModal = document.createElement('div');
uModal.className = 'modal'; uModal.hidden = true;
uModal.innerHTML = `
<div class="modal-caja k-caja">
  <div class="modal-top"><b>📱 UGC · "me llegó mi pedido"</b><span style="flex:1"></span><button type="button" id="uCerrar">Cerrar</button></div>
  <div class="k-cuerpo">
    <div>
      <h4>1 · Tus clips en orden (toca el cuadrito para subir)</h4>
      <div class="k-acc" style="margin:0 0 10px"><button type="button" id="uVarios">＋ Subir varios de un jalón</button></div>
      <div id="uFilas"></div>
      <p class="vacio">Segundos = cuánto dura cada toma. Si una toma no tiene clip, se salta (menos el cierre, que sale en negro).</p>
      <input type="file" id="uArchivo" accept="video/*,image/*,.mov,.mp4,.m4v" hidden>
      <input type="file" id="uArchivos" accept="video/*,image/*,.mov,.mp4,.m4v" multiple hidden>
    </div>
    <div class="k-vista">
      <h4>2 · Música</h4>
      <div class="k-opc"><label><input type="checkbox" id="uRitmo" checked> Ritmo bajito de fondo (sin derechos)</label></div>
      <canvas id="uLienzo" width="540" height="960" style="margin-top:10px"></canvas>
      <p class="vacio" id="uAviso">Sube al menos 2 clips.</p>
      <div class="k-acc"><button type="button" id="uVer">▶ Vista previa</button><button type="button" class="pri" id="uCrear">Crear MP4 📱</button></div>
    </div>
  </div>
</div>`;
document.body.append(uModal);
const uv = $('uLienzo').getContext('2d');
const uAviso = t => { $('uAviso').textContent = t; };

let uFilaSubir = 0;
function uPintarFilas() {
  $('uFilas').innerHTML = '';
  U.tomas.forEach((t, i) => {
    const f = document.createElement('div'); f.className = 'u-fila';
    const etq = t.tipo === 'gancho' ? 'Gancho (arriba)' : t.tipo === 'cierre' ? 'Cierre (al centro)' : 'Subtítulo';
    f.innerHTML = `<b>${i + 1}</b><div class="u-mini">＋ clip</div><div><span class="u-etq">${etq}</span><input class="k-campo" maxlength="70"></div><input class="k-campo" type="number" min="1" max="10" step="0.5" title="Segundos">`;
    const mini = f.querySelector('.u-mini');
    if (t.m) {
      mini.textContent = ''; mini.style.borderStyle = 'solid';
      if (t.m.img) mini.style.backgroundImage = `url("${t.m.img.src}")`;
      else { const v = document.createElement('video'); v.src = t.m.vid.src; v.muted = true; mini.append(v); }
    }
    mini.onclick = () => { uFilaSubir = i; $('uArchivo').click(); };
    const [txt, seg] = f.querySelectorAll('input');
    txt.value = t.txt; txt.placeholder = t.tipo === 'normal' ? '(sin texto)' : '';
    txt.oninput = () => { t.txt = txt.value; uDibujarVista(uInicio(i) + t.dur * 0.6); };
    seg.value = t.dur; seg.onchange = () => { t.dur = Math.min(10, Math.max(1, +seg.value || 3)); U.mezcla = null; };
    $('uFilas').append(f);
  });
}

// ---------- material ----------
async function uCargar(f) {
  const url = URL.createObjectURL(f);
  if (f.type.startsWith('image')) return { img: await kCargarImg(url), archivo: f };
  return { vid: await kCargarVideo(url), archivo: f };
}
async function uPoner(i, f) {
  try { U.tomas[i].m = await uCargar(f); U.mezcla = null; }
  catch (e) { uAviso('No pude abrir ' + f.name); }
}
$('uArchivo').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (f) { await uPoner(uFilaSubir, f); uPintarFilas(); uListo(); }
};
$('uArchivos').onchange = async e => {
  const fs = [...e.target.files].sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })); e.target.value = '';
  let i = 0;
  for (const f of fs) { while (i < U.tomas.length && U.tomas[i].m) i++; if (i >= U.tomas.length) break; await uPoner(i++, f); }
  uPintarFilas(); uListo();
};
$('uVarios').onclick = () => $('uArchivos').click();
function uListo() {
  const n = U.tomas.filter(t => t.m).length;
  uAviso(n < 2 ? `Llevas ${n} clip(s). Sube al menos 2.` : `Listo: ${n} clips · ${uDur().toFixed(1)} s.`);
  uDibujarVista(1);
}

// ---------- línea de tiempo ----------
const uActivas = () => U.tomas.filter(t => t.m || t.tipo === 'cierre');
const uDur = () => uActivas().reduce((s, t) => s + t.dur, 0);
function uInicio(i) { let s = 0; for (const t of uActivas()) { if (t === U.tomas[i]) return s; s += t.dur; } return 0; }
function uEn(t) {
  let s = 0;
  for (const tm of uActivas()) { if (t < s + tm.dur) return { tm, tl: t - s }; s += tm.dur; }
  const a = uActivas(); return a.length ? { tm: a[a.length - 1], tl: a[a.length - 1].dur } : null;
}

// ---------- dibujo ----------
function uClip(tm, tl) {
  const m = tm.m; if (!m) return false;
  const src = m.vid || m.img, w = m.vid ? m.vid.videoWidth : m.img.naturalWidth, h = m.vid ? m.vid.videoHeight : m.img.naturalHeight;
  if (!w) return false;
  // golpe de zoom al entrar + acercamiento suave
  const golpe = Math.max(0, 1 - tl / 0.25) * 0.07, s = Math.max(UW / w, UH / h) * (1.02 + 0.05 * Math.min(1, tl / tm.dur) + golpe);
  ux.drawImage(src, (UW - w * s) / 2, (UH - h * s) / 2, w * s, h * s);
  return true;
}
function uCaja(lineas, y, tam, fondo, color) {
  ux.font = `800 ${tam}px Inter, system-ui, sans-serif`; ux.textAlign = 'center'; ux.textBaseline = 'middle';
  const alto = tam * 1.25;
  lineas.forEach((l, k) => {
    const w = ux.measureText(l).width + tam * 0.7, yy = y + k * alto;
    ux.fillStyle = fondo; uRedondo(UW / 2 - w / 2, yy - alto / 2, w, alto, 18); ux.fill();
    ux.fillStyle = color; ux.fillText(l, UW / 2, yy + 2);
  });
}
function uRedondo(x, y, w, h, r) { ux.beginPath(); ux.roundRect ? ux.roundRect(x, y, w, h, r) : ux.rect(x, y, w, h); }
function uPartir(txt, tam, max) {
  ux.font = `800 ${tam}px Inter, system-ui, sans-serif`;
  const out = []; let l = '';
  for (const p of txt.split(/\s+/)) { const n = l ? l + ' ' + p : p; if (ux.measureText(n).width > max && l) { out.push(l); l = p; } else l = n; }
  if (l) out.push(l); return out;
}
// subtítulo estilo TikTok: grupos de 3 palabras, la palabra actual en amarillo
function uSubtitulo(txt, tl, dur) {
  const ps = txt.split(/\s+/).filter(Boolean); if (!ps.length) return;
  const k = Math.min(ps.length - 1, Math.floor(tl / (dur * 0.85) * ps.length)), g = Math.floor(k / 3) * 3;
  const grupo = ps.slice(g, g + 3), tam = 86;
  ux.font = `900 ${tam}px Inter, system-ui, sans-serif`; ux.textBaseline = 'middle'; ux.textAlign = 'left';
  const esp = tam * 0.28, anchos = grupo.map(p => ux.measureText(p).width), total = anchos.reduce((a, b) => a + b, 0) + esp * (grupo.length - 1);
  let x = (UW - total) / 2; const y = UH * 0.68;
  grupo.forEach((p, j) => {
    const act = g + j === k, sal = act ? 1 + Math.max(0, 0.15 - ((tl / (dur * 0.85) * ps.length) % 1) * 0.3) : 1;
    ux.save(); ux.translate(x + anchos[j] / 2, y); ux.scale(sal, sal);
    ux.lineWidth = 14; ux.lineJoin = 'round'; ux.strokeStyle = '#000'; ux.strokeText(p, -anchos[j] / 2, 0);
    ux.fillStyle = act ? '#ffe14d' : '#fff'; ux.fillText(p, -anchos[j] / 2, 0);
    ux.restore(); x += anchos[j] + esp;
  });
}
function uCuadro(t) {
  ux.fillStyle = '#000'; ux.fillRect(0, 0, UW, UH);
  const e = uEn(t);
  if (!e) { uCaja(['Sube tus clips'], UH / 2, 70, '#fff', '#000'); return; }
  const { tm, tl } = e, hay = uClip(tm, tl);
  if (tm.tipo === 'gancho' && tm.txt) {
    const a = Math.min(1, tl / 0.15);
    ux.save(); ux.globalAlpha = a; uCaja(uPartir(tm.txt, 70, UW * 0.8), UH * 0.2, 70, '#fff', '#000'); ux.restore();
  } else if (tm.tipo === 'cierre') {
    if (hay) { ux.fillStyle = 'rgba(0,0,0,.45)'; ux.fillRect(0, 0, UW, UH); }
    const a = Math.min(1, tl / 0.3);
    ux.save(); ux.globalAlpha = a;
    if (tm.txt) uCaja(uPartir(tm.txt, 84, UW * 0.8), UH / 2 - 40, 84, '#ffe14d', '#000');
    ux.font = '700 54px Inter, system-ui, sans-serif'; ux.fillStyle = '#fff'; ux.textAlign = 'center';
    ux.lineWidth = 10; ux.strokeStyle = '#000'; ux.strokeText('@fitwear.mty', UW / 2, UH / 2 + 110); ux.fillText('@fitwear.mty', UW / 2, UH / 2 + 110);
    ux.restore();
  } else if (tm.txt) uSubtitulo(tm.txt, tl, tm.dur);
}
function uDibujarVista(t) { uCuadro(t); uv.drawImage(uc, 0, 0, 540, 960); }

// videos al momento correcto (exacto para exportar, aproximado para la vista previa)
function uMomento(t, exacto) {
  const e = uEn(t), proms = [];
  for (const tm of U.tomas) {
    const v = tm.m && tm.m.vid; if (!v) continue;
    if (!e || e.tm !== tm) { if (!v.paused) v.pause(); continue; }
    const obj = Math.min(e.tl, Math.max(0, (v.duration || 1) - 0.05));
    if (exacto) { if (Math.abs(v.currentTime - obj) > 0.005) proms.push(new Promise(r => { v.addEventListener('seeked', r, { once: true }); v.currentTime = obj; })); }
    else { if (Math.abs(v.currentTime - obj) > 0.25) v.currentTime = obj; if (v.paused && obj < v.duration - 0.1) v.play().catch(() => {}); }
  }
  return Promise.all(proms);
}

// ---------- audio: voz original de cada clip + ritmo bajito ----------
async function uMezcla() {
  if (U.mezcla) return U.mezcla;
  uAviso('Preparando el audio…');
  const sr = 48000, dur = uDur(), oc = new OfflineAudioContext(2, Math.ceil(sr * (dur + 0.1)), sr);
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  let s = 0;
  for (const tm of uActivas()) {
    if (tm.m && tm.m.vid) {
      try {
        const buf = await ac.decodeAudioData(await tm.m.archivo.arrayBuffer());
        const src = oc.createBufferSource(), g = oc.createGain(); src.buffer = buf;
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(1, s + 0.03);
        g.gain.setValueAtTime(1, s + tm.dur - 0.04); g.gain.linearRampToValueAtTime(0, s + tm.dur);
        src.connect(g); g.connect(oc.destination); src.start(s, 0, tm.dur);
      } catch (e) { console.warn('clip sin audio', e); }
    }
    s += tm.dur;
  }
  if (U.ritmo) {
    try {
      const buf = await ac.decodeAudioData(await (await crearRitmo(120, Math.ceil(dur + 1))).arrayBuffer());
      const src = oc.createBufferSource(), g = oc.createGain(); src.buffer = buf;
      g.gain.setValueAtTime(0.18, 0); g.gain.setValueAtTime(0.18, Math.max(0, dur - 0.8)); g.gain.linearRampToValueAtTime(0, dur);
      src.connect(g); g.connect(oc.destination); src.start(0);
    } catch (e) { console.warn('sin ritmo', e); }
  }
  ac.close();
  U.mezcla = await oc.startRendering();
  return U.mezcla;
}

// ---------- vista previa ----------
async function uVer() {
  if (U.tocando) return uParar();
  if (U.tomas.filter(t => t.m).length < 2) { uAviso('Sube al menos 2 clips.'); return; }
  const buf = await uMezcla(), dur = uDur();
  U.ac = new (window.AudioContext || window.webkitAudioContext)();
  U.fuente = U.ac.createBufferSource(); U.fuente.buffer = buf; U.fuente.connect(U.ac.destination);
  const t0 = U.ac.currentTime + 0.05; U.fuente.start(t0);
  U.tocando = true; $('uVer').textContent = '■ Parar'; uAviso('Viendo…');
  const paso = () => {
    const t = Math.max(0, U.ac.currentTime - t0);
    if (t >= dur) return uParar();
    uMomento(t, false); uDibujarVista(t);
    U.raf = requestAnimationFrame(paso);
  };
  paso();
}
function uParar() {
  cancelAnimationFrame(U.raf); U.tocando = false; $('uVer').textContent = '▶ Vista previa';
  try { U.fuente && U.fuente.stop(); U.ac && U.ac.close(); } catch (e) {}
  for (const tm of U.tomas) if (tm.m && tm.m.vid) tm.m.vid.pause();
  uListo();
}

// ---------- exportar MP4 ----------
async function uCrear() {
  if (U.tomas.filter(t => t.m).length < 2) { uAviso('Sube al menos 2 clips.'); return; }
  if (!window.VideoEncoder || !window.AudioEncoder) { alert('Para crear el MP4 usa Google Chrome en la Mac.'); return; }
  if (U.tocando) uParar();
  $('uCrear').disabled = true; $('uVer').disabled = true;
  try {
    const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm');
    const buf = await uMezcla(), sr = buf.sampleRate, dur = uDur(), n = Math.ceil(dur * UFPS);
    const cfgV = { codec: 'avc1.640028', width: UW, height: UH, bitrate: 14e6, framerate: UFPS };
    if (!(await VideoEncoder.isConfigSupported(cfgV)).supported) cfgV.codec = 'avc1.4d0028';
    const muxer = new Muxer({ target: new ArrayBufferTarget(), fastStart: 'in-memory',
      video: { codec: 'avc', width: UW, height: UH, frameRate: UFPS }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: sr } });
    let error = null;
    const ve = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => error = e });
    ve.configure(cfgV);
    const ae = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: e => error = e });
    ae.configure({ codec: 'mp4a.40.2', numberOfChannels: 2, sampleRate: sr, bitrate: 192000 });
    const largo = Math.floor(dur * sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
    for (let i = 0; i < largo; i += 1024) {
      const k = Math.min(1024, largo - i), datos = new Float32Array(k * 2);
      datos.set(L.subarray(i, i + k), 0); datos.set(R.subarray(i, i + k), k);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(i / sr * 1e6), data: datos });
      ae.encode(ad); ad.close();
    }
    for (const tm of U.tomas) if (tm.m && tm.m.vid) tm.m.vid.pause();
    let poster = null;
    for (let i = 0; i < n && !error; i++) {
      const t = i / UFPS;
      await uMomento(t, true);
      uCuadro(t);
      if (i % 3 === 0) uv.drawImage(uc, 0, 0, 540, 960);
      if (!poster && t > dur * 0.4) { const m = document.createElement('canvas'); m.width = 270; m.height = 480; m.getContext('2d').drawImage(uc, 0, 0, 270, 480); poster = m.toDataURL('image/jpeg', 0.7); }
      const vf = new VideoFrame(uc, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / UFPS) });
      ve.encode(vf, { keyFrame: i % (UFPS * 2) === 0 }); vf.close();
      if (ve.encodeQueueSize > 8) await new Promise(r => ve.addEventListener('dequeue', r, { once: true }));
      if (i % 10 === 0) uAviso(`Creando cuadro ${i} de ${n}…`);
    }
    await ve.flush(); await ae.flush();
    if (error) throw error;
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    const d = new Date(), dos = x => String(x).padStart(2, '0');
    const nom = `ugc-fitwearmx-${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}.mp4`;
    try {
      const db = await abrirDB();
      db.transaction('creaciones', 'readwrite').objectStore('creaciones').put({ id: Date.now(), nombre: nom, fecha: d.toISOString(), blob, poster, dur, modo: 'UGC' });
    } catch (e) { console.warn('no se guardó en creaciones', e); }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom;
    a.textContent = '⬇️ ' + nom + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)';
    $('uAviso').innerHTML = '✅ Listo. También quedó en Mis creaciones. '; $('uAviso').append(a);
    a.click();
  } catch (e) {
    console.warn('ugc', e); uAviso('No se pudo crear: ' + (e.message || e) + '. Prueba en Chrome de la Mac.');
  }
  $('uCrear').disabled = false; $('uVer').disabled = false;
}

// ---------- abrir / eventos ----------
function abrirUGC() { uModal.hidden = false; uPintarFilas(); uListo(); }
function cerrarUGC() { if (U.tocando) uParar(); uModal.hidden = true; }
$('uCerrar').onclick = cerrarUGC;
uModal.onclick = e => { if (e.target === uModal) cerrarUGC(); };
$('uRitmo').onchange = e => { U.ritmo = e.target.checked; U.mezcla = null; };
$('uVer').onclick = uVer;
$('uCrear').onclick = uCrear;
document.querySelectorAll('[data-ugc]').forEach(b => b.onclick = e => { e.preventDefault(); abrirUGC(); });
