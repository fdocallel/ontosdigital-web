/* ONTOS public procedural experience. See provenance.json. */
(() => {
'use strict';
const T=window.ONTOS_DEMO_TRANSLATE|| (text=>text);
const $=id=>document.getElementById(id), TAU=Math.PI*2;
let canvas=$('ot-world');
let figurine=!!(canvas&&canvas.dataset.mode==='figure');
let walk=!!(canvas&&canvas.dataset.mode==='walk');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const figure={rotating:false,rolled:false,living:!reducedMotion};
let figureAspect=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const sub=(a,b)=>a.map((v,i)=>v-b[i]), add=(a,b)=>a.map((v,i)=>v+b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d);};
const scale=(a,s)=>a.map(v=>v*s), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const style=getComputedStyle(document.documentElement);
function token(name){const value=style.getPropertyValue(name).trim();const probe=document.createElement('span');probe.style.color=value;document.body.appendChild(probe);const rgb=getComputedStyle(probe).color.match(/[\d.]+/g).slice(0,3).map(Number);probe.remove();return rgb.map(v=>v/255);}
const C={paper:token('--surface'),sand:token('--border'),bronze:token('--accent'),gold:token('--oro'),clay:token('--teja'),olive:token('--area-vida-ink'),ink:token('--text')};
C.sky=mix(C.ink,C.bronze,.14);C.grass=mix(C.sand,C.olive,.32);C.stone=mix(C.paper,C.sand,.45);
let gl,program,staticBuffer,dynamicBuffer,staticCount,locations,failed=false;
let player,seed,stars,delivered=false,paused=false,time=0,wave=0,last=0,fold=0,angle=0,frames=0;
let wanderDir=1,wanderClock=3,lastInput=-10,raf=0,wiredWindow=false;
const RADIUS=9.2;
const camera={yaw:0,pitch:.4,distance:12,overview:false}, held=new Set(),touch=new Map(),drag=new Map(),obstacles=[],landmarks=[];
// Coordinates of landmarks are surface normals, never latitude-based player state.
const site=(x,z)=>{const a=Math.hypot(x,z)/RADIUS;if(a<1e-9)return [0,1,0];return [x/Math.hypot(x,z)*Math.sin(a),Math.cos(a),z/Math.hypot(x,z)*Math.sin(a)];};
const pedestal={up:site(-.5,-8)}, starSites=[[-3,-1],[3,-4],[-4,-7],[4,-10],[12,-7],[-14,4],[4,18],[-3,24]];
const surfaceDistance=(a,b)=>Math.acos(clamp(dot(a,b),-1,1))*RADIUS;
const rotate=(v,axis,a)=>add(add(scale(v,Math.cos(a)),scale(cross(axis,v),Math.sin(a))),scale(axis,dot(axis,v)*(1-Math.cos(a))));
function basis(up,tangent){const back=tangent||norm(cross(Math.abs(up[1])<.9?[0,1,0]:[1,0,0],up));return {up,back,right:norm(cross(up,back))};}
function cameraBasis(){const b=basis(player.up,player.tangent),back=add(scale(b.back,Math.cos(camera.yaw)),scale(b.right,Math.sin(camera.yaw)));return {back,right:norm(cross(player.up,back)),forward:scale(back,-1)};}
function atSurface(up,v,tangent){const b=basis(up,tangent);return add(scale(up,RADIUS+v[1]),add(scale(b.right,v[0]),scale(b.back,v[2])));}
function syncPosition(){if(walk){player.pos=[player.x||0,player.altitude||0,player.z||0];player.y=player.altitude;return;}player.pos=scale(player.up,RADIUS+player.altitude);[player.x,player.y,player.z]=player.pos;}
function zoom(value){if(figurine){camera.distance=clamp(value,3,14);return;}if(walk){camera.distance=clamp(value,4,14);return;}camera.distance=clamp(value,camera.segovia?RADIUS*2.75:6,65);camera.overview=!!camera.segovia||camera.distance>=30;setEl('ot-overview',n=>{n.textContent=camera.overview?T('Seguir a ONTOS'):T('Ver planeta');n.setAttribute('aria-pressed',String(camera.overview));});}
const say=text=>{const n=$('ot-message');if(n&&n.textContent!==text)n.textContent=text;};
function setEl(id,fn){const n=$(id);if(n)fn(n);}
function clearInput(){held.clear();touch.clear();drag.clear();document.querySelectorAll('[data-ot-hold]').forEach(b=>b.setAttribute('aria-pressed','false'));}
function pause(value){if(failed)return;paused=value;clearInput();if(figurine)return;if(value){player.vx=0;player.vz=0;}setEl('ot-overlay',n=>n.hidden=!value);setEl('ot-pause',n=>{n.textContent=value?T('Continuar'):T('Pausa');n.setAttribute('aria-pressed',String(value));});}
function fail(text){failed=true;paused=true;clearInput();setEl('ot-overlay',n=>n.hidden=false);setEl('ot-overlay-title',n=>n.textContent=figurine?T('No se ha podido mostrar la figura.'):walk?T('ONTOS se ha detenido.'):T('No se ha podido mostrar el jardín.'));setEl('ot-overlay-text',n=>n.textContent=text);document.querySelectorAll('.ot-wrap button:not(#of-exit)').forEach(b=>b.disabled=true);}
function reset(){player={up:[0,1,0],tangent:[0,0,1],pos:[0,RADIUS,0],altitude:0,vx:0,vz:0,vy:0,yaw:0,grounded:true,carrying:false,x:0,z:0};if(walk){player.x=0;player.z=0;player.yaw=0;}syncPosition();seed={up:site(1.3,-3)};stars=starSites.map(([x,z])=>({up:site(x,z),got:false}));delivered=false;wave=0;fold=0;angle=0;time=0;wanderDir=1;wanderClock=3;lastInput=-10;Object.assign(camera,{yaw:walk?.28:0,pitch:walk?.04:.4,segovia:false});zoom(walk?3.8:12);pause(false);if(figurine){resetFigure();return;}if(walk){say(isAmbient()?'OK menú':'← → pasear · ↑ saltar · OK saludar');return;}say(T('Un mundo pequeño, sin bordes. Camina alrededor o aléjate para verlo entero.'));updateHud();}
function action(type){if(paused||failed)return;if(type==='jump'&&player.grounded){player.vy=5.5;player.grounded=false;say(T('¡Arriba! Un poco más cerca del cielo.'));}
if(type==='wave'){wave=2.5;say(T('¡Hola! Este rincón del mundo ya es nuestro.'));}
if(type==='grab'){
if(player.carrying){player.carrying=false;if(surfaceDistance(player.up,pedestal.up)<1.8){delivered=true;seed={up:[...pedestal.up]};say(T('Una semilla, un jardín. Ya hemos hecho algo juntos.'));}else{seed={up:norm(add(player.up,scale(cameraBasis().forward,.1)))};say(T('La dejo aquí. Puedes volver a cogerla.'));}}
else if(!delivered&&surfaceDistance(player.up,seed.up)<1.5){player.carrying=true;say(T('¡La tengo! Llévame al pedestal entre los dos arcos.'));}
else say(delivered?T('Ya tiene raíces. El jardín sigue abierto.'):T('Acércate a la semilla dorada y pulsa Coger / plantar.'));updateHud();}}
function updateHud(){if(walk||figurine)return;setEl('ot-objective',n=>n.textContent=delivered?T('III · Ya tiene raíces'):player.carrying?T('II · Al pedestal entre los arcos'):T('I · Encuentra la semilla'));setEl('ot-score',n=>n.textContent=`${T('Destellos')} ${stars.filter(s=>s.got).length} / 8`);}
const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'boost',ShiftRight:'boost'};
function noteInput(){lastInput=time;}
function isAmbient(){return !!(canvas&&canvas.dataset.ambient==='1');}
if(walk){
window.addEventListener('keydown',e=>{if(isAmbient())return;if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;if(e.code==='KeyP'){e.preventDefault();if(!e.repeat)pause(!paused);return;}if(paused||failed)return;const walkKeys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ShiftLeft:'boost',ShiftRight:'boost'};if(walkKeys[e.code]){e.preventDefault();held.add(e.code);noteInput();}const act={Space:'jump',ArrowUp:'jump',KeyW:'jump',KeyH:'wave',Enter:'wave'}[e.code];if(act){e.preventDefault();if(!e.repeat){action(act);noteInput();}}});
window.addEventListener('keyup',e=>held.delete(e.code));
}else if(!figurine){
window.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;if(e.target.closest('button,a,summary')&&(e.code==='Space'||e.code==='Enter'))return;if(e.code==='KeyP'){e.preventDefault();if(!e.repeat)pause(!paused);return;}if(paused||failed)return;if(keyMap[e.code]){e.preventDefault();held.add(e.code);}const act={Space:'jump',KeyE:'grab',KeyH:'wave'}[e.code];if(act){e.preventDefault();if(!e.repeat)action(act);}});
window.addEventListener('keyup',e=>held.delete(e.code));window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
$('ot-pause').onclick=()=>pause(!paused);$('ot-reset').onclick=reset;$('ot-center').onclick=()=>{Object.assign(camera,{yaw:0,pitch:.4,segovia:false});zoom(12);};
$('ot-near').onclick=()=>zoom(camera.distance-4);$('ot-far').onclick=()=>zoom(camera.distance+4);$('ot-overview').onclick=()=>{if(camera.segovia){camera.segovia=false;Object.assign(camera,{yaw:0,pitch:.4});zoom(12);}else zoom(camera.overview?12:48);};
document.querySelectorAll('[data-ot-action]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();action(b.dataset.otAction);});b.addEventListener('click',e=>{if(e.detail===0)action(b.dataset.otAction);});});
document.querySelectorAll('[data-ot-hold]').forEach(b=>{b.addEventListener('pointerdown',e=>{if(paused||failed)return;e.preventDefault();b.setPointerCapture(e.pointerId);touch.set(e.pointerId,b.dataset.otHold);b.setAttribute('aria-pressed','true');});const release=e=>{touch.delete(e.pointerId);b.setAttribute('aria-pressed',String([...touch.values()].includes(b.dataset.otHold)));};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);b.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&!paused){e.preventDefault();held.add('button-'+b.dataset.otHold);b.setAttribute('aria-pressed','true');}});const up=()=>{held.delete('button-'+b.dataset.otHold);b.setAttribute('aria-pressed','false');};b.addEventListener('keyup',up);b.addEventListener('blur',up);});
canvas.addEventListener('pointerdown',e=>{if(paused||failed)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);drag.set(e.pointerId,[e.clientX,e.clientY]);});
canvas.addEventListener('pointermove',e=>{const prev=drag.get(e.pointerId);if(!prev)return;if(drag.size===2){const other=[...drag.entries()].find(([id])=>id!==e.pointerId)[1];const before=Math.hypot(prev[0]-other[0],prev[1]-other[1]),after=Math.hypot(e.clientX-other[0],e.clientY-other[1]);if(before>5&&after>5)zoom(camera.distance*before/after);}else{camera.yaw-=(e.clientX-prev[0])*.008;camera.pitch=clamp(camera.pitch+(e.clientY-prev[1])*.006,.08,1.18);}drag.set(e.pointerId,[e.clientX,e.clientY]);});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>drag.delete(e.pointerId));
canvas.addEventListener('wheel',e=>{if(paused||failed)return;e.preventDefault();zoom(camera.distance+e.deltaY*.025);},{passive:false});
}
function down(name){return [...held].some(k=>keyMap[k]===name||k==='button-'+name)||[...touch.values()].includes(name);}
function stepWalk(dt){
time+=dt;wave=Math.max(0,wave-dt);
let axis=isAmbient()?0:Number(down('right'))-Number(down('left'));
if(axis) lastInput=time;
const auto=isAmbient()||time-lastInput>2.2;
if(auto&&!axis){
wanderClock-=dt;
if(player.x>5.2) wanderDir=-1;
if(player.x<-5.2) wanderDir=1;
if(wanderClock<0){wanderClock=2.2+Math.random()*3.5;if(Math.random()<.4)wave=2.5;}
axis=wanderDir;
}
player.yaw=0;
const speed=down('boost')?4.6:1.45;
player.vx+=(axis*speed-player.vx)*Math.min(1,dt*8);
player.x=clamp((player.x||0)+player.vx*dt,-6.2,6.2);
player.vy-=13*dt;player.altitude=Math.max(0,player.altitude+player.vy*dt);
player.grounded=player.altitude===0;if(player.grounded)player.vy=0;
fold+=((down('boost')&&Math.abs(player.vx)>0.4?1:0)-fold)*Math.min(1,dt*8);
angle+=player.vx*dt/.65*fold;
player.z=player.z||0;player.pos=[player.x,player.altitude,player.z];player.up=[0,1,0];
}
function step(dt){if(walk)return stepWalk(dt);time+=dt;wave=Math.max(0,wave-dt);let f=Number(down('forward'))-Number(down('back')),r=Number(down('right'))-Number(down('left'));const l=Math.hypot(f,r)||1;f/=l;r/=l;if(camera.segovia&&(f||r)){camera.segovia=false;Object.assign(camera,{yaw:0,pitch:.4});zoom(12);}const speed=down('boost')&&!player.carrying?5.5:2.6;
player.vx+=(r*speed-player.vx)*Math.min(1,dt*10);player.vz+=(f*speed-player.vz)*Math.min(1,dt*10);
const cb=cameraBasis(),velocity=add(scale(cb.right,player.vx),scale(cb.forward,player.vz)),moving=Math.hypot(...velocity);
if(moving>.001){const direction=scale(velocity,1/moving),axis=norm(cross(player.up,direction)),a=moving*dt/(RADIUS+player.altitude),next=norm(rotate(player.up,axis,a));let blocked=landmarkBlocked(next,player.altitude);for(const o of obstacles)if(surfaceDistance(next,o.up)<o.r+.27&&player.altitude<o.h){blocked=true;break;}if(!blocked){player.up=next;player.tangent=norm(rotate(player.tangent,axis,a));player.tangent=norm(sub(player.tangent,scale(player.up,dot(player.tangent,player.up))));}
const b=basis(player.up,player.tangent),target=Math.atan2(dot(direction,b.right),dot(direction,b.back)),delta=Math.atan2(Math.sin(target-player.yaw),Math.cos(target-player.yaw));player.yaw+=delta*Math.min(1,dt*10);}
player.vy-=13*dt;player.altitude=Math.max(0,player.altitude+player.vy*dt);player.grounded=player.altitude===0;if(player.grounded)player.vy=0;syncPosition();
fold+=((down('boost')&&moving>1&&!player.carrying?1:0)-fold)*Math.min(1,dt*8);angle+=moving*dt/.65*fold;
for(const star of stars)if(!star.got&&surfaceDistance(player.up,star.up)<.85){star.got=true;updateHud();say(stars.every(v=>v.got)?T('Ocho destellos. Un planeta entero descubierto.'):T('Un destello más. Hay otro horizonte al otro lado.'));}}
// Geometry is batched into one static mesh and one animated mesh: two draw calls.
class Mesh{
constructor(transform){this.data=[];this.transform=transform||((v)=>v);}
tri(a,b,c,color,glow=0){a=this.transform(a);b=this.transform(b);c=this.transform(c);const n=norm(cross(sub(b,a),sub(c,a)));for(const p of [a,b,c])this.data.push(...p,...n,...color,glow,color===C.gold||color===C.bronze?.72:color===C.clay?.3:0);}
quad(a,b,c,d,col,glow=0){this.tri(a,b,c,col,glow);this.tri(a,c,d,col,glow);}
box(p,size,c){const [x,y,z]=p,[w,h,d]=size.map(v=>v/2),v=[[-w,-h,-d],[w,-h,-d],[w,h,-d],[-w,h,-d],[-w,-h,d],[w,-h,d],[w,h,d],[-w,h,d]].map(q=>add(q,[x,y,z]));for(const f of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])this.quad(...f.map(i=>v[i]),c);}
ball(p,r,c,glow=0,segments=10,rings=6,squash=[1,1,1]){const point=(i,j)=>add(p,[Math.sin(i/rings*Math.PI)*Math.cos(j/segments*TAU)*r*squash[0],Math.cos(i/rings*Math.PI)*r*squash[1],Math.sin(i/rings*Math.PI)*Math.sin(j/segments*TAU)*r*squash[2]]);for(let i=0;i<rings;i++)for(let j=0;j<segments;j++)this.quad(point(i,j),point(i,j+1),point(i+1,j+1),point(i+1,j),c,glow);}
rod(a,b,r,c,n=8,r2=r){const axis=norm(sub(b,a)),u=norm(cross(axis,Math.abs(axis[1])<.9?[0,1,0]:[1,0,0])),v=cross(axis,u);const point=(p,i,rr)=>add(p,add(scale(u,Math.cos(i/n*TAU)*rr),scale(v,Math.sin(i/n*TAU)*rr)));for(let i=0;i<n;i++){const aa=point(a,i,r),ab=point(a,i+1,r),ba=point(b,i,r2),bb=point(b,i+1,r2);this.quad(aa,ba,bb,ab,c);this.tri(a,aa,ab,c);this.tri(b,bb,ba,c);}}
arc(center,inner,outer,a,b,depth,c,glow=0){const pt=(r,t,z)=>add(center,[Math.cos(t)*r,Math.sin(t)*r,z]);const f=[pt(inner,a,depth/2),pt(outer,a,depth/2),pt(outer,b,depth/2),pt(inner,b,depth/2)],back=[pt(inner,a,-depth/2),pt(outer,a,-depth/2),pt(outer,b,-depth/2),pt(inner,b,-depth/2)];this.quad(...f,c,glow);this.quad(...back.slice().reverse(),c,glow);for(let i=0;i<4;i++)this.quad(f[i],back[i],back[(i+1)%4],f[(i+1)%4],c,glow);}
bevelArc(center,inner,outer,a,b,depth,color){
const bevel=.028,pt=(r,t,z)=>add(center,[Math.cos(t)*r,Math.sin(t)*r,z]);
for(const side of [-1,1])for(let j=0;j<3;j++){
const q=(aa,bb,cc,dd,col)=>this.quad(...(side<0?[dd,cc,bb,aa]:[aa,bb,cc,dd]),col);
const aa=a+(b-a)*j/3,bb=a+(b-a)*(j+1)/3,z=side*depth/2,edge=side*(depth/2-bevel);
q(pt(inner+bevel,aa,z),pt(outer-bevel,aa,z),pt(outer-bevel,bb,z),pt(inner+bevel,bb,z),color);
q(pt(outer-bevel,aa,z),pt(outer,aa,edge),pt(outer,bb,edge),pt(outer-bevel,bb,z),mix(color,C.paper,.26));
q(pt(inner,aa,edge),pt(inner+bevel,aa,z),pt(inner+bevel,bb,z),pt(inner,bb,edge),C.bronze);
q(pt(outer,aa,edge),pt(outer,aa,0),pt(outer,bb,0),pt(outer,bb,edge),mix(color,C.bronze,.4));
q(pt(inner,aa,0),pt(inner,aa,edge),pt(inner,bb,edge),pt(inner,bb,0),C.bronze);
}
for(const t of [a,b])this.quad(pt(inner,t,-depth/2+bevel),pt(outer,t,-depth/2+bevel),pt(outer,t,depth/2-bevel),pt(inner,t,depth/2-bevel),C.bronze);
}

}
function append(m,part){for(const value of part.data)m.data.push(value);}
function localMesh(up,tangent){
if(walk){
const c=Math.cos(player.yaw||0),s=Math.sin(player.yaw||0),lift=.72+(player.altitude||0);
return new Mesh(v=>{const rx=v[0]*c+v[2]*s,rz=-v[0]*s+v[2]*c;return [player.x+rx,lift+v[1],player.z+rz];});
}
const b=basis(up,tangent);return new Mesh(v=>[0,1,2].map(i=>up[i]*(RADIUS+v[1])+b.right[i]*v[0]+b.back[i]*v[2]));
}
function shadow(m,up,r){const b=basis(up),base=mix(C.grass,C.sand,.25);const point=(a,rr)=>scale(norm(add(up,add(scale(b.right,Math.cos(a)*rr/RADIUS),scale(b.back,Math.sin(a)*rr*.66/RADIUS)))),RADIUS+.027);for(let ring=0;ring<4;ring++){const inner=r*ring/4,outer=r*(ring+1)/4,col=mix(base,C.olive,.10+(1-ring/4)*.26);for(let i=0;i<16;i++)m.quad(point(i/16*TAU,inner),point(i/16*TAU,outer),point((i+1)/16*TAU,outer),point((i+1)/16*TAU,inner),col);}}
function landmarkBlocked(){return false;}
function makeWorld(){const m=new Mesh();obstacles.length=0;landmarks.length=0;
// Uniform icosphere triangles avoid a visible fan at either pole. Radius stays exact.
const g=(1+Math.sqrt(5))/2,vertices=[[-1,g,0],[1,g,0],[-1,-g,0],[1,-g,0],[0,-1,g],[0,1,g],[0,-1,-g],[0,1,-g],[g,0,-1],[g,0,1],[-g,0,-1],[-g,0,1]].map(norm);
const faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
function land(a,b,c,depth){if(depth){const ab=norm(add(a,b)),bc=norm(add(b,c)),ca=norm(add(c,a));land(a,ab,ca,depth-1);land(b,bc,ab,depth-1);land(c,ca,bc,depth-1);land(ab,bc,ca,depth-1);return;}const n=norm(add(add(a,b),c)),patch=(1+Math.sin(n[0]*5+n[2]*2)*Math.cos(n[1]*4-.7))/2,rock=Math.max(0,Math.sin(n[0]*4-n[1]*3+n[2]*2)-.65);let col=mix(C.sand,C.olive,.12+patch*.30);col=mix(col,C.clay,rock*.25);m.tri(scale(a,RADIUS),scale(b,RADIUS),scale(c,RADIUS),col);}
for(const face of faces)land(...face.map(i=>vertices[i]),4);
// Pale paving winds over the curvature, rather than bridging it as a flat plane.
for(let z=1;z>-9;z-=.45){const up=site(Math.sin(z*.45)*.22,z);const point=(x,zz)=>scale(norm(atSurface(up,[x,0,zz])),RADIUS+.025);m.quad(point(-.48,.18),point(.48,.18),point(.48,-.18),point(-.48,-.18),C.stone);}
function arch(up,size){const part=localMesh(up);for(const side of [-1,1]){const x=side*size*.72;part.box([x,.1,0],[.55,.2,.55],C.stone);part.rod([x,.15,0],[x,size*1.1,0],.16,C.stone,9,.14);part.box([x,size*1.1,0],[.48,.16,.45],C.stone);const foot=norm(atSurface(up,[x,0,0]));obstacles.push({up:foot,r:.21,h:size*1.4});}for(let j=0;j<9;j++)part.bevelArc([0,size*1.1,0],size*.58,size*.87,j*Math.PI/9+.018,(j+1)*Math.PI/9-.018,.35,mix(C.stone,C.gold,j%3===0?.2:.03));append(m,part);shadow(m,up,size);}
arch(site(-2.5,-6.8),1.25);arch(site(2.5,-9),1.35);arch(site(14,9),1.15);arch(site(-15,-7),1.3);
const pl=localMesh(pedestal.up);pl.rod([0,0,0],[0,.12,0],.66,C.stone,12);pl.rod([0,.12,0],[0,.64,0],.36,C.stone,8);pl.rod([0,.64,0],[0,.75,0],.52,C.gold,8);for(let i=0;i<8;i++){const a=i/8*TAU;pl.rod([Math.cos(a)*.355,.22,Math.sin(a)*.355],[Math.cos(a)*.355,.53,Math.sin(a)*.355],.014,C.bronze,4);}append(m,pl);

// Groves wrap around the entire planet, including its southern hemisphere.
for(let i=0;i<25;i++){const y=1-2*(i+.5)/25,lon=i*2.399963,up=[Math.sqrt(1-y*y)*Math.cos(lon),y,Math.sqrt(1-y*y)*Math.sin(lon)];if(false||surfaceDistance(up,[0,1,0])<3||surfaceDistance(up,seed.up)<2||surfaceDistance(up,pedestal.up)<2)continue;const part=localMesh(up),h=1.05+(i%3)*.2;part.rod([0,0,0],[.06,h,0],.095,C.bronze,7,.055);if(i%3===0)part.rod([0,.3,0],[0,h+1.15,0],.42,C.olive,7,.025);else{part.rod([0,h*.7,0],[-.35,h+.1,0],.05,C.bronze,6,.025);part.ball([0,h,0],.6,mix(C.olive,C.gold,.13),0,7,4,[1.5,.72,1]);part.ball([-.35,h+.15,0],.4,mix(C.olive,C.sand,.18),0,7,4);}append(m,part);shadow(m,up,.65);obstacles.push({up,r:.13,h});}
for(let i=0;i<65;i++){const y=1-2*(i+.5)/65,lon=i*2.399963,up=[Math.sqrt(1-y*y)*Math.cos(lon),y,Math.sqrt(1-y*y)*Math.sin(lon)];const part=localMesh(up);part.ball([0,.04,0],.1+(i%3)*.025,C.stone,0,5,3,[1,.6,1]);append(m,part);}
// Small botanical clusters concentrate detail around landmarks, leaving open ground.
for(const [cluster,x,z] of [[0,-1.3,-1.8],[1,2.2,-5.5],[2,-3.4,-8.8],[3,8,10],[4,-12,7],[5,3,20]]){
for(let j=0;j<7;j++){const up=site(x+Math.sin(j*2.4)*.45,z+Math.cos(j*2.4)*.45),part=localMesh(up),h=.13+(j%3)*.05;
for(const side of [-1,1])part.tri([-.025,0,0],[side*.08,h,.025],[.025,0,0],mix(C.olive,C.gold,.12));
if(j%3===0){part.rod([0,0,0],[0,h+.06,0],.011,C.olive,4);for(let petal=0;petal<5;petal++){const a=petal/5*TAU;part.ball([Math.cos(a)*.035,h+.065,Math.sin(a)*.035],.037,cluster%2?C.paper:mix(C.paper,C.clay,.3),0,5,3,[1,.45,1]);}part.ball([0,h+.08,0],.021,C.gold,0,5,3);}append(m,part);}}
// Distant mineral stars belong to the backdrop, not to the eight collectibles.
for(let i=0;i<220;i++){const y=1-2*(i+.5)/220,lon=i*2.399963,up=[Math.sqrt(1-y*y)*Math.cos(lon),y,Math.sqrt(1-y*y)*Math.sin(lon)],pos=scale(up,85+(i%7)*2);m.ball(pos,.035+(i%4)*.024,mix(C.paper,C.gold,.3),1,4,2);}
return m;}
// Rounded glove digits are capsules, with a closed hemisphere at either end.
function capsule(m,a,b,r,col){
const axis=norm(sub(b,a)),u=norm(cross(axis,Math.abs(axis[1])<.9?[0,1,0]:[1,0,0])),v=cross(axis,u);
const rings=[[-Math.PI/2,a],[-Math.PI/4,a],[0,a],[0,b],[Math.PI/4,b],[Math.PI/2,b]],point=(ring,j)=>{const [t,p]=rings[ring];return add(p,add(scale(axis,Math.sin(t)*r),add(scale(u,Math.cos(j/10*TAU)*Math.cos(t)*r),scale(v,Math.sin(j/10*TAU)*Math.cos(t)*r))));};
for(let i=0;i<rings.length-1;i++)for(let j=0;j<10;j++)m.quad(point(i,j+1),point(i+1,j+1),point(i+1,j),point(i,j),col);
}
function glove(m,center,direction,size,side,carrying){
const up=norm(direction),across=[up[1],-up[0],0],hand=new Mesh(v=>m.transform(add(center,add(scale(across,v[0]*size),add(scale(up,v[1]*size),[0,0,v[2]*size])))));
// A circular cuff follows the forearm into the palm instead of floating across it.
hand.rod([0,-.16,0],[0,-.09,0],.079,C.clay,12,.091);
hand.rod([0,-.105,0],[0,-.08,0],.094,C.paper,12,.096);
hand.ball([0,.015,0],.12,C.paper,0,12,8,[1.03,1.1,.63]);
for(let j=0;j<4;j++){
const x=(j-1.5)*.063,length=[.095,.145,.135,.085][j],bend=carrying?.070:.012;
const knuckle=[x,.095,.004],joint=[x*1.08,.095+length*.48,.018],tip=[x*1.12,.095+length,bend];
capsule(hand,knuckle,joint,.034,C.paper);capsule(hand,joint,tip,.032,C.paper);
}
// Opposed thumbs face the body/seed; mirrored across the two hands.
const thumb=-side*Math.sign(up[1]),root=[thumb*.083,-.02,.028],joint=[thumb*.145,.023,.045],tip=[thumb*(carrying?.11:.165),.08,carrying?.10:.05];
capsule(hand,root,joint,.045,C.paper);capsule(hand,joint,tip,.039,C.paper);
// Two shallow stitched creases on the back of the glove.
for(const x of [-.035,.035])capsule(hand,[x,-.015,-.073],[x,.058,-.066],.0045,C.sand);
append(m,hand);
}
function shoe(m,ankle,size,side,stride){
const yaw=side*.10,tilt=Math.max(0,side*stride)*.18,c=Math.cos(yaw),s=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt);
const part=new Mesh(v=>{const y=v[1]*ct-v[2]*st,z=v[1]*st+v[2]*ct;return m.transform(add(ankle,scale([v[0]*c+z*s,y,z*c-v[0]*s],size)));});
// Continuous closed loft: broad rounded toe, narrower heel and a flat inset sole.
const rings=[[-.105,.91],[-.086,1],[-.05,1],[-.027,.97],[.045,.88],[.085,.60]],n=16;
const point=(i,j)=>{const a=j/n*TAU,front=Math.cos(a),[y,k]=rings[i];return [Math.sin(a)*(.147+.025*front)*k,y,.045+front*.235*k];};
for(let i=0;i<rings.length-1;i++)for(let j=0;j<n;j++)part.quad(point(i,j+1),point(i+1,j+1),point(i+1,j),point(i,j),i<2?C.bronze:i===2?mix(C.clay,C.paper,.24):C.clay);
for(let j=0;j<n;j++){part.tri([0,rings[0][0],.045],point(0,j+1),point(0,j),C.bronze);part.tri([0,rings[5][0],.045],point(5,j),point(5,j+1),C.clay);}
part.rod([0,.07,-.045],[0,.13,-.045],.072,C.clay,12,.064);
// Tongue and two cream lace stitches, kept on the upper rather than below the sole.
part.ball([0,.072,.025],.065,mix(C.clay,C.bronze,.2),0,10,5,[.82,.35,1.4]);
for(const z of [.017,.058])capsule(part,[-.035,.085,z],[.035,.085,z+.007],.009,C.paper);
append(m,part);
}
function makeStage(){
const m=new Mesh();
m.quad([-14,0,-10],[14,0,-10],[14,0,10],[-14,0,10],mix(C.paper,C.sand,.28));
m.quad([-9,.014,-1.4],[9,.014,-1.4],[9,.014,1.4],[-9,.014,1.4],mix(C.sand,C.gold,.22));
for(const x of [-5.5,-2.2,2.2,5.5]){
const part=new Mesh(v=>add(v,[x,0,-3.8]));
part.rod([0,0,0],[.03,.85,0],.07,C.bronze,6,.03);
part.ball([0,.95,0],.42,mix(C.olive,C.gold,.12),0,6,4,[1.4,.7,1]);
append(m,part);
}
return m;
}
function character(m){
const speed=Math.hypot(player.vx,player.vz),ext=1-fold,idle=Math.max(0,1-speed/1.5),breath=Math.sin(time*2.7)*.018*idle*ext;
const bodyYaw=player.yaw+Math.PI*.5*fold,c=Math.cos(bodyYaw),s=Math.sin(bodyYaw),base=player.altitude+1.05-fold*.33+breath;
const b=basis(player.up,player.tangent),right=add(scale(b.right,c),scale(b.back,-s)),front=add(scale(b.right,s),scale(b.back,c));
const local=new Mesh(v=>[0,1,2].map(i=>player.up[i]*(RADIUS+base+v[1])+right[i]*v[0]+front[i]*v[2]));
if(typeof walk!=='undefined'&&walk) local.transform=localMesh(player.up,player.tangent).transform;
const stride=Math.sin(time*10)*Math.min(1,speed/3.5)*ext;
// Fixed exterior roots: retract towards each mount, never through the annulus.
// The render geometry itself is exercised by ontos-articulaciones.test.js.
for(const side of [-1,1]){
const hip=[side*.32,-.70,0],knee=mix(hip,[side*.35,-.79,side*stride*.13],ext),foot=mix(hip,[side*.39,-.92+Math.max(0,side*stride)*.055,side*stride*.2+.10],ext);
local.rod(hip,knee,.052*ext,C.bronze);local.ball(knee,.068*ext,C.gold,0,8,5);local.rod(knee,foot,.045*ext,C.bronze);
shoe(local,foot,ext,side,stride);
const shoulder=[side*.76,.02,0],waving=wave>0&&side===1&&fold<.4;
let hand,elbow;
if(player.carrying){
// Two-stage deployment: clear the front face before closing around the seed.
const reach=clamp((ext-.5)*2,0,1),lift=clamp(ext*2,0,1);
elbow=[side*(.76+.04*ext),.02-.15*ext,.40*lift];
hand=[side*(.76-.56*reach),.02-.17*ext,.40*lift+.27*reach];
}else{
elbow=mix(shoulder,[side*.86,waving?.28:-.13,waving?.12:0],ext);
hand=mix(shoulder,[side*.99+(waving?Math.sin(time*12)*.07:0),waving?.72:-.21+stride*side*.07,waving?.18:.03],ext);
}
const fingerDirection=waving?[Math.sin(time*12)*.16,1,0]:player.carrying?[-side*.35,1,0]:[side*.32,-1,0],wrist=sub(hand,scale(norm(fingerDirection),.14*ext));
local.rod(shoulder,elbow,.055*ext,C.bronze);local.ball(elbow,.072*ext,C.gold,0,8,5);local.rod(elbow,wrist,.045*ext,C.bronze);
glove(local,hand,fingerDirection,ext,side,player.carrying);
}
// Eight separate voussoirs, with bright bevels, dark returns and inset gold fillets.
for(let i=0;i<8;i++){const a=i*TAU/8+.043+angle,b=a+TAU/8-.086,mid=(a+b)/2;
local.bevelArc([0,0,0],.48,.68,a,b,.35,i===0?C.clay:C.gold);
for(const side of [-1,1]){local.arc([0,0,side*.181],.603,.614,a+.055,b-.055,.008,C.bronze);local.rod([Math.cos(mid)*.24,Math.sin(mid)*.24,side*.035],[Math.cos(mid)*.49,Math.sin(mid)*.49,side*.035],.025,C.bronze,6);const pulse=.26+((time*.6+i/8)%1)*.21;local.ball([Math.cos(mid)*pulse,Math.sin(mid)*pulse,side*.05],.025,C.gold,.6,6,4);}
}
// Flush radial mounting collars sit on the exterior edge, not in the central opening.
for(const [x,y,r] of [[-.76,.02,.041],[.76,.02,.041],[-.32,-.70,.039],[.32,-.70,.039],[-.18,.70,.024],[.18,.70,.024]]){
const axis=norm([x,y,0]);local.rod(scale(axis,.674),[x,y,0],r*ext,C.bronze,8,r*.8*ext);
}
// The two hemispheres of thought stay upright; no central dot that reads as a pupil.
const pulse=1+Math.sin(time*2.7)*.025;local.ball([0,0,0],.255*pulse,C.clay,.18,16,10,[1,1,.84]);
for(const face of [-1,1]){
local.arc([0,0,face*.19],.24,.266,0,TAU,.025,C.bronze);
for(const side of [-1,1]){const points=[[.038,.145],[.11,.17],[.165,.11],[.145,.035],[.17,-.05],[.10,-.15],[.036,-.12]].map(([x,y])=>[side*x,y,face*.23]);for(let i=0;i<points.length-1;i++)local.rod(points[i],points[i+1],.014,C.gold,5);for(const [x,y,yy] of [[.04,.06,.085],[.04,-.065,-.025]])local.rod([side*x,y,face*.24],[side*.105,yy,face*.245],.012,C.paper,5);local.ball([side*.11,.17,face*.23],.021,C.gold,.6,6,4);}
local.ball([-.105,.145,face*.19],.041,C.paper,.18,8,4,[1,.42,.35]);
}
// Eyes telescope upwards from the outer rim, and disappear at their own roots.
const eyeScale=ext,eyeY=.70+.18*ext,blink=Math.sin(time*1.3)>.994,look=Math.sin(time*.8)*.013*idle*ext;
for(const side of [-1,1]){const x=side*.18;local.rod([x,.70,0],[x,eyeY,.06*ext],.025*ext,C.bronze);local.ball([x,eyeY,.08*ext],.15*eyeScale,C.bronze,0,12,7);local.ball([x,eyeY+.008*ext,.18*ext],.119*eyeScale,C.paper,0,12,7,[1,blink?.12:1,.5]);if(!blink){local.ball([x+look,eyeY+.009*ext,.239*ext],.057*eyeScale,C.ink,0,10,6,[1,1,.5]);local.ball([x+.016*eyeScale+look,eyeY+.03*eyeScale,.27*ext],.017*ext,C.paper,1,6,4);}
local.rod([x-.085*eyeScale,eyeY+.165*eyeScale,.07*ext],[x+.073*eyeScale,eyeY+(.175+(wave?.015:0))*eyeScale,.07*ext],.014*ext,C.bronze,5);
}
local.arc([0,-.31,.19],.065,.081,Math.PI+.15,TAU-.15,.018,C.bronze);
append(m,local);if(walk){const x=player.x,z=player.z,sh=new Mesh();sh.quad([x-.55,.02,z-.38],[x+.55,.02,z-.38],[x+.55,.02,z+.38],[x-.55,.02,z+.38],mix(C.sand,C.ink,.2));append(m,sh);}else if(!figurine)shadow(m,player.up,.72);
if(player.carrying){const seedMesh=localMesh(player.up,player.tangent),pos=[s*.55,base-.06,c*.55];seedMesh.ball(pos,.2,C.gold,.6,10,6);seedMesh.rod(add(pos,[0,.1,0]),add(pos,[.1,.38,0]),.028,C.olive,5);append(m,seedMesh);}
}
function dynamicWorld(){const m=new Mesh();character(m);if(figurine||walk)return m;for(const [i,star] of stars.entries())if(!star.got){const part=localMesh(star.up),y=.65+Math.sin(time*2+i)*.12;part.ball([0,y,0],.14,C.gold,.65,4,2);part.ball([0,y,0],.055,C.paper,1,6,4);append(m,part);}
if(!player.carrying&&!delivered){const part=localMesh(seed.up),y=.25+Math.sin(time*2)*.04;part.ball([0,y,0],.22,C.gold,.4,12,6);part.rod([0,y+.15,0],[.1,y+.4,0],.03,C.olive,6);part.ball([.15,y+.34,0],.09,C.olive,0,6,4,[1.5,.5,1]);append(m,part);shadow(m,seed.up,.3);}
if(delivered){const part=localMesh(pedestal.up),y=.75;part.rod([0,y,0],[0,y+1.3,0],.04,C.bronze,7,.02);for(let i=0;i<6;i++){const side=i%2?1:-1;part.rod([0,y+.3+i*.14,0],[side*.3,y+.45+i*.14,0],.022,C.olive,5);part.ball([side*.3,y+.45+i*.14,0],.19,C.olive,0,7,4,[1.2,.4,.7]);}append(m,part);}
return m;}
function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;}
function initGL(){gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});if(!gl)throw new Error('WebGL unavailable');
const vs=shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute vec3 normal;attribute vec3 color;attribute float glow;attribute float metal;uniform mat4 vp;varying vec3 vPosition;varying vec3 vNormal;varying vec3 vColor;varying float vGlow;varying float vMetal;void main(){vPosition=position;vNormal=normal;vColor=color;vGlow=glow;vMetal=metal;gl_Position=vp*vec4(position,1.);}`);
const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 vPosition;varying vec3 vNormal;varying vec3 vColor;varying float vGlow;varying float vMetal;uniform vec3 sky;uniform vec3 eye;void main(){vec3 n=normalize(vNormal),v=normalize(eye-vPosition),l=normalize(vec3(-.5,.85,.5));float diffuse=max(dot(n,l),0.);float light=.54+.46*diffuse;float spec=pow(max(dot(n,normalize(l+v)),0.),28.)*vMetal*.28;float rim=pow(1.-max(dot(n,v),0.),3.)*vMetal*.12;vec3 tint=vColor*mix(light,1.12,vGlow)+vec3(spec+rim);float fog=smoothstep(95.,160.,length(eye-vPosition));gl_FragColor=vec4(mix(tint,sky,fog),1.);}`);
program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);locations={};for(const name of ['position','normal','color','glow','metal'])locations[name]=gl.getAttribLocation(program,name);for(const name of ['vp','eye','sky'])locations[name]=gl.getUniformLocation(program,name);
const world=figurine?new Mesh():walk?makeStage():makeWorld();staticBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(world.data),gl.STATIC_DRAW);staticCount=world.data.length/11;dynamicBuffer=gl.createBuffer();gl.enable(gl.DEPTH_TEST);gl.clearColor(...(figurine||walk?C.paper:C.sky),1);}
function matrix(eye,target,aspect,up){const z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];const f=1/Math.tan(.78/2),n=.08,far=180,p=[f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0],out=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[col*4+row]+=p[k*4+row]*view[col*4+k];return out;}
function bind(buffer){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [name,size,offset] of [['position',3,0],['normal',3,12],['color',3,24],['glow',1,36],['metal',1,40]]){gl.enableVertexAttribArray(locations[name]);gl.vertexAttribPointer(locations[name],size,gl.FLOAT,false,44,offset);}}
function draw(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.75);const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
const t=clamp((camera.distance-14)/18,0,1),blend=t*t*(3-2*t),target=scale(player.up,(RADIUS+player.altitude+.8)*(1-blend)),cb=cameraBasis(),dist=camera.distance;let eye=add(target,add(scale(player.up,Math.sin(camera.pitch)*dist),scale(cb.back,Math.cos(camera.pitch)*dist)));if(Math.hypot(...eye)<RADIUS+2)eye=scale(norm(eye),RADIUS+2);let viewTarget=target,viewUp=player.up;if(camera.segovia&&!figurine){viewTarget=[0,1.3,-1];viewUp=[0,1,0];eye=add(viewTarget,[Math.sin(camera.yaw)*Math.cos(camera.pitch)*dist,Math.sin(camera.pitch)*dist,Math.cos(camera.yaw)*Math.cos(camera.pitch)*dist]);}if(walk){viewTarget=[player.x,(player.altitude||0)+.95,player.z];viewUp=[0,1,0];eye=add(viewTarget,[Math.sin(camera.yaw)*Math.cos(camera.pitch)*dist,Math.sin(camera.pitch)*dist+.08,Math.cos(camera.yaw)*Math.cos(camera.pitch)*dist]);}
if(figurine){viewTarget=[0,RADIUS+.95,0];const back=[Math.sin(camera.yaw),0,Math.cos(camera.yaw)];eye=add(viewTarget,add(scale(back,Math.cos(camera.pitch)*dist),[0,Math.sin(camera.pitch)*dist,0]));viewUp=add(scale(back,-Math.sin(camera.pitch)),[0,Math.cos(camera.pitch),0]);}camera.eye=[...eye];camera.target=[...viewTarget];gl.uniformMatrix4fv(locations.vp,false,matrix(eye,viewTarget,w/h,viewUp));gl.uniform3fv(locations.eye,eye);gl.uniform3fv(locations.sky,C.sky);bind(staticBuffer);gl.drawArrays(gl.TRIANGLES,0,staticCount);const dynamic=dynamicWorld();bind(dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dynamic.data),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,dynamic.data.length/11);frames++;}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(T('Se ha interrumpido el dibujo 3D. Recarga la página para volver a entrar.'));});
function frame(now){if(failed)return;const dt=Math.min((now-last)/1000||0,.035);last=now;if(!paused){if(figurine)stepFigure(dt);else step(dt);}try{draw();}catch(error){console.error('ONTOS Tierra:',error);fail(T('No se ha podido dibujar ONTOS. Recarga la página para volver a intentarlo.'));return;}raf=requestAnimationFrame(frame);}

