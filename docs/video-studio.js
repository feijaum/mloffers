// Estúdio Gemini Omni — as credenciais Google nunca entram neste JavaScript.
const v=id=>document.getElementById(id);
let offers=[],ranking=[],selected=null,authenticated=false;
const safe=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
async function call(path,options={}){const response=await fetch("/api/video/"+path,{credentials:"same-origin",cache:"no-store",...options});let data;try{data=await response.json()}catch{throw Error("Resposta inesperada do servidor")};if(!response.ok)throw Error(data.error+(data.details?" — "+data.details:""));return data}
const status=message=>{v("video-status").textContent=message};
function auth(value){authenticated=value;v("video-auth").hidden=!value;v("video-unauth").hidden=value;}
function populate(){
 const sel=v("video-product"),was=sel.value;
 const rows=ranking.length?ranking:offers;
 sel.innerHTML='<option value="">Selecione uma oferta classificada</option>'+rows.map((x,i)=>'<option value="'+safe(x.id)+'">#'+(i+1)+' · '+safe(x.title.slice(0,72))+'</option>').join("");
 if(rows.some(x=>x.id===was))sel.value=was;
 renderSelection();
}
function renderRankingCards(){
 const box=v("video-rank-cards");if(!box)return;
 const rows=ranking.length?ranking:offers;
 if(!rows.length){box.innerHTML='<div class="empty"><strong>Nenhuma oferta importada</strong><p>Importe ofertas para visualizar o ranking.</p></div>';return}
 box.innerHTML=rows.slice(0,20).map((x,i)=>{
  const price=Number(x.price||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const metrics=x.priority!=null?'<div class="video-rank-metrics"><span>Prioridade <b>'+safe(x.priority)+'/100</b></span><span>Conversão <b>'+safe(x.conversion)+'/100</b></span><span>Vídeo <b>'+safe(x.content)+'/100</b></span></div>':'';
  return '<button type="button" class="video-rank-card'+(selected?.id===x.id?' is-selected':'')+'" data-video-offer="'+safe(x.id)+'" aria-pressed="'+(selected?.id===x.id)+'"><span class="video-rank-number">#'+(i+1)+'</span>'+
  (x.image?'<img class="video-rank-thumb" src="'+safe(x.image)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="video-rank-thumb video-rank-fallback">Sem foto</span>')+
  '<span class="video-rank-details"><strong>'+safe(x.title)+'</strong><small>'+safe(x.category||x.source||"Oferta")+' · '+price+'</small>'+metrics+(x.expired?'<small>Oferta com prazo encerrado</small>':'')+'</span><span class="video-rank-action">'+(selected?.id===x.id?'Selecionado ✓':'Escolher →')+'</span></button>';
 }).join("");
 box.querySelectorAll("[data-video-offer]").forEach(b=>b.onclick=()=>{v("video-product").value=b.dataset.videoOffer;renderSelection()});
}
function promptFor(x){return [
"Crie um vídeo publicitário vertical 9:16 de aproximadamente 8 segundos para Reels, em português brasileiro.",
"Produto real: "+x.title+".",
"Preserve rigorosamente o design, marca, cor e proporções do produto. Não crie funções ou acessórios não confirmados.",
"Câmera cinematográfica: close do produto, transição suave para contexto de uso fiel ao produto e encerramento com destaque visual.",
"Áudio natural e trilha discreta. Locução curta: 'Olha esse achadinho! Gostou? Comente EU QUERO para receber o link!'",
"Deixe espaço visual para adicionar a chamada 'EU QUERO' na edição. Evite texto gerado incorretamente.",
"Sem preços fixos ou promessas de desconto, pois ofertas variam. Não inclua 'link na bio'.",
"Sem inventar benefícios, depoimentos, garantias ou pessoas endossando o produto.",
"Estética profissional e autêntica, otimizada para celular."
].join("\n")}
function renderSelection(){selected=(ranking.length?ranking:offers).find(x=>x.id===v("video-product").value)||null;renderRankingCards();const box=v("video-product-preview");if(!selected){box.textContent="Selecione uma oferta para criar o vídeo.";v("video-prompt").value="";return}
box.innerHTML=(selected.image?'<img src="'+safe(selected.image)+'" alt="Imagem do produto" loading="lazy">':"")+'<strong>'+safe(selected.title)+'</strong><small>Preço na captura: R$ '+Number(selected.price).toFixed(2).replace(".",",")+'</small>';v("video-prompt").value=promptFor(selected)}
async function refreshJobs(){if(!authenticated)return;try{const {jobs}=await call("jobs");const box=v("video-jobs");box.innerHTML=jobs.length?jobs.map(j=>'<article class="video-job"><div><b>'+safe("Gemini Omni 1.1 Flash")+'</b><p>'+safe(new Date(j.created_at).toLocaleString("pt-BR"))+' · '+safe(j.status)+'</p></div><div class="hero-buttons">'+(j.status==="processing"?'<button class="btn secondary small" data-check="'+safe(j.id)+'">Verificar status</button>':"")+(j.status==="ready"?'<button class="btn primary small" data-download="'+safe(j.id)+'">Baixar MP4</button>':"")+'</div></article>').join(""):'<p class="fine">Nenhum vídeo gerado ainda.</p>';box.querySelectorAll("[data-check]").forEach(b=>b.onclick=()=>check(b.dataset.check));box.querySelectorAll("[data-download]").forEach(b=>b.onclick=()=>{window.location.href="/api/video/download/"+b.dataset.download})}catch(e){status(e.message)}}
async function check(id){try{const r=await call("jobs/"+id);status(r.status==="ready"?"Vídeo pronto! Use Baixar MP4.":r.status==="failed"?"Falha na geração: "+r.error:"Google ainda está processando o vídeo.");await refreshJobs()}catch(e){status(e.message)}}
async function connect(){try{const state=await call("auth");auth(state.authenticated);status(state.configured?"Estúdio disponível.":"Configuração pendente: adicione VIDEO_ACCESS_PASSWORD e VIDEO_SESSION_SECRET como Secrets no Cloudflare.");if(state.authenticated)await refreshJobs()}catch(e){auth(false);status(e.message)}}
v("video-login").onclick=async()=>{try{const pass=v("video-password").value;if(!pass)throw Error("Informe a senha.");await call("login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:pass})});v("video-password").value="";auth(true);status("Autenticado.");await refreshJobs()}catch(e){status(e.message)}};
v("video-logout").onclick=async()=>{try{await call("logout",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});auth(false);status("Você saiu do estúdio.")}catch(e){status(e.message)}};
v("video-generate").onclick=async()=>{try{
if(!authenticated)throw Error("Faça login no estúdio.");if(!selected)throw Error("Selecione um produto.");if(!v("video-confirm").checked)throw Error("Confirme o custo antes de gerar.");
if(!confirm("Enviar este prompt ao Google Gemini Omni? A geração pode consumir créditos pagos da sua conta."))return;
v("video-generate").disabled=true;status("Enviando geração ao Google...");
const r=await call("generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:v("video-prompt").value,model:v("video-model").value,confirmCost:true,imageUrl:v("video-use-image").checked?(selected.image||""):""})});
status("Geração iniciada: "+r.id+". Você pode consultar o resultado em Vídeos recentes.");v("video-confirm").checked=false;await refreshJobs()
}catch(e){status(e.message)}finally{v("video-generate").disabled=false}};
v("video-refresh").onclick=refreshJobs;
v("video-product").onchange=renderSelection;
window.addEventListener("observatorio:offers",e=>{offers=e.detail.offers||[];if(!ranking.length)populate()});
window.addEventListener("observatorio:ranking",e=>{ranking=e.detail.offers||[];populate()});
window.addEventListener("observatorio:select-offer",e=>{v("video-product").value=e.detail.id;renderSelection()});
v("video-open-ranking").onclick=()=>{document.querySelector('[data-tab="ofertas"]')?.click();document.getElementById("ranking")?.scrollIntoView({behavior:"smooth"});};
connect();
