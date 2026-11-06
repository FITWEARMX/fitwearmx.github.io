// FITWEARMX Studio · dibujo de bloques básicos (video, celular, textos, noti, botón, logo, producto).
// Se carga en orden desde comercial.html; comparte variables y funciones con los demás studio-*.js.

// ---------- dibujo ----------
function alfa(c, lt) {
  let a = 1;
  if (c.fadeIn > 0) a *= clamp(lt / c.fadeIn);
  if (c.fadeOut > 0 && c.tipo !== 'musica') a *= clamp((c.dur - lt) / c.fadeOut);
  return a;
}

function fuenteDe(c) {
  const m = medios[c.src];
  if (!m) return null;
  if (m.tipo === 'imagen') return m.img.complete && m.img.naturalWidth ? m.img : null;
  const e = elemDe(c);
  return e && e.readyState >= 2 ? e : null;
}

function cubrir(src, x, y, w, h, zoom = 1, fx = 0.5, fy = 0.5) {
  const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight;
  if (!sw || !sh) return;
  const s = Math.max(w / sw, h / sh) * zoom;
  const dw = sw * s, dh = sh * s;
  ctx.drawImage(src, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh);   // fx/fy: hacia dónde se acerca el zoom
}

function relleno(x, y, w, h, texto) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#1b1530'); g.addColorStop(1, '#0a0a12');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.setLineDash([18, 14]); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 4;
  ctx.strokeRect(x + 30, y + 30, w - 60, h - 60);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.max(28, w / 16)}px ${FUENTE}`;
  partir(texto || 'Pon aquí tu video', w - 120).forEach((l, i, arr) =>
    ctx.fillText(l, x + w / 2, y + h / 2 + (i - (arr.length - 1) / 2) * w / 12));
  ctx.restore();
}

function partir(texto, max) {
  const out = [];
  for (const parrafo of String(texto).split('\n')) {
    let linea = '';
    for (const pal of parrafo.split(' ')) {
      const prueba = linea ? linea + ' ' + pal : pal;
      if (ctx.measureText(prueba).width > max && linea) { out.push(linea); linea = pal; } else linea = prueba;
    }
    out.push(linea);
  }
  return out;
}

function dibFondo(c, lt) {
  ctx.save(); ctx.globalAlpha = alfa(c, lt);
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, H * 0.75);
  g.addColorStop(0, c.color1); g.addColorStop(1, c.color2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function dibVideo(c, lt) {
  ctx.save(); ctx.globalAlpha = alfa(c, lt);
  const src = fuenteDe(c);
  const z = lerp(c.zoomIni, c.zoomFin, eInOut(clamp(lt / c.dur)));
  if (src) cubrir(src, 0, 0, W, H, z, c.focoX ?? 0.5, c.focoY ?? 0.5); else if (!medios[c.src]) relleno(0, 0, W, H, c.nota || 'Pon aquí tu video');
  if (c.anillo) {   // halo de luz que gira encima del clip (como el anillo de la caja de Amazon)
    const g = lt * 2.4, cx = W / 2, cy = H * 0.6;
    ctx.save();
    const r = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
    r.addColorStop(0, hexA(c.anillo, 0.28)); r.addColorStop(1, hexA(c.anillo, 0));
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = c.anillo; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.shadowColor = c.anillo; ctx.shadowBlur = 45;
    ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.4, W * 0.11, -0.1, g, g + Math.PI * 1.4); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function dibCelular(c, lt, t) {
  const a = alfa(c, lt);
  if (a <= 0) return;
  const ph = H * c.escala, pw = ph * 0.4828;           // proporción del iPhone 14 Pro Max
  const ent = c.entrada === 'subir' ? eOut(clamp(lt / 1.1)) : 1;
  const flota = c.flotar === 'si';
  const fl = flota ? Math.sin(t * 1.6) * 14 : 0;
  const rot = (flota ? Math.sin(t * 0.9) * 0.022 : 0) - (1 - ent) * 0.16;
  const yaw = flota ? Math.sin(t * 0.7) * 0.07 : 0;
  const z = lerp(c.zoomIni, c.zoomFin, eInOut(clamp(lt / c.dur)));
  const fx = (c.focoX - 0.5) * pw, fy = (c.focoY - 0.5) * ph;
  const M = MARCOS[c.marco] || MARCOS.morado;

  ctx.save();
  ctx.globalAlpha = a * clamp(ent * 1.6);
  ctx.translate(W / 2 + c.x, H / 2 + c.y + fl + (1 - ent) * 1000);
  ctx.rotate(rot);
  ctx.transform(Math.cos(yaw), Math.sin(yaw) * 0.22, 0, 1, 0, 0);
  ctx.scale(z, z);
  ctx.translate(-fx * (1 - 1 / z), -fy * (1 - 1 / z));

  if (c.brillo) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ph * 0.8);
    g.addColorStop(0, hexA(c.brillo, 0.38)); g.addColorStop(1, hexA(c.brillo, 0));
    ctx.fillStyle = g; ctx.fillRect(-ph, -ph, ph * 2, ph * 2);
  }
  const r = pw * 0.128;
  // sombra
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 90; ctx.shadowOffsetY = 50;
  ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, r); ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
  // botones laterales
  ctx.fillStyle = M[2];
  const bx = pw * 0.014;
  [[-0.305, 0.034], [-0.235, 0.066], [-0.155, 0.066]].forEach(([y, h]) => {
    ctx.beginPath(); ctx.roundRect(-pw / 2 - bx, ph * y, bx * 1.4, ph * h, bx); ctx.fill();
  });
  ctx.beginPath(); ctx.roundRect(pw / 2 - bx * 0.4, ph * -0.215, bx * 1.4, ph * 0.105, bx); ctx.fill();
  // marco de acero
  const gm = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
  gm.addColorStop(0, M[1]); gm.addColorStop(0.07, M[0]); gm.addColorStop(0.5, M[0]); gm.addColorStop(0.93, M[0]); gm.addColorStop(1, M[1]);
  ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, r); ctx.fillStyle = gm; ctx.fill();
  // bisel negro
  const b1 = pw * 0.013;
  ctx.beginPath(); ctx.roundRect(-pw / 2 + b1, -ph / 2 + b1, pw - 2 * b1, ph - 2 * b1, r - b1); ctx.fillStyle = '#030303'; ctx.fill();
  // pantalla
  const b2 = pw * 0.042, sx = -pw / 2 + b2, sy = -ph / 2 + b2, sw = pw - 2 * b2, sh = ph - 2 * b2, sr = r - b2 * 0.8;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, sr); ctx.clip();
  const src = fuenteDe(c);
  if (src) { ctx.fillStyle = '#000'; ctx.fillRect(sx, sy, sw, sh); cubrir(src, sx, sy, sw, sh); }
  else if (!medios[c.src]) relleno(sx, sy, sw, sh, c.nota || 'Tu grabación de pantalla');
  else { ctx.fillStyle = '#000'; ctx.fillRect(sx, sy, sw, sh); }
  // dedo que toca: punto que aparece y onda que se abre
  if (c.toque === 'si') {
    const k = (lt - c.toqueT) / 0.7, px = sx + sw * c.toqueX, py = sy + sh * c.toqueY, rd = sw * 0.055;
    if (k > -0.35 && k < 0) {
      ctx.beginPath(); ctx.arc(px, py, rd * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 + k / 0.35)})`; ctx.fill();
    } else if (k >= 0 && k <= 1) {
      ctx.beginPath(); ctx.arc(px, py, rd * (0.8 - 0.2 * Math.sin(k * Math.PI)), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, rd * (1 + 1.6 * eOut(k)), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; ctx.lineWidth = 5; ctx.stroke();
    }
  }
  // isla dinámica
  const iw = sw * 0.3, ih = sw * 0.088;
  ctx.beginPath(); ctx.roundRect(-iw / 2, sy + sw * 0.028, iw, ih, ih / 2); ctx.fillStyle = '#000'; ctx.fill();
  // reflejo del vidrio
  const gr = ctx.createLinearGradient(sx, sy, sx + sw * 0.9, sy + sh * 0.6);
  gr.addColorStop(0, 'rgba(255,255,255,.13)'); gr.addColorStop(0.42, 'rgba(255,255,255,.03)'); gr.addColorStop(0.43, 'rgba(255,255,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(sx, sy, sw, sh);
  ctx.restore();
  // filo de luz del marco
  ctx.beginPath(); ctx.roundRect(-pw / 2 + 1.5, -ph / 2 + 1.5, pw - 3, ph - 3, r);
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
}

