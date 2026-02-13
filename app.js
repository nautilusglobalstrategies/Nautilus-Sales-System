console.log("NSS Operational: Voss-Only + Opening Script + Pre-Close + Dynamic Close + Momentum + Intel Toggle ✅");

let state = {
  mode: "dashboard",
  idx: 0,

  // Conversation dynamics
  temperature: "CALM", // CALM | GUARDED | DEFENSIVE | RESISTANT
  path: null,          // BUYER | TRADER | AGENT

  // Data capture
  answers: {},         // key -> { value, pending }

  // Flow
  flow: [],

  // Intelligence
  risk: 0,
  momentum: 40,        // per-deal reset baseline
  showIntel: false,    // toggle in Call Mode header

  // UI
  openingOpen: true,

  // Logs
  log: ["System ready."],
};

/* =========================
   QUESTIONS (data capture)
========================= */

const QUESTIONS = {
  // Opening is a script block (not a question). We still keep a quick "time check" answer.
  opening_time_check: q({
    section: "Opening",
    base: "Time Check",
    type: "single",
    options: ["Yes — quick moment", "No — schedule"],
  }),

  // Authority/profile
  authority: q({
    section: "Authority",
    base: "Authority Routing",
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

  // Company info
  company_name: q({ section: "Company", base: "Company Name", type: "text", placeholder: "Registered company name" }),
  country_address: q({ section: "Company", base: "Country & Address", type: "text", placeholder: "Country + business address" }),
  website: q({ section: "Company", base: "Website", type: "text", placeholder: "Website or N/A", optional: true }),
  year_established: q({ section: "Company", base: "Year Established", type: "text", placeholder: "e.g., 2017", optional: true }),
  entity_type: q({ section: "Company", base: "Entity Type", type: "text", placeholder: "LLC / Corp / Partnership", optional: true }),
  contact_person: q({ section: "Company", base: "Key Contact", type: "text", placeholder: "Name, title, phone, email" }),

  // Business profile
  core_activity: q({
    section: "Business Profile",
    base: "Core Activity",
    type: "text",
    placeholder: "One sentence",
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

  // Agent/trader disclosures
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

  // Product
  product: q({ section: "Product", base: "Product", type: "text", placeholder: "e.g., Sunflower Oil" }),
  specs: q({ section: "Product", base: "Specifications", type: "text", placeholder: "Grade/standards/certs" }),
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

  // Verification (risk-triggered)
  verification_gate: q({
    section: "Verification",
    base: "Verification Preference",
    type: "text",
    placeholder: "Verification preference",
    showIf: (s) => computeRisk(s) >= 45
  }),

  // Relationship expansion
  other_commodities: q({
    section: "Relationship",
    base: "Other Commodities",
    type: "text",
    placeholder: "Other commodities you buy/sell",
    optional: true,
  }),

  // Close step (not required data; used for selectable closing scripts)
  closing: q({
    section: "Closing",
    base: "Close",
    type: "single",
    options: ["Finish"],
  }),
};

/* =========================
   FLOW (branching)
========================= */

function buildFlow() {
  const flow = [];

  // Opening script is rendered in Call Mode header area; we still capture a "time check"
  flow.push("opening_time_check");

  // Qualification starts
  flow.push("authority");
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

  // Closing selection step
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

function shouldAsk(key) {
  const Q = QUESTIONS[key];
  if (!Q) return false;
  if (typeof Q.showIf === "function") return !!Q.showIf(state);
  return true;
}

/* =========================
   RISK + MOMENTUM
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

function momentumBand(m) {
  if (m < 30) return "Fragile";
  if (m < 60) return "Neutral";
  if (m < 80) return "Aligned";
  return "Closing Window";
}

function adjustMomentum(delta, label) {
  state.momentum = clamp(state.momentum + delta, 0, 100);
  log(`Momentum ${delta >= 0 ? "+" : ""}${delta} (${label}) → ${state.momentum} (${momentumBand(state.momentum)})`);
}

/* =========================
   VOSS-ONLY PROMPTS (main)
========================= */

function vossPrompt(key) {
  const temp = state.temperature;
  const risk = state.risk;
  const soften = (temp !== "CALM");
  const opener = soften ? "Help me understand—" : "So we don’t waste time—";
  const tighten = (risk >= 50) ? "Just so we keep this executable—" : "";

  // Special: opening_time_check is answered after your script
  if (key === "opening_time_check") {
    return "Do you have a quick moment?";
  }

  const MAP = {
    authority: `${opener}who should this go through on your side—are you the signer, or does it route to someone else?`,
    role: `${opener}are you buying for end use, distributing, trading, or acting as an agent?`,

    company_name: `${opener}what’s the exact registered company name that should appear on the documents?`,
    country_address: `${opener}what country is the buyer entity registered in, and what business address ties to the deal?`,
    contact_person: `${opener}who’s the best day-to-day contact—name, title, phone/email?`,

    website: `${opener}what’s the company website (or is it N/A)?`,
    year_established: `${opener}what year was the company established?`,
    entity_type: `${opener}what entity type is it (LLC, corporation, partnership, etc.)?`,

    principal_disclosure: `${tighten}${opener}who is the principal/end buyer you represent—company name and country?`,
    mandate: `${tighten}${opener}do you have mandate authorization to negotiate and submit LOI/ICPO for the principal?`,

    core_activity: `${opener}what’s your core business activity in one sentence?`,
    licenses: `${opener}do you currently have the import/export licensing needed for this product?`,

    product: `${opener}what exact product are we sourcing?`,
    specs: `${opener}what specs or standards are non-negotiable for you on quality?`,
    quantity: `${opener}what quantity are you targeting—MT or containers?`,
    packaging: `${opener}how do you want it packaged—bulk, flexitank, bottled, bagged, drums, or other?`,

    incoterms: `${opener}which terms do you want—FOB, CIF, CFR, or other?`,
    destination_port: `${opener}what destination port should we price to?`,
    timeline: `${opener}what timing are you working against—immediate, 30/60/90, or contract?`,

    target_price: `${tighten}${opener}what target price range per MT are you aiming for?`,
    primary_instrument: `${tighten}${opener}what primary payment instrument will you use—LC, DLC, SBLC, TT, escrow, or other?`,
    secondary_instrument: `${opener}do you have a backup instrument option available if needed?`,
    issuing_bank: `${tighten}${opener}which bank will issue the instrument (name + country) so we stay aligned from day one?`,

    guarantees: `${opener}if required, are you open to escrow/performance bond/financial guarantees—or is that a hard no?`,
    docs_available: `${opener}if requested, can you provide company profile, buyer CIS, and BCL/POF—or which of those is easiest?`,

    loi_ready: `${tighten}${opener}once terms align, are you ready to issue LOI or ICPO on letterhead so we can move quickly?`,
    contract_preference: `${opener}is this spot only, long-term contract, or both?`,
    compliance: `${opener}any regulatory or compliance requirements we should design around up front?`,

    verification_gate: `${tighten}How do you prefer we verify capability in a way that respects your time and keeps momentum?`,
    other_commodities: `${opener}besides this product, what other commodities are you consistently buying or selling?`,
  };

  if (key === "closing") {
    return "Select a closing that fits the temperature and keeps the relationship strong.";
  }

  return MAP[key] || `${opener}what’s the simplest accurate answer on your side?`;
}

/* =========================
   OPENING SCRIPT (collapsible)
========================= */

function openingScriptBlock() {
  const name = getVal(state, "opening_name") || "[Name]";
  const product = getVal(state, "product") || "[Product]";
  const qty = getVal(state, "quantity") || "[Quantity]";
  const dest = getVal(state, "destination_port") || "[Destination]";

  // Your exact wording + time substitution
  const script = [
    `Hi ${name}, this is [Your Name] calling from the Commodity Resource Center.`,
    `You recently submitted an inquiry for ${product} ${qty} to ${dest}.`,
    `I’m calling to review your request and move this forward.`,
    ``,
    `Do you have a quick moment?`,
    ``,
    `Perfect. Our procurement team has reviewed your inquiry and we can fulfill this through our verified network of suppliers.`,
    ``,
    `So we don’t waste time on revisions, I’ll confirm a few details on your side to prepare your Soft Corporate Offer accurately.`,
    `This usually only takes a few minutes.`,
  ].join("\n");

  return `
    <div style="margin-top:12px; padding:12px; background:#132A3A; border-radius:10px; border:1px solid rgba(198,169,74,0.35);">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
        <div style="font-size:13px;"><b>Opening Script</b> <span style="opacity:0.75;">(click to copy)</span></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button onclick="toggleOpening()">${state.openingOpen ? "Hide" : "Show"}</button>
          <button onclick="copyLine(${JSON.stringify(script)})">Copy</button>
        </div>
      </div>

      ${state.openingOpen ? `
        <div style="margin-top:10px; white-space:pre-wrap; font-size:13px; line-height:1.35; opacity:0.95;">
          ${escapeHtml(script)}
        </div>
        <div style="margin-top:10px; font-size:12px; opacity:0.8;">
          Tip: As you collect answers, this script auto-fills product/qty/destination.
        </div>
      ` : ""}
    </div>
  `;
}

/* =========================
   PRE-CLOSE (subtle, last 2 qualifying steps)
========================= */

function isWithinLastTwoQualSteps() {
  // Identify "closing" step index and show on the two steps right before it
  const closingIdx = state.flow.indexOf("closing");
  if (closingIdx === -1) return false;
  return state.idx >= closingIdx - 2 && state.idx < closingIdx;
}

function preCloseOptions() {
  const t = state.temperature;
  const r = state.risk;

  // Base options by temperature (relationship-safe, Voss style)
  const base = {
    CALM: [
      { type:"commit", delta:+10, text:"If the offer reflects your pricing and instrument structure, are you comfortable issuing LOI to secure allocation?" },
      { type:"process", delta:+6, text:"Once we align terms, is there anything that would prevent this from moving forward on your side?" },
      { type:"tighten", delta:+2, text:"What’s the best next step to keep momentum—email, WhatsApp, or a scheduled follow-up?" },
    ],
    GUARDED: [
      { type:"comfort", delta:+6, text:"What would make this easiest for you on your side as we move forward?" },
      { type:"conditions", delta:+6, text:"What would need to be true in the offer for this to move forward internally?" },
      { type:"clarity", delta:+2, text:"Is there anything you’d rather resolve now than after the offer is drafted?" },
    ],
    DEFENSIVE: [
      { type:"trust", delta:+4, text:"What would you need to see in the offer to feel comfortable moving to LOI?" },
      { type:"clarify", delta:+2, text:"Is there anything about banking or structure you want transparent up front?" },
      { type:"bridge", delta:+2, text:"What’s the simplest next step that keeps this moving without pressure?" },
    ],
    RESISTANT: [
      { type:"autonomy", delta:-1, text:"Would it make more sense to reconnect once internal timing aligns on your side?" },
      { type:"review", delta:+1, text:"If we outline this cleanly, would you at least be open to reviewing it?" },
      { type:"schedule", delta:+1, text:"When would be a better time to revisit this so it aligns with your process?" },
    ],
  }[t] || [];

  // Risk overlay (tighten without sounding accusatory)
  const overlay = [];
  if (r >= 60) {
    overlay.push({ type:"exec", delta:+2, text:"Who specifically reviews the terms internally, and what criteria do they use to approve?" });
  }
  if (r >= 50 && !hasValue(getVal(state, "issuing_bank")) && (getVal(state, "primary_instrument") || "") !== "TT") {
    overlay.push({ type:"bank", delta:+2, text:"To keep this executable, which bank will issue the instrument on your side?" });
  }

  return [...overlay, ...base].slice(0, 4);
}

function preCloseBlock() {
  if (!isWithinLastTwoQualSteps()) return "";

  const opts = preCloseOptions();
  if (!opts.length) return "";

  return `
    <div style="margin-top:12px; padding:12px; background:rgba(11,28,45,0.55); border-radius:10px; border:1px solid rgba(198,169,74,0.22);">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
        <div style="font-size:12px; opacity:0.85;"><b>Pre-Close Intelligence</b> <span style="opacity:0.7;">(subtle • always visible here)</span></div>
        ${state.showIntel ? `<div style="font-size:12px; opacity:0.75;">Temp: <b>${escapeHtml(state.temperature)}</b> • Risk: <b>${state.risk}</b> • Momentum: <b>${state.momentum}</b> (${momentumBand(state.momentum)})</div>` : ""}
      </div>

      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        ${opts.map(o => `
          <button style="text-align:left; max-width:100%;" onclick="usePreClose(${JSON.stringify(o)})">
            ${escapeHtml(o.text)}
          </button>
        `).join("")}
      </div>

      <div style="margin-top:8px; font-size:12px; opacity:0.7;">
        Tip: click one to copy it, and the system updates momentum automatically.
      </div>
    </div>
  `;
}

/* =========================
   CLOSING SUGGESTIONS (clickable)
========================= */

function closingOptions() {
  const t = state.temperature;
  const r = state.risk;

  const base = {
    CALM: [
      { type:"forward", delta:+8, text:"I appreciate your time today. Based on what you shared, we’ll prepare your Soft Corporate Offer aligned to your pricing and instrument structure. What’s the best way to keep momentum—email, WhatsApp, or a scheduled follow-up?" },
      { type:"commit", delta:+10, text:"I appreciate your time today. If the offer reflects your terms, are you comfortable issuing LOI so we can secure allocation quickly?" },
    ],
    GUARDED: [
      { type:"collab", delta:+6, text:"I appreciate your time today. We’ll structure this around what you outlined so it fits your internal process. What would make this easiest for you on your side as we move forward?" },
      { type:"options", delta:+4, text:"I appreciate your time today. Would it help if we structured two clean options for internal review—one optimized for price and one for speed/certainty?" },
    ],
    DEFENSIVE: [
      { type:"stabilize", delta:+4, text:"I appreciate you walking through this with me. Our role is to align verified supply with executable terms. What would you need to see in the offer to feel comfortable moving to LOI?" },
      { type:"transparent", delta:+3, text:"I appreciate your time today. Would it help if we outlined the instrument flow step-by-step so there are no surprises?" },
    ],
    RESISTANT: [
      { type:"preserve", delta:+1, text:"I appreciate your time regardless. We’ll outline this cleanly based on today’s discussion. If it makes sense, we can reconnect once you’ve reviewed." },
      { type:"schedule", delta:+1, text:"I appreciate your time today. When would be a better time to revisit this so it aligns with your internal timing?" },
    ],
  }[t] || [];

  const overlay = [];
  if (r >= 60) {
    overlay.push({ type:"verify", delta:+2, text:"To keep this executable, what’s the cleanest verification step you’re comfortable with first—CIS, BCL/POF, or bank introduction?" });
  }

  return [...overlay, ...base].slice(0, 3);
}

function closingBlock() {
  const opts = closingOptions();
  return `
    <div style="margin-top:12px; padding:12px; background:rgba(11,28,45,0.55); border-radius:10px; border:1px solid rgba(198,169,74,0.22);">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
        <div style="font-size:12px; opacity:0.85;"><b>Closing Suggestions</b> <span style="opacity:0.7;">(click to copy)</span></div>
        ${state.showIntel ? `<div style="font-size:12px; opacity:0.75;">Temp: <b>${escapeHtml(state.temperature)}</b> • Risk: <b>${state.risk}</b> • Momentum: <b>${state.momentum}</b> (${momentumBand(state.momentum)})</div>` : ""}
      </div>
      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        ${opts.map(o => `
          <button style="text-align:left; max-width:100%;" onclick="useClose(${JSON.stringify(o)})">
            ${escapeHtml(o.text)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

/* =========================
   RENDER
========================= */

function renderDashboard() {
  state.mode = "dashboard";
  resolvePathFromAnswers();
  buildFlow();

  state.risk = computeRisk(state);

  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding:20px;">
      <h2 style="margin:0 0 10px 0;">Dashboard</h2>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <div style="padding:10px; background:#132A3A; border-radius:10px;">Path: <b>${escapeHtml(state.path || "—")}</b></div>
        <div style="padding:10px; background:#132A3A; border-radius:10px;">Risk: <b>${state.risk}</b>/100</div>
        <div style="padding:10px; background:#132A3A; border-radius:10px;">Temp: <b>${escapeHtml(state.temperature)}</b></div>
        <div style="padding:10px; background:#132A3A; border-radius:10px;">Momentum: <b>${state.momentum}</b> (${momentumBand(state.momentum)})</div>
      </div>

      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
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

  state.risk = computeRisk(state);

  if (state.idx >= state.flow.length) state.idx = state.flow.length - 1;
  if (state.idx < 0) state.idx = 0;

  const key = state.flow[state.idx];
  const Q = QUESTIONS[key];
  const A = state.answers[key] || { value: "", pending: false };

  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="padding:20px;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
        <div>
          <h2 style="margin:0;">Call Mode</h2>
          <div style="opacity:0.8; font-size:12px;">Step ${state.idx+1}/${state.flow.length} • ${escapeHtml(Q.section)} • Key: <b>${escapeHtml(key)}</b></div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <label style="padding:8px 10px; background:#132A3A; border-radius:10px; font-size:12px; opacity:0.9;">
            <input type="checkbox" ${state.showIntel ? "checked" : ""} onchange="toggleIntel(this.checked)" />
            Show Intelligence Overlay
          </label>

          <button onclick="renderDashboard()">Dashboard</button>
        </div>
      </div>

      ${state.showIntel ? `
        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <div style="padding:10px; background:#132A3A; border-radius:10px; font-size:12px;">Path: <b>${escapeHtml(state.path)}</b></div>
          <div style="padding:10px; background:#132A3A; border-radius:10px; font-size:12px;">Risk: <b>${state.risk}</b>/100</div>
          <div style="padding:10px; background:#132A3A; border-radius:10px; font-size:12px;">Momentum: <b>${state.momentum}</b> (${momentumBand(state.momentum)})</div>
          <div style="padding:10px; background:#132A3A; border-radius:10px; font-size:12px;">Temp: <b>${escapeHtml(state.temperature)}</b></div>
        </div>
      ` : ""}

      ${openingScriptBlock()}

      <div style="margin-top:14px; padding:12px; background:#132A3A; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
        <div style="opacity:0.75; font-size:12px;">${escapeHtml(Q.section)}</div>
        <div style="margin-top:8px; font-size:16px; line-height:1.35;"><b>${escapeHtml(vossPrompt(key))}</b></div>

        <div style="margin-top:12px;">
          ${renderInput(key, Q, A)}
        </div>

        <div style="margin-top:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; align-items:center;">
          <label style="font-size:12px; opacity:0.9;">
            <input type="checkbox" ${A.pending ? "checked" : ""} onchange="setPending('${key}', this.checked)" />
            CRM Pending
          </label>

          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button onclick="back()" ${state.idx===0 ? "disabled" : ""}>Back</button>
            <button onclick="save()">Save</button>
            <button onclick="next()">Next</button>
            <button onclick="copySummary()">Copy Summary</button>
          </div>
        </div>

        ${preCloseBlock()}

        ${key === "closing" ? closingBlock() : ""}
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

  return "";
}

function autosaveCurrent() {
  const key = state.flow[state.idx];
  const Q = QUESTIONS[key];
  if (!Q) return;

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

  state.answers[key] = A;
}

function save() {
  autosaveCurrent();
  const key = state.flow[state.idx];
  log(`Saved: ${key}`);
  resolvePathFromAnswers();
  buildFlow();
  state.risk = computeRisk(state);
  renderCallMode();
}

function pick(key, value) {
  state.answers[key] = { value, pending: false };
  log(`Selected: ${key} = ${value}`);
  resolvePathFromAnswers();
  buildFlow();
  state.risk = computeRisk(state);
  renderCallMode();
}

function setPending(key, checked) {
  const A = state.answers[key] || { value: "", pending: false };
  A.pending = checked;
  state.answers[key] = A;
  log(`${key} ${checked ? "marked PENDING" : "marked ANSWERED"}`);
}

function setTemp(t) {
  const prev = state.temperature;
  state.temperature = t;
  log(`Temp: ${prev} → ${t}`);
  renderCallMode();
}

/* =========================
   PRE-CLOSE / CLOSE ACTIONS
========================= */

async function usePreClose(opt) {
  try { await navigator.clipboard.writeText(opt.text); } catch {}
  adjustMomentum(opt.delta, `Pre-close: ${opt.type}`);
  renderCallMode();
}

async function useClose(opt) {
  try { await navigator.clipboard.writeText(opt.text); } catch {}
  adjustMomentum(opt.delta, `Close: ${opt.type}`);
  log("Closing copied ✅");
  // Move to dashboard after closing choice (optional)
  // renderDashboard();
  renderCallMode();
}

/* =========================
   NAV
========================= */

function next() {
  autosaveCurrent();
  if (state.idx < state.flow.length - 1) state.idx++;
  renderCallMode();
}

function back() {
  autosaveCurrent();
  if (state.idx > 0) state.idx--;
  renderCallMode();
}

function resetDeal() {
  state.idx = 0;
  state.path = null;
  state.temperature = "CALM";
  state.answers = {};
  state.flow = [];
  state.risk = 0;
  state.momentum = 40; // per-deal reset (A)
  state.openingOpen = true;
  state.log = ["New deal started."];
  resolvePathFromAnswers();
  buildFlow();
  renderDashboard();
}

function toggleIntel(on) {
  state.showIntel = !!on;
  renderCallMode();
}

function toggleOpening() {
  state.openingOpen = !state.openingOpen;
  renderCallMode();
}

/* =========================
   SUMMARY (HubSpot ready)
========================= */

async function copySummary() {
  resolvePathFromAnswers();
  buildFlow();
  state.risk = computeRisk(state);

  const lines = [];
  lines.push("NAUTILUS SALES SYSTEM — DEAL SUMMARY");
  lines.push(`Path: ${state.path}`);
  lines.push(`Temperature: ${state.temperature}`);
  lines.push(`Risk: ${state.risk}/100`);
  lines.push(`Momentum: ${state.momentum} (${momentumBand(state.momentum)})`);
  lines.push("");
  lines.push("Answers:");

  for (const k of state.flow) {
    if (k === "closing") continue;
    const Q = QUESTIONS[k];
    const A = state.answers[k];
    if (!A) continue;
    const v = A.pending ? "[PENDING]" : (A.value || "");
    if (!hasValue(v) && Q.optional) continue;
    lines.push(`- ${k}: ${v}`);
  }

  const txt = lines.join("\n");
  try { await navigator.clipboard.writeText(txt); log("Summary copied ✅"); } catch { log("Copy blocked by browser."); }
  if (state.mode === "call") renderCallMode();
  else renderDashboard();
}

async function copyLine(line) {
  try { await navigator.clipboard.writeText(line); log("Copied ✅"); } catch { log("Copy blocked by browser."); }
  if (state.mode === "call") renderCallMode();
}

/* =========================
   UTIL
========================= */

function q(o){ return o; }
function getVal(s, key){ return s.answers[key]?.value; }
function hasValue(v){
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
function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }
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
state.risk = computeRisk(state);
renderDashboard();

// Expose globals for your index.html top buttons
window.renderDashboard = renderDashboard;
window.renderCallMode = renderCallMode;

// Expose controls used by inline onclick handlers
window.next = next;
window.back = back;
window.save = save;
window.pick = pick;
window.setPending = setPending;
window.setTemp = setTemp;

window.resetDeal = resetDeal;
window.copySummary = copySummary;
window.copyLine = copyLine;

window.toggleIntel = toggleIntel;
window.toggleOpening = toggleOpening;

window.usePreClose = usePreClose;
window.useClose = useClose;
