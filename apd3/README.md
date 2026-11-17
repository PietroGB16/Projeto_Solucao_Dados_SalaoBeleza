# APD3 · Administração, segurança e integridade da base de dados

- Documentação técnica (item iii): [`politicas-administracao-seguranca-integridade.md`](politicas-administracao-seguranca-integridade.md),
  também em [DOCX](politicas-administracao-seguranca-integridade.docx) e [PDF](politicas-administracao-seguranca-integridade.pdf).
- Scripts (itens i e ii): [`scripts/`](scripts/), aplicados na ordem `00`, `01` a `07`, `00`, `90`, `91`.
- Evidências (item iv): [`evidencias/local/`](evidencias/local/) e [`evidencias/supabase/`](evidencias/supabase/).
- Como aplicar e entregar: [`PASSO_A_PASSO.md`](PASSO_A_PASSO.md).
- Reprodução local do Supabase e da base da APD1: [`ambiente-local/`](ambiente-local/).

| Script | O que faz |
|---|---|
| `00_diagnostico.sql` | Diagnóstico de segurança e integridade, antes e depois (não altera nada) |
| `01_perfis_e_usuarios.sql` | 6 perfis, 6 usuários e o vínculo usuário → profissional |
| `02_integridade.sql` | 8 restrições `CHECK` novas, validadas contra os dados existentes |
| `03_auditoria.sql` | Trilha de auditoria somente inclusão e inventário de privilégios |
| `04_visoes.sql` | Views de relatório (sem dado pessoal) e da agenda do profissional |
| `05_privilegios.sql` | API do Supabase fechada, privilégios por perfil, tabela, coluna e rotina |
| `06_rls.sql` | Políticas de linha (RLS) por perfil |
| `07_administracao.sql` | Limite de conexões, validade e parâmetros de sessão das contas |
| `90_testes_acesso_e_operacao.sql` | 97 testes de acesso e operação por perfil (nada fica gravado) |
| `91_inventario.sql` | Inventário da configuração para a revisão de acessos (não altera nada) |
| `99_reverter.sql` | Plano de volta: devolve a base ao estado da APD1 |
