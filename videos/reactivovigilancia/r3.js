'use strict';
// Escena 5: seguridad del paciente · Escena 6: procedimiento de vigilancia y notificación
function s5A(t,q){const k0=pr(t,q.A0+.2,q.A0+.7),k1=pr(t,q.A0+.7,q.A0+1.2),k2=pr(t,q.tInc-.3,q.tInc+.3),y=300;
 node(420,y,70,'tube',C.ice,k0);if(k0>0)T('Muestra',420,y+112,F(600,24),C.white,'center',eo(k0));node(840,y,70,'flask',C.amber,k1);if(k1>0)T('Reactivo con falla',840,y+112,F(600,24),C.amber,'center',eo(k1));
 for(const [a,b,k] of [[500,760,k1],[920,1180,k2]])if(k>0){A(eo(k));X.strokeStyle=C.ice;X.lineWidth=2.5;X.beginPath();X.moveTo(a,y);X.lineTo(lr(a,b,eo(k)),y);X.stroke();if(k>=1)arrowHead(b+6,y,0,C.ice)}
 grp(eo(k2),()=>{card(1200,y-90,520,180,{accent:C.red});node(1280,y,42,'doc',C.red,1);T('Resultado incorrecto',1340,y+12,FD(700,34),C.white)});
 [['Diagnóstico equivocado','search',q.tDia],['Retraso en el tratamiento','loop',q.tRet],['Intervención innecesaria','warn',q.tInt]].forEach((p,i)=>{const k=eo(pr(t,p[2]-.2,p[2]+.4));if(k>0)grp(k,()=>{X.translate(0,(1-k)*24);card(170+i*540,560,500,200,{accent:C.amber});node(260+i*540,660,48,p[1],C.amber,1);para(p[0],330+i*540,650,320,F(600,28),36,C.white,1)})})}
const LJ=[.2,-.5,.8,-1.1,.4,1.3,-.2,.6,1.6,2.1,2.6,3.4,.3,-.4,.5,-.2,.1];
function s5B(t,q){card(110,180,1180,620);T('CONTROL DE CALIDAD INTERNO · GRÁFICA DE LEVEY-JENNINGS',150,236,F(700,20),C.sky,'left',1,3);
 const n=t<q.tAcc?lr(0,12,pr(t,q.B0+.3,q.tRec)):12+lr(0,5,pr(t,q.tAcc,q.tAcc+2));levey(230,280,1000,460,LJ,n,{t});
 if(t>q.tRec&&t<q.tAcc+1.6)grp(eo(pr(t,q.tRec,q.tRec+.4))*(1-pr(t,q.tAcc+1,q.tAcc+1.6)),()=>pill(860,300,'Regla 1-3s: corrida rechazada',{ic:'warn',ic_c:C.red,f:F(600,20),h:46,fill:'rgba(255,107,90,.18)',stroke:'rgba(255,140,120,.7)'}));
 [['warn','Reconocer el riesgo',q.tRec,C.amber],['search','Investigar sus causas',q.tInv,C.ice],['shield','Acciones correctivas y preventivas',q.tAcc,C.mint]].forEach((p,i)=>{const k=eo(pr(t,p[2]-.2,p[2]+.4));if(k>0)grp(k,()=>{X.translate((1-k)*30,0);card(1340,200+i*200,470,170,{accent:p[3]});node(1420,285+i*200,46,p[0],p[3],1);para(p[1],1490,280+i*200,300,F(600,27),34,C.white,1)})})}
function s5C(t,q){const kl=eo(pr(t,q.tLab-.3,q.tLab+.5)),kp=eo(pr(t,q.tSeg-.3,q.tSeg+.6));
 grp(kl,()=>{card(200,260,620,420,{accent:C.mint});T('INFORME DE LABORATORIO',250,320,F(700,20),C.sky,'left',1,4);[['Glucosa','95 mg/dL'],['Hemoglobina','13,8 g/dL'],['PCR','2,1 mg/L']].forEach((r,i)=>{T(r[0],250,390+i*58,F(500,25),C.ice);T(r[1],770,390+i*58,F(700,25),C.white,'right');A(.2);X.fillStyle=C.ice;X.fillRect(250,406+i*58,520,1)});
  pill(250,620,'Resultado validado',{ic:'check',ic_c:C.mint,f:F(600,22),h:50,fill:'rgba(60,197,154,.16)',stroke:'rgba(123,224,184,.6)'});T('Valores ilustrativos',770,628,F(400,17),C.gray,'right')});
 A(.7*kp);X.strokeStyle=C.ice;X.lineWidth=2.5;X.setLineDash([8,8]);X.beginPath();X.moveTo(860,470);X.lineTo(1160,470);X.stroke();X.setLineDash([]);if(kp>.9)arrowHead(1170,470,0,C.ice);
 grp(kp,()=>{glow(1440,470,300,.4,C.green);A(1);X.fillStyle='rgba(60,197,154,.14)';X.beginPath();X.arc(1440,450,170,0,TAU);X.fill();X.strokeStyle=C.mint;X.lineWidth=3;X.stroke();person(1440,560,210,C.white,1);T('SEGURIDAD DEL PACIENTE',1440,690,F(700,24),C.mint,'center',1,5)});
 T('Más allá del laboratorio',960,210,FD(700,44),C.white,'center',eo(pr(t,q.C0+.3,q.C0+1)))}
function S5(t){const q=Q.s5;grp(fade(t,q.A0,q.A1),()=>s5A(t,q));grp(fade(t,q.B0,q.B1),()=>s5B(t,q));grp(fade(t,q.C0,q.C1),()=>s5C(t,q))}
// ---------- escena 6 ----------
const STEPS=[['warn','Identificación de una anomalía o incidente'],['stop','Suspensión preventiva del uso del reactivo'],['tag','Aislamiento e identificación del lote'],['check','Verificación de registros y controles de calidad'],['doc','Documentación del incidente'],['search','Evaluación del riesgo e investigación de causas'],['send','Notificación a responsables institucionales y autoridades, según corresponda'],['shield','Medidas correctivas y preventivas'],['loop','Seguimiento y evaluación de resultados']];
function s6A(t,q){T('PROCEDIMIENTO DE VIGILANCIA Y NOTIFICACIÓN',960,150,F(700,22),C.sky,'center',eo(pr(t,q.A0+.2,q.A0+.8)),6);
 STEPS.forEach((s,i)=>{const ts=q.st[i],k=eo(pr(t,ts-.25,ts+.4));if(k<=0)return;const c=i%3,r=Math.floor(i/3),x=110+c*580,y=190+r*230,on=q.hl.some(h=>h[0]===i&&t>h[1]&&t<h[1]+2.4),col=i>=7?C.mint:C.ice;
  grp(k,()=>{X.translate(0,(1-k)*20);card(x,y,540,190,{accent:on?C.amber:col,stroke:on?'rgba(255,181,71,.85)':null});T(String(i+1),x+52,y+80,FD(800,52),on?C.amber:C.sky,'center');node(x+52,y+136,26,s[0],on?C.amber:col,1);para(s[1],x+104,y+70,400,F(600,25),33,C.white,1);
   if(c<2){A(.6);arrowHead(x+566,y+95,0,C.ice)}})})}
function S6(t,s){grp(fade(t,Q.s6.A0,s.t1+.5),()=>s6A(t,Q.s6))}
