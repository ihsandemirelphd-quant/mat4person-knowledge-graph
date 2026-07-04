/* MAT4Person — shared utilities: palette, starfield sky, force layout, shape painters */
window.M4 = (() => {
  const DATA = window.MAT4PERSON_DATA || { nodes: [], relations: [], stats: {} };
  const nodeById = new Map(DATA.nodes.map(n => [n.id, n]));
  const fmt = new Intl.NumberFormat('en-US');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TYPE = {
    fundamental_person: { color: '#e9b44c', label: 'centennial scientist', shape: 'sun' },
    base_person:        { color: '#57d0ba', label: 'person',               shape: 'dot' },
    institute:          { color: '#71a7ff', label: 'institute',            shape: 'diamond' },
    event:              { color: '#ff8175', label: 'event',                shape: 'star' },
    unknown:            { color: '#a78bfa', label: 'unknown',              shape: 'dot' },
  };
  const FAMILY = { person_person: '#57d0ba', person_institute: '#71a7ff', person_event: '#ff8175' };
  const CONF = { high: '#57d0ba', medium: '#e9b44c', low: '#ff8175' };

  const typeColor = t => (TYPE[t] || TYPE.unknown).color;
  const typeLabel = t => (TYPE[t] || TYPE.unknown).label;
  const typeShape = t => (TYPE[t] || TYPE.unknown).shape;
  const familyColor = f => FAMILY[f] || '#e9b44c';
  const confColor = c => CONF[c] || '#9aa4bd';
  const familyLabel = x => String(x || '').replaceAll('_', ' ');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const relationTitle = r => `${nodeById.get(r.source)?.label || r.source} ↔ ${nodeById.get(r.target)?.label || r.target}`;
  const cardLink = id => `id_cards.html#${encodeURIComponent(id)}`;
  const graphLink = id => `knowledge_graph.html#node=${encodeURIComponent(id)}`;
  const atlasLink = relId => `evidence_atlas.html#rel=${encodeURIComponent(relId)}`;
  const initials = label => String(label || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const sourceTail = p => String(p || '').split('/').pop() || '';
  const hashCode = s => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0; return h; };

  /* ---------- DOM helpers ---------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function markActiveNav() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav a').forEach(a => {
      if (a.getAttribute('href') === page) a.classList.add('active');
    });
  }

  function fillModel() {
    const m = DATA.stats?.model || 'MAT4Person run';
    document.querySelectorAll('[data-model]').forEach(n => { n.textContent = m; });
  }

  /* count-up animation for stat numbers */
  function animateCounters(root = document) {
    const els = [...root.querySelectorAll('[data-count]')];
    if (!els.length) return;
    const run = e => {
      const target = Number(e.dataset.count) || 0;
      const prefix = e.dataset.prefix || '', suffix = e.dataset.suffix || '';
      const dec = target !== Math.floor(target) ? 2 : 0;
      if (reduceMotion) { e.textContent = prefix + fmt.format(target) + suffix; return; }
      const t0 = performance.now(), dur = 1100;
      const tick = now => {
        const p = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - p, 3);
        const v = target * ease;
        e.textContent = prefix + (dec ? v.toFixed(dec) : fmt.format(Math.round(v))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: .4 });
    els.forEach(e => io.observe(e));
  }

  /* ---------- starfield sky (fixed background canvas) ---------- */
  function initSky() {
    const canvas = document.querySelector('canvas.sky');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [], meteors = [], W = 0, H = 0, nextMeteor = 4000;

    function resize() {
      W = canvas.width = innerWidth * devicePixelRatio;
      H = canvas.height = innerHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      const n = Math.round(innerWidth * innerHeight / 3800);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        r: .35 + Math.random() * 1.15, a: .12 + Math.random() * .5,
        ph: Math.random() * Math.PI * 2, sp: .0004 + Math.random() * .0012,
        warm: Math.random() < .16,
      }));
      drawStatic();
    }

    function nebulae() {
      const blobs = [
        [.16, .22, .38, '#2b4a8a', .10], [.82, .70, .34, '#5b3f8f', .08],
        [.62, .16, .26, '#8a6a2b', .07], [.30, .84, .30, '#1f5f57', .08],
      ];
      for (const [fx, fy, fr, color, alpha] of blobs) {
        const g = ctx.createRadialGradient(innerWidth * fx, innerHeight * fy, 0, innerWidth * fx, innerHeight * fy, Math.max(innerWidth, innerHeight) * fr);
        g.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, '0'));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, innerWidth, innerHeight);
      }
    }

    function drawStatic(t = 0) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const bg = ctx.createLinearGradient(0, 0, 0, innerHeight);
      bg.addColorStop(0, '#05070d'); bg.addColorStop(.55, '#080d1a'); bg.addColorStop(1, '#05070d');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, innerWidth, innerHeight);
      nebulae();
      for (const s of stars) {
        const tw = reduceMotion ? 1 : (.62 + .38 * Math.sin(t * s.sp + s.ph));
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = s.warm ? '#f6d789' : '#dbe4f7';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function spawnMeteor() {
      const x = innerWidth * (.15 + Math.random() * .7), y = innerHeight * Math.random() * .4;
      const ang = Math.PI * (.72 + Math.random() * .16);
      meteors.push({ x, y, vx: Math.cos(ang) * 9, vy: Math.sin(ang) * 9, life: 1 });
    }

    function loop(t) {
      drawStatic(t);
      if (t > nextMeteor) { spawnMeteor(); nextMeteor = t + 7000 + Math.random() * 12000; }
      for (const m of meteors) {
        m.x += m.vx; m.y += m.vy; m.life -= .022;
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 9, m.y - m.vy * 9);
        grad.addColorStop(0, `rgba(246,215,137,${.8 * m.life})`);
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 9, m.y - m.vy * 9); ctx.stroke();
      }
      meteors = meteors.filter(m => m.life > 0);
      requestAnimationFrame(loop);
    }

    addEventListener('resize', resize);
    resize();
    if (!reduceMotion) requestAnimationFrame(loop);
  }

  /* ---------- node radius + shape painters (shared by graph & hero) ---------- */
  function nodeRadius(n) {
    if (n.type === 'fundamental_person') return Math.min(30, 16 + Math.sqrt(n.degree || 1) * 1.15);
    return Math.min(13, 3.4 + Math.sqrt(n.degree || 1) * 1.7);
  }

  function drawNode(ctx, n, x, y, r, t, opts = {}) {
    const color = typeColor(n.type);
    const shape = typeShape(n.type);
    if (shape === 'sun') {
      const pulse = opts.still ? 1 : 1 + .035 * Math.sin(t * .0011 + (n._ph || 0));
      const rr = r * pulse;
      const glow = ctx.createRadialGradient(x, y, rr * .2, x, y, rr * 3.1);
      glow.addColorStop(0, 'rgba(246,215,137,.34)');
      glow.addColorStop(.45, 'rgba(233,180,76,.13)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, rr * 3.1, 0, Math.PI * 2); ctx.fill();
      const core = ctx.createRadialGradient(x - rr * .28, y - rr * .3, rr * .1, x, y, rr);
      core.addColorStop(0, '#fdf3d3');
      core.addColorStop(.5, '#f2c76a');
      core.addColorStop(1, '#c98f2b');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    if (shape === 'diamond') {
      ctx.moveTo(x, y - r * 1.25); ctx.lineTo(x + r * 1.05, y); ctx.lineTo(x, y + r * 1.25); ctx.lineTo(x - r * 1.05, y);
      ctx.closePath();
    } else if (shape === 'star') {
      const R = r * 1.5, ri = r * .5;
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? R : ri, a = i * Math.PI / 4 - Math.PI / 2;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
      }
      ctx.closePath();
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  /* legend swatch as inline SVG */
  function legendGlyph(type) {
    const c = typeColor(type), s = typeShape(type);
    if (s === 'sun') return `<svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6.4" fill="${c}" opacity=".28"/><circle cx="7" cy="7" r="3.6" fill="${c}"/></svg>`;
    if (s === 'diamond') return `<svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 .6 11.4 6 6 11.4.6 6Z" fill="${c}"/></svg>`;
    if (s === 'star') return `<svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 0l1.7 5.3L14 7l-5.3 1.7L7 14 5.3 8.7 0 7l5.3-1.7Z" fill="${c}"/></svg>`;
    return `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.4" fill="${c}"/></svg>`;
  }

  /* ---------- force simulation ----------
     The four fundamental scientists are pinned on a wide diamond; every relation
     in this dataset touches one of them, so the layout settles into four
     constellation clusters with shared people drifting between. */
  function makeSim(nodes, edges, opts = {}) {
    const R = opts.radius ?? 430;
    const suns = nodes.filter(n => n.type === 'fundamental_person');
    const sunAngle = new Map();
    suns.forEach((s, i) => {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / Math.max(1, suns.length));
      s.x = Math.cos(a) * R; s.y = Math.sin(a) * R;
      s.pinned = true; s._ph = Math.random() * 7;
      sunAngle.set(s.id, a);
    });
    const linkedSuns = new Map();
    for (const e of edges) {
      for (const [me, other] of [[e.a, e.b], [e.b, e.a]]) {
        if (other.pinned && !me.pinned) {
          if (!linkedSuns.has(me.id)) linkedSuns.set(me.id, []);
          linkedSuns.get(me.id).push(other);
        }
      }
    }
    for (const n of nodes) {
      if (n.pinned) continue;
      n._ph = Math.random() * 7;
      const anchors = linkedSuns.get(n.id);
      if (anchors?.length) {
        const cx = anchors.reduce((s, a) => s + a.x, 0) / anchors.length;
        const cy = anchors.reduce((s, a) => s + a.y, 0) / anchors.length;
        const jitterR = 90 + Math.random() * 200;
        const ja = Math.random() * Math.PI * 2;
        n.x = cx + Math.cos(ja) * jitterR; n.y = cy + Math.sin(ja) * jitterR;
      } else {
        const a = Math.random() * Math.PI * 2;
        n.x = Math.cos(a) * (R + 160); n.y = Math.sin(a) * (R + 160);
      }
      n.vx = 0; n.vy = 0;
    }

    function step(alpha = 1) {
      const kRep = 1150 * alpha;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 > 190000) continue;
          if (d2 < 1) { d2 = 1; dx = Math.random() - .5; dy = Math.random() - .5; }
          const d = Math.sqrt(d2);
          let f = Math.min(5.5, kRep / d2);
          const rr = nodeRadius(a) + nodeRadius(b) + 7;
          if (d < rr) f += (rr - d) * .09;
          const ux = dx / d, uy = dy / d;
          if (!a.pinned && !a.dragging) { a.vx -= ux * f; a.vy -= uy * f; }
          if (!b.pinned && !b.dragging) { b.vx += ux * f; b.vy += uy * f; }
        }
      }
      for (const e of edges) {
        const a = e.a, b = e.b;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) + .01;
        const ideal = e.family === 'person_person' ? 175 : 250;
        const f = (d - ideal) * .0055 * alpha;
        const ux = dx / d, uy = dy / d;
        if (!a.pinned && !a.dragging) { a.vx += ux * f; a.vy += uy * f; }
        if (!b.pinned && !b.dragging) { b.vx -= ux * f; b.vy -= uy * f; }
      }
      for (const n of nodes) {
        if (n.pinned || n.dragging) { n.vx = 0; n.vy = 0; continue; }
        n.vx += -n.x * .0011 * alpha; n.vy += -n.y * .0011 * alpha;
        n.vx *= .85; n.vy *= .85;
        const sp = Math.hypot(n.vx, n.vy);
        if (sp > 4.5) { n.vx *= 4.5 / sp; n.vy *= 4.5 / sp; }
        n.x += n.vx; n.y += n.vy;
      }
    }

    function warmup(iterations = 280) {
      for (let i = 0; i < iterations; i++) step(1 - (i / iterations) * .55);
    }
    return { step, warmup, suns, sunAngle };
  }

  /* boot shared page chrome */
  document.addEventListener('DOMContentLoaded', () => {
    markActiveNav(); fillModel(); initSky(); animateCounters();
  });

  return {
    DATA, nodeById, fmt, reduceMotion, TYPE, FAMILY, CONF,
    typeColor, typeLabel, typeShape, familyColor, confColor, familyLabel,
    esc, el, relationTitle, cardLink, graphLink, atlasLink, initials, sourceTail, hashCode,
    nodeRadius, drawNode, legendGlyph, makeSim, animateCounters,
  };
})();
