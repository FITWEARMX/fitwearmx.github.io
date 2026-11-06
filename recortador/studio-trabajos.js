// FITWEARMX Studio · Mis trabajos: cargas un proyecto o video, lo abres o lo quitas, como en Facturas.
// Se guarda solo en este aparato y cifrado con la llave que tú creas. La página es pública, pero tus trabajos no se suben a ningún lado.
// La llave no se guarda en ningún lado: si la olvidas, no se puede recuperar lo guardado.

const TRAB = { llave: null };
const CLAVE_LLAVE = 'fw_trabajos_llave';
const bytes = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const b64De = b => btoa(String.fromCharCode(...new Uint8Array(b)));
async function derivarLlave(texto, sal) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(texto), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function crearLlave(texto) {
  const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const llave = await derivarLlave(texto, sal);
  const prueba = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, llave, new TextEncoder().encode('fitwearmx'));
  localStorage.setItem(CLAVE_LLAVE, JSON.stringify({ sal: b64De(sal), iv: b64De(iv), prueba: b64De(prueba) }));
  TRAB.llave = llave;
}
async function abrirConLlave(texto) {
  const g = JSON.parse(localStorage.getItem(CLAVE_LLAVE));
  const llave = await derivarLlave(texto, bytes(g.sal));
  await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(g.iv) }, llave, bytes(g.prueba));   // si la llave está mal, aquí falla
  TRAB.llave = llave;
}
function baseTrabajos() {
  return new Promise((ok, no) => {
    const r = indexedDB.open('fitwearmx-studio-trabajos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('trabajos', { keyPath: 'id' });
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
}
async function usarTrabajos(modo, fn) {
  const d = await baseTrabajos();
  const out = await new Promise((ok, no) => {
    const tx = d.transaction('trabajos', modo); let res;
    const r = fn(tx.objectStore('trabajos')); r.onsuccess = () => res = r.result;
    tx.oncomplete = () => ok(res); tx.onerror = () => no(tx.error);
  });
  d.close(); return out;
}

// Paquete .fwstudio: un solo archivo con el proyecto y todas sus fotos y videos.
async function paqueteDe() {
  const texto = JSON.stringify(P), usados = Object.keys(medios).filter(n => texto.includes(JSON.stringify(n)));
  const partes = [], lista = [];
  for (const n of usados) { const b = await (await fetch(medios[n].url)).blob(); partes.push(b); lista.push({ nombre: n, tipo: b.type, tam: b.size }); }
  const cabeza = new TextEncoder().encode(JSON.stringify({ proyecto: P, medios: lista })), largo = new Uint8Array(new Uint32Array([cabeza.length]).buffer);
  return new Blob([new TextEncoder().encode('FWST1'), largo, cabeza, ...partes], { type: 'application/octet-stream' });
}
async function abrirPaquete(blob) {
  const buf = await blob.arrayBuffer();
  if (new TextDecoder().decode(buf.slice(0, 5)) !== 'FWST1') throw new Error('Ese archivo no es un proyecto de Studio.');
  const largo = new Uint32Array(buf.slice(5, 9))[0], cabeza = JSON.parse(new TextDecoder().decode(buf.slice(9, 9 + largo)));
  let pos = 9 + largo;
  for (const m of cabeza.medios) {
    await agregarArchivo(new File([buf.slice(pos, pos + m.tam)], m.nombre, { type: m.tipo }), m.nombre);
    pos += m.tam;
  }
  guardarHist(); cargar(cabeza.proyecto);
}
async function guardarTrabajo(nombre, tipo, blob) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, TRAB.llave, await blob.arrayBuffer());
  await usarTrabajos('readwrite', s => s.put({ id: Date.now(), nombre, tipo, mime: blob.type, tam: blob.size, fecha: new Date().toISOString(), iv, datos }));
}
async function leerTrabajo(t) {
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: t.iv }, TRAB.llave, t.datos);
  return new Blob([claro], { type: t.mime });
}

