import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from '../worker/index.js';
const sql=new DatabaseSync(':memory:');for(const p of ['0001_instagram_initial.sql','0002_video_jobs.sql','0003_instagram_publishing.sql','0004_instagram_diagnostics.sql'])sql.exec(fs.readFileSync('migrations/'+p,'utf8'));
const DB={prepare(query){let args=[];return {bind(...v){args=v.map(x=>x instanceof ArrayBuffer?new Uint8Array(x):x);return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}}}}},async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};
const env={DB,VIDEO_SESSION_SECRET:'test-session-secret',VIDEO_ACCESS_PASSWORD:'test-password',INSTAGRAM_ACCESS_TOKEN:'private-token',META_APP_SECRET:'meta-secret',INSTAGRAM_VERIFY_TOKEN:'verify',ASSETS:{fetch(){return new Response('assets')}}};
const encoder=new TextEncoder();async function hmac(text,secret){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Buffer.from(await crypto.subtle.sign('HMAC',key,encoder.encode(text))).toString('hex')}
const expiry=String(Date.now()+3600000),cookie='video_session='+expiry+'.'+await hmac(expiry,env.VIDEO_SESSION_SECRET);
const origin='https://test.example';async function req(path,method='GET',body,auth=true){const headers={};if(auth)headers.cookie=cookie;if(method!=='GET'){headers.origin=origin;if(body!==undefined)headers['content-type']='application/json'}return worker.fetch(new Request(origin+'/api/instagram/'+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})}),env)}
let calls=[],publishCalls=0;globalThis.fetch=async(url,options={})=>{url=String(url);calls.push({url,options});let data;if(url.includes('/me?'))data={user_id:'123456789',username:'test_account'};else if(url.includes('fields=id,owner'))data={id:'333333333',owner:{id:'123456789'}};else if(url.includes('status_code'))data={status_code:'FINISHED'};else if(url.includes('/media_publish')){publishCalls++;data={id:'444444444'}}else if(url.includes('/media'))data={id:'222222222'};else data={id:'555555555',success:true};return Response.json(data)};
assert.equal((await req('history','GET',undefined,false)).status,401);
const csrf=await worker.fetch(new Request(origin+'/api/instagram/pause',{method:'POST',headers:{cookie,origin:'https://evil.example'}}),env);assert.equal(csrf.status,403);
let r=await req('upload','POST',{mime:'video/mp4',size:3});const upload=await r.json();assert.ok(upload.id);
r=await worker.fetch(new Request(origin+'/api/instagram/upload/'+upload.id+'/0',{method:'PUT',headers:{cookie,origin},body:new Uint8Array([1,2,3])}),env);assert.equal(r.status,200,await r.text());
const row=sql.prepare('SELECT * FROM ig_uploads WHERE id=?').get(upload.id);
assert.equal((await req('media/'+upload.id+'?key=wrong','GET',undefined,false)).status,404);
r=await worker.fetch(new Request(origin+'/api/instagram/media/'+upload.id+'?key='+row.secret,{headers:{range:'bytes=1-2'}}),env);assert.equal(r.status,206);assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[2,3]);
const draft={offerId:'MLB123456789',caption:'Produto de teste',affiliate:'https://example.com/oferta',keyword:'EU QUERO',dm:'Link: {link}',publicReply:'Enviado!',active:true,videoId:upload.id};
r=await req('prepare','POST',draft);const job=await r.json();assert.ok(job.id,JSON.stringify(job));
r=await req('publication/'+job.id);assert.equal((await r.json()).status,'ready');
r=await req('publication/'+job.id,'POST',{});assert.equal((await r.json()).mediaId,'444444444');await req('publication/'+job.id,'POST',{});assert.equal(publishCalls,1);
const event={object:'instagram',entry:[{id:'123456789',changes:[{field:'comments',value:{id:'888888888',media:{id:'444444444'},text:'Eu quero!',from:{id:'999999999'}}}]}]};
async function webhook(payload,signature=true){const body=JSON.stringify(payload);return worker.fetch(new Request(origin+'/api/instagram/webhook',{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':signature?'sha256='+await hmac(body,env.META_APP_SECRET):'invalid'},body}),env)}
assert.equal((await webhook(event,false)).status,401);
assert.equal((await webhook(event)).status,200);assert.equal((await webhook(event)).status,200);
let messages=calls.filter(c=>c.url.endsWith('/messages'));assert.equal(messages.length,1);assert.equal(JSON.parse(messages[0].options.body).message.text,'Link: https://example.com/oferta');assert.equal(sql.prepare('SELECT dm_status FROM ig_delivery').get().dm_status,'sent');
await req('pause','POST',{});event.entry[0].changes[0].value.id='777777777';await webhook(event);assert.equal(calls.filter(c=>c.url.endsWith('/messages')).length,1);
console.log('Instagram tests OK: session, CSRF, uploads, ranges, prepare/publish idempotency, signed webhooks, exact offer link, deduplication and pause.');
// Shared copy survives switching products and never crosses offer IDs.
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};globalThis.window=new EventTarget();
const {loadCopy,saveCopy}=await import('../docs/content-copy.js');
const a={id:'MLB111111111',title:'Fone Bluetooth',affiliate:'https://example.com/a'};
const b={id:'MLB222222222',title:'Panela'};
saveCopy(a.id,{title:'Minha capa',cta:'Comente EU QUERO'});assert.equal(loadCopy(a).title,'Minha capa');assert.notEqual(loadCopy(b).title,'Minha capa');assert.match(loadCopy(a).caption,/https:\/\/example.com\/a/);
console.log('Shared content tests OK: edited copy persists by offer and keeps affiliate caption.');
// A forged state cookie must not authorize an account change without an admin-created request.
const forged='a'.repeat(72);r=await worker.fetch(new Request(origin+'/api/instagram/callback?state='+forged+'&code=bad',{headers:{cookie:'ig_oauth='+forged}}),env);assert.equal(r.status,403);
r=await req('connect','POST',{appId:'123456789'});assert.equal(r.status,200);assert.match((await r.json()).url,/client_id=123456789/);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM ig_oauth_requests').get().n,1);
console.log('OAuth tests OK: one-time state requires an authenticated initiation and supports public app ID.');
// Regression: the word rule works for all requested letter cases in real webhook handling.
const {matchesKeyword}=await import('../worker/comment-matcher.js');
const variants=['EU QUERO','eu quero','Eu quero','Eu Quero','eU qUeRo','💬 eu QUERO!!!','Eu   quero','eu\nquero','eu-quero','eu quéro'];
for(const keyword of ['EU QUERO','eu quero','Eu Quero'])for(const comment of variants)assert.equal(matchesKeyword(comment,keyword),true,comment+' / '+keyword);
assert.equal(matchesKeyword('requeromais','quero'),false);assert.equal(matchesKeyword('seu quero','eu quero'),false);
await req('rule','POST',{mediaId:'444444444',...draft,active:true});
let before=calls.filter(c=>c.url.endsWith('/messages')).length;
for(let i=0;i<variants.length;i++){event.entry[0].id='123456789';event.entry[0].changes[0].value={id:String(900000000+i),media:{id:'444444444'},text:variants[i],from:{id:'999999999'}};assert.equal((await webhook(event)).status,200)}
assert.equal(calls.filter(c=>c.url.endsWith('/messages')).length,before+variants.length);
assert.ok(calls.some(c=>c.url.endsWith('/subscribed_apps')&&JSON.parse(c.options.body).subscribed_fields==='comments,messages'));
// Alternate webhook account identifiers require verified media ownership, as in the original's fallback.
event.entry[0].id='666666666';event.entry[0].changes[0].value.id='911111111';before=calls.filter(c=>c.url.endsWith('/messages')).length;await webhook(event);assert.equal(calls.filter(c=>c.url.endsWith('/messages')).length,before+1);
const originalFetch=globalThis.fetch;globalThis.fetch=async(url,options)=>String(url).includes('fields=id,owner')?Response.json({id:'444444444',owner:{id:'666666666'}}):originalFetch(url,options);
event.entry[0].changes[0].value.id='922222222';await webhook(event);assert.equal(calls.filter(c=>c.url.endsWith('/messages')).length,before+1);assert.equal(sql.prepare('SELECT status FROM ig_diagnostics WHERE id=?').get('922222222').status,'account_mismatch');
globalThis.fetch=async(url,options)=>String(url).endsWith('/messages')?Response.json({error:{message:'Permissão de mensagens ausente',code:10}},{status:400}):originalFetch(url,options);
event.entry[0].id='123456789';event.entry[0].changes[0].value.id='933333333';await webhook(event);await webhook(event);assert.equal(sql.prepare('SELECT dm_status FROM ig_delivery WHERE comment_id=?').get('933333333').dm_status,'check_required');assert.match(sql.prepare('SELECT detail FROM ig_diagnostics WHERE id=?').get('933333333').detail,/Meta 10/);
globalThis.fetch=originalFetch;
const containerRequest=calls.find(c=>c.url.endsWith('/media')&&c.options.method==='POST');assert.equal(Object.hasOwn(JSON.parse(containerRequest.options.body),'cover_url'),false);
const ui=fs.readFileSync('docs/instagram-studio.js','utf8'),html=fs.readFileSync('docs/index.html','utf8');assert.doesNotMatch(ui,/MediaRecorder|captureStream|blobCanvas|coverId/);assert.doesNotMatch(html,/id="ig-(cover|burn|download-cover|title|subtitle|cta|support)"/);
console.log('Comment regression tests OK: all letter cases, punctuation, ownership fallback, foreign media rejection, subscription and visible Meta failures. Original video only; no overlay/canvas/cover upload.');
