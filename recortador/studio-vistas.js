// FITWEARMX Studio · vistas del estudio, modos de video y prendas de la tienda.
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

// ---------- estudio: vistas ----------
const VISTAS = { crear: 'Inicio', plantillas: 'Plantillas', creaciones: 'Mis creaciones', editor: 'Editor' };
function verVista(v) {
  if (!VISTAS[v]) v = 'crear';
  for (const k in VISTAS) $('v-' + k).hidden = k !== v;
  document.querySelectorAll('[data-vista]').forEach(b => b.classList.toggle('on', b.dataset.vista === v));
  $('miga').textContent = VISTAS[v];
  document.body.classList.toggle('en-editor', v === 'editor');
  if (v === 'editor') { pintarTL(); irA(tAct); }
  if (v === 'creaciones') pintarCreaciones();
  try { localStorage.setItem('studio-vista', v); } catch (e) {}
}
document.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); verVista(b.dataset.vista); }));
document.querySelectorAll('[data-herr]').forEach(b => b.addEventListener('click', e => {
  e.preventDefault();
  const h = b.dataset.herr;
  verVista('editor');
  if (h === 'ritmo') { audioListo(); ritmoAlProyecto(120); }
  else if (h === 'voz') $('bGrabar').click();
  else agregar(h);
}));

// ---------- plantillas (modos de video) ----------
const MODOS = {
  comprar: { nombre: 'Cómo comprar', icono: '▶', fondo: '#17111f', desc: 'Prendas en negro, la compra paso a paso dentro del iPhone y el pedido por WhatsApp.' },
  drop: { nombre: 'Drop nuevo', icono: '✦', fondo: '#0f1424', desc: 'Tus prendas una por una con su nombre y "Ordena con $".' },
  negro: { nombre: 'Prenda en negro', icono: '■', fondo: '#121212', desc: 'Una sola prenda protagonista, estilo Breathe Divinity.' },
  remate: { nombre: 'Remate', icono: '🔥', fondo: '#1f0d0d', desc: 'Urgencia: "Remate.", tus prendas y sus precios.' },
};
let modo = 'comprar';
function elegirModo(m) {
  modo = m;
  document.querySelectorAll('#modos button').forEach(b => b.classList.toggle('on', b.dataset.modo === m));
}
function tarjetaModo(k) {
  const M = MODOS[k], d = document.createElement('button');
  d.type = 'button'; d.className = 'tarjeta';
  d.innerHTML = `<div class="poster" style="background:radial-gradient(circle at 50% 40%, ${M.fondo === '#121212' ? '#3a3a3a' : M.fondo.replace('#1', '#4')}, #000 70%)">${M.icono}</div><div class="info"><b></b><span></span></div>`;
  d.querySelector('b').textContent = M.nombre; d.querySelector('span').textContent = M.desc;
  d.onclick = () => { elegirModo(k); verVista('crear'); $('prompt').focus(); };
  return d;
}
for (const k in MODOS) {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.modo = k; b.textContent = MODOS[k].icono + ' ' + MODOS[k].nombre;
  b.onclick = () => elegirModo(k);
  $('modos').append(b);
  $('atajos').append(tarjetaModo(k));
  $('rejillaPlantillas').append(tarjetaModo(k));
}
elegirModo('comprar');

// ---------- prendas de la tienda ----------
let tienda = null, prendasSel = [];
async function cargarTienda() {
  if (tienda) return tienda;
  for (const base of ['../tienda/', 'https://fitwearmx.github.io/tienda/']) {
    try {
      const r = await fetch(base + 'datos.json', { cache: 'no-store' });
      if (r.ok) { const d = await r.json(); tienda = { base, productos: (d.productos || []).filter(p => p.colores && p.colores[0] && p.colores[0].fotos && p.colores[0].fotos[0]) }; return tienda; }
    } catch (e) {}
  }
  throw new Error('No pude leer la tienda. Revisa tu internet.');
}
const fotoDe = p => tienda.base + p.colores[0].fotos[0];
const anticipoDe = precio => Math.ceil(precio * 0.25 / 10) * 10;
const prendaDe = id => tienda && tienda.productos.find(p => p.id === id);
function nombreCorto(p) {
  const n = p.nombre.replace(/\b(premium|tee|tees|t-shirt|shirt|in|black|white|cream|brown|green|grey|gray|blue|red)\b/gi, '').replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim();
  return (n.split(' ').slice(0, 3).join(' ') || p.nombre) + '.';
}
async function abrirPrendas() {
  $('modalProd').hidden = false;
  $('buscaProd').focus();
  try { await cargarTienda(); pintarProd(); }
  catch (e) { $('rejillaProd').innerHTML = '<p class="vacio">No pude abrir tu tienda. Revisa tu internet.</p>'; }
}
function pintarProd() {
  const q = $('buscaProd').value.trim().toLowerCase();
  const lista = tienda.productos.filter(p => !q || (p.nombre + ' ' + p.marca + ' ' + p.categoria).toLowerCase().includes(q)).slice(0, 150);
  $('rejillaProd').innerHTML = '';
  for (const p of lista) {
    const d = document.createElement('div');
    d.className = 'prod' + (prendasSel.includes(p.id) ? ' sel' : '');
    d.innerHTML = `<div class="ft"></div><div><b></b><span></span></div>`;
    d.querySelector('.ft').style.backgroundImage = `url("${fotoDe(p)}")`;
    d.querySelector('b').textContent = p.nombre;
    d.querySelector('span').textContent = p.marca + ' · $' + p.precio.toLocaleString('es-MX');
    d.onclick = () => {
      const i = prendasSel.indexOf(p.id);
      if (i >= 0) prendasSel.splice(i, 1); else if (prendasSel.length < 4) prendasSel.push(p.id);
      pintarProd(); pintarSel();
    };
    $('rejillaProd').append(d);
  }
  if (!lista.length) $('rejillaProd').innerHTML = '<p class="vacio">No encontré esa prenda.</p>';
}
function pintarSel() {
  $('prendasSel').innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div'), p = prendaDe(prendasSel[i]);
    if (p) {
      d.style.backgroundImage = `url("${fotoDe(p)}")`; d.title = p.nombre;
      const x = document.createElement('button'); x.type = 'button'; x.textContent = '✕';
      x.onclick = () => { prendasSel.splice(prendasSel.indexOf(p.id), 1); pintarSel(); };
      d.append(x);
    }
    $('prendasSel').append(d);
  }
  $('bElegir').textContent = prendasSel.length ? '✎ Cambiar prendas' : '＋ Agregar prendas';
}
$('bElegir').onclick = abrirPrendas;
$('bCerrarModal').onclick = () => { $('modalProd').hidden = true; };
$('modalProd').onclick = e => { if (e.target === $('modalProd')) $('modalProd').hidden = true; };
$('buscaProd').oninput = () => tienda && pintarProd();
pintarSel();
