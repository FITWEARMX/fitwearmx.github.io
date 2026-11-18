/* Vigilante (17-nov-2026, pedido del dueño: "que no falle y si falla dime").
   Compara las colecciones que vigila en la página de la marca contra este Catálogo y AVISA:
   - prendas que faltan (no están en el Catálogo)
   - prendas que están pero ocultas (no salen en la tienda)
   Si no puede leer la página, también lo dice (nunca se queda callado).
   No carga ni cambia nada: solo avisa. El que carga es el robot de la extensión. */
(function(){
  const H=window.FWAutoPubH; if(!H||H.cfg.demo) return;
  const btn=document.querySelector('#btnPublicar'); if(!btn) return;
  const KEY=H.cfg.db+'_vigilante', CADA=6*60*60*1000;
  const VIGILA=[
    {marca:'YoungLA',sitio:'https://www.youngla.com',cols:['preview-restock','preview-restock-for-her','looney-tunes-x-youngla']}
  ];
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dormir=ms=>new Promise(r=>setTimeout(r,ms));
  const hora=t=>new Date(t).toLocaleString('es-MX',{weekday:'short',hour:'numeric',minute:'2-digit'});
  const hOf=l=>((l||'').match(/products\/([^?#/]+)/)||[])[1]||'';
  const lee=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const guarda=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} };

  async function leerCol(sitio,col){
    const out=[];
    for(let pg=1;pg<=8;pg++){
      let j=null;
      for(let t=0;t<4&&!j;t++){
        try{ const r=await fetch(sitio+'/collections/'+col+'/products.json?limit=250&page='+pg,{cache:'no-store'});
          if(r.status===429){ await dormir(30000); continue; }
          if(!r.ok) throw new Error('HTTP '+r.status);
          j=await r.json(); }
        catch(e){ if(t===3) throw new Error(col+': '+e.message); await dormir(5000); }
      }
      if(!j) throw new Error(col+': la página no dejó leer (429)');
      const ps=j.products||[]; out.push(...ps); if(ps.length<250) break; await dormir(1500);
    }
    return out;
  }

  async function revisar(){
    const res={cuando:Date.now(),faltan:[],ocultas:[],errores:[],revisadas:0};
    const mios=new Map();
    // si la misma prenda está en dos (ej. "New Colors" juntada en la otra), cuenta la que sí sale en la tienda
    const sale=p=>p.enTienda!==false&&H.base(p)!=='agotado';
    for(const p of H.productos()) for(const l of [p.link,...(p.colores||[]).map(c=>c.link)]){ const h=hOf(l); if(h&&(!mios.has(h)||(sale(p)&&!sale(mios.get(h))))) mios.set(h,p); }
    for(const v of VIGILA) for(const col of v.cols){
      try{
        const ps=await leerCol(v.sitio,col);
        for(const p of ps){
          if(!(p.variants||[]).some(x=>x.available)) continue;
          res.revisadas++;
          const m=mios.get(p.handle);
          const it={marca:v.marca,col,nombre:p.title,link:v.sitio+'/products/'+p.handle};
          if(!m) res.faltan.push(it);
          else if(m.enTienda===false||H.base(m)==='agotado') res.ocultas.push({...it,nombre:m.nombre});
        }
        await dormir(1500);
      }catch(e){ res.errores.push(v.marca+' · '+e.message); }
    }
    // quitar repetidas (una prenda puede estar en dos colecciones)
    const uniq=a=>[...new Map(a.map(x=>[x.link,x])).values()];
    res.faltan=uniq(res.faltan); res.ocultas=uniq(res.ocultas);
    guarda(res); pintar(res); return res;
  }

  // aviso arriba de la página (solo si falta algo o falló)
  const bar=document.createElement('div');
  bar.style.cssText='display:none;position:sticky;top:0;z-index:9998;padding:10px 14px;font-weight:700;cursor:pointer;font-size:14px';
  document.body.insertBefore(bar,document.body.firstChild);
  // caja en Ajustes, arriba de Publicar tienda
  const caja=document.createElement('div'); caja.className='ea-col'; caja.style.marginBottom='10px';
  caja.innerHTML='<b>👀 Vigilante de YoungLA</b><p class="note" id="vgEstado" style="margin:6px 0 8px"></p>';
  const b3=document.createElement('button'); b3.type='button'; b3.className=btn.className; b3.textContent='👀 Revisar qué falta ahorita';
  b3.style.cssText='background:#fff;color:#0b0b0c;border:1px solid #ddd';
  caja.appendChild(b3); btn.parentNode.insertBefore(caja,btn);
  b3.addEventListener('click',async()=>{ b3.disabled=true; document.querySelector('#vgEstado').textContent='Revisando youngla.com…'; try{ await revisar(); }finally{ b3.disabled=false; } });

  // ventana con la lista
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:85vh;display:flex;flex-direction:column">'+
    '<div style="padding:16px 18px;border-bottom:1px solid #eee"><b style="font-size:17px">👀 Vigilante</b></div>'+
    '<div id="vgLista" style="overflow:auto;padding:14px 18px"></div>'+
    '<div style="padding:14px 18px;border-top:1px solid #eee"><button id="vgCerrar" style="width:100%;padding:12px;border-radius:10px;border:0;background:#0b0b0c;color:#fff;font-weight:700">Listo</button></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#vgCerrar').addEventListener('click',()=>{ ov.style.display='none'; });
  bar.addEventListener('click',()=>{ ov.style.display='flex'; });

  function pintar(r){
    const est=document.querySelector('#vgEstado'); if(!r||!r.cuando){ if(est) est.textContent='Todavía no revisa.'; return; }
    const nF=r.faltan.length, nO=r.ocultas.length, nE=r.errores.length;
    const txt=nE?'⚠️ No pude revisar todo: '+r.errores.join(' · ')
      :(nF||nO)?'⚠️ YoungLA: faltan '+nF+' prendas en tu Catálogo'+(nO?' y '+nO+' están ocultas':'')+'.'
      :'✅ YoungLA completo: las '+r.revisadas+' prendas que vigilo están en tu tienda.';
    if(est) est.textContent=txt+' (revisado '+hora(r.cuando)+')';
    bar.textContent=txt+' Pícale para ver la lista.';
    bar.style.background=nE?'#fff3cd':'#fde2e1'; bar.style.color=nE?'#6b4e00':'#8a1c12';
    bar.style.display=(nF||nO||nE)?'block':'none';
    const lis=(t,a)=>a.length?'<p style="margin:10px 0 6px"><b>'+t+' ('+a.length+')</b></p>'+a.slice(0,200).map(x=>'<div style="margin:3px 0">• <a href="'+esc(x.link)+'" target="_blank" rel="noopener">'+esc(x.nombre)+'</a> <small style="color:#76767b">'+esc(x.col)+'</small></div>').join(''):'';
    document.querySelector('#vgLista').innerHTML='<p style="margin:0;color:#76767b">'+esc(txt)+'</p>'+
      (nE?'<p style="color:#8a6d00">'+r.errores.map(esc).join('<br>')+'</p>':'')+lis('Faltan',r.faltan)+lis('Ocultas (no salen en la tienda)',r.ocultas)+
      ((nF||nO)?'<p style="margin-top:12px;color:#76767b;font-size:13px">Las carga el robot de la extensión (chat 7). Si siguen faltando en la siguiente revisión, avísale a Claude.</p>':'');
  }

  pintar(lee());
  const toca=()=>{ const r=lee(); if(!r.cuando||Date.now()-r.cuando>CADA) revisar(); };
  setTimeout(toca,90000); setInterval(toca,30*60*1000);
  window.FWVigilante={revisar,ultimo:lee};
})();