function dibTexto(c, lt) {
  const k = c.entrada === 'nada' || c.entrada === 'golpe' ? 1 : eOut(clamp(lt / 0.7));
  ctx.save();
  ctx.globalAlpha = alfa(c, lt) * k * (c.entrada === 'golpe' ? clamp(lt / 0.05) : 1);
  if (c.entrada === 'golpe') {   // entra de golpe: grande a su tamaño, se lee desde el primer momento
    const zg = lerp(1.22, 1, eOut(clamp(lt / 0.2)));
    ctx.translate(W / 2, c.y); ctx.scale(zg, zg); ctx.translate(-W / 2, -c.y);
  }
  if (k < 1) ctx.filter = `blur(${(1 - k) * 18}px)`;
  ctx.font = `${c.italica === 'si' ? 'italic ' : ''}${c.peso} ${c.tam}px ${FUENTE}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${c.tam * (c.espacio ?? -0.025)}px`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = c.color;
  if (c.brillo) { ctx.shadowColor = c.brillo; ctx.shadowBlur = 45; }
  const lineas = partir(c.texto, W - 120), lh = c.tam * 1.08;
  const y0 = c.y + (1 - k) * 60 - (lineas.length - 1) * lh / 2;
  lineas.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh));
  if (c.linea === 'si') {
    const k2 = eInOut(clamp((lt - 0.35) / 0.8));
    const ancho = Math.min(W * 0.75, Math.max(...lineas.map(l => ctx.measureText(l).width))) * k2;
    const yl = y0 + (lineas.length - 1) * lh + c.tam * 0.72;
    ctx.filter = 'none'; ctx.shadowColor = c.colorLinea; ctx.shadowBlur = 35;
    ctx.strokeStyle = c.colorLinea; ctx.lineWidth = Math.max(8, c.tam * 0.08); ctx.lineCap = 'round';
    // se dibuja de izquierda a derecha con una curvita de sonrisa
    const x0 = W / 2 - Math.min(W * 0.75, Math.max(...lineas.map(l => ctx.measureText(l).width))) / 2;
    ctx.beginPath(); ctx.moveTo(x0, yl);
    const xf = x0 + ancho, curva = Math.min(1, ancho / (W * 0.3)) * 18;
    ctx.quadraticCurveTo((x0 + xf) / 2, yl + curva, xf, yl); ctx.stroke();
    // punta brillante mientras avanza
    if (k2 > 0 && k2 < 1) { ctx.beginPath(); ctx.arc(xf, yl, Math.max(8, c.tam * 0.06), 0, Math.PI * 2); ctx.fillStyle = '#fffbeb'; ctx.shadowBlur = 50; ctx.fill(); }
    const m = medios[c.logoFin];
    if (m && m.img && m.img.naturalWidth && k2 >= 1) {
      const kl = eBack(clamp((lt - 1.15) / 0.45)), lg = logoSinFondo(m), w = c.tam * 1.3 * kl, h = w * lg.height / lg.width;
      ctx.shadowColor = c.colorLinea; ctx.shadowBlur = 50;
      ctx.drawImage(lg, xf + 20, yl - h * 0.75, w, h);
      const fl = clamp(1 - Math.abs(lt - 1.35) / 0.25);   // destello
      if (fl > 0) { const rg = ctx.createRadialGradient(xf + 20 + w / 2, yl - h * 0.25, 0, xf + 20 + w / 2, yl - h * 0.25, 220);
        rg.addColorStop(0, `rgba(255,251,235,${0.9 * fl})`); rg.addColorStop(1, 'rgba(255,251,235,0)'); ctx.fillStyle = rg; ctx.fillRect(xf - 220, yl - 440, 700, 700); }
    }
  }
  ctx.restore();
}

