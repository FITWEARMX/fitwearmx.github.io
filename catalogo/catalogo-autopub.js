/* Publicar la tienda sola (16-nov-2026, decisión del dueño: "solo desde la Mac").
   - Solo publica el aparato marcado como PRINCIPAL en Ajustes (se guarda en este navegador).
     El iPhone u otro navegador tienen su propio Catálogo: si publicaran, taparían la tienda con su copia.
   - Espera 5 minutos sin cambios después de lo último que editaste y entonces le da "Publicar tienda".
   - Candado: si este Catálogo trae muchos menos productos que la tienda en vivo (más de 20 menos),
     NO publica solo y te avisa; ahí revisas y le picas tú.
   No cambia nombres que usa el robot de la extensión: updatedAt, actualizado, #btnPublicar, catalogo_db. */
(function(){
  const H=window.FWAutoPubH; if(!H||H.cfg.demo) return;
  const CFG=H.cfg, B=H.base;
  const KEY=CFG.db+'_autopub', ESPERA=5*60*1000, CADA=60*1000, MAX_MENOS=20;
  const lee=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const guarda=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} };
  const $=s=>document.querySelector(s);
  let ultimaHuella='', vivo=null;

  // la caja en Ajustes, arriba del botón Publicar tienda
  const btn=$('#btnPublicar'); if(!btn) return;
  const caja=document.createElement('div'); caja.className='ea-col'; caja.style.marginBottom='10px';
  caja.innerHTML='<label style="display:flex;gap:10px;align-items:center;margin:0"><input type="checkbox" id="apOn" style="width:22px;height:22px">'+
    '<span><b>Publicar sola desde este aparato</b><br><span class="note">Márcalo SOLO en tu Mac. Publica 5 min después de tu último cambio.</span></span></label>'+
    '<p class="note" id="apEstado" style="margin:8px 0 0"></p>';
  btn.parentNode.insertBefore(caja,btn);
  const est=t=>{ const e=$('#apEstado'); if(e) e.textContent=t; };
  $('#apOn').checked=!!lee().on;
  $('#apOn').addEventListener('change',e=>{ const o=lee(); o.on=e.target.checked; guarda(o); est(o.on?'✅ Este aparato publica solo.':'Apagado: aquí solo publicas con el botón.'); revisar(); });

  // lo mismo que sube "Publicar tienda": lo que está en la tienda y no agotado
  const publicables=()=>H.productos().filter(p=>p.enTienda!==false&&B(p)!=='agotado'&&(p.nombre||'').trim());
  const huella=ps=>ps.length+'|'+ps.reduce((m,p)=>Math.max(m,p.updatedAt||p.createdAt||0),0);
  const ultimoCambio=()=>(H.productos()||[]).reduce((m,p)=>Math.max(m,p.updatedAt||0),0);
  const hora=t=>new Date(t).toLocaleTimeString('es-MX',{hour:'numeric',minute:'2-digit'});

  async function leerVivo(){
    try{ const j=await (await fetch('https://fitwearmx.github.io/tienda/datos.json',{cache:'no-store'})).json();
      vivo={actualizado:Date.parse(j.actualizado)||0,n:(j.productos||[]).length+(j.privados||[]).reduce((s,g)=>s+(g.n||0),0)}; }
    catch(e){ vivo=null; }
    return vivo;
  }

  async function revisar(){
    const o=lee(); if(!o.on) return;
    if(/Publicando/.test(btn.textContent)||btn.disabled){ est('⏳ Publicando…'); return; }
    H.leerGH(); const GH=H.gh();
    if(!GH.user||!GH.repo||!GH.token){ est('⚠️ Falta tu llave de GitHub en Ajustes; no puedo publicar solo.'); return; }
    const ps=publicables(), h=huella(ps), ult=ultimoCambio();
    if(!vivo||h!==ultimaHuella) await leerVivo();
    ultimaHuella=h;
    if(!vivo){ est('Sin internet o no pude leer tu tienda. Lo intento al rato.'); return; }
    const cambio=ult>vivo.actualizado||ps.length!==vivo.n;
    if(!cambio){ est('✅ Tu tienda está al día (publicada '+hora(vivo.actualizado)+').'); return; }
    const falta=ult+ESPERA-Date.now();
    // 18-nov: si el robot de fotos mete cambios sin parar, nunca hay 5 min de calma; si la tienda ya lleva 45 min atrasada, publica de todos modos
    const atrasada=Date.now()-vivo.actualizado>45*60*1000;
    if(falta>0&&!atrasada){ est('📝 Hay cambios. Publico sola a las '+hora(ult+ESPERA)+' si ya no editas.'); return; }
    if(o.ultima&&Date.now()-o.ultima<15*60*1000){ est('⏳ Ya publiqué sola a las '+hora(o.ultima)+'; espero 15 min para la siguiente.'); return; }
    if(ps.length<vivo.n-MAX_MENOS){ est('🛑 No publiqué sola: aquí hay '+ps.length+' productos y en tu tienda '+vivo.n+'. Revisa y, si está bien, pícale “Publicar tienda”.'); return; }
    const rep=window.FWRevisor?window.FWRevisor.revisar():[];
    if(rep.length){ est('🛑 No publiqué sola: el robot revisor encontró '+rep.length+(rep.length===1?' prenda repetida':' prendas repetidas')+'. Pícale “🔎 Revisar repetidos y precios”.'); return; }
    est('🚀 Publicando sola…'); o.ultima=Date.now(); guarda(o);
    btn.click();
    // al terminar, vuelve a leer la tienda
    const t=setInterval(async()=>{ if(!btn.disabled){ clearInterval(t); setTimeout(async()=>{ await leerVivo(); revisar(); },90000); } },5000);
  }
  setInterval(revisar,CADA); setTimeout(revisar,15000);
  window.FWAutoPub={revisar};
})();
