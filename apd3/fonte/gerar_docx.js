// Gera um .docx no padrão visual da documentação do projeto (template do IFRJ) a
// partir de um Markdown desta pasta. É o mesmo texto do .md, sem cópia manual.
//
// Uso (a partir de docs/banco-de-dados):
//   node fonte/gerar_docx.js politicas-administracao-seguranca-integridade.md \
//        APD3_Politicas_Administracao_Seguranca_Integridade.docx
// Depois, o PDF:
//   soffice --headless --convert-to pdf APD3_Politicas_Administracao_Seguranca_Integridade.docx
//
// Markdown aceito: títulos (#, ##, ###), parágrafos, listas com "-" e "1.",
// tabelas com "|", blocos de código com ``` (inclusive dentro de listas) e,
// no texto, **negrito**, `código` e [links](url).
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, WidthType, BorderStyle, ShadingType, VerticalAlign,
  LevelFormat, TableLayoutType, ExternalHyperlink, PageNumber, HeadingLevel,
} = require("docx");

const [, , entrada, saida] = process.argv;
if (!entrada || !saida) {
  console.error("Uso: node fonte/gerar_docx.js <entrada.md> <saida.docx>");
  process.exit(1);
}

// ---- Paleta e medidas da documentação técnica do projeto -----------------------
const AZUL_ORIENTACAO = "1E487C";
const AZUL_LINK = "1155CC";
const CINZA_CAB = "D9D9D9";
const CINZA_CODIGO = "F2F2F2";
const LARGURA = 10080; // área útil em retrato: Carta com margens de 0,75"
const LOGO = fs.readFileSync(path.join(__dirname, "logo-ifrj.png"));

