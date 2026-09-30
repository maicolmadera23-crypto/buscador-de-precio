"use strict";

/* Petición con tiempo límite. Si la respuesta es HTML (la función no está
   desplegada y Cloudflare devuelve index.html), explica qué revisar en lugar
   de fallar con "Unexpected token '<'". */
async function pedirJSON(url, ms = 15000) {
  const ctrl = new AbortController();
  const temporizador = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const texto = await r.text();
    let data;
    try {
      data = JSON.parse(texto);
    } catch {
      throw new Error(
        "/api/buscar no devolvió JSON. Revisa que la carpeta functions/ esté en la raíz del repositorio y que hayas vuelto a desplegar."
      );
    }
    if (!r.ok) throw new Error(data.error || "El servicio respondió con el código " + r.status + ".");
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("La búsqueda tardó demasiado. Intenta de nuevo.");
    if (e instanceof TypeError) throw new Error("No se pudo conectar. Revisa tu conexión a internet.");
    throw e;
  } finally {
    clearTimeout(temporizador);
  }
}

const $ = (id) => document.getElementById(id);
const seguro = (url) => (/^https:\/\//.test(url || "") ? url : null);

function mostrarEstado(texto, esError = false) {
  $("estado").textContent = texto;
  $("estado").className = esError ? "error" : "";
}

function pintarMejor(p) {
  const caja = document.createElement("div");
  caja.className = "mejor";

  const img = document.createElement("img");
  img.alt = "";
  if (seguro(p.imagen)) img.src = p.imagen;

  const info = document.createElement("div");
  const precio = document.createElement("div");
  precio.className = "precio";
  precio.textContent = p.precio;
  const titulo = document.createElement("h2");
  titulo.textContent = p.titulo;
  const tienda = document.createElement("div");
  tienda.textContent = "en " + p.tienda;
  info.append(precio, titulo, tienda);

  if (seguro(p.enlace)) {
    const a = document.createElement("a");
    a.className = "ir";
    a.textContent = "Ver producto";
    a.href = p.enlace;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    info.append(a);
  }

  caja.append(img, info);
  $("mejor").replaceChildren(caja);
}

function pintarLista(items) {
  const filas = items.map((p) => {
    const li = document.createElement("li");
    const titulo = document.createElement(seguro(p.enlace) ? "a" : "span");
    titulo.textContent = p.titulo;
    if (seguro(p.enlace)) {
      titulo.href = p.enlace;
      titulo.target = "_blank";
      titulo.rel = "noopener noreferrer";
    }
    const tienda = document.createElement("span");
    tienda.className = "tienda";
    tienda.textContent = p.tienda;
    const precio = document.createElement("span");
    precio.className = "p";
    precio.textContent = p.precio;
    li.append(titulo, precio, tienda);
    return li;
  });
  $("lista").replaceChildren(...filas);
}

$("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("q").value.trim();
  if (!q) return mostrarEstado("Escribe qué producto buscas.", true);

  $("b").disabled = true;
  $("mejor").replaceChildren();
  $("lista").replaceChildren();
  mostrarEstado("Buscando…");

  try {
    const params = new URLSearchParams({ q, pais: $("pais").value, minimo: $("minimo").value });
    const { resultados } = await pedirJSON("/api/buscar?" + params);

    if (!resultados.length) {
      return mostrarEstado("No hay resultados. Prueba con otras palabras o baja el precio mínimo.");
    }
    pintarMejor(resultados[0]);
    pintarLista(resultados.slice(1));
    mostrarEstado(resultados.length + " resultados, del más barato al más caro.");
  } catch (err) {
    mostrarEstado(err.message, true);
  } finally {
    $("b").disabled = false;
  }
});
