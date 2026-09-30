// Función serverless para Vercel: GET /api/buscar?q=...&pais=us&minimo=0
// La clave se guarda como variable de entorno SERPAPI_KEY en el panel de Vercel.

module.exports = async (req, res) => {
  const KEY = process.env.SERPAPI_KEY;
  const q = String(req.query.q || "").trim().slice(0, 120);
  const pais = /^[a-z]{2}$/.test(String(req.query.pais || "")) ? req.query.pais : "us";
  const minimo = Number(req.query.minimo) || 0;

  if (!KEY) return res.status(500).json({ error: "Falta la variable SERPAPI_KEY en Vercel." });
  if (!q) return res.status(400).json({ error: "Escribe qué producto buscas." });

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.search = new URLSearchParams({
      engine: "google_shopping",
      q,
      gl: pais,
      hl: "es",
      api_key: KEY,
    }).toString();

    const r = await fetch(url);
    const data = await r.json().catch(() => ({}));
    if (data.error) throw new Error(data.error);
    if (!r.ok) throw new Error("SerpApi respondió con el código " + r.status);

    const resultados = (data.shopping_results || [])
      .filter((p) => typeof p.extracted_price === "number" && p.extracted_price >= minimo)
      .map((p) => ({
        titulo: p.title,
        tienda: p.source,
        precio: p.price,
        valor: p.extracted_price,
        enlace: p.link || p.product_link,
        imagen: p.thumbnail,
      }))
      .sort((a, b) => a.valor - b.valor)
      .slice(0, 20);

    res.setHeader("Cache-Control", "s-maxage=3600"); // misma búsqueda = no gasta otra consulta por una hora
    return res.status(200).json({ resultados });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};
