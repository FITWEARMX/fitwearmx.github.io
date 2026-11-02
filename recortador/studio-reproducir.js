// FITWEARMX Studio · videos y sonido sincronizados, reproducir y pausa.
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

// ---------- videos y sonido ----------
function audioListo() {
  if (actx) return;
  actx = new AudioContext();
  salidaExp = actx.createMediaStreamDestination();
  for (const e of elems.values()) conectar(e);
}
function conectar(e) {
  if (!actx || e.gain) return;
  const s = actx.createMediaElementSource(e.el);
  e.gain = actx.createGain();
  s.connect(e.gain); e.gain.connect(actx.destination); e.gain.connect(salidaExp);
  e.el.muted = false;
}
function elemDe(c) {
  const m = medios[c.src];
  if (!m || m.tipo === 'imagen') return null;
  let e = elems.get(c.id);
  if (!e || e.src !== c.src) {
    if (e) e.el.pause();
    const el = document.createElement(m.tipo === 'audio' ? 'audio' : 'video');
    el.src = m.url; el.preload = 'auto'; el.playsInline = true; el.muted = !actx;
    const repintar = () => { if (!tocando) render(tAct); };
    el.addEventListener('seeked', repintar); el.addEventListener('loadeddata', repintar);
    e = { src: c.src, el, gain: null };
    elems.set(c.id, e);
    conectar(e);
  }
  return e.el;
}
function sincronizar(t, corre) {
  const vivos = new Set();
  for (const c of P.clips) {
    if (!('src' in c)) continue;
    const m = medios[c.src];
    if (!m || m.tipo === 'imagen') continue;
    const el = elemDe(c), e = elems.get(c.id);
    vivos.add(c.id);
    const activo = t >= c.ini && t < c.ini + c.dur && !(oculta(c.pista) && !pista(c.pista).audio);
    const obj = (c.desde || 0) + (t - c.ini);
    let vol = c.volumen || 0;
    if (c.tipo === 'musica' && c.fadeOut > 0) vol *= clamp((c.ini + c.dur - t) / c.fadeOut);
    // la música se hace a un lado cuando habla el narrador
    if (c.tipo === 'musica' && P.clips.some(v => v.tipo === 'voz' && medios[v.src] && t >= v.ini - 0.15 && t < v.ini + v.dur + 0.25)) vol *= 0.35;
    if (muda(c.pista)) vol = 0;
    if (e.gain) e.gain.gain.value = vol; else el.volume = clamp(vol);
    const fin = isFinite(el.duration) ? el.duration - 0.05 : Infinity;
    if (activo && corre) {
      if (obj >= fin) { if (!el.paused) el.pause(); }
      else if (el.paused) { if (Math.abs(el.currentTime - obj) > 0.12) el.currentTime = obj; el.play().catch(() => {}); }
      else if (Math.abs(el.currentTime - obj) > 0.25) el.currentTime = obj;
    } else {
      if (!el.paused) el.pause();
      if (activo && Math.abs(el.currentTime - Math.min(obj, fin)) > 0.03) el.currentTime = Math.min(obj, fin);
      else if (!activo && corre && c.ini > t && c.ini - t < 1.5 && Math.abs(el.currentTime - (c.desde || 0)) > 0.05 && !el.seeking) el.currentTime = c.desde || 0;
    }
  }
  for (const [id, e] of elems) if (!vivos.has(id)) { e.el.pause(); elems.delete(id); }
}

// ---------- reproducir y exportar ----------
function reloj() {
  $('reloj').textContent = fmt(tAct) + ' / ' + fmt(duracion());
  $('cabezalTL') && ($('cabezalTL').style.left = (tAct * pps) + 'px');
  if (exportando) {
    $('progreso').firstElementChild.style.width = (tAct / duracion() * 100) + '%';
    if (!posterExp && tAct > duracion() * 0.3) posterExp = miniatura();
  }
}
function irA(t) {
  tAct = clamp(t, 0, duracion());
  sincronizar(tAct, tocando);
  render(tAct); reloj();
}
function play() {
  if (tocando) return pausa();
  audioListo(); actx.resume();
  if (tAct >= duracion() - 0.05) tAct = 0;
  tocando = true; $('bPlay').textContent = '⏸ Pausa';
  const t0 = performance.now() - tAct * 1000;
  let tPrevio = tAct - 0.001;
  const paso = () => {
    if (!tocando) return;
    tAct = (performance.now() - t0) / 1000;
    if (tAct >= duracion()) { tAct = duracion(); pausa(); if (exportando) terminarExport(); return; }
    for (const c of P.clips) for (const [g0, tipo] of golpesDe(c)) if (g0 > tPrevio && g0 <= tAct) efecto(actx, actx.destination, tipo, actx.currentTime + 0.01, c.volSonido ?? 0.7);
    tPrevio = tAct;
    sincronizar(tAct, true); render(tAct); reloj();
    raf = requestAnimationFrame(paso);
  };
  paso();
}
function pausa() {
  tocando = false; cancelAnimationFrame(raf);
  $('bPlay').textContent = '▶ Ver';
  sincronizar(tAct, false); render(tAct); reloj();
}
