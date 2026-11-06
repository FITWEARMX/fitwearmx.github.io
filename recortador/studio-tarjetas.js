// FITWEARMX Studio · tarjeta de prenda: foto real + nombre + "Ordena con $X / Liquidas con $Y".
// Varias tarjetas pueden ir al mismo tiempo (2×2 = pantalla de 4 prendas). Se empalman en la línea de tiempo y entran una tras otra.
// Si no lleva precio, es solo la foto en grande. Lo que se liquida ya incluye el envío (campo `envio`).

TIPOS.tarjeta = { nombre: 'Tarjeta de prenda', icono: '🏷️', pista: 'V2', dur: 3.5,
  def: { src: '', estilo: 'foto', num: '', ancho: 0.8, empuje: 0, cinta: '', subeEn: 0, subeDur: 0, subePx: 0, marcoY: 0, marcoAlto: 1920, nombre: '', precio: 0, envio: 90, x: 40, y: 205, w: 490, h: 590, focoY: 0.12, fadeIn: 0.15, fadeOut: 0.1 },
  campos: [['src', 'Foto', 'medio', 'imagen'], ['estilo', 'Estilo', 'sel', { foto: 'Foto con su fondo', post: 'Prenda sin fondo (estilo post)' }], ['num', 'Número', 'texto'], ['ancho', 'Tamaño de la prenda', 'rango', 0.3, 1.6, 0.01], ['empuje', 'Acercamiento de cámara', 'rango', 0, 0.3, 0.01], ['nombre', 'Nombre', 'texto'], ['precio', 'Precio (0 = sin precios)', 'num', 0, 99999, 10], ['envio', 'Envío incluido al liquidar', 'num', 0, 9999, 10],
    ['x', 'Izquierda', 'rango', 0, 1040, 1], ['y', 'Arriba', 'rango', 0, 1880, 1], ['w', 'Ancho', 'rango', 200, 1080, 1], ['h', 'Alto', 'rango', 200, 1920, 1],
    ['focoY', 'Parte de la foto ↕', 'rango', 0, 1, 0.01], ...FADES] };
DIBUJAR.tarjeta = dibTarjeta;
// Tu logo escondido en el fondo, como en tus posts.
TIPOS.marcaAgua = { nombre: 'Logo escondido', icono: '💧', pista: 'V1', dur: 4,
  def: { src: '', opacidad: 0.07, tam: 1500, x: 120, y: 700, fadeIn: 0, fadeOut: 0 },
  campos: [['src', 'Logo', 'medio', 'imagen'], ['opacidad', 'Qué tanto se ve', 'rango', 0.02, 0.4, 0.01], ['tam', 'Tamaño', 'rango', 300, 2600, 10], ['x', 'Mover ↔', 'rango', -800, 800, 1], ['y', 'Altura', 'rango', 0, 1920, 1], ...FADES] };
DIBUJAR.marcaAgua = dibMarcaAgua;
function dibMarcaAgua(c, lt) {
  if (!fuenteDe(c)) return;
  const src = logoSinFondo(medios[c.src]);   // siempre en blanco, aunque el archivo sea negro
  const w = c.tam, h = w * src.height / src.width;
  ctx.save(); ctx.globalAlpha = alfa(c, lt) * c.opacidad;
  const deriva = lt * 7;   // se mueve lento, como cámara
  ctx.drawImage(src, W / 2 + c.x - w / 2 - deriva, c.y - h / 2, w, h);
  ctx.restore();
}
SONIDO_AUTO.tarjeta = 'pop';
// Destello entre partes del comercial (también sirve solo para que suene un efecto: fuerza 0).
TIPOS.destello = { nombre: 'Destello', icono: '⚡', pista: 'FX', dur: 0.22,
  def: { color: '#8f85ff', fuerza: 0.75 },
  campos: [['color', 'Color', 'color'], ['fuerza', 'Fuerza', 'rango', 0, 1, 0.05]] };
DIBUJAR.destello = (c, lt) => {
  const q = 1 - clamp(lt / c.dur);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = hexA(c.color, c.fuerza * q * q);
  ctx.fillRect(0, 0, W, H); ctx.restore();
};
SONIDO_AUTO.destello = 'golpe';
// Transición entre partes: lo anterior crece tantito y se desvanece mientras aparece lo nuevo (sin salto de golpe).
TIPOS.transicion = { nombre: 'Transición suave', icono: '🌀', pista: 'FX', dur: 0.45,
  def: { crece: 0.14 },
  campos: [['crece', 'Qué tanto crece', 'rango', 0, 0.4, 0.01]] };
