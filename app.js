console.log("NSS Voss-Only + Smart Branching + Greeting/Close loaded ✅");

let state = {
  mode: "dashboard",
  idx: 0,
  temperature: "CALM",
  path: null,                 // BUYER | TRADER | AGENT
  answers: {},                // key -> { value, pending }
  log: ["Voss-Only wizard ready."],
  flow: [],                   // computed list of keys
  lastSavedKey: null,
};

/* =========================
   QUESTION DEFINITIONS
========================= */

const QUESTIONS = {
  // --- Bookends
  greeting: q({
    section: "Opening",
    base: "Greeting",
    type: "single",
    options: ["Start"],
  }),

  closing: q({
    section: "Closing",
    base: "Gratitude",
    type: "single",
    options: ["Finish"],
  }),

  // --- Authority first
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

  // Company identity
  company_name: q({ section: "Company", base: "Company Name", type: "text", placeholder: "Registered company name" }),
  country_address: q({ section: "Company", base: "Country & Address", type: "text", placeholder: "Country + business address" }),
  website: q({ section: "Company", base: "Website", type: "text", placeholder: "Website or N/A", optional: true }),
  year_established: q({ section: "Company", base: "Year Established", type: "text", placeholder: "e.g., 2017", optional: true }),
  entity_type: q({ section: "Company", base: "Entity Type", type: "text", placeholder: "LLC / Corp / Partnership", optional: true }),
  contact_person: q({ section: "Company", base: "Key Contact", type: "text", placeholder: "Name, title, phone, email" }),

  // Agent/Trader path
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

  // Product requirements
  product: q({ section: "Product", base: "Product", type: "text", placeholder: "e.g., Sunflower Oil" }),
  specs: q({ section: "Product", base: "Specifications", type: "text", placeholder: "Specs/grade/standards" }),
  quantity: q({ section: "Product", base: "Quantity", type: "number", placeholder: "Quantity", unitOptions: ["MT","40ft containers","20ft containers"] }),

  packaging: q({
    section: "Product",
    base: "Packaging",
    type: "single",
    options: ["Bulk","Flexitank","Bottled","Bagged","Drums","Other"],
    optional: true,
  }),

  // Logistics
  incoterms: q({
    section: "Logistics",
    base: "Delivery Terms",
    type: "single",
    options: ["FOB","CIF","CFR","EXW","DDP","Other"],
    optional: true,
  }),

  destination_port: q({ section: "Logistics", base: "Destination Port", type: "text", placeholder: "Port name(s)" }),

  timeline: q({
    section: "Logistics",
    base: "Timeline",
    type: "single",
    options: ["Immediate","Within 30 days","Within 60 days","Within 90 days","Long-term contract"],
    optional: true,
  }),

  // Financial
  target_price: q({ section: "Financial", base: "Target Price", type: "text", placeholder: "Example: 820–860 USD/MT" }),

  primary_instrument: q({
    section: "Financial",
    base: "Primary Instrument",
    type: "single",
    options: ["LC","DLC","SBLC","TT","Escrow","Other"],
  }),

  secondary_instrument: q({
    section: "Financial",
    base: "Secondary Instrument",
    type: "single",
    options: ["None","LC","DLC","SBLC","TT","Escrow","Other"],
    optional: true,
  }),

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

  guarantees: q({
    section: "Financial",
    base: "Guarantees",
    type: "single",
    options: ["Yes","No","Depends on terms"],
    optional: true,
  }),

  docs_available: q({
    section: "Docs",
    base: "Documents",
    type: "single",
    options: ["Yes","No","Some of them","Depends"],
    optional: true,
  }),

  // Engagement
  loi_ready: q({
    section: "Engagement",
    base: "LOI/ICPO Readiness",
    type: "single",
    options: ["Yes","Needs internal approval","No"],
  }),

  contract_preference: q({
    section: "Engagement",
    base: "Contract Preference",
    type: "single",
    options: ["Long-term contract","Spot only","Both"],
    optional: true,
  }),

  compliance: q({
    section: "Compliance",
    base: "Compliance Requirements",
    type: "text",
    placeholder: "Compliance requirements (or None)",
    optional: true,
  }),

  other_commodities: q({
    section: "Relationship",
    base: "Other Commodities",
    type: "text",
    placeholder: "Other commodities (buy/sell)",
    optional: true,
  }),

  // Verification gate (only when risk elevated)
  verification_gate: q({
    section: "Verification",
    base: "Verification Preference",
    type: "text",
    placeholder: "Verification preference",
    showIf: (s) => computeRisk(s) >= 45
  }),
};

