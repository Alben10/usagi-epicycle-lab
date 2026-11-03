'use strict';
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const state = {e:.6, count:30, phase:.18, playing:!matchMedia('(prefers-reduced-motion: reduce)').matches, radii:[], pairs:[], points:[], curve:[], last:0};
function pairOf(p,m){const P=Math.hypot(p[1],p[2]),M=Math.hypot(m[1],m[2]),pp=Math.atan2(p[2],p[1]),pm=Math.atan2(m[2],m[1]);return {n:p[0],original:P+M,theta:(pp+pm)/2,alpha:(pp-pm)/2,sign:P>=M?1:-1};}
function vector(p,t,e,r=1){const q=Math.sqrt(1-e*e), angle=p.n*t+p.alpha, c=Math.cos(p.theta),s=Math.sin(p.theta),u=r*Math.cos(angle),v=r*p.sign*q*Math.sin(angle);return [c*u-s*v,s*u+c*v];}
function recompute(){const n=state.points.length, out=Array.from({length:n},()=>[0,0]);for(let i=0;i<state.count;i++){const p=state.pairs[i],r=state.radii[i];for(let j=0;j<n;j++){const v=vector(p,TAU*j/n,state.e,r);out[j][0]+=v[0];out[j][1]+=v[1];}}state.curve=out;let sum=0,sq=0;for(let j=0;j<n;j++){const dx=state.points[j][0]-out[j][0],dy=state.points[j][1]-out[j][1],d=dx*dx+dy*dy;sum+=Math.sqrt(d);sq+=d;}$('mean').textContent=(sum/n).toFixed(2);$('mse').textContent=(sq/n).toFixed(1);$('eccValue').value=state.e.toFixed(2);$('countValue').value=state.count;syncFrequency();draw();}
// Frequencies are distinct integers sampled uniformly over one period; their
// sine/cosine bases are orthogonal, so each constrained radius has its own projection.
function fit(){const n=state.points.length;for(let i=0;i<state.count;i++){let dot=0,norm=0;for(let j=0;j<n;j++){const v=vector(state.pairs[i],TAU*j/n,state.e);dot+=state.points[j][0]*v[0]+state.points[j][1]*v[1];norm+=v[0]*v[0]+v[1]*v[1];}state.radii[i]=Math.max(0,dot/norm);}recompute();$('status').textContent='현재 이심률과 타원 개수에 맞춰 각 장반축을 다시 계산했습니다.';}
function syncFrequency(){const select=$('frequency'), old=+select.value||1;select.replaceChildren();for(let i=0;i<state.count;i++){let o=document.createElement('option');o.value=i+1;o.textContent=`주파수 ${state.pairs[i].n}`;select.append(o);}select.value=String(Math.min(old,state.count));const r=state.radii[+select.value-1];$('radius').max=Math.max(500,Math.ceil(r*1.5));$('radius').value=r;$('radiusValue').value=r.toFixed(1);}
function draw(){if(!state.curve.length)return;const canvas=$('canvas'),box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);const w=box.width,h=box.height,scale=Math.min(w,h)/780,X=x=>w/2+x*scale,Y=y=>h/2-y*scale;
 const path=(points,end,close)=>{ctx.beginPath();for(let j=0;j<end;j++){const p=points[j];if(j)ctx.lineTo(X(p[0]),Y(p[1]));else ctx.moveTo(X(p[0]),Y(p[1]));}if(close)ctx.closePath();};
 if($('source').checked){path(state.points,state.points.length,true);ctx.setLineDash([4,5]);ctx.strokeStyle='#b2bbb0';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);}
 path(state.curve,state.curve.length,true);ctx.strokeStyle='rgba(40,109,104,.18)';ctx.lineWidth=1.5;ctx.stroke();let x=0,y=0,t=TAU*state.phase;for(let i=0;i<state.count;i++){const p=state.pairs[i],r=state.radii[i],v=vector(p,t,state.e,r);if($('cycles').checked&&r*scale>.8){ctx.beginPath();ctx.ellipse(X(x),Y(y),Math.max(.001,r*scale),Math.max(.001,r*Math.sqrt(1-state.e**2)*scale),-p.theta,0,TAU);ctx.strokeStyle='rgba(218,122,80,.30)';ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.moveTo(X(x),Y(y));ctx.lineTo(X(x+v[0]),Y(y+v[1]));ctx.strokeStyle='rgba(194,114,80,.5)';ctx.stroke();}x+=v[0];y+=v[1];}
 const end=Math.max(1,Math.floor(state.phase*state.curve.length));path(state.curve,end,false);ctx.lineTo(X(x),Y(y));ctx.strokeStyle='#286d68';ctx.lineWidth=2.8;ctx.stroke();ctx.beginPath();ctx.arc(X(x),Y(y),4,0,TAU);ctx.fillStyle='#dd7a50';ctx.fill();}
function tick(now){if(state.playing&&!document.hidden){if(state.last){state.phase=(state.phase+Math.min(now-state.last,100)/18000)%1;$('phase').value=state.phase;$('phaseValue').value=Math.round(state.phase*100)+'%';draw();}state.last=now;}else state.last=0;requestAnimationFrame(tick);}
function setPlay(){ $('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',state.playing?'일시정지':'재생'); }
fetch('data.json').then(r=>{if(!r.ok)throw new Error('data');return r.json()}).then(data=>{state.points=data.points;for(let i=0;i<120;i+=2)state.pairs.push(pairOf(data.coefficients[i],data.coefficients[i+1]));state.radii=state.pairs.map(p=>p.original);recompute();setPlay();requestAnimationFrame(tick);}).catch(()=>{$('status').textContent='윤곽선 데이터를 불러오지 못했습니다. 로컬 서버에서 실행해 주세요.';});
$('ecc').addEventListener('input',e=>{state.e=+e.target.value;recompute();$('status').textContent='이심률이 바뀌었습니다. 크기 다시 맞추기로 오차를 줄여 보세요.';});
$('count').addEventListener('input',e=>{state.count=+e.target.value;recompute();$('status').textContent='타원 개수가 바뀌었습니다. 크기를 다시 맞출 수 있습니다.';});
$('frequency').addEventListener('change',syncFrequency);
$('radius').addEventListener('input',e=>{state.radii[+$('frequency').value-1]=+e.target.value;recompute();$('status').textContent='선택한 타원의 장반축을 직접 조절했습니다.';});
$('fit').addEventListener('click',fit);
$('reset').addEventListener('click',()=>{state.e=.6;state.count=30;state.phase=.18;state.radii=state.pairs.map(p=>p.original);$('ecc').value=.6;$('count').value=30;$('phase').value=.18;$('phaseValue').value='18%';$('status').textContent='처음 상태로 돌아왔습니다.';recompute();});
$('play').addEventListener('click',()=>{state.playing=!state.playing;state.last=0;setPlay();});
$('phase').addEventListener('input',e=>{state.phase=+e.target.value;state.playing=false;setPlay();$('phaseValue').value=Math.round(state.phase*100)+'%';draw();});
for(const id of ['cycles','source'])$(id).addEventListener('change',draw);
window.addEventListener('resize',draw);
