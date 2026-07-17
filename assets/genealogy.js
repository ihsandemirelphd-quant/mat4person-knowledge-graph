/* MAT4Person — Academic Genealogy (Gündüz İkeda), standalone radial-tree page.
   Reads only window.GENEALOGY_DATA (assets/genealogy_data.js) — never assets/data.js.
   Static, read-only preview: no editing/adding of people. */
(() => {
  const M = window.M4;
  const { esc, el, initSky } = M;
  const DATA = window.GENEALOGY_DATA;
  const people = DATA.people;
  const byId = new Map(people.map(p => [p.id, p]));

  const BRANCH_COLOR = { Ege: '#e9b44c', Hacettepe: '#57d0ba', Ankara: '#71a7ff', ODTU: '#ff8175' };
  const ROOT_ID = DATA.meta.rootId;

  /* ---------------- i18n ---------------- */
  const STR = {
    tr: {
      navSelf: 'Soyağacı',
      panelTitle: 'Akademik Soyağacı',
      sourceNote: 'Tek kaynak: <b>Alp Eden</b>, “Masatoshi Gündüz İkeda: Akademik bir soyağacı için başlangıç” (24 Mart 2026). Bu sayfa statik bir önizlemedir — düzenleme yapılamaz.',
      searchPh: 'İsim ara…',
      branchesTitle: 'Kurumlar',
      genTitle: 'Nesil',
      displayTitle: 'Görünüm',
      labelAuto: 'Etiketler: merkez & üzerine gelince',
      labelAll: 'Etiketler: hepsi',
      labelNone: 'Etiketler: yok',
      focusBtn: 'Seçimi odakla',
      unfocusBtn: 'Odağı kaldır',
      clearBtn: 'Temizle',
      stageNote: 'sürükle: kaydır · tekerlek: yakınlaştır · çift tık: odakla',
      genLabel: n => `Nesil ${n}`,
      branchLabels: DATA.meta.branchLabels,
      countsLine: (shown, total) => `${shown} / ${total} kişi gösteriliyor`,
      emptyTitle: 'Bir isim seçin.',
      emptyBody: 'Soldaki listeden arayın ya da grafikteki bir daireye tıklayın. Kırmızı çizgiler eş danışmanlık bağlarını gösterir.',
      startWith: 'İkeda ile başlayın',
      fieldInstitution: 'Kurum', fieldYear: 'Yıl', fieldThesis: 'Tez', fieldCoAdv: 'Eş danışman(lar)',
      fieldNote: 'Not', fieldBio: 'Kısa biyografi', fieldChain: 'Danışman zinciri', fieldChildren: 'Doktora öğrencileri',
      fieldCoParents: 'Diğer danışman(lar)', noThesis: 'Tez başlığı kaynakta belirtilmemiş.',
      rootBadge: 'Merkez', genBadgeShort: n => `Nesil ${n}`,
      sourceFooter: 'Kaynak: Alp Eden, “Masatoshi Gündüz İkeda: Akademik bir soyağacı için başlangıç”, 24 Mart 2026.',
      childCount: n => n === 1 ? '1 doktora öğrencisi' : `${n} doktora öğrencisi`,
      noChildren: 'Bilinen doktora öğrencisi yok (kaynakta soyağacı burada sona eriyor).',
    },
    en: {
      navSelf: 'Genealogy',
      panelTitle: 'Academic Genealogy',
      sourceNote: 'Sole source: <b>Alp Eden</b>, “Masatoshi Gündüz İkeda: The beginnings of an academic genealogy” (24 March 2026). This page is a static preview — nothing here can be edited.',
      searchPh: 'Search names…',
      branchesTitle: 'Institutions',
      genTitle: 'Generation',
      displayTitle: 'Display',
      labelAuto: 'Labels: hubs & hover',
      labelAll: 'Labels: everything',
      labelNone: 'Labels: none',
      focusBtn: 'Focus selection',
      unfocusBtn: 'Unfocus',
      clearBtn: 'Clear',
      stageNote: 'drag to pan · wheel to zoom · double-click to focus',
      genLabel: n => `Gen ${n}`,
      branchLabels: {
        Ege: 'Ege University', Hacettepe: 'Hacettepe University',
        Ankara: 'Ankara University', ODTU: 'Middle East Technical University (METU)',
      },
      countsLine: (shown, total) => `${shown} of ${total} people shown`,
      emptyTitle: 'Pick a name.',
      emptyBody: 'Search on the left, or click a circle in the tree. Dashed lines mark co-advisor links.',
      startWith: 'Start with İkeda',
      fieldInstitution: 'Institution', fieldYear: 'Year', fieldThesis: 'Thesis', fieldCoAdv: 'Co-advisor(s)',
      fieldNote: 'Note', fieldBio: 'Short biography', fieldChain: 'Advisor chain', fieldChildren: 'PhD students',
      fieldCoParents: 'Other advisor(s)', noThesis: 'No thesis title given in the source for this entry.',
      rootBadge: 'Center', genBadgeShort: n => `Gen ${n}`,
      sourceFooter: 'Source: Alp Eden, “Masatoshi Gündüz İkeda: The beginnings of an academic genealogy”, 24 March 2026.',
      childCount: n => n === 1 ? '1 PhD student' : `${n} PhD students`,
      noChildren: 'No known PhD students (the genealogy in the source ends here).',
    },
  };
  let lang = 'tr';
  const t = () => STR[lang];

  /* ---------------- tree layout ---------------- */
  const childrenOf = new Map();
  for (const p of people) {
    if (p.parent) {
      if (!childrenOf.has(p.parent)) childrenOf.set(p.parent, []);
      childrenOf.get(p.parent).push(p.id);
    }
  }
  const coParentOf = new Map(); // id -> [ids of people who list this id as a coParent]
  for (const p of people) {
    for (const cp of p.coParents || []) {
      if (!coParentOf.has(cp)) coParentOf.set(cp, []);
      coParentOf.get(cp).push(p.id);
    }
  }
  const leafCount = new Map();
  function computeLeaf(id) {
    if (leafCount.has(id)) return leafCount.get(id);
    const kids = childrenOf.get(id) || [];
    const v = kids.length ? kids.reduce((s, k) => s + computeLeaf(k), 0) : 1;
    leafCount.set(id, v);
    return v;
  }
  computeLeaf(ROOT_ID);

  const RADIUS = { 0: 0, 1: 195, 2: 365, 3: 535 };
  function assign(id, a0, a1) {
    const p = byId.get(id);
    const angle = (a0 + a1) / 2;
    const r = RADIUS[p.gen] ?? 535;
    p.angle = angle;
    p.x = p.gen === 0 ? 0 : r * Math.cos(angle - Math.PI / 2);
    p.y = p.gen === 0 ? 0 : r * Math.sin(angle - Math.PI / 2);
    const kids = childrenOf.get(id) || [];
    if (!kids.length) return;
    if (id === ROOT_ID) {
      // İkeda's 17 direct students get equal angular slices regardless of how many
      // descendants each has -- otherwise small branches (e.g. ODTÜ's 4 leaf nodes)
      // get squeezed into a tiny slice and their gen-1 labels collide.
      const each = (a1 - a0) / kids.length;
      kids.forEach((kid, i) => assign(kid, a0 + i * each, a0 + (i + 1) * each));
    } else {
      const total = leafCount.get(id);
      let a = a0;
      for (const kid of kids) {
        const span = (leafCount.get(kid) / total) * (a1 - a0);
        assign(kid, a, a + span);
        a += span;
      }
    }
  }
  assign(ROOT_ID, 0, Math.PI * 2);

  const edges = [];
  for (const p of people) {
    if (p.parent) edges.push({ from: byId.get(p.parent), to: p, kind: 'primary' });
    for (const cp of p.coParents || []) {
      const cpNode = byId.get(cp);
      if (cpNode) edges.push({ from: cpNode, to: p, kind: 'co' });
    }
  }

  function nodeRadius(p) {
    if (p.id === ROOT_ID) return 26;
    return p.gen === 1 ? 13 : p.gen === 2 ? 9 : 6;
  }
  function nodeColor(p) {
    return p.id === ROOT_ID ? '#f2c76a' : (BRANCH_COLOR[p.branch] || '#9aa4bd');
  }

  function ancestorChain(id) {
    const chain = [];
    let cur = byId.get(id);
    while (cur) { chain.unshift(cur); cur = cur.parent ? byId.get(cur.parent) : null; }
    return chain;
  }
  function descendantCount(id) {
    const kids = childrenOf.get(id) || [];
    return kids.reduce((s, k) => s + 1 + descendantCount(k), 0);
  }

  /* ---------------- state ---------------- */
  const state = {
    branches: new Set(DATA.meta.branches),
    gens: new Set([1, 2, 3]),
    query: '',
    labelMode: 'auto',
    focus: false,
  };
  let selected = null, hoverNode = null;
  let visNodes = [], visEdges = [], visIds = new Set(), nbIds = new Set();

  function nodeVisible(p) {
    if (p.id === ROOT_ID) return true;
    return state.branches.has(p.branch) && state.gens.has(p.gen);
  }

  function refreshVis() {
    visNodes = people.filter(nodeVisible);
    visIds = new Set(visNodes.map(p => p.id));
    visEdges = edges.filter(e => visIds.has(e.from.id) && visIds.has(e.to.id));
    nbIds = new Set();
    if (selected) {
      nbIds.add(selected.id);
      if (selected.parent) nbIds.add(selected.parent);
      (childrenOf.get(selected.id) || []).forEach(id => nbIds.add(id));
      (selected.coParents || []).forEach(id => nbIds.add(id));
      (coParentOf.get(selected.id) || []).forEach(id => nbIds.add(id));
    }
    renderCounts();
  }

  /* ---------------- canvas & view ---------------- */
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
    const k = Math.max(.15, Math.min(kMax, Math.min((W - pad * 2) / (x1 - x0 + 1), (H - pad * 2) / (y1 - y0 + 1))));
    target.k = k;
    target.tx = W / 2 - (x0 + x1) / 2 * k;
    target.ty = H / 2 - (y0 + y1) / 2 * k;
    if (immediate) Object.assign(view, target);
  }
  const fitAll = (immediate = false) => fitBounds(visNodes.length ? visNodes : people, 60, 1.4, immediate);
  function focusView(p) {
    const cluster = [p];
    if (p.parent && byId.get(p.parent)) cluster.push(byId.get(p.parent));
    (childrenOf.get(p.id) || []).forEach(id => cluster.push(byId.get(id)));
    fitBounds(cluster, 100, 2.4);
  }

  /* ---------------- draw ---------------- */
  function labelWanted(p) {
    if (p === hoverNode || selected === p) return true;
    if (state.labelMode === 'none') return false;
    if (state.labelMode === 'all') return true;
    if (p.gen <= 1) return true;
    if (selected && nbIds.has(p.id)) return true;
    if (p.gen === 2) return view.k > 1.05;
    return view.k > 1.8;
  }

  function drawPerson(p, x, y, r, tNow) {
    const color = nodeColor(p);
    if (p.id === ROOT_ID) {
      const glow = ctx.createRadialGradient(x, y, r * .2, x, y, r * 3.1);
      glow.addColorStop(0, 'rgba(246,215,137,.34)');
      glow.addColorStop(.45, 'rgba(233,180,76,.13)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, r * 3.1, 0, Math.PI * 2); ctx.fill();
      const core = ctx.createRadialGradient(x - r * .28, y - r * .3, r * .1, x, y, r);
      core.addColorStop(0, '#fdf3d3'); core.addColorStop(.5, '#f2c76a'); core.addColorStop(1, '#c98f2b');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(5,7,13,.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r + .5, 0, Math.PI * 2); ctx.stroke();
  }

  function draw(tNow) {
    view.k += (target.k - view.k) * .14;
    view.tx += (target.tx - view.tx) * .14;
    view.ty += (target.ty - view.ty) * .14;
    ctx.clearRect(0, 0, W, H);
    const hasSel = !!selected;
    const lw = Math.sqrt(view.k);

    ctx.lineCap = 'round';
    for (const e of visEdges) {
      const inNb = hasSel && (e.from.id === selected.id || e.to.id === selected.id);
      if (state.focus && hasSel && !inNb) continue;
      const ax = sx(e.from), ay = sy(e.from), bx = sx(e.to), by = sy(e.to);
      let alpha = e.kind === 'co' ? .3 : .34;
      if (hasSel) alpha = inNb ? .85 : alpha * .12;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = e.kind === 'co' ? '#a78bfa' : nodeColor(e.to);
      ctx.lineWidth = (e.kind === 'co' ? 1.3 : e.to.gen <= 1 ? 2 : 1.1) * lw;
      if (e.kind === 'co') ctx.setLineDash([5, 6]); else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2, bx, by);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    for (const p of visNodes) {
      const inNb = nbIds.has(p.id);
      if (state.focus && hasSel && !inNb) continue;
      const x = sx(p), y = sy(p);
      const r = Math.max(1.6, nodeRadius(p) * Math.min(1.3, Math.max(.5, view.k)));
      ctx.globalAlpha = hasSel && !inNb ? .16 : 1;
      drawPerson(p, x, y, r, tNow);
      if (selected === p) {
        ctx.strokeStyle = 'rgba(246,215,137,.9)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
        ctx.lineDashOffset = -tNow * .015;
        ctx.beginPath(); ctx.arc(x, y, r + 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      } else if (p === hoverNode) {
        ctx.strokeStyle = 'rgba(237,241,250,.75)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    for (const p of visNodes) {
      const inNb = nbIds.has(p.id);
      if (state.focus && hasSel && !inNb) continue;
      if (hasSel && !inNb) continue;
      if (!labelWanted(p)) continue;
      const x = sx(p), y = sy(p);
      const r = Math.max(1.6, nodeRadius(p) * Math.min(1.3, Math.max(.5, view.k)));
      const root = p.id === ROOT_ID;
      ctx.font = root ? '540 15px Fraunces, serif' : `${p === hoverNode || selected === p ? 600 : 500} ${p.gen <= 1 ? 12 : 11}px Inter, sans-serif`;
      ctx.fillStyle = root ? 'rgba(246,215,137,.98)' : 'rgba(237,241,250,.92)';
      ctx.shadowColor = 'rgba(5,7,13,.95)'; ctx.shadowBlur = 6;
      // labels point away from the center (left-aligned on the right half, right-aligned on the
      // left half) instead of always drawing rightward -- otherwise nodes stacked near the top
      // or bottom of the circle all shoot their labels the same way and collide.
      if (root || p.x >= 0) {
        ctx.textAlign = 'left';
        ctx.fillText(p.name, x + r + 6, y + 4);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(p.name, x - r - 6, y + 4);
      }
    }
    ctx.textAlign = 'left';
    requestAnimationFrame(draw);
  }

  /* ---------------- picking ---------------- */
  function pickNode(x, y) {
    for (let i = visNodes.length - 1; i >= 0; i--) {
      const p = visNodes[i];
      if (state.focus && selected && !nbIds.has(p.id)) continue;
      const r = Math.max(5, nodeRadius(p) * Math.min(1.3, Math.max(.5, view.k)));
      if (Math.hypot(sx(p) - x, sy(p) - y) < r + 4) return p;
    }
    return null;
  }

  /* ---------------- inspector ---------------- */
  const inspector = document.getElementById('inspector');

  function renderEmpty() {
    const T = t();
    inspector.innerHTML = `
      <div class="eyebrow" style="margin-top:6px">${T.panelTitle}</div>
      <h2 class="detail-title">${esc(T.emptyTitle)}</h2>
      <p class="empty-hint">${esc(T.emptyBody)}</p>
      <div class="toolbar" style="margin-top:14px">
        <button class="btn ghost mini" id="startBtn">${esc(T.startWith)}</button>
      </div>
      <p class="source-note" style="margin-top:20px">${T.sourceNote}</p>`;
    const btn = inspector.querySelector('#startBtn');
    if (btn) btn.onclick = () => selectNode(byId.get(ROOT_ID), true);
  }

  function tagRow(label, value, color) {
    if (!value) return '';
    return `<div style="margin:8px 0"><span class="small">${esc(label)}</span><br>
      <span class="tag" style="--c:${color || '#e9b44c'}">${esc(value)}</span></div>`;
  }

  function renderNode(p) {
    const T = t();
    const root = p.id === ROOT_ID;
    const color = nodeColor(p);
    const branchLabel = p.branch ? (T.branchLabels[p.branch] || p.branch) : T.rootBadge;
    const chain = ancestorChain(p.id);
    const kids = (childrenOf.get(p.id) || []).map(id => byId.get(id));
    const coParentNodes = (p.coParents || []).map(id => byId.get(id)).filter(Boolean);
    const coChildNodes = (coParentOf.get(p.id) || []).map(id => byId.get(id)).filter(Boolean);

    inspector.innerHTML = `
      <div class="insp-head">
        <span class="insp-mark" style="--c:${color}">${root ? '✦' : esc((p.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase())}</span>
        <div style="min-width:0">
          <h2 class="detail-title">${esc(p.name)}</h2>
          <div class="meta">${esc(branchLabel)}${!root ? ' · ' + esc(T.genLabel(p.gen)) : ''}</div>
        </div>
      </div>
      <div id="breadcrumb" class="breadcrumb"></div>
      ${tagRow(T.fieldInstitution, p.institution, color)}
      ${p.year ? tagRow(T.fieldYear, String(p.year), color) : ''}
      <div style="margin:10px 0 2px"><span class="small">${esc(T.fieldThesis)}</span></div>
      <p class="quote">${p.thesis ? esc(p.thesis) : `<i>${esc(T.noThesis)}</i>`}</p>
      ${p.coAdvisors && p.coAdvisors.length ? `<div style="margin:8px 0"><span class="small">${esc(T.fieldCoAdv)}</span><br>${p.coAdvisors.map(a => `<span class="tag" style="--c:#a78bfa">${esc(a)}</span>`).join('')}</div>` : ''}
      ${coParentNodes.length ? `<div style="margin:8px 0"><span class="small">${esc(T.fieldCoParents)}</span><br>${coParentNodes.map(n => `<span class="tag co-link" data-id="${esc(n.id)}" style="--c:#a78bfa;cursor:pointer">${esc(n.name)}</span>`).join('')}</div>` : ''}
      ${coChildNodes.length ? `<div style="margin:8px 0"><span class="small">${esc(T.fieldCoParents)}</span><br>${coChildNodes.map(n => `<span class="tag co-link" data-id="${esc(n.id)}" style="--c:#a78bfa;cursor:pointer">${esc(n.name)}</span>`).join('')}</div>` : ''}
      ${p.note ? `<div style="margin:8px 0"><span class="small">${esc(T.fieldNote)}</span><p class="meta" style="margin:2px 0">${esc(p.note)}</p></div>` : ''}
      ${p.bio ? `<div style="margin:12px 0 2px"><span class="small">${esc(T.fieldBio)}</span></div><p class="meta">${esc(p.bio)}</p>` : ''}
      <h4>${esc(T.fieldChildren)}</h4>
      <p class="meta">${kids.length ? esc(T.childCount(kids.length)) : esc(T.noChildren)}</p>
      <div class="node-list" id="kidsList"></div>
      <p class="source-note" style="margin-top:18px">${esc(T.sourceFooter)}</p>`;

    const crumb = inspector.querySelector('#breadcrumb');
    chain.forEach((n, i) => {
      if (i > 0) crumb.appendChild(el('span', 'sep', '→'));
      const b = el('b', '', esc(n.name));
      b.onclick = () => selectNode(n, true);
      crumb.appendChild(b);
    });

    const kidsList = inspector.querySelector('#kidsList');
    kids.forEach(k => {
      const row = el('div', 'node-row', `
        <span class="dot" style="background:${nodeColor(k)};color:${nodeColor(k)}"></span>
        <span class="grow"><b>${esc(k.name)}</b><small>${esc(k.institution || '')}${k.year ? ' · ' + k.year : ''}</small></span>
        <span class="deg">${descendantCount(k.id)}</span>`);
      row.onclick = () => selectNode(k, true);
      kidsList.appendChild(row);
    });
    inspector.querySelectorAll('.co-link').forEach(elm => {
      elm.onclick = () => { const n = byId.get(elm.dataset.id); if (n) selectNode(n, true); };
    });
  }

  /* ---------------- selection ---------------- */
  function selectNode(p, doFocus = false) {
    selected = p;
    refreshVis(); renderNode(p);
    if (doFocus) focusView(p);
  }
  function clearSelection() {
    selected = null; state.focus = false;
    syncFocusBtn(); refreshVis(); renderEmpty();
  }

  /* ---------------- left panel ---------------- */
  function renderCounts() {
    document.getElementById('graphCounts').textContent = t().countsLine(visNodes.length, people.length);
  }

  function buildBranchChips() {
    const box = document.getElementById('branchChips');
    box.innerHTML = '';
    DATA.meta.branches.forEach(b => {
      const chip = el('button', 'chip' + (state.branches.has(b) ? ' on' : ''), `<span class="swatch"></span>${esc(t().branchLabels[b] || b)}`);
      chip.style.setProperty('--c', BRANCH_COLOR[b]);
      chip.onclick = () => {
        state.branches.has(b) ? state.branches.delete(b) : state.branches.add(b);
        chip.classList.toggle('on'); refreshVis();
      };
      box.appendChild(chip);
    });
  }
  function buildGenChips() {
    const box = document.getElementById('genChips');
    box.innerHTML = '';
    [1, 2, 3].forEach(g => {
      const chip = el('button', 'chip' + (state.gens.has(g) ? ' on' : ''), `<span class="swatch"></span>${esc(t().genLabel(g))}`);
      chip.style.setProperty('--c', '#9aa4bd');
      chip.onclick = () => {
        state.gens.has(g) ? state.gens.delete(g) : state.gens.add(g);
        chip.classList.toggle('on'); refreshVis();
      };
      box.appendChild(chip);
    });
  }

  const focusBtn = document.getElementById('focusBtn');
  function syncFocusBtn() {
    focusBtn.classList.toggle('on', state.focus);
    focusBtn.querySelector('[data-i18n]').textContent = state.focus ? t().unfocusBtn : t().focusBtn;
  }
  focusBtn.onclick = () => { if (!selected) return; state.focus = !state.focus; syncFocusBtn(); refreshVis(); };
  document.getElementById('clearBtn').onclick = clearSelection;
  document.getElementById('labelMode').onchange = e => { state.labelMode = e.target.value; };

  /* search + suggestions */
  const searchEl = document.getElementById('search');
  const suggestEl = document.getElementById('suggest');
  function suggestions(q) {
    if (!q) return [];
    q = q.toLowerCase();
    return people.filter(p => p.name.toLowerCase().includes(q))
      .sort((a, b) => descendantCount(b.id) - descendantCount(a.id)).slice(0, 8);
  }
  function renderSuggest() {
    const list = suggestions(searchEl.value.trim());
    suggestEl.innerHTML = '';
    suggestEl.style.display = list.length ? 'block' : 'none';
    list.forEach(p => {
      const row = el('div', '', `<span class="dot" style="background:${nodeColor(p)}"></span>${esc(p.name)}<small>${esc(p.institution || '')}</small>`);
      row.onmousedown = ev => { ev.preventDefault(); pickSuggestion(p); };
      suggestEl.appendChild(row);
    });
  }
  function pickSuggestion(p) {
    suggestEl.style.display = 'none';
    searchEl.value = ''; state.query = '';
    selectNode(p, true);
  }
  searchEl.addEventListener('input', () => { state.query = searchEl.value; renderSuggest(); });
  searchEl.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { const s = suggestions(searchEl.value.trim()); if (s[0]) pickSuggestion(s[0]); }
    if (ev.key === 'Escape') { searchEl.value = ''; state.query = ''; suggestEl.style.display = 'none'; }
  });
  searchEl.addEventListener('blur', () => setTimeout(() => { suggestEl.style.display = 'none'; }, 150));

  /* ---------------- canvas interactions ---------------- */
  let down = null, moved = 0;
  canvas.addEventListener('mousedown', e => {
    const r = canvas.getBoundingClientRect();
    down = { x: e.clientX - r.left, y: e.clientY - r.top, tx: target.tx, ty: target.ty };
    moved = 0;
    canvas.classList.add('grabbing');
  });
  addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (down) {
      moved = Math.max(moved, Math.hypot(x - down.x, y - down.y));
      target.tx = down.tx + (x - down.x); target.ty = down.ty + (y - down.y);
      view.tx = target.tx; view.ty = target.ty;
      return;
    }
    if (x < 0 || y < 0 || x > W || y > H) { hoverNode = null; tip.style.display = 'none'; return; }
    hoverNode = pickNode(x, y);
    canvas.style.cursor = hoverNode ? 'pointer' : 'grab';
    if (hoverNode) {
      tip.innerHTML = `<b>${esc(hoverNode.name)}</b><div class="meta">${esc(hoverNode.institution || '')}${hoverNode.year ? ' · ' + hoverNode.year : ''}</div>`;
      tip.style.display = 'block';
      tip.style.left = Math.min(W - 290, x + 16) + 'px';
      tip.style.top = Math.max(8, y - 14) + 'px';
    } else tip.style.display = 'none';
  });
  addEventListener('mouseup', e => {
    if (!down) return;
    canvas.classList.remove('grabbing');
    if (moved < 5) {
      const r = canvas.getBoundingClientRect();
      const n = pickNode(e.clientX - r.left, e.clientY - r.top);
      if (n) selectNode(n);
      else if (selected) clearSelection();
    }
    down = null;
  });
  canvas.addEventListener('dblclick', e => {
    const r = canvas.getBoundingClientRect();
    const n = pickNode(e.clientX - r.left, e.clientY - r.top);
    if (n) focusView(n);
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const factor = e.deltaY < 0 ? 1.13 : .885;
    const k2 = Math.max(.15, Math.min(3.5, target.k * factor));
    const w = { x: (x - target.tx) / target.k, y: (y - target.ty) / target.k };
    target.tx = x - w.x * k2; target.ty = y - w.y * k2; target.k = k2;
  }, { passive: false });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT') clearSelection();
  });
  document.getElementById('zoomIn').onclick = () => { target.k = Math.min(3.5, target.k * 1.35); };
  document.getElementById('zoomOut').onclick = () => { target.k = Math.max(.15, target.k / 1.35); };
  document.getElementById('zoomFit').onclick = () => fitAll();

  /* ---------------- legend ---------------- */
  function renderLegend() {
    const T = t();
    document.getElementById('legend').innerHTML =
      `<span><svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6.4" fill="#f2c76a" opacity=".28"/><circle cx="7" cy="7" r="3.6" fill="#f2c76a"/></svg>${esc(T.rootBadge)}</span>` +
      DATA.meta.branches.map(b => `<span><svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.4" fill="${BRANCH_COLOR[b]}"/></svg>${esc(T.branchLabels[b] || b)}</span>`).join('') +
      `<span><i style="display:inline-block;width:14px;height:2px;background:#a78bfa;border-radius:2px;opacity:.6"></i>${lang === 'tr' ? 'eş danışman' : 'co-advisor'}</span>`;
  }

  /* ---------------- language toggle ---------------- */
  function applyLang() {
    const T = t();
    document.documentElement.lang = lang;
    document.title = lang === 'tr'
      ? 'Akademik Soyağacı — Gündüz İkeda · MAT4Person'
      : 'Academic Genealogy — Gündüz İkeda · MAT4Person';
    document.querySelectorAll('[data-i18n]').forEach(elm => {
      const key = elm.getAttribute('data-i18n');
      if (T[key] !== undefined && typeof T[key] === 'string') elm.innerHTML = T[key];
    });
    document.querySelector('[data-i18n-nav-self]').textContent = T.navSelf;
    const ph = document.querySelector('[data-i18n-ph]');
    if (ph) ph.placeholder = T.searchPh;
    document.getElementById('langTr').classList.toggle('on', lang === 'tr');
    document.getElementById('langEn').classList.toggle('on', lang === 'en');
    buildBranchChips(); buildGenChips(); syncFocusBtn(); renderLegend(); renderCounts();
    if (selected) renderNode(selected); else renderEmpty();
  }
  document.getElementById('langTr').onclick = () => { if (lang !== 'tr') { lang = 'tr'; applyLang(); } };
  document.getElementById('langEn').onclick = () => { if (lang !== 'en') { lang = 'en'; applyLang(); } };

  /* ---------------- boot ---------------- */
  buildBranchChips();
  buildGenChips();
  syncFocusBtn();
  renderLegend();
  refreshVis();
  resize();
  addEventListener('resize', () => { resize(); fitAll(); });
  fitAll(true);
  renderEmpty();
  requestAnimationFrame(draw);
})();
