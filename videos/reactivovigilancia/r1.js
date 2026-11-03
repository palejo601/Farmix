'use strict';
// Escena 1: introducción · Escena 2: ¿qué es la reactivovigilancia?
function s1Tubes(t,q){const lt=t-q.tub0;glow(960,560,760,.4,C.blue);
 for(let i=0;i<11;i++){const k=TUBES[(i+3)%6];tube(40+i*185-lt*9,360,250,CAP[k[0]],k[1],.3)}
 const x0=200-lt*20;A(1);X.fillStyle='#C9D3DD';X.beginPath();X.roundRect(x0-80,772,1560,40,10);X.fill();X.fillStyle='#AEBBC8';X.fillRect(x0-80,802,1560,10);
 for(let i=0;i<8;i++){const k=TUBES[i%6];tube(x0+i*185,356,420,CAP[k[0]],k[1])}
 const sx=(lt*300)%2800-400,g=X.createLinearGradient(sx-220,0,sx+220,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.09)');g.addColorStop(1,'rgba(255,255,255,0)');A(1);X.fillStyle=g;X.fillRect(0,0,W,H)}
function s1Lab(t,q){const lt=t-q.lab0,s=1.22+lt*.006;analyzer(960-450*s,180,s,t,{});
 grp(eo(pr(t,q.tPro-.2,q.tPro+.4)),()=>pill(1200,128,'Proceso analítico',{ic:'flask',f:F(600,22)}));
 grp(eo(pr(t,q.tRea-.2,q.tRea+.4)),()=>pill(430,128,'Reactivos de diagnóstico',{ic:'tube',ic_c:C.mint,f:F(600,22)}))}
function s1Store(t,q){fridge(150,150,.98,t,{});[['GLUCOSA','#1F6FB2'],['HEMOGLOBINA','#C8403A'],['PCR','#3CC59A']].forEach((r,i)=>reagent(860+i*230,520+Math.sin(t*.8+i)*6,1.35,{name:r[0],col:r[1],lot:['24A118','23K402','24B077'][i]}));
 [['Seguridad','shield',q.w3[0]],['Calidad','check',q.w3[1]],['Desempeño','chart',q.w3[2]]].forEach((p,i)=>{const k=eo(pr(t,p[2]-.2,p[2]+.4));if(k>0)grp(k,()=>{X.translate(0,(1-k)*16);pill(760+i*330,800,p[0],{ic:p[1],ic_c:C.mint,f:F(600,26),h:58,fill:'rgba(60,197,154,.16)',stroke:'rgba(123,224,184,.6)'})})})}
function s1Title(t,q){const kb=eo(pr(t,q.tR-.5,q.tR+1));glow(960,480,760,.38*kb,C.blue);
 const P=[];for(let x=0;x<=W*kb;x+=6)P.push([x,880+6*Math.sin(x/40+t*3)]);if(P.length>1)gline(P,C.sky,1.6,.5);
 for(let i=0;i<14;i++){const a=i/14*TAU+t*.05,r=420+60*Math.sin(i*1.7);glow(960+Math.cos(a)*r*1.6,500+Math.sin(a)*r*.7,6,.5*kb,C.ice)}
 T('LA CALIDAD DEL DIAGNÓSTICO COMIENZA CON LA SEGURIDAD DE LOS REACTIVOS',960,300,F(600,19),C.sky,'center',eo(pr(t,q.tR-.3,q.tR+.6))*.9,5);
 const k1=eo(pr(t,q.tR-.08,q.tR+1.1)),gr=X.createLinearGradient(0,380,0,480);gr.addColorStop(0,'#FFFFFF');gr.addColorStop(1,'#BFE3F7');T('REACTIVOVIGILANCIA',960,lr(480,462,k1),FD(800,132),gr,'center',k1,lr(26,4,k1));
 const k3=eo(pr(t,q.end+.1,q.end+1)),k4=eo(pr(t,q.end+.6,q.end+1.6)),w=560*k3,lg=X.createLinearGradient(680,0,1240,0);lg.addColorStop(0,'rgba(95,179,232,0)');lg.addColorStop(.5,C.sky);lg.addColorStop(1,'rgba(95,179,232,0)');A(k3*.8);X.fillStyle=lg;X.fillRect(960-w/2,520,w,2);
 T('GARANTIZANDO LA CALIDAD Y SEGURIDAD DEL DIAGNÓSTICO CLÍNICO',960,590,FD(600,36),C.ice,'center',k3,4);
 T('Identificación, evaluación y prevención de riesgos asociados a los reactivos de diagnóstico in vitro',960,648,F(400,27),C.white,'center',k4*.8)}
function S1(t,s){const q=Q.s1;
 grp(fade(t,-1,q.tub0+1,.9),()=>{A(1);X.fillStyle='#010710';X.fillRect(0,0,W,H);const k=eo(pr(t,.3,2.4));A(1);const g=X.createLinearGradient(960-900*k,0,960+900*k,0);g.addColorStop(0,'rgba(95,179,232,0)');g.addColorStop(.5,'rgba(220,240,255,.95)');g.addColorStop(1,'rgba(95,179,232,0)');X.fillStyle=g;X.fillRect(0,537,W,6);glow(960,540,120+160*k,.8*k)});
 grp(fade(t,q.tub0,q.lab0+.7,.9),()=>s1Tubes(t,q));grp(fade(t,q.lab0,q.sto0+.6,.7),()=>s1Lab(t,q));grp(fade(t,q.sto0,q.tit0+.6,.6),()=>s1Store(t,q));grp(fade(t,q.tit0,s.t1+.45,.6),()=>s1Title(t,q))}
// ---------- escena 2 ----------
function s2A(t,q){card(110,190,980,520);T('DEFINICIÓN',150,250,F(600,19),C.sky,'left',1,4);ktext(SCN.s2.sent[0].w,150,330,900,F(400,38),56,t,{keys:q.keys,kc:C.mint});
 const lt=t-q.A0;reagent(1480,560,2.1,{name:'GLUCOSA',col:'#1F6FB2'});const mx=1480+Math.sin(lt*.8)*60,my=560+Math.cos(lt*.6)*40;
 A(1);X.fillStyle='rgba(168,216,240,.12)';X.strokeStyle=C.ice;X.lineWidth=5;X.beginPath();X.arc(mx,my,78,0,TAU);X.fill();X.stroke();X.lineWidth=12;X.lineCap='round';X.beginPath();X.moveTo(mx+56,my+56);X.lineTo(mx+120,my+120);X.stroke();X.lineCap='butt';
 [['Lote verificado',q.A0+2.5],['Fecha de vencimiento vigente',q.A0+3.6]].forEach((p,i)=>grp(eo(pr(t,p[1],p[1]+.5)),()=>pill(1250,180+i*64,p[0],{ic:'check',ic_c:C.mint,f:F(600,21),h:48,fill:'rgba(60,197,154,.14)',stroke:'rgba(123,224,184,.6)'})))}
function s2B(t,q){const N=[['build','Fabricación'],['truck','Distribución'],['box','Almacenamiento'],['flask','Utilización'],['doc','Resultado']],xs=N.map((n,i)=>320+i*320),y=330,k0=eo(pr(t,q.B0+.2,q.B0+2.2));
 A(.35);X.strokeStyle=C.ice;X.lineWidth=2;X.beginPath();X.moveTo(xs[0],y);X.lineTo(lr(xs[0],xs[4],k0),y);X.stroke();T('CICLO DE VIDA DEL REACTIVO',960,200,F(600,20),C.sky,'center',k0,6);
 N.forEach((n,i)=>{const k=pr(t,q.B0+.2+i*.4,q.B0+.6+i*.4);node(xs[i],y,62,n[0],i===3&&t>q.tFal?C.amber:C.ice,k);if(k>0)T(n[1],xs[i],y+102,F(600,24),C.white,'center',eo(k))});
 if(t>q.tFal){const pu=((t-q.tFal)*.8)%1;A(1-pu);X.strokeStyle=C.amber;X.lineWidth=3;X.beginPath();X.arc(xs[3],y,70+pu*50,0,TAU);X.stroke();grp(eo(pr(t,q.tFal,q.tFal+.4)),()=>pill(xs[3]-150,y-118,'Falla detectada a tiempo',{ic:'warn',ic_c:C.amber,f:F(600,20),h:44,fill:'rgba(255,181,71,.16)',stroke:'rgba(255,181,71,.7)'}))}
 [['check','Calidad',q.tCal],['shield','Seguridad',q.tSeg],['chart','Desempeño',q.tDes]].forEach((p,i)=>{const k=eo(pr(t,p[2]-.2,p[2]+.45));if(k>0)grp(k,()=>{X.translate(0,(1-k)*24);card(300+i*460,560,400,200,{accent:C.mint});node(380+i*460,660,48,p[0],C.mint,1);T(p[1],450+i*460,672,FD(700,40),C.white)})})}
function s2C(t,q){card(110,180,1700,320);T('PROGRAMA NACIONAL DE REACTIVOVIGILANCIA',160,250,F(700,22),C.sky,'left',1,5);T('Resolución 7532 de 2020 · Invima',160,290,F(500,22),C.ice,'left',.85);
 [['search','Identificación',q.tIde],['chart','Cualificación',q.tCua],['shield','Gestión',q.tGes]].forEach((p,i)=>{const k=pr(t,p[2]-.2,p[2]+.4);node(330+i*520,410,46,p[0],C.mint,k);if(k>0)T(p[1],400+i*520,422,FD(700,38),C.white,'left',eo(k))});
 const ke=eo(pr(t,q.tEfe-.2,q.tEfe+.6));if(ke>0)grp(ke,()=>{X.translate(0,(1-ke)*20);card(110,540,1700,300);T('EFECTO INDESEADO',160,600,F(700,20),C.amber,'left',1,5);
  para('«Acontecimiento relacionado con la atención en salud, que tiene o puede tener consecuencias negativas (…)».',160,646,1600,F(400,28),38,C.white,.95);
  const w1=pill(160,770,'Evento adverso: daño no intencionado',{ic:'warn',ic_c:C.amber,f:F(600,22),h:50});pill(190+w1,770,'Incidente: potencial daño no intencionado',{ic:'bell',f:F(600,22),h:50});T('Res. 7532 de 2020, arts. 3 y 5',1780,778,F(400,18),C.gray,'right')})}
function S2(t){const q=Q.s2;grp(fade(t,q.A0,q.A1),()=>s2A(t,q));grp(fade(t,q.B0,q.B1),()=>s2B(t,q));grp(fade(t,q.C0,q.C1),()=>s2C(t,q))}
