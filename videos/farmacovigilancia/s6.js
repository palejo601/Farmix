'use strict';
// Escena 6: aplicación en Colombia · Escena 7: mensaje final
function s6A(t,q){mapCol(t,0);const k=eo(pr(t,q.tInv-.3,q.tInv+.5));
 grp(k,()=>{X.translate((1-k)*30,0);T('AGENCIA REGULATORIA NACIONAL',1000,300,F(600,20),C.sky,'left',1,5);T('Invima',994,420,FD(800,120),C.white);para('Instituto Nacional de Vigilancia de Medicamentos y Alimentos',1000,480,760,F(400,32),42,C.ice,.9)});
 grp(eo(pr(t,q.tMedi-.2,q.tMedi+.5)),()=>pill(1000,620,'Programa Nacional de Farmacovigilancia',{ic:'pill',f:F(600,24),h:56}));
 grp(eo(pr(t,q.tDisp-.2,q.tDisp+.5)),()=>pill(1000,700,'Programa Nacional de Tecnovigilancia',{ic:'dev',f:F(600,24),h:56}))}
function arrowV(x,ya,yb,c,lab){X.strokeStyle=c;X.lineWidth=2.5;X.beginPath();X.moveTo(x,ya);X.lineTo(x,yb);X.stroke();arrowHead(x,yb,yb>ya?PI/2:-PI/2,c);T(lab,x+(x<960?-18:18),(ya+yb)/2,F(600,22),c,x<960?'right':'left',1,0,'middle')}
function s6B(t,q){const R5=[['build','Ministerio de Salud y Protección Social','Política y marco normativo',q.tMin],['shield','Invima','Programas Nacionales de Farmacovigilancia y Tecnovigilancia',q.tMin+.9],['map','Secretarías de salud','Departamentales y distritales',q.tPre-1.1],['hosp','Prestadores de servicios de salud','Programas institucionales de farmacovigilancia y tecnovigilancia',q.tPre],['users','Profesionales de la salud','',q.tProf]];
 const x=560,w=800,hh=104,y0=170,gap=130;
 for(let i=0;i<4;i++){const k=eo(pr(t,R5[i+1][3]-.2,R5[i+1][3]+.4));if(k<=0)continue;const ya=y0+i*gap+hh,yb=y0+(i+1)*gap,u=(t*.9+i*.3)%1;A(.4*k);X.strokeStyle=C.ice;X.lineWidth=2;X.beginPath();X.moveTo(x+w/2,ya);X.lineTo(x+w/2,yb);X.stroke();glow(x+w/2-14,lr(yb,ya,u),12,k*.9,C.amber);glow(x+w/2+14,lr(ya,yb,u),12,k*.9,C.sky)}
 R5.forEach((r,i)=>{const k=eo(pr(t,r[3]-.25,r[3]+.45));if(k<=0)return;const y=y0+i*gap;grp(k,()=>{X.translate((1-k)*40,0);card(x,y,w,hh,{r:16});node(x+56,y+hh/2,34,r[0],i===4?C.mint:C.ice,1);T(r[1],x+110,y+44,F(700,28),C.white);
  if(i===4){let xx=x+110;[['Detectar',q.tDet],['Notificar',q.tNot],['Gestionar',q.tGes]].forEach(([v,tv],j)=>{const on=t>tv;T(v,xx,y+80,F(600,22),on?C.mint:C.ice,'left',on?1:.6);X.font=F(600,22);xx+=X.measureText(v).width+14;if(j<2){T('·',xx,y+80,F(600,22),C.ice,'left',.6);xx+=24}})}
  else T(r[2],x+110,y+80,F(400,21),C.ice,'left',.85)})});
 grp(eo(pr(t,q.tPre,q.tPre+.8))*.85,()=>{arrowV(470,780,230,C.amber,'Notificación');arrowV(1450,230,780,C.sky,'Alertas y retroalimentación')})}
