/* global fetch */

const state = {
  models: [],
  filter: "",
  perRequest: false,
  inputTokens: 0,
  outputTokens: 0,
  requests: 1,
  fetchedAt: null,
  sortByCalculated: false,
  sortCalculatedDir: "desc", // "asc" | "desc"
};

function clampInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n) || !Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

function parsePrice(value) {
  if (value === null || value === undefined) return 0;
  const n = Number.parseFloat(String(value));
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return n;
}

function parseTokenPriceToPerMillion(value) {
  // OpenRouter pricing fields are typically per-token USD. UI requires $/1M.
  return parsePrice(value) * 1_000_000;
}

function formatPriceCellPerMillion(value) {
  const perM = parseTokenPriceToPerMillion(value);
  if (!perM) return `<span class="text-secondary">-</span>`;
  return `<span class="price-pill mono">$${perM.toFixed(4)}</span>`;
}

function formatRequestPriceCell(value) {
  // pricing_request is per-request (not per-token), so don't scale.
  const n = parsePrice(value);
  if (!n) return `<span class="text-secondary">-</span>`;
  return `<span class="price-pill mono">$${n.toFixed(4)}</span>`;
}

function formatUsd(value) {
  if (!Number.isFinite(value)) return "-";
  return `$${value.toFixed(6)}`;
}

function parseHashBool(value, fallback) {
  if (value === null) return fallback;
  return value === "1" || value === "true";
}

