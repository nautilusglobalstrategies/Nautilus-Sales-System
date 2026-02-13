console.log("NSS Smart Branching + Voss Assist (B) + Advanced Toggle (C) loaded ✅");

/* =========================================================
   GLOBALS expected by your index.html onclick:
   - renderDashboard()
   - renderCallMode()
========================================================= */

let state = {
  mode: "dashboard",
  idx: 0,
  temperature: "CALM",
  path: null,                 // "BUYER" | "TRADER" | "AGENT"
  answers: {},                // key -> { value, pending }
  log: ["Smart Branching ready."],
  flow: [],                   // computed list of question keys in order

  // Voice layers
  vossAssist: true,           // B layer visibility
  advancedMode: false,        // C layer visibility (toggle)
  vossOpen: {},               // per-question collapse state
};

/* =========================
   QUESTION DEFINITIONS
========================= */

const QUESTIONS = {
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

  role: q({
    section: "Profile",
    prompt: "Where do you sit in the chain for this deal?",
    type: "single",
    options: ["End Buyer", "Distributor", "Trader", "Agent"],
    showIf: (s) => s.path !== "AGENT",
  }),

  company_name: q({ section: "Company", prompt: "What’s the exact registered company name on your documents?", type: "text", placeholder: "Registered Company Name" }),
  country_address: q({ section: "Company", prompt: "Country of registration + business address tied to this transaction?", type: "text", placeholder: "Country + Address" }),
  website: q({ section: "Company", prompt: "Company website (or N/A)?", type: "text", placeholder: "Website or N/A", optional: true }),
  year_established: q({ section: "Company", prompt: "What year was the company established?", type: "text", placeholder: "e.g., 2017", optional: true }),
  entity_type: q({ section: "Company", prompt: "Entity type (LLC, Corporation, Partnership, etc.)?", type: "text", placeholder: "LLC / Corp / Partnership", optional: true }),
  contact_person: q({ section: "Company", prompt: "Key contact (full name, title, phone/email)?", type: "text", placeholder: "Name, title, phone, email" }),

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

  core_activity: q({
    section: "Business Profile",
    prompt: "What’s your company’s core business activity (one sentence)?",
    type: "text",
    placeholder: "Core activity",
    optional: true,
    showIf: (s) => s.path !== "AGENT",
  }),

  licenses: q({
    section: "Business Profile",
    prompt: "Do you currently have import/export licenses relevant to this product?",
    type: "single",
    options: ["Yes", "No", "In process", "Not required / unsure"],
    optional: true,
    showIf: (s) => s.path !== "AGENT",
  }),

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
      return prim && prim !== "TT";
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

  verification_gate: q({
    section: "Verification",
    prompt: "So we can protect both sides — what’s the cleanest way for us to verify capability (without creating friction on your side)?",
    type: "text",
    placeholder: "Verification preference",
    showIf: (s) => computeRisk(s) >= 45
  }),
};

/* =========================
   VOSS ASSIST LIBRARY (B)
   + Advanced prompts (C) are toggleable
========================= */

