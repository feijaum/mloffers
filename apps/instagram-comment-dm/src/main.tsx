import React, { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type User = { id: string; email: string; must_change_password?: number };
type Post = { id: string; instagram_account_id: string; provider_post_id: string; title: string | null; thumbnail_url?: string | null; permalink?: string | null; is_active: number; instagram_username?: string };
type Product = { id: string; name: string; product_url: string; is_active: number };
type Automation = { id: string; post_id: string; product_id: string; product_ids?: string[]; keyword: string; dm_template: string; is_active: number; post_title?: string | null; product_name?: string };

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { credentials: "same-origin", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir a operação.");
  return data as T;
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("ADM");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestJson("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login: username, password }) });
      const session = await requestJson<{ user: User }>("/api/auth/me");
      onLogin(session.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao entrar.");
    } finally { setLoading(false); }
  }

  return <main className="app-shell"><section className="card auth-card">
    <span className="eyebrow">Instagram Comment DM</span><h1>Entrar</h1><p>Acesse o painel administrativo com sua conta.</p>
    <form onSubmit={submit}>
      <label>Usuário<input type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label>
      <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" minLength={6} required /></label>
      {error && <div className="error" role="alert">{error}</div>}
      <button type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
    </form>
  </section></main>;
}

function ChangePassword({ user, onChanged }: { user: User; onChanged: (user: User) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) { setError("A confirmação da nova senha não confere."); return; }
    setLoading(true);
    try {
      await requestJson("/api/auth/change-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
      onChanged({ ...user, must_change_password: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a senha.");
    } finally { setLoading(false); }
  }

  return <main className="app-shell"><section className="card auth-card">
    <span className="eyebrow">Primeiro acesso</span><h1>Altere sua senha</h1>
    <p>Por segurança, a senha inicial precisa ser substituída antes de acessar o painel.</p>
    <form onSubmit={submit}>
      <label>Senha atual<input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" minLength={6} required /></label>
      <label>Nova senha<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={6} required /></label>
      <label>Confirmar nova senha<input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" minLength={6} required /></label>
      {error && <div className="error" role="alert">{error}</div>}
      <button type="submit" disabled={loading}>{loading ? "Salvando…" : "Alterar senha"}</button>
    </form>
  </section></main>;
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [section, setSection] = useState("dashboard");
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => { try { const [postData, productData, automationData] = await Promise.all([requestJson<{ posts: Post[] }>("/api/posts"), requestJson<{ products: Product[] }>("/api/products"), requestJson<{ automations: Automation[] }>("/api/automation-rules")]); setPosts(postData.posts); setProducts(productData.products); setAutomations(automationData.automations); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar os dados."); } };
  useEffect(() => { void load(); }, []);
  async function syncInstagram() { try { const result = await requestJson<{ synchronized: number; account: { username: string } }>("/api/instagram/sync", { method: "POST" }); setMessage(`Conta @${result.account.username} conectada. ${result.synchronized} publicações sincronizadas.`); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível sincronizar o Instagram."); } }
  async function remove(path: string, label: string) { if (!confirm(`Excluir ${label}?`)) return; try { await requestJson(path, { method: "DELETE" }); setMessage("Registro excluído."); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir."); } }
  async function toggle(automation: Automation) { try { await requestJson(`/api/automation-rules/${automation.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ is_active: !Boolean(automation.is_active) }) }); setMessage(automation.is_active ? "Automação pausada." : "Automação ativada."); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível alterar a automação."); } }
  const labels: Record<string, string> = { dashboard: "Visão geral", posts: "Publicações", products: "Produtos", automations: "Automações", history: "Histórico", security: "Segurança", settings: "Configurações" };
  return <div className="admin-layout"><aside className="sidebar"><div><span className="eyebrow">Instagram Comment DM</span><h2>Painel</h2></div><nav>{Object.entries(labels).map(([key, label]) => <button className={section === key ? "nav-active" : ""} onClick={() => setSection(key)} key={key}>{label}</button>)}</nav><div className="sidebar-foot"><small>{user.email}</small><button onClick={onLogout}>Sair</button></div></aside><main className="content"><header><div><span className="eyebrow">Administração</span><h1>{labels[section]}</h1></div><span className="pill">Sessão segura</span></header>{message && <div className="status" role="status">{message}</div>}{error && <div className="error" role="alert">{error}</div>}{section === "dashboard" && <><div className="grid"><div className="stat"><strong>{posts.length}</strong><span>Publicações</span></div><div className="stat"><strong>{products.length}</strong><span>Produtos</span></div><div className="stat"><strong>{automations.filter((item) => item.is_active).length}</strong><span>Automações ativas</span></div></div><section className="card"><h2>Próximos passos</h2><p>Cadastre publicações, produtos e regras. A integração oficial com o Instagram será adicionada em uma fase posterior.</p></section></>}{section === "posts" && <Posts posts={posts} reload={load} remove={remove} syncInstagram={syncInstagram} />}{section === "products" && <Products products={products} reload={load} remove={remove} />}{section === "automations" && <Automations items={automations} posts={posts} products={products} reload={load} toggle={toggle} remove={remove} />}{section === "history" && <InstagramDiagnostics />}{section === "security" && <section className="card"><h2>Segurança</h2><p>Autenticação por sessão HttpOnly, autorização por proprietário e validação de entrada estão ativas.</p></section>}{section === "settings" && <section className="card"><h2>Configurações</h2><p>Integrações e configurações avançadas serão habilitadas nas próximas fases.</p></section>}</main></div>;
}

function Posts({ posts, reload, remove, syncInstagram }: { posts: Post[]; reload: () => Promise<void>; remove: (path: string, label: string) => Promise<void>; syncInstagram: () => Promise<void> }) {
  return <>
    <section className="card">
      <h2>Conta do Instagram</h2>
      <p className="muted">Conecte a conta profissional e carregue automaticamente as publicações disponíveis.</p>
      <button onClick={() => void syncInstagram()}>Sincronizar publicações</button>
    </section>
    <section className="card">
      <h2>Publicações disponíveis</h2>
      {posts.length === 0 ? <p className="muted">Clique em “Sincronizar publicações”.</p> : <div className="list">{posts.map((post) => <article className="list-item post-list-item" key={post.id}>{post.thumbnail_url ? <img className="post-thumb" src={post.thumbnail_url} alt="" loading="lazy" /> : <div className="post-thumb post-thumb-empty">Sem imagem</div>}<div className="post-list-content"><strong>{post.title || "Sem título"}</strong><small>ID: {post.provider_post_id} · Conta: {post.instagram_username || post.instagram_account_id}</small>{post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer">Abrir publicação no Instagram</a>}</div><button className="danger" onClick={() => remove(`/api/posts/${post.id}`, "a publicação")}>Excluir</button></article>)}</div>}
    </section>
  </>;
}

function Products({ products, reload, remove }: { products: Product[]; reload: () => Promise<void>; remove: (path: string, label: string) => Promise<void> }) { const [name, setName] = useState(""); const [url, setUrl] = useState(""); const [error, setError] = useState(""); async function submit(event: FormEvent) { event.preventDefault(); setError(""); try { await requestJson("/api/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, product_url: url }) }); setName(""); setUrl(""); await reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível cadastrar."); } } return <><section className="card"><h2>Novo produto</h2><form className="form-grid" onSubmit={submit}><label>Nome<input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} required /></label><label>URL do produto<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." required /></label><button type="submit">Cadastrar produto</button></form>{error && <div className="error">{error}</div>}</section><section className="card"><h2>Produtos cadastrados</h2>{products.length === 0 ? <p className="muted">Nenhum produto cadastrado.</p> : <div className="list">{products.map((product) => <article className="list-item" key={product.id}><div><strong>{product.name}</strong><small>{product.product_url}</small></div><button className="danger" onClick={() => remove(`/api/products/${product.id}`, "o produto")}>Excluir</button></article>)}</div>}</section></>; }

function Automations({ items, posts, products, reload, toggle, remove }: { items: Automation[]; posts: Post[]; products: Product[]; reload: () => Promise<void>; toggle: (automation: Automation) => Promise<void>; remove: (path: string, label: string) => Promise<void> }) {
  const defaultTemplate = "Olá, @{{nome}}! Aqui estão os produtos que você pediu:\n\n{{link_produto}}";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [post, setPost] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [template, setTemplate] = useState(defaultTemplate);
  const [error, setError] = useState("");

  function resetForm() {
    setEditingId(null); setPost(""); setProductIds([]); setKeyword(""); setTemplate(defaultTemplate); setError("");
  }
  function selectProduct(id: string, checked: boolean) {
    setProductIds((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }
  function edit(item: Automation) {
    setEditingId(item.id);
    setPost(item.post_id);
    setProductIds(item.product_ids?.length ? item.product_ids : [item.product_id]);
    setKeyword(item.keyword);
    setTemplate(item.dm_template);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!post) { setError("Selecione uma publicação."); return; }
    if (productIds.length === 0) { setError("Selecione pelo menos um produto."); return; }
    try {
      await requestJson(editingId ? `/api/automation-rules/${editingId}` : "/api/automation-rules", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ post_id: post, product_ids: productIds, keyword, dm_template: template, is_active: true }),
      });
      resetForm();
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a automação.");
    }
  }
  return <>
    <section className="card">
      <h2>{editingId ? "Editar automação" : "Nova automação"}</h2>
      <p className="muted">Variáveis permitidas: <code>{"{{nome}}"}</code> e <code>{"{{link_produto}}"}</code>.</p>
      <form className="form-grid" onSubmit={submit}>
        <fieldset className="post-selector"><legend>Publicação</legend>
          <div className="post-options">{posts.map((item) => <label className={`post-option ${post === item.id ? "post-option-selected" : ""}`} key={item.id}>
            <input type="radio" name="post" value={item.id} checked={post === item.id} onChange={() => setPost(item.id)} />
            {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" loading="lazy" /> : <div className="post-option-placeholder">Sem imagem</div>}
            <span><strong>{item.title || "Sem título"}</strong><small>{item.instagram_username ? `@${item.instagram_username}` : "Instagram"}</small>{item.permalink && <a href={item.permalink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Abrir publicação</a>}</span>
          </label>)}</div>
        </fieldset>
        <fieldset className="product-selector"><legend>Produtos</legend><div className="product-options">{products.map((item) => <label className="product-option" key={item.id}><input type="checkbox" checked={productIds.includes(item.id)} onChange={(e) => selectProduct(item.id, e.target.checked)} /><span>{item.name}</span></label>)}</div></fieldset>
        <label>Palavra-chave<input value={keyword} onChange={(e) => setKeyword(e.target.value)} maxLength={80} placeholder="Ex.: DECOR" required /></label>
        <label>Mensagem da DM<textarea value={template} onChange={(e) => setTemplate(e.target.value)} maxLength={2000} required /></label>
        <div className="actions"><button type="submit">{editingId ? "Salvar alterações" : "Cadastrar automação"}</button>{editingId && <button type="button" className="secondary" onClick={resetForm}>Cancelar edição</button>}</div>
      </form>
      {error && <div className="error">{error}</div>}
    </section>
    <section className="card"><h2>Automações cadastradas</h2>{items.length === 0 ? <p className="muted">Nenhuma automação cadastrada.</p> : <div className="list">{items.map((item) => <article className="list-item" key={item.id}><div><strong>{item.keyword}</strong><small>{item.post_title || item.post_id} · {item.product_name || item.product_id}</small><small>{item.is_active ? "Ativa" : "Pausada"}</small></div><div className="actions"><button onClick={() => edit(item)}>Editar</button><button className={item.is_active ? "warning" : ""} onClick={() => toggle(item)}>{item.is_active ? "Pausar" : "Ativar"}</button><button className="danger" onClick={() => remove(`/api/automation-rules/${item.id}`, "a automação")}>Excluir</button></div></article>)}</div>}</section>
  </>;
}


function InstagramDiagnostics() {
  const [data, setData] = useState<{ diagnostic: { status?: string; detail?: string; at?: string } | null; logs: Array<{ status: string; error_code?: string; created_at: string; keyword?: string }> } | null>(null);
  const [error, setError] = useState("");
  const load = () => requestJson<{ diagnostic: { status?: string; detail?: string; at?: string } | null; logs: Array<{ status: string; error_code?: string; created_at: string; keyword?: string }> }>("/api/instagram/diagnostics").then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao carregar o diagnóstico."));
  useEffect(() => { void load(); }, []);
  const labels: Record<string, string> = {
    webhook_received: "Webhook recebido da Meta",
    payload_authenticated: "Webhook autenticado; analisando comentário",
    invalid_signature: "Assinatura do webhook inválida — confira META_APP_SECRET",
    missing_app_secret: "META_APP_SECRET não configurado",
    missing_access_token: "INSTAGRAM_ACCESS_TOKEN não configurado",
    invalid_comment_payload: "Evento recebido sem os dados necessários do comentário",
    account_not_found: "Conta do evento não encontrada",
    post_not_found: "Publicação do comentário não encontrada no painel",
    active_rule_not_found: "Não existe automação ativa para essa publicação",
    keyword_not_matched: "Comentário recebido, mas a palavra-chave não correspondeu",
    message_send_failed: "A Meta recebeu o pedido, mas recusou o envio da DM",
    message_sent: "Mensagem enviada com sucesso",
  };
  return <section className="card">
    <h2>Diagnóstico do Instagram</h2>
    <p className="muted">Mostra a última etapa processada pelo webhook. Atualize após fazer um comentário novo.</p>
    <button style={{ marginTop: 16 }} onClick={load}>Atualizar diagnóstico</button>
    {error && <div className="error">{error}</div>}
    {!data?.diagnostic ? <p style={{ marginTop: 16 }}>Nenhum comentário chegou ao sistema desde a ativação do diagnóstico.</p> : <div className={data.diagnostic.status === "message_sent" ? "status" : "error"}>
      <strong>{labels[data.diagnostic.status ?? ""] ?? data.diagnostic.status}</strong>
      {data.diagnostic.detail && <small style={{ display: "block", marginTop: 6 }}>{data.diagnostic.detail}</small>}
      {data.diagnostic.at && <small style={{ display: "block", marginTop: 6 }}>{new Date(data.diagnostic.at).toLocaleString("pt-BR")}</small>}
    </div>}
    {data && data.logs.length > 0 && <div className="list" style={{ marginTop: 18 }}>{data.logs.map((log, index) => <article className="list-item" key={index}><div><strong>{log.status} · {log.keyword || "automação"}</strong><small>{log.error_code || new Date(log.created_at).toLocaleString("pt-BR")}</small></div></article>)}</div>}
  </section>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    requestJson<{ user: User }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);
  if (checking) return <main className="app-shell"><section className="card"><p>Verificando sessão…</p></section></main>;
  if (!user) return <Login onLogin={setUser} />;
  return <Dashboard user={user} onLogout={async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
  }} />;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
