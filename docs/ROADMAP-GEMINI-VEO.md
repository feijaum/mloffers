# Roadmap — Geração automática de vídeos com Gemini / Veo

Status: **planejado — não implementado**.

## Objetivo
No painel Observatório ML, permitir selecionar um produto e clicar em **Gerar vídeo com IA**, sem abrir manualmente o Google Flow. Após a conclusão, disponibilizar vídeo e legenda para download e revisão antes da publicação.

## Fluxo desejado
1. Selecionar produto e conferir imagens, título, preço e link de afiliado.
2. Gerar roteiro, prompt Veo e legenda com CTA “Comente EU QUERO”.
3. Enviar a solicitação de geração ao backend autenticado.
4. Exibir status (fila, processando, concluído, erro), com consulta assíncrona.
5. Salvar temporariamente o vídeo em armazenamento apropriado e disponibilizar downloads de vídeo e legenda.
6. Associar campanha, ID do post publicado e link de afiliado à automação de comentários/DM.

## Arquitetura proposta
- Frontend: botão e acompanhamento no painel em `docs/`.
- Backend: Cloudflare Worker separado, com autenticação, validação, limites de uso e credenciais guardadas em Secrets.
- Dados: D1 para tarefas, campanhas e status; R2 opcional para arquivos de vídeo.
- Provedor: avaliar suporte oficial do Veo pela Gemini API ou Vertex AI, modelos disponíveis, quotas, cobrança, acesso e termos antes de implementar.
- Processamento: jobs assíncronos e polling; nunca deixar chaves de API no frontend ou GitHub Pages.
- Revisão humana antes de publicar e validação de alegações comerciais, preços e estoque.

## Critérios de aceite futuros
- Um clique inicia a geração a partir do produto selecionado.
- O usuário vê progresso e erros claros.
- Vídeo e legenda ficam disponíveis para download.
- Links de afiliado não são confundidos entre campanhas.
- O recurso é opcional e não quebra o fluxo atual via Google Flow.
- Custos e limites de geração são mostrados antes de iniciar.

Nenhuma integração, cobrança ou geração automática está ativada por este documento.
