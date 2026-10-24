'use strict';
// Usa somente o gerador oficial visível no DOM; não acessa APIs internas.
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const visible=el=>!!el&&el.getClientRects().length>0;
let busy=false,completed=false,attempted=false;
function officialModal(){return [...document.querySelectorAll('[data-testid="popper"],.link-generator,[role="dialog"]')].find(el=>visible(el)&&/Gerar link\s*\/\s*ID de produto/i.test(el.innerText||''));}
function linkFromModal(){
 const modal=officialModal();if(!modal)return '';
 const field=modal.querySelector('[data-testid="text-field__label_link"]');
 const value=(field?.value||field?.textContent||'').trim();
 return /^https:\/\/meli\.la\/[\w-]+\/?(?:\?.*)?$/i.test(value)?value:'';
}
function sharingButton(){
 const el=document.querySelector('button[data-testid="generate_link_button"]');
 return visible(el)?el:null;
}
async function run(){
 if(busy||completed)return;busy=true;
 try{
  const status=await chrome.runtime.sendMessage({type:'OML_STATUS'});
  const batch=status?.batch;
  if(batch?.status!=='running'||!batch.items?.[batch.index])return;
  const current=batch.items[batch.index];
  // Confere URL do anúncio carregado antes de atribuir o link ao item.
  let u;try{u=new URL(location.href)}catch{return}
  const expected=new URL(current.url);
  const sameId=location.href.replace(/[-]/g,'').includes(current.id);
  if(u.hostname!==expected.hostname||(!sameId&&u.pathname!==expected.pathname))return;
  let modal=officialModal();
  if(!modal){
   const button=sharingButton();
   if(!button||attempted)return;
   attempted=true;
   button.click();
   await pause(1100);
   modal=officialModal();
  }
  if(!modal)return;
  const link=linkFromModal();
  if(!link)return;
  const result=await chrome.runtime.sendMessage({type:'OML_CAPTURE',affiliate:link});
  if(result?.ok){completed=true;return}
  if(result?.error&&!document.getElementById('oml-auto-warning')){
   const div=document.createElement('div');div.id='oml-auto-warning';div.textContent='Observatório ML: '+result.error;
   Object.assign(div.style,{position:'fixed',right:'12px',top:'12px',zIndex:2147483647,background:'#fff4ce',color:'#222',padding:'12px',borderRadius:'8px'});
   document.body.append(div);
  }
 }catch(e){console.warn('Observatório ML: compartilhamento',e)}
 finally{busy=false}
}
setInterval(run,1200);
