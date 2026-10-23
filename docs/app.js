/* Observatório ML - Web offline-first. Nunca solicita páginas do Mercado Livre. */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money=v=>v==null||v===''?'—':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const number=v=>{if(v===undefined||v===null||v==='')return null;let n=Number(v);if(!Number.isFinite(n)){n=Number(String(v).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'))}return Number.isFinite(n)?n:null};
const str=(v,max=350)=>String(v??'').trim().slice(0,max);
const normalizedUrl=(s,allowImages=false)=>{
 try{const u=new URL(s);const hosts=allowImages?['http2.mlstatic.com','http2.mlstatic.com.ar']:['www.mercadolivre.com.br','produto.mercadolivre.com.br'];return u.protocol==='https:'&&hosts.includes(u.hostname)?u.href:''}catch{return ''}};
const affiliateUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return ''}};
const imgIdUrl=id=>/^[A-Za-z0-9_-]{12,90}$/.test(id||'')?'https://http2.mlstatic.com/D_NQ_NP_2X_'+id+'-O.webp':'';
function toast(message){const x=$('toast');x.hidden=false;x.textContent=message;clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>x.hidden=true,3200);}
let db;let offers=[];let activeId='';
async function openDatabase(){
 return new Promise((resolve,reject)=>{const r=indexedDB.open('observatorio-ml-mobile',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('offers'))d.createObjectStore('offers',{keyPath:'id'});if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'key'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
}
const reqPromise=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
async function readAll(){return reqPromise(db.transaction('offers','readonly').objectStore('offers').getAll())}
async function readMeta(key){return (await reqPromise(db.transaction('meta','readonly').objectStore('meta').get(key)))?.value||0}
function writeMeta(key,value){return new Promise((resolve,reject)=>{const tx=db.transaction('meta','readwrite');tx.objectStore('meta').put({key,value});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function saveBatch(rows){let found=0,updated=0;const tx=db.transaction('offers','readwrite');const store=tx.objectStore('offers');for(const r of rows){const old=await reqPromise(store.get(r.id));const clean={...(old||{}),...r,affiliate:old?.affiliate||r.affiliate||'',firstSeen:old?.firstSeen||Date.now(),lastSeen:Date.now(),previousCapturePrice:old?.price!==undefined&&old.price!==r.price?old.price:old?.previousCapturePrice??null};store.put(clean);if(old)updated++;else found++;}await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});return {found,updated}}
async function saveAffiliate(id,url){const tx=db.transaction('offers','readwrite');const s=tx.objectStore('offers');const x=await reqPromise(s.get(id));if(x){x.affiliate=url;s.put(x)}await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});await refresh();}
async function refresh(){offers=await readAll();window.dispatchEvent(new CustomEvent('observatorio:offers',{detail:{offers}}));$('stat-products').textContent=offers.length;$('stat-files').textContent=await readMeta('files');$('stat-images').textContent=offers.filter(x=>x.image).length;$('stat-ready').textContent=offers.filter(x=>x.affiliate).length;renderRanking()}
function extractJSONObject(script){
 const match=/_n\.ctx\.r\s*=\s*/.exec(script);if(!match)throw Error('Não foi encontrado _n.ctx.r: a página não contém ofertas estruturadas.');
 const start=script.indexOf('{',match.index+match[0].length);if(start<0)throw Error('Contexto de ofertas incompleto.');
 let depth=0,quoted=false,escaped=false;
 for(let i=start;i<script.length;i++){
 const ch=script[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false}
 else if(ch==='"')quoted=true;else if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0)return JSON.parse(script.slice(start,i+1))}
 }throw Error('Estrutura de ofertas incompleta.');
}
function getLabel(obj,key){return (obj?.values||[]).find(v=>v.key===key)?.label?.text||''}
function offerFromCard(item,source){
 const card=item.card||{},meta=card.metadata||{},cp={};
 for(const comp of card.components||[])if(comp?.type)cp[comp.type]=comp;
 const title=str(cp.title?.title?.text,400),pricing=cp.price?.price||{},price=number(pricing.current_price?.value);
 const id=str(meta.id,35);if(!/^MLB\d{7,14}$/.test(id)||!title||price===null)return null;
 let previous=null,discount=null;
 for(const label of pricing.price_labels||[])for(const v of label.values||[])if(v.price?.previous){previous=number(v.price?.value);break}
 for(const v of pricing.discount_polylabel?.values||[]){const match=/(\d+)\s*%\s*OFF/i.exec(v.pill?.text||'');if(match){discount=+match[1];break}}
 const sellerPart=cp.seller?.seller||{};const seller=str(getLabel(sellerPart,'label')||sellerPart.text?.replace(/\{[^}]+\}/g,'')||'',150);
 const reviews=cp.review_compacted?.review_compacted||{},rating=number(getLabel(reviews,'label'));
 let couponPrice=null,couponDiscount=null;
 for(const promo of cp.promotions?.promotions||[]){if(promo.type!=='coupon')continue;const val=(promo.values||[]).find(v=>v.type==='price'&&v.price?.value!=null);if(!val)continue;if(/OFF/i.test(promo.text||''))couponDiscount=number(val.price.value);else couponPrice=number(val.price.value)}
 let exp='';for(const x of card.widget_components||[])exp=x.poly_label_component?.countdown?.period_end||exp;
 const imageId=str(card.pictures?.pictures?.[0]?.id,95);
 const rawUrl=str(meta.url,700);let url='';try{url=normalizedUrl(rawUrl.startsWith('http')?rawUrl:'https://'+rawUrl)}catch{}
 return{id,title,price,previous,discount,seller,rating:rating&&rating<=5?rating:null,sold:str(getLabel(reviews,'label2'),100),source,image:imgIdUrl(imageId),url,
 pix:/no Pix/i.test(JSON.stringify(pricing)),shipping:/frete gr[aá]tis|chegar[aá] gr[aá]tis/i.test(JSON.stringify(cp.shipping_v2||{})),
 couponPrice,couponDiscount,expiry:exp,importedAt:Date.now()};
}
function parseOfferHTML(html){
 const script=/<script\b[^>]*\bid=["']__NORDIC_RENDERING_CTX__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html)?.[1];
 if(!script)throw Error('Bloco __NORDIC_RENDERING_CTX__ não localizado. Salve a página após aparecerem os produtos.');
 const data=extractJSONObject(script)?.appProps?.pageProps?.data;
 if(!Array.isArray(data?.items))throw Error('Não há lista de ofertas neste arquivo.');
 const lower=html.slice(0,1500).toLowerCase();
 const source=lower.includes('promotion_type=lightning')?'relampago':lower.includes('price=0.0-100.0')?'ate_100':lower.includes('deal_ids=')?'imbativeis':'ofertas';
 return data.items.map(item=>offerFromCard(item,source)).filter(Boolean);
}
function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');let rows=[],row=[],cur='',inside=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(inside){if(ch==='"'&&text[i+1]==='"'){cur+='"';i++}else if(ch==='"')inside=false;else cur+=ch}else if(ch==='"')inside=true;else if(ch===','){row.push(cur);cur=''}else if(ch==='\n'){row.push(cur);rows.push(row);row=[];cur=''}else if(ch!=='\r')cur+=ch}
 if(cur||row.length){row.push(cur);rows.push(row)}
 if(!rows.length)return [];const headers=rows.shift().map(x=>x.trim().toLowerCase());
 return rows.map(cols=>{const x=Object.fromEntries(headers.map((key,i)=>[key,cols[i]??'']));return normalize({id:x.item_id||x.id,title:x.title||x.titulo,price:x.price||x.preco_exibido,previous:x.previous_displayed||x.preco_riscado,discount:x.discount_advertised||x.desconto_anunciado_pct,seller:x.seller||x.vendedor_exibido,rating:x.rating,sold:x.sold_text,source:x.offer_source||'csv',image:x.image_url,url:x.url||x.url_publica,pix:x.pix,shipping:x.free_shipping,couponPrice:x.coupon_price,couponDiscount:x.coupon_discount,expiry:x.expires_at})}).filter(Boolean);
}
function normalize(x){
 const id=str(x.id||x.item_id,35),title=str(x.title,400),price=number(x.price);
 if(!/^MLB\d{7,14}$/.test(id)||!title||price===null)return null;
 const bool=x=>x===true||x===1||x==='1'||x==='true'||x==='True';
 return{id,title,price,previous:number(x.previous),discount:number(x.discount),seller:str(x.seller,150),rating:number(x.rating),sold:str(x.sold,100),source:str(x.source||'importado',40),image:normalizedUrl(x.image,true),url:normalizedUrl(x.url),affiliate:affiliateUrl(x.affiliate),pix:bool(x.pix),shipping:bool(x.shipping),couponPrice:number(x.couponPrice),couponDiscount:number(x.couponDiscount),expiry:str(x.expiry,90),importedAt:Date.now()};
}
function parseJSON(text){const obj=JSON.parse(text);const list=Array.isArray(obj)?obj:obj.offers;if(!Array.isArray(list))throw Error('JSON não contém uma lista offers.');return list.map(normalize).filter(Boolean)}
async function importFiles(files){
 const accepted=[...files].filter(f=>/\.(html?|csv|json)$/i.test(f.name));if(!accepted.length){toast('Escolha um HTML, CSV ou JSON.');return}
 $('import-status').textContent='Lendo '+accepted.length+' arquivo(s)...';let count=0,added=0,errors=[];
 for(const file of accepted){try{const data=await file.text();const ext=file.name.split('.').pop().toLowerCase();let rows=ext==='csv'?parseCSV(data):ext==='json'?parseJSON(data):parseOfferHTML(data);if(!rows.length)throw Error('Nenhum produto válido encontrado.');const dedup=[...new Map(rows.map(x=>[x.id,x])).values()];const result=await saveBatch(dedup);added+=result.found;count++;$('import-status').textContent='Importados '+count+'/'+accepted.length+' arquivo(s)';}catch(e){errors.push(file.name+': '+e.message)}}
 if(count)await writeMeta('files',(await readMeta('files'))+count);$('files').value='';await refresh();
 $('import-status').textContent=count+' arquivo(s) processado(s) · '+added+' produto(s) novo(s).'+(errors.length?' Falhas: '+errors.slice(0,3).join(' | '):'');
 toast(errors.length?'Importação parcial; confira o diagnóstico.':'Ofertas importadas com sucesso.');
}
const sourceLabels={ofertas:'Ofertas',relampago:'Relâmpago',ate_100:'Até R$100',imbativeis:'Preços imbatíveis'};
function salesFloor(s){const match=/(\d+(?:[,.]\d+)?)\s*(mil|k|mi|m)?\s*(?:vendid|$)/i.exec(s||'');if(!match)return 0;const multiplier=match[2]?(match[2].toLowerCase()==='mil'||match[2].toLowerCase()==='k'?1e3:1e6):1;return +match[1].replace(',','.')*multiplier}
function niche(title){const t=title.toLowerCase();const defs=[
 ['Casa e cozinha',['cozinha','organizador','frigideira','panela','air fryer','escorredor','aspirador','limpeza','cesto','torneira'],29],
 ['Tecnologia',['fone','bluetooth','notebook','mouse','teclado','roteador','wi-fi','wifi','câmera','camera','smart','tablet','celular','carregador','tp-link'],26],
 ['Fitness',['creatina','whey','halter','academia','fitness','hipercalórico','proteína'],20],
 ['Beleza',['cabelo','secador','maquiagem','perfume','escova','barbeador'],29],
 ['Ferramentas',['furadeira','parafusadeira','refletor','serra','ferrament'],27],
 ['Moda',['camisa','calça','vestido','sapato','tênis','bolsa','mochila'],19],
 ['Games',['controle','playstation','ps5','xbox','gamer','console'],26],
 ['Pets',['cachorro','gato','arranhador','comedouro','pet'],27],
 ['Infantil',['brinquedo','bebê','infantil','carrinho'],26]];
 return defs.find(([,words])=>words.some(w=>t.includes(w)))||['Outros',[],17]}
