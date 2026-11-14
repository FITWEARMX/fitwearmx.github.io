/* Borrar un drop completo (todos los productos de una colección) de una vez.
   Antes de borrar guarda un respaldo con sus fotos, que se puede volver a cargar con "Cargar un respaldo".
   El drop sale de la colección del producto; si no tiene, de lo que va antes de " - " en el nombre
   (por ejemplo "Gold's Paradise - Hoodies" → "Gold's Paradise"). */
(function(){
const dropDe=(p,h)=>{ const c=(h.coleccion(p)||'').trim(); if(c) return c; const n=String(p.nombre||''); const i=n.indexOf(' - '); return i>0?n.slice(0,i).trim():''; };

function grupos(h){
  const m=new Map();
  h.productos().forEach(p=>{ const d=dropDe(p,h); if(!d) return; const k=h.marca(p)+'|'+d; if(!m.has(k)) m.set(k,{marca:h.marca(p),drop:d,ps:[]}); m.get(k).ps.push(p); });
  return [...m.values()].filter(g=>g.ps.length>1).sort((a,b)=>a.marca.localeCompare(b.marca)||a.drop.localeCompare(b.drop));
}

let H=null, G=[];
function pintar(h){
  H=h; G=grupos(h); const box=document.getElementById('dropDel'); if(!box) return;
  box.innerHTML='<p class="note" style="margin:4px 0 8px"><b>Borrar un drop completo</b> (se guarda un respaldo antes)</p>'+
    '<label>Drop<select id="dropSel">'+(G.length?'<option value="">— Elige el drop —</option>'+G.map((g,i)=>'<option value="'+i+'">'+h.esc(g.drop)+' ('+h.esc(g.marca)+') · '+g.ps.length+' productos</option>').join(''):'<option value="">No hay drops con varios productos</option>')+'</select></label>'+
    '<button type="button" class="btn ghost full" id="dropBtn">🗑 Borrar este drop</button>';
  document.getElementById('dropBtn').addEventListener('click',borrar);
}

async function borrar(){
  const v=document.getElementById('dropSel').value, g=v===''?null:G[+v]; if(!g){ H.toast('Primero elige el drop'); return; }
  if(!confirm('¿Borrar los '+g.ps.length+' productos de “'+g.drop+'” ('+g.marca+') con sus fotos?\n\nAntes se guarda un respaldo para que puedas regresarlos.')) return;
  const b=document.getElementById('dropBtn'); b.disabled=true; b.textContent='Guardando respaldo…';
  try{
    const fotos=[]; for(const p of g.ps) fotos.push(...await H.fotosDe(p.id));
    const out={app:'catalogo',version:1,exportado:new Date().toISOString(),parte:1,partes:1,productos:g.ps,
      fotos:await Promise.all(fotos.map(async f=>({id:f.id,productoId:f.productoId,colorK:f.colorK,fecha:f.fecha,data:await H.blobToData(f.blob)})))};
    const d=new Date(), pad=n=>String(n).padStart(2,'0');
    const name='Respaldo-Drop-'+(g.marca+'-'+g.drop).replace(/[^\w]+/g,'-').replace(/^-|-$/g,'')+'-'+d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'.json';
    // sin respaldo no se borra nada
    if(!await H.guardarArchivo(new File([JSON.stringify(out)],name,{type:'application/json'}))){ H.toast('No se guardó el respaldo; no borré nada'); return; }
    b.textContent='Borrando…';
    for(const p of g.ps) await H.delProducto(p.id);
    await H.refrescar(); pintar(H);
    H.toast('🗑 Borré '+g.ps.length+' productos de '+g.drop+'. El respaldo quedó en '+name);
  }catch(e){ H.toast('No se pudo borrar el drop'); }
  finally{ b.disabled=false; b.textContent='🗑 Borrar este drop'; }
}

window.FWDrops={pintar};
})();
