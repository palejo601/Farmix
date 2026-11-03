'use strict';
// Escena 1: introducción cinematográfica (ECG, pasillo hospitalario, medicamentos y dispositivos, título)
const PPL=[{x:-.85,z:21,v:-.35,c:'#F2F6FA',ph:0},{x:.75,z:27,v:.25,c:'#4E9CC4',ph:1},{x:1.55,z:14,v:0,c:'#F2F6FA',ph:2},{x:-1.5,z:31,v:0,c:'#7FB9D6',ph:3}];
const HUD=[{x:-1.2,y:-.35,z:8,d:hudVitals},{x:1.35,y:-.1,z:11,d:hudRecord}];
function corridor(lt){const zc=lt*.62,f=880,cx=W/2+Math.sin(lt*.33)*16,cy=H*.47,hw=2.4,fl=1.45,ce=-1.7,zn=zc+.12,zf=zc+48,fog=z=>cl(1-(z-zc)/34);
 const P=(x,y,z)=>{const d=Math.max(z-zc,.05);return[cx+f*x/d,cy+f*y/d]};
 const poly=(pts,fill)=>{X.beginPath();pts.forEach((p,i)=>i?X.lineTo(p[0],p[1]):X.moveTo(p[0],p[1]));X.closePath();X.fillStyle=fill;X.fill()};
 A(1);X.fillStyle='#E4EEF6';X.fillRect(0,0,W,H);const f0=P(-hw,ce,zf),f1=P(hw,ce,zf),f2=P(hw,fl,zf),f3=P(-hw,fl,zf);
 let g=X.createLinearGradient(0,0,0,f0[1]);g.addColorStop(0,'#AFC4D8');g.addColorStop(1,'#E9F2F9');poly([P(-hw,ce,zn),P(hw,ce,zn),f1,f0],g);
 g=X.createLinearGradient(0,H,0,f3[1]);g.addColorStop(0,'#5E7896');g.addColorStop(.55,'#9DB3C9');g.addColorStop(1,'#E2ECF5');poly([P(-hw,fl,zn),P(hw,fl,zn),f2,f3],g);
 g=X.createLinearGradient(0,0,f0[0],0);g.addColorStop(0,'#86A0BA');g.addColorStop(1,'#E2ECF5');poly([P(-hw,ce,zn),f0,f3,P(-hw,fl,zn)],g);
 g=X.createLinearGradient(W,0,f1[0],0);g.addColorStop(0,'#8CA5BE');g.addColorStop(1,'#E2ECF5');poly([P(hw,ce,zn),f1,f2,P(hw,fl,zn)],g);
 const ew=f1[0]-f0[0];A(1);X.fillStyle='#F7FBFF';X.fillRect(f0[0],f0[1],ew,f3[1]-f0[1]);glow((f0[0]+f1[0])/2,(f0[1]+f3[1])/2,ew*2.2,.9);
 for(const sx of[-1,1]){g=X.createLinearGradient(sx<0?0:W,0,sx<0?f0[0]:f1[0],0);g.addColorStop(0,'rgba(31,111,178,.75)');g.addColorStop(1,'rgba(31,111,178,0)');A(1);poly([P(sx*hw,.12,zn),P(sx*hw,.12,zf),P(sx*hw,.3,zf),P(sx*hw,.3,zn)],g)}
 const z0=Math.ceil(zc/1.6)*1.6;X.strokeStyle='#FFFFFF';X.lineWidth=1.2;
 for(let z=z0+1.6*20;z>zc+.15;z-=1.6){const fo=fog(z);if(fo<=0)continue;const k=Math.round(z/1.6),a=P(-hw,fl,z),b=P(hw,fl,z);A(.25*fo);X.beginPath();X.moveTo(a[0],a[1]);X.lineTo(b[0],b[1]);X.stroke();
  if(k%2===0){A(fo);poly([P(-.75,ce,z),P(.75,ce,z),P(.75,ce,z+1.2),P(-.75,ce,z+1.2)],'#FFFFFF');A(.25*fo);poly([P(-.6,fl,z+.05),P(.6,fl,z+.05),P(.6,fl,z+1.1),P(-.6,fl,z+1.1)],'#FFFFFF')}
  if(k%4===1||k%4===3){const sx=k%4===1?-1:1;A(.9*fo);poly([P(sx*hw,fl,z),P(sx*hw,-.62,z),P(sx*hw,-.62,z+1.25),P(sx*hw,fl,z+1.25)],'#7F98B2');poly([P(sx*hw,-.4,z+.35),P(sx*hw,.05,z+.35),P(sx*hw,.05,z+.9),P(sx*hw,-.4,z+.9)],'#CFE6F6')}}
 X.strokeStyle='#F4F8FB';X.lineWidth=4;for(const sx of[-1,1]){const a=P(sx*hw*.985,.42,zn+.1),b=P(sx*hw*.985,.42,zf);A(.75);X.beginPath();X.moveTo(a[0],a[1]);X.lineTo(b[0],b[1]);X.stroke()}
 PPL.map(p=>({p,z:p.z+p.v*lt})).sort((a,b)=>b.z-a.z).forEach(({p,z})=>{if(z-zc<1.5)return;const a=P(p.x,fl,z);human(a[0],a[1],a[1]-P(p.x,fl-1.72,z)[1],p.c,fog(z)*.92,lt*6+p.ph)});
 for(const h of HUD){const d=h.z-zc;if(d<.6)continue;const p=P(h.x,h.y,h.z),sc=5/d;grp(cl((d-.6)/1.2)*fog(h.z),()=>{X.translate(p[0],p[1]);X.scale(sc,sc);h.d(lt)})}}
