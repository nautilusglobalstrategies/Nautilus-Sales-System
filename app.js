console.log("NSS Smart Branching (Authority-first) loaded ✅");

/* =========================================================
   GLOBALS expected by your index.html onclick:
   - renderDashboard()
   - renderCallMode()
========================================================= */

let state = {
  mode: "dashboard",
  idx: 0,
  temperature: "CALM",
  path: null,            // "BUYER" | "TRADER" | "AGENT"
  answers: {},           // key -> { value, pending }
  log: ["Smart Branching ready."],
  flow: [],              // computed list of question keys in order
};

/* =========================
   QUESTION DEFINITIONS
   - showIf(state) controls branching/skip
   - type: text | number | single
========================= */

const QUESTIONS = {
  // --- Authority first (C)
  authority: q({
    section: "Authority",
    prompt: "Quickly so I don’t misroute this — are you the authorized decision-maker / signatory for this purchase?",
    type: "single",
    options: [
      "Yes — I can authorize/sign",
      "I influence but need approval",
      "I’m a trader/agent/mandate (representing a buyer)"
    ],
  }),

  // --- Role (asked only if not already clearly agent)
  role: q({
    section: "Profile",
    prompt: "Where do you sit in the chain for this deal?",
    type: "single",
    options: ["End Buyer", "Distributor", "Trader", "Agent"],
    showIf: (s) => s.path !== "AGENT", // if agent already inferred, skip
  }),

  // --- Company identity (core)
  company_name: q({ section: "Company", prompt: "What’s the exact registered company name on your documents?", type: "text", placeholder: "Registered Company Name" }),
  country_address: q({ section: "Company", prompt: "Country of registration + business address tied to this transaction?", type: "text", placeholder: "Country + Address" }),
  website: q({ section: "Company", prompt: "Company website (or N/A)?", type: "text", placeholder: "Website or N/A", optional: true }),
  year_established: q({ section: "Company", prompt: "What year was the company established?", type: "text", placeholder: "e.g., 2017", optional: true }),
  entity_type: q({ section: "Company", prompt: "Entity type (LLC, Corporation, Partnership, etc.)?", type: "text", placeholder: "LLC / Corp / Partnership", optional: true }),
  contact_person: q({ section: "Company", prompt: "Key contact (full name, title, phone/email)?", type: "text", placeholder: "Name, title, phone, email" }),

  // --- Buyer/Trader/Agent-specific authority follow-up
  principal_disclosure: q({
    section: "Authority",
    prompt: "Who is the end buyer / principal you represent? (Company name + country)",
    type: "text",
    placeholder: "Principal company + country",
    showIf: (s) => s.path === "AGENT" || s.path === "TRADER",
  }),

  mandate: q({
    section: "Authority",
    prompt: "Do you have a mandate/authorization to negotiate and submit LOI/ICPO on the principal’s behalf?",
    type: "single",
    options: ["Yes", "No", "In progress"],
    showIf: (s) => s.path === "AGENT" || s.path === "TRADER",
  }),

  // --- Business profile
  core_activity: q({
    section: "Business Profile",
    prompt: "What’s your company’s core business activity (one sentence)?",
    type: "text",
    placeholder: "Core activity",
    optional: true,
    showIf: (s) => s.path !== "AGENT", // for agents we can skip unless needed
  }),

  licenses: q({
    section: "Business Profile",
    prompt: "Do you currently have import/export licenses relevant to this product?",
    type: "single",
    options: ["Yes", "No", "In process", "Not required / unsure"],
    optional: true,
    showIf: (s) => s.path !== "AGENT",
  }),

  // --- Product requirements (core)
  product: q({ section: "Product", prompt: "What product are you targeting?", type: "text", placeholder: "e.g., Sunflower Oil" }),
  specs: q({ section: "Product", prompt: "What specs/standards are required (grade, certifications, etc.)?", type: "text", placeholder: "Specs / standards" }),
  quantity: q({ section: "Product", prompt: "What quantity are you requesting?", type: "number", placeholder: "Quantity", unitOptions: ["MT", "40ft containers", "20ft containers"] }),
  packaging: q({
    section: "Product",
    prompt: "Preferred packaging?",
    type: "single",
    options: ["Bulk", "Flexitank", "Bottled", "Bagged", "Drums", "Other"],
    optional: true,
  }),

  // --- Logistics
  incoterms: q({
    section: "Logistics",
    prompt: "Which delivery terms do you want?",
    type: "single",
    options: ["FOB", "CIF", "CFR", "EXW", "DDP", "Other"],
    optional: true,
  }),
  destination_port: q({ section: "Logistics", prompt: "Destination port(s)?", type: "text", placeholder: "Port name(s)" }),
  timeline: q({
    section: "Logistics",
    prompt: "Delivery timeline?",
    type: "single",
    options: ["Immediate", "Within 30 days", "Within 60 days", "Within 90 days", "Long-term contract"],
    optional: true,
  }),

  // --- Financial qualification (core closing power)
  target_price: q({
    section: "Financial",
    prompt: "To keep us aligned — what target price range (USD/MT) are you trying to hit?",
    type: "text",
    placeholder: "Example: 820–860 USD/MT",
  }),

  primary_instrument: q({
    section: "Financial",
    prompt: "What PRIMARY payment instrument will you use on this transaction?",
    type: "single",
    options: ["LC", "DLC", "SBLC", "TT", "Escrow", "Other"],
  }),

  secondary_instrument: q({
    section: "Financial",
    prompt: "Do you have a SECONDARY instrument available (backup option)?",
    type: "single",
    options: ["None", "LC", "DLC", "SBLC", "TT", "Escrow", "Other"],
    optional: true,
  }),

  issuing_bank: q({
    section: "Financial",
    prompt: "Which bank will be used for the instrument? (Bank name + country)",
    type: "text",
    placeholder: "Bank name + country",
    showIf: (s) => {
      const prim = getVal(s, "primary_instrument");
      return prim && prim !== "TT"; // if TT, bank may not be required
    }
  }),

  guarantees: q({
    section: "Financial",
    prompt: "If required, are you open to escrow / performance bond / financial guarantees?",
    type: "single",
    options: ["Yes", "No", "Depends on terms"],
    optional: true,
  }),

  docs_available: q({
    section: "Docs",
    prompt: "If requested, can you provide Company Profile / Buyer CIS / BCL or POF?",
    type: "single",
    options: ["Yes", "No", "Some of them", "Depends"],
    optional: true,
  }),

  loi_ready: q({
    section: "Engagement",
    prompt: "Once terms align, are you ready to issue an LOI or ICPO on letterhead?",
    type: "single",
    options: ["Yes", "Needs internal approval", "No"],
  }),

  contract_preference: q({
    section: "Engagement",
    prompt: "Are you open to long-term supply contracts or spot only?",
    type: "single",
    options: ["Long-term contract", "Spot only", "Both"],
    optional: true,
  }),

  compliance: q({
    section: "Compliance",
    prompt: "Any specific regulatory or compliance requirements in your country for this product?",
    type: "text",
    placeholder: "Compliance requirements (or None)",
    optional: true,
  }),

  other_commodities: q({
    section: "Relationship",
    prompt: "In addition to this product, what other commodities are you regularly buying or selling so we can offer additional opportunities?",
    type: "text",
    placeholder: "Other commodities (buy/sell)",
    optional: true,
  }),

  // --- Verification gate (only appears when risk is high)
  verification_gate: q({
    section: "Verification",
    prompt: "So we can protect both sides — what’s the cleanest way for us to verify capability (without creating friction on your side)?",
    type: "text",
    placeholder: "Verification preference",
    showIf: (s) => computeRisk(s) >= 45
  }),
};

