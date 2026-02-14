// Nautilus Sales System — Voss OS Operational Build
// Stable | Scored | Phase Driven | Pre-Close Enabled

(function () {

  /* ===============================
     CORE SYSTEM STATE
  =============================== */

  const PHASES = ["QUALIFY", "ALIGN", "LEVERAGE"];

  const TEMP_LEVELS = ["CALM", "GUARDED", "DEFENSIVE", "RESISTANT"];

  const state = {
    idx: 0,
    phase: "QUALIFY",
    temperature: "CALM",
    structural: 0,
    risk: 0,
    answers: {},
    flags: [],
    selectedSuggestion: "",
    selectedClose: "",
    showClose: true
  };

  /* ===============================
     OPENING SCRIPT (Persistent)
  =============================== */

  const OPENING_SCRIPT = `
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for [product + quantity + destination].
I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill it through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side.
This usually only takes a few minutes.
`.trim();

  /* ===============================
     QUESTION ENGINE (VOSS STYLE)
  =============================== */

  const QUESTIONS = [

    {
      key: "authority",
      section: "Decision Structure",
      prompt: "When this is ready to move, what has to happen internally for it to get approved?",
      type: "text",
      scoreWeight: 10
    },

    {
      key: "role",
      section: "Positioning",
      prompt: "Where do you sit in the chain on this transaction?",
      type: "text",
      scoreWeight: 5
    },

    {
      key: "product",
      section: "Product",
      prompt: "What exact product are you looking to secure?",
      type: "text",
      scoreWeight: 5
    },

    {
      key: "specs",
      section: "Specifications",
      prompt: "What specifications would make this unacceptable on your side?",
      type: "text",
      scoreWeight: 10
    },

    {
      key: "volume",
      section: "Volume",
      prompt: "What volume can you realistically move without strain?",
      type: "text",
      scoreWeight: 10
    },

    {
      key: "target_price",
      section: "Financial",
      prompt: "What number makes this commercially workable for you per MT?",
      type: "text",
      scoreWeight: 15
    },

    {
      key: "instrument",
      section: "Financial",
      prompt: "What payment instrument will you use, and which bank will issue it?",
      type: "text",
      scoreWeight: 20
    },

    {
      key: "timeline",
      section: "Logistics",
      prompt: "What timeline are you operating under — and what happens if it's missed?",
      type: "text",
      scoreWeight: 10
    },

    {
      key: "loi",
      section: "Engagement",
      prompt: "Once terms align, what would prevent you from issuing LOI or ICPO?",
      type: "text",
      scoreWeight: 15
    }
  ];

  /* ===============================
     UTILITY
  =============================== */

  const $ = id => document.getElementById(id);

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function copy(text){
    navigator.clipboard?.writeText(text).catch(()=>{});
  }

  /* ===============================
     SCORING ENGINE
  =============================== */

  function computeStructural(){
    let total = 0;
    let earned = 0;

    QUESTIONS.forEach(q=>{
      total += q.scoreWeight;
      if(state.answers[q.key] && state.answers[q.key].trim().length > 2){
        earned += q.scoreWeight;
      }
    });

    state.structural = Math.round((earned/total)*100);
  }

  function computeRisk(){
    let risk = 0;

    if(!state.answers.instrument) risk += 30;
    if(!state.answers.target_price) risk += 20;
    if(!state.answers.loi) risk += 20;

    if(state.temperature === "DEFENSIVE") risk += 10;
    if(state.temperature === "RESISTANT") risk += 20;

    state.risk = Math.min(risk,100);
  }

  function computePhase(){
    if(state.structural < 40) state.phase = "QUALIFY";
    else if(state.structural < 75) state.phase = "ALIGN";
    else state.phase = "LEVERAGE";
  }

  /* ===============================
     FLAG ENGINE
  =============================== */

  function evaluateFlags(){
    state.flags = [];

    if(state.risk > 60) state.flags.push("HIGH RISK STRUCTURE");
    if(!state.answers.instrument) state.flags.push("NO PAYMENT INSTRUMENT DISCLOSED");
    if(state.temperature === "RESISTANT") state.flags.push("PSYCHOLOGICAL RESISTANCE HIGH");
  }

  /* ===============================
     RENDER
  =============================== */

  function renderDashboard(){
    computeStructural();
    computeRisk();
    computePhase();
    evaluateFlags();

    $("app").innerHTML = `
      <div class="wrap">
        <h2>Dashboard</h2>

        <div class="card">
          <b>Phase:</b> ${state.phase}<br>
          <b>Structural Score:</b> ${state.structural}/100<br>
          <b>Risk Score:</b> ${state.risk}/100<br>
          <b>Temperature:</b> ${state.temperature}
        </div>

        <div class="card">
          <b>Flags</b><br>
          ${state.flags.length ? state.flags.join("<br>") : "No flags"}
        </div>

        <button onclick="renderCallMode()" class="btn">Open Call Mode</button>
      </div>
    `;
  }

  function renderCallMode(){
    computeStructural();
    computeRisk();
    computePhase();
    evaluateFlags();

    const q = QUESTIONS[state.idx];

    $("app").innerHTML = `
      <div class="wrap">
        <div class="muted">Call Mode • Question ${state.idx+1} of ${QUESTIONS.length}</div>

        <div class="card">
          <div><b>Opening Script</b></div>
          <div style="white-space:pre-wrap;">${esc(OPENING_SCRIPT)}</div>
        </div>

        <div class="card">
          <div class="muted">${q.section}</div>
          <div class="q">${q.prompt}</div>
          <input id="field" class="input" value="${esc(state.answers[q.key]||"")}" />

          <div style="margin-top:10px;">
            <button onclick="backQ()" class="btn">Back</button>
            <button onclick="nextQ()" class="btn">Next</button>
          </div>
        </div>

        <div class="card">
          <b>Temperature</b><br>
          ${TEMP_LEVELS.map(t=>`
            <button onclick="setTemp('${t}')" class="chip">${t}</button>
          `).join("")}
        </div>

        ${renderCloseBlock()}
      </div>
    `;
  }

  function renderCloseBlock(){
    if(!state.showClose) return "";

    const closes = {
      CALM: "I'll prepare the Soft Corporate Offer and send it for your review.",
      GUARDED: "What would you need to see in writing to feel comfortable moving forward?",
      DEFENSIVE: "What concern would you want removed before anything progresses?",
      RESISTANT: "What would have to change for this to become actionable for you?"
    };

    return `
      <div class="card">
        <b>Suggested Close (${state.temperature})</b><br>
        <div class="suggest" onclick="copyClose()">${closes[state.temperature]}</div>
      </div>
    `;
  }

  /* ===============================
     ACTIONS
  =============================== */

  window.renderDashboard = renderDashboard;
  window.renderCallMode = renderCallMode;

  window.nextQ = function(){
    const q = QUESTIONS[state.idx];
    state.answers[q.key] = $("field").value;
    if(state.idx < QUESTIONS.length-1) state.idx++;
    renderCallMode();
  };

  window.backQ = function(){
    if(state.idx > 0) state.idx--;
    renderCallMode();
  };

  window.setTemp = function(t){
    state.temperature = t;
    renderCallMode();
  };

  window.copyClose = function(){
    const closes = {
      CALM: "I'll prepare the Soft Corporate Offer and send it for your review.",
      GUARDED: "What would you need to see in writing to feel comfortable moving forward?",
      DEFENSIVE: "What concern would you want removed before anything progresses?",
      RESISTANT: "What would have to change for this to become actionable for you?"
    };
    copy(closes[state.temperature]);
  };

  renderDashboard();

})();