// ---- Texto com marcação simples --------------------------------------------------
function trechos(texto, base = {}) {
  const partes = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let ultimo = 0;
  let m;
  const tam = base.size ?? 22;
  const normal = (t, extra = {}) => new TextRun({
    text: t, font: "Arial", size: tam, bold: base.bold, color: base.color, ...extra,
  });
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(normal(texto.slice(ultimo, m.index)));
    const tok = m[0];
    if (tok.startsWith("**")) {
      partes.push(...trechos(tok.slice(2, -2), { ...base, bold: true }));
    } else if (tok.startsWith("`")) {
      partes.push(new TextRun({ text: tok.slice(1, -1), font: "Consolas", size: tam - 2, bold: base.bold, color: base.color ?? "202020" }));
    } else {
      const [, rotulo, url] = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (/^https?:\/\//.test(url)) {
        partes.push(new ExternalHyperlink({
          link: url,
          children: [new TextRun({ text: rotulo, font: "Arial", size: tam, color: AZUL_LINK, underline: {} })],
        }));
      } else {
        partes.push(normal(rotulo));
      }
    }
    ultimo = m.index + tok.length;
  }
  if (ultimo < texto.length) partes.push(normal(texto.slice(ultimo)));
  return partes;
}
const textoPuro = (t) => t.replace(/\*\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

// ---- Blocos ---------------------------------------------------------------------
const Paragrafo = (texto, o = {}) => new Paragraph({
  alignment: o.align ?? AlignmentType.JUSTIFIED,
  keepNext: o.keepNext,
  spacing: { before: 0, after: 110, line: 260 },
  children: trechos(texto, o),
});
const Titulo = (nivel, texto) => {
  const heading = [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][nivel - 1];
  return new Paragraph({ heading, keepNext: true, children: [new TextRun({ text: textoPuro(texto) })] });
};
function Codigo(linhas, recuo) {
  return linhas.map((linha, i) => new Paragraph({
    keepNext: i < linhas.length - 1, keepLines: true,
    indent: { left: recuo },
    shading: { fill: CINZA_CODIGO, type: ShadingType.CLEAR, color: "auto" },
    spacing: { before: i === 0 ? 60 : 0, after: i === linhas.length - 1 ? 140 : 0, line: 240 },
    children: [new TextRun({ text: linha.length ? linha : " ", font: "Consolas", size: 17 })],
  }));
}

const borda = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
function larguras(linhas, tam) {
  const n = linhas[0].length;
  // Mínimo de cada coluna: a maior "palavra" dela (um identificador entre crases
  // não pode quebrar no meio), medida pelo tamanho da fonte da tabela.
  const porCaractere = tam * 6.2;
  const minimo = Array.from({ length: n }, (_, c) => Math.max(900, 200 + porCaractere * Math.max(
    ...linhas.map((l) => Math.max(0, ...textoPuro(l[c] ?? "").split(/[\s,]+/).map((p) => p.length))))));
  const peso = Array.from({ length: n }, (_, c) =>
    Math.max(5, ...linhas.map((l) => Math.min(textoPuro(l[c] ?? "").length, 60))));
  const totalPeso = peso.reduce((a, b) => a + b, 0);
  let w = peso.map((p, c) => Math.max(minimo[c], (p / totalPeso) * LARGURA));
  // Encolhe só as colunas acima do mínimo até caber na largura útil.
  for (let volta = 0; volta < 20; volta += 1) {
    const excesso = w.reduce((a, b) => a + b, 0) - LARGURA;
    if (excesso <= 1) break;
    const folga = w.map((x, c) => Math.max(0, x - minimo[c]));
    const totalFolga = folga.reduce((a, b) => a + b, 0);
    if (totalFolga <= 0) break;
    w = w.map((x, c) => x - (folga[c] / totalFolga) * Math.min(excesso, totalFolga));
  }
  const soma = w.reduce((a, b) => a + b, 0);
  w = w.map((x) => Math.round((x * LARGURA) / soma));
  w[n - 1] += LARGURA - w.reduce((a, b) => a + b, 0);
  return w;
}
function Tabela(linhas) {
  const tam = linhas[0].length >= 5 ? 17 : 19;
  const w = larguras(linhas, tam);
  const celula = (texto, i, cabecalho) => new TableCell({
    width: { size: w[i], type: WidthType.DXA },
    borders: bordas,
    shading: cabecalho ? { fill: CINZA_CAB, type: ShadingType.CLEAR, color: "auto" } : undefined,
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0, line: 250 },
      children: trechos(texto, cabecalho ? { size: tam, bold: true, color: AZUL_ORIENTACAO } : { size: tam }),
    })],
  });
  return [
    new Table({
      width: { size: LARGURA, type: WidthType.DXA },
      columnWidths: w,
      layout: TableLayoutType.FIXED,
      rows: linhas.map((l, r) => new TableRow({
        tableHeader: r === 0, cantSplit: true,
        children: l.map((t, i) => celula(t, i, r === 0)),
      })),
    }),
    new Paragraph({ spacing: { before: 0, after: 120 }, children: [] }),
  ];
}