/* =========================
   FLOW BUILDER (Branching)
========================= */

function buildFlow() {
  // Always start with Authority-first
  const flow = ["authority"];

  // Determine path from authority answer if possible
  // (role question may refine later)
  if (!state.path) {
    const auth = getVal(state, "authority");
    if (auth === "I’m a trader/agent/mandate (representing a buyer)") state.path = "AGENT";
  }

  // Role asked (unless agent already inferred)
  if (shouldAsk("role")) flow.push("role");

  // Company block
  flow.push("company_name", "country_address", "contact_person");
  if (shouldAsk("website")) flow.push("website");
  if (shouldAsk("year_established")) flow.push("year_established");
  if (shouldAsk("entity_type")) flow.push("entity_type");

  // If trader/agent path, capture principal + mandate
  if (shouldAsk("principal_disclosure")) flow.push("principal_disclosure");
  if (shouldAsk("mandate")) flow.push("mandate");

  // Business profile (optional)
  if (shouldAsk("core_activity")) flow.push("core_activity");
  if (shouldAsk("licenses")) flow.push("licenses");

  // Product
  flow.push("product", "specs", "quantity");
  if (shouldAsk("packaging")) flow.push("packaging");

  // Logistics
  if (shouldAsk("incoterms")) flow.push("incoterms");
  flow.push("destination_port");
  if (shouldAsk("timeline")) flow.push("timeline");

  // Financial
  flow.push("target_price", "primary_instrument");
  if (shouldAsk("secondary_instrument")) flow.push("secondary_instrument");
  if (shouldAsk("issuing_bank")) flow.push("issuing_bank");
  if (shouldAsk("guarantees")) flow.push("guarantees");
  if (shouldAsk("docs_available")) flow.push("docs_available");

  // Engagement + compliance
  flow.push("loi_ready");
  if (shouldAsk("contract_preference")) flow.push("contract_preference");
  if (shouldAsk("compliance")) flow.push("compliance");

  // Verification gate (only if risk elevated)
  if (shouldAsk("verification_gate")) flow.push("verification_gate");

  // Relationship expansion
  if (shouldAsk("other_commodities")) flow.push("other_commodities");

  state.flow = flow;
}

