/* Observatório ML PWA: cache apenas dos recursos da aplicação.
   Capturas compartilhadas pelo usuário são armazenadas TEMPORARIAMENTE no navegador. */
const CACHE='observatorio-ml-pages-v3';
const SHARES='observatorio-ml-shares-v1';
const ASSETS=['./','./index.html','./style.css','./app.js','./video-studio.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))
);
self.addEventListener('activate',event=>
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x!==CACHE&&x!==SHARES).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))
);
function scoped(path){return new URL(path,self.registration.scope)}
async function receiveSharedFiles(request){
 let fd;try{fd=await request.formData()}catch{return Response.redirect(scoped('./?share_error=1'),303)}
 const files=fd.getAll('files').filter(f=>f&&typeof f.name==='string'&&/\.(html?|csv|json)$/i.test(f.name)&&f.size>0&&f.size<=15*1024*1024).slice(0,12);
 if(!files.length)return Response.redirect(scoped('./?share_error=1'),303);
 const cache=await caches.open(SHARES);
 const meta=[];
 for(let i=0;i<files.length;i++){
  const file=files[i],key='./__pending_share_'+i;
  await cache.put(scoped(key),new Response(file,{headers:{'content-type':file.type||'application/octet-stream'}}));
  meta.push({key,name:file.name.slice(0,180),type:file.type||''});
 }
 await cache.put(scoped('./__pending_manifest'),new Response(JSON.stringify(meta),{headers:{'content-type':'application/json'}}));
 return Response.redirect(scoped('./?import_share=1'),303);
}
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method==='POST'&&url.origin===self.location.origin&&url.pathname===scoped('./shared').pathname){
  event.respondWith(receiveSharedFiles(req));return;
 }
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 event.respondWith(fetch(req).then(resp=>{
  if(resp.ok&&!url.pathname.includes('__pending_')){
   const clone=resp.clone();
   caches.open(CACHE).then(cache=>cache.put(req,clone)).catch(()=>{});
  }
  return resp;
 }).catch(()=>caches.match(req)));
});