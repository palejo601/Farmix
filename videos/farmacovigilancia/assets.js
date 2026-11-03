'use strict';
// Recursos pre-renderizados: cuerpo humano (ADME), cápsulas, capas del "queso suizo", mapa de Colombia y globo
const BODY=(()=>{const c=document.createElement('canvas');c.width=560;c.height=900;const b=c.getContext('2d');b.translate(280,430);
 const R=[[28,-232],[40,-212,110,-214,150,-196],[185,-182,196,-150,198,-110],[204,-40,212,40,214,110],[216,170,222,230,226,290],[230,320,218,345,204,342],[194,330,192,310,192,290],[186,220,178,150,172,90],[166,20,158,-50,140,-98],[136,-40,126,20,120,80],[118,130,140,170,146,230],[150,290,140,360,128,430],[0,430]];
 const seg=[];let cur=[26,-262];for(const s of R){if(s.length===2){seg.push(['L',cur,s]);cur=s}else{seg.push(['C',cur,[s[0],s[1]],[s[2],s[3]],[s[4],s[5]]]);cur=[s[4],s[5]]}}
 const p=new Path2D();p.moveTo(26,-262);for(const s of seg)s[0]==='L'?p.lineTo(...s[2]):p.bezierCurveTo(...s[2],...s[3],...s[4]);
 const m=q=>[-q[0],q[1]];for(let i=seg.length-1;i>=0;i--){const s=seg[i];s[0]==='L'?p.lineTo(...m(s[1])):p.bezierCurveTo(...m(s[3]),...m(s[2]),...m(s[1]))}p.closePath();
 p.moveTo(58,-330);p.ellipse(0,-330,58,72,0,0,TAU);
 let g=b.createRadialGradient(0,-80,20,0,-40,460);g.addColorStop(0,'rgba(95,179,232,.26)');g.addColorStop(1,'rgba(95,179,232,.06)');b.fillStyle=g;b.fill(p);
 for(const [lw,a] of [[12,.06],[5,.14],[2.2,.85]]){b.strokeStyle=`rgba(168,216,240,${a})`;b.lineWidth=lw;b.stroke(p)}
 b.strokeStyle='rgba(168,216,240,.12)';b.lineWidth=2;for(let i=0;i<6;i++){b.beginPath();b.ellipse(0,-145+i*24,92-i*3,34,0,PI*1.08,PI*1.92);b.stroke()}
 b.setLineDash([3,6]);b.beginPath();b.moveTo(0,-240);b.lineTo(0,160);b.stroke();b.setLineDash([]);
 b.globalCompositeOperation='destination-in';g=b.createLinearGradient(0,180,0,430);g.addColorStop(0,'#000');g.addColorStop(1,'rgba(0,0,0,0)');b.fillStyle=g;b.fillRect(-280,-430,560,900);return c})();
const ORG={liver:new Path2D('M-112 -48 C-80 -70 0 -62 18 -50 C10 -25 -40 -6 -70 2 C-100 8 -118 -20 -112 -48Z'),
 stomach:new Path2D('M30 -55 C70 -70 100 -40 92 -8 C86 24 50 30 34 18 C50 8 62 -10 52 -28 C46 -38 34 -40 30 -55Z'),
 heart:new Path2D('M18 -92 C-8 -110 -12 -140 4 -146 C12 -149 17 -142 18 -136 C19 -142 26 -149 34 -146 C50 -140 44 -110 18 -92Z'),
 kidL:new Path2D('M-70 10 C-84 14 -86 50 -70 56 C-58 60 -52 50 -58 34 C-62 26 -56 18 -58 12 C-60 8 -66 8 -70 10Z'),
 kidR:new Path2D('M70 10 C84 14 86 50 70 56 C58 60 52 50 58 34 C62 26 56 18 58 12 C60 8 66 8 70 10Z'),
 gut:new Path2D('M-60 64 C-70 112 -40 150 0 150 C40 150 70 112 60 64 C40 54 -40 54 -60 64Z'),
 lungL:new Path2D('M-20 -190 C-60 -200 -100 -160 -104 -100 C-106 -60 -90 -44 -60 -48 C-34 -52 -24 -80 -22 -120 Z'),
 lungR:new Path2D('M20 -190 C60 -200 100 -160 104 -100 C106 -60 90 -44 60 -48 C34 -52 24 -80 22 -120 Z'),
 bladder:new Path2D('M-22 172 C-22 158 22 158 22 172 C22 186 -22 188 -22 172Z')};
