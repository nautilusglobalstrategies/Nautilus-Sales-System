// Nautilus Sales System — Stable Core (C foundation) + Voss-Calibrated Questions ✅
// This file is designed for NON-module usage: <script src="app.js"></script>

(function () {
  const $ = (id) => document.getElementById(id);

  const OPENING_SCRIPT = `
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for [product + quantity + destination]. I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill it through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
  `.trim();

  const QUESTIONS = [
    { key: "opening_time_check", section: "Opening", type: "single",
      prompt: "Do you have a quick moment?",
      options: ["Yes — continue", "No — schedule"] },

    { key: "authority", section: "Authority", type: "single",
      prompt: "How does approval typically work on your side when a deal is ready to execute?",
      options: ["I have final signing authority", "I influence but need approval", "I represent a principal buyer"] },

    { key: "role", section: "Profile", type: "single",
      prompt: "Where do you sit in the chain for this transaction?",
      options: ["End Buyer", "Distributor", "Trader", "Agent"] },

    { key: "company_name", section: "Company", type: "text",
      prompt: "What exact company name should appear on the offer so it matches your registration precisely?",
      placeholder: "Registered company name" },

    { key: "country_address", section: "Company", type: "text",
      prompt: "Which country is the buyer entity registered in, and what business address ties to this transaction?",
      placeholder: "Country + full business address" },

    { key: "website", section: "Company", type: "text",
      prompt: "What website should we reference for verification, or should we mark it N/A?",
      placeholder: "Website or N/A" },

    { key: "entity_type", section: "Company", type: "text",
      prompt: "What legal entity type is the buyer operating under?",
      placeholder: "LLC / Corporation / Partnership / Other" },

    { key: "contact_person", section: "Company", type: "text",
      prompt: "Who should be the primary operational contact so nothing slows once documents move?",
      placeholder: "Name, title, phone, email" },

    { key: "product", section: "Product", type: "text",
      prompt: "What exact product are you looking to secure?",
      placeholder: "Product (e.g., Sunflower Oil)" },

    { key: "specs", section: "Product", type: "text",
      prompt: "What specifications are non-negotiable for internal approval?",
      placeholder: "Specs / grade / certifications" },

    { key: "quantity", section: "Product", type: "text",
      prompt: "What volume are you positioned to move on this transaction?",
      placeholder: "e.g., 25,000 MT / 1 container" },

    { key: "packaging", section: "Product", type: "single",
      prompt: "How should the product be packaged to meet your downstream requirements?",
      options: ["Bulk", "Flexitank", "Bottled", "Bagged", "Drums", "Other"] },

    { key: "delivery_terms", section: "Logistics", type: "single",
      prompt: "Which delivery structure best fits your process?",
      options: ["FOB", "CIF", "CFR", "EXW", "DDP", "Other"] },

    { key: "destination_port", section: "Logistics", type: "text",
      prompt: "Which destination port should pricing be structured against?",
      placeholder: "Destination port(s)" },

    { key: "timeline", section: "Logistics", type: "single",
      prompt: "What delivery timeline are you operating under?",
      options: ["Immediate", "Within 30 days", "Within 60 days", "Within 90 days", "Long-term contract"] },

    { key: "target_price", section: "Financial", type: "text",
      prompt: "What target price range per MT keeps this commercially viable on your side?",
      placeholder: "Example: 820–860 USD/MT" },

    { key: "primary_instrument", section: "Financial", type: "single",
      prompt: "What payment instrument will you deploy for this transaction?",
      options: ["LC", "DLC", "SBLC", "TT", "Escrow", "Other"] },

    { key: "issuing_bank", section: "Financial", type: "text",
      prompt: "Which bank would be issuing the instrument so we structure this correctly from day one?",
      placeholder: "Bank name + country" },

    { key: "loi_ready", section: "Engagement", type: "single",
      prompt: "Once terms align, what would prevent this from moving directly to LOI or ICPO?",
      options: ["Nothing — ready", "Needs internal review", "Not ready"] },

    { key: "other_commodities", section: "Relationship", type: "text",
      prompt: "Beyond this product, what other commodities are part of your regular trade cycle?",
      placeholder: "Other commodities" },
  ];

  const state = {
    idx: 0,
    answers: {}, // key: { value }
  };

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function appOrThrow() {
    const app = $("app");
    if (!app) throw new Error("Missing <main id='app'></main> in index.html");
    return app;
  }

  function saveCurrent() {
    const q = QUESTIONS[state.idx];
    if (!q) return;

    if (q.type === "text") {
      const v = $("field") ? $("field").value.trim() : "";
      state.answers[q.key] = { value: v };
    }
  }

  function renderOpeningBlock() {
    return `
      <div style="margin-top:12px;padding:12px;border:1px solid rgba(198,169,74,0.45);border-radius:10px;background:#132A3A;">
        <div style="font-size:13px;margin-bottom:6px;"><b>Opening Script</b></div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.45;">${esc(OPENING_SCRIPT)}</div>
      </div>
    `;
  }

  function renderInput(q) {
    const existing = state.answers[q.key]?.value || "";

    if (q.type === "text") {
      return `<input id="field" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:#0B1C2D;color:#E8EEF2;" placeholder="${esc(q.placeholder || "")}" value="${esc(existing)}" />`;
    }

    if (q.type === "single") {
      return `
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${q.options.map(opt => `
            <button type="button" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(198,169,74,0.55);background:#0B1C2D;color:#E8EEF2;cursor:pointer;"
              onclick="window.pickAnswer('${esc(q.key)}','${esc(opt)}')">${esc(opt)}</button>
          `).join("")}
        </div>
      `;
    }

    return "";
  }

  function renderCallMode() {
    const app = appOrThrow();
    const q = QUESTIONS[state.idx];

    app.innerHTML = `
      <div style="padding:20px;">
        <div style="opacity:0.85;margin-bottom:6px;">Call Mode • Question ${state.idx + 1} of ${QUESTIONS.length}</div>

        ${renderOpeningBlock()}

        <div style="margin-top:16px;padding:14px;border:1px solid rgba(198,169,74,0.45);border-radius:10px;background:#132A3A;">
          <div style="font-size:12px;opacity:0.85;">${esc(q.section)}</div>
          <div style="margin-top:8px;font-size:16px;line-height:1.35;"><b>${esc(q.prompt)}</b></div>

          <div style="margin-top:12px;">
            ${renderInput(q)}
          </div>

          <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" onclick="window.backQ()" ${state.idx === 0 ? "disabled" : ""}>Back</button>
            <button type="button" onclick="window.nextQ()">Next</button>
            <button type="button" onclick="window.resetDeal()">Start New Deal</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderDashboard() {
    const app = appOrThrow();

    const answeredCount = Object.keys(state.answers).filter(k => (state.answers[k]?.value || "").trim()).length;

    app.innerHTML = `
      <div style="padding:20px;">
        <h2 style="margin:0 0 8px 0;">Dashboard</h2>
        <div style="opacity:0.85;margin-bottom:12px;">Answered: <b>${answeredCount}</b> / ${QUESTIONS.length}</div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button type="button" onclick="window.renderCallMode()">Open Call Mode</button>
          <button type="button" onclick="window.resetDeal()">Start New Deal</button>
        </div>

        <div style="margin-top:14px;opacity:0.85;">
          Tip: If the page ever looks blank, refresh once. If it persists, your browser cached an old app.js.
        </div>
      </div>
    `;
  }

  // ===== Public (for your onclick buttons in index.html)
  window.renderDashboard = function () {
    try { renderDashboard(); }
    catch (e) { showError(e); }
  };

  window.renderCallMode = function () {
    try { renderCallMode(); }
    catch (e) { showError(e); }
  };

  window.nextQ = function () {
    try {
      saveCurrent();
      if (state.idx < QUESTIONS.length - 1) state.idx += 1;
      renderCallMode();
    } catch (e) { showError(e); }
  };

  window.backQ = function () {
    try {
      saveCurrent();
      if (state.idx > 0) state.idx -= 1;
      renderCallMode();
    } catch (e) { showError(e); }
  };

  window.pickAnswer = function (key, value) {
    try {
      state.answers[key] = { value };
      // If they say schedule, stay on the question (no auto-advance)
      if (key === "opening_time_check" && value === "No — schedule") {
        renderCallMode();
        return;
      }
      window.nextQ();
    } catch (e) { showError(e); }
  };

  window.resetDeal = function () {
    state.idx = 0;
    state.answers = {};
    window.renderDashboard();
  };

  function showError(err) {
    console.error(err);
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = `
        <div style="padding:20px;">
          <h2 style="margin:0 0 8px 0;">Error</h2>
          <pre style="white-space:pre-wrap;background:#132A3A;padding:12px;border-radius:10px;border:1px solid rgba(198,169,74,0.45);">${esc(err?.stack || err?.message || String(err))}</pre>
          <button onclick="window.renderDashboard()">Back to Dashboard</button>
        </div>
      `;
    }
  }

  // Initial paint (THIS is what prevents “blank”)
  try {
    window.renderDashboard();
  } catch (e) {
    showError(e);
  }
})();
