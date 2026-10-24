# Instagram do Observatório ML

O Worker `observatorio-ml` usa exclusivamente seu D1 `observatorio-ml-db`. Nenhum token, banco ou webhook da aplicação original é utilizado.

## Conectar

Secrets no Worker: `VIDEO_ACCESS_PASSWORD`, `VIDEO_SESSION_SECRET` (segredo estável de sessão e criptografia), `INSTAGRAM_APP_ID` (ID do aplicativo Instagram no painel Meta), `META_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN`. Um `INSTAGRAM_ACCESS_TOKEN` existente da conta própria também é aceito para sincronização. Tokens obtidos por OAuth ficam criptografados no D1; não são devolvidos ao navegador. Reconecte quando o token expirar. Trocar VIDEO_SESSION_SECRET invalida sessões e tokens OAuth armazenados.

No app Meta configure:

- Redirect OAuth: `https://observatorio-ml.jvleite7.workers.dev/api/instagram/callback`
- Callback webhook: `https://observatorio-ml.jvleite7.workers.dev/api/instagram/webhook`
- Verify token: o valor de `INSTAGRAM_VERIFY_TOKEN`.
- Campo de webhook: `comments`.
- Permissões: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_messages`.

Na aba Instagram, entre com a senha do estúdio, informe o ID público do app Instagram em **Configuração da conexão Meta** se ele não estiver no Worker, clique em **Conectar Instagram**, autorize sua conta profissional e clique em **Ativar recebimento de comentários**. A Meta controla os requisitos de acesso, funções no app e aprovação das permissões.

## Publicar

1. Selecione uma oferta na ordem do ranking. Os textos editados em Conteúdo são reaproveitados por ID do produto, neste navegador.
2. Envie um MP4 de até 40 MB. O painel envia o arquivo original, sem gravar textos, banners ou capas sobre ele. Faça a edição no seu editor antes do upload.
3. Confira legenda + hashtags (até 2.200 caracteres) e link de afiliado.
4. Confira a automação, palavra-chave, DM com `{link}` e resposta pública opcional. A resposta vem marcada para novas publicações; desmarque para publicar sem automação.
5. Prepare e aguarde o processamento. Clique em **Publicar Reel** para publicar e associar a regra ao ID retornado pela Meta.

Arquivos temporários ficam no D1 em blocos de 1 MB, acessíveis à Meta por URLs com chave aleatória, por até 24 horas. A limpeza física acontece no próximo upload; limite total de 160 MB. Esse fluxo usa `video_url`, compatível com Instagram Login, sem depender de upload resumível exclusivo do Facebook Login. O vídeo precisa atender aos requisitos de formato da Meta; o painel não recodifica nem modifica o vídeo.

## Comentários

Somente eventos com HMAC válido, conta conectada, publicação ativa e palavra-chave correspondente podem enviar DM. O link é lido da regra salva, nunca do webhook. A DM substitui `{link}` pelo link da oferta. A resposta pública opcional só acontece depois de a API confirmar a DM. O ID do comentário é registrado antes do envio: reentregas não reenviam mensagens. Falhas ambíguas ficam como `check_required` para evitar duplicidades; não há retentativa automática. O histórico mostra o resultado. A entrega final depende da API e das permissões do destinatário.

Para posts existentes, selecione a oferta, configure os campos e clique em **Associar oferta e regra** na publicação correta. O botão **Pausar todas as automações** desativa todas as regras.

Se a resposta de publicação se perder, o estado fica `check_required`; confira no Instagram antes de preparar outro Reel. O painel nunca tenta publicar o mesmo container automaticamente uma segunda vez.

Referências oficiais: [Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/), [Publicação](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing), [Respostas privadas](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/private-replies/).

## Diagnóstico e ativação

O painel assina `comments,messages` ao carregar a conta e ao ativar uma regra. Se a Meta recusar, o erro aparece sem impedir a visualização do histórico. Configurar a URL e o token de verificação do webhook no app Meta continua necessário; assinar a conta não substitui esse cadastro.

A comparação usa a mesma normalização do projeto original: ignora caixa, acentos, pontuação e espaços extras. `EU QUERO`, `eu quero`, `Eu Quero` e `eu QUERO!` acionam a regra `EU QUERO`; palavras completas evitam correspondências acidentais.

O histórico distingue evento recebido, regra ausente/pausada, palavra-chave não encontrada e erro de envio da Meta. Nenhum nome ou texto de comentário é guardado no diagnóstico. Quando o ID da conta no evento difere, o Worker confirma que a publicação consta na coleção de mídias da conta autenticada antes de responder, sem depender do campo owner. Comentários da própria conta não são descartados silenciosamente; a API determina se a resposta é permitida.

Para um Reel existente, use **Ativar resposta** na lista; não é necessário republicar o vídeo. A ativação não reenvia DMs para comentários já processados. Faça um comentário novo para testar.

A assinatura da conta em `/subscribed_apps` não configura a URL de Webhooks do aplicativo Meta. Se não houver eventos, confira no app **Observatorio ML** o callback `https://observatorio-ml.jvleite7.workers.dev/api/instagram/webhook`, o token de verificação correspondente ao Secret e o campo `comments`. O histórico registra a confirmação de callback, a chegada HTTP e a validação de assinatura separadamente. A ausência de registro de confirmação não prova que um callback validado antes desta atualização esteja incorreto.

## Compatibilidade com o Worker original

O webhook aceita `INSTAGRAM_VERIFY_TOKEN` e, se não estiver definido, `META_WEBHOOK_VERIFY_TOKEN` (nome utilizado no instagram-comment-dm). Se os dois estiverem configurados, `INSTAGRAM_VERIFY_TOKEN` tem prioridade. Esse token confirma a URL no GET; ele não valida a assinatura dos eventos POST.

A assinatura usa o corpo bruto recebido e `META_APP_SECRET` em HMAC-SHA256, como no código original. O diagnóstico distingue cabeçalho de assinatura ausente, formato inválido e assinatura bem formada divergente. Nenhum segredo nem assinatura calculada é exibido. Cada Worker deve usar o App Secret do aplicativo que assina os eventos enviados ao seu callback; nomes de variáveis iguais não comprovam valores iguais.
