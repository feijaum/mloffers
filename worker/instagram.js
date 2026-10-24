import { session, videoApi } from './video.js';
import { matchesKeyword } from './comment-matcher.js';
const enc=new TextEncoder();
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const sameOrigin=r=>r.headers.get('origin')===new URL(r.url).origin&&r.headers.get('sec-fetch-site')!=='cross-site';
const scopes=['instagram_business_basic','instagram_business_content_publish','instagram_business_manage_comments','instagram_business_manage_messages'];
const text=(value,max)=>String(value??'').trim().slice(0,max);
const validId=id=>/^\d{5,32}$/.test(id||'');
export function validLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
export async function graph(path,token,body){
 const url=new URL('https://graph.instagram.com/'+path);
 const response=await fetch(url,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error)throw fail((data.error?.message||'Falha na API do Instagram (HTTP '+response.status+')')+(data.error?.code?' [Meta '+data.error.code+(data.error.error_subcode?'/'+data.error.error_subcode:'')+']':''),502);
 return data;
}
async function cryptKey(env){if(!env.VIDEO_SESSION_SECRET)throw fail('Configure VIDEO_SESSION_SECRET',503);return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode(env.VIDEO_SESSION_SECRET)),'AES-GCM',false,['encrypt','decrypt'])}
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function seal(value,env){const iv=crypto.getRandomValues(new Uint8Array(12));return b64(iv)+'.'+b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},await cryptKey(env),enc.encode(value)))}
async function unseal(value,env){const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},await cryptKey(env),unb64(data)))}
async function connection(env){
 const c=await env.DB.prepare('SELECT * FROM ig_connection WHERE id=1').first();
 if(c){if(c.expires_at&&c.expires_at<Date.now())throw fail('A conexão expirou. Reconecte o Instagram.',401);return {...c,accessToken:await unseal(c.token,env)}}
 if(env.INSTAGRAM_ACCESS_TOKEN){const p=await graph('me?fields=user_id,id,username',env.INSTAGRAM_ACCESS_TOKEN);return {account_id:String(p.user_id||p.id),username:p.username,accessToken:env.INSTAGRAM_ACCESS_TOKEN}}
 throw fail('Conecte sua conta profissional do Instagram.',409);
}
async function remember(token,expires,env){const p=await graph('me?fields=user_id,id,username',token);const id=String(p.user_id||p.id||'');if(!validId(id))throw fail('A Meta não retornou a conta profissional.',502);await env.DB.prepare('INSERT OR REPLACE INTO ig_connection (id,account_id,username,token,expires_at) VALUES (1,?1,?2,?3,?4)').bind(id,p.username||'',await seal(token,env),Date.now()+Number(expires||5184000)*1000).run();return id}
function stateCookie(value,age){return 'ig_oauth='+value+'; HttpOnly; Secure; SameSite=Lax; Path=/api/instagram; Max-Age='+age}
async function cleanup(env){const cutoff=Date.now()-86400000;await env.DB.prepare('DELETE FROM ig_upload_chunks WHERE upload_id IN (SELECT id FROM ig_uploads WHERE created_at<?1)').bind(cutoff).run();await env.DB.prepare('DELETE FROM ig_uploads WHERE created_at<?1').bind(cutoff).run()}
async function serveMedia(request,env,url){
 const id=url.pathname.split('/').pop();const row=await env.DB.prepare('SELECT * FROM ig_uploads WHERE id=?1 AND secret=?2 AND complete=1 AND created_at>?3').bind(id,url.searchParams.get('key')||'',Date.now()-86400000).first();
 if(!row)return new Response('Arquivo expirado ou indisponível',{status:404});
 // Meta may request byte ranges while ingesting a Reel.
 let start=0,end=row.size-1;const range=request.headers.get('range');
 if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m)return new Response(null,{status:416});if(!m[1])start=Math.max(0,row.size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]))}if(start>end||start>=row.size)return new Response(null,{status:416,headers:{'content-range':'bytes */'+row.size}})}
 const first=Math.floor(start/1048576),last=Math.floor(end/1048576);let part=first;
 const stream=new ReadableStream({async pull(controller){try{if(part>last){controller.close();return}const r=await env.DB.prepare('SELECT data FROM ig_upload_chunks WHERE upload_id=?1 AND part=?2').bind(id,part).first();if(!r)throw Error('Bloco ausente');const bytes=new Uint8Array(r.data);const lo=part===first?start%1048576:0;const hi=part===last?end%1048576+1:bytes.length;controller.enqueue(bytes.slice(lo,hi));part++}catch(e){controller.error(e)}}});
 const headers={'content-type':row.mime,'content-length':String(end-start+1),'accept-ranges':'bytes','cache-control':'private, no-store','x-content-type-options':'nosniff'};if(range)headers['content-range']=`bytes ${start}-${end}/${row.size}`;
 return new Response(request.method==='HEAD'?null:stream,{status:range?206:200,headers});
}
export async function instagramApi(request,env,url){try{
 const path=url.pathname,method=request.method;
 if(!env.DB)return json({error:'Banco D1 indisponível'},503);
 if(path.startsWith('/api/instagram/media/')&&['GET','HEAD'].includes(method))return serveMedia(request,env,url);
 if(path==='/api/instagram/login'){const u=new URL(request.url);u.pathname='/api/video/login';return videoApi(new Request(u,request),env,u)}
 if(path==='/api/instagram/auth')return json({authenticated:await session(request,env),configured:Boolean(env.VIDEO_ACCESS_PASSWORD&&env.VIDEO_SESSION_SECRET),oauthConfigured:Boolean((env.INSTAGRAM_APP_ID||env.META_APP_ID)&&env.META_APP_SECRET),scopes});
 // OAuth callback uses one-time state cookie, independent of Strict admin session.
 if(path==='/api/instagram/callback'&&method==='GET'){
  const cookie=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ig_oauth='))?.slice(9);
  if(!cookie||cookie!==url.searchParams.get('state')||cookie.length<32)throw fail('Estado OAuth inválido. Inicie a conexão pelo painel.',403);
  const pending=await env.DB.prepare('SELECT app_id FROM ig_oauth_requests WHERE state=?1 AND expires_at>?2').bind(cookie,Date.now()).first();
  if(!pending)throw fail('Conexão não iniciada pelo painel ou expirada.',403);
  const claim=await env.DB.prepare('DELETE FROM ig_oauth_requests WHERE state=?1').bind(cookie).run();if(!claim.meta.changes)throw fail('Autorização já utilizada.',403);
  if(url.searchParams.has('error'))throw fail('Autorização cancelada no Instagram.');
  const form=new URLSearchParams({client_id:pending.app_id,client_secret:env.META_APP_SECRET,grant_type:'authorization_code',redirect_uri:url.origin+'/api/instagram/callback',code:url.searchParams.get('code')||''});
  const response=await fetch('https://api.instagram.com/oauth/access_token',{method:'POST',body:form});const short=await response.json();if(!response.ok||!short.access_token)throw fail('Não foi possível concluir a autorização Meta.',502);
  const exchange=new URL('https://graph.instagram.com/access_token');exchange.search=new URLSearchParams({grant_type:'ig_exchange_token',client_secret:env.META_APP_SECRET,access_token:short.access_token});
  const longResponse=await fetch(exchange);const long=await longResponse.json();if(!longResponse.ok||!long.access_token)throw fail('Falha ao obter token de longa duração.',502);
  await remember(long.access_token,long.expires_in,env);
  return new Response(null,{status:303,headers:{location:url.origin+'/#instagram','set-cookie':stateCookie('',0),'cache-control':'no-store'}});
 }
 if(!await session(request,env))return json({error:'Entre com a senha do painel.'},401);
 if(method!=='GET'&&!sameOrigin(request))return json({error:'Origem inválida'},403);
 if(path==='/api/instagram/connect'&&method==='POST'){
  const input=await request.json().catch(()=>({}));const appId=text(input.appId||env.INSTAGRAM_APP_ID||env.META_APP_ID,32);
  if(!/^\d{5,32}$/.test(appId))throw fail('Informe o ID público do aplicativo Instagram para iniciar a autorização.');
  if(!env.META_APP_SECRET)throw fail('Configure META_APP_SECRET no Worker.',503);
  const state=crypto.randomUUID()+crypto.randomUUID();await env.DB.prepare('DELETE FROM ig_oauth_requests WHERE expires_at<?1').bind(Date.now()).run();await env.DB.prepare('INSERT INTO ig_oauth_requests (state,app_id,expires_at) VALUES (?1,?2,?3)').bind(state,appId,Date.now()+600000).run();const target=new URL('https://www.instagram.com/oauth/authorize');target.search=new URLSearchParams({client_id:appId,redirect_uri:url.origin+'/api/instagram/callback',response_type:'code',scope:scopes.join(','),state,enable_fb_login:'0',force_authentication:'1'});
  return json({url:target.href},200,{'set-cookie':stateCookie(state,600)});
 }
 if(path==='/api/instagram/status'){
  let c;try{c=await connection(env)}catch(e){return json({connected:false,error:e.message,callback:url.origin+'/api/instagram/callback',webhook:url.origin+'/api/instagram/webhook'})}
  return json({connected:true,account:{id:c.account_id,username:c.username},webhookConfigured:Boolean(env.META_APP_SECRET&&env.INSTAGRAM_VERIFY_TOKEN),callback:url.origin+'/api/instagram/callback',webhook:url.origin+'/api/instagram/webhook'});
 }
 if(path==='/api/instagram/upload'&&method==='POST'){
  await cleanup(env);const b=await request.json();if(b.mime!=='video/mp4'||!Number.isInteger(b.size)||b.size<1||b.size>40*1024*1024)throw fail('Envie um vídeo MP4 até 40 MB.');
  const total=await env.DB.prepare('SELECT COALESCE(SUM(size),0) AS total FROM ig_uploads').first();if(total.total+b.size>160*1024*1024)throw fail('Armazenamento temporário cheio. Aguarde a expiração dos arquivos (24h).',429);
  const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO ig_uploads (id,secret,mime,size,created_at) VALUES (?1,?2,?3,?4,?5)').bind(id,crypto.randomUUID()+crypto.randomUUID(),b.mime,b.size,Date.now()).run();return json({id});
 }
 const upload=path.match(/^\/api\/instagram\/upload\/([a-f0-9-]{36})\/(\d+)$/);
 if(upload&&method==='PUT'){
  const row=await env.DB.prepare('SELECT * FROM ig_uploads WHERE id=?1 AND complete=0').bind(upload[1]).first();if(!row)throw fail('Upload indisponível.');const part=Number(upload[2]);if(part!==row.chunks)throw fail('Sequência de upload inválida.');const bytes=await request.arrayBuffer();const expected=Math.min(1048576,row.size-part*1048576);if(expected<=0||bytes.byteLength!==expected)throw fail('Tamanho de bloco inválido.');
  await env.DB.batch([env.DB.prepare('INSERT INTO ig_upload_chunks (upload_id,part,data) VALUES (?1,?2,?3)').bind(row.id,part,bytes),env.DB.prepare('UPDATE ig_uploads SET chunks=chunks+1,complete=?1 WHERE id=?2').bind((part+1)*1048576>=row.size?1:0,row.id)]);return json({complete:(part+1)*1048576>=row.size});
 }
 if(path==='/api/instagram/history'&&method==='GET'){
  const publications=await env.DB.prepare('SELECT id,offer_id,status,media_id,error,created_at FROM ig_publications ORDER BY created_at DESC LIMIT 20').all();const actions=await env.DB.prepare('SELECT * FROM ig_delivery ORDER BY created_at DESC LIMIT 30').all();const diagnostics=await env.DB.prepare('SELECT id,status,detail,updated_at FROM ig_diagnostics ORDER BY updated_at DESC LIMIT 20').all();const webhook=await env.DB.prepare('SELECT COUNT(*) AS received,MAX(received_at) AS last_received FROM instagram_webhook_events').first();const rules=await env.DB.prepare('SELECT COUNT(*) AS total,COALESCE(SUM(active),0) AS active FROM instagram_posts').first();return json({publications:publications.results,actions:actions.results,diagnostics:diagnostics.results,webhook,rules});
 }
 const c=await connection(env);
 if(path==='/api/instagram/sync'&&method==='POST'){await ensureSubscription(env,c);return json({success:true})}
 if(path==='/api/instagram/posts'&&method==='GET'){
  const remote=await graph(c.account_id+'/media?fields=id,caption,permalink,thumbnail_url,media_type&limit=30',c.accessToken);
  const rules=await env.DB.prepare('SELECT p.*,r.dm,r.public_reply FROM instagram_posts p LEFT JOIN ig_rules r ON p.media_id=r.media_id').all();return json({posts:(remote.data||[]).map(p=>({...p,rule:rules.results.find(r=>r.media_id===p.id)||null}))});
 }
 if(path==='/api/instagram/rule'&&method==='POST'){
  const b=await request.json();if(!validId(b.mediaId)||!validLink(b.affiliate)||!text(b.keyword,80)||!text(b.dm,900))throw fail('Preencha publicação, link HTTPS, palavra-chave e mensagem.');
  const media=await graph(b.mediaId+'?fields=id,owner',c.accessToken);if(String(media.owner?.id||media.owner)!==String(c.account_id))throw fail('Esta publicação não pertence à conta conectada.',403);
  const warning=await saveRule(env,b.mediaId,b,c);return json({success:true,warning});
 }
 if(path==='/api/instagram/pause'&&method==='POST'){await env.DB.prepare('UPDATE instagram_posts SET active=0').run();return json({success:true})}
 if(path==='/api/instagram/prepare'&&method==='POST'){
  const b=await request.json();if(!text(b.offerId,40)||!text(b.caption,2200)||String(b.caption).length>2200||!validLink(b.affiliate)||!text(b.keyword,80)||!text(b.dm,900))throw fail('Confira oferta, legenda (até 2.200 caracteres), link HTTPS e automação.');
  const video=await env.DB.prepare('SELECT * FROM ig_uploads WHERE id=?1 AND complete=1 AND mime=?2 AND created_at>?3').bind(b.videoId,'video/mp4',Date.now()-86400000).first();if(!video)throw fail('Envie o vídeo novamente.');
  const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO ig_publications (id,offer_id,caption,affiliate_url,keyword,dm,public_reply,active,status,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,\'preparing\',?9)').bind(id,text(b.offerId,40),b.caption,b.affiliate,text(b.keyword,80),text(b.dm,900),text(b.publicReply,300),b.active===true?1:0,Date.now()).run();
  const mediaUrl=r=>url.origin+'/api/instagram/media/'+r.id+'?key='+r.secret;
  try{const container=await graph(c.account_id+'/media',c.accessToken,{media_type:'REELS',video_url:mediaUrl(video),caption:b.caption,share_to_feed:true});if(!validId(container.id))throw Error('Container inválido');await env.DB.prepare('UPDATE ig_publications SET container_id=?1,status=\'processing\' WHERE id=?2').bind(container.id,id).run();return json({id,status:'processing'});}catch(e){await env.DB.prepare('UPDATE ig_publications SET status=\'failed\',error=?1 WHERE id=?2').bind(e.message,id).run();throw e}
 }
 const job=path.match(/^\/api\/instagram\/publication\/([a-f0-9-]{36})$/);
 if(job){const p=await env.DB.prepare('SELECT * FROM ig_publications WHERE id=?1').bind(job[1]).first();if(!p)throw fail('Publicação não encontrada.',404);
  if(method==='GET'){if(p.status==='processing'){const state=await graph(p.container_id+'?fields=status_code,status',c.accessToken);if(state.status_code==='FINISHED')p.status='ready';else if(['ERROR','EXPIRED'].includes(state.status_code)){p.status='failed';p.error=state.status||state.status_code;}await env.DB.prepare('UPDATE ig_publications SET status=?1,error=?2 WHERE id=?3').bind(p.status,p.error,p.id).run()}return json({id:p.id,status:p.status,error:p.error,mediaId:p.media_id})}
  if(method==='POST'){
   if(p.status==='published')return json({mediaId:p.media_id,status:p.status});if(p.status!=='ready')throw fail('Aguarde o processamento do vídeo.');
   const claim=await env.DB.prepare('UPDATE ig_publications SET status=\'publishing\' WHERE id=?1 AND status=\'ready\'').bind(p.id).run();if(!claim.meta.changes)throw fail('Publicação já em andamento.',409);
   let result;try{result=await graph(c.account_id+'/media_publish',c.accessToken,{creation_id:p.container_id});if(!validId(result.id))throw Error('Resposta de publicação sem ID.')}catch(e){await env.DB.prepare('UPDATE ig_publications SET status=\'check_required\',error=?1 WHERE id=?2').bind('Confira no Instagram antes de tentar novamente: '+e.message,p.id).run();throw e}
   // Save the remote ID before any rule write so failures can never cause a duplicate publish.
   await env.DB.prepare('UPDATE ig_publications SET media_id=?1,status=\'published\' WHERE id=?2').bind(result.id,p.id).run();
   let warning;try{warning=await saveRule(env,result.id,{caption:p.caption,affiliate:p.affiliate_url,keyword:p.keyword,dm:p.dm,publicReply:p.public_reply,active:!!p.active},c)}catch{ return json({mediaId:result.id,status:'published',warning:'Reel publicado. Vincule a automação na lista de publicações.'}) }
   return json({mediaId:result.id,status:'published',warning});
  }
 }
 return json({error:'Rota Instagram não encontrada'},404);
 }catch(e){return json({error:e.message||'Falha na integração Instagram'},e.status||500)}}
