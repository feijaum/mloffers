import { handleAdminApi, type Env } from "./admin-api";
import { changePassword, login, logout, me, setInitialPassword } from "./auth-routes";
import { handleInstagramWebhook } from "./instagram-webhook";
import { instagramDiagnostics, syncInstagram } from "./instagram-api";

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("content-security-policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/instagram/webhook") return handleInstagramWebhook(request, env);
    if (url.pathname === "/api/instagram/sync") return syncInstagram(request, env);
    if (url.pathname === "/api/instagram/diagnostics") return instagramDiagnostics(request, env);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ status: "ok", service: "instagram-comment-dm" });
    }
    if (request.method === "POST" && url.pathname === "/api/auth/login") return login(request, env);
    if (request.method === "GET" && url.pathname === "/api/auth/me") return me(request, env);
    if (request.method === "POST" && url.pathname === "/api/auth/logout") return logout(request, env);
    if (request.method === "POST" && url.pathname === "/api/auth/change-password") return changePassword(request, env);
    if (request.method === "POST" && url.pathname === "/api/auth/set-initial-password") return setInitialPassword(request, env);

    if (url.pathname.startsWith("/api/posts") || url.pathname.startsWith("/api/products") || url.pathname.startsWith("/api/automation-rules")) {
      return handleAdminApi(request, env, url.pathname);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Rota não encontrada." }, { status: 404 });

    return env.DB
      ? new Response("Aplicação pronta para o shell do Worker.", { status: 200 })
      : new Response("Configuração do banco ausente.", { status: 503 });
  },
};