function s6C(t,q){const N=[['2005','Decreto 4725','Registro sanitario, permiso de comercialización y vigilancia sanitaria de dispositivos médicos.',q.n1,1],['2007','Resolución 1403','Modelo de gestión del servicio farmacéutico y manual de condiciones esenciales.',q.n2,0],['2008','Resolución 4816','Reglamenta el Programa Nacional de Tecnovigilancia.',q.n3,1],['2016','Decreto 780','Decreto Único Reglamentario del Sector Salud y Protección Social.',q.n4,0]];
 const y=500,xs=[300,740,1180,1620],kl=eo(pr(t,q.C0+.2,q.n4+.6));T('MARCO NORMATIVO DE REFERENCIA',960,170,F(700,22),C.sky,'center',eo(pr(t,q.C0+.1,q.C0+.8)),8);
 A(.35);X.strokeStyle=C.ice;X.lineWidth=2;X.beginPath();X.moveTo(160,y);X.lineTo(160+1600*kl,y);X.stroke();
 N.forEach((n,i)=>{const k=eo(pr(t,n[3]-.3,n[3]+.4));if(k<=0)return;const x=xs[i],up=n[4];grp(k,()=>{A(1);X.fillStyle=C.sky;X.beginPath();X.arc(x,y,10,0,TAU);X.fill();glow(x,y,34,.6,C.sky);
  A(.5);X.strokeStyle=C.ice;X.beginPath();X.moveTo(x,y+(up?-14:14));X.lineTo(x,y+(up?-56:56));X.stroke();const cy=up?y-256:y+56;X.translate(0,(1-k)*(up?-16:16));card(x-200,cy,400,200,{r:16});
  T(n[0],x-170,cy+62,FD(800,46),C.sky);T(n[1],x-170,cy+100,F(700,26),C.white);para(n[2],x-170,cy+136,340,F(400,19),25,C.ice,.9)})});
 T('Referentes normativos citados. Verifique su vigencia y modificaciones en las fuentes oficiales (MinSalud · Invima).',960,862,F(400,18),C.gray,'center',eo(pr(t,q.n4,q.n4+.8)))}
function s6D(t,q){mapCol(t,1);[['search','Identificación de riesgos',q.tIde],['send','Notificación oportuna',q.tNoti],['shield','Protección de la población',q.tPro],['up','Mejoramiento de la atención en salud',q.tMej]].forEach((p,i)=>{
 const k=eo(pr(t,p[2]-.25,p[2]+.4));if(k>0)grp(k,()=>{X.translate((1-k)*30,0);card(1000,210+i*150,800,120,{r:18});node(1066,270+i*150,40,p[0],i>=2?C.mint:C.ice,1);T(p[1],1130,281+i*150,F(600,30),C.white)})})}
function S6(t){const q=Q.s6;grp(fade(t,q.A0,q.A1),()=>s6A(t,q));grp(fade(t,q.B0,q.B1),()=>s6B(t,q));grp(fade(t,q.C0,q.C1),()=>s6C(t,q));grp(fade(t,q.D0,q.D1),()=>s6D(t,q))}
function s7A(t,q){const t0=SCN.s7.t0,lt=t-t0,cx=960,cy=480,P=[];for(let x=0;x<=W;x+=4)P.push([x,cy+60*ecgY((((x-lt*240)/W*4)%1+1)%1)]);gline(P,C.mint,2,.3);glow(cx,cy,420,.35,C.blue);
 const ic=['user','users','pill','dev','hosp','shield'],lab=['Medicina','Enfermería','Farmacia','Ingeniería biomédica','Institución','Autoridad sanitaria'];
 for(let i=0;i<6;i++){const k=pr(t,t0+.3+i*.15,t0+.8+i*.15),an=-PI/2+PI/6+i*TAU/6+lt*.04,x=cx+Math.cos(an)*418,y=cy+Math.sin(an)*263;
  A(.3*eo(k));X.strokeStyle=C.ice;X.lineWidth=1.5;X.setLineDash([3,7]);X.beginPath();X.moveTo(x,y);X.lineTo(cx,cy);X.stroke();X.setLineDash([]);node(x,y,46,ic[i],C.ice,k);if(k>0)T(lab[i],x,y+80,F(600,21),C.white,'center',eo(k))}
 const kp=eo(pr(t,t0+.2,t0+1.2));A(kp);X.fillStyle='rgba(6,30,56,.92)';X.beginPath();X.arc(cx,cy,140,0,TAU);X.fill();X.fillStyle='rgba(60,197,154,.12)';X.fill();X.strokeStyle=C.mint;X.lineWidth=2.5;X.stroke();person(cx,cy+92,190,C.white,kp);T('PACIENTE',cx,cy+178,F(700,18),C.mint,'center',kp,6);
 T('Herramientas esenciales para proteger vidas',960,150,FD(600,44),C.white,'center',eo(pr(t,q.tPro-.3,q.tPro+.6)))}
