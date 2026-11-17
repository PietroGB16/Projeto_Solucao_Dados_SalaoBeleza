# Projeto_Solucao_Dados_SalaoBeleza

Base de dados de um salão de beleza: clientes, profissionais, serviços,
agendamentos, pagamentos, produtos e vendas. PostgreSQL 17 hospedado no
Supabase.

Disciplina de Banco de Dados · Bacharelado em Engenharia da Computação · IFRJ
Campus Niterói · Prof. Hélvio Jeronimo Junior

## APD3 · Administração, segurança e integridade da base de dados

A APD3 define e implementa os mecanismos que garantem a administração, a
segurança e a integridade da base criada na APD1. Onde está cada item pedido:

| Item da APD3 | Onde está |
|---|---|
| (i) Criação dos usuários para controle e acesso à base | [`apd3/scripts/01_perfis_e_usuarios.sql`](apd3/scripts/01_perfis_e_usuarios.sql) |
| (ii) Mecanismos de controle de cada usuário e das suas ações (papéis, perfis e privilégios) | [`apd3/scripts/05_privilegios.sql`](apd3/scripts/05_privilegios.sql) (privilégios por perfil, tabela, coluna e rotina), [`06_rls.sql`](apd3/scripts/06_rls.sql) (políticas de linha), [`04_visoes.sql`](apd3/scripts/04_visoes.sql) (views), [`03_auditoria.sql`](apd3/scripts/03_auditoria.sql) (trilha de auditoria), [`07_administracao.sql`](apd3/scripts/07_administracao.sql) (limites e parâmetros das contas), [`02_integridade.sql`](apd3/scripts/02_integridade.sql) (restrições de integridade) |
| (iii) Documentação técnica atualizada: Políticas de Administração, Segurança e Integridade | [`apd3/politicas-administracao-seguranca-integridade.md`](apd3/politicas-administracao-seguranca-integridade.md) (também em [DOCX](apd3/politicas-administracao-seguranca-integridade.docx) e [PDF](apd3/politicas-administracao-seguranca-integridade.pdf)) |
| (iv) Evidências da configuração, aplicação e funcionamento | [`apd3/evidencias/`](apd3/evidencias/): diagnóstico antes e depois, 97 testes de acesso e operação, inventário, testes de login, backup e restauração, idempotência e reversão; scripts [`00`](apd3/scripts/00_diagnostico.sql), [`90`](apd3/scripts/90_testes_acesso_e_operacao.sql) e [`91`](apd3/scripts/91_inventario.sql) |
| Modelos | [`modelo/`](modelo/): modelo lógico (PNG, SVG e Graphviz) e a estrutura física em SQL ([`estrutura_apd1.sql`](apd3/ambiente-local/estrutura_apd1.sql)) |

### Mecanismos adotados, em resumo

- **6 perfis e 6 usuários** (gerente, recepção, profissional, relatórios,
  auditoria e backup), um perfil por usuário, sem atributos privilegiados e
  sem senha no repositório.
- **Privilégio mínimo por tabela e por coluna:** a recepção não vê a comissão
  dos profissionais e não digita nenhum valor em dinheiro; ninguém além do
  dono faz DDL ou `TRUNCATE`.
- **Row Level Security:** cada profissional vê e conclui só a própria agenda; a
  recepção não marca atendimento como concluído sem registrar o pagamento.
- **Views** de relatório sem dado pessoal e a agenda do profissional com só o
  primeiro nome do cliente.
- **API automática do Supabase fechada** para `anon`, `authenticated` e
  `service_role`.
- **Rotinas protegidas:** `EXECUTE` só para quem usa, `search_path` fixo,
  `SECURITY DEFINER` só onde é preciso.
- **Trilha de auditoria** somente inclusão nas 7 tabelas, sem copiar valores
  (LGPD), com retenção de 12 meses.
- **8 restrições de integridade novas** (nomes em branco, formato de telefone,
  código de barras, atendimento concluído com valor), além das da APD1.
- **Administração:** limite de conexões, tempo máximo de consulta, sessões
  somente leitura, validade das contas, revisão de acessos, backup com conta
  própria, scripts idempotentes e plano de volta.

### Como aplicar

Siga [`apd3/PASSO_A_PASSO.md`](apd3/PASSO_A_PASSO.md). Ordem: `00` (antes),
`01` a `07`, `00` (depois), `90` e `91`. Para desfazer, `99_reverter.sql`.

## Estrutura do repositório

```text
.
├── README.md
├── modelo/                    modelo lógico da base (APD1 + tabelas da APD3)
└── apd3/
    ├── politicas-administracao-seguranca-integridade.md / .docx / .pdf
    ├── PASSO_A_PASSO.md       como aplicar no Supabase e entregar
    ├── scripts/               00 a 07, 90, 91 e 99
    ├── evidencias/
    │   ├── local/             saídas geradas no PostgreSQL local
    │   └── supabase/          saídas geradas no Supabase
    ├── ambiente-local/        reprodução local do Supabase e da base da APD1
    └── fonte/                 geradores do DOCX e do diagrama
```

Este repositório é público: não contém dados pessoais reais, senhas, chaves da
API nem o endereço do banco. Os dados dos testes locais são fictícios.