// ---- Leitura do Markdown ------------------------------------------------------------
function converter(md) {
  const linhas = md.replace(/\r/g, "").split("\n");
  const blocos = [];
  let listaNumerada = 0;
  let i = 0;
  const celulas = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const inicioDeBloco = (l) => /^\s*(#{1,3}\s|[-]\s|\d+\.\s|\||```)/.test(l);

  while (i < linhas.length) {
    const linha = linhas[i];
    if (!linha.trim()) { i += 1; continue; }

    const cerca = linha.match(/^(\s*)```/);
    if (cerca) {
      const recuo = cerca[1].length;
      const corpo = [];
      i += 1;
      while (i < linhas.length && !/^\s*```/.test(linhas[i])) {
        corpo.push(linhas[i].slice(Math.min(recuo, linhas[i].search(/\S|$/))));
        i += 1;
      }
      i += 1;
      blocos.push(...Codigo(corpo, recuo > 0 ? 720 : 0));
      continue;
    }

    const titulo = linha.match(/^(#{1,3})\s+(.*)$/);
    if (titulo) {
      blocos.push(Titulo(titulo[1].length, titulo[2]));
      i += 1;
      continue;
    }

    if (linha.trim().startsWith("|") && i + 1 < linhas.length && /^\s*\|\s*:?-{3,}/.test(linhas[i + 1])) {
      const tabela = [celulas(linha)];
      i += 2;
      while (i < linhas.length && linhas[i].trim().startsWith("|")) {
        tabela.push(celulas(linhas[i]));
        i += 1;
      }
      blocos.push(...Tabela(tabela));
      continue;
    }

    const item = linha.match(/^(\s*)(-|\d+\.)\s+(.*)$/);
    if (item) {
      const numerado = item[2] !== "-";
      if (numerado && item[2] === "1.") listaNumerada += 1;
      let texto = item[3];
      i += 1;
      while (i < linhas.length && linhas[i].trim() && !inicioDeBloco(linhas[i])) {
        texto += " " + linhas[i].trim();
        i += 1;
      }
      blocos.push(new Paragraph({
        numbering: numerado
          ? { reference: "numeros", level: 0, instance: listaNumerada }
          : { reference: "marcadores", level: item[1].length >= 2 ? 1 : 0 },
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: 70, line: 260 },
        children: trechos(texto),
      }));
      continue;
    }

    let texto = linha.trim();
    i += 1;
    while (i < linhas.length && linhas[i].trim() && !inicioDeBloco(linhas[i])) {
      texto += " " + linhas[i].trim();
      i += 1;
    }
    let j = i;
    while (j < linhas.length && !linhas[j].trim()) j += 1;
    const antesDeTabelaOuCodigo = j < linhas.length && /^\s*(\||```)/.test(linhas[j]);
    blocos.push(Paragrafo(texto, { keepNext: antesDeTabelaOuCodigo }));
  }
  return blocos;
}

// ---- Cabeçalho, rodapé e documento --------------------------------------------------
const semBorda = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const semBordas = { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda };
const cabecalho = new Header({
  children: [
    new Table({
      width: { size: LARGURA, type: WidthType.DXA },
      columnWidths: [3200, LARGURA - 3200],
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        children: [
          new TableCell({
            width: { size: 3200, type: WidthType.DXA }, borders: semBordas,
            children: [new Paragraph({ children: [new ImageRun({ type: "png", data: LOGO, transformation: { width: 187, height: 70 } })] })],
          }),
          new TableCell({
            width: { size: LARGURA - 3200, type: WidthType.DXA }, borders: semBordas, verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: "CURSO DE BACHARELADO EM ENGENHARIA DA COMPUTAÇÃO", font: "Arial", size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: "BASE DE DADOS DO PROJETO SALÃO DE BELEZA", font: "Arial", size: 20 })] }),
            ],
          }),
        ],
      })],
    }),
    new Paragraph({ spacing: { after: 0 }, children: [] }),
  ],
});
const rodape = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "APD3 | Administração, Segurança e Integridade da Base de Dados | ", font: "Arial", size: 16 }),
      new TextRun({ text: "Salão de Beleza", font: "Arial", size: 16, color: AZUL_LINK }),
      new TextRun({ children: [" | Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], font: "Arial", size: 16 }),
    ],
  })],
});

const titulo = (size, before, after) => ({
  run: { font: "Calibri", size, bold: true, color: "000000" },
  paragraph: { spacing: { before, after }, keepNext: true },
});
const doc = new Document({
  creator: "Projeto Salão de Beleza",
  title: textoPuro((fs.readFileSync(entrada, "utf8").match(/^#\s+(.*)$/m) || [, "Documento"])[1]),
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
      title: { run: { font: "Calibri", size: 32, bold: true, color: AZUL_ORIENTACAO }, paragraph: { spacing: { before: 0, after: 240 }, keepNext: true } },
      heading1: titulo(26, 300, 120),
      heading2: titulo(24, 220, 100),
      heading3: titulo(22, 200, 80),
    },
  },
  numbering: {
    config: [
      {
        reference: "marcadores",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ],
      },
      {
        reference: "numeros",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1000, bottom: 900, left: 1080, right: 1080, header: 360, footer: 400 },
      },
    },
    headers: { default: cabecalho },
    footers: { default: rodape },
    children: converter(fs.readFileSync(entrada, "utf8")),
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(saida, buf);
  console.log(`Gerado: ${saida}`);
});
