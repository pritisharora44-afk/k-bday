(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas.getContext('2d');
  const frosting = $('frosting'), fx = frosting.getContext('2d');
  const W = 640, H = 360, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The Rosebud slab's top runs from y=228 at the back to y=253 at the front.
  // Anchor the boy inside that plane, with his back and heels resting at y=247.
  const altar = {restingY:247, boyCenterX:326, boyWidth:204};
  const guide = {x:42,y:87,w:178,h:246};
  const images = {}, timers = new Set();
  const state = {scene:'title', cuts:0, line:0, text:'', typed:0, typingAt:0, strikeAt:-9999, sceneAt:0, splats:[], spray:[], shake:0, confetti:[], ready:false, phase:'', muted:true};
  const audio = new window.RitualAudio();
  let lastFrame=0;
  const now=()=>performance.now();
  function later(fn, delay){const id=setTimeout(()=>{timers.delete(id);fn()},delay);timers.add(id);return id}
  function clearTimers(){for(const id of timers)clearTimeout(id);timers.clear()}
  function announce(text){$('announcer').textContent=text}
  const scripts = {
    corridor:[['THE GUIDE','Follow me, birthday girl. The council has been expecting you.']],
    doors:[['THE GUIDE','Welcome to the Man Hater Cave. Membership has its privileges.']],
    altar:[['THE GUIDE','Take this ceremonial knife.'],['THE GUIDE','Tradition demands that we cut the cake.'],['THE BOY','...what cake?']],
    reveal:[['THE POP STAR','Another successful year of hating men.'],['THE BOY',"I'm literally right here."],['THE POP STAR',"He did ask me to tell you he's very glad you exist."],['THE COUNCIL','Unfortunately, the boy survived.']]
  };
  function show(ids){for(const id of ['title-panel','dialogue','scene-heading','cut-controls','progress','red-text','reveal-head','ending','asset-error'])$(id).hidden=!ids.includes(id)}
  function line(){const l=scripts[state.scene]?.[state.line];if(!l)return;state.text=l[1];state.typed=0;state.typingAt=now();$('speaker').textContent=l[0];$('dialogue-text').textContent='';$('next').textContent='CONTINUE ◆';announce(l[0]+': '+l[1]);}
  function enterScene(scene){state.scene=scene;state.sceneAt=now();state.line=0;document.querySelector('.stage').classList.toggle('red-out',scene==='red');
    frosting.hidden=!['cutting','reveal','end'].includes(scene);frosting.classList.toggle('celebration-canvas',['reveal','end'].includes(scene));
    $('chapter').textContent=({title:'PROLOGUE',corridor:'I · THE INVITATION',doors:'II · THE COUNCIL',altar:'III · THE TRADITION',cutting:'IV · ENTHUSIASM',red:'A MOMENT OF SILENCE',reveal:'V · PLAUSIBLE DENIABILITY',end:'CASE CLOSED'})[scene];
    if(scene==='title'){show(['title-panel']);music(false)}
    else if(['corridor','doors','altar'].includes(scene)){show(scene==='doors'?['dialogue','scene-heading']:['dialogue']);line();music(true)}
    else if(scene==='cutting'){show(['cut-controls','progress']);updateCut();announce('Cut the cake. Tap the button twenty times.');music(true)}
    else if(scene==='red'){show(['red-text']);$('red-text').textContent='';music(false);later(()=>{$('red-text').textContent='...'},2000);later(()=>{$('red-text').textContent='Happy Birthday.'},2700);later(()=>enterScene('reveal'),3900)}
    else if(scene==='reveal'){show(['reveal-head']);state.confetti=Array.from({length:200},(_,i)=>({x:Math.random()*W,y:i<70?Math.random()*H*.8:-Math.random()*H,v:28+Math.random()*42,drift:Math.random()*16-8,w:2+Math.floor(Math.random()*2),h:3+Math.floor(Math.random()*3),angle:Math.random()*Math.PI,spin:Math.random()*.8-.4,c:['#eabb61','#eea6c6','#b8a4fb','#fff1d5'][i%4]}));state.phase='unhood';music(true);sfx('reveal');later(()=>{state.phase='dialogue';show(['reveal-head','dialogue']);line()},2300)}
    else if(scene==='end'){show(['ending']);sfx('spare');announce('Sentence postponed until your next birthday. Happy Birthday, Krutika.');}
  }
  function advance(){if(!['corridor','doors','altar','reveal'].includes(state.scene)||state.phase==='spare'||state.phase==='opening'||(state.scene==='reveal'&&state.phase==='unhood'))return;
    if(state.typed<state.text.length){state.typed=state.text.length;$('dialogue-text').textContent=state.text;return}
    sfx('ui');state.line++;
    if(state.line<scripts[state.scene].length){line();return}
    if(state.scene==='corridor')enterScene('doors');else if(state.scene==='doors'){state.phase='opening';state.shake=12;sfx('door');state.openingAt=now();show(['scene-heading']);later(()=>{state.phase='';enterScene('altar')},1200)}else if(state.scene==='altar')enterScene('cutting');else{state.phase='spare';$('cut').disabled=false;show(['reveal-head','cut-controls']);$('cut-hint').textContent='Your mercy is appreciated. Your judgment is questionable.';$('cut').textContent='SPARE HIM FOR ANOTHER YEAR';$('cut').classList.remove('cut-button');announce('Unfortunately, the boy survived. Spare him for another year.')}}
  function start(){if(!state.ready||state.scene!=='title')return;state.muted=!initAudio();syncSound();enterScene('corridor');sfx('ui')}
  function cut(){if(state.scene==='reveal'&&state.phase==='spare'){state.phase='spared';enterScene('end');return}if(state.scene!=='cutting'||state.cuts>=20)return;
    state.cuts++;state.strikeAt=now();
    state.shake=(8+state.cuts)*W/480;
    // Keep visible gaps through the middle cuts; the final wash closes them at 18.
    for(let i=0;i<4+Math.floor(state.cuts*1.05);i++)state.splats.push({x:Math.random()*W,y:Math.random()*H,r:(6+Math.random()*(10+state.cuts*1.6))*W/480,born:now(),c:Math.random()<.8?'#e0102a':'#ff4b5c'});
    for(let i=0;i<14;i++){const angle=Math.random()*Math.PI*2,speed=160+Math.random()*520;state.spray.push({x:326,y:232,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,size:3+Math.random()*8,born:now(),c:i%3?'#e0102a':'#ff4b5c'});}
    state.spray=state.spray.slice(-180);
    sfx('cut');music(true);updateCut();if(state.cuts===20){$('cut').disabled=true;later(()=>enterScene('red'),160)}
  }
  function updateCut(){const n=state.cuts;$('cut-number').textContent=n;$('meter-fill').style.width=(n/20*100)+'%';$('cut').textContent=n<3?'CUT THE CAKE':n<7?'CUT HARDER':n<11?'HE CAN TAKE IT':n<16?'MAN HATER MODE ACTIVATED':'ABSOLUTELY UNHINGED';$('cut-hint').textContent=n<7?'The council appreciates enthusiasm.':n<16?'A perfectly reasonable birthday activity.':'You seem suspiciously good at this.';}
  function reset(){clearTimers();music(false);Object.assign(state,{scene:'title',cuts:0,line:0,text:'',typed:0,typingAt:0,strikeAt:-9999,sceneAt:now(),splats:[],spray:[],shake:0,confetti:[],phase:''});$('cut').disabled=false;$('cut').classList.add('cut-button');$('next').disabled=false;enterScene('title');announce('The ritual has reset.');}
  function syncSound(){audio.enable(!state.muted);$('sound').textContent=state.muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(!state.muted));$('sound').setAttribute('aria-label',state.muted?'Turn sound on':'Turn sound off');music(!state.muted&&!['title','red'].includes(state.scene))}
  function initAudio(){return audio.init()}
  function sfx(type){audio.effect(type)}
  function music(on){audio.play(on?(['reveal','end'].includes(state.scene)?'birthday':state.scene==='cutting'?'cutting':'cave'):'',state.cuts)}
  const assetNames=['corridor','doors','chamber','hooded','singer','boy-lying','boy-seated','cake','knife','candle'];
  async function load(){try{await Promise.all(assetNames.map(name=>new Promise((res,rej)=>{const img=new Image();img.onload=()=>{images[name]=img;res()};img.onerror=rej;img.src='assets/'+name+'.png?v=5'})));state.ready=true;$('enter').disabled=false;$('enter').textContent='ENTER THE CAVE';$('asset-error').hidden=true;announce('The game is ready. Enter the cave.')}catch{show(['asset-error']);announce('Artwork could not load. Try again.')}}
  function sprite(name,x,y,w,h,context=ctx){const img=images[name];if(img){const scale=Math.min(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;context.drawImage(img,Math.round(x+(w-dw)/2),Math.round(y+h-dh),Math.round(dw),Math.round(dh));}}
  function lyingBoy(){const img=images['boy-lying'];if(!img)return;const h=altar.boyWidth*img.height/img.width;sprite('boy-lying',altar.boyCenterX-altar.boyWidth/2,altar.restingY-h,altar.boyWidth,h)}
  function drawGuide(name,opacity=1){ctx.save();ctx.globalAlpha=opacity;sprite(name,guide.x,guide.y,guide.w,guide.h);ctx.restore()}
  function background(name,zoom=1){const img=images[name];if(!img)return;const scale=Math.max(W/img.width,H/img.height)*zoom;const w=img.width*scale,h=img.height*scale;ctx.drawImage(img,Math.round((W-w)/2),Math.round((H-h)/2),Math.round(w),Math.round(h))}
  function glow(x,y,t){if(reduced)return;const grad=ctx.createRadialGradient(x,y,1,x,y,25);grad.addColorStop(0,`rgba(255,183,64,${.055+Math.sin(t*.008+x)*.02})`);grad.addColorStop(1,'rgba(255,183,64,0)');ctx.fillStyle=grad;ctx.fillRect(x-25,y-25,50,50)}
  function party(t,dt){
    for(const c of state.confetti){
      if(!reduced){c.y+=c.v*dt;c.x+=(c.drift+Math.sin((t+c.y)*.002)*8)*dt;c.angle+=c.spin*dt;if(c.y>H+6){c.y=-8;c.x=Math.random()*W}if(c.x<-5)c.x=W+5;if(c.x>W+5)c.x=-5;}
      fx.save();fx.translate(c.x,c.y);fx.rotate(c.angle);fx.fillStyle=c.c;fx.fillRect(-c.w/2,-c.h/2,c.w,c.h);fx.restore();
    }
  }
  function cakeGlow(t){
    const g=ctx.createRadialGradient(281,203,6,281,203,67);g.addColorStop(0,'rgba(255,205,120,.16)');g.addColorStop(1,'rgba(255,205,120,0)');ctx.fillStyle=g;ctx.fillRect(214,136,134,134);
    for(const [i,p] of [[230,179],[324,185],[249,149],[315,226]].entries()){const alpha=reduced?.55:.4+Math.sin(t*.002+i*1.6)*.2;ctx.fillStyle=`rgba(255,232,168,${alpha})`;ctx.fillRect(p[0]-3,p[1],7,1);ctx.fillRect(p[0],p[1]-3,1,7);}
  }
  function coating(t,dx,dy,dt){
    fx.clearRect(0,0,W,H);if(['reveal','end'].includes(state.scene)){if(state.scene==='end'||t-state.sceneAt>650)party(t,dt);return;}if(state.scene!=='cutting')return;
    fx.save();fx.translate(dx*.65,dy*.65);
    for(const s of state.splats){const age=Math.max(0,t-s.born),growth=reduced?1:.55+.45*Math.min(1,age/180);fx.fillStyle=s.c;fx.beginPath();fx.arc(s.x,s.y,s.r*growth,0,Math.PI*2);fx.fill();}
    if(!reduced)for(const p of state.spray){const age=(t-p.born)/1000;if(age<0||age>.55)continue;fx.fillStyle=p.c;fx.fillRect(p.x+p.vx*age,p.y+p.vy*age+180*age*age,p.size,p.size);}
    fx.restore();
    // Full-stage wash also coats the margins in portrait, leaving controls usable.
    const wash=state.cuts>=18?1:Math.max(state.cuts/18*.16,Math.pow(Math.max(0,(state.cuts-12)/6),1.4));fx.fillStyle=`rgba(224,16,42,${wash})`;fx.fillRect(0,0,W,H);
    const elapsed=t-state.strikeAt;
    if(state.cuts<20&&elapsed>=0&&elapsed<210){const p=elapsed/210,x=480-145*Math.sin(p*Math.PI)+dx,y=115+125*Math.sin(p*Math.PI)+dy;fx.save();fx.translate(x,y);fx.rotate(-.6+Math.sin(p*Math.PI)*1.35);sprite('knife',-48,-100,112,195,fx);fx.restore();if(!reduced){fx.strokeStyle='rgba(255,245,237,.65)';fx.lineWidth=3;fx.beginPath();fx.moveTo(510+dx,75+dy);fx.lineTo(x,y);fx.stroke();}}

  }
  function draw(t){const dt=Math.min((t-lastFrame)/1000,.05);lastFrame=t;ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);ctx.fillStyle='#130b1e';ctx.fillRect(0,0,W,H);const age=t-state.sceneAt;
    state.shake=Math.max(0,state.shake-dt*40);let dx=0,dy=0;
    if(!reduced){if(state.scene==='corridor'){dx=Math.sin(age*.003)*.9;dy=Math.sin(age*.006)*2.67;}if(state.shake>0&&state.scene!=='red'){dx+=(Math.sin(t*.079)*.55+Math.sin(t*.137)*.45)*state.shake*.5;dy+=(Math.cos(t*.093)*.55+Math.sin(t*.151)*.45)*state.shake*.5;}}
    if(state.ready){ctx.save();const overscan=reduced?1:state.shake>0?1+state.shake/H+.008:state.scene==='corridor'?1.025:1;ctx.translate(W/2+dx,H/2+dy);ctx.scale(overscan,overscan);ctx.translate(-W/2,-H/2);
      if(state.scene==='corridor'){background('corridor',reduced?1:1+Math.min(age*.00004,.16));sprite('hooded',420,70+(reduced?0:Math.sin(t*.002)*1.5),166,240);}
      else if(state.scene==='doors'){background('doors');if(state.phase==='opening'){ctx.fillStyle=`rgba(7,2,12,${Math.min((t-state.openingAt)/1000,.95)})`;ctx.fillRect(220,35,205,280)}sprite('hooded',53,71,165,240)}
      else{background('chamber',state.scene==='title'?1.06:1);glow(162,213,t);glow(209,202,t);glow(431,202,t);glow(481,213,t);
        const revealed=['reveal','end'].includes(state.scene);
        if(revealed){ctx.fillStyle='#ffd48516';ctx.fillRect(0,0,W,H);sprite('boy-seated',334,113,114,137);sprite('cake',235,155,96,91);if(state.scene==='reveal'&&age>700)cakeGlow(t);const p=reduced?(age>=1000?1:0):Math.max(0,Math.min(1,(age-900)/400));if(p<1)drawGuide('hooded',1-p);if(p>0)drawGuide('singer',p);}
        else if(state.scene!=='title'){lyingBoy();drawGuide('hooded');ctx.strokeStyle='#df4a9e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(282,219);ctx.quadraticCurveTo(278,232,282,247);ctx.lineTo(289,287);ctx.moveTo(315,222);ctx.quadraticCurveTo(311,236,315,247);ctx.lineTo(325,287);ctx.moveTo(395,230);ctx.quadraticCurveTo(398,239,396,247);ctx.lineTo(407,287);ctx.stroke()}
      }
      if(state.scene==='title'||state.scene==='end'){ctx.fillStyle='#09031466';ctx.fillRect(0,0,W,H)}
      if(state.scene==='red'){ctx.fillStyle='#e0102a';ctx.fillRect(0,0,W,H)}
      if(state.scene==='reveal'&&age<700){ctx.fillStyle='#e0102a';ctx.fillRect(0,0,W,H*(1-age/700))}

      ctx.restore();
    }
    coating(t,dx,dy,dt);
    if(!$('dialogue').hidden&&state.typed<state.text.length){const count=Math.min(state.text.length,Math.floor((t-state.typingAt)/26));if(count!==state.typed){state.typed=count;$('dialogue-text').textContent=state.text.slice(0,count)}}requestAnimationFrame(draw)
  }
  $('enter').addEventListener('click',start);$('next').addEventListener('click',advance);$('cut').addEventListener('click',cut);$('replay').addEventListener('click',reset);$('retry').addEventListener('click',load);$('sound').addEventListener('click',()=>{if(initAudio())state.muted=!state.muted;syncSound()});
  document.addEventListener('keydown',e=>{if(e.repeat||!['Space','Enter'].includes(e.code))return;if(e.target instanceof HTMLButtonElement)return;e.preventDefault();if(state.scene==='title')start();else if(state.scene==='cutting'||state.phase==='spare')cut();else if(state.scene==='end')reset();else advance()});
  document.addEventListener('visibilitychange',()=>{audio.visibility(document.hidden)});
  const context=document.modelContext;if(context?.registerTool){for(const tool of [{name:'get_birthday_game_state',description:'Read the current scene, dialogue and cake-cutting progress.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({scene:state.scene,cuts:state.cuts,dialogue:state.text,phase:state.phase,ready:state.ready})},{name:'advance_birthday_game',description:'Perform one visible game action: enter, continue dialogue, cut the cake, spare the boy, or replay.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['enter','continue','cut','spare','replay']}},required:['action'],additionalProperties:false},execute:input=>{if(!input||!['enter','continue','cut','spare','replay'].includes(input.action))throw new Error('Invalid game action');const a=input.action;if(a==='enter'&&state.scene==='title')start();else if(a==='continue'&&scripts[state.scene])advance();else if(a==='cut'&&state.scene==='cutting')cut();else if(a==='spare'&&state.phase==='spare')cut();else if(a==='replay'&&state.scene==='end')reset();else throw new Error('Action unavailable in current scene');return{scene:state.scene,cuts:state.cuts,phase:state.phase}}}])try{Promise.resolve(context.registerTool(tool)).catch(()=>{})}catch{}}
  load();requestAnimationFrame(draw);
})();
