// Nautilus Sales System — C Build (Stable Core + Voss + Click-to-Copy + Temp-Based Close) ✅
// Works with: <script src="app.js"></script> (NON-module)

(function () {
  const OPENING_SCRIPT = `
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for [product + quantity + destination]. I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill it through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
`.trim();

  const TEMP_LEVELS = ["CALM", "GUARDED", "DEFENSIVE", "RESISTANT"];

  // ===== Temperature-based closing suggestions (clickable) =====
  const CLOSE_SUGGESTIONS = {
    CALM: [
      "Perfect — I’ll package this into a Soft Corporate Offer and send it for your review. What email should we use for the offer package?",
      "Sounds good. Once you review the Soft Offer, what would the next step look like on your side so we keep momentum?",
      "Before I send it, who else needs to be looped in so you don’t have to relay it twice?"
    ],
    GUARDED: [
      "Totally fair — my goal is to make this easy. What would you need to see in writing for this to feel solid on your side?",
      "Makes sense. If I send the Soft Offer with clear terms and supplier verification, what would be the quickest way for you to greenlight the next step?",
      "What would you consider a ‘clean’ offer that’s safe for you to move forward with?"
    ],
    DEFENSIVE: [
      "It sounds like you’ve been burned before. What would a ‘safe’ structure look like for you on this deal?",
      "Let’s slow this down for a second — what’s the main concern you want eliminated before anything moves forward?",
      "If we handled this in a way you felt fully protected, what would happen next?"
    ],
    RESISTANT: [
      "It seems like now might not be the right time. What would have to change for this to become a priority again?",
      "I don’t want to push. Would it be crazy to schedule a 5-minute follow-up once you’re ready to decide?",
      "What’s the simplest next step that doesn’t create pressure for you?"
    ]
  };

  // ===== Voss-only question set (20) =====
  // Each question includes “Next Lines” (negotiator prompts) that are clickable
  const QUESTIONS = [
    {
      key: "time_check",
      section: "Opening",
      prompt: "Do you have a quick moment?",
      type: "single",
      options: ["Yes — let’s do it", "Not right now — schedule"],
      nextLines: [
        "Totally fair. What time would be better — later today or tomorrow?",
        "No problem. What’s the quickest window you usually take calls?",
        "If I keep it to two minutes, would now still be a hard no?"
      ]
    },
    {
      key: "authority_path",
      section: "Decision Path",
      prompt: "When a deal like this is ready, how does approval typically work on your side?",
      type: "single",
      options: ["I sign", "I recommend / need approval", "I represent a principal buyer"],
      nextLines: [
        "Who else needs to feel comfortable before this moves?",
        "What does a ‘yes’ require internally — and who gives it?",
        "What’s the fastest way to get the final green light on your side?"
      ]
    },
    {
      key: "core_business",
      section: "Business Profile",
      prompt: "What does your company primarily do with this commodity once it lands?",
      type: "text",
      placeholder: "Distributor / manufacturing input / resale / end-use, etc.",
      nextLines: [
        "What does success look like for you on this shipment?",
        "Who is the end customer on your side — or is it for internal consumption?",
        "What would make this a repeatable supply lane for you?"
      ]
    },
    {
      key: "role",
      section: "Business Profile",
      prompt: "Where do you sit in the chain on this transaction?",
      type: "single",
      options: ["End Buyer", "Distributor", "Trader", "Agent"],
      nextLines: [
        "What does ‘moving fast’ look like in your role?",
        "Who’s upstream and downstream from you on this deal?",
        "If I structure it correctly, what’s your preferred next step?"
      ]
    },
    {
      key: "licenses",
      section: "Compliance Readiness",
      prompt: "What import/export documentation or licenses do you already have in place for this product?",
      type: "single",
      options: ["All in place", "Some in place", "Not sure / need help"],
      nextLines: [
        "If anything is missing, who handles it on your side?",
        "What’s the one document that usually slows deals down for you?",
        "If we had to verify compliance today, what would you provide first?"
      ]
    },
    {
      key: "company_name",
      section: "Company",
      prompt: "What exact registered company name should appear on the offer so it matches your documents perfectly?",
      type: "text",
      placeholder: "Registered Company Name",
      nextLines: [
        "Any parent company or affiliate name we need to reference?",
        "Is the buying entity the same entity that will issue the instrument?",
        "If the name is even slightly off, does it create internal issues for you?"
      ]
    },
    {
      key: "country_address",
      section: "Company",
      prompt: "What country is the entity registered in — and what business address ties to this transaction?",
      type: "text",
      placeholder: "Country + Business Address",
      nextLines: [
        "Is that the same address you use for banking documentation?",
        "Any trade zone or special registration we should account for?",
        "What address do you want shown for the offer package?"
      ]
    },
    {
      key: "website",
      section: "Company",
      prompt: "What website should we reference for verification — or should we mark it N/A?",
      type: "text",
      placeholder: "Website or N/A",
      nextLines: [
        "If your site is private, what’s the best way to verify your profile quickly?",
        "Do you prefer we verify through your company profile instead?",
        "If we had to validate business legitimacy today, what do you want us to use?"
      ]
    },
    {
      key: "year_entity",
      section: "Company",
      prompt: "How long has the company been operating — and what is the legal entity type?",
      type: "text",
      placeholder: "Year established + LLC/Corp/Partnership/etc.",
      nextLines: [
        "Any recent changes to ownership or structure we should know about?",
        "Does the buying entity match the entity on your banking instrument?",
        "If we need a company profile, do you already have one prepared?"
      ]
    },
    {
      key: "contact_person",
      section: "Contacts",
      prompt: "Who should be the primary contact once documents start moving — name, title, and direct contact?",
      type: "text",
      placeholder: "Full name, position, phone, email",
      nextLines: [
        "If you’re unavailable, who is the backup contact?",
        "Who should receive the Soft Offer package first?",
        "If something needs a same-day answer, who responds fastest?"
      ]
    },
    {
      key: "product",
      section: "Product",
      prompt: "What exact product are you aiming to secure on this request?",
      type: "text",
      placeholder: "Product (e.g., Sunflower Oil)",
      nextLines: [
        "Is there any substitute product you’d accept if pricing is stronger?",
        "What would make you reject a supplier immediately?",
        "If we can source it, what’s your priority — speed, price, or certainty?"
      ]
    },
    {
      key: "specs",
      section: "Product",
      prompt: "What specs are non-negotiable for you — grade, standards, certifications?",
      type: "text",
      placeholder: "Specs / standards required",
      nextLines: [
        "Which spec matters most to your buyer or regulator?",
        "If we match specs perfectly, what would still stop the deal?",
        "Do you have a preferred origin or any restricted origins?"
      ]
    },
    {
      key: "quantity",
      section: "Product",
      prompt: "What volume are you positioned to move right now — and what volume is realistic monthly if it works?",
      type: "text",
      placeholder: "MT or container basis",
      nextLines: [
        "What’s the smallest shipment you’d still consider worth doing?",
        "If the first shipment performs, what does scale look like?",
        "What’s the operational constraint on your side — storage, cashflow, port capacity?"
      ]
    },
    {
      key: "packaging",
      section: "Product",
      prompt: "How do you want it packaged so there’s no downstream friction?",
      type: "single",
      options: ["Bulk", "Flexitank", "Bottled", "Bagged", "Drums", "Other"],
      nextLines: [
        "What packaging do you prefer when everything goes smoothly?",
        "Is there a packaging format your port or buyer won’t accept?",
        "If packaging changes the price, what matters more to you — format or margin?"
      ]
    },
    {
      key: "incoterms",
      section: "Logistics",
      prompt: "Which shipping structure fits your process best — FOB, CIF, CFR, or something else?",
      type: "single",
      options: ["FOB", "CIF", "CFR", "EXW", "DDP", "Other"],
      nextLines: [
        "Who do you normally use for freight — your side or supplier side?",
        "What’s the cleanest term for you to approve internally?",
        "If we match your preferred term, what’s the next decision point?"
      ]
    },
    {
      key: "destination_port",
      section: "Logistics",
      prompt: "Which destination port should we structure the offer against?",
      type: "text",
      placeholder: "Destination port(s)",
      nextLines: [
        "Any restrictions at that port we should plan around?",
        "Do you have a preferred discharge window?",
        "What’s the one detail that makes port delivery ‘smooth’ for you?"
      ]
    },
    {
      key: "timeline",
      section: "Logistics",
      prompt: "What delivery timeline are you working under — and what happens if it slips?",
      type: "single",
      options: ["Immediate", "30 days", "60 days", "90 days", "Long-term contract"],
      nextLines: [
        "What’s driving the timeline — demand, contract, or inventory?",
        "What’s the hard deadline you can’t miss?",
        "If we had to pick a realistic window, what would you choose?"
      ]
    },
    {
      key: "target_price",
      section: "Financial",
      prompt: "What target price range per MT makes this a ‘yes’ internally on your side?",
      type: "text",
      placeholder: "Example: 820–860 USD/MT",
      nextLines: [
        "What number makes you lean in — and what number makes you walk away?",
        "Who sets that target range internally?",
        "If we come in slightly above target, what would you need to justify it?"
      ]
    },
    {
      key: "payment_bank",
      section: "Financial",
      prompt: "What payment instrument will you use — and which bank will issue it?",
      type: "text",
      placeholder: "Instrument + issuing bank + country",
      nextLines: [
        "Do you already have issuance capacity with that bank right now?",
        "If we structure the offer correctly, how quickly can the instrument be issued?",
        "Is there any bank format requirement we should follow from day one?"
      ]
    },
    {
      key: "docs_engagement",
      section: "Engagement",
      prompt: "Once terms align, what would prevent you from issuing LOI/ICPO and providing buyer documentation if requested?",
      type: "single",
      options: ["Nothing — ready", "Needs internal review", "Not ready"],
      nextLines: [
        "What’s the fastest internal path to get to ‘ready’?",
        "Who else needs to be comfortable before LOI/ICPO is issued?",
        "If we send a clean Soft Offer, what’s your next move?"
      ]
    },
    {
      key: "compliance_other",
      section: "Relationship",
      prompt: "Any regulatory requirements in your country we must respect — and what other commodities are you regularly buying or selling?",
      type: "text",
      placeholder: "Compliance requirements + other commodities",
      nextLines: [
        "If we can add value beyond this one product, what commodities matter most to you?",
        "What do you buy most consistently — and what do you sell most consistently?",
        "If we built a long-term lane, what would you want it to include?"
      ]
    }
  ];

  // ===== State =====
  const state = {
    idx: 0,
    answers: {},
    temperature: "CALM",
    showClose: true,
    selectedSuggestion: "",
    selectedClose: ""
  };

  // ===== Helpers =====
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

    // Modern
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

  function saveCurrentTextField() {
    const q = QUESTIONS[state.idx];
    if (!q) return;
    if (q.type !== "text") return;
    const v = $("field") ? $("field").value.trim() : "";
    state.answers[q.key] = v;
  }

  function openingBlock() {
    return `
      <div class="card">
        <div class="card__title">Opening Script</div>
        <div class="card__body" style="white-space:pre-wrap;">${esc(OPENING_SCRIPT)}</div>
      </div>
    `;
  }

  function temperatureBlock() {
    return `
      <div class="card">
        <div class="card__title">Psychological Temperature</div>
        <div class="row">
          ${TEMP_LEVELS.map(t => `
            <button class="chip ${state.temperature === t ? "chip--on" : ""}" type="button"
              onclick="window.setTemp('${t}')">${t}</button>
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
            <button class="btn" type="button" onclick="window.toggleClose()">Show</button>
          </div>
          <div class="muted">Hidden (toggle on when you want it)</div>
        </div>
      `;
    }

    const suggestions = CLOSE_SUGGESTIONS[state.temperature] || CLOSE_SUGGESTIONS.CALM;

    return `
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div class="card__title" style="margin:0;">Closing Suggestions (${state.temperature})</div>
          <button class="btn" type="button" onclick="window.toggleClose()">Hide</button>
        </div>

        <div class="muted" style="margin-bottom:10px;">
          Click to copy + highlight.
        </div>

        <div class="stack">
          ${suggestions.map(line => `
            <button class="suggest ${state.selectedClose === line ? "suggest--on" : ""}" type="button"
              onclick="window.pickClose('${esc(line)}')">${esc(line)}</button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function nextLinesBlock(q) {
    const lines = q.nextLines || [];
    if (!lines.length) return "";

    return `
      <div class="card">
        <div class="card__title">Suggested Next Line (Click to copy + highlight)</div>
        <div class="stack">
          ${lines.map(line => `
            <button class="suggest ${state.selectedSuggestion === line ? "suggest--on" : ""}" type="button"
              onclick="window.pickSuggestion('${esc(line)}')">${esc(line)}</button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderInput(q) {
    const existing = state.answers[q.key] || "";

    if (q.type === "text") {
      return `<input id="field" class="input" placeholder="${esc(q.placeholder || "")}" value="${esc(existing)}" />`;
    }

    if (q.type === "single") {
      return `
        <div class="row">
          ${q.options.map(opt => `
            <button class="chip" type="button" onclick="window.pickOption('${esc(opt)}')">${esc(opt)}</button>
          `).join("")}
        </div>
      `;
    }

    return "";
  }

  function renderCallMode() {
    const app = $("app");
    if (!app) return;

    const q = QUESTIONS[state.idx];
    if (!q) {
      app.innerHTML = `<div style="padding:20px;">No questions loaded.</div>`;
      return;
    }

    app.innerHTML = `
      <div class="wrap">
        <div class="muted">Call Mode • Question ${state.idx + 1} of ${QUESTIONS.length}</div>

        ${openingBlock()}

        <div class="card">
          <div class="muted">${esc(q.section)}</div>
          <div class="q">${esc(q.prompt)}</div>
          <div style="margin-top:10px;">${renderInput(q)}</div>

          <div class="row" style="margin-top:12px;">
            <button class="btn" type="button" onclick="window.backQ()" ${state.idx === 0 ? "disabled" : ""}>Back</button>
            <button class="btn btn--gold" type="button" onclick="window.nextQ()">Next</button>
            <button class="btn" type="button" onclick="window.resetDeal()">Start New Deal</button>
          </div>
        </div>

        ${nextLinesBlock(q)}
        ${temperatureBlock()}
        ${closeBlock()}
      </div>
    `;
  }

  function renderDashboard() {
    const app = $("app");
    if (!app) return;

    const answered = Object.keys(state.answers).filter(k => String(state.answers[k] || "").trim().length).length;

    app.innerHTML = `
      <div class="wrap">
        <div class="card">
          <div class="card__title">Dashboard</div>
          <div class="muted">Answered: <b>${answered}</b> / ${QUESTIONS.length}</div>
          <div class="row" style="margin-top:12px;">
            <button class="btn btn--gold" type="button" onclick="window.renderCallMode()">Open Call Mode</button>
            <button class="btn" type="button" onclick="window.resetDeal()">Start New Deal</button>
            <button class="btn" type="button" onclick="window.toggleClose()">${state.showClose ? "Hide" : "Show"} Closing Suggestions</button>
          </div>
        </div>

        ${temperatureBlock()}
        ${closeBlock()}
      </div>
    `;
  }

  // ===== Actions (globals for your index.html onclick buttons) =====
  window.renderDashboard = function () {
    renderDashboard();
  };

  window.renderCallMode = function () {
    renderCallMode();
  };

  window.nextQ = function () {
    const q = QUESTIONS[state.idx];
    if (q && q.type === "text") saveCurrentTextField();
    if (state.idx < QUESTIONS.length - 1) state.idx += 1;
    renderCallMode();
  };

  window.backQ = function () {
    const q = QUESTIONS[state.idx];
    if (q && q.type === "text") saveCurrentTextField();
    if (state.idx > 0) state.idx -= 1;
    renderCallMode();
  };

  window.pickOption = function (opt) {
    const q = QUESTIONS[state.idx];
    if (!q) return;

    state.answers[q.key] = opt;

    // If they want to schedule, do NOT auto-advance — keep you here so you can handle it.
    if (q.key === "time_check" && opt.includes("schedule")) {
      // highlight a useful line automatically
      const lines = q.nextLines || [];
      if (lines[0]) {
        state.selectedSuggestion = lines[0];
        copyToClipboard(lines[0]);
      }
      renderCallMode();
      return;
    }

    // Otherwise, advance
    if (state.idx < QUESTIONS.length - 1) state.idx += 1;
    renderCallMode();
  };

  window.pickSuggestion = function (line) {
    const decoded = String(line || "");
    state.selectedSuggestion = decoded;
    copyToClipboard(decoded);
    renderCallMode();
  };

  window.setTemp = function (t) {
    state.temperature = t;
    // clear selections so highlight reflects current context
    state.selectedClose = "";
    renderCallMode();
  };

  window.pickClose = function (line) {
    const decoded = String(line || "");
    state.selectedClose = decoded;
    copyToClipboard(decoded);
    renderCallMode();
  };

  window.toggleClose = function () {
    state.showClose = !state.showClose;
    // render whichever view you’re on
    const app = $("app");
    if (!app) return;

    // If call mode likely open (we can detect by presence of question counter text)
    // Keep it simple: just re-render call mode if idx > 0 or answers exist, else dashboard.
    if (state.idx > 0 || Object.keys(state.answers).length) renderCallMode();
    else renderDashboard();
  };

  window.resetDeal = function () {
    state.idx = 0;
    state.answers = {};
    state.selectedSuggestion = "";
    state.selectedClose = "";
    state.temperature = "CALM";
    renderDashboard();
  };

  // ===== Minimal inline styling (uses your styles.css too) =====
  // If your styles.css already defines these, it’ll override.
  function injectStyle() {
    const css = `
      .wrap{padding:20px;max-width:980px}
      .muted{opacity:.8;margin:8px 0}
      .card{margin-top:12px;padding:14px;border:1px solid rgba(198,169,74,0.45);border-radius:12px;background:#132A3A}
      .card__title{font-weight:800;margin-bottom:8px}
      .card__body{line-height:1.45}
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
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  injectStyle();

  // Initial paint
  renderDashboard();
})();
