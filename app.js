console.log("NSS Voss-Only + Smart Branching + Proper Opening loaded ✅");

let state = {
  mode: "dashboard",
  idx: 0,
  temperature: "CALM",
  path: null,
  answers: {},
  log: ["Voss-Only wizard ready."],
  flow: [],
};

/* =========================
   QUESTIONS
========================= */

const QUESTIONS = {
  // ---- Opening sequence (before qualification)
  opening_greeting: q({
    section: "Opening",
    base: "Greeting",
    type: "single",
    options: ["Continue"],
  }),

  opening_identity: q({
    section: "Opening",
    base: "Identity Check",
    type: "text",
    placeholder: "Prospect name / confirmation",
    optional: true,
  }),

  opening_permission_record: q({
    section: "Opening",
    base: "Permission to Record",
    type: "single",
    options: ["Yes", "No"],
  }),

  opening_inquiry_confirm: q({
    section: "Opening",
    base: "Inquiry Confirmation",
    type: "text",
    placeholder: "Product / destination / qty (if known)",
    optional: true,
  }),

  opening_time_check: q({
    section: "Opening",
    base: "Time Check",
    type: "single",
    options: ["Yes, now is good", "No, call me back"],
  }),

  // ---- Authority-first (but framed correctly)
  authority: q({
    section: "Authority",
    base: "Authority",
    type: "single",
    options: [
      "Yes — I can authorize/sign",
      "I influence but need approval",
      "I’m a trader/agent/mandate (representing a buyer)"
    ],
  }),

  role: q({
    section: "Profile",
    base: "Role",
    type: "single",
    options: ["End Buyer", "Distributor", "Trader", "Agent"],
    showIf: (s) => s.path !== "AGENT",
  }),

  // Company
  company_name: q({ section: "Company", base: "Company Name", type: "text", placeholder: "Registered company name" }),
  country_address: q({ section: "Company", base: "Country & Address", type: "text", placeholder: "Country + business address" }),
  website: q({ section: "Company", base: "Website", type: "text", placeholder: "Website or N/A", optional: true }),
  year_established: q({ section: "Company", base: "Year Established", type: "text", placeholder: "e.g., 2017", optional: true }),
  entity_type: q({ section: "Company", base: "Entity Type", type: "text", placeholder: "LLC / Corp / Partnership", optional: true }),
  contact_person: q({ section: "Company", base: "Key Contact", type: "text", placeholder: "Name, title, phone, email" }),

  // Trader/Agent
  principal_disclosure: q({
    section: "Authority",
    base: "Principal",
    type: "text",
    placeholder: "Principal company + country",
    showIf: (s) => s.path === "AGENT" || s.path === "TRADER",
  }),

  mandate: q({
    section: "Authority",
    base: "Mandate",
    type: "single",
    options: ["Yes", "No", "In progress"],
    showIf: (s) => s.path === "AGENT" || s.path === "TRADER",
  }),

  // Business profile
  core_activity: q({
    section: "Business Profile",
    base: "Core Activity",
    type: "text",
    placeholder: "One sentence business activity",
    optional: true,
    showIf: (s) => s.path !== "AGENT",
  }),

  licenses: q({
    section: "Business Profile",
    base: "Licenses",
    type: "single",
    options: ["Yes", "No", "In process", "Not required / unsure"],
    optional: true,
    showIf: (s) => s.path !== "AGENT",
  }),

  // Product
  product: q({ section: "Product", base: "Product", type: "text", placeholder: "e.g., Sunflower Oil" }),
  specs: q({ section: "Product", base: "Specifications", type: "text", placeholder: "Specs/grade/standards" }),
  quantity: q({ section: "Product", base: "Quantity", type: "number", placeholder: "Quantity", unitOptions: ["MT","40ft containers","20ft containers"] }),
  packaging: q({ section: "Product", base: "Packaging", type: "single", options: ["Bulk","Flexitank","Bottled","Bagged","Drums","Other"], optional: true }),

  // Logistics
  incoterms: q({ section: "Logistics", base: "Delivery Terms", type: "single", options: ["FOB","CIF","CFR","EXW","DDP","Other"], optional: true }),
  destination_port: q({ section: "Logistics", base: "Destination Port", type: "text", placeholder: "Port name(s)" }),
  timeline: q({ section: "Logistics", base: "Timeline", type: "single", options: ["Immediate","Within 30 days","Within 60 days","Within 90 days","Long-term contract"], optional: true }),

  // Financial
  target_price: q({ section: "Financial", base: "Target Price", type: "text", placeholder: "Example: 820–860 USD/MT" }),
  primary_instrument: q({ section: "Financial", base: "Primary Instrument", type: "single", options: ["LC","DLC","SBLC","TT","Escrow","Other"] }),
  secondary_instrument: q({ section: "Financial", base: "Secondary Instrument", type: "single", options: ["None","LC","DLC","SBLC","TT","Escrow","Other"], optional: true }),
  issuing_bank: q({
    section: "Financial",
    base: "Issuing Bank",
    type: "text",
    placeholder: "Bank name + country",
    showIf: (s) => {
      const prim = getVal(s, "primary_instrument");
      return prim && prim !== "TT";
    }
  }),
  guarantees: q({ section: "Financial", base: "Guarantees", type: "single", options: ["Yes","No","Depends on terms"], optional: true }),
  docs_available: q({ section: "Docs", base: "Documents", type: "single", options: ["Yes","No","Some of them","Depends"], optional: true }),

  // Engagement
  loi_ready: q({ section: "Engagement", base: "LOI/ICPO Readiness", type: "single", options: ["Yes","Needs internal approval","No"] }),
  contract_preference: q({ section: "Engagement", base: "Contract Preference", type: "single", options: ["Long-term contract","Spot only","Both"], optional: true }),
  compliance: q({ section: "Compliance", base: "Compliance Requirements", type: "text", placeholder: "Compliance requirements (or None)", optional: true }),

  other_commodities: q({ section: "Relationship", base: "Other Commodities", type: "text", placeholder: "Other commodities (buy/sell)", optional: true }),

  verification_gate: q({
    section: "Verification",
    base: "Verification Preference",
    type: "text",
    placeholder: "Verification preference",
    showIf: (s) => computeRisk(s) >= 45
  }),

  closing: q({
    section: "Closing",
    base: "Gratitude",
    type: "single",
    options: ["Finish"],
  }),
};

