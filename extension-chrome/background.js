'use strict';
/* Ação explícita: navegação sequencial em até 20 páginas de cada seção.
   Sem cookies exportados, proxy, stealth, CAPTCHA, rotação de IP ou uso de endpoint interno. */
importScripts('capture.js');
const STATE='observatorio_ml_scan_state_v1',DATA='observatorio_ml_offers_v1',ALARM='observatorio_ml_watch';
const MAX=20,PAUSE=1800;
const SECTIONS=[
 {id:'ofertas',name:'Todas as ofertas',url:'https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1'},
 {id:'relampago',name:'Ofertas relâmpago',url:'https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1&promotion_type=lightning'},
 {id:'imbativeis',name:'Preços imbatíveis',url:'https://www.mercadolivre.com.br/ofertas?container_id=MLB1298579-1&deal_ids=MLB1298579'},
 {id:'ate_100',name:'Menos de R$ 100',url:'https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1&price=0.0-100.0'}
];
let busy=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const readState=async()=>(await chrome.storage.local.get(STATE))[STATE]||{running:false,status:'Pronto para consultar.',completed:0,unique:0,total:0};
const saveState=async s=>chrome.storage.local.set({[STATE]:s});
const readData=async()=>(await chrome.storage.local.get(DATA))[DATA]||{};
const saveData=async d=>chrome.storage.local.set({[DATA]:d});
const sectionById=id=>SECTIONS.find(x=>x.id===id);
function destination(st){
 const section=sectionById(st.sections[st.sectionIndex]);
 const u=new URL(section.url);u.searchParams.set('page',String(st.page));
 return u.href;
}
function sameDestination(actual,st){
 try{
  const got=new URL(actual),exp=new URL(destination(st));
  return got.origin===exp.origin&&got.pathname===exp.pathname&&
   [...exp.searchParams].every(([key,val])=>got.searchParams.get(key)===val);
 }catch{return false}
}
async function finish(reason,error=false){
 const st=await readState();if(!st.running)return;
 st.running=false;st.status=(error?'Interrompido: ':'Concluído: ')+reason;
 st.lastError=error?reason:'';st.updatedAt=Date.now();
 await saveState(st);await chrome.alarms.clear(ALARM);
}
async function move(st){
 if(!st.running)return;
 st.status='Carregando '+sectionById(st.sections[st.sectionIndex]).name+' · página '+st.page+'/'+st.maxPages;
 st.updatedAt=Date.now();await saveState(st);
 try{await chrome.tabs.update(st.tabId,{url:destination(st)});}
 catch(e){await finish('Aba de consulta indisponível: '+e.message,true)}
}
async function begin(message){
 const old=await readState();
 if(old.running)return {ok:false,message:'Já existe uma consulta em andamento.'};
 const selected=Array.isArray(message.sections)?message.sections.filter(id=>sectionById(id)):[];
 const sections=[...new Set(selected)];
 if(!sections.length)return {ok:false,message:'Selecione ao menos uma seção.'};
 const requested=Number(message.maxPages);
 if(![1,5,10,20].includes(requested))return {ok:false,message:'Limite inválido. Use 1, 5, 10 ou 20 páginas.'};
 // Uma única aba comum do Chrome, criada somente pelo comando do usuário.
 const tab=await chrome.tabs.create({url:'about:blank',active:true});
 const st={running:true,status:'Iniciando consulta...',sections,maxPages:requested,
   sectionIndex:0,page:1,tabId:tab.id,completed:0,total:0,unique:0,
   reports:[],lastSignature:'',startedAt:Date.now(),updatedAt:Date.now(),lastError:''};
 await saveData({});await saveState(st);
 await chrome.alarms.create(ALARM,{periodInMinutes:1});
 await move(st);
 return {ok:true,message:'Consulta iniciada. Confira as páginas na aba aberta.'};
}
function next(st){
 if(st.page<st.maxPages)st.page++;
 else {st.reports.push(sectionById(st.sections[st.sectionIndex]).name+': limite de '+st.maxPages+' páginas processado.');st.sectionIndex++;st.page=1;st.lastSignature='';}
}
async function take(tabId){
 if(busy)return;busy=true;
 try{
  let st=await readState();if(!st.running||st.tabId!==tabId)return;
  await wait(400);
  const tab=await chrome.tabs.get(tabId);
  if(tab.status!=='complete'||!sameDestination(tab.url,st))return;
  let injected;
  try{injected=await chrome.scripting.executeScript({target:{tabId},func:readOffersFromVisiblePage});}
  catch(e){await finish('Chrome não conseguiu ler a página: '+e.message,true);return;}
  const data=injected?.[0]?.result;
  if(!data||data.error||!Array.isArray(data.items)||!data.items.length){
   await finish('Página sem ofertas legíveis ('+sectionById(st.sections[st.sectionIndex]).name+', '+st.page+'). '+(data?.error||'Proteção ou página não carregada.'),true);return;
  }
  if(!sameDestination(data.source_url,st)){await finish('Endereço recebido não corresponde à página solicitada.',true);return}
  const signature=data.items.slice(0,12).map(x=>x.id).join('|');
  if(st.page>1&&signature===st.lastSignature){
   st.reports.push(sectionById(st.sections[st.sectionIndex]).name+': resultados repetidos na página '+st.page+'; seção encerrada.');
   st.sectionIndex++;st.page=1;st.lastSignature='';
   await saveState(st);
   if(st.sectionIndex>=st.sections.length){await finish('Todas as seções acessíveis foram verificadas.',false);return;}
   await wait(PAUSE);const latest=await readState();if(latest.running)await move(latest);return;
  }
  // Exportação mantém somente dados comerciais normalizados; não salva cookies/sessão/HTML.
  const map=await readData();
  for(const x of data.items){
    if(!/^MLB\d{7,14}$/.test(x.id||''))continue;
    const old=map[x.id],sources=[...new Set([...(old?.sources||[]),x.source])];
    const chosen=old&&Number(old.price)<Number(x.price)?old:x;
    map[x.id]={...chosen,id:x.id,sources,source:chosen.source||x.source,
      firstSeen:old?.firstSeen||x.capturedAt,lastSeen:x.capturedAt};
  }
  try{await saveData(map)}catch(e){await finish('Armazenamento local do Chrome esgotado: '+e.message,true);return}
  st=await readState();if(!st.running)return;
  st.completed++;st.total+=data.items.length;st.unique=Object.keys(map).length;
  st.updatedAt=Date.now();st.lastSignature=signature;
  st.status=sectionById(st.sections[st.sectionIndex]).name+' · '+st.page+'/'+st.maxPages+' páginas · '+st.unique+' produtos únicos';
  next(st);await saveState(st);
  if(st.sectionIndex>=st.sections.length){await finish(st.completed+' páginas consultadas; '+st.unique+' produtos únicos.',false);return}
  await wait(PAUSE);
  const latest=await readState();if(latest.running)await move(latest);
 }catch(e){await finish('Erro na consulta: '+String(e.message||e),true)}
 finally{busy=false}
}
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='complete')take(id);});
chrome.tabs.onRemoved.addListener(async id=>{const st=await readState();if(st.running&&st.tabId===id)await finish('Aba de consulta fechada pelo usuário.',true);});
chrome.alarms.onAlarm.addListener(async a=>{
 if(a.name!==ALARM)return;
 const st=await readState();if(!st.running)return;
 if(Date.now()-st.updatedAt>120000){await finish('A página demorou além do limite ou foi bloqueada.',true);return;}
 try{const tab=await chrome.tabs.get(st.tabId);if(tab.status==='complete'&&sameDestination(tab.url,st))await take(tab.id)}
 catch(e){await finish('Aba não disponível: '+e.message,true)}
});
chrome.runtime.onMessage.addListener((msg,_sender,send)=>{
 (async()=>{
  if(msg?.type==='SCAN_START')return begin(msg);
  if(msg?.type==='SCAN_STOP'){await finish('Cancelado pelo usuário.',false);return {ok:true}}
  if(msg?.type==='SCAN_STATUS')return {ok:true,state:await readState()};
  if(msg?.type==='EXPORT_DATA'){const d=await readData();return {ok:true,offers:Object.values(d),state:await readState()}}
  if(msg?.type==='OPEN_DASHBOARD'){await chrome.tabs.create({url:'https://feijaum.github.io/mloffers/'});return {ok:true}}
  return {ok:false,message:'Comando desconhecido'};
 })().then(send).catch(e=>send({ok:false,message:String(e.message||e)}));
 return true;
});