import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Resend } from "resend";
import { ApifyClient } from "apify-client";

dotenv.config({ path: "./config.env" });

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin/reset", (req, res) => {
    const IP_ADMIN = "192.168.255.3";
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    if (ip !== IP_ADMIN) {
        return res.status(403).send("No autorizado");
    }

    res.send(`
        <script>
            localStorage.removeItem("intentos_restantes");
            document.write("✅ Intentos reseteados. <a href='/'>Volver</a>");
        </script>
    `);
});

// ======================
// RESEND
// ======================

const resend = new Resend(process.env.RESEND_API_KEY);

app.get("/geo", async (req, res) => {
    try {
        const ipReal = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
                    || req.socket.remoteAddress?.replace("::ffff:", "");

        const esLocal = !ipReal || ipReal === "127.0.0.1" || ipReal === "::1" || ipReal.startsWith("192.168");

        const url = esLocal
            ? "http://ip-api.com/json/?fields=status,query,lat,lon"
            : `http://ip-api.com/json/${ipReal}?fields=status,query,lat,lon`;

        const d = await fetch(url).then(r => r.json());

        console.log("ip-api.com respondió:", d);

        if (d.status !== "success") throw new Error("ip-api falló: " + d.message);

        res.json({
            ip:      d.query,
            latitud: d.lat,
            longitud: d.lon
        });

    } catch (e) {
        console.error("Error en /geo:", e);
        res.json({ ip: "no disponible", latitud: null, longitud: null });
    }
});

// ----- /enviar -----
app.post("/enviar", async (req, res) => {
    try {
        const { nombre, mensaje, ip, latitud, longitud } = req.body;
 
        console.log("DATOS RECIBIDOS:", { ip, latitud, longitud });
 
        const lat = latitud  ?? "no disponible";
        const lon = longitud ?? "no disponible";
 
        const data = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: process.env.TO_EMAIL,
            subject: "Nuevo mensaje desde UNEDOL",
            html: `
                <h2>Nuevo mensaje</h2>
                <p><strong>Nombre:</strong> ${nombre}</p>
                <p><strong>Mensaje:</strong> ${mensaje}</p>
                <hr>
                <p><strong>IP:</strong> ${ip}</p>
                <p><strong>Latitud:</strong> ${lat}</p>
                <p><strong>Longitud:</strong> ${lon}</p>
            `
        });
 
        console.log(data);
        res.json({ ok: true, data });
 
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, error: error.message });
    }
});



// ======================
// PROXY DE IMÁGENES
// Evita el bloqueo de Instagram a imágenes externas
// Uso: /proxy-img?url=https://instagram.com/...
// ======================

app.get("/proxy-img", async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send("Falta el parámetro url");
    }

    try {
        const response = await fetch(url, {
            headers: {
                // Simula una petición desde un navegador real
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.instagram.com/",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            }
        });

        if (!response.ok) {
            return res.status(response.status).send("Error al obtener la imagen");
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const buffer = await response.arrayBuffer();

        res.set("Content-Type", contentType);
        res.set("Cache-Control", "public, max-age=86400"); // cachea 24h
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("Error en proxy de imagen:", error);
        res.status(500).send("Error interno");
    }
});


// ======================
// SERVIDOR
// ======================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});