// FITWEARMX Studio · carrusel de prendas: eliges prendas, les quita el fondo y arma la cinta que sube, con "Ordena con" y "Liquidas con".
// También agrega más prendas a un carrusel que ya exista y quita el fondo a una prenda suelta.
// Lee tu tienda pública y, si este aparato tiene el Catálogo, también tus prendas de ahí. No lo cambia ni pide contraseñas.

const CAR = { lista: [], marcados: new Map(), grupo: null };
const CAR_FILAS = 5, CAR_ALTO = 262, CAR_PASO = 276, CAR_X = [40, 550];

const modalCar = document.createElement('div');
modalCar.className = 'modal'; modalCar.hidden = true;
modalCar.innerHTML = `<div class="modal-caja">
  <div class="modal-top">
    <b id="carTitulo">Elige tus prendas</b>
    <input id="carBusca" type="search" placeholder="Buscar: Batman, One Piece…">
    <select id="carMarca"></select>
    <label style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="carFondo" checked style="flex:none;min-width:0"> Quitar fondo</label>
    <button type="button" id="carCerrar">Cerrar</button>
    <button type="button" id="carHacer">Crear carrusel</button>
  </div>
  <p id="carEstado" style="margin:8px 14px 0;font-size:13px"></p>
  <div class="rejilla-prod" id="carRejilla"></div>
</div>`;
document.body.append(modalCar);