function s7B(t,q){const xs=[480,960,1440],y=420,L=['Detectar un riesgo','Notificar un incidente','Prevenir un daño'],I=['search','send','shield'],tm=[q.tDet,q.tNot,q.tPrev];
 for(let i=0;i<2;i++){const k=eo(pr(t,tm[i]+.1,tm[i+1]-.1));if(k>0){A(.8);X.strokeStyle=C.ice;X.lineWidth=2.5;X.beginPath();X.moveTo(xs[i]+100,y);X.lineTo(xs[i]+100+(xs[i+1]-xs[i]-200)*k,y);X.stroke();if(k>.98)arrowHead(xs[i+1]-100,y,0,C.ice)}}
 xs.forEach((x,i)=>{const k=pr(t,tm[i]-.2,tm[i]+.4);node(x,y,84,I[i],i===2?C.mint:C.ice,k,{glow:i===2?1:0});if(k>0)T(L[i],x,y+148,FD(700,34),C.white,'center',eo(k))});
 const kb=eo(pr(t,q.tIns-.4,q.tIns+.4)),kq=eo(pr(t,q.tCal-.3,q.tCal+.9));if(kb>0){const x0=480,w=960,yb=700,g=X.createLinearGradient(x0,0,x0+w,0);g.addColorStop(0,'#C0564A');g.addColorStop(.5,'#5B6B7C');g.addColorStop(1,C.green);
  A(kb);X.fillStyle=g;X.beginPath();X.roundRect(x0,yb,w,14,7);X.fill();T('Atención insegura',x0,yb+52,F(600,24),'#E79A8F','left',kb);T('Atención de calidad',x0+w,yb+52,F(600,24),C.mint,'right',kq);
  const mx=lr(x0+10,x0+w-10,kq);glow(mx,yb+7,40,kb);A(kb);X.fillStyle='#FFFFFF';X.beginPath();X.arc(mx,yb+7,11,0,TAU);X.fill()}}
function s7C(t){ktext(SCN.s7.sent[2].w,960,440,1500,FD(700,74),96,t,{center:true,a0:.12,keys:new Set(['todos']),kc:C.mint})}
function s7D(t,q){const t0=q.c1+.3,k1=eo(pr(t,t0+.1,t0+1.1)),k2=eo(pr(t,t0+.9,t0+1.9)),gr=X.createLinearGradient(0,380,0,560);gr.addColorStop(0,'#FFFFFF');gr.addColorStop(1,'#BFE3F7');glow(960,470,700,.4*k1,C.blue);
 T('VIGILAR ES PREVENIR.',960,lr(450,432,k1),FD(800,84),gr,'center',k1,lr(20,5,k1));T('PREVENIR ES PROTEGER LA VIDA.',960,lr(566,548,k2),FD(800,84),gr,'center',k2,lr(20,5,k2));
 const ke=eo(pr(t,t0+1.2,t0+3.2)),P=[];for(let x=0;x<=W*ke;x+=4)P.push([x,680+46*ecgY((x/W*4)%1)]);if(P.length>1){gline(P,C.mint,2.2,.8);const e=P[P.length-1];glow(e[0],e[1],36,.9,C.mint)}}
function s7E(){T('FUENTES CONSULTADAS',960,250,F(700,22),C.sky,'center',1,8);
 ['Organización Mundial de la Salud (OMS). The Importance of Pharmacovigilance, 2002.','OMS. Plan de Acción Mundial para la Seguridad del Paciente 2021–2030.','OMS. La medicación sin daño: Reto Mundial por la Seguridad del Paciente, 2017.','OMS. Nota descriptiva «Seguridad del paciente», 2023.','Uppsala Monitoring Centre (UMC) · Programa Internacional de Vigilancia de Medicamentos de la OMS.','Invima · Programas Nacionales de Farmacovigilancia y Tecnovigilancia.','Decreto 4725 de 2005 · Resolución 1403 de 2007 · Resolución 4816 de 2008 · Decreto 780 de 2016.'].forEach((l,i)=>T(l,960,320+i*52,F(400,25),C.white,'center',.88));
 T('Contenido educativo. La normativa citada debe verificarse en las fuentes oficiales vigentes.',960,740,F(400,20),C.gray,'center',.9)}
function S7(t,s){const q=Q.s7;grp(fade(t,s.t0,q.b0+.35,.8),()=>s7A(t,q));grp(fade(t,q.b0-.35,q.c0+.15,.5),()=>s7B(t,q));grp(fade(t,q.c0-.1,q.c1+.6,.5),()=>s7C(t));grp(fade(t,q.c1+.3,q.src0+.4,.8),()=>s7D(t,q));grp(fade(t,q.src0,s.t1+1,.8),()=>s7E())}
