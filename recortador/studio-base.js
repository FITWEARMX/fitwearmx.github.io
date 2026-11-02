// FITWEARMX Studio · constantes, tipos de bloque, estado del proyecto y utilidades.
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

const $ = id => document.getElementById(id);
const W = 1080, H = 1920;
const lienzo = $('lienzo'), ctx = lienzo.getContext('2d');
const FUENTE = '-apple-system, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif';
const ALTO = 46;

// Pistas, de abajo hacia arriba (la de arriba tapa a la de abajo), como en DaVinci.
const PISTAS = [
  { id: 'V1', nombre: 'Video', color: '#3b82f6' },
  { id: 'V2', nombre: 'Celular', color: '#06b6d4' },
  { id: 'FX', nombre: 'Efectos', color: '#22c55e' },
  { id: 'T1', nombre: 'Texto', color: '#eab308' },
  { id: 'A1', nombre: 'Música', color: '#ec4899', audio: true },
  { id: 'A2', nombre: 'Voz', color: '#f97316', audio: true },
];
const pista = id => PISTAS.find(p => p.id === id) || PISTAS[0];
const AUDIO = ['musica', 'voz'];

const FADES = [['fadeIn', 'Aparece (s)', 'rango', 0, 2, 0.05], ['fadeOut', 'Desaparece (s)', 'rango', 0, 2, 0.05]];
const TIPOS = {
  fondo: { nombre: 'Fondo', icono: '🌌', pista: 'V1', dur: 4,
    def: { color1: '#2a1550', color2: '#030207', fadeIn: 0, fadeOut: 0 },
    campos: [['color1', 'Color centro', 'color'], ['color2', 'Color orilla', 'color'], ...FADES] },
  video: { nombre: 'Video/foto', icono: '🎬', pista: 'V1', dur: 3,
    def: { src: '', nota: '', desde: 0, zoomIni: 1, zoomFin: 1.08, focoX: 0.5, focoY: 0.5, cine: 'no', volumen: 0, anillo: '', fadeIn: 0.1, fadeOut: 0.1 },
    campos: [['src', 'Archivo', 'medio', 'video,imagen'], ['nota', 'Nota', 'texto'], ['desde', 'Empieza en (s)', 'num', 0, 3600, 0.1],
      ['zoomIni', 'Zoom inicio', 'rango', 1, 2.5, 0.01], ['zoomFin', 'Zoom final', 'rango', 1, 2.5, 0.01], ['focoX', 'Zoom hacia ↔', 'rango', 0, 1, 0.01], ['focoY', 'Zoom hacia ↕', 'rango', 0, 1, 0.01],
      ['cine', 'Filtro de cine encima', 'sel', { no: 'No (se ve limpio y nítido)', si: 'Sí' }],
      ['volumen', 'Volumen', 'rango', 0, 1, 0.05], ['anillo', 'Anillo de luz', 'color'], ...FADES] },
  celular: { nombre: 'Celular', icono: '📱', pista: 'V2', dur: 6,
    def: { src: '', nota: 'Tu grabación de pantalla', desde: 0, escala: 0.64, x: 0, y: 60, entrada: 'subir', flotar: 'si', marco: 'morado',
      zoomIni: 1, zoomFin: 1, focoX: 0.5, focoY: 0.5, brillo: '#7c3aed', volumen: 0, toque: 'no', toqueX: 0.5, toqueY: 0.5, toqueT: 1, fadeIn: 0, fadeOut: 0.2 },
    campos: [['src', 'Pantalla', 'medio', 'video,imagen'], ['nota', 'Nota', 'texto'], ['desde', 'Empieza en (s)', 'num', 0, 3600, 0.1],
      ['marco', 'Color', 'sel', { morado: 'Morado oscuro', negro: 'Negro espacial', plata: 'Plata', oro: 'Oro' }],
      ['entrada', 'Entrada', 'sel', { subir: 'Sube flotando', nada: 'Ya está ahí' }], ['flotar', 'Flotar', 'sel', { si: 'Sí', no: 'No' }],
      ['escala', 'Tamaño', 'rango', 0.3, 1, 0.01], ['x', 'Mover ↔', 'rango', -500, 500, 1], ['y', 'Mover ↕', 'rango', -900, 900, 1],
      ['zoomIni', 'Zoom inicio', 'rango', 1, 3, 0.01], ['zoomFin', 'Zoom final', 'rango', 1, 3, 0.01],
      ['focoX', 'Zoom hacia ↔', 'rango', 0, 1, 0.01], ['focoY', 'Zoom hacia ↕', 'rango', 0, 1, 0.01],
      ['brillo', 'Luz detrás', 'color'], ['volumen', 'Volumen', 'rango', 0, 1, 0.05],
      ['toque', 'Dedo que toca', 'sel', { no: 'No', si: 'Sí' }], ['toqueX', 'Toque ↔', 'rango', 0, 1, 0.01], ['toqueY', 'Toque ↕', 'rango', 0, 1, 0.01],
      ['toqueT', 'Toca en (s)', 'num', 0, 600, 0.05], ...FADES] },
  sombra: { nombre: 'Sombra + prenda', icono: '👤', pista: 'V2', dur: 4,
    def: { src: '', nota: 'Tu video: alguien moviéndose', prenda: '', desde: 0, luz: '#7c3aed', detalle: 0.12, zoomIni: 1, zoomFin: 1.15,
      anchoPrenda: 2.2, subirPrenda: 0, volumen: 0, fadeIn: 0.1, fadeOut: 0.2 },
    campos: [['src', 'Video', 'medio', 'video'], ['prenda', 'Prenda encima', 'medio', 'imagen'], ['nota', 'Nota', 'texto'],
      ['desde', 'Empieza en (s)', 'num', 0, 3600, 0.1], ['luz', 'Luz del contorno', 'color'], ['detalle', 'Se ve el cuerpo', 'rango', 0, 0.6, 0.01],
      ['anchoPrenda', 'Tamaño prenda', 'rango', 1, 3.5, 0.01], ['subirPrenda', 'Subir/bajar prenda', 'rango', -0.5, 0.5, 0.01],
      ['zoomIni', 'Zoom inicio', 'rango', 1, 2.5, 0.01], ['zoomFin', 'Zoom final', 'rango', 1, 2.5, 0.01], ['volumen', 'Volumen', 'rango', 0, 1, 0.05], ...FADES] },
  producto: { nombre: 'Prenda', icono: '👕', pista: 'V2', dur: 1.8,
    def: { src: '', nota: 'Foto de la prenda sin fondo', cuerpo: 'no', escala: 0.82, x: 0, y: 900, entrada: 'zoom', flotar: 'si', girar: 'si', luz: '#7c3aed', zoomFin: 1.06, fadeIn: 0, fadeOut: 0.15 },
    campos: [['src', 'Foto', 'medio', 'imagen'], ['nota', 'Nota', 'texto'],
      ['cuerpo', 'Cuerpo', 'sel', { no: 'Sin cuerpo', foto: 'Modelo de la foto en sombra', sombra: 'Sombra dibujada (de frente)' }],
      ['entrada', 'Entrada', 'sel', { zoom: 'Sale de la oscuridad', subir: 'Sube', nada: 'Ya está ahí' }],
      ['flotar', 'Flotar', 'sel', { si: 'Sí', no: 'No' }], ['girar', 'Girar suave', 'sel', { si: 'Sí', no: 'No' }],
      ['escala', 'Tamaño', 'rango', 0.3, 1.2, 0.01], ['x', 'Mover ↔', 'rango', -500, 500, 1], ['y', 'Altura', 'rango', 200, 1700, 1],
      ['zoomFin', 'Acercar', 'rango', 1, 1.5, 0.01], ['luz', 'Luz detrás', 'color'], ...FADES] },
  texto: { nombre: 'Texto', icono: '🅰️', pista: 'T1', dur: 1.6,
    def: { texto: 'Elige.', tam: 150, peso: 800, color: '#ffffff', y: 300, brillo: '', linea: 'no', colorLinea: '#a855f7', logoFin: '', fadeIn: 0, fadeOut: 0.3 },
    campos: [['texto', 'Texto', 'area'], ['tam', 'Tamaño', 'rango', 40, 320, 1], ['peso', 'Grosor', 'sel', { 400: 'Normal', 600: 'Semi', 800: 'Negrita', 900: 'Extra' }],
      ['color', 'Color', 'color'], ['y', 'Altura', 'rango', 80, 1840, 1], ['brillo', 'Brillo', 'color'],
      ['linea', 'Línea brillante', 'sel', { no: 'No', si: 'Sí' }], ['colorLinea', 'Color línea', 'color'], ['logoFin', 'La línea termina en logo', 'medio', 'imagen'], ...FADES] },
  notificacion: { nombre: 'Notificación', icono: '🔔', pista: 'FX', dur: 2.6,
    def: { app: 'FITWEARMX', titulo: 'Tu pedido llegó 📦', cuerpo: 'Venom Track Jacket · Rojo · Talla L', y: 90 },
    campos: [['app', 'App', 'texto'], ['titulo', 'Título', 'texto'], ['cuerpo', 'Mensaje', 'texto'], ['y', 'Altura', 'rango', 40, 1600, 1]] },
  boton: { nombre: 'Botón', icono: '🟢', pista: 'FX', dur: 2.6,
    def: { texto: 'Pedir por WhatsApp', textoFin: 'Pedido enviado ✓', color: '#25D366', y: 1640 },
    campos: [['texto', 'Texto', 'texto'], ['textoFin', 'Al final dice', 'texto'], ['color', 'Color', 'color'], ['y', 'Altura', 'rango', 100, 1800, 1]] },
  mapa: { nombre: 'Mapa con ruta', icono: '🗺', pista: 'V2', dur: 3.5,
    def: { origen: 'USA 🇺🇸', destino: 'Monterrey 🇲🇽', color: '#fbbf24', titulo: 'Llega en 2 a 3 semanas', sub: 'En camino a Monterrey',
      pasos: 'Ordenado,En USA,En camino,Entregado', fadeIn: 0.2, fadeOut: 0.2 },
    campos: [['origen', 'Sale de', 'texto'], ['destino', 'Llega a', 'texto'], ['color', 'Color de la ruta', 'color'],
      ['titulo', 'Tarjeta: título', 'texto'], ['sub', 'Tarjeta: abajo', 'texto'], ['pasos', 'Pasos (con comas)', 'texto'], ...FADES] },
  marcas: { nombre: 'Marcas', icono: '🏷', pista: 'FX', dur: 3,
    def: { logos: '', columnas: 2, tam: 1, y: 960, color: '#ffffff', fadeIn: 0, fadeOut: 0.2 },
    campos: [['logos', 'Logos (nombres de archivo con comas)', 'area'], ['columnas', 'Columnas', 'rango', 1, 4, 1],
      ['tam', 'Tamaño', 'rango', 0.5, 1.6, 0.01], ['y', 'Altura', 'rango', 300, 1600, 1], ['color', 'Brillo', 'color'], ...FADES] },
  puerta: { nombre: 'Caja en la puerta', icono: '🚪', pista: 'V2', dur: 2.5,
    def: { src: '', color: '#1a1520', luz: '#a855f7', fadeIn: 0.2, fadeOut: 0.2 },
    campos: [['src', 'Logo en la caja', 'medio', 'imagen'], ['color', 'Color de la caja', 'color'], ['luz', 'Luz', 'color'], ...FADES] },
  explica: { nombre: 'Tarjeta con dibujo', icono: '🪧', pista: 'FX', dur: 3,
    def: { icono: '🚚', titulo: 'Monterrey', texto: 'El restante se lo pagas al chofer en efectivo', y: 760, color: '#a855f7', fadeIn: 0, fadeOut: 0.25 },
    campos: [['icono', 'Dibujo (emoji)', 'texto'], ['titulo', 'Título', 'texto'], ['texto', 'Explicación', 'area'], ['y', 'Altura', 'rango', 200, 1700, 1], ['color', 'Color', 'color'], ...FADES] },
  caja: { nombre: 'Caja 3D', icono: '📦', pista: 'V2', dur: 2.5,
    def: { src: '', color: '#141416', brillo: '#a855f7', tam: 1, y: 1000, fadeIn: 0.15, fadeOut: 0.2 },
    campos: [['src', 'Logo en la caja', 'medio', 'imagen'], ['color', 'Color de la caja', 'color'], ['brillo', 'Anillo de luz', 'color'],
      ['tam', 'Tamaño', 'rango', 0.5, 1.6, 0.01], ['y', 'Altura', 'rango', 400, 1600, 1], ...FADES] },
  logo: { nombre: 'Logo', icono: '✴️', pista: 'FX', dur: 3,
    def: { src: '', texto: 'FITWEARMX', sub: 'fitwearmx.github.io/tienda', color: '#a855f7', tam: 150, y: 900, fadeIn: 0, fadeOut: 0 },
    campos: [['src', 'Logo en imagen', 'medio', 'imagen'], ['texto', 'Logo (letras)', 'texto'], ['sub', 'Abajo dice', 'texto'], ['color', 'Brillo', 'color'], ['tam', 'Tamaño', 'rango', 60, 260, 1],
      ['y', 'Altura', 'rango', 200, 1700, 1], ...FADES] },
  voz: { nombre: 'Voz', icono: '🎙', pista: 'A2', dur: 3,
    def: { src: '', guion: '', desde: 0, volumen: 1, fadeOut: 0 },
    campos: [['src', 'Audio', 'medio', 'audio,video'], ['guion', 'Lo que dice', 'area'], ['desde', 'Empieza en (s)', 'num', 0, 3600, 0.1],
      ['volumen', 'Volumen', 'rango', 0, 1.5, 0.05]] },
  musica: { nombre: 'Música', icono: '🎵', pista: 'A1', dur: 20,
    def: { src: '', desde: 0, volumen: 0.9, fadeOut: 1.5 },
    campos: [['src', 'Canción', 'medio', 'audio,video'], ['desde', 'Empieza en (s)', 'num', 0, 3600, 0.1], ['volumen', 'Volumen', 'rango', 0, 1, 0.05],
      ['fadeOut', 'Baja al final (s)', 'rango', 0, 5, 0.1]] },
};

