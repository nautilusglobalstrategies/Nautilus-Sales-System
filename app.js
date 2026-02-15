// Nautilus Sales System — V15
// Upgrade: Closing Prompts now adapt to BOTH (a) current question topic AND (b) temperature
// Keeps prior fixes: Layout stack (Closing under Questions, Temp under Closing), Start New Deal loads NEXT lead, Notes autosave

(function () {
  const TEMP_LEVELS = ["CALM", "GUARDED", "DEFENSIVE", "RESISTANT"];
  const NOTES_KEY = "call_notes";

  const state = {
    idx: 0,
    temperature: "CALM",
    answers: {},
    lead: null,
    leads: [],
    mapping: {},
    mappingSuggested: {},
    structural: 0,
    risk: 0,
    phase: "QUALIFY",
    showClose: true,
    adaptiveFlow: true,
    stabilizerMode: true,
    selectedSuggestion: "",
    selectedClose: "",
    banner: ""
  };

  /* =========================
     STORAGE
  ========================== */
  const LS_KEYS = {
    leads: "nss_leads_v1",
    leadId: "nss_selected_lead_id_v1",
    answers: "nss_answers_v1",
    mapping: "nss_mapping_v1",
    idx: "nss_idx_v1",
    temp: "nss_temp_v1"
  };

  function loadPersisted() {
    try {
      const leads = JSON.parse(localStorage.getItem(LS_KEYS.leads) || "[]");
      if (Array.isArray(leads)) state.leads = leads;

      const answers = JSON.parse(localStorage.getItem(LS_KEYS.answers) || "{}");
      if (answers && typeof answers === "object") state.answers = answers;

      const mapping = JSON.parse(localStorage.getItem(LS_KEYS.mapping) || "{}");
      if (mapping && typeof mapping === "object") state.mapping = mapping;

      const idx = Number(localStorage.getItem(LS_KEYS.idx) || "0");
      if (!Number.isNaN(idx)) state.idx = Math.max(0, idx);

      const temp = localStorage.getItem(LS_KEYS.temp);
      if (temp && TEMP_LEVELS.includes(temp)) state.temperature = temp;

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
      localStorage.setItem(LS_KEYS.mapping, JSON.stringify(state.mapping || {}));
      localStorage.setItem(LS_KEYS.leadId, state.lead ? String(state.lead.id) : "");
      localStorage.setItem(LS_KEYS.idx, String(state.idx || 0));
      localStorage.setItem(LS_KEYS.temp, String(state.temperature || "CALM"));
    } catch (e) {}
  }

  /* =========================
     OPENING SCRIPT (in-question)
  ========================== */
  const OPENING_TEMPLATE = `
Hi {{name}}, this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for {{deal_summary}}. I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill it through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
`.trim();

  function safe(v) { return String(v ?? "").trim(); }
  function getLeadField(k) { return state.lead ? safe(state.lead[k]) : ""; }
  function getAnswer(k) { return safe(state.answers[k]); }

  function dealSummaryText() {
    const product = getAnswer("product") || getLeadField("product") || "[product]";
    const qty = getAnswer("quantity") || getLeadField("quantity") || "[quantity]";
    const dest = getAnswer("destination_port") || getLeadField("destination_port") || getLeadField("country") || "[destination]";
    return `${product} — ${qty} — ${dest}`;
  }

  function greetingName() { return getLeadField("name") || "[Name]"; }

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
     QUESTION BANK
  ========================== */
  function q(key, section, prompt, placeholder) { return { key, section, prompt, type: "text", placeholder }; }
  function qs(key, section, prompt, options) { return { key, section, prompt, type: "single", options }; }
  function qscript(key, section, title) { return { key, section, prompt: title, type: "script" }; }

  const QUESTION_BANK = [
    qscript("opening_script", "Opening", "Opening Script (read verbatim)"),

    q("product", "Product", "Just to confirm, what product are you looking to source?", "e.g., Sunflower Seed Oil"),
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
     TEMP-DRIVEN ORDER
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
  function currentQuestion() {
    const Q = currentQuestions();
    const i = Math.min(Math.max(state.idx, 0), Q.length - 1);
    return Q[i];
  }

  /* =========================
     VOSS PROMPTS
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
        { label: "Dealbreaker", text: "What would make you walk away from a supplier immediately?" }
      ],
      target_price: [
        { label: "Edges", text: "What number makes you lean in—and what number kills it?" },
        { label: "Authority", text: "Who set that target range internally?" },
        { label: "Flex", text: "If the best offer lands a bit above target, what would you need to justify it?" }
      ],
      payment_instrument: [
        { label: "Cleanest", text: "Which instrument has been cleanest for you in real deals?" },
        { label: "Friction", text: "What would your bank push back on if we don’t structure it right?" },
        { label: "Driver", text: "Is that instrument choice driven by compliance, speed, or cost?" }
      ],
      issuing_bank: [
        { label: "Capacity", text: "Do you have issuance capacity with that bank right now?" },
        { label: "Format", text: "Any wording/formatting your bank expects from day one?" },
        { label: "Timing", text: "How quickly does the bank move once terms are set?" }
      ],
      approval_path: [
        { label: "Decision Map", text: "Who ultimately says yes—and what do they need to see?" },
        { label: "Sequence", text: "After you receive the Soft Offer, what happens first on your side?" },
        { label: "Speed", text: "What would accelerate approval internally?" }
      ]
    };

    return (S[key] || [
      { label: "Clarity", text: "What would you want stated clearly so this is easy to approve?" },
      { label: "Next", text: "What does the next step look like on your side?" },
      { label: "Protect", text: "What would make this feel safer and simpler for you?" }
    ]).slice(0, 4);
  }

  /* =========================
     CLOSING PROMPTS — TOPIC + TEMP (NEW)
  ========================== */

  // map any question key to a "topic bucket"
  function closeTopicFor(key) {
    const k = String(key || "");
    if (["product","specs","quantity","packaging"].includes(k)) return "PRODUCT";
    if (["destination_port","timeline"].includes(k)) return "LOGISTICS";
    if (["target_price","payment_instrument","issuing_bank","issuance_speed"].includes(k)) return "FINANCE";
    if (["company_name","entity_type","country_registration_address","website_or_profile","key_contact"].includes(k)) return "COMPANY";
    if (["approval_path","loi_icpo_ready"].includes(k)) return "APPROVAL";
    if (["trade_finance_help"].includes(k)) return "TRADE_FINANCE";
    if (["compliance_requirements"].includes(k)) return "COMPLIANCE";
    if (["other_commodities"].includes(k)) return "RELATIONSHIP";
    return "GENERAL";
  }

  // topic-specific prompt packs; then temp “styles” them
  function baseClosingForTopic(topic) {
    const T = {
      PRODUCT: [
        { label: "Confirm", text: "If we match the exact product/specs you outlined, are you ready for us to proceed to offer terms?" },
        { label: "Dealbreakers", text: "Before I send a Soft Offer, what product detail must be perfect so this doesn’t get rejected?" },
        { label: "Next Step", text: "What’s the next step on your side once you confirm the product/specs?" }
      ],
      LOGISTICS: [
        { label: "Routing", text: "If we build the offer around that destination and timeline, what happens next on your side?" },
        { label: "Constraints", text: "What logistics constraint would kill the deal—timing, port, documentation, or something else?" },
        { label: "Proceed", text: "If we can meet the schedule you want, are you ready for us to draft the Soft Offer?" }
      ],
      FINANCE: [
        { label: "Terms Lock", text: "If we hit your target range and structure payment cleanly, can you move forward to LOI/ICPO?" },
        { label: "Bank Fit", text: "What does your bank need to see so issuance is smooth with no back-and-forth?" },
        { label: "Decision", text: "What’s the one financial term that decides yes/no for you?" }
      ],
      COMPANY: [
        { label: "Verification", text: "If we package this with your correct company details, who signs off internally?" },
        { label: "Routing", text: "Who should I send the Soft Offer to so it gets reviewed fast the first time?" },
        { label: "Approval", text: "What does your team check first when a supplier offer comes in?" }
      ],
      APPROVAL: [
        { label: "Process", text: "So I don’t create friction—what’s the exact approval sequence after you receive the Soft Offer?" },
        { label: "Authority", text: "Who ultimately says yes, and what do they need to see in writing?" },
        { label: "Timing", text: "If the terms match, how quickly can you issue LOI/ICPO?" }
      ],
      TRADE_FINANCE: [
        { label: "Support", text: "Do you want us to support your bank process, or is your side fully handling issuance?" },
        { label: "Friction", text: "Where do deals usually stall for you—bank wording, timing, compliance, or pricing?" },
        { label: "Next", text: "If we align terms today, what’s the next action you want from us?" }
      ],
      COMPLIANCE: [
        { label: "Requirements", text: "If we meet your compliance requirements in writing, are you comfortable proceeding to offer terms?" },
        { label: "Red Flags", text: "What compliance issue would cause an immediate ‘no’ on your side?" },
        { label: "Documentation", text: "Which documents must be included with the Soft Offer so approval is straightforward?" }
      ],
      RELATIONSHIP: [
        { label: "Pipeline", text: "If this shipment goes well, what other commodities do you want us to support regularly?" },
        { label: "Next Deal", text: "What would make you consider a longer-term supply arrangement with us?" },
        { label: "Referral", text: "Who else in your network buys similar products so we can support them too?" }
      ],
      GENERAL: [
        { label: "Next Step", text: "If the Soft Offer matches what you want, what happens next on your side?" },
        { label: "Routing", text: "What email should receive the offer package and supporting documents?" },
        { label: "Speed", text: "How quickly would you like to move once you receive it?" }
      ]
    };

    return T[topic] || T.GENERAL;
  }

  // apply temperature style to topic prompts
  function closingSuggestionsForQuestionKey(qKey) {
    const topic = closeTopicFor(qKey);
    const base = baseClosingForTopic(topic);

    const t = state.temperature;

    // Temperature overlays that keep the *topic* but change the *tone and intent*
    if (t === "RESISTANT") {
      return [
        { label: "No Pressure", text: `No pressure. What would need to change about the ${topic.toLowerCase().replace("_"," ")} side for this to become actionable?` },
        { label: "Small Step", text: `What’s the smallest next step on the ${topic.toLowerCase().replace("_"," ")} side that still makes sense to you?` },
        { label: "Protection", text: `What would you need in writing about ${topic.toLowerCase().replace("_"," ")} so you feel fully protected?` }
      ];
    }

    if (t === "DEFENSIVE") {
      return [
        { label: "Resolve First", text: `That makes sense. What concern should we resolve first on the ${topic.toLowerCase().replace("_"," ")} side?` },
        { label: "In Writing", text: `What would you want included in writing about ${topic.toLowerCase().replace("_"," ")} so this feels safe?` },
        { label: "Control", text: `How would you like to proceed so you stay in control of the ${topic.toLowerCase().replace("_"," ")} process?` }
      ];
    }

    if (t === "GUARDED") {
      // Guarded = concise, verification oriented
      return [
        { label: base[0].label, text: base[0].text },
        { label: "Review First", text: `When you review the Soft Offer, what will you check first related to ${topic.toLowerCase().replace("_"," ")}?` },
        { label: base[1].label, text: base[1].text }
      ];
    }

    // CALM = full topic set
    return base.slice(0, 3);
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
    const total = Math.max(Q.length - 1, 1);
    const answered = Object.keys(state.answers).filter(k => k !== NOTES_KEY && hasValue(state.answers[k])).length;
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
     UI Helpers + Style
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
      .textarea{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#0B1C2D;color:#E8EEF2;min-height:110px;resize:vertical}
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
      .v{font-weight:800;text-align:right;max-width:65%}
      table{width:100%;border-collapse:collapse}
      th,td{padding:10px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:left;vertical-align:top}
      th{opacity:.85}
      .small{font-size:12px;opacity:.8}
      .banner{margin-top:10px;padding:10px 12px;border:1px solid rgba(255,255,255,0.12);border-radius:10px;background:rgba(11,28,45,0.5)}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* =========================
     Autosave
  ========================== */
  function autosaveAnswer(key, value) {
    if (!key) return;
    state.answers[key] = String(value ?? "");
    persist();
  }

  /* =========================
     Stabilizer Mode
  ========================== */
  function shouldStabilizeNow() {
    if (!state.stabilizerMode) return false;
    return (state.temperature === "DEFENSIVE" || state.temperature === "RESISTANT");
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

  // NEW: closeBlock now depends on CURRENT question key + temperature
  function closeBlock(q) {
    const items = closingSuggestionsForQuestionKey(q?.key);
    const topic = closeTopicFor(q?.key);

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
        <div class="card__title">Closing Prompts (${state.temperature} • ${esc(topic)})</div>
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

  function callNotesValue() { return safe(state.answers[NOTES_KEY] || ""); }

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
    const leadCount = (state.leads || []).length;
    const leadPos = state.lead ? ((state.leads || []).findIndex(x => String(x.id) === String(state.lead.id)) + 1) : 0;

    return `
      <div class="card">
        <div class="card__title">Call Snapshot</div>
        <div class="muted">Live summary (lead + answers + notes).</div>

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
          <div class="muted">Extra info that doesn’t fit neatly into the question fields. (Autosaves)</div>
          <textarea
            id="notesBox"
            class="textarea"
            placeholder="Type notes here…"
            oninput="autosaveAnswer('${NOTES_KEY}', this.value)"
          >${esc(callNotesValue())}</textarea>

          <div class="row" style="margin-top:10px;">
            <button class="btn" type="button" onclick="copyNotes()">Copy Notes</button>
            <button class="btn" type="button" onclick="clearNotes()">Clear Notes</button>
          </div>
        </div>

        <div class="row" style="margin-top:12px;">
          <button class="btn" type="button" onclick="copyHubspotNote()">Copy HubSpot Note</button>
          <button class="btn" type="button" onclick="copySnapshot()">Copy Snapshot</button>
        </div>

        <div class="row" style="margin-top:10px;">
          <button class="btn" type="button" onclick="startNextDeal()">
            Start New Deal ${leadCount ? `(${leadPos}/${leadCount})` : ""}
          </button>
        </div>
      </div>
    `;
  }

  /* =========================
     Dashboard (unchanged logic)
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

  function bannerBlock() {
    if (!state.banner) return "";
    return `<div class="banner">${esc(state.banner)}</div>`;
  }

  function renderDashboard() {
    computeScores();

    $("app").innerHTML = `
      <div class="wrap">
        <div class="card">
          <div class="card__title">Dashboard</div>
          <div class="muted">Import your call list (Excel or CSV), map the columns, then click a lead to load Call Mode.</div>

          <div class="row" style="margin-top:10px;">
            <input id="fileInput" class="input" type="file" accept=".xlsx,.xls,.csv" />
            <button class="btn" type="button" onclick="quickLoad()">Quick Load</button>
            <button class="btn" type="button" onclick="importFile()">Import (manual map)</button>
            <button class="btn" type="button" onclick="clearLeads()">Clear Call List</button>
            <button class="btn" type="button" onclick="renderCallMode()">Go to Call Mode</button>
          </div>

          <div class="small" style="margin-top:8px;">
            Tip: Quick Load usually works immediately. If your sheet has unusual headers, use Import (manual map) + Column Mapper.
          </div>

          ${bannerBlock()}
        </div>

        ${state._rawHeaders ? renderMapper() : ""}

        ${renderLeadTable()}

        <div class="card">
          <div class="card__title">Current Selection</div>
          <div class="muted">${state.lead ? `Loaded: <b>${esc(state.lead.name || "—")}</b> (${esc(state.lead.company_name || "—")})` : "No lead selected yet."}</div>
          <div class="row" style="margin-top:10px;">
            <button class="btn" type="button" onclick="renderCallMode()" ${state.lead ? "" : "disabled"}>Open Call Mode with Selected Lead</button>
            <button class="btn" type="button" onclick="prefillFromLead()" ${state.lead ? "" : "disabled"}>Prefill Answers from Lead</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderMapper() {
    const headers = state._rawHeaders || [];
    const options = [`<option value="">-- not provided --</option>`].concat(headers.map(h => `<option value="${esc(h)}">${esc(h)}</option>`)).join("");

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
        <div class="muted">Click Select → then open Call Mode.</div>
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
  function requireXLSX() {
    if (typeof XLSX === "undefined") {
      alert("XLSX library not found. Confirm you added the SheetJS script in index.html.");
      return false;
    }
    return true;
  }

  function importFile() {
    if (!requireXLSX()) return;

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

        state.banner = `Imported ${json.length} rows. Now use Column Mapper → Apply Mapping.`;
        persist();
        renderDashboard();
      } catch (err) {
        alert("Import failed. Try saving the sheet as .xlsx or .csv and import again.");
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function normalizeHeader(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]/g, "");
  }

  function suggestMapping(headers) {
    const norm = headers.map(h => ({ raw: h, n: normalizeHeader(h) }));

    const synonyms = {
      name: ["name","full_name","contact_name","client_name","buyer_name","person"],
      company_name: ["company","company_name","organization","organisation","firm","buyer_company","registered_company"],
      country: ["country","buyer_country","origin_country","location_country"],
      phone: ["phone","phone_number","whatsapp","whatsapp_number","mobile","tel","telephone"],
      email: ["email","email_address","mail"],
      product: ["product","commodity","item","product_name"],
      quantity: ["quantity","qty","volume","amount","mt","tonnage"],
      destination_port: ["destination","destination_port","port","dest_port","delivery_port","discharge_port"],
      target_price: ["target_price","price","price_target","usdmt","usd_per_mt","target_usd_mt"],
      packaging: ["packaging","container","container_size","pack","package","delivery_format"]
    };

    const out = {};
    for (const f of MAP_FIELDS) {
      const wanted = synonyms[f.key] || [f.key];
      let match = "";
      for (const w of wanted) {
        const m = norm.find(x => x.n === w);
        if (m) { match = m.raw; break; }
      }
      if (!match) {
        for (const w of wanted) {
          const m = norm.find(x => x.n.includes(w) || w.includes(x.n));
          if (m) { match = m.raw; break; }
        }
      }
      out[f.key] = match;
    }
    return out;
  }

  function quickLoad() {
    if (!requireXLSX()) return;

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
        const suggested = suggestMapping(headers);
        state.mappingSuggested = suggested;

        const matchedCount = Object.values(suggested).filter(Boolean).length;
        if (matchedCount < 3) {
          state._rawHeaders = headers;
          state._rawRows = json;
          state.banner = `Imported ${json.length} rows, but headers look unusual. Use Column Mapper → Apply Mapping.`;
          persist();
          renderDashboard();
          return;
        }

        state.mapping = suggested;

        const leads = json.map((r, idx) => {
          const lead = { id: String(Date.now()) + "_" + idx };
          for (const f of MAP_FIELDS) {
            const col = suggested[f.key];
            lead[f.key] = col ? safe(r[col]) : "";
          }
          return lead;
        });

        state.leads = leads;
        state.lead = leads[0] || null;

        state.banner = `Quick Loaded ✅ ${leads.length} leads. Selected: ${state.lead ? (state.lead.name || "Lead #1") : "—"}.`;
        persist();
        renderDashboard();
      } catch (err) {
        alert("Quick Load failed. Try Import (manual map) instead.");
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

    delete state._rawHeaders;
    delete state._rawRows;

    state.banner = "Mapping applied ✅ Call list is ready.";
    persist();
    renderDashboard();
  }

  function hideMapping() {
    delete state._rawHeaders;
    delete state._rawRows;
    state.banner = "";
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
    renderDashboard();
  }

  /* =========================
     Call Mode + Layout Stack
  ========================== */
  function inputUI(q) {
    const existing = state.answers[q.key] || "";
    if (q.type === "text") {
      return `
        <input
          id="field"
          class="input"
          placeholder="${esc(q.placeholder || "")}"
          value="${esc(existing)}"
          oninput="autosaveAnswer('${esc(q.key)}', this.value)"
        />
      `;
    }
    if (q.type === "single") {
      const current = state.answers[q.key] || "";
      return `<div class="row">${q.options.map(opt => `
        <button class="chip ${String(current)===String(opt) ? "chip--on" : ""}" type="button" onclick="pickOption('${esc(opt)}')">${esc(opt)}</button>
      `).join("")}</div>`;
    }
    return "";
  }

  function renderStabilizerStep() {
    const items = vossStabilizers();
    const q = currentQuestion();

    $("app").innerHTML = `
      <div class="wrap">
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

            ${closeBlock(q)}
            ${tempBlock()}
          </div>

          <div class="col">
            ${callSnapshot()}
          </div>
        </div>
      </div>
    `;
  }

  function renderCallMode() {
    computeScores();

    if (shouldStabilizeNow()) {
      renderStabilizerStep();
      return;
    }

    const Q = currentQuestions();
    state.idx = Math.min(state.idx, Q.length - 1);
    const q = Q[state.idx];
    const isScript = q.type === "script";
    const scriptText = openingScriptFilled();

    $("app").innerHTML = `
      <div class="wrap">
        <div class="split">
          <div class="col2">
            <div class="card">
              <div class="row" style="justify-content:space-between;align-items:center;">
                <div class="pill">Phase: <b>${state.phase}</b></div>
                <div class="pill">Structural: <b>${state.structural}</b>/100</div>
                <div class="pill">Risk: <b>${state.risk}</b>/100</div>
                <div class="pill">Temp: <b>${state.temperature}</b></div>
              </div>

              <div class="muted" style="margin-top:8px;">
                ${state.lead ? `Lead: <b>${esc(state.lead.name || "—")}</b> • ${esc(state.lead.company_name || "—")}` : "No lead selected — open Dashboard to select/import."}
              </div>

              <div class="muted" style="margin-top:8px;">
                Question <b>${state.idx + 1}</b> of <b>${Q.length}</b> • <b>${esc(q.section)}</b>
              </div>

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

            <!-- LAYOUT: Closing directly under Questions; Temp under Closing -->
            ${closeBlock(q)}
            ${tempBlock()}
            ${isScript ? "" : suggestionsBlock(q)}
          </div>

          <div class="col">
            ${callSnapshot()}
          </div>
        </div>
      </div>
    `;
  }

  /* =========================
     HubSpot + Snapshot
  ========================== */
  function hubspotNoteText() {
    const lead = state.lead || {};
    const lines = [];
    lines.push(`CALL NOTE — Nautilus / IBEX Intake`);
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

    const notes = callNotesValue();
    lines.push(`CALL NOTES:`);
    lines.push(notes || "—");
    lines.push("");

    lines.push(`Other Commodities: ${getAnswer("other_commodities") || "—"}`);
    lines.push("");
    lines.push(`Close / Next Step Prompt Used: ${state.selectedClose || "—"}`);
    lines.push(`Gratitude: ${gratitudeLine()}`);

    return lines.join("\n");
  }

  function snapshotText() {
    const lead = state.lead || {};
    const notes = callNotesValue();

    const base = [
      `Snapshot — ${lead.name || "—"} (${lead.company_name || "—"})`,
      `Deal: ${dealSummaryText()}`,
      `Target: ${getAnswer("target_price") || lead.target_price || "—"}`,
      `Temp: ${state.temperature} | Phase: ${state.phase} | Risk: ${state.risk}/100`,
      "",
      "Notes:",
      (notes || "—")
    ];

    return base.join("\n");
  }

  /* =========================
     NEXT LEAD / START NEW DEAL
  ========================== */
  function findLeadIndex() {
    if (!state.lead || !(state.leads || []).length) return -1;
    return (state.leads || []).findIndex(x => String(x.id) === String(state.lead.id));
  }

  function selectLeadByIndex(i) {
    const leads = state.leads || [];
    if (!leads.length) { state.lead = null; return; }
    const idx = Math.max(0, Math.min(i, leads.length - 1));
    state.lead = leads[idx];
  }

  function resetDealOnly() {
    state.idx = 0;
    state.answers = {};
    state.temperature = "CALM";
    state.selectedSuggestion = "";
    state.selectedClose = "";
  }

  function startNextDeal() {
    const leads = state.leads || [];
    const currentIdx = findLeadIndex();

    resetDealOnly();

    if (leads.length) {
      const nextIdx = (currentIdx >= 0) ? (currentIdx + 1) : 0;
      selectLeadByIndex(nextIdx % leads.length);
    }

    persist();
    renderCallMode();
  }

  /* =========================
     Global Actions
  ========================== */
  window.renderDashboard = renderDashboard;
  window.renderCallMode = renderCallMode;

  window.quickLoad = quickLoad;
  window.importFile = importFile;
  window.applyMapping = applyMapping;
  window.hideMapping = hideMapping;
  window.clearLeads = clearLeads;
  window.selectLead = selectLead;
  window.prefillFromLead = prefillFromLead;

  window.autosaveAnswer = function (key, value) { autosaveAnswer(String(key || ""), value); };

  window.nextQ = function () {
    const Q = currentQuestions();
    if (state.idx < Q.length - 1) state.idx += 1;
    persist();
    renderCallMode();
  };

  window.backQ = function () {
    if (state.idx > 0) state.idx -= 1;
    persist();
    renderCallMode();
  };

  window.pickOption = function (opt) {
    const Q = currentQuestions();
    const q = Q[state.idx];
    state.answers[q.key] = String(opt || "");
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

  window.useStabilizer = function (line) {
    copyToClipboard(String(line || ""));
    renderCallMode();
  };

  window.setTemp = function (t) {
    state.temperature = t;
    persist();
    renderCallMode();
  };

  window.toggleAdaptive = function (checked) {
    state.adaptiveFlow = !!checked;
    persist();
    renderCallMode();
  };

  window.toggleStabilizer = function (checked) {
    state.stabilizerMode = !!checked;
    persist();
    renderCallMode();
  };

  window.toggleClose = function () {
    state.showClose = !state.showClose;
    persist();
    renderCallMode();
  };

  // Notes buttons
  window.copyNotes = function () {
    const notes = callNotesValue();
    if (!notes) { alert("No notes to copy."); return; }
    copyToClipboard(notes);
    alert("Copied: Notes ✅");
  };

  window.clearNotes = function () {
    if (!confirm("Clear notes?")) return;
    state.answers[NOTES_KEY] = "";
    persist();
    renderCallMode();
  };

  window.startNextDeal = startNextDeal;

  /* =========================
     INIT
  ========================== */
  injectStyle();
  loadPersisted();
  renderDashboard();
})();
