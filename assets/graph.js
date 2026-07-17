/* MAT4Person — interactive constellation graph */
(() => {
  const M = window.M4;
  const {
    DATA, fmt, esc, el, reduceMotion, FAMILY, CONF,
    typeColor, typeLabel, typeShape, nodeColor, familyColor, confColor, familyLabel,
    nodeRadius, drawNode, legendGlyph, makeSim, cardLink, atlasLink, initials, sourceTail, hashCode, contributeLink,
    sourceChip,
  } = M;

  /* ---------- model: connected nodes only (isolated ones live in the ID cards) ---------- */
  const connectedIds = new Set();
  DATA.relations.forEach(r => { connectedIds.add(r.source); connectedIds.add(r.target); });
  const nodes = DATA.nodes.filter(n => connectedIds.has(n.id)).map(n => ({ ...n }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const pairCount = new Map();
  const edges = [];
  for (const r of DATA.relations) {
    const a = byId.get(r.source), b = byId.get(r.target);
    if (!a || !b) continue;
    const key = [r.source, r.target].sort().join('|');
    const idx = pairCount.get(key) || 0;
    pairCount.set(key, idx + 1);
    edges.push({ ...r, a, b, pairKey: key, pairIndex: idx });
  }
  for (const e of edges) {
    const m = pairCount.get(e.pairKey);
    e.bend = (e.pairIndex - (m - 1) / 2) * 26;
  }
  const adj = new Map();
  for (const e of edges) {
    for (const id of [e.source, e.target]) {
      if (!adj.has(id)) adj.set(id, []);
      adj.get(id).push(e);
    }
  }
  const sortedByR = [...nodes].sort((a, b) => nodeRadius(a) - nodeRadius(b));

  const sim = makeSim(nodes, edges, { radius: 430 });
  sim.warmup(300);

  /* ---------- state ---------- */
  const state = {
    families: new Set(Object.keys(FAMILY)),
    conf: new Set(['high', 'medium', 'low']),
    query: '',
    labelMode: 'auto',
    focus: false,
  };
  let selected = null, hoverNode = null, hoverEdge = null;
  let visEdges = [], visNodes = [], visIds = new Set(), nbIds = new Set(), nbEdges = new Set();

  function refreshVis() {
    const q = state.query.trim().toLowerCase();
    visEdges = edges.filter(e =>
      state.families.has(e.family) && state.conf.has(e.confidence) &&
      (!q || (e.a.label + ' ' + e.b.label + ' ' + e.type + ' ' + e.family + ' ' + (e.quote || '')).toLowerCase().includes(q))
    );
    visIds = new Set();
    visEdges.forEach(e => { visIds.add(e.source); visIds.add(e.target); });
    if (selected?.kind === 'node') visIds.add(selected.item.id);
    visNodes = sortedByR.filter(n => visIds.has(n.id));
    nbIds = new Set(); nbEdges = new Set();
    if (selected?.kind === 'node') {
      const id = selected.item.id;
      nbIds.add(id);
      for (const e of adj.get(id) || []) {
        if (!visEdges.includes(e)) continue;
        nbEdges.add(e);
        nbIds.add(e.source); nbIds.add(e.target);
      }
    } else if (selected?.kind === 'edge') {
      nbEdges.add(selected.item);
      nbIds.add(selected.item.source); nbIds.add(selected.item.target);
    }
    renderCounts(); renderNodeList();
  }

  /* ---------- canvas & view ---------- */
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  const tip = document.getElementById('tip');
  let W = 0, H = 0;
  const view = { k: 1, tx: 0, ty: 0 };
  const target = { k: 1, tx: 0, ty: 0 };

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  const sx = n => n.x * view.k + view.tx;
  const sy = n => n.y * view.k + view.ty;
  const toWorld = (x, y) => ({ x: (x - view.tx) / view.k, y: (y - view.ty) / view.k });

  function fitBounds(list, pad = 70, kMax = 2.2, immediate = false) {
    if (!list.length) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    list.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); });
    const k = Math.max(.28, Math.min(kMax, Math.min((W - pad * 2) / (x1 - x0 + 1), (H - pad * 2) / (y1 - y0 + 1))));
    target.k = k;
    target.tx = W / 2 - (x0 + x1) / 2 * k;
    target.ty = H / 2 - (y0 + y1) / 2 * k;
    if (immediate) Object.assign(view, target);
  }
  const fitAll = (immediate = false) => fitBounds(visNodes.length ? visNodes : nodes, 70, 1.6, immediate);
  function focusView(n) {
    const cluster = [n, ...[...(adj.get(n.id) || [])].flatMap(e => [e.a, e.b])];
    fitBounds(cluster, 90, 1.9);
  }

  /* ---------- render ---------- */
  function edgeGeom(e) {
    const ax = sx(e.a), ay = sy(e.a), bx = sx(e.b), by = sy(e.b);
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
    const bend = e.bend * view.k;
    return { ax, ay, bx, by, cx: (ax + bx) / 2 - dy / d * bend, cy: (ay + by) / 2 + dx / d * bend };
  }

  function labelWanted(n) {
    if (state.labelMode === 'none') return n === hoverNode || selected?.item === n;
    if (state.labelMode === 'all') return true;
    if (n === hoverNode || selected?.item === n) return true;
    if (n.type === 'fundamental_person') return true;
    if (selected?.kind === 'node' && nbIds.has(n.id)) {
      return nbIds.size <= 46 || (n.degree || 0) >= 3 || view.k > 1.35;
    }
    return (n.degree || 0) >= 10 || (view.k > 1.5 && (n.degree || 0) >= 4);
  }

  function draw(t) {
    sim.step(.5);
    view.k += (target.k - view.k) * .11;
    view.tx += (target.tx - view.tx) * .11;
    view.ty += (target.ty - view.ty) * .11;
    ctx.clearRect(0, 0, W, H);
    const hasSel = !!selected;
    const lw = Math.sqrt(view.k);

    ctx.lineCap = 'round';
    for (const e of visEdges) {
      const inNb = nbEdges.has(e);
      if (state.focus && hasSel && !inNb) continue;
      const g = edgeGeom(e);
      let alpha = e.confidence === 'high' ? .52 : e.confidence === 'medium' ? .3 : .16;
      if (hasSel) alpha = inNb ? .88 : alpha * .07;
      if (e === hoverEdge) alpha = .95;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = (e === hoverEdge ? 2.6 : e.confidence === 'high' ? 1.5 : 1) * lw;
      if (inNb && hasSel) {
        const grad = ctx.createLinearGradient(g.ax, g.ay, g.bx, g.by);
        grad.addColorStop(0, nodeColor(e.a));
        grad.addColorStop(1, nodeColor(e.b));
        ctx.strokeStyle = grad;
        if (!reduceMotion) { ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * .022; }
      } else {
        ctx.strokeStyle = familyColor(e.family);
        /* fg_activity / fg_talk / fg_paper / fg_member edges get a dashed line
           so the Feza Gürsey connections read distinctly in the constellation. */
        if (e.isFg) { ctx.setLineDash([5, 4]); if (!reduceMotion) ctx.lineDashOffset = -t * .012; }
      }
      ctx.beginPath();
      ctx.moveTo(g.ax, g.ay);
      ctx.quadraticCurveTo(g.cx, g.cy, g.bx, g.by);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;

    for (const n of visNodes) {
      const inNb = nbIds.has(n.id);
      if (state.focus && hasSel && !inNb) continue;
      const x = sx(n), y = sy(n);
      const r = Math.max(1.8, nodeRadius(n) * Math.min(1.25, Math.max(.55, view.k)));
      ctx.globalAlpha = hasSel && !inNb ? .13 : 1;
      drawNode(ctx, n, x, y, r, t);
      if (n.type !== 'fundamental_person') {
        ctx.strokeStyle = 'rgba(5,7,13,.8)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r + .5, 0, Math.PI * 2); ctx.stroke();
      }
      if (selected?.kind === 'node' && selected.item === n) {
        ctx.strokeStyle = 'rgba(246,215,137,.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 5]);
        if (!reduceMotion) ctx.lineDashOffset = -t * .015;
        ctx.beginPath(); ctx.arc(x, y, r + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      } else if (n === hoverNode) {
        ctx.strokeStyle = 'rgba(237,241,250,.75)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'left';
    for (const n of visNodes) {
      const inNb = nbIds.has(n.id);
      if (state.focus && hasSel && !inNb) continue;
      if (hasSel && !inNb) continue;
      if (!labelWanted(n)) continue;
      const x = sx(n), y = sy(n);
      const r = Math.max(1.8, nodeRadius(n) * Math.min(1.25, Math.max(.55, view.k)));
      const sun = n.type === 'fundamental_person';
      ctx.font = sun ? '540 15px Fraunces, serif' : `${n === hoverNode || selected?.item === n ? 600 : 500} 11.5px Inter, sans-serif`;
      ctx.fillStyle = sun ? 'rgba(246,215,137,.98)' : 'rgba(237,241,250,.92)';
      ctx.shadowColor = 'rgba(5,7,13,.95)';
      ctx.shadowBlur = 6;
      ctx.fillText(n.label, x + r + 6, y + 4);
      ctx.shadowBlur = 0;
    }
    requestAnimationFrame(draw);
  }

  /* ---------- picking ---------- */
  function pickNode(x, y) {
    for (let i = visNodes.length - 1; i >= 0; i--) {
      const n = visNodes[i];
      if (state.focus && selected && !nbIds.has(n.id)) continue;
      const r = Math.max(4, nodeRadius(n) * Math.min(1.25, Math.max(.55, view.k)));
      if (Math.hypot(sx(n) - x, sy(n) - y) < r + 4) return n;
    }
    return null;
  }
  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function pickEdge(x, y) {
    let best = null, bd = 8;
    for (const e of visEdges) {
      if (state.focus && selected && !nbEdges.has(e)) continue;
      const g = edgeGeom(e);
      const d = Math.min(distSeg(x, y, g.ax, g.ay, g.cx, g.cy), distSeg(x, y, g.cx, g.cy, g.bx, g.by));
      if (d < bd) { best = e; bd = d; }
    }
    return best;
  }

  /* ---------- inspector ---------- */
  const inspector = document.getElementById('inspector');
  const confMeter = c => {
    const total = (c.high || 0) + (c.medium || 0) + (c.low || 0) || 1;
    return `<div class="conf-meter">
      <i style="width:${(c.high || 0) / total * 100}%;background:${CONF.high}"></i>
      <i style="width:${(c.medium || 0) / total * 100}%;background:${CONF.medium}"></i>
      <i style="width:${(c.low || 0) / total * 100}%;background:${CONF.low}"></i></div>
      <div class="small">confidence — high ${c.high || 0} · medium ${c.medium || 0} · low ${c.low || 0}</div>`;
  };

  function renderEmpty() {
    const suns = nodes.filter(n => n.type === 'fundamental_person');
    inspector.innerHTML = `
      <div class="eyebrow" style="margin-top:6px">Inspector</div>
      <h2 class="detail-title">Pick a star from the sky.</h2>
      <p class="meta">Click any node for its documented neighborhood, or an edge for the exact quote behind it. Every connection here exists because a source says so.</p>
      <h4>Start with a sun</h4>
      <div class="node-list" id="sunShortcuts"></div>
      <h4>Missing someone?</h4>
      <a class="btn ghost mini" href="${contributeLink()}" target="_blank" rel="noopener">+ Suggest a relation</a>`;
    const box = inspector.querySelector('#sunShortcuts');
    suns.forEach(n => {
      const row = el('div', 'node-row', `
        <span class="dot" style="background:${nodeColor(n)};color:${nodeColor(n)}"></span>
        <span class="grow"><b>${esc(n.label)}</b><small>${n.degree} relations</small></span>
        <span class="deg">→</span>`);
      row.onclick = () => selectNode(n, true);
      box.appendChild(row);
    });
  }

  function relationCardHTML(e, perspectiveId) {
    const other = perspectiveId ? (e.source === perspectiveId ? e.b : e.a) : null;
    const head = other ? esc(other.label) : esc(e.a.label) + ' ↔ ' + esc(e.b.label);
    return `
      <div><b>${head}</b>${other ? ` <span class="small">· ${esc(typeLabel(other.type))}</span>` : ''}</div>
      <div style="margin:4px 0 0">
        <span class="tag" style="--c:#e9b44c">${esc(familyLabel(e.type))}</span>
        <span class="tag" style="--c:${confColor(e.confidence)}">${esc(e.confidence)}</span>
      </div>
      ${e.quote ? `<p class="quote clamp">${esc(e.quote)}</p>` : ''}
      <div class="mono">${esc(sourceTail(e.sourcePath))}${e.page ? ' · p.' + esc(e.page) : ''}</div>`;
  }

  function renderNode(n) {
    const rels = (adj.get(n.id) || []).slice().sort((a, b) =>
      ({ high: 0, medium: 1, low: 2 }[a.confidence] ?? 3) - ({ high: 0, medium: 1, low: 2 }[b.confidence] ?? 3));
    const groups = { person_person: [], person_institute: [], person_event: [] };
    rels.forEach(e => (groups[e.family] = groups[e.family] || []).push(e));
    const sun = n.type === 'fundamental_person';
    inspector.innerHTML = `
      <div class="insp-head">
        <span class="insp-mark" style="--c:${nodeColor(n)}">${sun ? '✦' : esc(initials(n.label))}</span>
        <div style="min-width:0">
          <h2 class="detail-title">${esc(n.label)}</h2>
          <div class="meta">${esc(typeLabel(n.type))} · ${n.degree} relations</div>
          <div class="mono">${esc(n.id)}</div>
        </div>
      </div>
      ${n.aliases?.length ? `<p class="flourish" style="font-size:13.5px;margin:2px 0 10px">also seen as ${esc(n.aliases.join(' · '))}</p>` : ''}
      ${confMeter(n.confidence || {})}
      <div style="margin:10px 0 4px">${Object.entries(n.relationTypes || {}).sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `<span class="tag" style="--c:#e9b44c">${esc(familyLabel(k))} ${v}</span>`).join('')}</div>
      <div class="toolbar" style="margin-top:12px">
        <a class="btn ghost mini" href="${cardLink(n.id)}">Open ID card</a>
        <button class="btn ghost mini" id="inspFocus">${state.focus ? 'Unfocus' : 'Focus'} neighborhood</button>
        <a class="btn ghost mini" href="${contributeLink(n.label)}" target="_blank" rel="noopener">+ Suggest a relation</a>
      </div>
      <div id="relGroups"></div>`;
    inspector.querySelector('#inspFocus').onclick = () => { state.focus = !state.focus; syncFocusBtn(); renderNode(n); };
    const groupsEl = inspector.querySelector('#relGroups');
    const titles = { person_person: 'People', person_institute: 'Institutes', person_event: 'Events' };
    for (const [fam, list] of Object.entries(groups)) {
      if (!list?.length) continue;
      groupsEl.appendChild(el('h4', '', `${titles[fam]} <span style="color:${familyColor(fam)}">· ${list.length}</span>`));
      list.forEach(e => {
        const card = el('article', 'relation-card', relationCardHTML(e, n.id));
        card.style.setProperty('--c', confColor(e.confidence));
        card.onclick = () => selectEdge(e);
        groupsEl.appendChild(card);
      });
    }
  }

  function renderEdge(e) {
    const arrow = e.direction === 'directed' ? '→' : '↔';
    const evidence = e.evidence?.length ? e.evidence : [{ exact_quote: e.quote, note: e.note, source_path: e.sourcePath, page: e.page }];
    inspector.innerHTML = `
      <div class="eyebrow" style="margin-top:6px">Relation</div>
      <h2 class="detail-title" style="font-size:21px">${esc(e.a.label)} <span style="color:var(--gold)">${arrow}</span> ${esc(e.b.label)}</h2>
      <div style="margin:8px 0">
        <span class="tag" style="--c:#e9b44c">${esc(familyLabel(e.type))}</span>
        <span class="tag" style="--c:${familyColor(e.family)}">${esc(familyLabel(e.family))}</span>
        <span class="tag" style="--c:${confColor(e.confidence)}">${esc(e.confidence)} confidence</span>
        ${e.dates?.length ? `<span class="tag">${esc(e.dates.join(', '))}</span>` : ''}
        ${e.places?.length ? `<span class="tag">${esc(e.places.join(', '))}</span>` : ''}
      </div>
      ${evidence.map(ev => `
        ${ev.exact_quote ? `<p class="quote">${esc(ev.exact_quote)}</p>` : ''}
        ${ev.note ? `<p class="meta">${esc(ev.note)}</p>` : ''}
        ${sourceChip(ev.source_path, ev.source_id, ev.page ? ' · p.' + esc(ev.page) : '', { tail: true })}`).join('<hr style="border:0;border-top:1px solid var(--line-soft);margin:14px 0">')}
      <div class="toolbar" style="margin-top:14px">
        <a class="btn mini" href="${atlasLink(e.id)}">Read in Evidence Atlas</a>
      </div>
      <div class="toolbar">
        <button class="btn ghost mini" id="srcBtn">← ${esc(e.a.label)}</button>
        <button class="btn ghost mini" id="tgtBtn">${esc(e.b.label)} →</button>
      </div>`;
    inspector.querySelector('#srcBtn').onclick = () => selectNode(e.a, true);
    inspector.querySelector('#tgtBtn').onclick = () => selectNode(e.b, true);
  }

  /* ---------- selection ---------- */
  function selectNode(n, focusV = false) {
    selected = { kind: 'node', item: n };
    refreshVis(); renderNode(n);
    if (focusV) focusView(n);
  }
  function selectEdge(e) {
    selected = { kind: 'edge', item: e };
    refreshVis(); renderEdge(e);
  }
  function clearSelection() {
    selected = null; state.focus = false;
    syncFocusBtn(); refreshVis(); renderEmpty();
  }

  /* ---------- left panel ---------- */
  function renderCounts() {
    document.getElementById('graphCounts').textContent =
      `${visNodes.length} of ${DATA.nodes.length} stars · ${visEdges.length} of ${edges.length} relations shown`;
  }
  function renderNodeList() {
    const list = document.getElementById('nodeList');
    list.innerHTML = '';
    [...visNodes].sort((a, b) => (b.degree || 0) - (a.degree || 0)).slice(0, 70).forEach(n => {
      const row = el('div', 'node-row' + (selected?.item === n ? ' sel' : ''), `
        <span class="dot" style="background:${nodeColor(n)};color:${nodeColor(n)}"></span>
        <span class="grow"><b>${esc(n.label)}</b><small>${esc(typeLabel(n.type))}</small></span>
        <span class="deg">${n.degree}</span>`);
      row.onclick = () => selectNode(n, true);
      list.appendChild(row);
    });
  }

  function buildChips() {
    const famEl = document.getElementById('familyChips');
    const famNames = { person_person: 'person ↔ person', person_institute: 'institute', person_event: 'event' };
    Object.keys(FAMILY).forEach(f => {
      const chip = el('button', 'chip on', `<span class="swatch"></span>${famNames[f]}`);
      chip.style.setProperty('--c', FAMILY[f]);
      chip.onclick = () => {
        state.families.has(f) ? state.families.delete(f) : state.families.add(f);
        chip.classList.toggle('on'); refreshVis();
      };
      famEl.appendChild(chip);
    });
    const confEl = document.getElementById('confChips');
    ['high', 'medium', 'low'].forEach(c => {
      const chip = el('button', 'chip on', `<span class="swatch"></span>${c}`);
      chip.style.setProperty('--c', CONF[c]);
      chip.onclick = () => {
        state.conf.has(c) ? state.conf.delete(c) : state.conf.add(c);
        chip.classList.toggle('on'); refreshVis();
      };
      confEl.appendChild(chip);
    });
  }

  const focusBtn = document.getElementById('focusBtn');
  function syncFocusBtn() { focusBtn.classList.toggle('on', state.focus); }
  focusBtn.onclick = () => {
    if (!selected) return;
    state.focus = !state.focus; syncFocusBtn();
  };
  document.getElementById('clearBtn').onclick = clearSelection;
  document.getElementById('labelMode').onchange = e => { state.labelMode = e.target.value; };

  /* search + suggestions */
  const searchEl = document.getElementById('search');
  const suggestEl = document.getElementById('suggest');
  function suggestions(q) {
    if (!q) return [];
    q = q.toLowerCase();
    return nodes
      .filter(n => (n.label + ' ' + (n.aliases || []).join(' ')).toLowerCase().includes(q))
      .sort((a, b) => (b.degree || 0) - (a.degree || 0)).slice(0, 8);
  }
  function renderSuggest() {
    const list = suggestions(searchEl.value.trim());
    suggestEl.innerHTML = '';
    suggestEl.style.display = list.length ? 'block' : 'none';
    list.forEach(n => {
      const row = el('div', '', `<span class="dot" style="background:${typeColor(n.type)}"></span>${esc(n.label)}<small>${n.degree}</small>`);
      row.onmousedown = ev => { ev.preventDefault(); pickSuggestion(n); };
      suggestEl.appendChild(row);
    });
  }
  function pickSuggestion(n) {
    suggestEl.style.display = 'none';
    searchEl.value = '';
    state.query = '';
    selectNode(n, true);
  }
  searchEl.addEventListener('input', () => { state.query = searchEl.value; refreshVis(); renderSuggest(); });
  searchEl.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { const s = suggestions(searchEl.value.trim()); if (s[0]) pickSuggestion(s[0]); }
    if (ev.key === 'Escape') { searchEl.value = ''; state.query = ''; refreshVis(); suggestEl.style.display = 'none'; }
  });
  searchEl.addEventListener('blur', () => setTimeout(() => { suggestEl.style.display = 'none'; }, 150));

  /* ---------- canvas interactions ---------- */
  let mouse = { x: 0, y: 0 }, down = null, dragNode = null, moved = 0;
  canvas.addEventListener('mousedown', e => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    down = { x, y, tx: target.tx, ty: target.ty }; moved = 0;
    dragNode = pickNode(x, y);
    if (dragNode) { dragNode.dragging = true; }
    else canvas.classList.add('grabbing');
  });
  addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    mouse = { x, y };
    if (down) {
      moved = Math.max(moved, Math.hypot(x - down.x, y - down.y));
      if (dragNode) {
        const w = toWorld(x, y);
        dragNode.x = w.x; dragNode.y = w.y; dragNode.vx = 0; dragNode.vy = 0;
      } else {
        target.tx = down.tx + (x - down.x); target.ty = down.ty + (y - down.y);
        view.tx = target.tx; view.ty = target.ty;
      }
      return;
    }
    if (x < 0 || y < 0 || x > W || y > H) { hoverNode = null; hoverEdge = null; tip.style.display = 'none'; return; }
    hoverNode = pickNode(x, y);
    hoverEdge = hoverNode ? null : pickEdge(x, y);
    canvas.style.cursor = hoverNode || hoverEdge ? 'pointer' : 'grab';
    if (hoverNode) {
      tip.innerHTML = `<b>${esc(hoverNode.label)}</b><div class="meta">${esc(typeLabel(hoverNode.type))} · ${hoverNode.degree} relations</div>`;
    } else if (hoverEdge) {
      tip.innerHTML = `<b>${esc(familyLabel(hoverEdge.type))}</b><div class="meta">${esc(hoverEdge.a.label)} ↔ ${esc(hoverEdge.b.label)} · ${esc(hoverEdge.confidence)}</div>`;
    }
    if (hoverNode || hoverEdge) {
      tip.style.display = 'block';
      tip.style.left = Math.min(W - 290, x + 16) + 'px';
      tip.style.top = Math.max(8, y - 14) + 'px';
    } else tip.style.display = 'none';
  });
  addEventListener('mouseup', e => {
    if (!down) return;
    canvas.classList.remove('grabbing');
    if (dragNode) { dragNode.dragging = false; }
    if (moved < 5) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const n = pickNode(x, y);
      if (n) selectNode(n);
      else {
        const ed = pickEdge(x, y);
        if (ed) selectEdge(ed);
        else if (selected) clearSelection();
      }
    }
    down = null; dragNode = null;
  });
  canvas.addEventListener('dblclick', e => {
    const r = canvas.getBoundingClientRect();
    const n = pickNode(e.clientX - r.left, e.clientY - r.top);
    if (n) location.href = cardLink(n.id);
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const factor = e.deltaY < 0 ? 1.13 : .885;
    const k2 = Math.max(.22, Math.min(3.2, target.k * factor));
    const w = { x: (x - target.tx) / target.k, y: (y - target.ty) / target.k };
    target.tx = x - w.x * k2; target.ty = y - w.y * k2; target.k = k2;
  }, { passive: false });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT') clearSelection();
  });
  document.getElementById('zoomIn').onclick = () => { target.k = Math.min(3.2, target.k * 1.35); };
  document.getElementById('zoomOut').onclick = () => { target.k = Math.max(.22, target.k / 1.35); };
  document.getElementById('zoomFit').onclick = () => fitAll();

  /* ---------- legend ---------- */
  document.getElementById('legend').innerHTML =
    ['fundamental_person', 'base_person', 'institute', 'institute_nebula', 'event']
      .map(t => `<span>${legendGlyph(t)}${typeLabel(t)}</span>`).join('') +
    Object.entries(FAMILY).map(([f, c]) => `<span><i style="display:inline-block;width:14px;height:2px;background:${c};border-radius:2px"></i>${familyLabel(f)}</span>`).join('') +
    `<span><svg width="20" height="8" style="vertical-align:middle;margin-right:2px"><line x1="1" y1="4" x2="19" y2="4" stroke="#b98bfa" stroke-width="2" stroke-dasharray="4,3"/></svg>Feza Gürsey bağı (fg_*)</span>`;

  /* ---------- deep link ---------- */
  function applyHash() {
    const m = location.hash.match(/node=([^&]+)/);
    if (!m) return false;
    const n = byId.get(decodeURIComponent(m[1]));
    if (n) { selectNode(n, true); return true; }
    return false;
  }
  addEventListener('hashchange', applyHash);

  /* ---------- boot ---------- */
  buildChips();
  refreshVis();
  resize();
  addEventListener('resize', () => { resize(); fitAll(); });
  fitAll(true);
  if (!applyHash()) renderEmpty();
  requestAnimationFrame(draw);
})();
