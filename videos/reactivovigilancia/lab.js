'use strict';
// Recursos de laboratorio clínico (genéricos, sin marcas)
const CAP={lila:'#9B7BD4',rojo:'#C8403A',oro:'#E0B23C',celeste:'#6FB7E8',gris:'#9AA6B2',verde:'#3FA66B'};
function shade(h,f){const n=parseInt(h.slice(1),16),c=v=>Math.max(0,Math.min(255,Math.round(v*f)));return`rgb(${c(n>>16)},${c(n>>8&255)},${c(n&255)})`}
Object.assign(ICO,{
box:()=>{X.moveTo(-18,-8);X.lineTo(0,-17);X.lineTo(18,-8);X.lineTo(18,12);X.lineTo(0,21);X.lineTo(-18,12);X.closePath();X.moveTo(-18,-8);X.lineTo(0,1);X.lineTo(18,-8);X.moveTo(0,1);X.lineTo(0,21)},
truck:()=>{X.roundRect(-20,-10,24,20,2);X.moveTo(4,-4);X.lineTo(13,-4);X.lineTo(20,3);X.lineTo(20,10);X.lineTo(4,10);X.moveTo(-6,16);X.arc(-10,16,4,0,TAU);X.moveTo(16,16);X.arc(12,16,4,0,TAU)},
flask:()=>{X.moveTo(-6,-18);X.lineTo(6,-18);X.moveTo(-4,-18);X.lineTo(-4,-6);X.lineTo(-16,16);X.lineTo(16,16);X.lineTo(4,-6);X.lineTo(4,-18);X.moveTo(-10,6);X.lineTo(10,6)},
thermo:()=>{X.roundRect(-4,-18,8,26,4);X.moveTo(7,14);X.arc(0,14,7,0,TAU);X.moveTo(10,-12);X.lineTo(15,-12);X.moveTo(10,-5);X.lineTo(15,-5)},
tube:()=>{X.roundRect(-6,-14,12,32,[2,2,6,6]);X.moveTo(-9,-18);X.lineTo(9,-18);X.lineTo(9,-14);X.lineTo(-9,-14);X.closePath()},
stop:()=>{X.moveTo(18,0);X.arc(0,0,18,0,TAU);X.moveTo(-13,-13);X.lineTo(13,13)},
tag:()=>{X.moveTo(-18,-10);X.lineTo(10,-10);X.lineTo(19,0);X.lineTo(10,10);X.lineTo(-18,10);X.closePath();X.moveTo(-8,0);X.arc(-10,0,2,0,TAU)},
loop:()=>{X.moveTo(16*Math.cos(-.3),16*Math.sin(-.3));X.arc(0,0,16,-.3,PI*1.55);X.moveTo(9,-19);X.lineTo(14,-7);X.lineTo(2,-6)},
micro:()=>{X.moveTo(-16,19);X.lineTo(16,19);X.moveTo(-2,19);X.lineTo(-2,12);X.moveTo(-12,8);X.lineTo(10,8);X.moveTo(10,12);X.quadraticCurveTo(20,-2,4,-14);X.moveTo(-6,-2);X.lineTo(4,-20);X.moveTo(-10,-6);X.lineTo(-2,0)},
drop:()=>{X.moveTo(0,-18);X.bezierCurveTo(10,-4,14,2,14,8);X.bezierCurveTo(14,20,-14,20,-14,8);X.bezierCurveTo(-14,2,-10,-4,0,-18)}});
// tubo de muestra: x,y = esquina superior del vidrio; kind: blood | serum
function tube(x,y,h,cap,kind,a=1){const w=h*.19,r=w/2;A(.9*a);X.fillStyle='rgba(220,236,248,.16)';X.beginPath();X.roundRect(x,y,w,h,[2,2,r,r]);X.fill();
 X.save();X.beginPath();X.roundRect(x+2,y,w-4,h-2,[0,0,r-2,r-2]);X.clip();A(a);
 if(kind==='blood'){const g=X.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#5A0E12');g.addColorStop(.5,'#8E1B22');g.addColorStop(1,'#4A0A0E');X.fillStyle=g;X.fillRect(x,y+h*.3,w,h)}
 else{X.fillStyle='#7A1218';X.fillRect(x,y+h*.62,w,h);X.fillStyle='#E9E4D0';X.fillRect(x,y+h*.57,w,h*.05);const g=X.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#E2B850');g.addColorStop(.5,'#F6D982');g.addColorStop(1,'#D3A640');X.fillStyle=g;X.fillRect(x,y+h*.32,w,h*.25)}
 X.restore();A(.95*a);X.fillStyle='#F4F7FA';X.fillRect(x+1,y+h*.1,w-2,h*.34);X.fillStyle='#2B3A4A';for(let i=0;i<10;i++)X.fillRect(x+4+i*(w-8)/10,y+h*.14,(i*7%3)*.6+.8,h*.18);
 A(.45*a);X.fillStyle='#FFFFFF';X.fillRect(x+w*.16,y+h*.05,w*.09,h*.88);A(a);X.strokeStyle='rgba(255,255,255,.55)';X.lineWidth=1.2;X.beginPath();X.roundRect(x,y,w,h,[2,2,r,r]);X.stroke();
 const ch=h*.18,g=X.createLinearGradient(x,0,x+w,0);g.addColorStop(0,shade(cap,.7));g.addColorStop(.4,shade(cap,1.2));g.addColorStop(1,shade(cap,.6));X.fillStyle=g;X.beginPath();X.roundRect(x-w*.08,y-ch,w*1.16,ch+3,[w*.25,w*.25,2,2]);X.fill();
 A(.25*a);X.fillStyle='#000';for(let i=1;i<5;i++)X.fillRect(x-w*.08+i*w*1.16/5,y-ch+3,1.2,ch-4)}
const TUBES=[['lila','blood'],['oro','serum'],['celeste','serum'],['gris','serum'],['rojo','serum'],['verde','blood']];
// analizador automatizado con carrusel de reactivos
function analyzer(x,y,s,t,o={}){X.save();X.translate(x,y);X.scale(s,s);A(1);let g=X.createLinearGradient(0,0,0,560);g.addColorStop(0,'#F2F5F8');g.addColorStop(1,'#C5D0DB');X.fillStyle=g;X.beginPath();X.roundRect(0,0,900,560,28);X.fill();X.strokeStyle='rgba(255,255,255,.8)';X.lineWidth=2;X.stroke();
 X.fillStyle='#1F6FB2';X.fillRect(0,96,900,6);T('ANALIZADOR AUTOMATIZADO',40,64,F(700,20),'#3E5368','left',1,3);X.fillStyle=o.alarm&&Math.floor(t*3)%2?'#FF5A48':'#3CC59A';X.beginPath();X.arc(860,58,9,0,TAU);X.fill();
 X.fillStyle='#0B1828';X.beginPath();X.roundRect(40,130,500,300,18);X.fill();X.save();X.beginPath();X.roundRect(40,130,500,300,18);X.clip();
 const cx=290,cy=280,R=112,rot=t*.35;X.fillStyle='#16283C';X.beginPath();X.arc(cx,cy,R+28,0,TAU);X.fill();
 for(let i=0;i<18;i++){const a=rot+i*TAU/18;X.save();X.translate(cx+Math.cos(a)*R,cy+Math.sin(a)*R);X.rotate(a+PI/2);X.fillStyle=i%3?'#E9EEF3':'#BFE3F7';X.fillRect(-9,-16,18,32);X.fillStyle=['#1F6FB2','#3CC59A','#FFB547'][i%3];X.fillRect(-9,-16,18,7);X.restore()}
 X.fillStyle='#22384F';X.beginPath();X.arc(cx,cy,58,0,TAU);X.fill();const pa=Math.sin(t*1.3)*.5;X.strokeStyle='#C9D3DD';X.lineWidth=10;X.lineCap='round';X.beginPath();X.moveTo(500,160);X.lineTo(500-Math.cos(pa)*170,160+Math.sin(pa)*50+20);X.stroke();X.lineCap='butt';
 g=X.createLinearGradient(40,130,540,430);g.addColorStop(0,'rgba(255,255,255,.12)');g.addColorStop(.5,'rgba(255,255,255,0)');X.fillStyle=g;X.fillRect(40,130,500,300);X.restore();
 X.fillStyle='#06111D';X.beginPath();X.roundRect(580,130,280,300,12);X.fill();T('ESTADO',600,162,F(700,14),'#9FB3C8','left',1,2);T(o.alarm?'Detenido':'En proceso',600,192,F(600,21),o.alarm?'#FF8A78':'#7BE0B8');
 X.fillStyle='#1B2C3E';X.fillRect(600,210,240,10);X.fillStyle='#3CC59A';X.fillRect(600,210,240*(o.alarm?.62:(t*.12)%1),10);T('Control de calidad',600,256,F(500,15),'#9FB3C8');T(o.alarm?'✕ Fuera de control':'✓ Aceptado',600,282,F(700,18),o.alarm?'#FF8A78':'#7BE0B8');
 T('Reactivos cargados',600,326,F(500,15),'#9FB3C8');for(let i=0;i<6;i++){X.fillStyle=i===o.bad?'#FF8A78':'#3CC59A';X.fillRect(600+i*40,338,32,8)}T('Muestras en cola',600,382,F(500,15),'#9FB3C8');T('24',840,382,F(700,16),'#E8EEF4','right');
 X.fillStyle='#AEBBC8';X.fillRect(40,486,820,14);for(let i=0;i<8;i++){const xi=60+((t*40+i*110)%880);if(xi<840){const k=TUBES[i%6];tube(xi,412,70,CAP[k[0]],k[1])}}X.restore()}
// frasco de reactivo con etiqueta (lote, vencimiento, símbolo IVD)
function reagent(x,y,s,o){X.save();X.translate(x,y);X.scale(s,s);A(o.a==null?1:o.a);const col=o.col||'#1F6FB2';X.fillStyle=col;X.beginPath();X.roundRect(-34,-150,68,44,8);X.fill();X.fillStyle='#DDE6EE';X.fillRect(-26,-108,52,16);
 const g=X.createLinearGradient(-70,0,70,0);g.addColorStop(0,'#C9D6E2');g.addColorStop(.35,'#F6F9FB');g.addColorStop(1,'#B9C7D4');X.fillStyle=g;X.beginPath();X.roundRect(-70,-94,140,200,18);X.fill();
 X.fillStyle='#FFFFFF';X.fillRect(-60,-62,120,128);X.fillStyle=col;X.fillRect(-60,-62,120,24);T(o.name,0,-45,F(800,o.name.length>9?11:14),'#FFFFFF','center');
 T('LOT',-52,-14,F(700,11),'#3E5368');T(o.lot||'24A118',52,-14,F(600,11),'#1B2B3B','right');T('EXP',-52,8,F(700,11),'#3E5368');T(o.exp||'2026-09',52,8,F(600,11),'#1B2B3B','right');
 X.strokeStyle='#1B2B3B';X.lineWidth=1.5;X.strokeRect(-52,24,34,18);T('IVD',-35,37,F(800,11),'#1B2B3B','center');T('2–8 °C',52,37,F(600,11),'#1B2B3B','right');X.restore()}
// nevera de reactivos con control de temperatura
function fridge(x,y,s,t,o={}){X.save();X.translate(x,y);X.scale(s,s);A(1);X.fillStyle='#E7EDF2';X.beginPath();X.roundRect(0,0,520,720,20);X.fill();X.strokeStyle='rgba(255,255,255,.8)';X.lineWidth=2;X.stroke();
 X.fillStyle='#0A1726';X.beginPath();X.roundRect(30,22,200,58,10);X.fill();T((o.temp||'4,0')+' °C',130,63,FD(700,30),o.alarm?'#FF8A78':'#7BE0B8','center');T('Rango: 2–8 °C',252,58,F(600,17),'#3E5368');
 X.fillStyle='#0E2236';X.beginPath();X.roundRect(30,100,460,590,14);X.fill();const cols=['#1F6FB2','#3CC59A','#FFB547','#5FB3E8','#9B7BD4'];
 for(let i=0;i<4;i++){const y0=100+i*146;X.fillStyle='rgba(168,216,240,.35)';X.fillRect(40,y0+132,440,4);for(let j=0;j<5;j++){const bx=52+j*86;X.fillStyle='#DCE5EC';X.fillRect(bx,y0+62,72,70);X.fillStyle=cols[(i+j)%5];X.fillRect(bx,y0+62,72,14);X.fillStyle='#9AAAB9';X.fillRect(bx+8,y0+90,40,4);X.fillRect(bx+8,y0+102,28,4)}}
 const g=X.createLinearGradient(30,100,490,690);g.addColorStop(0,'rgba(255,255,255,.16)');g.addColorStop(.4,'rgba(255,255,255,0)');g.addColorStop(.6,'rgba(255,255,255,.06)');g.addColorStop(1,'rgba(255,255,255,0)');X.fillStyle=g;X.fillRect(30,100,460,590);X.fillStyle='#AEBBC8';X.beginPath();X.roundRect(500,260,10,200,5);X.fill();X.restore()}
// espectrofotometría: fuente, haz, cubeta y detector (k: desarrollo de color 0..1)
function spectro(x,y,s,t,k,col){X.save();X.translate(x,y);X.scale(s,s);card(-420,-70,170,140,{r:16});T('Fuente de luz',-335,105,F(500,18),C.ice,'center',.85);glow(-250,0,46,.9);
 const g=X.createLinearGradient(-250,0,250,0);g.addColorStop(0,'rgba(255,255,255,.85)');g.addColorStop(.47,'rgba(255,255,255,.7)');g.addColorStop(.53,rgba(col,.55-.35*k));g.addColorStop(1,rgba(col,.4-.3*k));A(1);X.fillStyle=g;X.fillRect(-250,-9,500,18);
 X.fillStyle=rgba(col,.12+.7*k);X.fillRect(-32,-80,64,140);X.strokeStyle='rgba(255,255,255,.75)';X.lineWidth=2;X.strokeRect(-36,-104,72,168);T('Cubeta',0,100,F(500,18),C.ice,'center',.85);
 card(250,-70,170,140,{r:16});T('Absorbancia',335,-24,F(500,16),C.ice,'center',.85);T((k*.842).toFixed(3),335,26,FD(700,36),C.mint,'center');T('Detector',335,105,F(500,18),C.ice,'center',.85);X.restore()}
function microscope(x,y,s){X.save();X.translate(x,y);X.scale(s,s);A(1);const g=X.createLinearGradient(-120,0,120,0);g.addColorStop(0,'#CBD5DF');g.addColorStop(.4,'#F3F6F9');g.addColorStop(1,'#B7C4D1');X.fillStyle=g;
 X.beginPath();X.roundRect(-130,150,260,40,16);X.fill();X.beginPath();X.moveTo(40,152);X.bezierCurveTo(118,96,124,-64,36,-128);X.lineTo(6,-106);X.bezierCurveTo(72,-52,74,86,0,152);X.closePath();X.fill();
 X.fillStyle='#2B3A4A';X.fillRect(-96,38,160,14);X.fillStyle='#E9EEF3';X.save();X.translate(10,-118);X.rotate(-.45);X.fillRect(-17,-118,34,130);X.fillStyle='#1B2B3B';X.fillRect(-19,-130,38,16);X.restore();
 X.fillStyle='#AEBBC8';X.fillRect(-26,-34,20,56);X.fillRect(-2,-30,14,46);X.fillStyle='#8E9DAC';X.beginPath();X.arc(72,62,22,0,TAU);X.fill();glow(-16,96,36,.85);X.restore()}
function antibody(x,y,s,ang,c){X.save();X.translate(x,y);X.rotate(ang);X.scale(s,s);X.lineCap='round';X.strokeStyle=c;X.lineWidth=11;X.beginPath();X.moveTo(0,44);X.lineTo(0,0);X.lineTo(-26,-32);X.moveTo(0,0);X.lineTo(26,-32);X.stroke();
 X.strokeStyle='rgba(255,255,255,.55)';X.lineWidth=5;X.beginPath();X.moveTo(-9,-7);X.lineTo(-33,-37);X.moveTo(9,-7);X.lineTo(33,-37);X.stroke();X.restore()}
function antigen(x,y,r,c){A(1);X.fillStyle=c;X.beginPath();for(let i=0;i<16;i++){const a=i/16*TAU,rr=i%2?r:r*1.28;i?X.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):X.moveTo(x+rr,y)}X.closePath();X.fill()}
function rbc(x,y,r,a){const g=X.createRadialGradient(x,y,r*.1,x,y,r);g.addColorStop(0,'#7A1218');g.addColorStop(.45,'#B3262D');g.addColorStop(.82,'#D23E44');g.addColorStop(1,'#8E1B22');A(a);X.fillStyle=g;X.beginPath();X.arc(x,y,r,0,TAU);X.fill()}
function petri(x,y,r,k){A(1);X.fillStyle='rgba(240,214,140,.22)';X.beginPath();X.arc(x,y,r,0,TAU);X.fill();X.strokeStyle='rgba(255,255,255,.6)';X.lineWidth=2;X.stroke();X.beginPath();X.arc(x,y,r-8,0,TAU);X.stroke();
 const q=rng(3);X.fillStyle='rgba(248,238,212,.92)';for(let i=0;i<22;i++){const a=q()*TAU,d=Math.sqrt(q())*(r-24),cr=(3+q()*7)*eo(cl(k*1.4-q()*.4));if(cr>0){X.beginPath();X.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,cr,0,TAU);X.fill()}}}