function getHashParams() {
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function applyHashToState() {
  const params = getHashParams();

  state.filter = params.get("nameFilter") || "";
  state.perRequest = parseHashBool(params.get("perRequestToggle"), false);
  state.inputTokens = clampInt(params.get("inputTokens"), 0);
  state.outputTokens = clampInt(params.get("outputTokens"), 0);
  state.requests = clampInt(params.get("requests"), 1) || 1;
  state.sortByCalculated = parseHashBool(params.get("sortByCalculated"), false);

  const sortDir = params.get("sortCalculatedDir");
  state.sortCalculatedDir = sortDir === "asc" ? "asc" : "desc";
}

function updateHashFromState() {
  const params = new URLSearchParams();

  params.set("nameFilter", state.filter);
  params.set("perRequestToggle", state.perRequest ? "1" : "0");
  params.set("inputTokens", String(state.inputTokens));
  params.set("outputTokens", String(state.outputTokens));
  params.set("requests", String(state.requests));
  params.set("sortByCalculated", state.sortByCalculated ? "1" : "0");
  params.set("sortCalculatedDir", state.sortCalculatedDir);

  const nextHash = params.toString();
  const nextUrl = `${window.location.pathname}${window.location.search}#${nextHash}`;
  window.history.replaceState(null, "", nextUrl);
}

function matchesFilter(model, filterLower) {
  if (!filterLower) return true;
  const name = String(model.name || "").toLowerCase();
  const id = String(model.canonical_slug || "").toLowerCase();
  return name.includes(filterLower) || id.includes(filterLower);
}

function calculateForModel(model) {
  const promptPerM = parseTokenPriceToPerMillion(model.pricing_prompt);
  const completionPerM = parseTokenPriceToPerMillion(model.pricing_completion);
  const requestPrice = parsePrice(model.pricing_request);

  const inTok = state.inputTokens;
  const outTok = state.outputTokens;

  const tokenCost =
    promptPerM * (inTok / 1_000_000) +
    completionPerM * (outTok / 1_000_000);

  const requestCost = state.perRequest ? requestPrice * state.requests : 0;
  return tokenCost + requestCost;
}

function render() {
  const tbody = document.getElementById("modelsBody");
  const filterLower = state.filter.trim().toLowerCase();

  let visible = state.models.filter((m) => matchesFilter(m, filterLower));
  if (state.sortByCalculated) {
    const decorated = visible.map((m, idx) => ({
      m,
      idx,
      v: calculateForModel(m),
    }));
    decorated.sort((a, b) => {
      const d = state.sortCalculatedDir === "asc" ? 1 : -1;
      if (a.v === b.v) return a.idx - b.idx;
      return a.v < b.v ? -1 * d : 1 * d;
    });
    visible = decorated.map((x) => x.m);
  }

  if (!visible.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center text-secondary py-5">No matching models.</td></tr>';
    return;
  }

  tbody.innerHTML = visible
    .map((m) => {
      const calc = calculateForModel(m);
      return `
        <tr>
          <td>
            <div class="fw-semibold fs-5">${escapeHtml(m.name || "")}</div>
            <div class="text-secondary small mono">${escapeHtml(
              m.canonical_slug || ""
            )}</div>
          </td>
          <td class="text-end">${formatPriceCellPerMillion(m.pricing_prompt)}</td>
          <td class="text-end">${formatPriceCellPerMillion(m.pricing_completion)}</td>
          <td class="text-end">${formatRequestPriceCell(m.pricing_request)}</td>
          <td class="text-end"><span class="calc mono">${formatUsd(calc)}</span></td>
        </tr>
      `;
    })
    .join("");
}

function renderCalculatedSortIcon() {
  const icon = document.getElementById("calculatedSortIcon");
  if (!icon) return;
  if (!state.sortByCalculated) {
    icon.textContent = "⇅";
    return;
  }
  icon.textContent = state.sortCalculatedDir === "asc" ? "▲" : "▼";
}

function renderLastUpdated() {
  const el = document.getElementById("lastUpdated");
  if (!el) return;

  if (!state.fetchedAt) {
    el.textContent = "";
    return;
  }

  const d = new Date(state.fetchedAt);
  if (Number.isNaN(d.getTime())) {
    el.textContent = ` · Last updated: ${state.fetchedAt}`;
    return;
  }

  el.textContent = ` · Last updated: ${d.toLocaleString()}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getUiElements() {
  return {
    perRequestToggle: document.getElementById("perRequestToggle"),
    requestsWrap: document.getElementById("requestsWrap"),
    inputTokens: document.getElementById("inputTokens"),
    outputTokens: document.getElementById("outputTokens"),
    requests: document.getElementById("requests"),
    nameFilter: document.getElementById("nameFilter"),
    calculatedHeader: document.getElementById("calculatedHeader"),
  };
}

function syncUiFromState(ui) {
  ui.perRequestToggle.checked = state.perRequest;
  ui.requestsWrap.style.display = state.perRequest ? "" : "none";
  ui.inputTokens.value = String(state.inputTokens);
  ui.outputTokens.value = String(state.outputTokens);
  ui.requests.value = String(state.requests);
  ui.nameFilter.value = state.filter;
}

function wireUi(ui) {
  const {
    perRequestToggle,
    requestsWrap,
    inputTokens,
    outputTokens,
    requests,
    nameFilter,
    calculatedHeader,
  } = ui;

  perRequestToggle.addEventListener("change", () => {
    state.perRequest = Boolean(perRequestToggle.checked);
    requestsWrap.style.display = state.perRequest ? "" : "none";
    updateHashFromState();
    render();
  });

  inputTokens.addEventListener("input", () => {
    state.inputTokens = clampInt(inputTokens.value, 0);
    updateHashFromState();
    render();
  });

  outputTokens.addEventListener("input", () => {
    state.outputTokens = clampInt(outputTokens.value, 0);
    updateHashFromState();
    render();
  });

  requests.addEventListener("input", () => {
    state.requests = clampInt(requests.value, 1) || 1;
    updateHashFromState();
    render();
  });

  nameFilter.addEventListener("input", () => {
    state.filter = nameFilter.value || "";
    updateHashFromState();
    render();
  });

  if (calculatedHeader) {
    calculatedHeader.addEventListener("click", () => {
      if (!state.sortByCalculated) {
        state.sortByCalculated = true;
        state.sortCalculatedDir = "desc";
      } else {
        state.sortCalculatedDir =
          state.sortCalculatedDir === "desc" ? "asc" : "desc";
      }
      updateHashFromState();
      renderCalculatedSortIcon();
      render();
    });
  }

  window.addEventListener("hashchange", () => {
    applyHashToState();
    syncUiFromState(ui);
    renderCalculatedSortIcon();
    render();
  });
}

async function init() {
  const ui = getUiElements();
  applyHashToState();
  syncUiFromState(ui);
  wireUi(ui);
  updateHashFromState();

  try {
    const resp = await fetch("/api/models", { headers: { Accept: "application/json" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const payload = await resp.json();
    state.models = Array.isArray(payload) ? payload : payload.models || [];
    state.fetchedAt = Array.isArray(payload) ? null : payload.fetched_at || null;
  } catch (e) {
    const tbody = document.getElementById("modelsBody");
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary py-5">Failed to load models. Run <span class="mono">python3 webapp/manage.py fetch</span> and refresh.</td></tr>`;
    return;
  }

  renderLastUpdated();
  renderCalculatedSortIcon();
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  void init();
});

