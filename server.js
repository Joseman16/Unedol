import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const RESEND_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.TO_EMAIL;

/* ─────────────────────────────────────────
   SEND EMAIL
───────────────────────────────────────── */
app.post("/send-email", async (req, res) => {
  const { name, msg } = req.body;

  console.log("📩 RECIBIDO:", req.body);

  if (!name || !msg) {
    return res.status(400).json({
      ok: false,
      error: "Campos vacíos"
    });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: TO_EMAIL,
        subject: `Nuevo mensaje de ${name}`,
        html: `<p><b>De:</b> ${name}</p><p>${msg}</p>`
      })
    });

    const data = await response.json();

    console.log("STATUS:", response.status);
    console.log("RESPONSE:", data);

    if (!response.ok) {
      return res.status(400).json({
        ok: false,
        error: data
      });
    }

    return res.json({
      ok: true,
      data
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

/* ─────────────────────────────────────────
   START SERVER
───────────────────────────────────────── */
app.listen(3000, () => {
  console.log("🚀 Servidor listo en http://localhost:3000");
});