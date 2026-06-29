// Splash gate: visibile solo alla prima apertura della sessione.
// Esterno (non inline) per permettere una CSP con script-src 'self' senza
// 'unsafe-inline'. Marca lo stato in modo sincrono per evitare doppi trigger.
try {
  if (sessionStorage.getItem('sticker_splash_shown') === '1') {
    var s = document.getElementById('boot-splash');
    if (s) s.parentNode.removeChild(s);
  } else {
    sessionStorage.setItem('sticker_splash_shown', '1');
    window.__splashUntil = performance.now() + 4500;
  }
} catch (e) { /* modalità privata: tieni lo splash senza persistenza */ }