/* =========================
   FLOW BUILDER
========================= */
function buildFlow() {
  const flow = [
    "opening_greeting",
    "opening_identity",
    "opening_permission_record",
    "opening_inquiry_confirm",
    "opening_time_check",
    "authority"
  ];

  if (!state.path) {
    const auth = getVal(state, "authority");
    if (auth === "I’m a trader/agent/mandate (representing a buyer)") state.path = "AGENT";
  }

  if (shouldAsk("role")) flow.push("role");

  flow.push("company_name","country_address","contact_person");
  if (shouldAsk("website")) flow.push("website");
  if (shouldAsk("year_established")) flow.push("year_established");
  if (shouldAsk("entity_type")) flow.push("entity_type");

  if (shouldAsk("principal_disclosure")) flow.push("principal_disclosure");
  if (shouldAsk("mandate")) flow.push("mandate");

  if (shouldAsk("core_activity")) flow.push("core_activity");
  if (shouldAsk("licenses")) flow.push("licenses");

  flow.push("product","specs","quantity");
  if (shouldAsk("packaging")) flow.push("packaging");

  if (shouldAsk("incoterms")) flow.push("incoterms");
  flow.push("destination_port");
  if (shouldAsk("timeline")) flow.push("timeline");

  flow.push("target_price","primary_instrument");
  if (shouldAsk("secondary_instrument")) flow.push("secondary_instrument");
  if (shouldAsk("issuing_bank")) flow.push("issuing_bank");
  if (shouldAsk("guarantees")) flow.push("guarantees");
  if (shouldAsk("docs_available")) flow.push("docs_available");

  flow.push("loi_ready");
  if (shouldAsk("contract_preference")) flow.push("contract_preference");
  if (shouldAsk("compliance")) flow.push("compliance");

  if (shouldAsk("verification_gate")) flow.push("verification_gate");
  if (shouldAsk("other_commodities")) flow.push("other_commodities");

  flow.push("closing");

  state.flow = flow;
}