const ESO=[[0,-262],[3,-200],[14,-120],[34,-60],[56,-20]];
const VES=[[[18,-118],[10,-60],[6,60],[6,170]],[[6,170],[-40,260],[-70,400]],[[6,170],[50,260],[75,400]],[[24,-140],[90,-170],[170,-150],[195,0],[205,200]],[[12,-140],[-90,-170],[-170,-150],[-195,0],[-205,200]],[[12,-150],[14,-240],[10,-300]]];
const LIVP=[[[6,-60],[-30,-40],[-70,-28]],[[6,-20],[-40,-22],[-88,-30]]],KIDP=[[[6,20],[-40,28],[-66,34]],[[6,20],[40,28],[66,34]],[[-66,40],[-36,110],[-4,166]],[[66,40],[36,110],[4,166]]];
// cuerpo con recorrido del medicamento: p=0..1 (absorción, distribución, metabolismo, excreción)
function body(cx,cy,sc,t,p){X.save();X.translate(cx,cy);X.scale(sc,sc);A(1);X.drawImage(BODY,-280,-430);
 const ph=i=>pr(p,i*.25,(i+1)*.25),on=i=>p>=i*.25;
 const org=(P,c,i)=>{const act=on(i)?(p<(i+1)*.25||i===3?1:.45):0;A(.15+.5*act);X.fillStyle=c;X.fill(P);A(.35+.5*act);X.strokeStyle=c;X.lineWidth=2;X.stroke(P);if(act===1){A(.22);X.lineWidth=8;X.stroke(P)}};
 A(.18);X.strokeStyle=C.ice;X.lineWidth=1.5;X.stroke(ORG.lungL);X.stroke(ORG.lungR);
 X.strokeStyle='#FF8A7A';X.lineWidth=2.5;for(const v of VES){A(.2+.3*(on(1)?1:0));X.beginPath();v.forEach((q,i)=>i?X.lineTo(...q):X.moveTo(...q));X.stroke()}
 const hb=1+.06*Math.max(0,Math.sin(t*TAU*1.2));X.save();X.translate(18,-118);X.scale(hb,hb);X.translate(-18,118);A(.55);X.fillStyle='#FF7B7B';X.fill(ORG.heart);X.restore();
 org(ORG.stomach,C.sky,0);org(ORG.gut,C.sky,0);org(ORG.liver,C.amber,2);org(ORG.kidL,C.green,3);org(ORG.kidR,C.green,3);org(ORG.bladder,C.green,3);
 if(p<.25){const u=eo(pr(ph(0),0,.8)),q=along(ESO,u);A(1-pr(ph(0),.8,1));X.save();X.translate(q[0],q[1]);X.rotate(.9);X.fillStyle=C.white;X.beginPath();X.roundRect(-14,-6,28,12,6);X.fill();X.fillStyle=C.sky;X.beginPath();X.roundRect(0,-6,14,12,[0,6,6,0]);X.fill();X.restore();
  if(ph(0)>.7)for(let i=0;i<8;i++){const a=i/8*TAU+t,r=10+pr(ph(0),.7,1)*26;glow(60+Math.cos(a)*r,-10+Math.sin(a)*r*.7,12,.8,C.sky)}}
 if(p>=.25&&p<.55){const k=Math.min(pr(ph(1),0,.15),1-pr(p,.5,.55));for(let i=0;i<24;i++){const q=along(VES[i%6],(t*.45+i*.137)%1);glow(q[0],q[1],11,.85*k,C.sky)}}
 if(p>=.5&&p<.8){const k=Math.min(pr(p,.5,.54),1-pr(p,.76,.8));for(let i=0;i<14;i++){const u=(t*.6+i*.19)%1,q=along(LIVP[i%2],u);glow(q[0],q[1],11,.85*k,u>.7?C.amber:C.sky)}}
 if(p>=.75){const k=Math.min(pr(p,.75,.8),1-pr(p,.97,1)*.5);for(let i=0;i<16;i++){const q=along(KIDP[i%4],(t*.5+i*.23)%1);glow(q[0],q[1],10,.85*k,C.mint)}}
 const LB=[['1','Absorción',[86,-14],[250,-40],'left'],['2','Distribución',[190,-130],[250,-190],'left'],['3','Metabolismo',[-96,-30],[-235,-70],'right'],['4','Excreción',[78,36],[250,80],'left']];
 LB.forEach((l,i)=>{const k=eo(pr(p,i*.25,i*.25+.06));if(k<=0)return;const act=p<(i+1)*.25||i===3;A(k*(act?1:.6));X.strokeStyle=C.ice;X.lineWidth=1.5;X.beginPath();X.moveTo(...l[2]);X.lineTo(l[3][0]+(l[4]==='left'?-12:12),l[3][1]-8);X.stroke();glow(l[2][0],l[2][1],10,k,'#FFFFFF');
  T(l[0]+' · '+l[1],l[3][0],l[3][1],F(600,27),act?C.white:C.ice,l[4],k*(act?1:.7))});X.restore()}
