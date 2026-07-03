
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

let filtered=[...DATA.relations];let selected=null;const filters={q:'',family:'all',confidence:'all'};
function relationCard(r){return `<div class="tag">${familyLabel(r.family)}</div><div class="tag hot">${familyLabel(r.type)}</div><div class="tag">${r.confidence}</div><h3>${relationTitle(r)}</h3><p class="quote">${r.quote||''}</p><div class="small">${r.sourcePath||''}${r.page?' · page '+r.page:''}</div>`}
function showReader(r){selected=r;const reader=document.getElementById('reader');reader.innerHTML=`<div class="eyebrow">Evidence reader</div><h2 class="detail-title">${relationTitle(r)}</h2><div class="toolbar"><span class="tag hot">${familyLabel(r.type)}</span><span class="tag">${familyLabel(r.family)}</span><span class="tag">${r.confidence}</span></div><p class="quote">${r.quote||''}</p><p>${r.note||''}</p><table class="table"><tbody><tr><th>Source</th><td>${r.sourcePath||''}</td></tr><tr><th>Page</th><td>${r.page??''}</td></tr><tr><th>Source card</th><td><a class="pill" href="${nodeLink(r.source)}">${nodeById.get(r.source)?.label||r.source}</a></td></tr><tr><th>Target card</th><td><a class="pill" href="${nodeLink(r.target)}">${nodeById.get(r.target)?.label||r.target}</a></td></tr></tbody></table>`}
function render(){filtered=DATA.relations.filter(r=>{const hay=(relationTitle(r)+' '+r.type+' '+r.family+' '+r.confidence+' '+r.quote+' '+r.note+' '+r.sourcePath).toLowerCase();return (!filters.q||hay.includes(filters.q))&&(filters.family==='all'||r.family===filters.family)&&(filters.confidence==='all'||r.confidence===filters.confidence)});document.getElementById('count').textContent=`${filtered.length} evidence-backed relations`;const list=document.getElementById('relations');list.innerHTML='';filtered.forEach((r,i)=>{const card=el('article','evidence-card relation-card '+r.confidence,relationCard(r));card.onclick=()=>showReader(r);list.appendChild(card);if(i===0&&!selected)showReader(r)});}
document.getElementById('q').oninput=e=>{filters.q=e.target.value.toLowerCase();selected=null;render()};document.getElementById('family').onchange=e=>{filters.family=e.target.value;selected=null;render()};document.getElementById('confidence').onchange=e=>{filters.confidence=e.target.value;selected=null;render()};
const sources=document.getElementById('sources');DATA.stats.topSources.forEach(s=>sources.appendChild(el('div','node-row',`<b>${s.count}</b><small>${s.source}</small>`)));render();
