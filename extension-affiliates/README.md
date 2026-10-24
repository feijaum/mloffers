# Extensão de links de afiliado — Observatório ML

Extensão adicional do Chrome (Manifest V3). Não substitui a extensão de coleta de ofertas.

## Instalação
1. Baixe o repositório como ZIP e extraia.
2. Entre em `chrome://extensions`, ative **Modo do desenvolvedor**.
3. Clique **Carregar sem compactação** e selecione **extension-affiliates**.
4. Abra o **[Observatório ML na Cloudflare](https://observatorio-ml.jvleite7.workers.dev/#ofertas)** no **mesmo Chrome** onde importou as ofertas.
5. Na aba **Ofertas**, escolha a ordenação desejada (por exemplo, **Sinais de conversão**) e **Top 20**.
6. Clique no painel flutuante **Capturar Top 20** criado pela extensão.
7. Na aba que a extensão abrir, entre no comando de compartilhamento de afiliados do Mercado Livre (**Compartilhar → Gerar link / ID de produto**). Assim que aparecer o link `https://meli.la/...`, a extensão o salva e abre o próximo produto.
8. Repita o acionamento do gerador para cada produto. Mantenha a aba do Observatório aberta durante todo o processo.
9. Ao terminar, volte ao painel e recarregue. Os campos de link de afiliado ficam preenchidos nos produtos capturados.

## Funcionamento e limites

- São considerados **os primeiros 20 cartões visíveis**, conforme filtro e ordenação selecionados. Se houver menos, processa somente os disponíveis com URLs públicas válidas.
- Os resultados são gravados no **IndexedDB do painel** (`observatorio-ml-mobile`, store `offers`, campo `affiliate`) sob o ID original `MLB...`.
- Exige login na própria conta de afiliados do Mercado Livre, na mesma sessão do Chrome.
- A extensão não fabrica links, não usa tokens/cookies exportados e não chama endpoints privados.
- A abertura do gerador em cada produto ainda requer intervenção na página. Se o Mercado Livre mudar seu fluxo visual, a captura pode exigir atualização.
- Não feche o painel durante a coleta: ele recebe e persiste os links.
- Para começar novamente, use **Cancelar**, depois **Capturar Top 20**.
- A versão 1.1.1 reconhece `feijaum.github.io`, **Cloudflare Pages (`*.pages.dev`)** e o Worker exato **`observatorio-ml.jvleite7.workers.dev`**. Se o painel estiver em domínio personalizado (por exemplo, `painel.exemplo.com.br`), inclua-o em `host_permissions` e no primeiro bloco `content_scripts.matches` de `manifest.json`, recarregue a extensão e a aba.
- Os dados são armazenados no navegador **por origem**. O IndexedDB do domínio Cloudflare é separado do GitHub Pages; as ofertas precisam estar importadas no painel Cloudflare para a extensão encontrá-las.

## Privacidade
A extensão só lê as URLs dos produtos presentes no painel e os links apresentados pelo gerador de afiliados. Não exporta sessão nem senhas. Dados de progresso ficam em `chrome.storage.local`; links são salvos localmente no banco da aplicação web. Não há sincronização automática com outros aparelhos.

## Diagnóstico
Se não capturar, verifique se:
- O link curto aparece no modal **Gerar link / ID de produto**.
- A aba original do Observatório continua aberta.
- A conta do Mercado Livre está habilitada para compartilhamento de afiliados.
- O painel e a extensão estão no domínio suportado.