const MARCOS = {
  morado: ['#241c30', '#6d5c8a', '#33283f'],
  negro: ['#161618', '#4b4b50', '#252528'],
  plata: ['#8f8f94', '#ececee', '#b3b3b8'],
  oro: ['#7d6848', '#ead6ad', '#a2895f'],
};

// ---------- estado ----------
let P = { clips: [], ocultas: [], mudas: [] };
let medios = {};            // nombre -> { nombre, tipo, url, img, dur }
let sel = null, tAct = 0, tocando = false, exportando = false, raf = 0, pps = 60;
let hist = [];
let actx = null, salidaExp = null, grabadora = null;
const elems = new Map();   // id del bloque -> { src, el, gain }
let sigId = 1;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const eOut = k => 1 - Math.pow(1 - k, 3);
const eInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eBack = k => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const r1 = x => Math.round(x * 100) / 100;

function hexA(hex, a) {
  const h = (hex || '#000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function fmt(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return String(m).padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0');
}
const duracion = () => Math.max(3, ...P.clips.map(c => c.ini + c.dur));
const oculta = id => P.ocultas.includes(id);
const muda = id => P.mudas.includes(id);

function nuevoClip(tipo, extra = {}) {
  const T = TIPOS[tipo];
  return { id: 'c' + (sigId++), tipo, pista: T.pista, ini: r1(tAct), dur: T.dur, ...structuredClone(T.def), ...extra };
}
