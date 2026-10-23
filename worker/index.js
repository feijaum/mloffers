// Observatório ML — início do backend, mantendo os arquivos públicos no Cloudflare Assets.
// Este worker NÃO envia DMs nem gera vídeos até existirem autenticação, filas e limites.
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}})}
async function sameSecret(a,b){if(!a||!b)return false;const encoder=new TextEncoder();const key=await crypto.subtle.importKey("raw",encoder.encode(b),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const expected=new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode("verify")));const candidateKey=await crypto.subtle.importKey("raw",encoder.encode(a),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const got=new Uint8Array(await crypto.subtle.sign("HMAC",candidateKey,encoder.encode("verify")));return expected.every((v,i)=>v===got[i])}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==="/api/health"&&request.method==="GET")return reply({status:"ok",service:"observatorio-ml",api:"scaffold"});
  if(url.pathname==="/api/instagram/webhook"){
   if(request.method==="GET"){
    const mode=url.searchParams.get("hub.mode");
    const token=url.searchParams.get("hub.verify_token");
    const challenge=url.searchParams.get("hub.challenge");
    if(mode!=="subscribe"||!challenge||!env.INSTAGRAM_VERIFY_TOKEN||!(await sameSecret(token,env.INSTAGRAM_VERIFY_TOKEN)))return new Response("Forbidden",{status:403});
    return new Response(challenge,{status:200,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});
   }
   // Nunca retornar 200 a eventos ainda não processados: webhook de comentários
   // exige assinatura Meta validada, idempotência e banco antes de ser habilitado.
   return reply({error:"Webhook de eventos ainda não configurado"},503);
  }
  if(url.pathname.startsWith("/api/instagram/"))return reply({error:"Integração Instagram ainda não ativada"},503);
  if(url.pathname.startsWith("/api/video/"))return reply({error:"Geração de vídeo ainda não ativada"},503);
  if(url.pathname.startsWith("/api/"))return reply({error:"Rota não encontrada"},404);
  return env.ASSETS.fetch(request);
 }
};
