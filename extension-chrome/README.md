# Observatório ML — Extensão para Chrome Desktop

**Código-fonte:** \`extension-chrome/\` deste repositório. Extensão Manifest V3 para o Chrome de computador (Windows, macOS e Linux).

## O que faz

- Você escolhe 1, 5, 10 ou 20 páginas por seção da área de ofertas do Mercado Livre.
- Você escolhe as seções: Todas as ofertas, Relâmpago, Preços Imbatíveis e Até R$ 100.
- Somente ao clicar **Consultar ofertas** a extensão abre uma aba normal do Chrome e percorre as páginas **sequencialmente**.
- Lê os dados comerciais presentes no HTML já exibido no seu navegador: ID MLB, título, vendedor, imagem, preço atual, preço anterior exibido, desconto anunciado, Pix, cupom, avaliação, vendas indicadas e URL pública.
- Deduplica por ID do anúncio e guarda os resultados temporariamente no armazenamento **local da extensão**.
- Exporta **JSON**, recomendado para usar no [Observatório ML Web](https://feijaum.github.io/mloffers/), ou **CSV** para Excel.
- O botão **Parar** interrompe o processo. Se encontrar página ilegível, proteção, bloqueio ou CAPTCHA, **interrompe** a consulta e preserva os resultados já salvos para exportar parcialmente.

## Instalação no Chrome do computador

1. Acesse [feijaum/mloffers](https://github.com/feijaum/mloffers).
2. Escolha **Code → Download ZIP** e extraia o projeto no seu computador.
3. No Chrome do computador, abra \`chrome://extensions\`.
4. Ative **Modo do desenvolvedor**.
5. Clique em **Carregar sem compactação**.
6. Selecione a pasta **\`extension-chrome\`** extraída do ZIP.
7. Fixe o ícone **Observatório ML** e abra-o.
8. Selecione seções e número de páginas e clique **Consultar ofertas**.
9. Ao terminar, clique em **Baixar JSON** (ou **Baixar CSV**).
10. Abra https://feijaum.github.io/mloffers/, escolha **Importar ofertas** e selecione o JSON baixado.

**Não é necessário** instalar Python, rodar servidor local nem configurar token Mercado Livre.

## No celular

**Chrome Android e Chrome iPhone não oferecem suporte à instalação desta extensão de desktop.** Não existe um único pacote da extensão que funcione nativamente no Chrome de computador e no Chrome móvel.

Para usar no celular:
1. Abra https://feijaum.github.io/mloffers/.
2. No Android/Chrome, instale como aplicativo pelo menu (ex.: **Instalar app** ou **Adicionar à tela inicial**).
3. Importe o JSON do computador pelo campo **Importar ofertas**, ou toque em **Carregar seleção publicada no GitHub** quando existir um feed atualizado.
4. Em Android compatível, o PWA instalado pode aparecer no menu **Compartilhar** ao compartilhar arquivos HTML, CSV ou JSON; se não aparecer, importe usando o seletor de arquivo no site.
5. No iPhone, use a importação de arquivo pelo site; o recebimento via menu Compartilhar pode não estar disponível.

**Isso não é uma extensão para o Chrome móvel e não coleta páginas automaticamente no celular.** O site mobile analisa e cria os pacotes de publicação com dados já obtidos.

## Segurança e acesso

A extensão solicita permissões para abas, scripts, downloads e armazenamento local, e acesso ao domínio **www.mercadolivre.com.br**. Ela não solicita seus tokens, cookies exportados, senha, proxies, conta Instagram ou acesso ao repositório GitHub. Não armazena o HTML completo.

**O site pode restringir robôs/scraping mesmo quando você clica no botão.** Este código não contorna controles de acesso e só deve ser usado quando a coleta for permitida. Não é uma integração oficial do Mercado Livre nem garante consulta de 80 páginas.

**Privacidade:** JSON/CSV ficam no seu computador até você importar ou compartilhar. Se publicar os dados no GitHub para usar no celular, lembre-se de que um repositório público torna os dados publicados visíveis a todos; não publique sessões, tokens nem informações pessoais.

## Limitações de interpretação

Um desconto exibido não comprova queda histórica de preço; avaliações e vendas são sinais públicos da captura, não medição própria de conversão. Condições Pix, cupom e frete variam. Confira a oferta antes de divulgar.

## Testes

A validação automática em GitHub Actions executa \`node --check\` nos scripts e \`node tests/extension-smoke.cjs\` para simular a extração de um cartão de oferta. Isso **não substitui** um teste real das 80 páginas no Chrome.
