import { CONFIG } from "./config.js";

const $ = (id) => document.getElementById(id);
const CACHE = new Map();

// --- ESTRUCTURA PARA EL TEMPORIZADOR (AUTO-GUARDADO) ---
const pendingTimers = new Map();

// *************************************************************************************
// >>> CONFIGURACIÓN DEL TIEMPO DE ESPERA DEL AUTO-GUARDADO (en milisegundos) <<<
const TIEMPO_ESPERA_GUARDADO = 3000;
// *************************************************************************************

const CATEGORIAS_LOCALES = [
  {
    id: "C15",
    nro: "15",
    nombre: "CACHORRO ESPECIAL MACHO",
    edad: "3 a 6 meses",
    sexo: "M",
    final: "CACHORROS ESPECIALES",
  },
  {
    id: "C1",
    nro: "1",
    nombre: "CACHORRO MACHO",
    edad: "6 a 9 meses",
    sexo: "M",
    final: "CACHORROS",
  },
  {
    id: "C3",
    nro: "3",
    nombre: "JOVEN MACHO",
    edad: "9 a 18 meses",
    sexo: "M",
    final: "JOVENES",
  },
  {
    id: "C5",
    nro: "5",
    nombre: "INTERMEDIA MACHO",
    edad: "15 a 24 meses",
    sexo: "M",
    final: "ADULTOS",
  },
  {
    id: "C6",
    nro: "6",
    nombre: "ABIERTA MACHO",
    edad: "+15 meses",
    sexo: "M",
    final: "ADULTOS",
  },
  {
    id: "C07",
    nro: "07",
    nombre: "CAMPEÓN",
    edad: "",
    sexo: "",
    final: "CAMPEONES",
  },
  {
    id: "C13",
    nro: "13",
    nombre: "VETERANO MACHO",
    edad: "+8 anos",
    sexo: "M",
    final: "VETERANOS",
  },
  {
    id: "C16",
    nro: "16",
    nombre: "CACHORRO ESPECIAL HEMBRA",
    edad: "3 a 6 meses",
    sexo: "H",
    final: "CACHORROS ESPECIALES",
  },
  {
    id: "C2",
    nro: "2",
    nombre: "CACHORRO HEMBRA",
    edad: "6 a 9 meses",
    sexo: "H",
    final: "CACHORROS",
  },
  {
    id: "C4",
    nro: "4",
    nombre: "JOVEN HEMBRA",
    edad: "9 a 18 meses",
    sexo: "H",
    final: "JOVENES",
  },
  {
    id: "C9",
    nro: "9",
    nombre: "INTERMEDIA HEMBRA",
    edad: "15 a 24 meses",
    sexo: "H",
    final: "ADULTOS",
  },
  {
    id: "C10",
    nro: "10",
    nombre: "ABIERTA HEMBRA",
    edad: "+15 meses",
    sexo: "H",
    final: "ADULTOS",
  },
  {
    id: "C14",
    nro: "14",
    nombre: "VETERANO HEMBRA",
    edad: "+8 anos",
    sexo: "H",
    final: "VETERANOS",
  },
];

const CATEGORIAS_BASE_INSCRIPCION = [
  "Cachorro Especial",
  "Cachorro",
  "Joven",
  "Intermedia",
  "Abierta",
  "Campeón",
  "Veterano",
];

const IDCATEGORIA_POR_BASE_SEXO = {
  "Cachorro Especial": { Macho: "C15", Hembra: "C16" },
  Cachorro: { Macho: "C1", Hembra: "C2" },
  Joven: { Macho: "C3", Hembra: "C4" },
  Intermedia: { Macho: "C5", Hembra: "C9" },
  Abierta: { Macho: "C6", Hembra: "C10" },
  Campeón: { Macho: "C07", Hembra: "C07" },
  Veterano: { Macho: "C13", Hembra: "C14" },
};

const GRUPOS_LOCALES_INSCRIPCION = [
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
];

const LOCAL_CAT_IDS = {
  CACHORROS_ESPECIALES: CATEGORIAS_LOCALES.filter(
    (c) => c.final === "CACHORROS ESPECIALES",
  ).map((c) => c.id),
  CACHORROS: CATEGORIAS_LOCALES.filter((c) => c.final === "CACHORROS").map(
    (c) => c.id,
  ),
  JOVENES: CATEGORIAS_LOCALES.filter((c) => c.final === "JOVENES").map(
    (c) => c.id,
  ),
  ADULTOS: CATEGORIAS_LOCALES.filter((c) => c.final === "ADULTOS").map(
    (c) => c.id,
  ),
  CAMPEONES: CATEGORIAS_LOCALES.filter((c) => c.final === "CAMPEONES").map(
    (c) => c.id,
  ),
  VETERANOS: CATEGORIAS_LOCALES.filter((c) => c.final === "VETERANOS").map(
    (c) => c.id,
  ),
};

const ROLES_FINAL_RAZA = [
  "MEJOR_CACHORRO_ESPECIAL_RAZA",
  "SEXO_OPUESTO_CACHORRO_ESPECIAL",
  "MEJOR_CACHORRO_RAZA",
  "SEXO_OPUESTO_CACHORRO",
  "MEJOR_JOVEN_MACHO",
  "MEJOR_JOVEN_HEMBRA",
  "MEJOR_JOVEN_RAZA",
  "SEXO_OPUESTO_JOVEN",
  "MEJOR_MACHO",
  "MEJOR_HEMBRA",
  "MEJOR_DE_RAZA",
  "SEXO_OPUESTO_RAZA",
  "MEJOR_VETERANO_RAZA",
  "SEXO_OPUESTO_VETERANO",
];

// --- FUNCIONES AUXILIARES IMPORTANTES ---
const normalizeID = (id) =>
  String(id || "")
    .trim()
    .toLowerCase();