const modalTrab = document.createElement('div');
modalTrab.className = 'modal'; modalTrab.hidden = true;
modalTrab.innerHTML = `<div class="modal-caja" style="width:min(640px,100%)">
  <div class="modal-top"><b>📁 Mis trabajos</b><span style="flex:1"></span><button type="button" id="trabCerrar">Cerrar</button></div>
  <div id="trabCuerpo" style="padding:14px;overflow:auto;display:flex;flex-direction:column;gap:10px"></div>
</div>`;
document.body.append(modalTrab);
$('trabCerrar').onclick = () => { modalTrab.hidden = true; const v = modalTrab.querySelector('video'); if (v) v.pause(); };
const trabEl = (tag, props = {}, ...hijos) => { const e = Object.assign(document.createElement(tag), props); e.append(...hijos); return e; };
function pintarCandado() {
  const caja = $('trabCuerpo'), nueva = !localStorage.getItem(CLAVE_LLAVE);
  caja.textContent = '';
  const uno = trabEl('input', { type: 'password', placeholder: nueva ? 'Crea tu llave (mínimo 8 letras o números)' : 'Tu llave', autocomplete: nueva ? 'new-password' : 'current-password' });
  const dos = trabEl('input', { type: 'password', placeholder: 'Escríbela otra vez', autocomplete: 'new-password' });
  const msg = trabEl('p', { style: 'margin:0;font-size:13px' });
  const entrar = async () => {
    try {
      if (nueva) {
        if (uno.value.length < 8) { msg.textContent = 'Usa al menos 8 letras o números.'; return; }
        if (uno.value !== dos.value) { msg.textContent = 'Las dos no son iguales.'; return; }
        await crearLlave(uno.value);
      } else await abrirConLlave(uno.value);
      pintarTrabajos();
    } catch (e) { msg.textContent = 'Esa llave no es.'; }
  };
  uno.onkeydown = dos.onkeydown = e => { if (e.key === 'Enter') entrar(); };
  caja.append(trabEl('p', { style: 'margin:0', textContent: nueva ? 'Crea tu llave. Solo tú la sabes: no se guarda en ningún lado y, si la olvidas, no se puede recuperar lo guardado.' : 'Escribe tu llave para ver tus trabajos.' }), uno);
  if (nueva) caja.append(dos);
  caja.append(trabEl('button', { type: 'button', textContent: nueva ? 'Crear llave' : 'Entrar', onclick: entrar }), msg);
  uno.focus();
}
async function pintarTrabajos() {
  const caja = $('trabCuerpo'); caja.textContent = '';
  const msg = trabEl('p', { style: 'margin:0;font-size:13px' });
  const archivo = trabEl('input', { type: 'file', accept: '.fwstudio,video/mp4', hidden: true });
  archivo.onchange = async () => {
    const f = archivo.files[0]; if (!f) return;
    try { msg.textContent = 'Guardando…'; await guardarTrabajo(f.name, /\.fwstudio$/i.test(f.name) ? 'proyecto' : 'video', f); pintarTrabajos(); }
    catch (e) { msg.textContent = 'No se pudo guardar: ' + e.message; }
  };
  const fila = trabEl('div', { style: 'display:flex;flex-wrap:wrap;gap:8px' },
    trabEl('button', { type: 'button', textContent: '⬆️ Cargar archivo', onclick: () => archivo.click() }),
    trabEl('button', { type: 'button', textContent: '💾 Guardar lo que tengo abierto', onclick: async () => {
      const n = prompt('¿Cómo se llama este trabajo?', 'Mi proyecto'); if (!n) return;
      msg.textContent = 'Guardando…'; await guardarTrabajo(n + '.fwstudio', 'proyecto', await paqueteDe()); pintarTrabajos();
    } }),
    trabEl('button', { type: 'button', textContent: '🔒 Cerrar con llave', onclick: () => { TRAB.llave = null; pintarCandado(); } }));
  caja.append(fila, archivo, msg);
  const lista = (await usarTrabajos('readonly', s => s.getAll())).reverse();
  if (!lista.length) caja.append(trabEl('p', { className: 'vacio', textContent: 'Todavía no tienes trabajos. Carga tu archivo .fwstudio o un video.' }));
  for (const t of lista) {
    const abrir = trabEl('button', { type: 'button', textContent: t.tipo === 'video' ? '▶ Ver' : '✏️ Abrir', onclick: async () => {
      try {
        msg.textContent = 'Abriendo…';
        const b = await leerTrabajo(t);
        if (t.tipo === 'video') {
          caja.querySelectorAll('video').forEach(v => v.remove());
          caja.append(trabEl('video', { src: URL.createObjectURL(b), controls: true, autoplay: true, style: 'width:100%;max-height:60vh;background:#000;border-radius:10px' }));
          msg.textContent = '';
        } else {
          if (!confirm('Se abre este trabajo en el editor. Lo que tienes abierto se puede recuperar con Deshacer. ¿Seguir?')) { msg.textContent = ''; return; }
          await abrirPaquete(b); modalTrab.hidden = true; verVista('editor');
          $('aviso').textContent = '✅ Trabajo abierto. Ya lo puedes mover y editar.';
        }
      } catch (e) { msg.textContent = 'No se pudo abrir: ' + e.message; }
    } });
    const bajar = trabEl('button', { type: 'button', textContent: '⬇️', title: 'Descargar', onclick: async () => {
      const a = trabEl('a', { href: URL.createObjectURL(await leerTrabajo(t)), download: t.nombre }); a.click();
    } });
    const quitar = trabEl('button', { type: 'button', textContent: 'Quitar', onclick: async () => {
      if (!confirm(`¿Quitar "${t.nombre}" de este aparato? Esto no se puede deshacer.`)) return;
      await usarTrabajos('readwrite', s => s.delete(t.id)); pintarTrabajos();
    } });
    const info = trabEl('div', { style: 'flex:1;min-width:150px' }, trabEl('b', { textContent: t.nombre }), trabEl('div', { style: 'font-size:12px;opacity:.7', textContent: `${t.tipo === 'video' ? 'Video' : 'Proyecto'} · ${(t.tam / 1048576).toFixed(0)} MB · ${new Date(t.fecha).toLocaleDateString('es-MX')}` }));
    caja.append(trabEl('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:12px' }, info, abrir, bajar, quitar));
  }
}
function abrirTrabajos() {
  modalTrab.hidden = false;
  if (TRAB.llave) pintarTrabajos(); else pintarCandado();
}
const pintarBarraSinTrabajos = pintarBarraMover;
pintarBarraMover = function () { pintarBarraSinTrabajos(); botonMover('📁 Mis trabajos', 'Carga, abre o quita tus trabajos con tu llave', abrirTrabajos); };
pintarBarraMover();
