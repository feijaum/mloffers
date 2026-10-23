# Estúdio automático de vídeos (Gemini Omni Flash)

Integração de geração no **mesmo Cloudflare Worker** `observatorio-ml`, com frontend em `docs/index.html` (aba Conteúdo) e backend em `worker/video.js`.

## Ativação

A migração `migrations/0002_video_jobs.sql` é aplicada pelo GitHub Actions antes do deploy. Após o workflow ficar verde, cadastrar os Secrets **no Worker observatorio-ml**, em Cloudflare > Configurações > Variáveis e segredos:

| Secret | Conteúdo |
| --- | --- |
| `GOOGLE_API_KEY` | Já cadastrado pelo administrador; chave Google AI Studio habilitada para Gemini Omni 1.1 Flash |
| `VIDEO_ACCESS_PASSWORD` | Senha forte, exclusiva, para entrar no estúdio de vídeos |
| `VIDEO_SESSION_SECRET` | String aleatória com pelo menos 32 bytes/64 caracteres hexadecimais, independente de todas as outras chaves |

Nunca colocar esses valores no GitHub, README, frontend, variáveis públicas ou chat. Os secrets não são os mesmos do GitHub Actions.

## Fluxo

1. Abra a aba **Ofertas** e importe a lista de produtos.
2. Vá à aba **Conteúdo** e selecione o produto. A imagem é enviada à API como referência somente se a opção estiver ligada e o URL estiver na lista permitida de imagens do Mercado Livre.
3. Entre no estúdio usando a senha configurada em `VIDEO_ACCESS_PASSWORD`. A senha não é armazenada no navegador: a sessão é um cookie HttpOnly, Secure, SameSite=Strict com expiração de 2 horas.
4. Edite o roteiro, utilize **Gemini Omni 1.1 Flash**, marque a confirmação de cobrança e inicie manualmente uma geração.
5. Em **Vídeos recentes**, use **Verificar status** para acompanhar a operação e **Baixar MP4** quando estiver pronta.

**Importante:** o site não envia DMs, não publica conteúdo diretamente no Instagram e não gera vídeos sem clique expresso. Vídeos são gerados nos servidores do Google e podem expirar; baixe o MP4 ao terminar. O backend limita a três solicitações/dia e dez tentativas de login por IP/hora. Há custos externos do Google, que devem ser acompanhados no Google Cloud. Não há garantia de disponibilidade/acesso aos modelos. A imagem de entrada pode ser transformada pela IA; confira fidelidade, marca e atributos antes de publicar.

## Verificações

- `GET /api/video/auth`: deve indicar `configured: true`, sem divulgar os segredos.
- `POST /api/video/login`: autenticação para liberar geração.
- `POST /api/video/generate`: cria job e consulta Google.
- `GET /api/video/jobs` e `/api/video/jobs/{id}`: listagem e status autenticados.
- `GET /api/video/download/{id}`: download autenticado.

**Status:** código preparado no GitHub. Integração fim a fim não foi testada com a chave Google do usuário; o funcionamento real depende do deploy, dos dois Secrets adicionais, disponibilidade de Gemini Omni para o projeto e resposta da API. Não executar primeira geração paga sem revisar o modelo e o orçamento.

## Atualização de 23/10/2026

Os modelos Veo 3.1 Preview da Gemini API foram encerrados em **22/10/2026**. O backend usa o modelo estável `gemini-omni-1.1-flash`, com `POST /v1beta/interactions`, `response_format: {type: 'video', aspect_ratio: '9:16', delivery: 'uri'}`. A imagem é enviada em `input` como item do tipo `image` e o texto como tipo `text`. O URI do vídeo retornado pela API é armazenado no D1; a checagem `GET /files/{id}` determina o estado ACTIVE. Consulte [documentação oficial do Google](https://ai.google.dev/gemini-api/docs/omni).

Não é preciso substituir `GOOGLE_API_KEY` ou os outros Secrets por causa da troca de modelo. Gerações com o modelo antigo que falharam continuam no histórico como failed. A cobrança depende da Google AI Studio API. A migração foi implementada com base na documentação REST, mas o fluxo completo precisa ser testado com uma conta Google autorizada.
