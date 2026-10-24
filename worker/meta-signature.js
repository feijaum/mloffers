// Same raw-body HMAC-SHA256 validation used by instagram-comment-dm.
const encoder=new TextEncoder();
function constantTimeEqual(left,right){if(left.length!==right.length)return false;let difference=0;for(let index=0;index<left.length;index++)difference|=left.charCodeAt(index)^right.charCodeAt(index);return difference===0}
function bytesToHex(bytes){return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('')}
export async function validateMetaSignature(body,signature,appSecret){
 if(!appSecret)return {valid:false,reason:'missing_secret'};
 if(!signature)return {valid:false,reason:'missing_header'};
 if(!/^sha256=[a-f0-9]{64}$/i.test(signature))return {valid:false,reason:'malformed_header'};
 const key=await crypto.subtle.importKey('raw',encoder.encode(appSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',key,body);
 const valid=constantTimeEqual(signature.slice(7).toLowerCase(),bytesToHex(new Uint8Array(digest)));
 return {valid,reason:valid?'verified':'mismatch'};
}
export const webhookVerifyToken=env=>env.INSTAGRAM_VERIFY_TOKEN||env.META_WEBHOOK_VERIFY_TOKEN||'';
