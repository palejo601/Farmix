'use strict';
// Núcleo: utilidades, texto, iconos, fondo, subtítulos, capítulos y renderFrame(t)
const cv=document.getElementById('cv'),X=cv.getContext('2d'),W=1920,H=1080,PI=Math.PI,TAU=2*PI;
const C={sky:'#5FB3E8',ice:'#A8D8F0',white:'#F4F8FB',gray:'#8FA3B8',green:'#3CC59A',mint:'#7BE0B8',amber:'#FFB547',red:'#FF6B5A',blue:'#1F6FB2',teal:'#36B9C9'};
const cl=(v,a=0,b=1)=>v<a?a:v>b?b:v,lr=(a,b,k)=>a+(b-a)*k,pr=(t,a,b)=>cl((t-a)/(b-a));
const eo=k=>1-(1-k)**3,eio=k=>k<.5?4*k*k*k:1-(-2*k+2)**3/2,eb=k=>{const c=1.70158;return 1+(c+1)*(k-1)**3+c*(k-1)**2};
const fade=(t,a,b,d=.5)=>Math.min(eo(pr(t,a,a+d)),1-eio(pr(t,b-d,b)));
let GA=1;const A=a=>{X.globalAlpha=cl(a)*GA};
function grp(k,fn){if(k<=.001)return;const g=GA;GA*=cl(k);X.save();fn();X.restore();GA=g}
const F=(w,s)=>w+' '+s+'px Inter',FD=(w,s)=>w+' '+s+'px "Inter Display"';
const rgba=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`};
function rng(s){return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const nm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
const SCN={};TL.scenes.forEach(s=>SCN[s.id]=s);
const MISS=[],Q={},EVENTS=[],ev=(t,k,v=1)=>EVENTS.push({t:+t.toFixed(3),k,v});
// tiempo (s) en que se pronuncia una palabra de la frase i de la escena id
function wt(id,i,word,n=0,end){const s=SCN[id].sent[i],k=nm(word);let c=0;for(const w of s.w)if(nm(w[0]).startsWith(k)&&c++===n)return end?w[2]:w[1];MISS.push(id+'/'+i+'/'+word);return s.t0}
// ventanas de plano por grupos de frases
function win(id,groups,first){const s=SCN[id],o=[];groups.forEach((g,i)=>o.push([i?s.sent[g[0]].t0-.35:first,i<groups.length-1?s.sent[groups[i+1][0]].t0+.35:s.t1+.5]));return o}
// ---------- texto ----------
function T(s,x,y,f,c,al,a,ls,bl){X.font=f;X.fillStyle=c||C.white;X.textAlign=al||'left';X.textBaseline=bl||'alphabetic';if(ls)X.letterSpacing=ls+'px';A(a==null?1:a);X.fillText(s,x,y);if(ls)X.letterSpacing='0px'}
function wrap(s,mw,f){X.font=f;const o=[];let l='';for(const w of s.split(' ')){const q=l?l+' '+w:w;if(X.measureText(q).width>mw&&l){o.push(l);l=w}else l=q}if(l)o.push(l);return o}
function para(s,x,y,mw,f,lh,c,a,al){const L=wrap(s,mw,f);L.forEach((l,i)=>T(l,x,y+i*lh,f,c,al,a));return L.length}
// texto que se ilumina palabra a palabra con la narración (toks=[[palabra,t0,t1],...])
function ktext(toks,x,y,mw,f,lh,t,o={}){X.font=f;const sp=X.measureText(' ').width,lines=[[]];let lw=0;
 for(const w of toks){const ww=X.measureText(w[0]).width;if(lw+ww>mw&&lines[lines.length-1].length){lines.push([]);lw=0}lines[lines.length-1].push([w,ww]);lw+=ww+sp}
 lines.forEach((L,i)=>{const tw=L.reduce((s,q)=>s+q[1]+sp,-sp);let xx=o.center?x-tw/2:x;const yy=y+i*lh;
  for(const [w,ww] of L){const k=eo(pr(t,w[1]-.05,w[1]+.25)),key=o.keys&&o.keys.has(nm(w[0]));
   T(w[0],xx,yy,f,key&&k>0?(o.kc||C.sky):(o.c||C.white),'left',lr(o.a0==null?.22:o.a0,1,k));
   if(key){const u=eo(pr(t,w[1],w[1]+.5));if(u>0){A(u);X.fillStyle=o.kc||C.sky;X.fillRect(xx,yy+12,ww*u,3)}}xx+=ww+sp}});return lines.length}
// ---------- piezas gráficas ----------
const DC={};function dotc(c){if(!DC[c]){const v=document.createElement('canvas');v.width=v.height=64;const b=v.getContext('2d'),g=b.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,rgba(c,1));g.addColorStop(.3,rgba(c,.45));g.addColorStop(1,rgba(c,0));b.fillStyle=g;b.fillRect(0,0,64,64);DC[c]=v}return DC[c]}
function glow(x,y,r,a,c='#FFFFFF'){if(a<=0)return;A(a);X.drawImage(dotc(c),x-r,y-r,2*r,2*r)}
function gline(P,c,w,a=1){X.lineJoin='round';X.lineCap='round';X.strokeStyle=c;for(const [m,al] of [[6,.07],[3,.16],[1,1]]){A(a*al);X.lineWidth=w*m;X.beginPath();P.forEach((p,i)=>i?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1]));X.stroke()}}
function card(x,y,w,h,o={}){A(o.a==null?1:o.a);X.beginPath();X.roundRect(x,y,w,h,o.r||20);X.fillStyle=o.fill||'rgba(10,36,66,.80)';X.fill();
 const g=X.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(168,216,240,.13)');g.addColorStop(.45,'rgba(168,216,240,.02)');g.addColorStop(1,'rgba(168,216,240,0)');X.fillStyle=g;X.fill();
 X.lineWidth=1.5;X.strokeStyle=o.stroke||'rgba(168,216,240,.30)';X.stroke();if(o.accent){X.fillStyle=o.accent;X.beginPath();X.roundRect(x,y+22,5,h-44,3);X.fill()}}
function pill(x,y,s,o={}){const f=o.f||F(600,22),h=o.h||48;X.font=f;const w=X.measureText(s).width+(o.ic?h+34:48);A(o.a==null?1:o.a);X.beginPath();X.roundRect(x,y-h/2,w,h,h/2);X.fillStyle=o.fill||'rgba(31,111,178,.30)';X.fill();X.lineWidth=1.5;X.strokeStyle=o.stroke||'rgba(168,216,240,.5)';X.stroke();
 if(o.ic)ico(o.ic,x+h*.62,y,h*.5,o.ic_c||C.ice,2.4);T(s,x+(o.ic?h*1.05+8:24),y+1,f,o.c||C.white,'left',o.a==null?1:o.a,0,'middle');return w}
const ICO={
pill:()=>{X.rotate(-PI/4);X.roundRect(-20,-9,40,18,9);X.moveTo(0,-9);X.lineTo(0,9)},
dev:()=>{X.roundRect(-20,-16,40,28,4);X.moveTo(-14,-2);X.lineTo(-7,-2);X.lineTo(-4,-9);X.lineTo(0,5);X.lineTo(3,-2);X.lineTo(14,-2);X.moveTo(-8,19);X.lineTo(8,19);X.moveTo(0,12);X.lineTo(0,19)},
shield:()=>{X.moveTo(0,-20);X.lineTo(17,-13);X.lineTo(17,0);X.bezierCurveTo(17,11,9,18,0,22);X.bezierCurveTo(-9,18,-17,11,-17,0);X.lineTo(-17,-13);X.closePath();X.moveTo(-7,1);X.lineTo(-2,6);X.lineTo(8,-5)},
search:()=>{X.moveTo(8,-4);X.arc(-4,-4,12,0,TAU);X.moveTo(5,5);X.lineTo(16,16)},
doc:()=>{X.moveTo(-13,-19);X.lineTo(6,-19);X.lineTo(14,-11);X.lineTo(14,19);X.lineTo(-13,19);X.closePath();X.moveTo(-7,-6);X.lineTo(8,-6);X.moveTo(-7,2);X.lineTo(8,2);X.moveTo(-7,10);X.lineTo(3,10)},
chart:()=>{X.moveTo(-18,18);X.lineTo(18,18);X.moveTo(-12,13);X.lineTo(-12,4);X.moveTo(-3,13);X.lineTo(-3,-4);X.moveTo(6,13);X.lineTo(6,1);X.moveTo(15,13);X.lineTo(15,-13)},
warn:()=>{X.moveTo(0,-18);X.lineTo(19,16);X.lineTo(-19,16);X.closePath();X.moveTo(0,-6);X.lineTo(0,4);X.moveTo(0,10);X.lineTo(0,10.5)},
check:()=>{X.moveTo(-14,0);X.lineTo(-4,10);X.lineTo(15,-10)},
user:()=>{X.moveTo(8,-9);X.arc(0,-9,8,0,TAU);X.moveTo(-15,18);X.quadraticCurveTo(-15,3,0,3);X.quadraticCurveTo(15,3,15,18)},
users:()=>{X.moveTo(-2,-8);X.arc(-9,-8,7,0,TAU);X.moveTo(-21,16);X.quadraticCurveTo(-21,2,-9,2);X.quadraticCurveTo(3,2,3,16);X.moveTo(18,-10);X.arc(11,-10,7,0,TAU);X.moveTo(7,1);X.quadraticCurveTo(9,0,11,0);X.quadraticCurveTo(23,0,23,14)},
send:()=>{X.moveTo(-18,-1);X.lineTo(18,-15);X.lineTo(6,18);X.lineTo(1,4);X.closePath();X.moveTo(1,4);X.lineTo(18,-15)},
book:()=>{X.moveTo(0,-13);X.quadraticCurveTo(-10,-18,-19,-14);X.lineTo(-19,16);X.quadraticCurveTo(-10,12,0,17);X.quadraticCurveTo(10,12,19,16);X.lineTo(19,-14);X.quadraticCurveTo(10,-18,0,-13);X.lineTo(0,17)},
build:()=>{X.moveTo(-19,18);X.lineTo(19,18);X.moveTo(-17,-6);X.lineTo(0,-18);X.lineTo(17,-6);X.closePath();for(const x of[-11,-4,4,11]){X.moveTo(x,-1);X.lineTo(x,13)}},
hosp:()=>{X.roundRect(-18,-18,36,36,7);X.moveTo(0,-9);X.lineTo(0,9);X.moveTo(-9,0);X.lineTo(9,0)},
map:()=>{X.moveTo(-18,-12);X.lineTo(-6,-17);X.lineTo(6,-12);X.lineTo(18,-17);X.lineTo(18,13);X.lineTo(6,18);X.lineTo(-6,13);X.lineTo(-18,18);X.closePath();X.moveTo(-6,-17);X.lineTo(-6,13);X.moveTo(6,-12);X.lineTo(6,18)},
up:()=>{X.moveTo(-18,12);X.lineTo(-6,0);X.lineTo(2,8);X.lineTo(18,-8);X.moveTo(8,-8);X.lineTo(18,-8);X.lineTo(18,2)},
bell:()=>{X.moveTo(-14,10);X.quadraticCurveTo(-12,6,-12,-2);X.bezierCurveTo(-12,-16,12,-16,12,-2);X.quadraticCurveTo(12,6,14,10);X.closePath();X.moveTo(-4,15);X.quadraticCurveTo(0,19,4,15)}};
function ico(k,x,y,s,c,lw=3){X.save();X.translate(x,y);const q=s/48;X.scale(q,q);X.strokeStyle=c;X.lineWidth=lw/q;X.lineCap='round';X.lineJoin='round';X.beginPath();ICO[k]();X.stroke();X.restore()}
function node(x,y,r,ic,c,k,o={}){if(k<=0)return;k=cl(k);const s=eb(k);A(k);const g=X.createRadialGradient(x,y-r*.4,r*.1,x,y,r);g.addColorStop(0,'rgba(95,179,232,.38)');g.addColorStop(1,'rgba(8,32,62,.92)');X.fillStyle=g;X.beginPath();X.arc(x,y,r*s,0,TAU);X.fill();X.lineWidth=2;X.strokeStyle=c;X.stroke();if(o.glow){glow(x,y,r*2,.35*o.glow*k,c);A(k)}ico(ic,x,y,r*s,c,3)}
function person(x,yf,h,c,a){if(a<=0)return;A(a);X.fillStyle=c;const s=h/2.5;X.beginPath();X.arc(x,yf-h+s*.36,s*.36,0,TAU);X.fill();X.beginPath();X.roundRect(x-s*.5,yf-h+s*.8,s,s*1.02,[s*.4,s*.4,s*.12,s*.12]);X.fill();X.beginPath();X.roundRect(x-s*.43,yf-h+s*1.76,s*.38,s*.74,s*.15);X.roundRect(x+s*.05,yf-h+s*1.76,s*.38,s*.74,s*.15);X.fill()}
function arrowHead(x,y,ang,c){X.save();X.translate(x,y);X.rotate(ang);X.fillStyle=c;X.beginPath();X.moveTo(2,0);X.lineTo(-15,-9);X.lineTo(-15,9);X.closePath();X.fill();X.restore()}
function ecgY(u){const g=(m,s,a)=>a*Math.exp(-((u-m)**2)/(2*s*s));return -(g(.18,.025,.12)-g(.285,.008,.15)+g(.30,.010,1)-g(.318,.009,.3)+g(.55,.045,.28))}
const pleth=u=>(u<.16?Math.sin(u/.16*PI/2):Math.exp(-(u-.16)*3.6)+.16*Math.exp(-((u-.42)**2)/.0025))*1.7-.85;
function along(P,u){let L=0;const d=[];for(let i=1;i<P.length;i++){const l=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);d.push(l);L+=l}let r=cl(u)*L;for(let i=0;i<d.length;i++){if(r<=d[i]){const k=r/d[i];return[lr(P[i][0],P[i+1][0],k),lr(P[i][1],P[i+1][1],k)]}r-=d[i]}return P[P.length-1]}
// ---------- fondo, viñeta, subtítulos, capítulos ----------
const BGC=(()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const b=c.getContext('2d');const g=b.createRadialGradient(W*.56,H*.36,40,W*.5,H*.5,W*.78);g.addColorStop(0,'#0F3763');g.addColorStop(.5,'#082142');g.addColorStop(1,'#020A16');b.fillStyle=g;b.fillRect(0,0,W,H);b.strokeStyle='rgba(120,180,230,.04)';b.lineWidth=1;for(let x=0;x<=W;x+=64){b.beginPath();b.moveTo(x+.5,0);b.lineTo(x+.5,H);b.stroke()}for(let y=28;y<=H;y+=64){b.beginPath();b.moveTo(0,y+.5);b.lineTo(W,y+.5);b.stroke()}return c})();
const VG=(()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const b=c.getContext('2d');const g=b.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*1.08);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.6)');b.fillStyle=g;b.fillRect(0,0,W,H);return c})();
const PART=(()=>{const r=rng(7),o=[];for(let i=0;i<70;i++)o.push({x:r()*W,y:r()*H,z:.3+r()*.7,s:r()*TAU});return o})();
function bg(t){X.globalAlpha=1;X.drawImage(BGC,0,0);for(const p of PART){const y=((p.y-t*12*p.z)%H+H)%H,x=p.x+Math.sin(t*.2+p.s)*30*p.z;glow(x,y,4+10*p.z,.05+.14*p.z*(.6+.4*Math.sin(t*.7+p.s)),C.ice)}}
function subs(t){let c=null;for(const s of TL.subs){if(t>=s[0]&&t<s[1]){c=s;break}if(s[0]>t)break}if(!c)return;
 const k=Math.min(1,(t-c[0])/.15,(c[1]-t)/.15),L=c[2].split('\n');X.font=F(500,36);const lh=48,w=Math.max(...L.map(l=>X.measureText(l).width))+60,h=L.length*lh+24,y=H-58-h;
 X.globalAlpha=k*.8;X.fillStyle='#020B17';X.beginPath();X.roundRect(W/2-w/2,y,w,h,14);X.fill();X.globalAlpha=k;X.fillStyle=C.white;X.textAlign='center';X.textBaseline='middle';L.forEach((l,i)=>X.fillText(l,W/2,y+12+lh*(i+.5)))}
const CH={s2:['01','FARMACOVIGILANCIA'],s3:['02','TECNOVIGILANCIA'],s4:['03','DIFERENCIAS CLAVE'],s5:['04','LA OMS Y LA SEGURIDAD DEL PACIENTE'],s6:['05','APLICACIÓN EN COLOMBIA']};
function chapter(t){GA=1;for(const id in CH){const s=SCN[id];if(t<s.t0-.5||t>s.t1+.5)continue;const [n,ti]=CH[id];
 const k=fade(t,s.t0-.15,s.t0+2.35,.5);if(k>0)grp(k,()=>{const u=eo(pr(t,s.t0-.15,s.t0+1));glow(960,540,520,.35,C.blue);T(n,960,450,FD(200,150),C.sky,'center',.95,lr(30,8,u),'middle');A(.8);X.fillStyle=C.sky;X.fillRect(960-90*u,548,180*u,2);T(ti,960,630,FD(700,ti.length>20?54:68),C.white,'center',1,lr(18,6,u),'middle')});
 const b=Math.min(eo(pr(t,s.t0+2,s.t0+2.8)),1-pr(t,s.t1-.4,s.t1+.1));if(b>0){T(n+'   '+ti,96,86,F(600,19),C.ice,'left',b*.85,4);A(b*.5);X.fillStyle=C.sky;X.fillRect(96,100,60,2)}}}
function renderFrame(t){X.setTransform(1,0,0,1,0,0);X.globalCompositeOperation='source-over';X.letterSpacing='0px';X.setLineDash([]);GA=1;bg(t);
 for(const s of TL.scenes){const k=Math.min(s.t0>0?pr(t,s.t0-.45,s.t0+.45):1,1-pr(t,s.t1-.45,s.t1+.45));if(k>0){GA=k;X.save();window['S'+s.id.slice(1)](t,s);X.restore();GA=1}}
 X.globalAlpha=1;X.drawImage(VG,0,0);chapter(t);subs(t);
 const f=Math.max(pr(t,TL.dur-1.2,TL.dur),1-pr(t,0,.5));if(f>0){X.globalAlpha=f;X.fillStyle='#000';X.fillRect(0,0,W,H)}X.globalAlpha=1}
