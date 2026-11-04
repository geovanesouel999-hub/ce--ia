# GEON — checklist de lançamento

## Infraestrutura

- [ ] Criar serviço Node.js em hospedagem de produção.
- [ ] Configurar `OPENAI_API_KEY` como segredo do backend.
- [ ] Provisionar PostgreSQL e configurar `DATABASE_URL`.
- [ ] Configurar `SESSION_SECRET` com pelo menos 32 caracteres aleatórios.
- [ ] Configurar `TAVILY_API_KEY` para habilitar Pesquisa.
- [ ] Confirmar `NODE_ENV=production`, proxy confiável e HTTPS.
- [ ] Validar `/api/health` e os fluxos de chat, pesquisa, exportação e exclusão.
- [ ] Configurar domínio, DNS, TLS, backups, alertas e monitoramento.

## Segurança e operação

- [ ] Implementar autenticação de contas e recuperação de acesso.
- [ ] Aplicar quotas por usuário, limites de custo e prevenção de abuso.
- [ ] Executar revisão independente de segurança e testes de carga.
- [ ] Definir política de retenção, backups e resposta a incidentes.
- [ ] Revisar dependências e resolver alertas do `npm audit`.

## Jurídico, marca e distribuição

- [ ] Revisar política de privacidade e termos com assessoria jurídica.
- [ ] Definir controlador, contato, bases legais e fornecedores de dados.
- [ ] Verificar disponibilidade, titularidade e conflitos da marca GEON nos territórios-alvo.
- [ ] Preparar identidade visual, acessibilidade e suporte multilíngue.
- [ ] Se publicar app móvel, preparar assinatura, ficha da loja, política de dados e revisão da Google Play/App Store.

## Critério de conclusão

Só anunciar o GEON como lançado quando uma URL pública HTTPS estiver funcional, os testes de produção passarem e os itens obrigatórios de segurança, privacidade, custos e operação estiverem resolvidos.
