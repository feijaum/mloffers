# Feed de ofertas para o celular

O arquivo \`docs/data/ofertas.json\` é **público** quando o GitHub Pages estiver ativo. Ele está vazio por padrão; isso impede mostrar ofertas antigas como atuais.

## Publicar uma seleção no GitHub (sem bot ou API não autorizada)

1. Gere o arquivo \`ranking_ofertas_ml.csv\` no Observatório da máquina onde você fez a captura de dados permitida.
2. Execute na raiz do repositório \`python tools/gerar_feed.py ranking_ofertas_ml.csv\`.
3. Inspecione \`docs/data/ofertas.json\`: não envie segredos, tokens, sessões, dados pessoais ou links privados.
4. Faça commit e push de **somente** \`docs/data/ofertas.json\`.
5. No celular, abra o site e clique em **Carregar seleção publicada no GitHub**.

Isso não consulta o Mercado Livre em tempo real; apenas publica dados comerciais que você já possui. O GitHub não deve conter banco SQLite com dados de sessão nem credenciais Meta/ML.
