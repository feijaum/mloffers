# Capturador de links de afiliado via CSV — Observatório ML

## Fluxo recomendado (Cloudflare)

1. No [painel Cloudflare](https://observatorio-ml.jvleite7.workers.dev/#ofertas), selecione a ordenação e clique em **CSV Top 20 para extensão**. O arquivo contém `id,title,url`.
2. Instale/recarregue a pasta `extension-affiliates` em `chrome://extensions` (Manifest V3, versão 2.0.0).
3. Clique no ícone da extensão, escolha o CSV e **Iniciar captura**.
4. A extensão abre o primeiro anúncio no Mercado Livre. Na sua conta de afiliado, abra **Compartilhar → Gerar link / ID de produto**. Quando aparecer o link `meli.la`, a extensão guarda o ID e o link e abre o próximo anúncio.
5. Continue até terminar. Pode usar **Exportar links CSV** a qualquer momento, mesmo após cancelar uma captura parcialmente concluída.
6. Volte ao painel da Cloudflare, aba **Ofertas** → **Atualizar links de divulgação**; importe `observatorio-top20-afiliados.csv`.
7. A importação associa `id` a `affiliate` e não altera os demais campos.

## Observações
- A extensão não gera links de afiliado artificialmente nem se comunica com endpoints privados. O gerador oficial precisa ser acionado pelo usuário em cada produto.
- O CSV de retorno contém apenas os links efetivamente capturados. Itens sem captura não recebem links falsos.
- O painel armazena os dados no IndexedDB do navegador, no domínio da Cloudflare. Não há sincronização automática para outros dispositivos.
- Os arquivos do painel em `docs/` foram alterados no repositório, mas **o endereço `workers.dev` precisa receber uma implantação atualizada** para apresentar os novos botões. Um commit no GitHub não comprova implantação na Cloudflare.
- O campo `url` do CSV de origem deve conter uma URL de anúncio `https://www.mercadolivre.com.br/...` ou `https://produto.mercadolivre.com.br/...`.
- Se o modal do Mercado Livre mudar, a captura pode não identificar automaticamente o campo. Nesse caso, não pule a etapa de conferência da URL gerada.
