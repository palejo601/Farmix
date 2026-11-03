'use strict';
// Escena 3: reactivos de diagnóstico in vitro · Escena 4: incidentes y problemas de calidad
function s3A(t,q){card(110,190,940,540);T('DEFINICIÓN',150,250,F(600,19),C.sky,'left',1,4);ktext(SCN.s3.sent[0].w,150,330,860,F(400,37),55,t,{keys:q.keys,kc:C.mint});T('Marco internacional (OMS): dispositivos médicos para diagnóstico in vitro · Colombia: Decreto 3770 de 2004',150,700,F(400,18),C.gray);
 const km=eo(pr(t,q.tMue-.3,q.tMue+.5));grp(km,()=>{tube(1180,300,400,CAP.oro,'serum');T('Muestra de origen humano',1218,800,F(600,22),C.ice,'center',.9)});
 A(.6*km);X.strokeStyle=C.ice;X.lineWidth=2.5;X.beginPath();X.moveTo(1290,500);X.lineTo(1380,500);X.stroke();arrowHead(1392,500,0,C.ice);
 [['Estados fisiológicos',q.tFis],['Estados patológicos',q.tPat],['Condiciones clínicas',q.tCon]].forEach((p,i)=>{const k=eo(pr(t,p[1]-.2,p[1]+.4));if(k>0)grp(k,()=>{X.translate((1-k)*20,0);card(1420,330+i*120,400,96,{r:16,accent:C.mint});T(p[0],1450,388+i*120,F(600,26),C.white)})})}
function s3B(t,q){T('LOS REACTIVOS DE DIAGNÓSTICO IN VITRO INCLUYEN',960,180,F(600,20),C.sky,'center',eo(pr(t,q.B0+.2,q.B0+.8)),5);
 [['REACTIVO','#1F6FB2','Reactivos',q.tRe],['CALIBRADOR','#9B7BD4','Calibradores',q.tCal],['CONTROL','#3CC59A','Materiales de control',q.tCon2]].forEach((p,i)=>{const k=eo(pr(t,p[3]-.25,p[3]+.4));if(k>0)grp(k,()=>{X.translate(0,(1-k)*24);reagent(560+i*400,380,1.15,{name:p[0],col:p[1],lot:['24A118','CAL-07','CT-2L'][i]});T(p[2],560+i*400,560,F(600,26),C.white,'center')})});
 const AN=[['Glucosa',q.tGlu],['Hemoglobina',q.tHem],['Anticuerpos',q.tAnt],['Antígenos de agentes infecciosos',q.tAg]];X.font=F(600,24);let x=960-AN.reduce((s,a)=>s+X.measureText(a[0]).width+62,0)/2;
 T('Permiten identificar o medir analitos como:',960,660,F(500,22),C.ice,'center',eo(pr(t,q.tGlu-.8,q.tGlu-.2))*.85);
 AN.forEach(a=>{X.font=F(600,24);const w=X.measureText(a[0]).width+48,k=eo(pr(t,a[1]-.2,a[1]+.4));if(k>0)grp(k,()=>pill(x,730,a[0],{f:F(600,24),h:54,fill:'rgba(95,179,232,.2)'}));x+=w+14})}
