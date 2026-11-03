# GEON

**GEON** é uma aplicação web de inteligência artificial com interface responsiva em português e backend Node.js.

> O nome do produto é GEON e deve permanecer exatamente assim em interface, documentação e identidade do projeto.

## Recursos desta primeira versão

- Interface de chat responsiva para desktop e dispositivos móveis.
- Conversas recentes salvas localmente no dispositivo.
- Backend Node.js/Express que mantém a chave do provedor fora do navegador.
- Integração com API compatível com o formato OpenAI Chat Completions.
- Limite básico de requisições, validação de entrada e cabeçalhos de segurança.
- Mensagens exibidas com `textContent`, sem interpretar respostas da IA como HTML.

## Requisitos

- Node.js 20 ou superior.
- Uma chave de API de um provedor compatível com OpenAI Chat Completions.

## Executar localmente

1. Entre na pasta `GEON`.
2. Instale dependências: `npm install`.
3. Copie `.env.example` para `.env`.
4. Preencha `OPENAI_API_KEY` no arquivo local `.env`.
5. Execute `npm start`.
6. Abra `http://localhost:3000`.

Nunca envie o arquivo `.env` ao GitHub. A chave deve ser configurada como variável de ambiente no serviço de hospedagem.

## Variáveis de ambiente

| Variável | Finalidade |
|---|---|
| `OPENAI_API_KEY` | Chave secreta do provedor |
| `AI_BASE_URL` | URL base da API compatível |
| `AI_MODEL` | Identificador do modelo |
| `PORT` | Porta HTTP (padrão 3000) |

## Implantação

A aplicação pode ser implantada em um serviço que execute Node.js (por exemplo, Render, Railway ou outro host compatível).

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`
- Configure as variáveis secretas no painel do host.
- Use HTTPS e configure limites, monitoramento, política de privacidade e termos antes de abrir o serviço ao público.

## Limitações conhecidas da versão inicial

- A memória de conversas é local ao navegador; não há sincronização entre dispositivos nem contas de usuário.
- A pesquisa na internet, upload de arquivos, voz e agentes especializados ainda não estão implementados.
- A disponibilidade de respostas depende da configuração e dos limites do provedor de IA.
- Antes de um lançamento público, faça testes de carga, revisão de segurança, política de privacidade, moderação e estimativa de custos.

## Segurança

Não inclua chaves reais, senhas ou tokens no código-fonte. O endpoint de chat tem rate limit inicial por IP; para um lançamento de maior escala, acrescente autenticação, proteção contra abuso, observabilidade, quotas por usuário e gestão de custos.

## Identidade

Nome oficial: **GEON**.
