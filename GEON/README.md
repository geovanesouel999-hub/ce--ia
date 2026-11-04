# GEON

**GEON** é uma aplicação web de inteligência artificial com interface responsiva em português, backend Node.js e arquitetura modular. O nome oficial do produto é **GEON** e deve permanecer exatamente assim.

## Recursos implementados

- Interface responsiva, navegação por teclado, rótulos acessíveis e suporte a movimento reduzido.
- Chat com provedor compatível com OpenAI Chat Completions; a chave permanece no servidor.
- Modo Programação com instruções específicas para código seguro. O GEON não executa código fornecido pelo usuário.
- Modo Pesquisa integrado ao Tavily, com até cinco fontes HTTPS e conteúdo limitado por resultado.
- Histórico local como fallback e memória persistente em PostgreSQL quando `DATABASE_URL` está configurada.
- Controles para exportar conversas, apagar dados locais e apagar toda a memória vinculada ao navegador.
- Cookie de identidade anônima assinado, `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Cabeçalhos de segurança, Content Security Policy, validação de entrada, proteção de origem e limites de requisição.
- Testes automatizados com `node:test` e pipeline GitHub Actions.

## Requisitos

- Node.js 22 ou superior.
- Uma chave de API de um provedor compatível com OpenAI Chat Completions para chat e programação.
- PostgreSQL para memória persistente no servidor.
- Chave Tavily para habilitar o modo Pesquisa.

## Executar localmente

1. Entre na pasta `GEON`.
2. Instale as dependências: `npm install`.
3. Copie `.env.example` para `.env`.
4. Configure `OPENAI_API_KEY` e um `SESSION_SECRET` aleatório com pelo menos 32 caracteres.
5. Para memória persistente, configure `DATABASE_URL` com um banco PostgreSQL. Sem ele, o histórico fica apenas no navegador.
6. Para pesquisa externa, configure `TAVILY_API_KEY`.
7. Execute `npm start` e abra `http://localhost:3000`.

Nunca envie `.env`, chaves, tokens ou dados de usuários ao GitHub.

## Variáveis de ambiente

| Variável | Finalidade |
|---|---|
| `OPENAI_API_KEY` | Segredo do provedor de IA, somente no backend |
| `AI_BASE_URL` | URL base de API compatível |
| `AI_MODEL` | Identificador do modelo |
| `SESSION_SECRET` | Assinatura do identificador anônimo do navegador; mínimo 32 caracteres em produção |
| `DATABASE_URL` | Conexão PostgreSQL para histórico persistente |
| `DATABASE_SSL` | Define SSL do PostgreSQL (`true` ou `false`) |
| `TAVILY_API_KEY` | Habilita o modo Pesquisa |
| `PORT` | Porta HTTP |
| `TRUST_PROXY` | Use `1` somente atrás de proxy confiável configurado pelo host |

## Testes e validação

```bash
npm run check
npm test
npm audit --omit=dev
```

O pipeline `.github/workflows/geon-ci.yml` executa verificação de sintaxe, testes e auditoria das dependências de produção.

## Arquitetura

- `server.js`: inicialização, Helmet, CSP, limites globais e arquivos estáticos.
- `src/config.js`: configuração e validação do ambiente.
- `src/identity.js`: cookie assinado e validação de origem.
- `src/database.js`: persistência PostgreSQL e isolamento por identificador de usuário.
- `src/ai.js`: integração do modelo no servidor.
- `src/research.js`: integração de pesquisa externa com Tavily.
- `src/validation.js`: validação de mensagens, prompts de modo e normalização de fontes.
- `src/routes.js`: API HTTP e controles de memória.
- `public/`: interface GEON.
- `test/`: testes automatizados.

Consulte `docs/ARCHITECTURE.md`, `docs/LAUNCH-CHECKLIST.md`, `SECURITY.md` e `PRIVACY.md`.

## Limites importantes antes de um lançamento mundial

Esta versão é uma base técnica implantável, não uma certificação de prontidão global. A identidade de usuário é anônima e vinculada ao cookie deste navegador; ainda não há contas, recuperação de conta, sincronização autenticada entre dispositivos, cobrança ou quotas por usuário. O modo Pesquisa depende de uma chave Tavily. O histórico em nuvem depende de PostgreSQL provisionado e configurado.

Antes de abrir o acesso público, configure autenticação, quotas por usuário, proteção contra abuso, monitoramento, backups e retenção do banco; execute testes de carga e revisão independente de segurança; publique política de privacidade e termos revisados juridicamente; verifique direitos e disponibilidade da marca GEON; configure domínio, HTTPS e hospedagem; e, se houver distribuição móvel, prepare os requisitos e a revisão das lojas.
