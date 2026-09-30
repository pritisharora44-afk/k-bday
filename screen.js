(() => {
  'use strict';
  const button=document.getElementById('fullscreen');
  const help=document.getElementById('fullscreen-help');
  const root=document.documentElement;
  const active=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
  const standalone=()=>navigator.standalone===true||matchMedia('(display-mode:standalone)').matches||matchMedia('(display-mode:fullscreen)').matches;
  function sync(){const on=active();button.hidden=!on&&standalone();button.textContent=on?'EXIT FULLSCREEN':'FULLSCREEN';button.setAttribute('aria-label',on?'Exit fullscreen':'Enter fullscreen');button.setAttribute('aria-pressed',String(on));}
  function explain(){
    const apple=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    document.getElementById('fullscreen-help-text').textContent=apple?
      'Open this game in Safari. Tap Share, then Add to Home Screen. Leave “Open as Web App” on if shown. Launch the new icon, then tilt your phone.':
      'Your browser could not enter fullscreen. Open the game in its own browser tab and try again. You can also use your browser menu’s Add to Home Screen option and launch the new icon.';
    if(!help.open)help.showModal();
  }
  button.addEventListener('click',async()=>{
    try{
      if(active()){
        const exit=document.exitFullscreen||document.webkitExitFullscreen;
        if(exit)await exit.call(document);
      }else if(document.fullscreenEnabled!==false&&root.requestFullscreen){
        await root.requestFullscreen({navigationUI:'hide'});
      }else if(document.webkitFullscreenEnabled!==false&&root.webkitRequestFullscreen){
        await root.webkitRequestFullscreen();
      }else explain();
    }catch{explain();}
    sync();
  });
  document.getElementById('fullscreen-help-close').addEventListener('click',()=>help.close());
  document.addEventListener('fullscreenchange',sync);
  document.addEventListener('webkitfullscreenchange',sync);
  sync();
})();