// cápsulas y tabletas (sprites con desenfoque para profundidad de campo)
function capSprite(c1,c2,blur){const L=240,R=46,v=document.createElement('canvas');v.width=L+48;v.height=2*R+48;const b=v.getContext('2d');if(blur)b.filter=`blur(${blur}px)`;b.translate(v.width/2,v.height/2);const h=L/2;
 const half=(c,s)=>{b.beginPath();b.moveTo(0,-R);b.lineTo(s*(h-R),-R);b.arc(s*(h-R),0,R,-PI/2,PI/2,s<0);b.lineTo(0,R);b.closePath();const g=b.createLinearGradient(0,-R,0,R);g.addColorStop(0,c[0]);g.addColorStop(.32,c[1]);g.addColorStop(1,c[2]);b.fillStyle=g;b.fill()};
 half(c1,-1);half(c2,1);b.fillStyle='rgba(0,0,0,.12)';b.fillRect(-2,-R,4,2*R);b.fillStyle='rgba(255,255,255,.6)';b.beginPath();b.roundRect(-h+R*.7,-R*.66,L-R*1.4,R*.26,R*.13);b.fill();return v}
function tabSprite(blur){const v=document.createElement('canvas');v.width=200;v.height=170;const b=v.getContext('2d');if(blur)b.filter=`blur(${blur}px)`;b.translate(100,78);
 b.fillStyle='#9FB2C4';b.beginPath();b.ellipse(0,14,70,46,0,0,TAU);b.fill();b.fillRect(-70,0,140,14);const g=b.createLinearGradient(-70,-46,70,46);g.addColorStop(0,'#FFFFFF');g.addColorStop(1,'#C9D6E2');b.fillStyle=g;b.beginPath();b.ellipse(0,0,70,46,0,0,TAU);b.fill();
 b.strokeStyle='rgba(120,140,160,.5)';b.lineWidth=3;b.beginPath();b.moveTo(-50,-4);b.lineTo(50,4);b.stroke();return v}
const WHT=['#FFFFFF','#F4F8FB','#AFC2D3'];
const SPR=[[['#5FA5E0','#1F6FB2','#0D3F6E'],WHT],[['#8FE6C8','#3CC59A','#1C7A5C'],WHT],[WHT,['#A8D8F0','#5FB3E8','#2F7DB5']],null].map(c=>[0,3,7].map(bl=>c?capSprite(c[0],c[1],bl):tabSprite(bl)));
// capas del modelo del queso suizo (los agujeros son transparentes)
const SLICE=[[[55,215,24,32],[40,110,16,22],[78,330,18,26]],[[58,212,26,34],[72,92,14,20],[36,322,20,28]],[[50,118,20,28],[74,300,22,30],[34,388,14,18]],[[62,150,18,26],[42,268,20,28],[78,362,14,20]]].map(hs=>{
 const c=document.createElement('canvas');c.width=170;c.height=470;const b=c.getContext('2d');b.translate(10,20);const face=new Path2D('M0 0 L110 30 L110 440 L0 410 Z');
 b.fillStyle='rgba(30,80,130,.9)';b.beginPath();b.moveTo(110,30);b.lineTo(126,38);b.lineTo(126,446);b.lineTo(110,440);b.closePath();b.fill();
 const g=b.createLinearGradient(0,0,110,440);g.addColorStop(0,'rgba(196,230,248,.96)');g.addColorStop(1,'rgba(95,179,232,.9)');b.fillStyle=g;b.fill(face);
 b.globalCompositeOperation='destination-out';for(const h of hs){b.beginPath();b.ellipse(h[0],h[1],h[2],h[3],0,0,TAU);b.fill()}
 b.globalCompositeOperation='source-over';b.strokeStyle='rgba(255,255,255,.55)';b.lineWidth=2;b.stroke(face);for(const h of hs){b.beginPath();b.ellipse(h[0],h[1],h[2],h[3],0,0,TAU);b.stroke()}return c});
