// Estúdio Veo — as credenciais Google nunca entram neste JavaScript.
const v=id=>document.getElementById(id);
let offers=[],selected=null,authenticated=false,timer=null;
const safe=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
async function call(path,options={}){const response=await fetch("/api/video/"+path,{credentials:"same-origin",cache:"no-store",...options});let data;try{data=await response.json()}catch{throw Error("Resposta inesperada do servidor")};if(!response.ok)throw Error(data.error+(data.details?" — "+data.details:""));return data}
const status=message=>{v("video-status").textContent=message};
function auth(value){authenticated=value;v("video-auth").hidden=!value;v("video-unauth").hidden=value;}
function populate(){const sel=v("video-product"),was=sel.value;sel.innerHTML='<option value="">Selecione um produto importado</option>'+offers.map(x=>'<option value="'+safe(x.id)+'">'+safe(x.title.slice(0,75))+'</option>').join("");if(offers.some(x=>x.id===was))sel.value=was;renderSelection()}
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
function renderSelection(){selected=offers.find(x=>x.id===v("video-product").value)||null;const box=v("video-product-preview");if(!selected){box.textContent="Selecione uma oferta para criar o vídeo.";v("video-prompt").value="";return}
box.innerHTML=(selected.image?'<img src="'+safe(selected.image)+'" alt="Imagem do produto" loading="lazy">':"")+'<strong>'+safe(selected.title)+'</strong><small>Preço na captura: R$ '+Number(selected.price).toFixed(2).replace(".",",")+'</small>';v("video-prompt").value=promptFor(selected)}
async function refreshJobs(){if(!authenticated)return;try{const {jobs}=await call("jobs");const box=v("video-jobs");box.innerHTML=jobs.length?jobs.map(j=>'<article class="video-job"><div><b>'+safe(j.model.includes("fast")?"Veo Fast":"Veo Qualidade")+'</b><p>'+safe(new Date(j.created_at).toLocaleString("pt-BR"))+' · '+safe(j.status)+'</p></div><div class="hero-buttons">'+(j.status==="processing"?'<button class="btn secondary small" data-check="'+safe(j.id)+'">Verificar status</button>':"")+(j.status==="ready"?'<button class="btn primary small" data-download="'+safe(j.id)+'">Baixar MP4</button>':"")+'</div></article>').join(""):'<p class="fine">Nenhum vídeo gerado ainda.</p>';box.querySelectorAll("[data-check]").forEach(b=>b.onclick=()=>check(b.dataset.check));box.querySelectorAll("[data-download]").forEach(b=>b.onclick=()=>{window.location.href="/api/video/download/"+b.dataset.download})}catch(e){status(e.message)}}
async function check(id){try{const r=await call("jobs/"+id);status(r.status==="ready"?"Vídeo pronto! Use Baixar MP4.":r.status==="failed"?"Falha na geração: "+r.error:"Google ainda está processando o vídeo.");await refreshJobs()}catch(e){status(e.message)}}
async function connect(){try{const state=await call("auth");auth(state.authenticated);status(state.configured?"Estúdio disponível.":"Configuração pendente: adicione VIDEO_ACCESS_PASSWORD e VIDEO_SESSION_SECRET como Secrets no Cloudflare.");if(state.authenticated)await refreshJobs()}catch(e){auth(false);status(e.message)}}
v("video-login").onclick=async()=>{try{const pass=v("video-password").value;if(!pass)throw Error("Informe a senha.");await call("login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:pass})});v("video-password").value="";auth(true);status("Autenticado.");await refreshJobs()}catch(e){status(e.message)}};
v("video-logout").onclick=async()=>{try{await call("logout",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});auth(false);status("Você saiu do estúdio.")}catch(e){status(e.message)}};
v("video-generate").onclick=async()=>{try{
if(!authenticated)throw Error("Faça login no estúdio.");if(!selected)throw Error("Selecione um produto.");if(!v("video-confirm").checked)throw Error("Confirme o custo antes de gerar.");
if(!confirm("Enviar este prompt ao Google Veo? A geração pode consumir créditos pagos da sua conta."))return;
v("video-generate").disabled=true;status("Enviando geração ao Google...");
const r=await call("generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:v("video-prompt").value,model:v("video-model").value,confirmCost:true})});
status("Geração iniciada: "+r.id+". Você pode consultar o resultado em Vídeos recentes.");v("video-confirm").checked=false;await refreshJobs()
}catch(e){status(e.message)}finally{v("video-generate").disabled=false}};
v("video-refresh").onclick=refreshJobs;
v("video-product").onchange=renderSelection;
window.addEventListener("observatorio:offers",e=>{offers=e.detail.offers||[];populate()});
window.addEventListener("observatorio:select-offer",e=>{v("video-product").value=e.detail.id;renderSelection()});
connect();