SONIDO_AUTO.transicion = 'whoosh';
const fotoTransicion = { lienzo: document.createElement('canvas'), id: null };
DIBUJAR.transicion = (c, lt) => {
  if (fotoTransicion.id !== c.id) return;
  const p = eOut(clamp(lt / c.dur)), z = 1 + c.crece * p;
  ctx.save(); ctx.globalAlpha = 1 - p;
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(fotoTransicion.lienzo, 0, 0, W, H);
  ctx.restore();
};
// Antes de dibujar el primer cuadro de la transición se guarda el último cuadro de lo anterior.
const renderSinTransicion = render;
render = function (t) {
  const c = P.clips.find(x => x.tipo === 'transicion' && t >= x.ini && t < x.ini + x.dur);
  if (c && fotoTransicion.id !== c.id && t - c.ini < 0.1) {
    const f = fotoTransicion.lienzo;
    if (f.width !== lienzo.width || f.height !== lienzo.height) { f.width = lienzo.width; f.height = lienzo.height; }
    f.getContext('2d').drawImage(lienzo, 0, 0);
    fotoTransicion.id = c.id;
  } else if (!c) fotoTransicion.id = null;
  renderSinTransicion(t);
};
// Texto que ya está ahí desde el primer cuadro (para ganchos: se lee luego luego, sin desenfoque).
TIPOS.texto.campos.push(['entrada', 'Entrada', 'sel', { suave: 'Suave', nada: 'Ya está ahí', golpe: 'De golpe' }]);
TIPOS.texto.campos.push(['italica', 'Letra inclinada', 'sel', { no: 'No', si: 'Sí' }]);
TIPOS.texto.campos.push(['espacio', 'Separación de letras', 'rango', -0.05, 0.2, 0.005]);

// Montos de la tarjeta. Mismo redondeo que el resto del negocio: hacia arriba a 10.
function montosTarjeta(c) {
  const ordena = anticipoDe(c.precio);
  return { ordena, liquida: c.precio - ordena + (c.envio || 0) };
}

// Achica la letra hasta que el texto quepa en el ancho.
function letraQueQuepa(texto, peso, tam, max) {
  ctx.font = `${peso} ${tam}px ${FUENTE}`;
  while (tam > 18 && ctx.measureText(texto).width > max) { tam -= 1; ctx.font = `${peso} ${tam}px ${FUENTE}`; }
  return tam;
}

function dibTarjeta(c, lt) {
  if (c.estilo === 'post') return dibTarjetaPost(c, lt);
  const k = eOut(clamp(lt / 0.22)), z = lerp(0.86, 1, k);
  const cx = c.x + c.w / 2, cy = c.y + c.h / 2, conPrecio = c.precio > 0;
  const panel = conPrecio ? 178 : 0, r = 28;
  ctx.save();
  ctx.globalAlpha = alfa(c, lt);
  ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
  ctx.save();
  ctx.shadowColor = 'rgba(124,58,237,.55)'; ctx.shadowBlur = 34;
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, r); ctx.fillStyle = '#120b1f'; ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, r); ctx.clip();
  const src = fuenteDe(c);
  if (src) {
    ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h - panel); ctx.clip();
    cubrir(src, c.x, c.y, c.w, c.h - panel, 1, 0.5, c.focoY ?? 0.12);
  } else relleno(c.x, c.y, c.w, c.h - panel, 'Foto');
  ctx.restore();
  if (conPrecio) {
    const m = montosTarjeta(c), tx = c.x + 22, max = c.w - 44, y0 = c.y + c.h - panel;
    const dinero = n => '$' + n.toLocaleString('es-MX');
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    letraQueQuepa(c.nombre, 600, 30, max);
    ctx.fillStyle = '#ffffff'; ctx.fillText(c.nombre, tx, y0 + 44);
    const o = 'Ordena con ' + dinero(m.ordena), l = 'Liquidas con ' + dinero(m.liquida);
    letraQueQuepa(o, 800, 46, max);
    ctx.fillStyle = '#facc15'; ctx.fillText(o, tx, y0 + 104);
    letraQueQuepa(l, 600, 36, max);
    ctx.fillStyle = '#e9d5ff'; ctx.fillText(l, tx, y0 + 154);
  }
  ctx.restore();
}

