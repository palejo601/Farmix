'use strict';
// Escena 3: tecnovigilancia · Escena 4: diferencias
function s3A(t,q){A(.06);X.strokeStyle=C.sky;X.lineWidth=1;X.beginPath();for(let x=0;x<W;x+=32){X.moveTo(x+.5,0);X.lineTo(x+.5,H)}for(let y=0;y<H;y+=32){X.moveTo(0,y+.5);X.lineTo(W,y+.5)}X.stroke();
 const lt=t-q.A0;pumpWire(80-lt*4,300,.85);monWire(1320+lt*4,250,.8);
 card(330,330,1260,400);T('DEFINICIÓN',380,392,F(600,19),C.sky,'left',1,4);ktext(SCN.s3.sent[0].w,380,460,1160,F(400,40),58,t,{keys:q.keys,kc:C.mint})}
function s3B(t,q){const al=t>q.tFal;ivset(330,470,.8,t);pump(330,470,.8,t,al);tube(330,470,.8);monitor(1000,280,.92,t,{});
 grp(eo(pr(t,q.tBom-.2,q.tBom+.4)),()=>{T('Bomba de infusión',660,560,FD(700,34),C.white);T('Administra fluidos y medicamentos',660,596,F(400,22),C.ice,'left',.85)});
 grp(eo(pr(t,q.tMon-.2,q.tMon+.4)),()=>{T('Monitor de signos vitales',1294,740,FD(700,34),C.white,'center');T('Vigilancia continua del paciente',1294,776,F(400,22),C.ice,'center',.85)});
 if(al)grp(eo(pr(t,q.tFal,q.tFal+.4)),()=>pill(640,400,'Falla detectada',{ic:'warn',ic_c:C.amber,fill:'rgba(255,107,90,.16)',stroke:'rgba(255,140,120,.7)',f:F(600,22)}))}
function s3C(t,q){const xs=[460,960,1460],y=480,L=['Detectar incidentes','Investigar causas','Medidas preventivas'],I=['bell','search','shield'],tm=[q.tDet,q.tInv,q.tMed];
 T('VIGILANCIA SISTEMÁTICA',960,260,F(600,22),C.sky,'center',eo(pr(t,q.C0,q.C0+.8)),8);A(.3);X.strokeStyle=C.ice;X.lineWidth=2;X.beginPath();X.moveTo(xs[0],y);X.lineTo(xs[2],y);X.stroke();
 for(let i=0;i<2;i++){const k=eo(pr(t,tm[i]+.2,tm[i+1]));if(k>0){A(1);X.strokeStyle=C.mint;X.lineWidth=3;X.beginPath();X.moveTo(xs[i]+100,y);X.lineTo(xs[i]+100+(xs[i+1]-xs[i]-200)*k,y);X.stroke();if(k>.98)arrowHead(xs[i+1]-100,y,0,C.mint)}}
 const u=(t*.35)%1;glow(lr(xs[0],xs[2],u),y,16,.6*eo(pr(t,q.tMed,q.tMed+.5)),C.mint);
 xs.forEach((x,i)=>{const k=pr(t,tm[i]-.15,tm[i]+.4);node(x,y,92,I[i],i==2?C.mint:C.ice,k,{glow:i==2?1:0});if(k>0)T(L[i],x,y+160,FD(700,36),C.white,'center',eo(k))})}
function s3D(t,q){const k1=eo(pr(t,q.tEv-.2,q.tEv+.5)),k2=eo(pr(t,q.tIn-.2,q.tIn+.5)),k3=eo(pr(t,q.D1-1.7,q.D1-1.1));
 const cardE=(x,k,col,ic,ti,tx)=>grp(k,()=>{X.translate(0,(1-k)*24);card(x,220,760,500,{accent:col});node(x+90,320,48,ic,col,1);T(ti,x+160,334,FD(700,40),C.white,'left',1,2);para(tx,x+44,430,660,F(400,30),44,C.ice,1);
  grp(k3,()=>{const w1=pill(x+44,662,'Serio',{f:F(600,21),h:44});pill(x+58+w1,662,'No serio',{f:F(600,21),h:44})})});
 cardE(170,k1,C.amber,'warn','EVENTO ADVERSO','Daño no intencionado al paciente, al operador o al medio ambiente, como consecuencia del uso de un dispositivo médico.');
 cardE(990,k2,C.sky,'bell','INCIDENTE ADVERSO','Potencial daño no intencionado al paciente, al operador o al medio ambiente, asociado al uso de un dispositivo médico.');
 T('Resolución 4816 de 2008 · Programa Nacional de Tecnovigilancia',960,790,F(500,21),C.gray,'center',Math.max(k1,k2))}