function dibNoti(c, lt) {
  const kin = eBack(clamp(lt / 0.55)), kout = eInOut(clamp((lt - (c.dur - 0.45)) / 0.45));
  const w = 960, h = 196, x = (W - w) / 2, y = c.y + lerp(-320, 0, kin) - kout * 380;
  ctx.save();
  ctx.globalAlpha = clamp(lt / 0.2) * (1 - kout);
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 46); ctx.fillStyle = 'rgba(38,38,44,.94)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  const gi = ctx.createLinearGradient(x + 30, y + 43, x + 140, y + 153);
  gi.addColorStop(0, '#a855f7'); gi.addColorStop(1, '#4c1d95');
  ctx.beginPath(); ctx.roundRect(x + 30, y + 43, 110, 110, 26); ctx.fillStyle = gi; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `900 64px ${FUENTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((c.app || 'F')[0], x + 85, y + 100);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 30px ${FUENTE}`; ctx.fillStyle = '#b4b4bd'; ctx.fillText(String(c.app).toUpperCase(), x + 166, y + 64);
  ctx.textAlign = 'right'; ctx.fillText('ahora', x + w - 36, y + 64);
  ctx.textAlign = 'left'; ctx.font = `700 40px ${FUENTE}`; ctx.fillStyle = '#fff'; ctx.fillText(c.titulo, x + 166, y + 116, w - 200);
  ctx.font = `400 35px ${FUENTE}`; ctx.fillStyle = '#d6d6dc'; ctx.fillText(c.cuerpo, x + 166, y + 162, w - 200);
  ctx.restore();
}

