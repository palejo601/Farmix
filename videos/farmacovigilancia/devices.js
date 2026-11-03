'use strict';
// Dispositivos médicos genéricos (sin marcas): monitor multiparámetro, bomba de infusión, línea IV; siluetas y paneles HUD
function monitor(x,y,sc,t,o={}){X.save();X.translate(x,y);X.scale(sc,sc);A(1);
 let g=X.createLinearGradient(0,0,0,440);g.addColorStop(0,'#2C3846');g.addColorStop(1,'#121922');X.fillStyle=g;X.beginPath();X.roundRect(0,0,640,440,26);X.fill();X.strokeStyle='rgba(168,216,240,.35)';X.lineWidth=2;X.stroke();
 X.fillStyle='#02070D';X.beginPath();X.roundRect(22,22,596,356,10);X.fill();
 const al=o.alarm&&Math.floor(t*2.5)%2===0;X.fillStyle=o.alarm?(al?'#C2412D':'#5A1C14'):'#0C1A29';X.beginPath();X.roundRect(22,22,596,32,[10,10,0,0]);X.fill();
 T(o.alarm?'ALARMA TÉCNICA':'CAMA 12 · ADULTO',38,44,F(600,15),o.alarm?'#FFE1D6':'#9FB3C8');T('10:42',604,44,F(500,15),'#9FB3C8','right');
 const sw=(t*130)%380,X0=38,WW=380;
 const row=(yc,amp,fn,col,lab)=>{T(lab,X0,yc-amp-8,F(600,13),col);let P=[];for(let i=0;i<=WW;i+=3){if(i>sw&&i<sw+18){if(P.length>1)gline(P,col,1.6);P=[];continue}const age=i<=sw?(sw-i)/130:(sw+WW-i)/130;P.push([X0+i,yc-amp*fn(t-age)])}if(P.length>1)gline(P,col,1.6);A(1)};
 row(122,40,s=>-ecgY((s*1.2)%1)*.9,'#3DE37E','II');row(222,28,s=>pleth(((s*1.2)%1+1)%1),'#4FD2F0','Pleth');row(312,18,s=>Math.sin(s*TAU*.28),'#F2D44A','Resp');
 T('FC',446,84,F(600,15),'#3DE37E');T('lpm',604,84,F(500,13),'#3DE37E','right');T('72',604,150,FD(700,66),'#3DE37E','right');
 T('SpO₂',446,184,F(600,15),'#4FD2F0');T('%',604,184,F(500,13),'#4FD2F0','right');T('98',604,246,FD(700,60),'#4FD2F0','right');
 T('PANI',446,276,F(600,15),'#E8EEF4');T('120/80',604,318,FD(600,38),'#E8EEF4','right');T('FR 16',446,358,F(600,18),'#F2D44A');T('T 36,8 °C',604,358,F(500,16),'#E8EEF4','right');
 A(1);X.fillStyle='#3DE37E';X.beginPath();X.arc(44,410,5,0,TAU);X.fill();X.fillStyle='#2A3442';for(let i=0;i<4;i++){X.beginPath();X.roundRect(430+i*48,396,38,24,6);X.fill()}X.restore()}
