/* Robot revisor (17-nov-2026, pedido del dueño): antes de "Publicar tienda" revisa que no haya
   la misma prenda dos veces (ej. "Batman Compression Tees 2.0" y "… New Colors"), el mismo color en dos
   publicaciones, precios distintos para la misma prenda o Black Friday en una copia y en otra no.
   Si encuentra algo, NO publica y enseña la lista; el dueño decide "Publicar así" o arreglarlo.
   Publicar solo (catalogo-autopub.js) no publica mientras haya pendientes.
   No cambia datos: solo avisa. */
(function(){
  const H=window.FWAutoPubH; if(!H||H.cfg.demo) return;
  const btn=document.querySelector('#btnPublicar'); if(!btn) return;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>'$'+Math.round(+v||0).toLocaleString('en-US');

  // mismo modelo: sin "New Colors", "2.0", "Restock", espacios dobles ni plurales (la colección "X - " sí cuenta)
  const modelo=n=>String(n||'').toLowerCase().replace(/\b(new colou?rs?|nuevos? colores|restock|2\.0|v2)\b/g,' ')
    .replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).map(w=>w.length>3?w.replace(/s$/,''):w).join(' ');
  const publicables=()=>H.productos().filter(p=>p.enTienda!==false&&H.base(p)!=='agotado'&&(p.nombre||'').trim());

  function revisar(){
    const g=new Map();
    for(const p of publicables()){ const k=H.marca(p)+'|'+modelo(p.nombre); if(!g.has(k)) g.set(k,[]); g.get(k).push(p); }
    const out=[];
    for(const ps of g.values()){
      if(ps.length<2) continue;
      const info=ps.map(p=>{ const cs=(p.colores||[]).filter(c=>!c.agotado);
        const pr=cs.map(c=>H.precio(p,c)).filter(Boolean), bf=cs.some(c=>H.antes(p,c)>0);
        return {p,min:Math.min(...pr),max:Math.max(...pr),bf,cols:cs.map(c=>(c.nombre||'').trim().toLowerCase())}; });
      const vistos={}, rep=new Set(); info.forEach(x=>x.cols.forEach(c=>{ if(c&&vistos[c]&&vistos[c]!==x.p.id) rep.add(c); vistos[c]=x.p.id; }));
      const precios=new Set(info.map(x=>x.min+'-'+x.max)).size>1, bfMix=info.some(x=>x.bf)&&info.some(x=>!x.bf);
      out.push({marca:H.marca(ps[0]),info,rep:[...rep],precios,bfMix});
    }
    return out;
  }

  function lista(r){
    return r.map(x=>'<div style="border:1px solid #e3e3e6;border-radius:10px;padding:10px 12px;margin:0 0 10px">'+
      '<b>'+esc(x.marca)+'</b> · '+x.info.length+' publicaciones de la misma prenda'+
      x.info.map(i=>'<div style="margin-top:6px">• '+esc(i.p.nombre)+(i.p.coleccion?' <small>('+esc(i.p.coleccion)+')</small>':'')+' — '+
        money(i.min)+(i.max!==i.min?'–'+money(i.max):'')+(i.bf?' 🖤 con tachado':' sin tachado')+'</div>').join('')+
      '<div style="margin-top:6px;color:#C4402F">'+[x.precios?'Precios distintos':'',x.bfMix?'Black Friday en una sí y en otra no':'',x.rep.length?'Mismo color en las dos: '+esc(x.rep.slice(0,4).join(', '))+(x.rep.length>4?'…':''):''].filter(Boolean).join(' · ')+'</div>'+
      '<div style="margin-top:4px;color:#76767b;font-size:13px">Sugerencia: deja una sola (junta los colores en la buena) y a la otra quítale "Mostrar en la tienda".</div></div>').join('');
  }

  // ventana con la lista
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:85vh;display:flex;flex-direction:column">'+
    '<div style="padding:16px 18px;border-bottom:1px solid #eee"><b style="font-size:17px">🔎 Robot revisor</b><p id="rvTit" style="margin:4px 0 0;color:#76767b"></p></div>'+
    '<div id="rvLista" style="overflow:auto;padding:14px 18px"></div>'+
    '<div style="display:flex;gap:10px;padding:14px 18px;border-top:1px solid #eee">'+
    '<button id="rvCerrar" style="flex:1;padding:12px;border-radius:10px;border:1px solid #ddd;background:#fff;font-weight:700">Lo arreglo primero</button>'+
    '<button id="rvSi" style="flex:1;padding:12px;border-radius:10px;border:0;background:#0b0b0c;color:#fff;font-weight:700">Publicar así</button></div></div>';
  document.body.appendChild(ov);
  let pasar=false;
  const cerrar=()=>{ ov.style.display='none'; };
  $('#rvCerrar').addEventListener('click',cerrar);
  $('#rvSi').addEventListener('click',()=>{ cerrar(); pasar=true; btn.click(); });
  function abrir(r,conPublicar){
    $('#rvTit').textContent=r.length?'Encontré '+r.length+(r.length===1?' prenda repetida':' prendas repetidas')+' en lo que va a tu tienda:':'✅ Todo en orden: sin prendas repetidas ni precios distintos.';
    $('#rvLista').innerHTML=r.length?lista(r):'';
    $('#rvSi').style.display=conPublicar&&r.length?'':'none';
    $('#rvCerrar').textContent=r.length?'Lo arreglo primero':'Listo';
    ov.style.display='flex';
  }

  // antes de publicar (se adelanta al botón)
  btn.addEventListener('click',e=>{
    if(pasar){ pasar=false; return; }
    if(window.FWRevisor.auto) return;
    const r=revisar(); if(!r.length) return;
    e.stopImmediatePropagation(); e.preventDefault(); abrir(r,true);
  },true);

  // botón para revisar cuando quieras (en Ajustes, arriba de Publicar tienda)
  const b2=document.createElement('button'); b2.type='button'; b2.className=btn.className; b2.textContent='🔎 Revisar repetidos y precios';
  b2.style.cssText='margin-bottom:10px;background:#fff;color:#0b0b0c;border:1px solid #ddd';
  b2.addEventListener('click',()=>abrir(revisar(),false));
  btn.parentNode.insertBefore(b2,btn);

  window.FWRevisor={revisar,abrir:()=>abrir(revisar(),false),auto:false};
})();