function dibBoton(c, lt) {
  const w = 860, h = 150, x = (W - w) / 2, y = c.y - h / 2;
  const kin = eOut(clamp(lt / 0.4)), ks = eInOut(clamp((lt - 0.45) / 0.9)), listo = lt > 1.38;
  const pop = listo ? 1 + 0.06 * Math.sin(clamp((lt - 1.38) / 0.35) * Math.PI) : 1;
  ctx.save();
  ctx.globalAlpha = kin * clamp((c.dur - lt) / 0.3);
  ctx.translate(W / 2, c.y); ctx.scale(pop, pop); ctx.translate(-W / 2, -c.y);
  ctx.shadowColor = hexA(c.color, 0.6); ctx.shadowBlur = listo ? 60 : 25;
  ctx.beginPath(); ctx.roundRect(x, y + (1 - kin) * 60, w, h, h / 2);
  ctx.fillStyle = listo ? c.color : 'rgba(255,255,255,.12)'; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineWidth = 4; ctx.strokeStyle = c.color; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 48px ${FUENTE}`;
  ctx.fillText(listo ? c.textoFin : c.texto, W / 2 + (listo ? 0 : 50), c.y + (1 - kin) * 60);
  if (!listo) {
    const kx = x + h / 2 + ks * (w - h);
    ctx.beginPath(); ctx.arc(kx, c.y + (1 - kin) * 60, h / 2 - 12, 0, Math.PI * 2); ctx.fillStyle = c.color; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 60px ${FUENTE}`; ctx.fillText('›', kx + 3, c.y - 4 + (1 - kin) * 60);
  }
  ctx.restore();
}

