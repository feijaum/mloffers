const brl=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function offerPriceLine(offer){
 const current=Number(offer.price),previous=Number(offer.previous);
 if(offer.price==null||offer.price===''||!Number.isFinite(current)||current<=0)return '';
 const prices=offer.previous!=null&&offer.previous!==''&&Number.isFinite(previous)&&previous>current?'De '+brl(previous)+' por '+brl(current):'Por '+brl(current);
 return '💰 '+prices+(offer.pix?' no Pix':'');
}
export function buildInstagramCaption(offer,heading='✨ ACHADO DO DIA!'){
 return [heading,offer.title,offerPriceLine(offer),offer.couponPrice!=null||offer.couponDiscount!=null?'🎟️ Pode haver cupom sujeito à elegibilidade.':'','💬 Gostou? Comente EU QUERO para receber o link por mensagem!','Publicidade / link de afiliado. Preço, frete e disponibilidade podem mudar.'].filter(Boolean).join('\n\n');
}
export function privateLinkCaption(offer,caption){
 let value=String(caption||'');
 const legacy=/^.*(?:🔗\s*(?:Link(?: da oferta nesta publicação)?|Consulte a oferta)\s*:|Link da oferta nesta publicação:|Consulte a oferta:).*$/gimu;
 if(legacy.test(value)){
  legacy.lastIndex=0;const price=offerPriceLine(offer);let inserted=/^💰.*$/mu.test(value);
  if(inserted)value=value.replace(/^💰.*$/mu,price);
  value=value.replace(legacy,()=>{if(inserted)return '';inserted=true;return price});
 }
 return value.replace(/https?:\/\/[^\s<>"']+/giu,'').replace(/\n{3,}/g,'\n\n').trim();
}
function overlayCategory(x){const t=((x.category||"")+" "+(x.title||"")).toLowerCase();if(/furadeira|parafusadeira|serra|lixadeira|ferrament|broca/.test(t))return "ferramentas";if(/fone|smartwatch|celular|notebook|gamer|mouse|teclado|bluetooth|tecnologia|eletr[oô]nic/.test(t))return "tecnologia";if(/cozinha|panela|air fryer|casa|organizador|limpeza|banheiro|aspirador/.test(t))return "casa";if(/perfume|maquiagem|skincare|beleza|moda|t[eê]nis|vestido|bolsa/.test(t))return "beleza";return "geral"}
export function buildOverlayCopy(x){
 const type=overlayCategory(x);
 const titles={ferramentas:"Achado útil",tecnologia:"Achadinho tech",casa:"Utilidade do dia",beleza:"Achadinho de hoje",geral:"Achadinho do dia"};
 const support={ferramentas:"Confira os detalhes",tecnologia:"Tecnologia para conferir",casa:"Ideia útil para casa",beleza:"Vale conhecer",geral:"Vale conferir"};
 const tags={ferramentas:"#ferramentas",tecnologia:"#tecnologia",casa:"#utilidadesdomesticas",beleza:"#beleza",geral:"#achados"};
 const subtitle=String(x.title||"Produto em destaque").replace(/\s+/g," ").trim();
 const short=subtitle.length>55?subtitle.slice(0,52).replace(/\s+\S*$/,"").trim()+"…":subtitle;
 const caption=buildInstagramCaption(x,"✨ "+titles[type]+"!");
 return {title:titles[type],subtitle:short,cta:"Comente EU QUERO",support:support[type],caption,hashtags:"#achadinhos #ofertas #mercadolivre "+tags[type]};
}

export const copyKeys=["title","subtitle","cta","support","caption","hashtags"];
export function loadCopy(offer){const base=buildOverlayCopy(offer);try{const saved=JSON.parse(localStorage.getItem('ml-copy-'+offer.id)||'{}');return {...base,...saved,caption:privateLinkCaption(offer,saved.caption??base.caption)}}catch{return base}}
export function saveCopy(id,copy){localStorage.setItem('ml-copy-'+id,JSON.stringify(copy));window.dispatchEvent(new CustomEvent('observatorio:copy',{detail:{id,copy}}))}
