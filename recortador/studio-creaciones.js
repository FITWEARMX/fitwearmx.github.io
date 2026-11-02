// FITWEARMX Studio · mis creaciones (IndexedDB) y arranque de la app.
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

// ---------- mis creaciones (se guardan en este aparato) ----------
let posterExp = null;
function miniatura() {
  const m = document.createElement('canvas'); m.width = 270; m.height = 480;
  m.getContext('2d').drawImage(lienzo, 0, 0, 270, 480);
  return m.toDataURL('image/jpeg', 0.7);
}
function abrirDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('fitwearmx-studio', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('creaciones', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function guardarCreacion(blob, nombre) {
  try {
    const d = await abrirDB();
    await new Promise((res, rej) => {
      const tx = d.transaction('creaciones', 'readwrite');
      tx.objectStore('creaciones').put({ id: Date.now(), nombre, fecha: new Date().toISOString(), blob, poster: posterExp, dur: duracion(), modo: MODOS[modo].nombre });
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  } catch (e) { console.warn('no se guardó en creaciones', e); }
}
async function pintarCreaciones() {
  let lista = [];
  try {
    const d = await abrirDB();
    lista = await new Promise(res => { const r = d.transaction('creaciones').objectStore('creaciones').getAll(); r.onsuccess = () => res(r.result.reverse()); r.onerror = () => res([]); });
  } catch (e) {}
  $('creacionesVacio').hidden = lista.length > 0;
  $('rejillaCreaciones').innerHTML = '';
  for (const c of lista) {
    const url = URL.createObjectURL(c.blob), d = document.createElement('div');
    d.className = 'tarjeta';
    d.innerHTML = `<div class="poster"><video muted playsinline loop preload="none"></video></div><div class="info"><b></b><span></span></div><div class="acciones"><a>Descargar</a><button type="button">Borrar</button></div>`;
    const v = d.querySelector('video');
    v.src = url; if (c.poster) v.poster = c.poster;
    d.querySelector('.poster').onclick = () => v.paused ? v.play() : v.pause();
    d.querySelector('b').textContent = c.modo || 'Video';
    d.querySelector('span').textContent = new Date(c.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) + ' · ' + Math.round(c.dur || 0) + ' s';
    const a = d.querySelector('a'); a.href = url; a.download = c.nombre;
    d.querySelector('button').onclick = async () => {
      if (!confirm('¿Borrar este video de tus creaciones?')) return;
      const db = await abrirDB(); db.transaction('creaciones', 'readwrite').objectStore('creaciones').delete(c.id).onsuccess = pintarCreaciones;
    };
    $('rejillaCreaciones').append(d);
  }
}

// arranque
try {
  const guardado = JSON.parse(localStorage.getItem('comercial-proyecto') || 'null');
  if (guardado && guardado.clips && guardado.clips.length) cargar(guardado); else cargar(plantilla());
} catch (e) { cargar(plantilla()); }
