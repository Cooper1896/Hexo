/* home-typed-init.js
   Ensure Typed.js is instantiated for the homepage subtitle (#subtitle).
   Works after DOMContentLoaded and on PJAX page swaps.
*/
(function(){
  function initTypedOnce(){
    const el = document.querySelector('#subtitle');
    (function(){
      // Custom typing loop: fetch a new sentence each cycle (hitokoto) and type+erase it.
      const API = 'https://v1.hitokoto.cn/?encode=json';

      function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

      async function fetchSentence(){
        try{
          const res = await fetch(API, {cache: 'no-store'});
          if(!res.ok) throw new Error('fetch failed');
          const j = await res.json();
          return (j && (j.hitokoto || j.data || j.content)) || '';
        }catch(e){
          console.warn('hitokoto fetch failed:', e);
          return '';
        }
      }

      function ensureCursorStyle(){
        if(document.getElementById('home-typed-cursor-style')) return;
        const style = document.createElement('style');
        style.id = 'home-typed-cursor-style';
        style.textContent = `#subtitle .typed-cursor{display:inline-block;margin-left:4px;opacity:1;animation:home-typed-blink .8s steps(1) infinite}@keyframes home-typed-blink{50%{opacity:0}}`;
        document.head.appendChild(style);
      }

      function prepareElement(el){
        el.dataset.orig = el.textContent.trim();
        el.innerHTML = '<span class="typed-text"></span><span class="typed-cursor">|</span>';
        return {
          textEl: el.querySelector('.typed-text'),
          cursorEl: el.querySelector('.typed-cursor')
        };
      }

      async function typeString(textEl, str, speed){
        textEl.textContent = '';
        for(let i=0;i<str.length;i++){
          textEl.textContent += str.charAt(i);
          await sleep(speed);
        }
      }

      async function eraseString(textEl, speed){
        while(textEl.textContent.length){
          textEl.textContent = textEl.textContent.slice(0, -1);
          await sleep(speed);
        }
      }

      async function runLoop(el){
        if(!el) return;
        if(el.__typing_running) return;
        el.__typing_running = true;
        ensureCursorStyle();
        const {textEl} = prepareElement(el);

        const staticRaw = (el.getAttribute('data-typed') || el.dataset.orig || '').trim();
        const staticStrings = staticRaw ? staticRaw.split(/\r?\n|\|\|/).map(s=>s.trim()).filter(Boolean) : [];

        const typeSpeed = window.__anzhiyu_sub_typeSpeed || 120;
        const backSpeed = window.__anzhiyu_sub_backSpeed || 50;
        const backDelay = window.__anzhiyu_sub_backDelay || 800;

        while(!el.__typing_stop){
          const sentence = await fetchSentence();
          const list = [];
          if(sentence) list.push(sentence);
          if(staticStrings.length) list.push(...staticStrings);
          if(list.length === 0){
            // nothing to type; wait and retry
            await sleep(2000);
            continue;
          }

          for(const s of list){
            if(el.__typing_stop) break;
            await typeString(textEl, s, typeSpeed);
            await sleep(backDelay);
            await eraseString(textEl, backSpeed);
            await sleep(300);
          }
          // small pause before fetching a new sentence
          await sleep(600);
        }
        el.__typing_running = false;
      }

      function start(){
        const el = document.querySelector('#subtitle');
        if(!el) return;
        el.__typing_stop = false;
        runLoop(el).catch(e=>console.error(e));
      }

      function stop(){
        const el = document.querySelector('#subtitle');
        if(!el) return;
        el.__typing_stop = true;
      }

      document.addEventListener('DOMContentLoaded', start);
      document.addEventListener('pjax:complete', ()=>{ stop(); start(); });
      document.addEventListener('pjax:end', ()=>{ stop(); start(); });
      // fallback start
      setTimeout(start, 600);
    })();
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initTypedOnce);
  }else{
    initTypedOnce();
  }
})();
