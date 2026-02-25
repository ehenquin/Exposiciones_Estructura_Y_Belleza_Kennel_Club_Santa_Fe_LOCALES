import { CONFIG } from "./config.js";

/* =========================================================
   UTILIDADES BASE
========================================================= */

const $ = (id) => document.getElementById(id);
const CACHE = new Map();

/* =========================================================
   ESTADO GLOBAL
========================================================= */

// Estado pista de Grupos activa
window._pistaGrupoActiva = {
  eventId: null,
  groupIds: [],
  judgeId: null,
  superCats: [],
  eventName: "",
  judgeName: ""
};

// Timers de auto-guardado
const pendingTimers = new Map();

// Tiempo de espera para guardado diferido (ms)
const TIEMPO_ESPERA_GUARDADO = 3000;

/* =========================================================
   CONFIGURACIÓN DOMINIO CANINO
========================================================= */

const MAPA_SUPER_CATS = {
  "CACHORROS ESPECIALES": ["C00"],
  "CACHORROS": ["C01"],
  "JOVENES": ["C02", "C03"],
  "ADULTOS": ["C04", "C05", "C06", "C07"],
  "VETERANOS": ["C08"]
};

/* =========================================================
   NORMALIZADORES
========================================================= */

const normalizeID = (id) =>
  String(id ?? "")
    .trim()
    .toLowerCase();

// Normaliza Grupo 1 / grupo 01 / g1 → G1
function normalizeGrupo(gr) {
  const s = String(gr ?? "").trim();

  const m1 = s.match(/^g\s*(\d+)$/i);
  if (m1) return "G" + String(parseInt(m1[1], 10));

  const m2 = s.match(/^grupo\s*(\d+)$/i);
  if (m2) return "G" + String(parseInt(m2[1], 10));

  return s;
}

// Helpers tolerantes (por si backend LOCAL usa variantes)
const eventoOf = (r) =>
  normalizeID(
    r?.IDEvento ??
    r?.IdEvento ??
    r?.IDEVENTO ??
    ""
  );

const juezOf = (r) =>
  normalizeID(
    r?.IDJuez ??
    r?.IdJuez ??
    r?.IDJUEZ ??
    ""
  );

/* =========================================================
   FORMATEO FECHA
========================================================= */

function formatFechaCristiana(fechaInput) {
  if (!fechaInput) return "";

  const partes = String(fechaInput).split("-");
  if (partes.length !== 3) return fechaInput;

  const [year, month, day] = partes;
  return `${day}/${month}/${year}`;
}






















/* =========================================================
   1. NÚCLEO Y COMUNICACIÓN (VERSIÓN LOCAL ROBUSTA)
========================================================= */

async function api(metodo, params = {}, body = null) {
  if (!CONFIG.API_URL) {
    throw new Error("CONFIG.API_URL no está definido.");
  }

  const url = new URL(CONFIG.API_URL);

  const sessionKey =
    sessionStorage.getItem("USER_API_KEY") ||
    CONFIG.API_KEY ||
    "";

  // Parámetros GET
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, v);
    }
  });

  const options = {
    method: metodo,
    redirect: "follow"
  };

  if (metodo === "GET") {
    if (sessionKey) {
      url.searchParams.set("key", sessionKey);
    }
  } else {
    const payload = {
      ...(body || {})
    };

    if (sessionKey) {
      payload.key = sessionKey;
    }

    options.body = JSON.stringify(payload);

    // Apps Script funciona mejor con text/plain
    options.headers = {
      "Content-Type": "text/plain;charset=utf-8"
    };
  }

  try {
    const response = await fetch(url.toString(), options);

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error("La API no devolvió JSON válido.");
    }

    // Tolerancia para backends locales sin estructura estricta
    if (data && typeof data === "object") {
      if (data.ok === false) {
        throw new Error(data.error || "Error en servidor.");
      }
      return data;
    }

    throw new Error("Respuesta inesperada del servidor.");

  } catch (err) {
    console.error("API ERROR:", err);
    throw err;
  }
}

window.api = api;















/* =========================================================
   STATUS
========================================================= */

function setStatus(m, err = false) {
  const s = $("status");
  if (!s) return;

  s.textContent = m || "";
  s.style.color = err ? "#c0392b" : "#2c3e50";
}

/* =========================================================
   SYNC GLOBAL (LOCAL SAFE)
========================================================= */

// 1. FUNCION SYNCALL (CON FALLBACK SI FALTAN TABLAS)
async function syncAll() {
  setStatus("Sincronizando datos...");

  try {
    const res = await api("GET", { action: "sync" });

    // Soporta:
    // { ok:true, data:{...} }
    // { data:{...} }
    // { ...directamente tablas... }
    const data =
      res?.data && typeof res.data === "object"
        ? res.data
        : (typeof res === "object" ? res : {});

    CACHE.clear();

    // Cargar todo lo que vino
    Object.keys(data).forEach(tabla => {
      CACHE.set(tabla, Array.isArray(data[tabla]) ? data[tabla] : []);
    });

    // ============================
    // FIX REAL: si "Catalogo_Grupos" no vino en sync, lo pedimos aparte
    // ============================
    const required = [
      "Catalogo_Grupos",
      "Catalogo_Razas",
      "Catalogo_Categorias",
      "Catalogo_Sexos",
      "Catalogo_Titulos",
      "Catalogo_Perros_Inscriptos",
      "Eventos",
      "Jueces"
    ];

    for (const t of required) {
      const hasKey = CACHE.has(t);
      const rows = CACHE.get(t) || [];

      if (!hasKey || rows.length === 0) {
        // fallback: pedir tabla puntual
        try {
          const r = await api("GET", { action: "getData", table: t });

          // intentamos varias formas comunes de respuesta
          const rows2 =
            (Array.isArray(r?.data) ? r.data : null) ||
            (Array.isArray(r?.rows) ? r.rows : null) ||
            (Array.isArray(r?.data?.[t]) ? r.data[t] : null) ||
            (Array.isArray(r?.[t]) ? r[t] : null) ||
            [];

          CACHE.set(t, rows2);

        } catch (e) {
          // si getData no existe o falla, no rompemos la app
          // pero lo dejamos LOGUEADO
          console.warn(`[syncAll] No pude traer ${t} por getData:`, e?.message || e);
        }
      }
    }

    // LOGS reales (sin inventos)
    console.log("TABLAS EN CACHE:", Array.from(CACHE.keys()));
    console.log("KEY Catalogo_Grupos encontrada:", CACHE.has("Catalogo_Grupos") ? "(SI)" : "(NO)");
    console.log("Catalogo_Grupos rows:", (CACHE.get("Catalogo_Grupos") || []).length);

    setStatus("Sincronizado.");

    // Sugerencia catálogo
    const perros = CACHE.get("Catalogo_Perros_Inscriptos") || [];
    if (typeof sugerirNroCatalogo === "function") sugerirNroCatalogo(perros);

    // Refrescar BIS si está activo
    if (window._pistaBisActiva && typeof renderJuzgamientoBis === "function") {
      renderJuzgamientoBis();
    }

    return data;

  } catch (e) {
    setStatus("Error de red: " + (e.message || e), true);
    throw e;
  }
}

window.syncAll = syncAll;



/* =========================================================
   TRADUCCIÓN DE TÍTULOS
========================================================= */

function traducirTitulos(idsStr, listaTitulos) {
  if (!idsStr) return "Ninguno";

  const titulos = listaTitulos || [];

  return String(idsStr)
    .split(",")
    .map(id => {
      const clean = String(id).trim();
      const found = titulos.find(t =>
        String(t.IDTitulo || t.IdTitulo || "").trim() === clean
      );
      return found?.NombreTitulo || clean;
    })
    .filter(Boolean)
    .join(", ");
}






