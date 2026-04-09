/* global fetch */

const state = {
  models: [],
  filter: "",
  perRequest: false,
  inputTokens: 0,
  outputTokens: 0,
  requests: 1,
  fetchedAt: null,
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

function matchesFilter(model, filterLower) {
  if (!filterLower) return true;
  const name = String(model.name || "").toLowerCase();
  const id = String(model.canonical_slug || "").toLowerCase();
  return name.includes(filterLower) || id.includes(filterLower);
}

function calculateForModel(model) {
  const promptPerM = parseTokenPriceToPerMillion(model.pricing_prompt);
  const completionPerM = parseTokenPriceToPerMillion(model.pricing_completion);

  const inTok = state.inputTokens;
  const outTok = state.outputTokens;

  const base =
    promptPerM * (inTok / 1_000_000) +
    completionPerM * (outTok / 1_000_000);

  const multiplier = state.perRequest ? state.requests : 1;
  return base * multiplier;
}

function render() {
  const tbody = document.getElementById("modelsBody");
  const filterLower = state.filter.trim().toLowerCase();

  const visible = state.models.filter((m) => matchesFilter(m, filterLower));

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

function wireUi() {
  const perRequestToggle = document.getElementById("perRequestToggle");
  const requestsWrap = document.getElementById("requestsWrap");
  const inputTokens = document.getElementById("inputTokens");
  const outputTokens = document.getElementById("outputTokens");
  const requests = document.getElementById("requests");
  const nameFilter = document.getElementById("nameFilter");

  perRequestToggle.addEventListener("change", () => {
    state.perRequest = Boolean(perRequestToggle.checked);
    requestsWrap.style.display = state.perRequest ? "" : "none";
    render();
  });

  inputTokens.addEventListener("input", () => {
    state.inputTokens = clampInt(inputTokens.value, 0);
    render();
  });

  outputTokens.addEventListener("input", () => {
    state.outputTokens = clampInt(outputTokens.value, 0);
    render();
  });

  requests.addEventListener("input", () => {
    state.requests = clampInt(requests.value, 1);
    render();
  });

  nameFilter.addEventListener("input", () => {
    state.filter = nameFilter.value || "";
    render();
  });
}

async function init() {
  wireUi();

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
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  void init();
});

