// FITWEARMX Studio · línea de tiempo e inspector.
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

// ---------- línea de tiempo ----------
const ordenFilas = () => [...PISTAS.filter(p => !p.audio).reverse(), ...PISTAS.filter(p => p.audio)];
function etiqueta(c) {
  if (c.tipo === 'texto') return c.texto.replace(/\n/g, ' ');
  if (c.tipo === 'voz' && c.guion) return c.guion;
  if (c.tipo === 'notificacion') return c.titulo;
  if (c.tipo === 'boton') return c.texto;
  if (c.tipo === 'logo') return c.texto;
  if ('src' in c) return c.src || c.nota || 'falta archivo';
  return TIPOS[c.tipo].nombre;
}
function pintarTL() {
  const filas = ordenFilas();
  const largo = Math.max(duracion() + 6, 30);
  $('tlNombres').innerHTML = '<div class="regla-esp"></div>';
  for (const p of filas) {
    const d = document.createElement('div');
    d.className = 'tl-nombre';
    d.innerHTML = `<i style="background:${p.color}"></i>${p.nombre}`;
    const b = document.createElement('button');
    b.type = 'button';
    if (p.audio) { b.textContent = muda(p.id) ? '🔇' : '🔊'; b.className = muda(p.id) ? 'off' : ''; b.onclick = () => { alternar(P.mudas, p.id); cambio(); }; }
    else { b.textContent = '👁'; b.className = oculta(p.id) ? 'off' : ''; b.onclick = () => { alternar(P.ocultas, p.id); cambio(); }; }
    d.append(b);
    $('tlNombres').append(d);
  }
  const area = $('tlArea');
  area.innerHTML = '';
  area.style.width = (largo * pps) + 'px';
  const regla = document.createElement('div');
  regla.className = 'regla';
  const cada = pps >= 90 ? 1 : pps >= 40 ? 2 : 5;
  for (let s = 0; s <= largo; s += cada) regla.insertAdjacentHTML('beforeend', `<em style="left:${s * pps}px"></em><span style="left:${s * pps}px">${fmt(s).slice(0, 5)}</span>`);
  regla.onpointerdown = arrastrarTiempo;
  area.append(regla);
  for (const p of filas) {
    const fila = document.createElement('div');
    fila.className = 'fila'; fila.dataset.pista = p.id;
    fila.style.backgroundSize = '';
    fila.onpointerdown = e => { if (e.target === fila) { sel = null; pintarInspector(); pintarTL(); arrastrarTiempo(e); } };
    for (const c of P.clips.filter(c => c.pista === p.id)) {
      const b = document.createElement('div');
      const falta = 'src' in c && !medios[c.src];
      b.className = 'clip' + (c.id === sel ? ' sel' : '') + (falta ? ' falta' : '');
      b.style.left = (c.ini * pps) + 'px';
      b.style.width = Math.max(6, c.dur * pps) + 'px';
      b.style.background = p.color;
      b.innerHTML = `${TIPOS[c.tipo].icono} <span></span><small></small><div class="asa asa-i"></div><div class="asa asa-d"></div>`;
      b.querySelector('span').textContent = TIPOS[c.tipo].nombre;
      b.querySelector('small').textContent = etiqueta(c);
      b.onpointerdown = e => arrastrarClip(e, c);
      fila.append(b);
    }
    area.append(fila);
  }
  const cab = document.createElement('div');
  cab.className = 'cabezal'; cab.id = 'cabezalTL'; cab.style.left = (tAct * pps) + 'px';
  area.append(cab);
}
function alternar(lista, id) { const i = lista.indexOf(id); if (i >= 0) lista.splice(i, 1); else lista.push(id); }
function arrastrarTiempo(e) {
  const rect = $('tlArea').getBoundingClientRect();
  const mover = ev => irA((ev.clientX - rect.left) / pps);
  mover(e);
  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', () => window.removeEventListener('pointermove', mover), { once: true });
}
function iman(t, c) {
  const lim = 8 / pps;
  const puntos = [0, tAct];
  for (const o of P.clips) if (o !== c) puntos.push(o.ini, o.ini + o.dur);
  for (const p of puntos) if (Math.abs(p - t) < lim) return p;
  return Math.round(t * 20) / 20;
}
function arrastrarClip(e, c) {
  e.preventDefault(); e.stopPropagation();
  if (tocando) pausa();
  const modo = e.target.classList.contains('asa-i') ? 'i' : e.target.classList.contains('asa-d') ? 'd' : 'm';
  if (sel !== c.id) { sel = c.id; pintarInspector(); }
  guardarHist();
  const x0 = e.clientX, y0 = e.clientY, ini0 = c.ini, dur0 = c.dur, desde0 = c.desde || 0;
  const filas = ordenFilas().map(p => p.id), f0 = filas.indexOf(c.pista);
  let movio = false;
  const mover = ev => {
    const dt = (ev.clientX - x0) / pps;
    if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 3) movio = true;
    if (modo === 'm') {
      let ni = Math.max(0, ini0 + dt);
      const a = iman(ni, c), b = iman(ni + c.dur, c) - c.dur;
      ni = Math.abs(a - ni) <= Math.abs(b - ni) ? a : b;
      c.ini = r1(Math.max(0, ni));
      const nf = clamp(f0 + Math.round((ev.clientY - y0) / ALTO), 0, filas.length - 1);
      const destino = filas[nf];
      if (!!pista(destino).audio === AUDIO.includes(c.tipo)) c.pista = destino;
    } else if (modo === 'i') {
      const ni = clamp(iman(ini0 + dt, c), Math.max(0, ini0 - desde0 - (('desde' in c) ? 0 : 1e9)), ini0 + dur0 - 0.1);
      c.dur = r1(ini0 + dur0 - ni);
      if ('desde' in c) c.desde = r1(Math.max(0, desde0 + (ni - ini0)));
      c.ini = r1(ni);
    } else {
      c.dur = r1(Math.max(0.1, iman(ini0 + dur0 + dt, c) - ini0));
    }
    pintarTL(); irA(tAct);
  };
  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', () => {
    window.removeEventListener('pointermove', mover);
    if (!movio) hist.pop();
    pintarTL(); pintarInspector(); autoguardar();
  }, { once: true });
}

