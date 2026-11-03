'use strict';
// Tiempos de cada plano (sincronizados con la voz) y eventos de sonido
(function(){
 const W4=(id,g)=>{const w=win(id,g,SCN[id].t0+1.8),o={};'ABCDE'.split('').slice(0,w.length).forEach((L,i)=>{o[L+'0']=w[i][0];o[L+'1']=w[i][1]});return o};
 const SW=(q,n)=>{ev(SCN[n].t0-.1,'whoosh',.8);['B0','C0','D0'].forEach(k=>q[k]&&ev(q[k]+.15,'whoosh',.35))};
 {const s=SCN.s1,[a,b,c,d]=s.sent,q=Q.s1={tub0:2.4,lab0:b.t0-.4,sto0:c.t0-.35,tit0:d.t0-.3,tPro:wt('s1',1,'proceso'),tRea:wt('s1',1,'reactivos'),w3:[wt('s1',2,'seguridad'),wt('s1',2,'calidad'),wt('s1',2,'desempeno')],tR:wt('s1',3,'reactivovigilancia'),end:d.t1};
  ev(.3,'whoosh',.5);ev(2.4,'hit',.45);ev(q.lab0+.2,'whoosh',.5);for(let x=q.lab0+.6;x<q.sto0-.3;x+=.45)ev(x,'type',.22);ev(q.tPro,'blip',.4);ev(q.tRea,'blip',.5);ev(q.sto0+.2,'whoosh',.45);q.w3.forEach(x=>ev(x,'blip',.5));ev(q.tR-2.2,'riser');ev(q.tR,'boom')}
 {const q=Q.s2=Object.assign(W4('s2',[[0],[1],[2]]),{keys:new Set(['identificar','evaluar','gestionar']),tFal:wt('s2',1,'fallas'),tCal:wt('s2',1,'calidad'),tSeg:wt('s2',1,'seguridad'),tDes:wt('s2',1,'desempeno'),tIde:wt('s2',2,'identificacion'),tCua:wt('s2',2,'cualificacion'),tGes:wt('s2',2,'gestion'),tEfe:wt('s2',2,'efectos')});
  SW(q,'s2');ev(q.A0+2.5,'chime',.35);ev(q.A0+3.6,'chime',.35);[q.tCal,q.tSeg,q.tDes,q.tIde,q.tCua,q.tGes].forEach(x=>ev(x,'blip',.45));ev(q.tFal,'blip',.7);ev(q.tEfe,'blip',.5)}
 {const q=Q.s3=Object.assign(W4('s3',[[0],[1],[2],[3]]),{keys:new Set(['muestras','fisiologicos','patologicos','clinicas']),tMue:wt('s3',0,'muestras'),tFis:wt('s3',0,'fisiologicos'),tPat:wt('s3',0,'patologicos'),tCon:wt('s3',0,'condiciones'),
  tRe:wt('s3',1,'reactivos'),tCal:wt('s3',1,'calibradores'),tCon2:wt('s3',1,'materiales'),tGlu:wt('s3',1,'glucosa'),tHem:wt('s3',1,'hemoglobina'),tAnt:wt('s3',1,'anticuerpos'),tAg:wt('s3',1,'antigenos'),
  tBio:wt('s3',2,'bioquimica'),tHema:wt('s3',2,'hematologia'),tInm:wt('s3',2,'inmunologia'),tMic:wt('s3',2,'microbiologia'),tAlt:wt('s3',3,'alteracion'),tExa:wt('s3',3,'exactitud'),tDec:wt('s3',3,'decisiones')});
  SW(q,'s3');[q.tFis,q.tPat,q.tCon,q.tRe,q.tCal,q.tCon2,q.tGlu,q.tHem,q.tAnt,q.tAg,q.tBio,q.tHema,q.tInm,q.tMic].forEach(x=>ev(x,'blip',.4));ev(q.tExa,'blip',.6);ev(q.tDec,'alarm',.4)}
 {const q=Q.s4=Object.assign(W4('s4',[[0],[1],[2],[3]]),{tAlm:wt('s4',0,'almacenamiento'),tDis:wt('s4',0,'distribucion'),tUti:wt('s4',0,'utilizacion'),tFN:wt('s4',2,'negativos'),tFP:wt('s4',2,'positivos'),tSen:wt('s4',2,'sensibilidad'),tEsp:wt('s4',2,'especificidad'),tDet:wt('s4',3,'deteccion'),tNot:wt('s4',3,'notificacion'),tVig:wt('s4',3,'vigilancia')});
  q.hot=[wt('s4',1,'contaminacion'),wt('s4',1,'composicion'),wt('s4',1,'estabilidad'),0,0,0,0,wt('s4',1,'desempeno'),0,0];
  SW(q,'s4');[q.tAlm,q.tDis,q.tUti,q.tFN,q.tFP,q.tDet,q.tNot].forEach(x=>ev(x,'blip',.45));q.hot.forEach((h,i)=>ev(h||q.B0+.3+i*.55,'blip',h?.6:.3));ev(q.tVig,'chime',.6)}
 {const q=Q.s5=Object.assign(W4('s5',[[0],[1],[2]]),{tInc:wt('s5',0,'incorrecto'),tDia:wt('s5',0,'diagnosticos'),tRet:wt('s5',0,'retrasos'),tInt:wt('s5',0,'intervenciones'),tRec:wt('s5',1,'reconocer'),tInv:wt('s5',1,'investigar'),tAcc:wt('s5',1,'acciones'),tLab:wt('s5',2,'laboratorio'),tSeg:wt('s5',2,'seguridad')});
  SW(q,'s5');[q.tInc,q.tDia,q.tRet,q.tInt,q.tInv,q.tLab].forEach(x=>ev(x,'blip',.45));ev(q.tRec,'alarm',.6);ev(q.tAcc,'chime',.5);ev(q.tSeg,'chime',.7)}
 {const s=SCN.s6,q=Q.s6={A0:s.t0+1.8,st:[wt('s6',0,'falla'),wt('s6',1,'suspende'),wt('s6',1,'aisla'),wt('s6',1,'verifican'),wt('s6',2,'documentacion'),wt('s6',2,'evaluacion'),wt('s6',2,'notificacion'),wt('s6',3,'medidas'),wt('s6',3,'seguimiento')]};
  q.hl=q.st.map((x,i)=>[i,x]).concat([[5,wt('s6',3,'investigan')]]);ev(s.t0-.1,'whoosh',.8);q.st.forEach(x=>ev(x,'blip',.55));ev(q.st[8]+.3,'chime',.5)}
 {const q=Q.s7=Object.assign(W4('s7',[[0],[1],[2],[3]]),{tInv:wt('s7',0,'invima'),tIns:wt('s7',0,'inspeccion'),tVig:wt('s7',0,'vigilancia'),tCon:wt('s7',0,'control'),ch:['fabricacion','importacion','almacenamiento','comercializacion','utilizacion'].map(w=>wt('s7',1,w)),tLv:wt('s7',1,'proteger'),
  n:['3770','132','3100','7532'].map(w=>wt('s7',2,w)),tInm:wt('s7',3,'inmediatos'),tCin:wt('s7',3,'cinco'),tTri:wt('s7',3,'trimestrales')});
  SW(q,'s7');[q.tInv,q.tIns,q.tVig,q.tCon,...q.ch,...q.n,q.tInm,q.tTri].forEach(x=>ev(x,'blip',.45))}
 {const s=SCN.s8,q=Q.s8={A0:s.t0+1.8,d:['identificacion','conservacion','verificacion','notificacion'].map(w=>wt('s8',1,w))};ev(s.t0-.1,'whoosh',.8);ROLES.forEach((r,i)=>ev(q.A0+.4+i*.35,'blip',.35));q.d.forEach(x=>ev(x,'blip',.5))}
 {const s=SCN.s9,[a,b,c,d]=s.sent,q=Q.s9={b0:b.t0,c0:c.t0,C0:c.t0-.35,d0:d.t0,d1:d.t1,w4:['seleccion','conservacion','utilizacion','vigilancia'].map(w=>wt('s9',1,w)),tDet:wt('s9',2,'deteccion'),tPrv:wt('s9',2,'prevencion'),tMej:wt('s9',2,'mejora')};
  q.src0=Math.min(q.d1+5.6,s.t1-4.3);ev(s.t0-.1,'whoosh',.6);[...q.w4,q.tDet,q.tPrv].forEach(x=>ev(x,'blip',.45));ev(q.tMej,'chime',.6);ev(q.d1+.35,'boom',.9);ev(q.src0,'whoosh',.3)}
 EVENTS.sort((a,b)=>a.t-b.t);
 window.PREVIEW=[1.6,6,Q.s1.tRea+.8,Q.s1.w3[2]+.6,Q.s1.end+1.8,SCN.s2.t0+1,Q.s2.A0+4,Q.s2.tDes+.8,Q.s2.tEfe+1.2,Q.s3.tCon+.6,Q.s3.tAg+.6,Q.s3.tMic+1,Q.s3.tDec+.8,Q.s4.tUti+.6,Q.s4.B0+6,Q.s4.tFP+.6,
  Q.s4.tVig+.5,Q.s5.tInt+.6,Q.s5.tAcc+2.2,Q.s5.tSeg+.8,Q.s6.st[4]+.5,Q.s6.st[8]+1,Q.s7.tCon+.6,Q.s7.tLv+1.8,Q.s7.n[3]+.8,Q.s7.tTri+.8,Q.s8.d[3]+.6,Q.s9.w4[3]+.5,Q.s9.tMej+.8,Q.s9.d1-.3,Q.s9.d1+3.2,Q.s9.src0+2].map(x=>+x.toFixed(2));
 Object.assign(window,{EVENTS,MISS,DUR:TL.dur,renderFrame,READY:true});
})();