function pump(x,y,sc,t,alarm){X.save();X.translate(x,y);X.scale(sc,sc);A(1);
 let g=X.createLinearGradient(0,0,360,0);g.addColorStop(0,'#F3F6F9');g.addColorStop(1,'#C5D0DB');X.fillStyle=g;X.beginPath();X.roundRect(0,0,360,470,30);X.fill();X.strokeStyle='rgba(255,255,255,.7)';X.lineWidth=2;X.stroke();
 X.fillStyle='rgba(20,40,60,.10)';X.beginPath();X.roundRect(300,30,40,410,14);X.fill();
 const bl=alarm&&Math.floor(t*3)%2===0;X.fillStyle=alarm?(bl?'#FF5A48':'#6B2019'):'#3CC59A';X.beginPath();X.roundRect(110,-12,140,16,8);X.fill();if(bl){glow(180,-4,110,.75,'#FF5A48');A(1)}
 X.fillStyle=alarm?(bl?'#3A0D0B':'#1A0807'):'#0A1726';X.beginPath();X.roundRect(26,30,262,196,14);X.fill();
 if(!alarm){T('● INFUNDIENDO',46,64,F(600,15),'#7BE0B8');T('125',46,152,FD(700,84),'#7BE0B8');T('mL/h',204,152,F(500,24),'#7BE0B8');T('Infundido   240 mL',46,186,F(500,16),'#9FB3C8');T('Volumen total   500 mL',46,210,F(500,16),'#9FB3C8');
  const dy=t*1.4%1;A(1-dy);X.fillStyle='#7BE0B8';X.beginPath();X.arc(262,56+dy*20,4,0,TAU);X.fill();A(1)}
 else{ico('warn',70,96,44,'#FF8A78',3.5);T('ALARMA',100,110,FD(800,38),'#FF8A78');T('OCLUSIÓN DISTAL',46,170,F(700,24),'#FFD7CF');T('Verifique la línea de infusión',46,202,F(500,15),'#FFB4A8')}
 const lab=[['▲','▼','OK'],['MENÚ','PAUSA','SILENCIO']];X.lineWidth=1.5;
 for(let r=0;r<2;r++)for(let c=0;c<3;c++){A(1);X.fillStyle='#E3E9EF';X.strokeStyle='#AEBBC8';X.beginPath();X.roundRect(26+c*90,248+r*58,80,46,10);X.fill();X.stroke();T(lab[r][c],66+c*90,277+r*58,F(600,r?12:18),'#3E5368','center')}
 A(1);X.fillStyle='#2FAF7E';X.beginPath();X.roundRect(26,380,128,56,14);X.fill();T('INICIAR',90,415,F(700,16),'#FFFFFF','center');
 A(1);X.fillStyle='#E59A2F';X.beginPath();X.roundRect(164,380,124,56,14);X.fill();T('DETENER',226,415,F(700,16),'#FFFFFF','center');X.restore()}
function ivset(x,y,sc,t){X.save();X.translate(x,y);X.scale(sc,sc);A(1);X.fillStyle='#8E9DAC';X.fillRect(173,-560,14,1250);X.fillRect(120,-560,120,8);
 X.fillStyle='rgba(225,240,252,.30)';X.strokeStyle='rgba(255,255,255,.75)';X.lineWidth=2.5;X.beginPath();X.roundRect(110,-530,140,220,[18,18,40,40]);X.fill();X.stroke();
 X.fillStyle='rgba(150,205,240,.38)';X.beginPath();X.roundRect(114,-470,132,156,[4,4,38,38]);X.fill();X.fillStyle='rgba(255,255,255,.85)';X.fillRect(140,-500,80,40);T('NaCl 0,9 %',180,-474,F(700,13),'#2D4A66','center');
 A(1);X.fillStyle='rgba(225,240,252,.35)';X.strokeStyle='rgba(255,255,255,.75)';X.beginPath();X.roundRect(166,-300,28,70,8);X.fill();X.stroke();
 X.fillStyle='#BFE6FA';X.beginPath();X.arc(180,-292+(t*1.25%1)*48,4,0,TAU);X.fill();X.restore()}
