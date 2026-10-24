<div align="center">

# Observatório ML

**Da descoberta de ofertas à criação de conteúdo para afiliados.**

Uma ferramenta independente para organizar ofertas do Mercado Livre, identificar produtos com potencial de divulgação e preparar conteúdos para Instagram, Reels, TikTok e Google Flow.

**[Acessar plataforma web](https://feijaum.github.io/mloffers/)** · **[Instalar extensão Chrome](extension-chrome/README.md)** · **[Capturar links de afiliado do Top 20](extension-affiliates/README.md)** · **[Automação de comentários e DM](apps/instagram-comment-dm/)**

[![Validação do projeto](https://github.com/feijaum/mloffers/actions/workflows/validate-web.yml/badge.svg)](https://github.com/feijaum/mloffers/actions/workflows/validate-web.yml)

</div>

---

## O que é o Observatório ML?

O **Observatório ML** reúne a análise de produtos em oferta e a preparação de campanhas para redes sociais em um fluxo simples: **capturar → comparar → selecionar → criar → divulgar**.

Em vez de escolher produtos apenas pelo percentual de desconto, a ferramenta organiza dados comerciais das ofertas e apresenta um **ranking de oportunidades**, acompanhado de imagens, sugestões de conteúdo e materiais prontos para edição.

O projeto foi pensado para quem trabalha com **marketing de afiliados**, produção de vídeos curtos e curadoria de achadinhos.

## Funcionalidades

| Recurso | O que oferece |
| --- | --- |
| **Captura de ofertas** | Extensão Chrome para consultar, sob comando do usuário, as seções de ofertas disponíveis, com até 20 páginas por seção. |
| **Organização de produtos** | Consolidação por ID do anúncio, reunindo título, vendedor, imagem, preço, desconto anunciado, avaliação, vendas informadas e URL. |
| **Ranking inteligente** | Notas de prioridade, sinais de conversão e potencial de conteúdo com base nos dados presentes nas capturas. |
| **Painel web responsivo** | Consulta ao ranking pelo computador ou celular, com busca, filtros e armazenamento local dos produtos importados. |
| **Conteúdo para Veo** | Prompts prontos para produzir vídeos promocionais no **Google Flow**, com instruções para selecionar um modelo **Veo**. |
| **Publicações para Instagram** | Upload do MP4 original, legenda reutilizada de Conteúdo e publicação de Reels pela API oficial, com automação por palavra-chave e diagnóstico de comentários. |
| **Importação e exportação** | Arquivos **HTML, CSV e JSON**, backup local e possibilidade de publicar uma seleção no GitHub para acesso em outros dispositivos. |

> **Importante:** o ranking apresenta **estimativas editoriais**, e não probabilidades comprovadas de venda. Os preços são referentes às capturas; confirme preço, estoque, frete, cupom e disponibilidade antes de divulgar.

## Como funciona

### 1. Capture as ofertas no computador

Use a [extensão para Chrome desktop](extension-chrome/README.md) e escolha quais seções deseja consultar:

- Todas as ofertas;
- Ofertas relâmpago;
- Preços imbatíveis;
- Ofertas de até R$ 100.

A consulta é iniciada **somente quando você clica**, com seleção de **1, 5, 10 ou 20 páginas por seção**. Os anúncios identificados são consolidados e podem ser exportados em **JSON** ou **CSV**.

### 2. Analise as oportunidades no painel web

Abra **[feijaum.github.io/mloffers](https://feijaum.github.io/mloffers/)** e importe o arquivo gerado pela extensão.

O painel permite pesquisar e ordenar produtos por:

- prioridade geral;
- sinais de conversão;
- potencial para vídeos;
- desconto anunciado;
- menor preço registrado.

### 3. Prepare o material de divulgação

Em **Montar publicação**, cada produto pode reunir:

- imagem e link público do anúncio;
- prompt orientado ao **Veo no Google Flow**;
- legenda para Instagram com preço anterior e atual da captura, deixando o link de afiliado somente na DM;
- chamada para comentar **“EU QUERO”**;
- modelo de mensagem para responder ao comentário por DM;
- campo para inserir o **link de afiliado** gerado pelos canais oficiais.

O Observatório prepara os materiais; a geração do vídeo ocorre no Google Flow e a publicação continua sob seu controle.

### 4. Conecte à sua estratégia de comentários e DM

O repositório também contém uma **cópia do código** do projeto [Instagram Comment DM](apps/instagram-comment-dm/), destinado à automação de respostas por mensagem a partir dos comentários.

Para evitar enviar o produto errado, cada campanha deve relacionar **publicação → produto → link de afiliado → palavra-chave “eu quero”**. O Worker próprio do Observatório ML publica Reels e envia a resposta privada ao comentário elegível, com resposta pública opcional e histórico. A conta profissional deve estar conectada e a regra precisa estar ativa. Consulte o [guia de conexão e publicação](docs/INSTAGRAM.md). O site estático no GitHub Pages não executa essas APIs.

## Comece a usar

### Plataforma web

**[Abrir Observatório ML](https://feijaum.github.io/mloffers/)**

O painel pode ser acessado diretamente no navegador, inclusive no celular. É possível importar capturas locais e, quando houver um feed publicado, usar a opção **Carregar seleção publicada no GitHub**.

### Extensão para Chrome desktop

1. Baixe o projeto em **Code → Download ZIP** no GitHub.
2. Extraia o arquivo no computador.
3. Acesse `chrome://extensions` e ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta `extension-chrome`.
5. Abra a extensão, selecione as seções e clique em **Consultar ofertas**.
6. Exporte o **JSON** e importe-o no painel web.

**[Ver guia completo da extensão](extension-chrome/README.md)**

### Uso no celular

O painel funciona como aplicativo web instalável (**PWA**) em navegadores compatíveis. Você pode importar arquivos HTML, CSV ou JSON pelo próprio site e, em determinados aparelhos Android, compartilhá-los com o PWA instalado.

O **Chrome móvel não instala esta extensão de desktop**. A captura de páginas pela extensão é voltada ao Chrome de computador; no celular, a plataforma **analisa capturas e gera conteúdo**, mas não faz a varredura das ofertas ao vivo.

## Estrutura do projeto

```text
mloffers/
├── docs/                     # Aplicação web, ranking, kits de conteúdo e PWA
├── extension-chrome/         # Captura sob demanda e exportação JSON/CSV
├── extension-affiliates/     # Preenchimento local de links oficiais do Top 20
├── apps/
│   └── instagram-comment-dm/ # Cópia do projeto de comentários e mensagens
├── tools/
│   └── gerar_feed.py         # Preparação de seleção pública para o painel
├── tests/                    # Testes de extração e criação de conteúdo
└── .github/workflows/        # Validação automatizada
```

**Tecnologias:** JavaScript, HTML, CSS, IndexedDB, Progressive Web App, extensão Chrome Manifest V3 e GitHub Pages. O módulo de mensagens utiliza React, TypeScript e Cloudflare Workers/D1 em uma implantação independente.

## Privacidade e limitações

- **Dados locais:** as capturas importadas no painel são processadas no navegador e armazenadas no dispositivo. Não há sincronização automática entre computador e celular.
- **Publicação de seleções:** o feed em `docs/data/ofertas.json`, caso seja atualizado, é público no GitHub. Não inclua credenciais, cookies, informações pessoais ou dados de sessão.
- **Acesso às ofertas:** a extensão não é uma API oficial do Mercado Livre, não contorna CAPTCHA ou bloqueios e não garante acesso a todas as páginas. Use-a apenas quando a coleta for permitida.
- **Ofertas e desempenho:** preço riscado não comprova queda histórica, e a pontuação do ranking não é uma taxa medida de conversão, alcance ou comissão.
- **Instagram e Veo:** a publicação de Reels e a automação de DMs funcionam no Worker conectado à sua conta profissional, com senha e ativação por publicação. A geração no Flow continua manual; o modelo é selecionado na interface do Google.
- **Links de afiliado:** enviados somente por DM. A legenda do Instagram mostra “De… por…” quando há preço anterior válido na captura; caso contrário, mostra apenas o preço atual.

## Desenvolvimento e documentação

O projeto inclui validações automatizadas para a interface web e os extratores da extensão. O código é mantido no GitHub e pode ser inspecionado e adaptado conforme as permissões aplicáveis.

- [Documentação da plataforma web](docs/README.md)
- [Instalação e uso da extensão](extension-chrome/README.md)
- [Integração com comentários e DM](apps/instagram-comment-dm/INTEGRACAO-MLOFFERS.md)
- [Publicação de uma seleção de ofertas no GitHub](docs/data/README.md)

---

<div align="center">

**Observatório ML** · Curadoria de ofertas, análise de oportunidades e produção de conteúdo em um só fluxo.

[**Acessar a ferramenta →**](https://feijaum.github.io/mloffers/)

<sub>Projeto independente, não afiliado oficialmente ao Mercado Livre, à Meta ou ao Google.</sub>

</div>
