/* Leitura da página que o usuário abriu no Chrome. Sem scripts externos ou APIs privadas. */
function readOffersFromVisiblePage() {
  'use strict';
  if (location.origin !== 'https://www.mercadolivre.com.br' || location.pathname !== '/ofertas') {
    return {error:'Esta aba não é uma seção de /ofertas.'};
  }
  const element=document.getElementById('__NORDIC_RENDERING_CTX__');
  const source=element?.textContent||'';
  const match=/_n\.ctx\.r\s*=\s*/.exec(source);
  if(!match)return {error:'O conteúdo estruturado ainda não apareceu. Aguarde o carregamento e confira a página.'};
  const start=source.indexOf('{',match.index+match[0].length);
  if(start<0)return {error:'Contexto de ofertas não localizado.'};
  let quoted=false,escaped=false,depth=0,end=-1;
  for(let i=start;i<source.length;i++){
    const ch=source[i];
    if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}
    else if(ch==='"')quoted=true;
    else if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
  }
  if(end<0)return {error:'Contexto de ofertas incompleto.'};
  let ctx;try{ctx=JSON.parse(source.slice(start,end));}
  catch{return {error:'Contexto ilegível. Não foi possível analisar esta página.'};}
  const raw=ctx?.appProps?.pageProps?.data?.items;
  if(!Array.isArray(raw)||raw.length===0)return {error:'Nenhum resultado estruturado. Confira se a página foi carregada ou se foi exibida uma proteção.'};
  const q=new URLSearchParams(location.search);
  const section=q.get('promotion_type')==='lightning'?'relampago':
    q.get('price')==='0.0-100.0'?'ate_100':q.has('deal_ids')?'imbativeis':'ofertas';
  const label=(obj,key)=>(obj?.values||[]).find(x=>x?.key===key)?.label?.text||'';
  const output=[];
  for(const item of raw.slice(0,110)){
    const c=item?.card||{},m=c.metadata||{},cs={};
    for(const v of c.components||[])if(v?.type)cs[v.type]=v;
    const title=cs.title?.title?.text;
    const pricing=cs.price?.price||{},amount=pricing.current_price?.value;
    if(!/^MLB\d{7,14}$/.test(m.id||'')||!title||typeof amount!=='number'||!Number.isFinite(amount))continue;
    let previous=null,discount=null;
    for(const block of pricing.price_labels||[])for(const v of block.values||[]){
      if(v.price?.previous&&typeof v.price.value==='number')previous=v.price.value;
    }
    for(const v of pricing.discount_polylabel?.values||[]){
      const found=/(\d+)\s*%\s*OFF/i.exec(v?.pill?.text||'');if(found){discount=Number(found[1]);break;}
    }
    const sellers=cs.seller?.seller||{};
    const seller=label(sellers,'label')||String(sellers.text||'').replace(/\{[^}]+\}/g,'').trim();
    const reviews=cs.review_compacted?.review_compacted||{};
    const ratingRaw=Number(label(reviews,'label'));
    const rating=ratingRaw>0&&ratingRaw<=5?ratingRaw:null;
    let couponPrice=null,couponDiscount=null;
    for(const promo of cs.promotions?.promotions||[]){
      if(promo.type!=='coupon')continue;
      const value=(promo.values||[]).find(v=>v?.type==='price'&&typeof v.price?.value==='number')?.price?.value;
      if(value==null)continue;
      if(/OFF/i.test(promo.text||''))couponDiscount=value;
      else couponPrice=value;
    }
    let expiry='';
    for(const comp of c.widget_components||[]){
      if(comp?.poly_label_component?.countdown?.period_end)expiry=comp.poly_label_component.countdown.period_end;
    }
    const pictureId=c.pictures?.pictures?.[0]?.id||'';
    const image=/^[A-Za-z0-9_-]{12,90}$/.test(pictureId)?'https://http2.mlstatic.com/D_NQ_NP_2X_'+pictureId+'-O.webp':'';
    let url='';
    try{
      const rawURL=(m.url||'').startsWith('http')?m.url:'https://'+m.url;
      const u=new URL(rawURL);
      if(u.protocol==='https:'&&['www.mercadolivre.com.br','produto.mercadolivre.com.br'].includes(u.hostname)){
        url=u.origin+u.pathname;
      }
    }catch{}
    const ship=JSON.stringify(cs.shipping_v2||{});
    output.push({
      id:String(m.id),title:String(title).slice(0,400),price:amount,previous,discount,
      seller:String(seller).slice(0,150),rating,sold:String(label(reviews,'label2')).slice(0,100),
      source:section,image,url,pix:/no Pix/i.test(JSON.stringify(pricing)),
      shipping:/frete gr[aá]tis|chegar[aá] gr[aá]tis/i.test(ship),
      couponPrice,couponDiscount,expiry,
      capturedAt:new Date().toISOString(),
      sponsored:item?.type!=='ORGANIC_ITEM'
    });
  }
  return {source_url:location.origin+location.pathname+location.search,section,items:output};
}