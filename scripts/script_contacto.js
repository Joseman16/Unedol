// ============================================================
// scripts/script_contacto.js  — versión FINAL coords completas
// ============================================================

const MAX_INTENTOS = 5;
const STORAGE_KEY  = "intentos_restantes";

const SUPABASE_URL = "https://ahjabjblvjydauzevjor.supabase.co/rest/v1/visitantes";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoamFiamJsdmp5ZGF1emV2am9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMDcwNzMsImV4cCI6MjA3MTY4MzA3M30.GXnuj9pnNdwWKgCsL3n4ftn-t7P32DK1CoyNAzjel9g";

// ── Sanear localStorage ──────────────────────────────────────
(function() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0 || n > MAX_INTENTOS) localStorage.removeItem(STORAGE_KEY);
})();

// ── Helpers UI ───────────────────────────────────────────────
function getIntentos() {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === null ? MAX_INTENTOS : parseInt(v, 10);
}
function setIntentos(n) { localStorage.setItem(STORAGE_KEY, Math.max(0, n)); }
function renderDots(n) {
  document.querySelectorAll("#dots .dot").forEach((d, i) => d.classList.toggle("used", i >= n));
}
function setStatus(msg, color = "#aaa") {
  const el = document.getElementById("statusMsg");
  if (el) { el.textContent = msg; el.style.color = color; }
}
function showNotif(title, body) {
  const notif = document.getElementById("notif");
  const t = document.getElementById("notifTitle");
  const b = document.getElementById("notifBody");
  if (!notif) return;
  if (t) t.textContent = title;
  if (b) b.textContent = body;
  notif.classList.add("show");
  setTimeout(() => notif.classList.remove("show"), 4000);
}

// ── Reloj ────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById("clockTime");
  if (el) el.textContent = new Date().toLocaleTimeString("es-EC", { hour:"2-digit", minute:"2-digit" });
}
updateClock();
setInterval(updateClock, 1000);

// ── Formatear coord: número → string con 6 decimales fijos ──
// Usa toPrecision para no perder dígitos significativos
// Ejemplo: -1.87253 → "-1.872530"  |  -1.87 → "-1.870000"
function fmtCoord(val) {
  if (val === null || val === undefined) return null;
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return null;
  // toFixed(6) sobre el número nativo — confiable cuando el número YA tiene los decimales
  return n.toFixed(6);
}