const VOSS = {
  authority: {
    b: {
      say: [
        "Just so I don’t waste your time—are you the person who can approve and sign this, or does it go through someone else?",
        "So I route this correctly—who makes the final call on this purchase?"
      ],
      labels: [
        "Sounds like you’re trying to keep the process tight and efficient.",
        "It seems like there’s a clear approval path here."
      ],
      followups: [
        "How does approval normally work on deals like this inside your company?",
        "What needs to be true for you to feel comfortable moving forward?"
      ]
    },
    c: {
      probes: [
        "What’s the approval process from this call to LOI/ICPO—step by step?",
        "Who else needs to be comfortable before anything is issued?"
      ]
    }
  },

  role: {
    b: {
      say: [
        "Help me understand your seat—are you buying for end use, distributing, trading, or acting as an agent?",
      ],
      labels: ["Sounds like you know exactly where you fit in the chain."],
      followups: ["How do you typically structure transactions in that role?"]
    },
    c: { probes: ["Who is the principal on paper for this transaction?"] }
  },

  target_price: {
    b: {
      say: [
        "To keep us aligned—what price range are you aiming for per MT?",
        "What number makes this a ‘yes’ for you, per MT, before we waste cycles?"
      ],
      labels: [
        "Sounds like you’re protecting your margin.",
        "It seems like you’re trying to stay inside a specific band."
      ],
      followups: [
        "How are you benchmarking price—Platts, Argus, recent imports, or something else?",
        "What’s driving that target—resale, tender requirement, or internal budget?"
      ]
    },
    c: {
      probes: [
        "If I brought an offer outside that range, what would have to change for it to still work?",
        "What’s the decision rule you use—lowest price, best terms, fastest delivery, or bank comfort?"
      ]
    }
  },

  primary_instrument: {
    b: {
      say: [
        "What instrument do you prefer to use as primary—LC, DLC, SBLC, TT, or escrow?",
        "What instrument keeps your side most comfortable on execution?"
      ],
      labels: [
        "Sounds like you’re optimizing for certainty.",
        "It seems like bank comfort matters here."
      ],
      followups: [
        "Is that instrument already approved with your bank for this type of trade?",
        "What’s your usual issuing timeline once terms are agreed?"
      ]
    },
    c: {
      probes: [
        "Which bank issues it and what’s the swift type you typically use?",
        "What’s the maximum tenor you can support on that instrument?"
      ]
    }
  },

  issuing_bank: {
    b: {
      say: [
        "Which bank will issue the instrument (bank name + country), so we keep everything aligned from the start?",
        "What bank do you normally use for trade instruments on deals like this?"
      ],
      labels: [
        "Sounds like you want a smooth banking path.",
        "It seems like you’ve got an established banking relationship."
      ],
      followups: [
        "Is the issuing branch in the same country as the buyer entity?",
        "Is there a preferred confirming bank requirement on your side?"
      ]
    },
    c: {
      probes: [
        "What’s the cleanest way to confirm bank capability without slowing you down?",
        "Is the instrument issuable by MT700 / MT760 depending on structure?"
      ]
    }
  },

  loi_ready: {
    b: {
      say: [
        "Once terms align, are you ready to issue LOI/ICPO on letterhead so we can move quickly?",
        "What needs to happen before LOI/ICPO is comfortable on your side?"
      ],
      labels: [
        "Sounds like you’re balancing speed and internal control.",
        "It seems like you want to avoid surprises later."
      ],
      followups: [
        "Who else needs to review before it’s issued?",
        "What timeline do you want from terms to LOI/ICPO?"
      ]
    },
    c: {
      probes: [
        "If we align terms today, what would stop LOI/ICPO from being issued within 24–48 hours?",
        "What’s the internal threshold to move from ‘interested’ to ‘committed’?"
      ]
    }
  },

  verification_gate: {
    b: {
      say: [
        "How do you prefer we verify capability in a way that respects your time and privacy?",
      ],
      labels: ["Sounds like you want verification without friction."],
      followups: ["What document or step is easiest on your side?"]
    },
    c: {
      probes: [
        "What’s the fastest verification step you can support—BCL/POF, CIS, or bank introduction?",
        "If we keep it lightweight, what are you comfortable providing first?"
      ]
    }
  }
};

// Generic fallbacks for keys without custom entries
function genericVoss(key, prompt) {
  return {
    b: {
      say: [
        `Help me understand—${prompt}`,
        `So I don’t miss anything—${prompt}`
      ],
      labels: [
        "Sounds like you want this to be straightforward.",
        "It seems like speed matters here."
      ],
      followups: [
        "What does ‘good’ look like for you on this part?",
        "What’s the simplest way to answer this on your side?"
      ]
    },
    c: {
      probes: [
        "What would make this difficult to execute on your side?",
        "What’s the cleanest way to verify this without slowing momentum?"
      ]
    }
  };
}

/* =========================
   FLOW BUILDER (Branching)
========================= */

