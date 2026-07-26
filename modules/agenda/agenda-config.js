/* ── CONFIGURAÇÃO DA AGENDA ──────────────────────────────────── */

async function carregarConfigAgenda() {
  try {
    const rows = await getAgenda();
    const orgs = [...new Set(rows.map(r=>r.organizador).filter(Boolean))].sort();
    const orEl = document.getElementById("ag-config-orgs");
    if (orEl) orEl.innerHTML = orgs.map(o=>`
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd1)">
        <span style="font-size:11.5px;color:var(--tx1)">${escapeHtml(o)}</span>
        <span style="font-size:10px;color:var(--tx3);font-family:var(--mono)">${rows.filter(r=>r.organizador===o).length} eventos</span>
      </div>`).join("");
  } catch(e) { console.warn("Config agenda:", e.message); }
  await carregarGerenciamentoEspacos();
}
window.carregarConfigAgenda = carregarConfigAgenda;

async function carregarGerenciamentoEspacos() {
  const el = document.getElementById("ag-config-espacos");
  if (!el) return;
  el.innerHTML = `<div style="font-size:11px;color:var(--tx3)">Carregando espaços...</div>`;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/espacos?order=ordem.asc`, { headers: apiHeaders() });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();

    if (!rows.length) {
      el.innerHTML = `<div style="font-size:11.5px;color:var(--tx3);text-align:center;padding:20px">Nenhum espaço cadastrado. Execute a migration <strong>espacos-config.sql</strong> no Supabase.</div>`;
      return;
    }

    const grupos = {};
    rows.forEach(r => {
      if (!grupos[r.grupo]) grupos[r.grupo] = [];
      grupos[r.grupo].push(r);
    });

    const publicos  = rows.filter(r => r.disponivel_publico && r.ativo).length;
    const restritos = rows.filter(r => !r.disponivel_publico && r.ativo).length;

    let html = `
      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <div style="padding:6px 14px;border-radius:20px;background:rgba(58,170,92,.1);border:1px solid rgba(58,170,92,.3);font-size:11px;font-weight:700;color:var(--gr)">✓ ${publicos} disponíveis ao público</div>
        <div style="padding:6px 14px;border-radius:20px;background:rgba(74,156,245,.1);border:1px solid rgba(74,156,245,.25);font-size:11px;font-weight:700;color:var(--sky)">${restritos} uso interno</div>
      </div>`;

    Object.entries(grupos).forEach(([grupo, itens]) => {
      html += `<div style="font-size:9.5px;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.08em;padding:12px 0 6px;border-top:1px solid var(--bd1);margin-top:4px">${escapeHtml(grupo)}</div>`;
      itens.forEach(r => {
        const pub = r.disponivel_publico && r.ativo;
        html += `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:8px;margin-bottom:4px;background:${pub ? 'rgba(58,170,92,.06)' : 'var(--bg-surface)'}">
            <span style="font-size:12px;color:var(--tx1)">${escapeHtml(r.nome)}</span>
            <button
              onclick="agToggleEspacoPublico('${r.id}', ${!r.disponivel_publico})"
              style="padding:4px 12px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid ${pub ? 'rgba(58,170,92,.4)' : 'var(--bd2)'};background:${pub ? 'rgba(58,170,92,.12)' : 'var(--bg-card)'};color:${pub ? 'var(--gr)' : 'var(--tx3)'};white-space:nowrap">
              ${pub ? '✓ Público' : 'Interno'}
            </button>
          </div>`;
      });
    });

    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
window.carregarGerenciamentoEspacos = carregarGerenciamentoEspacos;

async function agToggleEspacoPublico(id, novoValor) {
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/espacos?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...apiHeaders(), "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ disponivel_publico: novoValor }),
    });
    if (!res.ok) throw new Error(await res.text());
    carregarGerenciamentoEspacos();
  } catch(e) { T("Erro", e.message); }
}
window.agToggleEspacoPublico = agToggleEspacoPublico;

async function agVerificarOcupacao() {
  const el = document.getElementById("ag-mapa-ocupacao");
  if (!el) return;

  const di = document.getElementById("ag-disp-di")?.value;
  const hi = document.getElementById("ag-disp-hi")?.value;
  const df = document.getElementById("ag-disp-df")?.value;
  const hf = document.getElementById("ag-disp-hf")?.value;

  if (!di || !hi) { el.innerHTML = `<div style="color:var(--tx3);font-size:11.5px">Informe ao menos data e hora de início.</div>`; return; }

  el.innerHTML = `<div style="color:var(--tx3);font-size:11px">${spinner()} Verificando...</div>`;
  try {
    const res = await fetch(`${apiBaseUrl()}/rest/v1/rpc/espacos_disponibilidade_admin`, {
      method: "POST",
      headers: { ...apiHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_data_inicio: di, p_hora_inicio: hi, p_data_fim: df || di, p_hora_fim: hf || null }),
    });
    if (!res.ok) throw new Error(await res.text());
    const dados = await res.json();

    const livres   = dados.filter(d => d.disponivel);
    const ocupados = dados.filter(d => !d.disponivel);

    const fmtH = h => h ? String(h).slice(0,5) : "—";
    const fmtD = d => { if(!d) return ""; const [y,m,dia]=d.split("-"); return `${dia}/${m}/${y}`; };

    let html = `<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <span style="padding:4px 12px;border-radius:20px;background:rgba(58,170,92,.1);border:1px solid rgba(58,170,92,.3);font-size:11px;font-weight:700;color:var(--gr)">✓ ${livres.length} livre${livres.length!==1?"s":""}</span>
      <span style="padding:4px 12px;border-radius:20px;background:rgba(224,85,85,.09);border:1px solid rgba(224,85,85,.25);font-size:11px;font-weight:700;color:var(--rose)">🔒 ${ocupados.length} ocupado${ocupados.length!==1?"s":""}</span>
    </div>`;

    if (ocupados.length) {
      html += `<div style="font-size:10px;font-weight:700;color:var(--rose);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Espaços ocupados</div>`;
      ocupados.forEach(d => {
        const c = d.conflito || {};
        html += `<div style="padding:10px 14px;border-radius:8px;border:1px solid rgba(224,85,85,.2);background:rgba(224,85,85,.05);margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <span style="font-size:12px;font-weight:700;color:var(--tx1)">🔒 ${escapeHtml(d.nome)}</span>
            ${c.status ? `<span style="font-size:9.5px;padding:2px 8px;border-radius:6px;background:rgba(214,148,0,.15);color:#8A6010;font-weight:700">${c.status.replace(/_/g," ")}</span>` : ""}
          </div>
          ${c.titulo ? `<div style="font-size:11.5px;color:var(--tx2);margin-top:5px">${escapeHtml(c.titulo)}</div>` : ""}
          <div style="font-size:10.5px;color:var(--tx3);margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">
            ${c.data ? `<span>📅 ${fmtD(c.data)}${c.data_encerramento&&c.data_encerramento!==c.data?" → "+fmtD(c.data_encerramento):""}</span>` : ""}
            ${c.hora_inicio ? `<span>🕐 ${fmtH(c.hora_inicio)}${c.hora_fim?" → "+fmtH(c.hora_fim):""}</span>` : ""}
            ${c.organizador ? `<span>👤 ${escapeHtml(c.organizador)}</span>` : ""}
            ${c.solicitante ? `<span>📋 ${escapeHtml(c.solicitante)}</span>` : ""}
          </div>
        </div>`;
      });
    }

    if (livres.length) {
      html += `<div style="font-size:10px;font-weight:700;color:var(--gr);text-transform:uppercase;letter-spacing:.07em;margin:12px 0 8px">Espaços disponíveis</div>`;
      html += `<div style="display:flex;flex-wrap:wrap;gap:6px">${livres.map(d =>
        `<span style="padding:5px 12px;border-radius:20px;background:rgba(58,170,92,.09);border:1px solid rgba(58,170,92,.25);font-size:11.5px;color:var(--gr)">✓ ${escapeHtml(d.nome)}</span>`
      ).join("")}</div>`;
    }

    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--rose);font-size:11.5px">Erro: ${escapeHtml(e.message)}</div>`;
  }
}
window.agVerificarOcupacao = agVerificarOcupacao;
