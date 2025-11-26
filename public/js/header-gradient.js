/* header-gradient.js
   Add a gradient overlay to the homepage header and adjust opacity on scroll.
*/
(function(){
  function setOpacity(op){
    // set CSS variable on root so CSS ::after can use it if needed
    document.documentElement.style.setProperty('--header-gradient-opacity', op);
    const header = document.querySelector('header#page-header');
    if(header){
      const after = header; // we control opacity via pseudo-element by toggling inline opacity on header
      // set inline style to control pseudo-element via CSS variable fallback
      header.style.setProperty('--hg-opacity', op);
      // we also directly set opacity on pseudo-element via a class hack: append style tag if needed
      // simpler: toggle a data attribute used by CSS (we'll set opacity by changing header.dataset)
      header.setAttribute('data-hg-opacity', op);
      // Additionally, update a real inline style to help older browsers: set a variable used in CSS
      document.documentElement.style.setProperty('--header-gradient-opacity', op);
    }
  }

  function onScroll(){
    const header = document.querySelector('header#page-header');
    if(!header) return;
    const h = header.offsetHeight || header.getBoundingClientRect().height || 600;
    const y = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || 0);
    // compute opacity: 0 at top, 1 at half header height
    const op = Math.min(1, (y) / (h * 0.5));
    // Smooth small values
    setOpacity(Number(op.toFixed(2)));
    // apply to pseudo-element by toggling style via a small dynamic style tag
    const styleId = 'header-gradient-dyn-style';
    let dyn = document.getElementById(styleId);
    if(!dyn){
      dyn = document.createElement('style');
      dyn.id = styleId;
      document.head.appendChild(dyn);
    }
    // Use header id selector to set opacity for ::after
    dyn.textContent = `header#page-header::after{opacity: ${op} !important}`;
  }

  document.addEventListener('scroll', onScroll, {passive:true});
  document.addEventListener('DOMContentLoaded', onScroll);
  // also run after PJAX content swaps
  document.addEventListener('pjax:complete', onScroll);
  document.addEventListener('pjax:end', onScroll);
  setTimeout(onScroll, 300);
})();