function buildFlow() {
  const flow = ["authority"];

  if (!state.path) {
    const auth = getVal(state, "authority");
    if (auth === "I’m a trader/agent/mandate (representing a buyer)") state.path = "AGENT";
  }

  if (shouldAsk("role")) flow.push("role");

  flow.push("company_name", "country_address", "contact_person");
  if (shouldAsk("website")) flow.push("website");
  if (shouldAsk("year_established")) flow.push("year_established");
  if (shouldAsk("entity_type")) flow.push("entity_type");

  if (shouldAsk("principal_disclosure")) flow.push("principal_disclosure");
  if (shouldAsk("mandate")) flow.push("mandate");

  if (shouldAsk("core_activity")) flow.push("core_activity");
  if (shouldAsk("licenses")) flow.push("licenses");

  flow.push("product", "specs", "quantity");
  if (shouldAsk("packaging")) flow.push("packaging");

  if (shouldAsk("incoterms")) flow.push("incoterms");
  flow.push("destination_port");
  if (shouldAsk("timeline")) flow.push("timeline");

  flow.push("target_price", "primary_instrument");
  if (shouldAsk("secondary_instrument")) flow.push("secondary_instrument");
  if (shouldAsk("issuing_bank")) flow.push("issuing_bank");
  if (shouldAsk("guarantees")) flow.push("guarantees");
  if (shouldAsk("docs_available")) flow.push("docs_available");

  flow.push("loi_ready");
  if (shouldAsk("contract_preference")) flow.push("contract_preference");
  if (shouldAsk("compliance")) flow.push("compliance");

  if (shouldAsk("verification_gate")) flow.push("verification_gate");

  if (shouldAsk("other_commodities")) flow.push("other_commodities");

  state.flow = flow;
}

