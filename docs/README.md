# Portal web / GitHub Pages

Site estático mobile-first. Para publicar: **Settings → Pages → Deploy from a branch → main → /docs → Save**. URL esperada, após ativação: https://feijaum.github.io/mloffers/

**O que funciona:** importação local de HTMLs de ofertas do Mercado Livre, CSVs exportados pelo Observatório e backup JSON; deduplicação por ID MLB; ranking heurístico; fotos dos produtos, quando existentes; kit Veo/Flow, legenda com «Comente EU QUERO», link dentro da publicação, modelo de DM; armazenamento local via IndexedDB, exportações e PWA.

**O que não funciona sozinho no Pages:** coleta online de anúncios de terceiros, 20 páginas automáticas, execução Python, extensão Chrome e envio real de DMs. Esses recursos requerem sistemas autorizados independentes. Não incluir tokens Meta/Mercado Livre no navegador.

**Privacidade:** os arquivos importados são processados no navegador; apenas imagens públicas dos produtos são requisitadas ao CDN quando exibidas. Informações de captura ficam no IndexedDB do aparelho. Não sincroniza entre dispositivos. O link de afiliado é armazenado localmente, não enviado por backend.

**Atenção à precificação:** números registrados em captura não são cotações ao vivo; descontos riscados não são histórico comprovado; notas de conversão são heurísticas e não taxas medidas.
