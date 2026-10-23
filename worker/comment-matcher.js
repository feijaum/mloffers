// Etapa segura: identifica comentários elegíveis, SEM executar respostas privadas.
// Apenas regras explicitamente ativadas em instagram_posts podem produzir pendências.
export function normalizeComment(value) {
  return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
}
export function matchesKeyword(text,keyword) {
  const needle=normalizeComment(keyword);
  return Boolean(needle)&&(" "+normalizeComment(text)+" ").includes(" "+needle+" ");
}
export async function registerEligibleComments(payload,db) {
  let matched=0;
  for(const entry of payload.entry||[]) {
    if(!entry||!Array.isArray(entry.changes))continue;
    for(const change of entry.changes) {
      if(change?.field!=="comments")continue;
      const value=change.value;
      const commentId=String(value?.id||"");
      const mediaId=String(value?.media?.id||"");
      const message=typeof value?.text==="string"?value.text:"";
      // Não armazenar informação de remetentes nem conteúdo de comentários nessa tabela.
      if(!/^\d{5,32}$/.test(commentId)||!/^\d{5,32}$/.test(mediaId)||!message)continue;
      const post=await db.prepare("SELECT keyword FROM instagram_posts WHERE media_id=?1 AND active=1 AND affiliate_url LIKE 'https://%' LIMIT 1").bind(mediaId).first();
      if(!post||!matchesKeyword(message,post.keyword))continue;
      const result=await db.prepare("INSERT OR IGNORE INTO instagram_comment_actions (comment_id,media_id,status) VALUES (?1,?2,'ready_for_review')").bind(commentId,mediaId).run();
      if(result.meta?.changes)matched++;
    }
  }
  return matched;
}
