/**
 * SIPEN — Importador de Agenda 2026
 * Lê "Agenda IPPenha 2026.xlsx" e insere na tabela `agenda` do Supabase.
 *
 * USO:
 *   1. Coloque o arquivo .xlsx na mesma pasta deste script
 *   2. npm install xlsx
 *   3. node importar-agenda.js
 */

const XLSX = require("xlsx");
const path = require("path");
const fs   = require("fs");

// ── Configuração Supabase ─────────────────────────────────────────────
const SUPABASE_URL = "https://erhwryfzpycahgsohhbh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaHdyeWZ6cHljYWhnc29oaGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjg2MTUsImV4cCI6MjA5MTg0NDYxNX0.T0hp90Bmufj6a3oUPq1vYcLiGx9YjyMaZiE38S0e3_8";

// ── Caminho do arquivo Excel ──────────────────────────────────────────
const EXCEL_FILE = path.join(__dirname, "Agenda IPPenha 2026.xlsx");

// ── Abas mensais (ignora "Atividades Recorrenetes") ──────────────────
const ABAS_MENSAIS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

const MES_NUM = {
  "Janeiro":1,"Fevereiro":2,"Março":3,"Abril":4,
  "Maio":5,"Junho":6,"Julho":7,"Agosto":8,
  "Setembro":9,"Outubro":10,"Novembro":11,"Dezembro":12
};

// ── Helpers ───────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, "0"); }

