'use strict';
// Escena 5: la OMS y la seguridad del paciente
function s5A(t,q){const cx=960,cy=500,R=290,N=['Incidente','Notificación','Análisis','Aprendizaje','Mejora'],I=['warn','send','search','book','up'],col=[C.amber,C.ice,C.ice,C.mint,C.green],sp=(q.a1-q.A0-1)/5;
 const p=eo(pr(t,q.A0+.3,q.a1-.4));A(.25);X.strokeStyle=C.ice;X.lineWidth=2;X.beginPath();X.arc(cx,cy,R,0,TAU);X.stroke();
 A(.9);X.strokeStyle=C.sky;X.lineWidth=4;X.lineCap='round';X.beginPath();X.arc(cx,cy,R,-PI/2,-PI/2+TAU*Math.max(p,.001));X.stroke();X.lineCap='butt';
 if(p>=1){const an=-PI/2+((t-q.a1+.4)*.5%1)*TAU;glow(cx+Math.cos(an)*R,cy+Math.sin(an)*R,26,.9,C.sky)}
 N.forEach((n,i)=>{const an=-PI/2+i*TAU/5,x=cx+Math.cos(an)*R,y=cy+Math.sin(an)*R,k=pr(t,q.A0+.3+i*sp,q.A0+.7+i*sp),ca=Math.cos(an);
  node(x,y,60,I[i],col[i],k,{glow:i===3&&t>q.tApr?1:0});if(k>0)T(n,x+ca*110,y+Math.sin(an)*96+10,F(600,28),C.white,Math.abs(ca)<.3?'center':ca>0?'left':'right',eo(k))});
 const kc=eo(pr(t,q.A0+.2,q.A0+1));T('Atención',cx,cy-10,FD(700,48),C.white,'center',kc);T('sanitaria segura',cx,cy+46,FD(700,48),C.white,'center',kc);T('APRENDER DE CADA INCIDENTE',cx,cy+100,F(600,17),C.mint,'center',eo(pr(t,q.tApr-.2,q.tApr+.6)),4)}
function s5B(t,q){const k=eo(pr(t,q.B0+.2,q.B0+.9));T('1 de cada 10',960,300,FD(800,120),C.white,'center',k);T('pacientes sufre algún daño durante la atención sanitaria',960,360,F(400,32),C.ice,'center',k*.9);
 for(let i=0;i<10;i++){const ki=eo(pr(t,q.B0+.4+i*.08,q.B0+.8+i*.08)),hl=i===6&&t>q.tDiez,x=960+(i-4.5)*125;
  if(hl){const pu=((t-q.tDiez)*.8)%1;A((1-pu)*.8);X.strokeStyle=C.amber;X.lineWidth=3;X.beginPath();X.arc(x,555,60+pu*40,0,TAU);X.stroke()}person(x,640,180,hl?C.amber:'rgba(168,216,240,.85)',ki)}
 const kb=eo(pr(t,q.tMit-.2,q.tMit+.8)),km=eo(pr(t,q.tMed-.2,q.tMed+.8)),x0=480,w=960,y=690;
 if(kb>0){A(kb);X.fillStyle='rgba(168,216,240,.18)';X.beginPath();X.roundRect(x0,y,w,26,13);X.fill();X.fillStyle=C.green;X.beginPath();X.roundRect(x0,y,w*.55*kb,26,13);X.fill();T('Más de la mitad de los daños es prevenible',x0,y+60,F(600,24),C.mint,'left',kb);
  if(km>0){A(km);X.fillStyle=C.sky;X.beginPath();X.roundRect(x0,y,w*.275*km,26,13);X.fill();T('La mitad de lo prevenible se atribuye a los medicamentos',x0,y+96,F(600,24),C.sky,'left',km)}}
 T('Fuente: OMS, nota descriptiva «Seguridad del paciente» (2023).',960,850,F(400,18),C.gray,'center',k*.9)}
