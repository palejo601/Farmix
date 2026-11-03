'use strict';
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
