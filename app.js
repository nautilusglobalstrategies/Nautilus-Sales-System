// Nautilus Sales System — V10 (FULL REPLACE)
// Dashboard: Import Excel/CSV call list + map columns + select lead (NO auto-switch)
// Call Mode: Product-first Voss flow + Stabilize-until-lowered + Snapshot at top + Notes (autosave all data)
// Prompts: Voss prompts + Closing prompts adapt to BOTH (current question topic) + (temperature)
// Start Next Deal: resets deal + loads next lead in list (if available)

(function () {
  const TEMP_LEVELS = ["CALM", "GUARDED", "DEFENSIVE", "RESISTANT"];

  const state = {
    idx: 0,
    temperature: "CALM",
    answers: {},            // deal answers (autosaved)
    notes: "",              // extra notes (autosaved)
    lead: null,             // selected lead from call list
    leads: [],              // imported leads list
    mapping: {},            // column mapping
    structural: 0,
    risk: 0,
    phase: "QUALIFY",
    showClose: true,
    adaptiveFlow: true,
    stabilizerMode: true,
    selectedSuggestion: "",
    selectedClose: "",
    _rawHeaders: null,
    _rawRows: null
  };

  /* =========================
     STORAGE
  ========================== */
  const LS_KEYS = {
    leads: "nss_leads_v1",
    leadId: "nss_selected_lead_id_v1",
    answers: "nss_answers_v1",
    notes: "nss_notes_v1",
    idx: "nss_idx_v1",
    temp: "nss_temp_v1",
    selectedSuggestion: "nss_selected_sugg_v1",
    selectedClose: "nss_selected_close_v1"
  };

  function safe(v) { return String(v ?? "").trim(); }

  function loadPersisted() {
    try {
      const leads = JSON.parse(localStorage.getItem(LS_KEYS.leads) || "[]");
      if (Array.isArray(leads)) state.leads = leads;

      const answers = JSON.parse(localStorage.getItem(LS_KEYS.answers) || "{}");
      if (answers && typeof answers === "object") state.answers = answers;

      state.notes = safe(localStorage.getItem(LS_KEYS.notes) || "");

      const savedIdx = parseInt(localStorage.getItem(LS_KEYS.idx) || "0", 10);
      if (!Number.isNaN(savedIdx)) state.idx = Math.max(0, savedIdx);

      const savedTemp = safe(localStorage.getItem(LS_KEYS.temp) || "");
      if (TEMP_LEVELS.includes(savedTemp)) state.temperature = savedTemp;

      state.selectedSuggestion = safe(localStorage.getItem(LS_KEYS.selectedSuggestion) || "");
      state.selectedClose = safe(localStorage.getItem(LS_KEYS.selectedClose) || "");

      const leadId = localStorage.getItem(LS_KEYS.leadId);
      if (leadId && state.leads.length) {
        const found = state.leads.find(x => String(x.id) === String(leadId));
        if (found) state.lead = found;
      }
    } catch (e) {}
  }

  function persist() {
    try {
      localStorage.setItem(LS_KEYS.leads, JSON.stringify(state.leads || []));
      localStorage.setItem(LS_KEYS.answers, JSON.stringify(state.answers || {}));
      localStorage.setItem(LS_KEYS.notes, state.notes || "");
      localStorage.setItem(LS_KEYS.idx, String(state.idx || 0));
      localStorage.setItem(LS_KEYS.temp, state.temperature || "CALM");
      localStorage.setItem(LS_KEYS.selectedSuggestion, state.selectedSuggestion || "");
      localStorage.setItem(LS_KEYS.selectedClose, state.selectedClose || "");
      localStorage.setItem(LS_KEYS.leadId, state.lead ? String(state.lead.id) : "");
    } catch (e) {}
  }

  /* =========================
     OPENING + GRATITUDE
  ========================== */
  const OPENING_TEMPLATE = `
Hi {{name}}, this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for {{deal_summary}}. I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill it through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
`.trim();

  function getLeadField(k) { return state.lead ? safe(state.lead[k]) : ""; }
  function getAnswer(k) { return safe(state.answers[k]); }

  function dealSummaryText() {
    const product = getAnswer("product") || getLeadField("product") || "[product]";
    const qty = getAnswer("quantity") || getLeadField("quantity") || "[quantity]";
    const dest = getAnswer("destination_port") || getLeadField("destination_port") || getLeadField("country") || "[destination]";
    return `${product} — ${qty} — ${dest}`;
  }

  function greetingName() {
    return getLeadField("name") || "[Name]";
  }

  function openingScriptFilled() {
    return OPENING_TEMPLATE
      .replace("{{name}}", greetingName())
      .replace("{{deal_summary}}", dealSummaryText());
  }

  function gratitudeLine() {
    if (state.temperature === "RESISTANT") return "I appreciate your time today. We can move at your pace and keep it straightforward.";
    if (state.temperature === "DEFENSIVE") return "Thank you for your time today. I’ll document this clearly and only move forward where it makes sense for you.";
    if (state.temperature === "GUARDED") return "Thanks for your time today. I’ll send this in a clear format so your side can review it quickly.";
    return "Thank you for your time today. I’ll package this into a clear Soft Corporate Offer and send it for review.";
  }

  /* =========================
     QUESTIONS (Greeting is first question)
  ========================== */
  function q(key, section, prompt, placeholder) { return { key, section, prompt, type: "text", placeholder }; }
  function qs(key, section, prompt, options) { return { key, section, prompt, type: "single", options }; }
  function qscript(key, section, title) { return { key, section, prompt: title, type: "script" }; }

  const QUESTION_BANK = [
    qscript("opening_script", "Opening", "Opening Script (read verbatim)"),

    q("product", "Product", "Just to confirm, what product are you looking to source?", "e.g., Sunflower Oil"),
    q("specs", "Product", "What specs do we need to hit so this gets approved on your side?", "grade / standards / certifications"),
    q("quantity", "Product", "What quantity are you positioned to take right now?", "MT or containers"),
    qs("packaging", "Product", "How do you want it packaged for the smoothest delivery?", ["Bulk", "Flexitank", "Bottled", "Bagged", "Drums", "Other"]),

    q("destination_port", "Logistics", "Which destination port should we build the offer around?", "Port + country"),
    qs("timeline", "Logistics", "What timeline are you working under right now?", ["Immediate", "Within 30 days", "Within 60 days", "Within 90 days", "Long-term contract"]),

    q("target_price", "Financial", "What target range per MT keeps this commercially workable for you?", "Example: 820–860 USD/MT"),
    qs("payment_instrument", "Financial", "What payment instrument are you prepared to use for this deal?", ["LC", "DLC", "SBLC", "TT", "Escrow", "Other"]),
    q("issuing_bank", "Financial", "Which bank will you be working with for the instrument? (bank name + country)", "Bank name + country"),
    q("issuance_speed", "Financial", "Once terms line up, how quickly can issuance happen on your side?", "e.g., 3–5 banking days"),

    q("company_name", "Company", "What’s the exact registered company name we should put on the offer package?", "Registered company name"),
    q("entity_type", "Company", "What type of entity is the buyer (LLC, Corporation, Partnership, etc.)?", "Entity type"),
    q("country_registration_address", "Company", "What country is the company registered in, and what address should we reference?", "Country + business address"),
    q("website_or_profile", "Company", "Do you have a website or company profile link we should use for verification (or N/A)?", "Website or N/A"),
    q("key_contact", "Company", "Who should receive the offer package—name, title, phone, and email?", "Contact details"),

    q("approval_path", "Engagement", "When you receive the Soft Offer, how does approval usually happen on your side?", "steps + decision owner"),
    qs("loi_icpo_ready", "Engagement", "If the terms work, are you ready to issue an LOI or ICPO on letterhead?", ["Yes", "Needs internal approval", "Not ready"]),
    q("trade_finance_help", "Trade Finance", "Do you want support on trade finance/issuance, or is your bank handling everything?", "Bank handling / Need support"),
    q("compliance_requirements", "Compliance", "Any compliance or regulatory requirements we should design around on your side?", "Requirements"),
    q("other_commodities", "Relationship", "Besides this product, what other commodities are you regularly buying or selling?", "Other commodities")
  ];

  /* =========================
     TEMP-DRIVEN ORDER (Greeting stays first)
  ========================== */
  function getQueue() {
    const greeting = QUESTION_BANK.find(x => x.key === "opening_script");
    const rest = QUESTION_BANK.filter(x => x.key !== "opening_script");

    if (!state.adaptiveFlow) return [greeting, ...rest];

    if (state.temperature === "CALM" || state.temperature === "GUARDED") return [greeting, ...rest];

    if (state.temperature === "DEFENSIVE") {
      const orderKeys = [
        "product","specs","quantity","packaging",
        "destination_port","timeline",
        "company_name","entity_type","country_registration_address","website_or_profile","key_contact",
        "approval_path","loi_icpo_ready",
        "target_price","payment_instrument","issuing_bank","issuance_speed",
        "trade_finance_help","compliance_requirements","other_commodities"
      ];
      return [greeting, ...orderKeys.map(k => rest.find(x => x.key === k)).filter(Boolean)];
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
      return [greeting, ...orderKeys.map(k => rest.find(x => x.key === k)).filter(Boolean)];
    }

    return [greeting, ...rest];
  }

  function currentQuestions() { return getQueue(); }

  /* =========================
     VOSS PROMPTS (non-repetitive)
  ========================== */
  function vossStabilizers() {
    return [
      { label: "Label + Calibrate", text: "It sounds like something here doesn’t feel solid yet. What’s the biggest concern?" },
      { label: "Slow It Down", text: "That makes sense. What would you need to see in writing to feel protected?" },
      { label: "Define Risk", text: "What risk are you most focused on avoiding on this transaction?" },
      { label: "Small Step", text: "What’s the smallest next step that still makes sense for you?" }
    ];
  }

  function vossSuggestionsFor(key) {
    if ((state.temperature === "DEFENSIVE" || state.temperature === "RESISTANT") && state.stabilizerMode) {
      return vossStabilizers();
    }

    const S = {
      product: [
        { label: "Driver", text: "What’s driving the timing on this?" },
        { label: "Success", text: "What does a clean first shipment look like for you?" },
        { label: "Dealbreaker", text: "What would make you walk away from a supplier immediately?" },
        { label: "Non-negotiable", text: "What’s the one thing you refuse to compromise on?" }
      ],
      specs: [
        { label: "Approval", text: "What has to be true in the specs for this to be approved instantly?" },
        { label: "Risk", text: "Where do suppliers usually miss the spec in your experience?" },
        { label: "Proof", text: "What proof would make this easy to say yes to—COA, SGS, certifications?" },
        { label: "Tolerance", text: "What’s the acceptable tolerance before it becomes a rejection?" }
      ],
      quantity: [
        { label: "Reality", text: "What volume is realistic versus optimistic?" },
        { label: "Scale", text: "If the first shipment lands clean, how aggressive do you want to scale?" },
        { label: "Constraint", text: "What’s the constraint—cash, storage, distribution, or approvals?" },
        { label: "Anchor", text: "If you had guaranteed supply, where would you set your volume?" }
      ],
      target_price: [
        { label: "Line", text: "At what number does this stop working for you?" },
        { label: "Authority", text: "Who set that target range internally?" },
        { label: "Justify", text: "If the best offer lands above target, what would you need to justify it?" },
        { label: "Tradeoff", text: "If price moves, what would you trade for it—speed, terms, or specs?" }
      ],
      payment_instrument: [
        { label: "Cleanest", text: "Which instrument has been cleanest for you in real deals?" },
        { label: "Pushback", text: "What does your bank typically push back on?" },
        { label: "Driver", text: "Is that instrument driven by compliance, speed, or cost?" },
        { label: "Friction", text: "Where do these deals usually get stuck—wording, timing, or approvals?" }
      ],
      issuing_bank: [
        { label: "Capacity", text: "Do you have issuance capacity with that bank right now?" },
        { label: "Format", text: "Any wording your bank insists on from day one?" },
        { label: "Timing", text: "Once terms are set, how fast does the bank move?" },
        { label: "Blocker", text: "What could delay issuance internally?" }
      ],
      approval_path: [
        { label: "Kill Switch", text: "Who can kill this internally?" },
        { label: "Sequence", text: "After you receive the Soft Offer, what happens first on your side?" },
        { label: "Speed", text: "What would accelerate approval internally?" },
        { label: "Proof", text: "What does the final decision-maker need to see?" }
      ]
    };

    return (S[key] || [
      { label: "Clarity", text: "What needs to be stated plainly so this is easy to approve?" },
      { label: "Next", text: "What does the next step look like on your side?" },
      { label: "Control", text: "What would make you feel fully in control here?" },
      { label: "Risk", text: "What’s the biggest thing you’re protecting against?" }
    ]).slice(0, 4);
  }

  /* =========================
     CLOSING PROMPTS: topic + temperature (non-repetitive)
  ========================== */
  function closingSuggestionsFor(key) {
    const t = state.temperature;

    const TOPIC = {
      opening_script: "opening",
      product: "product",
      specs: "specs",
      quantity: "volume",
      packaging: "logistics",
      destination_port: "logistics",
      timeline: "timing",
      target_price: "price",
      payment_instrument: "payment",
      issuing_bank: "payment",
      issuance_speed: "payment",
      approval_path: "approval",
      loi_icpo_ready: "approval",
      trade_finance_help: "finance",
      compliance_requirements: "compliance",
      other_commodities: "relationship"
    };

    const topic = TOPIC[key] || "general";

    const BANK = {
      opening: [
        { label: "Permission", text: "Is now still a good time, or is there a better time that works for you?" },
        { label: "Control", text: "How would you like to run this call so it’s useful to you?" },
        { label: "Outcome", text: "When we hang up, what would make you feel this was worth it?" }
      ],
      product: [
        { label: "Priority", text: "What matters most here—price, speed, or certainty?" },
        { label: "Dealbreaker", text: "What would make this a hard no, even if the offer looks good?" },
        { label: "Ownership", text: "If we match this exactly, are you comfortable owning the first shipment?" }
      ],
      specs: [
        { label: "Approval", text: "What has to be true in the specs for this to be approved immediately?" },
        { label: "Proof", text: "What proof removes doubt—COA, SGS, certifications?" },
        { label: "Rejection", text: "What spec issue causes an automatic rejection on your side?" }
      ],
      volume: [
        { label: "Scale", text: "If the first shipment lands clean, how hard do you want to scale?" },
        { label: "Reality", text: "What volume is realistic versus optimistic?" },
        { label: "Constraint", text: "What’s the constraint—cash, storage, distribution, approvals?" }
      ],
      logistics: [
        { label: "Lock Down", text: "What should we lock down now so nothing surprises you at the port?" },
        { label: "Win", text: "What has to be true at delivery for you to call it a win?" },
        { label: "Failure Point", text: "Where do shipments usually go wrong in your experience?" }
      ],
      timing: [
        { label: "Consequence", text: "If this misses your timeline, what’s the fallout?" },
        { label: "Firm vs Prefer", text: "Is that a firm deadline or a preference?" },
        { label: "Accelerate", text: "What would justify moving faster than planned?" }
      ],
      price: [
        { label: "Line", text: "At what number does this become a no?" },
        { label: "Authority", text: "Who has final say if price lands slightly outside target?" },
        { label: "Justify", text: "What would need to be true to justify paying above target?" }
      ],
      payment: [
        { label: "Pushback", text: "What does your bank usually push back on?" },
        { label: "Delay", text: "What could delay issuance internally?" },
        { label: "Friction", text: "Where do these deals usually get stuck—wording, timing, or approvals?" }
      ],
      approval: [
        { label: "Kill Switch", text: "Who can kill this deal internally?" },
        { label: "Bottleneck", text: "What part of approval slows things down?" },
        { label: "Green Light", text: "What has to happen for you to say yes immediately?" }
      ],
      finance: [
        { label: "Control", text: "Where do you want to maintain full control in this process?" },
        { label: "Support", text: "Would structuring support make this easier for you?" },
        { label: "Exposure", text: "Are you protecting liquidity here or minimizing risk?" }
      ],
      compliance: [
        { label: "Documentation", text: "What documentation removes compliance anxiety?" },
        { label: "Risk Floor", text: "What compliance risk can’t be tolerated under any condition?" },
        { label: "Audit", text: "If this were audited tomorrow, what would they question?" }
      ],
      relationship: [
        { label: "Open Loop", text: "What else are you buying or selling regularly that we should plug into?" },
        { label: "Pattern", text: "What products are you consistently in the market for?" },
        { label: "Timing", text: "Which commodity is most urgent on your side right now?" }
      ],
      general: [
        { label: "Holdback", text: "If we solved every concern, what would still hold you back?" },
        { label: "Control", text: "What would make you feel fully in control here?" },
        { label: "Next", text: "What needs to happen next on your side for this to move?" }
      ]
    };

    let prompts = (BANK[topic] || BANK.general).slice(0, 3);

    if (t === "DEFENSIVE") {
      prompts = prompts.map(p => ({
        label: p.label,
        text: p.text + " I’m asking so we don’t miss anything important."
      }));
    }

    if (t === "RESISTANT") {
      prompts = [
        { label: "Smallest Step", text: "What’s the smallest step you’d be comfortable taking right now?" },
        { label: "Hesitation", text: "What’s the real hesitation here?" },
        { label: "Exit Frame", text: "If this isn’t right, what makes it wrong?" }
      ];
    }

    return prompts;
  }

  /* =========================
     Scoring
  ========================== */
  function hasValue(v) {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return String(v).trim().length > 0;
  }

  function computeScores() {
    const Q = currentQuestions();
    const total = Math.max(Q.length - 1, 1); // exclude opening_script
    const answered = Object.keys(state.answers).filter(k => hasValue(state.answers[k])).length;

    state.structural = Math.round((answered / total) * 100);

    let r = 0;
    if (!hasValue(state.answers.target_price) && !hasValue(getLeadField("target_price"))) r += 18;
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
     UI Helpers
  ========================== */
  function $(id) { return document.getElementById(id); }

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
      .wrap{padding:20px;max-width:1200px}
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
      .pill{display:inline-flex;gap:8px;align-items:center;padding:8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(11,28,45,0.5);color:#E8EEF2}
      .label{opacity:.8;font-size:12px;margin-bottom:6px}
      .split{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}
      .col{flex:1;min-width:320px}
      .col2{flex:2;min-width:420px}
      .toggle{display:flex;gap:10px;align-items:center}
      .scriptBox{white-space:pre-wrap;line-height:1.45;background:rgba(11,28,45,0.55);border:1px solid rgba(255,255,255,0.12);padding:12px;border-radius:10px}
      .kv{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08)}
      .k{opacity:.8}
      .v{font-weight:800;text-align:right}
      table{width:100%;border-collapse:collapse}
      th,td{padding:10px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:left;vertical-align:top}
      th{opacity:.85}
      .small{font-size:12px;opacity:.8}
      textarea.input{min-height:120px;resize:vertical}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* =========================
     Stabilizer Mode
  ========================== */
  function shouldStabilizeNow() {
    if (!state.stabilizerMode) return false;
    return (state.temperature === "DEFENSIVE" || state.temperature === "RESISTANT");
  }

  function renderStabilizerStep() {
    const items = vossStabilizers();
    $("app").innerHTML = `
      <div class="wrap">
        ${callSnapshot()}  <!-- snapshot at top -->
        <div class="muted">Stabilizer Active • Temp: <b>${state.temperature}</b></div>
        <div class="split">
          <div class="col2">
            <div class="card">
              <div class="card__title">Stabilizer Step (${state.temperature})</div>
              <div class="muted">Pick a line (click-to-copy). You’ll stay here until you lower temperature.</div>
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
              </div>
            </div>
            ${tempBlock()}
          </div>
          <div class="col">
            <div class="card">
              <div class="card__title">Navigation</div>
              <div class="row">
                <button class="btn" type="button" onclick="renderDashboard()">Dashboard</button>
                <button class="btn" type="button" onclick="renderCallMode()">Call Mode</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    wireNotesAutosave();
  }

  /* =========================
     Blocks
  ========================== */
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
            <span>Adaptive Flow</span>
          </div>
          <div class="toggle">
            <input type="checkbox" ${state.stabilizerMode ? "checked" : ""} onchange="toggleStabilizer(this.checked)" />
            <span>Stabilize-until-lowered</span>
          </div>
        </div>
      </div>
    `;
  }

  function suggestionsBlock(q) {
    const items = vossSuggestionsFor(q.key);
    return `
      <div class="card">
        <div class="card__title">Voss Prompts (click = copy)</div>
        <div class="stack">
          ${items.map(it => `
            <button class="suggest" type="button" onclick="pickSuggestion('${esc(it.text)}')">
              <div class="label">${esc(it.label)}</div>
              <div>${esc(it.text)}</div>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Closing prompts should sit directly under the question (closing the gap)
  function closeBlock(qKey) {
    const items = closingSuggestionsFor(qKey);

    if (!state.showClose) {
      return `
        <div class="card">
          <div class="row" style="justify-content:space-between;align-items:center;">
            <div class="card__title" style="margin:0;">Closing Prompts</div>
            <button class="btn" type="button" onclick="toggleClose()">Show</button>
          </div>
          <div class="muted">Hidden.</div>
        </div>
      `;
    }

    return `
      <div class="card">
        <div class="card__title">Closing Prompts (Topic + Temp: ${state.temperature})</div>
        <div class="stack" style="margin-top:10px;">
          ${items.map(it => `
            <button class="suggest" type="button" onclick="pickClose('${esc(it.text)}')">
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

  function callSnapshotRows() {
    const lead = state.lead || {};
    return [
      ["Lead Name", lead.name || "—"],
      ["Company", lead.company_name || "—"],
      ["Country", lead.country || "—"],
      ["Phone", lead.phone || "—"],
      ["Email", lead.email || "—"],
      ["Deal", dealSummaryText()],
      ["Target Price", getAnswer("target_price") || lead.target_price || "—"],
      ["Packaging/Container", getAnswer("packaging") || lead.packaging || lead.container || "—"],
      ["Payment Instrument", getAnswer("payment_instrument") || "—"],
      ["Issuing Bank", getAnswer("issuing_bank") || "—"],
      ["LOI/ICPO Ready", getAnswer("loi_icpo_ready") || "—"]
    ];
  }

  function callSnapshot() {
    const rows = callSnapshotRows();
    return `
      <div class="card">
        <div class="card__title">Snapshot + Notes (Autosaves)</div>
        <div style="margin-top:8px;">
          ${rows.map(([k, v]) => `
            <div class="kv">
              <div class="k">${esc(k)}</div>
              <div class="v">${esc(v)}</div>
            </div>
          `).join("")}
        </div>

        <div class="card" style="margin-top:12px;background:rgba(11,28,45,0.6);">
          <div class="card__title">Notes</div>
          <div class="muted">Extra info that doesn’t fit neatly into the question fields.</div>
          <textarea id="notesBox" class="input" placeholder="Type notes here...">${esc(state.notes)}</textarea>
          <div class="row" style="margin-top:10px;">
            <button class="btn" type="button" onclick="copyNotes()">Copy Notes</button>
            <button class="btn" type="button" onclick="clearNotes()">Clear Notes</button>
          </div>
        </div>

        <div class="row" style="margin-top:12px;">
          <button class="btn" type="button" onclick="copyHubspotNote()">Copy HubSpot Note</button>
          <button class="btn" type="button" onclick="copySnapshot()">Copy Snapshot</button>
          <button class="btn" type="button" onclick="startNextLead()">Start Next Deal (next contact)</button>
        </div>
      </div>
    `;
  }

  function wireNotesAutosave() {
    const notesEl = document.getElementById("notesBox");
    if (!notesEl) return;
    notesEl.addEventListener("input", function () {
      state.notes = notesEl.value || "";
      persist();
    });
  }

  /* =========================
     Dashboard: Import + Map + Select Lead
  ========================== */
  const MAP_FIELDS = [
    { key: "name", label: "Name" },
    { key: "company_name", label: "Company Name" },
    { key: "country", label: "Country" },
    { key: "phone", label: "Phone / WhatsApp" },
    { key: "email", label: "Email" },
    { key: "product", label: "Product" },
    { key: "quantity", label: "Quantity" },
    { key: "destination_port", label: "Destination / Port" },
    { key: "target_price", label: "Target Price (USD/MT)" },
    { key: "packaging", label: "Container / Packaging" }
  ];

  function renderDashboard() {
    computeScores();

    $("app").innerHTML = `
      <div class="wrap">
        <div class="card">
          <div class="card__title">Dashboard</div>
          <div class="muted">Import your call list (Excel/CSV), map headers, then select a lead. You choose when to open Call Mode.</div>

          <div class="row" style="margin-top:10px;">
            <input id="fileInput" class="input" type="file" accept=".xlsx,.xls,.csv" />
            <button class="btn" type="button" onclick="importFile()">Import</button>
            <button class="btn" type="button" onclick="clearLeads()">Clear Call List</button>
            <button class="btn" type="button" onclick="renderCallMode()" ${state.lead ? "" : "disabled"}>Open Call Mode</button>
          </div>

          <div class="small" style="margin-top:8px;">
            After import: Column Mapper appears → Apply Mapping → Call list populates.
          </div>
        </div>

        ${state._rawHeaders ? renderMapper() : ""}

        ${renderLeadTable()}

        <div class="card">
          <div class="card__title">Current Selection</div>
          <div class="muted">${state.lead ? `Loaded: <b>${esc(state.lead.name || "—")}</b> (${esc(state.lead.company_name || "—")})` : "No lead selected yet."}</div>
          <div class="row" style="margin-top:10px;">
            <button class="btn" type="button" onclick="renderCallMode()" ${state.lead ? "" : "disabled"}>Open Call Mode</button>
            <button class="btn" type="button" onclick="prefillFromLead()" ${state.lead ? "" : "disabled"}>Prefill Answers from Lead</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderMapper() {
    const headers = state._rawHeaders || [];
    const options = [`<option value="">-- not provided --</option>`]
      .concat(headers.map(h => `<option value="${esc(h)}">${esc(h)}</option>`))
      .join("");

    return `
      <div class="card">
        <div class="card__title">Column Mapper</div>
        <div class="muted">Match your spreadsheet headers to our fields. Then click “Apply Mapping”.</div>

        <div style="margin-top:10px;">
          ${MAP_FIELDS.map(f => `
            <div class="kv">
              <div class="k">${esc(f.label)}</div>
              <div class="v" style="width:55%;text-align:left;">
                <select class="input" style="width:100%;" id="map_${esc(f.key)}">
                  ${options}
                </select>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="row" style="margin-top:12px;">
          <button class="btn" type="button" onclick="applyMapping()">Apply Mapping</button>
          <button class="btn" type="button" onclick="hideMapping()">Hide Mapper</button>
        </div>
      </div>
    `;
  }

  function renderLeadTable() {
    const leads = state.leads || [];
    if (!leads.length) {
      return `
        <div class="card">
          <div class="card__title">Call List</div>
          <div class="muted">No call list loaded yet. Import an Excel/CSV above.</div>
        </div>
      `;
    }

    const rows = leads.slice(0, 200).map(l => `
      <tr>
        <td><button class="btn" type="button" onclick="selectLead('${esc(String(l.id))}')">Select</button></td>
        <td>${esc(l.name || "—")}</td>
        <td>${esc(l.company_name || "—")}</td>
        <td>${esc(l.country || "—")}</td>
        <td>${esc(l.product || "—")}</td>
        <td>${esc(l.quantity || "—")}</td>
        <td>${esc(l.destination_port || "—")}</td>
        <td>${esc(l.phone || "—")}</td>
        <td>${esc(l.email || "—")}</td>
      </tr>
    `).join("");

    return `
      <div class="card">
        <div class="card__title">Call List (first 200 shown)</div>
        <div class="muted">Select a lead → then open Call Mode.</div>
        <div style="overflow:auto;margin-top:10px;">
          <table>
            <thead>
              <tr>
                <th>Action</th><th>Name</th><th>Company</th><th>Country</th><th>Product</th><th>Qty</th><th>Destination</th><th>Phone</th><th>Email</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* =========================
     Import Excel/CSV
  ========================== */
  function importFile() {
    const input = document.getElementById("fileInput");
    if (!input || !input.files || !input.files[0]) {
      alert("Choose an Excel (.xlsx) or CSV file first.");
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];

        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!json.length) {
          alert("No rows found in that file.");
          return;
        }

        const headers = Object.keys(json[0] || {});
        state._rawHeaders = headers;
        state._rawRows = json;

        persist();
        alert(`Imported ${json.length} rows. Now map columns in Column Mapper → Apply Mapping.`);
        renderDashboard();
      } catch (err) {
        alert("Import failed. Try saving the sheet as .xlsx or .csv and import again.");
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function applyMapping() {
    const headers = state._rawHeaders || [];
    const rows = state._rawRows || [];
    if (!headers.length || !rows.length) {
      alert("Import a file first.");
      return;
    }

    const mapping = {};
    for (const f of MAP_FIELDS) {
      const sel = document.getElementById("map_" + f.key);
      mapping[f.key] = sel ? sel.value : "";
    }
    state.mapping = mapping;

    const leads = rows.map((r, idx) => {
      const lead = { id: String(Date.now()) + "_" + idx };
      for (const f of MAP_FIELDS) {
        const col = mapping[f.key];
        lead[f.key] = col ? safe(r[col]) : "";
      }
      return lead;
    });

    state.leads = leads;
    if (!state.lead && leads.length) state.lead = leads[0];

    state._rawHeaders = null;
    state._rawRows = null;

    persist();
    alert("Mapping applied. Call list is ready.");
    renderDashboard();
  }

  function hideMapping() {
    state._rawHeaders = null;
    state._rawRows = null;
    renderDashboard();
  }

  function clearLeads() {
    if (!confirm("Clear the entire call list?")) return;
    state.leads = [];
    state.lead = null;
    persist();
    renderDashboard();
  }

  function selectLead(id) {
    const found = (state.leads || []).find(x => String(x.id) === String(id));
    if (!found) return;
    state.lead = found;
    persist();
    renderDashboard();
  }

  function prefillFromLead() {
    if (!state.lead) return;
    const lead = state.lead;

    const maybeSet = (k, v) => {
      if (!hasValue(state.answers[k]) && hasValue(v)) state.answers[k] = v;
    };

    maybeSet("product", lead.product);
    maybeSet("quantity", lead.quantity);
    maybeSet("destination_port", lead.destination_port);
    maybeSet("target_price", lead.target_price);
    maybeSet("packaging", lead.packaging);

    persist();
    alert("Prefilled deal answers from lead (where blank).");
    renderCallMode();
  }

  /* =========================
     Call Mode
  ========================== */
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

  function saveTextIfNeeded() {
    const Q = currentQuestions();
    const q = Q[state.idx];
    if (!q || q.type !== "text") return;
    const el = document.getElementById("field");
    const v = el ? el.value.trim() : "";
    state.answers[q.key] = v;
    persist();
  }

  function renderCallMode() {
    computeScores();

    if (shouldStabilizeNow()) {
      renderStabilizerStep();
      return;
    }

    const Q = currentQuestions();
    const q = Q[state.idx];
    const isScript = q.type === "script";
    const scriptText = openingScriptFilled();

    $("app").innerHTML = `
      <div class="wrap">
        ${callSnapshot()}  <!-- snapshot at top -->

        <div class="muted">
          ${state.lead ? `Lead: <b>${esc(state.lead.name || "—")}</b> • ${esc(state.lead.company_name || "—")}` : "No lead selected — open Dashboard to select/import."}
        </div>

        <div class="split">
          <div class="col2">
            <div class="card">
              <div class="row" style="justify-content:space-between;align-items:center;">
                <div class="pill">Phase: <b>${state.phase}</b></div>
                <div class="pill">Structural: <b>${state.structural}</b>/100</div>
                <div class="pill">Risk: <b>${state.risk}</b>/100</div>
                <div class="pill">Temp: <b>${state.temperature}</b></div>
              </div>

              <div class="muted" style="margin-top:8px;">Question <b>${state.idx + 1}</b> of <b>${Q.length}</b> • <b>${esc(q.section)}</b></div>

              <div class="q" style="margin-top:10px;">${esc(q.prompt)}</div>

              ${
                isScript
                  ? `<div class="scriptBox" style="margin-top:10px;">${esc(scriptText)}</div>
                     <div class="row" style="margin-top:10px;">
                       <button class="btn" type="button" onclick="copyText('${esc(scriptText)}')">Copy Opening Script</button>
                     </div>`
                  : `<div style="margin-top:10px;">${inputUI(q)}</div>`
              }

              <div class="row" style="margin-top:12px;">
                <button class="btn" type="button" onclick="backQ()" ${state.idx === 0 ? "disabled" : ""}>Back</button>
                <button class="btn" type="button" onclick="nextQ()">Next</button>
                <button class="btn" type="button" onclick="renderDashboard()">Dashboard</button>
                <button class="btn" type="button" onclick="prefillFromLead()" ${state.lead ? "" : "disabled"}>Prefill from Lead</button>
              </div>
            </div>

            ${isScript ? "" : suggestionsBlock(q)}
            ${closeBlock(q.key)}
            ${tempBlock()}
          </div>

          <div class="col">
            <div class="card">
              <div class="card__title">Navigation</div>
              <div class="row">
                <button class="btn" type="button" onclick="renderDashboard()">Dashboard</button>
                <button class="btn" type="button" onclick="renderCallMode()">Call Mode</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    wireNotesAutosave();
  }

  /* =========================
     HubSpot copy outputs
  ========================== */
  function hubspotNoteText() {
    const lead = state.lead || {};
    const lines = [];
    lines.push(`CALL NOTE — Nautilus Intake`);
    lines.push(`Name: ${lead.name || "—"} | Company: ${lead.company_name || "—"} | Country: ${lead.country || "—"}`);
    lines.push(`Phone: ${lead.phone || "—"} | Email: ${lead.email || "—"}`);
    lines.push(`Temp: ${state.temperature} | Phase: ${state.phase} | Structural: ${state.structural}/100 | Risk: ${state.risk}/100`);
    lines.push("");

    lines.push(`Inquiry / Deal Summary: ${dealSummaryText()}`);
    lines.push(`Specs: ${getAnswer("specs") || "—"}`);
    lines.push(`Packaging/Container: ${getAnswer("packaging") || lead.packaging || lead.container || "—"}`);
    lines.push(`Timeline: ${getAnswer("timeline") || "—"}`);
    lines.push("");

    lines.push(`Target Price (USD/MT): ${getAnswer("target_price") || lead.target_price || "—"}`);
    lines.push(`Payment Instrument: ${getAnswer("payment_instrument") || "—"}`);
    lines.push(`Issuing Bank: ${getAnswer("issuing_bank") || "—"}`);
    lines.push(`Issuance Speed: ${getAnswer("issuance_speed") || "—"}`);
    lines.push("");

    lines.push(`LOI/ICPO Readiness: ${getAnswer("loi_icpo_ready") || "—"}`);
    lines.push(`Approval Path: ${getAnswer("approval_path") || "—"}`);
    lines.push(`Trade Finance Help Needed: ${getAnswer("trade_finance_help") || "—"}`);
    lines.push(`Compliance Notes: ${getAnswer("compliance_requirements") || "—"}`);
    lines.push("");

    lines.push(`Other Commodities: ${getAnswer("other_commodities") || "—"}`);
    lines.push(`Notes: ${state.notes || "—"}`);
    lines.push("");
    lines.push(`Close / Next Step Prompt Used: ${state.selectedClose || "—"}`);
    lines.push(`Gratitude: ${gratitudeLine()}`);

    return lines.join("\n");
  }

  function snapshotText() {
    const lead = state.lead || {};
    return [
      `Snapshot — ${lead.name || "—"} (${lead.company_name || "—"})`,
      `Deal: ${dealSummaryText()}`,
      `Target: ${getAnswer("target_price") || lead.target_price || "—"}`,
      `Temp: ${state.temperature} | Phase: ${state.phase} | Risk: ${state.risk}/100`,
      `Notes: ${state.notes || "—"}`
    ].join("\n");
  }

  /* =========================
     Start Next Deal loads next contact
  ========================== */
  function startNextLead() {
    // capture where we are now in list
    const leads = state.leads || [];
    let next = null;

    if (state.lead && leads.length) {
      const i = leads.findIndex(x => String(x.id) === String(state.lead.id));
      if (i >= 0 && i < leads.length - 1) next = leads[i + 1];
    }

    // reset deal fields
    state.idx = 0;
    state.answers = {};
    state.notes = "";
    state.temperature = "CALM";
    state.selectedSuggestion = "";
    state.selectedClose = "";

    // load next lead if possible (otherwise keep current)
    if (next) state.lead = next;

    persist();
    renderCallMode();
  }

  /* =========================
     Notes actions
  ========================== */
  function autosaveNotes() {
    const box = document.getElementById("notesBox");
    if (!box) return;
    state.notes = box.value || "";
    persist();
  }

  /* =========================
     Global Actions (buttons)
  ========================== */
  window.renderDashboard = renderDashboard;
  window.renderCallMode = renderCallMode;

  window.importFile = importFile;
  window.applyMapping = applyMapping;
  window.hideMapping = hideMapping;
  window.clearLeads = clearLeads;
  window.selectLead = selectLead;
  window.prefillFromLead = prefillFromLead;

  window.nextQ = function () {
    const Q = currentQuestions();
    const q = Q[state.idx];
    if (q && q.type === "text") saveTextIfNeeded();
    if (state.idx < Q.length - 1) state.idx += 1;
    persist();
    renderCallMode();
  };

  window.backQ = function () {
    const Q = currentQuestions();
    const q = Q[state.idx];
    if (q && q.type === "text") saveTextIfNeeded();
    if (state.idx > 0) state.idx -= 1;
    persist();
    renderCallMode();
  };

  window.pickOption = function (opt) {
    const Q = currentQuestions();
    const q = Q[state.idx];
    state.answers[q.key] = opt;
    persist();
    if (state.idx < Q.length - 1) state.idx += 1;
    renderCallMode();
  };

  window.pickSuggestion = function (line) {
    const txt = String(line || "");
    state.selectedSuggestion = txt;
    copyToClipboard(txt);
    persist();
    renderCallMode();
  };

  window.pickClose = function (line) {
    const txt = String(line || "");
    state.selectedClose = txt;
    copyToClipboard(txt);
    persist();
    renderCallMode();
  };

  window.copyText = function (t) { copyToClipboard(String(t || "")); };

  window.copySnapshot = function () {
    computeScores();
    copyToClipboard(snapshotText());
    alert("Copied: Snapshot ✅");
  };

  window.copyHubspotNote = function () {
    computeScores();
    copyToClipboard(hubspotNoteText());
    alert("Copied: HubSpot Note ✅");
  };

  window.copyNotes = function () {
    autosaveNotes();
    copyToClipboard(state.notes || "");
    alert("Copied: Notes ✅");
  };

  window.clearNotes = function () {
    state.notes = "";
    persist();
    renderCallMode();
  };

  window.useStabilizer = function (line) {
    copyToClipboard(String(line || ""));
    renderCallMode();
  };

  window.setTemp = function (t) { state.temperature = t; persist(); renderCallMode(); };

  window.toggleAdaptive = function (checked) { state.adaptiveFlow = !!checked; persist(); renderCallMode(); };

  window.toggleStabilizer = function (checked) { state.stabilizerMode = !!checked; persist(); renderCallMode(); };

  window.toggleClose = function () { state.showClose = !state.showClose; persist(); renderCallMode(); };

  window.startNextLead = startNextLead;

  /* =========================
     Missing functions we referenced (dashboard + helpers)
  ========================== */
  function renderMapper() { return ""; } // placeholder safeguard (overridden earlier in file via hoisting)
  function renderLeadTable() { return ""; } // placeholder safeguard

  // NOTE: renderMapper & renderLeadTable are defined above (function hoisting covers call order)

  // Fix: wireNotesAutosave
  // (Defined earlier as wireNotesAutosave())

  /* =========================
     INIT
  ========================== */
  injectStyle();
  loadPersisted();
  renderDashboard();
})();
