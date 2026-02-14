// Nautilus Sales System — V3 (Voss-Only + HubSpot Export + Product-First)
// Non-module build for: <script src="app.js?v=XX"></script>

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
    selectedClose: ""
  };

  /* =========================
     GREETING + GRATITUDE
  ========================== */

  const OPENING_SCRIPT = `
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for [product + quantity + destination]. I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill this through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
`.trim();

  function gratitudeLine() {
    // Temperature-aware, but still professional (enjoyable, not "fun")
    if (state.temperature === "RESISTANT") {
      return "I appreciate you taking the time today. When you’re ready, we’ll move at your pace and keep it straightforward.";
    }
    if (state.temperature === "DEFENSIVE") {
      return "Thank you for your time today. I’ll document this cleanly and we’ll only move forward where it makes sense for you.";
    }
    if (state.temperature === "GUARDED") {
      return "Thanks for your time today. I’ll send this in a clear, reviewable format so your side can evaluate it easily.";
    }
    return "Thank you for your time today. I’ll package this into a clear Soft Corporate Offer and send it for review.";
  }

  /* =========================
     VOSS-ONLY QUESTIONS (20) — PRODUCT FIRST
     (No repetitive starters; calibrated How/What; implicit labels)
  ========================== */

  const QUESTIONS = [
    // Product (1–4)
    q("product", "Product", "What exact product do you need sourced?", "e.g., Sunflower Seed Oil"),
    q("specs", "Product", "What specs have to be true for this to be approved on your side?", "grade / standards / certifications"),
    q("quantity", "Product", "What volume are you positioned to take right now without strain?", "MT or containers"),
    qs("packaging", "Product", "What packaging keeps this smooth on your side?", ["Bulk", "Flexitank", "Bottled", "Bagged", "Drums", "Other"]),

    // Logistics (5–6)
    q("destination_port", "Logistics", "Which destination port should we build the offer around?", "Port + country"),
    qs("timeline", "Logistics", "What delivery timeline are you operating under?", ["Immediate", "Within 30 days", "Within 60 days", "Within 90 days", "Long-term contract"]),

    // Financial (7–10)
    q("target_price", "Financial", "What target range per MT makes this commercially workable for you?", "USD/MT range"),
    qs("payment_instrument", "Financial", "Which payment instrument are you prepared to use?", ["LC", "DLC", "SBLC", "TT", "Escrow", "Other"]),
    q("issuing_bank", "Financial", "Which bank will issue the instrument? (name + country)", "Bank name + country"),
    q("issuance_speed", "Financial", "Once terms are aligned, how fast can issuance happen on your side?", "e.g., 3–5 banking days"),

    // Company (11–15)
    q("company_name", "Company", "What exact registered company name should appear on the offer package?", "Registered company name"),
    q("entity_type", "Company", "What entity type is the buyer? (LLC, Corporation, Partnership, etc.)", "Entity type"),
    q("country_registration_address", "Company", "What country is the buyer registered in, and what business address should we reference?", "Country + address"),
    q("website_or_profile", "Company", "What website or company profile should we use for verification (or N/A)?", "Website or N/A"),
    q("key_contact", "Company", "Who should receive the offer pack—name, title, phone, and email?", "Contact details"),

    // Engagement + Compliance + Relationship (16–20)
    q("approval_path", "Engagement", "How does approval happen internally once you receive the Soft Offer?", "steps + decision owner"),
    qs("loi_icpo_ready", "Engagement", "Once the terms work, are you ready to issue LOI or ICPO on letterhead?", ["Yes", "Needs internal approval", "Not ready"]),
    q("trade_finance_help", "Trade Finance", "What support—if any—do you want on trade finance (issuance, guarantees), or is your bank handling everything?", "Bank handling / Need support"),
    q("compliance_requirements", "Compliance", "What compliance or regulatory requirements do we need to design around on your side?", "Requirements"),
    q("other_commodities", "Relationship", "In addition to this product, what other commodities are you regularly buying or selling?", "Other commodities")
  ];

  /* =========================
     VOSS-STYLE SUGGESTIONS ENGINE
     (calibrated questions + labels + mirror prompts)
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
    const t = state.temperature;
    const p = state.phase;

    // Stabilize first if defensive/resistant
    if (t === "DEFENSIVE" || t === "RESISTANT") return vossStabilizers();

    // Otherwise: tailored, varied stems (no repeated phrasing)
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
        { label: "Friction Test", text: "What packaging has caused problems in the past that you want to avoid?" },
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
        { label: "Contingency", text: "If timing slips, what’s the impact on your side?" }
      ],
      target_price: [
        { label: "Calibrate", text: "What number makes you lean in—and what number kills it?" },
        { label: "Authority", text: "Who set that target range internally?" },
        { label: "Flex", text: "If price lands slightly above target, what would you need to justify it?" }
      ],
      payment_instrument: [
        { label: "Fastest Path", text: "What instrument has been cleanest for you in real deals?" },
        { label: "Bank Appetite", text: "What would your bank push back on if we don’t structure it right?" },
        { label: "Preference", text: "Is your choice driven by compliance, speed, or cost?" }
      ],
      issuing_bank: [
        { label: "Capacity", text: "Do you have current issuance capacity with that bank right now?" },
        { label: "Formatting", text: "Any bank wording or formatting requirements we should follow from day one?" },
        { label: "Timing", text: "How quickly does your bank typically move once terms are set?" }
      ],
      issuance_speed: [
        { label: "Timeline", text: "What’s the realistic issuance timeline your bank will commit to?" },
        { label: "Blockers", text: "What usually slows issuance down on your side?" },
        { label: "De-Risk", text: "What can we do upfront so issuance stays frictionless?" }
      ],
      approval_path: [
        { label: "Decision Map", text: "Who ultimately says yes—and what do they need to see?" },
        { label: "Sequence", text: "What’s the internal sequence after you receive the Soft Offer?" },
        { label: "Speed", text: "What would accelerate approval on your side?" }
      ],
      loi_icpo_ready: [
        { label: "Obstacle", text: "What would prevent LOI/ICPO once the terms work?" },
        { label: "Next Step", text: "If I send a clean Soft Offer today, what happens next on your side?" },
        { label: "Alignment", text: "What would you want clarified in writing so you don’t have to revisit it?" }
      ],
      other_commodities: [
        { label: "Lane Build", text: "Which commodities are most consistent for you right now?" },
        { label: "Buy/Sell", text: "Do you primarily buy, sell, or both?" },
        { label: "Relationship", text: "If we build a long-term lane, what would you want included?" }
      ]
    };

    let arr = S[key] || [
      { label: "Clarify", text: "What’s the part you’d want the offer to state clearly so it’s easy to approve?" },
      { label: "Next", text: "What does the next step look like on your side?" },
      { label: "Protect", text: "What would make this safer and simpler for you?" }
    ];

    // Phase tone shifts (subtle, not repetitive)
    if (p === "LEVERAGE") {
      arr = [
        ...arr,
        { label: "Pre-Close", text: "Assuming the Soft Offer matches your terms, what’s the most likely next move on your side?" }
      ];
    } else if (p === "ALIGN") {
      arr = [
        { label: "Label", text: "It sounds like clarity matters here." },
        ...arr
      ];
    }

    // Guarded adds safety-first framing
    if (t === "GUARDED") {
      arr = [
        { label: "Safety", text: "That’s fair. What would you need in writing to feel fully comfortable?" },
        ...arr
      ];
    }

    return arr.slice(0, 5);
  }

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

    // CALM
    return [
      { label: "Pre-Close", text: "If the Soft Offer matches your terms, what happens next on your side?" },
      { label: "Routing", text: "What email should receive the offer package and supporting documents?" },
      { label: "Speed", text: "How quickly would you like to move once you receive it?" }
    ];
  }

  /* =========================
     HUBSPOT EXPORT (D)
     - Copy/paste note format
     - Also exports JSON for future automation
  ========================== */

  function val(k) {
    const v = state.answers[k];
    return (v == null || String(v).trim() === "") ? "" : String(v).trim();
  }

  function hubspotNote() {
    computeScores();

    const lines = [];
    lines.push("Nautilus Sales System — Call Note");
    lines.push(`Phase: ${state.phase} | Structural: ${state.structural}/100 | Risk: ${state.risk}/100 | Temp: ${state.temperature}`);
    lines.push("");
    lines.push("PRODUCT & LOGISTICS");
    lines.push(`- Product: ${val("product") || "[ ]"}`);
    lines.push(`- Specs: ${val("specs") || "[ ]"}`);
    lines.push(`- Quantity: ${val("quantity") || "[ ]"}`);
    lines.push(`- Packaging: ${val("packaging") || "[ ]"}`);
    lines.push(`- Destination Port: ${val("destination_port") || "[ ]"}`);
    lines.push(`- Timeline: ${val("timeline") || "[ ]"}`);
    lines.push("");
    lines.push("FINANCIAL");
    lines.push(`- Target Price (USD/MT): ${val("target_price") || "[ ]"}`);
    lines.push(`- Payment Instrument: ${val("payment_instrument") || "[ ]"}`);
    lines.push(`- Issuing Bank: ${val("issuing_bank") || "[ ]"}`);
    lines.push(`- Issuance Speed: ${val("issuance_speed") || "[ ]"}`);
    lines.push("");
    lines.push("COMPANY");
    lines.push(`- Company Name: ${val("company_name") || "[ ]"}`);
    lines.push(`- Entity Type: ${val("entity_type") || "[ ]"}`);
    lines.push(`- Country + Address: ${val("country_registration_address") || "[ ]"}`);
    lines.push(`- Website/Profile: ${val("website_or_profile") || "[ ]"}`);
    lines.push(`- Key Contact: ${val("key_contact") || "[ ]"}`);
    lines.push("");
    lines.push("ENGAGEMENT / COMPLIANCE");
    lines.push(`- Approval Path: ${val("approval_path") || "[ ]"}`);
    lines.push(`- LOI/ICPO Ready: ${val("loi_icpo_ready") || "[ ]"}`);
    lines.push(`- Trade Finance Help: ${val("trade_finance_help") || "[ ]"}`);
    lines.push(`- Compliance Requirements: ${val("compliance_requirements") || "[ ]"}`);
    lines.push("");
    lines.push("RELATIONSHIP");
    lines.push(`- Other Commodities: ${val("other_commodities") || "[ ]"}`);
    lines.push("");
    lines.push("NEXT STEP (Suggested)");
    lines.push(`- ${recommendedNextStep()}`);
    lines.push("");
    lines.push("CLOSING LINE USED / RECOMMENDED");
    lines.push(`- ${state.selectedClose || closingSuggestions()[0].text}`);
    lines.push("");
    lines.push("Gratitude");
    lines.push(`- ${gratitudeLine()}`);

    return lines.join("\n");
  }

  function dealJSON() {
    computeScores();
    return JSON.stringify({
      version: "NSS_V3",
      timestamp: new Date().toISOString(),
      phase: state.phase,
      structural: state.structural,
      risk: state.risk,
      temperature: state.temperature,
      idx: state.idx,
      answers: state.answers,
      selectedSuggestion: state.selectedSuggestion,
      selectedClose: state.selectedClose
    }, null, 2);
  }

  function recommendedNextStep() {
    // Simple and high ROI: steer toward Soft Offer + LOI/ICPO
    const instrument = val("payment_instrument");
    const bank = val("issuing_bank");
    const price = val("target_price");
    const ready = val("loi_icpo_ready");

    if (!price) return "Confirm target price range (USD/MT), then finalize Soft Offer structure.";
    if (!instrument) return "Confirm payment instrument, then structure Soft Offer accordingly.";
    if (!bank) return "Confirm issuing bank details, then align offer format to bank requirements.";
    if (!ready) return "Confirm LOI/ICPO readiness, then send Soft Offer + LOI/ICPO template request.";
    if (String(ready).toLowerCase().includes("needs")) return "Identify internal approver + timeline, then send Soft Offer for internal review.";
    return "Send Soft Corporate Offer package + request LOI/ICPO once terms are confirmed.";
  }

  /* =========================
     SCORING / PHASE
  ========================== */

  function computeScores() {
    const total = QUESTIONS.length;
    const answered = Object.keys(state.answers).filter(k => hasValue(state.answers[k])).length;
    state.structural = Math.round((answered / total) * 100);

    let r = 0;

    // heavier on real deal breakers
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

  function hasValue(v) {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return String(v).trim().length > 0;
  }

  /* =========================
     RENDER
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
      .muted{opacity:.85;margin:8px 0}
      .card{margin-top:12px;padding:14px;border:1px solid rgba(198,169,74,0.45);border-radius:12px;background:#132A3A}
      .card__title{font-weight:900;margin-bottom:8px}
      .q{margin-top:8px;font-size:18px;font-weight:900;line-height:1.3}
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
      .badge{display:inline-flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(11,28,45,0.35)}
      .label{opacity:.8;font-size:12px;margin-bottom:6px}
      .split{display:flex;gap:12px;flex-wrap:wrap}
      .col{flex:1;min-width:300px}
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
        <div class="muted">Rule: DEFENSIVE/RESISTANT surfaces stabilizer prompts first, then resumes softened guidance.</div>
      </div>
    `;
  }

  function dashboard() {
    computeScores();
    const list = QUESTIONS.map((x, i) => `<div class="muted">${i + 1}. <b>${esc(x.key)}</b> — ${esc(x.section)}</div>`).join("");

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
            <button class="btn" type="button" onclick="copyHubSpot()">Copy HubSpot Note</button>
            <button class="btn" type="button" onclick="copyJSON()">Copy Deal JSON</button>
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
            <button class="btn" type="button" onclick="copyHubSpot()">Copy HubSpot Note</button>
            <button class="btn" type="button" onclick="resetDeal()">Start New Deal</button>
          </div>

          <div class="muted" style="margin-top:10px;">Recommended Next Step: <b>${esc(recommendedNextStep())}</b></div>
        </div>

        <div class="split">
          <div class="col">
            ${suggestionsBlock(q)}
          </div>
          <div class="col">
            ${tempBlock()}
            ${closeBlock()}
          </div>
        </div>
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

  /* =========================
     GLOBAL ACTIONS
  ========================== */

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
    if (state.idx < QUESTIONS.length - 1) state.idx += 1; // auto advance
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
    renderCallMode();
  };

  window.copyHubSpot = function () {
    copyToClipboard(hubspotNote());
    alert("Copied: HubSpot Note ✅\nPaste into HubSpot → Notes.");
  };

  window.copyJSON = function () {
    copyToClipboard(dealJSON());
    alert("Copied: Deal JSON ✅\n(For future automation/workflows)");
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
    dashboard();
  };

  // init
  injectStyle();
  dashboard();

})();
