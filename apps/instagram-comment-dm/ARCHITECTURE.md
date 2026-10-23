# Arquitetura

## Estado inicial

O repositório foi criado vazio e não possuía framework, dependências, banco, migrações, autenticação, integrações ou testes existentes. A arquitetura abaixo é o baseline aprovado para orientar a implementação incremental.

## Stack alvo

### Frontend

- React + TypeScript.
- Interface administrativa em pt-BR.
- Nenhum segredo da Meta ou segredo de sessão no cliente.
- Não usar localStorage para tokens ou segredos.

### Backend

- Cloudflare Workers.
- API responsável por autenticação, autorização, CRUD, webhooks e processamento assíncrono quando necessário.
- Validação de entrada e saída com Zod ou equivalente.
- CORS restritivo e headers de segurança.

### Persistência

- Cloudflare D1.
- Migrações versionadas.
- Índices e constraints para integridade e idempotência.

## Modelo conceitual

`COMMENT EVENT → INSTAGRAM ACCOUNT → POST ID → AUTOMATION RULE → PRODUCT → SAVED PRODUCT URL → DM`

O evento recebido do webhook nunca define diretamente a URL de destino. A URL deve ser resolvida por uma associação persistida e autorizada no banco.

## Entidades previstas

- `users`
- `instagram_accounts`
- `posts`
- `products`
- `automation_rules`
- `webhook_events`
- `automation_logs`
- `audit_logs`
- `rate_limits`

## Fluxo do webhook

1. Receber a requisição.
2. Validar assinatura conforme a documentação oficial atual da Meta.
3. Validar estrutura e campos permitidos.
4. Identificar conta Instagram autorizada.
5. Identificar a publicação cadastrada.
6. Registrar evento com chave única para idempotência.
7. Aplicar regras ativas da publicação e matching de palavras-chave.
8. Verificar limites, anti-spam e condições de segurança.
9. Resolver produto e URL previamente cadastrados.
10. Enfileirar/processar o envio da DM conforme a arquitetura definida.
11. Registrar resultado sem incluir segredos.

## Isolamento e autorização

Toda operação administrativa e todo recurso do backend deve verificar autenticação e autorização. IDs fornecidos pelo cliente nunca devem ser considerados prova de propriedade; as consultas devem impor o vínculo do recurso ao usuário autorizado para evitar IDOR/BOLA.

## Integração Meta

A implementação deverá usar exclusivamente APIs oficiais. Antes de codificar o fluxo de autenticação, permissões, webhooks e mensagens, a documentação oficial atual da Meta/Instagram deverá ser verificada para confirmar versão, permissões, formatos de eventos e restrições vigentes.

## URL de produto

Somente URLs HTTPS previamente salvas pelo administrador serão elegíveis para envio. Esquemas como `javascript:`, `data:` e `vbscript:` devem ser rejeitados. A URL presente em payload externo nunca deve ser usada como destino.

## Processamento confiável

O desenho deve contemplar:

- idempotência em nível de banco;
- prevenção de replay e duplicidade;
- rate limits por usuário Instagram, publicação, conta e global;
- backoff/retry controlado quando aplicável;
- prevenção de loops e floods;
- pausa global de emergência para todas as automações.

## Documentação operacional

Qualquer mudança estrutural relevante deve atualizar `PROJECT_STATE.md`, `CHANGELOG.md`, e, quando aplicável, `SECURITY.md` e este documento.