/* =========================
   PATH RESOLUTION
========================= */
function resolvePathFromAnswers() {
  // Authority answer can force AGENT-ish path
  const auth = getVal(state, "authority");
  if (auth === "I’m a trader/agent/mandate (representing a buyer)") state.path = "AGENT";

  // Role can refine (if asked)
  const role = getVal(state, "role");
  if (role === "Agent") state.path = "AGENT";
  if (role === "Trader") state.path = "TRADER";
  if (role === "End Buyer" || role === "Distributor") state.path = "BUYER";

  // If still null, default to BUYER (most common)
  if (!state.path) state.path = "BUYER";
}

/* =========================
   SCORING
========================= */
function computeStructural(s) {
  // Key “deal reality” anchors
  const keys = [
    "company_name","country_address","contact_person",
    "product","specs","quantity","destination_port",
    "target_price","primary_instrument","loi_ready"
  ];
  let answered = 0;
  for (const k of keys) {
    const a = s.answers[k];
    if (a && !a.pending && hasValue(a.value)) answered++;
  }
  return Math.round((answered / keys.length) * 100);
}

function computeRisk(s) {
  let r = 0;

  const price = getVal(s, "target_price");
  const prim  = getVal(s, "primary_instrument");
  const bank  = getVal(s, "issuing_bank");
  const loi   = getVal(s, "loi_ready");
  const mandate = getVal(s, "mandate");

  if (!hasValue(price)) r += 10;
  if (!hasValue(prim)) r += 25;

  // If not TT and no bank, risk rises
  if (hasValue(prim) && prim !== "TT" && !hasValue(bank)) r += 25;

  if (String(loi || "").toLowerCase().includes("no")) r += 30;
  if (String(loi || "").toLowerCase().includes("internal")) r += 10;

  // If agent/trader but no mandate: add risk
  if ((s.path === "AGENT" || s.path === "TRADER") && (!hasValue(mandate) || mandate === "No")) r += 15;

  return Math.min(r, 100);
}

function computePhase() {
  const pct = state.flow.length ? Math.round(((state.idx + 1) / state.flow.length) * 100) : 0;
  if (pct < 45) return "QUALIFY";
  if (pct < 80) return "ALIGN";
  return "LEVERAGE";
}

/* =========================
   UI RENDER
========================= */