// Estilo de tus posts: prenda sin fondo y centrada, cuadrícula de líneas finas, letra blanca y moradito.
const POST = { blanco: '#f5f0f6', morado: '#6a5efa', tarjeta: '#12132a', moradoClaro: '#8f85ff', gris: '#a7a6b5', linea: 'rgba(245,240,246,.14)', fondo: '#0a0c15' };
const capaP = document.createElement('canvas');
function capaPrenda(w, h) {
  if (capaP.width !== Math.round(w) || capaP.height !== Math.round(h)) { capaP.width = Math.round(w); capaP.height = Math.round(h); }
  return capaP;
}
function prendaCentrada(c, x, y, w, h) {
  const src = fuenteDe(c);
  if (!src) return;
  const sw = src.naturalWidth, sh = src.naturalHeight;
  ctx.imageSmoothingQuality = 'high';   // agrandar la foto con la mejor calidad posible
  const s = Math.max(Math.min(w / sw, h / sh), w * c.ancho / sw), dw = sw * s, dh = sh * s;
  const dy = dh > h ? y - (dh - h) * (c.focoY ?? 0) : y + (h - dh) / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.min(w, h) / 2);   // sin orillas cuadradas
  g.addColorStop(0, hexA(POST.morado, 0.3)); g.addColorStop(1, hexA(POST.morado, 0));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (dh > h && !(c.precio > 0)) {   // prenda en grande: se desvanece de verdad, sin tapar el logo de atrás
    const E = lienzo.width / W, capa = capaPrenda(w * E, h * E), q = capa.getContext('2d');
    q.setTransform(E, 0, 0, E, 0, 0); q.clearRect(0, 0, w, h); q.imageSmoothingQuality = 'high';
    q.globalCompositeOperation = 'source-over';
    q.shadowColor = hexA(POST.moradoClaro, 0.75); q.shadowBlur = 22 * E;
    q.drawImage(src, (w - dw) / 2, dy - y, dw, dh);
    q.shadowBlur = 0; q.globalCompositeOperation = 'destination-out';
    const fa = q.createLinearGradient(0, h * 0.84, 0, h);
    fa.addColorStop(0, 'rgba(0,0,0,0)'); fa.addColorStop(1, 'rgba(0,0,0,1)');
    q.fillStyle = fa; q.fillRect(0, h * 0.84, w, h * 0.16);
    ctx.drawImage(capa, x, y, w, h);
    ctx.restore();
    return;
  }
  ctx.shadowColor = hexA(POST.moradoClaro, 0.75); ctx.shadowBlur = 22;      // separa la ropa negra del fondo
  ctx.drawImage(src, x + (w - dw) / 2, dy, dw, dh);
  ctx.shadowBlur = 0;
  if (dh > h || c.precio > 0) {   // la foto se pierde suave hacia abajo, sin corte
    const f = ctx.createLinearGradient(0, y + h * 0.82, 0, y + h), cf = c.cinta ? POST.tarjeta : POST.fondo;
    f.addColorStop(0, hexA(cf, 0)); f.addColorStop(1, cf);
    ctx.fillStyle = f; ctx.fillRect(x, y + h * 0.82, w, h * 0.18);
  }
  ctx.restore();
}
function dibTarjetaPost(c, lt) {
  const k = c.cinta === 'dentro' ? 1 : eOut(clamp(lt / 0.22)), z = lerp(0.9, 1, k) * (1 + (c.empuje || 0) * clamp(lt / c.dur)), cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  const sube = c.cinta ? clamp((c.ini + lt - c.subeEn) / (c.subeDur || 1)) * c.subePx : 0;
  ctx.save();
  ctx.globalAlpha = alfa(c, lt);
  if (c.cinta) { ctx.beginPath(); ctx.rect(0, c.marcoY, W, c.marcoAlto); ctx.clip(); ctx.translate(0, -sube); }   // cinta que sube, dentro de su marco
  ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
  if (!(c.precio > 0)) { prendaCentrada(c, c.x, c.y, c.w, c.h); ctx.restore(); return; }
  if (c.w > c.h * 1.1) { dibTarjetaPostAncha(c, lt); ctx.restore(); return; }
  const e = Math.max(0.8, Math.min(1, c.h / 600));   // en pantallas de 6 prendas la letra se ajusta, sin quedar chiquita
  const arriba = 58 * e, abajo = 136 * e, tx = c.x + 24, max = c.w - 48, m = montosTarjeta(c);
  ctx.strokeStyle = POST.linea; ctx.lineWidth = 2; ctx.strokeRect(c.x, c.y, c.w, c.h);
  prendaCentrada(c, c.x + 1, c.y + arriba, c.w - 2, c.h - arriba - abajo);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const n = c.num ? c.num + ' ' : '';
  letraQueQuepa(n + c.nombre.toUpperCase(), 600, 26 * e, max);
  ctx.fillStyle = POST.moradoClaro; ctx.fillText(n, tx, c.y + 40 * e);
  const an = ctx.measureText(n).width;
  ctx.fillStyle = POST.gris; ctx.fillText(c.nombre.toUpperCase(), tx + an, c.y + 40 * e);
  const pie = c.y + c.h - abajo, din = x => '$' + x.toLocaleString('es-MX');
  const o = 'Ordena con ', vo = din(m.ordena);
  letraQueQuepa(o + vo, 800, 48 * e, max);
  ctx.fillStyle = POST.blanco; ctx.fillText(o, tx, pie + 58 * e);
  const ao = ctx.measureText(o).width;
  ctx.fillStyle = POST.moradoClaro; ctx.fillText(vo, tx + ao, pie + 58 * e);
  letraQueQuepa('Liquidas con ' + din(m.liquida), 500, 36 * e, max);
  ctx.fillStyle = POST.gris; ctx.fillText('Liquidas con ' + din(m.liquida), tx, pie + 110 * e);
  brilloTarjeta(c, lt);
  ctx.restore();
}

