
const DATA = window.MAT4PERSON_DATA;
const nodeById = new Map(DATA.nodes.map(n => [n.id, n]));
const fmt = new Intl.NumberFormat('en-US');
function familyLabel(x){return String(x||'').replaceAll('_',' ')}
function byDegree(a,b){return (b.degree||0)-(a.degree||0) || a.label.localeCompare(b.label)}
function relationTitle(r){return `${nodeById.get(r.source)?.label || r.source} → ${nodeById.get(r.target)?.label || r.target}`}
function el(tag, cls, html){const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e}
function typeColor(type){return {fundamental_person:'#d6ad58',base_person:'#55c7b6',institute:'#6ea8ff',event:'#ec6f62',unknown:'#a58ad8'}[type] || '#bcb3a2'}
function familyColor(f){return {person_person:'#55c7b6',person_institute:'#6ea8ff',person_event:'#ec6f62'}[f] || '#d6ad58'}

const s=DATA.stats;const k=document.getElementById('kpis');[
 ['Model',s.model],['Calls',fmt.format(s.usage.calls||0)],['Input tokens',fmt.format(s.usage.prompt_tokens||0)],['Output tokens',fmt.format(s.usage.output_tokens||0)],['Estimated cost','$'+Number(s.usage.estimated_usd||0).toFixed(6)],['Relations',fmt.format(s.edgeCount)],['Nodes',fmt.format(s.nodeCount)],['High confidence',fmt.format(s.confidence.high||0)]
].forEach(([a,b])=>k.appendChild(el('div','stat',`<b>${b}</b><span>${a}</span>`)));
const fam=document.getElementById('families');Object.entries(s.byFamilyUsage||{}).forEach(([name,v])=>fam.appendChild(el('tr','',`<td>${familyLabel(name)}</td><td>${fmt.format(v.calls||0)}</td><td>${fmt.format(v.prompt_tokens||0)}</td><td>${fmt.format(v.output_tokens||0)}</td><td>$${Number(v.estimated_usd||0).toFixed(6)}</td></tr>`)));
const top=document.getElementById('topTable');s.topNodes.slice(0,30).forEach(n=>top.appendChild(el('tr','',`<td>${n.label}</td><td>${familyLabel(n.type)}</td><td>${n.degree}</td><td>${n.confidence.high||0}</td><td>${n.confidence.medium||0}</td><td>${n.confidence.low||0}</td></tr>`)));
