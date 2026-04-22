#!/usr/bin/env python3
"""
SIPEN — ETL Base Prover → Supabase
====================================
Importa Base Prover.csv em camadas:
  1. congregacoes  (lookup/insert)
  2. pessoas       (upsert por CPF > email > nome+nascimento)
  3. membros / visitantes / oficiais / nomeados / contratados
  4. pessoa_congregacoes  (N:N)
  5. pessoa_ministerios   (N:N)

PRÉ-REQUISITO: rodar importar-prover-migration.sql no Supabase antes.

USO:
  pip install requests
  python3 importar-prover.py [caminho_do_csv]

  Se não informar o caminho, procura "Base Prover.csv" na mesma pasta.
"""

import csv
import sys
import os
import re
import json
import unicodedata
import logging
import time
from datetime import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌  Instale: pip install requests")
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════
# CONFIGURAÇÃO
# ══════════════════════════════════════════════════════════════════════

SUPABASE_URL = "https://erhwryfzpycahgsohhbh.supabase.co"

# A chave service_role bypassa RLS e é necessária para ETL.
# Obtenha em: Supabase Dashboard → Settings → API → service_role (secret)
# Passe via variável de ambiente para não expor no código:
#   export SUPABASE_SERVICE_KEY="eyJ..."
#   python3 importar-prover.py
_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaHdyeWZ6cHljYWhnc29oaGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjg2MTUsImV4cCI6MjA5MTg0NDYxNX0"
    ".T0hp90Bmufj6a3oUPq1vYcLiGx9YjyMaZiE38S0e3_8"
)
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or _ANON_KEY

if SUPABASE_KEY == _ANON_KEY:
    print("⚠  Usando chave anon — pode falhar por RLS.")
    print("   Para usar a chave service_role:")
    print('   export SUPABASE_SERVICE_KEY="eyJ..."')
    print("   Obtenha em: Supabase Dashboard → Settings → API → service_role")
    print()

CSV_ENCODING   = "ISO-8859-1"
CSV_DELIMITER  = ";"
CPF_PLACEHOLDER = "00000000000"  # CPF fictício usado pelo Prover para quem não tem

# Caminho do CSV
if len(sys.argv) > 1:
    CSV_PATH = Path(sys.argv[1])
else:
    # Procura em locais comuns
    candidates = [
        Path(__file__).parent / "Base Prover.csv",
        Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Desenvolvimento/Base Prover.csv",
        Path.home() / "Downloads/Base Prover.csv",
    ]
    CSV_PATH = next((p for p in candidates if p.exists()), None)
    if not CSV_PATH:
        print("❌  CSV não encontrado. Informe o caminho: python3 importar-prover.py /caminho/Base\\ Prover.csv")
        sys.exit(1)

# ══════════════════════════════════════════════════════════════════════
# LOGGING
# ══════════════════════════════════════════════════════════════════════

log_file = Path(__file__).parent / f"import_prover_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════
# HELPERS HTTP (Supabase REST)
# ══════════════════════════════════════════════════════════════════════

HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
}