function score(x){
 const [category,,visual]=niche(x.title),p=x.price,r=x.rating,sales=salesFloor(x.sold),disc=x.discount||0;
 const quality=r>=4.8?24:r>=4.6?19:r>=4.4?14:r>=4.1?8:r?2:0;
 const popularity=sales>=100000?20:sales>=10000?17:sales>=1000?13:sales>=100?9:sales?4:0;
 const friction=p>=30&&p<=129?22:p<=249&&p>129?19:p>=15&&p<30?16:p<=449&&p>249?15:p<=799&&p>449?10:p>799?5:7;
 const conversion=Math.max(0,Math.min(100,quality+popularity+friction+Math.min(18,Math.round(disc*.32))+(x.shipping?8:0)+(x.source==='relampago'?5:2)-(x.pix?3:0)-(x.couponPrice!=null||x.couponDiscount!=null?3:0)));
 const content=Math.max(0,Math.min(100,visual+(p>=29&&p<=199?16:p<=350?12:p<=700?7:3)+Math.min(24,Math.round(disc*.4))+(sales>=10000?16:sales>=1000?10:sales?5:0)+(x.source==='relampago'?12:7)));
 let priority=Math.round(conversion*.68+content*.32);const hours=(Date.now()-(x.lastSeen||x.importedAt||Date.now()))/3600000;
 const expired=x.expiry&&new Date(x.expiry).getTime()<Date.now();if(expired)priority=0;else if(hours>48)priority=Math.max(0,priority-28);else if(hours>24)priority=Math.max(0,priority-16);else if(hours>8)priority=Math.max(0,priority-6);
 return {...x,conversion,content,priority,category,expired};
}
function ordered(){let arr=offers.map(score);const needle=$('search').value.trim().toLocaleLowerCase('pt-BR');if(needle)arr=arr.filter(x=>(x.title+' '+x.seller+' '+x.category).toLocaleLowerCase('pt-BR').includes(needle));const sort=$('sort').value;
 arr.sort((a,b)=>sort==='conversion'?b.conversion-a.conversion:sort==='content'?b.content-a.content:sort==='discount'?(b.discount||0)-(a.discount||0):sort==='price'?a.price-b.price:b.priority-a.priority||b.conversion-a.conversion);
 const limit=$('limit').value;return (limit==='all'?arr:arr.slice(0,Number(limit)));}
