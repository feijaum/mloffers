# Backend privado Google Veo — Observatório ML

Estrutura preparada para uma **instância independente** de Cloudflare Worker. Não está implantada nem conectada ao site.

## Secrets (no Worker, não no GitHub público nem no frontend)

- `GOOGLE_API_KEY`: chave de API do Google AI Studio com acesso autorizado ao Veo.
- `ADMIN_API_TOKEN`: token forte e exclusivo para chamadas servidor-servidor.

Criar em Cloudflare > Worker > Settings > Variables and Secrets, depois de publicar o Worker dinâmico. Também é possível usar `npx wrangler secret put GOOGLE_API_KEY` e `npx wrangler secret put ADMIN_API_TOKEN` no diretório desta aplicação.

## Publicação

```sh
cd apps/video-api
npx wrangler deploy
```

Rotas: `GET /api/health`, `POST /api/video/generate` com `{\"prompt\":\"...\"}` e `GET /api/video/status?operation=...`. As rotas de geração exigem `Authorization: Bearer <ADMIN_API_TOKEN>`.

**Importante:** Não chame essas rotas diretamente do JavaScript do Observatório com o token administrativo: isso exporia o segredo a qualquer visitante. Antes de conectar o botão de geração, implementar login de servidor/sessão e proxy autenticado com rate limit, quotas, registro de custos e tratamento de vídeos retornados. O modelo configurado deve ser conferido contra a disponibilidade da sua conta Google; a API pode cobrar pelo uso. O código atual suporta envio de prompt textual e consulta de operações; **upload de imagem, download de vídeo e integração visual ainda não estão implementados**.
