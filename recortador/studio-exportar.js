// FITWEARMX Studio · exportar el video (MP4 cuadro por cuadro, o en vivo si el navegador no puede).
// Se carga antes del código principal de comercial.html; usa sus variables (P, medios, lienzo, render…) al exportar.

function tipoVideo() {
  const tipos = ['video/mp4;codecs=avc1.640033,mp4a.40.2', 'video/mp4;codecs=avc1.4d0033,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm'];
  return tipos.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
}
// ---------- exportar cuadro por cuadro (no depende de tener la ventana a la vista; aguanta videos 4K del iPhone) ----------
const esperarEvento = (el, ev, ms = 8000) => new Promise(res => { const t = setTimeout(res, ms); el.addEventListener(ev, () => { clearTimeout(t); res(); }, { once: true }); });
async function cuadroListo(t) {
  // pone cada video exactamente en su cuadro y espera a que esté dibujable
  const esperas = [];
  for (const c of P.clips) {
    if (!('src' in c)) continue;
    const m = medios[c.src];
    if (!m || m.tipo !== 'video' || pista(c.pista).audio) continue;
    if (t < c.ini || t >= c.ini + c.dur) continue;
    const el = elemDe(c);
    if (!el.paused) el.pause();
    if (el.readyState < 1) esperas.push(esperarEvento(el, 'loadedmetadata'));
    const obj = Math.min((c.desde || 0) + (t - c.ini), (isFinite(el.duration) ? el.duration : 1e9) - 0.04);
    if (Math.abs(el.currentTime - obj) > 0.001 || el.readyState < 2) {
      esperas.push(new Promise(res => {
        const listo = () => { el.removeEventListener('seeked', listo); res(); };
        el.addEventListener('seeked', listo);
        el.currentTime = obj;
        setTimeout(listo, 4000);
      }));
    }
  }
  await Promise.all(esperas);
}
const decodificados = {};
async function decodificar(m, ac) {
  if (decodificados[m.nombre]) return decodificados[m.nombre];
  try { decodificados[m.nombre] = await ac.decodeAudioData(await (await fetch(m.url)).arrayBuffer()); }
  catch (e) { decodificados[m.nombre] = null; }
  return decodificados[m.nombre];
}
async function mezclarAudio(dur, sr) {
  const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const voces = P.clips.filter(v => v.tipo === 'voz' && medios[v.src]);
  for (const c of P.clips) {
    if (!('src' in c) || !medios[c.src] || muda(c.pista)) continue;
    const vol = c.volumen || 0, m = medios[c.src];
    if (vol <= 0 || m.tipo === 'imagen') continue;
    const buf = await decodificar(m, oc);
    if (!buf) continue;
    const src = oc.createBufferSource(), g = oc.createGain();
    src.buffer = buf; src.connect(g); g.connect(oc.destination);
    g.gain.setValueAtTime(vol, c.ini);
    if (c.tipo === 'musica') {   // se hace a un lado cuando habla el narrador
      for (const v of voces) { g.gain.setTargetAtTime(vol * 0.35, Math.max(0, v.ini - 0.15), 0.05); g.gain.setTargetAtTime(vol, v.ini + v.dur + 0.1, 0.1); }
      if (c.fadeOut > 0) { g.gain.setValueAtTime(vol, Math.max(c.ini, c.ini + c.dur - c.fadeOut)); g.gain.linearRampToValueAtTime(0, c.ini + c.dur); }
    }
    src.start(c.ini, c.desde || 0, c.dur);
  }
  for (const c of P.clips) for (const [t0, tipo] of golpesDe(c)) if (t0 < dur) efecto(oc, oc.destination, tipo, t0, c.volSonido ?? 0.7);
  return oc.startRendering();
}
async function exportarCuadros() {
  const { Muxer, ArrayBufferTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm');
  if (tocando) pausa();
  const fps = P.fps === 60 ? 60 : 30, dur = duracion(), n = Math.ceil(dur * fps), sr = 48000;
  const E = tamCalidad();
  const cfgV = { codec: E > 1 ? 'avc1.640033' : 'avc1.640028', width: W * E, height: H * E, bitrate: E > 1 ? 45e6 : 20e6, framerate: fps };
  if (!(await VideoEncoder.isConfigSupported(cfgV)).supported) cfgV.codec = 'avc1.4d0028';
  exportando = true; posterExp = null; $('bExportar').disabled = true; verVista('editor');
  $('progreso').style.display = 'block'; $('aviso').textContent = 'Mezclando el audio…';
  const audio = await mezclarAudio(dur, sr);
  const muxer = new Muxer({ target: new ArrayBufferTarget(), fastStart: 'in-memory',
    video: { codec: 'avc', width: W * E, height: H * E, frameRate: fps }, audio: { codec: 'aac', numberOfChannels: 2, sampleRate: sr } });
  let error = null;
  const ve = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => error = e });
  ve.configure(cfgV);
  const ae = new AudioEncoder({ output: (ch, meta) => muxer.addAudioChunk(ch, meta), error: e => error = e });
  ae.configure({ codec: 'mp4a.40.2', numberOfChannels: 2, sampleRate: sr, bitrate: 192000 });
  // audio en pedazos de 1024 muestras
  const L0 = audio.getChannelData(0), R0 = audio.getChannelData(1);
  for (let i = 0; i < L0.length; i += 1024) {
    const k = Math.min(1024, L0.length - i), datos = new Float32Array(k * 2);
    datos.set(L0.subarray(i, i + k), 0); datos.set(R0.subarray(i, i + k), k);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(i / sr * 1e6), data: datos });
    ae.encode(ad); ad.close();
  }
  for (let i = 0; i < n && !error; i++) {
    const t = i / fps;
    await cuadroListo(t);
    tAct = t; render(t); reloj();
    if (!posterExp && t > dur * 0.3) posterExp = miniatura();
    const vf = new VideoFrame(lienzo, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / fps) });
    ve.encode(vf, { keyFrame: i % (fps * 2) === 0 }); vf.close();
    if (ve.encodeQueueSize > 8) await new Promise(r => ve.addEventListener('dequeue', r, { once: true }));
    if (i % 10 === 0) $('aviso').textContent = `Exportando cuadro ${i} de ${n}… (puedes dejar la ventana escondida)`;
  }
  await ve.flush(); await ae.flush();
  exportando = false;
  if (error) { $('aviso').textContent = 'No se pudo exportar: ' + error.message; $('bExportar').disabled = false; $('progreso').style.display = 'none'; return; }
  muxer.finalize();
  const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
  const d = new Date(), dos = x => String(x).padStart(2, '0');
  const nom = `comercial-fitwearmx-${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}.mp4`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nom;
  a.textContent = '⬇️ ' + nom + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)';
  $('aviso').innerHTML = '✅ Listo. También quedó en Mis creaciones. '; $('aviso').appendChild(a);
  guardarCreacion(blob, nom);
  a.click();
  $('progreso').style.display = 'none'; $('bExportar').disabled = false;
}
async function exportarMejor() {
  if (window.VideoEncoder && window.AudioEncoder) {
    try { return await exportarCuadros(); }
    catch (e) { console.warn('cuadro por cuadro falló, uso el modo en vivo', e); exportando = false; }
  }
  return exportar();
}

