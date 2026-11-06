// FITWEARMX Studio · guarda tus fotos y videos en este aparato para que el proyecto siga completo al volver a abrir.
// Antes los archivos se perdían al recargar. Nunca borra nada por su cuenta.

const DB_MEDIOS = 'fitwearmx-studio-medios';
function abrirMedios() {
  return new Promise((ok, no) => {
    const r = indexedDB.open(DB_MEDIOS, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('archivos', { keyPath: 'nombre' });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
async function guardarMedio(nombre, archivo) {
  try {
    const d = await abrirMedios();
    await new Promise((ok, no) => {
      const tx = d.transaction('archivos', 'readwrite');
      tx.objectStore('archivos').put({ nombre, blob: archivo, tipo: archivo.type });
      tx.oncomplete = ok; tx.onerror = () => no(tx.error);
    });
    d.close();
  } catch (e) { console.warn('no se guardó el archivo', nombre, e); }
}
const agregarSinGuardar = agregarArchivo;
agregarArchivo = function (f, nombre) {
  const p = agregarSinGuardar(f, nombre);
  p.then(n => guardarMedio(n, f));
  return p;
};
// Al abrir Studio regresa los archivos que usa el proyecto.
async function recuperarMedios() {
  try {
    const d = await abrirMedios();
    const lista = await new Promise((ok, no) => {
      const r = d.transaction('archivos').objectStore('archivos').getAll();
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
    });
    d.close();
    for (const m of lista) if (!medios[m.nombre]) await agregarSinGuardar(new File([m.blob], m.nombre, { type: m.tipo }), m.nombre);
    if (lista.length) cambio();
  } catch (e) { console.warn('no pude recuperar tus archivos', e); }
}
recuperarMedios();
