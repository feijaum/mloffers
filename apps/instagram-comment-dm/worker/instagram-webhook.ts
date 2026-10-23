import type { Env } from "./admin-api";

type WebhookChange = { field?: unknown; value?: unknown };
type CommentValue = { id?: unknown; text?: unknown; from?: unknown; media?: unknown };
type ProductRow = { name: string; product_url: string };
type RuleRow = { id: string; dm_template: string; keyword_normalized: string; user_id: string };
type AccountRow = { id: string; provider_account_id: string };

function text(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
function constantTimeEqual(left:string,right:string):boolean{if(left.length!==right.length)return false;let difference=0;for(let index=0;index<left.length;index+=1)difference|=left.charCodeAt(index)^right.charCodeAt(index);return difference===0}
function bytesToHex(bytes:Uint8Array):string{return Array.from(bytes,(byte)=>byte.toString(16).padStart(2,"0")).join("")}
async function validSignature(body:ArrayBuffer,signature:string,appSecret:string):Promise<boolean>{if(!signature.startsWith("sha256="))return false;const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(appSecret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const digest=await crypto.subtle.sign("HMAC",key,body);return constantTimeEqual(signature.slice(7).toLowerCase(),bytesToHex(new Uint8Array(digest)))}
function normalize(value:string):string{return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ")}
function containsKeyword(comment:string,keyword:string):boolean{const normalizedComment=` ${normalize(comment)} `;const normalizedKeyword=normalize(keyword);return normalizedKeyword.length>0&&normalizedComment.includes(` ${normalizedKeyword} `)}
function valueObject(value:unknown):Record<string,unknown>{return value&&typeof value==="object"?value as Record<string,unknown>:{}}

async function saveDiagnostic(env:Env,status:string,detail:string=""):Promise<void>{
 const value=JSON.stringify({status,detail:detail.slice(0,300),at:new Date().toISOString()});
 try{await env.DB.prepare("INSERT INTO system_settings (key,value,updated_at) VALUES ('instagram_webhook_diagnostic',?1,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')").bind(value).run()}catch(error){console.error("Falha ao salvar diagnóstico do webhook.",error)}
}

async function sendPrivateReply(accountId:string,commentId:string,message:string,accessToken:string):Promise<void>{
 const response=await fetch(`https://graph.instagram.com/${encodeURIComponent(accountId)}/messages`,{method:"POST",headers:{authorization:`Bearer ${accessToken}`,"content-type":"application/json"},body:JSON.stringify({recipient:{comment_id:commentId},message:{text:message}})});
 if(!response.ok){const body=await response.text();throw new Error(`Meta HTTP ${response.status}: ${body.slice(0,300)}`)}
}

async function processComment(entryId:string,value:CommentValue,env:Env):Promise<void>{
 if(!env.INSTAGRAM_ACCESS_TOKEN){await saveDiagnostic(env,"missing_access_token");return;}
 const commentId=typeof value.id==="string"?value.id:"";
 const commentText=typeof value.text==="string"?value.text:"";
 const media=valueObject(value.media);
 const mediaId=typeof media.id==="string"?media.id:"";
 const from=valueObject(value.from);
 const senderName=typeof from.username==="string"?from.username:"cliente";
 if(!commentId||!commentText||!mediaId){await saveDiagnostic(env,"invalid_comment_payload",`comment=${Boolean(commentId)} text=${Boolean(commentText)} media=${Boolean(mediaId)}`);return;}

 const account=await env.DB.prepare("SELECT id,provider_account_id FROM instagram_accounts WHERE provider_account_id=?1 AND is_active=1 LIMIT 1").bind(entryId).first<AccountRow>()
   ??await env.DB.prepare("SELECT id,provider_account_id FROM instagram_accounts WHERE is_active=1 ORDER BY created_at DESC LIMIT 1").first<AccountRow>();
 if(!account){await saveDiagnostic(env,"account_not_found",`entry_id=${entryId}`);return;}

 const post=await env.DB.prepare("SELECT id FROM posts WHERE instagram_account_id=?1 AND provider_post_id=?2 AND is_active=1 LIMIT 1").bind(account.id,mediaId).first<{id:string}>();
 if(!post){await saveDiagnostic(env,"post_not_found",`media_id=${mediaId} account_id=${account.id}`);return;}

 const rules=await env.DB.prepare("SELECT id,user_id,keyword_normalized,dm_template FROM automation_rules WHERE post_id=?1 AND is_active=1").bind(post.id).all<RuleRow>();
 if(rules.results.length===0){await saveDiagnostic(env,"active_rule_not_found",`post_id=${post.id}`);return;}
 let keywordMatched=false;
 for(const rule of rules.results){
  if(!containsKeyword(commentText,rule.keyword_normalized))continue;
  keywordMatched=true;
  const key=`instagram_comment:${commentId}:${rule.id}`;
  const inserted=await env.DB.prepare("INSERT OR IGNORE INTO system_settings (key,value,updated_at) VALUES (?1,'processing',datetime('now'))").bind(key).run();
  if(Number(inserted.meta.changes??0)===0)continue;
  try{
   const products=await env.DB.prepare("SELECT p.name,p.product_url FROM automation_rule_products arp JOIN products p ON p.id=arp.product_id WHERE arp.automation_rule_id=?1 ORDER BY arp.position,p.name").bind(rule.id).all<ProductRow>();
   const productText=products.results.map((product)=>`${product.name}: ${product.product_url}`).join("\n");
   const message=rule.dm_template.replaceAll("{{nome}}",senderName).replaceAll("{{link_produto}}",productText);
   await sendPrivateReply(account.provider_account_id,commentId,message,env.INSTAGRAM_ACCESS_TOKEN);
   await saveDiagnostic(env,"message_sent",`comment_id=${commentId} rule_id=${rule.id}`);
   await env.DB.prepare("UPDATE system_settings SET value='processed',updated_at=datetime('now') WHERE key=?1").bind(key).run();
   await env.DB.prepare("INSERT INTO automation_logs (id,user_id,automation_rule_id,instagram_user_id,action,status) VALUES (?1,?2,?3,?4,'private_reply','success')").bind(crypto.randomUUID(),rule.user_id,rule.id,typeof from.id==="string"?from.id:null).run();
  }catch(error){
   const detail=error instanceof Error?error.message:"erro desconhecido";
   await env.DB.prepare("UPDATE system_settings SET value=?1,updated_at=datetime('now') WHERE key=?2").bind(`failed:${detail.slice(0,180)}`,key).run();
   await env.DB.prepare("INSERT INTO automation_logs (id,user_id,automation_rule_id,instagram_user_id,action,status,error_code) VALUES (?1,?2,?3,?4,'private_reply','failed',?5)").bind(crypto.randomUUID(),rule.user_id,rule.id,typeof from.id==="string"?from.id:null,detail.slice(0,120)).run();
   await saveDiagnostic(env,"message_send_failed",detail);
   console.error("Falha na resposta privada do Instagram.",detail);
  }
 }
 if(!keywordMatched)await saveDiagnostic(env,"keyword_not_matched",`comment_id=${commentId}`);
}

async function processPayload(payload:unknown,env:Env):Promise<void>{
 const root=valueObject(payload);
 if(!Array.isArray(root.entry))return;
 for(const rawEntry of root.entry){
  const entry=valueObject(rawEntry);
  const entryId=typeof entry.id==="string"?entry.id:"";
  if(!Array.isArray(entry.changes))continue;
  for(const rawChange of entry.changes){
   const change=rawChange as WebhookChange;
   if(change.field!=="comments"||!change.value||typeof change.value!=="object")continue;
   await processComment(entryId,change.value as CommentValue,env);
  }
 }
}

export async function handleInstagramWebhook(request:Request,env:Env):Promise<Response>{
 if(request.method==="GET"){const url=new URL(request.url);const mode=url.searchParams.get("hub.mode")??"";const token=url.searchParams.get("hub.verify_token")??"";const challenge=url.searchParams.get("hub.challenge")??"";if(mode==="subscribe"&&env.META_WEBHOOK_VERIFY_TOKEN&&challenge&&constantTimeEqual(token,env.META_WEBHOOK_VERIFY_TOKEN))return text(challenge);return text("Verificação recusada.",403)}
 if(request.method==="POST"){await saveDiagnostic(env,"webhook_received");if(!env.META_APP_SECRET){await saveDiagnostic(env,"missing_app_secret");return text("Webhook não configurado.",503)}const signature=request.headers.get("x-hub-signature-256")??"";const rawBody=await request.arrayBuffer();if(!(await validSignature(rawBody,signature,env.META_APP_SECRET))){await saveDiagnostic(env,"invalid_signature");return text("Assinatura inválida.",401)}let payload:unknown;try{payload=JSON.parse(new TextDecoder().decode(rawBody))}catch{await saveDiagnostic(env,"invalid_json");return text("Payload inválido.",400)}await saveDiagnostic(env,"payload_authenticated");await processPayload(payload,env);return text("EVENT_RECEIVED")}
 return text("Método não permitido.",405);
}
