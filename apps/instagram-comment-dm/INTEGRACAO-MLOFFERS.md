# Integração Instagram + Observatório ML

Esta pasta contém uma **cópia de código** de [feijaum/instagram-comment-dm](https://github.com/feijaum/instagram-comment-dm) feita em 23/10/2026. O repositório de origem e a implantação em produção não foram alterados.

## Cuidados de segurança

Ao copiar o projeto para um novo repositório público, migrações antigas contendo endereços pessoais e hashes de senha fixos foram substituídas por versões saneadas: `0004`, `0005`, `0006` e `0008`. O `wrangler.jsonc` foi isolado com novo nome e ID de D1 a configurar, evitando sobrescrever o Worker original por acidente. **Não é uma instalação pronta do zero sem reconfiguração e migrações validadas.**

Para continuar usando a automação atualmente funcional, mantenha o deploy original. O frontend de ofertas não se conecta diretamente à API administrativa por não termos um contrato público e seguro para autenticação entre sistemas.

## Regra para cada publicação

- Produto escolhido no Observatório e seu ID MLB.
- Link de afiliado gerado pelos canais oficiais e conferido antes da publicação.
- Texto da legenda inclui o link no corpo da publicação e a frase **Comente EU QUERO** (sem «link na bio»).
- No administrador Instagram, associe **ID da publicação → produto → URL → palavra-chave normalizada `eu quero`**.
- Mensagem de DM deve conter apenas a URL cadastrada por você e não deve confiar num link recebido pelo webhook.

A relação comentário/post/produto é intencional: a palavra-chave "eu quero" pode ser igual em muitas publicações, mas a URL correta é a associada àquele post, não um único link global.

No GitHub Pages, nenhum segredo, token de sessão, Meta App Secret ou token de afiliado deve ser armazenado.
