/* ROBOT TEMPORAL Black Friday (16-nov-2026).
   Solo se prende si abres Historias con #robot-bf al final de la dirección (en tu Mac, con el servidor local del robot).
   Lee bf-temporal/lote.json: grupos por marca y drop, una historia por color con las fotos de ese color.
   Desde 17-nov lo arma bf-temporal/desde-tienda.py leyendo TU TIENDA (tienda/datos.json): mismo precio y tachado que ve el cliente
   (antes lo armaba actualizar.py leyendo las páginas de las marcas; se queda de respaldo).
   Al abrir pide actualizar si ya pasaron 30 min, y vuelve a revisar cada 30 min mientras está abierto.
   Mete cada prenda con su precio en pesos, su tachado y sus fotos, y la agrega a tu lista.
   La ventana se mueve arrastrando su barra de arriba y se hace chiquita con "—".
   Tú solo le das "Guardar" (de 10 en 10) para mandarlas a tu iPhone. No sube nada a Instagram. */
(function(){
  if(!/robot-bf/.test(location.hash)) return;
  const $=s=>document.querySelector(s), espera=ms=>new Promise(r=>setTimeout(r,ms));
  const caja=document.createElement('div');
  caja.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;background:#14121f;color:#fff;border:2px solid #7c6cff;border-radius:14px;padding:12px;font:15px system-ui;box-shadow:0 8px 30px #0008;max-width:520px;margin:auto;max-height:60vh;overflow:auto';
  caja.innerHTML='<div id="rbMango" title="Arrástrame de aquí para moverme" style="cursor:move;touch-action:none;user-select:none;-webkit-user-select:none;display:flex;align-items:center;gap:6px;margin:-4px -4px 0;padding:4px;border-radius:10px;background:#7c6cff22">'+
    '<span style="font-size:18px;opacity:.8">✥</span><b style="flex:1">🤖 Robot Black Friday</b><button id="rbMin" title="Hacer chiquito / grande" style="padding:4px 12px;font-size:16px">—</button></div>'+
    '<div id="rbCuerpo"><div style="opacity:.7;font-size:13px">(sale de tu tienda: mismo precio y tachado · una por color con sus fotos · arrastra la barra para moverme)</div>'+
    '<div id="rbAct" style="font-size:13px;opacity:.8;margin-top:4px">Revisando cuándo se actualizó…</div>'+
    '<select id="rbLote" style="width:100%;margin:8px 0;padding:8px;font-size:15px"></select>'+
    '<div style="display:flex;gap:8px"><button id="rbIr" style="flex:1;padding:10px;font-size:15px">Armar historias</button><button id="rbAlto" disabled style="padding:10px;font-size:15px">Parar</button><button id="rbYa" style="padding:10px;font-size:15px" title="Leer las marcas otra vez ahorita">🔄</button></div>'+
    '<button id="rbVer" style="width:100%;margin-top:8px;padding:10px;font-size:15px">👀 Revisar y escoger (prendas y fotos)</button>'+
    '<div id="rbRev" hidden style="margin-top:8px;border:1px solid #7c6cff66;border-radius:10px;padding:8px;max-height:45vh;overflow:auto"></div>'+
    '<div id="rbMsg" style="margin-top:8px;opacity:.85">Cargando lista…</div>'+
    '<details id="rbAviso" hidden style="margin-top:8px;font-size:13px"><summary></summary><div id="rbAvisoTxt" style="white-space:pre-wrap;opacity:.85;margin-top:6px"></div></details></div>';
  document.body.appendChild(caja);
  // --- mover la ventana (mouse o dedo) y hacerla chiquita; se acuerda dónde la dejaste ---
  const guarda=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} }, lee=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
  function ponEn(x,y){
    const w=caja.offsetWidth, h=caja.offsetHeight;
    x=Math.max(0,Math.min(innerWidth-Math.min(w,innerWidth),x)); y=Math.max(0,Math.min(innerHeight-40,y));
    caja.style.left=x+'px'; caja.style.top=y+'px'; caja.style.right='auto'; caja.style.bottom='auto'; caja.style.margin='0'; caja.style.width=Math.min(520,innerWidth-24)+'px';
  }
  try{ const g=JSON.parse(lee('robotBfPos')||'null'); if(g) ponEn(g.x,g.y); }catch(e){}
  const mango=caja.querySelector('#rbMango'); let arr=null;
  mango.addEventListener('pointerdown',e=>{ if(e.target.closest('button')) return; const r=caja.getBoundingClientRect(); arr={dx:e.clientX-r.left,dy:e.clientY-r.top}; mango.setPointerCapture(e.pointerId); e.preventDefault(); });
  mango.addEventListener('pointermove',e=>{ if(arr) ponEn(e.clientX-arr.dx,e.clientY-arr.dy); });
  const suelta=()=>{ if(!arr) return; arr=null; const r=caja.getBoundingClientRect(); guarda('robotBfPos',JSON.stringify({x:Math.round(r.left),y:Math.round(r.top)})); };
  mango.addEventListener('pointerup',suelta); mango.addEventListener('pointercancel',suelta);
  const chico=v=>{ caja.querySelector('#rbCuerpo').hidden=v; caja.querySelector('#rbMin').textContent=v?'▢':'—'; guarda('robotBfChico',v?'1':''); };
  caja.querySelector('#rbMin').onclick=()=>chico(!caja.querySelector('#rbCuerpo').hidden);
  chico(lee('robotBfChico')==='1');
  addEventListener('resize',()=>{ if(caja.style.top){ const r=caja.getBoundingClientRect(); ponEn(r.left,r.top); } });
  const msg=t=>{ $('#rbMsg').textContent=t; };
  let lotes=[], fecha='', parar=false, armando=false;
  const hora=s=>{ if(!s) return '—'; const d=new Date(s); return d.toLocaleDateString('es-MX',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'}); };
  async function cargarLote(){
    try{ const j=await (await fetch('bf-temporal/lote.json',{cache:'no-store'})).json();
      if(j.fecha===fecha) return; fecha=j.fecha;
      const antes=$('#rbLote').selectedOptions[0], nom=antes?antes.text.replace(/\s*\(\d+\)$/,''):'';
      lotes=j.lotes||[]; $('#rbLote').innerHTML=lotes.map((l,i)=>'<option value="'+i+'">'+l.nombre+'</option>').join('');
      const k=lotes.findIndex(l=>l.nombre.replace(/\s*\(\d+\)$/,'')===nom); if(k>=0) $('#rbLote').value=String(k); $('#rbLote').dispatchEvent(new Event('change'));
      if(!armando) msg('Escoge un drop y dale "Armar historias". Lista del '+hora(j.fecha)+'.');
    }catch(e){ msg('No encontré la lista del robot (bf-temporal/lote.json).'); }
  }
  function pintarEstado(e){
    const ms=e.marcas||{};
    $('#rbAct').textContent=(e.leyendo?'⏳ Leyendo las marcas… · ':'')+'Actualizado: '+hora(e.actualizado)+' · '+
      Object.keys(ms).map(m=>m+(ms[m].ok?' ✓':' ⚠️')+' '+hora(ms[m].hora)).join(' · ');
    const av=[];
    Object.keys(ms).forEach(m=>{ if(!ms[m].ok) av.push(m+': no dejó leer ('+ms[m].nota+'). Se usa lo último bueno.'); });
    // cada marca acaba su Black Friday cuando quiere: si hace más de un día que no la leo, no sé si sigue
    Object.keys(ms).forEach(m=>{ const h=ms[m].hora?new Date(ms[m].hora):null; if(!h||Date.now()-h>24*3600e3) av.unshift('⚠️ '+m+': '+(h?'hace más de un día que no la puedo leer':'todavía no la he podido leer (uso los precios de tu catálogo BF)')+'. No sé si sigue su Black Friday; revisa su página antes de subir.'); });
    if((e.tienda||[]).length) av.unshift('⚠️ PRECIO DISTINTO A TU TIENDA ('+e.tienda.length+') · dólar del robot $'+(e.dolar||'19')+':\n'+e.tienda.join('\n'));
    if((e.formula||[]).length) av.push('NO CUADRAN con la fórmula ('+e.formula.length+'):\n'+e.formula.join('\n'));
    if((e.cambios||[]).length) av.push('Cambiaron de precio hoy ('+e.cambios.length+'):\n'+e.cambios.join('\n'));
    if((e.quitadas||[]).length) av.push('Se quitaron por agotadas o sin oferta ('+e.quitadas.length+'):\n'+e.quitadas.join('\n'));
    $('#rbAviso').hidden=!av.length; $('#rbAviso').querySelector('summary').textContent='Avisos: '+((e.tienda||[]).length?(e.tienda.length+' distinto a tu tienda · '):'')+(e.formula||[]).length+' no cuadran · '+(e.cambios||[]).length+' cambiaron · '+(e.quitadas||[]).length+' quitadas';
    $('#rbAvisoTxt').textContent=av.join('\n\n');
  }
  let leia=false;
  async function revisar(forzar){
    try{ const e=await (await fetch('/bf/'+(forzar===undefined?'estado':'actualizar'+(forzar?'?forzar=1':'')),{cache:'no-store'})).json();
      pintarEstado(e); if(leia&&!e.leyendo) await cargarLote(); leia=e.leyendo;
    }catch(e){ $('#rbAct').textContent='(Sin servidor del robot: no se puede actualizar solo; uso la última lista.)'; }
  }
  cargarLote().then(()=>revisar(false));
  setInterval(()=>revisar(), 60*1000);        // cada minuto: ¿ya terminó de leer?
  setInterval(()=>revisar(false), 30*60*1000); // cada 30 min: si ya pasaron 2 h, vuelve a leer las marcas
  $('#rbYa').onclick=()=>{ revisar(true); msg('Leyendo las marcas otra vez (tarda unos minutos; puedes seguir usando la lista).'); };
  const enLista=()=>parseInt((($('#colaN')||{}).textContent||'').replace(/\D/g,''))||0;
  $('#rbAlto').onclick=()=>{ parar=true; msg('Parando…'); };
  // --- panel para revisar: ves cada prenda (color, precio, tachado y sus fotos) y escoges cuáles van ---
  // sel[nombre del grupo][i] = {on: va o no va, f: [qué fotos van]}; si no abres el panel, van todas.
  const sel={}, esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const llave=l=>l.nombre.replace(/\s*\(\d+\)$/,'');
  const selDe=l=>{ const k=llave(l); if(!sel[k]||sel[k].length!==l.items.length) sel[k]=l.items.map(it=>({on:true,f:it.fotos.map(()=>true)})); return sel[k]; };
  const cuantas=l=>selDe(l).filter((s,i)=>s.on&&s.f.some(Boolean)).length;
  function pintarRev(){
    const l=lotes[+$('#rbLote').value], R=$('#rbRev'); if(!l){ R.innerHTML=''; return; }
    const s=selDe(l);
    R.innerHTML='<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center"><b style="flex:1">'+cuantas(l)+' de '+l.items.length+' van</b><button data-todo="1">Todas</button><button data-todo="0">Ninguna</button></div>'+
      l.items.map((it,i)=>'<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:1px solid #ffffff22;'+(s[i].on?'':'opacity:.4')+'">'+
        '<input type="checkbox" data-it="'+i+'" '+(s[i].on?'checked':'')+' style="width:22px;height:22px;flex:none;margin-top:2px">'+
        '<div style="flex:1;min-width:0"><div style="font-size:13px"><b>'+esc(it.nombre)+'</b>'+(it.color?' · '+esc(it.color):'')+'</div>'+
        '<div style="font-size:13px;opacity:.85">$'+it.precioMxn+(it.precioAntesMxn>it.precioMxn?' <s style="opacity:.7">$'+it.precioAntesMxn+'</s>':'')+' · '+esc(it.etiqueta||'')+' · '+it.fotos.length+' foto'+(it.fotos.length>1?'s':'')+'</div>'+
        '<div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">'+it.fotos.map((f,j)=>'<img data-f="'+i+','+j+'" src="'+esc(f)+'" loading="lazy" title="Toca para quitar o poner esta foto" style="width:56px;height:70px;object-fit:cover;border-radius:6px;cursor:pointer;border:3px solid '+(s[i].f[j]?'#7c6cff':'transparent')+';opacity:'+(s[i].f[j]?1:.3)+'">').join('')+'</div>'+
        '</div></div>').join('');
    $('#rbIr').textContent='Armar '+cuantas(l)+' historias';
  }
  $('#rbRev').addEventListener('click',e=>{
    const l=lotes[+$('#rbLote').value]; if(!l) return; const s=selDe(l), t=e.target;
    if(t.dataset.todo!=null) s.forEach(x=>{ x.on=t.dataset.todo==='1'; });
    else if(t.dataset.it!=null) s[+t.dataset.it].on=t.checked;
    else if(t.dataset.f){ const [i,j]=t.dataset.f.split(',').map(Number); s[i].f[j]=!s[i].f[j]; if(s[i].f.some(Boolean)) s[i].on=true; }
    else return;
    pintarRev();
  });
  $('#rbVer').onclick=()=>{ const R=$('#rbRev'); R.hidden=!R.hidden; $('#rbVer').textContent=R.hidden?'👀 Revisar y escoger (prendas y fotos)':'Cerrar revisión'; if(!R.hidden) pintarRev(); };
  $('#rbLote').addEventListener('change',()=>{ if(!$('#rbRev').hidden) pintarRev(); else { const l=lotes[+$('#rbLote').value]; if(l) $('#rbIr').textContent='Armar '+cuantas(l)+' historias'; } });
  $('#rbIr').onclick=async()=>{
    const l=lotes[+$('#rbLote').value]; if(!l) return;
    const s=selDe(l), lista=l.items.map((it,i)=>s[i].on?Object.assign({},it,{fotos:it.fotos.filter((f,j)=>s[i].f[j])}):null).filter(it=>it&&it.fotos.length);
    if(!lista.length){ msg('No escogiste ninguna. Abre "Revisar y escoger".'); return; }
    parar=false; armando=true; $('#rbIr').disabled=true; $('#rbAlto').disabled=false;
    let hechas=0, malas=[];
    for(const it of lista){
      if(parar) break;
      msg('Armando '+(hechas+malas.length+1)+' de '+lista.length+': '+it.nombre+(it.color?' ('+it.color+')':''));
      const antes=enLista();
      try{
        await window.recibirProducto({marca:it.marca,nombre:it.nombre,precioMxn:it.precioMxn,precioAntesMxn:it.precioAntesMxn,
          etiqueta:it.etiqueta,descripcion:it.descripcion,fotos:it.fotos,url:''});
        await espera(250);
        if(Math.round(+$('#tMxn').value)!==it.precioMxn) throw 'precio'; // revisa que quedó el precio de la lista
        $('#btnAgregar').click();
        for(let k=0;k<60&&enLista()===antes;k++) await espera(100);
        if(enLista()===antes) throw 'no se agregó';
        hechas++;
      }catch(e){ malas.push(it.nombre+(it.color?' ('+it.color+')':'')); }
    }
    armando=false; $('#rbIr').disabled=false; $('#rbAlto').disabled=true; $('#rbIr').textContent='Armar '+cuantas(l)+' historias';
    msg('Listo: '+hechas+' historias en tu lista'+(malas.length?' · fallaron: '+malas.join(', '):'')+'. Revisa y dale "Guardar".');
  };
})();
