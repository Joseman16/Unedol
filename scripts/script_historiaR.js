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
        var cardH = Math.min(660, window.innerHeight * 0.75);
        wrapper.style.height = (cardH + 20) + 'px';
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