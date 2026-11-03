'use strict';
// Tiempos de cada plano (sincronizados con la voz) y eventos de sonido
(function(){
 {const s=SCN.s1,[a,b,c,d]=s.sent,q=Q.s1={ecg0:.25,ecg1:2.9,cor0:2.2,cor1:b.t0+.45,med0:b.t0-.45,med1:c.t0+.35,net0:c.t0-.35,net1:d.t0+.35,tit0:d.t0-.35,
  tf:wt('s1',3,'farmacovigilancia'),tt:wt('s1',3,'tecnovigilancia'),ben:wt('s1',1,'beneficios'),rie:wt('s1',1,'riesgos'),w3:[wt('s1',2,'identificar'),wt('s1',2,'evaluar'),wt('s1',2,'prevenir')],resp:wt('s1',2,'responsabilidad'),end:d.t1};
  for(let k=0;k<3;k++){const xp=(k+.3)/3.2*W;let lo=q.ecg0,hi=q.ecg1;for(let i=0;i<30;i++){const m=(lo+hi)/2;W*eo(pr(m,q.ecg0,q.ecg1))<xp?lo=m:hi=m}ev(lo,'beat')}
  for(let x=q.cor0+.6;x<q.cor1-.4;x+=1)ev(x,'beep',.3);ev(q.med0+.2,'whoosh',.5);for(let x=q.med0+.7;x<q.med1-.4;x+=.83)ev(x,'beep',.4);
  ev(q.ben,'blip',.5);ev(q.rie,'blip',.6);ev(q.net0+.2,'whoosh',.45);q.w3.forEach(x=>ev(x,'blip',.6));ev(q.resp,'chime',.4);ev(q.tf-2.2,'riser');ev(q.tf,'boom');ev(q.tt,'hit',.6)}
 {const s=SCN.s2,w=win('s2',[[0],[1],[2],[3],[4]],s.t0+1.8),a=s.sent[0],q=Q.s2={A0:w[0][0],A1:w[0][1],B0:w[1][0],B1:w[1][1],C0:w[2][0],C1:w[2][1],D0:w[3][0],D1:w[3][1],E0:w[4][0],E1:w[4][1],
  tProb:wt('s2',0,'problema'),ad0:a.t0+.3,ad1:a.t1,keys:new Set(['deteccion','evaluacion','comprension','prevencion']),tTal:wt('s2',1,'talidomida'),t1968:wt('s2',1,'1968'),tUpp:wt('s2',1,'uppsala'),
  tPob:wt('s2',2,'poblacion'),tRare:wt('s2',2,'frecuentes'),tBtn:wt('s2',3,'certeza')-.7,tBas:wt('s2',3,'basta'),tSen:wt('s2',4,'senales'),tId:wt('s2',4,'identificar'),tFo:wt('s2',4,'fortalecer'),tDe:wt('s2',4,'decisiones')};
  const j=a.w.findIndex(x=>nm(x[0])==='ciencia');q.quote=[['La',a.w[j-1][1],a.w[j-1][2]],...a.w.slice(j)];
  X.font=F(600,21);let cx=110,cy=752;q.chips=[];for(const c of['Errores de medicación','Falta de eficacia','Interacciones','Calidad deficiente o falsificados','Uso indebido o abuso']){const ww=X.measureText(c).width+48;if(cx+ww>1010){cx=110;cy+=60}q.chips.push([c,cx,cy]);cx+=ww+14}
  const tot=FORM.reduce((n,f)=>n+f[1].length,0),t0=q.D0+.7,t1=q.tBtn-1,dt=(t1-t0)/tot;let acc=0;q.ft=FORM.map(f=>{const st=t0+acc*dt;acc+=f[1].length;return[st,dt]});q.sev=t1+.3;
  ev(s.t0-.1,'whoosh',.8);[q.B0,q.C0,q.D0,q.E0].forEach(x=>ev(x+.15,'whoosh',.35));q.chips.forEach((c,i)=>ev(q.tProb+i*.22,'blip',.35));[q.tTal,q.t1968,q.tUpp].forEach(x=>ev(x,'blip',.5));
  RARE.forEach((r,i)=>ev(q.tRare+i*.42,'blip',.3));FORM.forEach((f,i)=>{for(let c=0;c<f[1].length;c+=2)ev(q.ft[i][0]+c*q.ft[i][1],'type',.45)});ev(q.sev,'blip',.4);ev(q.tBtn,'blip',.7);ev(q.tBas,'chime',.7);
  ev(q.tSen,'blip',.7);[q.tId,q.tFo,q.tDe].forEach(x=>ev(x,'blip',.45))}
 {const s=SCN.s3,w=win('s3',[[0],[1],[2],[3],[4]],s.t0+1.8),q=Q.s3={A0:w[0][0],A1:w[0][1],B0:w[1][0],B1:w[1][1],C0:w[2][0],C1:w[2][1],D0:w[3][0],D1:w[3][1],E0:w[4][0],E1:w[4][1],
  keys:new Set(['identificar','evaluar','gestionar','prevenir']),tBom:wt('s3',1,'bomba'),tMon:wt('s3',1,'monitor'),tFal:wt('s3',1,'fallas'),tDet:wt('s3',2,'detectar'),tInv:wt('s3',2,'investigar'),tMed:wt('s3',2,'medidas'),
  tEv:wt('s3',3,'evento'),tIn:wt('s3',3,'incidente'),tSer:wt('s3',4,'serios'),t72:wt('s3',4,'horas'),tNo:wt('s3',4,'serios',1),tTri:wt('s3',4,'trimestral')};
  ev(s.t0-.1,'whoosh',.8);[q.B0,q.C0,q.D0,q.E0].forEach(x=>ev(x+.15,'whoosh',.35));for(let x=q.B0+.5;x<q.tFal-.2;x+=.83)ev(x,'beep',.45);ev(q.tFal,'alarm');
  [q.tDet,q.tInv,q.tMed,q.tEv,q.tIn,q.tSer,q.tNo].forEach(x=>ev(x,'blip',.5))}
 {const s=SCN.s4,[a,b,c,d]=s.sent,q=Q.s4={A0:s.t0+1.8,a0:a.t0,b0:b.t0,tProb:wt('s4',0,'problemas'),tInc:wt('s4',1,'incidentes'),tErup:wt('s4',2,'erupcion'),tBom:wt('s4',2,'bomba'),tAmb:d.t0};
  ev(s.t0-.1,'whoosh',.8);[q.a0,q.tProb,q.b0,q.tInc,q.tErup,q.tBom].forEach(x=>ev(x,'blip',.45));ev(q.tAmb,'chime',.8)}
 {const s=SCN.s5,w=win('s5',[[0],[1],[2],[3]],s.t0+1.8),q=Q.s5={A0:w[0][0],A1:w[0][1],B0:w[1][0],B1:w[1][1],C0:w[2][0],C1:w[2][1],D0:w[3][0],D1:w[3][1],a1:s.sent[0].t1,
  tApr:wt('s5',0,'aprendizaje'),tDiez:wt('s5',1,'diez'),tMit:wt('s5',1,'mitad'),tMed:wt('s5',1,'medicamentos'),tRet:wt('s5',2,'reto'),t50:wt('s5',2,'50'),tSis:wt('s5',3,'sistemas'),tVig:wt('s5',3,'vigilancia'),tCom:wt('s5',3,'comunicacion'),tCmp:wt('s5',3,'compromiso')};
  ev(s.t0-.1,'whoosh',.8);[q.B0,q.C0,q.D0].forEach(x=>ev(x+.15,'whoosh',.35));ev(q.tApr,'chime',.5);ev(q.tDiez,'blip',.6);ev(q.tRet,'blip',.5);ev(q.t50,'hit',.45);[q.tSis,q.tVig,q.tCom,q.tCmp].forEach(x=>ev(x,'blip',.4));ev(q.tCmp+.25,'hit',.5);ev(q.tCmp+.6,'chime',.6)}
 {const s=SCN.s6,w=win('s6',[[0],[1,2],[3],[4]],s.t0+1.8),q=Q.s6={A0:w[0][0],A1:w[0][1],B0:w[1][0],B1:w[1][1],C0:w[2][0],C1:w[2][1],D0:w[3][0],D1:w[3][1],
  tInv:wt('s6',0,'invima'),tMedi:wt('s6',0,'medicamentos'),tDisp:wt('s6',0,'dispositivos'),tMin:wt('s6',1,'ministerio'),tPre:wt('s6',1,'prestadores'),tProf:wt('s6',2,'profesional'),tDet:wt('s6',2,'detectar'),tNot:wt('s6',2,'notificar'),tGes:wt('s6',2,'gestionar'),
  n1:wt('s6',3,'4725'),n2:wt('s6',3,'1403'),n3:wt('s6',3,'4816'),n4:wt('s6',3,'780'),tIde:wt('s6',4,'identificacion'),tNoti:wt('s6',4,'notificacion'),tPro:wt('s6',4,'proteccion'),tMej:wt('s6',4,'mejoramiento')};
  ev(s.t0-.1,'whoosh',.8);[q.B0,q.C0,q.D0].forEach(x=>ev(x+.15,'whoosh',.35));[q.tInv,q.tMin,q.tPre,q.tProf,q.n1,q.n2,q.n3,q.n4,q.tIde,q.tNoti,q.tPro,q.tMej].forEach(x=>ev(x,'blip',.45))}
 {const s=SCN.s7,[a,b,c]=s.sent,q=Q.s7={b0:b.t0,c0:c.t0,c1:c.t1,tPro:wt('s7',0,'proteger'),tDet:wt('s7',1,'detectar'),tNot:wt('s7',1,'notificar'),tPrev:wt('s7',1,'prevenir'),tIns:wt('s7',1,'insegura'),tCal:wt('s7',1,'calidad')};
  q.src0=Math.min(q.c1+5.6,s.t1-4.3);ev(s.t0-.1,'whoosh',.6);[q.tDet,q.tNot,q.tPrev].forEach(x=>ev(x,'blip',.5));ev(q.tCal,'chime',.6);ev(q.c1+.35,'boom',.9);ev(q.src0,'whoosh',.3)}
 EVENTS.sort((a,b)=>a.t-b.t);
 window.PREVIEW=[1.5,5.5,Q.s1.rie+.6,Q.s1.resp+.9,Q.s1.end+1.8,SCN.s2.t0+1,Q.s2.tProb+1,Q.s2.ad0+7.5,Q.s2.tUpp+.8,Q.s2.tRare+2.2,Q.s2.tBas+.5,Q.s2.tDe+.8,Q.s3.A0+5,Q.s3.tFal+.6,Q.s3.tMed+.6,Q.s3.tIn+1.2,
  Q.s3.tTri+.8,Q.s4.tBom+1,Q.s4.tAmb+1.6,Q.s5.tApr+.6,Q.s5.tMed+.9,Q.s5.t50+1,Q.s5.tCmp+1.3,Q.s6.tDisp+.8,Q.s6.tGes+.4,Q.s6.n4+.9,Q.s6.tMej+.6,Q.s7.tPro+.6,Q.s7.tCal+.9,Q.s7.c1-.2,Q.s7.c1+3.2,Q.s7.src0+2].map(x=>+x.toFixed(2));
 Object.assign(window,{EVENTS,MISS,DUR:TL.dur,renderFrame,READY:true});
})();
