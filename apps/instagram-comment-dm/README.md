# Instagram Comment DM Automation

Plataforma web segura para automatizar respostas via DM no Instagram a partir de comentários em publicações, usando exclusivamente APIs oficiais da Meta/Instagram.

## Status

**Fase atual: Fase 2 — Estrutura da aplicação e persistência**

A base React + Vite + Cloudflare Workers foi criada, com configuração inicial para Cloudflare D1 e uma primeira migração versionada. A autenticação, CRUD administrativo e integração com a Meta ainda não foram implementados.

## Objetivos

- Conectar contas do Instagram por fluxo oficial da Meta.
- Cadastrar publicações, produtos e regras de automação.
- Detectar comentários elegíveis por publicação e palavra-chave.
- Resolver o produto exclusivamente a partir da configuração administrativa persistida.
- Enviar DM somente por APIs oficiais e dentro das restrições da Meta.
- Garantir idempotência, rate limiting, autorização por recurso e auditoria.
- Não expor tokens, segredos ou dados sensíveis no frontend, logs ou respostas de API.

## Stack atual

- Frontend: React + TypeScript + Vite.
- Backend: Cloudflare Workers.
- Banco: Cloudflare D1.
- Validação planejada: Zod.
- Deploy: Cloudflare Workers com assets da SPA.
- Controle de versão: Git/GitHub.

A integração React/Vite + Workers segue a arquitetura recomendada atualmente pela documentação oficial do Cloudflare. citeturn0search0turn0search1

## Estrutura inicial

```text
.
├── migrations/
│   └── 0000_initial_schema.sql
├── src/
│   ├── main.tsx
│   └── styles.css
├── worker/
│   └── index.ts
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc
```

## Banco de dados

A migração inicial cria as entidades necessárias para a base do domínio: usuários, contas do Instagram, publicações, produtos, regras de automação, eventos de webhook, logs de automação, auditoria, rate limits e configuração global de pausa.

As migrações devem ser aplicadas por Wrangler; não devem ser feitas alterações manuais de schema em produção. O D1 possui comandos próprios para criação e aplicação de migrações locais/remotas. citeturn0search7

O ID real do banco D1 ainda não foi configurado no `wrangler.jsonc`; nenhum banco remoto foi criado ou alterado nesta fase.

## Desenvolvimento

```bash
npm install
npm run dev
```

Validações previstas:

```bash
npm run typecheck
npm run lint
npm run build
npm run db:migrate:local
```

Os comandos acima ainda não foram executados neste ambiente durante a Fase 2; portanto, não são tratados como testes aprovados.

## Documentação

- [ARCHITECTURE.md](ARCHITECTURE.md) — arquitetura e fluxo de dados.
- [SECURITY.md](SECURITY.md) — requisitos e controles de segurança.
- [PROJECT_STATE.md](PROJECT_STATE.md) — estado atual e histórico de fases.
- [CHANGELOG.md](CHANGELOG.md) — alterações verificáveis do projeto.

## Regra de segurança

Tokens da Meta, segredos de API, senhas e segredos de sessão nunca devem ser armazenados no código-fonte, frontend, localStorage, logs ou mensagens de erro.

## Regra de implementação

Nenhuma funcionalidade deve ser considerada concluída sem validação apropriada. Antes de produção, devem passar testes, typecheck, lint, build e migrações, além das verificações de segurança previstas no projeto.