// ── GPS del navegador ────────────────────────────────────────
function pedirGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("[GPS] no disponible en este navegador");
      resolve(null); return;
    }
    console.log("[GPS] pidiendo permiso...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Leer directamente del objeto GeolocationCoordinates
        // accuracy indica cuántos metros de precisión tiene
        const rawLat = pos.coords.latitude;
        const rawLon = pos.coords.longitude;
        const acc    = pos.coords.accuracy;
        console.log("[GPS] ✅ RAW lat:", rawLat, "| lon:", rawLon, "| precisión:", acc, "m");
        // Formatear a 6 decimales preservando todos los dígitos del float
        const latStr = rawLat.toFixed(6);
        const lonStr = rawLon.toFixed(6);
        console.log("[GPS] formateado → lat:", latStr, "| lon:", lonStr);
        resolve({ latitud: latStr, longitud: lonStr, precision: acc });
      },
      (err) => {
        const motivo = ["", "PERMISO DENEGADO", "POSICIÓN NO DISPONIBLE", "TIMEOUT"][err.code] || err.message;
        console.warn("[GPS] ❌ error:", motivo);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

// ── ipapi.co desde el navegador ──────────────────────────────
function pedirIpapi() {
  return fetch("https://ipapi.co/json/")
    .then(r => r.json())
    .then(d => {
      console.log("[ipapi] lat:", d.latitude, "| lon:", d.longitude);
      return d;
    })
    .catch(e => { console.warn("[ipapi] falló:", e.message); return null; });
}

// ── Geo principal ────────────────────────────────────────────
async function obtenerGeo() {
  const [gps, ipapi] = await Promise.all([pedirGPS(), pedirIpapi()]);

  const ip     = ipapi?.ip           ?? "no disponible";
  const ciudad = ipapi?.city         ?? "";
  const region = ipapi?.region       ?? "";
  const pais   = ipapi?.country_name ?? "";

  if (gps) {
    // GPS: strings con 6 decimales exactos desde toFixed sobre el float nativo
    console.log("[geo] FUENTE: GPS →", gps.latitud, gps.longitud);
    return { ip, ciudad, region, pais,
             latitud: gps.latitud, longitud: gps.longitud,
             fuenteGeo: "GPS/navegador" };
  }

  // Fallback ipapi.co: convertir número a string con 6 decimales
  const latStr = fmtCoord(ipapi?.latitude);
  const lonStr = fmtCoord(ipapi?.longitude);
  console.log("[geo] FUENTE: ipapi.co →", latStr, lonStr);
  return { ip, ciudad, region, pais,
           latitud: latStr, longitud: lonStr,
           fuenteGeo: "IP/ipapi.co" };
}

// ── Guardar en Supabase ──────────────────────────────────────
async function guardarSupabase(geo) {
  try {
    // Las coords ya son strings con 6 decimales — castear a float para Supabase
    const payload = {
      ip:       geo.ip,
      ciudad:   geo.ciudad,
      region:   geo.region,
      pais:     geo.pais,
      latitud:  geo.latitud  !== null ? parseFloat(geo.latitud)  : null,
      longitud: geo.longitud !== null ? parseFloat(geo.longitud) : null
    };
    console.log("[supabase] payload:", JSON.stringify(payload));
    const res = await fetch(SUPABASE_URL, {
      method: "POST",
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type":  "application/json",
        "Prefer":        "return=representation"
      },
      body: JSON.stringify(payload)
    });
    const txt = await res.text();
    if (res.ok) console.log("[supabase] ✅ guardado:", txt);
    else        console.warn("[supabase] ❌", res.status, txt);
  } catch(e) {
    console.error("[supabase] excepción:", e.message);
  }
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  let intentos = getIntentos();
  renderDots(intentos);

  const sendBtn   = document.getElementById("sendBtn");
  const fieldName = document.getElementById("fieldName");
  const fieldMsg  = document.getElementById("fieldMsg");

  if (!sendBtn) return;
  if (intentos <= 0) {
    sendBtn.disabled = true;
    setStatus("🚫 Sin intentos restantes.", "#ef4444");
  }

  sendBtn.addEventListener("click", async () => {
    const nombre  = fieldName?.value.trim() || "";
    const mensaje = fieldMsg?.value.trim()  || "";

    if (!nombre)  { setStatus("⚠ Por favor escribe tu nombre.", "#f97316"); return; }
    if (!mensaje) { setStatus("⚠ El mensaje no puede estar vacío.", "#f97316"); return; }

    intentos = getIntentos();
    if (intentos <= 0) {
      sendBtn.disabled = true;
      setStatus("🚫 Sin intentos restantes.", "#ef4444");
      return;
    }

    sendBtn.disabled = true;
    setStatus("📡 Obteniendo ubicación…", "#60a5fa");

    try {
      const geo = await obtenerGeo();
      console.log("[contacto] geo FINAL →", JSON.stringify(geo));

      setStatus("📨 Enviando mensaje…", "#60a5fa");

      // Mandar correo + guardar Supabase en paralelo
      const [resp] = await Promise.all([
        fetch("/enviar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre, mensaje,
            ip:        geo.ip,
            latitud:   geo.latitud,   // string "−1.872530"
            longitud:  geo.longitud,  // string "−79.987807"
            fuenteGeo: geo.fuenteGeo,
            ciudad:    geo.ciudad,
            region:    geo.region,
            pais:      geo.pais
          })
        }),
        guardarSupabase(geo)
      ]);

      const result = await resp.json();

      if (result.ok) {
        intentos--;
        setIntentos(intentos);
        renderDots(intentos);
        setStatus("✅ Mensaje enviado.", "#4ade80");
        showNotif(nombre, mensaje.length > 40 ? mensaje.slice(0, 40) + "…" : mensaje);
        if (fieldName) fieldName.value = "";
        if (fieldMsg)  fieldMsg.value  = "";
        if (intentos <= 0) {
          sendBtn.disabled = true;
          setStatus("🚫 Sin intentos restantes.", "#ef4444");
        } else {
          sendBtn.disabled = false;
        }
      } else {
        setStatus("❌ Error al enviar. Intenta de nuevo.", "#ef4444");
        sendBtn.disabled = false;
      }
    } catch (err) {
      console.error("[contacto] Error:", err);
      setStatus("❌ Error de conexión.", "#ef4444");
      sendBtn.disabled = false;
    }
  });
});