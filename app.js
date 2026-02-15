// Nautilus Sales System — V7
// Voss-Only + Temp-Driven Flow + Stabilize-until-temp-lowers
// Greeting is Q1 AND auto-fills product/quantity/destination
// Call Mode includes "Call Snapshot" of all answers
// App starts in Call Mode by default

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
    stabilizerMode: true
  };

  /* =========================
     OPENING SCRIPT TEMPLATE (auto-filled)
  ========================== */

  const OPENING_TEMPLATE = `
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for {{deal_summary}}. I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill it through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
`.trim();

  function getAnswer(key) {
    const v = state.answers[key];
    if (v == null) return "";
    return String(v).trim();
  }

  function dealSummaryText() {
    const product = getAnswer("product") || "[product]";
    const qty = getAnswer("quantity") || "[quantity]";
    const dest = getAnswer("destination_port") || "[destination]";
    return `${product} — ${qty} — ${dest}`;
  }

  function openingScriptFilled() {
    return OPENING_TEMPLATE.replace("{{deal_summary}}", dealSummaryText());
  }

  function gratitudeLine() {
    if (state.temperature === "RESISTANT") {
      return "I appreciate your time today. We can move at your pace and keep it straightforward.";
    }
    if (state.temperature === "DEFENSIVE") {
      return "Thank you for your time today. I’ll document this clearly and only move forward where it makes sense for you.";
    }
    if (state.temperature === "GUARDED") {
      return "Thanks for your time today. I’ll send this in a clear format so your side can review it quickly.";
    }
    return "Thank you for your time today. I’ll package this into a clear Soft Corporate Offer and send it for review.";
  }

  /* =========================
     QUESTION BANK (Greeting is first)
  ========================== */

  function q(key, section, prompt, placeholder) {
    return { key, section, prompt, type: "text", placeholder };
  }
  function qs(key, section, prompt, options) {
    return { key, section, prompt, type: "single", options };
  }
  function qscript(key, section, title) {
    return { key, section, prompt: title, type: "script" };
  }

  const QUESTION_BANK = [
    qscript("opening_script", "Opening", "Opening Script (read verbatim)"),

    // Product
    q("product", "Product", "Just to confirm, what product are you looking to source?", "e.g., Sunflower Seed Oil"),
    q("specs", "Product", "What specs do we need to hit so this gets approved on your side?", "grade / standards / certifications"),
    q("quantity", "Product", "What quantity are you positioned to take right now?", "MT or containers"),
    qs("packaging", "Product", "How do you want it packaged for the smoothest delivery?", ["Bulk", "Flexitank", "Bottled", "Bagged", "Drums", "Other"]),

    // Logistics
    q("destination_port", "Logistics", "Which destination port should we build the offer around?", "Port + country"),
    qs("timeline", "Logistics", "What timeline are you working under right now?", ["Immediate", "Within 30 days", "Within 60 days", "Within 90 days", "Long-term contract"]),

    // Financial
    q("target_price", "Financial", "What target range per MT keeps this commercially workable for you?", "Example: 820–860 USD/MT"),
    qs("payment_instrument", "Financial", "What payment instrument are you prepared to use for this deal?", ["LC", "DLC", "SBLC", "TT", "Escrow", "Other"]),
    q("issuing_bank", "Financial", "Which bank will you be working with for the instrument? (bank name + country)", "Bank name + country"),
    q("issuance_speed", "Financial", "Once terms line up, how quickly can issuance happen on your side?", "e.g., 3–5 banking days"),

    // Company
    q("company_name", "Company", "What’s the exact registered company name we should put on the offer package?", "Registered company name"),
    q("entity_type", "Company", "What type of entity is the buyer (LLC, Corporation, Partnership, etc.)?", "Entity type"),
    q("country_registration_address", "Company", "What country is the company registered in, and what address should we reference?", "Country + business address"),
    q("website_or_profile", "Company", "Do you have a website or company profile link we should use for verification (or N/A)?", "Website or N/A"),
    q("key_contact", "Company", "Who should receive the offer package—name, title, phone, and email?", "Contact details"),

    // Engagement + Trade Finance + Compliance + Relationship
    q("approval_path", "Engagement", "When you receive the Soft Offer, how does approval usually happen on your side?", "steps + decision owner"),
    qs("loi_icpo_ready", "Engagement", "If the terms work, are you ready to issue an LOI or ICPO on letterhead?", ["Yes", "Needs internal approval", "Not ready"]),
    q("trade_finance_help", "Trade Finance", "Do you want support on trade finance/issuance, or is your bank handling everything?", "Bank handling / Need support"),
    q("compliance_requirements", "Compliance", "Any compliance or regulatory requirements we should design around on your side?", "Requirements"),
    q("other_commodities", "Relationship", "Besides this product, what other commodities are you regularly buying or selling?", "Other commodities")
  ];

  /* =========================
     TEMP-DRIVEN ORDER (keeps greeting first)
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

  function currentQuestions() {
    return getQueue();
  }

  /* =========================
     VOSS STABILIZERS + PROMPTS
  ========================== */

  function vossStabilizers() {
    return [
      { label: "Label + Calibrate", text: "It sounds like something here doesn’t feel solid yet. What’s the biggest concern?" },
      { label: "Slow It Down", text: "That makes sense. What would you need to see in writing to feel protected?" },
      { label: "Define the Risk", text: "What risk are you most focused on avoiding on this transaction?" },
      { label: "Smallest Next Step", text: "What’s the smallest next step that still makes sense for you?" }
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
      specs: [
        { label: "Non-negotiable", text: "Which spec is non-negotiable for approval on your side?" },
        { label: "Origin", text: "Any origins that are a hard no?" },
        { label: "Docs", text: "What documents do your teams expect before anything moves?" }
      ],
      quantity: [
        { label: "Range", text: "What’s the minimum that still works—and the ceiling if it goes well?" },
        { label: "Constraint", text: "What’s the main constraint—storage, cashflow, or port capacity?" },
        { label: "Scale", text: "If the first shipment is clean, how do you scale from there?" }
      ],
      packaging: [
        { label: "Friction", text: "What packaging has caused problems before that you want to avoid?" },
        { label: "Owner", text: "Who decides packaging on your side?" },
        { label: "Rules", text: "Any labeling rules we should follow at destination?" }
      ],
      destination_port: [
        { label: "Reality", text: "Any port realities we should plan around—inspection, congestion, timing?" },
        { label: "Smooth", text: "What detail makes delivery smooth for you every time?" },
        { label: "Routing", text: "Do you prefer direct routing or is transshipment acceptable?" }
      ],
      timeline: [
        { label: "Priority", text: "What matters more right now—speed, price, or certainty?" },
        { label: "Window", text: "What’s your latest acceptable arrival date?" },
        { label: "Impact", text: "If timing slips, what’s the impact on your side?" }
      ],
      target_price: [
        { label: "Edges", text: "What number makes you lean in—and what number kills it?" },
        { label: "Authority", text: "Who set that target range internally?" },
        { label: "Flex", text: "If the best offer is a bit above target, what would you need to justify it?" }
      ],
      payment_instrument: [
        { label: "Cleanest", text: "Which instrument has been cleanest for you in real deals?" },
        { label: "Friction", text: "What would your bank push back on if we don’t structure it right?" },
        { label: "Driver", text: "Is that choice driven by compliance, speed, or cost?" }
      ],
      issuing_bank: [
        { label: "Capacity", text: "Do you have current issuance capacity with that bank right now?" },
        { label: "Format", text: "Any wording/formatting requirements your bank expects from day one?" },
        { label: "Timing", text: "How quickly does the bank move once terms are set?" }
      ],
      approval_path: [
        { label: "Decision", text: "Who ultimately says yes—and what do they need to see?" },
        { label: "Sequence", text: "After you receive the Soft Offer, what happens first on your side?" },
        { label: "Speed", text: "What would accelerate approval internally?" }
      ],
      loi_icpo_ready: [
        { label: "Obstacle", text: "What could block LOI/ICPO even if the terms work?" },
        { label: "Next", text: "If I send a clean Soft Offer today, what happens next on your side?" },
        { label: "Clarity", text: "What needs to be clear in writing so you don’t have to revisit it later?" }
      ],
      other_commodities: [
        { label: "Lane", text: "Which commodities are most consistent for you right now?" },
        { label: "Buy/Sell", text: "Do you primarily buy, sell, or both?" },
        { label: "Long-term", text: "If we build a long-term lane, what would you want included?" }
      ]
    };

    return (S[key] || [
      { label: "Clarity", text: "What would you want stated clearly so this is easy to approve?" },
      { label: "Next", text: "What does the next step look like on your side?" },
      { label: "Protect", text: "What would make this feel safer and simpler for you?" }
    ]).slice(0, 5);
  }

  function closingSuggestions() {
    const t = state.temperature;

    if (t === "RESISTANT") {
      return [
        { label: "No pressure", text: "No pressure. What would need to change for this to become actionable?" },
        { label: "Small step", text: "What’s the smallest next step that still makes sense to you?" },
        { label: "Protection", text: "What would you need to see to feel fully protected here?" }
      ];
    }
    if (t === "DEFENSIVE") {
      return [
        { label: "De-escalate", text: "That makes sense. What concern should we resolve first?" },
        { label: "Written clarity", text: "What would you want included in writing so this feels safe?" },
        { label: "Control", text: "How would you like to proceed so you stay in control of the process?" }
      ];
    }
    if (t === "GUARDED") {
      return [
        { label: "Review focus", text: "If I send the Soft Offer in a clean format, what will you look at first?" },
        { label: "Loop-in", text: "Who else should be looped in so you don’t have to relay this twice?" },
        { label: "Approve smoothly", text: "What should we include so approval is straightforward?" }
      ];
    }
    return [
      { label: "Pre-close", text: "If the Soft Offer matches your terms, what happens next on your side?" },
      { label: "Routing", text: "What email should receive the offer package and supporting documents?" },
      { label: "Speed", text: "How quickly would you like to move once you receive it?" }
    ];
  }

  /* =========================
     Scores
  ========================== */

  function hasValue(v) {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return String(v).trim().length > 0;
  }

  function computeScores() {
    const Q = currentQuestions();
    const total = Math.max(Q.length - 1, 1); // exclude opening script
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
      .wrap{padding:20px;max-width:1100px}
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
      .split{display:flex;gap:12px;flex-wrap:wrap;align-items:stretch}
      .col{flex:1;min-width:320px}
      .col2{flex:2;min-width:360px}
      .toggle{display:flex;gap:10px;align-items:center}
      .scriptBox{white-space:pre-wrap;line-height:1.45;background:rgba(11,28,45,0.55);border:1px solid rgba(255,255,255,0.12);padding:12px;border-radius:10px}
      .kv{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08)}
      .k{opacity:.8}
      .v{font-weight:800;text-align:right}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
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
            <span>Adaptive Flow</span>
          </div>
          <div class="toggle">
            <input type="checkbox" ${state.stabilizerMode ? "checked" : ""} onchange="toggleStabilizer(this.checked)" />
            <span>Stabilize-until-lowered</span>
          </div>
        </div>

        <div class="muted">If DEFENSIVE/RESISTANT, stabilizer stays active until you lower temp.</div>
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
        <div class="card__title">Voss Prompts (click = copy)</div>
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
          <div class="muted">Hidden.</div>
        </div>
      `;
    }

    return `
      <div class="card">
        <div class="card__title">Closing Prompts (${state.temperature})</div>
        <div class="muted">Click to copy.</div>
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

  function callSnapshot() {
    // Show in a logical grouping (always visible on Call Mode)
    const rows = [
      ["Product", dealSummaryText()],
      ["Specs", getAnswer("specs")],
      ["Packaging", getAnswer("packaging")],
      ["Timeline", getAnswer("timeline")],
      ["Target Price", getAnswer("target_price")],
      ["Instrument", getAnswer("payment_instrument")],
      ["Issuing Bank", getAnswer("issuing_bank")],
      ["Issuance Speed", getAnswer("issuance_speed")],
      ["Company Name", getAnswer("company_name")],
      ["Entity Type", getAnswer("entity_type")],
      ["Country + Address", getAnswer("country_registration_address")],
      ["Website/Profile", getAnswer("website_or_profile")],
      ["Key Contact", getAnswer("key_contact")],
      ["Approval Path", getAnswer("approval_path")],
      ["LOI/ICPO Ready", getAnswer("loi_icpo_ready")],
      ["Trade Finance Help", getAnswer("trade_finance_help")],
      ["Compliance", getAnswer("compliance_requirements")],
      ["Other Commodities", getAnswer("other_commodities")]
    ];

    return `
      <div class="card">
        <div class="card__title">Call Snapshot</div>
        <div class="muted">Live summary of buyer answers.</div>
        <div style="margin-top:8px;">
          ${rows.map(([k, v]) => `
            <div class="kv">
              <div class="k">${esc(k)}</div>
              <div class="v">${esc(v || "—")}</div>
            </div>
          `).join("")}
        </div>

        <div class="row" style="margin-top:12px;">
          <button class="btn" type="button" onclick="copySnapshot()">Copy Snapshot</button>
          <button class="btn" type="button" onclick="resetDeal()">Start New Deal</button>
          <button class="btn" type="button" onclick="toggleClose()">${state.showClose ? "Hide" : "Show"} Closings</button>
        </div>
      </div>
    `;
  }

  /* =========================
     Stabilizer mode (stays until lowered)
  ========================== */

  function shouldStabilizeNow() {
    if (!state.stabilizerMode) return false;
    return (state.temperature === "DEFENSIVE" || state.temperature === "RESISTANT");
  }

  function renderStabilizerStep() {
    const items = vossStabilizers();

    $("app").innerHTML = `
      <div class="wrap">
        <div class="muted">Stabilizer Active • Temp: <b>${state.temperature}</b></div>

        <div class="split">
          <div class="col2">
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
              </div>
            </div>

            ${tempBlock()}
            ${closeBlock()}
          </div>

          <div class="col">
            ${callSnapshot()}
          </div>
        </div>
      </div>
    `;
  }

  /* =========================
     Navigation: Call Mode is primary
  ========================== */

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
        <div class="muted">Question <b>${state.idx + 1}</b> of <b>${Q.length}</b> • <b>${esc(q.section)}</b></div>

        <div class="split">
          <div class="col2">
            <div class="card">
              <div class="row" style="justify-content:space-between;align-items:center;">
                <div class="pill">Phase: <b>${state.phase}</b></div>
                <div class="pill">Structural: <b>${state.structural}</b>/100</div>
                <div class="pill">Risk: <b>${state.risk}</b>/100</div>
                <div class="pill">Temp: <b>${state.temperature}</b></div>
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
              </div>
            </div>

            ${isScript ? "" : suggestionsBlock(q)}
            ${tempBlock()}
            ${closeBlock()}
          </div>

          <div class="col">
            ${callSnapshot()}
          </div>
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

  function snapshotText() {
    const lines = [];
    lines.push("Nautilus Sales System — Call Snapshot");
    lines.push(`Temp: ${state.temperature} | Phase: ${state.phase} | Structural: ${state.structural}/100 | Risk: ${state.risk}/100`);
    lines.push("");
    lines.push(`Deal: ${dealSummaryText()}`);
    lines.push("");
    const fields = [
      ["Specs", "specs"],
      ["Packaging", "packaging"],
      ["Timeline", "timeline"],
      ["Target Price", "target_price"],
      ["Payment Instrument", "payment_instrument"],
      ["Issuing Bank", "issuing_bank"],
      ["Issuance Speed", "issuance_speed"],
      ["Company Name", "company_name"],
      ["Entity Type", "entity_type"],
      ["Country + Address", "country_registration_address"],
      ["Website/Profile", "website_or_profile"],
      ["Key Contact", "key_contact"],
      ["Approval Path", "approval_path"],
      ["LOI/ICPO Ready", "loi_icpo_ready"],
      ["Trade Finance Help", "trade_finance_help"],
      ["Compliance Requirements", "compliance_requirements"],
      ["Other Commodities", "other_commodities"]
    ];
    for (const [label, key] of fields) {
      const v = getAnswer(key) || "—";
      lines.push(`${label}: ${v}`);
    }
    lines.push("");
    lines.push(`Gratitude: ${gratitudeLine()}`);
    return lines.join("\n");
  }

  /* =========================
     GLOBAL ACTIONS
  ========================== */

  window.renderCallMode = renderCallMode;

  window.nextQ = function () {
    const Q = currentQuestions();
    const q = Q[state.idx];
    if (q && q.type === "text") saveTextIfNeeded();

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
    copyToClipboard(String(line || ""));
    renderCallMode();
  };

  window.setTemp = function (t) {
    state.temperature = t;
    renderCallMode();
  };

  window.toggleAdaptive = function (checked) {
    state.adaptiveFlow = !!checked;
    const Q = currentQuestions();
    if (state.idx > Q.length - 1) state.idx = Q.length - 1;
    renderCallMode();
  };

  window.toggleStabilizer = function (checked) {
    state.stabilizerMode = !!checked;
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
    renderCallMode();
  };

  window.copyText = function (t) {
    copyToClipboard(String(t || ""));
  };

  window.copySnapshot = function () {
    computeScores();
    copyToClipboard(snapshotText());
    alert("Copied: Call Snapshot ✅");
  };

  window.resetDeal = function () {
    state.idx = 0;
    state.answers = {};
    state.temperature = "CALM";
    state.selectedSuggestion = "";
    state.selectedClose = "";
    renderCallMode();
  };

  // init
  injectStyle();
  renderCallMode(); // ✅ start in Call Mode by default
})();
