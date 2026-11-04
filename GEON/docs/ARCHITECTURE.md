# Arquitetura do GEON

```text
Navegador
  └── public/ (HTML, CSS, JavaScript; sem chaves de API)
       └── /api/*
            ├── Express + Helmet + CSP + rate limits
            ├── Identidade anônima assinada (cookie HttpOnly)
            ├── Chat / Programação ──> provedor compatível OpenAI
            ├── Pesquisa ────────────> Tavily Search API
            └── Memória ─────────────> PostgreSQL (isolamento por user_id)
```

## Limites de confiança

- O navegador é considerado não confiável. Validação e chamadas de fornecedores acontecem no backend.
- Conteúdo de pesquisa é externo e não confiável; o frontend o exibe como texto, não como HTML.
- O modo Programação gera e analisa código, mas não o executa no servidor.
- O identificador do cookie é pseudônimo, não autenticação de conta.

## Persistência

`geon_conversations` guarda ID, identificador anônimo, título, mensagens e datas. Todas as consultas filtram pelo identificador autenticado pelo HMAC do cookie. A chave primária UUID e a condição de proprietário no `UPSERT` impedem sobrescrita de uma conversa de outro identificador.

## Rotas principais

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/api/health` | Saúde e capacidades do serviço |
| GET | `/api/config` | Capacidades públicas, sem segredos |
| POST | `/api/chat` | Chat ou modo Programação |
| POST | `/api/research` | Pesquisa externa Tavily |
| GET | `/api/memory/conversations` | Listar histórico do navegador |
| GET | `/api/memory/conversations/:id` | Abrir conversa própria |
| PUT | `/api/memory/conversations/:id` | Salvar conversa própria |
| DELETE | `/api/memory/conversations/:id` | Excluir conversa própria |
| GET | `/api/memory/export` | Exportar dados próprios |
| DELETE | `/api/memory` | Excluir toda a memória própria |

## Evolução necessária

Para escala mundial: autenticação e contas; quotas e billing; filas e streaming; observabilidade; moderação e política de uso; backups e retenção; testes de carga; suporte multilíngue; e revisão de privacidade, segurança e marca.
