// FITWEARMX Studio · mover como en Canva: toca algo en la pantalla y arrástralo, dibuja un cuadro con el ratón para
// seleccionar varios, o usa "Seleccionar todo" y mueve todo junto. Las guías ayudan a centrar. Nada de esto sale en el video.

const elegidos = new Set();
const NO_MOVIBLES = ['fondo', 'musica', 'voz', 'destello', 'transicion'];
const PANTALLA = ['video', 'puerta', 'mapa', 'sombra', 'caja', 'marcaAgua'];   // son el fondo: se quedan quietos, se mueven solo con Alt + arrastrar
const capaMover = document.createElement('div');
capaMover.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden;z-index:5';
const vistaEd = $('lienzo').parentElement;
vistaEd.style.position = 'relative';
vistaEd.append(capaMover);

function medidaLienzo() {
  const r = $('lienzo').getBoundingClientRect(), base = vistaEd.getBoundingClientRect();
  const k = Math.min(r.width / W, r.height / H), ancho = W * k, alto = H * k;
  return { k, x: r.left + (r.width - ancho) / 2, y: r.top + (r.height - alto) / 2, ox: r.left - base.left + (r.width - ancho) / 2, oy: r.top - base.top + (r.height - alto) / 2, ancho, alto };
}
function cajaDe(c, t) {
  const mx = c.mx || 0, my = c.my || 0;
  const centro = (cx, cy, w, h) => ({ x: cx - w / 2 + mx, y: cy - h / 2 + my, w, h });
  if (c.tipo === 'tarjeta') {
    const sube = c.cinta ? clamp((t - c.subeEn) / (c.subeDur || 1)) * c.subePx : 0;
    return { x: c.x + mx, y: c.y - sube + my, w: c.w, h: c.h };
  }
  if (c.tipo === 'texto') {
    ctx.save(); ctx.font = `${c.italica === 'si' ? 'italic ' : ''}${c.peso} ${c.tam}px ${FUENTE}`;
    const lineas = partir(c.texto, W - 120), ancho = Math.max(...lineas.map(l => ctx.measureText(l).width));
    ctx.restore();
    return centro(W / 2, c.y, Math.max(ancho, 60), Math.max(lineas.length * c.tam * 1.08, 40));
  }
  if (c.tipo === 'explica') { const e = c.escala || 1; return centro(W / 2, c.y, 940 * e, 230 * e); }
  if (c.tipo === 'boton') return centro(W / 2, c.y, 760, 110);
  if (c.tipo === 'logo') return centro(W / 2, c.y, c.tam * 3.2, c.tam * 2.2);
  if (c.tipo === 'marcaAgua') return centro(W / 2 + c.x, c.y, c.tam, c.tam * 0.58);
  if (c.tipo === 'producto') return centro(W / 2 + c.x, c.y, W * c.escala, H * 0.62);
  if (PANTALLA.includes(c.tipo)) return { x: mx, y: my, w: W, h: H };
  return centro(W / 2, c.y || H / 2, W * 0.8, 400);
}
const visibles = t => P.clips.filter(c => !NO_MOVIBLES.includes(c.tipo) && !pista(c.pista).audio && !oculta(c.pista) && t >= c.ini && t < c.ini + c.dur);
function deLaGrupo(c) { return c.grupo ? P.clips.filter(x => x.grupo === c.grupo) : [c]; }
function tocado(px, py, t, conFondo) {
  const orden = PISTAS.map(p => p.id).reverse();
  let lista = visibles(t).sort((a, b) => orden.indexOf(a.pista) - orden.indexOf(b.pista));
  for (const quiere of conFondo ? [false, true] : [false])
    for (const c of [...lista].reverse().sort((a, b) => orden.indexOf(a.pista) - orden.indexOf(b.pista))) {
      if (PANTALLA.includes(c.tipo) !== quiere) continue;
      const b = cajaDe(c, t);
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return c;
    }
  return null;
}
function pintarElegidos(extra) {
  const m = medidaLienzo();
  Object.assign(capaMover.style, { left: m.ox + 'px', top: m.oy + 'px', width: m.ancho + 'px', height: m.alto + 'px' });
  capaMover.textContent = '';
  if (tocando || exportando) return;
  const caja = (b, css) => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${b.x * m.k}px;top:${b.y * m.k}px;width:${b.w * m.k}px;height:${b.h * m.k}px;${css}`;
    capaMover.append(d);
  };
  for (const c of P.clips) if (elegidos.has(c.id) && tAct >= c.ini && tAct < c.ini + c.dur) caja(cajaDe(c, tAct), 'border:2px solid #8f85ff;border-radius:4px');
  if (extra && extra.cuadro) caja(extra.cuadro, 'border:1.5px dashed #fff;background:rgba(143,133,255,.18)');
  if (extra && extra.guiaX) caja({ x: W / 2, y: 0, w: 0, h: H }, 'border-left:1.5px solid #facc15');
  if (extra && extra.guiaY) caja({ x: 0, y: H / 2, w: W, h: 0 }, 'border-top:1.5px solid #facc15');
}
function elegir(lista, sumar) {
  if (!sumar) elegidos.clear();
  for (const c of lista) elegidos.add(c.id);
  const primero = lista[0];
  if (primero) sel = primero.id;
  pintarInspector(); pintarTL(); pintarElegidos();
  pintarBarraMover();
}
function uniones() {
  let a = Infinity, b = Infinity, c2 = -Infinity, d = -Infinity;
  for (const c of P.clips) if (elegidos.has(c.id) && tAct >= c.ini && tAct < c.ini + c.dur) {
    const q = cajaDe(c, tAct);
    a = Math.min(a, q.x); b = Math.min(b, q.y); c2 = Math.max(c2, q.x + q.w); d = Math.max(d, q.y + q.h);
  }
  return a === Infinity ? null : { x: a, y: b, w: c2 - a, h: d - b };
}
function moverElegidos(dx, dy) {
  for (const c of P.clips) if (elegidos.has(c.id)) { c.mx = (c.mx || 0) + dx; c.my = (c.my || 0) + dy; }
}

$('lienzo').addEventListener('pointerdown', e => {
  if (exportando) return;
  if (tocando) pausa();
  const m = medidaLienzo(), px = (e.clientX - m.x) / m.k, py = (e.clientY - m.y) / m.k;
  const c = tocado(px, py, tAct, e.altKey);
  $('lienzo').setPointerCapture(e.pointerId);
  if (c) {
    if (!elegidos.has(c.id) || e.shiftKey) elegir(e.altKey ? [c] : deLaGrupo(c), e.shiftKey);
    const u0 = uniones();
    let movido = false, antesX = 0, antesY = 0;
    const mover = ev => {
      let dx = (ev.clientX - e.clientX) / m.k, dy = (ev.clientY - e.clientY) / m.k;
      if (!movido && Math.hypot(dx, dy) < 3) return;
      if (!movido) { guardarHist(); movido = true; }
      let guiaX = false, guiaY = false;
      if (u0) {
        if (Math.abs(u0.x + u0.w / 2 + dx - W / 2) < 12) { dx = W / 2 - u0.x - u0.w / 2; guiaX = true; }
        if (Math.abs(u0.y + u0.h / 2 + dy - H / 2) < 12) { dy = H / 2 - u0.y - u0.h / 2; guiaY = true; }
      }
      moverElegidos(dx - antesX, dy - antesY); antesX = dx; antesY = dy;
      render(tAct); pintarElegidos({ guiaX, guiaY });
    };
    const soltar = () => {
      $('lienzo').removeEventListener('pointermove', mover);
      $('lienzo').removeEventListener('pointerup', soltar);
      if (movido) { autoguardar(); pintarInspector(); }
      pintarElegidos();
    };
    $('lienzo').addEventListener('pointermove', mover);
    $('lienzo').addEventListener('pointerup', soltar);
    return;
  }
  // nada debajo: dibuja el cuadro de selección
  if (!e.shiftKey) elegidos.clear();
  let cuadro = null;
  const mover = ev => {
    const x2 = (ev.clientX - m.x) / m.k, y2 = (ev.clientY - m.y) / m.k;
    cuadro = { x: Math.min(px, x2), y: Math.min(py, y2), w: Math.abs(x2 - px), h: Math.abs(y2 - py) };
    pintarElegidos({ cuadro });
  };
  const soltar = () => {
    $('lienzo').removeEventListener('pointermove', mover);
    $('lienzo').removeEventListener('pointerup', soltar);
    if (cuadro && cuadro.w > 6 && cuadro.h > 6) {
      const dentro = visibles(tAct).filter(c => !PANTALLA.includes(c.tipo)).filter(c => { const b = cajaDe(c, tAct); return b.x < cuadro.x + cuadro.w && b.x + b.w > cuadro.x && b.y < cuadro.y + cuadro.h && b.y + b.h > cuadro.y; });
      elegir(dentro.flatMap(deLaGrupo), true);
    } else { sel = null; pintarInspector(); pintarTL(); pintarElegidos(); pintarBarraMover(); }
  };
  $('lienzo').addEventListener('pointermove', mover);
  $('lienzo').addEventListener('pointerup', soltar);
});

document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || $('v-editor').hidden) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); elegir(visibles(tAct).filter(c => !PANTALLA.includes(c.tipo)).flatMap(deLaGrupo)); return; }
  if (e.key === 'Escape' && elegidos.size) { elegidos.clear(); pintarElegidos(); pintarBarraMover(); return; }
  if (!elegidos.size) return;
  const paso = e.shiftKey ? 10 : 2, mapa = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
  if (mapa) { e.preventDefault(); e.stopPropagation(); guardarHist(); moverElegidos(mapa[0], mapa[1]); render(tAct); pintarElegidos(); autoguardar(); }
}, true);

// Barra de herramientas debajo de la pantalla
const barraMover = document.createElement('div');
barraMover.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center';
$('lienzo').parentElement.querySelector('.transporte').after(barraMover);
function botonMover(txt, titulo, fn) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.title = titulo; b.onclick = fn;
  barraMover.append(b); return b;
}
function centrarElegidos(ejeX) {
  const u = uniones(); if (!u) { $('aviso').textContent = 'Primero toca algo en la pantalla.'; return; }
  guardarHist();
  moverElegidos(ejeX ? W / 2 - u.x - u.w / 2 : 0, ejeX ? 0 : H / 2 - u.y - u.h / 2);
  render(tAct); pintarElegidos(); autoguardar();
}
function pintarBarraMover() {
  barraMover.textContent = '';
  botonMover('🔲 Seleccionar todo', 'Selecciona todo lo que se ve (Cmd o Ctrl + A)', () => elegir(visibles(tAct).filter(c => !PANTALLA.includes(c.tipo)).flatMap(deLaGrupo)));
  botonMover('↔ Centrar', 'Centra lo seleccionado a lo ancho', () => centrarElegidos(true));
  botonMover('↕ Centrar', 'Centra lo seleccionado a lo alto', () => centrarElegidos(false));
  if (window.pintarBotonesCarrusel) pintarBotonesCarrusel(botonMover);
}
const renderSinMarcas = render;
render = function (t) { renderSinMarcas(t); if (!exportando) pintarElegidos(); };
window.addEventListener('resize', () => pintarElegidos());
pintarBarraMover();