// ---------- inspector ----------
function pintarInspector() {
  const box = $('inspector');
  const c = P.clips.find(x => x.id === sel);
  if (!c) { box.innerHTML = '<p class="vacio">Toca un bloque de la línea de tiempo para cambiarlo.</p>'; return; }
  const T = TIPOS[c.tipo];
  box.innerHTML = `<p style="margin:0 0 10px"><b>${T.icono} ${T.nombre}</b> · ${fmt(c.ini)} → ${fmt(c.ini + c.dur)}</p>`;
  const campos = [['ini', 'Empieza (s)', 'num', 0, 3600, 0.05], ['dur', 'Dura (s)', 'num', 0.1, 3600, 0.05], ...T.campos,
    ...(pista(c.pista).audio || c.tipo === 'fondo' ? [] : [['sonido', 'Efecto de sonido', 'sel', SONIDOS], ['volSonido', 'Volumen del efecto', 'rango', 0, 1.5, 0.05]])];
  if (!('sonido' in c)) c.sonido = 'auto';
  if (!('volSonido' in c)) c.volSonido = 0.7;
  for (const [k, label, tipo, a, b, paso] of campos) {
    const fila = document.createElement('div');
    fila.className = 'campo';
    const lab = document.createElement('label'); lab.textContent = label;
    fila.append(lab);
    let inp;
    if (tipo === 'rango') {
      const w = document.createElement('div'); w.className = 'rango';
      inp = document.createElement('input'); inp.type = 'range'; inp.min = a; inp.max = b; inp.step = paso; inp.value = c[k];
      const out = document.createElement('output'); out.textContent = c[k];
      inp.addEventListener('input', () => out.textContent = inp.value);
      w.append(inp, out); fila.append(w);
    } else if (tipo === 'sel' || tipo === 'medio') {
      inp = document.createElement('select');
      const ops = tipo === 'sel' ? a : Object.fromEntries([['', '— ninguno —'],
        ...Object.values(medios).filter(m => a.split(',').includes(m.tipo)).map(m => [m.nombre, m.nombre]), ['__subir', '＋ Subir archivo…']]);
      if (tipo === 'medio' && c[k] && !(c[k] in ops)) ops[c[k]] = c[k] + ' (falta subirlo)';
      for (const [v, t] of Object.entries(ops)) { const o = document.createElement('option'); o.value = v; o.textContent = t; inp.append(o); }
      inp.value = c[k];
    } else if (tipo === 'area') {
      inp = document.createElement('textarea'); inp.value = c[k];
    } else {
      inp = document.createElement('input');
      inp.type = tipo === 'num' ? 'number' : tipo === 'color' ? 'color' : 'text';
      if (tipo === 'num') { inp.min = a; inp.max = b; inp.step = paso; }
      inp.value = tipo === 'color' && !/^#[0-9a-f]{6}$/i.test(c[k]) ? '#000000' : c[k];
    }
    if (tipo !== 'rango') fila.append(inp);
    box.append(fila);
    let primera = true;
    const aplicar = () => {
      if (primera) { guardarHist(); primera = false; }
      let v = inp.value;
      if (tipo === 'medio' && v === '__subir') { subirPara = { c, k }; $('fMedios').click(); inp.value = c[k]; return; }
      if (tipo === 'num' || tipo === 'rango') v = +v;
      if (tipo === 'sel' && k === 'peso') v = +v;
      c[k] = v;
      if (k === 'dur') c.dur = Math.max(0.1, c.dur);
      pintarTL(); irA(tAct); autoguardar();
    };
    inp.addEventListener('input', aplicar);
    inp.addEventListener('change', () => { primera = true; if (tipo === 'medio') { pintarTL(); irA(tAct); } });
  }
}