function isTruthy(v) {
  return ["true", "1", "si", "sí", "yes", "x"].includes(
    String(v || "")
      .trim()
      .toLowerCase(),
  );
}
function splitMulti(v) {
  return String(v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
function multiHas(v, item) {
  const needle = String(item || "").trim();
  return splitMulti(v).some((x) => String(x).trim() === needle);
}

function categoriaLocal(id) {
  const idNormalizado = normalizarIDCategoria(id);
  return CATEGORIAS_LOCALES.find((c) => String(c.id) === String(idNormalizado));
}

function derivarIDCategoria(categoriaBase, sexo) {
  return IDCATEGORIA_POR_BASE_SEXO[categoriaBase]?.[sexo] || "";
}

function normalizarTextoCategoria(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function normalizarIDCategoria(valor, idSexo = null) {
  const raw = String(valor || "")
    .trim()
    .toUpperCase();
  if (!raw) return "";

  const MAP_BACKEND = {
    C00: { S01: "C15", S02: "C16" },
    C01: { S01: "C1", S02: "C2" },
    C02: { S01: "C3", S02: "C4" },
    C04: { S01: "C5", S02: "C9" },
    C05: { S01: "C6", S02: "C10" },
    C07: { S01: "C07", S02: "C07" },
    C08: { S01: "C13", S02: "C14" },
  };

  if (MAP_BACKEND[raw] && idSexo && MAP_BACKEND[raw][idSexo]) {
    return MAP_BACKEND[raw][idSexo];
  }

  if (CATEGORIAS_LOCALES.some((c) => String(c.id).toUpperCase() === raw)) {
    return raw;
  }

  return raw;
}
function normalizarInscripcionCategoria(row) {
  if (!row || typeof row !== "object") return row;
  const idCategoria = normalizarIDCategoria(row.IDCategoria, row.IDSexo);
  return idCategoria && idCategoria !== row.IDCategoria
    ? { ...row, IDCategoria: idCategoria }
    : row;
}

function categoriaBaseSexoDesdeID(idCategoria) {
  const id = normalizarIDCategoria(idCategoria);
  for (const [base, sexos] of Object.entries(IDCATEGORIA_POR_BASE_SEXO)) {
    for (const [sexo, catId] of Object.entries(sexos)) {
      if (String(catId) === id) return { categoriaBase: base, sexo };
    }
  }
  return { categoriaBase: "", sexo: "" };
}

function sexoIdDesdeOpcion(sexo) {
  const s = String(sexo || "")
    .trim()
    .toLowerCase();
  if (s === "m" || s.includes("mach")) return "M";
  if (s === "h" || s.includes("hemb") || s.includes("female")) return "H";
  return "";
}

function sexoOpcionDesdeId(sexo) {
  const id = sexoIdDesdeOpcion(sexo);
  if (id === "M") return "Macho";
  if (id === "H") return "Hembra";
  return "";
}

function nombreSexoLocalDesdeCategoria(idCategoria) {
  const sexo = categoriaLocal(normalizarIDCategoria(idCategoria))?.sexo;
  if (sexo === "M") return "Macho";
  if (sexo === "H") return "Hembra";
  return "";
}

function nombreCategoriaLocal(id) {
  const idNormalizado = normalizarIDCategoria(id);
  const catsBackend = CACHE.get("Catalogo_Categorias") || [];
  const catBackend = catsBackend.find(
    (c) => String(c.IDCategoria || c.id || "").trim() === idNormalizado,
  );
  if (catBackend)
    return (
      catBackend.NombreCategoria ||
      catBackend.Categoria ||
      catBackend.Nombre ||
      idNormalizado
    );

  const cat = categoriaLocal(idNormalizado);
  return cat ? cat.nombre : idNormalizado;
}

function categoriaEsCachorroLocal(id) {
  const finalNombre = categoriaLocal(id)?.final;
  return finalNombre === "CACHORROS ESPECIALES" || finalNombre === "CACHORROS";
}

function categoriaEsCampeonLocal(id) {
  return String(id || "") === "C07";
}
// --- NORMALIZADOR DE GRUPO: "Grupo 1" y "G1" pasan a ser "G1" ---
function normalizeGrupo(gr) {
  const s = String(gr || "").trim();

  // Caso "G1", "g1", " G1 "
  const m1 = s.match(/^g\s*(\d+)$/i);
  if (m1) return "G" + String(parseInt(m1[1], 10));

  // Caso "Grupo 1", "grupo 01", etc.
  const m2 = s.match(/^grupo\s*(\d+)$/i);
  if (m2) return "G" + String(parseInt(m2[1], 10));

  // Si no matchea nada, lo dejo igual (pero trimmeado)
  return s;
}

function ordenarGruposNatural(lista) {
  return [...(lista || [])].sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(String(b).replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

const eventoOf = (r) => normalizeID(r?.IDEvento ?? r?.IDEvento ?? "");
const juezOf = (r) => normalizeID(r?.IDJuez ?? r?.IDJuez ?? "");

function formatFechaCristiana(fechaInput) {
  if (!fechaInput) return "";
  const [year, month, day] = fechaInput.split("-");
  return `${day}/${month}/${year}`;
}

// --- 1. NÚCLEO Y COMUNICACIÓN ---

// --- 1. NÚCLEO Y COMUNICACIÓN (MODIFICADO PARA MODO RESILIENTE/CORS) ---
// --- 1. NÚCLEO Y COMUNICACIÓN (REPARADO) ---
async function api(metodo, params = {}, body = null, opts = {}) {
  const url = new URL(CONFIG.API_URL);

  // Obtenemos la llave de la memoria temporal del navegador
  const sessionKey = sessionStorage.getItem("USER_API_KEY") || CONFIG.API_KEY;

  // Parámetros en la URL (solo para GET como el sync)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const options = {
    method: metodo,
    redirect: "follow",
  };

  if (body) {
    // Incluimos la KEY recuperada de la sesión dentro del JSON
    const payloadCompleto = {
      key: sessionKey,
      ...body,
    };
    options.body = JSON.stringify(payloadCompleto);
    options.headers = { "Content-Type": "text/plain;charset=utf-8" };
  } else {
    // Si es GET, la key va en la URL
    url.searchParams.set("key", sessionKey);
  }

  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(
        "Respuesta no válida del servidor. Verifica la URL de la API.",
      );
    }

    if (!data.ok) throw new Error(data.error || "Error en el servidor");
    return data;
  } catch (err) {
    console.error("Error API:", err);
    throw err;
  }
}
window.api = api;

function setStatus(m, err = false) {
  const s = $("status");
  if (s) {
    s.textContent = m;
    s.style.color = err ? "red" : "black";
  }
}

function capturePlanillaScrollState() {
  const pick = (selector) => {
    const el = document.querySelector(selector);
    return el
      ? {
          selector,
          scrollTop: el.scrollTop,
          scrollLeft: el.scrollLeft,
        }
      : null;
  };

  return {
    windowX: window.scrollX || 0,
    windowY: window.scrollY || 0,
    elements: [
      pick("#viewPistas .planilla-tabla-wrap"),
      pick("#viewPistas .planilla-finales"),
      pick("#panelJuzgamiento"),
      pick("#panelJuzgamientoBis"),
    ].filter(Boolean),
  };
}

function restorePlanillaScrollState(state) {
  if (!state) return;

  const apply = () => {
    (state.elements || []).forEach((item) => {
      const el = document.querySelector(item.selector);
      if (!el) return;
      el.scrollTop = item.scrollTop || 0;
      el.scrollLeft = item.scrollLeft || 0;
    });

    if (
      typeof state.windowY === "number" ||
      typeof state.windowX === "number"
    ) {
      window.scrollTo(state.windowX || 0, state.windowY || 0);
    }
  };

  setTimeout(apply, 0);
  requestAnimationFrame(() => requestAnimationFrame(apply));
}

function renderJuzgamientoPreservandoScroll(
  pistaNro = null,
  state = capturePlanillaScrollState(),
) {
  const result = renderJuzgamiento(pistaNro);
  restorePlanillaScrollState(state);
  return result;
}

function renderJuzgamientoBisPreservandoScroll(
  state = capturePlanillaScrollState(),
) {
  const result = renderJuzgamientoBis();
  restorePlanillaScrollState(state);
  return result;
}

window.renderJuzgamientoPreservandoScroll = renderJuzgamientoPreservandoScroll;
window.renderJuzgamientoBisPreservandoScroll =
  renderJuzgamientoBisPreservandoScroll;

// 1. FUNCION SYNCALL (CORREGIDA)
async function syncAll() {
  setStatus("Sincronizando datos...");
  try {
    const res = await api("GET", { action: "sync" });

    CACHE.clear();

    Object.keys(res.data || {}).forEach((tabla) => {
      CACHE.set(tabla, res.data[tabla]);
    });

    const inscripcionesNormalizadas = (
      CACHE.get("Catalogo_Perros_Inscriptos") || []
    ).map(normalizarInscripcionCategoria);
    CACHE.set("Catalogo_Perros_Inscriptos", inscripcionesNormalizadas);
    if (res.data)
      res.data.Catalogo_Perros_Inscriptos = inscripcionesNormalizadas;

    setStatus("Sincronizado.");

    const ctx = getPlanillaFinalesContextoActual?.();
    if (ctx) {
      ctx.aside.innerHTML = renderPlanillaFinalesHTML(
        ctx.perrosRaza,
        ctx.sexos,
        ctx.juezId,
        ctx.idEventoActivo,
        ctx.esLimitada,
        ctx.resultadosRaza,
      );
    }

    const rows = CACHE.get("Catalogo_Perros_Inscriptos") || [];
    sugerirNroCatalogo(rows);

    // 🔥 FIX BIS
    if (window._pistaBisActiva) {
      renderJuzgamientoBis();
    }

    return res.data;
  } catch (e) {
    setStatus("Error de red: " + e.message, true);
    throw e;
  }
}

window.syncAll = syncAll;

// --- 2. GESTIÓN DE CATÁLOGOS (CONSOLIDADOS Y COMPLETOS) ---
async function loadCatalog() {
  const table = $("catalogo").value;
  if (!table) return;

  // 1. Manejo del Filtro de Evento para Perros Inscriptos
  const filterContainerId = "catalogFilterContainer";
  let filterContainer = $(filterContainerId);

  // Si no existe el contenedor de filtros, lo creamos antes del contenedor de la tabla
  if (!filterContainer) {
    filterContainer = document.createElement("div");
    filterContainer.id = filterContainerId;
    filterContainer.className = "catalog-toolbar-extra";
    $("contCatalogos").parentNode.insertBefore(
      filterContainer,
      $("contCatalogos"),
    );
  }

  // Solo mostramos el selector si estamos en la tabla de perros inscriptos
  if (table === "Catalogo_Perros_Inscriptos") {
    const eventos = CACHE.get("Eventos") || [];

    // Recuperamos o definimos el evento seleccionado (si ya existía el select)
    let selectedEventId =
      $(filterContainerId).querySelector("select")?.value || "";

    // Si no hay selección previa, tomamos el último evento cargado
    if (!selectedEventId && eventos.length > 0) {
      selectedEventId = String(eventos[eventos.length - 1].IDEvento);
    }

    // Inyectamos el HTML (sin onchange inline)
    filterContainer.innerHTML = `
      <div class="field" style="max-width: 400px; margin-bottom: 15px; background: #fdf2e9; padding: 10px; border-radius: 8px; border: 1px solid #e67e22;">
        <label style="color: #a04000; font-weight: bold;">🔍 Filtrar Perros por Evento:</label>
        <select id="filterCatalogEvento" class="select-lg">
          <option value="TODOS">-- Mostrar Todos los Eventos --</option>
          ${eventos
            .map(
              (e) => `
            <option value="${e.IDEvento}" ${String(e.IDEvento) === selectedEventId ? "selected" : ""}>
              ${e.NombreEvento}
            </option>
          `,
            )
            .join("")}
        </select>
      </div>
    `;
    filterContainer.style.display = "block";

    // ASIGNACIÓN DE EVENTO POR CÓDIGO (Solución al ReferenceError)
    const selFiltro = $("filterCatalogEvento");
    if (selFiltro) {
      selFiltro.onchange = () => loadCatalog();
    }
  } else {
    // Si elegimos otra tabla, ocultamos el filtro de perros
    filterContainer.style.display = "none";
  }

  let rows = CACHE.get(table) || [];

  if (rows.length > 0) {
    const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
    const razas = CACHE.get("Catalogo_Razas") || [];
    const sexos = CACHE.get("Catalogo_Sexos") || [];
    const eventos = CACHE.get("Eventos") || [];
    const jueces = CACHE.get("Jueces") || [];
    const grupos = CACHE.get("Catalogo_Grupos") || [];

    if (table === "Catalogo_Perros_Inscriptos") {
      const activeFilterId = $("filterCatalogEvento")?.value;

      // Aplicamos filtro de evento si no es "TODOS"
      if (activeFilterId && activeFilterId !== "TODOS") {
        rows = rows.filter(
          (r) => normalizeID(r.IDEvento) === normalizeID(activeFilterId),
        );
      }

      // MAPEADO LIMPIO: Sin ...r para evitar columnas duplicadas o técnicas
      rows = rows.map((r) => {
        const eData = eventos.find(
          (e) => normalizeID(e.IDEvento) === normalizeID(r.IDEvento),
        );
        return {
          Evento: eData ? eData.NombreEvento : "N/D",
          Nro: r.NumeroCatalogo,
          Grupo: r.IDGrupo,
          Raza:
            razas.find((rz) => String(rz.IDRaza) === String(r.IDRaza))
              ?.NombreRaza || r.IDRaza,
          Categoría: nombreCategoriaLocal(r.IDCategoria),
          Sexo:
            sexos.find((s) => String(s.IDSexo) === String(r.IDSexo))
              ?.NombreSexo || r.IDSexo,
          Observaciones: r.Observaciones,
        };
      });
    } else if (table === "Resultados_Razas") {
      const consolidados = new Map();
      rows.forEach((r) => {
        const claveUnica = `${r.IDInscripcion}_${r.IDEvento}_${r.IDJuez}`;
        if (!consolidados.has(claveUnica)) {
          consolidados.set(claveUnica, { ...r });
        } else {
          const existente = consolidados.get(claveUnica);
          if (r.Puesto) existente.Puesto = r.Puesto;
          if (r.Calificacion) existente.Calificacion = r.Calificacion;
        }
      });
      rows = Array.from(consolidados.values()).map((r) => {
        const iData = insc.find(
          (i) => String(i.IDInscripcion) === String(r.IDInscripcion),
        );
        const rData = iData
          ? razas.find((rz) => String(rz.IDRaza) === String(iData.IDRaza))
          : null;
        const eData = eventos.find(
          (e) => String(e.IDEvento) === String(r.IDEvento),
        );
        const jData = jueces.find((j) => String(j.IDJuez) === String(r.IDJuez));
        const sData = iData
          ? sexos.find((s) => String(s.IDSexo) === String(iData.IDSexo))
          : null;

        return {
          "Nro Cat.": iData ? iData.NumeroCatalogo : "N/D",
          Raza: rData ? rData.NombreRaza : "N/D",
          Categoría: iData ? nombreCategoriaLocal(iData.IDCategoria) : "N/D",
          Sexo: sData ? sData.NombreSexo : iData ? iData.IDSexo : "N/D",
          Puesto: r.Puesto,
          "Calif.": r.Calificacion,
          Evento: eData ? eData.NombreEvento : r.IDEvento,
          Juez: jData ? jData.NombreJuez : r.IDJuez,
        };
      });
    } else if (table === "Resultados_BIS") {
      rows = rows.map((r) => {
        const iData = insc.find(
          (i) => String(i.IDInscripcion) === String(r.IDInscripcion),
        );
        const rData = iData
          ? razas.find((rz) => String(rz.IDRaza) === String(iData.IDRaza))
          : null;
        const eData = eventos.find(
          (e) => String(e.IDEvento) === String(r.IDEvento),
        );
        return {
          "Tipo BIS": r.TipoBIS,
          Puesto: r.PuestoBIS,
          "Nro Cat.": iData ? iData.NumeroCatalogo : "N/D",
          Raza: rData ? rData.NombreRaza : "N/D",
          Evento: eData ? eData.NombreEvento : r.IDEvento,
        };
      });
    }
  }
  renderTable("contCatalogos", rows);
}

function renderTable(div, rows) {
  if (!rows.length) {
    $(div).innerHTML = "Vacío.";
    return;
  }
  // Ocultamos los IDs técnicos incluyendo el de BIS
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
  ];

  let displayRows = rows.map((r) => {
    let newRow = { ...r };
    colsToDelete.forEach((c) => delete newRow[c]);
    return newRow;
  });

  if (displayRows.length === 0) {
    $(div).innerHTML = "Vacío o solo datos técnicos.";
    return;
  }

  const cols = Object.keys(displayRows[0]);
  $(div).innerHTML =
    `<table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${displayRows.map((r) => `<tr>${cols.map((c) => `<td>${r[c] || ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

// --- 3. EVENTOS Y JUECES ---
async function loadEventos() {
  const rows = CACHE.get("Eventos") || [];
  $("eventosList").innerHTML = rows
    .map((r) => {
      let f = r.Fecha || "";
      if (f.includes("-")) {
        f = f.split("T")[0].split("-").reverse().join("/");
      }
      return `
      <div class="card ev-card" onclick="window.editEvento('${r.IDEvento}')">
        <strong>${r.NombreEvento}</strong><br>
        <small class="muted">📅 ${f}</small>
      </div>`;
    })
    .join("");
  window._evCache = rows;
}

window.editEvento = (id) => {
  const row = (window._evCache || []).find(
    (r) => String(r.IDEvento) === String(id),
  );
  if (!row) return;
  $("formTitle").textContent = "Editar Evento";
  buildForm(
    "eventosForm",
    ["IDEvento", "NombreEvento", "Fecha", "Lugar", "Observaciones"],
    row,
  );
};

async function loadJueces() {
  const jueces = CACHE.get("Jueces") || [];
  const eventos = CACHE.get("Eventos") || [];
  const asignaciones = CACHE.get("Gestion_pistas") || [];
  const gruposConfig =
    typeof getGruposParaConfigurar === "function"
      ? getGruposParaConfigurar()
      : ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10"];

  const filterContainerId = "juecesFilterContainer";
  let filterContainer = $(filterContainerId);

  if (!filterContainer) {
    filterContainer = document.createElement("div");
    filterContainer.id = filterContainerId;
    filterContainer.className = "catalog-toolbar-extra";
    $("juecesList").parentNode.insertBefore(filterContainer, $("juecesList"));
  }

  let selectedEventId =
    filterContainer.querySelector("#filterJuecesEvento")?.value || "";
  if (!selectedEventId && eventos.length > 0)
    selectedEventId = String(eventos[eventos.length - 1].IDEvento);

  const asignEvento = asignaciones.filter(
    (a) => String(a.IDEvento) === String(selectedEventId),
  );
  const idsAsignados = [
    ...new Set(asignEvento.map((a) => String(a.IDJuez || "")).filter(Boolean)),
  ];
  const juecesAsignados = idsAsignados
    .map((id) => jueces.find((j) => String(j.IDJuez) === String(id)))
    .filter(Boolean)
    .sort((a, b) =>
      String(a.NombreJuez || "").localeCompare(String(b.NombreJuez || "")),
    );

  window._juecesCache = jueces;

  filterContainer.innerHTML = `
    <div class="jueces-evento-panel">
      <div class="field">
        <label>Evento</label>
        <select id="filterJuecesEvento" class="select-lg">
          ${eventos
            .map(
              (e) => `
            <option value="${e.IDEvento}" ${String(e.IDEvento) === String(selectedEventId) ? "selected" : ""}>
              ${e.NombreEvento || e.IDEvento}
            </option>
          `,
            )
            .join("")}
        </select>
      </div>

      <div class="jueces-asociar-box">
        <h4>Asociar juez existente a este evento</h4>
        <div class="jueces-asociar-grid">
          <div class="field">
            <label>Juez</label>
            <select id="asociarJuezSelect" class="select-lg">
              ${jueces.map((j) => `<option value="${j.IDJuez}">${j.NombreJuez || j.IDJuez}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Pista</label>
            <select id="asociarPistaSelect" class="select-lg">
              ${["1", "2", "3", "4"].map((p) => `<option value="${p}">Pista ${p}</option>`).join("")}
            </select>
          </div>
          <div class="field jueces-grupos-field">
            <label>Grupos</label>
            <div id="asociarGruposBtns" class="btn-group-pistas">
              ${gruposConfig
                .map(
                  (g) => `
                <button type="button" class="btn-opt juez-grupo-asociar" data-grupo="${g}" onclick="this.classList.toggle('active')">${g}</button>
              `,
                )
                .join("")}
            </div>
          </div>
          <button type="button" class="btn primary jueces-asignar-btn" onclick="window.asignarJuezAEvento()">Asignar</button>
        </div>
      </div>
    </div>
  `;

  const selFiltro = $("filterJuecesEvento");
  if (selFiltro) selFiltro.onchange = () => loadJueces();

  if (!selectedEventId) {
    $("juecesList").innerHTML =
      `<p class="hint-text">Seleccione un evento.</p>`;
    return;
  }

  if (juecesAsignados.length === 0) {
    $("juecesList").innerHTML =
      `<p class="hint-text">No hay jueces asignados a este evento.</p>`;
    return;
  }

  $("juecesList").innerHTML = juecesAsignados
    .map((r) => {
      const asignJuez = asignEvento.filter(
        (a) => String(a.IDJuez) === String(r.IDJuez),
      );
      const pistasJuez = [
        ...new Set(asignJuez.map((a) => a.IDPista).filter(Boolean)),
      ]
        .sort()
        .join(", ");
      const gruposJuez = ordenarGruposNatural([
        ...new Set(
          asignJuez.map((a) => normalizeGrupo(a.IDGrupo)).filter(Boolean),
        ),
      ]).join(", ");
      const { code, name, flagUrl } = getFlagInfoFromCode(r.Nacionalidad);
      const flagHtml = flagUrl
        ? `<img class="flag" src="${flagUrl}" alt="${code}">`
        : `<span class="flag-fallback">J</span>`;
      const esLimitada =
        String(r.TipoJuez || "GENERAL").toUpperCase() === "LIMITADA";
      const gruposTexto = esLimitada
        ? r.GruposHabilitados || "Ninguno"
        : "Todos";
      const photoHtml = r.FotoURL
        ? `<img src="${r.FotoURL}" alt="Foto de ${r.NombreJuez || "Juez"}" class="juez-photo">`
        : `<div class="juez-photo-placeholder">J</div>`;

      return `
      <div class="card juez-card juez-card-evento">
        <div class="juez-main">
          <div class="juez-head">
            ${flagHtml}
            <strong>${r.NombreJuez || ""}</strong>
          </div>
          <div class="juez-body">
            <div class="juez-info-row">
              <span class="juez-label">Nacionalidad:</span>
              <span>${name || r.Nacionalidad || "N/D"}</span>
            </div>
            <div class="juez-info-row">
              <span class="juez-label">Pista(s) en este evento:</span>
              <span class="pista-pill assigned">${pistasJuez || "Sin pista"}</span>
            </div>
            <div class="juez-info-row">
              <span class="juez-label">Grupos en este evento:</span>
              <span class="pista-pill assigned">${gruposJuez || "Sin grupos"}</span>
            </div>
            <div class="juez-observaciones"><strong>Tipo:</strong> ${esLimitada ? "LIMITADA" : "GENERAL"}</div>
            <div class="juez-observaciones"><strong>Grupos habilitados:</strong> ${gruposTexto}</div>
            <div class="juez-evento-actions">
              <button type="button" class="btn btn-danger" onclick="window.quitarJuezDeEvento(event, '${String(r.IDJuez).replace(/'/g, "\\'")}')">Quitar del evento</button>
              <button type="button" class="btn" onclick="window.editJuez('${String(r.IDJuez).replace(/'/g, "\\'")}')">Editar ficha</button>
            </div>
          </div>
        </div>
        ${photoHtml}
      </div>
    `;
    })
    .join("");
}

window.asignarJuezAEvento = async () => {
  const idEvento = $("filterJuecesEvento")?.value || "";
  const idJuez = $("asociarJuezSelect")?.value || "";
  const pista = $("asociarPistaSelect")?.value || "";
  const grupos = Array.from(
    document.querySelectorAll("#asociarGruposBtns .juez-grupo-asociar.active"),
  )
    .map((b) => b.dataset.grupo)
    .filter(Boolean);

  if (!idEvento || !idJuez || !pista || grupos.length === 0) {
    setStatus("Seleccione evento, juez, pista y al menos un grupo.", true);
    return;
  }

  let asignaciones = CACHE.get("Gestion_pistas") || [];
  const nuevas = grupos.filter(
    (g) =>
      !asignaciones.some(
        (a) =>
          String(a.IDEvento) === String(idEvento) &&
          String(a.IDJuez) === String(idJuez) &&
          normalizeGrupo(a.IDGrupo) === normalizeGrupo(g),
      ),
  );

  if (nuevas.length === 0) {
    setStatus("Ese juez ya tiene esos grupos asignados en este evento.");
    loadJueces();
    return;
  }

  const creadas = nuevas.map((g) => ({
    IDAsignacion: "TEMP_" + Date.now() + "_" + g,
    IDEvento: idEvento,
    IDJuez: idJuez,
    IDGrupo: g,
    IDPista: pista,
  }));

  CACHE.set("Gestion_pistas", asignaciones.concat(creadas));
  loadJueces();
  setStatus("Asignando juez al evento...");

  try {
    for (const row of creadas) {
      const payload = {
        IDEvento: row.IDEvento,
        IDJuez: row.IDJuez,
        IDGrupo: row.IDGrupo,
        IDPista: row.IDPista,
      };
      const resp = await api(
        "POST",
        {},
        {
          action: "create",
          table: "Gestion_pistas",
          payload,
        },
      );
      if (resp?.id) {
        const cur = CACHE.get("Gestion_pistas") || [];
        const idx = cur.findIndex(
          (a) => String(a.IDAsignacion) === String(row.IDAsignacion),
        );
        if (idx !== -1) cur[idx].IDAsignacion = resp.id;
        CACHE.set("Gestion_pistas", cur);
      }
    }
    setStatus("Juez asignado al evento.");
    loadJueces();
  } catch (err) {
    setStatus("Error al asignar juez: " + err.message, true);
    await syncAll();
    loadJueces();
  }
};

window.quitarJuezDeEvento = async (e, idJuez) => {
  if (e) {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
  }

  const idEvento = $("filterJuecesEvento")?.value || "";
  if (!idEvento || !idJuez) return;
  if (
    !confirm(
      "Quitar este juez del evento y borrar todas sus asignaciones de pista/grupo?",
    )
  )
    return;

  let asignaciones = CACHE.get("Gestion_pistas") || [];
  const aBorrar = asignaciones.filter(
    (a) =>
      String(a.IDEvento) === String(idEvento) &&
      String(a.IDJuez) === String(idJuez),
  );

  CACHE.set(
    "Gestion_pistas",
    asignaciones.filter((a) => !aBorrar.includes(a)),
  );
  loadJueces();
  setStatus("Quitando juez del evento...");

  try {
    for (const row of aBorrar) {
      if (!String(row.IDAsignacion || "").startsWith("TEMP_")) {
        await api(
          "POST",
          {},
          { action: "delete", table: "Gestion_pistas", id: row.IDAsignacion },
        );
      }
    }
    setStatus("Juez quitado del evento.");
    loadJueces();
  } catch (err) {
    setStatus("Error al quitar juez: " + err.message, true);
    await syncAll();
    loadJueces();
  }
};

async function loadJuecesHistoricosConEstado() {
  const rows = CACHE.get("Jueces") || [];
  const eventos = CACHE.get("Eventos") || [];
  const asignaciones = CACHE.get("Gestion_pistas") || [];

  const filterContainerId = "juecesFilterContainer";
  let filterContainer = $(filterContainerId);

  if (!filterContainer) {
    filterContainer = document.createElement("div");
    filterContainer.id = filterContainerId;
    filterContainer.className = "catalog-toolbar-extra";
    $("juecesList").parentNode.insertBefore(filterContainer, $("juecesList"));
  }

  let selectedEventId = filterContainer.querySelector("select")?.value || "";
  if (!selectedEventId && eventos.length > 0) {
    selectedEventId = String(eventos[eventos.length - 1].IDEvento);
  }

  filterContainer.innerHTML = `
    <div class="field" style="max-width: 520px; margin-bottom: 20px; background: #f4f7f9; padding: 12px; border-radius: 10px; border: 1px solid #3498db;">
      <label style="color: #2980b9; font-weight: bold;">Evento de referencia:</label>
      <select id="filterJuecesEvento" class="select-lg">
        ${eventos
          .map(
            (e) => `
          <option value="${e.IDEvento}" ${String(e.IDEvento) === String(selectedEventId) ? "selected" : ""}>
            ${e.NombreEvento}
          </option>
        `,
          )
          .join("")}
      </select>
      <small class="hint-text">
        Se muestran todos los jueces cargados y su asignacion para este evento.
      </small>
    </div>
  `;

  const selFiltro = $("filterJuecesEvento");
  if (selFiltro) selFiltro.onchange = () => loadJueces();

  const asignEvento = asignaciones.filter(
    (a) => String(a.IDEvento) === String(selectedEventId),
  );
  window._juecesCache = rows;

  if (rows.length === 0) {
    $("juecesList").innerHTML =
      `<p class="hint-text">No hay jueces cargados todavia.</p>`;
    return;
  }

  $("juecesList").innerHTML = rows
    .map((r) => {
      const asignJuez = asignEvento.filter(
        (a) => String(a.IDJuez) === String(r.IDJuez),
      );
      const pistasJuez = [
        ...new Set(asignJuez.map((a) => a.IDPista).filter(Boolean)),
      ]
        .sort()
        .join(", ");
      const gruposJuez = ordenarGruposNatural([
        ...new Set(
          asignJuez.map((a) => normalizeGrupo(a.IDGrupo)).filter(Boolean),
        ),
      ]).join(", ");
      const asignado = asignJuez.length > 0;
      const { code, name, flagUrl } = getFlagInfoFromCode(r.Nacionalidad);
      const flagHtml = flagUrl
        ? `<img class="flag" src="${flagUrl}" alt="${code}">`
        : `<span class="flag-fallback">J</span>`;
      const obsHtml = r.Observaciones
        ? `
      <div class="juez-observaciones">
        <strong>Observaciones:</strong> ${r.Observaciones}
      </div>`
        : "";
      const esLimitada =
        String(r.TipoJuez || "GENERAL").toUpperCase() === "LIMITADA";
      const gruposTexto = esLimitada
        ? r.GruposHabilitados || "Ninguno"
        : "Todos";
      const tipoHtml = `
      <div class="juez-observaciones">
        <strong>Tipo:</strong> ${esLimitada ? "LIMITADA" : "GENERAL"}
      </div>
      <div class="juez-observaciones">
        <strong>Grupos habilitados:</strong> ${gruposTexto}
      </div>`;
      const photoHtml = r.FotoURL
        ? `<img src="${r.FotoURL}" alt="Foto de ${r.NombreJuez || "Juez"}" class="juez-photo">`
        : `<div class="juez-photo-placeholder">J</div>`;

      return `
      <div class="card juez-card" onclick="window.editJuez('${String(r.IDJuez).replace(/'/g, "\\'")}')">
        <div class="juez-main">
          <div class="juez-head">
            ${flagHtml}
            <strong>${r.NombreJuez || ""}</strong>
          </div>
          <div class="juez-body">
            <div class="juez-info-row">
              <span class="juez-label">Nacionalidad:</span>
              <span>${name || r.Nacionalidad || "N/D"}</span>
            </div>
            <div class="juez-info-row">
              <span class="juez-label">Estado en este evento:</span>
              <span class="pista-pill ${asignado ? "assigned" : "unassigned"}">${asignado ? "Asignado" : "Sin asignar a este evento"}</span>
            </div>
            <div class="juez-info-row">
              <span class="juez-label">Pista(s) en este evento:</span>
              <span class="pista-pill">${pistasJuez || "Sin pista asignada"}</span>
            </div>
            <div class="juez-info-row">
              <span class="juez-label">Grupos en este evento:</span>
              <span class="pista-pill">${gruposJuez || "Sin grupos asignados"}</span>
            </div>
            ${obsHtml}
            ${tipoHtml}
          </div>
        </div>
        ${photoHtml}
      </div>
    `;
    })
    .join("");
}

async function legacyVistaJuecesAsignados() {
  const rows = CACHE.get("Jueces") || [];
  const eventos = CACHE.get("Eventos") || [];
  const asignaciones = CACHE.get("Gestion_pistas") || [];

  const filterContainerId = "juecesFilterContainer";
  let filterContainer = $(filterContainerId);

  if (!filterContainer) {
    filterContainer = document.createElement("div");
    filterContainer.id = filterContainerId;
    filterContainer.className = "catalog-toolbar-extra";
    $("juecesList").parentNode.insertBefore(filterContainer, $("juecesList"));
  }

  let selectedEventId = filterContainer.querySelector("select")?.value || "";

  if (!selectedEventId && eventos.length > 0) {
    selectedEventId = String(eventos[eventos.length - 1].IDEvento);
  }

  filterContainer.innerHTML = `
    <div class="field" style="max-width: 450px; margin-bottom: 20px; background: #f4f7f9; padding: 12px; border-radius: 10px; border: 1px solid #3498db;">
      <label style="color: #2980b9; font-weight: bold;">🌍 Exposición de referencia:</label>
      <select id="filterJuecesEvento" class="select-lg">
        ${eventos
          .map(
            (e) => `
          <option value="${e.IDEvento}" ${String(e.IDEvento) === String(selectedEventId) ? "selected" : ""}>
            ${e.NombreEvento}
          </option>
        `,
          )
          .join("")}
      </select>
      <small class="hint-text">
        Esta vista muestra solo los jueces asignados al evento seleccionado.
      </small>
    </div>
  `;

  const selFiltro = $("filterJuecesEvento");
  if (selFiltro) {
    selFiltro.onchange = () => loadJueces();
  }

  const asignEvento = asignaciones.filter(
    (a) => String(a.IDEvento) === String(selectedEventId),
  );

  const idsJuecesAsignados = [
    ...new Set(
      asignEvento.map((a) => String(a.IDJuez || "").trim()).filter(Boolean),
    ),
  ];

  const rowsEvento = rows.filter((j) =>
    idsJuecesAsignados.includes(String(j.IDJuez || "").trim()),
  );

  window._juecesCache = rowsEvento;

  if (rowsEvento.length === 0) {
    $("juecesList").innerHTML = `
      <p class="hint-text">
        No hay jueces asignados a este evento todavía.
        Primero asigná juez, pista y grupos desde Pistas Razas.
      </p>
    `;
    return;
  }

  $("juecesList").innerHTML = rowsEvento
    .map((r) => {
      const pistasJuez = [
        ...new Set(
          asignEvento
            .filter((a) => String(a.IDJuez) === String(r.IDJuez))
            .map((a) => a.IDPista)
            .filter(Boolean),
        ),
      ]
        .sort()
        .join(", ");

      const { code, name, flagUrl } = getFlagInfoFromCode(r.Nacionalidad);

      const flagHtml = flagUrl
        ? `<img class="flag" src="${flagUrl}" alt="${code}">`
        : `<span class="flag-fallback">🌍</span>`;

      const obsHtml = r.Observaciones
        ? `
      <div class="juez-observaciones">
        <strong>Observaciones:</strong> ${r.Observaciones}
      </div>`
        : "";

      const esLimitada =
        String(r.TipoJuez || "GENERAL").toUpperCase() === "LIMITADA";
      const gruposTexto = esLimitada
        ? r.GruposHabilitados || "Ninguno"
        : "Todos";

      const tipoHtml = `
      <div class="juez-observaciones">
        <strong>Tipo:</strong> ${esLimitada ? "LIMITADA" : "GENERAL"}
      </div>
      <div class="juez-observaciones">
        <strong>Grupos habilitados:</strong> ${gruposTexto}
      </div>`;

      const photoHtml = r.FotoURL
        ? `<img src="${r.FotoURL}" alt="Foto de ${r.NombreJuez || "Juez"}" class="juez-photo">`
        : `<div class="juez-photo-placeholder">👤</div>`;

      return `
      <div class="card juez-card" onclick="window.editJuez('${String(r.IDJuez).replace(/'/g, "\\'")}')">
        <div class="juez-main">
          <div class="juez-head">
            ${flagHtml}
            <strong>${r.NombreJuez || ""}</strong>
          </div>
          <div class="juez-body">
            <div class="juez-info-row">
              <span class="juez-label">Nacionalidad:</span>
              <span>${name || r.Nacionalidad || "N/D"}</span>
            </div>
            <div class="juez-info-row">
              <span class="juez-label">Pista(s) en este evento:</span>
              <span class="pista-pill">${pistasJuez || "Sin asignar"}</span>
            </div>
            ${obsHtml}
            ${tipoHtml}
          </div>
        </div>
        ${photoHtml}
      </div>
    `;
    })
    .join("");
}

// 1. Mapa centralizado de países (podes moverlo arriba de todo en el archivo)
const PAISES_MAP = {
  AR: "ARGENTINA",
  BR: "BRASIL",
  UY: "URUGUAY",
  CL: "CHILE",
  PY: "PARAGUAY",
  PE: "PERÚ",
  CO: "COLOMBIA",
  BO: "BOLIVIA",
  EC: "ECUADOR",
  VE: "VENEZUELA",
  MX: "MÉXICO",
  CR: "COSTA RICA",
  PA: "PANAMÁ",
  CU: "CUBA",
  DO: "REP. DOMINICANA",
  PR: "PUERTO RICO",
  GT: "GUATEMALA",
  SV: "EL SALVADOR",
  US: "EEUU",
  CA: "CANADÁ",
  ES: "ESPAÑA",
  IT: "ITALIA",
  FR: "FRANCIA",
  DE: "ALEMANIA",
  GB: "REINO UNIDO",
  PT: "PORTUGAL",
  CH: "SUIZA",
  SE: "SUECIA",
  NO: "NORUEGA",
  NL: "PAÍSES BAJOS",
  BE: "BÉLGICA",
  AT: "AUSTRIA",
  RU: "RUSIA",
  IE: "IRLANDA",
  PL: "POLONIA",
  CZ: "REP. CHECA",
  HU: "HUNGRÍA",
  JP: "JAPÓN",
  CN: "CHINA",
  KR: "COREA DEL SUR",
};

function getFlagInfoFromCode(codeRaw) {
  const code = String(codeRaw || "")
    .trim()
    .toUpperCase();
  const name = PAISES_MAP[code] || (code ? code : "N/A");
  const flagUrl = code
    ? `https://flagcdn.com/w40/${code.toLowerCase()}.png`
    : "";
  return { code, name, flagUrl };
}

window.editJuez = (id) => {
  const row = (window._juecesCache || []).find(
    (r) => String(r.IDJuez) === String(id),
  );
  if (!row) return;
  $("formTitleJuez").textContent = "Editar Juez";
  buildForm(
    "juecesForm",
    [
      "IDJuez",
      "NombreJuez",
      "Nacionalidad",
      "IDPista",
      "Telefono",
      "Mail",
      "Redes",
      "Activo",
      "Observaciones",
      "FotoURL",
      "TipoJuez",
      "GruposHabilitados",
    ],
    row,
  );
  setTimeout(() => {
    setupBtnGroup("GruposHabilitados", true);
    if (window.toggleGruposHabilitados)
      window.toggleGruposHabilitados(row.TipoJuez || "GENERAL");
  }, 10);
};

// --- 4. INSCRIPCIONES LOCALES DEFINITIVO ---
function insEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getActiveEventInscripcion() {
  const sel = $("insEventoSelect");
  return String(
    sel?.value ||
      localStorage.getItem("UI_ACTIVE_EVENT_ID") ||
      CACHE.get("UI_ACTIVE_EVENT_ID") ||
      "",
  ).trim();
}

function getInscripcionesEventoActivo() {
  const eventoId = getActiveEventInscripcion();
  return (CACHE.get("Catalogo_Perros_Inscriptos") || [])
    .map(normalizarInscripcionCategoria)
    .filter((r) => !eventoId || String(r.IDEvento || "").trim() === eventoId);
}

function setNumeroCatalogoHint(rows) {
  const next = sugerirNroCatalogo(rows);
  const hint = $("nroHint");
  if (hint) hint.innerHTML = `Sugerencia: <strong>${next}</strong>`;
  return next;
}

function limpiarInscripcion() {
  const f = $("inscripcionForm");
  if (!f) return;

  const eventoId = getActiveEventInscripcion();
  f.reset();

  [
    "IDInscripcion",
    "IDGrupo",
    "IDCategoria",
    "IDSexo",
    "Observaciones",
  ].forEach((name) => {
    if (f.elements[name]) f.elements[name].value = "";
  });
  if (f.elements["IDEvento"]) f.elements["IDEvento"].value = eventoId;

  document.querySelectorAll("#viewInscripciones .btn-opt").forEach((btn) => {
    btn.classList.remove("active", "multi");
  });

  if ($("insEventoSelect") && eventoId) $("insEventoSelect").value = eventoId;
  if ($("insRaza"))
    $("insRaza").innerHTML =
      '<option value="">Seleccione un Grupo primero</option>';
  if ($("btnEliminarInscripcion"))
    $("btnEliminarInscripcion").style.display = "none";
  if ($("btnGuardarInscripcion"))
    $("btnGuardarInscripcion").textContent = "Inscribir Perro";
  if (f.elements["NumeroCatalogo"])
    f.elements["NumeroCatalogo"].value = setNumeroCatalogoHint(
      getInscripcionesEventoActivo(),
    );

  setStatus("Formulario limpio y listo.");
}

async function setActiveEventInscripcion(eventId) {
  const id = String(eventId || "").trim();
  if (!id) return "";

  localStorage.setItem("UI_ACTIVE_EVENT_ID", id);
  CACHE.set("UI_ACTIVE_EVENT_ID", id);

  const sel = $("insEventoSelect");
  if (sel) sel.value = id;

  const f = $("inscripcionForm");
  if (f?.elements?.["IDEvento"]) f.elements["IDEvento"].value = id;

  const ev = (CACHE.get("Eventos") || []).find(
    (x) => String(x.IDEvento) === id,
  );
  const info = $("insEventoInfo");
  if (info)
    info.textContent = ev
      ? `Estas inscribiendo en: ${ev.NombreEvento || ev.Nombre || ev.IDEvento}`
      : "";

  loadInscripciones();
  return id;
}

async function prepareInscripcionForm() {
  const grupoBtns = $("insGrupoBtns");
  if (grupoBtns) {
    grupoBtns.innerHTML = GRUPOS_LOCALES_INSCRIPCION.map(
      (g) =>
        `<button type="button" class="btn-opt" data-value="${g}">${g}</button>`,
    ).join("");
  }

  const catBtns = $("insCatBtns");
  if (catBtns) {
    catBtns.innerHTML = `
      <div class="local-cat-section">
        <div class="local-cat-title">Categoria base</div>
        <div class="local-cat-options local-cat-options-horizontal">
          ${CATEGORIAS_BASE_INSCRIPCION.map(
            (base) => `
            <button type="button" class="btn-opt local-cat-base-btn" data-cat-base="${insEscape(base)}">
              ${insEscape(base)}
            </button>
          `,
          ).join("")}
        </div>
      </div>
      <div class="local-cat-section">
        <div class="local-cat-title">Sexo</div>
        <div class="local-cat-options local-sex-options">
          <button type="button" class="btn-opt local-sex-btn" data-sexo="Macho">Macho</button>
          <button type="button" class="btn-opt local-sex-btn" data-sexo="Hembra">Hembra</button>
        </div>
      </div>
    `;
  }

  setupBtnGroup("IDGrupo", false, filtrarRazasPorGrupo);
  setupCategoriaLocalButtons();

  const eventos = CACHE.get("Eventos") || [];
  const sel = $("insEventoSelect");
  const f = $("inscripcionForm");
  if (sel) {
    sel.innerHTML = eventos
      .map((ev) => {
        const nombre = ev.NombreEvento || ev.Nombre || ev.IDEvento;
        const fecha = ev.Fecha ? ` (${ev.Fecha})` : "";
        return `<option value="${insEscape(ev.IDEvento)}">${insEscape(nombre + fecha)}</option>`;
      })
      .join("");

    let activo = getActiveEventInscripcion();
    if (!eventos.some((ev) => String(ev.IDEvento) === activo)) {
      activo = eventos.length
        ? String(eventos[eventos.length - 1].IDEvento || "")
        : "";
    }
    if (activo) await setActiveEventInscripcion(activo);

    if (!sel.dataset.localBound) {
      sel.onchange = async () => {
        await setActiveEventInscripcion(sel.value);
        limpiarInscripcion();
      };
      sel.dataset.localBound = "1";
    }
  }

  if (f?.elements?.["NumeroCatalogo"]) {
    f.elements["NumeroCatalogo"].value = setNumeroCatalogoHint(
      getInscripcionesEventoActivo(),
    );
  }
}

function filtrarRazasPorGrupo(grupoId) {
  const razas = (CACHE.get("Catalogo_Razas") || [])
    .filter((r) => String(r.IDGrupo) === String(grupoId))
    .sort((a, b) =>
      String(a.NombreRaza || "").localeCompare(String(b.NombreRaza || "")),
    );

  const sel = $("insRaza");
  if (!sel) return;
  sel.innerHTML =
    '<option value="">Seleccione Raza</option>' +
    razas
      .map(
        (r) =>
          `<option value="${insEscape(r.IDRaza)}">${insEscape(r.NombreRaza || r.IDRaza)}</option>`,
      )
      .join("");
}

async function loadInscripciones(filtroManual = {}) {
  const listCont = $("inscripcionesList");
  if (!listCont) return;

  const razas = CACHE.get("Catalogo_Razas") || [];
  const sexos = CACHE.get("Catalogo_Sexos") || [];
  let rows = getInscripcionesEventoActivo()
    .filter((r) => categoriaLocal(r.IDCategoria))
    .map((r) => ({
      ...r,
      NombreRaza:
        razas.find((x) => String(x.IDRaza) === String(r.IDRaza))?.NombreRaza ||
        `Raza ${r.IDRaza || ""}`,
      NombreSexo:
        sexos.find((x) => String(x.IDSexo) === String(r.IDSexo))?.NombreSexo ||
        sexoOpcionDesdeId(r.IDSexo) ||
        nombreSexoLocalDesdeCategoria(r.IDCategoria),
      NombreCategoria: nombreCategoriaLocal(r.IDCategoria),
    }));

  const filterGrupo = $("filterGrupo");
  const filterRaza = $("filterRaza");
  if (filterGrupo && filterRaza) {
    const currentGrupo = filtroManual.grupo ?? filterGrupo.value ?? "";
    const grupos = ordenarGruposNatural([
      ...new Set(rows.map((r) => r.IDGrupo).filter(Boolean)),
    ]);
    filterGrupo.innerHTML =
      '<option value="">Todos Grupos</option>' +
      grupos
        .map((g) => `<option value="${insEscape(g)}">${insEscape(g)}</option>`)
        .join("");
    filterGrupo.value = grupos.includes(currentGrupo) ? currentGrupo : "";

    const rowsForRaza = filterGrupo.value
      ? rows.filter((r) => String(r.IDGrupo) === String(filterGrupo.value))
      : rows;
    const currentRaza = filtroManual.raza ?? filterRaza.value ?? "";
    const razasFiltro = [
      ...new Set(rowsForRaza.map((r) => r.NombreRaza).filter(Boolean)),
    ].sort();
    filterRaza.innerHTML =
      '<option value="">Todas Razas</option>' +
      razasFiltro
        .map((r) => `<option value="${insEscape(r)}">${insEscape(r)}</option>`)
        .join("");
    filterRaza.value = razasFiltro.includes(currentRaza) ? currentRaza : "";

    if (!filterGrupo.dataset.localBound) {
      filterGrupo.onchange = () =>
        loadInscripciones({ grupo: filterGrupo.value, raza: "" });
      filterRaza.onchange = () =>
        loadInscripciones({ grupo: filterGrupo.value, raza: filterRaza.value });
      filterGrupo.dataset.localBound = "1";
    }

    if (filterGrupo.value)
      rows = rows.filter(
        (r) => String(r.IDGrupo) === String(filterGrupo.value),
      );
    if (filterRaza.value)
      rows = rows.filter(
        (r) => String(r.NombreRaza) === String(filterRaza.value),
      );
  }

  rows.sort(
    (a, b) =>
      String(a.IDGrupo || "").localeCompare(
        String(b.IDGrupo || ""),
        undefined,
        { numeric: true },
      ) ||
      String(a.NombreRaza || "").localeCompare(String(b.NombreRaza || "")) ||
      (parseInt(String(a.NumeroCatalogo || "").replace(/\D/g, ""), 10) || 0) -
        (parseInt(String(b.NumeroCatalogo || "").replace(/\D/g, ""), 10) || 0),
  );

  window._insCache = rows;
  setNumeroCatalogoHint(getInscripcionesEventoActivo());

  if (!rows.length) {
    listCont.innerHTML =
      '<p class="hint-text ins-empty">No hay perros cargados para este evento.</p>';
    return;
  }

  let html = "";
  let lastGrupo = "";
  let lastRaza = "";

  rows.forEach((r) => {
    if (String(r.IDGrupo) !== String(lastGrupo)) {
      html += `<div class="list-group-header">Grupo ${insEscape(r.IDGrupo || "")}</div>`;
      lastGrupo = r.IDGrupo;
      lastRaza = "";
    }
    if (String(r.NombreRaza) !== String(lastRaza)) {
      html += `<div class="list-breed-header">${insEscape(r.NombreRaza)}</div>`;
      lastRaza = r.NombreRaza;
    }

    html += `
      <div class="card insc-item" data-id="${insEscape(r.IDInscripcion)}">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="insc-num">#${insEscape(r.NumeroCatalogo || "")}</span>
          <span class="insc-meta">${insEscape(r.NombreSexo || r.IDSexo || "")} | ${insEscape(r.NombreCategoria)}</span>
          <span style="margin-left:auto;"></span>
          <button type="button" class="btn" style="padding:6px 10px;font-size:12px;"
            onclick="event.stopPropagation(); window.editInscripcion('${insEscape(r.IDInscripcion)}')">
            EDITAR PERRO
          </button>
        </div>
      </div>
    `;
  });

  listCont.innerHTML = html;
}

async function refreshInscripcionesUI({ setNextNumero = true } = {}) {
  await syncAll();
  await prepareInscripcionForm();
  loadInscripciones();
  if (setNextNumero) {
    const f = $("inscripcionForm");
    if (f?.elements?.["NumeroCatalogo"])
      f.elements["NumeroCatalogo"].value = setNumeroCatalogoHint(
        getInscripcionesEventoActivo(),
      );
  }
}

window.editInscripcion = (id) => {
  const row = (window._insCache || []).find(
    (r) => String(r.IDInscripcion) === String(id),
  );
  const f = $("inscripcionForm");
  if (!row || !f) return;

  if ($("btnEliminarInscripcion"))
    $("btnEliminarInscripcion").style.display = "inline-block";
  if ($("btnGuardarInscripcion"))
    $("btnGuardarInscripcion").textContent = "Actualizar Perro";

  if (f.elements["IDInscripcion"])
    f.elements["IDInscripcion"].value = row.IDInscripcion || "";
  if (f.elements["IDEvento"])
    f.elements["IDEvento"].value = row.IDEvento || getActiveEventInscripcion();
  if (f.elements["NumeroCatalogo"])
    f.elements["NumeroCatalogo"].value = row.NumeroCatalogo || "";
  if (f.elements["IDGrupo"]) f.elements["IDGrupo"].value = row.IDGrupo || "";
  const idCategoria = normalizarIDCategoria(row.IDCategoria, row.IDSexo);
  if (f.elements["IDCategoria"]) f.elements["IDCategoria"].value = idCategoria;
  if (f.elements["IDSexo"])
    f.elements["IDSexo"].value =
      categoriaLocal(idCategoria)?.sexo || sexoIdDesdeOpcion(row.IDSexo) || "";
  if (f.elements["Observaciones"])
    f.elements["Observaciones"].value = row.Observaciones || "";

  refreshBtnVisuals("IDGrupo", row.IDGrupo);
  refreshCategoriaLocalVisuals(idCategoria, row.IDSexo);
  filtrarRazasPorGrupo(row.IDGrupo);
  if ($("insRaza")) $("insRaza").value = row.IDRaza || "";

  setStatus("Editando perro #" + row.NumeroCatalogo);
};

// --- 5. PISTAS Y RESULTADOS (ETAPA RAZAS) ---
// --- 5. PISTAS Y RESULTADOS (ETAPA RAZAS) ---
window._juezSeleccionadoPista = null;

async function preparePistasForm() {
  const E = CACHE.get("Eventos") || [];
  const selectEvento = $("pistaEventoSelect");
  if (selectEvento) {
    const actual = selectEvento.value;
    const fallback = E.length ? String(E[E.length - 1].IDEvento) : "";
    const seleccionado = E.some((e) => String(e.IDEvento) === String(actual))
      ? String(actual)
      : fallback;
    selectEvento.innerHTML = E.map(
      (e) => `
      <option value="${e.IDEvento}" ${String(e.IDEvento) === String(seleccionado) ? "selected" : ""}>${e.NombreEvento}</option>
    `,
    ).join("");
    selectEvento.onchange = () => {
      window._juezSeleccionadoPista = null;
      // LIMPIEZA: Al cambiar el evento, vaciamos el panel de juzgamiento
      $("panelJuzgamiento").innerHTML =
        `<p class="hint-text">Seleccione juez, pista y grupos para configurar el evento.</p>`;
      renderBotonerasPista();
    };
  }
  renderBotonerasPista();
}

function getGruposParaConfigurar() {
  const gruposCat = CACHE.get("Catalogo_Grupos") || [];
  const gruposDesdeCatalogo = gruposCat
    .map((g) =>
      normalizeGrupo(
        g.IDGrupo ||
          g.CodigoGrupo ||
          g.Grupo ||
          g.NombreGrupo ||
          g.Nombre ||
          "",
      ),
    )
    .filter(Boolean);
  const gruposBase = gruposDesdeCatalogo.length
    ? gruposDesdeCatalogo
    : ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10"];
  return ordenarGruposNatural([...new Set(gruposBase)]);
}

function renderBotonerasPista() {
  const idEvento = $("pistaEventoSelect")?.value;
  if (!idEvento) return;

  const J = CACHE.get("Jueces") || [];
  const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  const asign = CACHE.get("Gestion_pistas") || [];
  const asignEvento = asign.filter(
    (a) => String(a.IDEvento) === String(idEvento),
  );
  const juecesIdsEvento = [
    ...new Set(
      asignEvento.map((a) => String(a.IDJuez || "").trim()).filter(Boolean),
    ),
  ];
  const juecesEvento = J.filter((j) =>
    juecesIdsEvento.includes(String(j.IDJuez)),
  );

  if (
    window._juezSeleccionadoPista &&
    !juecesIdsEvento.includes(String(window._juezSeleccionadoPista.idJuez))
  ) {
    window._juezSeleccionadoPista = null;
  }

  const inscEvento = insc.filter(
    (i) => String(i.IDEvento) === String(idEvento),
  );

  const conteo = {};
  inscEvento.forEach((p) => {
    const g = normalizeGrupo(p.IDGrupo);
    if (g) conteo[g] = (conteo[g] || 0) + 1;
  });

  const gruposUnicos = getGruposParaConfigurar();
  gruposUnicos.forEach((g) => {
    if (!conteo[g]) conteo[g] = 0;
  });

  const pistaAsignadaParaJuez = (idJuez) => {
    const a = asignEvento.find(
      (x) =>
        String(x.IDJuez) === String(idJuez) &&
        x.IDPista !== undefined &&
        x.IDPista !== null &&
        String(x.IDPista) !== "",
    );
    return a ? String(a.IDPista) : "";
  };

  const gruposTextoJuez = (j) => {
    const esLimitada =
      String(j.TipoJuez || "GENERAL").toUpperCase() === "LIMITADA";
    if (!esLimitada) return "";
    return String(j.GruposHabilitados || "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean)
      .join(", ");
  };

  // Renombrar botones derechos de pistas según juez LIMITADA
  document.querySelectorAll("#selectorPistaActiva .btn-opt").forEach((btn) => {
    const pistaBtn = String(btn.dataset.value || "");
    const asignPista = asignEvento.find((a) => String(a.IDPista) === pistaBtn);

    const juezPista = asignPista
      ? J.find((j) => String(j.IDJuez) === String(asignPista.IDJuez))
      : null;

    const gruposHab = juezPista ? gruposTextoJuez(juezPista) : "";

    if (juezPista && gruposHab) {
      btn.textContent = `Pista ${pistaBtn} - ${gruposHab}`;
      btn.title = `${juezPista.NombreJuez} - ${gruposHab}`;
    } else {
      btn.textContent = `Pista ${pistaBtn}`;
      btn.title = "";
    }
  });

  const juecesHtml = juecesEvento
    .map((j) => {
      const pistaElegida =
        window._juezSeleccionadoPista?.idJuez === j.IDJuez
          ? String(window._juezSeleccionadoPista.pista || "")
          : "";
      const pistaReal = pistaAsignadaParaJuez(j.IDJuez) || pistaElegida;
      const pistaTxt = pistaReal ? `Pista ${pistaReal}` : "Pista ?";
      const gruposAsignadosJuez = ordenarGruposNatural([
        ...new Set(
          asignEvento
            .filter((a) => String(a.IDJuez) === String(j.IDJuez))
            .map((a) => normalizeGrupo(a.IDGrupo))
            .filter(Boolean),
        ),
      ]).join(", ");

      const etiquetaJuez = gruposAsignadosJuez
        ? `${j.NombreJuez} (${pistaTxt} - ${gruposAsignadosJuez})`
        : `${j.NombreJuez} (${pistaTxt})`;

      return `
      <button type="button"
              class="btn-opt btn-juez-pista ${window._juezSeleccionadoPista?.idJuez === j.IDJuez ? "active" : ""}"
              id="btnJuez_${j.IDJuez}"
              title="${etiquetaJuez}"
              onclick="window.seleccionarJuezPista('${j.IDJuez}', '${pistaReal}')">
        ${etiquetaJuez}
      </button>`;
    })
    .join("");

  const gruposHtml = gruposUnicos
    .map((g) => {
      const yaAsignado = asignEvento.find(
        (a) =>
          (!window._juezSeleccionadoPista ||
            String(a.IDJuez) ===
              String(window._juezSeleccionadoPista.idJuez)) &&
          normalizeGrupo(a.IDGrupo) === normalizeGrupo(g),
      );
      const cant = conteo[g] || 0;
      return `
      <button type="button"
              class="btn-opt btn-grupo-directo"
              id="btnGrupoPista_${String(g).replace(/\s+/g, "_")}"
              onclick="window.toggleAsignacionGrupo('${g}')">
        ${g} (${conteo[g]}) ${yaAsignado ? "✓" : ""}
      </button>`;
    })
    .join("");

  $("formPistasDinamico").innerHTML = `
    <div class="btn-group-pistas planilla-jueces">${juecesHtml || "No hay jueces asociados a este evento. Asociá jueces desde la vista Jueces."}</div>
    <div class="planilla-count">
      ${inscEvento.length} perros inscriptos en el evento.${inscEvento.length === 0 ? " Puede asignar jueces y grupos igualmente." : ""}
    </div>
  `;

  renderCronograma();
  actualizarEstadoBotoneraGrupos();
  sugerirNroCatalogo(insc);
}

window.seleccionarJuezPista = (idJuez, pista) => {
  // 1. Activar visualmente el botón del juez
  document
    .querySelectorAll(".btn-juez-pista")
    .forEach((b) => b.classList.remove("active"));
  const btn = $(`btnJuez_${idJuez}`);
  if (btn) btn.classList.add("active");

  // 2. Guardar estado global
  window._juezSeleccionadoPista = { idJuez, pista };

  // 3. Actualizar visualmente los grupos del juez seleccionado
  actualizarEstadoBotoneraGrupos();

  // 4. Refrescar cronograma
  renderCronograma();

  // 5. Renderizar el panel de juzgamiento para esa pista
  if (pista) {
    renderJuzgamiento(pista);
  } else if ($("panelJuzgamiento")) {
    $("panelJuzgamiento").innerHTML =
      `<p class="hint-text">Juez seleccionado. Elegi una pista y luego asigna grupos.</p>`;
  }
};

// 2. FUNCION TOGGLE ASIGNACION (PISTAS) (CORREGIDA)
window.toggleAsignacionGrupo = async (grupoId) => {
  if (!window._juezSeleccionadoPista) {
    setStatus("Error: Seleccione un juez primero.", true);
    return;
  }

  const { idJuez, pista } = window._juezSeleccionadoPista;
  const idEvento = $("pistaEventoSelect").value;

  if (!pista) {
    setStatus(
      "Seleccione una pista para este juez antes de asignar grupos.",
      true,
    );
    return;
  }

  let asignaciones = CACHE.get("Gestion_pistas") || [];
  const existente = asignaciones.find(
    (a) =>
      String(a.IDEvento) === String(idEvento) &&
      String(a.IDJuez) === String(idJuez) &&
      normalizeGrupo(a.IDGrupo) === normalizeGrupo(grupoId),
  );

  // --- UPDATE INMEDIATO (optimista) ---
  let tempIdCreado = null;

  if (existente) {
    asignaciones = asignaciones.filter(
      (a) => String(a.IDAsignacion) !== String(existente.IDAsignacion),
    );
  } else {
    tempIdCreado = "TEMP_" + Date.now();
    asignaciones.push({
      IDAsignacion: tempIdCreado,
      IDEvento: idEvento,
      IDJuez: idJuez,
      IDGrupo: grupoId,
      IDPista: pista,
    });
  }

  CACHE.set("Gestion_pistas", asignaciones);
  renderBotonerasPista();

  // --- COMUNICACIÓN ASÍNCRONA ---
  // FIX: si borramos un TEMP_, NO llamar al servidor
  if (existente && String(existente.IDAsignacion || "").startsWith("TEMP_")) {
    setStatus("Eliminado local (TEMP).");
    return;
  }

  api(
    "POST",
    {},
    {
      action: existente ? "delete" : "create",
      table: "Gestion_pistas",
      id: existente ? existente.IDAsignacion : null,
      payload: existente
        ? null
        : {
            IDEvento: idEvento,
            IDJuez: idJuez,
            IDGrupo: grupoId,
            IDPista: pista,
          },
    },
  )
    .then((resp) => {
      // FIX: si creamos y el servidor devuelve id, reemplazar TEMP -> real en CACHE
      if (!existente && tempIdCreado && resp?.id) {
        const a = CACHE.get("Gestion_pistas") || [];
        const idx = a.findIndex(
          (x) => String(x.IDAsignacion) === String(tempIdCreado),
        );
        if (idx !== -1) {
          a[idx].IDAsignacion = resp.id;
          CACHE.set("Gestion_pistas", a);
          renderBotonerasPista();
        }
      }
      setStatus("Sincronizado.");
    })
    .catch((e) => {
      setStatus("Error de red: " + e.message, true);
      // opcional: syncAll();
    });
};

function actualizarEstadoBotoneraGrupos() {
  const asignaciones = CACHE.get("Gestion_pistas") || [];
  const idEvento = $("pistaEventoSelect")?.value;
  document
    .querySelectorAll(".btn-grupo-directo")
    .forEach((b) => b.classList.remove("active"));
  if (!window._juezSeleccionadoPista || !idEvento) return;
  asignaciones.forEach((a) => {
    if (
      String(a.IDEvento) === String(idEvento) &&
      String(a.IDJuez) === String(window._juezSeleccionadoPista.idJuez)
    ) {
      const btn = $(
        `btnGrupoPista_${String(normalizeGrupo(a.IDGrupo)).replace(/\s+/g, "_")}`,
      );
      if (btn) btn.classList.add("active");
    }
  });
}

function renderCronograma() {
  const data = CACHE.get("Gestion_pistas") || [],
    J = CACHE.get("Jueces") || [],
    idEvento = $("pistaEventoSelect")?.value;
  if (!idEvento) {
    $("cronogramaPistas").innerHTML = "Seleccione un evento.";
    return;
  }
  const items = data.filter((p) => String(p.IDEvento) === String(idEvento));
  $("cronogramaPistas").innerHTML =
    items
      .map((p) => {
        const jNom =
          J.find((j) => String(j.IDJuez) === String(p.IDJuez))?.NombreJuez ||
          p.IDJuez;
        return `<div class="cronograma-item"><span><strong>Pista ${p.IDPista}</strong> | ${p.IDGrupo} | ${jNom}</span><button onclick="window.borrarAsignacionPista('${p.IDAsignacion}')" class="btn-del">✕</button></div>`;
      })
      .join("") || "No hay asignaciones.";
}

// 3. FUNCION BORRAR ASIGNACION (CRONOGRAMA) (CORREGIDA)
window.borrarAsignacionPista = async (id) => {
  if (!confirm("¿Borrar asignación?")) return;

  // 1) Borrado local inmediato
  let asignaciones = CACHE.get("Gestion_pistas") || [];
  asignaciones = asignaciones.filter(
    (a) => String(a.IDAsignacion) !== String(id),
  );
  CACHE.set("Gestion_pistas", asignaciones);

  renderBotonerasPista();
  setStatus("Borrando en segundo plano...");

  // FIX: si es TEMP_ no existe en servidor
  if (String(id || "").startsWith("TEMP_")) {
    setStatus("Eliminado local (TEMP).");
    return;
  }

  // 2) Borrado remoto
  api("POST", {}, { action: "delete", table: "Gestion_pistas", id: id })
    .then(() => setStatus("Eliminado correctamente."))
    .catch((e) => {
      setStatus("Error al borrar: " + e.message, true);
      syncAll();
    });
};

const PLANILLA_FILAS_RAZA = [
  {
    nro: "15",
    nombre: "CACHORRO ESPECIAL MACHO (3 a 6 meses)",
    cats: ["C15"],
    sexo: "M",
    bloque: "bloque-cachorros-especiales-m",
    separador: "bloque-top-thick sexo-macho",
  },
  {
    nro: "16",
    nombre: "CACHORRO ESPECIAL HEMBRA (3 a 6 meses)",
    cats: ["C16"],
    sexo: "H",
    bloque: "bloque-cachorros-especiales-h",
    separador: "bloque-sexo-divider sexo-hembra",
  },
  {
    nro: "1",
    nombre: "CACHORRO MACHO (6 a 9 meses)",
    cats: ["C1"],
    sexo: "M",
    bloque: "bloque-cachorros-m",
    separador: "bloque-top-thick sexo-macho",
  },
  {
    nro: "2",
    nombre: "CACHORRO HEMBRA (6 a 9 meses)",
    cats: ["C2"],
    sexo: "H",
    bloque: "bloque-cachorros-h",
    separador: "bloque-sexo-divider sexo-hembra",
  },
  {
    nro: "3",
    nombre: "JOVEN MACHO (9 a 18 meses)",
    cats: ["C3"],
    sexo: "M",
    bloque: "bloque-jovenes-m",
    separador: "bloque-top-thick sexo-macho",
  },
  {
    nro: "4",
    nombre: "JOVEN HEMBRA (9 a 18 meses)",
    cats: ["C4"],
    sexo: "H",
    bloque: "bloque-jovenes-h",
    separador: "bloque-sexo-divider sexo-hembra",
  },
  {
    nro: "5",
    nombre: "INTERMEDIA MACHO (15 a 24 meses)",
    cats: ["C5"],
    sexo: "M",
    bloque: "bloque-adultos-m",
    separador: "bloque-top-thick sexo-macho",
  },
  {
    nro: "9",
    nombre: "INTERMEDIA HEMBRA (15 a 24 meses)",
    cats: ["C9"],
    sexo: "H",
    bloque: "bloque-adultos-h",
    separador: "bloque-sexo-divider sexo-hembra",
  },
  {
    nro: "6",
    nombre: "ABIERTA MACHO (mas de 15 meses)",
    cats: ["C6"],
    sexo: "M",
    bloque: "bloque-adultos-m",
    separador: "bloque-top-thick sexo-macho",
  },
  {
    nro: "10",
    nombre: "ABIERTA HEMBRA (mas de 15 meses)",
    cats: ["C10"],
    sexo: "H",
    bloque: "bloque-adultos-h",
    separador: "bloque-sexo-divider sexo-hembra",
  },
  {
    nro: "13",
    nombre: "VETERANO MACHO (mas de 8 anos)",
    cats: ["C13"],
    sexo: "M",
    bloque: "bloque-veteranos-m",
    separador: "bloque-top-thick sexo-macho",
  },
  {
    nro: "14",
    nombre: "VETERANO HEMBRA (mas de 8 anos)",
    cats: ["C14"],
    sexo: "H",
    bloque: "bloque-veteranos-h",
    separador: "bloque-sexo-divider sexo-hembra",
  },
];

const ROLE_LABELS_RAZA = {
  MEJOR_CACHORRO_ESPECIAL_RAZA: "MEJOR CACHORRO ESPECIAL RAZA",
  SEXO_OPUESTO_CACHORRO_ESPECIAL: "SEXO OPUESTO CACHORRO ESPECIAL",
  MEJOR_CACHORRO_RAZA: "MEJOR CACHORRO RAZA",
  SEXO_OPUESTO_CACHORRO: "SEXO OPUESTO CACHORRO",
  MEJOR_JOVEN_MACHO: "MEJOR JOVEN MACHO",
  MEJOR_JOVEN_HEMBRA: "MEJOR JOVEN HEMBRA",
  MEJOR_JOVEN_RAZA: "MEJOR JOVEN DE RAZA",
  SEXO_OPUESTO_JOVEN: "SEXO OPUESTO JOVEN",
  MEJOR_MACHO: "MEJOR MACHO",
  MEJOR_HEMBRA: "MEJOR HEMBRA",
  MEJOR_DE_RAZA: "MEJOR DE RAZA",
  SEXO_OPUESTO_RAZA: "SEXO OPUESTO RAZA",
  MEJOR_VETERANO_RAZA: "MEJOR VETERANO RAZA",
  SEXO_OPUESTO_VETERANO: "SEXO OPUESTO VETERANO",
};

const TITULO_GANADO_POR_ROL_FINAL_RAZA = {
  MEJOR_CACHORRO_ESPECIAL_RAZA: "MEJOR_RAZA_CACHORRO_ESPECIAL",
  MEJOR_CACHORRO_RAZA: "MEJOR_RAZA_CACHORRO",
  MEJOR_JOVEN_RAZA: "MEJOR_RAZA_JOVEN",
  MEJOR_DE_RAZA: "MEJOR_RAZA_ADULTO",
};

const TITULOS_GANADOS_BIS_RAZA = [
  "MEJOR_RAZA_CACHORRO_ESPECIAL",
  "MEJOR_RAZA_CACHORRO",
  "MEJOR_RAZA_JOVEN",
  "MEJOR_RAZA_ADULTO",
];

const TITULO_GANADO_BIS_POR_BLOQUE = {
  "BIS CACHORROS ESPECIALES": "MEJOR_RAZA_CACHORRO_ESPECIAL",
  "BIS CACHORROS": "MEJOR_RAZA_CACHORRO",
  "BIS JOVENES": "MEJOR_RAZA_JOVEN",
  "BIS ADULTOS": "MEJOR_RAZA_ADULTO",
};

const ROL_FINAL_RAZA_POR_TITULO_GANADO = Object.fromEntries(
  Object.entries(TITULO_GANADO_POR_ROL_FINAL_RAZA).map(([rol, titulo]) => [
    titulo,
    rol,
  ]),
);

const FINAL_RAZA_BLOQUES = [
  {
    titulo: "Cachorros especiales",
    clase: "bloque-finales-cachorro-especial",
    roles: ["MEJOR_CACHORRO_ESPECIAL_RAZA", "SEXO_OPUESTO_CACHORRO_ESPECIAL"],
  },
  {
    titulo: "Cachorros",
    clase: "bloque-finales-cachorro",
    roles: ["MEJOR_CACHORRO_RAZA", "SEXO_OPUESTO_CACHORRO"],
  },
  {
    titulo: "Jovenes",
    clase: "bloque-finales-joven",
    roles: [
      "MEJOR_JOVEN_MACHO",
      "MEJOR_JOVEN_HEMBRA",
      "MEJOR_JOVEN_RAZA",
      "SEXO_OPUESTO_JOVEN",
    ],
  },
  {
    titulo: "Adultos",
    clase: "bloque-finales-adulto",
    roles: [
      "MEJOR_MACHO",
      "MEJOR_HEMBRA",
      "MEJOR_DE_RAZA",
      "SEXO_OPUESTO_RAZA",
    ],
  },
  {
    titulo: "Veteranos",
    clase: "bloque-finales-veterano",
    roles: ["MEJOR_VETERANO_RAZA", "SEXO_OPUESTO_VETERANO"],
  },
];

const FINAL_RAZA_BLOQUES_SIMPLES = FINAL_RAZA_BLOQUES.filter((b) =>
  ["bloque-finales-cachorro-especial", "bloque-finales-cachorro"].includes(
    b.clase,
  ),
);

const FINAL_RAZA_BLOQUES_RESTANTES = FINAL_RAZA_BLOQUES.filter((b) =>
  [
    "bloque-finales-joven",
    "bloque-finales-adulto",
    "bloque-finales-veterano",
  ].includes(b.clase),
);

function escapeAttr(v) {
  return String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, " ")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sexoKind(perro, sexos = []) {
  const raw = String(perro?.IDSexo || "")
    .trim()
    .toLowerCase();
  const sexoCategoria = categoriaLocal(perro?.IDCategoria)?.sexo;
  if (!raw && sexoCategoria) return sexoCategoria;

  const sexoObj = sexos.find((s) => String(s.IDSexo) === String(perro?.IDSexo));
  const txt = `${raw} ${String(sexoObj?.NombreSexo || "").toLowerCase()}`;
  if (txt.includes("hemb") || txt === "h" || txt.includes("female")) return "H";
  if (txt.includes("mach") || txt === "m" || txt.includes("male")) return "M";
  return raw.startsWith("h") || raw.includes("f") ? "H" : sexoCategoria || "M";
}

function asegurarCamposResultadoRaza(resultado) {
  if (!resultado) return resultado;
  resultado.Puesto = String(resultado.Puesto || "");
  resultado.Calificacion = String(resultado.Calificacion || "");
  resultado.Ausente = isTruthy(resultado.Ausente);
  resultado.Titulo_Ganado = String(resultado.Titulo_Ganado || "");
  resultado.RolesFinalRaza = String(resultado.RolesFinalRaza || "");

  if (resultado.Calificacion.toUpperCase() === "AUS" || resultado.Ausente) {
    resultado.Ausente = true;
    resultado.Calificacion = "AUS";
    resultado.Puesto = "";
    resultado.Titulo_Ganado = "";
    resultado.RolesFinalRaza = "";
    return resultado;
  }

  if (!resultado.RolesFinalRaza && resultado.Titulo_Ganado) {
    resultado.RolesFinalRaza =
      ROL_FINAL_RAZA_POR_TITULO_GANADO[resultado.Titulo_Ganado] || "";
  }

  return resultado;
}

function payloadResultadoRaza(resultado) {
  asegurarCamposResultadoRaza(resultado);
  return {
    ...resultado,
    IDInscripcion: resultado.IDInscripcion || "",
    IDEvento: resultado.IDEvento || "",
    IDJuez: resultado.IDJuez || "",
    Puesto: resultado.Puesto || "",
    Calificacion: resultado.Calificacion || "",
    Ausente: isTruthy(resultado.Ausente),
    Titulo_Ganado: resultado.Titulo_Ganado || "",
  };
}

function getResultadoRaza(idInscripcion, idJuez, idEvento) {
  const res = CACHE.get("Resultados_Razas") || [];
  const nP = normalizeID(idInscripcion),
    nJ = normalizeID(idJuez),
    nE = normalizeID(idEvento);
  const resultado = res.find(
    (x) =>
      normalizeID(x.IDInscripcion) === nP &&
      normalizeID(x.IDJuez) === nJ &&
      normalizeID(x.IDEvento) === nE,
  );
  return asegurarCamposResultadoRaza(resultado);
}

function tienePrimerPuestoRaza(perro, juezId, eventoId) {
  const resultado = getResultadoRaza(perro.IDInscripcion, juezId, eventoId);
  return (
    resultado &&
    normalizeID(resultado.IDInscripcion) === normalizeID(perro.IDInscripcion) &&
    normalizeID(resultado.IDJuez) === normalizeID(juezId) &&
    normalizeID(resultado.IDEvento) === normalizeID(eventoId) &&
    esPrimerPuestoResultado(resultado) &&
    resultadoTieneCalificacionFinalValida(resultado, perro) &&
    !isTruthy(resultado.Ausente)
  );
}

function perrosCandidatosRol(rol, perros, sexos, juezId, eventoId) {
  return perros.filter((p) => {
    if (!tienePrimerPuestoRaza(p, juezId, eventoId)) return false;
    const sx = sexoKind(p, sexos);
    if (
      [
        "MEJOR_CACHORRO_ESPECIAL_RAZA",
        "SEXO_OPUESTO_CACHORRO_ESPECIAL",
      ].includes(rol)
    )
      return LOCAL_CAT_IDS.CACHORROS_ESPECIALES.includes(String(p.IDCategoria));
    if (["MEJOR_CACHORRO_RAZA", "SEXO_OPUESTO_CACHORRO"].includes(rol))
      return LOCAL_CAT_IDS.CACHORROS.includes(String(p.IDCategoria));
    if (rol === "MEJOR_JOVEN_MACHO")
      return (
        LOCAL_CAT_IDS.JOVENES.includes(String(p.IDCategoria)) && sx === "M"
      );
    if (rol === "MEJOR_JOVEN_HEMBRA")
      return (
        LOCAL_CAT_IDS.JOVENES.includes(String(p.IDCategoria)) && sx === "H"
      );
    if (["MEJOR_JOVEN_RAZA", "SEXO_OPUESTO_JOVEN"].includes(rol)) {
      return (
        perroTieneRol(p, juezId, eventoId, "MEJOR_JOVEN_MACHO") ||
        perroTieneRol(p, juezId, eventoId, "MEJOR_JOVEN_HEMBRA")
      );
    }
    if (rol === "MEJOR_MACHO")
      return (
        LOCAL_CAT_IDS.ADULTOS.includes(String(p.IDCategoria)) && sx === "M"
      );
    if (rol === "MEJOR_HEMBRA")
      return (
        LOCAL_CAT_IDS.ADULTOS.includes(String(p.IDCategoria)) && sx === "H"
      );
    if (rol === "MEJOR_DE_RAZA") {
      return [
        "MEJOR_JOVEN_MACHO",
        "MEJOR_JOVEN_HEMBRA",
        "MEJOR_MACHO",
        "MEJOR_HEMBRA",
        "MEJOR_VETERANO_RAZA",
      ].some((r) => perroTieneRol(p, juezId, eventoId, r));
    }
    if (rol === "SEXO_OPUESTO_RAZA") {
      return [
        "MEJOR_JOVEN_MACHO",
        "MEJOR_JOVEN_HEMBRA",
        "MEJOR_MACHO",
        "MEJOR_HEMBRA",
        "MEJOR_VETERANO_RAZA",
        "SEXO_OPUESTO_VETERANO",
      ].some((r) => perroTieneRol(p, juezId, eventoId, r));
    }
    if (["MEJOR_VETERANO_RAZA", "SEXO_OPUESTO_VETERANO"].includes(rol))
      return LOCAL_CAT_IDS.VETERANOS.includes(String(p.IDCategoria));
    return true;
  });
}

function esPrimerPuestoResultado(resultado) {
  return String(resultado?.Puesto || "").replace(/\D/g, "") === "1";
}

function esCategoriaCachorroPlanilla(perro) {
  return categoriaEsCachorroLocal(perro?.IDCategoria);
}

function esCalificacionExcelente(resultado) {
  return (
    String(resultado?.Calificacion || "")
      .trim()
      .toUpperCase() === "EXC"
  );
}

function resultadoTieneCalificacionFinalValida(resultado, perro) {
  if (esCategoriaCachorroPlanilla(perro)) return true;
  return esCalificacionExcelente(resultado);
}

function resultadoPuedeConservarDerivados(resultado, perro) {
  return (
    !!resultado &&
    !!perro &&
    !isTruthy(resultado.Ausente) &&
    esPrimerPuestoResultado(resultado) &&
    resultadoTieneCalificacionFinalValida(resultado, perro)
  );
}

function limpiarDerivadosResultadoRaza(resultado) {
  if (!resultado) return false;
  const teniaDerivados =
    !!String(resultado.RolesFinalRaza || "").trim() ||
    !!String(resultado.Titulo_Ganado || "").trim();
  resultado.RolesFinalRaza = "";
  resultado.Titulo_Ganado = "";
  return teniaDerivados;
}

function actualizarTituloGanadoResultadoRaza(resultado) {
  if (!resultado) return false;

  const anterior = String(resultado.Titulo_Ganado || "");
  const roles = splitMulti(resultado.RolesFinalRaza);
  const titulo =
    roles.map((rol) => TITULO_GANADO_POR_ROL_FINAL_RAZA[rol]).find(Boolean) ||
    "";

  resultado.Titulo_Ganado = titulo;
  return anterior !== titulo;
}

function rolValidoParaResultado(
  rol,
  resultado,
  perro,
  rolesActuales,
  sexos = [],
) {
  const cat = String(perro?.IDCategoria || "");
  const sx = sexoKind(perro, sexos);
  if (
    ["MEJOR_CACHORRO_ESPECIAL_RAZA", "SEXO_OPUESTO_CACHORRO_ESPECIAL"].includes(
      rol,
    )
  )
    return LOCAL_CAT_IDS.CACHORROS_ESPECIALES.includes(cat);
  if (["MEJOR_CACHORRO_RAZA", "SEXO_OPUESTO_CACHORRO"].includes(rol))
    return LOCAL_CAT_IDS.CACHORROS.includes(cat);
  if (rol === "MEJOR_JOVEN_MACHO")
    return LOCAL_CAT_IDS.JOVENES.includes(cat) && sx === "M";
  if (rol === "MEJOR_JOVEN_HEMBRA")
    return LOCAL_CAT_IDS.JOVENES.includes(cat) && sx === "H";
  if (["MEJOR_JOVEN_RAZA", "SEXO_OPUESTO_JOVEN"].includes(rol)) {
    return (
      rolesActuales.includes("MEJOR_JOVEN_MACHO") ||
      rolesActuales.includes("MEJOR_JOVEN_HEMBRA")
    );
  }
  if (rol === "MEJOR_MACHO")
    return LOCAL_CAT_IDS.ADULTOS.includes(cat) && sx === "M";
  if (rol === "MEJOR_HEMBRA")
    return LOCAL_CAT_IDS.ADULTOS.includes(cat) && sx === "H";
  if (rol === "MEJOR_DE_RAZA") {
    return [
      "MEJOR_JOVEN_MACHO",
      "MEJOR_JOVEN_HEMBRA",
      "MEJOR_MACHO",
      "MEJOR_HEMBRA",
      "MEJOR_VETERANO_RAZA",
    ].some((r) => rolesActuales.includes(r));
  }
  if (rol === "SEXO_OPUESTO_RAZA") {
    return [
      "MEJOR_JOVEN_MACHO",
      "MEJOR_JOVEN_HEMBRA",
      "MEJOR_MACHO",
      "MEJOR_HEMBRA",
      "MEJOR_VETERANO_RAZA",
      "SEXO_OPUESTO_VETERANO",
    ].some((r) => rolesActuales.includes(r));
  }
  if (["MEJOR_VETERANO_RAZA", "SEXO_OPUESTO_VETERANO"].includes(rol))
    return LOCAL_CAT_IDS.VETERANOS.includes(cat);
  return true;
}

function limpiarDerivadosInvalidosParaPerro(resultado, contexto = {}) {
  const perro = contexto.perro;
  const sexos = contexto.sexos || [];
  if (!resultado || !perro) return false;

  const antes = String(resultado.RolesFinalRaza || "");

  if (!resultadoPuedeConservarDerivados(resultado, perro)) {
    return limpiarDerivadosResultadoRaza(resultado);
  }

  let roles = splitMulti(resultado.RolesFinalRaza);

  let cambioRoles = true;
  while (cambioRoles) {
    const previo = roles.join("|");
    roles = roles.filter((r) =>
      rolValidoParaResultado(r, resultado, perro, roles, sexos),
    );
    cambioRoles = previo !== roles.join("|");
  }

  resultado.RolesFinalRaza = roles.join(", ");
  actualizarTituloGanadoResultadoRaza(resultado);

  const despues = String(resultado.RolesFinalRaza || "");

  return antes !== despues;
}

function getFilaOficialPlanilla(perro, sexos = []) {
  if (!perro) return null;
  const sx = sexoKind(perro, sexos);
  return (
    PLANILLA_FILAS_RAZA.find(
      (fila) =>
        fila.cats.includes(String(perro.IDCategoria)) && fila.sexo === sx,
    ) || null
  );
}

function mismaFilaOficialPlanilla(a, b, sexos = []) {
  const fa = getFilaOficialPlanilla(a, sexos);
  const fb = getFilaOficialPlanilla(b, sexos);
  return !!fa && !!fb && String(fa.nro) === String(fb.nro);
}

function rehidratarFinalesDesdeResultados(
  resultados,
  perrosRaza,
  juezId,
  idEventoActivo,
) {
  const perrosPorId = new Map(
    (perrosRaza || []).map((p) => [normalizeID(p.IDInscripcion), p]),
  );

  const porRol = new Map();

  (resultados || []).forEach((resultado) => {
    if (
      normalizeID(resultado.IDEvento) !== normalizeID(idEventoActivo) ||
      normalizeID(resultado.IDJuez) !== normalizeID(juezId)
    ) {
      return;
    }

    if (
      String(resultado.Calificacion || "")
        .trim()
        .toUpperCase() === "AUS" ||
      isTruthy(resultado.Ausente)
    ) {
      return;
    }

    const perro = perrosPorId.get(normalizeID(resultado.IDInscripcion));
    if (!perro) return;

    const roles = splitMulti(resultado.RolesFinalRaza);

    const rolPorTitulo =
      ROL_FINAL_RAZA_POR_TITULO_GANADO[String(resultado.Titulo_Ganado || "")] ||
      "";

    const rolesFinales = Array.from(
      new Set([...(roles || []), ...(rolPorTitulo ? [rolPorTitulo] : [])]),
    ).filter(Boolean);

    rolesFinales.forEach((rol) => {
      if (!porRol.has(rol)) porRol.set(rol, []);
      const arr = porRol.get(rol);
      if (
        !arr.some(
          (p) =>
            normalizeID(p.IDInscripcion) === normalizeID(perro.IDInscripcion),
        )
      ) {
        arr.push(perro);
      }
    });
  });

  return porRol;
}

function renderBloquesFinalesRaza(
  bloques,
  perrosRaza,
  sexos,
  juezId,
  idEventoActivo,
  extraClass = "",
  resultadosRaza = [],
) {
  const finalesRehidratadas = rehidratarFinalesDesdeResultados(
    resultadosRaza,
    perrosRaza,
    juezId,
    idEventoActivo,
  );

  return bloques
    .map(
      (bloque) => `
    <section class="finales-raza-bloque ${extraClass} ${bloque.clase}">
      <div class="finales-raza-bloque-title">${bloque.titulo}</div>
      ${bloque.roles
        .map((rol) => {
          const candidatosCalculados = perrosCandidatosRol(
            rol,
            perrosRaza,
            sexos,
            juezId,
            idEventoActivo,
          );
          const candidatosRehidratados = finalesRehidratadas.get(rol) || [];
          const candidatos = Array.from(
            new Map(
              [...candidatosCalculados, ...candidatosRehidratados].map((p) => [
                normalizeID(p.IDInscripcion),
                p,
              ]),
            ).values(),
          );
          return `
          <div class="final-rol">
            <div class="final-title">${ROLE_LABELS_RAZA[rol] || rol}</div>
            <div class="final-candidatos">
              ${
                candidatos.length
                  ? candidatos
                      .map((p) => {
                        const r = getResultadoRaza(
                          p.IDInscripcion,
                          juezId,
                          idEventoActivo,
                        );
                        const activo =
                          splitMulti(r?.RolesFinalRaza).includes(rol) ||
                          ROL_FINAL_RAZA_POR_TITULO_GANADO[r?.Titulo_Ganado] ===
                            rol;
                        const aus = isTruthy(r?.Ausente);
                        return `<button type="button" class="btn-xs final-btn ${activo ? "active multi" : ""}" ${aus ? "disabled" : ""}
                          onclick="window.guardarResultado(event, '${escapeAttr(p.IDInscripcion)}','${escapeAttr(juezId)}','${escapeAttr(idEventoActivo)}','${rol}','RolesFinalRaza', true)">#${p.NumeroCatalogo}</button>`;
                      })
                      .join("")
                  : '<span class="planilla-empty">Sin candidatos</span>'
              }
            </div>
          </div>
        `;
        })
        .join("")}
    </section>
  `,
    )
    .join("");
}

function getPrimerosPorCategoriaSexo(
  perrosRaza,
  sexos,
  juezId,
  eventoId,
  categorias,
  sexo = null,
) {
  return perrosRaza.filter((p) => {
    if (!categorias.includes(String(p.IDCategoria))) return false;
    if (sexo && sexoKind(p, sexos) !== sexo) return false;
    return tienePrimerPuestoRaza(p, juezId, eventoId);
  });
}

function perroTieneRol(perro, juezId, eventoId, rol) {
  const r = getResultadoRaza(perro.IDInscripcion, juezId, eventoId);
  return splitMulti(r?.RolesFinalRaza).includes(rol);
}

function renderBotonesCandidatosRol(rol, candidatos, juezId, eventoId) {
  return candidatos.length
    ? candidatos
        .map((p) => {
          const activo = perroTieneRol(p, juezId, eventoId, rol);
          return `
      <button type="button"
              class="btn-xs final-btn ${activo ? "active multi" : ""}"
              onclick="window.guardarResultado(event, '${escapeAttr(p.IDInscripcion)}','${escapeAttr(juezId)}','${escapeAttr(eventoId)}','${rol}','RolesFinalRaza', true)">
        #${p.NumeroCatalogo}
      </button>
    `;
        })
        .join("")
    : '<span class="planilla-empty">Sin candidatos</span>';
}

function renderPlanillaFinalesHTML(
  perrosRaza,
  sexos,
  juezId,
  idEventoActivo,
  esLimitada,
  resultadosRaza = [],
) {
  return `
    <h3>Finales simples</h3>
    <div class="finales-simples-grid">
      ${renderBloquesFinalesRaza(FINAL_RAZA_BLOQUES_SIMPLES, perrosRaza, sexos, juezId, idEventoActivo, "finales-raza-bloque-simple", resultadosRaza)}
    </div>
    <h3>Finales internas de raza</h3>
    ${renderBloquesFinalesRaza(FINAL_RAZA_BLOQUES_RESTANTES, perrosRaza, sexos, juezId, idEventoActivo, "", resultadosRaza)}
  `;
}

function getPlanillaFinalesContextoActual() {
  const aside = document.querySelector("#viewPistas .planilla-finales");
  const idEventoActivo = $("pistaEventoSelect")?.value;
  const juezId = window._juezSeleccionadoPista?.idJuez || "";
  const grupoActivo = window._planillaGrupo || "";
  const razaActiva = window._planillaRaza || "";

  if (!aside || !idEventoActivo || !juezId || !grupoActivo || !razaActiva)
    return null;

  const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  const razas = CACHE.get("Catalogo_Razas") || [];
  const sexos = CACHE.get("Catalogo_Sexos") || [];
  const jueces = CACHE.get("Jueces") || [];
  const resultadosRaza = CACHE.get("Resultados_Razas") || [];

  const juezActual = jueces.find(
    (j) => normalizeID(j.IDJuez) === normalizeID(juezId),
  );
  const esLimitada =
    String(juezActual?.TipoJuez || "GENERAL").toUpperCase() === "LIMITADA";

  const perrosRaza = insc
    .filter(
      (p) =>
        normalizeID(p.IDEvento) === normalizeID(idEventoActivo) &&
        normalizeGrupo(p.IDGrupo) === normalizeGrupo(grupoActivo) &&
        String(p.IDRaza) === String(razaActiva) &&
        !categoriaEsCampeonLocal(p.IDCategoria),
    )
    .map((p) => {
      const razaObj = razas.find((r) => String(r.IDRaza) === String(p.IDRaza));
      const sexoObj = sexos.find((s) => String(s.IDSexo) === String(p.IDSexo));
      return {
        ...p,
        razaNombre: razaObj?.NombreRaza || p.IDRaza,
        catNombre: nombreCategoriaLocal(p.IDCategoria),
        sexoNombre: sexoObj?.NombreSexo || p.IDSexo,
      };
    })
    .sort((a, b) =>
      String(a.NumeroCatalogo || "").localeCompare(
        String(b.NumeroCatalogo || ""),
        undefined,
        { numeric: true },
      ),
    );

  return {
    aside,
    perrosRaza,
    sexos,
    juezId,
    idEventoActivo,
    esLimitada,
    resultadosRaza,
  };
}

let planillaDerechaRefreshTimer = null;
function refreshPlanillaDerechaDebounced(
  delay = 90,
  state = capturePlanillaScrollState(),
) {
  clearTimeout(planillaDerechaRefreshTimer);
  planillaDerechaRefreshTimer = setTimeout(() => {
    const ctx = getPlanillaFinalesContextoActual();
    if (!ctx) return;
    ctx.aside.innerHTML = renderPlanillaFinalesHTML(
      ctx.perrosRaza,
      ctx.sexos,
      ctx.juezId,
      ctx.idEventoActivo,
      ctx.esLimitada,
      ctx.resultadosRaza,
    );
    restorePlanillaScrollState(state);
  }, delay);
}

function updatePlanillaPerroVisual(btn, campo, rec) {
  if (!btn) return;

  const perroCard = btn.closest(".planilla-perro");
  const parent = btn.parentElement;

  if (campo === "Ausente") {
    const isAus = isTruthy(rec?.Ausente);

    // 🔥 FORZAR que en BIS quede escrito AUS en la Sheet
    if (isAus) {
      rec.PuestoBIS = "AUS";
    } else {
      if (rec.PuestoBIS === "AUS") {
        rec.PuestoBIS = "";
      }
    }

    btn.classList.toggle("active", isAus);

    if (perroCard) {
      perroCard.classList.toggle("is-ausente", isAus);

      perroCard
        .querySelectorAll(
          ".linea-puestos .btn-xs:not(.btn-aus), .linea-calificaciones .btn-xs",
        )
        .forEach((b) => {
          b.disabled = isAus;
          if (isAus) b.classList.remove("active");
        });

      const idMini = perroCard.querySelector(".perro-id-mini");
      const label = idMini?.querySelector(".aus-mini-label");

      if (isAus && idMini && !label) {
        idMini.insertAdjacentHTML(
          "beforeend",
          '<b class="aus-mini-label">AUS</b>',
        );
      } else if (!isAus && label) {
        label.remove();
      }
    }

    return;
  }

  if (!parent || campo === "RolesFinalRaza") return;

  parent
    .querySelectorAll(".btn-xs")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

async function renderJuzgamiento(pistaNro = null) {
  const idEventoActivo = $("pistaEventoSelect")?.value;
  const panel = $("panelJuzgamiento");
  if (!panel || !idEventoActivo) {
    if (panel)
      panel.innerHTML = `<p class="hint-text">Seleccione un evento para comenzar.</p>`;
    return;
  }

  const asign = CACHE.get("Gestion_pistas") || [];
  const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  const razas = CACHE.get("Catalogo_Razas") || [];
  const sexos = CACHE.get("Catalogo_Sexos") || [];
  const eventos = CACHE.get("Eventos") || [];
  const jueces = CACHE.get("Jueces") || [];
  const resultadosRaza = CACHE.get("Resultados_Razas") || [];

  let juezId = window._juezSeleccionadoPista?.idJuez || "";
  let pistaActual = pistaNro || window._juezSeleccionadoPista?.pista || "";
  if (!juezId && pistaActual) {
    const a = asign.find(
      (x) =>
        String(x.IDEvento) === String(idEventoActivo) &&
        String(x.IDPista) === String(pistaActual),
    );
    juezId = a?.IDJuez || "";
  }
  if (!juezId) {
    panel.innerHTML = `<p class="hint-text">Seleccione juez / pista para cargar la planilla oficial.</p>`;
    return;
  }

  const juezActual = jueces.find((j) => String(j.IDJuez) === String(juezId));
  const juezNombre = juezActual?.NombreJuez || juezId;
  const esLimitada =
    String(juezActual?.TipoJuez || "GENERAL").toUpperCase() === "LIMITADA";
  pistaActual = pistaActual || juezActual?.IDPista || "";

  const gruposAsignados = asign
    .filter(
      (a) =>
        normalizeID(a.IDEvento) === normalizeID(idEventoActivo) &&
        normalizeID(a.IDJuez) === normalizeID(juezId),
    )
    .map((a) => normalizeGrupo(a.IDGrupo))
    .filter(Boolean);
  const gruposEvento = insc
    .filter(
      (p) =>
        normalizeID(p.IDEvento) === normalizeID(idEventoActivo) &&
        !categoriaEsCampeonLocal(p.IDCategoria),
    )
    .map((p) => normalizeGrupo(p.IDGrupo))
    .filter(Boolean);
  const gruposDisponibles = ordenarGruposNatural([
    ...new Set([...(gruposAsignados.length ? gruposAsignados : gruposEvento)]),
  ]);

  const contexto = `${idEventoActivo}_${juezId}_${pistaActual}`;
  if (window._planillaRazaContexto !== contexto) {
    window._planillaRazaContexto = contexto;
    window._planillaGrupo = gruposDisponibles[0] || "";
    window._planillaRaza = "";
  }

  if (!gruposDisponibles.includes(window._planillaGrupo)) {
    window._planillaGrupo = gruposDisponibles[0] || "";
    window._planillaRaza = "";
  }
  const grupoActivo = window._planillaGrupo || "";

  const perrosGrupo = insc
    .filter(
      (p) =>
        normalizeID(p.IDEvento) === normalizeID(idEventoActivo) &&
        normalizeGrupo(p.IDGrupo) === normalizeGrupo(grupoActivo) &&
        !categoriaEsCampeonLocal(p.IDCategoria),
    )
    .map((p) => {
      const razaObj = razas.find((r) => String(r.IDRaza) === String(p.IDRaza));
      const sexoObj = sexos.find((s) => String(s.IDSexo) === String(p.IDSexo));
      return {
        ...p,
        razaNombre: razaObj?.NombreRaza || p.IDRaza,
        catNombre: nombreCategoriaLocal(p.IDCategoria),
        sexoNombre: sexoObj?.NombreSexo || p.IDSexo,
      };
    });

  const razasDisponibles = Array.from(
    new Map(
      perrosGrupo.map((p) => [
        String(p.IDRaza),
        {
          id: String(p.IDRaza),
          nombre: p.razaNombre || p.IDRaza,
        },
      ]),
    ).values(),
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  if (
    !window._planillaRaza ||
    !razasDisponibles.some((r) => String(r.id) === String(window._planillaRaza))
  ) {
    window._planillaRaza = razasDisponibles[0]?.id || "";
  }
  const razaActiva = window._planillaRaza || "";
  const perrosRaza = perrosGrupo
    .filter((p) => String(p.IDRaza) === String(razaActiva))
    .sort((a, b) =>
      String(a.NumeroCatalogo || "").localeCompare(
        String(b.NumeroCatalogo || ""),
        undefined,
        { numeric: true },
      ),
    );
  const razaNombre =
    razasDisponibles.find((r) => String(r.id) === String(razaActiva))?.nombre ||
    razaActiva ||
    "Raza";
  const eventoNombre =
    eventos.find((e) => String(e.IDEvento) === String(idEventoActivo))
      ?.NombreEvento || idEventoActivo;

  const grupoBtns = gruposDisponibles
    .map(
      (g) => `
    <button type="button" class="btn-xs planilla-filter ${grupoActivo === g ? "active" : ""}"
            onclick="window._planillaGrupo='${escapeAttr(g)}'; window._planillaRaza=''; renderJuzgamientoPreservandoScroll('${escapeAttr(pistaActual)}')">${g}</button>
  `,
    )
    .join("");
  const razaBtns = razasDisponibles
    .map(
      (r) => `
    <button type="button" class="btn-xs planilla-filter ${String(razaActiva) === String(r.id) ? "active" : ""}"
            onclick="window._planillaRaza='${escapeAttr(r.id)}'; renderJuzgamientoPreservandoScroll('${escapeAttr(pistaActual)}')">${r.nombre}</button>
  `,
    )
    .join("");

  if (perrosRaza.length === 0) {
    panel.innerHTML = `
      <div class="planilla-oficial">
        <div class="planilla-head">
          <div>
            <h2>PLANILLA OFICIAL DIGITAL</h2>
            <p>${eventoNombre} / ${juezNombre} / Pista ${pistaActual || "-"} / Grupo ${grupoActivo || "-"} / ${razaNombre || "-"}</p>
          </div>
          <div class="planilla-badge">0 perros</div>
        </div>
        <div class="planilla-filtros">
          <div><strong>4. Grupo</strong><div class="rowbuttons rowbuttons-wrap">${grupoBtns || '<span class="muted">Sin grupos asignados</span>'}</div></div>
          <div><strong>5. Raza</strong><div class="rowbuttons rowbuttons-wrap">${razaBtns || '<span class="muted">Sin razas con perros</span>'}</div></div>
        </div>
        <div class="wait-box">
          <p class="wait-title">Evento configurado. Todavia no hay perros inscriptos para cargar resultados.</p>
        </div>
      </div>
    `;
    return;
  }

  let html = `
    <div class="planilla-oficial">
      <div class="planilla-head">
        <div>
          <h2>PLANILLA OFICIAL DIGITAL</h2>
          <p>${eventoNombre} / ${juezNombre} / Pista ${pistaActual || "-"} / Grupo ${grupoActivo || "-"} / ${razaNombre}</p>
        </div>
        <div class="planilla-badge">${perrosRaza.length} perros</div>
      </div>
      <div class="planilla-filtros">
        <div><strong>4. Grupo</strong><div class="rowbuttons rowbuttons-wrap">${grupoBtns || '<span class="muted">Sin grupos</span>'}</div></div>
        <div><strong>5. Raza</strong><div class="rowbuttons rowbuttons-wrap">${razaBtns || '<span class="muted">Sin razas</span>'}</div></div>
      </div>
      <div class="planilla-workgrid">
        <div class="planilla-tabla-wrap">
          <table class="planilla-tabla">
            <thead><tr><th class="col-cat">Categoria oficial</th><th>Perros</th></tr></thead>
            <tbody>
  `;

  PLANILLA_FILAS_RAZA.forEach((fila) => {
    const perrosFila = perrosRaza.filter((p) => {
      return (
        fila.cats.includes(String(p.IDCategoria)) &&
        sexoKind(p, sexos) === fila.sexo
      );
    });
    html += `
      <tr class="planilla-bloque-row ${fila.bloque || ""} ${fila.separador || ""} ${perrosFila.length ? "" : "fila-vacia"}">
        <td class="planilla-cat"><span>${fila.nro}</span>${fila.nombre}</td>
        <td>${perrosFila.length ? perrosFila.map((p) => renderPerroPlanilla(p, juezId, idEventoActivo)).join("") : '<div class="planilla-empty">Sin perros</div>'}</td>
      </tr>
    `;
  });

  html += `
            </tbody>
          </table>
        </div>
        <aside class="planilla-finales">
          ${renderPlanillaFinalesHTML(perrosRaza, sexos, juezId, idEventoActivo, esLimitada, resultadosRaza)}
        </aside>
      </div>
    </div>
  `;

  panel.innerHTML = html;
}

function renderPerroPlanilla(p, juezId, idEventoActivo) {
  const r = getResultadoRaza(p.IDInscripcion, juezId, idEventoActivo);
  const isAus = isTruthy(r?.Ausente);
  const esCachorro = categoriaEsCachorroLocal(p.IDCategoria);
  const califBtns = esCachorro ? ["MP", "P"] : ["Exc", "MB", "B", "D"];

  return `
    <div class="planilla-perro planilla-perro-horizontal ${isAus ? "is-ausente" : ""}">
      
      <div class="perro-id-mini">
        <span class="dog-num">#${p.NumeroCatalogo}</span>
        ${isAus ? '<b class="aus-mini-label">AUS</b>' : ""}
      </div>

      <div class="perro-carga-rapida">

        <div class="linea-botones linea-puestos">
          <button type="button" class="btn-xs btn-aus ${isAus ? "active" : ""}"
                  onclick="window.guardarResultado(event, '${escapeAttr(p.IDInscripcion)}','${escapeAttr(juezId)}','${escapeAttr(idEventoActivo)}','${!isAus}','Ausente')">
            AUS
          </button>

          ${["1", "2", "3", "4", "5", "6", "7"]
            .map(
              (pst) => `
            <button type="button" class="btn-xs ${String(r?.Puesto) === pst ? "active" : ""}" ${isAus ? "disabled" : ""}
                    onclick="window.guardarResultado(event, '${escapeAttr(p.IDInscripcion)}','${escapeAttr(juezId)}','${escapeAttr(idEventoActivo)}','${pst}','Puesto')">
              ${pst}°
            </button>
          `,
            )
            .join("")}
        </div>

        <div class="linea-botones linea-calificaciones">
          ${califBtns
            .map(
              (c) => `
            <button type="button" class="btn-xs calif-btn ${r?.Calificacion === c ? "active" : ""}" ${isAus ? "disabled" : ""}
                    onclick="window.guardarResultado(event, '${escapeAttr(p.IDInscripcion)}','${escapeAttr(juezId)}','${escapeAttr(idEventoActivo)}','${c}','Calificacion')">
              ${c}
            </button>
          `,
            )
            .join("")}
        </div>

      </div>
    </div>
  `;
}

window.renderJuzgamiento = renderJuzgamiento;

// --- 7. AYUDANTES DE UI (NO TOCAR) ---
// --- 7. AYUDANTES DE UI ---
function setupBtnGroup(name, multi, callback) {
  const g = document.querySelector(`.btn-group[data-name="${name}"]`),
    h = document.querySelector(`input[name="${name}"]`);

  if (!g || !h) return;

  g.onclick = (e) => {
    const b = e.target.closest(".btn-opt");
    if (!b) return;

    // LÓGICA MULTISELECCIÓN
    if (multi) {
      b.classList.toggle("active");
      b.classList.toggle("multi");

      h.value = Array.from(g.querySelectorAll(".btn-opt.active"))
        .map((x) => x.dataset.value)
        .join(", ");
    }
    // LÓGICA SELECCIÓN ÚNICA
    else {
      g.querySelectorAll(".btn-opt").forEach((x) =>
        x.classList.remove("active", "multi"),
      );
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
    ? (value || "").split(",").map((v) => v.trim())
    : [String(value).trim()];

  g.querySelectorAll(".btn-opt").forEach((b) => {
    const estaSeleccionado = vals.includes(String(b.dataset.value).trim());

    b.classList.toggle("active", estaSeleccionado);
    if (multi) {
      b.classList.toggle("multi", estaSeleccionado);
    }
  });
}

function setupCategoriaLocalButtons() {
  const g = document.querySelector('.btn-group[data-name="IDCategoria"]');
  const catInput = document.querySelector('input[name="IDCategoria"]');
  const sexoInput = document.querySelector('input[name="IDSexo"]');
  if (!g || !catInput || !sexoInput) return;

  g.onclick = (e) => {
    const b = e.target.closest(".local-cat-base-btn, .local-sex-btn");
    if (!b) return;

    if (b.classList.contains("local-cat-base-btn")) {
      g.querySelectorAll(".local-cat-base-btn").forEach((x) =>
        x.classList.remove("active", "multi"),
      );
    } else {
      g.querySelectorAll(".local-sex-btn").forEach((x) =>
        x.classList.remove("active", "multi"),
      );
    }
    b.classList.add("active");

    const categoriaBase =
      g.querySelector(".local-cat-base-btn.active")?.dataset.catBase || "";
    const sexo = g.querySelector(".local-sex-btn.active")?.dataset.sexo || "";
    const idCategoria = derivarIDCategoria(categoriaBase, sexo);

    catInput.value = idCategoria;
    sexoInput.value = sexoIdDesdeOpcion(sexo);
  };
}

function refreshCategoriaLocalVisuals(idCategoria, sexoGuardado = "") {
  const g = document.querySelector('.btn-group[data-name="IDCategoria"]');
  if (!g) return;

  const info = categoriaBaseSexoDesdeID(idCategoria);
  const categoriaBase = info.categoriaBase;
  const sexo =
    String(idCategoria) === "C07" ? sexoOpcionDesdeId(sexoGuardado) : info.sexo;
  g.querySelectorAll(".local-cat-base-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.catBase === categoriaBase);
    b.classList.remove("multi");
  });
  g.querySelectorAll(".local-sex-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.sexo === sexo);
    b.classList.remove("multi");
  });
}

window.toggleGruposHabilitados = (tipo) => {
  const campo = document.getElementById("campoGruposHabilitados");
  if (campo) {
    campo.style.display =
      String(tipo || "").toUpperCase() === "LIMITADA" ? "block" : "none";
  }
};

// ESTA FUNCIÓN ES LA QUE FALTA EN TU CÓDIGO Y ARREGLA EL ERROR
function buildForm(d, f, r) {
  $(d).innerHTML = f
    .map((x) => {
      const isID = x.startsWith("ID") && x !== "IDPista";
      let val = r ? r[x] || "" : "";

      // A. Lógica para el Selector de Países
      if (x === "Nacionalidad") {
        const opciones = Object.entries(PAISES_MAP)
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(
            ([code, nombre]) =>
              `<option value="${code}" ${val === code ? "selected" : ""}>${nombre}</option>`,
          )
          .join("");
        return `<div class="field"><label>Nacionalidad</label><select name="Nacionalidad"><option value="">Seleccione</option>${opciones}</select></div>`;
      }

      // Lógica para Tipo de Juez
      if (x === "TipoJuez") {
        const esLimitada = String(val).toUpperCase() === "LIMITADA";
        return `<div class="field"><label>Tipo de Juez</label><select name="TipoJuez" onchange="window.toggleGruposHabilitados(this.value)"><option value="GENERAL" ${!esLimitada ? "selected" : ""}>GENERAL</option><option value="LIMITADA" ${esLimitada ? "selected" : ""}>LIMITADA</option></select></div>`;
      }

      // Lógica para Grupos Habilitados
      if (x === "GruposHabilitados") {
        const grupos = [
          "G1",
          "G2",
          "G3",
          "G4",
          "G5",
          "G6",
          "G7",
          "G8",
          "G9",
          "G10",
        ];
        const seleccionados = (val || "").split(",").map((s) => s.trim());
        const botones = grupos
          .map((g) => {
            const isActive = seleccionados.includes(g) ? "active multi" : "";
            return `<button type="button" class="btn-opt ${isActive}" data-value="${g}">${g}</button>`;
          })
          .join("");

        return `
        <div class="field" id="campoGruposHabilitados" style="display: none;">
          <label>Grupos Habilitados</label>
          <div class="btn-group" data-name="GruposHabilitados">
            ${botones}
          </div>
          <input type="hidden" name="GruposHabilitados" value="${val}">
        </div>
      `;
      }

      // B. Lógica para el Calendario (Fecha)
      if (x === "Fecha") {
        let valFecha = "";
        if (val.includes("/")) {
          const [dia, mes, anio] = val.split("/");
          valFecha = `${anio}-${mes}-${dia}`; // Convierte DD/MM/YYYY a YYYY-MM-DD para el input date
        } else {
          valFecha = val;
        }
        return `<div class="field"><label>Fecha</label><input type="date" id="eventFecha" name="Fecha" value="${valFecha}"></div>`;
      }

      // IDs especiales para que saveEvento los encuentre
      let extraID = "";
      if (x === "NombreEvento") extraID = 'id="eventName"';
      if (x === "Lugar") extraID = 'id="eventLugar"';

      return `<div class="field"><label>${isID ? "" : x}</label><input type="${isID ? "hidden" : "text"}" ${extraID} name="${x}" value="${val}"></div>`;
    })
    .join("");
}

function switchView(i) {
  [
    "viewCatalogos",
    "viewEventos",
    "viewJueces",
    "viewInscripciones",
    "viewPistas",
    "viewBis",
  ].forEach((v, x) => {
    if ($(v)) $(v).classList.toggle("hidden", x !== i);
  });
}

function replaceTempIdEverywhere(tempId, realId) {
  // 1) Perros inscriptos
  const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  insc.forEach((r) => {
    if (String(r.IDInscripcion) === String(tempId)) r.IDInscripcion = realId;
  });
  CACHE.set("Catalogo_Perros_Inscriptos", insc);

  // 2) Resultados Razas
  const rr = CACHE.get("Resultados_Razas") || [];
  rr.forEach((r) => {
    if (String(r.IDInscripcion) === String(tempId)) r.IDInscripcion = realId;
  });
  CACHE.set("Resultados_Razas", rr);

  // 3) Resultados BIS
  const rb = CACHE.get("Resultados_BIS") || [];
  rb.forEach((r) => {
    if (String(r.IDInscripcion) === String(tempId)) r.IDInscripcion = realId;
  });
  CACHE.set("Resultados_BIS", rb);
}

// --- 8. ACCIONES DE GUARDADO ---
// --- 8. ACCIONES DE GUARDADO ---

// --- 8. ACCIONES DE GUARDADO (CORREGIDO) ---

// --- BLOQUE 1: GUARDADO OPTIMIZADO (SIN SYNCALL) ---

async function eliminarInscripcion() {
  const id = $("inscripcionForm").elements["IDInscripcion"].value;
  if (!id || !confirm("¿Borrar definitivamente este registro?")) return;

  try {
    setStatus("Eliminando...");
    // 1. Borrado local inmediato
    let insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
    insc = insc.filter((i) => String(i.IDInscripcion) !== String(id));
    CACHE.set("Catalogo_Perros_Inscriptos", insc);

    // 2. Refrescar UI al toque
    limpiarInscripcion();
    loadInscripciones();

    // 3. Borrado asíncrono en servidor
    await api(
      "POST",
      {},
      { action: "delete", table: "Catalogo_Perros_Inscriptos", id: id },
    );
    setStatus("Eliminado con éxito.");
  } catch (e) {
    setStatus("Error al eliminar: " + e.message, true);
    await syncAll(); // Solo resincroniza si falló
  }
}

function sugerirNroCatalogo(rows) {
  let maxN = 0;
  (rows || []).forEach((r) => {
    const n =
      parseInt(String(r.NumeroCatalogo || "").replace(/\D/g, ""), 10) || 0;
    if (n > maxN) maxN = n;
  });
  return maxN + 1;
}

async function guardarInscripcion() {
  const f = $("inscripcionForm");
  if (!f) return;

  const row = {};
  new FormData(f).forEach((value, key) => {
    row[key] = String(value ?? "").trim();
  });
  row.IDCategoria = normalizarIDCategoria(row.IDCategoria, row.IDSexo);

  const cat = categoriaLocal(row.IDCategoria);
  if (!cat) {
    alert("Seleccione una categoria local valida.");
    return;
  }

  row.IDCategoria = cat.id;
  if (row.IDCategoria === "C07") {
    row.IDSexo = sexoIdDesdeOpcion(row.IDSexo);
    if (!row.IDSexo) {
      alert("Seleccione sexo para Campeón.");
      return;
    }
  } else {
    delete row.IDSexo;
  }
  row.IDEvento = row.IDEvento || getActiveEventInscripcion();

  if (!row.IDEvento) {
    alert("Seleccione un evento.");
    return;
  }
  if (!row.NumeroCatalogo) {
    alert("Ingrese numero de catalogo.");
    return;
  }
  if (!row.IDGrupo) {
    alert("Seleccione grupo.");
    return;
  }
  if (!row.IDRaza) {
    alert("Seleccione raza.");
    return;
  }

  const isEdit = !!row.IDInscripcion;
  const localId = isEdit ? row.IDInscripcion : `LOCAL_${Date.now()}`;
  const cachedRow = { ...row, IDInscripcion: localId };

  let insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  if (isEdit) {
    insc = insc.map((i) =>
      String(i.IDInscripcion) === String(row.IDInscripcion) ? cachedRow : i,
    );
  } else {
    insc = insc.concat(cachedRow);
  }
  CACHE.set("Catalogo_Perros_Inscriptos", insc);

  await loadInscripciones();
  limpiarInscripcion();
  setStatus(isEdit ? "Inscripcion actualizada." : "Perro inscripto.");

  const apiPayload = { ...row };
  if (!isEdit) delete apiPayload.IDInscripcion;

  api(
    "POST",
    {},
    {
      action: isEdit ? "update" : "create",
      table: "Catalogo_Perros_Inscriptos",
      payload: apiPayload,
      id: isEdit ? row.IDInscripcion : null,
    },
  )
    .then((resp) => {
      if (resp?.ok && !isEdit && resp.id) {
        replaceTempIdEverywhere(localId, resp.id);
        loadInscripciones();
      }
      if (!resp?.ok) throw new Error(resp?.error || "No se pudo sincronizar.");
      setStatus("Sincronizado con Google Sheets.");
    })
    .catch(async (e) => {
      console.error("Error guardando inscripcion:", e);
      setStatus("Error de sincronizacion. Recargando datos...", true);
      await refreshInscripcionesUI({ setNextNumero: false });
    });
}

async function saveEvento() {
  const f = $("eventosForm");
  if (!f) return;

  const row = {};
  new FormData(f).forEach((value, key) => {
    row[key] = String(value ?? "").trim();
  });

  if (!row.NombreEvento) {
    setStatus("Ingrese el nombre del evento.", true);
    return;
  }

  const isEdit = !!row.IDEvento;
  const localId = isEdit ? row.IDEvento : `TEMP_EVT_${Date.now()}`;
  row.IDEvento = localId;

  let eventos = CACHE.get("Eventos") || [];
  if (isEdit) {
    eventos = eventos.map((e) =>
      String(e.IDEvento) === String(row.IDEvento) ? { ...e, ...row } : e,
    );
  } else {
    eventos.push(row);
  }

  CACHE.set("Eventos", eventos);
  loadEventos();
  $("formTitle").textContent = "Nuevo Evento";
  buildForm(
    "eventosForm",
    ["IDEvento", "NombreEvento", "Fecha", "Lugar", "Observaciones"],
    {},
  );
  setStatus("Evento guardandose...");

  const apiPayload = { ...row };
  if (!isEdit) delete apiPayload.IDEvento;

  try {
    const resp = await api(
      "POST",
      {},
      {
        action: isEdit ? "update" : "create",
        table: "Eventos",
        payload: apiPayload,
        id: isEdit ? row.IDEvento : null,
      },
    );

    if (resp.ok && !isEdit && resp.id) {
      const listaActual = CACHE.get("Eventos") || [];
      const evento = listaActual.find(
        (e) => String(e.IDEvento) === String(localId),
      );
      if (evento) {
        evento.IDEvento = resp.id;
        CACHE.set("Eventos", listaActual);
        loadEventos();
      }
    }
    setStatus("Sincronizado con Google Sheets.");
  } catch (e) {
    setStatus("Error de sincronizacion. Reintente.", true);
    console.error("Error guardando evento:", e);
    await syncAll();
    loadEventos();
  }
}

async function saveJuez() {
  const f = $("juecesForm");
  if (!f) return;

  const row = {};
  new FormData(f).forEach((value, key) => {
    row[key] = String(value ?? "").trim();
  });

  if (!row.NombreJuez) {
    setStatus("Ingrese el nombre del juez.", true);
    return;
  }

  const isEdit = !!row.IDJuez;
  const localId = isEdit ? row.IDJuez : `TEMP_JUEZ_${Date.now()}`;
  row.IDJuez = localId;

  let jueces = CACHE.get("Jueces") || [];
  if (isEdit) {
    jueces = jueces.map((j) =>
      String(j.IDJuez) === String(row.IDJuez) ? { ...j, ...row } : j,
    );
  } else {
    jueces.push(row);
  }

  CACHE.set("Jueces", jueces);
  loadJueces();
  $("formTitleJuez").textContent = "Nuevo Juez";
  buildForm(
    "juecesForm",
    [
      "IDJuez",
      "NombreJuez",
      "Nacionalidad",
      "IDPista",
      "Telefono",
      "Mail",
      "Redes",
      "Activo",
      "Observaciones",
      "FotoURL",
      "TipoJuez",
      "GruposHabilitados",
    ],
    {},
  );
  setupBtnGroup("GruposHabilitados", true);
  if (window.toggleGruposHabilitados) window.toggleGruposHabilitados("GENERAL");
  setStatus("Juez guardandose...");

  const apiPayload = { ...row };
  if (!isEdit) delete apiPayload.IDJuez;

  try {
    const resp = await api(
      "POST",
      {},
      {
        action: isEdit ? "update" : "create",
        table: "Jueces",
        payload: apiPayload,
        id: isEdit ? row.IDJuez : null,
      },
    );

    if (resp.ok && !isEdit && resp.id) {
      const listaActual = CACHE.get("Jueces") || [];
      const juez = listaActual.find(
        (j) => String(j.IDJuez) === String(localId),
      );
      if (juez) {
        juez.IDJuez = resp.id;
        CACHE.set("Jueces", listaActual);
        loadJueces();
      }
    }
    setStatus("Sincronizado con Google Sheets.");
  } catch (e) {
    setStatus("Error de sincronizacion. Reintente.", true);
    console.error("Error guardando juez:", e);
    await syncAll();
    loadJueces();
  }
}

window.saveEvento = saveEvento;
window.saveJuez = saveJuez;

window.guardarResultado = async function (
  e,
  idInscripcion,
  idJuez,
  idEvento,
  valor,
  campo,
  esMulti = false,
) {
  e?.stopPropagation?.();

  const nP = normalizeID(idInscripcion);
  const nJ = normalizeID(idJuez);
  const nE = normalizeID(idEvento);

  let resultados = CACHE.get("Resultados_Razas") || [];

  let registro = resultados.find(
    (r) =>
      normalizeID(r.IDInscripcion) === nP &&
      normalizeID(r.IDJuez) === nJ &&
      normalizeID(r.IDEvento) === nE,
  );

  if (!registro) {
    registro = {
      IDResultado: "TEMP_" + Date.now(),
      IDInscripcion: idInscripcion,
      IDJuez: idJuez,
      IDEvento: idEvento,
      Calificacion: "",
      Puesto: "",
      Titulo_Ganado: "",
      RolesFinalRaza: "",
    };
    resultados.push(registro);
  }

  if (esMulti) {
    let actuales = splitMulti(registro[campo]);
    if (actuales.includes(valor)) {
      actuales = actuales.filter((v) => v !== valor);
    } else {
      actuales.push(valor);
    }
    registro[campo] = actuales.join(", ");
  } else {
    registro[campo] = valor;
  }

  CACHE.set("Resultados_Razas", resultados);

  const payload = {
    IDResultado: registro.IDResultado,
    IDInscripcion: registro.IDInscripcion,
    IDJuez: registro.IDJuez,
    IDEvento: registro.IDEvento,
    Calificacion: registro.Calificacion,
    Puesto: registro.Puesto,
    Titulo_Ganado: registro.Titulo_Ganado,
    RolesFinalRaza: registro.RolesFinalRaza,
  };

  const isTemp = String(registro.IDResultado).startsWith("TEMP_");

  const body = {
    key: CONFIG.API_KEY,
    table: "Resultados_Razas",
    action: isTemp ? "create" : "update",
    id: registro.IDResultado,
    payload,
  };

  const resp = await fetch(CONFIG.API_URL, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (data.ok && isTemp) {
    registro.IDResultado = data.id;
    CACHE.set("Resultados_Razas", resultados);
  }

  const ctx = getPlanillaFinalesContextoActual?.();
  if (ctx) {
    ctx.aside.innerHTML = renderPlanillaFinalesHTML(
      ctx.perrosRaza,
      ctx.sexos,
      ctx.juezId,
      ctx.idEventoActivo,
      ctx.esLimitada,
      CACHE.get("Resultados_Razas") || [],
    );
  }
};

function verificarAcceso() {
  const overlay = $("loginOverlay");
  const input = $("inputApiKey");
  const error = $("loginError");
  const loginBtn = $("btnLogin");
  const sessionKey = sessionStorage.getItem("USER_API_KEY");

  const desbloquear = () => {
    if (overlay) overlay.classList.add("hidden");
    if (error) error.classList.add("hidden");
  };

  if (sessionKey || CONFIG.API_KEY) {
    desbloquear();
    return true;
  }

  if (overlay) overlay.classList.remove("hidden");

  if (loginBtn && !loginBtn.dataset.bound) {
    loginBtn.dataset.bound = "1";
    loginBtn.onclick = () => {
      const key = String(input?.value || "").trim();
      if (!key) {
        if (error) {
          error.textContent = "Ingrese la API KEY.";
          error.classList.remove("hidden");
        }
        return;
      }
      sessionStorage.setItem("USER_API_KEY", key);
      desbloquear();
      syncAll()
        .then(() => loadCatalog())
        .catch(() => {});
    };
  }

  return false;
}

document.addEventListener("DOMContentLoaded", async () => {
  const tabs = {
    navCatalogos: () => {
      switchView(0);
      loadCatalog();
    },
    navEventos: () => {
      switchView(1);
      loadEventos();
    },
    navJueces: () => {
      switchView(2);
      loadJueces();
    },
    navInscripciones: async () => {
      switchView(3);
      await prepareInscripcionForm();
      loadInscripciones();
    },
    navPistas: async () => {
      switchView(4);
      await preparePistasForm();
    },
    navBis: async () => {
      switchView(5);
      await prepareBisForm();
    },
  };

  Object.entries(tabs).forEach(([id, fn]) => {
    if ($(id)) {
      $(id).onclick = (e) => {
        document
          .querySelectorAll(".tab")
          .forEach((t) => t.classList.remove("active"));
        e.target.classList.add("active");
        fn();
      };
    }
  });

  if ($("catalogo")) {
    $("catalogo").innerHTML = [
      "Catalogo_Perros_Inscriptos",
      "Resultados_Razas",
      "Resultados_BIS",
      "Jueces",
      "Eventos",
      "Catalogo_Grupos",
      "Catalogo_Razas",
      "Catalogo_Sexos",
    ]
      .map((t) => `<option value="${t}">${t}</option>`)
      .join("");

    $("catalogo").onchange = () => loadCatalog();
  }

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
      if (isVisible("viewBis")) return prepareBisForm();

      loadCatalog();
    };
  }

  if ($("btnGuardarInscripcion"))
    $("btnGuardarInscripcion").onclick = guardarInscripcion;
  if ($("btnNuevaInscripcion"))
    $("btnNuevaInscripcion").onclick = limpiarInscripcion;
  if ($("btnEliminarInscripcion"))
    $("btnEliminarInscripcion").onclick = eliminarInscripcion;

  if ($("btnNuevo")) {
    $("btnNuevo").onclick = () => {
      $("formTitle").textContent = "Nuevo Evento";
      buildForm("eventosForm", [
        "IDEvento",
        "NombreEvento",
        "Fecha",
        "Lugar",
        "Observaciones",
      ]);
    };
  }
  if ($("btnGuardar")) $("btnGuardar").onclick = saveEvento;

  if ($("btnNuevoJuez")) {
    $("btnNuevoJuez").onclick = () => {
      $("formTitleJuez").textContent = "Nuevo Juez";
      buildForm("juecesForm", [
        "IDJuez",
        "NombreJuez",
        "Nacionalidad",
        "IDPista",
        "Telefono",
        "Mail",
        "Redes",
        "Activo",
        "Observaciones",
        "FotoURL",
        "TipoJuez",
        "GruposHabilitados",
      ]);
      setTimeout(() => {
        setupBtnGroup("GruposHabilitados", true);
        if (window.toggleGruposHabilitados)
          window.toggleGruposHabilitados("GENERAL");
      }, 10);
    };
  }
  if ($("btnGuardarJuez")) $("btnGuardarJuez").onclick = saveJuez;

  if (verificarAcceso()) {
    switchView(0);
    syncAll().then(() => loadCatalog());
  }

  if ($("splashScreen")) {
    setTimeout(() => {
      $("splashScreen").classList.add("hidden");
    }, 1500);
  }
});

// --- 6. BIS (VERSION BLINDADA CON UNICIDAD) ---
window._pistaBisActiva = null;
window._juezSeleccionadoBis = null;

const MAPA_BIS_FINALES = {
  "BIS CACHORROS ESPECIALES": ["MEJOR_CACHORRO_ESPECIAL_RAZA"],
  "BIS CACHORROS": ["MEJOR_CACHORRO_RAZA"],
  "BIS JOVENES": ["MEJOR_JOVEN_RAZA"],
  "BIS ADULTOS": ["MEJOR_DE_RAZA"],
  "BIS CAMPEONES": [],
  "BIS VETERANOS": ["MEJOR_VETERANO_RAZA"],
};

async function prepareBisForm() {
  const J = CACHE.get("Jueces") || [];
  const E = CACHE.get("Eventos") || [];
  const asign = CACHE.get("Gestion_pistas") || [];
  const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];

  window._juezSeleccionadoBis = null;

  $("formBisDinamico").innerHTML = `
    <div class="field">
      <label>Evento de la Final</label>
      <select id="bisEvento" class="select-lg">
        ${
          E.length > 0
            ? E.map(
                (e) =>
                  `<option value="${e.IDEvento}">${e.NombreEvento}</option>`,
              ).join("")
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

    if (!evId) {
      $("bisJuezBotonera").innerHTML =
        '<p class="hint-text">Seleccione un evento.</p>';
      $("bisJuez").value = "";
      window._juezSeleccionadoBis = null;
      window._pistaBisActiva = null;
      renderJuzgamientoBis();
      return;
    }

    const inscEvento = insc.filter((i) => String(i.IDEvento) === String(evId));
    const asignEvento = asign.filter(
      (a) => String(a.IDEvento) === String(evId),
    );

    if (inscEvento.length === 0) {
      $("bisJuezBotonera").innerHTML =
        '<p class="hint-text">No hay jueces porque este evento no tiene perros inscriptos.</p>';
      $("bisJuez").value = "";
      window._juezSeleccionadoBis = null;
      window._pistaBisActiva = null;
      renderJuzgamientoBis();
      return;
    }

    if (asignEvento.length === 0) {
      $("bisJuezBotonera").innerHTML =
        '<p class="hint-text">No hay jueces asignados para este evento.</p>';
      $("bisJuez").value = "";
      window._juezSeleccionadoBis = null;
      window._pistaBisActiva = null;
      renderJuzgamientoBis();
      return;
    }

    const juecesIds = [...new Set(asignEvento.map((a) => String(a.IDJuez)))];
    const juecesFiltrados = J.filter(
      (j) =>
        juecesIds.includes(String(j.IDJuez)) &&
        String(j.TipoJuez || "GENERAL").toUpperCase() !== "LIMITADA",
    );

    $("bisJuezBotonera").innerHTML = juecesFiltrados
      .map((j) => {
        const asignJuez = asignEvento.find(
          (a) =>
            String(a.IDJuez) === String(j.IDJuez) &&
            a.IDPista !== undefined &&
            a.IDPista !== null &&
            String(a.IDPista) !== "",
        );

        const pista = asignJuez ? String(asignJuez.IDPista) : "";
        const pistaTxt = pista ? `Pista ${pista}` : "Pista ?";
        const nombreEscapado = (j.NombreJuez || "").replace(/'/g, "\\'");

        return `
        <button type="button"
                class="btn-opt btn-juez-bis"
                id="btnJuezBis_${j.IDJuez}"
                onclick="window.seleccionarJuezBis('${j.IDJuez}', '${pista}', '${nombreEscapado}')">
          ${j.NombreJuez} (${pistaTxt})
        </button>`;
      })
      .join("");

    $("bisJuez").value = "";
    window._juezSeleccionadoBis = null;
    window._pistaBisActiva = null;
    renderJuzgamientoBis();
  };

  const selEv = $("bisEvento");
  if (selEv) selEv.onchange = renderJuecesBis;

  renderJuecesBis();
}

function renderJuzgamientoBis() {
  const config = window._pistaBisActiva;

  if (!config) {
    $("panelJuzgamientoBis").innerHTML =
      `<p class="hint-text">Configure y abra la pista central arriba.</p>`;
    if ($("infoPistaBisActiva")) $("infoPistaBisActiva").style.display = "none";
    return;
  }

  $("txtPistaBisActiva").textContent =
    `🏆 GRAN FINAL: ${config.eventName} | Juez: ${config.judgeName} 🏆`;
  if ($("infoPistaBisActiva")) $("infoPistaBisActiva").style.display = "block";

  const insc = CACHE.get("Catalogo_Perros_Inscriptos") || [];
  const razas = CACHE.get("Catalogo_Razas") || [];
  const grupos = CACHE.get("Catalogo_Grupos") || [];
  const resultados = CACHE.get("Resultados_Razas") || [];
  const resBis = CACHE.get("Resultados_BIS") || [];

  const nE = normalizeID(config.eventId);
  const nJ = normalizeID(config.judgeId);
  const candidatosRaza = resultados.filter(
    (r) =>
      normalizeID(r.IDEvento) === nE &&
      normalizeID(r.IDJuez) === nJ &&
      !isTruthy(r.Ausente) &&
      r.Titulo_Ganado &&
      TITULOS_GANADOS_BIS_RAZA.includes(String(r.Titulo_Ganado)),
  );

  let html = "";

  Object.keys(MAPA_BIS_FINALES).forEach((nombreBis) => {
    const tituloBloque = TITULO_GANADO_BIS_POR_BLOQUE[nombreBis] || "";
    const ganadoresRaza = tituloBloque
      ? candidatosRaza.filter(
          (rr) => String(rr.Titulo_Ganado || "") === tituloBloque,
        )
      : [];

    const porInscripcion = new Map();
    ganadoresRaza.forEach((rr) => {
      const p = insc.find(
        (i) => normalizeID(i.IDInscripcion) === normalizeID(rr.IDInscripcion),
      );
      if (p && !porInscripcion.has(normalizeID(p.IDInscripcion)))
        porInscripcion.set(normalizeID(p.IDInscripcion), p);
    });
    if (nombreBis === "BIS CAMPEONES") {
      insc
        .filter(
          (p) =>
            normalizeID(p.IDEvento) === nE &&
            normalizarIDCategoria(p.IDCategoria, p.IDSexo) === "C07",
        )
        .forEach((p) => {
          if (!porInscripcion.has(normalizeID(p.IDInscripcion)))
            porInscripcion.set(normalizeID(p.IDInscripcion), p);
        });
    }

    const clasificados = Array.from(porInscripcion.values());

    if (clasificados.length > 0) {
      html += `<div class="bis-title">✨ ${nombreBis} ✨</div>`;

      clasificados.sort((a, b) =>
        String(a.IDGrupo || "").localeCompare(
          String(b.IDGrupo || ""),
          undefined,
          { numeric: true },
        ),
      );

      clasificados.forEach((p) => {
        const rNom =
          razas.find((rz) => String(rz.IDRaza) === String(p.IDRaza))
            ?.NombreRaza || p.IDRaza;
        const gNom =
          grupos.find((g) => String(g.IDGrupo) === String(p.IDGrupo))
            ?.NombreGrupo || p.IDGrupo;

        const rBis = resBis.find(
          (rb) =>
            normalizeID(rb.IDInscripcion) === normalizeID(p.IDInscripcion) &&
            normalizeID(rb.IDEvento) === nE &&
            normalizeID(rb.IDJuez) === nJ &&
            String(rb.TipoBIS || "") === String(nombreBis || ""),
        );

        const isAus = isTruthy(rBis?.Ausente);

        html += `
          <div class="card dog-card-compact bis-card ${rBis ? "has-bis" : ""} ${isAus ? "is-ausente" : ""}">
            <div class="bis-row">
              <div>
                <span class="muted">[${String(gNom).replace("Grupo ", "G")}]</span><br>
                <strong>#${p.NumeroCatalogo}</strong> - ${rNom}
              </div>
              <div class="bis-aus-zone">
                <button type="button"
                        class="btn-xs btn-aus-bis ${isAus ? "active" : ""}"
                        onclick="window.guardarResultadoBis(event, '${p.IDInscripcion}', 'AUS', '${nombreBis}')">
                  AUS
                </button>
              </div>
              <div class="btn-group-inline puesto-btns">
                ${["1", "2", "3", "4", "5", "6", "7"]
                  .map(
                    (pst) => `
                  <button class="btn-xs ${String(rBis?.PuestoBIS || "") === pst ? "active" : ""}"
                          ${isAus ? "disabled" : ""}
                          onclick="window.guardarResultadoBis(event, '${p.IDInscripcion}', '${pst}', '${nombreBis}')">
                    ${pst}°
                  </button>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
        `;
      });
    }
  });

  if (html === "") {
    html = `
      <div class="card bis-empty">
        <p class="muted">🏆 Aún no hay ganadores de raza clasificados para este juez.</p>
      </div>
    `;
  }

  $("panelJuzgamientoBis").innerHTML = html;
}

window.guardarResultadoBis = async (e, inscId, puesto, tipoBis) => {
  const config = window._pistaBisActiva;

  const btn = e?.currentTarget || e?.target?.closest?.(".btn-xs");
  if (
    !btn ||
    !config ||
    !config.eventId ||
    !config.judgeId ||
    !inscId ||
    !tipoBis
  )
    return;

  if (btn.disabled) return;
  btn.disabled = true;
  setTimeout(() => {
    try {
      btn.disabled = false;
    } catch {}
  }, 250);

  const scrollState = capturePlanillaScrollState();

  try {
    let resB = CACHE.get("Resultados_BIS") || [];
    const nI = normalizeID(inscId);
    const nE = normalizeID(config.eventId);
    const nJ = normalizeID(config.judgeId);
    const tB = String(tipoBis || "").trim();
    const pst = String(puesto || "").trim();

    if (!pst) return;

    let rec = resB.find(
      (r) =>
        normalizeID(r.IDInscripcion) === nI &&
        normalizeID(r.IDEvento) === nE &&
        normalizeID(r.IDJuez) === nJ &&
        String(r.TipoBIS || "").trim() === tB,
    );

    if (!rec) {
      rec = {
        IDResultadoBIS: "TEMP_" + Date.now(),
        IDInscripcion: inscId,
        IDEvento: config.eventId,
        IDJuez: config.judgeId,
        TipoBIS: tB,
        PuestoBIS: "",
        Ausente: false,
      };
      resB.push(rec);
    } else {
      rec.IDJuez = rec.IDJuez || config.judgeId;
      rec.IDEvento = rec.IDEvento || config.eventId;
      rec.TipoBIS = rec.TipoBIS || tB;
    }

    if (pst === "AUS") {
      const nuevoAus = !isTruthy(rec.Ausente);
      rec.Ausente = nuevoAus;

      if (nuevoAus) {
        rec.PuestoBIS = "";
      }

      CACHE.set("Resultados_BIS", resB);
      if (typeof renderJuzgamientoBis === "function")
        renderJuzgamientoBisPreservandoScroll(scrollState);

      const payload = {
        ...rec,
        IDJuez: config.judgeId,
        IDEvento: config.eventId,
        TipoBIS: tB,
      };
      const isTempAus = String(payload.IDResultadoBIS || "").startsWith(
        "TEMP_",
      );

      if (isTempAus) delete payload.IDResultadoBIS;

      api(
        "POST",
        {},
        {
          action: isTempAus ? "create" : "update",
          table: "Resultados_BIS",
          payload,
          id: isTempAus ? null : rec.IDResultadoBIS,
        },
      )
        .then((servidor) => {
          if (isTempAus && servidor?.id) {
            rec.IDResultadoBIS = servidor.id;
            CACHE.set("Resultados_BIS", resB);
          }
          setStatus("BIS sincronizado.");
        })
        .catch((err) => {
          setStatus("Error al guardar BIS: " + (err?.message || err), true);
        });

      return;
    }

    if (isTruthy(rec.Ausente)) return;

    const nuevoPuesto = String(rec.PuestoBIS || "") === pst ? "" : pst;

    if (nuevoPuesto) {
      resB.forEach((r) => {
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

    rec.PuestoBIS = nuevoPuesto;

    const parent = btn.parentElement;
    if (parent)
      parent
        .querySelectorAll(".btn-xs")
        .forEach((b) => b.classList.remove("active"));
    if (nuevoPuesto) btn.classList.add("active");

    CACHE.set("Resultados_BIS", resB);
    if (typeof renderJuzgamientoBis === "function")
      renderJuzgamientoBisPreservandoScroll(scrollState);

    const payload = {
      ...rec,
      IDJuez: config.judgeId,
      IDEvento: config.eventId,
      TipoBIS: tB,
    };
    const isTemp = String(payload.IDResultadoBIS || "").startsWith("TEMP_");
    if (isTemp) delete payload.IDResultadoBIS;

    api(
      "POST",
      {},
      {
        action: isTemp ? "create" : "update",
        table: "Resultados_BIS",
        payload,
        id: isTemp ? null : rec.IDResultadoBIS,
      },
    )
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
    document
      .querySelectorAll("#bisJuezBotonera .btn-juez-bis")
      .forEach((b) => b.classList.remove("active"));
    const btn = $(`btnJuezBis_${idJuez}`);
    if (btn) btn.classList.add("active");

    // hidden
    if ($("bisJuez")) $("bisJuez").value = idJuez;

    // memoria juez
    window._juezSeleccionadoBis = {
      id: idJuez,
      pista: pista || "",
      name: nombre || idJuez,
    };

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
      eventName:
        $("bisEvento")?.options[$("bisEvento")?.selectedIndex]?.text || "",
      judgeName: window._juezSeleccionadoBis?.name || "Juez",
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
window.renderJuzgamiento = renderJuzgamiento;

document.addEventListener("click", function (e) {
  const card = e.target.closest(".insc-item");
  if (!card) return;

  const id = card.dataset.id;
  if (id && typeof window.editInscripcion === "function") {
    window.editInscripcion(id);
  }
});
