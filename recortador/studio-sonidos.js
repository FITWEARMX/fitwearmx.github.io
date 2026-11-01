// FITWEARMX Studio · efectos de sonido (whoosh, golpe, brillo, pop, clic, ding, subida, éxito).
// Se carga antes del código principal de comercial.html; usa sus variables (pista, oculta) al momento de sonar.

// ---------- efectos de sonido (hechos aquí, sin derechos de autor) ----------
const SONIDOS = { auto: '✨ Automático', no: 'Ninguno', whoosh: 'Whoosh (pasa rápido)', golpe: 'Golpe grave', brillo: 'Brillo / destello',
  pop: 'Pop', clic: 'Clic', ding: 'Ding de notificación', subida: 'Subida (riser)', exito: 'Éxito (pedido listo)' };
const SONIDO_AUTO = { texto: 'whoosh', logo: 'brillo', marcas: 'pop', notificacion: 'ding', boton: 'exito', mapa: 'subida', puerta: 'golpe',
  caja: 'golpe', explica: 'whoosh', producto: 'whoosh', celular: 'whoosh', sombra: 'whoosh' };
const sonidoDe = c => !c.sonido || c.sonido === 'auto' ? SONIDO_AUTO[c.tipo] || 'no' : c.sonido;
let ruidoBuf = null;
function ruidoDe(ac) {
  if (ruidoBuf && ruidoBuf.sampleRate === ac.sampleRate) return ruidoBuf;
  ruidoBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ruidoBuf;
}
// Toca el efecto `tipo` en el contexto `ac` (en vivo o para exportar), empezando en `t`, con volumen `v`.
function efecto(ac, salida, tipo, t, v = 0.7) {
  const g = ac.createGain(); g.gain.value = v; g.connect(salida);
  const env = (n, a, d, pico = 1) => { n.gain.setValueAtTime(0.0001, t); n.gain.exponentialRampToValueAtTime(pico, t + a); n.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const tono = (f0, f1, dur, forma = 'sine', pico = 1, ini = 0) => {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = forma;
    o.frequency.setValueAtTime(f0, t + ini); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + ini + dur);
    e.gain.setValueAtTime(0.0001, t + ini); e.gain.exponentialRampToValueAtTime(pico, t + ini + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + ini + dur);
    o.connect(e); e.connect(g); o.start(t + ini); o.stop(t + ini + dur + 0.05);
  };
  const ruido = (dur, tipoF, f0, f1, a, pico = 1, q = 1) => {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
    s.buffer = ruidoDe(ac); f.type = tipoF; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(e, a, Math.max(0.02, dur - a), pico); s.connect(f); f.connect(e); e.connect(g); s.start(t); s.stop(t + dur + 0.05);
  };
  if (tipo === 'whoosh') ruido(0.45, 'bandpass', 400, 3500, 0.18, 0.9, 1.2);
  else if (tipo === 'golpe') { tono(140, 38, 0.6, 'sine', 1); ruido(0.25, 'lowpass', 900, 200, 0.005, 0.6); }
  else if (tipo === 'brillo') { [1760, 2349, 2960, 3520].forEach((f, i) => tono(f, 0, 0.9, 'sine', 0.22, i * 0.05)); ruido(0.6, 'highpass', 6000, 9000, 0.05, 0.25); }
  else if (tipo === 'pop') tono(700, 220, 0.09, 'sine', 0.8);
  else if (tipo === 'clic') ruido(0.03, 'highpass', 3000, 0, 0.002, 0.7);
  else if (tipo === 'ding') { tono(1318, 0, 0.6, 'sine', 0.5); tono(1760, 0, 0.8, 'sine', 0.45, 0.12); }
  else if (tipo === 'subida') { ruido(1.4, 'bandpass', 300, 6000, 1.2, 0.6, 2); tono(110, 440, 1.4, 'sawtooth', 0.08); }
  else if (tipo === 'exito') { tono(784, 0, 0.25, 'triangle', 0.4); tono(1047, 0, 0.35, 'triangle', 0.4, 0.09); tono(1568, 0, 0.5, 'sine', 0.3, 0.18); }
}
// los golpes de sonido de un bloque: [tiempo, tipo]
function golpesDe(c) {
  if (pista(c.pista).audio || oculta(c.pista)) return [];
  const tipo = sonidoDe(c);
  if (!tipo || tipo === 'no') return [];
  if (c.tipo === 'marcas' && tipo === 'pop') return String(c.logos || '').split(',').filter(Boolean).map((_, i) => [c.ini + i * 0.12, 'pop']);
  if (c.tipo === 'boton' && (!c.sonido || c.sonido === 'auto')) return [[c.ini + 0.45, 'whoosh'], [c.ini + 1.38, 'exito']];
  return [[c.ini, tipo]];
}
