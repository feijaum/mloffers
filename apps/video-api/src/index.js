// Backend separado: nunca publique GOOGLE_API_KEY no site estático.
const google = 'https://generativelanguage.googleapis.com/v1beta/';
const json = (obj,status=200,headers={}) => new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});
const validOperation = s => /^models\/[a-zA-Z0-9._-]+\/operations\/[a-zA-Z0-9._-]+$/.test(s) || /^operations\/[a-zA-Z0-9._-]+$/.test(s);
export default {async fetch(req,env){
 const origin=req.headers.get('origin');const cors=origin===env.ALLOWED_ORIGIN?{'access-control-allow-origin':origin,'vary':'Origin'}:{};
 if(req.method==='OPTIONS')return origin===env.ALLOWED_ORIGIN?new Response(null,{status:204,headers:{...cors,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization, content-type'}}):json({error:'Origin não permitido'},403);
 const path=new URL(req.url).pathname;
 if(path==='/api/health'&&req.method==='GET')return json({service:'mloffers-video-api',configured:Boolean(env.GOOGLE_API_KEY&&env.ADMIN_API_TOKEN),model:env.VEO_MODEL||'veo-3.1-generate-preview'},200,cors);
 // Apenas chamadas de servidor autenticadas. Não embutir ADMIN_API_TOKEN no JS público.
 const auth=req.headers.get('authorization');if(!env.ADMIN_API_TOKEN||auth!==`Bearer ${env.ADMIN_API_TOKEN}`)return json({error:'Não autorizado'},401,cors);
 if(!env.GOOGLE_API_KEY)return json({error:'GOOGLE_API_KEY não configurada'},503,cors);
 if(path==='/api/video/generate'&&req.method==='POST'){
   let data;try{data=await req.json()}catch{return json({error:'JSON inválido'},400,cors)}
   const prompt=data?.prompt;if(typeof prompt!=='string'||prompt.length<10||prompt.length>4000)return json({error:'Prompt deve ter entre 10 e 4000 caracteres'},400,cors);
   const model=env.VEO_MODEL||'veo-3.1-generate-preview';
   const response=await fetch(`${google}models/${encodeURIComponent(model)}:predictLongRunning`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':env.GOOGLE_API_KEY},body:JSON.stringify({instances:[{prompt}],parameters:{sampleCount:1}})});
   const result=await response.json().catch(()=>({error:'Resposta inválida da API Google'}));return json(result,response.status,cors);
 }
 if(path==='/api/video/status'&&req.method==='GET'){
   const op=new URL(req.url).searchParams.get('operation')||'';if(!validOperation(op))return json({error:'Identificador da operação inválido'},400,cors);
   const response=await fetch(`${google}${op}`,{headers:{'x-goog-api-key':env.GOOGLE_API_KEY}});return json(await response.json().catch(()=>({error:'Resposta inválida'})),response.status,cors);
 }
 return json({error:'Rota não encontrada'},404,cors);
}};