// Logo en imagen: lo negro del fondo se vuelve transparente (sirve el logo blanco sobre negro) y se cachea.
function logoSinFondo(m) {
  if (m.logo) return m.logo;
  const im = m.img, w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const k = cv.getContext('2d'); k.drawImage(im, 0, 0);
  const d = k.getImageData(0, 0, w, h), px = d.data;
  // ¿cómo es el fondo? se mira la esquina: transparente, claro (logo oscuro) u oscuro (logo claro)
  const esq = [px[0], px[1], px[2], px[3]], fondoClaro = esq[3] > 200 && esq[0] + esq[1] + esq[2] > 380, fondoOscuro = esq[3] > 200 && !fondoClaro;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
    if (fondoClaro) { px[i + 3] = Math.min(px[i + 3], 255 - lum); px[i] = px[i + 1] = px[i + 2] = 255; }        // logo oscuro -> blanco
    else if (fondoOscuro) { px[i + 3] = Math.min(px[i + 3], lum); px[i] = px[i + 1] = px[i + 2] = 255; }        // logo claro -> blanco
    else { px[i] = px[i + 1] = px[i + 2] = 255; }                                                                   // ya transparente -> blanco
  }
  k.putImageData(d, 0, 0);
  return (m.logo = cv);
}
function dibLogoImagen(c, lt, m) {
  const k = eOut(clamp(lt / 0.9)), lg = logoSinFondo(m);
  const w = c.tam * 3.2, h = w * lg.height / lg.width;
  ctx.save();
  ctx.globalAlpha = alfa(c, lt) * k;
  ctx.translate(W / 2, c.y); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
  if (k < 1) ctx.filter = `blur(${(1 - k) * 14}px)`;
  ctx.shadowColor = c.color; ctx.shadowBlur = 60;
  ctx.drawImage(lg, -w / 2, -h / 2, w, h);
  ctx.shadowBlur = 20; ctx.drawImage(lg, -w / 2, -h / 2, w, h);
  // destello que cruza el logo
  const p = -0.3 + 1.6 * clamp((lt - 0.4) / 1.2);
  if (p > -0.2 && p < 1.2) {
    const cv = document.createElement('canvas'); cv.width = lg.width; cv.height = lg.height;
    const q = cv.getContext('2d'); q.drawImage(lg, 0, 0);
    q.globalCompositeOperation = 'source-atop';
    const g = q.createLinearGradient(0, 0, cv.width, 0);
    g.addColorStop(clamp(p - 0.15), 'rgba(255,255,255,0)'); g.addColorStop(clamp(p), 'rgba(255,255,255,.9)'); g.addColorStop(clamp(p + 0.15), 'rgba(255,255,255,0)');
    q.fillStyle = g; q.fillRect(0, 0, cv.width, cv.height);
    ctx.shadowColor = 'transparent'; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(cv, -w / 2, -h / 2, w, h);
  }
  if (c.sub) {   // texto abajo del logo (p. ej. "Link en mi perfil")
    ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowColor = 'transparent';
    ctx.globalAlpha = alfa(c, lt) * clamp((lt - 0.6) / 0.5);
    ctx.font = `600 58px ${FUENTE}`; ctx.textAlign = 'center'; ctx.fillStyle = '#e9e4f5';
    ctx.fillText(c.sub, 0, h / 2 + 120);
  }
  ctx.restore();
}
function dibLogo(c, lt) {
  const m = medios[c.src];
  if (m && m.img && m.img.naturalWidth) return dibLogoImagen(c, lt, m);
  const k = eOut(clamp(lt / 0.9));
  ctx.save();
  ctx.globalAlpha = alfa(c, lt) * k;
  ctx.translate(W / 2, c.y); ctx.scale(0.92 + 0.08 * k, 0.92 + 0.08 * k);
  ctx.font = `900 ${c.tam}px ${FUENTE}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${c.tam * 0.1}px`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = c.color; ctx.shadowBlur = 50; ctx.fillStyle = '#e9e4f5';
  ctx.fillText(c.texto, 0, 0);
  // destello que cruza el logo
  const ancho = ctx.measureText(c.texto).width, p = -0.3 + 1.6 * clamp((lt - 0.3) / 1.2);
  const g = ctx.createLinearGradient(-ancho / 2, 0, ancho / 2, 0);
  g.addColorStop(clamp(p - 0.15), 'rgba(255,255,255,0)'); g.addColorStop(clamp(p), 'rgba(255,255,255,1)'); g.addColorStop(clamp(p + 0.15), 'rgba(255,255,255,0)');
  ctx.shadowColor = 'transparent'; ctx.fillStyle = g; ctx.fillText(c.texto, 0, 0);
  if (c.sub) {
    ctx.globalAlpha = alfa(c, lt) * clamp((lt - 0.6) / 0.6);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    ctx.font = `500 44px ${FUENTE}`; ctx.fillStyle = '#b8b2c8';
    ctx.fillText(c.sub, 0, c.tam * 0.85);
  }
  ctx.restore();
}