function resolvePathFromAnswers() {
  const auth = getVal(state, "authority");
  if (auth === "I’m a trader/agent/mandate (representing a buyer)") state.path = "AGENT";

  const role = getVal(state, "role");
  if (role === "Agent") state.path = "AGENT";
  if (role === "Trader") state.path = "TRADER";
  if (role === "End Buyer" || role === "Distributor") state.path = "BUYER";

  if (!state.path) state.path = "BUYER";
}

/* =========================
   RISK
========================= */
function computeRisk(s) {
  let r = 0;
  const price = getVal(s, "target_price");
  const prim  = getVal(s, "primary_instrument");
  const bank  = getVal(s, "issuing_bank");
  const loi   = getVal(s, "loi_ready");
  const mandate = getVal(s, "mandate");

  if (!hasValue(price)) r += 10;
  if (!hasValue(prim)) r += 25;
  if (hasValue(prim) && prim !== "TT" && !hasValue(bank)) r += 25;

  if (String(loi || "").toLowerCase().includes("no")) r += 30;
  if (String(loi || "").toLowerCase().includes("internal")) r += 10;

  if ((s.path === "AGENT" || s.path === "TRADER") && (!hasValue(mandate) || mandate === "No")) r += 15;

  return Math.min(r, 100);
}

/* =========================
   VOSS PROMPTS (Main)
========================= */
function vossMainPrompt(key) {
  const risk = computeRisk(state);
  const temp = state.temperature;
  const soften = (temp !== "CALM");
  const opener = soften ? "Help me understand—" : "So we keep this clean—";
  const tighten = risk >= 50 ? "Just so we don’t build a paper deal—" : "";

  const MAP = {
    opening_greeting: `Hi — thanks for taking my call. This is a quick follow-up on your commodity inquiry. Is now still a good time for 3–5 minutes?`,
    opening_identity: `So I make sure I’m speaking to the right person—what name should I put on the file?`,
    opening_permission_record: `Before we start, would it be okay if I record this call for accuracy so I don’t miss details?`,
    opening_inquiry_confirm: `Just to confirm what you submitted—what product, quantity, and destination are we building around?`,
    opening_time_check: `What would make this call valuable for you today—speed to offer, best pricing, or certainty on execution?`,

    authority: `${opener}who approves and signs on your side—are you that person, or does it go through someone else?`,
    role: `${opener}are you buying for end use, distributing, trading, or acting as an agent?`,

    company_name: `${opener}what’s the exact registered company name that will appear on documents?`,
    country_address: `${opener}what country is the buyer entity registered in, and what address should tie to the deal?`,
    contact_person: `${opener}who’s the best point of contact—name, title, phone/email?`,

    principal_disclosure: `${tighten}${opener}who is the principal/end buyer you represent—company name and country?`,
    mandate: `${tighten}${opener}do you have mandate authorization to negotiate and submit LOI/ICPO for the principal?`,

    product: `${opener}what’s the exact product you want sourced?`,
    specs: `${opener}what quality specs are non-negotiable for you?`,
    quantity: `${opener}what quantity are you targeting—MT or containers?`,
    destination_port: `${opener}what destination port should we price to?`,

    target_price: `${tighten}${opener}what target price range per MT are you aiming for?`,
    primary_instrument: `${tighten}${opener}what primary payment instrument will you use—LC, DLC, SBLC, TT, escrow, or other?`,
    issuing_bank: `${tighten}${opener}which bank will issue the instrument (name + country) so we stay aligned from day one?`,
    loi_ready: `${tighten}${opener}once terms align, are you ready to issue LOI/ICPO on letterhead so we can move quickly?`,

    other_commodities: `${opener}besides this product, what other commodities are you consistently buying or selling?`,

    closing: `Thank you for your time today. Based on what you shared, we’ll move this into offer prep. What’s the best next step to keep momentum—email, WhatsApp, or a scheduled follow-up?`,
  };

  return MAP[key] || `${opener}what’s the simplest accurate answer on your side for this?`;
}

