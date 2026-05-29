console.log("JS cargado correctamente");

// ===============================
// ELEMENTOS
// ===============================
const btnEnviar = document.getElementById("sendBtn");
const campoNombre = document.getElementById("fieldName");
const campoMensaje = document.getElementById("fieldMsg");

const notif = document.getElementById("notif");
const notifTitle = document.getElementById("notifTitle");
const notifBody = document.getElementById("notifBody");

const statusMsg = document.getElementById("statusMsg");
const dots = document.querySelectorAll(".dot");

// ===============================
// LÍMITE DE INTENTOS (persistido)
// ===============================
const LIMITE = 5;
const LS_KEY = "intentos_restantes";

function getIntentos() {
    const guardado = localStorage.getItem(LS_KEY);
    if (guardado === null) { localStorage.setItem(LS_KEY, LIMITE); return LIMITE; }
    return parseInt(guardado);
}

function reducirIntento() {
    const nuevo = Math.max(getIntentos() - 1, 0);
    localStorage.setItem(LS_KEY, nuevo);
    return nuevo;
}

function sinIntentos() { return getIntentos() <= 0; }

// ===============================
// RELOJ
// ===============================
function actualizarHora() {
    const reloj = document.getElementById("clockTime");
    const ahora = new Date();
    let horas = ahora.getHours();
    let minutos = ahora.getMinutes();
    minutos = minutos < 10 ? "0" + minutos : minutos;
    reloj.textContent = `${horas}:${minutos}`;
}
setInterval(actualizarHora, 1000);
actualizarHora();

// ===============================
// ACTUALIZAR DOTS
// ===============================
function actualizarIntentos() {
    const intentos = getIntentos();
    dots.forEach((dot, index) => {
        dot.style.opacity = index < intentos ? "1" : "0.2";
    });
    if (intentos <= 0) bloquearFormulario();
}

// ===============================
// BLOQUEAR FORMULARIO
// ===============================
function bloquearFormulario() {
    btnEnviar.disabled = true;
    btnEnviar.style.opacity = "0.4";
    btnEnviar.style.cursor = "not-allowed";
    campoNombre.disabled = true;
    campoMensaje.disabled = true;
    statusMsg.textContent = "Límite de mensajes alcanzado";
    mostrarNotificacion("Bloqueado", "No quedan intentos disponibles");
}

// ===============================
// MOSTRAR NOTIFICACIÓN
// ===============================
function mostrarNotificacion(titulo, mensaje) {
    notifTitle.textContent = titulo;
    notifBody.textContent = mensaje;
    notif.classList.add("show");
    setTimeout(() => notif.classList.remove("show"), 3000);
}

// ===============================
// OBTENER UBICACIÓN DESDE BACKEND
// ===============================

async function obtenerDatosRed() {
    try {
        const d = await fetch("/geo").then(r => r.json());
        console.log("GEO:", d);
        return {
            ip:      d.ip       || "no disponible",
            latitud: d.latitud  || null,
            longitud: d.longitud || null
        };
    } catch (e) {
        console.warn("Error:", e);
        return { ip: "no disponible", latitud: null, longitud: null };
    }
}

// ===============================
// BOTÓN
// ===============================
btnEnviar.addEventListener("click", async () => {

    if (sinIntentos()) { bloquearFormulario(); return; }

    const nombre  = campoNombre.value.trim();
    const mensaje = campoMensaje.value.trim();

    if (nombre === "" || mensaje === "") {
        statusMsg.textContent = "Completa los campos";
        mostrarNotificacion("Error", "Faltan datos");
        return;
    }

    statusMsg.textContent = "Obteniendo ubicación...";
    btnEnviar.disabled = true;

    const red = await obtenerDatosRed();

    console.log("DATOS FINALES:", red);

    try {
        const respuesta = await fetch("/enviar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre,
                mensaje,
                ip:      red.ip,
                latitud: red.latitud,
                longitud: red.longitud
            })
        });

        const data = await respuesta.json();

        if (data.ok) {
            reducirIntento();
            actualizarIntentos();
            statusMsg.textContent = "Mensaje enviado";
            mostrarNotificacion(nombre, "Mensaje enviado correctamente");
            campoNombre.value = "";
            campoMensaje.value = "";
        } else {
            statusMsg.textContent = data.mensaje;
            mostrarNotificacion("Error", data.mensaje);
        }

    } catch (error) {
        console.log("ERROR:", error);
        statusMsg.textContent = "Error del servidor";
        mostrarNotificacion("Servidor", "No se pudo enviar");
    } finally {
        if (!sinIntentos()) btnEnviar.disabled = false;
    }

});

// ===============================
// INICIO
// ===============================
actualizarIntentos();