function tube(x,y,sc){X.save();X.translate(x,y);X.scale(sc,sc);A(.9);X.strokeStyle='rgba(235,247,255,.85)';X.lineWidth=5;X.beginPath();X.moveTo(180,-230);X.bezierCurveTo(180,-120,320,-110,320,10);X.lineTo(320,470);X.bezierCurveTo(320,560,250,600,150,640);X.stroke();X.restore()}
function pumpWire(x,y,s){X.save();X.translate(x,y);X.scale(s,s);A(.28);X.strokeStyle=C.ice;X.lineWidth=2/s;X.beginPath();X.roundRect(0,0,360,470,30);X.roundRect(26,30,262,196,14);X.roundRect(300,30,40,410,14);for(let r=0;r<2;r++)for(let c=0;c<3;c++)X.roundRect(26+c*90,248+r*58,80,46,10);X.roundRect(26,380,128,56,14);X.roundRect(164,380,124,56,14);X.stroke();
 A(.2);X.setLineDash([6,6]);X.beginPath();X.moveTo(-30,0);X.lineTo(-30,470);X.moveTo(0,500);X.lineTo(360,500);X.stroke();X.setLineDash([]);X.restore()}
function monWire(x,y,s){X.save();X.translate(x,y);X.scale(s,s);A(.28);X.strokeStyle=C.ice;X.lineWidth=2/s;X.beginPath();X.roundRect(0,0,640,440,26);X.roundRect(22,22,596,356,10);X.moveTo(22,54);X.lineTo(618,54);X.moveTo(430,54);X.lineTo(430,378);X.stroke();
 A(.35);X.beginPath();for(let i=0;i<=380;i+=4){const y=118+40*ecgY((i/380*2.5)%1);i?X.lineTo(38+i,y):X.moveTo(38,y)}X.stroke();X.restore()}
// silueta de personal sanitario a distancia (pasillo)
function human(x,yf,h,coat,a,ph){if(a<=0)return;const bob=Math.sin(ph)*h*.006;A(a);X.fillStyle='#3B5068';const lw=h*.075;X.beginPath();X.roundRect(x-h*.085,yf-h*.42,lw,h*.42,lw/2);X.roundRect(x+h*.01,yf-h*.42,lw,h*.42,lw/2);X.fill();
 X.fillStyle=coat;X.beginPath();X.moveTo(x-h*.12,yf-h*.8+bob);X.quadraticCurveTo(x,yf-h*.84+bob,x+h*.12,yf-h*.8+bob);X.lineTo(x+h*.145,yf-h*.36);X.lineTo(x-h*.145,yf-h*.36);X.closePath();X.fill();
 X.fillStyle='#4A5D72';X.beginPath();X.ellipse(x,yf-h*.9+bob,h*.055,h*.065,0,0,TAU);X.fill()}
function hudVitals(lt){card(-230,-130,460,260,{fill:'rgba(8,36,66,.66)',stroke:'rgba(168,216,240,.6)',r:16});T('PACIENTE · CAMA 12',-200,-92,F(600,18),C.ice,'left',1,2);
 const P=[];for(let x=0;x<=400;x+=4)P.push([-200+x,-30+26*ecgY((x/400*2.2+lt*1.2)%1)]);gline(P,'#6EE7C8',2);
 T('FC',-200,40,F(600,16),'#6EE7C8');T('72',-200,88,FD(700,46),'#6EE7C8');T('SpO₂',-60,40,F(600,16),'#7FD4F5');T('98%',-60,88,FD(700,46),'#7FD4F5');T('PA',80,40,F(600,16),C.white);T('120/80',80,88,FD(700,40),C.white)}
function hudRecord(){card(-230,-150,460,300,{fill:'rgba(8,36,66,.66)',stroke:'rgba(168,216,240,.6)',r:16});A(1);ico('doc',-196,-108,30,C.ice,2.5);T('HISTORIA CLÍNICA',-170,-100,F(700,20),C.white,'left',1,2);
 [['Medicación actual','3 medicamentos'],['Alergias','No conocidas'],['Dispositivos','Bomba de infusión'],['Última valoración','08:30']].forEach((r,i)=>{T(r[0],-200,-50+i*52,F(500,17),C.ice,'left',.85);T(r[1],200,-50+i*52,F(600,18),C.white,'right');A(.2);X.fillStyle=C.ice;X.fillRect(-200,-36+i*52,400,1)})}
