function overlayCategory(x){const t=((x.category||"")+" "+(x.title||"")).toLowerCase();if(/furadeira|parafusadeira|serra|lixadeira|ferrament|broca/.test(t))return "ferramentas";if(/fone|smartwatch|celular|notebook|gamer|mouse|teclado|bluetooth|tecnologia|eletr[oô]nic/.test(t))return "tecnologia";if(/cozinha|panela|air fryer|casa|organizador|limpeza|banheiro|aspirador/.test(t))return "casa";if(/perfume|maquiagem|skincare|beleza|moda|t[eê]nis|vestido|bolsa/.test(t))return "beleza";return "geral"}
export function buildOverlayCopy(x){
 const type=overlayCategory(x);
 const titles={ferramentas:"Achado útil",tecnologia:"Achadinho tech",casa:"Utilidade do dia",beleza:"Achadinho de hoje",geral:"Achadinho do dia"};
 const support={ferramentas:"Confira os detalhes",tecnologia:"Tecnologia para conferir",casa:"Ideia útil para casa",beleza:"Vale conhecer",geral:"Vale conferir"};
 const tags={ferramentas:"#ferramentas",tecnologia:"#tecnologia",casa:"#utilidadesdomesticas",beleza:"#beleza",geral:"#achados"};
 const subtitle=String(x.title||"Produto em destaque").replace(/\s+/g," ").trim();
 const short=subtitle.length>55?subtitle.slice(0,52).replace(/\s+\S*$/,"").trim()+"…":subtitle;
 const caption=["✨ "+titles[type]+"!","",x.title,"","💬 Gostou? Comente EU QUERO para receber o link por mensagem!","",x.affiliate?"🔗 Link: "+x.affiliate:"🔗 Consulte a oferta: "+(x.url||"link disponível por mensagem"),"","Publicidade / link de afiliado. Preço, frete e disponibilidade podem mudar."].join("\n");
 return {title:titles[type],subtitle:short,cta:"Comente EU QUERO",support:support[type],caption,hashtags:"#achadinhos #ofertas #mercadolivre "+tags[type]};
}

export const copyKeys=["title","subtitle","cta","support","caption","hashtags"];
export function loadCopy(offer){try{return {...buildOverlayCopy(offer),...JSON.parse(localStorage.getItem('ml-copy-'+offer.id)||'{}')}}catch{return buildOverlayCopy(offer)}}
export function saveCopy(id,copy){localStorage.setItem('ml-copy-'+id,JSON.stringify(copy));window.dispatchEvent(new CustomEvent('observatorio:copy',{detail:{id,copy}}))}
