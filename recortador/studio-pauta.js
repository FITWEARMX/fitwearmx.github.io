// FITWEARMX Studio · Pauta completa (receta de la pauta Black Friday YoungLA / One Piece del 6-nov, 4K 60 fps).
// Eliges marca, fecha y prendas; arma todo solo: prenda por prenda con "Ordena con $X", pedidos reales (si cargaste ese video),
// carrusel de precios que sube, caja en la puerta con las 3 formas de pago, "Mándame el número de tu prenda" y logo.
// Usa las funciones que ya existen (quitar fondo, armarCinta, ritmo). No guarda fotos ni precios en la página.

const PAUTA = { activa: null };
const PAUTA_ARMADORES = {};   // otras plantillas se registran aquí (ej. studio-plantilla-pared.js)
const PAUTA_INTRO = 9, PAUTA_PASO = 0.5;

function pautaTexto(ini, dur, texto, extra) {
  return nuevoClip('texto', { ini: +ini.toFixed(2), dur: +dur.toFixed(2), texto, brillo: '', linea: 'no', colorLinea: '#a855f7', logoFin: '',
    fadeIn: 0, fadeOut: 0, entrada: 'nada', sonido: 'no', ...extra });
}

async function armarPauta(prendas, marca, fecha, titulo = 'BLACK FRIDAY') {
  const T = [];   // clips nuevos
  const nI = Math.min(PAUTA_INTRO, prendas.length), I = nI * PAUTA_PASO;
  // 1) prenda por prenda con su "Ordena con"
  prendas.slice(0, nI).forEach((p, i) => {
    const t = i * PAUTA_PASO;
    T.push(nuevoClip('tarjeta', { ini: t, dur: PAUTA_PASO, src: p.src, estilo: 'post', num: '', ancho: 0.3, empuje: 0.03, cinta: '', subeEn: 0, subeDur: 0, subePx: 0,
      marcoY: 0, marcoAlto: 1920, nombre: '', precio: 0, envio: 90, x: 40, y: 500, w: 1000, h: 810, focoY: 0, fadeIn: 0, fadeOut: 0, sonido: 'whoosh' }));
    T.push(pautaTexto(t, PAUTA_PASO, 'Ordena con $' + anticipoDe(p.precio), { tam: 58, peso: 800, color: '#8f85ff', y: 1500 }));
  });
  T.push(pautaTexto(0, I, titulo.toUpperCase(), { tam: 134, peso: 900, color: '#f5f0f6', y: 290, entrada: 'golpe', italica: 'si', mx: 0, my: -67 }));
  T.push(pautaTexto(0.1, I - 0.1, marca.toUpperCase(), { tam: 134, peso: 900, color: '#6a5efa', y: 420, entrada: 'golpe', italica: 'si', mx: 0, my: -44 }));
  T.push(pautaTexto(0.25, I - 0.25, 'Preventa · ' + fecha, { tam: 66, peso: 700, color: '#f5f0f6', y: 1352, sonido: 'brillo', mx: 0, my: 42 }));
  T.push(nuevoClip('destello', { ini: 0, dur: 0.18, color: '#8f85ff', fuerza: 0.3 }));
  T.push(nuevoClip('transicion', { ini: I, dur: 0.4, crece: 0.14 }));
  // 2) pedidos reales: solo si ya cargaste el video del negocio
  const vid = Object.keys(medios).find(n => /negocio|pedidos/i.test(n) && /\.(mp4|mov|webm)$/i.test(n));
  const V = vid ? 2 : 0;
  if (vid) T.push(nuevoClip('video', { ini: I, dur: V, src: vid, nota: '', desde: 15.95, zoomIni: 1, zoomFin: 1.03, focoX: 0.5, focoY: 0.5, cine: 'no', volumen: 0, anillo: '', fadeIn: 0, fadeOut: 0, sonido: 'no' }));
  // 3) carrusel de precios
  const C = I + V, grupo = 'cinta-' + Date.now();
  P.clips = T;
  const dur = armarCinta(prendas, C, grupo, 0, 0, { titulo: titulo.toUpperCase() + ' · ' + fecha.toUpperCase(), nota: '“Liquidas con” ya incluye envío en Monterrey' });
  for (const c of P.clips) if (c.grupo === grupo && c.tipo === 'texto') Object.assign(c, c.tam === 62 ? { y: 165 } : { y: 246, tam: 30 });
  const subeEn = Math.max(...P.clips.filter(c => c.grupo === grupo && c.tipo === 'tarjeta').map(c => c.subeEn));
  const E = +(C + dur).toFixed(2);
  P.clips.push(nuevoClip('transicion', { ini: C, dur: 0.45, crece: 0.14 }));
  P.clips.push(nuevoClip('destello', { ini: subeEn, dur: 0.1, color: '#8f85ff', fuerza: 0, sonido: 'whoosh' }));
  P.clips.push(nuevoClip('destello', { ini: +(E - 0.9).toFixed(2), dur: 0.1, color: '#8f85ff', fuerza: 0, sonido: 'subida' }));
  // 4) caja en la puerta con las 3 formas de pago
  P.clips.push(nuevoClip('transicion', { ini: E, dur: 0.5, crece: 0.14, sonido: 'golpe' }));
  P.clips.push(nuevoClip('puerta', { ini: E, dur: 4.6, src: 'logo.png', color: '#1a1520', luz: '#6a5efa', fadeIn: 0, fadeOut: 0, sonido: 'auto', volSonido: 0.7 }));
  [['🚚', 'Monterrey', 'Liquidas cuando llegue a nuestra bodega', 360, 'whoosh'], ['💵', 'En efectivo', 'Le pagas al chofer cuando te entrega', 570, 'whoosh'],
   ['📦', 'Otro estado', 'Liquidas el restante y te lo mandamos por paquetería', 780, 'exito']].forEach(([icono, titulo, texto, y, sonido], i) =>
    P.clips.push(nuevoClip('explica', { ini: +(E + 0.3 + i * 0.4).toFixed(2), dur: +(4.3 - i * 0.4).toFixed(2), icono, titulo, texto, y, color: '#6a5efa', fadeIn: 0, fadeOut: 0, escala: 0.8, sonido })));
  // 5) cierre: número de prenda y logo
  const F = +(E + 4.6).toFixed(2);
  P.clips.push(nuevoClip('fondo', { ini: F, dur: 4.1, color1: '#08090d', color2: '#08090d', fadeIn: 0, fadeOut: 0 }));
  P.clips.push(nuevoClip('transicion', { ini: F, dur: 0.5, crece: 0.2, sonido: 'whoosh' }));
  P.clips.push(pautaTexto(F, 1.6, 'Mándame el número de tu prenda', { tam: 92, peso: 900, color: '#f5f0f6', y: 960, fadeOut: 0.15, italica: 'si', entrada: 'golpe' }));
  P.clips.push(nuevoClip('transicion', { ini: +(F + 1.6).toFixed(2), dur: 0.5, crece: 0.2, sonido: 'brillo' }));
  P.clips.push(nuevoClip('logo', { ini: +(F + 1.6).toFixed(2), dur: 2.5, src: 'logo.png', texto: '', sub: '', color: '#6a5efa', tam: 150, y: 960, fadeIn: 0, fadeOut: 0 }));
  // fondo morado oscuro y logo de agua de principio a fin del contenido
  P.clips.unshift(nuevoClip('fondo', { ini: 0, dur: F, color1: '#111226', color2: '#08090d', fadeIn: 0, fadeOut: 0 }),
    nuevoClip('marcaAgua', { ini: 0, dur: F, src: 'logo.png', opacidad: 0.07, tam: 1700, x: 170, y: 760, fadeIn: 0, fadeOut: 0 }));
  // misma calidad: 4K, 60 fps, look normal
  Object.assign(P, { look: 'normal', fps: 60, calidad: '4k' });
  if ($('selCalidad')) $('selCalidad').value = '4k';
  if ($('selFps')) $('selFps').value = '60';
  // ritmo propio de 120 BPM, como el original
  await ritmoAlProyecto(120);
  const m = P.clips.find(c => c.tipo === 'musica');
  if (m) Object.assign(m, { ini: 0, desde: 2, volumen: 0.6, fadeOut: 1.5 });
  cambio();
}