// The display case shares the exact character mesh and shader with the planet.
function resetFigure(){clearInput();Object.assign(camera,{yaw:.30,pitch:.12,overview:false});const rect=canvas.getBoundingClientRect();zoom(Math.max(4,3/(rect.width/rect.height||1)));Object.assign(figure,{rotating:false,rolled:false,living:!reducedMotion});wave=0;fold=0;angle=0;time=0;paused=false;syncFigureControls();}
function syncFigureControls(){for(const [id,key] of [['of-turn','rotating'],['of-roll','rolled'],['of-life','living']])$(id).setAttribute('aria-pressed',String(figure[key]));}
function stepFigure(dt){if(figure.rotating)camera.yaw+=dt*.32;if(figure.living||wave>0)time+=dt;wave=Math.max(0,wave-dt);fold+=(Number(figure.rolled)-fold)*Math.min(1,dt*8);}
function solo(value){document.body.classList.toggle('of-solo',value);$('of-solo').setAttribute('aria-pressed',String(value));$('of-exit').hidden=!value;requestAnimationFrame(()=>{const rect=canvas.getBoundingClientRect();zoom(Math.max(camera.distance,3/(rect.width/rect.height||1)));(value?$('of-exit'):$('of-solo')).focus({preventScroll:true});});}
function wireFigure(){
// A narrower viewport refits the whole waving silhouette; manual zoom stays free.
new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect(),aspect=rect.width/rect.height||1;if(figureAspect&&aspect<figureAspect-.01)zoom(Math.max(camera.distance,3/aspect));figureAspect=aspect;}).observe(canvas);
$('of-reset').onclick=resetFigure;$('of-near').onclick=()=>zoom(camera.distance/1.18);$('of-far').onclick=()=>zoom(camera.distance*1.18);
for(const [id,key] of [['of-turn','rotating'],['of-roll','rolled'],['of-life','living']])$(id).onclick=()=>{figure[key]=!figure[key];if(key==='rolled')wave=0;syncFigureControls();};
$('of-wave').onclick=()=>{figure.rolled=false;wave=2.5;syncFigureControls();};
$('of-solo').onclick=()=>solo(true);$('of-exit').onclick=()=>solo(false);
canvas.addEventListener('pointerdown',e=>{if(failed)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);drag.set(e.pointerId,[e.clientX,e.clientY]);figure.rotating=false;syncFigureControls();});
canvas.addEventListener('pointermove',e=>{const prev=drag.get(e.pointerId);if(!prev)return;if(drag.size===2){const other=[...drag.entries()].find(([id])=>id!==e.pointerId)[1],before=Math.hypot(prev[0]-other[0],prev[1]-other[1]),after=Math.hypot(e.clientX-other[0],e.clientY-other[1]);if(before>5&&after>5)zoom(camera.distance*before/after);}else if(drag.size===1){camera.yaw-=(e.clientX-prev[0])*.008;camera.pitch+=(e.clientY-prev[1])*.006;}drag.set(e.pointerId,[e.clientX,e.clientY]);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>drag.delete(e.pointerId));
canvas.addEventListener('wheel',e=>{if(failed)return;e.preventDefault();zoom(camera.distance*Math.exp(clamp(e.deltaY*.001,-.3,.3)));},{passive:false});
canvas.addEventListener('keydown',e=>{if(failed)return;const actions={ArrowLeft:()=>camera.yaw-=.15,ArrowRight:()=>camera.yaw+=.15,ArrowUp:()=>camera.pitch-=.15,ArrowDown:()=>camera.pitch+=.15,Equal:()=>zoom(camera.distance/1.1),Minus:()=>zoom(camera.distance*1.1),NumpadAdd:()=>zoom(camera.distance/1.1),NumpadSubtract:()=>zoom(camera.distance*1.1),Home:resetFigure,KeyH:()=>$('of-wave').click()};if(actions[e.code]){e.preventDefault();figure.rotating=false;actions[e.code]();syncFigureControls();}});
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&document.body.classList.contains('of-solo'))solo(false);});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{paused=document.hidden;clearInput();});
}

