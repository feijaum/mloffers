import type { Env } from "./admin-api";
import { getSessionUser, isSameOrigin } from "./auth";

type InstagramProfile = { id?: string; user_id?: string; username?: string };
type InstagramMedia = { id?: string; caption?: string; permalink?: string; media_type?: string; media_url?: string; thumbnail_url?: string; timestamp?: string };
type InstagramMediaResponse = { data?: InstagramMedia[]; paging?: { next?: string } };

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

async function graphJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : {};
    throw new Error(typeof error.message === "string" ? error.message : `Instagram respondeu HTTP ${response.status}.`);
  }
  return body as T;
}

async function subscribeInstagramWebhooks(accountId: string, accessToken: string): Promise<void> {
  const url = new URL(`https://graph.instagram.com/${encodeURIComponent(accountId)}/subscribed_apps`);
  url.searchParams.set("subscribed_fields", "comments,messages");
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || body.success !== true) {
    const error = body.error && typeof body.error === "object" ? body.error as Record<string, unknown> : {};
    throw new Error(typeof error.message === "string"
      ? `Não foi possível ativar os webhooks: ${error.message}`
      : `Não foi possível ativar os webhooks (HTTP ${response.status}).`);
  }
}

export async function syncInstagram(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, { status: 405 });
  if (!isSameOrigin(request)) return json({ error: "Origem não autorizada." }, { status: 403 });
  const sessionUser = await getSessionUser(env.DB, request);
  if (!sessionUser) return json({ error: "Não autenticado." }, { status: 401 });
  if (!env.INSTAGRAM_ACCESS_TOKEN) return json({ error: "INSTAGRAM_ACCESS_TOKEN não configurado." }, { status: 503 });

  const owner = await env.DB.prepare(
    "SELECT id FROM users WHERE email='jvleite7@gmail.com' AND is_active=1 LIMIT 1",
  ).first<{ id: string }>();
  if (!owner) return json({ error: "Administrador não encontrado." }, { status: 503 });

  try {
    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "id,user_id,username");
    const profile = await graphJson<InstagramProfile>(profileUrl.toString(), env.INSTAGRAM_ACCESS_TOKEN);
    const providerAccountId = profile.user_id ?? profile.id;
    if (!providerAccountId) throw new Error("A Meta não retornou o ID da conta profissional.");

    await subscribeInstagramWebhooks(providerAccountId, env.INSTAGRAM_ACCESS_TOKEN);

    let account = await env.DB.prepare(
      "SELECT id FROM instagram_accounts WHERE user_id=?1 AND provider_account_id=?2 LIMIT 1",
    ).bind(owner.id, providerAccountId).first<{ id: string }>();

    if (!account) {
      const accountId = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO instagram_accounts (id,user_id,provider_account_id,username,is_active) VALUES (?1,?2,?3,?4,1)",
      ).bind(accountId, owner.id, providerAccountId, profile.username ?? "instagram").run();
      account = { id: accountId };
    } else {
      await env.DB.prepare(
        "UPDATE instagram_accounts SET username=?1,is_active=1,updated_at=datetime('now') WHERE id=?2",
      ).bind(profile.username ?? "instagram", account.id).run();
    }

    const mediaUrl = new URL("https://graph.instagram.com/me/media");
    mediaUrl.searchParams.set("fields", "id,caption,permalink,media_type,media_url,thumbnail_url,timestamp");
    mediaUrl.searchParams.set("limit", "100");
    const mediaResponse = await graphJson<InstagramMediaResponse>(mediaUrl.toString(), env.INSTAGRAM_ACCESS_TOKEN);
    let synchronized = 0;

    for (const media of mediaResponse.data ?? []) {
      if (!media.id) continue;
      const title = (media.caption?.trim() || `${media.media_type ?? "Publicação"} · ${media.id}`).slice(0, 200);
      const thumbnailUrl = media.thumbnail_url ?? media.media_url ?? null;
      const permalink = media.permalink ?? null;
      const existing = await env.DB.prepare(
        "SELECT id FROM posts WHERE instagram_account_id=?1 AND provider_post_id=?2 LIMIT 1",
      ).bind(account.id, media.id).first<{ id: string }>();
      if (existing) {
        await env.DB.prepare(
          "UPDATE posts SET title=?1,thumbnail_url=?2,permalink=?3,is_active=1,updated_at=datetime('now') WHERE id=?4",
        ).bind(title, thumbnailUrl, permalink, existing.id).run();
      } else {
        await env.DB.prepare(
          "INSERT INTO posts (id,user_id,instagram_account_id,provider_post_id,title,thumbnail_url,permalink,is_active) VALUES (?1,?2,?3,?4,?5,?6,?7,1)",
        ).bind(crypto.randomUUID(), owner.id, account.id, media.id, title, thumbnailUrl, permalink).run();
      }
      synchronized += 1;
    }

    return json({
      success: true,
      account: { id: account.id, provider_account_id: providerAccountId, username: profile.username ?? "instagram" },
      synchronized,
      webhook_subscribed: true,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Falha ao sincronizar o Instagram." }, { status: 502 });
  }
}

export async function instagramDiagnostics(request:Request,env:Env):Promise<Response>{
 if(request.method!=="GET")return json({error:"Método não permitido."},{status:405});
 const sessionUser=await getSessionUser(env.DB,request);
 if(!sessionUser)return json({error:"Não autenticado."},{status:401});
 const setting=await env.DB.prepare("SELECT value,updated_at FROM system_settings WHERE key='instagram_webhook_diagnostic' LIMIT 1").first<{value:string;updated_at:string}>();
 const logs=await env.DB.prepare("SELECT l.status,l.error_code,l.created_at,r.keyword FROM automation_logs l LEFT JOIN automation_rules r ON r.id=l.automation_rule_id WHERE l.user_id=?1 ORDER BY l.created_at DESC LIMIT 10").bind(sessionUser.id).all();
 let diagnostic:unknown=null;
 try{diagnostic=setting?JSON.parse(setting.value):null}catch{diagnostic=setting?.value??null}
 return json({diagnostic,updated_at:setting?.updated_at??null,logs:logs.results});
}

