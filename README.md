# Minimalist Data Collector - Vanilla JavaScript

Um website minimalista e ultraleve para coleta de dados de visitantes com persistência em Supabase.

## Características

✅ **Vanilla JavaScript** - Sem dependências de frameworks
✅ **Geolocalização Robusta** - Geolocation API + IP Fallback
✅ **Performance** - Carregamento e execução ultra rápidos
✅ **Supabase Integration** - Persistência com timeout de 2s
✅ **Deployment Estático** - Pronto para Vercel como site estático

## Dados Coletados

### Identificação

- Timestamp (ISO 8601)
- Session ID (UUID)
- Referrer
- URL atual

### Navegador/Hardware

- User Agent
- Idioma
- Plataforma
- Cookie Enable/Disable
- Do Not Track
- Hardware Concurrency (núcleos)
- Device Memory (RAM)

### Tela/Viewport

- Resolução da tela
- Profundidade de cores
- Dimensões da janela
- Device Pixel Ratio

### Geolocalização (com fallback)

- Latitude/Longitude
- Acurácia
- Cidade
- Estado/Região
- País
- Fonte (API nativa ou IP)
- Status (sucesso ou falha)

### Performance

- Objeto performance.timing completo com todos os timestamps

## Configuração

### 1. Setup Supabase

1. Crie um projeto no Supabase
2. Vá para SQL Editor e execute o script `01_create_visits_data_table.sql`
3. Copie sua URL do projeto e Anonymous Key

### 2. Configurar Variáveis de Ambiente

Edite `public/app-core.js` e atualize:

\`\`\`javascript
const CONFIG = {
SUPABASE_URL: "https://seu-projeto.supabase.co",
SUPABASE_ANON_KEY: "sua-chave-anon-aqui",
REDIRECT_URL: "https://seu-site-destino.com",
TIMEOUT_MS: 2000,
DB_TABLE: "visits_data"
};
\`\`\`

### 3. Deploy no Vercel

\`\`\`bash
vercel
\`\`\`

Ou via GitHub integration no Vercel Dashboard.

## Fluxo de Execução

1. **Coleta de Dados** - Extrai todos os dados possíveis do navegador
2. **Geolocalização**
   - Tenta Geolocation API nativa (com consentimento do usuário)
   - Se falhar, tenta IP-based geolocation via múltiplos serviços
   - Se ambas falharem, marca como "geo_failed"
3. **Persistência** - Envia dados ao Supabase com timeout de 2s
4. **Redirecionamento** - Redireciona o usuário para REDIRECT_URL

## Segurança

- Row Level Security ativada no Supabase
- Apenas inserts anônimos permitidos (coleta de dados)
- Apenas usuários autenticados podem ler (dashboard admin)
- Timeout rigoroso de 2s para evitar travamentos
- Sem armazenamento de credentials no lado do cliente (Anonymous Key apenas)

## Performance

- **Tamanho**: ~4KB (gzipped)
- **Timeout Total**: ~2.1 segundos
- **Fallback**: Sempre redireciona, mesmo se falhar

## Troubleshooting

**CORS errors ao enviar para Supabase?**

- Verifique se a URL do Supabase está correta
- Certifique-se de que a Anonymous Key é válida
- Verifique as políticas RLS da tabela

**Geolocalização não funciona?**

- HTTPS é necessário para Geolocation API
- O usuário precisa permitir acesso à localização
- IP-based fallback será usado automaticamente

**Dados não aparecem no Supabase?**

- Verifique logs do navegador (DevTools Console)
- Confirme que a tabela existe
- Teste acesso via SQL Editor do Supabase
