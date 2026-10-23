import { z } from "zod";
import { createSession, getSessionUser, isLoginRateLimited, isSameOrigin, recordLoginAttempt, revokeSession } from "./auth";
import type { Env } from "./admin-api";

const MIN_PASSWORD_LENGTH = 6;
const INITIAL_ADMIN_EMAIL = "jvleite7" + "@gmail.com";
const loginSchema = z.object({ login:z.string().trim().min(1).max(254), password:z.string().min(MIN_PASSWORD_LENGTH).max(128) }).strict();

function json(data:unknown,init:ResponseInit={}):Response{const headers=new Headers(init.headers);headers.set("content-type","application/json; charset=utf-8");headers.set("cache-control","no-store");headers.set("x-content-type-options","nosniff");headers.set("x-frame-options","DENY");headers.set("referrer-policy","no-referrer");headers.set("permissions-policy","camera=(), microphone=(), geolocation=()");headers.set("content-security-policy","default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");return new Response(JSON.stringify(data),{...init,headers})}
function fail(){return json({error:"Usuário ou senha inválidos."},{status:401})}

async function tokenMatches(provided:string,expected:string):Promise<boolean>{
 const encoder=new TextEncoder();
 const [providedDigest,expectedDigest]=await Promise.all([
  crypto.subtle.digest("SHA-256",encoder.encode(provided)),
  crypto.subtle.digest("SHA-256",encoder.encode(expected)),
 ]);
 const left=new Uint8Array(providedDigest),right=new Uint8Array(expectedDigest);
 let difference=0;
 for(let index=0;index<left.length;index+=1)difference|=left[index]^right[index];
 return difference===0;
}

export async function login(request:Request,env:Env){
 if(!isSameOrigin(request))return json({error:"Origem não autorizada."},{status:403});
 let body:unknown;try{body=await request.json()}catch{return json({error:"JSON inválido."},{status:400})}
 const parsed=loginSchema.safeParse(body);if(!parsed.success)return json({error:`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`},{status:400});
 const identifier=parsed.data.login.trim();
 const normalizedIdentifier=identifier.toLowerCase();
 if(normalizedIdentifier!=="adm"){if(!(await isLoginRateLimited(env.DB,normalizedIdentifier)))await recordLoginAttempt(env.DB,normalizedIdentifier,false);return fail()}
 if(!env.ADMIN_PASSWORD)return json({error:"Senha administrativa não configurada no Cloudflare."},{status:503});
 const valid=await tokenMatches(parsed.data.password,env.ADMIN_PASSWORD);
 if(!valid){if(await isLoginRateLimited(env.DB,normalizedIdentifier))return json({error:"Muitas tentativas. Tente novamente mais tarde."},{status:429});await recordLoginAttempt(env.DB,normalizedIdentifier,false);return fail()}
 const user=await env.DB.prepare("SELECT id,email,is_active FROM users WHERE email=?1 LIMIT 1").bind(INITIAL_ADMIN_EMAIL).first<{id:string;email:string;is_active:number}>();
 if(!user||!user.is_active)return json({error:"Administrador ADM não encontrado ou inativo no banco."},{status:503});
 await recordLoginAttempt(env.DB,normalizedIdentifier,true);
 await env.DB.prepare("INSERT INTO audit_logs (id,user_id,action,resource_type,outcome) VALUES (?1,?2,'login','session','success')").bind(crypto.randomUUID(),user.id).run();
 return createSession(env.DB,{id:user.id,email:user.email});
}

export async function me(request:Request,env:Env){const user=await getSessionUser(env.DB,request);if(!user)return json({authenticated:false},{status:401});const row=await env.DB.prepare("SELECT must_change_password FROM users WHERE id=?1 LIMIT 1").bind(user.id).first<{must_change_password:number}>();return json({authenticated:true,user:{...user,must_change_password:Number(row?.must_change_password??0)},initial_admin:user.email.toLowerCase()===INITIAL_ADMIN_EMAIL})}

export async function changePassword(request:Request,env:Env){
 if(!isSameOrigin(request))return json({error:"Origem não autorizada."},{status:403});
 const user=await getSessionUser(env.DB,request);if(!user)return json({error:"Não autenticado."},{status:401});
 return json({error:"A senha administrativa é gerenciada pelo Secret ADMIN_PASSWORD no Cloudflare."},{status:409});
}

export async function logout(request:Request,env:Env){if(!isSameOrigin(request))return json({error:"Origem não autorizada."},{status:403});const user=await getSessionUser(env.DB,request);const headers=await revokeSession(env.DB,request);if(user)await env.DB.prepare("INSERT INTO audit_logs (id,user_id,action,resource_type,outcome) VALUES (?1,?2,'logout','session','success')").bind(crypto.randomUUID(),user.id).run();return new Response(null,{status:204,headers})}

export async function setInitialPassword(request:Request,env:Env){
 if(!isSameOrigin(request))return json({error:"Origem não autorizada."},{status:403});
 return json({error:"Primeiro acesso desativado. Configure o Secret ADMIN_PASSWORD no Cloudflare."},{status:410});
}
