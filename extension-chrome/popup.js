'use strict';
const $=id=>document.getElementById(id);
const send=message=>chrome.runtime.sendMessage(message);
const stateText=$('status'),start=$('start'),stop=$('stop'),json=$('json'),csv=$('csv');
function selected(){return [...document.querySelectorAll('.sections input:checked')].map(x=>x.value);}
function snapshot(){
 return {type:'SCAN_START',sections:selected(),maxPages:Number($('pages').value)};
}
let progressTimer;
async function updateStatus(){
 try{
  const answer=await send({type:'SCAN_STATUS'});
  const s=answer?.state||{};
  start.disabled=Boolean(s.running);stop.disabled=!s.running;
  const lines=[s.status||'Pronto para consultar.'];
  if(s.startedAt)lines.push('Páginas processadas: '+(s.completed||0)+'\nOcorrências identificadas: '+(s.total||0)+'\nAnúncios únicos: '+(s.unique||0));
  if(s.reports?.length)lines.push(s.reports.slice(-3).join('\n'));
  if(s.lastError)lines.push('Diagnóstico: '+s.lastError);
  stateText.textContent=lines.join('\n\n');
 }catch(e){stateText.textContent='Erro ao consultar estado: '+e.message;}
}
start.onclick=async()=>{
 start.disabled=true;
 try{const answer=await send(snapshot());stateText.textContent=answer.message||(answer.ok?'Iniciado':'Falha ao iniciar');}
 catch(e){stateText.textContent=e.message;}
 await updateStatus();
};
stop.onclick=async()=>{await send({type:'SCAN_STOP'});await updateStatus()};
$('web').onclick=()=>send({type:'OPEN_DASHBOARD'});
function csvEscape(value){
 let cell=String(value??'');
 // Bloqueia fórmulas interpretadas por planilhas sem modificar o JSON original.
 if(/^[\s]*[=+@-]/.test(cell))cell="'"+cell;
 return '"'+cell.replace(/"/g,'""')+'"';
}
function offerCSV(offers){
 const fields=[
 ['item_id','id'],['title','title'],['seller','seller'],['price','price'],
 ['previous_displayed','previous'],['discount_advertised','discount'],
 ['rating','rating'],['sold_text','sold'],['offer_source','source'],
 ['image_url','image'],['url','url'],['pix','pix'],['free_shipping','shipping'],
 ['coupon_price','couponPrice'],['coupon_discount','couponDiscount'],
 ['expires_at','expiry']
 ];
 return [fields.map(x=>x[0]).join(','),...offers.map(o=>fields.map(([,key])=>csvEscape(o[key])).join(','))].join('\r\n');
}
async function downloadText(name,content,mime){
 const blob=new Blob([content],{type:mime});
 const url=URL.createObjectURL(blob);
 try{
  await chrome.downloads.download({url,filename:name,saveAs:false,conflictAction:'uniquify'});
  stateText.textContent='Arquivo enviado para Downloads: '+name+'\nAgora abra o Observatório Web e importe o arquivo.';
 }finally{setTimeout(()=>URL.revokeObjectURL(url),60000)}
}
async function exportOffers(format){
 json.disabled=true;csv.disabled=true;
 try{
  const result=await send({type:'EXPORT_DATA'});
  if(!result?.ok)throw Error(result?.message||'Não foi possível obter os dados.');
  const offers=result.offers||[];
  if(!offers.length){stateText.textContent='Nenhuma oferta para exportar. Inicie uma consulta ou confira se as páginas carregaram.';return;}
  const when=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  if(format==='json'){
   const doc={format:'observatorio-ml-offers',version:1,generatedAt:new Date().toISOString(),
     notice:'Capturas de ofertas; não são preços em tempo real. Confira antes de divulgar.',
     source:'Extensão Chrome Observatório ML',offers};
   await downloadText('mloffers-'+when+'.json',JSON.stringify(doc,null,2),'application/json;charset=utf-8');
  }else{
   await downloadText('mloffers-'+when+'.csv','\ufeff'+offerCSV(offers),'text/csv;charset=utf-8');
  }
 }catch(e){stateText.textContent='Falha na exportação: '+e.message;}
 finally{json.disabled=false;csv.disabled=false;}
}
json.onclick=()=>exportOffers('json');csv.onclick=()=>exportOffers('csv');
updateStatus();progressTimer=setInterval(updateStatus,1800);
window.addEventListener('unload',()=>clearInterval(progressTimer));