// mapa de Colombia
const CAPS_CO=[[-74.07,4.71],[-75.58,6.24],[-76.53,3.45],[-74.8,10.96],[-75.48,10.39],[-73.12,7.12],[-72.51,7.89],[-75.7,4.81],[-75.52,5.07],[-75.23,4.44],[-73.63,4.14],[-77.28,1.21],[-75.28,2.93],[-75.88,8.75],[-74.2,11.24],[-76.61,2.44],[-73.25,10.46],[-73.37,5.54],[-69.94,-4.22],[-76.66,5.69],[-72.91,11.54],[-72.4,5.34],[-75.61,1.61],[-76.65,1.15],[-72.64,2.57],[-70.23,1.25],[-67.49,6.19],[-67.92,3.87],[-70.76,7.08],[-75.4,9.3],[-75.68,4.53]];
const MP=(lon,lat)=>[530+(lon+73)*44,500-(lat-4.1)*44];
const MAPC=(()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const b=c.getContext('2d'),p=new Path2D();COL.forEach((q,i)=>{const m=MP(q[0],q[1]);i?p.lineTo(m[0],m[1]):p.moveTo(m[0],m[1])});p.closePath();
 const g=b.createLinearGradient(0,130,0,880);g.addColorStop(0,'#14497F');g.addColorStop(1,'#0A2850');b.fillStyle=g;b.fill(p);
 b.save();b.clip(p);b.fillStyle='rgba(168,216,240,.22)';for(let y=130;y<890;y+=13)for(let x=250;x<830;x+=13)b.fillRect(x,y,2.2,2.2);b.restore();
 b.lineJoin='round';for(const [lw,a] of [[14,.05],[6,.12],[2.2,.9]]){b.strokeStyle=`rgba(95,179,232,${a})`;b.lineWidth=lw;b.stroke(p)}return c})();
function mapCol(t,mode){A(1);X.drawImage(MAPC,0,0);const B=MP(-74.07,4.71);
 CAPS_CO.forEach((c,i)=>{if(!i)return;const p=MP(...c);glow(p[0],p[1],10,.5,C.ice);A(.9);X.fillStyle=C.ice;X.fillRect(p[0]-2,p[1]-2,4,4);
  if(mode){const u=(t*.45+i*.173)%1;glow(lr(p[0],B[0],u),lr(p[1],B[1],u),9,.9*Math.sin(PI*u),i%3?C.amber:C.mint)}});
 const pu=(t*.7)%1;X.strokeStyle=C.mint;X.lineWidth=2;for(const o of [0,.5]){const u=(pu+o)%1;A(.6*(1-u));X.beginPath();X.arc(B[0],B[1],10+u*(mode?160:60),0,TAU);X.stroke()}
 glow(B[0],B[1],30,1,C.mint);A(1);X.fillStyle='#FFFFFF';X.beginPath();X.arc(B[0],B[1],7,0,TAU);X.fill();T('Bogotá D.C.',B[0]+18,B[1]-14,F(600,20),C.white,'left',.95)}
