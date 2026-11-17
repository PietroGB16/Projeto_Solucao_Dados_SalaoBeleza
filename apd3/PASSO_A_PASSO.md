# Passo a passo: publicar no GitHub, aplicar no Supabase e entregar

Tempo total: cerca de 40 minutos. Os comandos são para o **Git Bash** do
Windows. Para colar no Git Bash use **Shift+Insert** ou o botão direito
(Ctrl+V não funciona lá).

## Parte 1 · Publicar o repositório no GitHub (10 min)

### Caso A: o repositório da APD1 do grupo já existe

1. Clone o repositório do grupo e entre na pasta dele.
2. Descompacte o pacote e copie as pastas `apd3/` e `modelo/` para dentro do
   repositório (se já houver uma pasta `modelo/`, copie só o conteúdo com nomes
   diferentes).
3. Acrescente ao `README.md` do grupo a seção "APD3" do `README.md` deste
   pacote.
4. `git add .`, `git commit -m "APD3: segurança, administração e integridade"` e
   `git push`.

### Caso B: o repositório da APD1 não aparece

1. No GitHub, clique em **New repository**. Nome:
   `Projeto_Solucao_Dados_SalaoBeleza`. Marque **Public**. Não marque "Add a
   README". Clique em **Create repository**.
2. No Git Bash (troque `SEU_USUARIO` pelo seu usuário do GitHub):

```bash
cd ~
unzip -o ~/Downloads/Projeto_Solucao_Dados_SalaoBeleza.zip
cd Projeto_Solucao_Dados_SalaoBeleza
git init -b main
git add .
git commit -m "APD3: segurança, administração e integridade da base do salão"
git remote add origin https://github.com/SEU_USUARIO/Projeto_Solucao_Dados_SalaoBeleza.git
git push -u origin main
```

Abra o endereço do repositório no navegador e confira se as pastas `apd3/` e
`modelo/` aparecem.

## Parte 2 · Aplicar no Supabase (20 min)

### Preparação

No Git Bash, crie o atalho que copia um arquivo para a área de transferência
sem estragar os acentos, e entre na pasta dos scripts:

```bash
copiar() { powershell.exe -NoProfile -Command "Get-Content -Raw -Encoding UTF8 '$1' | Set-Clipboard"; }
cd ~/Projeto_Solucao_Dados_SalaoBeleza/apd3/scripts
```

No navegador, abra o Supabase, confira no topo se o projeto é o
**salao-agendamento** e abra **SQL Editor**.

### Para cada script da tabela abaixo

1. No Git Bash: `copiar NOME_DO_SCRIPT.sql`
2. No SQL Editor: **New query** (ou `+`), clique na área de texto, **Ctrl+V** e
   **Run**.
3. Se aparecer a janela **Potential issues detected**, clique em **Run without
   RLS**. Nunca escolha "Run and enable RLS": ela acrescenta um comando que
   esconde o resultado e bloqueia a leitura da trilha de auditoria.
4. Confira o resultado com a coluna "O que esperar".
5. No painel de resultado, clique em **Export → Download CSV** e salve o
   arquivo em `apd3/evidencias/supabase/` com o nome da última coluna.

| Passo | Script | O que esperar | Salvar como |
|---|---|---|---|
| 1 | `00_diagnostico.sql` | Linhas `RISCO`, `ATENÇÃO` e `PENDENTE` (é o "antes") | `01_diagnostico_antes.csv` |
| 2 | `01_perfis_e_usuarios.sql` | 12 linhas: 6 perfis e 6 usuários, todos sem atributo privilegiado | `02_01_perfis_e_usuarios.csv` |
| 3 | `02_integridade.sql` | 46 restrições; as 8 da APD3 com `validada = true` | `02_02_integridade.csv` |
| 4 | `03_auditoria.sql` | 18 gatilhos (`trg_auditoria` e `trg_auditoria_truncate` em 8 tabelas, mais 2 da trilha) | `02_03_auditoria.csv` |
| 5 | `04_visoes.sql` | 6 views (5 em `relatorios`, 1 em `agenda`) | `02_04_visoes.csv` |
| 6 | `05_privilegios.sql` | Matriz com 17 linhas, uma por tabela ou view | `02_05_privilegios.csv` |
| 7 | `06_rls.sql` | 34 políticas, `rls_ligado = true` em todas as tabelas | `02_06_rls.csv` |
| 8 | `07_administracao.sql` | 6 contas com limite, validade e parâmetros | `02_07_administracao.csv` |
| 9 | `00_diagnostico.sql` (de novo) | Tudo `OK` ou `INFO` | `03_diagnostico_depois.csv` |
| 10 | `90_testes_acesso_e_operacao.sql` | Última linha: **97 de 97 casos passaram** | `04_testes_acesso_e_operacao.csv` |
| 11 | `91_inventario.sql` | Inventário com cerca de 80 linhas | `05_inventario.csv` |

Tire também 3 prints (Win+Shift+S), cortando a barra de endereço do navegador,
e salve na mesma pasta:

- `print_diagnostico_depois.png`: resultado do passo 9;
- `print_testes_resumo.png`: fim do resultado do passo 10, com a linha
  RESUMO;
- `print_security_advisor.png`: **Advisors → Security Advisor**, depois dos
  scripts.

### Se aparecer uma mensagem de erro

| Mensagem | O que fazer |
|---|---|
| `Banco errado: ...` | O projeto aberto não é o do salão. Troque de projeto no topo do painel. Nada foi alterado. |
| `Papel errado: ...` | O SQL Editor está com outro papel. Escolha `postgres` no seletor de papel (canto do editor). Nada foi alterado. |
| NOTICE `Restrição ... NÃO VALIDADA` no passo 3 | Há linhas antigas fora da regra. A restrição já vale para dados novos; o passo 9 mostra quantas linhas corrigir. Não é erro. |
| Qualquer outro erro | Nada foi aplicado daquele script (ele roda numa transação só). Mande o print do erro. |

Para desfazer tudo, rode `99_reverter.sql` (a base volta ao estado da APD1).

Se alguém do grupo usa a chave `service_role` ou `anon` do Supabase em algum
programa, avise antes do passo 6: o script 05 fecha a API automática.

As contas criadas ficam **sem senha** (ninguém entra com elas). Para a APD3
isso basta: os testes do passo 10 assumem cada papel dentro do banco. Se um dia
alguém for usar uma conta, a senha é definida pelo `psql`, com
`\password nome_da_conta`.

## Parte 3 · Versionar as evidências do Supabase (5 min)

```bash
cd ~/Projeto_Solucao_Dados_SalaoBeleza
git add apd3/evidencias/supabase
git commit -m "APD3: evidências da aplicação no Supabase"
git push
```

Antes do `git add`, abra os prints e confira que nenhum mostra endereço do
projeto, chave da API ou senha.

## Parte 4 · Entregar

No Google Classroom, na atividade da APD3, entregue o link do repositório:

```text
https://github.com/SEU_USUARIO/Projeto_Solucao_Dados_SalaoBeleza
```

O repositório tem que estar **público** (ou o professor precisa ser
adicionado como colaborador).