/* =========================
   RENDER
========================= */

function renderDashboard() {
  state.mode = "dashboard";
  resolvePathFromAnswers();
  buildFlow();

  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Dashboard</h2>
      <div>Path: <b>${escapeHtml(state.path || "—")}</b></div>
      <div>Risk: <b>${computeRisk(state)}</b>/100</div>
      <div>Temp: <b>${escapeHtml(state.temperature)}</b></div>
      <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
        <button onclick="renderCallMode()">Open Call Mode</button>
        <button onclick="resetDeal()">Start New Deal</button>
        <button onclick="copySummary()">Copy Summary</button>
      </div>
    </div>
  `;
}

function renderCallMode() {
  state.mode = "call";
  resolvePathFromAnswers();
  buildFlow();

  if (state.idx >= state.flow.length) state.idx = state.flow.length - 1;
  if (state.idx < 0) state.idx = 0;

  const key = state.flow[state.idx];
  const Q = QUESTIONS[key];
  const A = state.answers[key] || { value: "", pending: false };

  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding:20px;">
      <div style="opacity:0.8; font-size:12px;">
        Step ${state.idx+1}/${state.flow.length} • ${escapeHtml(Q.section)} • Key: <b>${escapeHtml(key)}</b>
      </div>

      <div style="margin-top:10px; font-size:16px;">
        <b>${escapeHtml(vossMainPrompt(key))}</b>
      </div>

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
          <button onclick="copySummary()">Copy Summary</button>
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
    </div>
  `;
}

/* =========================
   INPUT/SAVE
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
  return "";
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

  A.pending = false;
  state.answers[key] = A;

  resolvePathFromAnswers();
  buildFlow();
  renderCallMode();
}

function pick(key, value) {
  state.answers[key] = { value, pending: false };
  resolvePathFromAnswers();
  buildFlow();
  renderCallMode();
}

function setPending(key, checked) {
  const A = state.answers[key] || { value: "", pending: false };
  A.pending = checked;
  state.answers[key] = A;
}

function setTemp(t) {
  state.temperature = t;
  renderCallMode();
}

function next() { save(); if (state.idx < state.flow.length - 1) state.idx++; renderCallMode(); }
function back() { save(); if (state.idx > 0) state.idx--; renderCallMode(); }
function finish() { save(); renderDashboard(); }
function resetDeal() { state.idx=0; state.path=null; state.temperature="CALM"; state.answers={}; buildFlow(); renderDashboard(); }

/* =========================
   SUMMARY
========================= */
async function copySummary() {
  resolvePathFromAnswers();
  buildFlow();
  const lines = [];
  lines.push("NAUTILUS SALES SYSTEM — DEAL SUMMARY");
  lines.push(`Path: ${state.path}`);
  lines.push(`Risk: ${computeRisk(state)}/100`);
  lines.push(`Temp: ${state.temperature}`);
  lines.push("");
  lines.push("Answers:");
  for (const k of state.flow) {
    if (k.startsWith("opening_") || k === "closing") continue;
    const A = state.answers[k];
    if (!A) continue;
    lines.push(`- ${k}: ${A.pending ? "[PENDING]" : (A.value || "")}`);
  }
  const txt = lines.join("\n");
  try { await navigator.clipboard.writeText(txt); } catch {}
}

/* =========================
   UTIL
========================= */
function q(o){ return o; }
function shouldAsk(key){ const Q=QUESTIONS[key]; if(!Q) return false; if(typeof Q.showIf==="function") return !!Q.showIf(state); return true; }
function getVal(s,k){ return s.answers[k]?.value; }
function hasValue(v){ if(v==null) return false; if(typeof v==="string") return v.trim().length>0; return String(v).trim().length>0; }
function escapeHtml(str){ return String(str??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

/* =========================
   INIT
========================= */
buildFlow();
renderDashboard();

window.renderDashboard = renderDashboard;
window.renderCallMode = renderCallMode;
window.resetDeal = resetDeal;
window.copySummary = copySummary;

window.next = next;
window.back = back;
window.save = save;
window.finish = finish;
window.pick = pick;
window.setPending = setPending;
window.setTemp = setTemp;