// globo terráqueo (proyección ortográfica) con arcos hacia Uppsala
const CITIES=[[-74.07,4.71],[-99.13,19.43],[-47.93,-15.78],[-58.38,-34.6],[-77.04,-12.05],[-70.65,-33.45],[-77.04,38.9],[-75.7,45.42],[-3.7,40.42],[-6.84,34.02],[-17.47,14.72],[7.49,9.06],[-0.19,5.6],[-66.9,10.5],[-82.37,23.11],[-78.47,-.18],[-0.13,51.5],[-9.14,38.72],[2.35,48.86],[12.5,41.9],[31.24,30.04],[36.82,-1.29],[28.04,-26.2]],UPP=[17.64,59.86];
function globe(cx,cy,R,lon0,lat0,t,tArc,tUpp){const l0=lon0*PI/180,p0=lat0*PI/180,s0=Math.sin(p0),c0=Math.cos(p0);
 const pj=(lon,lat,h=1)=>{const l=lon*PI/180-l0,p=lat*PI/180,cp=Math.cos(p),sp=Math.sin(p),cL=Math.cos(l);return[cx+R*h*cp*Math.sin(l),cy-R*h*(c0*sp-s0*cp*cL),s0*sp+c0*cp*cL]};
 glow(cx,cy,R*1.35,.45,C.sky);const g=X.createRadialGradient(cx-R*.35,cy-R*.4,R*.05,cx,cy,R);g.addColorStop(0,'#1D5F9B');g.addColorStop(.6,'#0B2D55');g.addColorStop(1,'#061A33');A(1);X.fillStyle=g;X.beginPath();X.arc(cx,cy,R,0,TAU);X.fill();
 X.strokeStyle=C.ice;X.lineWidth=1;A(.12);const line=(f,n)=>{X.beginPath();let pen=false;for(let i=0;i<=n;i++){const q=f(i);if(q[2]>0){pen?X.lineTo(q[0],q[1]):X.moveTo(q[0],q[1]);pen=true}else pen=false}X.stroke()};
 for(let la=-60;la<=60;la+=30)line(i=>pj(-180+i*5,la),72);for(let lo=-180;lo<180;lo+=30)line(i=>pj(lo,-85+i*5),34);
 X.fillStyle=C.ice;for(const d of LAND){const q=pj(d[0],d[1]);if(q[2]>0){A(.18+.62*q[2]);X.fillRect(q[0]-1.6,q[1]-1.6,3.2,3.2)}}
 const vec=(lon,lat)=>{const l=lon*PI/180,p=lat*PI/180;return[Math.cos(p)*Math.cos(l),Math.cos(p)*Math.sin(l),Math.sin(p)]},U=vec(...UPP);
 CITIES.forEach((c,i)=>{const k=pr(t,tArc-.3+i*.09,tArc+1.4+i*.09);if(k<=0)return;const V=vec(...c),om=Math.acos(Math.min(1,V[0]*U[0]+V[1]*U[1]+V[2]*U[2])),so=Math.sin(om),pts=[];
  for(let j=0;j<=40*eo(k);j++){const u=j/40,a=Math.sin((1-u)*om)/so,b=Math.sin(u*om)/so,x=a*V[0]+b*U[0],y=a*V[1]+b*U[1],z=a*V[2]+b*U[2];const q=pj(Math.atan2(y,x)*180/PI,Math.asin(cl(z,-1,1))*180/PI,1+.18*Math.sin(PI*u)*om/1.2);if(q[2]>-.15)pts.push(q)}
  if(pts.length>1){A(.75);X.strokeStyle=C.sky;X.lineWidth=1.6;X.beginPath();pts.forEach((q,i)=>i?X.lineTo(q[0],q[1]):X.moveTo(q[0],q[1]));X.stroke();if(k<1){const e=pts[pts.length-1];glow(e[0],e[1],10,.9)}}
  const s=pj(...c);if(s[2]>0){A(.9);X.fillStyle=i?C.mint:C.amber;X.beginPath();X.arc(s[0],s[1],i?3.2:5,0,TAU);X.fill()}});
 const u=pj(...UPP),ku=eo(pr(t,tArc+.2,tArc+.9));if(u[2]>0&&ku>0){const pu=(t*.8)%1;A(ku*(1-pu));X.strokeStyle=C.mint;X.lineWidth=2;X.beginPath();X.arc(u[0],u[1],8+pu*36,0,TAU);X.stroke();glow(u[0],u[1],26,ku,C.mint);A(ku);X.fillStyle='#FFFFFF';X.beginPath();X.arc(u[0],u[1],5,0,TAU);X.fill();
  const kl=eo(pr(t,tUpp-.3,tUpp+.4));if(kl>0)grp(kl,()=>pill(u[0]+24,u[1]-42,'UMC · Uppsala, Suecia',{f:F(600,20),h:42,fill:'rgba(10,38,71,.85)'}))}
 A(.5);X.strokeStyle=C.ice;X.lineWidth=1.5;X.beginPath();X.arc(cx,cy,R,0,TAU);X.stroke()}
