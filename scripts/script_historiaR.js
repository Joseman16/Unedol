(function () {
    var active  = 0;
    var cards   = Array.from(document.querySelectorAll('.fb-card'));
    var total   = cards.length;
    var dotsEl  = document.getElementById('fbDots');
    var wrapper = document.getElementById('fbWrapper');
 
    /* ── Crear puntos ── */
    for (var i = 0; i < total; i++) {
        (function(idx){
            var d = document.createElement('div');
            d.className = 'fb-dot' + (idx === 0 ? ' active' : '');
            d.addEventListener('click', function(){ active = idx; update(); });
            dotsEl.appendChild(d);
        })(i);
    }
 
    /* ── Calcular posiciones según ancho real de pantalla ── */
    function getLayout() {
        var vw      = window.innerWidth;
        var cardW   = Math.min(420, vw * 0.82);   /* tarjeta activa */
        var sideW   = Math.min(160, vw * 0.14);   /* ancho visible lateral */
        var gap     = Math.max(16, vw * 0.025);   /* espacio entre tarjetas */
        var maxRot  = 56;
        var maxDist = 2;                           /* cuántas a cada lado */
        return { cardW: cardW, sideW: sideW, gap: gap, maxRot: maxRot, maxDist: maxDist };
    }
 
    function update() {
        var L = getLayout();
 
        cards.forEach(function(card, i) {
            var offset = i - active;
            var abs    = Math.abs(offset);
            var sign   = offset > 0 ? 1 : offset < 0 ? -1 : 0;
 
            if (abs > L.maxDist) {
                card.style.opacity       = '0';
                card.style.pointerEvents = 'none';
                card.style.visibility    = 'hidden';
                return;
            }
            card.style.visibility = 'visible';
 
            /* posición X: la activa centrada, laterales desplazadas */
            var tx = 0;
            if (offset !== 0) {
                tx = sign * (L.cardW / 2 + L.gap + (abs - 1) * (L.sideW + L.gap) + L.sideW / 2);
            }
 
            var rotY    = sign * Math.min(abs * (L.maxRot / L.maxDist), L.maxRot);
            var scale   = abs === 0 ? 1 : Math.max(0.55, 1 - abs * 0.18);
            var opacity = abs === 0 ? 1 : Math.max(0.3,  1 - abs * 0.28);
            var z       = total - abs;
 
            card.style.transform     = 'translateX(' + tx + 'px) rotateY(' + rotY + 'deg) scale(' + scale + ')';
            card.style.opacity       = opacity;
            card.style.zIndex        = z;
            card.style.pointerEvents = abs > 1 ? 'none' : 'auto';
            card.style.width         = L.cardW + 'px';
            card.classList.toggle('fb-card--active', i === active);
        });
 
        /* actualizar puntos */
        document.querySelectorAll('.fb-dot').forEach(function(d, i){
            d.classList.toggle('active', i === active);
        });
 
        /* altura del wrapper = tarjeta activa */
        var L2 = getLayout();
        var cardH = Math.min(760, window.innerHeight * 0.88);
        wrapper.style.height = (cardH + 40) + 'px';
        cards.forEach(function(c){ c.style.height = cardH + 'px'; });
    }
 
    /* Tarjetas laterales clickeables */
    cards.forEach(function(card) {
        card.addEventListener('click', function(e) {
            var idx = parseInt(this.dataset.index);
            if (!isNaN(idx) && idx !== active) {
                e.preventDefault();
                active = idx;
                update();
            }
        });
    });
 
    document.getElementById('fbPrev').addEventListener('click', function(){
        active = Math.max(0, active - 1); update();
    });
    document.getElementById('fbNext').addEventListener('click', function(){
        active = Math.min(total - 1, active + 1); update();
    });
 
    /* Swipe táctil */
    var tx0 = 0;
    wrapper.addEventListener('touchstart', function(e){ tx0 = e.touches[0].clientX; }, { passive: true });
    wrapper.addEventListener('touchend', function(e){
        var dx = e.changedTouches[0].clientX - tx0;
        if      (dx >  50) { active = Math.max(0, active - 1);         update(); }
        else if (dx < -50) { active = Math.min(total - 1, active + 1); update(); }
    });
 
    /* Recalcular al cambiar tamaño de ventana */
    window.addEventListener('resize', update);
 
    update();
})();


/* ============================================================
   olmedo_libro.js
   Lógica de navegación con animación 3-D de volteo de hoja
   ============================================================ */

