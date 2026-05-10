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
// VARIABLES
// ===============================
let intentos = 5;

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

    dots.forEach((dot, index) => {

        if(index < intentos){
            dot.style.opacity = "1";
        }else{
            dot.style.opacity = "0.2";
        }

    });

}

// ===============================
// MOSTRAR NOTIFICACIÓN
// ===============================
function mostrarNotificacion(titulo, mensaje){

    notifTitle.textContent = titulo;
    notifBody.textContent = mensaje;

    notif.classList.add("show");

    setTimeout(() => {
        notif.classList.remove("show");
    }, 3000);

}

// ===============================
// BOTÓN
// ===============================
btnEnviar.addEventListener("click", async () => {

    console.log("CLICK DETECTADO");

    const nombre = campoNombre.value.trim();
    const mensaje = campoMensaje.value.trim();

    if(nombre === "" || mensaje === ""){

        statusMsg.textContent = "Completa los campos";

        mostrarNotificacion(
            "Error",
            "Faltan datos"
        );

        return;
    }

    try {

        console.log("Enviando datos...");

        const respuesta = await fetch("/enviar", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                nombre,
                mensaje
            })

        });

        console.log("RESPUESTA:", respuesta);

        const data = await respuesta.json();

        console.log("DATA:", data);

        if(data.ok){

            intentos--;

            actualizarIntentos();

            statusMsg.textContent = "Mensaje enviado";

            mostrarNotificacion(
                nombre,
                "Mensaje enviado correctamente"
            );

            campoNombre.value = "";
            campoMensaje.value = "";

        }else{

            statusMsg.textContent = data.mensaje;

            mostrarNotificacion(
                "Error",
                data.mensaje
            );

        }

    } catch (error) {

        console.log("ERROR:", error);

        statusMsg.textContent = "Error del servidor";

        mostrarNotificacion(
            "Servidor",
            "No se pudo enviar"
        );

    }

});

// ===============================
// INICIO
// ===============================
actualizarIntentos();