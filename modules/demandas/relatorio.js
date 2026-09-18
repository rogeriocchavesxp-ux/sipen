(function () {
  function _val(id) {
    var el = document.getElementById(id);
    return el ? (el.value || '').trim() : '';
  }

  window.demGerarPDF = function (contentId, opcoes) {
    var opts   = opcoes || {};
    var titulo = opts.titulo || 'Demandas';
    var ids    = opts.ids   || {};

    var el = document.getElementById(contentId);
    if (!el) { alert('Conteúdo não encontrado.'); return; }

    var table = el.querySelector('table');
    if (!table) { alert('Nenhuma demanda listada para gerar relatório.'); return; }

    var headers = Array.prototype.slice.call(table.querySelectorAll('thead th')).map(function (th) {
      return th.textContent.trim();
    });
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr')).map(function (tr) {
      return Array.prototype.slice.call(tr.querySelectorAll('td')).map(function (td) {
        return td.textContent.trim().replace(/\s+/g, ' ');
      });
    });

    if (!rows.length) { alert('Nenhuma demanda encontrada com os filtros aplicados.'); return; }

    var fstatus = _val(ids.fstatus || contentId + '-fstatus');
    var fcat    = _val(ids.fcat    || contentId + '-fcat');
    var fprio   = _val(ids.fprio   || contentId + '-fprio');
    var fbusca  = _val(ids.fbusca  || contentId + '-fbusca');

    var partes = [];
    if (fstatus) partes.push('Status: ' + fstatus);
    if (fcat)    partes.push('Categoria: ' + fcat);
    if (fprio)   partes.push('Prioridade: ' + fprio);
    if (fbusca)  partes.push('Busca: "' + fbusca + '"');
    var filtrosStr = partes.length ? partes.join(' · ') : 'Todos os itens';

    var now = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    var total = rows.length;

    var thHtml = headers.map(function (h) { return '<th>' + h + '</th>'; }).join('');
    var tbHtml = rows.map(function (cells) {
      return '<tr>' + cells.map(function (c) {
        return '<td>' + (c || '—') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    var html =
      '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<title>Relatório — ' + titulo + '</title>\n' +
      '<style>\n' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
      'body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; padding: 20px 24px; background: #fff; }\n' +
      '.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2.5px solid #216F48; }\n' +
      '.header-left h1 { font-size: 15px; font-weight: 700; color: #216F48; margin-bottom: 4px; }\n' +
      '.header-left p  { font-size: 11px; color: #555; }\n' +
      '.header-right   { font-size: 10px; color: #888; text-align: right; line-height: 1.6; }\n' +
      '.filtros { background: #f5f8f5; border: 1px solid #c8ddd0; border-radius: 5px; padding: 7px 12px; margin-bottom: 12px; font-size: 10.5px; color: #444; }\n' +
      '.filtros strong { color: #216F48; }\n' +
      '.count { font-size: 10.5px; color: #666; margin-bottom: 8px; }\n' +
      'table { width: 100%; border-collapse: collapse; font-size: 10px; }\n' +
      'thead tr { background: #216F48; color: #fff; }\n' +
      'thead th { padding: 7px 8px; text-align: left; font-weight: 600; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }\n' +
      'tbody tr { border-bottom: 1px solid #e8e8e8; }\n' +
      'tbody tr:nth-child(even) { background: #f7fdf8; }\n' +
      'tbody td { padding: 5px 8px; vertical-align: top; line-height: 1.45; }\n' +
      'tbody td:first-child { font-weight: 600; color: #1a5c3a; }\n' +
      '.footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #aaa; text-align: center; }\n' +
      '@page { margin: 14mm 12mm; size: A4 landscape; }\n' +
      '@media print { body { padding: 0; } }\n' +
      '</style>\n</head>\n<body>\n' +
      '<div class="header">\n' +
      '  <div class="header-left"><h1>Igreja Presbiteriana da Penha</h1><p>' + titulo + '</p></div>\n' +
      '  <div class="header-right">' + now + '<br>SIPEN — Sistema Integrado da IPPenha</div>\n' +
      '</div>\n' +
      '<div class="filtros"><strong>Filtros:</strong> ' + filtrosStr + '</div>\n' +
      '<div class="count">' + total + ' demanda' + (total !== 1 ? 's' : '') + '</div>\n' +
      '<table><thead><tr>' + thHtml + '</tr></thead><tbody>' + tbHtml + '</tbody></table>\n' +
      '<div class="footer">SIPEN — Sistema Integrado da IPPenha &nbsp;·&nbsp; Emitido em ' + now + '</div>\n' +
      '</body></html>';

    var win = window.open('', '_blank', 'width=1100,height=750');
    if (!win) { alert('Permita pop-ups para gerar o relatório.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(function () { win.focus(); win.print(); }, 500);
  };
})();