function renderDashboard() {
  state.mode = "dashboard";
  resolvePathFromAnswers();
  buildFlow();

  const structural = computeStructural(state);
  const risk = computeRisk(state);
  const phase = computePhase();

  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Dashboard</h2>
      <div style="margin:8px 0;">Path: <b>${escapeHtml(state.path || "—")}</b></div>
      <div style="margin:8px 0;">Phase: <b>${phase}</b></div>
      <div style="margin:8px 0;">Structural: <b>${structural}</b>/100</div>
      <div style="margin:8px 0;">Risk: <b>${risk}</b>/100</div>
      <div style="margin:8px 0;">Temperature: <b>${escapeHtml(state.temperature)}</b></div>
      <div style="margin:12px 0;">
        <button onclick="renderCallMode()">Open Call Mode</button>
        <button onclick="resetDeal()">Start New Deal</button>
        <button onclick="copySummary()">Copy Summary</button>
      </div>

      <div style="margin-top:14px; padding:10px; background:#132A3A; border-radius:10px;">
        <div style="opacity:0.8; font-size:12px; margin-bottom:6px;">Flow Preview (${state.flow.length} steps)</div>
        <div style="font-size:12px; line-height:1.4;">
          ${state.flow.map((k,i)=>`<span style="opacity:${i===state.idx?1:0.7};">${i+1}. ${escapeHtml(k)}</span>`).join("<br>")}
        </div>
      </div>

      <div style="margin-top:14px; padding:10px; background:#132A3A; border-radius:10px;">
        <div style="opacity:0.8; font-size:12px; margin-bottom:6px;">Activity</div>
        <div style="font-size:12px; line-height:1.4;">
          ${state.log.slice(0,12).map(x=>escapeHtml(x)).join("<br>")}
        </div>
      </div>
    </div>
  `;
}

function renderCallMode() {
  state.mode = "call";
  resolvePathFromAnswers();
  buildFlow();

  // Clamp idx if flow changed
  if (state.idx >= state.flow.length) state.idx = state.flow.length - 1;
  if (state.idx < 0) state.idx = 0;

  const key = state.flow[state.idx];
  const Q = QUESTIONS[key];
  const A = state.answers[key] || { value: "", pending: false };

  const structural = computeStructural(state);
  const risk = computeRisk(state);
  const phase = computePhase();

  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding:20px;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">Call Mode</h2>
          <div style="opacity:0.8; font-size:12px;">Path: <b>${escapeHtml(state.path)}</b> • Phase: <b>${phase}</b></div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px; opacity:0.8;">Structural: <b>${structural}</b>/100 • Risk: <b>${risk}</b>/100</div>
          <div style="font-size:12px; opacity:0.8;">Temperature: <b>${escapeHtml(state.temperature)}</b></div>
        </div>
      </div>

      <div style="margin-top:14px; padding:12px; background:#132A3A; border-radius:10px;">
        <div style="opacity:0.75; font-size:12px;">${escapeHtml(Q.section)} • Step ${state.idx+1} of ${state.flow.length}</div>
        <div style="margin-top:8px; font-size:16px;"><b>${escapeHtml(Q.prompt)}</b></div>
        <div style="margin-top:12px;">
          ${renderInput(key, Q, A)}
        </div>

        <div style="margin-top:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; align-items:center;">
          <label style="font-size:12px; opacity:0.9;">
            <input type="checkbox" ${A.pending ? "checked" : ""} onchange="setPending('${key}', this.checked)" />
            Mark Pending
          </label>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button onclick="back()">Back</button>
            <button onclick="save()">Save</button>
            <button onclick="next()">Next</button>
            <button onclick="finish()">Finish</button>
          </div>
        </div>
      </div>

      <div style="margin-top:12px; padding:12px; background:#132A3A; border-radius:10px;">
        <div style="opacity:0.8; font-size:12px; margin-bottom:8px;">Temperature</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${["CALM","GUARDED","DEFENSIVE","RESISTANT"].map(t => `
            <button onclick="setTemp('${t}')" style="opacity:${state.temperature===t?1:0.75};">${t}</button>
          `).join("")}
        </div>
      </div>

      <div style="margin-top:12px; padding:12px; background:#132A3A; border-radius:10px;">
        <div style="opacity:0.8; font-size:12px; margin-bottom:6px;">Activity</div>
        <div style="font-size:12px; line-height:1.4;">
          ${state.log.slice(0,10).map(x=>escapeHtml(x)).join("<br>")}
        </div>
      </div>
    </div>
  `;
}

/* =========================
   INPUT RENDER / SAVE
========================= */

function renderInput(key, Q, A) {
  if (Q.type === "text") {
    return `<input id="field" style="width:100%; padding:10px;" placeholder="${escapeHtml(Q.placeholder||"")}" value="${escapeHtml(A.value||"")}" />`;
  }

  if (Q.type === "number") {
    const unitOptions = Q.unitOptions || ["MT"];
    let n = "", u = unitOptions[0];
    if (typeof A.value === "string" && A.value.includes(" ")) {
      const parts = A.value.split(" ");
      n = parts[0] || "";
      u = parts.slice(1).join(" ") || u;
    }
    return `
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <input id="num" style="padding:10px; width:220px;" inputmode="decimal" placeholder="${escapeHtml(Q.placeholder||"")}" value="${escapeHtml(n)}" />
        <select id="unit" style="padding:10px;">
          ${unitOptions.map(x => `<option value="${escapeHtml(x)}" ${x===u?"selected":""}>${escapeHtml(x)}</option>`).join("")}
        </select>
      </div>
    `;
  }

  if (Q.type === "single") {
    return `
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${Q.options.map(opt => `
          <button onclick="pick('${key}', ${JSON.stringify(opt)})" style="opacity:${A.value===opt?1:0.75};">
            ${escapeHtml(opt)}
          </button>
        `).join("")}
      </div>
    `;
  }

  return `<input id="field" style="width:100%; padding:10px;" value="${escapeHtml(A.value||"")}" />`;
}

