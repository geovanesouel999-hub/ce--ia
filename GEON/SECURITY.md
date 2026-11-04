# Segurança do GEON

## Controles atuais

- Segredos de provedores são lidos exclusivamente de variáveis de ambiente do backend.
- O frontend usa `textContent` e criação explícita de links HTTPS; respostas não são interpretadas como HTML.
- Helmet aplica Content Security Policy e cabeçalhos de segurança.
- Rotas validam tamanho, tipo e quantidade de mensagens e consultas.
- Há limites globais e limites separados para chat, pesquisa e operações de memória.
- Requisições mutáveis com cabeçalho `Origin` são limitadas à mesma origem.
- A memória PostgreSQL é isolada pelo identificador UUID assinado em cookie `HttpOnly`.
- O modo Programação não executa código recebido do usuário.

## Limitações e requisitos de produção

O identificador anônimo não equivale a autenticação. Quem perder o cookie não terá recuperação automática do histórico; quem obtiver o cookie poderá representar aquele navegador. Antes de um lançamento público, implemente contas com autenticação robusta, recuperação de acesso, quotas por conta, proteção contra abuso automatizado, auditoria operacional, backups testados, política de retenção e monitoramento.

Não exponha `SESSION_SECRET`, `OPENAI_API_KEY`, `TAVILY_API_KEY` ou `DATABASE_URL` em logs, respostas HTTP, frontend ou repositório. Use HTTPS em produção e limite o acesso de rede ao banco. Configure `TRUST_PROXY=1` apenas quando a aplicação estiver atrás do proxy confiável do provedor de hospedagem.

## Relato responsável

Não publique detalhes de uma vulnerabilidade explorável. Encaminhe um relato privado ao mantenedor do repositório, incluindo impacto, passos mínimos de reprodução e uma forma segura de contato. Não envie chaves reais, dados pessoais ou conteúdo privado de usuários.
