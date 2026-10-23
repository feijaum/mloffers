# Segurança

Este projeto trata segurança, privacidade e confiabilidade como requisitos de primeira classe.

## Segredos

Nunca armazenar no repositório ou no frontend tokens da Meta/Instagram, client/API secrets, senhas em texto puro, segredos de sessão, credenciais de banco, chaves privadas ou dados sensíveis de configuração. Segredos devem ser fornecidos por secret management/runtime e nunca aparecer em logs, respostas de API, mensagens de erro ou localStorage.

## Autenticação e sessão

A Fase 3 implementa:

- hash de senha com PBKDF2-HMAC-SHA-256 e salt aleatório;
- sessões aleatórias armazenadas somente como hash no D1;
- cookie `__Host-session` com `HttpOnly`, `Secure`, `SameSite=Strict` e `Path=/`;
- expiração de sessão e logout com revogação;
- respostas genéricas para falhas de credencial;
- limitação de tentativas de login por identificador;
- proteção de origem para operações de alteração de estado;
- auditoria de login e logout sem registrar credenciais.

O endpoint de autenticação nunca retorna senha, hash, token de sessão ou segredo.

## Autorização

Toda requisição a recurso protegido deve verificar autenticação e autorização no backend. IDs enviados pelo cliente não são suficientes para autorizar acesso. Consultas devem restringir explicitamente o proprietário/escopo do recurso para prevenir IDOR/BOLA.

## Entrada e saída

Validar entradas e saídas com schemas. Aplicar controles contra SQL injection, XSS, CSRF quando aplicável, payloads malformados, parâmetros inesperados, URLs perigosas e abuso de endpoints. Não executar HTML, JavaScript ou código arbitrário recebido de templates ou webhooks.

## Headers

Respostas JSON da API aplicam `Cache-Control: no-store`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e uma política CSP restritiva.

## URLs

Produtos aceitam somente URLs HTTPS cadastradas pelo administrador. Rejeitar esquemas perigosos como `javascript:`, `data:` e `vbscript:`. Nunca transformar uma URL recebida de webhook em destino de mensagem.

## Webhooks

Validar assinatura conforme a documentação oficial atual da Meta; rejeitar assinatura inválida; validar método, estrutura e conteúdo; rejeitar eventos desconhecidos ou não autorizados; identificar conta e publicação por configuração confiável; garantir idempotência em nível de banco; não registrar payloads sensíveis desnecessariamente.

## Anti-spam e abuso

Aplicar limites configuráveis por usuário do Instagram, publicação, conta e sistema/global. Também prevenir mensagens duplicadas, replay, retries descontrolados, loops, floods e abuso da API. Deve existir uma ação global de emergência para `PAUSAR TODAS AS AUTOMAÇÕES`.

## Auditoria

Registrar eventos de segurança e alterações administrativas relevantes. Logs nunca devem conter tokens, senhas, cookies, segredos ou dados pessoais desnecessários.

## Meta/Instagram

Somente APIs oficiais serão utilizadas. Não implementar scraping, automação de navegador, endpoints não oficiais ou métodos para contornar restrições da Meta.

## Validação antes de produção

A suíte deve cobrir autenticação, autorização, IDOR/BOLA, rate limiting, idempotência, webhook/assinatura, duplicidade, payloads maliciosos, XSS, SQL injection, URLs, templates e mocks de DM. Nenhuma etapa deve ser declarada concluída sem evidência de validação correspondente.
