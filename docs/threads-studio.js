const $=id=>document.getElementById('th-'+id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let offers=[],parts=[],imagePrompts=[];
const key=()=> 'observatorio-threads-v1:'+$('offer').value;
const status=s=>$('status').textContent=s;
function save(){if(!$('offer').value)return;try{localStorage.setItem(key(),JSON.stringify({product:$('product').value,link:$('link').value,theme:$('theme').value,profile:$('profile').value,visual:$('visual').value,imagePrompts,parts}));}catch{status('Não foi possível salvar o rascunho neste navegador. Copie os textos antes de sair.')}}
function preview(){const name=$('profile').value.trim()||'seu.perfil';$('preview').innerHTML=parts.length?parts.map((text,i)=>'<article class="thread-post"><div class="thread-avatar">@</div><div class="thread-body"><strong>'+esc(name)+'</strong><span class="thread-position">'+(i+1)+' / '+parts.length+'</span><p>'+esc(text).replace(/https:\/\/[^\s<>]+/g,url=>'<a target="_blank" rel="noopener noreferrer" href="'+url+'">'+url+'</a>')+'</p><div class="thread-icons" aria-hidden="true">♡　♧　⇄　↗</div></div></article>').join(''):'<p>Gere um modelo para visualizar a sequência.</p>';}
function editors(){$('editors').innerHTML=parts.map((p,i)=>'<label>Publicação '+(i+1)+'<textarea rows="6" data-part="'+i+'">'+esc(p)+'</textarea><small id="th-count-'+i+'"></small><button type="button" class="btn secondary small" data-copy-part="'+i+'">Copiar esta parte</button></label>').join('');$('editors').querySelectorAll('textarea').forEach(el=>el.addEventListener('input',()=>{parts[Number(el.dataset.part)]=el.value;counts();preview();save()}));$('editors').querySelectorAll('[data-copy-part]').forEach(el=>el.onclick=()=>copyText(parts[Number(el.dataset.copyPart)]));counts();preview()}
function counts(){parts.forEach((p,i)=>{const n=Array.from(p).length;document.getElementById('th-count-'+i).textContent=n+' caracteres'+(n>500?' · texto longo: divida antes de publicar':'');})}
async function copyText(text){try{await navigator.clipboard.writeText(text);status('Texto copiado.')}catch{status('Não foi possível copiar automaticamente. Selecione e copie o texto no editor.')}}
function choose(){const offer=offers.find(o=>o.id===$('offer').value);let draft;try{draft=JSON.parse(localStorage.getItem(key())||'null')}catch{}$('product').value=draft?.product||offer?.title.slice(0,65)||'';$('link').value=draft?.link||offer?.affiliate||'';$('theme').value=draft?.theme||'presente';$('profile').value=draft?.profile||'historias.eachados';parts=Array.isArray(draft?.parts)?draft.parts.filter(x=>typeof x==='string').slice(0,8):[];$('visual').value=draft?.visual||'';imagePrompts=Array.isArray(draft?.imagePrompts)?draft.imagePrompts.filter(x=>typeof x==='string').slice(0,8):[];renderPrompts();$('info').textContent=offer?offer.title:'Importe ofertas na aba Ofertas para usar seus produtos.';editors();status(parts.length?'Rascunho recuperado. Você pode editar cada parte.':'Preencha o link de afiliado para gerar a história.')}
window.addEventListener('observatorio:ranking',e=>{const selected=$('offer').value;offers=e.detail.offers;$('offer').innerHTML='<option value="">Selecione uma oferta</option>'+offers.map((o,i)=>'<option value="'+esc(o.id)+'">#'+(i+1)+' · '+esc(o.title)+'</option>').join('');if(offers.some(o=>o.id===selected))$('offer').value=selected;choose()});
$('offer').onchange=choose;
for(const id of ['product','link','theme','profile','visual'])$(id).addEventListener('input',()=>{save();preview();if(id==='link'&&parts.length)status('Link alterado. Gere novamente ou atualize o link no texto antes de copiar.')});
$('generate').onclick=()=>{if(!$('offer').value)return status('Selecione uma oferta do ranking.');const product=$('product').value.trim(),link=$('link').value.trim();if(!product)return status('Informe um nome curto para o produto.');try{if(new URL(link).protocol!=='https:')throw Error()}catch{return status('Informe seu link de afiliado HTTPS. O link capturado pela extensão não é usado automaticamente.')}
const stories={presente:[
'Encontrei um presente escondido no armário e achei que finalmente alguém tinha lembrado do meu aniversário. O detalhe é que meu aniversário ainda estava a quatro meses. Fiquei quieta. Queria ver até onde aquela história ia.',
'No jantar, perguntei se ele precisava me contar alguma coisa. Ele largou o garfo. Minha irmã, que estava do lado, começou a rir. Aí eu tive certeza de que os dois estavam escondendo alguma coisa de mim.',
'Ele trouxe a caixa: era '+product+'. Este aqui: '+link+' . Minha irmã tinha pedido ajuda para escolher um presente para o marido dela. Eu já tinha ensaiado uma discussão inteira. Agora vou ter que ensaiar como pedir um igual.'],vizinha:[
'Minha vizinha recebeu uma encomenda no meu nome e se recusou a devolver. Disse que só entregava quando meu marido estivesse em casa. Eu subi dois andares pronta para descobrir o que aqueles dois estavam aprontando.',
'Quando ele chegou, ela apareceu na porta com a caixa e falou: “Agora explica para ela”. Meu marido olhou para mim, olhou para a caixa e começou a rir. Eu era a única pessoa naquele corredor que não estava achando graça.',
'Era '+product+'. Esse aqui: '+link+' . Eu mesma tinha comprado e esquecido. Na observação da entrega, escrevi para deixar com a vizinha e não contar para ele. Ela levou a parte do segredo muito a sério.'],familia:[
'Minha mãe mandou “não conta para ela” no grupo da família. Só esqueceu que eu também estava no grupo. A mensagem sumiu em segundos. Fiz um café e esperei. Pela primeira vez, ninguém tinha nada para falar.',
'Meu irmão disse que era assunto do trabalho. Minha tia mandou figurinha. Meu pai saiu do grupo. Foi aí que percebi: ou estavam preparando uma surpresa, ou minha família inteira precisava de um curso para aprender a mentir.',
'À noite apareceu um pacote com '+product+'. Era esse: '+link+' . Estavam organizando meu presente. Meu pai voltou ao grupo dizendo que tinha saído sem querer. Até agora não sei se acredito nessa parte.']};parts=stories[$('theme').value]||stories.presente;editors();generatePrompts();save();status('Modelo local gerado. Revise a história e o link; edite qualquer parte e confira a prévia ao lado.');};
$('copy').onclick=()=>parts.length?copyText(parts.map((p,i)=>(i+1)+'/'+parts.length+'\n'+p).join('\n\n')):status('Gere uma história primeiro.');
preview();

function renderPrompts(){
 $('image-prompts').innerHTML=imagePrompts.map((p,i)=>'<label>Imagem '+(i+1)+' · publicação '+(i+1)+'<textarea rows="9" data-image-prompt="'+i+'">'+esc(p)+'</textarea><button class="btn secondary small" type="button" data-copy-image="'+i+'">Copiar prompt da imagem '+(i+1)+'</button></label>').join('');
 $('image-prompts').querySelectorAll('[data-image-prompt]').forEach(el=>el.oninput=()=>{imagePrompts[Number(el.dataset.imagePrompt)]=el.value;save()});
 $('image-prompts').querySelectorAll('[data-copy-image]').forEach(el=>el.onclick=()=>copyText(imagePrompts[Number(el.dataset.copyImage)]));
}
function generatePrompts(){
 if(!parts.length)return status('Gere ou recupere uma história antes de criar os prompts.');
 const scenes={presente:['Um armário entreaberto, caixa de presente parcialmente escondida atrás de roupas. Enquadramento próximo da descoberta, sem mostrar o conteúdo.','Mesa de jantar com prato e garfo abandonado, caixa ainda fechada ao fundo. Sensação de conversa interrompida.','Caixa de presente aberta em ambiente doméstico, revelação do objeto e alívio depois do mal-entendido.'],vizinha:['Encomenda sem etiqueta legível diante da porta de um apartamento. Corredor vazio e enquadramento curioso pela fresta da porta.','Caixa fechada entre duas portas de apartamentos, perspectiva de quem chegou ao corredor para pedir explicações.','Encomenda aberta sobre mesa da sala, objeto revelado, mesmo pacote e ambiente das imagens anteriores.'],familia:['Celular virado parcialmente para baixo ao lado de uma xícara de café. Caixa fechada discretamente ao fundo, clima de segredo doméstico.','Mesa de família com xícaras e celular apagado, cadeiras afastadas, atmosfera de silêncio constrangedor.','Pacote de presente aberto sobre a mesa da família, revelando o objeto que motivou o segredo.']};
 const direction=$('visual').value.trim();const product=$('product').value.trim();
 imagePrompts=parts.map((part,i)=>[
 'Crie uma fotografia narrativa vertical 4:5 para acompanhar a parte '+(i+1)+' de uma história fictícia em sequência no Threads.',
 'CONTEXTO COMPLETO: '+parts.join(' ').replace(/https:\/\/[^\s]+/g,'[link do produto]'),
 'TRECHO DESTA IMAGEM: '+part.replace(/https:\/\/[^\s]+/g,'[link do produto]'),
 'CENA SUGERIDA: '+(scenes[$('theme').value]?.[i]||'Escolha uma pista visual concreta deste trecho.'),
 direction?'DIREÇÃO ADICIONAL: '+direction:'',
 'Priorize os fatos do trecho atual se o texto tiver sido editado. Não acrescente pistas que contradigam a narrativa. A imagem inicial deve provocar curiosidade sem revelar o desfecho.',
 'Estética de foto casual de celular: luz ambiente, enquadramento espontâneo, pequenas imperfeições, texturas realistas. Foco em um objeto que desperte dúvida, composição forte e detalhe facilmente identificável na tela do celular. Evite aparência de catálogo ou banner.',
 'Mantenha o mesmo ambiente, cores, embalagem e objetos entre as imagens. Prefira cenas sem pessoas; se indispensáveis, apenas personagens adultos inteiramente fictícios, sem semelhança com pessoas reais.',
 'Se a história envolver suspeita de traição, use apenas pistas de objetos mencionados no texto, como uma peça de lingerie deixada sobre um banco de carro. Lingerie apenas como objeto de cena, sem corpo, nudez, ato sexual ou enquadramento fetichista.',
 i===parts.length-1?'Produto no desfecho: '+product+'. Se aparecer, use a fotografia original do produto como referência anexada, preservando design, cor e proporções. Não invente acessórios, marca ou funções.':'Não exponha o produto do desfecho antes da hora.',
 'Sem textos sobrepostos, balões, legendas, logotipos adicionados, marcas d’água, interfaces ou mensagens legíveis. Não fabricar capturas de conversa nem documentos.'
 ].filter(Boolean).join('\n\n'));
 renderPrompts();save();status('Prompts atualizados a partir da história atual. Revise e copie cada cena para gerar suas imagens.');
}
$('prompts-generate').onclick=generatePrompts;
