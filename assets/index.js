/* MAT4Person — overview page: living hero constellation + sections */
(() => {
  const {
    DATA, fmt, reduceMotion, esc, el, typeColor, typeLabel, nodeColor, familyColor, familyLabel,
    nodeRadius, drawNode, makeSim, graphLink, cardLink, animateCounters, pathToId, sourceLink,
  } = window.M4;
  const stats = DATA.stats || {};

  /* ---------- hero stats ---------- */
  const evidenceCount = DATA.relations.reduce((s, r) => s + (r.evidence?.length || 1), 0);
  const sourceCount = new Set(DATA.relations.flatMap(r => (r.evidence || []).map(e => e.source_path)).filter(Boolean)).size;
  const statsEl = document.getElementById('stats');
  [
    [stats.nodeCount || DATA.nodes.length, 'nodes in the sky'],
    [stats.edgeCount || DATA.relations.length, 'documented relations'],
    [evidenceCount, 'exact quotes'],
    [sourceCount, 'archival sources'],
  ].forEach(([v, label]) => {
    statsEl.appendChild(el('div', 'stat', `<b data-count="${v}">0</b><span>${label}</span>`));
  });

  const sel = stats.selected || {};
  const lead = document.getElementById('heroLead');
  if (sel.fundamental_persons) {
    lead.textContent = `${sel.fundamental_persons} centennial scientists at the center; ${sel.base_people} people, ${sel.institutes} institutions and ${sel.events} events of their world around them. Every relation carries a source, a page, and an exact quote.`;
  }

  /* ---------- hero constellation ---------- */
  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas.getContext('2d');
  const connectedIds = new Set();
  DATA.relations.forEach(r => { connectedIds.add(r.source); connectedIds.add(r.target); });
  const nodes = DATA.nodes.filter(n => connectedIds.has(n.id)).map(n => ({ ...n }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edges = DATA.relations
    .map(r => ({ ...r, a: byId.get(r.source), b: byId.get(r.target) }))
    .filter(e => e.a && e.b);
  const sim = makeSim(nodes, edges, { radius: 400 });
  sim.warmup(300);

  let W = 0, H = 0, view = { k: 1, tx: 0, ty: 0 }, rot = 0, mouse = null, hover = null;

  function fit() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    nodes.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); });
    const pad = 70;
    view.k = Math.min((W - pad) / (x1 - x0 + 1), (H - pad) / (y1 - y0 + 1));
    view.tx = W / 2 - (x0 + x1) / 2 * view.k;
    view.ty = H / 2 - (y0 + y1) / 2 * view.k;
  }
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    fit();
  }
  function screenPos(n) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const x = n.x * c - n.y * s, y = n.x * s + n.y * c;
    const px = mouse ? (mouse.x - W / 2) * .016 : 0;
    const py = mouse ? (mouse.y - H / 2) * .016 : 0;
    return { x: x * view.k + view.tx + px, y: y * view.k + view.ty + py };
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    if (!reduceMotion) rot += .00016;
    ctx.lineCap = 'round';
    for (const e of edges) {
      const a = screenPos(e.a), b = screenPos(e.b);
      const wave = reduceMotion ? .75 : .55 + .45 * Math.sin(t * .00045 + (e.a._ph || 0) * 2.1);
      const base = e.confidence === 'high' ? .5 : e.confidence === 'medium' ? .3 : .17;
      ctx.globalAlpha = base * wave;
      ctx.strokeStyle = familyColor(e.family);
      ctx.lineWidth = e.confidence === 'high' ? 1.2 : .8;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const sorted = [...nodes].sort((a, b) => nodeRadius(a) - nodeRadius(b));
    for (const n of sorted) {
      const p = screenPos(n);
      const r = Math.max(1.6, nodeRadius(n) * view.k * (n.type === 'fundamental_person' ? 1 : .9));
      const tw = reduceMotion || n.type === 'fundamental_person' ? 1 : .68 + .32 * Math.sin(t * .0012 + (n._ph || 0));
      ctx.globalAlpha = tw;
      drawNode(ctx, n, p.x, p.y, r, t);
      ctx.globalAlpha = 1;
      if (n.type === 'fundamental_person') {
        ctx.font = '540 14px Fraunces, serif';
        ctx.fillStyle = 'rgba(246,215,137,.95)';
        ctx.shadowColor = 'rgba(5,7,13,.9)'; ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, p.x, p.y + r + 20);
        ctx.shadowBlur = 0;
      }
    }
    if (hover && hover.type !== 'fundamental_person') {
      const p = screenPos(hover);
      ctx.font = '600 12.5px Inter, sans-serif';
      ctx.fillStyle = '#edf1fa';
      ctx.shadowColor = 'rgba(5,7,13,.95)'; ctx.shadowBlur = 7;
      ctx.textAlign = 'center';
      ctx.fillText(hover.label, p.x, p.y - nodeRadius(hover) * view.k - 8);
      ctx.shadowBlur = 0;
    }
    requestAnimationFrame(draw);
  }

  function pick(x, y) {
    let best = null, bd = 22;
    for (const n of nodes) {
      const p = screenPos(n);
      const d = Math.hypot(p.x - x, p.y - y) - nodeRadius(n) * view.k;
      if (d < bd) { best = n; bd = d; }
    }
    return best;
  }
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    hover = pick(mouse.x, mouse.y);
    canvas.style.cursor = hover ? 'pointer' : 'default';
  });
  canvas.addEventListener('mouseleave', () => { mouse = null; hover = null; });
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    const n = pick(e.clientX - r.left, e.clientY - r.top);
    if (n) location.href = graphLink(n.id);
  });
  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);

  /* ---------- the four suns ---------- */
  const sunsEl = document.getElementById('suns');
  const suns = DATA.nodes.filter(n => n.type === 'fundamental_person');
  const neighborsOf = id => {
    const seen = new Map();
    for (const r of DATA.relations) {
      const other = r.source === id ? r.target : r.target === id ? r.source : null;
      if (other && !seen.has(other)) seen.set(other, window.M4.nodeById.get(other));
    }
    return [...seen.values()].filter(Boolean);
  };
  suns.forEach(sun => {
    const nbs = neighborsOf(sun.id);
    const topTypes = Object.entries(sun.relationTypes || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const card = el('article', 'card sun-card');
    card.innerHTML = `
      <span class="go">open in graph →</span>
      <canvas></canvas>
      <h3>${esc(sun.label)}</h3>
      <div class="deg">${sun.degree} relations · ${nbs.length} companions</div>
      <div style="margin-top:8px">${topTypes.map(([k, v]) => `<span class="tag" style="--c:#e9b44c">${esc(familyLabel(k))} ${v}</span>`).join('')}</div>`;
    card.onclick = () => location.href = graphLink(sun.id);
    sunsEl.appendChild(card);

    /* orbiting companions */
    const c = card.querySelector('canvas'), cx = c.getContext('2d');
    const parts = nbs.slice(0, 46).map((n, i) => ({
      color: nodeColor(n),
      r: 26 + (i * 7.3) % 58,
      a: (window.M4.hashCode(n.id) % 628) / 100,
      sp: (.0018 + (i % 7) * .0007) * (i % 2 ? 1 : -1),
      size: 1.4 + (i % 3) * .8,
    }));
    let cw = 0, ch = 0;
    const sizeCanvas = () => {
      cw = c.clientWidth; ch = c.clientHeight;
      c.width = cw * devicePixelRatio; c.height = ch * devicePixelRatio;
      cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    sizeCanvas(); addEventListener('resize', sizeCanvas);
    (function orbit(t) {
      cx.clearRect(0, 0, cw, ch);
      const ox = cw / 2, oy = ch / 2 + 4;
      cx.globalAlpha = .16;
      cx.strokeStyle = '#9aa4bd';
      [30, 52, 74].forEach(rr => { cx.beginPath(); cx.arc(ox, oy, rr, 0, Math.PI * 2); cx.stroke(); });
      cx.globalAlpha = 1;
      const glow = cx.createRadialGradient(ox, oy, 2, ox, oy, 46);
      glow.addColorStop(0, 'rgba(246,215,137,.5)'); glow.addColorStop(1, 'transparent');
      cx.fillStyle = glow; cx.beginPath(); cx.arc(ox, oy, 46, 0, Math.PI * 2); cx.fill();
      const core = cx.createRadialGradient(ox - 4, oy - 4, 1, ox, oy, 13);
      core.addColorStop(0, '#fdf3d3'); core.addColorStop(1, '#c98f2b');
      cx.fillStyle = core; cx.beginPath(); cx.arc(ox, oy, 13, 0, Math.PI * 2); cx.fill();
      for (const p of parts) {
        const a = p.a + (reduceMotion ? 0 : t * p.sp * .06);
        const px = ox + Math.cos(a) * p.r, py = oy + Math.sin(a) * p.r * .62;
        cx.fillStyle = p.color;
        cx.globalAlpha = .9;
        cx.beginPath(); cx.arc(px, py, p.size, 0, Math.PI * 2); cx.fill();
      }
      cx.globalAlpha = 1;
      if (!reduceMotion) requestAnimationFrame(orbit);
    })(0);
  });

  /* ---------- timeline of events ---------- */
  const tl = document.getElementById('timeline');
  const events = DATA.nodes
    .filter(n => n.type === 'event')
    .map(n => ({ ...n, year: (String(n.label).match(/^(\d{4})/) || [])[1] || '' }))
    .sort((a, b) => (a.year || '9999').localeCompare(b.year || '9999'));
  events.forEach(ev => {
    const item = el('div', 'tl-item', `
      <div class="year">${esc(ev.year || '·')}</div>
      <div class="dot"></div>
      <div class="lbl">${esc(String(ev.label).replace(/^\d{4}\s*/, ''))}</div>`);
    item.onclick = () => location.href = cardLink(ev.id);
    tl.appendChild(item);
  });

  /* ---------- families & relation types ---------- */
  const famEl = document.getElementById('familyCards');
  const famMeta = {
    person_person: ['Person ↔ Person', 'friendships, mentorships, co-authorships, shared rooms and photographs'],
    person_institute: ['Person ↔ Institute', 'founding roles, memberships, chairs and affiliations'],
    person_event: ['Person ↔ Event', 'congresses, founding moments, commemorations'],
  };
  Object.entries(stats.families || {}).sort((a, b) => b[1] - a[1]).forEach(([f, count]) => {
    const [title, desc] = famMeta[f] || [familyLabel(f), ''];
    famEl.appendChild(el('div', 'card', `
      <h3 style="color:${familyColor(f)}">${esc(title)}</h3>
      <b class="display" style="font-size:38px;color:var(--gold-2)" data-count="${count}">0</b>
      <p>${esc(desc)}</p>`));
  });

  const typesEl = document.getElementById('types');
  const types = Object.entries(stats.relationTypes || {}).sort((a, b) => b[1] - a[1]);
  const maxT = types[0]?.[1] || 1;
  types.slice(0, 14).forEach(([k, v]) => {
    typesEl.appendChild(el('div', 'meter-row', `
      <span class="lbl">${esc(familyLabel(k))}</span>
      <span class="meter"><i style="width:${Math.max(2, v / maxT * 100)}%"></i></span>
      <span class="val">${fmt.format(v)}</span>`));
  });
  if (types.length > 14) {
    typesEl.appendChild(el('p', 'small', `+ ${types.length - 14} more types — see the <a href="model_report.html" style="color:var(--gold-2)">run report</a>.`));
  }

  /* ---------- sources & method ---------- */
  const usage = stats.usage || {};
  document.getElementById('methodStats').innerHTML =
    `${fmt.format(usage.calls || 0)} model calls · ${fmt.format(usage.total_tokens || 0)} tokens · $${Number(usage.estimated_usd || 0).toFixed(2)} estimated cost · ${fmt.format(stats.plannedCalls || 0)} planned pair checks`;

  const srcEl = document.getElementById('sources');
  (stats.topSources || []).slice(0, 8).forEach(s => {
    const sid = pathToId.get(s.source);
    const tail = esc(window.M4.sourceTail(s.source));
    const lbl = sid
      ? `<a href="${sourceLink(sid)}" style="color:inherit;border-bottom:1px dotted var(--faint)" title="Filter the Evidence Atlas by ${esc(s.source)}">${tail}</a>`
      : tail;
    const row = el('div', 'meter-row', `
      <span class="lbl" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(s.source)}">${lbl}</span>
      <span class="meter"><i style="width:${Math.max(3, s.count / (stats.topSources[0]?.count || 1) * 100)}%"></i></span>
      <span class="val">${fmt.format(s.count)}</span>`);
    srcEl.appendChild(row);
  });

  animateCounters();
})();
