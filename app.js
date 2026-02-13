console.log("NSS v4 — Module-safe build (no blank screen) ✅");

let appEl = null;
let dashboardBtn = null;
let callBtn = null;

let state = {
  idx: 0,
  answers: {},
};

const QUESTIONS = [
  { key:"opening_time_check", section:"Opening",
    prompt:"Do you have a quick moment?",
    type:"single",
    options:["Yes — continue","No — schedule"] },

  { key:"authority", section:"Authority",
    prompt:"How does approval normally work on your side when a deal is ready to execute?",
    type:"single",
    options:["I have final signing authority","I influence but need approval","I represent a principal buyer"] },

  { key:"role", section:"Profile",
    prompt:"Where do you sit in the chain for this transaction?",
    type:"single",
    options:["End Buyer","Distributor","Trader","Agent"] },

  { key:"company_name", section:"Company",
    prompt:"What exact company name should appear on the offer so it matches your registration precisely?",
    type:"text", placeholder:"Registered company name" },

  { key:"country_address", section:"Company",
    prompt:"Which country is the buyer entity registered in, and what business address ties to this transaction?",
    type:"text", placeholder:"Country + address" },

  { key:"contact_person", section:"Company",
    prompt:"Who should be the primary operational contact once documentation moves?",
    type:"text", placeholder:"Name, title, phone, email" },

  { key:"product", section:"Product",
    prompt:"What exact product configuration are you looking to secure?",
    type:"text", placeholder:"Product name" },

  { key:"specs", section:"Product",
    prompt:"What specifications are non-negotiable for your internal approval?",
    type:"text", placeholder:"Grade / certifications" },

  { key:"quantity", section:"Product",
    prompt:"What volume are you positioned to move on this transaction?",
    type:"text", placeholder:"Example: 25,000 MT" },

  { key:"delivery_terms", section:"Logistics",
    prompt:"Which delivery structure aligns best with your internal process?",
    type:"single",
    options:["FOB","CIF","CFR","EXW","DDP","Other"] },

  { key:"destination_port", section:"Logistics",
    prompt:"Which destination port should pricing be structured against?",
    type:"text", placeholder:"Destination port" },

  { key:"timeline", section:"Logistics",
    prompt:"What timeline are you operating under for delivery?",
    type:"single",
    options:["Immediate","Within 30 days","Within 60 days","Within 90 days","Long-term contract"] },

  { key:"target_price", section:"Financial",
    prompt:"What price range per MT keeps this commercially viable on your side?",
    type:"text", placeholder:"USD per MT" },

  { key:"primary_instrument", section:"Financial",
    prompt:"What payment instrument will you deploy for this transaction?",
    type:"single",
    options:["LC","DLC","SBLC","TT","Escrow","Other"] },

  { key:"issuing_bank", section:"Financial",
    prompt:"Which bank would be issuing the instrument so this is structured correctly from day one?",
    type:"text", placeholder:"Bank name + country" },

  { key:"loi_ready", section:"Engagement",
    prompt:"Once terms align, what would prevent this from moving directly to LOI or ICPO?",
    type:"single",
    options:["Nothing — ready","Needs internal review","Not ready"] },

  { key:"other_commodities", section:"Relationship",
    prompt:"Beyond this product, what other commodities are part of your regular trade cycle?",
    type:"text", placeholder:"Other commodities" }
];

function openingScriptBlock() {
  return `
    <div style="margin-top:12px;padding:12px;background:#132A3A;border-radius:10px;">
      <div style="font-size:13px;margin-bottom:6px;"><b>Opening Script</b></div>
      <div style="white-space:pre-wrap;font-size:13px;line-height:1.4;">
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry and I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team has reviewed your inquiry and we can fulfill this through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
      </div>
    </div>
  `;
}

function safeSetHTML(html) {
  if (!appEl) return;
  appEl.innerHTML = html;
}

function renderDashboard() {
  safeSetHTML(`
    <div style="padding:20px;">
      <h2 style="margin:0 0 12px 0;">Dashboard</h2>
      <div style="opacity:0.8;margin-bottom:12px;">Status: Ready</div>
      <button type="button" onclick="window.renderCallMode()">Open Call Mode</button>
    </div>
  `);
}

function renderCallMode() {
  const q = QUESTIONS[state.idx];
  if (!q) {
    safeSetHTML(`<div style="padding:20px;">No question found. <button onclick="window.renderDashboard()">Back</button></div>`);
    return;
  }

  const val = state.answers[q.key]?.value || "";

  safeSetHTML(`
    <div style="padding:20px;">
      <h2 style="margin:0 0 10px 0;">Call Mode</h2>
      <div style="opacity:0.8;">Question ${state.idx + 1} of ${QUESTIONS.length} • ${q.section}</div>

      ${openingScriptBlock()}

      <div style="margin-top:16px;padding:12px;background:#132A3A;border-radius:10px;">
        <div style="margin-top:2px;font-size:16px;line-height:1.35;"><b>${q.prompt}</b></div>

        <div style="margin-top:12px;">
          ${renderInput(q, val)}
        </div>

        <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" onclick="window.back()" ${state.idx===0?"disabled":""}>Back</button>
          <button type="button" onclick="window.next()">Next</button>
          <button type="button" onclick="window.renderDashboard()">Dashboard</button>
        </div>
      </div>
    </div>
  `);
}

function renderInput(q, val) {
  if (q.type === "text") {
    return `<input id="field" style="width:100%;padding:10px;" placeholder="${q.placeholder||""}" value="${escapeHtml(val)}" />`;
  }
  if (q.type === "single") {
    return q.options.map(opt =>
      `<button type="button" onclick="window.pick('${escapeJs(q.key)}','${escapeJs(opt)}')">${escapeHtml(opt)}</button>`
    ).join(" ");
  }
  return "";
}

function saveCurrent() {
  const q = QUESTIONS[state.idx];
  if (!q) return;

  if (q.type === "text") {
    const value = document.getElementById("field")?.value || "";
    state.answers[q.key] = { value: value.trim() };
  }
}

function next() {
  saveCurrent();
  if (state.idx < QUESTIONS.length - 1) state.idx += 1;
  renderCallMode();
}

function back() {
  saveCurrent();
  if (state.idx > 0) state.idx -= 1;
  renderCallMode();
}

function pick(key, value) {
  state.answers[key] = { value };

  if (key === "opening_time_check" && value === "No — schedule") {
    // stop progression if they want to schedule
    renderCallMode();
    return;
  }
  next();
}

// Helpers for safety
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeJs(str) {
  return String(str ?? "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

/* =========================
   INIT (module-safe)
========================= */
function init() {
  appEl = document.getElementById("app");
  dashboardBtn = document.getElementById("dashboardBtn");
  callBtn = document.getElementById("callBtn");

  // Always render *something* even if app is missing
  if (!appEl) {
    console.error("Missing #app element in index.html");
    return;
  }

  // Wire top nav if present
  if (dashboardBtn) dashboardBtn.addEventListener("click", renderDashboard);
  if (callBtn) callBtn.addEventListener("click", renderCallMode);

  renderDashboard();
}

// Expose functions for inline onclick (required for type="module")
window.renderDashboard = renderDashboard;
window.renderCallMode = renderCallMode;
window.next = next;
window.back = back;
window.pick = pick;

document.addEventListener("DOMContentLoaded", init);