/* =========================
   FLOW BUILDER
========================= */

function buildFlow() {
  const flow = ["greeting","authority"];

  if (!state.path) {
    const auth = getVal(state, "authority");
    if (auth === "I’m a trader/agent/mandate (representing a buyer)") state.path = "AGENT";
  }

  if (shouldAsk("role")) flow.push("role");

  // Company
  flow.push("company_name","country_address","contact_person");
  if (shouldAsk("website")) flow.push("website");
  if (shouldAsk("year_established")) flow.push("year_established");
  if (shouldAsk("entity_type")) flow.push("entity_type");

  // Agent/Trader
  if (shouldAsk("principal_disclosure")) flow.push("principal_disclosure");
  if (shouldAsk("mandate")) flow.push("mandate");

  // Business profile
  if (shouldAsk("core_activity")) flow.push("core_activity");
  if (shouldAsk("licenses")) flow.push("licenses");

  // Product
  flow.push("product","specs","quantity");
  if (shouldAsk("packaging")) flow.push("packaging");

  // Logistics
  if (shouldAsk("incoterms")) flow.push("incoterms");
  flow.push("destination_port");
  if (shouldAsk("timeline")) flow.push("timeline");

  // Financial
  flow.push("target_price","primary_instrument");
  if (shouldAsk("secondary_instrument")) flow.push("secondary_instrument");
  if (shouldAsk("issuing_bank")) flow.push("issuing_bank");
  if (shouldAsk("guarantees")) flow.push("guarantees");
  if (shouldAsk("docs_available")) flow.push("docs_available");

  // Engagement + compliance
  flow.push("loi_ready");
  if (shouldAsk("contract_preference")) flow.push("contract_preference");
  if (shouldAsk("compliance")) flow.push("compliance");

  // Verification inserted when needed
  if (shouldAsk("verification_gate")) flow.push("verification_gate");

  // Relationship expansion
  if (shouldAsk("other_commodities")) flow.push("other_commodities");

  // Close
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
   SCORING
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

function computePhase() {
  const pct = state.flow.length ? Math.round(((state.idx + 1) / state.flow.length) * 100) : 0;
  if (pct < 45) return "QUALIFY";
  if (pct < 80) return "ALIGN";
  return "LEVERAGE";
}

/* =========================
   VOSS-ONLY PROMPT ENGINE
   - Main prompt is always Voss style.
   - Dynamic variations based on temperature + risk + answer quality.
========================= */

function vossPrompt(key) {
  const Q = QUESTIONS[key];
  const risk = computeRisk(state);
  const temp = state.temperature;
  const a = state.answers[key]?.value;
  const empty = !hasValue(a);

  // Greeting and closing are scripted
  if (key === "greeting") {
    return {
      main: "Hi — thanks for taking the time. Before we get into details, can I quickly confirm a few basics so we keep this efficient?",
      steering: [
        "My goal is simple: get you a clean offer that matches your terms without back-and-forth."
      ]
    };
  }

  if (key === "closing") {
    return {
      main: "I appreciate your time today. Based on what you shared, the next step is for us to prepare the offer package. What’s the best way to keep momentum from here — email, WhatsApp, or a scheduled follow-up?",
      steering: [
        "And just so we keep opportunities flowing — what other commodities are you consistently buying or selling?"
      ]
    };
  }

  // Temperature framing
  const soften = (temp === "GUARDED" || temp === "DEFENSIVE" || temp === "RESISTANT");
  const opener = soften
    ? "Help me understand—"
    : "So we don’t waste cycles—";

  // Risk-based tightening (without sounding accusatory)
  const tighten = risk >= 50 ? "Just so we keep this clean and executable—" : "";

  // Base Voss prompts by key
  const MAP = {
    authority: [
      `${opener}are you the person who can approve and sign this, or does it go through someone else?`,
      `So I route this correctly—who makes the final call on this purchase?`
    ],

    role: [
      `${opener}are you buying for end use, distributing, trading, or acting as an agent?`,
      `Where do you sit in the chain on this one—end buyer, distributor, trader, or agent?`
    ],

    company_name: [
      `${opener}what’s the exact registered company name that will appear on the documents?`
    ],

    country_address: [
      `${opener}what country is the buying entity registered in, and what business address should be tied to the deal?`
    ],

    contact_person: [
      `${opener}who should we treat as the key point of contact—name, title, and best number/email?`
    ],

    principal_disclosure: [
      `${tighten}${opener}who is the end buyer / principal you represent—company name and country?`
    ],

    mandate: [
      `${opener}do you have mandate authorization to negotiate and submit LOI/ICPO for the principal?`
    ],

    product: [
      `${opener}what’s the exact product you want us to source?`
    ],

    specs: [
      `${opener}what specs or standards are non-negotiable for you on quality?`
    ],

    quantity: [
      `${opener}what quantity do you want to start with—MT or containers?`
    ],

    packaging: [
      `${opener}how do you want it packaged—bulk, flexitank, bottled, bagged, drums, or something else?`
    ],

    incoterms: [
      `${opener}which terms do you want—FOB, CIF, CFR, or something else?`
    ],

    destination_port: [
      `${opener}what destination port should we price to?`
    ],

    timeline: [
      `${opener}what delivery timing are you working against—immediate, 30/60/90, or contract?`
    ],

    target_price: [
      // You wanted them to disclose before you “structure the best offer”
      `${tighten}${opener}what target price range per MT are you aiming for?`,
      `What number makes this a “yes” for you per MT—before we spend time building the offer?`
    ],

    primary_instrument: [
      `${tighten}${opener}what primary payment instrument will you use—LC, DLC, SBLC, TT, escrow, or other?`
    ],

    secondary_instrument: [
      `${opener}do you have a backup instrument option available if needed?`
    ],

    issuing_bank: [
      `${tighten}${opener}which bank will issue the instrument (name + country) so we stay aligned from day one?`
    ],

    guarantees: [
      `${opener}if the supplier requires it, are you open to escrow/performance bond/financial guarantees—or is that a hard no?`
    ],

    docs_available: [
      `${opener}if requested, what’s easiest for you to provide—company profile, CIS, or a BCL/POF?`
    ],

    loi_ready: [
      `${tighten}${opener}once terms align, are you ready to issue LOI/ICPO on letterhead so we can move quickly?`
    ],

    contract_preference: [
      `${opener}is this spot only, long-term contract, or both?`
    ],

    compliance: [
      `${opener}any compliance or regulatory requirements on your side that we should design around up front?`
    ],

    other_commodities: [
      `${opener}besides this product, what other commodities are you consistently buying or selling?`
    ],

    verification_gate: [
      // Only appears when risk elevated
      `${tighten}How do you prefer we verify capability in a way that respects your time and keeps momentum?`
    ],
  };

  const list = MAP[key] || [`${opener}${Q?.base ? `for ${Q.base},` : ""} what’s the simplest accurate answer on your side?`];

  // Dynamic steering lines (these replace “suggestions” with closing guidance)
  const steering = [];

  if (empty && (temp === "DEFENSIVE" || temp === "RESISTANT")) {
    steering.push("It seems like this part might be sensitive. What’s the easiest way to answer it without going deep?");
  }

  if (key === "target_price" && empty) {
    steering.push("If you give me your target range, I can structure an offer that actually fits your approval path.");
  }

  if (key === "issuing_bank" && empty && risk >= 50) {
    steering.push("This helps us avoid offers that look good on paper but can’t clear banking in real life.");
  }

  if ((key === "mandate" || key === "principal_disclosure") && state.path !== "BUYER") {
    steering.push("Sounds like speed matters. Getting clarity here prevents delays later without adding friction.");
  }

  // Pick a main prompt (first option)
  return { main: list[0], alt: list[1] || "", steering };
}

/* =========================
   UI RENDER
========================= */

function renderDashboard() {
  state.mode = "dashboard";
  resolvePathFromAnswers();
  buildFlow();

  const risk = computeRisk(state);
  const phase = computePhase();

  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Dashboard</h2>
      <div style="margin:8px 0;">Path: <b>${escapeHtml(state.path || "—")}</b></div>
      <div style="margin:8px 0;">Phase: <b>${phase}</b></div>
      <div style="margin:8px 0;">Risk: <b>${risk}</b>/100</div>
      <div style="margin:8px 0;">Temperature: <b>${escapeHtml(state.temperature)}</b></div>

      <div style="margin:12px 0; display:flex; gap:10px; flex-wrap:wrap;">
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

  if (state.idx >= state.flow.length) state.idx = state.flow.length - 1;
  if (state.idx < 0) state.idx = 0;

  const key = state.flow[state.idx];
  const Q = QUESTIONS[key];
  const A = state.answers[key] || { value: "", pending: false };

  const risk = computeRisk(state);
  const phase = computePhase();

  const VP = vossPrompt(key);
  const showAlt = VP.alt && VP.alt.length > 0;

  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding:20px;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">Call Mode</h2>
          <div style="opacity:0.8; font-size:12px;">Path: <b>${escapeHtml(state.path)}</b> • Phase: <b>${phase}</b> • Step ${state.idx+1}/${state.flow.length}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px; opacity:0.8;">Risk: <b>${risk}</b>/100</div>
          <div style="font-size:12px; opacity:0.8;">Temperature: <b>${escapeHtml(state.temperature)}</b></div>
        </div>
      </div>

      <div style="margin-top:14px; padding:12px; background:#132A3A; border-radius:10px;">
        <div style="opacity:0.75; font-size:12px;">${escapeHtml(Q.section)} • Key: <b>${escapeHtml(key)}</b></div>

        <div style="margin-top:8px; font-size:16px;"><b>${escapeHtml(VP.main)}</b></div>

        ${showAlt ? `
          <div style="margin-top:8px; opacity:0.85; font-size:13px;">
            Alternative: <span style="opacity:0.9;">${escapeHtml(VP.alt)}</span>
            <button onclick="copyLine(${JSON.stringify(VP.alt)})" style="margin-left:8px;">Copy alt</button>
          </div>
        ` : ""}

        ${VP.steering && VP.steering.length ? `
          <div style="margin-top:10px; padding:10px; background:rgba(11,28,45,0.55); border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
            <div style="opacity:0.85; font-size:12px; margin-bottom:6px;"><b>Steering</b> (use if needed):</div>
            ${VP.steering.map(line => `
              <div style="display:flex; gap:10px; align-items:flex-start; margin:6px 0;">
                <div style="flex:1; font-size:13px;">${escapeHtml(line)}</div>
                <button onclick="copyLine(${JSON.stringify(line)})">Copy</button>
              </div>
            `).join("")}
          </div>
        ` : ""}

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
   INPUT / SAVE
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

  A.pending = false;
  state.answers[key] = A;
  state.lastSavedKey = key;

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
  state.lastSavedKey = key;

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
   NAV
========================= */

function next() {
  save();
  if (state.idx < state.flow.length - 1) state.idx++;
  renderCallMode();
}

function back() {
  save();
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
   SUMMARY
========================= */

async function copySummary() {
  resolvePathFromAnswers();
  buildFlow();

  const risk = computeRisk(state);
  const phase = computePhase();

  const lines = [];
  lines.push("NAUTILUS SALES SYSTEM — DEAL SUMMARY");
  lines.push(`Path: ${state.path}`);
  lines.push(`Phase: ${phase}`);
  lines.push(`Risk: ${risk}/100`);
  lines.push(`Temperature: ${state.temperature}`);
  lines.push("");
  lines.push("Answers:");

  for (const k of state.flow) {
    if (k === "greeting" || k === "closing") continue;
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
    log("Summary copied ✅");
  } catch {
    log("Copy blocked by browser — copy manually from screen if needed.");
  }

  if (state.mode === "call") renderCallMode();
  else renderDashboard();
}

async function copyLine(line) {
  try {
    await navigator.clipboard.writeText(line);
    log("Copied line ✅");
  } catch {
    log("Copy blocked — select/copy manually.");
  }
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
resolvePathFromAnswers();
buildFlow();
renderDashboard();

window.renderDashboard = renderDashboard;
window.renderCallMode = renderCallMode;
window.resetDeal = resetDeal;
window.copySummary = copySummary;
window.copyLine = copyLine;

window.next = next;
window.back = back;
window.save = save;
window.finish = finish;
window.pick = pick;
window.setPending = setPending;
window.setTemp = setTemp;
