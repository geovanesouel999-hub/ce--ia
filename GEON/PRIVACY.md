# Privacidade do GEON — rascunho técnico

Este documento descreve o comportamento implementado e **não substitui uma política de privacidade revisada por profissional jurídico**. Deve ser completado com a identidade legal do controlador, endereço de contato, localização do processamento, prazos de retenção e contratos dos fornecedores antes de disponibilizar o GEON ao público.

## Dados tratados

- Mensagens e respostas das conversas, quando o histórico em nuvem está habilitado.
- Identificador UUID aleatório, armazenado em cookie assinado `HttpOnly`, para associar o histórico a este navegador.
- Dados técnicos de requisição necessários ao funcionamento e à limitação de uso, como endereço IP observado pelo servidor e horários de acesso, conforme logs do host.
- Consultas e conteúdo enviados aos provedores externos de modelo e pesquisa para executar as funções solicitadas.

## Armazenamento e controles

Com `DATABASE_URL` configurada, o histórico é armazenado em PostgreSQL e associado ao cookie deste navegador. O usuário pode exportar as conversas e solicitar a exclusão de toda a memória pela interface. Sem banco configurado, o histórico é armazenado apenas no `localStorage` do navegador.

A limpeza de cookies pode tornar inacessível o histórico associado ao identificador anterior. A exclusão dentro do GEON não apaga automaticamente registros independentes que possam ser mantidos pelos provedores de IA, pesquisa, hospedagem ou monitoramento, conforme seus próprios termos e políticas.

## Antes da publicação

Defina e publique: controlador e contato; base legal; finalidade e categorias de dados; fornecedores e transferências internacionais; retenção e descarte; direitos dos titulares e canal de atendimento; resposta a incidentes; cookies; e procedimento para solicitações de acesso, correção e exclusão. Faça avaliação jurídica e de conformidade com a LGPD e leis aplicáveis aos países atendidos.