const CAPS=[[760,560,.9,0,-.5,.05],[330,330,1.1,1,.6,-.04],[540,770,.62,2,-.2,.06],[980,250,1.45,3,0,0],[200,640,1.5,0,1.1,.03],[620,180,1.3,2,.3,-.05],[1080,700,1.2,1,-.9,.04],[420,520,.75,3,.2,0],[880,420,1.7,0,.8,-.03],[140,250,.55,1,-.4,.05],[1120,520,1.6,2,1.4,.04],[300,880,.95,3,0,0]].sort((a,b)=>b[2]-a[2]);
function medShot(t,q){const lt=t-q.med0,z=1+lt*.008;X.translate(W/2,H/2);X.scale(z,z);X.translate(-W/2,-H/2);glow(620,500,560,.35,C.blue);
 monitor(1190,330,.92,t,{});
 for(const [x,y,d,ty,r0,vr] of CAPS){const s=.9/d,bl=d>1.25?2:d<.65?1:0,sp=SPR[ty][bl],px=x-lt*14/d,py=y+Math.sin(lt*.6+x)*8/d;X.save();X.translate(px,py);X.rotate(r0+vr*lt);X.scale(s,s);A(lr(1,.55,cl((d-1)/.7)));X.drawImage(sp,-sp.width/2,-sp.height/2);X.restore()}
 const kb=eo(pr(t,q.ben-.1,q.ben+.45)),kr=eo(pr(t,q.rie-.1,q.rie+.45));
 if(kb>0)grp(kb,()=>pill(250,230,'Beneficio terapéutico',{ic:'check',ic_c:C.mint,fill:'rgba(60,197,154,.18)',stroke:'rgba(123,224,184,.7)',f:F(600,24),h:52}));
 if(kr>0){const rx=760-lt*14/.9,pu=((t-q.rie)*.7)%1;A(kr*(1-pu)*.8);X.strokeStyle=C.amber;X.lineWidth=3;X.beginPath();X.arc(rx,560,130+pu*60,0,TAU);X.stroke();grp(kr,()=>pill(rx-120,700,'Riesgo potencial',{ic:'warn',ic_c:C.amber,fill:'rgba(255,181,71,.16)',stroke:'rgba(255,181,71,.7)',f:F(600,24),h:52}))}}