async function saveRule(env,id,b,c){await env.DB.batch([env.DB.prepare('INSERT INTO instagram_posts (media_id,caption,affiliate_url,keyword,active) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(media_id) DO UPDATE SET caption=excluded.caption,affiliate_url=excluded.affiliate_url,keyword=excluded.keyword,active=excluded.active').bind(id,text(b.caption,2200),b.affiliate,text(b.keyword,80),b.active===true?1:0),env.DB.prepare('INSERT OR REPLACE INTO ig_rules (media_id,dm,public_reply) VALUES (?1,?2,?3)').bind(id,text(b.dm,900),text(b.publicReply,300))]);if(b.active===true){try{await ensureSubscription(env,c)}catch(e){return 'Regra salva, mas a Meta não ativou o recebimento: '+e.message}}return null;}
export async function diagnostic(env,id,status,detail=''){
 await env.DB.prepare('INSERT INTO ig_diagnostics (id,status,detail,updated_at) VALUES (?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET status=excluded.status,detail=excluded.detail,updated_at=excluded.updated_at').bind(id,status,String(detail).slice(0,500),Date.now()).run();
}
async function ensureSubscription(env,c){
 try{const sub=await graph(c.account_id+'/subscribed_apps',c.accessToken,{subscribed_fields:'comments,messages'});if(!sub.success)throw Error('A Meta não confirmou a assinatura.');await diagnostic(env,'subscription','subscribed','Recebimento de comentários ativado.');return sub}
 catch(e){await diagnostic(env,'subscription','subscription_failed',e.message);throw e}
}
export async function processComments(payload,env){
 let c;try{c=await connection(env)}catch(e){await diagnostic(env,'connection','connection_failed',e.message);throw e}
 for(const entry of payload.entry||[]){
 for(const change of entry.changes||[]){
 if(change?.field!=='comments')continue;
 const v=change.value,id=String(v?.id||''),media=String(v?.media?.id||'');
 if(!validId(id)||!validId(media)||typeof v?.text!=='string'){await diagnostic(env,'payload','invalid_comment_payload','Comentário sem ID, publicação ou texto.');continue}
 const rule=await env.DB.prepare('SELECT p.*,r.dm,r.public_reply FROM instagram_posts p LEFT JOIN ig_rules r ON p.media_id=r.media_id WHERE p.media_id=?1').bind(media).first();
 if(!rule){await diagnostic(env,id,'rule_not_found','Não há regra vinculada à publicação '+media+'.');continue}
 if(!rule.active){await diagnostic(env,id,'rule_paused','A automação desta publicação está desativada.');continue}
 if(!rule.dm||!validLink(rule.affiliate_url)){await diagnostic(env,id,'rule_incomplete','Preencha a mensagem e o link de afiliado.');continue}
 // Some Meta events use a different account identifier. Verify media ownership
 // instead of silently discarding a legitimate comment or trusting another account.
 if(String(entry.id)!==String(c.account_id)){
  try{const [m,p]=await Promise.all([graph(media+'?fields=id,owner',c.accessToken),graph('me?fields=id,user_id,username',c.accessToken)]);const owner=String(m.owner?.id||m.owner||'');const ownIds=[c.account_id,p.id,p.user_id].filter(Boolean).map(String);if(!ownIds.includes(owner))throw Error('Publicação não pertence à conta conectada.');}
  catch(e){await diagnostic(env,id,'account_mismatch',e.message);continue}
 }
 if(!matchesKeyword(v.text,rule.keyword)){await diagnostic(env,id,'keyword_not_matched','O comentário não contém a palavra-chave configurada.');continue}
 const claimed=await env.DB.prepare('INSERT OR IGNORE INTO ig_delivery (comment_id,media_id,dm_status,created_at) VALUES (?1,?2,\'sending\',?3)').bind(id,media,Date.now()).run();if(!claimed.meta.changes)continue;
 try{
  const message=rule.dm.replaceAll('{link}',rule.affiliate_url);
  await graph(c.account_id+'/messages',c.accessToken,{recipient:{comment_id:id},message:{text:message}});
  await env.DB.prepare('UPDATE ig_delivery SET dm_status=\'sent\' WHERE comment_id=?1').bind(id).run();await diagnostic(env,id,'message_sent','Resposta privada aceita pela API do Instagram.');
 }catch(e){await env.DB.prepare('UPDATE ig_delivery SET dm_status=\'check_required\',error=?1 WHERE comment_id=?2').bind(e.message,id).run();await diagnostic(env,id,'message_send_failed',e.message);continue}
 if(rule.public_reply){try{await graph(id+'/replies',c.accessToken,{message:rule.public_reply});await env.DB.prepare('UPDATE ig_delivery SET reply_status=\'sent\' WHERE comment_id=?1').bind(id).run()}catch(e){await env.DB.prepare('UPDATE ig_delivery SET reply_status=\'failed\',error=?1 WHERE comment_id=?2').bind(e.message,id).run();await diagnostic(env,id,'public_reply_failed',e.message)}}
 }}
 // Keep diagnostics bounded without keeping commenters' names or message text.
 await env.DB.prepare('DELETE FROM ig_diagnostics WHERE id NOT IN (SELECT id FROM ig_diagnostics ORDER BY updated_at DESC LIMIT 100)').run();
}
