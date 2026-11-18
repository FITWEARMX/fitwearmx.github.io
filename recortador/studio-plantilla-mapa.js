// FITWEARMX Studio · Plantilla "Mapa 3D" (la del video del negocio v3, nov-2026).
// Un toque y pone al final de tu video: mapa 3D morado USA → Monterrey con "Llega en 2 a 3 semanas",
// luego la caja en la puerta con el aviso "Entregado". Todo se puede cambiar después en el Editor.

function ponerPlantillaMapa() {
  guardarHist();
  const t = P.clips.length ? +duracion().toFixed(2) : 0;
  P.clips.push(
    nuevoClip('mapa', { ini: t, dur: 3.5, color: '#a855f7', titulo: 'Llega en 2 a 3 semanas', sub: 'En camino a Monterrey',
      pasos: 'Ordenado,En camino,En Monterrey,Entregado', fadeIn: 0.2, fadeOut: 0 }),
    nuevoClip('transicion', { ini: +(t + 3.5).toFixed(2), dur: 0.45, crece: 0.14 }),
    nuevoClip('puerta', { ini: +(t + 3.5).toFixed(2), dur: 2.5, src: 'logo.png', color: '#1a1520', luz: '#a855f7', fadeIn: 0, fadeOut: 0.2 }),
    nuevoClip('notificacion', { ini: +(t + 3.8).toFixed(2), dur: 2.2, app: 'FITWEARMX', titulo: 'Entregado', cuerpo: 'Tu pedido llegó a tu casa 📦', y: 90 }));
  cambio(); irA(t);
  $('aviso').textContent = '✅ Mapa 3D puesto al final. Tócalo en la línea de tiempo si quieres cambiar textos.';
}

function tarjetaMapa() {
  const d = document.createElement('button');
  d.type = 'button'; d.className = 'tarjeta';
  d.innerHTML = '<div class="poster" style="background-image:url(plantilla-mapa.jpg)"></div><div class="info"><b>Mapa 3D · Llega en 2 a 3 semanas</b>'
    + '<span>Un toque y se pone al final de tu video: mapa morado USA → Monterrey y la caja en la puerta con "Entregado".</span></div>';
  d.onclick = () => { verVista('editor'); ponerPlantillaMapa(); };
  return d;
}
// va después de la Pauta Black Friday
$('rejillaPlantillas').children[0].after(tarjetaMapa());
$('atajos').children[0].after(tarjetaMapa());
