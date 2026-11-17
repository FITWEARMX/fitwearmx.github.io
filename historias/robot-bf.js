/* ROBOT TEMPORAL Black Friday (16-nov-2026).
   Solo se prende si abres Historias con #robot-bf al final de la dirección (en tu Mac, con el servidor local del robot).
   Lee bf-temporal/lote.json: grupos por marca y drop, con el precio de hoy según la fórmula de cada marca
   (lo arma bf-temporal/actualizar.py leyendo las páginas de las marcas; quita lo agotado o lo que ya no está en oferta).
   Al abrir pide actualizar si ya pasaron 2 horas, y vuelve a revisar cada 30 min mientras está abierto.
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
    '<div id="rbCuerpo"><div style="opacity:.7;font-size:13px">(por drop, precio de hoy · arrastra la barra para moverme)</div>'+
    '<div id="rbAct" style="font-size:13px;opacity:.8;margin-top:4px">Revisando cuándo se actualizó…</div>'+
    '<select id="rbLote" style="width:100%;margin:8px 0;padding:8px;font-size:15px"></select>'+
    '<div style="display:flex;gap:8px"><button id="rbIr" style="flex:1;padding:10px;font-size:15px">Armar historias</button><button id="rbAlto" disabled style="padding:10px;font-size:15px">Parar</button><button id="rbYa" style="padding:10px;font-size:15px" title="Leer las marcas otra vez ahorita">🔄</button></div>'+
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
      const k=lotes.findIndex(l=>l.nombre.replace(/\s*\(\d+\)$/,'')===nom); if(k>=0) $('#rbLote').value=String(k);
      if(!armando) msg('Escoge un drop y dale "Armar historias". Lista del '+hora(j.fecha)+'.');
    }catch(e){ msg('No encontré la lista del robot (bf-temporal/lote.json).'); }
  }
  function pintarEstado(e){
    const ms=e.marcas||{};
    $('#rbAct').textContent=(e.leyendo?'⏳ Leyendo las marcas… · ':'')+'Actualizado: '+hora(e.actualizado)+' · '+
      Object.keys(ms).map(m=>m+(ms[m].ok?' ✓':' ⚠️')+' '+hora(ms[m].hora)).join(' · ');
    const av=[];
    Object.keys(ms).forEach(m=>{ if(!ms[m].ok) av.push(m+': no dejó leer ('+ms[m].nota+'). Se usa lo último bueno.'); });
    if((e.formula||[]).length) av.push('NO CUADRAN con la fórmula ('+e.formula.length+'):\n'+e.formula.join('\n'));
    if((e.cambios||[]).length) av.push('Cambiaron de precio hoy ('+e.cambios.length+'):\n'+e.cambios.join('\n'));
    if((e.quitadas||[]).length) av.push('Se quitaron por agotadas o sin oferta ('+e.quitadas.length+'):\n'+e.quitadas.join('\n'));
    $('#rbAviso').hidden=!av.length; $('#rbAviso').querySelector('summary').textContent='Avisos: '+(e.formula||[]).length+' no cuadran · '+(e.cambios||[]).length+' cambiaron · '+(e.quitadas||[]).length+' quitadas';
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
  $('#rbIr').onclick=async()=>{
    const l=lotes[+$('#rbLote').value]; if(!l) return;
    parar=false; armando=true; $('#rbIr').disabled=true; $('#rbAlto').disabled=false;
    let hechas=0, malas=[];
    for(const it of l.items){
      if(parar) break;
      msg('Armando '+(hechas+malas.length+1)+' de '+l.items.length+': '+it.nombre);
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
      }catch(e){ malas.push(it.nombre); }
    }
    armando=false; $('#rbIr').disabled=false; $('#rbAlto').disabled=true;
    msg('Listo: '+hechas+' historias en tu lista'+(malas.length?' · fallaron: '+malas.join(', '):'')+'. Revisa y dale "Guardar".');
  };
})();