async function abrirPauta(modo = 'pauta') {
  const titulo = prompt((modo !== 'pauta' ? 'Paso 1 de 2' : 'Paso 1 de 3') + ' · Letra grande de arriba (ej. BLACK FRIDAY, RESTOCK, DROP NUEVO)', 'BLACK FRIDAY');
  if (!titulo) return;
  const marca = modo === 'pared' ? prompt('Paso 2 de 2 · Letrero chiquito de arriba (ej. YOUNGLA · PREVIEW, GYMSHARK · BLACK FRIDAY)', 'YOUNGLA · PREVIEW')
    : prompt((modo === 'solo' ? 'Paso 2 de 2' : 'Paso 2 de 3') + ' · ¿Qué marca? Sale en morado abajo del título (ej. YoungLA, Gymshark, Breathe Divinity)', 'YoungLA');
  if (!marca) return;
  // "Solo prendas" no lleva fecha (va en la descripción del post)
  const fecha = modo !== 'pauta' ? '-' : prompt('Paso 3 de 3 · ¿Qué fecha va en "Preventa · …"? (ej. 24 de nov)', '24 de nov');
  if (!fecha) return;
  PAUTA.activa = { modo, titulo: titulo.trim(), marca: marca.trim(), fecha: fecha.trim() };
  await abrirCarrusel();
  $('carTitulo').textContent = modo !== 'pauta' ? PAUTA.activa.marca + ': toca las prendas que quieras (salen todas, una por una)' : 'Pauta ' + PAUTA.activa.marca + ': elige prendas (las primeras 9 salen una por una)';
  $('carHacer').textContent = (PAUTA.activa.modo !== 'pauta' ? 'Crear video con ' : 'Crear pauta con ') + CAR.marcados.size + ' prendas';
}

