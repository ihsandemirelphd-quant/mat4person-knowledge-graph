
const DATA = window.MAT4PERSON_DATA;
const nodeById = new Map(DATA.nodes.map(n => [n.id, n]));
const fmt = new Intl.NumberFormat('en-US');
function familyLabel(x){return String(x||'').replaceAll('_',' ')}
function byDegree(a,b){return (b.degree||0)-(a.degree||0) || a.label.localeCompare(b.label)}
function relationTitle(r){return `${nodeById.get(r.source)?.label || r.source} → ${nodeById.get(r.target)?.label || r.target}`}
function el(tag, cls, html){const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e}
function typeColor(type){return {fundamental_person:'#d6ad58',base_person:'#55c7b6',institute:'#6ea8ff',event:'#ec6f62',unknown:'#a58ad8'}[type] || '#bcb3a2'}
function familyColor(f){return {person_person:'#55c7b6',person_institute:'#6ea8ff',person_event:'#ec6f62'}[f] || '#d6ad58'}
function chips(obj, cls='tag'){return Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span class="${cls}">${familyLabel(k)} ${v}</span>`).join('')}
function nodeLink(id){return `id_cards.html#${encodeURIComponent(id)}`}

const filters={q:'',type:'all'};let selected=null;
function relsFor(id){return DATA.relations.filter(r=>r.source===id||r.target===id)}
function cardHTML(n){return `<h3><span class="type-chip" style="background:${typeColor(n.type)}"></span>${n.label}</h3><div class="meta">${familyLabel(n.type)} · ${n.id}</div><div class="toolbar">${chips(n.relationTypes,'tag hot')||'<span class="tag">no relation types</span>'}</div><div class="toolbar"><span class="tag">degree ${n.degree}</span><span class="tag">out ${n.outDegree}</span><span class="tag">in ${n.inDegree}</span><span class="tag">high ${n.confidence.high||0}</span></div>`}
function showCard(n){selected=n;location.hash=encodeURIComponent(n.id);const rels=relsFor(n.id).sort((a,b)=>(b.confidence||'').localeCompare(a.confidence||''));const topSources=Object.entries(n.sources||{}).sort((a,b)=>b[1]-a[1]).slice(0,8);const box=document.getElementById('detail');box.innerHTML=`<div class="id-card"><div class="eyebrow">Node ID Card</div>${cardHTML(n)}<p>${(n.aliases||[]).length?'<b>Aliases:</b> '+n.aliases.join('; '):''}</p><h3>Relation type profile</h3><div class="toolbar">${chips(n.relationTypes,'tag hot')}</div><h3>Top sources</h3>${topSources.map(([s,c])=>`<div class="node-row"><b>${c}</b><small>${s}</small></div>`).join('')}</div><h2>Relations</h2><div class="relation-grid">${rels.map(r=>{const other=nodeById.get(r.source===n.id?r.target:r.source);return `<article class="relation-card ${r.confidence}"><div class="tag hot">${familyLabel(r.type)}</div><div class="tag">${familyLabel(r.family)}</div><div class="tag">${r.confidence}</div><h3>${other?.label||''}</h3><p class="quote">${r.quote||''}</p><div class="small">${r.sourcePath||''}${r.page?' · p.'+r.page:''}</div></article>`}).join('')}</div>`}
function render(){const q=filters.q.toLowerCase();const nodes=DATA.nodes.filter(n=>(filters.type==='all'||n.type===filters.type)&&(!q||(n.label+' '+n.id+' '+Object.keys(n.relationTypes||{}).join(' ')).toLowerCase().includes(q))).sort(byDegree);const list=document.getElementById('cards');list.innerHTML='';nodes.forEach(n=>{const c=el('article','id-card',cardHTML(n));c.onclick=()=>showCard(n);list.appendChild(c)});document.getElementById('count').textContent=`${nodes.length} node cards`;if(!selected){const hash=decodeURIComponent(location.hash.slice(1));const h=DATA.nodes.find(n=>n.id===hash);showCard(h||nodes[0]||DATA.nodes[0])}}
document.getElementById('q').oninput=e=>{filters.q=e.target.value;selected=null;render()};document.getElementById('type').onchange=e=>{filters.type=e.target.value;selected=null;render()};render();