(function () {

  'use strict';

  /* ── Constantes ── */
  const TOTAL   = 6;       // número total de spreads
  const DURATION = 660;    // ms que dura la animación

  /* ── Estado ── */
  let current  = 0;
  let animating = false;

  /* ── Referencias DOM ── */
  const spreads   = Array.from(document.querySelectorAll('.spread'));
  const dotsWrap  = document.getElementById('dots');
  const flipLayer = document.getElementById('flipLayer');
  const flipFront = document.getElementById('flipFront');
  const flipBack  = document.getElementById('flipBack');
  const btnPrev   = document.getElementById('btnPrev');
  const btnNext   = document.getElementById('btnNext');

  /* ══════════════════════════════════════════════════════════
     INICIALIZACIÓN — puntos de navegación
  ══════════════════════════════════════════════════════════ */
  function buildDots () {
    for (let i = 0; i < TOTAL; i++) {
      const btn = document.createElement('button');
      btn.className  = 'dot' + (i === 0 ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-label', 'Ir a página ' + (i + 1));
      btn.addEventListener('click', function () {
        if (i !== current) flipPage(i > current ? 1 : -1, i);
      });
      dotsWrap.appendChild(btn);
    }
  }

  /* ══════════════════════════════════════════════════════════
     ACTUALIZAR INTERFAZ (dots + botones)
  ══════════════════════════════════════════════════════════ */
  function updateUI () {
    const dotBtns = Array.from(dotsWrap.querySelectorAll('.dot'));
    dotBtns.forEach(function (d, i) {
      d.classList.toggle('active', i === current);
    });
    btnPrev.disabled = (current === 0);
    btnNext.disabled = (current === TOTAL - 1);
  }

  /* ══════════════════════════════════════════════════════════
     CLONAR MITAD DE PÁGINA (para las caras de la hoja)
  ══════════════════════════════════════════════════════════ */
  function cloneHalf (el, extraStyle) {
    const clone = el.cloneNode(true);
    clone.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;' +
      (extraStyle || '');
    return clone;
  }

  /* ══════════════════════════════════════════════════════════
     ANIMACIÓN DE VOLTEO PRINCIPAL
  ══════════════════════════════════════════════════════════ */
  function flipPage (dir, targetIdx) {

    if (animating) return;

    const to = (targetIdx !== undefined)
      ? targetIdx
      : current + dir;

    if (to < 0 || to >= TOTAL) return;

    animating = true;

    const fromSpread = spreads[current];
    const toSpread   = spreads[to];

    /*
     * Mostrar el spread destino en el DOM pero INVISIBLE.
     * Así los clones tienen contenido real para clonar,
     * pero el spread de fondo no se ve hasta que la animación termina.
     */
    toSpread.style.opacity = '0';
    toSpread.classList.add('visible');

    /* Limpiar caras previas */
    flipFront.innerHTML = '';
    flipBack.innerHTML  = '';

    /* ── Volteo hacia ADELANTE (derecha → izquierda) ── */
    if (dir > 0) {

      flipLayer.className = 'flip-layer right-origin';
      flipLayer.style.left = '50%';

      /* Cara delantera = página derecha del spread actual */
      const frontEl = fromSpread.querySelector('.page-right');
      flipFront.appendChild(
        cloneHalf(frontEl, 'border-radius:0 10px 10px 0;')
      );

      /* Cara trasera = página izquierda del spread destino */
      const backEl = toSpread.querySelector('.page-left');
      flipBack.appendChild(
        cloneHalf(backEl, 'border-radius:10px 0 0 10px;')
      );

      /* Posición inicial sin transición */
      flipLayer.style.transition = 'none';
      flipLayer.style.transform  = 'rotateY(0deg)';
      flipLayer.style.display    = 'block';

      /* Arrancar animación en el siguiente frame */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          flipLayer.style.transition =
            'transform ' + DURATION + 'ms cubic-bezier(0.55, 0.05, 0.35, 1)';
          flipLayer.style.transform = 'rotateY(-180deg)';
        });
      });

    /* ── Volteo hacia ATRÁS (izquierda → derecha) ── */
    } else {

      flipLayer.className = 'flip-layer left-origin';
      flipLayer.style.left = '0';

      /* Cara delantera = página izquierda del spread actual */
      const frontEl = fromSpread.querySelector('.page-left');
      flipFront.appendChild(
        cloneHalf(frontEl, 'border-radius:10px 0 0 10px;')
      );

      /* Cara trasera = página derecha del spread destino */
      const backEl = toSpread.querySelector('.page-right');
      flipBack.appendChild(
        cloneHalf(backEl, 'border-radius:0 10px 10px 0;')
      );

      /* Posición inicial sin transición */
      flipLayer.style.transition = 'none';
      flipLayer.style.transform  = 'rotateY(0deg)';
      flipLayer.style.display    = 'block';

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          flipLayer.style.transition =
            'transform ' + DURATION + 'ms cubic-bezier(0.55, 0.05, 0.35, 1)';
          flipLayer.style.transform = 'rotateY(180deg)';
        });
      });

    }

    /* ── Limpieza al terminar ── */
    setTimeout(function () {

      /* 1. Revelar el spread destino antes de quitar la capa de volteo
            para evitar cualquier parpadeo al final */
      toSpread.style.opacity = '';

      /* 2. Ocultar el spread origen y la capa de volteo */
      fromSpread.classList.remove('visible');

      flipLayer.style.display    = 'none';
      flipLayer.style.transition = '';
      flipLayer.style.transform  = '';
      flipFront.innerHTML        = '';
      flipBack.innerHTML         = '';

      current   = to;
      animating = false;
      updateUI();

    }, DURATION + 20);

  }/* fin flipPage */

  /* ══════════════════════════════════════════════════════════
     EVENTOS PÚBLICOS — botones y teclado
  ══════════════════════════════════════════════════════════ */
  btnPrev.addEventListener('click', function () { flipPage(-1); });
  btnNext.addEventListener('click', function () { flipPage(1);  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') flipPage(1);
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   flipPage(-1);
  });

  /* ── Swipe táctil ── */
  var touchStartX = 0;

  document.getElementById('scene').addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  document.getElementById('scene').addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) flipPage(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ── Inicio ── */
  buildDots();
  updateUI();

})();