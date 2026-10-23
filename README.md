# ML Offers — Observatório de Ofertas & Conteúdo

Projeto unificado de inteligência de ofertas do Mercado Livre, criação de roteiros para Veo/Google Flow e preparação de campanhas Instagram com CTA **«Comente EU QUERO»**.

## Acesso web (GitHub Pages)

Depois de ativar **Settings → Pages → Deploy from a branch → main → /docs**, o frontend público ficará em:

https://feijaum.github.io/mloffers/

A aplicação em `docs/` é **estática e compatível com celular**: importa arquivos HTML de ofertas que você já possui, calcula ranking local, prepara prompt Veo, legenda, CTA e modelo de DM; exporta o pacote. Os dados importados ficam no **navegador deste dispositivo**. Para compartilhar uma seleção entre PC e celular sem expor o banco, publique o feed **docs/data/ofertas.json** com **tools/gerar_feed.py** e use o botão **Carregar seleção publicada no GitHub**.

**Limitação essencial:** GitHub Pages não executa Python, extensões Chrome, Cloudflare Workers ou consultas autenticadas ao Mercado Livre. A página pública **não varre as 20 páginas de ofertas ao vivo**. Captura automática depende de acesso autorizado e de um backend separado.

## Exportar ofertas no Chrome

A [extensão de desktop](extension-chrome/) foi adicionada ao repositório. Ela consulta, sob comando explícito, até 20 páginas das seções públicas de ofertas (sem contornar bloqueios), registra anúncios em armazenamento local e exporta arquivos **JSON/CSV**. Os arquivos são importados na interface web.

O **Chrome de celular não executa extensões de desktop**. No Android, instale o Observatório como PWA e importe os arquivos, ou compartilhe HTML/CSV/JSON pelo menu Compartilhar quando suportado. No iPhone, use o seletor de arquivos no portal. Consulte [o manual da extensão](extension-chrome/README.md).

## Monorepo

- `docs/`: dashboard estático/mobile para GitHub Pages (frontend principal), com importação de arquivos por compartilhamento PWA quando suportada.\n- `extension-chrome/`: extensão MV3 de exportação de consultas em Chrome desktop (sem depender do Python).
- `apps/instagram-comment-dm/`: cópia do aplicativo de automação Instagram/DM. As migrações legadas 0004, 0005, 0006 e 0008 com credenciais/identificadores fixos foram neutralizadas e a configuração do Worker foi isolada para não replicar dados de acesso no novo repositório público. O repositório de origem não foi modificado.
- `desktop/`: documentação e estado da migração do Observatório local com extensão Chrome e histórico SQLite (o código desktop legado ainda não foi incorporado integralmente).\n- `tools/gerar_feed.py`: prepara um feed JSON público a partir de CSV sem tokens nem sessões.\n- `tests/web-smoke.cjs`: testes de parser, ranking, prompt Veo, legenda e DM.

## Regra de publicação

O Observatório não cria nem dispara DMs por si só. O fluxo de comentário/DM depende da aplicação Instagram já operada separadamente. No pacote gerado, associe **publicação ↔ produto ↔ link afiliado ↔ palavra-chave `eu quero`** antes de publicar.

O link de afiliado deve ser gerado pelos canais oficiais. Links na legenda do Instagram nem sempre são clicáveis. A DM por comentário pode oferecer uma opção prática, desde que configurada segundo as regras da Meta.

## Segurança

Não inclua em commits arquivos `.env`, tokens OAuth, dados de sessão, SQLite com informações privadas nem exports de clientes. Evite copiar secrets do Cloudflare e da Meta. O conteúdo e as imagens dos produtos devem ser usados de acordo com as permissões aplicáveis.

## Estado da implantação

O deploy em GitHub Pages requer que o proprietário habilite Pages nas configurações do repositório. Não declarar o site como publicado sem verificar a URL.
