// Uso: node render.js --events | --preview t1,t2|auto | --part i n | (sin args: video completo)
const {chromium}=require('playwright');const fs=require('fs');const {spawn}=require('child_process');const path=require('path');
const FPS=30,dir=__dirname,a=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
 p.on('pageerror',e=>console.error('PAGE ERR',e.message));
 await p.goto('file://'+path.join(dir,'index.html'));
 const info=await p.evaluate(()=>({events:window.EVENTS,dur:window.DUR,miss:window.MISS}));
 if(info.miss&&info.miss.length)console.log('MISS',info.miss.join(' '));
 if(a[0]==='--events'){fs.writeFileSync(path.join(dir,'events.json'),JSON.stringify({events:info.events,dur:info.dur}));console.log('events',info.events.length,'dur',info.dur);await b.close();return}
 const grab=async t=>{const d=await p.evaluate(t=>{renderFrame(t);return document.getElementById('cv').toDataURL('image/jpeg',.92)},t);return Buffer.from(d.split(',')[1],'base64')};
 if(a[0]==='--preview'){const ts=a[1]==='auto'?await p.evaluate(()=>window.PREVIEW):a[1].split(',').map(Number);fs.mkdirSync(path.join(dir,'preview'),{recursive:true});
  for(const t of ts)fs.writeFileSync(path.join(dir,'preview',`f_${t.toFixed(2).padStart(7,'0')}.jpg`),await grab(t));await b.close();return}
 const N=Math.round(info.dur*FPS);let f0=0,f1=N,out=path.join(dir,'video_noaudio.mp4');
 if(a[0]==='--part'){const i=+a[1],n=+a[2];f0=Math.floor(N*i/n);f1=Math.floor(N*(i+1)/n);out=path.join(dir,`part_${i}.mp4`)}
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-c:v','mjpeg','-framerate',String(FPS),'-i','-','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-r',String(FPS),out],{stdio:['pipe','inherit','inherit']});
 const T0=Date.now();for(let f=f0;f<f1;f++){const buf=await grab(f/FPS);if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if((f-f0)%600===0)console.log('frame',f,'/',f1,((Date.now()-T0)/1000).toFixed(0)+'s')}
 ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('ok',out)})();