function renderRanking(){
 const rows=ordered();if(!rows.length){$('cards').innerHTML='<div class="empty"><span class="empty-icon">☆</span><strong>Nenhuma oferta disponível</strong><p>Importe HTMLs ou CSVs para criar o ranking. Não há consulta automática ao Mercado Livre nesta página.</p><a href="#importar" class="btn primary small">Importar agora</a></div>';return}
 $('cards').innerHTML=rows.map((x,i)=>'<article class="offer"><div class="offer-top"><div class="offer-photo">'+(x.image?'<img loading="lazy" referrerpolicy="no-referrer" src="'+esc(x.image)+'" alt="'+esc(x.title)+'">':'<span class="no-photo">Sem imagem nesta captura</span>')+'</div><div class="offer-data"><div class="ranks">#'+(i+1)+' · '+esc(x.category)+(x.expired?' · PRAZO ENCERRADO':'')+'</div><h3>'+esc(x.title)+'</h3><div class="seller">'+esc(x.seller||'Vendedor não informado')+' · ★ '+(x.rating??'—')+' · '+esc(x.sold||'Sem vendas informadas')+'</div><div class="amount">'+money(x.price)+'</div><div class="discount">'+(x.discount!=null?x.discount+'% OFF anunciado':'Sem desconto indicado')+(x.pix?' · no Pix':'')+'</div></div></div><div class="scores"><span class="score"><b>'+x.priority+'/100</b>Prioridade</span><span class="score"><b>'+x.conversion+'/100</b>Conversão*</span><span class="score"><b>'+x.content+'/100</b>Vídeo</span></div><p class="offer-note">'+esc(sourceLabels[x.source]||x.source||'Captura')+' · '+(x.shipping?'Frete grátis informado':'Conferir frete')+' · '+(x.couponPrice!=null||x.couponDiscount!=null?'Cupom condicionado':'Sem cupom identificado')+'</p><div class="offer-bottom"><small>*Estimativa editorial, não vendas reais</small><button class="btn primary small" data-kit="'+esc(x.id)+'">Montar publicação ↗</button></div></article>').join('');
 document.querySelectorAll('[data-kit]').forEach(b=>b.onclick=()=>openKit(b.dataset.kit));
}
function makeFlow(x){
 const [category]=niche(x.title);
 const health=/creatina|whey|hipercal|suplemento/i.test(x.title)?'Não prometa benefícios de saúde, ganho muscular ou resultados físicos. ':'';
 return [
 'PROJETO: VÍDEO PROMOCIONAL CRIADO COM VEO NO GOOGLE FLOW.',
 'No Google Flow, selecione manualmente um modelo Veo disponível e configure vídeo vertical 9:16. O texto do prompt não troca o modelo por si só.',
 '',
 'Crie um clipe publicitário vertical de aproximadamente 8 segundos, elegante e natural, com ritmo envolvente para Reels e TikTok.',
 'Produto: '+x.title+'.','Nicho: '+category+'.',
 'Use a imagem do produto anexada como referência visual obrigatória. Preserve marca, formato, proporções e cores, sem inventar acessórios, funcionalidades ou resultados.',
 'Cena 1 (0-2s): close atraente do produto, movimento de câmera leve e iluminação de estúdio. Gancho: "Olha esse achado!".',
 'Cena 2 (2-6s): destaque visual do produto em seu contexto de uso apenas quando isso puder ser representado sem inventar propriedades. Mostrar detalhes de forma limpa.',
 'Cena 3 (6-8s): encerre com destaque para o produto e espaço visual para inserir o CTA na edição: "COMENTE EU QUERO".',
 'Voz ou narração, se disponível, em português brasileiro, tom amigável e direto. Música suave que não comprometa a fala.',
 'Não inclua a instrução "link na bio". O objetivo é incentivar comentários com a expressão exata EU QUERO e usar o link na própria legenda.',
 'Na edição do vídeo, acrescente a sobreposição "Comente EU QUERO" se o texto gerado não estiver perfeito.',
 'Preço registrado na captura: '+money(x.price)+(x.discount!=null?' · '+x.discount+'% OFF anunciado':'')+'. Confirme os valores antes de inserir números no vídeo.',
 'Condições: '+(x.pix?'preço no Pix; ':'')+(x.couponPrice!=null||x.couponDiscount!=null?'cupom pode exigir elegibilidade; ':'')+'estoque, disponibilidade e frete devem ser conferidos.',
 'Não afirme que é o menor preço da internet. Não invente escassez, popularidade, depoimentos ou garantias.',
 health+'Não prometa volume de vendas ou comissão. Conteúdo destinado a divulgação de afiliado com transparência.'
 ].filter(Boolean).join('\n');
}
function makeCaption(x){const link=x.affiliate||x.url||'[COLE SEU LINK DE AFILIADO]';
 return ['✨ ACHADO DO DIA!','',x.title,'💰 Preço na captura: '+money(x.price)+(x.discount!=null?' ('+x.discount+'% OFF anunciado)':''),x.pix?'📲 Valor exibido no Pix; confira as condições.':'',x.couponPrice!=null||x.couponDiscount!=null?'🎟️ Pode haver cupom sujeito à elegibilidade.':'','', '💬 Quer receber a oferta? Comente EU QUERO que eu te envio o link por mensagem!','','🔗 Link da oferta nesta publicação: '+link,'','Publicidade / link de afiliado. Preço e disponibilidade podem mudar; confira antes de comprar.','#achadinhos #ofertas #mercadolivre'].filter(Boolean).join('\n')}
