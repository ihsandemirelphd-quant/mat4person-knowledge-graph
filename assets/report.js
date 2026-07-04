/* MAT4Person — run report: KPIs, cost bars, confidence donut, leaderboards */
(() => {
  const {
    DATA, fmt, esc, el, CONF, typeColor, typeLabel, familyColor, familyLabel, cardLink, animateCounters,
  } = window.M4;
  const s = DATA.stats || {};
  const usage = s.usage || {};

  /* ---------- KPIs ---------- */
  const kpis = document.getElementById('kpis');
  const perCall = usage.calls ? usage.estimated_usd / usage.calls : 0;
  [
    [s.model || '—', 'model', false],
    [usage.calls || 0, 'model calls', true],
    [usage.prompt_tokens || 0, 'input tokens', true],
    [usage.output_tokens || 0, 'output tokens', true],
    ['$' + Number(usage.estimated_usd || 0).toFixed(2), 'estimated cost', false],
    ['$' + (perCall * 1000).toFixed(2) + ' / 1k', 'cost per 1k calls', false],
    [s.edgeCount || 0, 'relations found', true],
    [s.nodeCount || 0, 'nodes in catalog', true],
  ].forEach(([v, label, count]) => {
    kpis.appendChild(el('div', 'stat', count
      ? `<b data-count="${v}">0</b><span>${label}</span>`
      : `<b style="font-size:22px">${esc(String(v))}</b><span>${label}</span>`));
  });

  /* ---------- cost by family ---------- */
  const famEl = document.getElementById('famCost');
  const fams = Object.entries(s.byFamilyUsage || {}).sort((a, b) => (b[1].estimated_usd || 0) - (a[1].estimated_usd || 0));
  const maxCost = fams[0]?.[1].estimated_usd || 1;
  fams.forEach(([name, v]) => {
    famEl.appendChild(el('div', 'meter-row', `
      <span class="lbl">${esc(familyLabel(name))}<br><small class="small">${fmt.format(v.calls || 0)} calls · ${fmt.format(v.prompt_tokens || 0)} in · ${fmt.format(v.output_tokens || 0)} out</small></span>
      <span class="meter"><i style="width:${Math.max(2, (v.estimated_usd || 0) / maxCost * 100)}%;background:linear-gradient(90deg,${familyColor(name)},var(--gold))"></i></span>
      <span class="val">$${Number(v.estimated_usd || 0).toFixed(2)}</span>`));
  });
  const famRelCounts = s.families || {};
  famEl.appendChild(el('p', 'small', `Positive yield — ${Object.entries(famRelCounts).map(([f, c]) => `${esc(familyLabel(f))}: <b style="color:var(--gold-2)">${c}</b>`).join(' · ')}`));

  /* ---------- confidence donut ---------- */
  const conf = s.confidence || {};
  const canvas = document.getElementById('confDonut');
  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1;
  canvas.width = 190 * dpr; canvas.height = 190 * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const entries = ['high', 'medium', 'low'].map(k => [k, conf[k] || 0]);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  let angle = -Math.PI / 2;
  const cx = 95, cy = 95, R = 82, ri = 52;
  entries.forEach(([k, v]) => {
    const sweep = v / total * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, angle, angle + sweep);
    ctx.arc(cx, cy, ri, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fillStyle = CONF[k];
    ctx.globalAlpha = .88;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#05070d';
    ctx.lineWidth = 2;
    ctx.stroke();
    angle += sweep;
  });
  ctx.fillStyle = '#f6d789';
  ctx.font = '540 26px Fraunces, serif';
  ctx.textAlign = 'center';
  ctx.fillText(fmt.format(total), cx, cy + 2);
  ctx.fillStyle = '#9aa4bd';
  ctx.font = '10.5px Inter, sans-serif';
  ctx.fillText('RELATIONS', cx, cy + 20);
  const legend = document.getElementById('confLegend');
  entries.forEach(([k, v]) => {
    legend.appendChild(el('span', '', `<i style="background:${CONF[k]}"></i>${k} <b>${fmt.format(v)}</b> · ${(v / total * 100).toFixed(1)}%`));
  });

  /* ---------- degree distribution ---------- */
  const buckets = [['0', 0], ['1', 0], ['2', 0], ['3–5', 0], ['6–10', 0], ['11–20', 0], ['21+', 0]];
  DATA.nodes.forEach(n => {
    const d = n.degree || 0;
    const i = d === 0 ? 0 : d === 1 ? 1 : d === 2 ? 2 : d <= 5 ? 3 : d <= 10 ? 4 : d <= 20 ? 5 : 6;
    buckets[i][1]++;
  });
  const maxB = Math.max(...buckets.map(b => b[1])) || 1;
  const degEl = document.getElementById('degHist');
  buckets.forEach(([label, v]) => {
    degEl.appendChild(el('div', 'meter-row', `
      <span class="lbl">${label} relation${label === '1' ? '' : 's'}</span>
      <span class="meter"><i style="width:${Math.max(1.5, v / maxB * 100)}%"></i></span>
      <span class="val">${fmt.format(v)}</span>`));
  });

  /* ---------- relation types ---------- */
  const typesEl = document.getElementById('types');
  const types = Object.entries(s.relationTypes || {}).sort((a, b) => b[1] - a[1]);
  const maxT = types[0]?.[1] || 1;
  types.forEach(([k, v]) => {
    typesEl.appendChild(el('div', 'meter-row', `
      <span class="lbl">${esc(familyLabel(k))}</span>
      <span class="meter"><i style="width:${Math.max(2, v / maxT * 100)}%"></i></span>
      <span class="val">${fmt.format(v)}</span>`));
  });

  /* ---------- run configuration ---------- */
  const sel = s.selected || {};
  const cfg = document.getElementById('config');
  [
    ['Model', s.model || '—'],
    ['Fundamental persons', sel.fundamental_persons],
    ['Candidate people', sel.base_people],
    ['Institutes', sel.institutes],
    ['Events', sel.events],
    ['Planned pair checks', s.plannedCalls],
    ['Calls with usage data', usage.calls],
    ['Total tokens', usage.total_tokens],
    ['Avg input tokens / call', usage.calls ? Math.round((usage.prompt_tokens || 0) / usage.calls) : '—'],
    ['Avg output tokens / call', usage.calls ? Math.round((usage.output_tokens || 0) / usage.calls) : '—'],
    ['Estimated cost', '$' + Number(usage.estimated_usd || 0).toFixed(6)],
    ['Positive yield', `${s.edgeCount} relations from ${s.plannedCalls || '—'} checks (${s.plannedCalls ? ((s.edgeCount / s.plannedCalls) * 100).toFixed(1) + '%' : '—'})`],
  ].forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    cfg.appendChild(el('tr', '', `<th style="width:230px">${esc(k)}</th><td>${typeof v === 'number' ? fmt.format(v) : esc(String(v))}</td>`));
  });

  /* ---------- degree leaderboard ---------- */
  const top = document.getElementById('topTable');
  (s.topNodes || []).slice(0, 30).forEach((n, i) => {
    top.appendChild(el('tr', '', `
      <td class="num">${i + 1}</td>
      <td><a href="${cardLink(n.id)}" style="color:var(--ink);border-bottom:1px dotted var(--faint)">${esc(n.label)}</a></td>
      <td><span style="color:${typeColor(n.type)}">●</span> ${esc(typeLabel(n.type))}</td>
      <td class="num">${n.degree}</td>
      <td style="color:${CONF.high}">${n.confidence?.high || 0}</td>
      <td style="color:${CONF.medium}">${n.confidence?.medium || 0}</td>
      <td style="color:${CONF.low}">${n.confidence?.low || 0}</td>`));
  });

  /* ---------- sources ---------- */
  const srcT = document.getElementById('srcTable');
  (s.topSources || []).forEach(x => {
    srcT.appendChild(el('tr', '', `<td class="num" style="width:90px">${fmt.format(x.count)}</td><td class="mono" style="font-size:12px;color:var(--muted)">${esc(x.source)}</td>`));
  });

  animateCounters();
})();
