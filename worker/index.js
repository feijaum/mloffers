import { instagramApi, processComments } from "./instagram.js";
import { videoApi } from "./video.js";
import { registerEligibleComments } from "./comment-matcher.js";
// Observatório ML: assets públicos e recebimento autenticado de webhooks Instagram.
// Publicações e automações exigem sessão administrativa e ativação explícita da regra.
const encoder=new TextEncoder();
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
function constantTimeHex(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function constantTimeString(a,b){if(!a||!b)return false;const aa=encoder.encode(a),bb=encoder.encode(b);if(aa.length!==bb.length)return false;let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0}
async function digestHex(data){const digest=await crypto.subtle.digest("SHA-256",data);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("")}
async function validMetaSignature(body,signature,secret){if(!secret||!/^sha256=[a-f0-9]{64}$/i.test(signature||""))return false;const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const expected=await crypto.subtle.sign("HMAC",key,body);const hex=Array.from(new Uint8Array(expected),b=>b.toString(16).padStart(2,"0")).join("");return constantTimeHex(hex,signature.slice(7).toLowerCase())}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==="/api/health"&&request.method==="GET")return json({status:"ok",service:"observatorio-ml",api:"webhook-ready",webhook_storage_configured:Boolean(env.DB&&env.META_APP_SECRET)});
  if(url.pathname==="/api/instagram/webhook"){
   if(request.method==="GET"){
    const mode=url.searchParams.get("hub.mode"),token=url.searchParams.get("hub.verify_token"),challenge=url.searchParams.get("hub.challenge");
    if(mode!=="subscribe"||!challenge||!env.INSTAGRAM_VERIFY_TOKEN||!constantTimeString(token,env.INSTAGRAM_VERIFY_TOKEN))return new Response("Forbidden",{status:403});
    return new Response(challenge,{status:200,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
   }
   if(request.method!=="POST")return json({error:"Método não permitido"},405);
   if(!env.META_APP_SECRET||!env.DB)return json({error:"Webhook ainda não configurado com Secret e D1"},503);
   const length=Number(request.headers.get("content-length")||"0");
   if(length>256000)return json({error:"Payload muito grande"},413);
   const body=await request.arrayBuffer();
   if(body.byteLength>256000)return json({error:"Payload muito grande"},413);
   if(!await validMetaSignature(body,request.headers.get("x-hub-signature-256"),env.META_APP_SECRET))return json({error:"Assinatura inválida"},401);
   let data;try{data=JSON.parse(new TextDecoder().decode(body))}catch{return json({error:"JSON inválido"},400)}
   if(!data||data.object!=="instagram"||!Array.isArray(data.entry))return json({error:"Evento não é Instagram"},400);
   const key=await digestHex(body);
   try{
    await env.DB.prepare("INSERT OR IGNORE INTO instagram_webhook_events (event_hash,event_type,payload_json,status,received_at) VALUES (?1,?2,?3,'pending',datetime('now'))")
     .bind(key,"instagram",JSON.stringify(data)).run();
   }catch(error){console.error("Instagram webhook persistence unavailable",String(error).slice(0,180));return json({error:"Falha ao registrar evento"},503)}
   // Eventos já gravados podem ser reenviados; o matcher usa comment_id como chave única.
   try{await registerEligibleComments(data,env.DB);await processComments(data,env)}
   catch(error){console.error("Instagram comment classification failed",String(error).slice(0,180));return json({error:"Falha na classificação; o evento foi armazenado para recuperação"},503)}
   return new Response("EVENT_RECEIVED",{status:200,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
  }
  if(url.pathname.startsWith("/api/instagram/"))return instagramApi(request,env,url);
  if(url.pathname.startsWith("/api/video/"))return videoApi(request,env,url);
  if(url.pathname.startsWith("/api/"))return json({error:"Rota não encontrada"},404);
  return env.ASSETS.fetch(request);
 }
};
