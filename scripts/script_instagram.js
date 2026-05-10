/* js/instagram-feed.js */

(function () {
    const grid   = document.getElementById("instagram-posts");
    const errMsg = document.getElementById("instagram-error");
    const TOTAL  = 6;

    if (!grid) return;

    // --- Skeletons mientras carga ---
    for (let i = 0; i < TOTAL; i++) {
        grid.innerHTML += `
            <div class="instagram-skeleton">
                <div class="sk-img"></div>
                <div class="sk-body">
                    <div class="sk-line"></div>
                    <div class="sk-line"></div>
                    <div class="sk-line short"></div>
                </div>
            </div>
        `;
    }

    // --- Fetch al backend ---
    fetch("/instagram")
        .then(res => {
            if (!res.ok) throw new Error("Respuesta no OK: " + res.status);
            return res.json();
        })
        .then(posts => {
            grid.innerHTML = "";

            if (!Array.isArray(posts) || posts.length === 0) {
                errMsg.style.display = "block";
                return;
            }

            posts.forEach(post => {
                const caption = post.caption
                    ? post.caption.substring(0, 120) + "…"
                    : "Publicación UNEDOL";

                // Pasar la imagen por el proxy para evitar el bloqueo de Instagram
                const imgSrc = post.displayUrl
                    ? `/proxy-img?url=${encodeURIComponent(post.displayUrl)}`
                    : "";

                const card = document.createElement("div");
                card.className = "instagram-card";
                card.innerHTML = `
                    <img
                        src="${imgSrc}"
                        alt="Publicación de Instagram"
                        loading="lazy"
                    >
                    <div class="instagram-card-body">
                        <p>${caption}</p>
                        <a href="${post.url}" target="_blank" rel="noopener noreferrer">
                            Ver publicación
                        </a>
                    </div>
                `;
                grid.appendChild(card);
            });
        })
        .catch(err => {
            console.error("Instagram feed error:", err);
            grid.innerHTML = "";
            errMsg.style.display = "block";
        });
})();