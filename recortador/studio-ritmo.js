// FITWEARMX Studio · ritmo propio (beat sin derechos de autor) y paso a WAV.
// Se carga antes del código principal de comercial.html; usa sus funciones ($, duracion, agregarArchivo, P, cambio…) al momento de crear el ritmo.

// ---------- ritmo propio (sin derechos de autor) ----------
// Beat oscuro en La menor (Am-F-C-G): el primer compás sólo pad y platillos, luego bombo, tarola y bajo.
async function crearRitmo(bpm = 120, seg = 24) {
  const sr = 44100, oc = new OfflineAudioContext(2, Math.ceil(sr * seg), sr);
  const master = oc.createGain(); master.gain.value = 0.75;
  const comp = oc.createDynamicsCompressor();
  master.connect(comp); comp.connect(oc.destination);
  const ruido = oc.createBuffer(1, sr, sr), rd = ruido.getChannelData(0);
  for (let i = 0; i < rd.length; i++) rd[i] = Math.random() * 2 - 1;
  const env = (g, t, v, dur) => { g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); };
  const tono = (t, f0, f1, v, dur, tipo = 'sine') => {
    const o = oc.createOscillator(), g = oc.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.3);
    env(g, t, v, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  };
  const ruidoF = (t, dur, tipo, f, v) => {
    const s = oc.createBufferSource(), fl = oc.createBiquadFilter(), g = oc.createGain();
    s.buffer = ruido; fl.type = tipo; fl.frequency.value = f; env(g, t, v, dur);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  };
  const bajo = (t, f, dur) => {
    const o = oc.createOscillator(), fl = oc.createBiquadFilter(), g = oc.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 240;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
    g.gain.setValueAtTime(0.45, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  };
  const pad = (t, notas, dur) => {
    for (const f of notas) for (const det of [-7, 7]) {
      const o = oc.createOscillator(), fl = oc.createBiquadFilter(), g = oc.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; fl.type = 'lowpass'; fl.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.5);
      g.gain.setValueAtTime(0.03, t + dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); fl.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
  };
  const prog = [[55, [220, 261.6, 329.6]], [43.65, [174.6, 220, 261.6]], [65.4, [261.6, 329.6, 392]], [49, [196, 246.9, 293.7]]];
  const beat = 60 / bpm, compas = beat * 4;
  for (let b = 0; b * compas < seg; b++) {
    const t = b * compas, [fb, acorde] = prog[b % 4];
    pad(t, acorde, compas);
    for (let i = 0; i < 8; i++) if (t + i * beat / 2 < seg) ruidoF(t + i * beat / 2, 0.05, 'highpass', 8000, i % 2 ? 0.1 : 0.18);
    if (b === 0) { ruidoF(t + compas - beat, beat, 'bandpass', 3000, 0.25); continue; }
    for (const k of [0, 2, 2.75]) tono(t + k * beat, 150, 42, 1, 0.45);
    for (const s of [1, 3]) { ruidoF(t + s * beat, 0.22, 'bandpass', 1800, 0.6); tono(t + s * beat, 190, 0, 0.35, 0.12, 'triangle'); }
    bajo(t, fb, beat * 1.5); bajo(t + beat * 2, fb, beat * 1.5);
  }
  return aWav(await oc.startRendering());
}
function aWav(buf) {
  const n = buf.length, ch = buf.numberOfChannels, dv = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const txt = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  txt(0, 'RIFF'); dv.setUint32(4, 36 + n * ch * 2, true); txt(8, 'WAVE'); txt(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true); dv.setUint32(24, buf.sampleRate, true);
  dv.setUint32(28, buf.sampleRate * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true);
  txt(36, 'data'); dv.setUint32(40, n * ch * 2, true);
  const datos = [...Array(ch)].map((_, i) => buf.getChannelData(i));
  for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < ch; c++, o += 2) {
    const s = clamp(datos[c][i], -1, 1); dv.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([dv], { type: 'audio/wav' });
}
async function ritmoAlProyecto(bpm = 120) {
  $('aviso').textContent = 'Creando el ritmo…';
  const seg = Math.ceil(duracion() + 1);
  const nombre = await agregarArchivo(new File([await crearRitmo(bpm, seg)], `Ritmo ${bpm}bpm.wav`, { type: 'audio/wav' }));
  guardarHist();
  const m = P.clips.find(c => c.tipo === 'musica' && !medios[c.src]);
  if (m) m.src = nombre; else P.clips.push(nuevoClip('musica', { src: nombre, ini: 0, dur: r1(Math.max(1, seg - 1)) }));
  $('aviso').textContent = '🥁 Ritmo listo (' + bpm + ' BPM). Es tuyo, sin derechos de autor.';
  cambio();
  return nombre;
}
