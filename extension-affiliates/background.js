'use strict';
const KEY='omlAffiliateBatchV1';
async function getBatch(){return (await chrome.storage.local.get(KEY))[KEY]||null;}
async function setBatch(batch){await chrome.storage.local.set({[KEY]:batch});}
async function openCurrent(batch){
 if(!batch||batch.index>=batch.items.length){batch.status='finished';await setBatch(batch);return;}
 const item=batch.items[batch.index];
 batch.status='running';await setBatch(batch);
 const url=new URL(item.url);
 if(!['www.mercadolivre.com.br','produto.mercadolivre.com.br'].includes(url.hostname)||url.protocol!=='https:')throw Error('URL de produto não permitida');
 if(batch.productTab) {
  try{await chrome.tabs.update(batch.productTab,{url:url.href,active:true});return;}catch{}
 }
 const t=await chrome.tabs.create({url:url.href,active:true});
 batch.productTab=t.id;await setBatch(batch);
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 (async()=>{
  if(msg.type==='OML_BEGIN'){
   const old=await getBatch();
   if(old?.status==='running')return {ok:false,error:'Há uma coleta em andamento. Use Cancelar antes de iniciar novamente.'};
   const items=(msg.items||[]).slice(0,20).filter(x=>/^MLB\d{7,14}$/.test(x.id)&&/^https:\/\/(www|produto)\.mercadolivre\.com\.br\//.test(x.url));
   if(!items.length)return {ok:false,error:'Nenhum produto com URL pública válida foi encontrado no ranking.'};
   const batch={status:'running',index:0,items,done:[],productTab:null,dashboardTab:sender.tab?.id||null,startedAt:Date.now()};
   await setBatch(batch);await openCurrent(batch);return {ok:true,total:items.length};
  }
  if(msg.type==='OML_EXPORT')return {ok:true,batch:await getBatch()};
  if(msg.type==='OML_STATUS')return {ok:true,batch:await getBatch()};
  if(msg.type==='OML_CANCEL'){const b=await getBatch();if(b){b.status='cancelled';await setBatch(b);}return {ok:true};}
  if(msg.type==='OML_CAPTURE'){
   const b=await getBatch();
   if(!b||b.status!=='running'||sender.tab?.id!==b.productTab)return {ok:false,error:'Não há produto ativo nesta aba.'};
   const current=b.items[b.index];
   const url=msg.affiliate;
   if(!/^https:\/\/(meli\.la|www\.mercadolivre\.com\.br|mercadolivre\.com\.br)\//i.test(url||''))return {ok:false,error:'Link de divulgação não reconhecido.'};
   if(b.done.some(x=>x.id===current.id))return {ok:false,error:'Produto já capturado.'};
   // A coleta por CSV é independente do painel. Salva localmente e exporta no fim.
   if(b.dashboardTab){try{await chrome.tabs.sendMessage(b.dashboardTab,{type:'OML_SAVE_LINK',id:current.id,affiliate:url});}catch{} }
   b.done.push({id:current.id,affiliate:url});b.index++;await setBatch(b);
   if(b.index<b.items.length)await openCurrent(b);
   else {b.status='finished';await setBatch(b);if(b.dashboardTab)try{await chrome.tabs.update(b.dashboardTab,{active:true});}catch{}}
   return {ok:true,next:b.index,total:b.items.length};
  }
  return {ok:false,error:'Mensagem desconhecida'};
 })().then(respond).catch(e=>respond({ok:false,error:e.message}));
 return true;
});