async function exportar() {
  const tipo = tipoVideo();
  if (!tipo) { alert('Este navegador no puede exportar video. Usa Google Chrome actualizado.'); return; }
  if (tocando) pausa();
  audioListo(); await actx.resume();
  irA(0);
  await new Promise(r => setTimeout(r, 600));        // deja que carguen los primeros cuadros
  const stream = lienzo.captureStream(30);
  salidaExp.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
  const partes = [];
  grabadora = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 16e6, audioBitsPerSecond: 256000 });
  grabadora.ondataavailable = e => { if (e.data.size) partes.push(e.data); };
  grabadora.onstop = () => {
    const blob = new Blob(partes, { type: tipo.split(';')[0] });
    const ext = tipo.includes('mp4') ? 'mp4' : 'webm';
    const d = new Date(), dos = n => String(n).padStart(2, '0');
    const nom = `comercial-fitwearmx-${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}.${ext}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nom;
    a.textContent = '⬇️ ' + nom + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)';
    $('aviso').innerHTML = '✅ Listo. También quedó en Mis creaciones. '; $('aviso').appendChild(a);
    guardarCreacion(blob, nom);
    a.click();
    $('progreso').style.display = 'none';
    $('bExportar').disabled = false;
  };
  exportando = true; posterExp = null; $('bExportar').disabled = true;
  verVista('editor');
  $('progreso').style.display = 'block';
  $('aviso').textContent = 'Exportando en tiempo real… no cambies de pestaña ni minimices la ventana.';
  grabadora.start(500);
  play();
}
function terminarExport() {
  exportando = false;
  setTimeout(() => grabadora && grabadora.state !== 'inactive' && grabadora.stop(), 250);
}
