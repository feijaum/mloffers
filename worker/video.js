// Video gateway: sessão HttpOnly, cotas D1 e Gemini Omni Interactions API.
const api="https://generativelanguage.googleapis.com/v1beta/";
const enc=new TextEncoder();
const resp=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...headers}});
const parseCookie=request=>{const token=(request.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("video_session="));return token?token.slice(14):""};
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function sign(value,secret){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,enc.encode(value)))}
function equals(a,b){if(!a||!b||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
function sameOrigin(request){const origin=request.headers.get("origin");const expected=new URL(request.url).origin;return origin===expected && request.headers.get("sec-fetch-site")!=="cross-site"}
async function session(request,env){if(!env.VIDEO_SESSION_SECRET)return false;const cookie=parseCookie(request),parts=cookie.split(".");if(parts.length!==2||!/^[0-9]{10,13}$/.test(parts[0]))return false;const expiry=Number(parts[0]);if(expiry<Date.now()||expiry>Date.now()+86400000)return false;return equals(await sign(parts[0],env.VIDEO_SESSION_SECRET),parts[1])}
function cookie(value,maxAge){return "video_session="+value+"; HttpOnly; Secure; SameSite=Strict; Path=/api/video; Max-Age="+maxAge}
async function googleFetch(path,env,options){const r=await fetch(api+path,{...options,headers:{"x-goog-api-key":env.GOOGLE_API_KEY,...options?.headers}});const data=await r.json().catch(()=>({error:{message:"Resposta inválida do provedor"}}));return {status:r.status,data}}
const findVideo=obj=>{
  const content=obj?.steps?.filter(step=>step?.type==="model_output").flatMap(step=>step.content||[])||[];
  return content.find(part=>part?.type==="video"&&typeof part.uri==="string")
    ||(typeof obj?.output_video?.uri==="string"?obj.output_video:null);
};
function fileIdFromUri(uri){
  try{const url=new URL(uri);
    if(url.protocol!=="https:"||url.hostname!=="generativelanguage.googleapis.com")return "";
    const match=url.pathname.match(/^\/v1beta\/files\/([a-zA-Z0-9_-]+):download$/);
    return match?match[1]:"";
  }catch{return ""}
}
const jobId=()=>crypto.randomUUID();
export async function videoApi(request,env,url) {
 if(!env.DB)return resp({error:"Banco D1 não configurado"},503);
 const path=url.pathname,method=request.method;
 if(path==="/api/video/auth"&&method==="GET")return resp({authenticated:await session(request,env),configured:Boolean(env.VIDEO_ACCESS_PASSWORD&&env.VIDEO_SESSION_SECRET&&env.GOOGLE_API_KEY)});
 if(path==="/api/video/login"&&method==="POST"){
  if(!sameOrigin(request))return resp({error:"Origem inválida"},403);
  if(!env.VIDEO_ACCESS_PASSWORD||!env.VIDEO_SESSION_SECRET)return resp({error:"Configure VIDEO_ACCESS_PASSWORD e VIDEO_SESSION_SECRET no Cloudflare"},503);
  const ip=request.headers.get("cf-connecting-ip")||"unknown";
  const ipHash=hex(await crypto.subtle.digest("SHA-256",enc.encode(ip)));
  const bucket=Math.floor(Date.now()/3600000);
  // limite de 10 tentativas por IP a cada hora
  await env.DB.prepare("INSERT OR IGNORE INTO video_login_attempts (ip_hash,hour_bucket,attempts) VALUES (?1,?2,0)").bind(ipHash,bucket).run();
  const n=await env.DB.prepare("SELECT attempts FROM video_login_attempts WHERE ip_hash=?1 AND hour_bucket=?2").bind(ipHash,bucket).first();
  if((n?.attempts||0)>=10)return resp({error:"Limite de tentativas atingido. Tente mais tarde."},429);
  let body;try{body=await request.json()}catch{return resp({error:"JSON inválido"},400)}
  const provided=String(body?.password||"");
  if(!provided||!equals(await sign("login",provided),await sign("login",env.VIDEO_ACCESS_PASSWORD))){
   await env.DB.prepare("UPDATE video_login_attempts SET attempts=attempts+1 WHERE ip_hash=?1 AND hour_bucket=?2").bind(ipHash,bucket).run();
   return resp({error:"Senha incorreta"},401);
  }
  const expiry=String(Date.now()+2*3600000);
  return resp({authenticated:true},200,{"set-cookie":cookie(expiry+"."+await sign(expiry,env.VIDEO_SESSION_SECRET),7200)});
 }
 if(path==="/api/video/logout"&&method==="POST"){if(!sameOrigin(request))return resp({error:"Origem inválida"},403);return resp({authenticated:false},200,{"set-cookie":cookie("",0)})}
 if(!await session(request,env))return resp({error:"Entre com sua senha do estúdio de vídeos"},401);
 if(method==="POST"&&!sameOrigin(request))return resp({error:"Origem inválida"},403);
 if(!env.GOOGLE_API_KEY)return resp({error:"GOOGLE_API_KEY não configurada"},503);
 if(path==="/api/video/generate"&&method==="POST"){
  let body;try{body=await request.json()}catch{return resp({error:"JSON inválido"},400)}
  const prompt=body?.prompt,model="gemini-omni-1.1-flash";
  if(typeof prompt!=="string"||prompt.length<30||prompt.length>3800)return resp({error:"Prompt precisa ter de 30 a 3800 caracteres"},400);
  if(body?.confirmCost!==true)return resp({error:"Confirme o consumo de créditos antes de gerar"},400);
  const today=new Date().toISOString().slice(0,10);
  const n=await env.DB.prepare("SELECT COUNT(*) AS count FROM video_jobs WHERE created_at>=?1 AND status IN ('requesting','processing','ready')").bind(today+"T00:00:00").first();
  if((n?.count||0)>=3)return resp({error:"Limite de 3 solicitações por dia atingido"},429);
  const id=jobId();
  await env.DB.prepare("INSERT INTO video_jobs (id,model,prompt,status,created_at) VALUES (?1,?2,?3,'requesting',?4)").bind(id,model,prompt,new Date().toISOString()).run();
  const inputs=[{type:"text",text:prompt}];
  if(body.imageUrl){
   try{
    const imageUrl=new URL(body.imageUrl);
    if(imageUrl.protocol!=="https:"||!["http2.mlstatic.com","http2.mlstatic.com.ar"].includes(imageUrl.hostname))throw Error("Imagem precisa ser hospedada no Mercado Livre");
    const response=await fetch(imageUrl.toString(),{redirect:"manual"});
    if(response.status>=300&&response.status<400)throw Error("O servidor de imagens solicitou um redirecionamento; use outra imagem da oferta");
    if(!response.ok)throw Error("Imagem do produto indisponível (HTTP "+response.status+")");
    const mime=response.headers.get("content-type")?.split(";")[0]?.trim();
    if(!["image/png","image/jpeg","image/webp"].includes(mime))throw Error("Formato de imagem incompatível");
    if(Number(response.headers.get("content-length")||0)>4*1024*1024)throw Error("Imagem acima de 4 MB");
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length>4*1024*1024)throw Error("Imagem acima de 4 MB");
    let encoded="";for(let i=0;i<bytes.length;i+=0x4000)encoded+=String.fromCharCode(...bytes.subarray(i,i+0x4000));
    inputs.unshift({type:"image",mime_type:mime,data:btoa(encoded)});
   }catch(error){
    await env.DB.prepare("UPDATE video_jobs SET status='failed',error=?1 WHERE id=?2").bind(String(error.message||error).slice(0,300),id).run();
    return resp({error:"Não foi possível preparar a imagem do produto",details:String(error.message||error)},400);
   }
  }
  const payload={
    model,
    input:inputs,
    response_format:{type:"video",aspect_ratio:"9:16",delivery:"uri"}
  };
  let result;
  try{
    result=await googleFetch("interactions",env,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(payload)
    });
  }catch(error){
    await env.DB.prepare("UPDATE video_jobs SET status='failed',error=?1 WHERE id=?2").bind(String(error.message||error).slice(0,300),id).run();
    return resp({error:"Falha na comunicação com Google"},502);
  }
  if(result.status>=400){
    const reason=JSON.stringify(result.data?.error||result.data).slice(0,800);
    await env.DB.prepare("UPDATE video_jobs SET status='failed',error=?1 WHERE id=?2").bind(reason,id).run();
    return resp({error:"Google não iniciou o vídeo",details:result.data?.error?.message||"Confira acesso, modelo e faturamento."},result.status<500?result.status:502);
  }
  const video=findVideo(result.data);
  const uri=video?.uri||"";
  const fileId=fileIdFromUri(uri);
  if(!fileId){
    const reason="Omni não retornou URI de vídeo. Verifique a resposta da Interactions API.";
    await env.DB.prepare("UPDATE video_jobs SET status='failed',error=?1 WHERE id=?2").bind(reason,id).run();
    return resp({error:reason,details:"O formato de resposta precisa conter steps[].content[].uri (delivery=uri)."},502);
  }
  await env.DB.prepare("UPDATE video_jobs SET status='processing',operation=?1,video_uri=?2 WHERE id=?3")
    .bind("files/"+fileId,uri,id).run();
  return resp({id,status:"processing",model},202);
 }
 if(path==="/api/video/jobs"&&method==="GET"){
  const rows=await env.DB.prepare("SELECT id,model,status,created_at,error FROM video_jobs ORDER BY created_at DESC LIMIT 10").all();
  return resp({jobs:rows.results||[]});
 }
 const statusMatch=path.match(/^\/api\/video\/jobs\/([a-f0-9-]{36})$/);
 if(statusMatch&&method==="GET"){
  const job=await env.DB.prepare("SELECT id,status,operation,model,error FROM video_jobs WHERE id=?1").bind(statusMatch[1]).first();
  if(!job)return resp({error:"Vídeo não encontrado"},404);
  if(job.status!=="processing")return resp({id:job.id,status:job.status,error:job.error||null,ready:job.status==="ready"});
  if(!/^files\/[a-zA-Z0-9_-]+$/.test(job.operation||""))return resp({error:"Identificador de arquivo inesperado"},502);
  const result=await googleFetch(job.operation,env);
  if(result.status>=400)return resp({error:result.data?.error?.message||"Erro ao consultar arquivo no Google"},502);
  const state=result.data?.state;
  if(state==="ACTIVE"){
    await env.DB.prepare("UPDATE video_jobs SET status='ready' WHERE id=?1").bind(job.id).run();
    return resp({id:job.id,status:"ready",ready:true});
  }
  if(state==="FAILED"){
    await env.DB.prepare("UPDATE video_jobs SET status='failed',error=?1 WHERE id=?2")
      .bind("Google reportou falha no processamento do arquivo de vídeo.",job.id).run();
    return resp({id:job.id,status:"failed"});
  }
  return resp({id:job.id,status:"processing",ready:false});
 }
 const downloadMatch=path.match(/^\/api\/video\/download\/([a-f0-9-]{36})$/);
 if(downloadMatch&&method==="GET"){
  const job=await env.DB.prepare("SELECT status,video_uri FROM video_jobs WHERE id=?1").bind(downloadMatch[1]).first();
  if(job?.status!=="ready"||!job.video_uri)return resp({error:"Vídeo ainda não está disponível"},404);
  const uri=new URL(job.video_uri);
  if(!fileIdFromUri(job.video_uri))return resp({error:"Destino de vídeo inválido"},502);
  const video=await fetch(uri.toString(),{headers:{"x-goog-api-key":env.GOOGLE_API_KEY},redirect:"follow"});
  if(!video.ok)return resp({error:"Google não disponibilizou o arquivo; ele pode ter expirado"},502);
  return new Response(video.body,{status:200,headers:{"content-type":"video/mp4","content-disposition":'attachment; filename="observatorio-'+downloadMatch[1]+'.mp4"',"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
 }
 return resp({error:"Rota de vídeo não encontrada"},404);
}