// Prenda flotando en negro con luz detrás (estilo Breathe Divinity). Mejor con foto sin fondo (PNG).
function dibProducto(c, lt, t) {
  const kin = c.entrada === 'nada' ? 1 : eOut(clamp(lt / 0.9));
  const a = alfa(c, lt);
  if (c.luz) {
    const g = ctx.createRadialGradient(W / 2 + c.x, c.y, 0, W / 2 + c.x, c.y, W * 0.75);
    g.addColorStop(0, hexA(c.luz, 0.32 * kin * a)); g.addColorStop(0.55, hexA(c.luz, 0.08 * kin * a)); g.addColorStop(1, hexA(c.luz, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const src = fuenteDe(c);
  const conCuerpo = c.cuerpo === 'sombra', conModelo = c.cuerpo === 'foto';
  const fl = conCuerpo || conModelo ? Math.sin(t * 1.1) * 4 : c.flotar === 'si' ? Math.sin(t * 1.8) * 12 : 0;
  const yaw = conCuerpo || conModelo ? 0 : c.girar === 'si' ? Math.sin(lt * 1.3 + 0.6) * 0.2 : 0;
  const z = (c.entrada === 'zoom' ? lerp(1.3, 1, kin) : 1) * lerp(1, c.zoomFin, eInOut(clamp(lt / c.dur)));
  ctx.save();
  ctx.globalAlpha = a * kin;
  if (kin < 1) ctx.filter = `blur(${(1 - kin) * 16}px)`;
  ctx.translate(W / 2 + c.x, c.y + fl + (c.entrada === 'subir' ? (1 - kin) * 600 : 0));
  ctx.scale(z * Math.cos(yaw), z);
  if (src) {
    const sw = src.naturalWidth || src.videoWidth, sh = src.naturalHeight || src.videoHeight;
    const s = Math.min(W * c.escala / sw, H * 0.62 / sh), w = sw * s, h = sh * s;
    if (conCuerpo) {
      // respira y se balancea tantito, siempre de frente
      ctx.rotate(Math.sin(t * 0.8) * 0.012);
      ctx.scale(1 + Math.sin(t * 2.1) * 0.006, 1 + Math.sin(t * 2.1) * 0.01);
      cuerpoSombra(w, h, c.luz);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    } else if (conModelo) {
      ctx.shadowColor = c.luz || '#7c3aed'; ctx.shadowBlur = 45; ctx.drawImage(src, -w / 2, -h / 2, w, h); ctx.shadowBlur = 14;
    } else { ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 40; }
    ctx.drawImage(src, -w / 2, -h / 2, w, h);
  } else { const w = W * c.escala * 0.8; relleno(-w / 2, -w / 2, w, w, c.nota); }
  ctx.restore();
}
