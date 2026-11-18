// FITWEARMX Studio · Plantilla "Solo prendas" (nov-2026): como el inicio de la Pauta Black Friday,
// pero puras prendas: cada una grande, sin fondo, sobre el morado, con su nombre, "Ordena con $X" y "Liquidas con $Y".
// Tú eliges las prendas en el elegidor; usa armado de studio-pauta.js (título, marca, fecha).

const SOLO_PASO = 0.5;   // segundos por prenda (el dueño la quiere rápida: 0.5, 18-nov)

async function armarSoloPrendas(prendas, marca, fecha, titulo = 'BLACK FRIDAY') {
  const T = [], F = +(prendas.length * SOLO_PASO).toFixed(2), din = x => '$' + x.toLocaleString('es-MX');
  prendas.forEach((p, i) => {
    const t = +(i * SOLO_PASO).toFixed(2), m = montosTarjeta({ precio: p.precio, envio: 90 });
    T.push(nuevoClip('tarjeta', { ini: t, dur: SOLO_PASO, src: p.src, estilo: 'post', num: '', ancho: 0.36, empuje: 0.04, cinta: '', subeEn: 0, subeDur: 0, subePx: 0,
      marcoY: 0, marcoAlto: 1920, nombre: '', precio: 0, envio: 90, x: 20, y: 470, w: 1040, h: 960, focoY: 0, fadeIn: 0, fadeOut: 0, sonido: 'whoosh' }));
    T.push(pautaTexto(t, SOLO_PASO, p.nombre.toUpperCase(), { tam: 40, peso: 700, color: '#b9b4d6', y: 1470 }));
    T.push(pautaTexto(t, SOLO_PASO, 'Ordena con ' + din(m.ordena), { tam: 84, peso: 900, color: '#f5f0f6', y: 1580, italica: 'si' }));
    T.push(pautaTexto(t, SOLO_PASO, 'Liquidas con ' + din(m.liquida), { tam: 54, peso: 700, color: '#8f85ff', y: 1675 }));
    if (i) T.push(nuevoClip('transicion', { ini: t, dur: 0.18, crece: 0.08 }));
  });
  T.push(pautaTexto(0, F, titulo.toUpperCase(), { tam: 134, peso: 900, color: '#f5f0f6', y: 290, entrada: 'golpe', italica: 'si', mx: 0, my: -67 }));
  T.push(pautaTexto(0.1, F - 0.1, marca.toUpperCase(), { tam: 134, peso: 900, color: '#6a5efa', y: 420, entrada: 'golpe', italica: 'si', mx: 0, my: -44 }));
  T.push(nuevoClip('destello', { ini: 0, dur: 0.18, color: '#8f85ff', fuerza: 0.3 }));
  P.clips = [nuevoClip('fondo', { ini: 0, dur: F, color1: '#111226', color2: '#08090d', fadeIn: 0, fadeOut: 0 }),
    nuevoClip('marcaAgua', { ini: 0, dur: F, src: 'logo.png', opacidad: 0.07, tam: 1700, x: 170, y: 760, fadeIn: 0, fadeOut: 0 }), ...T];
  Object.assign(P, { look: 'normal', fps: 60, calidad: '4k' });
  if ($('selCalidad')) $('selCalidad').value = '4k';
  if ($('selFps')) $('selFps').value = '60';
  await ritmoAlProyecto(120);
  const mu = P.clips.find(c => c.tipo === 'musica');
  if (mu) Object.assign(mu, { ini: 0, dur: F, desde: 2, volumen: 0.6, fadeOut: 1 });
  cambio();
}

function tarjetaSoloPrendas() {
  const d = document.createElement('button');
  d.type = 'button'; d.className = 'tarjeta';
  d.innerHTML = '<div class="poster" style="background-image:url(pauta-bf.jpg)"></div><div class="info"><b>Solo prendas ★</b>'
    + '<span>Puras prendas, grandes y sin fondo sobre el morado, cada una con "Ordena con" y "Liquidas con". Tú eliges cuáles. 4K 60 fps.</span></div>';
  d.onclick = () => { verVista('editor'); abrirPauta('solo'); };
  return d;
}
$('rejillaPlantillas').children[0].after(tarjetaSoloPrendas());
$('atajos').children[0].after(tarjetaSoloPrendas());
