/* Inventario compartido para todas las apps (Facturas, Cotizador, Historias…).
   - Las piezas de verdad viven en el Catálogo de este aparato (IndexedDB catalogo_db).
   - Si este aparato no tiene el Catálogo, se lee la copia pública /tienda/productos.json (solo lectura).
   Nunca crea ni cambia la base del Catálogo: si no existe, no hace nada. */
(function(){
const DB='catalogo_db', NUBE='/tienda/productos.json';
const num=v=>{const n=parseFloat(String(v==null?'':v).replace(/[^0-9.\-]/g,''));return isFinite(n)?n:0;};

async function abrir(){
  if(!window.indexedDB) return null;
  if(indexedDB.databases){ const l=await indexedDB.databases(); if(!l.some(d=>d.name===DB)) return null; }
  const d=await new Promise((res,rej)=>{ const r=indexedDB.open(DB); r.onupgradeneeded=()=>{ try{ r.transaction.abort(); }catch(e){} }; r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
  if(!d.objectStoreNames.contains('productos')){ d.close(); return null; }
  return d;
}

// La copia pública que sube "Publicar tienda" (sin costos ni Early Access)
async function nube(){
  try{ const r=await fetch(NUBE,{cache:'no-store'}); if(!r.ok) return null; const j=await r.json(); return j&&j.app==='inventario'?j:null; }
  catch(e){ return null; }
}

// Suma (+1) o resta (-1) piezas de una talla en el Catálogo de este aparato.
// Regresa cuántas quedan, o null si no se pudo (no hay Catálogo, no existe la talla o ya no hay piezas).
async function mover(pid,ck,talla,d){
  if(!pid||!talla) return null;
  let db; try{ db=await abrir(); }catch(e){ return null; } if(!db) return null;
  try{
    return await new Promise((res,rej)=>{
      const tx=db.transaction('productos','readwrite'), st=tx.objectStore('productos'); let quedan=null;
      const g=st.get(pid);
      g.onsuccess=()=>{ const p=g.result; const c=p&&(p.colores||[]).find(x=>x.k===ck);
        if(!c||!c.tallas||!(talla in c.tallas)) return;
        const n=num(c.tallas[talla]); if(d<0&&n<=0) return;
        c.tallas[talla]=Math.max(0,n+d); p.updatedAt=Date.now(); quedan=c.tallas[talla]; st.put(p); };
      tx.oncomplete=()=>res(quedan); tx.onerror=tx.onabort=()=>rej(tx.error);
    });
  }catch(e){ return null; }
  finally{ db.close(); }
}

window.FWProductos={nube,mover};
})();
