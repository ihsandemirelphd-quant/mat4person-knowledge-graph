/* MAT4Person — ID card catalog with modal detail view */
(() => {
  const {
    DATA, nodeById, fmt, esc, el, CONF,
    typeColor, typeLabel, nodeColor, familyColor, familyLabel, confColor,
    graphLink, atlasLink, initials, sourceTail, contributeLink, sourceChip,
  } = window.M4;

  const filters = { q: '', type: 'all', sort: 'degree' };
  const cardsEl = document.getElementById('cards');
  const countEl = document.getElementById('count');
  const modalBack = document.getElementById('modalBack');
  const modal = document.getElementById('modal');

  const relsFor = id => DATA.relations.filter(r => r.source === id || r.target === id);
  const typeOrder = { fundamental_person: 0, base_person: 1, institute: 2, institute_nebula: 2, event: 3, unknown: 4 };

  /* ---------- type filter chips ---------- */
  const chipsEl = document.getElementById('typeChips');
  const typeCounts = {};
  DATA.nodes.forEach(n => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });
  const chipDefs = [['all', 'all', '#e9b44c'], ...Object.keys(typeOrder)
    .filter(t => typeCounts[t])
    .map(t => [t, typeLabel(t), typeColor(t)])];
  chipDefs.forEach(([value, label, color]) => {
    const chip = el('button', 'chip' + (value === 'all' ? ' on' : ''),
      `<span class="swatch"></span>${esc(label)}${value === 'all' ? '' : ` · ${typeCounts[value]}`}`);
    chip.style.setProperty('--c', color);
    chip.onclick = () => {
      filters.type = value;
      chipsEl.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
      chip.classList.add('on');
      render();
    };
    chipsEl.appendChild(chip);
  });

  /* ---------- card ---------- */
  function confMeter(c) {
    const total = (c.high || 0) + (c.medium || 0) + (c.low || 0);
    if (!total) return '';
    return `<div class="conf-meter" title="high ${c.high || 0} · medium ${c.medium || 0} · low ${c.low || 0}">
      <i style="width:${(c.high || 0) / total * 100}%;background:${CONF.high}"></i>
      <i style="width:${(c.medium || 0) / total * 100}%;background:${CONF.medium}"></i>
      <i style="width:${(c.low || 0) / total * 100}%;background:${CONF.low}"></i></div>`;
  }

  function cardNode(n) {
    const types = Object.entries(n.relationTypes || {}).sort((a, b) => b[1] - a[1]);
    const card = el('article', 'id-card');
    card.style.setProperty('--c', nodeColor(n));
    card.innerHTML = `
      <div class="head">
        <span class="monogram" style="--c:${nodeColor(n)}">${n.type === 'fundamental_person' ? '✦' : esc(initials(n.label))}</span>
        <div style="min-width:0">
          <h3>${esc(n.label)}</h3>
          <div class="small" style="color:${nodeColor(n)}">${esc(typeLabel(n.type))}</div>
        </div>
      </div>
      ${n.aliases?.length ? `<div class="aliases">${esc(n.aliases.join(' · '))}</div>` : ''}
      <div class="statline">
        <span><b>${n.degree}</b>relations</span>
        <span><b>${Object.keys(n.relationTypes || {}).length}</b>types</span>
        <span><b>${Object.keys(n.sources || {}).length}</b>sources</span>
      </div>
      ${confMeter(n.confidence || {})}
      <div style="margin-top:6px">${types.slice(0, 3).map(([k, v]) => `<span class="tag" style="--c:#e9b44c">${esc(familyLabel(k))} ${v}</span>`).join('')}
      ${types.length > 3 ? `<span class="tag">+${types.length - 3}</span>` : ''}</div>`;
    card.onclick = () => openModal(n);
    return card;
  }

  /* ---------- modal ---------- */
  function openModal(n, pushHash = true) {
    if (pushHash) history.replaceState(null, '', '#' + encodeURIComponent(n.id));
    const rels = relsFor(n.id).sort((a, b) =>
      ({ high: 0, medium: 1, low: 2 }[a.confidence] ?? 3) - ({ high: 0, medium: 1, low: 2 }[b.confidence] ?? 3));
    const topSources = Object.entries(n.sources || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    modal.innerHTML = `
      <button class="modal-close" id="modalClose" title="Close (Esc)">✕</button>
      <div class="insp-head">
        <span class="insp-mark" style="--c:${nodeColor(n)};width:56px;height:56px;font-size:20px">${n.type === 'fundamental_person' ? '✦' : esc(initials(n.label))}</span>
        <div style="min-width:0">
          <div class="eyebrow" style="color:${nodeColor(n)}">${esc(typeLabel(n.type))}</div>
          <h2 class="detail-title" style="font-size:32px">${esc(n.label)}</h2>
          <div class="mono">${esc(n.id)}</div>
        </div>
      </div>
      ${n.aliases?.length ? `<p class="flourish" style="font-size:14px">also seen as ${esc(n.aliases.join(' · '))}</p>` : ''}
      <div class="statline" style="margin:12px 0">
        <span><b>${n.degree}</b>relations</span>
        <span><b>${n.outDegree}</b>outgoing</span>
        <span><b>${n.inDegree}</b>incoming</span>
        <span><b>${(n.confidence?.high) || 0}</b>high confidence</span>
      </div>
      ${confMeter(n.confidence || {})}
      <div class="toolbar" style="margin:14px 0">
        ${rels.length ? `<a class="btn mini" href="${graphLink(n.id)}">View in constellation</a>` : ''}
        <a class="btn ghost mini" href="${contributeLink(n.label)}" target="_blank" rel="noopener">+ Suggest a relation for ${esc(n.label)}</a>
        <button class="btn ghost mini" id="modalBackBtn">Back to catalog</button>
      </div>
      ${topSources.length ? `<h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:var(--faint);margin:18px 0 6px">Most-cited sources for this node</h4>
        ${topSources.map(([s, c]) => sourceChip(s, null, ' · ' + c, { tail: true })).join('<br>')}` : ''}
      <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:var(--faint);margin:20px 0 6px">Documented relations · ${rels.length}</h4>
      ${rels.length ? '' : '<p class="meta">No positive relations were found for this node in this run — it remains in the catalog awaiting future evidence.</p>'}
      <div id="modalRels"></div>`;
    const relsEl = modal.querySelector('#modalRels');
    rels.forEach(r => {
      const otherId = r.source === n.id ? r.target : r.source;
      const other = nodeById.get(otherId);
      const card = el('article', 'relation-card', `
        <div><b>${esc(other?.label || otherId)}</b> <span class="small">· ${esc(typeLabel(other?.type))}</span></div>
        <div style="margin:4px 0 0">
          <span class="tag" style="--c:#e9b44c">${esc(familyLabel(r.type))}</span>
          <span class="tag" style="--c:${familyColor(r.family)}">${esc(familyLabel(r.family))}</span>
          <span class="tag" style="--c:${confColor(r.confidence)}">${esc(r.confidence)}</span>
        </div>
        ${r.quote ? `<p class="quote clamp">${esc(r.quote)}</p>` : ''}
        <div class="mono">${esc(sourceTail(r.sourcePath))}${r.page ? ' · p.' + esc(r.page) : ''}</div>`);
      card.style.setProperty('--c', confColor(r.confidence));
      card.onclick = () => { location.href = atlasLink(r.id); };
      relsEl.appendChild(card);
    });
    modal.querySelector('#modalClose').onclick = closeModal;
    modal.querySelector('#modalBackBtn').onclick = closeModal;
    modalBack.classList.add('open');
    modalBack.scrollTop = 0;
  }
  function closeModal() {
    modalBack.classList.remove('open');
    history.replaceState(null, '', location.pathname);
  }
  modalBack.addEventListener('click', e => { if (e.target === modalBack) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && modalBack.classList.contains('open')) closeModal(); });

  /* ---------- render ---------- */
  function render() {
    const q = filters.q.toLowerCase();
    let list = DATA.nodes.filter(n =>
      (filters.type === 'all' || n.type === filters.type) &&
      (!q || (n.label + ' ' + n.id + ' ' + (n.aliases || []).join(' ') + ' ' + Object.keys(n.relationTypes || {}).join(' ')).toLowerCase().includes(q)));
    if (filters.sort === 'degree') list.sort((a, b) => (b.degree || 0) - (a.degree || 0) || a.label.localeCompare(b.label, 'tr'));
    else if (filters.sort === 'name') list.sort((a, b) => a.label.localeCompare(b.label, 'tr'));
    else list.sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9) || (b.degree || 0) - (a.degree || 0));
    countEl.textContent = `${fmt.format(list.length)} of ${fmt.format(DATA.nodes.length)} catalog cards`;
    cardsEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.forEach(n => frag.appendChild(cardNode(n)));
    cardsEl.appendChild(frag);
  }

  document.getElementById('q').oninput = e => { filters.q = e.target.value; render(); };
  document.getElementById('sort').onchange = e => { filters.sort = e.target.value; render(); };

  render();
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash) {
    const n = DATA.nodes.find(x => x.id === hash);
    if (n) openModal(n, false);
  }
})();
