'use strict';
// Escena 2: farmacovigilancia
const FORM=[['Paciente','Mujer, 58 años'],['Medicamento sospechoso','Amoxicilina 500 mg, vía oral'],['Reacción observada','Erupción cutánea generalizada'],['Inicio de la reacción','Día 3 del tratamiento']];
const PR=(()=>{const r=rng(11);return Array.from({length:260},()=>r())})(),RARE=[29,61,98,137,170,214];
function s2A(t,q){card(110,180,900,520);T('DEFINICIÓN · ORGANIZACIÓN MUNDIAL DE LA SALUD',150,240,F(600,19),C.sky,'left',1,3);
 ktext(q.quote,150,318,820,F(400,36),54,t,{keys:q.keys,kc:C.sky});T('Fuente: OMS, The Importance of Pharmacovigilance (2002).',150,668,F(400,19),C.gray);
 q.chips.forEach((c,i)=>{const k=eo(pr(t,q.tProb+i*.22,q.tProb+i*.22+.45));if(k>0)grp(k,()=>{X.translate(0,(1-k)*16);pill(c[1],c[2],c[0],{f:F(600,21),h:46})})});
 body(1440,500,.95,t,pr(t,q.ad0,q.ad1))}
function s2B(t,q){globe(1250,480,350,-42+(t-q.B0)*2.2,20,t,q.t1968,q.tUpp);
 const it=[['1961','La tragedia de la talidomida evidencia la necesidad de vigilar los medicamentos.',q.tTal],['1968','La OMS crea el Programa Internacional de Vigilancia de Medicamentos.',q.t1968],['HOY','El Centro de Monitoreo de Uppsala (UMC) gestiona VigiBase, la base mundial de notificaciones.',q.tUpp]];
 A(.35);X.strokeStyle=C.ice;X.lineWidth=2;X.beginPath();X.moveTo(142,250);X.lineTo(142,250+450*eo(pr(t,q.B0+.3,q.tUpp+.5)));X.stroke();
 it.forEach(([y0,tx,tm],i)=>{const k=eo(pr(t,tm-.2,tm+.5)),y=250+i*225,c=i==2?C.mint:C.sky;if(k>0)grp(k,()=>{X.translate((1-k)*-20,0);A(1);X.fillStyle=c;X.beginPath();X.arc(142,y,9,0,TAU);X.fill();glow(142,y,30,.6,c);T(y0,180,y+18,FD(800,58),c);para(tx,180,y+62,470,F(400,26),36,C.white,.9)})})}
function s2C(t,q){card(110,200,660,600);T('ENSAYOS CLÍNICOS',150,262,F(700,24),C.sky,'left',1,4);T('Grupos limitados · tiempo acotado',150,298,F(400,22),C.ice,'left',.85);
 for(let j=0;j<5;j++)for(let i=0;i<7;i++){const id=i+j*7,k=eo(pr(t,q.C0+.3+id*.015,q.C0+.8+id*.015));if(k>0)person(200+i*80,420+j*80,62,C.sky,k)}
 grp(eo(pr(t,q.tPob-.3,q.tPob+.4)),()=>{card(840,200,970,600);T('USO EN LA POBLACIÓN GENERAL',880,262,F(700,24),C.sky,'left',1,4);T('Gran número de pacientes · uso prolongado',880,298,F(400,22),C.ice,'left',.85)});
 X.strokeStyle=C.amber;X.lineWidth=2;
 for(let j=0;j<10;j++)for(let i=0;i<26;i++){const id=i+j*26,k=eo(pr(t,q.tPob-.2+PR[id]*1.2,q.tPob+.2+PR[id]*1.2));if(k<=0)continue;const ri=RARE.indexOf(id),tr=ri>=0?q.tRare+ri*.42:1e9,on=t>tr,x=885+i*36,y=390+j*44;
  if(on){const pu=((t-tr)*.7)%1;A(.7*(1-pu));X.beginPath();X.arc(x,y-14,12+pu*22,0,TAU);X.stroke()}person(x,y,30,on?C.amber:'rgba(168,216,240,.6)',k)}
 const kr=eo(pr(t,q.tRare-.2,q.tRare+.5));if(kr>0)grp(kr,()=>pill(1404,262,'Reacciones raras o tardías',{ic:'warn',ic_c:C.amber,fill:'rgba(255,181,71,.14)',stroke:'rgba(255,181,71,.6)',f:F(600,21),h:46}))}
