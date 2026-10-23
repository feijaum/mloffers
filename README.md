# ML Offers — Observatório de Ofertas & Conteúdo

Projeto unificado de inteligência de ofertas do Mercado Livre, criação de roteiros para Veo/Google Flow e preparação de campanhas Instagram com CTA **«Comente EU QUERO»**.

## Acesso web (GitHub Pages)

Depois de ativar **Settings → Pages → Deploy from a branch → main → /docs**, o frontend público ficará em:

https://feijaum.github.io/mloffers/

A aplicação em `docs/` é **estática e compatível com celular**: importa arquivos HTML de ofertas que você já possui, calcula ranking local, prepara prompt Veo, legenda, CTA e modelo de DM; exporta o pacote. Os dados importados ficam no **navegador deste dispositivo**, sem sincronização entre celular e PC.

**Limitação essencial:** GitHub Pages não executa Python, extensões Chrome, Cloudflare Workers ou consultas autenticadas ao Mercado Livre. A página pública **não varre as 20 páginas de ofertas ao vivo**. Captura automática depende de acesso autorizado e de um backend separado.

## Monorepo

- `docs/`: dashboard estático/mobile para GitHub Pages (frontend principal).
- `apps/instagram-comment-dm/`: cópia do aplicativo de automação Instagram/DM. Alguns scripts legados de migração com credenciais fixas foram neutralizados para não replicar dados de acesso no novo repositório público. O repositório de origem não foi modificado.
- `desktop/`: documentação para uso do Observatório local com extensão Chrome e histórico SQLite.

## Regra de publicação

O Observatório não cria nem dispara DMs por si só. O fluxo de comentário/DM depende da aplicação Instagram já operada separadamente. No pacote gerado, associe **publicação ↔ produto ↔ link afiliado ↔ palavra-chave `eu quero`** antes de publicar.

O link de afiliado deve ser gerado pelos canais oficiais. Links na legenda do Instagram nem sempre são clicáveis. A DM por comentário pode oferecer uma opção prática, desde que configurada segundo as regras da Meta.

## Segurança

Não inclua em commits arquivos `.env`, tokens OAuth, dados de sessão, SQLite com informações privadas nem exports de clientes. Evite copiar secrets do Cloudflare e da Meta. O conteúdo e as imagens dos produtos devem ser usados de acordo com as permissões aplicáveis.

## Estado da implantação

O deploy em GitHub Pages requer que o proprietário habilite Pages nas configurações do repositório. Não declarar o site como publicado sem verificar a URL.
