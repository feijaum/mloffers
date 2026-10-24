import { loadCopy, saveCopy } from "./content-copy.js";
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
"Crie vídeo publicitário vertical 9:16 com aproximadamente oito segundos, visual cinematográfico, realista, adequado para Reels.",
"Produto: "+x.title+". Categoria: "+(x.category||"achadinhos")+".",
"Respeite estritamente o produto real da imagem de referência, cores, proporções, materiais, rótulos e marcas existentes. Não invente recursos nem acessórios.",
"Cenas: abertura com close do produto; detalhes de acabamento; contexto de uso plausível; encerramento com produto em destaque.",
"REGRA OBRIGATÓRIA: NÃO CRIE NENHUM TEXTO SOBREPOSTO NO VÍDEO.",
"Sem títulos, palavras, letras, números, preços, promoções, legendas, subtítulos, selos, hashtags, banners, botões, interfaces de aplicativo, chamadas escritas ou marcas d'água.",
"Não alterar inscrições físicas que existam originalmente no produto.",
"Deixe espaço livre no topo e no rodapé para edição posterior. Centralize o produto nas áreas seguras.",
"Não escreva EU QUERO no vídeo; essa chamada será adicionada no editor posteriormente.",
"Áudio ambiente e música discretos. Se houver locução, português brasileiro sem subtítulos automáticos.",
"Não alegue descontos, benefícios ou garantias não confirmados. Sem texto promocional gerado por IA."
].join("\n")}
const overlayIds=["title","subtitle","cta","support","caption","hashtags"];
function renderOverlayCopy(x){const data=x?loadCopy(x):{};for(const key of overlayIds){const field=v("overlay-"+key);if(field)field.value=data[key]||""}updateOverlayPreview()}
function updateOverlayPreview(){for(const key of ["title","subtitle","cta"]){const e=v("overlay-preview-"+key);if(e)e.textContent=v("overlay-"+key)?.value||""}}
function overlayPackage(){return overlayIds.map(k=>k.toUpperCase()+"\n"+(v("overlay-"+k)?.value||"")).join("\n\n")}
function renderSelection(){selected=(ranking.length?ranking:offers).find(x=>x.id===v("video-product").value)||null;renderRankingCards();const box=v("video-product-preview");if(!selected){box.textContent="Selecione uma oferta para criar o vídeo.";v("video-prompt").value="";renderOverlayCopy(null);return}
box.innerHTML=(selected.image?'<img src="'+safe(selected.image)+'" alt="Imagem do produto" loading="lazy">':"")+'<strong>'+safe(selected.title)+'</strong><small>Preço na captura: R$ '+Number(selected.price).toFixed(2).replace(".",",")+'</small>';v("video-prompt").value=promptFor(selected);renderOverlayCopy(selected)}
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


function mode(type){
 const flow=type==="flow";
 v("video-flow-actions").hidden=!flow;v("video-api-actions").hidden=flow;
 v("video-mode-flow").className="btn "+(flow?"primary":"secondary");v("video-mode-api").className="btn "+(!flow?"primary":"secondary");
 v("video-mode-flow").setAttribute("aria-pressed",String(flow));
 v("video-mode-api").setAttribute("aria-pressed",String(!flow));
 v("video-mode-note").textContent=flow?"Use seus créditos do Google Flow; confirme a geração lá, sem cobranças da API do Observatório.":"Geração pela API independente: não utiliza o saldo de créditos do Google Flow e pode gerar custos.";
}
function downloadText(name,content){
 const blob=new Blob([content],{type:"text/plain;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
v("video-mode-flow").onclick=()=>mode("flow");
v("video-mode-api").onclick=()=>mode("api");
v("video-flow-copy").onclick=async()=>{
 if(!selected){status("Selecione um produto do ranking.");return}
 try{await navigator.clipboard.writeText(v("video-prompt").value);status("Prompt copiado! Agora abra o Flow e envie a imagem do produto.")}catch{status("Não foi possível copiar. Selecione o texto do prompt e copie manualmente.")}
};
v("video-flow-image").onclick=()=>{
 if(!selected?.image){status("A oferta não possui imagem registrada.");return}
 window.open(selected.image,"_blank","noopener,noreferrer");
};
v("video-flow-kit").onclick=()=>{
 if(!selected){status("Selecione um produto do ranking.");return}
 downloadText("flow-"+selected.id+".txt",[
  "PRODUTO: "+selected.title,
  "ID: "+selected.id,
  "POSIÇÃO NO RANKING: "+((ranking.length?ranking:offers).findIndex(x=>x.id===selected.id)+1),
  "FOTO DE REFERÊNCIA: "+(selected.image||"Indisponível"),
  "URL DO PRODUTO: "+(selected.url||"Indisponível"),
  "LINK DE AFILIADO: "+(selected.affiliate||"Preencha antes de publicar"),
  "CHAMADA: Comente EU QUERO",
  "",
  "=== PROMPT PARA GOOGLE FLOW ===",
  v("video-prompt").value,
  "",
  "=== TEXTOS DE OVERLAY E CAPA ===",overlayPackage(),"",
  "NOTA: O pacote não gera o vídeo. Cole o prompt e anexe a imagem no Google Flow."
 ].join("\n"));
 status("Pacote do produto baixado.");
};
mode("flow");

for(const key of overlayIds)v("overlay-"+key)?.addEventListener("input",()=>{updateOverlayPreview();if(selected)saveCopy(selected.id,Object.fromEntries(overlayIds.map(k=>[k,v("overlay-"+k).value])))});
document.querySelectorAll("[data-copy-overlay]").forEach(button=>button.addEventListener("click",async()=>{
 const key=button.dataset.copyOverlay;
 const value=key==="all"?overlayPackage():v("overlay-"+key)?.value||"";
 if(!value.trim()){status("Selecione um produto primeiro.");return}
 try{await navigator.clipboard.writeText(value);status("Texto copiado com sucesso.")}catch{status("Falha ao copiar texto automaticamente.")}
}));
v("overlay-download").onclick=()=>{if(!selected){status("Selecione um produto.");return}downloadText("overlay-"+selected.id+".txt",overlayPackage());status("Overlays baixados.")};

window.addEventListener("observatorio:copy",event=>{if(selected?.id!==event.detail.id)return;for(const key of overlayIds)v("overlay-"+key).value=event.detail.copy[key]||"";updateOverlayPreview()});