// Para pantallas de 6: prenda a la izquierda y precios grandes a la derecha.
function dibTarjetaPostAncha(c, lt) {
  const k = Math.min(1, c.h / 310);   // cabe en filas más bajitas (pantallas de 8 o 10 prendas)
  const m = montosTarjeta(c), din = x => '$' + x.toLocaleString('es-MX'), mitad = Math.round(c.w * 0.48), arriba = 48 * k;
  if (c.cinta) {   // recuadro separado, con esquinas redondas
    ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 20); ctx.fillStyle = POST.tarjeta; ctx.fill();
    ctx.strokeStyle = hexA(POST.moradoClaro, 0.45); ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 20); ctx.clip();
    prendaCentrada(c, c.x + 1, c.y + arriba, mitad, c.h - arriba - 1);
    ctx.restore();
  } else {
    ctx.strokeStyle = POST.linea; ctx.lineWidth = 2; ctx.strokeRect(c.x, c.y, c.w, c.h);
    prendaCentrada(c, c.x + 1, c.y + arriba, mitad, c.h - arriba - 1);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const n = c.num ? c.num + ' ' : '', nom = c.nombre.toUpperCase();
  letraQueQuepa(n + nom, 600, 24, c.w - 40);
  ctx.fillStyle = POST.moradoClaro; ctx.fillText(n, c.x + 20, c.y + 33 * k);
  const an = ctx.measureText(n).width;
  ctx.fillStyle = POST.gris; ctx.fillText(nom, c.x + 20 + an, c.y + 33 * k);
  const tx = c.x + mitad + 8, max = c.w - mitad - 24, cy = c.y + arriba + (c.h - arriba) / 2;
  letraQueQuepa('Ordena con', 600, 32 * k, max); ctx.fillStyle = POST.blanco; ctx.fillText('Ordena con', tx, cy - 62 * k);
  letraQueQuepa(din(m.ordena), 900, 72 * k, max); ctx.fillStyle = POST.moradoClaro; ctx.fillText(din(m.ordena), tx, cy + 6 * k);
  letraQueQuepa('Liquidas con', 500, 28 * k, max); ctx.fillStyle = POST.gris; ctx.fillText('Liquidas con', tx, cy + 58 * k);
  letraQueQuepa(din(m.liquida), 700, 44 * k, max); ctx.fillStyle = POST.blanco; ctx.fillText(din(m.liquida), tx, cy + 106 * k);
  brilloTarjeta(c, lt);
}
function brilloTarjeta(c, lt) {
  const br = clamp((lt - 0.08) / 0.45);   // brillo que cruza la tarjeta al entrar
  if (br <= 0 || br >= 1) return;
  const bx = lerp(c.x - 200, c.x + c.w + 200, br), bg = ctx.createLinearGradient(bx - 120, c.y, bx + 120, c.y + 120);
  bg.addColorStop(0, hexA(POST.blanco, 0)); bg.addColorStop(0.5, hexA(POST.blanco, 0.16)); bg.addColorStop(1, hexA(POST.blanco, 0));
  ctx.save(); ctx.beginPath(); ctx.rect(c.x, c.y, c.w, c.h); ctx.clip(); ctx.fillStyle = bg; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.restore();
}
