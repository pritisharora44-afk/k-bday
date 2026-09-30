/* Rosebud reference clips, played locally through Web Audio.
   The original synth score remains a fallback if clip loading fails. */
(() => {
  'use strict';
  window.RitualAudio = class {
    constructor() {
      this.ctx=null;this.voices=new Set();this.impacts=new Set();this.timer=null;
      this.track='';this.enabled=false;this.intensity=0;this.buffers={};this.musicVoice=null;
      // Fetch bytes early; decoding and playback wait for the first user gesture.
      this.assetBytes=typeof window.fetch==='function'?Promise.all(['dungeon-music','impact','fanfare'].map(async name=>{
        try{const r=await window.fetch('assets/audio/'+name+'.mp3?v=4');if(!r.ok)throw new Error('Audio unavailable');return [name,await r.arrayBuffer()]}catch{return [name,null]}
      })):null;
    }
    init() {
      if(this.ctx)return true;
      try {
        const C=window.AudioContext||window.webkitAudioContext;
        this.ctx=new C(); const c=this.ctx;
        this.master=c.createGain(); this.master.gain.value=1;
        const compressor=c.createDynamicsCompressor(); compressor.threshold.value=-18; compressor.ratio.value=4;
        this.master.connect(compressor); compressor.connect(c.destination);
        this.dry=c.createGain(); this.dry.connect(this.master);
        this.reverb=c.createConvolver(); const impulse=c.createBuffer(2,c.sampleRate*.75,c.sampleRate);
        for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)*.25;}
        this.reverb.buffer=impulse; const wet=c.createGain(); wet.gain.value=.2; this.reverb.connect(wet); wet.connect(this.master);
        this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate); const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
        if(this.assetBytes)this.assetBytes.then(async files=>{
          for(const [name,bytes] of files)if(bytes)try{this.buffers[name]=await c.decodeAudioData(bytes)}catch{}
          // Replace only the music fallback; do not restart a scene after mute/red-out/replay.
          if(this.enabled&&this.track)this.play(this.track,this.intensity,true);
        });
        return true;
      } catch { this.ctx=null; return false; }
    }
    enable(on) {
      this.enabled=on;
      if(!this.ctx)return;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(on?1:0,this.ctx.currentTime);
      if(on)this.ctx.resume().catch(()=>{}); else this.stop();
    }
    voice(source,gain,filter,time,duration,volume,attack=.008,reverb=true) {
      const c=this.ctx;
      source.connect(filter||gain); if(filter)filter.connect(gain);
      gain.connect(this.dry); if(reverb)gain.connect(this.reverb);
      gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(volume,.0001),time+attack);
      gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
      this.voices.add(source);
      source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();if(filter)filter.disconnect();};
      source.start(time);source.stop(time+duration+.025);
    }
    note(midi,time,duration=.3,volume=.04,type='triangle',cutoff=2400) {
      if(!this.enabled||!this.ctx)return;
      const c=this.ctx,osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();
      osc.type=type;osc.frequency.setValueAtTime(440*Math.pow(2,(midi-69)/12),time);filter.type='lowpass';filter.frequency.value=cutoff;
      this.voice(osc,gain,filter,time,duration,volume,type==='sawtooth'?.14:.008);
    }
    hush(time,duration,volume,from,to,type='lowpass') {
      if(!this.enabled||!this.ctx)return;
      const c=this.ctx,source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();source.buffer=this.noise;
      filter.type=type;filter.frequency.setValueAtTime(from,time);filter.frequency.exponentialRampToValueAtTime(to,time+duration);
      this.voice(source,gain,filter,time,duration,volume,.008,false);
    }
    clip(name,volume,loop=false) {
      const buffer=this.buffers[name];if(!this.enabled||!this.ctx||!buffer)return null;
      const c=this.ctx,source=c.createBufferSource(),gain=c.createGain();
      source.buffer=buffer;source.loop=loop;gain.gain.value=volume;
      source.connect(gain);gain.connect(this.master);this.voices.add(source);
      source.onended=()=>{this.voices.delete(source);this.impacts.delete(source);source.disconnect();gain.disconnect();if(this.musicVoice===source)this.musicVoice=null};
      source.start(c.currentTime);if(!loop)source.stop(c.currentTime+buffer.duration);
      return source;
    }
    effect(type) {
      if(!this.enabled||!this.ctx)return;
      const t=this.ctx.currentTime+.005;
      if(type==='cut') {
        if(this.buffers.impact){
          // Allow successive hits to overlap without an unbounded pile-up on fast taps.
          while(this.impacts.size>=6){const oldest=this.impacts.values().next().value;this.impacts.delete(oldest);try{oldest.stop()}catch{}}
          const hit=this.clip('impact',.8);if(hit)this.impacts.add(hit);return;
        }
        this.hush(t,.11,.16,2800,450,'bandpass'); // short knife swish
        this.hush(t+.04,.12,.22,800,110); // soft frosting splat
        this.note(40+Math.random()*3,t+.035,.15,.16,'sine',400);
        this.note(75+Math.random()*2,t+.04,.065,.025,'triangle');
      } else if(type==='door') {
        this.hush(t,.85,.2,380,70);this.note(29,t,.8,.07,'triangle',250);
      } else if(type==='reveal'||type==='spare') {
        if(this.buffers.fanfare){if(type==='spare'||!this.musicVoice)this.clip('fanfare',.8);return;}
        [72,76,79,84].forEach((n,i)=>{this.note(n,t+i*.12,.7,.05);this.note(n+12,t+i*.12,.4,.018,'sine');});
      } else {this.note(79,t,.085,.035);this.note(84,t+.025,.065,.018,'sine');}
    }
    stop() {
      if(this.timer!==null)clearInterval(this.timer);
      this.timer=null;this.track='';
      for(const voice of this.voices)try{voice.stop()}catch{}
      this.voices.clear();
      this.impacts.clear();this.musicVoice=null;
      // Clear the reverb tail as well: the red-out needs a real moment of silence.
      if(this.reverb){const buffer=this.reverb.buffer;this.reverb.buffer=null;this.reverb.buffer=buffer;}
    }
    play(track,intensity=0,refresh=false) {
      this.intensity=intensity;
      if(!this.enabled||!this.ctx||!track){this.stop();return;}
      const name=track==='birthday'?'fanfare':'dungeon-music';
      // Cave music continues uninterrupted when the cutting phase starts.
      if(!refresh&&(this.track===track||(this.musicVoice&&this.track!=='birthday'&&track!=='birthday'))){this.track=track;return;}
      this.stop();this.track=track;this.beat=0;this.next=this.ctx.currentTime+.04;
      if(this.buffers[name]){this.musicVoice=this.clip(name,track==='birthday'?.8:.5,track!=='birthday');return;}
      const tick=()=>{
        if(document.hidden){this.next=this.ctx.currentTime+.04;return;}
        while(this.next<this.ctx.currentTime+.15){
          this.score(this.beat++,this.next);
          const bpm=this.track==='birthday'?112:this.track==='cutting'?86+this.intensity*2:76;
          this.next+=30/bpm;
        }
      };
      tick();this.timer=setInterval(tick,40);
    }
    score(beat,t) {
      const bright=this.track==='birthday',bar=Math.floor(beat/8)%4,step=beat%8;
      const chords=bright?[[60,64,67],[57,60,64],[65,69,72],[67,71,74]]:[[57,60,64],[53,57,60],[52,56,59],[57,60,64]];
      const chord=chords[bar];
      if(step===0){
        this.note(chord[0]-12,t,1.25,.075,'sine',500);
        chord.forEach((n,i)=>this.note(n,t+i*.018,bright?1.2:2,.019,'sawtooth',bright?1100:650));
      }
      const melodies=bright?[[76,79,84,79,76,74,72,74],[76,79,81,79,76,72,69,72],[77,81,84,81,77,76,74,72],[79,83,86,83,79,77,76,74]]:[[76,null,72,null,69,null,72,null],[72,null,69,null,65,null,69,null],[71,null,68,null,64,null,68,null],[69,null,72,null,76,null,72,null]];
      const pitch=melodies[bar][step];
      if(pitch!==null){this.note(pitch,t,bright?.28:.85,bright?.043:.029,'sine');this.note(pitch+12,t,.18,.009,'triangle');}
      if(bright||this.track==='cutting'){
        if(step%4===0)this.note(32,t,.13,.09,'sine',180);
        if(step===4)this.hush(t,.09,.055,1300,350);
        if(bright||this.intensity>7)this.hush(t,.035,.012,6500,3000,'highpass');
      }
    }
    visibility(hidden){if(!this.ctx)return;if(hidden)this.ctx.suspend().catch(()=>{});else if(this.enabled)this.ctx.resume().catch(()=>{});}
  };
})();
