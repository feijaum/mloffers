# Observatório ML — legado desktop

A versão original v4.1 é um aplicativo Windows/Python com SQLite e extensão Chrome para capturas sob demanda. Ela foi entregue em ZIP na conversa que originou este monorepo.

## Situação da migração

O novo painel web, em `../docs/`, substitui **a análise e os kits de publicação** por uma solução que pode funcionar no celular, usando IndexedDB. Porém ele **não substitui a captura Chrome de 20 páginas nem o servidor Python**.

**O código-fonte do legado desktop ainda não foi incorporado integralmente a esta pasta.** Para preservá-lo, importe manualmente os arquivos do ZIP v4.1 ao GitHub, excluindo `dados/observatorio.sqlite3`, `__pycache__`, capturas de sessões e qualquer segredo.

A interface web permite importar os arquivos HTML e CSV produzidos pelo legado, consolidar o ranking e criar o pacote para Veo/Instagram sem expor o banco privado do computador.

Para uma solução 100% em nuvem, será necessário um backend autorizado para dados atualizados e uma implantação separada — GitHub Pages não executa esse tipo de serviço.
