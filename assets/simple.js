/* MAT4Person — simple view: the same four-suns sky, rendered once as a static
   SVG on a single no-frills page. Reuses assets/data.js and the shared layout
   code in common.js; no animation loops, no canvas, system fonts only. */
(() => {
  const {
    DATA, nodeById, esc, el,
    typeColor, typeLabel, nodeColor, familyColor, confColor, familyLabel,
    nodeRadius, makeSim, cardLink, graphLink, atlasLink, sourceTail, sourceIndex,
  } = window.M4;

  /* ---------- layout (run once, then everything is static) ---------- */
  const connected = new Set();
  DATA.relations.forEach(r => { connected.add(r.source); connected.add(r.target); });
  const nodes = DATA.nodes.filter(n => connected.has(n.id)).map(n => ({ ...n }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edges = DATA.relations
    .map(r => ({ ...r, a: byId.get(r.source), b: byId.get(r.target) }))
    .filter(e => e.a && e.b);
  makeSim(nodes, edges, { radius: 400 }).warmup(300);

  const adj = new Map();
  for (const e of edges) {
    for (const id of [e.source, e.target]) {
      if (!adj.has(id)) adj.set(id, []);
      adj.get(id).push(e);
    }
  }
  const suns = nodes.filter(n => n.type === 'fundamental_person');

  document.getElementById('stats').textContent =
    `${suns.length} suns · ${DATA.nodes.length} nodes · ${DATA.relations.length} documented relations · ${sourceIndex.size} sources`;

  /* ---------- static SVG sky ---------- */
  const svg = document.getElementById('sky');
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs = {}) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  nodes.forEach(n => {
    x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
    x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y);
  });
  const PAD = 150;
  svg.setAttribute('viewBox',
    `${Math.round(x0 - PAD)} ${Math.round(y0 - PAD)} ${Math.round(x1 - x0 + PAD * 2)} ${Math.round(y1 - y0 + PAD * 2)}`);

  const gHalo = mk('g', { 'pointer-events': 'none' });
  const gEdge = mk('g', { 'pointer-events': 'none' });
  const gNode = mk('g');
  const gText = mk('g', { 'pointer-events': 'none' });
  svg.append(gHalo, gEdge, gNode, gText);

  const baseEdgeAlpha = e => e.confidence === 'high' ? .42 : e.confidence === 'medium' ? .24 : .13;
  const edgeEls = [];
  for (const e of edges) {
    const l = mk('line', {
      x1: e.a.x.toFixed(1), y1: e.a.y.toFixed(1),
      x2: e.b.x.toFixed(1), y2: e.b.y.toFixed(1),
      stroke: familyColor(e.family),
      'stroke-opacity': baseEdgeAlpha(e),
      'stroke-width': e.confidence === 'high' ? 1.4 : 1,
      'stroke-linecap': 'round',
    });
    if (e.isFg) l.setAttribute('stroke-dasharray', '5 4');
    l._e = e;
    edgeEls.push(l);
    gEdge.appendChild(l);
  }

  const nodeEls = new Map();
  for (const n of [...nodes].sort((a, b) => nodeRadius(a) - nodeRadius(b))) {
    const r = nodeRadius(n);
    if (n.type === 'fundamental_person' || n.type === 'institute_nebula') {
      gHalo.appendChild(mk('circle', {
        cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: (r * 2.3).toFixed(1),
        fill: nodeColor(n), opacity: n.type === 'fundamental_person' ? .13 : .16,
      }));
    }
    const c = mk('circle', {
      cx: n.x.toFixed(1), cy: n.y.toFixed(1), r,
      fill: nodeColor(n), stroke: '#0c1017', 'stroke-width': 1, cursor: 'pointer',
    });
    const tt = mk('title');
    tt.textContent = `${n.label} — ${typeLabel(n.type)} · ${n.degree} relations`;
    c.appendChild(tt);
    c.addEventListener('click', ev => { ev.stopPropagation(); select(n.id); });
    nodeEls.set(n.id, c);
    gNode.appendChild(c);

    if (n.type === 'fundamental_person' || n.type === 'institute_nebula' || (n.degree || 0) >= 12) {
      const sun = n.type === 'fundamental_person';
      const t = mk('text', {
        x: (n.x + r + 7).toFixed(1), y: (n.y + 4).toFixed(1),
        fill: sun ? '#f6d789' : '#c9d2e6',
        'font-size': sun ? 16 : 11.5,
        'font-weight': sun ? 600 : 400,
        'paint-order': 'stroke', stroke: '#0c1017', 'stroke-width': 3,
      });
      t.textContent = n.label;
      gText.appendChild(t);
    }
  }
  svg.addEventListener('click', () => clearSelection());

  /* ---------- legend ---------- */
  const fge = nodeById.get('institute:feza_gursey_enstitusu');
  const fgrc = nodeById.get('institute:feza_gursey_research_center');
  document.getElementById('legend').innerHTML = [
    `<span><i style="background:${typeColor('fundamental_person')}"></i>centennial scientist (sun)</span>`,
    `<span><i style="background:${typeColor('base_person')}"></i>person</span>`,
    `<span><i style="background:${typeColor('institute')}"></i>institute</span>`,
    fge ? `<span><i style="background:${nodeColor(fge)}"></i>Feza Gürsey Enstitüsü</span>` : '',
    fgrc ? `<span><i style="background:${nodeColor(fgrc)}"></i>FG Research Center</span>` : '',
    `<span><i style="background:${typeColor('event')}"></i>event</span>`,
    `<span><i class="dash"></i>Feza Gürsey tie (fg_*)</span>`,
  ].join('');

  /* ---------- selection & highlight ---------- */
  const confOrder = { high: 0, medium: 1, low: 2 };

  function applyHighlight(id) {
    const nb = new Set();
    if (id) {
      nb.add(id);
      (adj.get(id) || []).forEach(e => { nb.add(e.source); nb.add(e.target); });
    }
    for (const l of edgeEls) {
      const on = id && (l._e.source === id || l._e.target === id);
      l.setAttribute('stroke-opacity', id ? (on ? .85 : .05) : baseEdgeAlpha(l._e));
      l.setAttribute('stroke-width', on ? 1.8 : (l._e.confidence === 'high' ? 1.4 : 1));
    }
    nodeEls.forEach((c, nid) => c.setAttribute('opacity', !id || nb.has(nid) ? 1 : .15));
  }

  function select(id) {
    applyHighlight(byId.has(id) ? id : null);
    renderDetail(id);
    history.replaceState(null, '', '#node=' + encodeURIComponent(id));
    if (innerWidth < 920) document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function clearSelection() {
    applyHighlight(null);
    renderIntro();
    history.replaceState(null, '', location.pathname);
  }
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT') clearSelection();
  });

  /* ---------- detail panel ---------- */
  const detailEl = document.getElementById('detail');

  function renderIntro() {
    detailEl.innerHTML = `
      <h2>Pick a star.</h2>
      <p style="color:var(--muted);font-size:13.5px;margin-bottom:8px">Click any circle in the sky — or start with one of the four suns.</p>
      <div id="sunRows"></div>`;
    const box = detailEl.querySelector('#sunRows');
    suns.forEach(n => {
      const row = el('div', 'row', `<i style="background:${nodeColor(n)}"></i>${esc(n.label)}<small>${n.degree}</small>`);
      row.onclick = () => select(n.id);
      box.appendChild(row);
    });
  }

  function renderDetail(id) {
    const n = nodeById.get(id);
    if (!n) { renderIntro(); return; }
    const rels = (adj.get(id) || []).slice()
      .sort((a, b) => (confOrder[a.confidence] ?? 3) - (confOrder[b.confidence] ?? 3));
    detailEl.innerHTML = `
      <div style="color:${nodeColor(n)};font-size:11px;text-transform:uppercase;letter-spacing:.14em">${esc(typeLabel(n.type))}</div>
      <h2 style="margin:2px 0">${esc(n.label)}</h2>
      ${n.aliases?.length ? `<div style="color:var(--faint);font-size:12px">${esc(n.aliases.join(' · '))}</div>` : ''}
      <div style="color:var(--muted);font-size:13px;margin:6px 0 10px">${n.degree || 0} documented relations</div>
      <div style="margin-bottom:6px">
        <a class="tag" href="${cardLink(n.id)}">full ID card ↗</a>
        <a class="tag" href="${graphLink(n.id)}">interactive graph ↗</a>
        ${n.id === 'person:masatoshi_gunduz_ikeda' ? `<a class="tag" href="academic_genealogy.html">academic genealogy ↗</a>` : ''}
      </div>
      ${rels.length ? '' : `<p style="color:var(--muted);font-size:13px">No positive relations documented for this node in this run.</p>`}
      <div id="relRows"></div>`;
    const box = detailEl.querySelector('#relRows');
    rels.forEach(e => {
      const otherId = e.source === id ? e.target : e.source;
      const other = nodeById.get(otherId);
      box.appendChild(el('div', 'rel', `
        <b data-id="${esc(otherId)}" style="color:${nodeColor(other)}">${esc(other?.label || otherId)}</b>
        <span class="tag">${esc(familyLabel(e.type))}</span>
        <span class="tag" style="color:${confColor(e.confidence)}">${esc(e.confidence)}</span>
        ${e.quote ? `<blockquote>${esc(e.quote)}</blockquote>` : ''}
        <div class="src">${esc(sourceTail(e.sourcePath))}${e.page ? ' · p.' + esc(e.page) : ''} — <a href="${atlasLink(e.id)}">evidence ↗</a></div>`));
    });
    detailEl.scrollTop = 0;
  }
  detailEl.addEventListener('click', ev => {
    const b = ev.target.closest('b[data-id]');
    if (b) select(b.dataset.id);
  });

  /* ---------- search list ---------- */
  const listEl = document.getElementById('list');
  const qEl = document.getElementById('q');
  function renderList() {
    const q = qEl.value.trim().toLowerCase();
    const items = DATA.nodes
      .filter(n => !q || (n.label + ' ' + (n.aliases || []).join(' ')).toLowerCase().includes(q))
      .sort((a, b) => (b.degree || 0) - (a.degree || 0))
      .slice(0, 30);
    listEl.innerHTML = '';
    items.forEach(n => {
      const row = el('div', 'row', `<i style="background:${nodeColor(n)}"></i>${esc(n.label)}<small>${n.degree || 0}</small>`);
      row.onclick = () => select(n.id);
      listEl.appendChild(row);
    });
    if (!items.length) listEl.innerHTML = '<p style="color:var(--faint);font-size:13px;padding:6px">No matches.</p>';
  }
  qEl.addEventListener('input', renderList);
  renderList();

  /* ---------- boot ---------- */
  function applyHash() {
    const m = location.hash.match(/node=([^&]+)/);
    const id = m && decodeURIComponent(m[1]);
    if (id && nodeById.get(id)) { select(id); return true; }
    return false;
  }
  addEventListener('hashchange', applyHash);
  if (!applyHash()) renderIntro();
})();
