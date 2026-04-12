/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
let MAX_MSGS = 15;
let STORE_KEY = "msg_count_v1";

/* ─────────────────────────────────────────
   DOM
───────────────────────────────────────── */
const sendBtn = document.getElementById("sendBtn");
const fieldName = document.getElementById("fieldName");
const fieldMsg = document.getElementById("fieldMsg");
const statusMsg = document.getElementById("statusMsg");
const dots = document.querySelectorAll(".dot");

/* ─────────────────────────────────────────
   COUNT STORAGE
───────────────────────────────────────── */
function getCount() {
  return parseInt(localStorage.getItem(STORE_KEY) || "0");
}

function setCount(n) {
  localStorage.setItem(STORE_KEY, n);
}

/* ─────────────────────────────────────────
   MENSAJE LIMITE
───────────────────────────────────────── */
function showLimitMessage() {
  statusMsg.textContent = "🚫 Has alcanzado el límite de mensajes enviados";
  statusMsg.className = "status-msg error";

  sendBtn.disabled = true;
  sendBtn.textContent = "Límite alcanzado";
}

/* ─────────────────────────────────────────
   UI DOTS
───────────────────────────────────────── */
function updateDots() {
  const used = getCount();

  dots.forEach((d, i) => d.classList.toggle("used", i < used));

  if (used >= MAX_MSGS) {
    showLimitMessage();
  }
}

/* ─────────────────────────────────────────
   CLICK SEND
───────────────────────────────────────── */
sendBtn.addEventListener("click", async () => {
  const name = fieldName.value.trim();
  const msg = fieldMsg.value.trim();

  // VALIDACIÓN
  if (!name || !msg) {
    statusMsg.textContent = "Completa los campos";
    statusMsg.className = "status-msg error";
    return;
  }

  // LÍMITE
  if (getCount() >= MAX_MSGS) {
    showLimitMessage();
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Enviando...";

  try {
    const res = await fetch("http://localhost:3000/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        msg
      })
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      throw new Error(data.error || "Error al enviar");
    }

    // SUCCESS
    const newCount = getCount() + 1;
    setCount(newCount);
    updateDots();

    statusMsg.textContent = "✅ Mensaje enviado correctamente";
    statusMsg.className = "status-msg";

    fieldName.value = "";
    fieldMsg.value = "";

    if (newCount >= MAX_MSGS) {
      showLimitMessage();
    } else {
      sendBtn.disabled = false;
      sendBtn.textContent = "Enviar mensaje";
    }

  } catch (err) {
    console.error(err);
    statusMsg.textContent = "❌ Error al enviar mensaje";
    statusMsg.className = "status-msg error";

    sendBtn.disabled = false;
    sendBtn.textContent = "Enviar mensaje";
  }
});

/* INIT */
updateDots();