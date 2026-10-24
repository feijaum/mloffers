'use strict';
// Nunca cria links a partir de URLs comuns: lê apenas o resultado do gerador oficial exibido na página.
let sent='';
const valid=s=>{try{const u=new URL(s);return u.protocol==='https:'&&(['meli.la','www.mercadolivre.com.br','mercadolivre.com.br'].includes(u.hostname));}catch{return false}};
function candidate(){
 const elements=[...document.querySelectorAll('input,textarea')];
 const dialog=[...document.querySelectorAll('[role="dialog"],[aria-modal="true"]')];
 const scope=dialog.length?dialog[dialog.length-1]:document;
 const text=scope.innerText||'';
 if(!/Gerar link\s*\/\s*ID de produto|Link do produto/i.test(text))return '';
 // Exclui links convencionais de navegação e o texto sugerido, priorizando o campo "Link do produto".
 const fields=elements.filter(e=>scope.contains(e)&&e.getBoundingClientRect().width>0);
 const values=fields.map(e=>(e.value||'').trim());
 return values.find(v=>/^https:\/\/meli\.la\/[a-zA-Z0-9_-]+\/?$/.test(v))||'';
}
let submitting=false;
async function inspect(){
 if(submitting)return;
 const url=candidate();if(!url||url===sent||!valid(url))return;
 submitting=true;
 try{
  const r=await chrome.runtime.sendMessage({type:'OML_CAPTURE',affiliate:url});
  if(r?.ok)sent=url;
  else if(r?.error&&!document.getElementById('oml-link-warning')){
   const warn=document.createElement('div');warn.id='oml-link-warning';warn.textContent='Observatório ML: '+r.error;
   Object.assign(warn.style,{position:'fixed',top:'16px',right:'16px',zIndex:2147483647,background:'#fff3cd',color:'#222',padding:'12px',borderRadius:'8px',maxWidth:'360px'});document.body.append(warn);
  }
 }catch{}finally{submitting=false}
}
setInterval(inspect,1200);