function s3E(t,q){const k1=eo(pr(t,q.tSer-.2,q.tSer+.5)),k2=eo(pr(t,q.tNo-.2,q.tNo+.5));X.lineCap='butt';
 grp(k1,()=>{card(260,200,640,600,{accent:C.amber});T('SERIOS',580,270,F(700,26),C.amber,'center',1,6);const p=eo(pr(t,q.t72-.2,q.t72+1.4));
  A(.25);X.strokeStyle=C.ice;X.lineWidth=14;X.beginPath();X.arc(580,500,150,0,TAU);X.stroke();A(1);X.strokeStyle=C.amber;X.lineCap='round';X.beginPath();X.arc(580,500,150,-PI/2,-PI/2+TAU*Math.max(p,.001));X.stroke();X.lineCap='butt';
  T('72 h',580,526,FD(800,84),C.white,'center');T('Reporte inmediato',580,720,F(600,28),C.white,'center');T('dentro de las 72 horas siguientes',580,758,F(400,21),C.ice,'center',.85)});
 grp(k2,()=>{card(1020,200,640,600,{accent:C.sky});T('NO SERIOS',1340,270,F(700,26),C.sky,'center',1,6);
  for(let i=0;i<4;i++){const p=eo(pr(t,q.tTri-.4+i*.3,q.tTri+i*.3));A(.25+.75*p);X.strokeStyle=p>0?C.sky:C.ice;X.lineWidth=14;X.beginPath();X.arc(1340,500,150,-PI/2+i*PI/2+.06,-PI/2+(i+1)*PI/2-.06);X.stroke()}
  T('Trimestral',1340,516,FD(700,52),C.white,'center');T('Reporte periódico',1340,720,F(600,28),C.white,'center');T('consolidado cada tres meses',1340,758,F(400,21),C.ice,'center',.85)});
 T('Fuente: Resolución 4816 de 2008 (Ministerio de la Protección Social) · Programa Nacional de Tecnovigilancia',960,850,F(400,18),C.gray,'center',Math.max(k1,k2)*.9)}
function S3(t){const q=Q.s3;grp(fade(t,q.A0,q.A1),()=>s3A(t,q));grp(fade(t,q.B0,q.B1),()=>s3B(t,q));grp(fade(t,q.C0,q.C1),()=>s3C(t,q));grp(fade(t,q.D0,q.D1),()=>s3D(t,q));grp(fade(t,q.E0,q.E1),()=>s3E(t,q))}
function s4A(t,q){const m=eo(pr(t,q.tAmb-.2,q.tAmb+.8));
 const pan=(x,ic,col,ti,rows,tms,side)=>{const k=eo(pr(t,tms[0]-.3,tms[0]+.4));if(k<=0)return;grp(k*(1-.82*m),()=>{X.translate(side*m*40,(1-k)*30);card(x,190,790,640,{accent:col});node(x+80,270,44,ic,col,1);T(ti,x+140,286,FD(800,44),C.white,'left',1,3);
  rows.forEach((r,i)=>{const ki=eo(pr(t,tms[i]-.2,tms[i]+.4));if(ki<=0)return;const yy=390+i*150;A(ki*.25);X.fillStyle=C.ice;X.fillRect(x+44,yy-50,700,1);T(r[0],x+44,yy-12,F(600,18),col,'left',ki,4);para(r[1],x+44,yy+28,700,F(500,30),40,C.white,ki)})})};
 pan(110,'pill',C.sky,'FARMACOVIGILANCIA',[['VIGILA','Medicamentos'],['SE ENFOCA EN','Problemas relacionados con su utilización'],['EJEMPLO','Erupción cutánea tras iniciar un antibiótico']],[q.a0,q.tProb,q.tErup],-1);
 pan(1020,'dev',C.teal,'TECNOVIGILANCIA',[['VIGILA','Dispositivos médicos'],['SE ENFOCA EN','Incidentes y eventos adversos asociados a su uso'],['EJEMPLO','Bomba de infusión cuya alarma no se activa ante una oclusión']],[q.b0,q.tInc,q.tBom],1);
 if(m>0)grp(m,()=>{glow(960,480,720,1,'#03101F');glow(960,420,280,.5,C.green);const s=eb(m);X.save();X.translate(960,420);X.scale(s,s);A(1);X.fillStyle='rgba(60,197,154,.16)';X.beginPath();X.arc(0,0,120,0,TAU);X.fill();X.strokeStyle=C.mint;X.lineWidth=3;X.stroke();ico('shield',0,0,130,C.mint,4);X.restore();
  T('OBJETIVO COMÚN',960,612,F(700,24),C.mint,'center',1,8);T('Prevenir daños y proteger al paciente',960,684,FD(700,54),C.white,'center')})}
function S4(t,s){const q=Q.s4;grp(fade(t,q.A0,s.t1+.5),()=>s4A(t,q))}