def _get(table: str, params: dict = None) -> list:
    """GET /rest/v1/{table}"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.get(url, headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def _post(table: str, payload, prefer: str = "return=representation"):
    """POST /rest/v1/{table}"""
    h = {**HEADERS, "Prefer": prefer}
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.post(url, headers=h, json=payload, timeout=30)
    if not r.ok:
        raise RuntimeError(f"POST {table} HTTP {r.status_code}: {r.text[:400]}")
    if prefer == "return=minimal":
        return {}
    return r.json()

def _upsert(table: str, payload, on_conflict: str, prefer: str = "return=representation"):
    """POST com Prefer: resolution=merge-duplicates"""
    h = {**HEADERS, "Prefer": f"resolution=merge-duplicates,{prefer}"}
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}"
    r = requests.post(url, headers=h, json=payload, timeout=30)
    if not r.ok:
        raise RuntimeError(f"UPSERT {table} HTTP {r.status_code}: {r.text[:400]}")
    if "minimal" in prefer:
        return {}
    return r.json()

# ══════════════════════════════════════════════════════════════════════
# NORMALIZAÇÃO DE DADOS
# ══════════════════════════════════════════════════════════════════════

def normalizar(texto: str) -> str:
    """Remove espaços, None se vazio."""
    if not texto:
        return None
    s = str(texto).strip()
    return s if s else None

def normalizar_nome(texto: str) -> str:
    s = normalizar(texto)
    if not s:
        return None
    return " ".join(s.split())  # colapsa múltiplos espaços

def normalizar_cpf(cpf: str) -> str:
    if not cpf:
        return None
    c = re.sub(r"\D", "", cpf)
    if len(c) != 11 or c == CPF_PLACEHOLDER:
        return None
    return c

def normalizar_telefone(t: str) -> str:
    if not t:
        return None
    digits = re.sub(r"\D", "", t)
    return digits if len(digits) >= 8 else None

def normalizar_data(d: str) -> str:
    if not d:
        return None
    s = d.strip()
    # formato YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    # formato DD/MM/YYYY
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", s)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return None

def normalizar_email(e: str) -> str:
    if not e:
        return None
    s = e.strip().lower()
    return s if "@" in s else None

def slug_nome_nasc(nome: str, nasc: str) -> str:
    """Chave de dedup quando não há CPF nem email."""
    if not nome or not nasc:
        return None
    n = unicodedata.normalize("NFD", nome.upper())
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    n = re.sub(r"[^A-Z0-9 ]", "", n).strip()
    return f"{n}|{nasc}"

def mapear_genero(sexo: str) -> str:
    s = (sexo or "").strip().lower()
    if s in ("masculino", "m", "male", "homem"):    return "M"
    if s in ("feminino", "f", "female", "mulher"):  return "F"
    return "nao_informado"

def mapear_estado_civil(ec: str) -> str:
    s = (ec or "").strip().lower()
    mapa = {
        "solteiro(a)": "solteiro", "solteiro": "solteiro", "solteira": "solteiro",
        "casado(a)":   "casado",   "casado":   "casado",   "casada":   "casado",
        "divorciado(a)": "divorciado", "divorciado": "divorciado", "divorciada": "divorciado",
        "viúvo(a)": "viuvo", "viuvo": "viuvo", "viuva": "viuvo",
        "união estável": "uniao_estavel", "uniao estavel": "uniao_estavel",
    }
    return mapa.get(s)

def mapear_status_membro(status_csv: str) -> str:
    s = (status_csv or "").strip().lower()
    if s == "inativo":    return "inativo"
    if s == "transferido": return "transferido"
    if s == "falecido":   return "falecido"
    return "ativo"

def multivalorado(campo: str, sep: str = "/") -> list:
    """Divide campo multivalorado e retorna lista normalizada sem vazios."""
    if not campo or not campo.strip():
        return []
    return [v.strip() for v in campo.split(sep) if v.strip()]

# ══════════════════════════════════════════════════════════════════════
# REGRAS DE CLASSIFICAÇÃO
# ══════════════════════════════════════════════════════════════════════

def classificar(tipo_cad: str, tipo_pessoa: str) -> str:
    """
    Retorna: 'oficial_pastor' | 'oficial_presbitero' | 'oficial_diacono'
             | 'nomeado' | 'contratado' | 'seminarista'
             | 'membro' | 'candidato' | 'crianca' | 'visitante'
    """
    tc = (tipo_cad or "").strip().upper()
    tp = (tipo_pessoa or "").strip().upper()

    if tc == "PASTOR" or tp == "PASTOR":
        return "oficial_pastor"
    if tc in ("PRESBÍTERO", "PRESBITERO") or tp in ("PRESBÍTERO", "PRESBITERO"):
        return "oficial_presbitero"
    if tc in ("DIÁCONO", "DIACONO") or tp in ("DIÁCONO", "DIACONO"):
        return "oficial_diacono"
    if tc in ("LIDERANÇA", "LIDERANCA") or tp in ("LÍDER", "LIDER", "LIDERANÇA", "LIDERANCA", "COORDENADOR"):
        return "nomeado"
    if tc in ("FUNCIONÁRIO", "FUNCIONARIO") or tp in ("FUNCIONÁRIO", "FUNCIONARIO", "CONTRATADO"):
        return "contratado"
    if tp == "SEMINARISTA":
        return "seminarista"
    if tc == "VISITANTE" or tp == "-" or tp == "":
        return "visitante"
    if tp == "CANDIDATO A MEMBRO":
        return "candidato"
    if tp == "CRIANÇA" or tp == "CRIANCA":
        return "crianca"
    # Pessoa / MEMBRO (default)
    return "membro"

# ══════════════════════════════════════════════════════════════════════
# ESTADO GLOBAL
# ══════════════════════════════════════════════════════════════════════

# Caches em memória para evitar round-trips repetidos
_cpf_cache:      dict[str, str] = {}   # cpf → pessoa_id
_email_cache:    dict[str, str] = {}   # email → pessoa_id
_slug_cache:     dict[str, str] = {}   # slug → pessoa_id
_prover_cache:   dict[str, str] = {}   # prover_id → pessoa_id
_cong_cache:     dict[str, str] = {}   # nome_normalizado → congregacao_id

# Contadores
cnt = {
    "lidos": 0, "pessoas_inseridas": 0, "pessoas_reutilizadas": 0,
    "membros": 0, "visitantes": 0, "oficiais": 0, "nomeados": 0,
    "contratados": 0, "seminaristas": 0,
    "congregacoes_novas": 0, "ministerios_vinculados": 0,
    "erros": 0, "pulados": 0,
}

erros_log = []

# ══════════════════════════════════════════════════════════════════════
# CAMADA 0: PRÉ-CARGA DOS CACHES
# ══════════════════════════════════════════════════════════════════════

def pre_carregar_caches():
    log.info("Pré-carregando caches de pessoas e congregações existentes...")

    # Pessoas existentes — tenta com prover_id, cai para sem ele se coluna não existir
    offset = 0
    batch  = 1000
    select_pessoas = "id,cpf,email,nome,data_nascimento,prover_id"
    pessoas_ok = True
    while pessoas_ok:
        try:
            rows = _get("pessoas", {
                "select":     select_pessoas,
                "deleted_at": "is.null",
                "limit":      str(batch),
                "offset":     str(offset),
            })
        except Exception as e:
            msg = str(e)
            if "prover_id" in msg:
                # Migration ainda não rodou: tentar sem prover_id
                select_pessoas = "id,cpf,email,nome,data_nascimento"
                log.warning("  ⚠ Coluna prover_id não existe — rode a migration SQL antes.")
                log.warning("  ⚠ Continuando sem cache de prover_id (dedup via CPF/email).")
                try:
                    rows = _get("pessoas", {
                        "select":     select_pessoas,
                        "deleted_at": "is.null",
                        "limit":      str(batch),
                        "offset":     str(offset),
                    })
                except Exception:
                    log.warning("  ⚠ Não foi possível pré-carregar cache de pessoas (RLS ou migration pendente).")
                    log.warning("  ⚠ Dedup funcionará apenas via constraints do banco.")
                    pessoas_ok = False
                    break
            else:
                log.warning(f"  ⚠ Não foi possível pré-carregar cache de pessoas: {e}")
                log.warning("  ⚠ Dedup funcionará apenas via constraints do banco.")
                pessoas_ok = False
                break

        for p in rows:
            pid = p["id"]
            if p.get("cpf"):
                _cpf_cache[p["cpf"]] = pid
            if p.get("email"):
                _email_cache[p["email"].lower()] = pid
            s = slug_nome_nasc(p.get("nome", ""), p.get("data_nascimento", "") or "")
            if s:
                _slug_cache[s] = pid
            if p.get("prover_id"):
                _prover_cache[str(p["prover_id"])] = pid
        if len(rows) < batch:
            break
        offset += batch

    # Congregações existentes
    try:
        rows = _get("congregacoes", {"select": "id,nome", "deleted_at": "is.null", "limit": "1000"})
        for c in rows:
            _cong_cache[_norm_cong(c["nome"])] = c["id"]
    except Exception as e:
        log.warning(f"  ⚠ Não foi possível pré-carregar congregações: {e}")

    log.info(
        f"  → {len(_cpf_cache)} CPFs | {len(_email_cache)} emails | "
        f"{len(_cong_cache)} congregações no banco"
    )

def _norm_cong(nome: str) -> str:
    """Normaliza nome de congregação para comparação."""
    n = unicodedata.normalize("NFD", nome.upper())
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", n).strip()

# ══════════════════════════════════════════════════════════════════════
# CAMADA 1: CONGREGAÇÕES
# ══════════════════════════════════════════════════════════════════════

def garantir_congregacao(nome: str) -> str:
    """Retorna id da congregação (criando se não existir)."""
    if not nome or not nome.strip():
        return None
    key = _norm_cong(nome)
    if key in _cong_cache:
        return _cong_cache[key]

    # Inserir nova
    result = _post("congregacoes", {
        "nome":   nome.strip().title(),
        "tipo":   "congregacao",
        "status": "ativa",
    })
    novo_id = result[0]["id"] if isinstance(result, list) else result["id"]
    _cong_cache[key] = novo_id
    cnt["congregacoes_novas"] += 1
    log.info(f"  + Congregação criada: {nome.strip()}")
    return novo_id

def processar_congregacoes_csv(rows = []):
    """Pré-scan de todas as congregações únicas para criar antes do ETL principal."""
    log.info("CAMADA 1: Pré-processando congregações...")
    nomes = set()
    for d in rows:
        for c in multivalorado(d.get("Congregações", "")):
            nomes.add(c)
        for c in multivalorado(d.get("Congregações Visitante", "")):
            nomes.add(c)
    for nome in sorted(nomes):
        garantir_congregacao(nome)
    log.info(f"  → {cnt['congregacoes_novas']} congregações novas criadas, {len(_cong_cache)} total")

# ══════════════════════════════════════════════════════════════════════
# CAMADA 2: PESSOAS
# ══════════════════════════════════════════════════════════════════════

def _encontrar_pessoa(cpf, email, slug) -> str:
    """Busca pessoa no cache local (sem round-trip ao banco)."""
    if cpf and cpf in _cpf_cache:
        return _cpf_cache[cpf]
    if email and email in _email_cache:
        return _email_cache[email]
    if slug and slug in _slug_cache:
        return _slug_cache[slug]
    return None

def _atualizar_caches(pid: str, cpf, email, slug, prover_id=None):
    if cpf:
        _cpf_cache[cpf] = pid
    if email:
        _email_cache[email] = pid
    if slug:
        _slug_cache[slug] = pid
    if prover_id:
        _prover_cache[str(prover_id)] = pid

def inserir_ou_encontrar_pessoa(d: dict) -> str:
    """
    Estratégia de dedup:
      1. prover_id (re-importação idempotente)
      2. CPF válido
      3. email
      4. nome normalizado + data_nascimento
    """
    prover_id = normalizar(d.get("id", ""))
    cpf       = normalizar_cpf(d.get("CPF", ""))
    email     = normalizar_email(d.get("Email", ""))
    nome      = normalizar_nome(d.get("Nome", ""))
    nasc      = normalizar_data(d.get("Nascimento", ""))
    slug      = slug_nome_nasc(nome, nasc) if nome else None

    if not nome:
        log.warning(f"  ⚠ Linha ignorada: nome vazio (prover_id={prover_id})")
        return None

    # 1) Verificar por prover_id (idempotência)
    if prover_id and prover_id in _prover_cache:
        cnt["pessoas_reutilizadas"] += 1
        return _prover_cache[prover_id]

    # 2) Verificar por CPF/email/slug
    pid = _encontrar_pessoa(cpf, email, slug)
    if pid:
        cnt["pessoas_reutilizadas"] += 1
        return pid

    # 3) Inserir nova pessoa
    payload = {
        "nome":                 nome,
        "apelido":              normalizar_nome(d.get("Apelido", "")),
        "cpf":                  cpf,
        "rg":                   normalizar(d.get("Número do documento", "")),
        "data_nascimento":      nasc,
        "genero":               mapear_genero(d.get("Sexo", "")),
        "estado_civil":         mapear_estado_civil(d.get("Estado Civil", "")),
        "telefone":             normalizar_telefone(d.get("Telefone Fixo", "")),
        "celular":              normalizar_telefone(d.get("Celular Principal SMS", "")),
        "whatsapp":             normalizar_telefone(d.get("Celular Principal SMS", ""))
                                if (d.get("Possui WhatsApp (Celular)", "") or "").strip().lower() == "sim"
                                else None,
        "email":                email,
        "cep":                  normalizar(d.get("CEP", "")),
        "endereco":             normalizar(d.get("Logradouro", "")),
        "numero":               normalizar(d.get("Número", "")),
        "complemento":          normalizar(d.get("Complemento", "")),
        "bairro":               normalizar(d.get("Bairro", "")),
        "cidade":               normalizar(d.get("Cidade", "")) or "São Paulo",
        "estado":               normalizar(d.get("Estado", "")) or "SP",
        "nacionalidade":        normalizar(d.get("Nacionalidade", "")),
        "naturalidade":         normalizar(d.get("Naturalidade - Cidade", "")),
        "nome_mae":             normalizar_nome(d.get("Mãe", "")),
        "nome_pai":             normalizar_nome(d.get("Pai", "")),
        "profissao":            normalizar(d.get("Profissão", "")),
        "empresa":              normalizar(d.get("Empresa", "")),
        "escolaridade":         normalizar(d.get("Escolaridade", "")),
        "procedencia_religiosa": normalizar(d.get("Procedência Religiosa", "")),
        "dizimista":            d.get("É dizimista", "").strip().lower() == "sim",
        "tipo_sanguineo":       normalizar(d.get("Tipo sanguíneo", "")),
        "observacoes":          normalizar(d.get("OBSERVAÇÃO", "")),
        "prover_id":            prover_id,
    }

    # Remover nulos para não sobrescrever defaults
    payload = {k: v for k, v in payload.items() if v is not None}

    def _tentar_post(p):
        result = _post("pessoas", p)
        return result[0]["id"] if isinstance(result, list) else result["id"]

    try:
        pid = _tentar_post(payload)
        _atualizar_caches(pid, cpf, email, slug, prover_id)
        cnt["pessoas_inseridas"] += 1
        return pid
    except RuntimeError as e:
        msg = str(e)
        # Coluna não existe (migration não rodou) — retirar campos extras e tentar de novo
        if "column" in msg and ("prover_id" in msg or "apelido" in msg or "dizimista" in msg):
            extras = ["prover_id","apelido","nome_mae","nome_pai","naturalidade","profissao",
                      "empresa","escolaridade","procedencia_religiosa","dizimista","tipo_sanguineo"]
            payload_min = {k: v for k, v in payload.items() if k not in extras}
            log.warning(f"  ⚠ Migration pendente — inserindo {nome} sem campos extras do Prover.")
            try:
                pid = _tentar_post(payload_min)
                _atualizar_caches(pid, cpf, email, slug, prover_id)
                cnt["pessoas_inseridas"] += 1
                return pid
            except RuntimeError as e2:
                msg = str(e2)
        # Conflito de unicidade — buscar a pessoa existente
        if "unique" in msg.lower() or "idx_pessoas_cpf" in msg or "idx_pessoas_email" in msg:
            if cpf:
                rows = _get("pessoas", {"cpf": f"eq.{cpf}", "select": "id", "deleted_at": "is.null"})
                if rows:
                    pid = rows[0]["id"]
                    _atualizar_caches(pid, cpf, email, slug, prover_id)
                    cnt["pessoas_reutilizadas"] += 1
                    return pid
            if email:
                rows = _get("pessoas", {"email": f"eq.{email}", "select": "id", "deleted_at": "is.null"})
                if rows:
                    pid = rows[0]["id"]
                    _atualizar_caches(pid, cpf, email, slug, prover_id)
                    cnt["pessoas_reutilizadas"] += 1
                    return pid
        log.error(f"  ❌ Erro inserindo pessoa {nome}: {e}")
        cnt["erros"] += 1
        return None

# ══════════════════════════════════════════════════════════════════════
# CAMADA 3: VÍNCULOS ESPECIALIZADOS
# ══════════════════════════════════════════════════════════════════════

def _cong_principal(d: dict, campo: str = "Congregações") -> str:
    congs = multivalorado(d.get(campo, ""))
    if not congs:
        return None
    return garantir_congregacao(congs[0])

def inserir_membro(pid: str, d: dict, tipo_prover: str):
    """Insere em membros se não existir vínculo ativo."""
    # Verificar se já é membro ativo
    existente = _get("membros", {
        "pessoa_id": f"eq.{pid}",
        "deleted_at": "is.null",
        "select": "id",
    })
    if existente:
        return  # Já existe, não duplicar

    # Tipo de ingresso
    tipo_ingresso = None
    if normalizar_data(d.get("BATISMO", "")):
        tipo_ingresso = "batismo"
    elif normalizar_data(d.get("PROFISSÃO DE FÉ", "")):
        tipo_ingresso = "profissão de fé"
    elif normalizar(d.get("TRANSFERÊNCIA", "")):
        tipo_ingresso = "transferência"
    elif tipo_prover == "candidato":
        tipo_ingresso = None  # Ainda não formalizado
    else:
        tipo_ingresso = "outro"

    payload = {
        "pessoa_id":              pid,
        "congregacao_id":         _cong_principal(d),
        "status":                 mapear_status_membro(d.get("status", "Ativo")),
        "data_ingresso":          normalizar_data(d.get("Data de Cadastro", "")),
        "tipo_ingresso":          tipo_ingresso,
        "batizado":               bool(normalizar_data(d.get("BATISMO", ""))),
        "data_batismo":           normalizar_data(d.get("BATISMO", "")),
        "data_casamento":         normalizar_data(d.get("Data de casamento", "")),
        "ministerios":            multivalorado(d.get("Ministérios", "")) or None,
        "data_profissao_fe":      normalizar_data(d.get("PROFISSÃO DE FÉ", "")),
        "data_reuniao_conselho":  normalizar_data(d.get("REUNIÃO COM CONSELHO", "")),
        "data_visita_conselho":   normalizar_data(d.get("Data Visita", "")),
        "curso_novos_membros":    normalizar_data(d.get("CURSO PARA NOVOS MEMBROS", "")),
        "numero_rol":             normalizar(d.get("Número de Rol", "")),
        "ata_ingresso":           normalizar(d.get("Número de Ata", "")),
        "tipo_pessoa_prover":     tipo_prover.upper(),
        "observacoes":            normalizar(d.get("Dados Eclesiásticos", "")),
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        _post("membros", payload, prefer="return=minimal")
        cnt["membros"] += 1
    except RuntimeError as e:
        log.error(f"  ❌ Erro inserindo membro {pid}: {e}")
        cnt["erros"] += 1

def inserir_visitante(pid: str, d: dict):
    existente = _get("visitantes", {
        "pessoa_id": f"eq.{pid}",
        "deleted_at": "is.null",
        "select": "id",
    })
    if existente:
        return

    payload = {
        "pessoa_id":            pid,
        "congregacao_id":       _cong_principal(d, "Congregações Visitante") or _cong_principal(d),
        "data_primeira_visita": normalizar_data(d.get("Data Visita", "")),
        "data_ultima_visita":   normalizar_data(d.get("Data Visita", "")),
        "origem":               normalizar(d.get("Como conheceu (texto)", ""))
                                or normalizar(d.get("Igreja de Procedência", "")),
        "obs":                  normalizar(d.get("OBSERVAÇÃO", "")),
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        _post("visitantes", payload, prefer="return=minimal")
        cnt["visitantes"] += 1
    except RuntimeError as e:
        log.error(f"  ❌ Erro inserindo visitante {pid}: {e}")
        cnt["erros"] += 1

def inserir_oficial(pid: str, d: dict, cargo: str):
    existente = _get("oficiais", {
        "pessoa_id": f"eq.{pid}",
        "cargo":     f"eq.{cargo}",
        "deleted_at": "is.null",
        "select": "id",
    })
    if existente:
        return

    payload = {
        "pessoa_id": pid,
        "cargo":     cargo,   # 'pastor' | 'presbitero' | 'diacono'
        "status":    "ativo" if d.get("status", "").strip().lower() == "ativo" else "encerrado",
    }

    try:
        _post("oficiais", payload, prefer="return=minimal")
        cnt["oficiais"] += 1
    except RuntimeError as e:
        log.error(f"  ❌ Erro inserindo oficial {pid}: {e}")
        cnt["erros"] += 1

def inserir_nomeado(pid: str, d: dict):
    ministerios = multivalorado(d.get("Ministérios", ""))
    cargo_nome  = ministerios[0] if ministerios else "Liderança"

    existente = _get("nomeados", {
        "pessoa_id": f"eq.{pid}",
        "cargo":     f"eq.{cargo_nome}",
        "select": "id",
    })
    if existente:
        return

    payload = {
        "pessoa_id":   pid,
        "orgao_tipo":  "ministerio",
        "orgao":       cargo_nome,
        "cargo":       normalizar(d.get("Tipo Cadastro", "")) or "Líder",
        "status":      "ativo" if d.get("status", "").strip().lower() == "ativo" else "inativo",
    }

    try:
        _post("nomeados", payload, prefer="return=minimal")
        cnt["nomeados"] += 1
    except RuntimeError as e:
        log.error(f"  ❌ Erro inserindo nomeado {pid}: {e}")
        cnt["erros"] += 1

def inserir_contratado(pid: str, d: dict):
    existente = _get("contratados", {
        "pessoa_id": f"eq.{pid}",
        "select": "id",
    })
    if existente:
        return

    payload = {
        "pessoa_id":       pid,
        "nome":            normalizar_nome(d.get("Nome", "")) or "Sem nome",
        "tipo_vinculo":    "clt",
        "funcao":          normalizar(d.get("Profissão", "")) or "Funcionário",
        "empresa":         normalizar(d.get("Empresa", "")),
        "contrato_desde":  normalizar_data(d.get("Data Contratação", "")),
        "contrato_ate":    normalizar_data(d.get("Data dispensa", "")),
        "status":          "ativo" if d.get("status", "").strip().lower() == "ativo" else "encerrado",
        "observacoes":     normalizar(d.get("Observações do funcionário", "")),
    }
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        _post("contratados", payload, prefer="return=minimal")
        cnt["contratados"] += 1
    except RuntimeError as e:
        log.error(f"  ❌ Erro inserindo contratado {pid}: {e}")
        cnt["erros"] += 1

# ══════════════════════════════════════════════════════════════════════
# CAMADA 4: CONGREGAÇÕES POR PESSOA (N:N)
# ══════════════════════════════════════════════════════════════════════

def vincular_congregacoes(pid: str, d: dict, classificacao: str):
    """Registra todos os vínculos de congregação de uma pessoa."""
    congs_membro    = multivalorado(d.get("Congregações", ""))
    congs_visitante = multivalorado(d.get("Congregações Visitante", ""))

    tipo_vinculo = "visitante" if classificacao == "visitante" else "membro"
    if classificacao.startswith("oficial"):
        tipo_vinculo = "pastor"
    elif classificacao == "nomeado":
        tipo_vinculo = "lider"
    elif classificacao == "contratado":
        tipo_vinculo = "funcionario"

    todas = [(c, tipo_vinculo) for c in congs_membro] + \
            [(c, "visitante") for c in congs_visitante if c not in congs_membro]

    for i, (nome_cong, tv) in enumerate(todas):
        cid = garantir_congregacao(nome_cong)
        if not cid:
            continue
        payload = {
            "pessoa_id":      pid,
            "congregacao_id": cid,
            "tipo_vinculo":   tv,
            "principal":      (i == 0 and tv != "visitante"),
            "ativo":          True,
        }
        try:
            _upsert("pessoa_congregacoes", payload,
                    on_conflict="pessoa_id,congregacao_id",
                    prefer="return=minimal")
        except RuntimeError as e:
            log.warning(f"  ⚠ Congregação N:N {pid} / {nome_cong}: {e}")

# ══════════════════════════════════════════════════════════════════════
# CAMADA 5: MINISTÉRIOS POR PESSOA (N:N)
# ══════════════════════════════════════════════════════════════════════

def vincular_ministerios(pid: str, d: dict):
    ministerios = multivalorado(d.get("Ministérios", ""))
    ministerios += [m for m in multivalorado(d.get("Ministérios Visitante", ""))
                    if m not in ministerios]

    for ministerio in ministerios:
        payload = {
            "pessoa_id":  pid,
            "ministerio": ministerio,
            "status":     "ativo",
        }
        try:
            _upsert("pessoa_ministerios", payload,
                    on_conflict="pessoa_id,ministerio",
                    prefer="return=minimal")
            cnt["ministerios_vinculados"] += 1
        except RuntimeError as e:
            log.warning(f"  ⚠ Ministério {pid} / {ministerio}: {e}")

# ══════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════

def main():
    t0 = time.time()

    log.info("═══════════════════════════════════════════════════════")
    log.info("  SIPEN — Importador Base Prover")
    log.info(f"  Arquivo: {CSV_PATH}")
    log.info("═══════════════════════════════════════════════════════")

    # ── Ler todo o CSV ────────────────────────────────────────────────
    log.info("Lendo CSV...")
    rows = []
    with open(CSV_PATH, encoding=CSV_ENCODING, newline="") as f:
        reader = csv.DictReader(f, delimiter=CSV_DELIMITER)
        for r in reader:
            rows.append(dict(r))
    log.info(f"  → {len(rows)} registros lidos")

    # ── Pré-carga ─────────────────────────────────────────────────────
    pre_carregar_caches()

    # ── Congregações (pré-scan) ───────────────────────────────────────
    processar_congregacoes_csv(rows)

    # ── ETL principal ─────────────────────────────────────────────────
    log.info("Iniciando importação por pessoa...")

    for i, d in enumerate(rows, 1):
        cnt["lidos"] += 1
        nome = normalizar_nome(d.get("Nome", "")) or f"(sem nome #{i})"

        if i % 100 == 0:
            log.info(
                f"  [{i}/{len(rows)}] "
                f"inseridas={cnt['pessoas_inseridas']} "
                f"reutilizadas={cnt['pessoas_reutilizadas']} "
                f"erros={cnt['erros']}"
            )

        # Classificar
        tc = d.get("Tipo Cadastro", "").strip()
        tp = d.get("Tipo de pessoa", "").strip()
        cls = classificar(tc, tp)

        # Inserir/encontrar pessoa
        pid = inserir_ou_encontrar_pessoa(d)
        if not pid:
            cnt["pulados"] += 1
            continue

        # Vínculo especializado
        try:
            if cls == "oficial_pastor":
                inserir_oficial(pid, d, "pastor")
                # Pastores também são membros
                inserir_membro(pid, d, "membro")
            elif cls == "oficial_presbitero":
                inserir_oficial(pid, d, "presbitero")
                inserir_membro(pid, d, "membro")
            elif cls == "oficial_diacono":
                inserir_oficial(pid, d, "diacono")
                inserir_membro(pid, d, "membro")
            elif cls == "nomeado":
                inserir_nomeado(pid, d)
                inserir_membro(pid, d, "membro")
            elif cls == "contratado":
                inserir_contratado(pid, d)
            elif cls == "seminarista":
                inserir_membro(pid, d, "membro")  # Seminaristas como membros por ora
            elif cls in ("membro", "candidato", "crianca"):
                inserir_membro(pid, d, cls)
            else:  # visitante
                inserir_visitante(pid, d)
        except Exception as e:
            log.error(f"  ❌ Erro vínculo {nome} ({cls}): {e}")
            cnt["erros"] += 1
            erros_log.append({"nome": nome, "cls": cls, "erro": str(e)})
            continue

        # Congregações N:N
        vincular_congregacoes(pid, d, cls)

        # Ministérios N:N
        vincular_ministerios(pid, d)

    # ── Relatório final ───────────────────────────────────────────────
    elapsed = time.time() - t0
    log.info("")
    log.info("═══════════════════════════════════════════════════════")
    log.info("  RELATÓRIO FINAL")
    log.info("═══════════════════════════════════════════════════════")
    log.info(f"  Linhas lidas:           {cnt['lidos']}")
    log.info(f"  Pessoas inseridas:      {cnt['pessoas_inseridas']}")
    log.info(f"  Pessoas já existentes:  {cnt['pessoas_reutilizadas']}")
    log.info(f"  Membros:                {cnt['membros']}")
    log.info(f"  Visitantes:             {cnt['visitantes']}")
    log.info(f"  Oficiais:               {cnt['oficiais']}")
    log.info(f"  Nomeados:               {cnt['nomeados']}")
    log.info(f"  Contratados:            {cnt['contratados']}")
    log.info(f"  Congregações novas:     {cnt['congregacoes_novas']}")
    log.info(f"  Ministérios vinculados: {cnt['ministerios_vinculados']}")
    log.info(f"  Pulados (sem nome):     {cnt['pulados']}")
    log.info(f"  Erros:                  {cnt['erros']}")
    log.info(f"  Tempo total:            {elapsed:.1f}s")
    log.info(f"  Log completo:           {log_file}")

    if erros_log:
        err_file = log_file.with_suffix(".erros.json")
        with open(err_file, "w", encoding="utf-8") as f:
            json.dump(erros_log, f, ensure_ascii=False, indent=2)
        log.info(f"  Detalhes de erros:      {err_file}")

    log.info("═══════════════════════════════════════════════════════")

    if cnt["erros"] > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
