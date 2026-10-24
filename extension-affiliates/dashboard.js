'use strict';
const send=m=>chrome.runtime.sendMessage(m);
function dbOpen(){return new Promise((ok,fail)=>{const r=indexedDB.open('observatorio-ml-mobile');r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);});}
function readAll(db){return new Promise((ok,fail)=>{const tx=db.transaction('offers','readonly'),r=tx.objectStore('offers').getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);});}
function saveLink(id,url){return new Promise(async(ok,fail)=>{try{const db=await dbOpen();const tx=db.transaction('offers','readwrite'),store=tx.objectStore('offers');const r=store.get(id);r.onsuccess=()=>{if(!r.result){tx.abort();fail(Error('Produto não está no IndexedDB'));return;}store.put({...r.result,affiliate:url});};tx.oncomplete=()=>{db.close();ok()};tx.onerror=()=>fail(tx.error);tx.onabort=()=>fail(tx.error||Error('Transação cancelada'));}catch(e){fail(e)}});}
chrome.runtime.onMessage.addListener((msg,_sender,reply)=>{
 if(msg.type!=='OML_SAVE_LINK')return;
 saveLink(msg.id,msg.affiliate).then(()=>reply({ok:true})).catch(e=>reply({ok:false,error:e.message}));
 return true;
});
function build(){
 if(document.getElementById('oml-affiliate-panel'))return;
 const panel=document.createElement('aside');panel.id='oml-affiliate-panel';
 Object.assign(panel.style,{position:'fixed',right:'16px',bottom:'16px',zIndex:'2147483647',width:'295px',padding:'14px',background:'#132033',color:'#fff',border:'1px solid #b9e538',borderRadius:'14px',boxShadow:'0 8px 32px #0009',font:'13px system-ui'});
 const title=document.createElement('strong');title.textContent='↗ Links de afiliado · Top 20';title.style.display='block';
 const status=document.createElement('p');status.textContent='Ordene o ranking e selecione Top 20 no painel.';status.style.lineHeight='1.5';
 const start=document.createElement('button'),cancel=document.createElement('button');
 for(const b of [start,cancel])Object.assign(b.style,{border:0,borderRadius:'8px',padding:'9px',cursor:'pointer',marginRight:'7px'});
 start.textContent='Capturar Top 20';start.style.background='#e7f44c';cancel.textContent='Cancelar';cancel.style.background='#ddd';
 start.onclick=async()=>{
  start.disabled=true;
  try{
   const cards=[...document.querySelectorAll('#cards [data-kit]')].slice(0,20);
   if(!cards.length)throw Error('Abra a aba Ofertas e mostre o ranking primeiro.');
   const db=await dbOpen(),data=await readAll(db);db.close();
   const map=new Map(data.map(x=>[x.id,x]));
   const items=cards.map(x=>map.get(x.dataset.kit)).filter(x=>x?.url).map(x=>({id:x.id,url:x.url,title:x.title}));
   if(!items.length)throw Error('Os produtos do ranking não têm URL pública no banco local.');
   const res=await send({type:'OML_BEGIN',items});
   if(!res.ok)throw Error(res.error);status.textContent='Coleta iniciada. Na aba aberta, clique em Compartilhar e depois Gerar link / ID. Deixe esta aba aberta.';
  }catch(e){status.textContent='Erro: '+e.message;}
  finally{start.disabled=false;}
 };
 cancel.onclick=async()=>{await send({type:'OML_CANCEL'});status.textContent='Coleta cancelada.';};
 panel.append(title,status,start,cancel);document.body.append(panel);
 setInterval(async()=>{
  try{const r=await send({type:'OML_STATUS'}),b=r.batch;if(!b)return;
   if(b.status==='running')status.textContent='Capturados: '+b.done.length+'/'+b.items.length+'. Na aba do produto, abra Compartilhar → Gerar link / ID. O próximo produto abre após a captura.';
   else if(b.status==='finished')status.textContent='Concluído: '+b.done.length+'/'+b.items.length+' links salvos. Recarregue este painel para ver os campos atualizados.';
  }catch{}
 },2200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();