// ===============================
// CACHE GET INTELIGENTE (FIX TABLAS QUE VIENEN CON NOMBRE RARO)
// ===============================
function _normKey(k) {
  return String(k || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // saca tildes
    .replace(/\s+/g, "_");          // espacios -> _
}

function cacheGetSmart(tableName) {
  // 1) intento directo
  if (CACHE.has(tableName)) return CACHE.get(tableName) || [];

  // 2) busco por normalización
  const wanted = _normKey(tableName);
  for (const [k, v] of CACHE.entries()) {
    if (_normKey(k) === wanted) return v || [];
  }
  return [];
}
















/* =========================================================
   2. GESTIÓN DE CATÁLOGOS (LOCAL SAFE)
========================================================= */

function loadCatalog() {
  const sel = $("catalogo");
  if (!sel) return;

  const table = sel.value;
  if (!table) return;

  setStatus("Cargando " + table + "...");

  let rows = cacheGetSmart(table);

  if (rows.length > 0) {

    const insc    = CACHE.get("Catalogo_Perros_Inscriptos") || [];
    const razas   = CACHE.get("Catalogo_Razas") || [];
    const cats    = CACHE.get("Catalogo_Categorias") || [];
    const sexos   = CACHE.get("Catalogo_Sexos") || [];
    const titulos = CACHE.get("Catalogo_Titulos") || [];
    const eventos = CACHE.get("Eventos") || [];
    const jueces  = CACHE.get("Jueces") || [];
    const grupos  = CACHE.get("Catalogo_Grupos") || [];

    /* =======================
       PERROS INSCRIPTOS
    ======================== */

    if (table === "Catalogo_Perros_Inscriptos") {

      rows = rows.map(r => ({
        "Nro": r.NumeroCatalogo || "",
        "Grupo": r.IDGrupo || "",
        "Raza":
          razas.find(x => String(x.IDRaza) === String(r.IDRaza))?.NombreRaza
          || r.IDRaza
          || "",
        "Categoría":
          cats.find(x => String(x.IDCategoria) === String(r.IDCategoria))?.NombreCategoria
          || r.IDCategoria
          || "",
        "Sexo":
          sexos.find(x => String(x.IDSexo) === String(r.IDSexo))?.NombreSexo
          || r.IDSexo
          || "",
        "Títulos": traducirTitulos(r.Titulos, titulos),
        "Observaciones": r.Observaciones || ""
      }));
    }

    /* =======================
       RESULTADOS RAZAS
    ======================== */

    else if (table === "Resultados_Razas") {

      const consolidados = new Map();

      rows.forEach(r => {
        const clave = `${r.IDInscripcion}_${r.IDEvento}_${r.IDJuez}`;

        if (!consolidados.has(clave)) {
          consolidados.set(clave, { ...r });
        } else {
          const ex = consolidados.get(clave);
          if (r.Puesto) ex.Puesto = r.Puesto;
          if (r.Calificacion) ex.Calificacion = r.Calificacion;
          if (r.Titulo_Ganado) ex.Titulo_Ganado = r.Titulo_Ganado;
        }
      });

      rows = Array.from(consolidados.values()).map(r => {

        const iData = insc.find(i => String(i.IDInscripcion) === String(r.IDInscripcion));
        const rData = iData ? razas.find(rz => String(rz.IDRaza) === String(iData.IDRaza)) : null;
        const eData = eventos.find(e => String(e.IDEvento) === String(r.IDEvento));
        const jData = jueces.find(j => String(j.IDJuez) === String(r.IDJuez));
        const cData = iData ? cats.find(c => String(c.IDCategoria) === String(iData.IDCategoria)) : null;
        const sData = iData ? sexos.find(s => String(s.IDSexo) === String(iData.IDSexo)) : null;

        return {
          "Nro Cat.": iData?.NumeroCatalogo || "N/D",
          "Raza": rData?.NombreRaza || "N/D",
          "Categoría": cData?.NombreCategoria || iData?.IDCategoria || "N/D",
          "Sexo": sData?.NombreSexo || iData?.IDSexo || "N/D",
          "Puesto": r.Puesto || "",
          "Calif.": r.Calificacion || "",
          "Títulos Ganados": r.Titulo_Ganado || "",
          "Evento": eData?.NombreEvento || r.IDEvento || "",
          "Juez": jData?.NombreJuez || r.IDJuez || ""
        };
      });
    }

    /* =======================
       RESULTADOS GRUPOS
    ======================== */

    else if (table === "Resultados_Grupos") {

      const consolidados = new Map();

      rows.forEach(r => {
        const clave = `${r.IDInscripcion}_${r.IDEvento}_${r.IDGrupo}`;
        if (!consolidados.has(clave)) {
          consolidados.set(clave, { ...r });
        } else {
          const ex = consolidados.get(clave);
          if (r.PuestoGrupo) ex.PuestoGrupo = r.PuestoGrupo;
        }
      });

      rows = Array.from(consolidados.values()).map(r => {

        const iData = insc.find(i => String(i.IDInscripcion) === String(r.IDInscripcion));
        const eData = eventos.find(e => String(e.IDEvento) === String(r.IDEvento));
        const gData = grupos.find(g => String(g.IDGrupo) === String(r.IDGrupo));
        const rData = iData ? razas.find(rz => String(rz.IDRaza) === String(iData.IDRaza)) : null;
        const sData = iData ? sexos.find(s => String(s.IDSexo) === String(iData.IDSexo)) : null;
        const cData = iData ? cats.find(c => String(c.IDCategoria) === String(iData.IDCategoria)) : null;

        return {
          "Nro Cat.": iData?.NumeroCatalogo || "N/D",
          "Raza": rData?.NombreRaza || "N/D",
          "Sexo": sData?.NombreSexo || "N/D",
          "Categoría": cData?.NombreCategoria || iData?.IDCategoria || "N/D",
          "Puesto Grupo": r.PuestoGrupo || "",
          "Grupo": gData?.NombreGrupo || r.IDGrupo || "",
          "Evento": eData?.NombreEvento || r.IDEvento || ""
        };
      });
    }

    /* =======================
       RESULTADOS BIS
    ======================== */

    else if (table === "Resultados_BIS") {

      rows = rows.map(r => {

        const iData = insc.find(i => String(i.IDInscripcion) === String(r.IDInscripcion));
        const rData = iData ? razas.find(rz => String(rz.IDRaza) === String(iData.IDRaza)) : null;
        const eData = eventos.find(e => String(e.IDEvento) === String(r.IDEvento));

        return {
          "Tipo BIS": r.TipoBIS || "",
          "Puesto": r.PuestoBIS || "",
          "Nro Cat.": iData?.NumeroCatalogo || "N/D",
          "Raza": rData?.NombreRaza || "N/D",
          "Evento": eData?.NombreEvento || r.IDEvento || ""
        };
      });
    }
  }

  renderTable("contCatalogos", rows);
  setStatus("Listo.");
}

/* =========================================================
   RENDER TABLA (SIN CAMBIOS LÓGICOS)
========================================================= */

function renderTable(div, rows) {

  const container = $(div);
  if (!container) return;

  if (!rows || !rows.length) {
    container.innerHTML = "Vacío.";
    return;
  }

  const colsToDelete = [
    "IDResultado",
    "IDResultadoGrupo",
    "IDResultadoBIS",
    "IDInscripcion",
    "IDJuez",
    "IDEvento",
    "IDRaza",
    "IDCategoria",
    "IDSexo",
    "IDTitulo"
  ];

  const displayRows = rows.map(r => {
    const copy = { ...r };
    colsToDelete.forEach(c => delete copy[c]);
    return copy;
  });

  if (!displayRows.length) {
    container.innerHTML = "Vacío o solo datos técnicos.";
    return;
  }

  const cols = Object.keys(displayRows[0]);

  container.innerHTML = `
    <table>
      <thead>
        <tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${displayRows.map(r =>
          `<tr>${cols.map(c => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`
        ).join("")}
      </tbody>
    </table>
  `;
}









// --- 3. EVENTOS Y JUECES (LOCAL SAFE) ---

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadEventos() {
  const rows = CACHE.get("Eventos") || [];
  const cont = $("eventosList");
  if (!cont) return;

  cont.innerHTML = rows.map(r => {
    let f = r.Fecha || "";
    if (String(f).includes("-")) f = String(f).split("T")[0];
    f = f ? formatFechaCristiana(f) : "";

    return `
      <div class="card ev-card" onclick="window.editEvento('${escapeHTML(r.IDEvento)}')">
        <strong>${escapeHTML(r.NombreEvento || "")}</strong><br>
        <small class="muted">📅 ${escapeHTML(f)}</small>
      </div>`;
  }).join("");

  window._evCache = rows;
}

window.editEvento = (id) => {
  const row = (window._evCache || []).find(r => String(r.IDEvento) === String(id));
  if (!row) return;

  const title = $("formTitle");
  if (title) title.textContent = "Editar Evento";

  buildForm("eventosForm", ["IDEvento", "NombreEvento", "Fecha", "Lugar", "Observaciones"], row);
};

async function loadJueces() {
  const rows = cacheGetSmart("Jueces") || [];
  const cont = $("juecesList");
  if (!cont) return;

  if (!rows.length) {
    cont.innerHTML = `<p class="hint-text">No hay jueces cargados.</p>`;
    return;
  }

  const html = rows.map(r => {

    const imgSrc = normalizeImageURL(r.FotoURL);

    const foto = imgSrc
      ? `<img src="${escapeHTML(imgSrc)}"
              style="
                width:110px;
                height:110px;
                border-radius:50%;
                object-fit:cover;
                border:3px solid #e0e0e0;
                flex-shrink:0;
              "
              onerror="this.style.display='none'">`
      : `<div style="
                width:110px;
                height:110px;
                border-radius:50%;
                background:#e0e0e0;
                flex-shrink:0;
              "></div>`;

    return `
      <div class="card juez-card"
           style="
             display:flex;
             align-items:center;
             gap:22px;
             padding:18px;
             cursor:pointer;
           "
           onclick="window.editJuez('${escapeHTML(r.IDJuez)}')">

        ${foto}

        <div>
          <div style="
              font-size:18px;
              font-weight:700;
              margin-bottom:6px;
          ">
            ${escapeHTML(r.NombreJuez || "")}
          </div>

          <div style="
              font-size:14px;
              color:#666;
          ">
            ${escapeHTML(r.Provincia || "N/A")} |
            ${r.IDPista ? "Pista " + r.IDPista : "Pista ?"}
          </div>
        </div>
      </div>
    `;
  }).join("");

  cont.innerHTML = html;
  window._juecesCache = rows;
}










// 1. Mapa centralizado de PROVINCIAS (ARGENTINA)
const PROVINCIAS_AR_MAP = {
  "BA": "BUENOS AIRES",
  "CABA": "CIUDAD AUTÓNOMA DE BUENOS AIRES",
  "CAT": "CATAMARCA",
  "CHA": "CHACO",
  "CHU": "CHUBUT",
  "COR": "CÓRDOBA",
  "CRR": "CORRIENTES",
  "ER": "ENTRE RÍOS",
  "FOR": "FORMOSA",
  "JUJ": "JUJUY",
  "LP": "LA PAMPA",
  "LR": "LA RIOJA",
  "MZA": "MENDOZA",
  "MIS": "MISIONES",
  "NQN": "NEUQUÉN",
  "RN": "RÍO NEGRO",
  "SAL": "SALTA",
  "SJ": "SAN JUAN",
  "SL": "SAN LUIS",
  "SC": "SANTA CRUZ",
  "SF": "SANTA FE",
  "SE": "SANTIAGO DEL ESTERO",
  "TF": "TIERRA DEL FUEGO",
  "TUC": "TUCUMÁN"
};

// Acepta: "Santa Fe", "SF", "santa fe", "Córdoba", "COR", etc.
function normalizeProvinciaInput(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  // Si viene como código (2-3 letras)
  const upper = s.toUpperCase();
  if (PROVINCIAS_AR_MAP[upper]) return upper;

  // Si viene como nombre, intentamos matchear por nombre
  const cleaned = upper
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // sin tildes
    .replace(/\s+/g, " ")
    .trim();

  // buscar por valor
  for (const [k, v] of Object.entries(PROVINCIAS_AR_MAP)) {
    const vClean = v
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    if (vClean === cleaned) return k;
  }

  // No se reconoce: devolvemos el texto original (pero “limpio”)
  return s;
}

function getProvinciaInfoFromCode(codeRaw) {
  const code = normalizeProvinciaInput(codeRaw);
  const upper = String(code || "").toUpperCase();

  // Si es un código conocido, devolvemos nombre formal
  const name =
    PROVINCIAS_AR_MAP[upper] ||
    (code ? String(code).trim() : "N/A");

  // No usamos banderas externas
  const badge = "🇦🇷";

  return { code: upper || String(code || ""), name, badge };
}

// EDIT JUEZ (SAFE)
window.editJuez = (id) => {
  const row = (window._juecesCache || []).find(r => String(r.IDJuez) === String(id));
  if (!row) return;

  const t = $("formTitleJuez");
  if (t) t.textContent = "Editar Juez";

  buildForm(
    "juecesForm",
    [
      "IDJuez",
      "NombreJuez",
      "Provincia",
      "IDPista",
      "Telefono",
      "Mail",
      "Redes",
      "FotoURL",     // ← AHORA APARECE
      "Activo",
      "Observaciones"
    ],
    row
  );
};










function limpiarInscripcion() {
  const f = $("inscripcionForm");
  if (!f) return;

  // 1) Evento activo (puede ser null)
  const activeId = (localStorage.getItem("UI_ACTIVE_EVENT_ID") || "").trim();

  // 2) Reset estándar
  f.reset();

  // 3) Limpieza explícita (por si quedaron valores ocultos)
  const clearFields = ["IDInscripcion", "Titulos", "IDGrupo", "IDCategoria", "IDSexo", "Observaciones"];
  clearFields.forEach(name => {
    if (f.elements[name]) f.elements[name].value = "";
  });

  // 4) Mantener IDEvento SOLO si existe
  if (f.elements["IDEvento"]) f.elements["IDEvento"].value = activeId || "";

  // 5) Limpieza visual de botoneras
  document.querySelectorAll("#viewInscripciones .btn-opt").forEach(btn => {
    btn.classList.remove("active", "multi");
  });

  // 6) Sincronizar selector visual de evento
  const sel = $("insEventoSelect");
  if (sel) sel.value = activeId || "";

  // 7) Reset de razas dependientes del grupo
  const razaSel = $("insRaza");
  if (razaSel) razaSel.innerHTML = '<option value="">Seleccione un Grupo primero</option>';

  // 8) Botones de acción
  const bDel = $("btnEliminarInscripcion");
  if (bDel) bDel.style.display = "none";

  const bSave = $("btnGuardarInscripcion");
  if (bSave) bSave.textContent = "Inscribir Perro";

  // 9) Sugerir número de catálogo según evento (si hay evento activo)
  const all = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  const filtrados = activeId
    ? all.filter(r => String(r?.IDEvento || "") === String(activeId))
    : all;

  const proximo = sugerirNroCatalogo(filtrados);

  if (f.elements["NumeroCatalogo"]) {
    // si sugerirNroCatalogo devuelve null/undefined, no pisamos
    if (proximo !== undefined && proximo !== null && String(proximo).trim() !== "") {
      f.elements["NumeroCatalogo"].value = proximo;
    }
  }

  setStatus("Formulario limpio y listo.");
}








async function setActiveEventInscripcion(eventId) {
  const id = String(eventId || "").trim();
  if (!id) return;

  // 1) Persistir activo (solo en localStorage; CACHE no es persistente y acá no aporta)
  localStorage.setItem("UI_ACTIVE_EVENT_ID", id);

  // 2) Setear select si existe y si la opción existe
  const sel = $("insEventoSelect");
  if (sel) {
    const opt = Array.from(sel.options || []).find(o => String(o.value) === id);
    if (opt) sel.value = id;
  }

  // 3) Setear hidden del form
  const f = $("inscripcionForm");
  if (f && f.elements["IDEvento"]) f.elements["IDEvento"].value = id;

  // 4) Texto “Estás inscribiendo en...”
  const eventos = CACHE.get("Eventos") || [];
  const info = $("insEventoInfo");
  if (info) {
    const ev = eventos.find(x => String(x?.IDEvento) === id);
    info.textContent = ev
      ? `Estás inscribiendo en: ${ev.NombreEvento || ev.Nombre || ev.IDEvento || id}`
      : "";
  }

  // 5) Refrescar lista (si existe la función)
  if (typeof loadInscripciones === "function") {
    await loadInscripciones();
  }

  return id;
}



















async function prepareInscripcionForm() {
  const grupos  = CACHE.get("Catalogo_Grupos") || [];
  const cats    = CACHE.get("Catalogo_Categorias") || [];
  const sexos   = CACHE.get("Catalogo_Sexos") || [];
  const titulos = CACHE.get("Catalogo_Titulos") || [];

  // Botoneras
  if ($("insGrupoBtns")) {
    $("insGrupoBtns").innerHTML = grupos
      .map(g => `<button type="button" class="btn-opt" data-value="${g.IDGrupo}">${g.IDGrupo}</button>`)
      .join("");
  }

  if ($("insCatBtns")) {
    $("insCatBtns").innerHTML = cats
      .map(c => `<button type="button" class="btn-opt" data-value="${c.IDCategoria}">${c.NombreCategoria}</button>`)
      .join("");
  }

  if ($("insSexoBtns")) {
    $("insSexoBtns").innerHTML = sexos
      .map(s => `<button type="button" class="btn-opt" data-value="${s.IDSexo}">${s.NombreSexo}</button>`)
      .join("");
  }

  if ($("insTitulosBtns")) {
    $("insTitulosBtns").innerHTML = titulos
      .map(t => `<button type="button" class="btn-opt" data-value="${t.IDTitulo}">${t.NombreTitulo}</button>`)
      .join("");
  }

  // Vincular botoneras con campos hidden
  setupBtnGroup("IDGrupo", false, (v) => filtrarRazasPorGrupo(v));
  setupBtnGroup("IDCategoria", false);
  setupBtnGroup("IDSexo", false);
  setupBtnGroup("Titulos", true);

  const f = $("inscripcionForm");
  const sel = $("insEventoSelect");
  const eventos = CACHE.get("Eventos") || [];

  // Select de eventos (solo si existe)
  if (sel) {
    // 1) Rebuild options solo si cambia la lista
    const hash = eventos.map(e => String(e.IDEvento)).join("|");
    if (sel.dataset.hash !== hash) {
      sel.innerHTML = eventos.map(ev => {
        const nombre = ev.NombreEvento || ev.Nombre || ev.IDEvento;

        let fechaTxt = "";
        if (ev.Fecha) {
          const d = new Date(ev.Fecha);
          if (!isNaN(d.getTime())) {
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yy = d.getFullYear();
            fechaTxt = ` (${dd}/${mm}/${yy})`;
          } else {
            fechaTxt = ` (${String(ev.Fecha)})`;
          }
        }

        return `<option value="${ev.IDEvento}">${nombre}${fechaTxt}</option>`;
      }).join("");

      sel.dataset.hash = hash;
    }

    // 2) Determinar evento activo válido
    const stored = String(localStorage.getItem("UI_ACTIVE_EVENT_ID") || "");
    const lastId = eventos.length ? String(eventos[eventos.length - 1].IDEvento || "") : "";
    let activo = stored || lastId || "";

    if (sel.options.length) {
      const exists = Array.from(sel.options).some(o => String(o.value) === String(activo));
      if (!exists) activo = String(sel.options[0].value || "");
      sel.value = activo;
    }

    // 3) Aplicar activo vía función central (setea localStorage, hidden, info, loadInscripciones)
    if (typeof setActiveEventInscripcion === "function") {
      await setActiveEventInscripcion(sel.value);
    } else {
      // fallback mínimo si todavía no existe la función
      localStorage.setItem("UI_ACTIVE_EVENT_ID", sel.value);
      if (f && f.elements["IDEvento"]) f.elements["IDEvento"].value = sel.value;
    }

    // 4) Bind onchange una sola vez
    if (!sel.dataset.bound) {
      sel.onchange = async () => {
        const id = String(sel.value || "");
        if (typeof setActiveEventInscripcion === "function") {
          await setActiveEventInscripcion(id);
        } else {
          localStorage.setItem("UI_ACTIVE_EVENT_ID", id);
          if (f && f.elements["IDEvento"]) f.elements["IDEvento"].value = id;
          if (typeof loadInscripciones === "function") await loadInscripciones();
        }

        // recalcular número sugerido por evento
        let rr = CACHE.get("Catalogo_Perros_Inscriptos") || [];
        if (id) rr = rr.filter(r => String(r.IDEvento) === String(id));
        const prox = sugerirNroCatalogo(rr);
        if (f && f.elements["NumeroCatalogo"]) f.elements["NumeroCatalogo"].value = prox;
      };

      sel.dataset.bound = "1";
    }
  }

  // 5) Sugerir nro al entrar (por evento activo actual)
  if (f && f.elements["NumeroCatalogo"]) {
    const activeId = String(localStorage.getItem("UI_ACTIVE_EVENT_ID") || (sel?.value || ""));
    let rr = CACHE.get("Catalogo_Perros_Inscriptos") || [];
    if (activeId) rr = rr.filter(r => String(r.IDEvento) === String(activeId));
    f.elements["NumeroCatalogo"].value = sugerirNroCatalogo(rr);
  }
}






















function filtrarRazasPorGrupo(grupoId) {
  const sel = $("insRaza");
  if (!sel) return;

  const id = String(grupoId || "").trim();
  if (!id) {
    sel.innerHTML = '<option value="">Seleccione un Grupo primero</option>';
    return;
  }

  const razas = CACHE.get("Catalogo_Razas") || [];
  const filt = razas
    .filter(r => String(r.IDGrupo) === String(id))
    .sort((a, b) => (a.NombreRaza || "").localeCompare(b.NombreRaza || ""));

  sel.innerHTML =
    `<option value="">Seleccione Raza</option>` +
    filt.map(r => `<option value="${r.IDRaza}">${r.NombreRaza}</option>`).join("");
}



async function loadInscripciones(filtroManual = {}) {
  const listCont = $("inscripcionesList");

  // 1) base rows
  const rowsAll = CACHE.get("Catalogo_Perros_Inscriptos") || [];

  // 2) evento activo: select > localStorage
  const selEv = $("insEventoSelect");
  const activeEventId = String(
    (selEv?.value || "") || (localStorage.getItem("UI_ACTIVE_EVENT_ID") || "")
  ).trim();

  // 3) si el dataset realmente trae IDEvento, filtramos
  const datasetTraeEvento = rowsAll.some(r => String(r?.IDEvento || "").trim() !== "");
  let rows = rowsAll;
  if (activeEventId && datasetTraeEvento) {
    rows = rowsAll.filter(r => String(r?.IDEvento || "").trim() === activeEventId);
  }

  const razas   = CACHE.get("Catalogo_Razas") || [];
  const cats    = CACHE.get("Catalogo_Categorias") || [];
  const sexos   = CACHE.get("Catalogo_Sexos") || [];
  const titulos = CACHE.get("Catalogo_Titulos") || [];

  // 4) empty state
  if (!rows.length) {
    if (listCont) listCont.innerHTML = `<p class="hint-text ins-empty">No hay perros cargados.</p>`;
    window._insCache = [];
    return;
  }

  // 5) sugerencia número catálogo (si tenés tu función, usala)
  try {
    if (typeof sugerirNroCatalogo === "function") {
      sugerirNroCatalogo(rows);
    }
  } catch (_) {}

  // 6) enrich
  let enriched = rows.map(r => ({
    ...r,
    NombreRaza:
      razas.find(x => String(x.IDRaza) === String(r.IDRaza))?.NombreRaza ||
      ("Raza " + (r.IDRaza ?? "")),
    NombreSexo:
      sexos.find(x => String(x.IDSexo) === String(r.IDSexo))?.NombreSexo ||
      (r.IDSexo ?? ""),
    NombreCategoria:
      cats.find(x => String(x.IDCategoria) === String(r.IDCategoria))?.NombreCategoria ||
      (r.IDCategoria ?? "")
  }));

  // 7) filtros UI (grupo/raza)
  const fGrupo = $("filterGrupo");
  const fRaza  = $("filterRaza");

  if (fGrupo && fRaza) {
    const gruposEnLista = [...new Set(enriched.map(r => r.IDGrupo))].filter(Boolean).sort();

    const curG = filtroManual.grupo ?? fGrupo.value ?? "";
    fGrupo.innerHTML =
      '<option value="">Todos Grupos</option>' +
      gruposEnLista.map(g => `<option value="${g}">${g}</option>`).join("");
    fGrupo.value = curG || "";

    const rowsForRaza = curG ? enriched.filter(r => r.IDGrupo === curG) : enriched;
    const razasEnLista = [...new Set(rowsForRaza.map(r => r.NombreRaza))].filter(Boolean).sort();

    const curR = filtroManual.raza ?? fRaza.value ?? "";
    fRaza.innerHTML =
      '<option value="">Todas Razas</option>' +
      razasEnLista.map(rn => `<option value="${rn}">${rn}</option>`).join("");
    fRaza.value = curR || "";
  }

  if (filtroManual.grupo) enriched = enriched.filter(r => r.IDGrupo === filtroManual.grupo);
  if (filtroManual.raza)  enriched = enriched.filter(r => r.NombreRaza === filtroManual.raza);

  // 8) orden
  enriched.sort((a, b) =>
    String(a.IDGrupo || "").localeCompare(String(b.IDGrupo || "")) ||
    String(a.NombreRaza || "").localeCompare(String(b.NombreRaza || "")) ||
    (Number(a.NumeroCatalogo) - Number(b.NumeroCatalogo))
  );

  // 9) render
  let html = "", lg = "", lr = "";
  for (const r of enriched) {
    if (r.IDGrupo !== lg) {
      html += `<div class="list-group-header">Grupo ${r.IDGrupo}</div>`;
      lg = r.IDGrupo; lr = "";
    }
    if (r.NombreRaza !== lr) {
      html += `<div class="list-breed-header">${r.NombreRaza}</div>`;
      lr = r.NombreRaza;
    }

    const sexoDisplay = r.IDSexo ? r.NombreSexo : `<span class="warn-strong">SIN SEXO</span>`;

    let nombresTitulos = "";
    if (r.Titulos) {
      const ids = String(r.Titulos).split(",").map(t => t.trim()).filter(Boolean);
      nombresTitulos = ids
        .map(id => titulos.find(x => String(x.IDTitulo) === String(id))?.NombreTitulo || id)
        .join(", ");
    }

    html += `
      <div class="card insc-item" data-id="${r.IDInscripcion}">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="insc-num">#${r.NumeroCatalogo}</span>
          <span class="insc-meta">${sexoDisplay} | ${r.NombreCategoria}</span>

          ${nombresTitulos
            ? `<span style="font-size:12px;color:#666;margin-left:auto;">${nombresTitulos}</span>`
            : `<span style="margin-left:auto;"></span>`}

          <button type="button" class="btn" style="padding:6px 10px;font-size:12px;"
            onclick="event.stopPropagation(); window.editInscripcion('${r.IDInscripcion}')">
            EDITAR PERRO
          </button>
        </div>
      </div>
    `;
  }

  if (listCont) listCont.innerHTML = html;

  // cache para editar: guardo rows originales (no enriched)
  window._insCache = rows;
}










async function refreshInscripcionesUI({ setNextNumero = true } = {}) {
  // 1) Sync backend -> CACHE
  await syncAll();

  // 2) Re-armar UI (select de eventos, botones, etc.)
  await prepareInscripcionForm();

  // 3) Re-render listado
  await loadInscripciones();

  // 4) Recalcular sugerencia de Número de Catálogo
  try {
    const f = $("inscripcionForm");
    const sel = $("insEventoSelect");

    const activeId = String(
      (sel?.value || "") || (localStorage.getItem("UI_ACTIVE_EVENT_ID") || "")
    ).trim();

    let rows = CACHE.get("Catalogo_Perros_Inscriptos") || [];

    // Filtrar por evento SOLO si el dataset trae IDEvento realmente
    const datasetTraeEvento = rows.some(r => String(r?.IDEvento || "").trim() !== "");
    if (activeId && datasetTraeEvento) {
      rows = rows.filter(r => String(r?.IDEvento || "").trim() === activeId);
    }

    // Próximo número
    let maxN = 0;
    for (const r of rows) {
      const n = Number(String(r?.NumeroCatalogo ?? "").replace(/[^\d]/g, ""));
      if (!Number.isNaN(n) && n > maxN) maxN = n;
    }
    const next = (maxN + 1) || 1;

    // Set input si corresponde
    const inputNC = f?.elements?.["NumeroCatalogo"];
    if (inputNC) {
      const cur = String(inputNC.value || "").trim();
      if (setNextNumero || cur === "") inputNC.value = next;
    }

    // Hint (si existe alguno)
    const hint =
      $("insNumeroHint") ||
      $("insNumeroSugerencia") ||
      $("insNumeroSug") ||
      $("numeroCatalogoHint") ||
      $("numeroCatalogoSugerencia");

    if (hint) {
      hint.textContent = `Sugerencia: ${next} o ${String(next).padStart(3, "0")}`;
    }
  } catch (e) {
    console.warn("refreshInscripcionesUI: no pude recalcular NumeroCatalogo", e?.message || e);
  }
}


















window.editInscripcion = (id) => {
  const row = (window._insCache || []).find(r => String(r.IDInscripcion) === String(id));
  const f = $("inscripcionForm");
  if (!row || !f) return;

  // Evento activo (NO cambiar dinámicamente)
  const sel = $("insEventoSelect");
  const activeEventId = String(
    (sel?.value || "") || (localStorage.getItem("UI_ACTIVE_EVENT_ID") || "")
  ).trim();

  if ($("btnEliminarInscripcion")) $("btnEliminarInscripcion").style.display = "inline-block";
  if ($("btnGuardarInscripcion")) $("btnGuardarInscripcion").textContent = "Actualizar Perro";

  if (f.elements["IDInscripcion"])  f.elements["IDInscripcion"].value   = row.IDInscripcion || "";

  // ✅ Clave: mantener el evento activo, NO el del row
  if (f.elements["IDEvento"])       f.elements["IDEvento"].value        = activeEventId || (row.IDEvento || "");

  if (f.elements["NumeroCatalogo"]) f.elements["NumeroCatalogo"].value  = row.NumeroCatalogo || "";
  if (f.elements["IDGrupo"])        f.elements["IDGrupo"].value         = row.IDGrupo || "";
  if (f.elements["IDCategoria"])    f.elements["IDCategoria"].value     = row.IDCategoria || "";
  if (f.elements["IDSexo"])         f.elements["IDSexo"].value          = row.IDSexo || "";
  if (f.elements["Titulos"])        f.elements["Titulos"].value         = row.Titulos || "";
  if (f.elements["Observaciones"])  f.elements["Observaciones"].value   = row.Observaciones || "";

  refreshBtnVisuals("IDGrupo", row.IDGrupo);
  refreshBtnVisuals("IDCategoria", row.IDCategoria);
  refreshBtnVisuals("IDSexo", row.IDSexo);
  refreshBtnVisuals("Titulos", row.Titulos, true);

  if (row.IDGrupo) {
    filtrarRazasPorGrupo(row.IDGrupo);
    if ($("insRaza")) $("insRaza").value = row.IDRaza || "";
  } else {
    if ($("insRaza")) $("insRaza").innerHTML = '<option value="">Seleccione un Grupo primero</option>';
  }

  setStatus("Editando perro #" + (row.NumeroCatalogo || ""));
};







// --- 5. PISTAS Y RESULTADOS (ETAPA RAZAS) ---
// --- 5. PISTAS Y RESULTADOS (ETAPA RAZAS) ---
window._juezSeleccionadoPista = null;

async function preparePistasForm() {
  const E = CACHE.get("Eventos") || [];
  const selectEvento = $("pistaEventoSelect");

  if (selectEvento) {
    selectEvento.innerHTML = E
      .map(e => `<option value="${e.IDEvento}">${e.NombreEvento}</option>`)
      .join("");

    // bind 1 vez
    if (!selectEvento.dataset.bound) {
      selectEvento.onchange = () => {
        window._juezSeleccionadoPista = null;
        renderBotonerasPista();
      };
      selectEvento.dataset.bound = "1";
    }
  }

  renderBotonerasPista();
}




function renderBotonerasPista() {
  const idEvento = $("pistaEventoSelect")?.value;
  if (!idEvento) return;

  const J = CACHE.get("Jueces") || [];
  const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  const asign = CACHE.get("Gestion_pistas") || [];

  const inscEvento = insc.filter(i => String(i.IDEvento) === String(idEvento));

  const conteo = {};
  inscEvento.forEach(p => {
    const g = normalizeGrupo(p.IDGrupo);
    if (g) conteo[g] = (conteo[g] || 0) + 1;
  });

  const gruposUnicos = Object.keys(conteo).sort();

  const pistaAsignadaParaJuez = (idJuez) => {
    const a = asign.find(x =>
      String(x.IDEvento) === String(idEvento) &&
      String(x.IDJuez) === String(idJuez) &&
      x.IDPista !== undefined && x.IDPista !== null && String(x.IDPista).trim() !== ""
    );
    return a ? String(a.IDPista).trim() : "";
  };

  const juecesHtml = J.map(j => {
    const pistaReal = pistaAsignadaParaJuez(j.IDJuez) || String(j.IDPista || "").trim();
    const pistaTxt = pistaReal ? `Pista ${pistaReal}` : "Pista ?";
    const active = (window._juezSeleccionadoPista?.idJuez === j.IDJuez) ? "active" : "";

    return `
      <button type="button"
              class="btn-opt btn-juez-pista ${active}"
              id="btnJuez_${j.IDJuez}"
              onclick="window.seleccionarJuezPista('${j.IDJuez}', '${pistaReal}')">
        ${j.NombreJuez} (${pistaTxt})
      </button>`;
  }).join("");

  const gruposHtml = gruposUnicos.map(g => {
    const yaAsignado = asign.find(a =>
      String(a.IDEvento) === String(idEvento) &&
      String(normalizeGrupo(a.IDGrupo)) === String(g)
    );

    return `
      <button type="button"
              class="btn-opt btn-grupo-directo"
              id="btnGrupoPista_${String(g).replace(/\s+/g, '_')}"
              onclick="window.toggleAsignacionGrupo('${g}')">
        ${g} (${conteo[g]}) ${yaAsignado ? '✓' : ''}
      </button>`;
  }).join("");

  const cont = $("formPistasDinamico");
  if (!cont) return;

  cont.innerHTML = `
    <div class="field">
      <label><strong>2. Seleccionar Juez</strong></label>
      <div class="btn-group-pistas">${juecesHtml || 'No hay jueces.'}</div>
    </div>
    <div class="field">
      <label><strong>3. Grupos (${inscEvento.length} perros inscriptos)</strong></label>
      <div class="btn-group-pistas">${gruposHtml || 'No hay perros.'}</div>
    </div>
  `;

  renderCronograma();
  actualizarEstadoBotoneraGrupos();

  // ✅ sugerencia coherente: solo del evento actual
  sugerirNroCatalogo(inscEvento);
}




















window.seleccionarJuezPista = (idJuez, pista) => {
  const id = String(idJuez || "").trim();
  const pistaClean = String(pista || "").trim();

  document.querySelectorAll(".btn-juez-pista").forEach(b => b.classList.remove("active"));

  const btn = $(`btnJuez_${id}`);
  if (btn) btn.classList.add("active");

  window._juezSeleccionadoPista = { idJuez: id, pista: pistaClean };

  actualizarEstadoBotoneraGrupos();
};





// 2. FUNCION TOGGLE ASIGNACION (PISTAS) (CORREGIDA)
window.toggleAsignacionGrupo = async (grupoId) => {
  if (!window._juezSeleccionadoPista?.idJuez) {
    setStatus("Error: Seleccione un juez primero.", true);
    return;
  }

  const idEvento = String($("pistaEventoSelect")?.value || "").trim();
  if (!idEvento) {
    setStatus("Error: Seleccione un evento.", true);
    return;
  }

  const { idJuez } = window._juezSeleccionadoPista;
  const grupoNorm = normalizeGrupo(grupoId);

  // Pista: usar la seleccionada; si viene vacía, intentar resolver desde Jueces
  let pista = String(window._juezSeleccionadoPista.pista || "").trim();
  if (!pista) {
    const J = CACHE.get("Jueces") || [];
    const juezRow = J.find(j => String(j.IDJuez) === String(idJuez));
    pista = String(juezRow?.IDPista || "").trim();
  }

  if (!pista) {
    setStatus("Error: El juez no tiene pista asignada.", true);
    return;
  }

  let asignaciones = CACHE.get("Gestion_pistas") || [];

  // Buscar existente por triple clave normalizada
  const existente = asignaciones.find(a =>
    String(a.IDEvento) === String(idEvento) &&
    String(a.IDJuez) === String(idJuez) &&
    String(normalizeGrupo(a.IDGrupo)) === String(grupoNorm)
  );

  // --- UPDATE INMEDIATO (optimista) ---
  let tempIdCreado = null;

  if (existente) {
    // Si hay IDAsignacion, borrar por ID; si no, por clave
    if (existente.IDAsignacion != null && String(existente.IDAsignacion).trim() !== "") {
      asignaciones = asignaciones.filter(a => String(a.IDAsignacion) !== String(existente.IDAsignacion));
    } else {
      asignaciones = asignaciones.filter(a =>
        !(
          String(a.IDEvento) === String(idEvento) &&
          String(a.IDJuez) === String(idJuez) &&
          String(normalizeGrupo(a.IDGrupo)) === String(grupoNorm)
        )
      );
    }
  } else {
    tempIdCreado = "TEMP_" + Date.now();
    asignaciones.push({
      IDAsignacion: tempIdCreado,
      IDEvento: idEvento,
      IDJuez: idJuez,
      IDGrupo: grupoNorm,
      IDPista: pista
    });
  }

  CACHE.set("Gestion_pistas", asignaciones);
  renderBotonerasPista();

  // --- COMUNICACIÓN ASÍNCRONA ---
  // Si borramos un TEMP_, no hay nada que borrar en servidor
  if (existente && String(existente.IDAsignacion || "").startsWith("TEMP_")) {
    setStatus("Eliminado local (TEMP).");
    return;
  }

  api("POST", {}, {
    action: existente ? "delete" : "create",
    table: "Gestion_pistas",
    id: existente ? (existente.IDAsignacion || null) : null,
    payload: existente
      ? null
      : { IDEvento: idEvento, IDJuez: idJuez, IDGrupo: grupoNorm, IDPista: pista }
  })
    .then((resp) => {
      // TEMP -> real
      if (!existente && tempIdCreado && resp?.id) {
        const a = CACHE.get("Gestion_pistas") || [];
        const idx = a.findIndex(x => String(x.IDAsignacion) === String(tempIdCreado));
        if (idx !== -1) {
          a[idx].IDAsignacion = resp.id;
          CACHE.set("Gestion_pistas", a);
          renderBotonerasPista();
        }
      }
      setStatus("Sincronizado.");
    })
    .catch(e => {
      setStatus("Error de red: " + e.message, true);
      // opcional: syncAll();
    });
};









function actualizarEstadoBotoneraGrupos() {
  const asignaciones = CACHE.get("Gestion_pistas") || [];
  const idEvento = String($("pistaEventoSelect")?.value || "").trim();

  document.querySelectorAll(".btn-grupo-directo").forEach(b => b.classList.remove("active"));

  if (!window._juezSeleccionadoPista?.idJuez || !idEvento) return;

  const juezId = String(window._juezSeleccionadoPista.idJuez).trim();

  asignaciones.forEach(a => {
    if (String(a.IDEvento) !== idEvento) return;
    if (String(a.IDJuez) !== juezId) return;

    const gNorm = normalizeGrupo(a.IDGrupo);
    const btnId = `btnGrupoPista_${String(gNorm).replace(/\s+/g, "_")}`;
    const btn = $(btnId);
    if (btn) btn.classList.add("active");
  });
}




function renderCronograma() {
  const data = CACHE.get("Gestion_pistas") || [];
  const J = CACHE.get("Jueces") || [];
  const idEvento = String($("pistaEventoSelect")?.value || "").trim();

  const cont = $("cronogramaPistas");
  if (!cont) return;

  if (!idEvento) {
    cont.innerHTML = "Seleccione un evento.";
    return;
  }

  const items = data.filter(p => String(p.IDEvento) === idEvento);

  cont.innerHTML = items.map(p => {
    const jNom = J.find(j => String(j.IDJuez) === String(p.IDJuez))?.NombreJuez || p.IDJuez;
    const grupoTxt = normalizeGrupo(p.IDGrupo);
    const idAsig = String(p.IDAsignacion || "").trim();
    const canDelete = idAsig !== "";

    return `
      <div class="cronograma-item">
        <span><strong>Pista ${String(p.IDPista || "").trim()}</strong> | ${grupoTxt} | ${jNom}</span>
        <button
          ${canDelete ? `onclick="window.borrarAsignacionPista('${idAsig}')"` : "disabled"}
          class="btn-del"
          title="${canDelete ? "Borrar" : "Sin IDAsignacion (no se puede borrar)"}"
        >✕</button>
      </div>
    `;
  }).join("") || "No hay asignaciones.";
}






// 3. FUNCION BORRAR ASIGNACION (CRONOGRAMA) (CORREGIDA)
window.borrarAsignacionPista = async (id) => {
  const idClean = String(id || "").trim();
  if (!idClean) {
    setStatus("No se puede borrar: falta IDAsignacion.", true);
    return;
  }

  if (!confirm("¿Borrar asignación?")) return;

  // 1) Borrado local inmediato
  let asignaciones = CACHE.get("Gestion_pistas") || [];
  asignaciones = asignaciones.filter(a => String(a.IDAsignacion) !== idClean);
  CACHE.set("Gestion_pistas", asignaciones);

  renderBotonerasPista();
  setStatus("Borrando...");

  // TEMP_ => no existe en servidor
  if (idClean.startsWith("TEMP_")) {
    setStatus("Eliminado local (TEMP).");
    return;
  }

  // 2) Borrado remoto
  api("POST", {}, { action: "delete", table: "Gestion_pistas", id: idClean })
    .then(() => setStatus("Eliminado correctamente."))
    .catch(e => {
      setStatus("Error al borrar: " + e.message, true);
      syncAll();
    });
};










async function renderJuzgamiento(pistaNro) {

  const asign = CACHE.get("Gestion_pistas") || [];
  const insc  = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  const razas = CACHE.get("Catalogo_Razas") || [];
  const cats  = CACHE.get("Catalogo_Categorias") || [];
  const sexos = CACHE.get("Catalogo_Sexos") || [];
  const res   = CACHE.get("Resultados_Razas") || [];
  const J     = CACHE.get("Jueces") || [];

  const panel = $("panelJuzgamiento");
  if (!panel) return;

  const asignaciones = asign.filter(a => String(a.IDPista) === String(pistaNro));
  if (!asignaciones.length) {
    panel.innerHTML = `<p class="hint-text">Pista vacía.</p>`;
    return;
  }

  const eventoId = asignaciones[0].IDEvento;
  const juezId   = asignaciones[0].IDJuez;

  const juezNombre =
    J.find(j => String(j.IDJuez) === String(juezId))?.NombreJuez || "Juez";

  const grupos = [...new Set(
    asignaciones.map(a => normalizeGrupo(a.IDGrupo))
  )];

  // 🔥 FILTRO NUEVO:
  // Excluir Veteranos (C08) y Campeones (C?? según tu código real)
  const CATEGORIAS_EXCLUIDAS_RAZA = ["C07", "C08"]; 
  // Si tu Campeón tiene otro código, reemplazá "C09" por el correcto.

  const perros = insc
    .filter(p => String(p.IDEvento) === String(eventoId))
    .filter(p => grupos.includes(normalizeGrupo(p.IDGrupo)))
    .filter(p => !CATEGORIAS_EXCLUIDAS_RAZA.includes(String(p.IDCategoria)));

  if (!perros.length) {
    panel.innerHTML = `<p class="hint-text">No hay perros en esta pista.</p>`;
    return;
  }

  perros.sort((a,b) =>
    normalizeGrupo(a.IDGrupo).localeCompare(normalizeGrupo(b.IDGrupo)) ||
    String(a.IDRaza).localeCompare(String(b.IDRaza)) ||
    String(a.IDCategoria).localeCompare(String(b.IDCategoria)) ||
    String(a.IDSexo).localeCompare(String(b.IDSexo)) ||
    Number(a.NumeroCatalogo) - Number(b.NumeroCatalogo)
  );

  let html = `
    <div class="live-summary">
      <strong>${juezNombre}</strong> | Grupos: ${grupos.join(", ")}
    </div>
  `;

  let lastGrupo = "";
  let lastRaza  = "";
  let lastCat   = "";

  perros.forEach(p => {

    const grupoNorm = normalizeGrupo(p.IDGrupo);

    const razaNombre =
      razas.find(r => String(r.IDRaza) === String(p.IDRaza))?.NombreRaza || p.IDRaza;

    const catNombre =
      cats.find(c => String(c.IDCategoria) === String(p.IDCategoria))?.NombreCategoria || p.IDCategoria;

    const sexoNombre =
      sexos.find(s => String(s.IDSexo) === String(p.IDSexo))?.NombreSexo || p.IDSexo;

    if (grupoNorm !== lastGrupo) {
      html += `<h3 class="juzg-header-grupo">Grupo ${grupoNorm}</h3>`;
      lastGrupo = grupoNorm;
      lastRaza = "";
      lastCat = "";
    }

    if (razaNombre !== lastRaza) {
      html += `<h4 class="juzg-header-raza">${razaNombre}</h4>`;
      lastRaza = razaNombre;
      lastCat = "";
    }

    if (catNombre !== lastCat) {
      html += `
        <div style="
          background:#e6efe3;
          padding:6px 10px;
          font-weight:600;
          border-left:4px solid #5f8f55;
          margin-top:10px;
        ">
          ${catNombre}
        </div>
      `;
      lastCat = catNombre;
    }

    const rExistente = res.find(r =>
      normalizeID(r.IDInscripcion) === normalizeID(p.IDInscripcion) &&
      normalizeID(r.IDEvento) === normalizeID(eventoId) &&
      normalizeID(r.IDJuez) === normalizeID(juezId)
    );

    const esCachorro = ["C00", "C01"].includes(String(p.IDCategoria));
    const calificaciones = esCachorro
      ? ["MP", "P"]
      : ["Exc", "MB", "B", "D"];

    html += `
      <div class="card dog-card-compact ${rExistente ? "has-result" : ""}">
        <div class="dog-topline">
          <strong>#${p.NumeroCatalogo}</strong>
          <span style="margin-left:10px;">
            ${razaNombre} | ${catNombre} | ${sexoNombre}
          </span>
        </div>

        <div class="puesto-btns">
          ${["1","2","3","4","5","6"].map(pst => `
            <button class="btn-xs ${String(rExistente?.Puesto) === pst ? "active" : ""}"
                    onclick="window.guardarResultado(event,'${p.IDInscripcion}','${juezId}','${eventoId}','${pst}','Puesto')">
              ${pst}°
            </button>
          `).join("")}
        </div>

        <div style="margin-top:8px;">
          <small>Calif:</small>
          ${calificaciones.map(c => `
            <button class="btn-xs ${String(rExistente?.Calificacion) === c ? "active" : ""}"
                    onclick="window.guardarResultado(event,'${p.IDInscripcion}','${juezId}','${eventoId}','${c}','Calificacion')">
              ${c}
            </button>
          `).join("")}
        </div>
      </div>
    `;
  });

  panel.innerHTML = html;
}










// --- 6. PISTAS GRUPOS (REFORMADO: ACCIÓN DIRECTA Y MULTISELECCIÓN) ---

// Variable global para la selección del juez
window._juezSeleccionadoGrupo = null;

async function preparePistasGruposForm() {
  const E = CACHE.get("Eventos") || [];
  const cont = $("formPistasGruposDinamico");
  if (!cont) return;

  const fmtFecha = (f) => {
    if (!f) return "";
    // soporta "YYYY-MM-DD" o ISO
    const raw = String(f).split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [yy, mm, dd] = raw.split("-");
      return ` (${dd}/${mm}/${yy})`;
    }
    // fallback
    try {
      const d = new Date(f);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = d.getFullYear();
        return ` (${dd}/${mm}/${yy})`;
      }
    } catch {}
    return "";
  };

  cont.innerHTML = `
    <div class="field">
      <label><strong>1. Seleccionar Evento</strong></label>
      <select id="pgEvento" class="select-lg">
        ${
          E.length > 0
            ? E.map(e => {
                const nombre = e.NombreEvento || e.Nombre || e.IDEvento;
                return `<option value="${e.IDEvento}">${nombre}${fmtFecha(e.Fecha)}</option>`;
              }).join("")
            : '<option value="">Sin eventos cargados</option>'
        }
      </select>
    </div>

    <div class="field">
      <label><strong>2. Seleccionar Juez de Grupo</strong></label>
      <div id="pgJuezBotonera" class="btn-group-pistas"></div>
    </div>

    <div class="field">
      <label><strong>3. Grupos a Juzgar (Tocar para activar)</strong></label>
      <div id="pgGrupoBotonera" class="btn-group-pistas"></div>
    </div>

    <div class="field supercats-box">
      <label><strong>4. Super-Categorías a Incluir:</strong></label>
      <table class="supercats-table">
        ${
          Object.keys(MAPA_SUPER_CATS).map(sc => `
            <tr>
              <td class="supercats-td-check">
                <input class="supercats-check" type="checkbox" name="superCat" value="${sc}" checked
                  onchange="autoUpdatePistaGrupo()">
              </td>
              <td class="supercats-td-label"
                  onclick="this.previousElementSibling.querySelector('input').click()">
                <span class="supercats-name">${sc}</span>
              </td>
            </tr>
          `).join("")
        }
      </table>
    </div>
  `;

  const selectEvento = $("pgEvento");
  if (selectEvento) {
    // evitar doble bind si se llama varias veces
    if (!selectEvento.dataset.bound) {
      selectEvento.onchange = () => {
        window._juezSeleccionadoGrupo = null;
        renderBotonerasPistasGrupos();
      };
      selectEvento.dataset.bound = "1";
    }
  }

  renderBotonerasPistasGrupos();
}




function renderJuzgamientoGrupos() {
  const config = window._pistaGrupoActiva;
  const container = $("panelJuzgamientoGrupos");

  if (!config || !container || !config.judgeId || !config.groupIds || config.groupIds.length === 0) {
    container.innerHTML = `
      <div class="empty-center">
        <strong>Seleccioná primero un juez y los grupos a juzgar.</strong>
      </div>`;
    return;
  }

  const insc  = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  const resR  = CACHE.get("Resultados_Razas") || [];
  const resG  = CACHE.get("Resultados_Grupos") || [];
  const razas = CACHE.get("Catalogo_Razas") || [];

  const nE = normalizeID(config.eventId);
  const nJ = normalizeID(config.judgeId);

  let html = "";
  let hayPerros = false;

  const superCats = config.superCats || [];

  superCats.forEach(scName => {
    const idsCatIncluidas = (typeof MAPA_SUPER_CATS !== "undefined" && MAPA_SUPER_CATS[scName]) 
      ? MAPA_SUPER_CATS[scName] 
      : [];

    // --- FILTRO BASE ---
    const candidatos = insc.filter(p => {
      if (!p) return false;

      if (p.IDEvento && normalizeID(p.IDEvento) !== nE) return false;

      const gPerro = normalizeGrupo(p.IDGrupo || "");
      return config.groupIds.includes(gPerro) && idsCatIncluidas.includes(p.IDCategoria);
    });

    // --- GANADORES DE RAZA ---
    const ganadores = candidatos.filter(p => {
      const rRaza = resR.find(rr =>
        normalizeID(rr.IDInscripcion) === normalizeID(p.IDInscripcion) &&
        normalizeID(rr.IDEvento) === nE &&
        normalizeID(rr.IDJuez) === nJ &&
        String(rr.Puesto) === "1" &&
        (rr.Calificacion === "Exc" || rr.Calificacion === "MP")
      );
      return !!rRaza;
    });

    // --- ORDEN ---
    ganadores.sort((a, b) => {
      return normalizeGrupo(a.IDGrupo || "").localeCompare(normalizeGrupo(b.IDGrupo || ""));
    });

    if (ganadores.length > 0) {
      hayPerros = true;

      html += `<div class="juzg-header-supercat">🏆 ${scName}</div>`;

      let lastG = "";

      ganadores.forEach(p => {
        const rNom = razas.find(rz => String(rz.IDRaza) === String(p.IDRaza))?.NombreRaza || p.IDRaza;
        const gPerro = normalizeGrupo(p.IDGrupo || "");

        if (gPerro !== lastG) {
          html += `
            <div class="grupo-sep">
              <span class="grupo-pill">${gPerro}</span>
              <div class="grupo-line"></div>
            </div>`;
          lastG = gPerro;
        }

        const r = resG.find(rg =>
          normalizeID(rg.IDInscripcion) === normalizeID(p.IDInscripcion) &&
          normalizeID(rg.IDEvento) === nE &&
          normalizeID(rg.IDJuez) === nJ
        );

        html += `
          <div class="card dog-card-compact grupo-card ${r ? 'has-grupo' : ''}">
            <div class="dog-flex-row">
              <div>
                <strong class="dog-num-lg">#${p.NumeroCatalogo || "-"}</strong>
                <div class="dog-meta">${rNom || "-"}</div>
              </div>

              <div class="puesto-btns">
                ${["1","2","3","4","5","6"].map(pst => `
                  <button type="button"
                          class="btn-xs ${String(r?.PuestoGrupo) === pst ? 'active' : ''}"
                          onclick="window.guardarResultadoGrupo(event, '${p.IDInscripcion}', '${pst}')">
                    ${pst}°
                  </button>
                `).join("")}
              </div>
            </div>
          </div>
        `;
      });
    }
  });

  // --- EMPTY STATE ---
  if (!hayPerros) {
    html = `
      <div class="wait-box">
        <span class="wait-ico">⚠️</span>
        <p class="wait-title">Esperando ganadores de raza...</p>
        <p class="wait-text">
          Los perros aparecen cuando tienen:
          <br>• Puesto = 1°
          <br>• Calificación válida (Exc / MP)
          <br><br>
          Si no aparece nada → error en carga de raza.
        </p>
        <button class="btn-solid"
          onclick="window.syncAll().then(() => window.renderJuzgamientoGrupos())">
          🔄 Re-sincronizar
        </button>
      </div>
    `;
  }

  // evitar re-render innecesario
  if (container.innerHTML !== html) {
    container.innerHTML = html;
  }
}











function renderBotonerasPistasGrupos() {
  const J = CACHE.get("Jueces") || [];
  const G = CACHE.get("Catalogo_Grupos") || [];

  const idEvento = $("pgEvento")?.value || "";
  const asign = CACHE.get("Gestion_pistas") || [];

  // ====== pista real por juez (según Gestion_pistas + evento) ======
  const pistaAsignadaParaJuez = (idJuez) => {
    if (!idEvento) return "";
    const a = asign.find(x =>
      String(x.IDEvento) === String(idEvento) &&
      String(x.IDJuez) === String(idJuez) &&
      x.IDPista !== undefined && x.IDPista !== null && String(x.IDPista) !== ""
    );
    return a ? String(a.IDPista) : "";
  };

  // ====== estado seguro (aunque _pistaGrupoActiva sea null) ======
  const activeGroupIds = Array.isArray(window._pistaGrupoActiva?.groupIds)
    ? window._pistaGrupoActiva.groupIds
    : [];

  // 1) Botones de Jueces
  const contJ = $("pgJuezBotonera");
  if (contJ) {
    contJ.innerHTML = (J.map(j => {
      const pistaReal = pistaAsignadaParaJuez(j.IDJuez) || String(j.IDPista || "");
      const pistaTxt = pistaReal ? `Pista ${pistaReal}` : "Pista ?";
      const isActive = (window._juezSeleccionadoGrupo?.idJuez === j.IDJuez);

      return `
        <button type="button"
                class="btn-opt btn-juez-grupo ${isActive ? "active" : ""}"
                id="btnJuezGrupo_${j.IDJuez}"
                onclick="window.seleccionarJuezGrupo('${j.IDJuez}', '${pistaReal || (j.IDPista || "")}')">
          ${j.NombreJuez} (${pistaTxt})
        </button>`;
    }).join("")) || '<p class="hint-text">No hay jueces cargados.</p>';
  }

  // 2) Botones de Grupos
  const contG = $("pgGrupoBotonera");
  if (contG) {
    contG.innerHTML = (G.map(g => {
      const gRaw = g.IDGrupo;
      const gNormalizado = normalizeGrupo(gRaw);

      const estabaActivo = activeGroupIds.includes(gNormalizado);

      return `
        <button type="button"
                class="btn-opt btn-grupo-item ${estabaActivo ? "active" : ""}"
                data-value="${gRaw}"
                onclick="window.toggleBotonGrupo(this)">
          ${String(gRaw || "").replace("Grupo ", "G")}
        </button>`;
    }).join("")) || '<p class="hint-text">No hay grupos cargados.</p>';
  }

  autoUpdatePistaGrupo();
}

window.seleccionarJuezGrupo = (idJuez, pista) => {
  document.querySelectorAll(".btn-juez-grupo").forEach(b => b.classList.remove("active"));
  const btn = $(`btnJuezGrupo_${idJuez}`);
  if (btn) btn.classList.add("active");

  // OJO: NO borres grupos activos acá.
  // Si querés resetear grupos cuando cambia juez, hacelo, pero conscientemente.
  // document.querySelectorAll(".btn-grupo-item").forEach(b => b.classList.remove("active"));

  const J = CACHE.get("Jueces") || [];
  const nombre = J.find(j => String(j.IDJuez) === String(idJuez))?.NombreJuez || idJuez;

  window._juezSeleccionadoGrupo = { idJuez, pista, nombre };
  autoUpdatePistaGrupo();
};

window.toggleBotonGrupo = (btn) => {
  if (!window._juezSeleccionadoGrupo) {
    setStatus("Error: Seleccione un juez primero.", true);
    return;
  }
  btn.classList.toggle("active");
  autoUpdatePistaGrupo();
};

function autoUpdatePistaGrupo() {
  const evId = $("pgEvento")?.value || "";
  const jId  = window._juezSeleccionadoGrupo?.idJuez || "";

  const groupIds = Array.from(document.querySelectorAll("#pgGrupoBotonera .btn-grupo-item.active"))
    .map(b => normalizeGrupo(b.dataset.value));

  const superCats = Array.from(document.querySelectorAll('input[name="superCat"]:checked'))
    .map(cb => cb.value);

  // en vez de null, dejamos objeto consistente (evita NPE en otros lados)
  window._pistaGrupoActiva = {
    eventId: evId || null,
    groupIds: groupIds || [],
    judgeId: jId || null,
    superCats: superCats || [],
    eventName: $("pgEvento")?.options?.[$("pgEvento")?.selectedIndex]?.text || "",
    judgeName: window._juezSeleccionadoGrupo?.nombre || ""
  };

  renderJuzgamientoGrupos();
}


window.autoUpdatePistaGrupo = autoUpdatePistaGrupo;
window.renderBotonerasPistasGrupos = renderBotonerasPistasGrupos;








// --- 7. AYUDANTES DE UI ---


function normalizeImageURL(urlRaw) {
  if (!urlRaw) return "";

  let url = String(urlRaw).trim();

  // GOOGLE DRIVE
  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  // DROPBOX
  if (url.includes("dropbox.com")) {
    return url.replace("?dl=0", "?raw=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }

  // GOOGLE PHOTOS (intento básico)
  if (url.includes("photos.google.com")) {
    return "";
  }

  // IMGUR PAGE → DIRECT
  if (url.includes("imgur.com") && !url.match(/\.(jpg|jpeg|png|webp)$/i)) {
    const parts = url.split("/");
    const id = parts.pop();
    return `https://i.imgur.com/${id}.jpg`;
  }

  return url;
}





// Provincias AR (reemplaza países)
const PROVINCIAS_AR = [
  "BUENOS AIRES",
  "CABA",
  "CATAMARCA",
  "CHACO",
  "CHUBUT",
  "CÓRDOBA",
  "CORRIENTES",
  "ENTRE RÍOS",
  "FORMOSA",
  "JUJUY",
  "LA PAMPA",
  "LA RIOJA",
  "MENDOZA",
  "MISIONES",
  "NEUQUÉN",
  "RÍO NEGRO",
  "SALTA",
  "SAN JUAN",
  "SAN LUIS",
  "SANTA CRUZ",
  "SANTA FE",
  "SANTIAGO DEL ESTERO",
  "TIERRA DEL FUEGO",
  "TUCUMÁN"
];

function setupBtnGroup(name, multi, callback) {
  const g = document.querySelector(`.btn-group[data-name="${name}"]`);
  const h = document.querySelector(`input[name="${name}"]`);

  if (!g || !h) return;

  g.onclick = (e) => {
    const b = e.target.closest(".btn-opt");
    if (!b) return;

    if (multi) {
      b.classList.toggle("active");
      b.classList.toggle("multi");

      h.value = Array.from(g.querySelectorAll(".btn-opt.active"))
        .map(x => x.dataset.value)
        .join(", ");
    } else {
      g.querySelectorAll(".btn-opt").forEach(x => x.classList.remove("active", "multi"));
      b.classList.add("active");
      h.value = b.dataset.value;
    }

    if (callback) callback(h.value);
  };
}

function refreshBtnVisuals(name, value, multi) {
  const g = document.querySelector(`.btn-group[data-name="${name}"]`);
  if (!g) return;

  const vals = multi
    ? String(value || "").split(",").map(v => v.trim()).filter(Boolean)
    : [String(value || "").trim()];

  g.querySelectorAll(".btn-opt").forEach(b => {
    const estaSeleccionado = vals.includes(String(b.dataset.value).trim());
    b.classList.toggle("active", estaSeleccionado);
    if (multi) b.classList.toggle("multi", estaSeleccionado);
  });
}

function buildForm(d, f, r) {
  const cont = $(d);
  if (!cont) return;

  const fields = Array.isArray(f) ? f : [];

  cont.innerHTML = fields.map((x) => {
    const isID = (String(x).startsWith("ID") && x !== "IDPista");
    const rawVal = r ? (r[x] ?? "") : "";
    const val = String(rawVal ?? "");

    // =========================
    // Provincia (selector)
    // =========================
    if (x === "Provincia") {
      const vNorm = val.trim().toUpperCase();

      const opciones = (PROVINCIAS_AR || [])
        .slice()
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map(p => {
          const pp = String(p || "").toUpperCase();
          const sel = (pp === vNorm) ? "selected" : "";
          return `<option value="${escapeHTML(pp)}" ${sel}>${escapeHTML(pp)}</option>`;
        })
        .join("");

      return `
        <div class="field">
          <label>Provincia</label>
          <select name="Provincia">
            <option value="">Seleccione</option>
            ${opciones}
          </select>
        </div>
      `;
    }

    // =========================
    // FotoURL (input + preview)
    // =========================
if (x === "FotoURL") {
  const url = val.trim();
  const normalized = normalizeImageURL(url);
  const show = normalized ? "" : "display:none;";

  return `
    <div class="field">
      <label>FotoURL</label>
      <input type="url"
             name="FotoURL"
             placeholder="Pegue cualquier link"
             value="${escapeHTML(url)}"
             oninput="(function(inp){
               const img = inp.parentElement.querySelector('img');
               const fixed = window.normalizeImageURL ? window.normalizeImageURL(inp.value.trim()) : inp.value.trim();
               img.src = fixed || '';
               img.style.display = fixed ? 'block' : 'none';
             })(this)">
      <div style="margin-top:12px;">
        <img src="${escapeHTML(normalized)}"
             style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:2px solid #ddd;${show}"
             onerror="this.style.display='none'">
      </div>
    </div>
  `;
}






    // =========================
    // Fecha (eventos)
    // =========================
    if (x === "Fecha") {
      let valFecha = "";
      const s = val.trim();

      if (s.includes("/")) {
        const parts = s.split("/");
        if (parts.length === 3) {
          const [dia, mes, anio] = parts;
          valFecha = `${anio}-${mes}-${dia}`;
        } else {
          valFecha = s;
        }
      } else if (s.includes("T")) {
        valFecha = s.split("T")[0];
      } else {
        valFecha = s;
      }

      return `
        <div class="field">
          <label>Fecha</label>
          <input type="date" id="eventFecha" name="Fecha" value="${escapeHTML(valFecha)}">
        </div>
      `;
    }

    // =========================
    // IDPista (num) para jueces
    // =========================
    if (x === "IDPista") {
      return `
        <div class="field">
          <label>IDPista</label>
          <input type="number" name="IDPista" min="1" step="1" value="${escapeHTML(val.trim())}">
        </div>
      `;
    }

    // =========================
    // Activo (checkbox)
    // =========================
    if (x === "Activo") {
      const v = val.trim().toLowerCase();
      const checked = (v === "1" || v === "true" || v === "si" || v === "sí" || v === "x") ? "checked" : "";
      return `
        <div class="field">
          <label style="display:flex;align-items:center;gap:10px;">
            <input type="checkbox" name="Activo" value="1" ${checked}
                   onchange="this.value = this.checked ? '1' : '';">
            <span>Activo</span>
          </label>
        </div>
      `;
    }

    // =========================
    // Eventos: IDs especiales
    // =========================
    let extraID = "";
    if (x === "NombreEvento") extraID = 'id="eventName"';
    if (x === "Lugar") extraID = 'id="eventLugar"';

    return `
      <div class="field">
        <label>${isID ? "" : escapeHTML(x)}</label>
        <input type="${isID ? "hidden" : "text"}"
               ${extraID}
               name="${escapeHTML(x)}"
               value="${escapeHTML(val)}">
      </div>
    `;
  }).join("");
}





function switchView(i) {
  ["viewCatalogos","viewEventos","viewJueces","viewInscripciones","viewPistas","viewBis"]
    .forEach((v, x) => {
      const el = $(v);
      if (el) el.classList.toggle("hidden", x !== i);
    });
}

function sugerirNroCatalogo(rows) {
  let maxN = 0, maxI = 0;

  (rows || []).forEach(r => {
    const num = String(r.NumeroCatalogo || "").toLowerCase();
    const val = parseInt(num.replace(/\D/g, ""), 10) || 0;
    if (num.includes("i")) {
      if (val > maxI) maxI = val;
    } else {
      if (val > maxN) maxN = val;
    }
  });

  const nextN = maxN + 1;
  const nextI = String(maxI + 1).padStart(3, "0") + "i";

  const hintTxt  = `Sugerencia: ${nextN} o ${nextI}`;
  const hintHtml = `Sugerencia: <strong>${nextN}</strong> o <strong>${nextI}</strong>`;

  const hintIds = [
    "nroHint",
    "insNumeroHint",
    "insNumeroSugerencia",
    "insNumeroSug",
    "numeroCatalogoHint",
    "numeroCatalogoSugerencia"
  ];

  for (const id of hintIds) {
    const el = $(id);
    if (el) {
      if (id === "nroHint") el.innerHTML = hintHtml;
      else el.textContent = hintTxt;
      break;
    }
  }

  return nextN;
}

function replaceTempIdEverywhere(tempId, realId) {
  // 1) Perros inscriptos
  const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  insc.forEach(r => { if (String(r.IDInscripcion) === String(tempId)) r.IDInscripcion = realId; });
  CACHE.set("Catalogo_Perros_Inscriptos", insc);

  // 2) Resultados Razas
  const rr = CACHE.get("Resultados_Razas") || [];
  rr.forEach(r => { if (String(r.IDInscripcion) === String(tempId)) r.IDInscripcion = realId; });
  CACHE.set("Resultados_Razas", rr);

  // 3) Resultados Grupos
  const rg = CACHE.get("Resultados_Grupos") || [];
  rg.forEach(r => { if (String(r.IDInscripcion) === String(tempId)) r.IDInscripcion = realId; });
  CACHE.set("Resultados_Grupos", rg);

  // 4) Resultados BIS
  const rb = CACHE.get("Resultados_BIS") || [];
  rb.forEach(r => { if (String(r.IDInscripcion) === String(tempId)) r.IDInscripcion = realId; });
  CACHE.set("Resultados_BIS", rb);
}















// --- 8. ACCIONES DE GUARDADO ---
// --- 8. ACCIONES DE GUARDADO ---

// --- 8. ACCIONES DE GUARDADO (CORREGIDO) ---

// --- BLOQUE 1: GUARDADO OPTIMIZADO (SIN SYNCALL) ---
async function guardarInscripcion() {
  const f = $("inscripcionForm");
  if (!f) return;

  const fd = new FormData(f);
  const row = {};
  for (const [k, v] of fd.entries()) row[k] = (typeof v === "string" ? v.trim() : v);

  // Asegurar IDEvento (evento activo)
  const activeId = String(localStorage.getItem("UI_ACTIVE_EVENT_ID") || "").trim();
  if (!row.IDEvento) row.IDEvento = activeId;
  if (!row.IDEvento) { alert("Error: No hay evento seleccionado."); return; }

  const isEdit = !!(row.IDInscripcion && String(row.IDInscripcion).trim() !== "");

  // --- PASO 1: ACTUALIZACIÓN OPTIMISTA (UI inmediata) ---
  const localId = isEdit ? String(row.IDInscripcion) : "LOCAL_" + Date.now();

  const payloadLocal = { ...row };
  if (!isEdit) payloadLocal.IDInscripcion = localId;

  let insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  if (isEdit) {
    const idx = insc.findIndex(i => String(i.IDInscripcion) === String(row.IDInscripcion));
    if (idx !== -1) insc[idx] = payloadLocal;
    else insc.push(payloadLocal); // fallback por si no estaba
  } else {
    insc.push(payloadLocal);
  }
  CACHE.set("Catalogo_Perros_Inscriptos", insc);

  // 🔥 IMPORTANTE: tu loadInscripciones usa window._insCache para editar.
  // Si no lo actualizás, después "EDITAR" puede no encontrar el perro nuevo.
  window._insCache = CACHE.get("Catalogo_Perros_Inscriptos") || [];

  // Render + limpieza inmediata
  loadInscripciones();
  limpiarInscripcion();
  setStatus("Inscripción procesada...");

  // --- PASO 2: ENVÍO EN SEGUNDO PLANO ---
  const apiPayload = { ...row };

  // Si tu backend crea el ID, NO mandar IDInscripcion al crear
  if (!isEdit) delete apiPayload.IDInscripcion;

  api("POST", {}, {
    action: isEdit ? "update" : "create",
    table: "Catalogo_Perros_Inscriptos",
    payload: apiPayload,
    id: isEdit ? row.IDInscripcion : null
  })
    .then(resp => {
      if (resp?.ok && !isEdit) {
        // Reemplazar ID local por ID real del server en CACHE
        const listaActual = CACHE.get("Catalogo_Perros_Inscriptos") || [];
        const perro = listaActual.find(i => String(i.IDInscripcion) === String(localId));
        if (perro && resp.id) {
          perro.IDInscripcion = resp.id;

          CACHE.set("Catalogo_Perros_Inscriptos", listaActual);
          window._insCache = listaActual;

          // refresco visual para que el botón EDITAR tenga ID real
          loadInscripciones();
        }
      }
      setStatus("Sincronizado con Google Sheets.");
    })
    .catch(e => {
      setStatus("Error de sincronización. Reintente.", true);
      console.error("Error en segundo plano:", e);
    });
}

async function eliminarInscripcion() {
  const f = $("inscripcionForm");
  if (!f) return;

  const id = String(f.elements["IDInscripcion"]?.value || "").trim();
  if (!id || !confirm("¿Borrar definitivamente este registro?")) return;

  try {
    setStatus("Eliminando...");

    // 1) Borrado local inmediato
    let insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
    insc = insc.filter(i => String(i.IDInscripcion) !== String(id));
    CACHE.set("Catalogo_Perros_Inscriptos", insc);
    window._insCache = insc;

    // 2) UI al toque
    limpiarInscripcion();
    loadInscripciones();

    // 3) Borrado remoto
    await api("POST", {}, { action: "delete", table: "Catalogo_Perros_Inscriptos", id });

    setStatus("Eliminado con éxito.");
  } catch (e) {
    setStatus("Error al eliminar: " + (e?.message || e), true);
    await syncAll(); // solo si falló
  }
}



window.guardarResultado = async (e, idP, idJ, idE, val, campo, esMulti = false) => {
  // 1) Captura inmediata del evento
  if (e) {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
  }

  if (!idE || idE === "undefined") return;

  // 2) Botón clickeado
  const btn = e?.currentTarget || e?.target?.closest?.(".btn-xs");
  if (!btn) return;

  // 3) Anti doble-click
  if (btn.disabled) return;
  btn.disabled = true;
  setTimeout(() => { if (btn) btn.disabled = false; }, 300);

  let res = CACHE.get("Resultados_Razas") || [];
  const nP = normalizeID(idP), nJ = normalizeID(idJ), nE = normalizeID(idE);

  // =====================================================================================
  // UNICIDAD DE PUESTOS (1-4) POR: MISMO EVENTO + MISMO JUEZ + (MISMA RAZA + MISMA CATEGORÍA)
  // Sexo NO importa.
  // =====================================================================================
  if (!esMulti && campo === "Puesto" && ["1", "2", "3", "4"].includes(String(val))) {
    const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
    const perroActual = insc.find(i => normalizeID(i.IDInscripcion) === nP);

    if (perroActual) {
      // buscar conflicto: otro perro (misma raza+cat) con mismo puesto ya asignado
      const conflicto = res.find(r =>
        normalizeID(r.IDEvento) === nE &&
        normalizeID(r.IDJuez) === nJ &&
        normalizeID(r.Puesto) === String(val) &&
        normalizeID(r.IDInscripcion) !== nP &&
        (() => {
          const otro = insc.find(i => normalizeID(i.IDInscripcion) === normalizeID(r.IDInscripcion));
          return !!(otro && otro.IDRaza === perroActual.IDRaza && otro.IDCategoria === perroActual.IDCategoria);
        })()
      );

      if (conflicto) {
        const otroPerro = insc.find(i => normalizeID(i.IDInscripcion) === normalizeID(conflicto.IDInscripcion));
        alert(
          `¡ACCIÓN DENEGADA!\n\n` +
          `Ya existe un ${val}° Puesto asignado al perro #${otroPerro?.NumeroCatalogo || "??"} ` +
          `en esta misma Raza y Categoría.\n\n` +
          `Debe desmarcar el ganador anterior antes de asignar uno nuevo.`
        );
        return;
      }

      // defensa extra: limpiar duplicado si existiera (manteniendo tu estructura)
      res.forEach(r => {
        if (
          normalizeID(r.IDEvento) === nE &&
          normalizeID(r.IDJuez) === nJ &&
          normalizeID(r.Puesto) === String(val) &&
          normalizeID(r.IDInscripcion) !== nP
        ) {
          const otroPerro = insc.find(i => normalizeID(i.IDInscripcion) === normalizeID(r.IDInscripcion));
          if (otroPerro && otroPerro.IDRaza === perroActual.IDRaza && otroPerro.IDCategoria === perroActual.IDCategoria) {
            r.Puesto = "";
          }
        }
      });
    }
  }
  // =====================================================================================

  // Registro existente (clave real)
  let rec = res.find(x =>
    normalizeID(x.IDInscripcion) === nP &&
    normalizeID(x.IDJuez) === nJ &&
    normalizeID(x.IDEvento) === nE
  );

  if (!rec) {
    rec = {
      IDResultado: "TEMP_" + Date.now(),
      IDInscripcion: idP,
      IDJuez: idJ,
      IDEvento: idE,
      Calificacion: "",
      Puesto: "",
      Titulo_Ganado: ""
    };
    res.push(rec);
  }

  // UI instantánea (sin redibujar todo)
  if (esMulti) {
    let tArr = (rec[campo] || "").split(", ").map(s => s.trim()).filter(Boolean);
    if (tArr.includes(val)) {
      tArr = tArr.filter(x => x !== val);
      btn.classList.remove("active", "multi");
    } else {
      tArr.push(val);
      btn.classList.add("active", "multi");
    }
    rec[campo] = tArr.join(", ");
  } else {
    const parent = btn.parentElement;
    if (parent) parent.querySelectorAll(".btn-xs").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    rec[campo] = val;

    const card = btn.closest(".dog-card-compact");
    if (card && campo === "Puesto") {
      card.style.borderLeftColor = (String(val) === "1") ? "#27ae60" : "#bdc3c7";
    }
  }

  // Cache
  CACHE.set("Resultados_Razas", res);

  // si hay grupos, refrescar
  if (window._pistaGrupoActiva) renderJuzgamientoGrupos();

  // Auto-guardado con timer por perro+evento
  const timerKey = `raza_${nP}_${nE}`;
  if (pendingTimers.has(timerKey)) clearTimeout(pendingTimers.get(timerKey));

  pendingTimers.set(timerKey, setTimeout(async () => {
    setStatus("Sincronizando...");

    const isTemp = String(rec.IDResultado).startsWith("TEMP_");
    const payload = { ...rec };
    if (isTemp) delete payload.IDResultado;

    try {
      const servidor = await api("POST", {}, {
        action: isTemp ? "create" : "update",
        table: "Resultados_Razas",
        payload,
        id: isTemp ? null : rec.IDResultado
      });

      // TEMP -> real
      if (servidor?.id) {
        rec.IDResultado = servidor.id;
        CACHE.set("Resultados_Razas", res);
      }

      setStatus("Guardado OK.");
    } catch (err) {
      setStatus("Error al guardar: " + (err?.message || err), true);
    }
  }, TIEMPO_ESPERA_GUARDADO));
};

// --- 6. PISTAS GRUPOS Y BIS (VERSION BLINDADA CON UNICIDAD) ---

window.guardarResultadoGrupo = async (e, inscId, puesto) => {
  // 0) Config + botón
  const config = window._pistaGrupoActiva;

  const btn = e?.currentTarget || e?.target?.closest?.(".btn-xs");
  if (!btn || !config) return;

  if (btn.disabled) return;
  btn.disabled = true;
  setTimeout(() => { if (btn) btn.disabled = false; }, 250);

  // 1) Data
  let resG = CACHE.get("Resultados_Grupos") || [];
  const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];

  const nI = normalizeID(inscId);
  const nE = normalizeID(config.eventId);
  const nJ = normalizeID(config.judgeId);

  const perroActual = insc.find(i => normalizeID(i.IDInscripcion) === nI);
  if (!perroActual) return;

  const grupoActual = String(perroActual.IDGrupo || "");
  const catActual   = String(perroActual.IDCategoria || "");

  // 2) Registro por juez (clave real)
  let rec = resG.find(r =>
    normalizeID(r.IDInscripcion) === nI &&
    normalizeID(r.IDEvento) === nE &&
    normalizeID(r.IDJuez) === nJ
  );

  if (!rec) {
    rec = {
      IDResultadoGrupo: "TEMP_" + Date.now(),
      IDInscripcion: inscId,
      IDEvento: config.eventId,
      IDJuez: config.judgeId,
      IDGrupo: grupoActual,
      IDCategoria: catActual,
      PuestoGrupo: ""
    };
    resG.push(rec);
  } else {
    if (!rec.IDGrupo) rec.IDGrupo = grupoActual;
    if (!rec.IDCategoria) rec.IDCategoria = catActual;
    if (!rec.IDJuez) rec.IDJuez = config.judgeId;
  }

  // 3) Toggle coherente
  const nuevoPuesto = (String(rec.PuestoGrupo || "") === String(puesto)) ? "" : String(puesto);

  // 4) Unicidad: mismo evento + mismo juez + mismo grupo + misma categoría
  if (nuevoPuesto !== "") {
    const conflicto = resG.find(r =>
      normalizeID(r.IDEvento) === nE &&
      normalizeID(r.IDJuez) === nJ &&
      String(r.IDGrupo || "") === grupoActual &&
      String(r.IDCategoria || "") === catActual &&
      String(r.PuestoGrupo || "") === String(nuevoPuesto) &&
      normalizeID(r.IDInscripcion) !== nI
    );

    if (conflicto) {
      const otroPerro = insc.find(i => normalizeID(i.IDInscripcion) === normalizeID(conflicto.IDInscripcion));
      alert(
        `¡ACCIÓN DENEGADA!\n\n` +
        `Ya existe un ${nuevoPuesto}° Puesto asignado al perro #${otroPerro?.NumeroCatalogo || "??"}\n` +
        `en este MISMO Grupo y Categoría.\n\n` +
        `Debe desmarcarlo antes de elegir un nuevo ${nuevoPuesto}°.`
      );
      return;
    }

    // defensa extra: limpiar duplicado si existiera
    resG.forEach(r => {
      if (
        normalizeID(r.IDEvento) === nE &&
        normalizeID(r.IDJuez) === nJ &&
        String(r.IDGrupo || "") === grupoActual &&
        String(r.IDCategoria || "") === catActual &&
        String(r.PuestoGrupo || "") === String(nuevoPuesto) &&
        normalizeID(r.IDInscripcion) !== nI
      ) {
        r.PuestoGrupo = "";
      }
    });
  }

  // 5) Aplicar cambio
  rec.PuestoGrupo = nuevoPuesto;

  // 6) Visual
  const parent = btn.parentElement;
  if (parent) parent.querySelectorAll(".btn-xs").forEach(b => b.classList.remove("active"));
  if (rec.PuestoGrupo !== "") btn.classList.add("active");

  // 7) Cache + render
  CACHE.set("Resultados_Grupos", resG);

  renderJuzgamientoGrupos();
  if (window._pistaBisActiva) renderJuzgamientoBis();

  // 8) Guardado remoto
  const payload = { ...rec };
  const isTemp = String(payload.IDResultadoGrupo).startsWith("TEMP_");
  if (isTemp) delete payload.IDResultadoGrupo;

  api("POST", {}, {
    action: isTemp ? "create" : "update",
    table: "Resultados_Grupos",
    payload,
    id: isTemp ? null : rec.IDResultadoGrupo
  })
    .then(servidor => {
      if (isTemp && servidor?.id) rec.IDResultadoGrupo = servidor.id;
      setStatus("Grupo sincronizado.");
    })
    .catch(err => {
      setStatus("Error al guardar grupo: " + (err?.message || err), true);
    });
};



 



async function saveEvento() {
  const name = $("eventName").value;
  const fechaRaw = $("eventFecha").value;
  const lugar = $("eventLugar").value;
  const id = document.querySelector('#eventosForm input[name="IDEvento"]')?.value;

  if (!name || !fechaRaw) {
    setStatus("Error: Nombre y Fecha son obligatorios", true);
    return;
  }

  // input date -> DD/MM/YYYY
  const fechaFinal = formatFechaCristiana(fechaRaw);
  const payload = { NombreEvento: name, Fecha: fechaFinal, Lugar: lugar };

  try {
    setStatus("Guardando...");
    const res = await api("POST", {}, {
      action: id ? "update" : "create",
      table: "Eventos",
      payload: payload,
      id: id
    });

    // UPDATE local sin syncAll
    let evs = CACHE.get("Eventos") || [];
    if (id) {
      const idx = evs.findIndex(e => String(e.IDEvento) === String(id));
      if (idx !== -1) evs[idx] = { ...payload, IDEvento: id };
      else evs.push({ ...payload, IDEvento: id }); // por si no estaba en cache
    } else {
      evs.push({ ...payload, IDEvento: res.id || Date.now() });
    }

    CACHE.set("Eventos", evs);
    loadEventos();
    $("eventosForm").reset();
    setStatus("Evento guardado.");
  } catch (e) {
    setStatus("Error: " + (e?.message || e), true);
  }
}

async function saveJuez() {
  const f = $("juecesForm");
  if (!f) return;

  const p = {};
  new FormData(f).forEach((v, k) => {
    p[k] = typeof v === "string" ? v.trim() : v;
  });

  if (!p.NombreJuez) {
    setStatus("Nombre obligatorio.", true);
    return;
  }

  // ====== UI INMEDIATA ======
  let jueces = CACHE.get("Jueces") || [];

  const isEdit = !!p.IDJuez;
  if (!isEdit) {
    p.IDJuez = "LOCAL_" + Date.now();
    jueces.push(p);
  } else {
    const idx = jueces.findIndex(j => String(j.IDJuez) === String(p.IDJuez));
    if (idx !== -1) jueces[idx] = p;
  }

  CACHE.set("Jueces", jueces);
  window._juecesCache = jueces;
  loadJueces();

  // ====== LIMPIAR FORM COMPLETO ======
  f.reset();
  $("formTitleJuez").textContent = "Nuevo Juez";

  // Limpiar preview de imagen
  const img = f.querySelector("img");
  if (img) img.style.display = "none";

  setStatus("Guardado.");

  // ====== ENVÍO EN SEGUNDO PLANO ======
  const payload = { ...p };
  const localId = p.IDJuez;

  api("POST", {}, {
    action: isEdit ? "update" : "create",
    table: "Jueces",
    payload,
    id: isEdit ? p.IDJuez : null
  })
  .then(resp => {
    if (!isEdit && resp?.id) {
      // Reemplazar ID local por ID real
      const lista = CACHE.get("Jueces") || [];
      const juez = lista.find(j => j.IDJuez === localId);
      if (juez) juez.IDJuez = resp.id;
      CACHE.set("Jueces", lista);
      window._juecesCache = lista;
      loadJueces();
    }
  })
  .catch(() => {
    setStatus("Error de red.", true);
  });
}





function verificarAcceso() {
  const key = sessionStorage.getItem("USER_API_KEY");

  if (!key) {
    const overlay = $("loginOverlay");
    if (overlay) overlay.classList.remove("hidden");

    const btn = $("btnLogin");
    if (btn) {
      btn.onclick = async () => {
        const input = ($("inputApiKey")?.value || "").trim();
        if (!input) return;

        sessionStorage.setItem("USER_API_KEY", input);

        try {
          setStatus("Verificando...");
          await syncAll();

          if (overlay) overlay.classList.add("hidden");

          // primer arranque post-login
          switchView(0);
          loadCatalog();
        } catch (e) {
          sessionStorage.removeItem("USER_API_KEY");

          const errEl = $("loginError");
          if (errEl) {
            errEl.textContent = "CLAVE INVÁLIDA";
            errEl.classList.remove("hidden");
          }
        }
      };
    }

    return false;
  }

  return true;
}




// --- 9. INICIALIZACIÓN (CON REFORMA GRUPOS Y ALINEACIÓN) ---
document.addEventListener("DOMContentLoaded", async () => {
  const tabs = {
  navCatalogos: () => { switchView(0); loadCatalog(); },
  navEventos: () => { switchView(1); loadEventos(); },
  navJueces: () => { switchView(2); loadJueces(); },
  navInscripciones: async () => { switchView(3); await prepareInscripcionForm(); loadInscripciones(); },
  navPistas: async () => { switchView(4); await preparePistasForm(); },
  navBis: async () => {
    switchView(5);
    await prepareBisForm();
  }
 };

 if ($("navPistasGrupos")) {
  $("navPistasGrupos").style.display = "none";
 }







  Object.entries(tabs).forEach(([id, fn]) => {
    if ($(id)) {
      $(id).onclick = (e) => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        fn();
      };
    }
  });

  // Selector catálogo
  if ($("catalogo")) {
    $("catalogo").innerHTML = [
      "Catalogo_Perros_Inscriptos",
      "Resultados_Razas",
      "Resultados_BIS",
      "Jueces",
      "Eventos",
      "Catalogo_Grupos",
      "Catalogo_Razas",
      "Catalogo_Categorias",
      "Catalogo_Sexos",
      "Catalogo_Titulos"
    ].map(t => `<option value="${t}">${t}</option>`).join("");

    $("catalogo").onchange = () => loadCatalog();
  }

  // Recargar: sync + refrescar vista visible
  if ($("btnRecargar")) {
    $("btnRecargar").onclick = async () => {
      await syncAll();

      const isVisible = (id) => {
        const el = $(id);
        return el && !el.classList.contains("hidden");
      };

      if (isVisible("viewCatalogos")) return loadCatalog();
      if (isVisible("viewEventos")) return loadEventos();
      if (isVisible("viewJueces")) return loadJueces();
      if (isVisible("viewInscripciones")) {
        await prepareInscripcionForm();
        return loadInscripciones();
      }
      if (isVisible("viewPistas")) return preparePistasForm();
      if (isVisible("viewPistasGrupos")) return preparePistasGruposForm();
      if (isVisible("viewBis")) return prepareBisForm();

      loadCatalog(); // fallback
    };
  }

  // --- ACCIONES: INSCRIPCIONES ---
  if ($("btnGuardarInscripcion")) $("btnGuardarInscripcion").onclick = guardarInscripcion;
  if ($("btnNuevaInscripcion")) $("btnNuevaInscripcion").onclick = limpiarInscripcion;
  if ($("btnEliminarInscripcion")) $("btnEliminarInscripcion").onclick = eliminarInscripcion;

  // --- ACCIONES: EVENTOS ---
  if ($("btnNuevo")) {
    $("btnNuevo").onclick = () => {
      $("formTitle").textContent = "Nuevo Evento";
      buildForm("eventosForm", ["IDEvento", "NombreEvento", "Fecha", "Lugar", "Observaciones"]);
    };
  }
  if ($("btnGuardar")) $("btnGuardar").onclick = saveEvento;




  // --- ACCIONES: JUECES ---
 if ($("btnNuevoJuez")) {
  $("btnNuevoJuez").onclick = () => {
    $("formTitleJuez").textContent = "Nuevo Juez";
    buildForm("juecesForm",
      ["IDJuez", "NombreJuez", "Provincia", "IDPista", "Telefono", "Mail", "Redes", "FotoURL", "Activo", "Observaciones"]
    );
  };
 }








  if ($("btnGuardarJuez")) $("btnGuardarJuez").onclick = saveJuez;

  // --- ACCIÓN PISTA TRABAJO ---
  if ($("selectorPistaTrabajo")) {
    $("selectorPistaTrabajo").onclick = (e) => {
      const b = e.target.closest(".btn-opt");
      if (!b) return;
      $("selectorPistaTrabajo").querySelectorAll(".btn-opt").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      renderJuzgamiento(b.dataset.value);
    };
  }

  // --- FINAL DE LA CARGA ---
  if (verificarAcceso()) {
    switchView(0);
    syncAll().then(() => loadCatalog());
  }

  // Splash
  if ($("splashScreen")) {
    setTimeout(() => {
      $("splashScreen").classList.add("hidden");
    }, 1500);
  }
 });


// ============================================================================
// >>>>> AGREGADO PARA FINALES BEST IN SHOW (BIS) <<<<<
// Pegar esto AL FINAL ABSOLUTO de app.js, sin tocar el código anterior.
// ============================================================================

// Variable para recordar la configuración de la pista BIS activa
window._pistaBisActiva = null;

// Mapeo de qué categorías entran en cada Gran Final de BIS
const MAPA_BIS_FINALES = {
  "BIS CACHORROS": ["C00", "C01"],
  "BIS JOVENES": ["C02", "C03"],
  "BIS ADULTOS": ["C04", "C05", "C06"],
  "BIS CAMPEONES": ["C07"],
  "BIS VETERANOS": ["C08"]
};

// --- BIS: FORMULARIO (Evento + Botonera Jueces con Pista) ---
async function prepareBisForm() {
  const J = CACHE.get("Jueces") || [];
  const E = CACHE.get("Eventos") || [];
  const asign = CACHE.get("Gestion_pistas") || [];

  window._juezSeleccionadoBis = null;

  const pistaAsignadaParaJuez = (eventId, juezId) => {
    const a = asign.find(x =>
      String(x.IDEvento) === String(eventId) &&
      String(x.IDJuez) === String(juezId) &&
      x.IDPista !== undefined && x.IDPista !== null && String(x.IDPista) !== ""
    );
    if (a) return String(a.IDPista);
    const j = J.find(jj => String(jj.IDJuez) === String(juezId));
    return j && j.IDPista ? String(j.IDPista) : "";
  };

  $("formBisDinamico").innerHTML = `
    <div class="field">
      <label>Evento de la Final</label>
      <select id="bisEvento" class="select-lg">
        ${
          E.length > 0
            ? E.map(e => `<option value="${e.IDEvento}">${e.NombreEvento}</option>`).join("")
            : `<option value="">Sin eventos</option>`
        }
      </select>
    </div>

    <div class="field">
      <label>Juez Principal de BIS</label>
      <div id="bisJuezBotonera" class="btn-group-pistas"></div>
      <input type="hidden" id="bisJuez" value="">
    </div>
  `;

  const renderJuecesBis = () => {
    const evId = $("bisEvento")?.value || "";

    $("bisJuezBotonera").innerHTML = J.map(j => {
      const pista = pistaAsignadaParaJuez(evId, j.IDJuez);
      const pistaTxt = pista ? `Pista ${pista}` : "Pista ?";
      const active = (window._juezSeleccionadoBis?.id === j.IDJuez) ? "active" : "";

      return `
        <button type="button"
                class="btn-opt btn-juez-bis ${active}"
                id="btnJuezBis_${j.IDJuez}"
                onclick="window.seleccionarJuezBis('${j.IDJuez}', '${pista}', '${(j.NombreJuez||"").replace(/'/g,"\\'")}')">
          ${j.NombreJuez} (${pistaTxt})
        </button>`;
    }).join("") || '<p class="hint-text">No hay jueces cargados.</p>';

    $("bisJuez").value = "";
    window._juezSeleccionadoBis = null;
    window._pistaBisActiva = null;
    renderJuzgamientoBis();
  };

  const selEv = $("bisEvento");
  if (selEv && !selEv.dataset.bound) {
    selEv.onchange = renderJuecesBis;
    selEv.dataset.bound = "1";
  }

  renderJuecesBis();
}

window._juezSeleccionadoBis = null;










function renderJuzgamientoBis() {

  const config = window._pistaBisActiva;

  if (!config) {
    $("panelJuzgamientoBis").innerHTML =
      `<p class="hint-text">Seleccione evento y juez.</p>`;
    return;
  }

  const insc     = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  const razas    = CACHE.get("Catalogo_Razas") || [];
  const resRazas = CACHE.get("Resultados_Razas") || [];
  const resBis   = CACHE.get("Resultados_BIS") || [];

  const nE = normalizeID(config.eventId);
  const nJ = normalizeID(config.judgeId);

  let html = "";

  Object.entries(MAPA_BIS_FINALES).forEach(([nombreBis, categoriasIncluidas]) => {

    const clasificados = insc.filter(p => {

      if (normalizeID(p.IDEvento) !== nE) return false;

      const cat = p.IDCategoria;

      // CAMPEONES Y VETERANOS → TODOS
      if (cat === "C07" || cat === "C08") {
        return categoriasIncluidas.includes(cat);
      }

      // Buscar resultado del perro en este evento
      const resultado = resRazas.find(r =>
        normalizeID(r.IDEvento) === nE &&
        normalizeID(r.IDInscripcion) === normalizeID(p.IDInscripcion)
      );

      if (!resultado) return false;

      // SOLO PUESTO 1
      if (String(resultado.Puesto).trim() !== "1") return false;

      const cal = String(resultado.Calificacion).trim();

      // C00 y C01 → SOLO 1 MP
      if (cat === "C00" || cat === "C01") {
        return cal === "MP" && categoriasIncluidas.includes(cat);
      }

      // C02 a C06 → SOLO 1 Exc
      if (["C02","C03","C04","C05","C06"].includes(cat)) {
        return cal === "Exc" && categoriasIncluidas.includes(cat);
      }

      return false;

    });

    if (clasificados.length === 0) return;

    html += `<div class="bis-title">✨ ${nombreBis} ✨</div>`;

    clasificados.forEach(p => {

      const rNom =
        razas.find(rz => String(rz.IDRaza) === String(p.IDRaza))
          ?.NombreRaza || p.IDRaza;

      const rBis = resBis.find(rb =>
        normalizeID(rb.IDInscripcion) === normalizeID(p.IDInscripcion) &&
        normalizeID(rb.IDEvento) === nE &&
        normalizeID(rb.IDJuez) === nJ &&
        String(rb.TipoBIS) === nombreBis
      );

      html += `
        <div class="card dog-card-compact bis-card ${rBis ? 'has-bis' : ''}">
          <div class="bis-row">
            <div>
              <strong>#${p.NumeroCatalogo}</strong> - ${rNom}
            </div>
            <div class="puesto-btns">
              ${["1","2","3","4","5","6"].map(pst => `
                <button class="btn-xs ${String(rBis?.PuestoBIS) === pst ? 'active' : ''}"
                        onclick="window.guardarResultadoBis(event, '${p.IDInscripcion}', '${pst}', '${nombreBis}')">
                  ${pst}°
                </button>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    });

  });

  if (html === "") {
    html = `
      <div class="card bis-empty">
        <p class="muted">No hay ejemplares clasificados todavía.</p>
      </div>
    `;
  }

  $("panelJuzgamientoBis").innerHTML = html;
}














window.guardarResultadoBis = async (e, inscId, puesto, tipoBis) => {
  const config = window._pistaBisActiva;

  // 0) Validaciones mínimas
  const btn = e?.currentTarget || e?.target?.closest?.(".btn-xs");
  if (!btn || !config || !config.eventId || !config.judgeId || !inscId || !tipoBis) return;

  // 1) Evitar doble click
  if (btn.disabled) return;
  btn.disabled = true;
  setTimeout(() => { try { btn.disabled = false; } catch {} }, 250);

  try {
    // 2) Cache base
    let resB = CACHE.get("Resultados_BIS") || [];
    const nI = normalizeID(inscId);
    const nE = normalizeID(config.eventId);
    const nJ = normalizeID(config.judgeId);
    const tB = String(tipoBis || "").trim();
    const pst = String(puesto || "").trim();

    if (!pst) return;

    // 3) Buscar/crear registro del perro (CLAVE: insc + evento + juez + tipo)
    let rec = resB.find(r =>
      normalizeID(r.IDInscripcion) === nI &&
      normalizeID(r.IDEvento) === nE &&
      normalizeID(r.IDJuez) === nJ &&
      String(r.TipoBIS || "").trim() === tB
    );

    const isNew = !rec;

    if (isNew) {
      rec = {
        IDResultadoBIS: "TEMP_" + Date.now(),
        IDInscripcion: inscId,
        IDEvento: config.eventId,
        IDJuez: config.judgeId,
        TipoBIS: tB,
        PuestoBIS: ""
      };
      resB.push(rec);
    } else {
      // Blindaje por si venía viejo sin juez
      rec.IDJuez = rec.IDJuez || config.judgeId;
      rec.IDEvento = rec.IDEvento || config.eventId;
      rec.TipoBIS = rec.TipoBIS || tB;
    }

    // 4) Toggle
    const nuevoPuesto = (String(rec.PuestoBIS || "") === pst) ? "" : pst;

    // 5) Unicidad: SOLO 1 por puesto en mismo evento + juez + tipoBIS
    if (nuevoPuesto) {
      resB.forEach(r => {
        if (
          normalizeID(r.IDEvento) === nE &&
          normalizeID(r.IDJuez) === nJ &&
          String(r.TipoBIS || "").trim() === tB &&
          String(r.PuestoBIS || "") === nuevoPuesto &&
          normalizeID(r.IDInscripcion) !== nI
        ) {
          r.PuestoBIS = "";
        }
      });
    }

    // 6) Aplicar
    rec.PuestoBIS = nuevoPuesto;

    // 7) UI: marcar activo solo si corresponde
    const parent = btn.parentElement;
    if (parent) parent.querySelectorAll(".btn-xs").forEach(b => b.classList.remove("active"));
    if (nuevoPuesto) btn.classList.add("active");

    // 8) Persistir local + re-render
    CACHE.set("Resultados_BIS", resB);
    if (typeof renderJuzgamientoBis === "function") renderJuzgamientoBis();

    // 9) Sync servidor (IMPORTANTE: siempre manda IDJuez)
    const payload = { ...rec, IDJuez: config.judgeId, IDEvento: config.eventId, TipoBIS: tB };

    const isTemp = String(payload.IDResultadoBIS || "").startsWith("TEMP_");
    if (isTemp) delete payload.IDResultadoBIS;

    api("POST", {}, {
      action: isTemp ? "create" : "update",
      table: "Resultados_BIS",
      payload,
      id: isTemp ? null : rec.IDResultadoBIS
    })
      .then((servidor) => {
        if (isTemp && servidor?.id) {
          rec.IDResultadoBIS = servidor.id;
          CACHE.set("Resultados_BIS", resB);
        }
        setStatus("BIS sincronizado.");
      })
      .catch((err) => {
        setStatus("Error al guardar BIS: " + (err?.message || err), true);
      });

  } catch (err) {
    setStatus("Error BIS: " + (err?.message || err), true);
  }
};

// --- BIS: INICIALIZACIÓN (sin botón "ABRIR PISTA CENTRAL BIS") ---
function initBisSystem() {
  const catSelect = $("catalogo");
  if (catSelect && !catSelect.querySelector('option[value="Resultados_BIS"]')) {
    const opt = document.createElement("option");
    opt.value = "Resultados_BIS";
    opt.textContent = "Resultados_BIS";
    catSelect.appendChild(opt);
  }

  // API global: click en juez => set pista BIS + render
  window.seleccionarJuezBis = (idJuez, pista, nombre) => {
    // visual active
    document.querySelectorAll("#bisJuezBotonera .btn-juez-bis").forEach(b => b.classList.remove("active"));
    const btn = $(`btnJuezBis_${idJuez}`);
    if (btn) btn.classList.add("active");

    // hidden
    if ($("bisJuez")) $("bisJuez").value = idJuez;

    // memoria juez
    window._juezSeleccionadoBis = { id: idJuez, pista: pista || "", name: nombre || idJuez };

    const evId = $("bisEvento")?.value || "";
    if (!evId || !idJuez) {
      window._pistaBisActiva = null;
      renderJuzgamientoBis();
      return;
    }

    // set pista activa y render directo (sin botón)
    window._pistaBisActiva = {
      eventId: evId,
      judgeId: idJuez,
      eventName: $("bisEvento")?.options[$("bisEvento")?.selectedIndex]?.text || "",
      judgeName: (window._juezSeleccionadoBis?.name || "Juez")
    };

    renderJuzgamientoBis();
  };

  // si existe el botón viejo, lo matamos
  if ($("btnAbrirBis")) $("btnAbrirBis").style.display = "none";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBisSystem);
} else {
  initBisSystem();
}
// ============================================================================
// >>>>> FIN DEL AGREGADO BIS <<<<<
// ============================================================================

window.syncAll = syncAll;
window.renderJuzgamientoGrupos = renderJuzgamientoGrupos;

document.addEventListener("click", function(e) {
  const card = e.target.closest(".insc-item");
  if (!card) return;

  const id = card.dataset.id;
  if (id && typeof window.editInscripcion === "function") {
    window.editInscripcion(id);
  }
});