// Read-only copies for verification: no setters, teleportation or persisted personal state.
function stopLoop(){failed=true;if(raf)cancelAnimationFrame(raf);}
function bootTierra(){
canvas=$('ot-world');
if(!canvas)return;
figurine=canvas.dataset.mode==='figure';
walk=canvas.dataset.mode==='walk';
failed=false;paused=false;frames=0;
if(figurine)wireFigure();
reset();
(()=>{try{initGL();raf=requestAnimationFrame(frame);}catch(error){console.error('ONTOS Tierra:',error);fail(T('Este navegador no ha podido iniciar WebGL. Prueba un navegador con aceleración gráfica o vuelve al patio 2D.'));}})();
}
const api=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify({mode:figurine?'figure':walk?'walk':'planet',figure,staticVertices:staticCount,landmarks:landmarks.map(({id,name,up,frame,solids,bays})=>({id,name,up,frame,solids,bays})),radius:RADIUS,player:{...player,forward:walk?[Math.cos(player.yaw||0),0,Math.sin(player.yaw||0)]:cameraBasis().forward,right:walk?[-Math.sin(player.yaw||0),0,Math.cos(player.yaw||0)]:cameraBasis().right},camera,seed:{...seed,pos:scale(seed.up,RADIUS)},pedestal:{...pedestal,pos:scale(pedestal.up,RADIUS)},delivered,paused,wave,fold,stars:stars?.filter(s=>s.got).length||0,frames,failed,held:held.size+touch.size,walk:!!walk})),stop:stopLoop,boot:bootTierra});
Object.defineProperty(window,figurine?'ONTOS_FIGURA':'ONTOS_TIERRA',{value:api,writable:false});
if(canvas&&canvas.dataset.boot!=='manual')bootTierra();
})();
