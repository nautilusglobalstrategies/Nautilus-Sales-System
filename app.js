// Nautilus Sales System — V2C (20Q Product-First + Adaptive Voss + Copy/Highlight + Stabilizer)
// NON-module build for: <script src="app.js"></script>

(function () {
  const TEMP_LEVELS = ["CALM", "GUARDED", "DEFENSIVE", "RESISTANT"];

  const state = {
    idx: 0,
    temperature: "CALM",
    answers: {},
    structural: 0,
    risk: 0,
    phase: "QUALIFY",
    selectedSuggestion: "",
    selectedClose: "",
    showClose: true
  };

  const OPENING_SCRIPT = `
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for [product + quantity + destination]. I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill it through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
`.trim();

  // ===== 20 QUESTIONS — PRODUCT FIRST (Q1 starts with product) =====
  const QUESTIONS = [
    // 1–6 Product + Logistics intent (low resistance)
    q("product", "Product", "What exact product are you looking to secure?", "e.g., Sunflower Seed Oil"),
    q("specs", "Product", "What specs are non-negotiable for approval on your side?", "grade / standards / certifications"),
    q("quantity", "Product", "What volume are you positioned to move right now?", "MT or containers"),
    qs("packaging", "Product", "How should it be packaged so there’s no downstream friction?", ["Bulk","Flexitank","Bottled","Bagged","Drums","Other"]),
    q("destination_port", "Logistics", "Which destination port should we structure against?", "Port + country"),
    qs("timeline", "Logistics", "What delivery timeline are you operating under?", ["Immediate","Within 30 days","Within 60 days","Within 90 days","Long-term contract"]),

    // 7–10 Commercial reality
    q("target_price", "Financial", "What target price range per MT makes this a ‘yes’ internally?", "USD/MT range"),
    qs("payment_instrument", "Financial", "What payment instrument will you deploy on this transaction?", ["LC","DLC","SBLC","TT","Escrow","Other"]),
    q("issuing_bank", "Financial", "Which bank will issue the instrument? (Name + country)", "Bank name + country"),
    q("issuance_speed", "Financial", "Once aligned, how quickly can the instrument be issued?", "e.g., 3–5 banking days"),

    // 11–15 Company details (after commitment)
    q("company_name", "Company", "What exact registered company name should appear on the offer package?", "Registered company name"),
    q("entity_type", "Company", "What legal entity type is the buyer? (LLC, Corp, etc.)", "Entity type"),
    q("country_registration_address", "Company", "Country of registration + business address tied to this deal?", "Country + address"),
    q("website_or_profile", "Company", "Website/company profile we should reference for verification (or N/A)?", "Website or N/A"),
    q("key_contact", "Company", "Who is the key contact for documents? (Name, title, phone, email)", "Contact details"),

    // 16–20 Engagement + compliance + relationship
    q("approval_path", "Engagement", "When this is ready, how does approval work on your side?", "Who approves + steps"),
    qs("loi_icpo_ready", "Engagement", "Once terms align, are you ready to issue LOI or ICPO on letterhead?", ["Yes","Needs internal approval","Not ready"]),
    q("trade_finance_help", "Trade Finance", "Do you need trade finance support (LC/SBLC issuance, guarantees, etc.) or is your bank handling it?", "Bank handling / Need support"),
    q("compliance_requirements", "Compliance", "Any regulatory/compliance requirements in your country we must design around?", "Requirements"),
    q("other_commodities", "Relationship", "Beyond this product, what other commodities are you regularly buying or selling?", "Other commodities")
  ];

  // Suggested “next line” prompts (adaptive by phase + temperature)
  // We keep it simple + high ROI.
  function suggestionsFor(key) {
    const t = state.temperature;
    const p = state.phase;

    // Stabilizer-first behavior (your rule): if DEFENSIVE/RESISTANT show stabilizers
    if (t === "DEFENSIVE" || t === "RESISTANT") {
      return [
        "It sounds like something doesn’t feel solid yet. What’s the main concern?",
        "Where are you feeling the most hesitation right now?",
        "What would make this feel safe enough to move forward?",
        "What’s the risk you’re trying to avoid here?"
      ];
    }

    // Normal adaptive suggestions (CALM/GUARDED)
    const base = {
      product: [
        "What’s driving demand on your side right now?",
        "If you had to rank priorities — price, speed, or certainty — which wins?",
        "What would make you reject a supplier immediately?"
      ],
      specs: [
        "Which spec matters most to your buyer or regulator?",
        "Any restricted origins we should avoid?",
        "What documentation usually gets asked for first?"
      ],
      quantity: [
        "What’s the smallest shipment that still makes sense for you?",
        "If the first shipment is clean, what does scale look like monthly?",
        "What constraint controls your volume — storage, cashflow, or port capacity?"
      ],
      destination_port: [
        "Any port restrictions or inspection realities we should plan around?",
        "Do you have a preferred discharge window?",
        "What’s the one detail that makes delivery smooth for you?"
      ],
      target_price: [
        "What number makes you lean in — and what number kills it?",
        "Who sets that target range internally?",
        "If pricing lands slightly above target, what would you need to justify it?"
      ],
      payment_instrument: [
        "When you’ve done this before, what instrument has been cleanest?",
        "Is your preference driven by compliance or speed?",
        "What would make your bank say ‘no’?"
      ],
      issuing_bank: [
        "Do you already have issuance capacity with that bank right now?",
        "Any formatting requirements we should follow from day one?",
        "How quickly does your bank typically move once terms are set?"
      ],
      loi_icpo_ready: [
        "What would you need to see to confidently issue LOI/ICPO?",
        "Who else needs to be comfortable before you send it?",
        "What’s the cleanest next step on your side after the Soft Offer?"
      ],
      other_commodities: [
        "Which commodity is most consistent for you right now?",
        "Do you mainly buy, sell, or both?",
        "If we built a long-term lane, what would you want included?"
      ]
    };

    let arr = base[key] || [
      "What does the next step look like on your side?",
      "What would make this easiest for you to approve?",
      "What would slow this down if we don’t plan for it?"
    ];

    // Phase flavoring (soft)
    if (p === "LEVERAGE") {
      arr = [
        ...arr,
        "If we send a clean Soft Offer today, what happens next on your side?"
      ];
    } else if (p === "ALIGN") {
      arr = [
        ...arr,
        "What would you want clarified in writing so you don’t have to revisit it?"
      ];
    }

    // Guarded flavoring
    if (t === "GUARDED") {
      arr = [
        "Totally fair — I want this to be easy on your side. What would you need in writing to feel good?",
        ...arr
      ];
    }

    // Resume-softened mode after stabilizer: we already stabilize above; this is the “A” resumption.
    return arr.slice(0, 5);
  }

  // Adaptive closing suggestions (click to copy + highlight)
  function closingSuggestions() {
    const t = state.temperature;
    if (t === "DEFENSIVE" || t === "RESISTANT") {
      return [
        "Totally fair. What would you need to see to feel protected before anything moves?",
        "Let’s pause pressure. What’s the smallest next step that feels safe for you?",
        "If we handled this in a way you felt fully covered, what would happen next?"
      ];
    }
    if (t === "GUARDED") {
      return [
        "Makes sense. If I send the Soft Offer with clean terms, what would you look at first?",
        "What would you need included so this feels straightforward to approve?",
        "Who else should be looped in so you don’t have to relay this twice?"
      ];
    }
    // CALM default
    return [
      "Perfect — I’ll package this into a Soft Corporate Offer. What email should we use for the offer package?",
      "Once you review the Soft Offer, what does the next step look like on your side?",
      "Before I send it, who else needs to be included so this moves cleanly?"
    ];
  }

  // ====== scoring / phase ======
  function computeScores() {
    const total = QUESTIONS.length;
    const answered = Object.keys(state.answers).filter(k => hasValue(state.answers[k])).length;
    state.structural = Math.round((answered / total) * 100);

    let r = 0;
    if (!hasValue(state.answers.target_price)) r += 15;
    if (!hasValue(state.answers.payment_instrument)) r += 20;
    if (!hasValue(state.answers.issuing_bank)) r += 20;
    if (!hasValue(state.answers.loi_icpo_ready)) r += 15;

    if (state.temperature === "DEFENSIVE") r += 10;
    if (state.temperature === "RESISTANT") r += 20;

    state.risk = Math.min(r, 100);

    if (state.structural < 40) state.phase = "QUALIFY";
    else if (state.structural < 75) state.phase = "ALIGN";
    else state.phase = "LEVERAGE";
  }

  function hasValue(v) {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return String(v).trim().length > 0;
  }

  // ====== render helpers ======
  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function copyToClipboard(text) {
    const t = String(text || "").trim();
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).catch(() => fallbackCopy(t));
      return;
    }
    fallbackCopy(t);
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function q(key, section, prompt, placeholder) {
    return { key, section, prompt, type: "text", placeholder };
  }
  function qs(key, section, prompt, options) {
    return { key, section, prompt, type: "single", options };
  }

  function injectStyle() {
    const css = `
      .wrap{padding:20px;max-width:980px}
      .muted{opacity:.8;margin:8px 0}
      .card{margin-top:12px;padding:14px;border:1px solid rgba(198,169,74,0.45);border-radius:12px;background:#132A3A}
      .card__title{font-weight:800;margin-bottom:8px}
      .q{margin-top:8px;font-size:18px;font-weight:800;line-height:1.3}
      .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
      .stack{display:flex;flex-direction:column;gap:10px}
      .btn{padding:10px 14px;border-radius:10px;border:1px solid rgba(198,169,74,0.55);background:#0B1C2D;color:#E8EEF2;cursor:pointer}
      .btn:disabled{opacity:.5;cursor:not-allowed}
      .btn--gold{background:#132A3A}
      .chip{padding:10px 12px;border-radius:999px;border:1px solid rgba(198,169,74,0.55);background:#0B1C2D;color:#E8EEF2;cursor:pointer}
      .chip--on{outline:2px solid rgba(198,169,74,0.9)}
      .input{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#0B1C2D;color:#E8EEF2}
      .suggest{padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(11,28,45,0.7);color:#E8EEF2;text-align:left;cursor:pointer}
      .suggest--on{outline:2px solid rgba(198,169,74,0.9)}
      .pill{display:inline-flex;gap:8px;align-items:center;padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(11,28,45,0.5);color:#E8EEF2}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function openingBlock() {
    return `
      <div class="card">
        <div class="card__title">Opening Script</div>
        <div style="white-space:pre-wrap;line-height:1.45;">${esc(OPENING_SCRIPT)}</div>
      </div>
    `;
  }

  function tempBlock() {
    return `
      <div class="card">
        <div class="card__title">Psychological Temperature</div>
        <div class="row">
          ${TEMP_LEVELS.map(t => `
            <button class="chip ${state.temperature === t ? "chip--on" : ""}" type="button" onclick="setTemp('${t}')">${t}</button>
          `).join("")}
        </div>
        <div class="muted">Rule: DEFENSIVE/RESISTANT inserts stabilizer prompts, then resumes softened tone.</div>
      </div>
    `;
  }

  function dashboard() {
    computeScores();
    const list = QUESTIONS.map((x, i) => `<div class="muted">${i+1}. <b>${esc(x.key)}</b> — ${esc(x.section)}</div>`).join("");

    $("app").innerHTML = `
      <div class="wrap">
        <div class="card">
          <div class="card__title">Dashboard</div>
          <div class="muted"><b>${QUESTIONS.length}</b> Questions Loaded • Starts with: <b>${esc(QUESTIONS[0].key)}</b></div>
          <div class="row" style="margin-top:10px;">
            <div class="pill">Phase: <b>${state.phase}</b></div>
            <div class="pill">Structural: <b>${state.structural}</b>/100</div>
            <div class="pill">Risk: <b>${state.risk}</b>/100</div>
            <div class="pill">Temp: <b>${state.temperature}</b></div>
          </div>
          <div class="row" style="margin-top:12px;">
            <button class="btn btn--gold" type="button" onclick="renderCallMode()">Open Call Mode</button>
            <button class="btn" type="button" onclick="resetDeal()">Start New Deal</button>
            <button class="btn" type="button" onclick="toggleClose()">${state.showClose ? "Hide" : "Show"} Closing Suggestions</button>
          </div>
        </div>

        ${tempBlock()}

        <div class="card">
          <div class="card__title">Question List (verification)</div>
          ${list}
        </div>
      </div>
    `;
  }

  function inputUI(q) {
    const existing = state.answers[q.key] || "";
    if (q.type === "text") {
      return `<input id="field" class="input" placeholder="${esc(q.placeholder || "")}" value="${esc(existing)}" />`;
    }
    if (q.type === "single") {
      return `<div class="row">${q.options.map(opt => `
        <button class="chip" type="button" onclick="pickOption('${esc(opt)}')">${esc(opt)}</button>
      `).join("")}</div>`;
    }
    return "";
  }

  function suggestionBlock(q) {
    const lines = suggestionsFor(q.key);
    return `
      <div class="card">
        <div class="card__title">Suggested Next Lines (click = copy + highlight)</div>
        <div class="stack">
          ${lines.map(line => `
            <button class="suggest ${state.selectedSuggestion === line ? "suggest--on" : ""}" type="button"
              onclick="pickSuggestion('${esc(line)}')">${esc(line)}</button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function closeBlock() {
    if (!state.showClose) {
      return `
        <div class="card">
          <div class="row" style="justify-content:space-between;align-items:center;">
            <div class="card__title" style="margin:0;">Closing Suggestions</div>
            <button class="btn" type="button" onclick="toggleClose()">Show</button>
          </div>
          <div class="muted">Hidden (toggle on when you want it)</div>
        </div>
      `;
    }

    const lines = closingSuggestions();
    return `
      <div class="card">
        <div class="card__title">Closing Suggestions (${state.temperature})</div>
        <div class="muted">Click to copy + highlight.</div>
        <div class="stack" style="margin-top:10px;">
          ${lines.map(line => `
            <button class="suggest ${state.selectedClose === line ? "suggest--on" : ""}" type="button"
              onclick="pickClose('${esc(line)}')">${esc(line)}</button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderCallMode() {
    computeScores();
    const q = QUESTIONS[state.idx];

    $("app").innerHTML = `
      <div class="wrap">
        <div class="muted">Call Mode • Question <b>${state.idx + 1}</b> of <b>${QUESTIONS.length}</b> • <b>${esc(q.section)}</b></div>

        ${openingBlock()}

        <div class="card">
          <div class="row" style="justify-content:space-between;align-items:center;">
            <div class="pill">Phase: <b>${state.phase}</b></div>
            <div class="pill">Structural: <b>${state.structural}</b>/100</div>
            <div class="pill">Risk: <b>${state.risk}</b>/100</div>
            <div class="pill">Temp: <b>${state.temperature}</b></div>
          </div>

          <div class="q" style="margin-top:10px;">${esc(q.prompt)}</div>
          <div style="margin-top:10px;">${inputUI(q)}</div>

          <div class="row" style="margin-top:12px;">
            <button class="btn" type="button" onclick="backQ()" ${state.idx === 0 ? "disabled" : ""}>Back</button>
            <button class="btn btn--gold" type="button" onclick="nextQ()">Next</button>
            <button class="btn" type="button" onclick="renderDashboard()">Dashboard</button>
            <button class="btn" type="button" onclick="resetDeal()">Start New Deal</button>
          </div>
        </div>

        ${suggestionBlock(q)}
        ${tempBlock()}
        ${closeBlock()}
      </div>
    `;
  }

  function saveTextIfNeeded() {
    const q = QUESTIONS[state.idx];
    if (!q) return;
    if (q.type !== "text") return;
    const v = $("field") ? $("field").value.trim() : "";
    state.answers[q.key] = v;
  }

  // ===== Actions exposed for your index.html buttons =====
  window.renderDashboard = function () { dashboard(); };
  window.renderCallMode = function () { renderCallMode(); };

  window.nextQ = function () {
    const q = QUESTIONS[state.idx];
    if (q.type === "text") saveTextIfNeeded();
    if (state.idx < QUESTIONS.length - 1) state.idx += 1;
    renderCallMode();
  };

  window.backQ = function () {
    const q = QUESTIONS[state.idx];
    if (q.type === "text") saveTextIfNeeded();
    if (state.idx > 0) state.idx -= 1;
    renderCallMode();
  };

  window.pickOption = function (opt) {
    const q = QUESTIONS[state.idx];
    state.answers[q.key] = opt;
    // auto advance
    if (state.idx < QUESTIONS.length - 1) state.idx += 1;
    renderCallMode();
  };

  window.pickSuggestion = function (line) {
    const txt = String(line || "");
    state.selectedSuggestion = txt;
    copyToClipboard(txt);
    renderCallMode();
  };

  window.setTemp = function (t) {
    state.temperature = t;
    state.selectedClose = "";
    renderCallMode();
  };

  window.pickClose = function (line) {
    const txt = String(line || "");
    state.selectedClose = txt;
    copyToClipboard(txt);
    renderCallMode();
  };

  window.toggleClose = function () {
    state.showClose = !state.showClose;
    // preserve current view
    renderCallMode();
  };

  window.resetDeal = function () {
    state.idx = 0;
    state.answers = {};
    state.temperature = "CALM";
    state.selectedSuggestion = "";
    state.selectedClose = "";
    dashboard();
  };

  // Init
  injectStyle();
  dashboard();

})();