/* =========================
   PATH RESOLUTION
========================= */
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
function computeStructural(s) {
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

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin:10px 0;">
        <div style="padding:10px; background:#132A3A; border-radius:10px;">Path: <b>${escapeHtml(state.path || "—")}</b></div>
        <div style="padding:10px; background:#132A3A; border-radius:10px;">Phase: <b>${phase}</b></div>
        <div style="padding:10px; background:#132A3A; border-radius:10px;">Structural: <b>${structural}</b>/100</div>
        <div style="padding:10px; background:#132A3A; border-radius:10px;">Risk: <b>${risk}</b>/100</div>
        <div style="padding:10px; background:#132A3A; border-radius:10px;">Temp: <b>${escapeHtml(state.temperature)}</b></div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin:12px 0;">
        <button onclick="renderCallMode()">Open Call Mode</button>
        <button onclick="resetDeal()">Start New Deal</button>
        <button onclick="copySummary()">Copy Summary</button>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin:12px 0;">
        <label style="padding:10px; background:#132A3A; border-radius:10px;">
          <input type="checkbox" ${state.vossAssist ? "checked" : ""} onchange="setVossAssist(this.checked)" />
          Voss Assist (B)
        </label>
        <label style="padding:10px; background:#132A3A; border-radius:10px;">
          <input type="checkbox" ${state.advancedMode ? "checked" : ""} onchange="setAdvanced(this.checked)" />
          Advanced Mode (C)
        </label>
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

  const structural = computeStructural(state);
  const risk = computeRisk(state);
  const phase = computePhase();

  const showAdvancedSuggestion = (!state.advancedMode && risk >= 50);

  const vossPack = (VOSS[key] || genericVoss(key, Q.prompt));

  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding:20px;">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">Call Mode</h2>
          <div style="opacity:0.8; font-size:12px;">Path: <b>${escapeHtml(state.path)}</b> • Phase: <b>${phase}</b> • Step ${state.idx+1}/${state.flow.length}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px; opacity:0.8;">Structural: <b>${structural}</b>/100 • Risk: <b>${risk}</b>/100</div>
          <div style="font-size:12px; opacity:0.8;">Temperature: <b>${escapeHtml(state.temperature)}</b></div>
        </div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
        <label style="padding:10px; background:#132A3A; border-radius:10px;">
          <input type="checkbox" ${state.vossAssist ? "checked" : ""} onchange="setVossAssist(this.checked)" />
          Voss Assist (B)
        </label>
        <label style="padding:10px; background:#132A3A; border-radius:10px;">
          <input type="checkbox" ${state.advancedMode ? "checked" : ""} onchange="setAdvanced(this.checked)" />
          Advanced Mode (C)
        </label>
      </div>

      ${showAdvancedSuggestion ? `
        <div style="margin-top:12px; padding:12px; background:#2a1f10; border:1px solid rgba(255,200,120,0.35); border-radius:10px;">
          <div style="font-size:13px;"><b>Risk is elevated.</b> Want to enable Advanced Mode prompts for tighter verification without sounding aggressive?</div>
          <div style="margin-top:8px;">
            <button onclick="setAdvanced(true)">Enable Advanced Mode (C)</button>
          </div>
        </div>
      ` : ""}

      <div style="margin-top:14px; padding:12px; background:#132A3A; border-radius:10px;">
        <div style="opacity:0.75; font-size:12px;">${escapeHtml(Q.section)} • Key: <b>${escapeHtml(key)}</b></div>
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
            <button onclick="copySummary()">Copy Summary</button>
          </div>
        </div>

        ${renderVossBlock(key, Q, vossPack)}
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

function renderVossBlock(key, Q, vossPack) {
  if (!state.vossAssist && !state.advancedMode) return "";

  const open = !!state.vossOpen[key];
  const b = vossPack.b || genericVoss(key, Q.prompt).b;
  const c = vossPack.c || genericVoss(key, Q.prompt).c;

  const tempNote = temperatureNote(state.temperature);

  return `
    <div style="margin-top:14px; padding:12px; background:rgba(11,28,45,0.55); border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
        <div style="font-size:13px;"><b>Voice Layer</b> <span style="opacity:0.75;">(${tempNote})</span></div>
        <button onclick="toggleVossOpen('${key}')">${open ? "Hide" : "Show"} prompts</button>
      </div>

      ${open ? `
        ${state.vossAssist ? `
          <div style="margin-top:12px;">
            <div style="opacity:0.8; font-size:12px; margin-bottom:6px;"><b>Voss Assist (B)</b> — tap to copy into the conversation:</div>
            ${renderTapLines("Say", b.say)}
            ${renderTapLines("Label", b.labels)}
            ${renderTapLines("Follow-up", b.followups)}
          </div>
        ` : ""}

        ${state.advancedMode ? `
          <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.08);">
            <div style="opacity:0.8; font-size:12px; margin-bottom:6px;"><b>Advanced Mode (C)</b> — tighter verification without sounding accusatory:</div>
            ${renderTapLines("Probe", c.probes)}
          </div>
        ` : ""}
      ` : ""}
    </div>
  `;
}

function renderTapLines(label, arr) {
  if (!arr || !arr.length) return "";
  return `
    <div style="margin-top:10px;">
      <div style="opacity:0.75; font-size:12px; margin-bottom:6px;">${escapeHtml(label)}:</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${arr.map(line => `
          <button onclick="tapLine(${JSON.stringify(line)})" style="text-align:left; max-width:100%;">
            ${escapeHtml(line)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function temperatureNote(t) {
  if (t === "CALM") return "keep it relaxed + forward";
  if (t === "GUARDED") return "use softer framing + curiosity";
  if (t === "DEFENSIVE") return "slow down + label + calibrated questions";
  return "de-escalate + confirm + minimum viable next step";
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

  A.pending = false;
  state.answers[key] = A;

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
  state.vossOpen = {};
  state.log = ["New deal started."];
  renderDashboard();
}

/* =========================
   VOICE LAYER ACTIONS
========================= */

function toggleVossOpen(key) {
  state.vossOpen[key] = !state.vossOpen[key];
  renderCallMode();
}

function setVossAssist(on) {
  state.vossAssist = !!on;
  log(`Voss Assist (B): ${state.vossAssist ? "ON" : "OFF"}`);
  if (state.mode === "call") renderCallMode();
  else renderDashboard();
}

function setAdvanced(on) {
  state.advancedMode = !!on;
  log(`Advanced Mode (C): ${state.advancedMode ? "ON" : "OFF"}`);
  if (state.mode === "call") renderCallMode();
  else renderDashboard();
}

async function tapLine(line) {
  // Copies to clipboard so you can paste into the conversation
  try {
    await navigator.clipboard.writeText(line);
    log("Copied prompt to clipboard ✅");
  } catch {
    log("Copy blocked by browser — press/hold to select and copy manually.");
  }
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
    log("Copy blocked by browser — copy from screen manually if needed.");
  }

  if (state.mode === "call") renderCallMode();
  else renderDashboard();
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

// Expose toggle handlers (called from inline HTML in this app render)
window.setVossAssist = setVossAssist;
window.setAdvanced = setAdvanced;
window.toggleVossOpen = toggleVossOpen;
window.tapLine = tapLine;

// Expose nav controls
window.next = next;
window.back = back;
window.save = save;
window.finish = finish;
window.pick = pick;
window.setPending = setPending;
window.setTemp = setTemp;