/** Converte número serial do Excel para string "HH:MM" */
function excelTimeToString(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "string") {
    // Já é string tipo "08:00" ou "08:00:00"
    const m = val.match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${pad(m[1])}:${pad(m[2])}`;
    return null;
  }
  if (typeof val === "number") {
    // Fração do dia: 0.333 = 08:00
    const totalMin = Math.round(val * 24 * 60);
    const h = Math.floor(totalMin / 60);
    const mn = totalMin % 60;
    return `${pad(h)}:${pad(mn)}`;
  }
  return null;
}

/** Converte número serial de data do Excel para "YYYY-MM-DD" */
function excelDateToString(serial, ano, mes) {
  if (!serial) return null;
  if (typeof serial === "number" && serial > 1000) {
    // Serial de data completa do Excel (dias desde 1900-01-01)
    const d = XLSX.SSF.parse_date_code(serial);
    return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  return null;
}

/** Monta data a partir de ano/mês/dia-do-mês */
function montarData(ano, mes, dia) {
  if (!dia) return null;
  const d = parseInt(dia, 10);
  if (isNaN(d) || d < 1 || d > 31) return null;
  return `${ano}-${pad(MES_NUM[mes])}-${pad(d)}`;
}

/** Normaliza texto: remove espaços extras, null se vazio */
function txt(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// ── Parsing da planilha ───────────────────────────────────────────────

function parsearAba(sheet, nomeMes, wb) {
  const ws = wb.Sheets[sheet];
  if (!ws) { console.warn(`  ⚠ Aba "${sheet}" não encontrada`); return []; }

  // Converter para array de arrays (rows)
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true
  });

  // Detectar linha de cabeçalho (procura por "Evento" ou "Dia")
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i];
    if (!r) continue;
    const vals = r.map(v => String(v || "").toLowerCase());
    if (vals.some(v => v.includes("evento") || v.includes("dia"))) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    // Tentar linha 2 (índice 2) como padrão conforme descrição
    headerRow = 2;
  }

  const headers = (rows[headerRow] || []).map(v => String(v || "").toLowerCase().trim());

  // Mapear colunas pelos cabeçalhos encontrados
  const col = {
    semana:     headers.findIndex(h => h.includes("semana")),
    diaSemana:  headers.findIndex(h => h.includes("dia da semana") || (h.includes("dia") && h.includes("semana"))),
    diaMes:     headers.findIndex(h => h.includes("dia do mês") || h.includes("dia do mes") || (h.includes("dia") && !h.includes("semana"))),
    evento:     headers.findIndex(h => h.includes("evento")),
    horaInicio: headers.findIndex(h => h.includes("início") || h.includes("inicio") || h.includes("hora i")),
    horaFim:    headers.findIndex(h => h.includes("fim") || h.includes("hora f")),
    tempo:      headers.findIndex(h => h.includes("tempo") || h.includes("duração") || h.includes("duracao")),
    recorrencia:headers.findIndex(h => h.includes("recorr")),
  };

  // Se não achou coluna de evento, logar e pular
  if (col.evento === -1) {
    // Tentar col 3 como fallback (padrão da planilha descrita)
    col.evento = 3;
  }
  if (col.diaMes === -1) col.diaMes = 2;
  if (col.diaSemana === -1) col.diaSemana = 1;
  if (col.horaInicio === -1) col.horaInicio = 4;
  if (col.horaFim === -1) col.horaFim = 5;
  if (col.recorrencia === -1) col.recorrencia = 7;

  const eventos = [];
  const ANO = 2026;

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(v => v === null || v === "")) continue;

    const titulo = txt(row[col.evento]);
    if (!titulo) continue;

    // Ignorar linhas que são cabeçalhos repetidos
    if (titulo.toLowerCase().includes("evento") || titulo.toLowerCase().includes("atividade")) continue;

    const diaMes     = row[col.diaMes];
    const diaSemana  = txt(row[col.diaSemana]);
    const horaInicio = excelTimeToString(row[col.horaInicio]);
    const horaFim    = excelTimeToString(row[col.horaFim]);
    const recorrencia = txt(row[col.recorrencia]);

    // Montar data
    let data = null;
    if (diaMes) {
      // Pode ser número serial do Excel ou número simples (dia do mês)
      if (typeof diaMes === "number" && diaMes > 100) {
        data = excelDateToString(diaMes, ANO, null);
      } else {
        data = montarData(ANO, nomeMes, diaMes);
      }
    }

    if (!data) {
      console.log(`  → Linha ${i+1}: "${titulo}" sem data válida — pulando`);
      continue;
    }

    eventos.push({
      titulo,
      data,
      mes:         nomeMes,
      dia_semana:  diaSemana,
      hora_inicio: horaInicio,
      hora_fim:    horaFim,
      recorrencia: recorrencia,
      status:      "confirmado",
      tipo:        "culto_regular",
    });
  }

  return eventos;
}

// ── Inserção no Supabase ──────────────────────────────────────────────

async function inserirLote(eventos) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agenda`, {
    method: "POST",
    headers: {
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type":  "application/json",
      "Prefer":        "resolution=ignore-duplicates,return=minimal"
    },
    body: JSON.stringify(eventos)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  SIPEN — Importador de Agenda 2026");
  console.log("═══════════════════════════════════════════\n");

  // Verificar arquivo
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌ Arquivo não encontrado: ${EXCEL_FILE}`);
    console.error(`   Coloque "Agenda IPPenha 2026.xlsx" na pasta:`);
    console.error(`   ${__dirname}`);
    process.exit(1);
  }

  console.log(`📂 Lendo: ${path.basename(EXCEL_FILE)}`);
  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: false, raw: true });

  console.log(`   Abas encontradas: ${wb.SheetNames.join(", ")}\n`);

  let totalGeral = 0;
  let totalInseridos = 0;
  let totalPulados = 0;

  for (const mes of ABAS_MENSAIS) {
    const abaReal = wb.SheetNames.find(n => n.trim() === mes || n.normalize("NFD").replace(/\p{Mn}/gu,"") === mes.normalize("NFD").replace(/\p{Mn}/gu,""));

    if (!abaReal) {
      console.log(`⚠  Aba "${mes}" não encontrada — pulando`);
      continue;
    }

    console.log(`📅 ${mes}...`);
    const eventos = parsearAba(abaReal, mes, wb);

    if (eventos.length === 0) {
      console.log(`   (nenhum evento válido encontrado)\n`);
      continue;
    }

    console.log(`   ${eventos.length} eventos lidos`);

    // Inserir em lotes de 50
    const LOTE = 50;
    for (let i = 0; i < eventos.length; i += LOTE) {
      const lote = eventos.slice(i, i + LOTE);
      try {
        await inserirLote(lote);
        totalInseridos += lote.length;
        process.stdout.write(".");
      } catch (e) {
        console.error(`\n   ❌ Erro no lote ${i}-${i+LOTE}: ${e.message}`);
        totalPulados += lote.length;
      }
    }

    totalGeral += eventos.length;
    console.log(`\n   ✅ ${mes} concluído\n`);
  }

  console.log("═══════════════════════════════════════════");
  console.log(`✅ Importação concluída`);
  console.log(`   Total lidos:     ${totalGeral}`);
  console.log(`   Inseridos/ok:    ${totalInseridos}`);
  console.log(`   Erros/pulados:   ${totalPulados}`);
  console.log("═══════════════════════════════════════════");
}

main().catch(e => {
  console.error("❌ Erro fatal:", e.message);
  process.exit(1);
});
