/* Inventario central: arma productos.json con lo que hay de cada prenda (por color y talla).
   Se sube junto con la tienda al darle "Publicar tienda" y lo pueden leer las demás apps.
   El repo es PÚBLICO: aquí solo va lo público. Nunca costo, margen, notas ni clientes.
   Tampoco va nada del Early Access (esos productos se publican cifrados aparte). */
(function(){
const OT=['XXS','XS','S','M','L','XL','2XL','3XL','4XL','5XL'];
const orden=(x,y)=>{ const i=OT.indexOf(x),j=OT.indexOf(y); return (i<0?99:i)-(j<0?99:j)||String(x).localeCompare(y); };

// productos: los de catalogo_db · h: funciones del Catálogo {B, marcaOficial, precioColor, num}
function armar(productos,h){
  const lista=[];
  for(const p of productos||[]){
    const nombre=(p.nombre||'').trim(), est=h.B(p);
    if(!nombre||p.enTienda===false||est==='early') continue;
    const colores=(p.colores||[]).map(c=>{
      const tallas={}; Object.keys(c.tallas||{}).sort(orden).forEach(t=>{ tallas[t]=Math.max(0,h.num(c.tallas[t])); });
      const piezas=Object.values(tallas).reduce((a,b)=>a+b,0);
      return {k:c.k,nombre:c.nombre||'',precio:h.precioColor(p,c),agotado:!!c.agotado,tallas,piezas};
    });
    lista.push({id:p.id,nombre,marca:h.marcaOficial(p),categoria:p.categoria||'',linea:p.linea||'',estado:est,
      precio:colores[0]?colores[0].precio:0,piezas:colores.reduce((a,c)=>a+c.piezas,0),colores});
  }
  lista.sort((a,b)=>a.marca.localeCompare(b.marca)||a.nombre.localeCompare(b.nombre));
  return {app:'inventario',version:1,actualizado:new Date().toISOString(),productos:lista};
}

window.FWInventario={armar};
})();
