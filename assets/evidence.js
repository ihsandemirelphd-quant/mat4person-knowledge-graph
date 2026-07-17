/* MAT4Person — evidence atlas: filterable list + sticky reader */
(() => {
  const {
    DATA, nodeById, fmt, esc, el, FAMILY, CONF,
    typeColor, familyColor, confColor, familyLabel,
    cardLink, graphLink, sourceTail, sourceChip, sourceIndex,
  } = window.M4;

  const initialSource = new URLSearchParams(location.search).get('source') || null;
  const filters = { q: '', families: new Set(Object.keys(FAMILY)), conf: new Set(['high', 'medium', 'low']), source: initialSource };
  let filtered = [], selected = null, shown = 60;

  const listEl = document.getElementById('relations');
  const readerEl = document.getElementById('reader');
  const countEl = document.getElementById('count');
  const moreWrap = document.getElementById('moreWrap');
  const sourceBarEl = el('div', 'toolbar');
  countEl.insertAdjacentElement('beforebegin', sourceBarEl);

  const title = r => `${nodeById.get(r.source)?.label || r.source} ↔ ${nodeById.get(r.target)?.label || r.target}`;

  /* ---------- clickable source filter (?source=<source_id>) ---------- */
  function renderSourceBar() {
    sourceBarEl.innerHTML = '';
    if (!filters.source) return;
    const rec = sourceIndex.get(filters.source);
    const label = rec ? sourceTail(rec.path) : filters.source;
    const chip = el('button', 'chip on', `<span class="swatch"></span>Source: ${esc(label)} · ✕`);
    chip.title = rec ? rec.path : filters.source;
    chip.style.setProperty('--c', '#e9b44c');
    chip.onclick = () => {
      filters.source = null;
      history.replaceState(null, '', location.pathname + location.hash);
      renderSourceBar(); selected = null; shown = 60; render();
    };
    sourceBarEl.appendChild(chip);
  }

  /* ---------- chips ---------- */
  const famEl = document.getElementById('familyChips');
  const famNames = { person_person: 'person ↔ person', person_institute: 'institute', person_event: 'event' };
  Object.keys(FAMILY).forEach(f => {
    const chip = el('button', 'chip on', `<span class="swatch"></span>${famNames[f]}`);
    chip.style.setProperty('--c', FAMILY[f]);
    chip.onclick = () => {
      filters.families.has(f) ? filters.families.delete(f) : filters.families.add(f);
      chip.classList.toggle('on'); selected = null; render();
    };
    famEl.appendChild(chip);
  });
  const confEl = document.getElementById('confChips');
  ['high', 'medium', 'low'].forEach(c => {
    const chip = el('button', 'chip on', `<span class="swatch"></span>${c}`);
    chip.style.setProperty('--c', CONF[c]);
    chip.onclick = () => {
      filters.conf.has(c) ? filters.conf.delete(c) : filters.conf.add(c);
      chip.classList.toggle('on'); selected = null; render();
    };
    confEl.appendChild(chip);
  });

  /* ---------- reader ---------- */
  function showReader(r, scrollList = false) {
    selected = r;
    history.replaceState(null, '', '#rel=' + encodeURIComponent(r.id));
    const idx = filtered.indexOf(r);
    const evidence = r.evidence?.length ? r.evidence : [{ exact_quote: r.quote, note: r.note, source_path: r.sourcePath, page: r.page }];
    const arrow = r.direction === 'directed' ? '→' : '↔';
    const src = nodeById.get(r.source), tgt = nodeById.get(r.target);
    readerEl.innerHTML = `
      <div class="eyebrow">Evidence reader ${idx >= 0 ? `<span class="sep">·</span> ${idx + 1} / ${filtered.length}` : ''}</div>
      <h2 class="detail-title" style="margin-top:10px">${esc(src?.label || r.source)} <span style="color:var(--gold)">${arrow}</span> ${esc(tgt?.label || r.target)}</h2>
      <div style="margin:10px 0 4px">
        <span class="tag" style="--c:#e9b44c">${esc(familyLabel(r.type))}</span>
        <span class="tag" style="--c:${familyColor(r.family)}">${esc(familyLabel(r.family))}</span>
        <span class="tag" style="--c:${confColor(r.confidence)}">${esc(r.confidence)} confidence</span>
        ${r.dates?.length ? `<span class="tag">${esc(r.dates.join(', '))}</span>` : ''}
        ${r.places?.length ? `<span class="tag">${esc(r.places.join(', '))}</span>` : ''}
      </div>
      <span class="ornament">❝</span>
      ${evidence.map(ev => `
        ${ev.exact_quote ? `<p class="quote big" style="border:0;padding-left:0">${esc(ev.exact_quote)}</p>` : '<p class="meta">No quote recorded.</p>'}
        ${ev.note ? `<p class="meta" style="font-size:14px">${esc(ev.note)}</p>` : ''}
        ${sourceChip(ev.source_path, ev.source_id, ev.page ? ` · page ${esc(ev.page)}` : '')}
      `).join('<hr style="border:0;border-top:1px solid var(--line-soft);margin:18px 0">')}
      <div class="toolbar" style="margin-top:18px">
        <a class="btn ghost mini" href="${cardLink(r.source)}">${esc(src?.label || 'source')} — card</a>
        <a class="btn ghost mini" href="${cardLink(r.target)}">${esc(tgt?.label || 'target')} — card</a>
        <a class="btn ghost mini" href="${graphLink(r.source)}">See in constellation</a>
      </div>
      <div class="reader-nav">
        <button class="btn ghost mini" id="prevBtn" ${idx <= 0 ? 'disabled style="opacity:.35"' : ''}>← Previous</button>
        <button class="btn ghost mini" id="nextBtn" ${idx >= filtered.length - 1 ? 'disabled style="opacity:.35"' : ''}>Next →</button>
      </div>`;
    readerEl.querySelector('#prevBtn').onclick = () => { if (idx > 0) showReader(filtered[idx - 1], true); };
    readerEl.querySelector('#nextBtn').onclick = () => { if (idx < filtered.length - 1) showReader(filtered[idx + 1], true); };
    listEl.querySelectorAll('.evidence-card').forEach(c => c.classList.toggle('sel', c.dataset.rel === r.id));
    if (scrollList) listEl.querySelector(`[data-rel="${CSS.escape(r.id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------- list ---------- */
  function evidenceCard(r) {
    const card = el('article', 'evidence-card', `
      <div>
        <span class="tag" style="--c:#e9b44c">${esc(familyLabel(r.type))}</span>
        <span class="tag" style="--c:${confColor(r.confidence)}">${esc(r.confidence)}</span>
      </div>
      <h3>${esc(title(r))}</h3>
      ${r.quote ? `<p class="quote clamp" style="border:0;padding-left:0;color:var(--muted);font-size:13.5px">${esc(r.quote)}</p>` : ''}
      <div class="mono">${esc(sourceTail(r.sourcePath))}${r.page ? ' · p.' + esc(r.page) : ''}</div>`);
    card.dataset.rel = r.id;
    card.style.setProperty('--c', confColor(r.confidence));
    card.onclick = () => showReader(r);
    return card;
  }

  function render() {
    const q = filters.q.toLowerCase();
    filtered = DATA.relations.filter(r => {
      if (!filters.families.has(r.family) || !filters.conf.has(r.confidence)) return false;
      if (filters.source && !(r.evidence || []).some(ev => ev.source_id === filters.source)) return false;
      if (!q) return true;
      return (title(r) + ' ' + r.type + ' ' + (r.quote || '') + ' ' + (r.note || '') + ' ' + (r.sourcePath || '')).toLowerCase().includes(q);
    });
    countEl.textContent = `${fmt.format(filtered.length)} of ${fmt.format(DATA.relations.length)} evidence-backed relations`;
    listEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    filtered.slice(0, shown).forEach(r => frag.appendChild(evidenceCard(r)));
    listEl.appendChild(frag);
    moreWrap.innerHTML = '';
    if (filtered.length > shown) {
      const more = el('button', 'btn ghost mini', `Show ${Math.min(80, filtered.length - shown)} more of ${fmt.format(filtered.length - shown)}`);
      more.onclick = () => { shown += 80; render(); };
      moreWrap.appendChild(more);
    }
    if (!selected || !filtered.includes(selected)) {
      if (filtered[0]) showReader(filtered[0]);
      else readerEl.innerHTML = '<div class="eyebrow">Evidence reader</div><p class="meta" style="margin-top:12px">No relations match the current filters.</p>';
    } else {
      showReader(selected);
    }
  }

  /* clicking a source chip inside the reader filters in place instead of reloading the page */
  readerEl.addEventListener('click', e => {
    const a = e.target.closest('a.src-chip');
    if (!a) return;
    const url = new URL(a.href);
    if (url.pathname !== location.pathname) return;
    const sid = url.searchParams.get('source');
    if (!sid) return;
    e.preventDefault();
    filters.source = sid;
    history.replaceState(null, '', location.pathname + '?source=' + encodeURIComponent(sid));
    renderSourceBar(); selected = null; shown = 60; render();
  });

  document.getElementById('q').oninput = e => { filters.q = e.target.value; selected = null; shown = 60; render(); };

  /* deep link #rel=<id> */
  const m = location.hash.match(/rel=([^&]+)/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    selected = DATA.relations.find(r => r.id === id) || null;
  }
  renderSourceBar();
  render();
  if (selected) showReader(selected, true);
})();
