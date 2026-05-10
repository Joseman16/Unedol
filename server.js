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

// ======================
// RESEND
// ======================

const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/enviar", async (req, res) => {
    try {
        const { nombre, mensaje } = req.body;

        const data = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: process.env.TO_EMAIL,
            subject: "Nuevo mensaje desde UNEDOL",
            html: `
                <h2>Nuevo mensaje</h2>
                <p><strong>Nombre:</strong> ${nombre}</p>
                <p><strong>Mensaje:</strong> ${mensaje}</p>
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
// INSTAGRAM (Apify)
// ======================

const apify = new ApifyClient({
    token: process.env.APIFY_TOKEN,
});

app.get("/instagram", async (req, res) => {
    try {
        const run = await apify
            .actor("apify/instagram-scraper")   // actor gratuito
            .call({
                directUrls: [`https://www.instagram.com/unidadeducativaolmedo/`],
                resultsType: "posts",
                resultsLimit: 6,
            });

        const { items } = await apify
            .dataset(run.defaultDatasetId)
            .listItems();

        res.json(items);

    } catch (error) {
        console.error("Error obteniendo publicaciones de Instagram:", error);
        res.status(500).json({ error: "Error obteniendo publicaciones" });
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