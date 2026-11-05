/* Impuesto por marca cuando escribes los dólares a mano (la misma regla que IMPUESTO_MARCA de la extensión).
   Solo para dólares de la página de la marca: lo que viene de tu tienda, Catálogo o extensión ya lo trae. */
(function(){
const IMPUESTOS=[{marca:/young\s*la|rgmnt/i,pct:8.25}];
window.FWPrecios={
  pct(marca){ const i=IMPUESTOS.find(x=>x.marca.test(String(marca||''))); return i?i.pct:0; },
  factor(marca){ return 1+this.pct(marca)/100; }
};
})();