const urlFoto = f => /^https?:/.test(f) ? f : 'https://fitwearmx.github.io/tienda/' + f;
async function leerCatalogoAparato() {
  try {
    if (!indexedDB.databases || !(await indexedDB.databases()).some(d => d.name === 'catalogo_db')) return [];
    const d = await new Promise((ok, no) => { const r = indexedDB.open('catalogo_db'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const todo = nombre => new Promise(ok => { const r = d.transaction(nombre).objectStore(nombre).getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => ok([]); });
    const prods = await todo('productos'), fotos = await todo('fotos');
    d.close();
    let aj = {}; try { aj = JSON.parse(localStorage.getItem('catalogo_db_ajustes') || '{}'); } catch (e) {}
    const tc = aj.tc || 0, mg = 1 + (aj.margen || 60) / 100;
    return prods.filter(p => p.enTienda).map(p => {
      const usd = +p.costoUsd || 0, impuesto = Number.isInteger(usd) && window.FWPrecios ? FWPrecios.factor(p.marca) : 1;   // con decimales ya trae impuesto
      return { id: p.id, nombre: p.nombre, marca: p.marca, precio: tc && usd ? Math.ceil(usd * impuesto * tc * mg / 10) * 10 : (p.precio || 0),
        fotos: fotos.filter(f => f.productoId === p.id).map(f => 'fotos/' + f.id + '.jpg') };
    }).filter(p => p.fotos.length);
  } catch (e) { return []; }
}
async function leerPrendasCarrusel() {
  if (CAR.lista.length) return;
  $('carEstado').textContent = 'Cargando tus prendas…';
  await cargarTienda();
  const publicas = tienda.productos.map(p => ({ id: p.id, nombre: p.nombre, marca: p.marca, precio: p.precio, fotos: p.colores.flatMap(c => c.fotos) }));
  const clave = p => (p.marca + '|' + p.nombre).toLowerCase();
  const vistos = new Set(publicas.map(clave));
  CAR.lista = [...publicas, ...(await leerCatalogoAparato()).filter(p => !vistos.has(clave(p)))];
  $('carMarca').innerHTML = '<option value="">Todas las marcas</option>' + [...new Set(CAR.lista.map(p => p.marca))].sort().map(m => `<option>${m}</option>`).join('');
  $('carEstado').textContent = '';
}
function pintarCarrusel() {
  const q = $('carBusca').value.trim().toLowerCase(), m = $('carMarca').value, caja = $('carRejilla');
  caja.textContent = '';
  const lista = CAR.lista.filter(p => (!m || p.marca === m) && (!q || p.nombre.toLowerCase().includes(q)));
  for (const p of lista.slice(0, 120)) {
    const elegida = CAR.marcados.get(p.id), d = document.createElement('div');
    d.style.cssText = `cursor:pointer;border-radius:12px;padding:6px;background:var(--bg);border:2px solid ${elegida ? '#6a5efa' : 'var(--border)'}`;
    const img = document.createElement('img'); img.loading = 'lazy'; img.src = urlFoto(p.fotos[(elegida && elegida.foto) || 0]); img.style.cssText = 'width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:8px;display:block';
    const n = document.createElement('div'); n.textContent = p.nombre; n.style.cssText = 'font-size:12px;margin:4px 0;line-height:1.2';
    d.append(img, n);
    d.onclick = () => { if (CAR.marcados.has(p.id)) CAR.marcados.delete(p.id); else CAR.marcados.set(p.id, { p, foto: 0, precio: p.precio }); pintarCarrusel(); };
    if (elegida) {
      const fila = document.createElement('div'); fila.style.cssText = 'display:flex;gap:4px;align-items:center';
      const inp = document.createElement('input'); inp.type = 'number'; inp.value = elegida.precio; inp.title = 'Precio: revísalo'; inp.style.cssText = 'width:100%;min-width:0';
      inp.onclick = e => e.stopPropagation(); inp.oninput = () => elegida.precio = +inp.value || 0;
      const otra = document.createElement('button'); otra.type = 'button'; otra.textContent = '🔁'; otra.title = 'Otra foto';
      otra.onclick = e => { e.stopPropagation(); elegida.foto = (elegida.foto + 1) % p.fotos.length; img.src = urlFoto(p.fotos[elegida.foto]); };
      fila.append(inp, otra); d.append(fila);
    }
    caja.append(d);
  }
  $('carHacer').textContent = (CAR.grupo ? 'Agregar ' : 'Crear con ') + CAR.marcados.size + ' prendas';
}
async function abrirCarrusel(grupo) {
  CAR.grupo = grupo || null;
  $('carTitulo').textContent = grupo ? 'Agrega prendas a este carrusel' : 'Elige prendas para el carrusel';
  modalCar.hidden = false;
  try { await leerPrendasCarrusel(); pintarCarrusel(); } catch (e) { $('carEstado').textContent = e.message; }
}
$('carCerrar').onclick = () => modalCar.hidden = true;
$('carBusca').oninput = pintarCarrusel;
$('carMarca').onchange = pintarCarrusel;

// Quita el fondo, recorta lo que sobra y, si la foto corta a la persona, la desvanece abajo.
async function prendaSinFondo(blob, avisar) {
  if (!quitaFondo) quitaFondo = (await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm')).removeBackground;
  const salida = await quitaFondo(blob, { output: { format: 'image/png', quality: 1 }, progress: (k, a, t) => { if (avisar && k.startsWith('fetch') && t) avisar(`Descargando la IA (solo la primera vez)… ${Math.round(100 * a / t)}%`); } });
  const bmp = await createImageBitmap(salida), w = bmp.width, h = bmp.height;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const q = cv.getContext('2d', { willReadFrequently: true }); q.drawImage(bmp, 0, 0);
  const px = q.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 25) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 <= x0 || y1 <= y0) return salida;
  let abajo = 0;
  for (let x = x0; x <= x1; x++) if (px[(y1 * w + x) * 4 + 3] > 25) abajo++;
  const fin = document.createElement('canvas'); fin.width = x1 - x0 + 1; fin.height = y1 - y0 + 1;
  const f = fin.getContext('2d'); f.drawImage(cv, -x0, -y0);
  if (abajo / fin.width > 0.35) {
    f.globalCompositeOperation = 'destination-out';
    const g = f.createLinearGradient(0, fin.height * 0.87, 0, fin.height);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    f.fillStyle = g; f.fillRect(0, fin.height * 0.87, fin.width, fin.height * 0.13);
  }
  return new Promise(ok => fin.toBlob(ok, 'image/png'));
}

// Arma (o vuelve a armar) la cinta: entran 10 en cadena y las demás suben por abajo. Regresa cuánto dura.
function armarCinta(prendas, ini, grupo, mx, my, marca) {
  const Y0 = 290, filas = Math.ceil(prendas.length / 2), extra = Math.max(0, filas - CAR_FILAS);
  const cadena = 0.1, enPantalla = Math.min(prendas.length, CAR_FILAS * 2), subeEn = ini + enPantalla * cadena + 0.4, filaSeg = 0.7;
  const subeDur = extra * filaSeg, fin = subeEn + subeDur + 1;
  prendas.forEach((p, i) => {
    const fila = i >> 1, dentro = fila >= CAR_FILAS, t0 = dentro ? subeEn + (fila - CAR_FILAS) * filaSeg : ini + i * cadena;
    P.clips.push(nuevoClip('tarjeta', { ini: +t0.toFixed(2), dur: +(fin - t0).toFixed(2), estilo: 'post', src: p.src, num: String(i + 1).padStart(2, '0'), nombre: p.nombre, precio: p.precio, ancho: p.ancho ?? 0.86, focoY: p.focoY ?? 0,
      x: CAR_X[i % 2], y: Y0 + fila * CAR_PASO, w: 490, h: CAR_ALTO, cinta: dentro ? 'dentro' : 'si', subeEn, subeDur: subeDur || 1, subePx: extra * CAR_PASO, marcoY: Y0 - 6, marcoAlto: CAR_FILAS * CAR_PASO + 2, fadeIn: dentro ? 0 : 0.08, fadeOut: 0, sonido: 'pop', grupo, mx, my }));
  });
  const fijo = { entrada: 'nada', fadeOut: 0, fadeIn: 0.25, sonido: 'no', grupo, mx, my };
  P.clips.push(nuevoClip('texto', { ...fijo, ini, dur: fin - ini, texto: marca.titulo, tam: 62, peso: 900, italica: 'si', color: '#f5f0f6', y: 195, espacio: 0.03 }));
  P.clips.push(nuevoClip('texto', { ...fijo, ini, dur: fin - ini, texto: marca.nota, tam: 34, peso: 400, color: '#a7a6b5', y: 1715, espacio: 0.012 }));
  return fin - ini;
}
function datosDeCinta(grupo) {
  const cl = P.clips.filter(c => c.grupo === grupo), tar = cl.filter(c => c.tipo === 'tarjeta').sort((a, b) => a.num - b.num), tex = cl.filter(c => c.tipo === 'texto').sort((a, b) => a.y - b.y);
  return { cl, ini: Math.min(...cl.map(c => c.ini)), fin: Math.max(...cl.map(c => c.ini + c.dur)), prendas: tar.map(c => ({ src: c.src, nombre: c.nombre, precio: c.precio, ancho: c.ancho, focoY: c.focoY })), marca: { titulo: tex[0] ? tex[0].texto : '', nota: tex[1] ? tex[1].texto : '' }, mx: cl[0].mx || 0, my: cl[0].my || 0 };
}
$('carHacer').onclick = async () => {
  if (!CAR.marcados.size) { $('carEstado').textContent = 'Toca al menos una prenda.'; return; }
  const boton = $('carHacer'); boton.disabled = true;
  const avisar = t => $('carEstado').textContent = t, sinFondo = $('carFondo').checked, nuevas = [];
  try {
    let i = 0;
    for (const m of CAR.marcados.values()) {
      i++; avisar(`Preparando ${i} de ${CAR.marcados.size}: ${m.p.nombre}…`);
      const foto = m.p.fotos[m.foto], base = 'carrusel-' + foto.replace(/\W+/g, '-') + (sinFondo ? '.png' : '.jpg');
      if (!medios[base]) {
        const orig = await (await fetch(urlFoto(foto))).blob();
        const blob = sinFondo ? await prendaSinFondo(orig, avisar) : orig;
        await agregarArchivo(new File([blob], base, { type: blob.type }), base);
      }
      nuevas.push({ src: base, nombre: m.p.nombre, precio: m.precio });
    }
    guardarHist();
    if (CAR.grupo) {
      const d = datosDeCinta(CAR.grupo);
      P.clips = P.clips.filter(c => c.grupo !== CAR.grupo);
      const dur = armarCinta([...d.prendas, ...nuevas], d.ini, CAR.grupo, d.mx, d.my, d.marca), delta = d.ini + dur - d.fin;
      for (const c of P.clips) {
        if (c.grupo === CAR.grupo) continue;
        if (c.ini >= d.fin - 0.01) c.ini = +(c.ini + delta).toFixed(2);
        else if (c.ini + c.dur > d.fin && pista(c.pista).audio) c.dur = +(c.dur + delta).toFixed(2);
        else if (c.ini + c.dur >= d.fin - 0.01 && c.ini + c.dur <= d.fin + 0.01) c.dur = +(c.dur + delta).toFixed(2);
      }
    } else {
      const grupo = 'cinta-' + Date.now();
      armarCinta(nuevas, r1(tAct), grupo, 0, 0, { titulo: 'BLACK FRIDAY · 24 NOV', nota: '“Liquidas con” ya incluye envío en Monterrey' });
    }
    CAR.marcados.clear(); modalCar.hidden = true; cambio();
    $('aviso').textContent = '✅ Carrusel listo. Revisa los precios antes de exportar.';
  } catch (e) { avisar('No se pudo: ' + e.message); }
  boton.disabled = false;
};
// Quita el fondo a la prenda seleccionada
async function quitarFondoElegida() {
  const c = P.clips.find(x => x.id === sel);
  if (!c || !['tarjeta', 'producto'].includes(c.tipo) || !medios[c.src]) { $('aviso').textContent = 'Primero toca una prenda en la pantalla.'; return; }
  try {
    $('aviso').textContent = 'Quitando el fondo…';
    const orig = await (await fetch(medios[c.src].url)).blob(), blob = await prendaSinFondo(orig, t => $('aviso').textContent = t);
    const n = await agregarArchivo(new File([blob], 'sinfondo-' + c.src.replace(/\.\w+$/, '') + '.png', { type: 'image/png' }));
    guardarHist(); c.src = n; cambio();
    $('aviso').textContent = '✅ Fondo quitado.';
  } catch (e) { $('aviso').textContent = 'No se pudo quitar el fondo: ' + e.message; }
}
window.pintarBotonesCarrusel = boton => {
  const c = P.clips.find(x => x.id === sel), grupo = c && c.grupo && String(c.grupo).startsWith('cinta') ? c.grupo : null;
  boton('🎞 Crear carrusel', 'Elige prendas y arma una cinta nueva', () => abrirCarrusel());
  if (grupo) boton('➕ Agregar al carrusel', 'Suma prendas a este carrusel', () => abrirCarrusel(grupo));
  boton('✂️ Quitar fondo', 'Le quita el fondo a la prenda seleccionada', quitarFondoElegida);
};
pintarBarraMover();
