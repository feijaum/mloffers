'use strict';
/* Importador independente: atualiza só offers[id].affiliate. */
(() => {
 const byId=id=>document.getElementById(id);
 const validLink=value=>{
  try {
   const u=new URL(String(value||'').trim());
   return u.protocol==='https:'&&u.hostname==='meli.la'&&/^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname);
  } catch{return false}
 };
 function rowsCSV(text) {
  const rows=[];let row=[],cell='',quotes=false;
  text=String(text).replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
   const c=text[i];
   if(quotes){
    if(c==='"'&&text[i+1]==='"'){cell+='"';i++}
    else if(c==='"')quotes=false;
    else cell+=c;
   }else if(c==='"')quotes=true;
   else if(c===','){row.push(cell);cell=''}
   else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell=''}
   else if(c!=='\r')cell+=c;
  }
  if(quotes)throw Error('CSV com aspas não fechadas.');
  if(cell||row.length){row.push(cell);rows.push(row)}
  return rows;
 }
 function readCSV(text){
  const rows=rowsCSV(text);
  if(!rows.length)throw Error('Arquivo vazio.');
  const cols=rows.shift().map(x=>x.trim().toLowerCase());
  const idCol=cols.findIndex(x=>['id','item_id'].includes(x));
  const linkCol=cols.findIndex(x=>['affiliate','affiliate_url','link_afiliado'].includes(x));
  if(idCol<0||linkCol<0)throw Error('Colunas ausentes. Use o CSV exportado pela extensão com id,affiliate.');
  const links=new Map();let invalid=0;
  for(const row of rows){
   const id=String(row[idCol]||'').trim().toUpperCase();
   const link=String(row[linkCol]||'').trim();
   if(!id&&!link)continue;
   if(!/^MLB\d{7,14}$/.test(id)||!validLink(link)){invalid++;continue}
   links.set(id,link);
  }
  if(!links.size)throw Error('Nenhum link de afiliado meli.la válido no arquivo.');
  return {links,invalid};
 }
 const openDB=()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('observatorio-ml-mobile');
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
 async function updateLinks(links) {
  const db=await openDB();
  try {
   if(!db.objectStoreNames.contains('offers'))throw Error('Banco de ofertas não encontrado.');
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction('offers','readwrite');
    const store=tx.objectStore('offers');
    let updated=0,unchanged=0,missing=0;
    // Todas as requisições são enfileiradas antes da transação poder ficar inativa.
    for(const [id,affiliate] of links) {
     const req=store.get(id);
     req.onsuccess=()=>{
      if(!req.result){missing++;return}
      if(req.result.affiliate===affiliate){unchanged++;return}
      store.put({...req.result,affiliate});
      updated++;
     };
    }
    tx.oncomplete=()=>resolve({updated,unchanged,missing});
    tx.onerror=()=>reject(tx.error||Error('Falha no banco'));
    tx.onabort=()=>reject(tx.error||Error('Importação cancelada'));
   });
  }finally{db.close()}
 }
 function init(){
  const input=byId('affiliate-csv'),status=byId('affiliate-import-status');
  if(!input||!status)return;
  // O próprio formulário pode ter também handler antigo em app.js.
  // Capture phase isola esta funcionalidade da aplicação principal.
  input.addEventListener('change',async event=>{
   event.stopImmediatePropagation();
   const file=input.files&&input.files[0];
   if(!file)return;
   status.textContent='Importando '+file.name+'…';
   try{
    if(!/\.csv$/i.test(file.name))throw Error('O arquivo deve ser CSV.');
    const {links,invalid}=readCSV(await file.text());
    const result=await updateLinks(links);
    status.textContent='Concluído: '+result.updated+' links atualizados · '+result.unchanged+' já estavam corretos · '+result.missing+' IDs não encontrados · '+invalid+' linhas inválidas.';
    window.dispatchEvent(new CustomEvent('observatorio:affiliate-imported',{detail:result}));
   }catch(err){
    status.textContent='Falha ao importar: '+String(err.message||err);
    console.error('Observatório ML: CSV de afiliados',err);
   }finally{input.value=''}
  },true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();