function makeDM(x){return ['Olá, @{{nome}}! 👋','Você comentou EU QUERO na nossa publicação sobre: '+x.title,'','🔗 Confira a oferta aqui: '+(x.affiliate||x.url||'[INSIRA SEU LINK DE AFILIADO]'),'','Veja o preço, frete e condições atuais antes de finalizar a compra.','', 'Mensagem automática enviada em resposta ao seu comentário.'].join('\n')}
function kitText(x){return ['PRODUTO: '+x.title,'ID: '+x.id,'PREÇO NA CAPTURA: '+money(x.price),'IMAGEM: '+(x.image||'(não disponível)'),'URL ORIGINAL: '+(x.url||'(não disponível)'),'LINK DE AFILIADO: '+(x.affiliate||'[INSERIR]'),'PALAVRA CHAVE: eu quero','','=== VEO / GOOGLE FLOW ===',makeFlow(x),'','=== LEGENDA INSTAGRAM ===',makeCaption(x),'','=== MENSAGEM DM ===',makeDM(x)].join('\n')}
function active(){return offers.find(x=>x.id===activeId)}
function updateKitFields(){const x=active();if(!x)return;$('prompt').value=makeFlow(x);$('caption').value=makeCaption(x);$('dm').value=makeDM(x)}
function openKit(id){activeId=id;window.dispatchEvent(new CustomEvent('observatorio:select-offer',{detail:{id}}));const x=active();if(!x)return;$('kit-title').textContent=x.title;$('kit-price').textContent=money(x.price);$('kit-meta').textContent='ID '+x.id+' · '+(x.source||'captura')+' · Ranking editorial';$('kit-image').src=x.image||'./icon.svg';$('kit-image').alt=x.title;$('kit-url').href=x.url||'https://www.mercadolivre.com.br/ofertas';$('affiliate').value=x.affiliate||'';updateKitFields();$('kit-dialog').showModal();}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Texto copiado!')}catch{toast('Não foi possível copiar automaticamente. Selecione e copie o texto.')}}
function download(filename,text,mime='text/plain'){const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportCSV(){const cols=['id','title','seller','price','previous','discount','rating','sold','source','image','url','affiliate','priority','conversion','content'];const lines=[cols.join(','),...offers.map(a=>{const x=score(a);return cols.map(k=>'"'+String(x[k]??'').replace(/"/g,'""')+'"').join(',')})];download('observatorio-ofertas.csv','\uFEFF'+lines.join('\r\n'),'text/csv;charset=utf-8');toast('CSV exportado.')}
async function clearDatabase(){if(!confirm('Excluir todas as ofertas salvas NESTE dispositivo? Isso não apaga nada do seu GitHub ou do Instagram.'))return;const tx=db.transaction(['offers','meta'],'readwrite');tx.objectStore('offers').clear();tx.objectStore('meta').clear();await new Promise((r,j)=>{tx.oncomplete=r;tx.onerror=()=>j(tx.error)});await refresh();toast('Dados locais removidos.')}
async function loadPublishedFeed(){
 try{
  const response=await fetch('./data/ofertas.json',{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const payload=await response.json();
  const rows=parseJSON(JSON.stringify(payload));
  if(!rows.length){toast('O feed público ainda está vazio. Publique ofertas no arquivo docs/data/ofertas.json.');return}
  const r=await saveBatch(rows);await writeMeta('files',(await readMeta('files'))+1);
  await refresh();toast('Feed importado: '+r.found+' novos produtos; '+r.updated+' atualizados.');
 }catch(error){toast('Não foi possível carregar o feed: '+error.message)}
}
$('files').addEventListener('change',e=>importFiles(e.target.files));
$('load-feed').onclick=loadPublishedFeed;
const drop=$('drop');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag')});drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');importFiles(e.dataTransfer.files)});
$('search').addEventListener('input',renderRanking);$('sort').addEventListener('change',renderRanking);$('limit').addEventListener('change',renderRanking);
$('clear').onclick=clearDatabase;$('export-csv').onclick=exportCSV;$('export-json').onclick=()=>{download('observatorio-backup.json',JSON.stringify({format:'observatorio-ml-offers',version:1,offers},null,2),'application/json');toast('Backup JSON exportado.')};
$('close-dialog').onclick=()=>$('kit-dialog').close();$('kit-dialog').onclick=e=>{if(e.target===$('kit-dialog'))e.target.close()};
let saveLinkTimer;$('affiliate').addEventListener('input',e=>{const x=active();if(!x)return;clearTimeout(saveLinkTimer);const raw=e.target.value.trim(),valid=affiliateUrl(raw);if(raw&&!valid){toast('Cole um link HTTPS válido.');return}x.affiliate=valid;updateKitFields();saveLinkTimer=setTimeout(()=>saveAffiliate(x.id,valid).catch(err=>toast(err.message)),350)});
document.querySelectorAll('[data-copy-field]').forEach(b=>b.onclick=()=>copy($(b.dataset.copyField).value));
$('copy-kit').onclick=()=>{const x=active();if(x)copy(kitText(x))};
$('save-kit').onclick=()=>{const x=active();if(x)download('kit-'+x.id+'.txt',kitText(x));};
$('save-image').onclick=()=>{const x=active();if(x?.image)window.open(x.image,'_blank','noopener,noreferrer');else toast('Imagem não registrada para este produto.')};
async function consumeSharedFiles(){
 if(!('caches' in window))return;
 const cache=await caches.open('observatorio-ml-shares-v1');
 const manifestURL=new URL('./__pending_manifest',location.href);
 const manifestResponse=await cache.match(manifestURL);
 if(!manifestResponse)return;
 const manifest=await manifestResponse.json(),files=[];
 for(const item of manifest){
  const key=new URL(item.key,location.href),response=await cache.match(key);
  if(response){
   const blob=await response.blob();
   files.push(new File([blob],item.name||'ofertas.html',{type:item.type||blob.type||'application/octet-stream'}));
  }
  await cache.delete(key);
 }
 await cache.delete(manifestURL);
 if(files.length){
  await importFiles(files);
  toast(files.length+' arquivo(s) recebido(s) pelo compartilhamento do celular.');
 }
}
(async()=>{try{db=await openDatabase();await refresh();if(new URLSearchParams(location.search).has('share_error'))toast('Arquivo compartilhado inválido ou acima de 15 MB.');await consumeSharedFiles();}catch(e){$('import-status').textContent='Falha no banco ou compartilhamento: '+e.message;toast('Não foi possível iniciar: '+e.message);}})();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