// gráfica de Levey-Jennings (valores en desviaciones estándar)
function levey(x,y,w,h,vals,n,o={}){const yv=v=>y+h/2-v*h/7;X.lineWidth=1.5;
 [[0,C.mint,[],'x̄'],[1,C.gray,[3,6],'+1s'],[-1,C.gray,[3,6],'−1s'],[2,C.amber,[8,6],'+2s'],[-2,C.amber,[8,6],'−2s'],[3,C.red,[10,5],'+3s'],[-3,C.red,[10,5],'−3s']].forEach(([v,c,d,l])=>{A(.75);X.strokeStyle=c;X.setLineDash(d);X.beginPath();X.moveTo(x,yv(v));X.lineTo(x+w,yv(v));X.stroke();T(l,x-12,yv(v)+6,F(600,16),c,'right',.9)});X.setLineDash([]);
 const m=Math.min(vals.length,Math.floor(n)),px=i=>x+30+i*(w-60)/(vals.length-1);A(1);X.strokeStyle=C.ice;X.lineWidth=2;X.beginPath();for(let i=0;i<m;i++)i?X.lineTo(px(i),yv(vals[i])):X.moveTo(px(i),yv(vals[i]));X.stroke();
 for(let i=0;i<m;i++){const bad=Math.abs(vals[i])>3;A(1);X.fillStyle=bad?C.red:'#FFFFFF';X.beginPath();X.arc(px(i),yv(vals[i]),bad?8:5,0,TAU);X.fill();if(bad&&o.t!=null){const pu=(o.t*1.2)%1;A(1-pu);X.strokeStyle=C.red;X.lineWidth=2.5;X.beginPath();X.arc(px(i),yv(vals[i]),12+pu*26,0,TAU);X.stroke()}}}