function s2D(t,q){const x0=500,y0=150,w=920,h=720;card(x0,y0,w,h);A(1);ico('doc',x0+56,y0+58,36,C.ice,2.6);T('Reporte de sospecha de reacción adversa',x0+92,y0+68,F(700,30),C.white);
 A(1);ico('user',x0+58,y0+112,22,C.mint,2.2);T('Notificante: profesional de la salud',x0+80,y0+119,F(500,20),C.mint,'left',.9);
 FORM.forEach((f,i)=>{const y=y0+172+i*92,[st,dt]=q.ft[i],n=cl(Math.floor((t-st)/dt),0,f[1].length);T(f[0],x0+44,y,F(500,19),C.ice,'left',.85);
  A(1);X.fillStyle='rgba(255,255,255,.06)';X.beginPath();X.roundRect(x0+44,y+12,w-88,52,10);X.fill();X.strokeStyle=n>0&&n<f[1].length?C.sky:'rgba(168,216,240,.3)';X.lineWidth=1.5;X.stroke();
  const s=f[1].slice(0,n);T(s,x0+62,y+47,F(500,25),C.white);if(n<f[1].length&&t>st-.3&&Math.floor(t*2.2)%2===0){X.font=F(500,25);A(1);X.fillStyle=C.sky;X.fillRect(x0+64+X.measureText(s).width,y+24,2.5,30)}});
 const ys=y0+172+4*92;T('Gravedad',x0+44,ys,F(500,19),C.ice,'left',.85);
 ['Leve','Moderada','Grave'].forEach((g,i)=>{const sel=i===1&&t>q.sev,bx=x0+44+i*200;A(1);X.fillStyle=sel?'rgba(95,179,232,.35)':'rgba(255,255,255,.05)';X.beginPath();X.roundRect(bx,ys+12,186,48,24);X.fill();X.strokeStyle=sel?C.sky:'rgba(168,216,240,.3)';X.stroke();T(g,bx+93,ys+43,F(600,20),C.white,'center',sel?1:.7)});
 const kb=pr(t,q.tBtn,q.tBtn+.25),sent=t>q.tBtn+.25,bs=1-.06*Math.sin(PI*kb);X.save();X.translate(x0+w-162,y0+h-64);X.scale(bs,bs);A(1);X.fillStyle=sent?C.green:'#2F8F6A';X.beginPath();X.roundRect(-118,-32,236,64,32);X.fill();if(kb>0&&kb<1)glow(0,0,140,.5,C.mint);
 T(sent?'Enviado ✓':'Notificar',0,8,F(700,24),'#FFFFFF','center');X.restore();
 const kc=eo(pr(t,q.tBas-.2,q.tBas+.5));if(kc>0)grp(kc,()=>pill(x0+44,y0+h-64,'No se necesita certeza: basta con la sospecha',{ic:'check',ic_c:C.mint,fill:'rgba(60,197,154,.16)',stroke:'rgba(123,224,184,.7)',f:F(600,21),h:50}))}
function s2E(t,q){card(150,190,1060,610);T('DETECCIÓN DE SEÑALES',190,250,F(700,24),C.sky,'left',1,4);T('Representación esquemática',190,284,F(400,20),C.gray);
 const x0=230,y0=720,w=900,h=380,n=18,bw=w/n,V=[.10,.12,.11,.14,.13,.15,.14,.17,.18,.2,.24,.3,.38,.47,.55,.62,.7,.78],k=pr(t,q.E0+.3,q.tSen+.6);
 A(.6);X.strokeStyle=C.ice;X.lineWidth=1.5;X.beginPath();X.moveTo(x0,y0-h);X.lineTo(x0,y0);X.lineTo(x0+w,y0);X.stroke();T('Tiempo',x0+w,y0+34,F(500,18),C.ice,'right',.8);T('Notificaciones',x0+12,y0-h-14,F(500,18),C.ice,'left',.8);
 for(let i=0;i<n;i++){const ki=eo(cl(k*n-i));if(ki<=0)continue;const v=V[i]*h*ki;A(1);X.fillStyle=V[i]>.3&&t>q.tSen?C.amber:'rgba(95,179,232,.75)';X.beginPath();X.roundRect(x0+i*bw+6,y0-v,bw-12,v,[4,4,0,0]);X.fill()}
 const kt=eo(pr(t,q.E0+.5,q.E0+1.3));A(.9*kt);X.setLineDash([10,8]);X.strokeStyle=C.mint;X.lineWidth=2;X.beginPath();X.moveTo(x0,y0-.3*h);X.lineTo(x0+w,y0-.3*h);X.stroke();X.setLineDash([]);T('Umbral de referencia',x0+10,y0-.3*h-12,F(500,18),C.mint,'left',kt);
 const ks=eo(pr(t,q.tSen,q.tSen+.5));if(ks>0){const sx=x0+13.5*bw,sy=y0-.47*h,pu=(t*1.2)%1;A(ks*(1-pu));X.strokeStyle=C.amber;X.lineWidth=3;X.beginPath();X.arc(sx,sy,30+pu*50,0,TAU);X.stroke();grp(ks,()=>pill(sx-70,sy-100,'SEÑAL',{ic:'warn',ic_c:C.amber,fill:'rgba(255,181,71,.18)',stroke:'rgba(255,181,71,.7)',f:F(700,22)}))}
 [['search','Identificar señales de riesgo',q.tId],['shield','Fortalecer el uso seguro de los medicamentos',q.tFo],['check','Decisiones sanitarias oportunas',q.tDe]].forEach((o,i)=>{const k=eo(pr(t,o[2]-.2,o[2]+.4));if(k<=0)return;
  grp(k,()=>{X.translate((1-k)*30,0);card(1290,220+i*190,520,160);node(1370,300+i*190,46,o[0],i==2?C.mint:C.ice,1);const L=wrap(o[1],340,F(600,28)),yy=310+i*190-(L.length-1)*18;L.forEach((l,j)=>T(l,1440,yy+j*36,F(600,28),C.white))})})}
function S2(t){const q=Q.s2;grp(fade(t,q.A0,q.A1),()=>s2A(t,q));grp(fade(t,q.B0,q.B1),()=>s2B(t,q));grp(fade(t,q.C0,q.C1),()=>s2C(t,q));grp(fade(t,q.D0,q.D1),()=>s2D(t,q));grp(fade(t,q.E0,q.E1),()=>s2E(t,q))}