function s5C(t,q){grp(eo(pr(t,q.C0+.2,q.C0+.9)),()=>{T('PLAN DE ACCIÓN MUNDIAL PARA LA SEGURIDAD DEL PACIENTE · OMS',110,200,F(600,19),C.sky,'left',1,3);T('2021–2030',110,300,FD(800,96),C.white);
  para('Visión: un mundo en el que nadie sufra daños en la atención sanitaria y todos los pacientes reciban una atención segura y respetuosa.',110,350,900,F(400,24),34,C.ice,.9)});
 ['Políticas para eliminar los daños evitables','Sistemas de alta fiabilidad','Seguridad de los procesos clínicos','Participación de pacientes y familias','Formación, competencias y seguridad del personal','Información, investigación y gestión de riesgos','Sinergias, alianzas y solidaridad'].forEach((o,i)=>{
  const ki=eo(pr(t,q.C0+1+i*.32,q.C0+1.4+i*.32));if(ki>0)grp(ki,()=>{const y=470+i*56;X.translate((1-ki)*-20,0);A(1);X.fillStyle='rgba(95,179,232,.2)';X.beginPath();X.arc(132,y-8,20,0,TAU);X.fill();X.strokeStyle=C.sky;X.lineWidth=1.5;X.stroke();T(String(i+1),132,y-1,F(700,20),C.white,'center');T(o,168,y,F(500,25),C.white)})});
 const km=eo(pr(t,q.tRet-.3,q.tRet+.5)),k5=eo(pr(t,q.t50-.2,q.t50+.7));
 grp(km,()=>{X.translate((1-km)*40,0);card(1100,200,710,640,{accent:C.mint});A(1);ico('pill',1180,280,56,C.mint,3);T('RETO MUNDIAL POR LA SEGURIDAD DEL PACIENTE',1150,350,F(600,18),C.mint,'left',1,3);T('OMS · 2017',1150,380,F(500,18),C.ice,'left',.8);
  T('Medicación sin daño',1150,450,FD(700,54),C.white);T('−50 %',1150,610,FD(800,150),C.mint,'left',k5);para('Meta: reducir los daños graves y evitables relacionados con la medicación.',1150,680,600,F(400,26),36,C.ice,k5)})}
function s5D(t,q){const lab=['Sistemas organizados','Vigilancia permanente','Comunicación efectiva','Compromiso institucional'],tm=[q.tSis,q.tVig,q.tCom,q.tCmp],xs=[560,830,1100,1370],yc=500;
 const kt=eo(pr(t,q.D0+.2,q.D0+.8));T('DEFENSAS EN CAPAS',960,200,F(700,22),C.sky,'center',kt,8);T('Modelo del queso suizo (J. Reason)',960,236,F(400,19),C.gray,'center',kt);
 const hp=eo(pr(t,q.tSis-.2,q.tCmp+.2)),hx=lr(200,xs[2]-62,hp),blk=hp>=1;
 if(hp>0){gline([[200,yc],[hx,yc]],C.amber,5);A(1);X.fillStyle=C.amber;X.beginPath();X.moveTo(hx+14,yc);X.lineTo(hx-10,yc-12);X.lineTo(hx-10,yc+12);X.closePath();X.fill();T('Riesgo',200,yc-26,F(600,20),C.amber,'left',kt)}
 xs.forEach((x,i)=>{const k=eo(pr(t,tm[i]-.3,tm[i]+.3));if(blk&&i===2)glow(x,yc,260,.5*pr(t,q.tCmp+.2,q.tCmp+.8),C.green);A(lr(.25,1,k));X.drawImage(SLICE[i],x-65,yc-235);if(k>0)para(lab[i],x+5,800,230,F(600,24),30,C.white,k,'center')});
 if(blk){const kb=pr(t,q.tCmp+.2,q.tCmp+.9),bx=xs[2]-62;X.strokeStyle=C.amber;X.lineWidth=2;A((1-kb)*.9);X.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU,r=10+eo(kb)*50;X.moveTo(bx+Math.cos(a)*r*.4,yc+Math.sin(a)*r*.4);X.lineTo(bx+Math.cos(a)*r,yc+Math.sin(a)*r)}X.stroke();
  grp(eo(pr(t,q.tCmp+.5,q.tCmp+1.1)),()=>pill(1470,330,'Daño prevenido',{ic:'shield',ic_c:C.mint,fill:'rgba(60,197,154,.18)',stroke:'rgba(123,224,184,.7)',f:F(700,24),h:54}))}}
function S5(t){const q=Q.s5;grp(fade(t,q.A0,q.A1),()=>s5A(t,q));grp(fade(t,q.B0,q.B1),()=>s5B(t,q));grp(fade(t,q.C0,q.C1),()=>s5C(t,q));grp(fade(t,q.D0,q.D1),()=>s5D(t,q))}