function netShot(t,q){const xs=[560,960,1360],y=440,lab=['IDENTIFICAR','EVALUAR','PREVENIR'],ic=['search','chart','shield'];
 const k0=eo(pr(t,q.w3[0],q.w3[2]+.4));A(.6);X.strokeStyle=C.sky;X.lineWidth=2;X.beginPath();X.moveTo(xs[0],y);X.lineTo(lr(xs[0],xs[2],k0),y);X.stroke();
 const kr=pr(t,q.resp-.2,q.resp+.8);
 if(kr>0){const IC=['user','users','pill','dev','hosp','build','user','shield'];for(let i=0;i<8;i++){const an=-PI/2+(i+.5)*TAU/8+(t-q.resp)*.05,px=960+Math.cos(an)*640,py=440+Math.sin(an)*300,ki=eo(cl(kr*1.6-i*.08));
  A(ki*.35);X.strokeStyle=C.ice;X.lineWidth=1.5;X.setLineDash([4,8]);X.beginPath();X.moveTo(px,py);X.lineTo(960+Math.cos(an)*230,440+Math.sin(an)*130);X.stroke();X.setLineDash([]);node(px,py,34,IC[i],C.ice,ki)}
  T('RESPONSABILIDAD COMPARTIDA',960,850,F(600,26),C.ice,'center',eo(kr),6)}
 xs.forEach((x,i)=>{const k=pr(t,q.w3[i]-.15,q.w3[i]+.35);node(x,y,80,ic[i],i==2?C.mint:C.ice,k,{glow:1});if(k>0)T(lab[i],x,y+140,FD(700,40),C.white,'center',eo(k),6)})}
function titleShot(t,q){glow(960,500,700,.35*eo(pr(t,q.tf-.4,q.tf+1)),C.blue);
 const k=eo(pr(t,q.tf-.6,q.tf+2.2)),P=[];for(let x=0;x<=W*k;x+=4)P.push([x,862+38*ecgY(((x+t*60)/W*5)%1)]);if(P.length>1)gline(P,C.mint,2,.5);
 T('DOCUMENTAL EDUCATIVO · SEGURIDAD DEL PACIENTE',960,300,F(600,20),C.sky,'center',eo(pr(t,q.tf-.3,q.tf+.6))*.9,7);
 const k1=eo(pr(t,q.tf-.08,q.tf+1.1)),k2=eo(pr(t,q.tt-.08,q.tt+1.1)),gr=X.createLinearGradient(0,350,0,600);gr.addColorStop(0,'#FFFFFF');gr.addColorStop(1,'#BFE3F7');
 T('FARMACOVIGILANCIA',960,lr(470,452,k1),FD(800,124),gr,'center',k1,lr(26,5,k1));T('Y TECNOVIGILANCIA',960,lr(600,582,k2),FD(800,124),gr,'center',k2,lr(26,5,k2));
 const k3=eo(pr(t,q.end+.1,q.end+1)),k4=eo(pr(t,q.end+.6,q.end+1.6)),w=520*k3;A(k3*.8);const lg=X.createLinearGradient(700,0,1220,0);lg.addColorStop(0,'rgba(95,179,232,0)');lg.addColorStop(.5,C.sky);lg.addColorStop(1,'rgba(95,179,232,0)');X.fillStyle=lg;X.fillRect(960-w/2,640,w,2);
 T('PROTEGIENDO LA VIDA A TRAVÉS DE LA SEGURIDAD DEL PACIENTE',960,704,FD(600,34),C.ice,'center',k3,5);
 T('Vigilancia, prevención y gestión de riesgos asociados a medicamentos y dispositivos médicos',960,760,F(400,27),C.white,'center',k4*.78)}
function S1(t,s){const q=Q.s1;
 grp(fade(t,-1,q.cor0+.9,.9),()=>{A(1);X.fillStyle='#010710';X.fillRect(0,0,W,H);const hx=W*eo(pr(t,q.ecg0,q.ecg1)),P=[];for(let x=0;x<=hx;x+=3)P.push([x,540+150*ecgY((x/W*3.2)%1)]);if(P.length>1){gline(P,'#6EE7C8',2.6);glow(hx,P[P.length-1][1],40,.9,'#6EE7C8')}});
 grp(fade(t,q.cor0,q.cor1,.9),()=>corridor(t-q.cor0+1.2));
 grp(fade(t,q.med0,q.med1,.7),()=>medShot(t,q));
 grp(fade(t,q.net0,q.net1,.6),()=>netShot(t,q));
 grp(fade(t,q.tit0,s.t1+.45,.6),()=>titleShot(t,q))}
