
const DATA = window.MAT4PERSON_DATA;
const nodeById = new Map(DATA.nodes.map(n => [n.id, n]));
const fmt = new Intl.NumberFormat('en-US');
function familyLabel(x){return String(x||'').replaceAll('_',' ')}
function byDegree(a,b){return (b.degree||0)-(a.degree||0) || a.label.localeCompare(b.label)}
function relationTitle(r){return `${nodeById.get(r.source)?.label || r.source} → ${nodeById.get(r.target)?.label || r.target}`}
function el(tag, cls, html){const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e}
function typeColor(type){return {fundamental_person:'#d6ad58',base_person:'#55c7b6',institute:'#6ea8ff',event:'#ec6f62',unknown:'#a58ad8'}[type] || '#bcb3a2'}
function familyColor(f){return {person_person:'#55c7b6',person_institute:'#6ea8ff',person_event:'#ec6f62'}[f] || '#d6ad58'}

const stats = DATA.stats;
const statsEl = document.getElementById('stats');
[
 ['Nodes', stats.nodeCount], ['Relations', stats.edgeCount], ['Calls', stats.usage.calls], ['Cost', '$'+Number(stats.usage.estimated_usd||0).toFixed(6)], ['Model', stats.model]
].forEach(([label,value]) => { const s=el('div','stat',`<b>${typeof value==='number'?fmt.format(value):value}</b><span>${label}</span>`); statsEl.appendChild(s); });
const canvas = document.getElementById('miniCanvas'), ctx = canvas.getContext('2d');
let W=0,H=0,pts=[];
function resize(){W=canvas.width=canvas.clientWidth*devicePixelRatio;H=canvas.height=canvas.clientHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);seed();draw()}
function seed(){const top=DATA.nodes.slice().sort(byDegree).slice(0,90);pts=top.map((n,i)=>{const a=i/top.length*Math.PI*2;const r=120+((i*37)%210);return {n,x:canvas.clientWidth/2+Math.cos(a)*r,y:canvas.clientHeight/2+Math.sin(a)*r,vx:0,vy:0}})}
function draw(){const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);ctx.fillStyle='#0d0d0c';ctx.fillRect(0,0,w,h);for(let k=0;k<2;k++){for(const p of pts){const targetR=p.n.type==='fundamental_person'?80:210;const a=(Math.abs(hash(p.n.id))%628)/100;const tx=w/2+Math.cos(a)*targetR;const ty=h/2+Math.sin(a)*targetR;p.vx+=(tx-p.x)*.002;p.vy+=(ty-p.y)*.002;p.vx*=.92;p.vy*=.92;p.x+=p.vx;p.y+=p.vy}}ctx.globalAlpha=.32;ctx.lineWidth=1;for(const r of DATA.relations.slice(0,360)){const a=pts.find(p=>p.n.id===r.source),b=pts.find(p=>p.n.id===r.target);if(!a||!b)continue;ctx.strokeStyle=familyColor(r.family);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}ctx.globalAlpha=1;for(const p of pts){ctx.fillStyle=typeColor(p.n.type);ctx.beginPath();ctx.arc(p.x,p.y,Math.max(3,Math.min(13,3+Math.sqrt(p.n.degree||1))),0,Math.PI*2);ctx.fill()}}
function hash(s){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h)+s.charCodeAt(i)|0;return h}
window.addEventListener('resize',resize);resize();setInterval(draw,38);
const topNodes=document.getElementById('topNodes');DATA.stats.topNodes.slice(0,12).forEach(n=>topNodes.appendChild(el('div','card',`<h3>${n.label}</h3><p>${familyLabel(n.type)} · ${n.degree} relations</p><div class="bar"><i style="width:${Math.min(100,n.degree/190*100)}%"></i></div>`)));
const types=document.getElementById('types');Object.entries(DATA.stats.relationTypes).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>types.appendChild(el('tr','',`<td>${familyLabel(k)}</td><td>${fmt.format(v)}</td></tr>`)));
