// Nautilus Sales System — V5
// Voss-Only + Temp-Driven Flow + Stabilize-until-temp-lowers
// Non-module build: <script src="app.js?v=XX"></script>

(function () {
  const TEMP_LEVELS = ["CALM", "GUARDED", "DEFENSIVE", "RESISTANT"];

  const state = {
    idx: 0,
    temperature: "CALM",
    answers: {},
    structural: 0,
    risk: 0,
    phase: "QUALIFY",
    showClose: true,
    selectedSuggestion: "",
    selectedClose: "",
    adaptiveFlow: true,
    stabilizerMode: true,
    pendingStabilizer: false
  };

  /* =========================
     GREETING + GRATITUDE
  ========================== */

  const OPENING_SCRIPT = `
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for [product + quantity + destination]. I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill it through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
`.trim();

  function gratitudeLine() {
    if (state.temperature === "RESISTANT") {
      return "I appreciate you taking the time today. We can move at your pace and keep it straightforward.";
    }
    if (state.temperature === "DEFENSIVE") {
      return "Thank you for your time today. I’ll document this clearly, and we’ll only move forward where it makes sense for you.";
    }
    if (state.temperature === "GUARDED") {
      return "Thanks for your time today. I’ll send this in a clear, reviewable format so your side can evaluate it easily.";
    }
    return "Thank you for your time today. I’ll package this into a clear Soft Corporate Offer and send it for review.";
  }

  /* =========================
     QUESTION BANK (20) — Product first
  ========================== */

  function q(key, section, prompt, placeholder) {
    return { key, section, prompt, type: "text", placeholder };
  }
  function qs(key, section, prompt, options) {
    return { key, section, prompt, type: "single", options };
  }

  const QUESTION_BANK = [
    // Product
    q("product", "Product", "What exact product do you need sourced?", "e.g., Sunflower Seed Oil"),
    q("specs", "Product", "What specs have to be true for this to be approved on your side?", "grade / standards / certifications"),
    q("quantity", "Product", "What volume are you positioned to take right now without strain?", "MT or containers"),
    qs("packaging", "Product", "What packaging keeps this smooth on your side?", ["Bulk", "Flexitank", "Bottled", "Bagged", "Drums", "Other"]),

    // Logistics
    q("destination_port", "Logistics", "Which destination port should we build the offer around?", "Port + country"),
    qs("timeline", "Logistics", "What delivery timeline are you operating under?", ["Immediate", "Within 30 days", "Within 60 days", "Within 90 days", "Long-term contract"]),

    // Financial
    q("target_price", "Financial", "What target range per MT makes this commercially workable for you?", "USD/MT range"),
    qs("payment_instrument", "Financial", "Which payment instrument are you prepared to use?", ["LC", "DLC", "SBLC", "TT", "Escrow", "Other"]),
    q("issuing_bank", "Financial", "Which bank will issue the instrument? (name + country)", "Bank name + country"),
    q("issuance_speed", "Financial", "Once terms are aligned, how fast can issuance happen on your side?", "e.g., 3–5 banking days"),

    // Company
    q("company_name", "Company", "What exact registered company name should appear on the offer package?", "Registered company name"),
    q("entity_type", "Company", "What entity type is the buyer? (LLC, Corporation, Partnership, etc.)", "Entity type"),
    q("country_registration_address", "Company", "What country is the buyer registered in, and what business address should we reference?", "Country + address"),
    q("website_or_profile", "Company", "What website or company profile should we use for verification (or N/A)?", "Website or N/A"),
    q("key_contact", "Company", "Who should receive the offer pack—name, title, phone, and email?", "Contact details"),

    // Engagement + Trade Finance + Compliance + Relationship
    q("approval_path", "Engagement", "How does approval happen internally once you receive the Soft Offer?", "steps + decision owner"),
    qs("loi_icpo_ready", "Engagement", "Once the terms work, are you ready to issue LOI or ICPO on letterhead?", ["Yes", "Needs internal approval", "Not ready"]),
    q("trade_finance_help", "Trade Finance", "What support—if any—do you want on trade finance (issuance, guarantees), or is your bank handling everything?", "Bank handling / Need support"),
    q("compliance_requirements", "Compliance", "What compliance or regulatory requirements do we need to design around on your side?", "Requirements"),
    q("other_commodities", "Relationship", "In addition to this product, what other commodities are you regularly buying or selling?", "Other commodities")
  ];

  /* =========================
     TEMP-DRIVEN ORDER
  ========================== */

  function getQueue() {
    if (!state.adaptiveFlow) return QUESTION_BANK;

    if (state.temperature === "CALM" || state.temperature === "GUARDED") return QUESTION_BANK;

    if (state.temperature === "DEFENSIVE") {
      const orderKeys = [
        "product","specs","quantity","packaging",
        "destination_port","timeline",
        "company_name","entity_type","country_registration_address","website_or_profile","key_contact",
        "approval_path",
        "target_price","payment_instrument","issuing_bank","issuance_speed",
        "loi_icpo_ready","trade_finance_help","compliance_requirements","other_commodities"
      ];
      return orderKeys.map(k => QUESTION_BANK.find(x => x.key === k)).filter(Boolean);
    }

    if (state.temperature === "RESISTANT") {
      const orderKeys = [
        "product","specs","quantity","packaging",
        "destination_port","timeline",
        "approval_path","key_contact","company_name","country_registration_address","website_or_profile","entity_type",
        "loi_icpo_ready",
        "target_price","payment_instrument","issuing_bank","issuance_speed",
        "trade_finance_help","compliance_requirements","other_commodities"
      ];
      return orderKeys.map(k => QUESTION_BANK.find(x => x.key === k)).filter(Boolean);
    }

    return QUESTION_BANK;
  }

  function currentQuestions() {
    return getQueue();
  }

  /* =========================
     VOSS STABILIZERS
  ========================== */

  function vossStabilizers() {
    return [
      { label: "Label + Calibrate", text: "It sounds like something here doesn’t feel solid yet. What’s the biggest concern?" },
      { label: "Slow It Down", text: "That makes sense. What would you need to see in writing to feel protected?" },
      { label: "Define the Risk", text: "What risk are you trying to avoid on this transaction?" },
      { label: "Smallest Next Step", text: "What’s the smallest next step that would still feel safe to you?" }
    ];
  }

  function vossSuggestionsFor(key) {
    // If defensive/resistant, the system is in “stabilize-until-lowered” mode,
    // so Voss Prompts also skew toward stabilizers.
    if ((state.temperature === "DEFENSIVE" || state.temperature === "RESISTANT") && state.stabilizerMode) {
      return vossStabilizers();
    }

    const S = {
      product: [
        { label: "Mirror", text: "“[product]”—what’s driving the urgency?" },
        { label: "Calibrate", text: "What does success look like on the first shipment?" },
        { label: "Filter", text: "What would make you reject a supplier immediately?" }
      ],
      specs: [
        { label: "Non-Negotiables", text: "Which spec gets checked first on your side?" },
        { label: "Origins", text: "What origins are acceptable—and which are a hard no?" },
        { label: "Docs", text: "What documentation do your teams ask for before anything moves?" }
      ],
      quantity: [
        { label: "Floor/Ceiling", text: "What’s the minimum that still works—and what’s the ceiling monthly?" },
        { label: "Constraint", text: "What limits you most—storage, cashflow, or port capacity?" },
        { label: "Scale Plan", text: "If shipment one is clean, how do you scale from there?" }
      ],
      packaging: [
        { label: "Friction Test", text: "What packaging has caused problems that you want to avoid?" },
        { label: "Decision", text: "Who decides packaging on your side?" },
        { label: "Compliance", text: "Any labeling rules we need to respect at destination?" }
      ],
      destination_port: [
        { label: "Reality Check", text: "Any port realities—inspection, congestion—that we should plan around?" },
        { label: "Smooth Delivery", text: "What detail makes delivery smooth for you every time?" },
        { label: "Routing", text: "Do you prefer direct routing, or is transshipment acceptable?" }
      ],
      timeline: [
        { label: "Priority", text: "What matters more right now—speed, price, or certainty?" },
        { label: "Window", text: "What’s your latest acceptable arrival date?" },
        { label: "Impact", text: "If timing slips, what’s the impact on your side?" }
      ],
      target_price: [
        { label: "Range Test", text: "What number makes you lean in—and what number kills it?" },
        { label: "Authority", text: "Who set that target range internally?" },
        { label: "Flex", text: "If price lands slightly above target, what would you need to justify it?" }
      ],
      payment_instrument: [
        { label: "Cleanest", text: "Which instrument has been cleanest for you in real deals?" },
        { label: "Bank Pushback", text: "What would your bank push back on if we don’t structure it right?" },
        { label: "Driver", text: "Is your instrument choice driven by compliance, speed, or cost?" }
      ],
      issuing_bank: [
        { label: "Capacity", text: "Do you have current issuance capacity with that bank right now?" },
        { label: "Formatting", text: "Any wording/formatting requirements your bank expects from day one?" },
        { label: "Timing", text: "How quickly does the bank move once terms are set?" }
      ],
      approval_path: [
        { label: "Decision Map", text: "Who ultimately says yes—and what do they need to see?" },
        { label: "Sequence", text: "What’s the internal sequence after you receive the Soft Offer?" },
        { label: "Speed", text: "What would accelerate approval on your side?" }
      ],
      loi_icpo_ready: [
        { label: "Obstacle", text: "What would prevent LOI/ICPO once the terms work?" },
        { label: "Next Step", text: "If I send a clean Soft Offer today, what happens next on your side?" },
        { label: "Written Clarity", text: "What needs to be clarified in writing so you don’t have to revisit it?" }
      ],
      other_commodities: [
        { label: "Lane Build", text: "Which commodities are most consistent for you right now?" },
        { label: "Buy/Sell", text: "Do you primarily buy, sell, or both?" },
        { label: "Long-Term", text: "If we build a long-term lane, what would you want included?" }
      ]
    };

    return (S[key] || [
      { label: "Clarify", text: "What would you want stated clearly so it’s easy to approve?" },
      { label: "Next", text: "What does the next step look like on your side?" },
      { label: "Protect", text: "What would make this safer and simpler for you?" }
    ]).slice(0, 5);
  }

  /* =========================
     Closing prompts (temp-based)
  ========================== */

  function closingSuggestions() {
    const t = state.temperature;

    if (t === "RESISTANT") {
      return [
        { label: "No Pressure", text: "No pressure. What would need to change for this to become actionable?" },
        { label: "Small Step", text: "What’s the smallest next step that still makes sense to you?" },
        { label: "Protect", text: "What would you need to see to feel fully protected here?" }
      ];
    }
    if (t === "DEFENSIVE") {
      return [
        { label: "De-Escalate", text: "That makes sense. What concern should we resolve first?" },
        { label: "Written Clarity", text: "What would you want included in writing so this feels safe?" },
        { label: "Control", text: "How would you like to proceed so you stay in control of the process?" }
      ];
    }
    if (t === "GUARDED") {
      return [
        { label: "Clarity", text: "If I send the Soft Offer in a clean format, what will you look at first?" },
        { label: "Decision", text: "Who else should be looped in so you don’t have to relay this twice?" },
        { label: "Advance", text: "What would you need included so approval is straightforward?" }
      ];
    }
    return [
      { label: "Pre-Close", text: "If the Soft Offer matches your terms, what happens next on your side?" },
      { label: "Routing", text: "What email should receive the offer package and supporting documents?" },
      { label: "Speed", text: "How quickly would you like to move once you receive it?" }
    ];
  }

  /* =========================
     Scoring (simple)
  ========================== */

  function hasValue(v) {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return String(v).trim().length > 0;
  }

  function computeScores() {
    const Q = currentQuestions();
    const total = Q.length;
    const answered = Object.keys(state.answers).filter(k => hasValue(state.answers[k])).length;
    state.structural = Math.round((answered / total) * 100);

    let r = 0;
    if (!hasValue(state.answers.target_price)) r += 18;
    if (!hasValue(state.answers.payment_instrument)) r += 25;
    if (!hasValue(state.answers.issuing_bank)) r += 25;
    if (!hasValue(state.answers.issuance_speed)) r += 10;
    if (!hasValue(state.answers.loi_icpo_ready)) r += 12;
    if (state.temperature === "DEFENSIVE") r += 10;
    if (state.temperature === "RESISTANT") r += 20;

    state.risk = Math.min(r, 100);

    if (state.structural < 40) state.phase = "QUALIFY";
    else if (state.structural < 75) state.phase = "ALIGN";
    else state.phase = "LEVERAGE";
  }

  /* =========================
     Clipboard
  ========================== */

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

  /* =========================
     UI
  ========================== */

  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function injectStyle() {
    const css = `
      .wrap{padding:20px;max-width:980px}
      .muted{opacity:.85;margin:8px 0}
      .card{margin-top:12px;padding:14px;border:1px solid rgba(198,169,74,0.45);border-radius:12px;background:#132A3A}
      .card__title{font-weight:900;margin-bottom:8px}
      .q{margin-top:8px;font-size:18px;font-weight:900;line-height:1.3}
      .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
      .stack{display:flex;flex-direction:column;gap:10px}
      .btn{padding:10px 14px;border-radius:10px;border:1px solid rgba(198,169,74,0.55);background:#0B1C2D;color:#E8EEF2;cursor:pointer}
      .btn:disabled{opacity:.5;cursor:not-allowed}
      .chip{padding:10px 12px;border-radius:999px;border:1px solid rgba(198,169,74,0.55);background:#0B1C2D;color:#E8EEF2;cursor:pointer}
      .chip--on{outline:2px solid rgba(198,169,74,0.9)}
      .input{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#0B1C2D;color:#E8EEF2}
      .suggest{padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(11,28,45,0.7);color:#E8EEF2;text-align:left;cursor:pointer}
      .suggest--on{outline:2px solid rgba(198,169,74,0.9)}
      .pill{display:inline-flex;gap:8px;align-items:center;padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(11,28,45,0.5);color:#E8EEF2}
      .label{opacity:.8;font-size:12px;margin-bottom:6px}
      .split{display:flex;gap:12px;flex-wrap:wrap}
      .col{flex:1;min-width:300px}
      .toggle{display:flex;gap:10px;align-items:center}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function openingBlock() {
    return `
      <div class="card">
        <div class="card__title">Greeting</div>
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

        <div class="row" style="margin-top:12px;">
          <div class="toggle">
            <input type="checkbox" ${state.adaptiveFlow ? "checked" : ""} onchange="toggleAdaptive(this.checked)" />
            <span>Adaptive Flow (temp changes question order)</span>
          </div>
          <div class="toggle">
            <input type="checkbox" ${state.stabilizerMode ? "checked" : ""} onchange="toggleStabilizer(this.checked)" />
            <span>Stabilize-until-lowered (DEF/RES)</span>
          </div>
        </div>

        <div class="muted">Rule: DEFENSIVE/RESISTANT stays in Stabilizer mode until you lower temp to GUARDED or CALM.</div>
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

  function suggestionsBlock(q) {
    const items = vossSuggestionsFor(q.key);
    return `
      <div class="card">
        <div class="card__title">Voss Prompts (click = copy + highlight)</div>
        <div class="stack">
          ${items.map(it => `
            <button class="suggest ${state.selectedSuggestion === it.text ? "suggest--on" : ""}" type="button"
              onclick="pickSuggestion('${esc(it.text)}')">
              <div class="label">${esc(it.label)}</div>
              <div>${esc(it.text)}</div>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function closeBlock() {
    const items = closingSuggestions();

    if (!state.showClose) {
      return `
        <div class="card">
          <div class="row" style="justify-content:space-between;align-items:center;">
            <div class="card__title" style="margin:0;">Closing Prompts</div>
            <button class="btn" type="button" onclick="toggleClose()">Show</button>
          </div>
          <div class="muted">Hidden (toggle on when you want it).</div>
        </div>
      `;
    }

    return `
      <div class="card">
        <div class="card__title">Closing Prompts (${state.temperature})</div>
        <div class="muted">Click to copy + highlight.</div>
        <div class="stack" style="margin-top:10px;">
          ${items.map(it => `
            <button class="suggest ${state.selectedClose === it.text ? "suggest--on" : ""}" type="button"
              onclick="pickClose('${esc(it.text)}')">
              <div class="label">${esc(it.label)}</div>
              <div>${esc(it.text)}</div>
            </button>
          `).join("")}
        </div>

        <div class="card" style="margin-top:12px;background:rgba(11,28,45,0.6);">
          <div class="card__title">Gratitude</div>
          <button class="suggest" type="button" onclick="copyText('${esc(gratitudeLine())}')">${esc(gratitudeLine())}</button>
        </div>
      </div>
    `;
  }

  /* =========================
     Stabilizer logic (NEW behavior)
     - If DEF/RES + stabilizerMode => always stay in stabilizer until temp lowered
  ========================== */

  function shouldStabilizeNow() {
    if (!state.stabilizerMode) return false;
    return (state.temperature === "DEFENSIVE" || state.temperature === "RESISTANT");
  }

  function renderStabilizerStep() {
    const items = vossStabilizers();

    $("app").innerHTML = `
      <div class="wrap">
        <div class="muted">Call Mode • Stabilizer Active • Temp: <b>${state.temperature}</b></div>

        ${openingBlock()}

        <div class="card">
          <div class="card__title">Stabilizer Step (${state.temperature})</div>
          <div class="muted">Pick a line to stabilize (click-to-copy). You’ll stay here until you lower temperature.</div>

          <div class="stack" style="margin-top:10px;">
            ${items.map(it => `
              <button class="suggest" type="button" onclick="useStabilizer('${esc(it.text)}')">
                <div class="label">${esc(it.label)}</div>
                <div>${esc(it.text)}</div>
              </button>
            `).join("")}
          </div>

          <div class="row" style="margin-top:12px;">
            <button class="btn" type="button" onclick="setTemp('GUARDED')">✅ Set Temp → GUARDED (resume)</button>
            <button class="btn" type="button" onclick="setTemp('CALM')">✅ Set Temp → CALM (resume)</button>
            <button class="btn" type="button" onclick="renderDashboard()">Dashboard</button>
          </div>

          <div class="muted" style="margin-top:10px;">Tip: Once you feel the tone soften, tap GUARDED or CALM to continue the question flow.</div>
        </div>

        ${tempBlock()}
      </div>
    `;
  }

  function renderDashboard() {
    computeScores();
    const Q = currentQuestions();
    const list = Q.map((x, i) => `<div class="muted">${i + 1}. <b>${esc(x.key)}</b> — ${esc(x.section)}</div>`).join("");

    $("app").innerHTML = `
      <div class="wrap">
        <div class="card">
          <div class="card__title">Dashboard</div>
          <div class="muted"><b>${Q.length}</b> Questions Loaded • Starts with: <b>${esc(Q[0].key)}</b></div>

          <div class="row" style="margin-top:10px;">
            <div class="pill">Phase: <b>${state.phase}</b></div>
            <div class="pill">Structural: <b>${state.structural}</b>/100</div>
            <div class="pill">Risk: <b>${state.risk}</b>/100</div>
            <div class="pill">Temp: <b>${state.temperature}</b></div>
          </div>

          <div class="row" style="margin-top:12px;">
            <button class="btn" type="button" onclick="renderCallMode()">Open Call Mode</button>
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

  function saveTextIfNeeded() {
    const Q = currentQuestions();
    const q = Q[state.idx];
    if (!q) return;
    if (q.type !== "text") return;
    const v = $("field") ? $("field").value.trim() : "";
    state.answers[q.key] = v;
  }

  function renderCallMode() {
    computeScores();

    // ✅ NEW: Stabilizer takes over whenever temp is DEF/RES (until lowered)
    if (shouldStabilizeNow()) {
      renderStabilizerStep();
      return;
    }

    const Q = currentQuestions();
    const q = Q[state.idx];

    $("app").innerHTML = `
      <div class="wrap">
        <div class="muted">Call Mode • Question <b>${state.idx + 1}</b> of <b>${Q.length}</b> • <b>${esc(q.section)}</b></div>

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
            <button class="btn" type="button" onclick="nextQ()">Next</button>
            <button class="btn" type="button" onclick="renderDashboard()">Dashboard</button>
            <button class="btn" type="button" onclick="resetDeal()">Start New Deal</button>
          </div>
        </div>

        <div class="split">
          <div class="col">${suggestionsBlock(q)}</div>
          <div class="col">${tempBlock()}${closeBlock()}</div>
        </div>
      </div>
    `;
  }

  /* =========================
     GLOBAL ACTIONS
  ========================== */

  window.renderDashboard = renderDashboard;
  window.renderCallMode = renderCallMode;

  window.nextQ = function () {
    const Q = currentQuestions();
    const q = Q[state.idx];
    if (q && q.type === "text") saveTextIfNeeded();

    // ✅ If temp is DEF/RES, stay in stabilizer (do not advance questions)
    if (shouldStabilizeNow()) {
      renderCallMode();
      return;
    }

    if (state.idx < Q.length - 1) state.idx += 1;
    renderCallMode();
  };

  window.backQ = function () {
    const Q = currentQuestions();
    const q = Q[state.idx];
    if (q && q.type === "text") saveTextIfNeeded();
    if (state.idx > 0) state.idx -= 1;
    renderCallMode();
  };

  window.pickOption = function (opt) {
    const Q = currentQuestions();
    const q = Q[state.idx];
    state.answers[q.key] = opt;

    if (shouldStabilizeNow()) {
      renderCallMode();
      return;
    }

    if (state.idx < Q.length - 1) state.idx += 1;
    renderCallMode();
  };

  window.pickSuggestion = function (line) {
    const txt = String(line || "");
    state.selectedSuggestion = txt;
    copyToClipboard(txt);
    renderCallMode();
  };

  window.useStabilizer = function (line) {
    // ✅ click-to-copy only; stays in stabilizer until you lower temp
    copyToClipboard(String(line || ""));
    renderCallMode();
  };

  window.setTemp = function (t) {
    state.temperature = t;

    // If user lowered temp, resume normal question flow automatically
    renderCallMode();
  };

  window.toggleAdaptive = function (checked) {
    state.adaptiveFlow = !!checked;
    const Q = currentQuestions();
    if (state.idx > Q.length - 1) state.idx = Q.length - 1;
    renderDashboard();
  };

  window.toggleStabilizer = function (checked) {
    state.stabilizerMode = !!checked;
    renderDashboard();
  };

  window.pickClose = function (line) {
    const txt = String(line || "");
    state.selectedClose = txt;
    copyToClipboard(txt);
    renderCallMode();
  };

  window.toggleClose = function () {
    state.showClose = !state.showClose;
    renderCallMode();
  };

  window.copyText = function (t) {
    copyToClipboard(String(t || ""));
  };

  window.resetDeal = function () {
    state.idx = 0;
    state.answers = {};
    state.temperature = "CALM";
    state.selectedSuggestion = "";
    state.selectedClose = "";
    renderDashboard();
  };

  // init
  injectStyle();
  renderDashboard();
})();
