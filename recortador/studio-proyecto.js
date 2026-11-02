// FITWEARMX Studio · archivos subidos, historial (deshacer), autoguardado y plantilla.
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

// ---------- archivos ----------
function nombreLibre(n) {
  if (!medios[n]) return n;
  let i = 2; const [base, ext] = n.includes('.') ? [n.slice(0, n.lastIndexOf('.')), n.slice(n.lastIndexOf('.'))] : [n, ''];
  while (medios[`${base} (${i})${ext}`]) i++;
  return `${base} (${i})${ext}`;
}
function tipoArchivo(f) {
  if (f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name)) return 'imagen';
  if (f.type.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg)$/i.test(f.name)) return 'audio';
  return 'video';
}
function agregarArchivo(f, nombre) {
  return new Promise(res => {
    const tipo = tipoArchivo(f), n = nombre || nombreLibre(f.name);
    const m = { nombre: n, tipo, url: URL.createObjectURL(f), dur: 0 };
    medios[n] = m;
    const listo = () => { pintarMedios(); render(tAct); res(n); };
    if (tipo === 'imagen') { m.img = new Image(); m.img.onload = listo; m.img.onerror = listo; m.img.src = m.url; }
    else {
      const el = document.createElement(tipo === 'audio' ? 'audio' : 'video');
      el.preload = 'metadata'; el.muted = true;
      el.onloadedmetadata = () => { m.dur = isFinite(el.duration) ? el.duration : 0; if (tipo === 'video') { m.w = el.videoWidth; m.h = el.videoHeight; } listo(); };
      el.onerror = listo; el.src = m.url;
    }
  });
}
function pintarMedios() {
  const lista = Object.values(medios);
  $('mediosVacio').style.display = lista.length ? 'none' : '';
  $('medios').innerHTML = '';
  for (const m of lista) {
    const d = document.createElement('div');
    d.className = 'medio'; d.title = 'Meterlo en la línea roja';
    const mini = document.createElement('div'); mini.className = 'mini';
    if (m.tipo === 'imagen') mini.style.backgroundImage = `url("${m.url}")`;
    else mini.textContent = m.tipo === 'audio' ? '🎵' : '🎬';
    d.append(mini);
    d.insertAdjacentHTML('beforeend', `<b></b><span>${m.tipo === 'imagen' ? 'foto' : fmt(m.dur)}</span>`);
    d.querySelector('b').textContent = m.nombre;
    d.onclick = () => meterMedio(m);
    $('medios').append(d);
  }
}
function meterMedio(m) {
  guardarHist();
  const c = m.tipo === 'audio'
    ? nuevoClip(/voz|narr/i.test(m.nombre) ? 'voz' : 'musica', { src: m.nombre, dur: r1(Math.max(0.5, Math.min(m.dur || 20, 60))) })
    : nuevoClip('video', { src: m.nombre, dur: m.tipo === 'imagen' ? 2.5 : r1(Math.max(0.5, Math.min(m.dur || 3, 4))) });
  P.clips.push(c); sel = c.id; cambio();
}

// ---------- historial y guardado ----------
function guardarHist() { hist.push(JSON.stringify(P)); if (hist.length > 80) hist.shift(); }
function deshacer() { if (!hist.length) return; P = JSON.parse(hist.pop()); if (!P.clips.find(c => c.id === sel)) sel = null; cambio(); }
let tGuardar = 0;
function autoguardar() {
  clearTimeout(tGuardar);
  tGuardar = setTimeout(() => { try { localStorage.setItem('comercial-proyecto', JSON.stringify(P)); } catch (e) {} }, 400);
}
function cargar(obj) {
  P = { clips: [], ocultas: [], mudas: [], ...obj };
  for (const c of P.clips) {
    c.id = 'c' + (sigId++);
    const T = TIPOS[c.tipo];
    if (T) for (const k in T.def) if (!(k in c)) c[k] = structuredClone(T.def[k]);
  }
  sel = null; tAct = 0; cambio();
}
function cambio() { pintarTL(); pintarInspector(); irA(tAct); autoguardar(); if ($('selLook')) $('selLook').value = P.look === 'normal' ? 'normal' : 'cine'; }

// ---------- plantilla ----------
function plantilla() {
  const v = (ini, dur, nota, extra = {}) => ({ tipo: 'video', pista: 'V1', ini, dur, nota, zoomIni: 1, zoomFin: 1.12, fadeIn: 0.05, fadeOut: 0.05, ...extra });
  const tx = (ini, dur, texto, extra = {}) => ({ tipo: 'texto', pista: 'T1', ini, dur, texto, ...extra });
  return { clips: [
    { tipo: 'fondo', pista: 'V1', ini: 0, dur: 23, color1: '#2a1550', color2: '#030207' },
    v(0, 1, 'Clip paquete 1 (llegando)'), v(1, 1, 'Clip paquete 2 (abriendo)'), v(2, 1, 'Clip paquete 3 (la prenda)'),
    tx(0.2, 2.8, 'Llegó.', { tam: 210, y: 960, brillo: 'rgba(0,0,0,.6)' }),
    tx(3, 1.7, '¿Lo quieres?', { tam: 140, y: 300 }),
    { tipo: 'celular', pista: 'V2', ini: 3.4, dur: 6, nota: 'Tu grabación de pantalla comprando en la tienda', y: 140 },
    { tipo: 'celular', pista: 'V2', ini: 9.4, dur: 4.2, nota: 'Tu grabación de pantalla (sigue)', desde: 6, y: 140, entrada: 'nada', zoomFin: 1.3, focoY: 0.85, fadeOut: 0.3 },
    tx(4.8, 1.6, 'Elige.', { y: 250 }), tx(6.4, 1.5, 'Tu talla.', { y: 250 }),
    tx(7.9, 1.7, 'Ordena con anticipo.', { tam: 105, y: 250, linea: 'si' }),
    { tipo: 'boton', pista: 'FX', ini: 10.6, dur: 2.8, y: 1700 },
    { tipo: 'notificacion', pista: 'FX', ini: 13, dur: 2.6 },
    v(13.6, 1.4, 'Clip paquete 4 (en tu puerta)'), v(15, 1.4, 'Clip paquete 5 (en tus manos)'),
    tx(13.8, 2.6, 'Te llega a tu puerta.', { tam: 120, y: 1500, brillo: 'rgba(0,0,0,.6)' }),
    tx(16.4, 1.8, 'Todo lo que te gusta.', { tam: 120, y: 900 }),
    tx(18.2, 1.8, 'De YoungLA a Darc Sport.', { tam: 105, y: 900, linea: 'si' }),
    { tipo: 'logo', pista: 'FX', ini: 20, dur: 3 },
    { tipo: 'musica', pista: 'A1', ini: 0, dur: 23 },
  ] };
}
