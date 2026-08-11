/* ════════════════════════════════════════════════════
   SIPEN Mobile — Mais / Menu Completo
   mobile/mais.js · v1.0.2
════════════════════════════════════════════════════ */

(function () {
  'use strict';

  mobRegisterPage('mais', renderMais);

  const SECOES = [
    {
      titulo: 'Gestão',
      itens: [
        { ico:'💰', cor:'var(--gr)',    bg:'rgba(48,209,88,.12)',   label:'Financeiro',    page:'financeiro-mob' },
        { ico:'📝', cor:'var(--blue)',  bg:'var(--bluebg)',          label:'Contratos',     page:'contratos-mob'  },
        { ico:'🏛', cor:'var(--sky)',   bg:'var(--skybg)',           label:'Atas',          page:'atas-mob'       },
        { ico:'📊', cor:'var(--teal)', bg:'var(--tealbg)',          label:'Projetos',      page:'projetos-mob'   },
      ],
    },
    {
      titulo: 'Pastoral',
      itens: [
        { ico:'⛪', cor:'var(--violet)', bg:'var(--violetbg)',  label:'Congregações',  page:'congregacoes-mob' },
        { ico:'🤝', cor:'var(--amber)',  bg:'var(--amberbg)',   label:'Pequenos Grupos',page:'pgs-mob'          },
        { ico:'❤️', cor:'var(--rose)',   bg:'var(--rosebg)',    label:'Rede de Cuidado',page:'rede-mob'         },
        { ico:'🎓', cor:'var(--gold)',   bg:'var(--goldbg)',    label:'Ensino',         page:'ensino-mob'        },
      ],
    },
    {
      titulo: 'Departamentos',
      itens: [
        { ico:'📢', cor:'var(--violet)', bg:'var(--violetbg)',  label:'Comunicação',   page:'comunicacao-mob'  },
        { ico:'🤲', cor:'var(--teal)',   bg:'var(--tealbg)',    label:'Ação Social',   page:'social-mob'        },
        { ico:'🏛', cor:'var(--violet)', bg:'var(--violetbg)',  label:'Departamentos', page:'ministerios-mob'   },
        { ico:'🛠', cor:'var(--orange)', bg:'var(--orangebg)',  label:'Infraestrutura',page:'infra-mob'         },
      ],
    },
    {
      titulo: 'Sistema',
      itens: [
        { ico:'⚙️', cor:'var(--tx2)', bg:'var(--bg-hover)', label:'Configurações', page:'config-mob'   },
        { ico:'💻', cor:'var(--blue)', bg:'var(--bluebg)', label:'Versão Desktop', href: '/' },
      ],
    },
  ];

  function renderMais(el) {
    el.innerHTML = `
      <div style="padding-bottom:24px">
        ${SECOES.map(s => `
          <div class="mob-section">
            <div class="mob-section-title">${s.titulo}</div>
            <div class="mob-card-list">
              ${s.itens.map(item => `
                <div class="mob-list-item" onclick="${item.href ? `window.location.href='${item.href}'` : `_maisGo('${item.page}')`}">
                  <div class="mob-list-ico" style="background:${item.bg};color:${item.cor}">
                    ${item.ico}
                  </div>
                  <div class="mob-list-body">
                    <div class="mob-list-title">${item.label}</div>
                  </div>
                  <div class="mob-list-chev">${item.href ? '↗' : '›'}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  const _ROTAS = {
    'financeiro-mob':   'financeiro',
    'ministerios-mob':  'departamentos',
  };

  window._maisGo = function (page) {
    const rota = _ROTAS[page];
    if (rota) {
      mobGo(rota, { title: _rotaTitulo(page) });
    } else {
      mobToast('Em desenvolvimento', 'info');
    }
  };

  function _rotaTitulo(page) {
    const item = SECOES.flatMap(s => s.itens).find(i => i.page === page);
    return item?.label || page;
  }

})();