function save() {
  const key = state.flow[state.idx];
  const Q = QUESTIONS[key];
  const A = state.answers[key] || { value: "", pending: false };

  if (Q.type === "text") {
    const el = document.getElementById("field");
    if (el) A.value = el.value.trim();
  }

  if (Q.type === "number") {
    const n = (document.getElementById("num")?.value || "").trim();
    const u = (document.getElementById("unit")?.value || "").trim();
    if (n) A.value = `${n} ${u}`;
  }

  // single answers are saved via pick()
  A.pending = false;
  state.answers[key] = A;

  // resolve path & rebuild flow after key answers
  resolvePathFromAnswers();
  buildFlow();

  log(`Saved: ${key}`);
  renderCallMode();
}

function pick(key, value) {
  const A = state.answers[key] || { value: "", pending: false };
  A.value = value;
  A.pending = false;
  state.answers[key] = A;

  // Authority/role updates can change path and flow
  resolvePathFromAnswers();
  buildFlow();

  log(`Selected: ${key} = ${value}`);
  renderCallMode();
}

function setPending(key, checked) {
  const A = state.answers[key] || { value: "", pending: false };
  A.pending = checked;
  state.answers[key] = A;
  log(`${key} marked ${checked ? "PENDING" : "ANSWERED"}`);
}

function setTemp(t) {
  const prev = state.temperature;
  state.temperature = t;
  log(`Temp: ${prev} → ${t}`);
  renderCallMode();
}

/* =========================
   NAV ACTIONS
========================= */

function next() {
  save(); // autosave on next
  if (state.idx < state.flow.length - 1) state.idx++;
  renderCallMode();
}

function back() {
  save(); // autosave on back too
  if (state.idx > 0) state.idx--;
  renderCallMode();
}

function finish() {
  save();
  renderDashboard();
}

function resetDeal() {
  state.idx = 0;
  state.path = null;
  state.temperature = "CALM";
  state.answers = {};
  state.flow = [];
  state.log = ["New deal started."];
  renderDashboard();
}

/* =========================
   SUMMARY (HubSpot ready)
========================= */
async function copySummary() {
  resolvePathFromAnswers();
  buildFlow();

  const structural = computeStructural(state);
  const risk = computeRisk(state);
  const phase = computePhase();

  const lines = [];
  lines.push("NAUTILUS SALES SYSTEM — DEAL SUMMARY");
  lines.push(`Path: ${state.path}`);
  lines.push(`Phase: ${phase}`);
  lines.push(`Structural: ${structural}/100`);
  lines.push(`Risk: ${risk}/100`);
  lines.push(`Temperature: ${state.temperature}`);
  lines.push("");
  lines.push("Answers:");

  for (const k of state.flow) {
    const Q = QUESTIONS[k];
    const A = state.answers[k];
    if (!A) continue;
    const v = A.pending ? "[PENDING]" : (A.value || "");
    if (!hasValue(v) && Q.optional) continue;
    lines.push(`- ${k}: ${v}`);
  }

  const txt = lines.join("\n");
  try {
    await navigator.clipboard.writeText(txt);
    log("Summary copied to clipboard ✅");
  } catch {
    log("Copy blocked by browser — manually select/copy from dashboard log.");
  }

  renderDashboard();
}

/* =========================
   UTIL
========================= */
function q(o){ return o; }

function shouldAsk(key) {
  const Q = QUESTIONS[key];
  if (!Q) return false;
  if (typeof Q.showIf === "function") return !!Q.showIf(state);
  return true;
}

function getVal(s, key) {
  return s.answers[key]?.value;
}

function hasValue(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return String(v).trim().length > 0;
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function log(msg){
  const t = new Date().toLocaleTimeString();
  state.log.unshift(`[${t}] ${msg}`);
  state.log = state.log.slice(0, 18);
}

/* =========================
   INIT
========================= */
buildFlow();
renderDashboard();

// Expose globals for index.html buttons
window.renderDashboard = renderDashboard;
window.renderCallMode = renderCallMode;
window.resetDeal = resetDeal;
window.copySummary = copySummary;
