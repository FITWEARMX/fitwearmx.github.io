// FITWEARMX Studio · acciones (agregar, borrar, cortar), grabar voz, botones, teclado y window.Comercial.
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

// ---------- acciones ----------
let subirPara = null;
function agregar(tipo) {
  guardarHist();
  const c = nuevoClip(tipo);
  if (tipo === 'musica') { c.ini = 0; c.dur = r1(Math.max(5, duracion())); }
  if (tipo === 'fondo') { c.ini = 0; c.dur = r1(duracion()); }
  P.clips.push(c); sel = c.id; cambio();
}
function borrar() {
  const i = P.clips.findIndex(c => c.id === sel);
  if (i < 0) return;
  guardarHist(); P.clips.splice(i, 1); sel = null; cambio();
}
function duplicar() {
  const c = P.clips.find(x => x.id === sel);
  if (!c) return;
  guardarHist();
  const n = { ...structuredClone(c), id: 'c' + (sigId++), ini: r1(c.ini + c.dur) };
  P.clips.push(n); sel = n.id; cambio();
}
function cortar() {
  const c = P.clips.find(x => x.id === sel && tAct > x.ini + 0.05 && tAct < x.ini + x.dur - 0.05)
    || P.clips.find(x => tAct > x.ini + 0.05 && tAct < x.ini + x.dur - 0.05 && x.pista === (P.clips.find(y => y.id === sel) || {}).pista);
  if (!c) { $('aviso').textContent = 'Pon la línea roja encima del bloque que quieres cortar.'; return; }
  guardarHist();
  const corte = r1(tAct), fin = c.ini + c.dur;
  const n = { ...structuredClone(c), id: 'c' + (sigId++), ini: corte, dur: r1(fin - corte) };
  if ('desde' in c) n.desde = r1((c.desde || 0) + (corte - c.ini));
  if (c.tipo === 'celular') n.entrada = 'nada';
  c.dur = r1(corte - c.ini);
  P.clips.push(n); sel = n.id; cambio();
}

$('bPlay').onclick = play;
$('bInicio').onclick = () => irA(0);
$('bExportar').onclick = exportarMejor;
$('bCortar').onclick = cortar;
$('bDuplicar').onclick = duplicar;
$('bBorrar').onclick = borrar;
$('bDeshacer').onclick = deshacer;
$('bSubir').onclick = () => { subirPara = null; $('fMedios').click(); };
$('bRitmo').onclick = () => { audioListo(); ritmoAlProyecto(120); };
let grabVoz = null;
$('bGrabar').onclick = async () => {
  if (grabVoz) { grabVoz.stop(); return; }
  let mic;
  try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e) { alert('Necesito permiso del micrófono para grabar tu voz.'); return; }
  const partes = [], ini = tAct;
  grabVoz = new MediaRecorder(mic);
  grabVoz.ondataavailable = e => e.data.size && partes.push(e.data);
  grabVoz.onstop = async () => {
    mic.getTracks().forEach(t => t.stop());
    grabVoz = null; $('bGrabar').textContent = '🎙 Grabar mi voz';
    const tipo = partes[0] ? partes[0].type : 'audio/webm';
    const n = await agregarArchivo(new File(partes, 'mi-voz-' + Date.now() + (tipo.includes('mp4') ? '.m4a' : '.webm'), { type: tipo }));
    guardarHist();
    const c = nuevoClip('voz', { src: n, ini: r1(ini), dur: r1(Math.max(0.5, medios[n].dur || 3)) });
    P.clips.push(c); sel = c.id; cambio();
  };
  grabVoz.start();
  $('bGrabar').textContent = '⏹ Parar grabación';
  $('aviso').textContent = 'Grabando… habla con calma y toca "Parar" al terminar.';
};
$('bNuevo').onclick = () => { if (confirm('¿Empezar un comercial vacío? (Puedes deshacer)')) { guardarHist(); P = { clips: [], ocultas: [], mudas: [] }; sel = null; tAct = 0; cambio(); } };
$('bPlantilla').onclick = () => { if (!P.clips.length || confirm('¿Cambiar lo que tienes por la plantilla "Cómo comprar"? (Puedes deshacer)')) { guardarHist(); cargar(plantilla()); } };
$('bGuardar').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 1)], { type: 'application/json' }));
  a.download = 'comercial.json'; a.click();
  $('aviso').textContent = 'Guardado. Los videos no van dentro: al abrirlo, vuelve a subirlos con el mismo nombre.';
};
$('bAbrir').onclick = () => $('fProyecto').click();
$('fProyecto').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try { guardarHist(); cargar(JSON.parse(await f.text())); } catch (err) { alert('Ese archivo no es un proyecto del Editor Comercial.'); }
};
$('fMedios').onchange = async e => {
  const fs = [...e.target.files]; e.target.value = '';
  // si un bloque ya pedía un archivo con ese nombre, se reconecta solo
  const nombres = [];
  for (const f of fs) nombres.push(await agregarArchivo(f, P.clips.some(c => c.src === f.name) ? f.name : undefined));
  if (subirPara && nombres[0]) { guardarHist(); subirPara.c[subirPara.k] = nombres[0]; subirPara = null; }
  cambio();
};
document.querySelectorAll('[data-agregar]').forEach(b => b.onclick = () => agregar(b.dataset.agregar));
$('selLook').onchange = e => { guardarHist(); P.look = e.target.value; cambio(); };
$('selCalidad').onchange = e => { P.calidad = e.target.value; render(tAct); autoguardar(); };
$('selFps').onchange = e => { P.fps = +e.target.value; autoguardar(); };
$('colTono').oninput = e => { P.tono = e.target.value; render(tAct); autoguardar(); };
$('zoomTL').oninput = e => { pps = +e.target.value; pintarTL(); };
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); play(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); borrar(); }
  else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); deshacer(); }
  else if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey) cortar();
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const c = P.clips.find(x => x.id === sel), d = (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 0.1);
    if (c) { guardarHist(); c.ini = r1(Math.max(0, c.ini + d)); cambio(); } else irA(tAct + d);
    e.preventDefault();
  }
});

// Para que Claude (o cualquier script) pueda armar comerciales solo.
window.Comercial = {
  get proyecto() { return P; },
  cargar, plantilla, exportar: exportarMejor, exportarEnVivo: exportar, irA, render, refrescar: cambio, crearRitmo, ritmoAlProyecto,
  async agregarMedio(url, nombre) {
    const blob = await (await fetch(url)).blob();
    const n = nombre || decodeURIComponent(url.split('/').pop().split('?')[0]) || 'archivo';
    return agregarArchivo(new File([blob], n, { type: blob.type }), n);
  },
};
