// Uso: node render.js [--preview t1,t2,...]  -> frames a ffmpeg (video sin audio) + events.json
const {chromium}=require('playwright');const fs=require('fs');const {spawn}=require('child_process');const path=require('path');
const FPS=30,dir=__dirname,out=process.argv[3]||path.join(dir,'video_noaudio.mp4');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
  p.on('pageerror',e=>console.error('PAGE ERR',e.message));
  await p.goto('file://'+path.join(dir,'index.html'));await p.evaluate(()=>window.READY);
  let prev=process.argv[2]==='--preview'?process.argv[3]:null;
  if(prev==='auto')prev=await p.evaluate(()=>{const S=SPINS;return [SC.intro[1]-1,TT.cards[8]+.5,TT.r5+.5,TT.mc3+.6,S[0].roll+1.2,S[4].land+.9,S[5].land+.4,SESS.sim.post[0]+.6,TT.dz[2]+.4,S[10].land+.9,LN.pl2+.5,S[13].land+.6,SESS.pl.post[1]+.6,TT.stNext+.8,TT.cta+.6].map(x=>+x.toFixed(2))});else if(prev)prev=prev.split(',').map(Number);
  if(prev){fs.mkdirSync(path.join(dir,'preview'),{recursive:true});
    for(const t of prev){const d=await p.evaluate(t=>{renderFrame(t);return document.getElementById('cv').toDataURL('image/jpeg',.8)},t);
      fs.writeFileSync(path.join(dir,'preview',`f_${t}.jpg`),Buffer.from(d.split(',')[1],'base64'))}
    await b.close();return}
  const ev=await p.evaluate(()=>({events:window.EVENTS,dur:window.DUR,scenes:window.SCENES}));fs.writeFileSync(path.join(dir,'events.json'),JSON.stringify(ev));
  const N=Math.round(ev.dur*FPS);
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-c:v','mjpeg','-framerate',String(FPS),'-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p',out],{stdio:['pipe','inherit','inherit']});
  for(let f=0;f<N;f++){const d=await p.evaluate(t=>{renderFrame(t);return document.getElementById('cv').toDataURL('image/jpeg',.93)},f/FPS);
    if(!ff.stdin.write(Buffer.from(d.split(',')[1],'base64')))await new Promise(r=>ff.stdin.once('drain',r));
    if(f%150===0)console.log('frame',f,'/',N)}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('ok',out);
})();
