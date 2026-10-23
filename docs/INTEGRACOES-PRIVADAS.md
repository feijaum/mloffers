# Integrações privadas do Observatório ML

## Instagram próprio

O projeto `apps/instagram-comment-dm` é uma **cópia de código**, não deve compartilhar a conta, D1, webhook ou Secrets da aplicação da esposa. A instância nova deve ter nome próprio (`mloffers-instagram`), banco D1 novo e credenciais da sua conta Meta/Instagram, com OAuth oficial, permissões e validação de webhook. Nunca apontar o novo deploy para o D1 original. A UI principal agora tem aba Instagram própria e não redireciona ao projeto original. A integração completa ainda depende de provisionamento e autorização da conta.

## Vídeo Google

Backend inicial separado em `apps/video-api`, com chamadas à API de geração de vídeo e consulta assíncrona de status. Secrets `GOOGLE_API_KEY` e `ADMIN_API_TOKEN` pertencem ao Worker privado. Não adicionar a chave ao site estático, localStorage ou código GitHub. O painel de configuração exibirá o estado da integração quando houver autenticação e backend implantado. **Não habilitar chamada direta do navegador com segredo administrativo.**

## Próximas etapas

1. Criar D1 e Worker próprios para Instagram, sem reutilizar os da esposa.
2. Configurar o aplicativo Meta e autenticar sua conta profissional.
3. Implantar Worker de vídeo e configurar Secrets.
4. Implementar login de verdade e sessão no servidor antes de expor integrações ao painel.
5. Adicionar fila, limites e armazenamento privado de vídeos antes de habilitar geração em produção.