// El botón "Crear" del elegidor hace la pauta completa cuando viene de "Pauta completa"; si no, hace el carrusel de siempre.
const carHacerNormal = $('carHacer').onclick;
$('carHacer').onclick = async () => {
  if (!PAUTA.activa) return carHacerNormal();
  if (!CAR.marcados.size) { $('carEstado').textContent = 'Toca al menos una prenda.'; return; }
  if (!confirm('Se arma la pauta nueva en el editor. Lo que tienes ahorita se puede regresar con Deshacer. ¿Sigo?')) return;
  const boton = $('carHacer'); boton.disabled = true;
  const avisar = t => $('carEstado').textContent = t, sinFondo = $('carFondo').checked, prendas = [];
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
      prendas.push({ src: base, nombre: m.p.nombre, precio: m.precio });
    }
    guardarHist();
    avisar('Armando la pauta…');
    await (PAUTA_ARMADORES[PAUTA.activa.modo] || (PAUTA.activa.modo === 'solo' ? armarSoloPrendas : armarPauta))(prendas, PAUTA.activa.marca, PAUTA.activa.fecha, PAUTA.activa.titulo);
    const eraSolo = PAUTA.activa.modo !== 'pauta';
    CAR.marcados.clear(); modalCar.hidden = true; PAUTA.activa = null; irA(0);
    $('aviso').textContent = eraSolo ? '✅ Video de prendas listo en 4K 60 fps. Revisa precios y exporta.' : '✅ Pauta lista en 4K 60 fps. Revisa precios y exporta.';
  } catch (e) { avisar('No se pudo: ' + e.message); }
  boton.disabled = false;
};
$('carCerrar').addEventListener('click', () => PAUTA.activa = null);
// mientras eliges, el botón dice "Crear pauta"
const pintarCarruselNormal = pintarCarrusel;
pintarCarrusel = function () { pintarCarruselNormal(); if (PAUTA.activa) $('carHacer').textContent = (PAUTA.activa.modo !== 'pauta' ? 'Crear video con ' : 'Crear pauta con ') + CAR.marcados.size + ' prendas'; };
$('carBusca').oninput = pintarCarrusel;
$('carMarca').onchange = pintarCarrusel;

const botonesCarruselNormal = window.pintarBotonesCarrusel;
window.pintarBotonesCarrusel = boton => {
  boton('🛍️ Pauta completa', 'Arma la pauta Black Friday entera (prenda por prenda + carrusel + puerta + logo) en 4K 60 fps', abrirPauta);
  botonesCarruselNormal(boton);
};
pintarBarraMover();

// Plantilla "Pauta Black Friday" (la que se pautó en Meta el 6-nov) arriba en Plantillas y en Inicio.
function tarjetaPauta() {
  const d = document.createElement('button');
  d.type = 'button'; d.className = 'tarjeta';
  d.innerHTML = '<div class="poster" style="background-image:url(pauta-bf.jpg)"></div><div class="info"><b>Pauta Black Friday ★</b>'
    + '<span>La que pautamos. Pones título, marca y fecha, eliges prendas y sale igual: prenda por prenda, pedidos reales, precios, formas de pago y logo. 4K 60 fps.</span></div>';
  d.onclick = () => { verVista('editor'); abrirPauta(); };
  return d;
}
$('rejillaPlantillas').prepend(tarjetaPauta());
$('atajos').prepend(tarjetaPauta());