function s3C(t,q){const A4=[['BIOQUÍMICA','Ej.: glucosa, creatinina',q.tBio],['HEMATOLOGÍA','Ej.: hemoglobina, recuento celular',q.tHema],['INMUNOLOGÍA','Ej.: detección de anticuerpos y antígenos',q.tInm],['MICROBIOLOGÍA','Ej.: identificación de microorganismos',q.tMic]];
 A4.forEach((a,i)=>{const k=eo(pr(t,a[2]-.25,a[2]+.4));if(k<=0)return;const x=110+i*430,cx=x+195;grp(k,()=>{X.translate(0,(1-k)*26);card(x,200,390,600,{accent:C.sky});T(a[0],cx,262,F(700,24),C.sky,'center',1,4);
  if(i===0){A(1);X.fillStyle=rgba('#7B5CC9',.15+.6*eo(pr(t,a[2],a[2]+2.5)));X.fillRect(cx-34,330,68,170);X.strokeStyle='rgba(255,255,255,.7)';X.lineWidth=2;X.strokeRect(cx-38,306,76,198);const g=X.createLinearGradient(x+20,0,x+370,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');X.fillStyle=g;X.fillRect(x+20,410,350,10)}
  else if(i===1){const r=rng(9);for(let j=0;j<16;j++)rbc(cx+(r()-.5)*260,410+(r()-.5)*190+Math.sin(t+j)*4,20+r()*8,.95)}
  else if(i===2){antigen(cx,360,26,C.amber);for(let j=0;j<3;j++){const th=PI/2+(j-1)*1.15,d=lr(180,72,eo(pr(t,a[2]+.4+j*.3,a[2]+1.4+j*.3)));antibody(cx+Math.cos(th)*d,360+Math.sin(th)*d,1,th+1.5*PI,C.sky)}}
  else petri(cx,410,120,pr(t,a[2],a[2]+3));
  para(a[1],cx,620,330,F(500,23),32,C.white,.95,'center')})})}
function s3D(t,q){const k=eo(pr(t,q.tAlt-.3,q.tAlt+1.2)),cx=620,cy=470;T('EXACTITUD DEL RESULTADO',cx,190,F(700,22),C.sky,'center',1,5);
 for(let r=5;r>=1;r--){A(1);X.fillStyle=r%2?'rgba(95,179,232,.16)':'rgba(10,36,66,.9)';X.beginPath();X.arc(cx,cy,r*52,0,TAU);X.fill();X.strokeStyle='rgba(168,216,240,.35)';X.lineWidth=1.5;X.stroke()}
 A(1);X.fillStyle=C.mint;X.beginPath();X.arc(cx,cy,8,0,TAU);X.fill();T('Valor real',cx,cy+300,F(600,22),C.mint,'center');const r=rng(4);
 for(let i=0;i<9;i++){const px=cx+(r()-.5)*40+k*150,py=cy+(r()-.5)*40-k*95;A(1);X.fillStyle=k>.5?C.amber:C.white;X.beginPath();X.arc(px,py,7,0,TAU);X.fill()}
 const kd=eo(pr(t,q.tDec-.3,q.tDec+.5));grp(eo(pr(t,q.tExa-.2,q.tExa+.5)),()=>{card(1060,250,760,170,{accent:C.amber});T('Resultado inexacto',1110,318,FD(700,38),C.white);T('El valor medido se aleja del valor real',1110,368,F(400,24),C.ice,'left',.9)});
 grp(kd,()=>{card(1060,460,760,170,{accent:C.red});node(1140,545,40,'warn',C.amber,1);T('Decisión clínica inadecuada',1200,556,FD(700,34),C.white)});T('Representación esquemática',1440,690,F(400,18),C.gray,'center',kd)}
function S3(t){const q=Q.s3;grp(fade(t,q.A0,q.A1),()=>s3A(t,q));grp(fade(t,q.B0,q.B1),()=>s3B(t,q));grp(fade(t,q.C0,q.C1),()=>s3C(t,q));grp(fade(t,q.D0,q.D1),()=>s3D(t,q))}
// ---------- escena 4 ----------
const RISK=[['drop','Contaminación'],['flask','Alteraciones en la composición'],['loop','Problemas de estabilidad'],['thermo','Errores de almacenamiento y conservación'],['stop','Reactivos vencidos'],['warn','Falsos positivos o falsos negativos'],['search','Sensibilidad y especificidad'],['chart','Desempeño analítico deficiente'],['tag','Errores de identificación o etiquetado'],['truck','Fallas del fabricante o la distribución']];
function s4A(t,q){[['thermo','Almacenamiento',q.tAlm],['truck','Distribución',q.tDis],['flask','Utilización',q.tUti]].forEach((p,i)=>{const x=480+i*480,k=pr(t,p[2]-.25,p[2]+.4);if(i&&k>0){A(.5*eo(k));X.strokeStyle=C.ice;X.lineWidth=2;X.setLineDash([8,8]);X.beginPath();X.moveTo(x-380,470);X.lineTo(x-100,470);X.stroke();X.setLineDash([])}
 node(x,470,96,p[0],C.ice,k);if(k>0){T(p[1],x,640,FD(700,36),C.white,'center',eo(k));const pu=((t-p[2])*.7)%1;A(eo(k)*(1-pu)*.7);X.strokeStyle=C.amber;X.lineWidth=2;X.beginPath();X.arc(x,470,110+pu*40,0,TAU);X.stroke()}});
 T('RIESGOS A LO LARGO DE LA CADENA',960,250,F(600,22),C.sky,'center',eo(pr(t,q.A0+.2,q.A0+.8)),6)}
function s4B(t,q){RISK.forEach((r,i)=>{const hot=q.hot[i],t0=hot||q.B0+.3+i*.55,k=eo(pr(t,t0-.2,t0+.4));if(k<=0)return;const c=i%5,rw=Math.floor(i/5),x=110+c*346,y=200+rw*300,on=hot&&t>hot&&t<hot+2.2;
 grp(k,()=>{X.translate(0,(1-k)*20);card(x,y,330,260,{accent:on?C.amber:null,stroke:on?'rgba(255,181,71,.8)':null});T(String(i+1).padStart(2,'0'),x+30,y+64,FD(800,40),on?C.amber:C.sky);node(x+262,y+56,36,r[0],on?C.amber:C.ice,1);para(r[1],x+30,y+140,280,F(600,25),32,C.white,1)})})}
function s4C(t,q){const x0=560,y0=260,cw=330,ch=180,kf=t>q.tFN,kp=t>q.tFP;T('Resultado de la prueba',x0+cw,y0-60,F(600,20),C.ice,'center',.85);T('Condición real del paciente',x0-40,y0+ch,F(600,20),C.ice,'right',.85);
 [['Verdadero positivo','VP',0,0],['Falso positivo','FP',1,0],['Falso negativo','FN',0,1],['Verdadero negativo','VN',1,1]].forEach(([l,s,c,r])=>{const hot=(s==='FN'&&kf)||(s==='FP'&&kp),x=x0+c*cw,y=y0+r*ch;A(1);X.fillStyle=hot?'rgba(255,107,90,.22)':'rgba(10,36,66,.85)';X.fillRect(x,y,cw-8,ch-8);X.strokeStyle=hot?C.red:'rgba(168,216,240,.35)';X.lineWidth=hot?3:1.5;X.strokeRect(x,y,cw-8,ch-8);
  T(s,x+cw/2-4,y+80,FD(800,52),hot?'#FF9A8C':C.white,'center');T(l,x+cw/2-4,y+124,F(500,22),C.ice,'center',.9)});
 T('Positivo',x0+cw/2,y0-18,F(600,18),C.ice,'center',.7);T('Negativo',x0+cw*1.5,y0-18,F(600,18),C.ice,'center',.7);T('Enfermo',x0-14,y0+ch/2,F(600,18),C.ice,'right',.7);T('Sano',x0-14,y0+ch*1.5,F(600,18),C.ice,'right',.7);
 T('Sensibilidad = VP / (VP + FN)',940,y0+2*ch+70,F(600,26),kf?'#FF9A8C':C.mint,'right',eo(pr(t,q.tSen-.2,q.tSen+.4)));T('Especificidad = VN / (VN + FP)',980,y0+2*ch+70,F(600,26),kp?'#FF9A8C':C.mint,'left',eo(pr(t,q.tEsp-.2,q.tEsp+.4)))}
function s4D(t,q){const xs=[480,960,1440],L=['Detección temprana','Notificación','Vigilancia sanitaria'],I=['search','send','shield'],tm=[q.tDet,q.tNot,q.tVig];
 for(let i=0;i<2;i++){const k=eo(pr(t,tm[i]+.2,tm[i+1]));if(k>0){A(1);X.strokeStyle=C.mint;X.lineWidth=3;X.beginPath();X.moveTo(xs[i]+100,470);X.lineTo(xs[i]+100+(xs[i+1]-xs[i]-200)*k,470);X.stroke();if(k>.98)arrowHead(xs[i+1]-100,470,0,C.mint)}}
 xs.forEach((x,i)=>{const k=pr(t,tm[i]-.2,tm[i]+.4);node(x,470,92,I[i],i===2?C.mint:C.ice,k,{glow:i===2?1:0});if(k>0)T(L[i],x,630,FD(700,36),C.white,'center',eo(k))})}
function S4(t){const q=Q.s4;grp(fade(t,q.A0,q.A1),()=>s4A(t,q));grp(fade(t,q.B0,q.B1),()=>s4B(t,q));grp(fade(t,q.C0,q.C1),()=>s4C(t,q));grp(fade(t,q.D0,q.D1),()=>s4D(t,q))}
