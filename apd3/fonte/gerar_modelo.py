"""Gera modelo/modelo_logico.dot a partir do catálogo do banco local.

Uso: python3 gerar_modelo.py "host=... port=... user=postgres dbname=salao" saida.dot
Lê tabelas, colunas, chaves primárias e estrangeiras do schema public e das
duas tabelas criadas na APD3 (seguranca.usuario_profissional e
auditoria.registro_alteracao) e desenha o modelo lógico em Graphviz.
"""
import subprocess
import sys

CONEXAO, SAIDA = sys.argv[1], sys.argv[2]
TABELAS = ["public.cliente", "public.profissional", "public.servico", "public.agendamento",
           "public.pagamento", "public.produto", "public.venda_produto",
           "seguranca.usuario_profissional", "auditoria.registro_alteracao"]


def consulta(sql):
    r = subprocess.run(["psql", CONEXAO, "-X", "-At", "-F", "\t", "-c", sql],
                       check=True, capture_output=True, text=True)
    return [linha.split("\t") for linha in r.stdout.strip().splitlines() if linha]


lista = ",".join(f"'{t}'::regclass" for t in TABELAS)
colunas = consulta(f"""
  select c.oid::regclass::text, a.attname, format_type(a.atttypid, a.atttypmod),
         a.attnotnull,
         exists (select 1 from pg_constraint k where k.conrelid = c.oid and k.contype = 'p' and a.attnum = any (k.conkey)),
         exists (select 1 from pg_constraint k where k.conrelid = c.oid and k.contype = 'f' and a.attnum = any (k.conkey))
    from pg_class c join pg_attribute a on a.attrelid = c.oid
   where c.oid in ({lista}) and a.attnum > 0 and not a.attisdropped
   order by c.oid::regclass::text, a.attnum""")
fks = consulta(f"""
  select k.conrelid::regclass::text, k.confrelid::regclass::text, k.conname,
         (select string_agg(a.attname, ', ') from pg_attribute a where a.attrelid = k.conrelid and a.attnum = any (k.conkey))
    from pg_constraint k
   where k.contype = 'f' and k.conrelid in ({lista})""")


def nome(t):
    return t if "." in t else "public." + t


tabelas = {}
for t, col, tipo, nn, pk, fk in colunas:
    tabelas.setdefault(nome(t), []).append((col, tipo, nn == "t", pk == "t", fk == "t"))

linhas = ['digraph modelo {', '  graph [rankdir=LR, fontname="Helvetica", nodesep=0.5, ranksep=1.1, '
          'label="Base de dados do salão de beleza · modelo lógico (APD1 + tabelas da APD3)", labelloc=t, fontsize=18];',
          '  node [shape=plain, fontname="Helvetica", fontsize=10];',
          '  edge [fontname="Helvetica", fontsize=8, color="#555555", arrowhead=crow, arrowtail=tee, dir=both];']
for t in TABELAS:
    apd3 = not t.startswith("public.")
    cor = "#7A4E9E" if apd3 else "#1E487C"
    titulo = t + ("  (APD3)" if apd3 else "")
    html = [f'<table border="0" cellborder="1" cellspacing="0" cellpadding="4">',
            f'<tr><td colspan="3" bgcolor="{cor}"><font color="white"><b>{titulo}</b></font></td></tr>']
    for col, tipo, nn, pk, fk in tabelas[t]:
        marca = "PK" if pk else ("FK" if fk else "")
        col_html = f"<b>{col}</b>" if pk else col
        html.append(f'<tr><td align="left">{marca}</td><td align="left">{col_html}</td>'
                    f'<td align="left"><font color="#555555">{tipo}{"" if nn else " (nulo)"}</font></td></tr>')
    html.append("</table>")
    linhas.append(f'  "{t}" [label=<{"".join(html)}>];')
for origem, destino, conname, cols in fks:
    linhas.append(f'  "{nome(destino)}" -> "{nome(origem)}" [label="{cols}"];')
linhas.append("}")
open(SAIDA, "w", encoding="utf-8").write("\n".join(linhas) + "\n")
print(f"{SAIDA}: {len(TABELAS)} tabelas, {len(fks)} chaves estrangeiras")
