// Nautilus Sales System V2 – Product First Adaptive Voss OS
// Stable | 20 Questions | Adaptive Tone | Stabilizer | Scored

(function () {

  /* =========================
     SYSTEM STATE
  ========================== */

  const TEMP_LEVELS = ["CALM", "GUARDED", "DEFENSIVE", "RESISTANT"];

  const state = {
    idx: 0,
    temperature: "CALM",
    structural: 0,
    risk: 0,
    phase: "QUALIFY",
    answers: {},
    showClose: true,
    stabilizing: false
  };

  /* =========================
     OPENING SCRIPT
  ========================== */

  const OPENING_SCRIPT = `
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry for [product + quantity + destination].
I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team reviewed your inquiry and we can fulfill it through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details.
This usually only takes a few minutes.
`.trim();

  /* =========================
     PRODUCT-FIRST QUESTION FLOW (20)
  ========================== */

  const QUESTIONS = [

    // PRODUCT
    { key:"product", prompt:"What exact product are you looking to secure?" },
    { key:"specs", prompt:"What specifications would make it unacceptable on your side?" },
    { key:"volume", prompt:"What volume can you realistically move without strain?" },
    { key:"packaging", prompt:"How should it be packaged so there’s no downstream friction?" },
    { key:"destination", prompt:"Which destination port should we structure against?" },
    { key:"timeline", prompt:"What delivery window are you operating under?" },

    // COMMERCIAL
    { key:"price", prompt:"What number makes this commercially workable for you per MT?" },
    { key:"instrument", prompt:"What payment instrument will you use?" },
    { key:"bank", prompt:"Which bank will issue that instrument?" },
    { key:"issuance_speed", prompt:"How quickly can the instrument be issued once aligned?" },

    // STRUCTURE
    { key:"company", prompt:"What exact company name should appear on the offer?" },
    { key:"entity", prompt:"What legal entity type are we dealing with?" },
    { key:"country", prompt:"What country is the buying entity registered in?" },
    { key:"website", prompt:"Is there a website or company profile we can reference?" },
    { key:"contact", prompt:"Who should receive formal documentation once prepared?" },

    // AUTHORITY & ENGAGEMENT
    { key:"approval", prompt:"When this is ready, what has to happen internally for approval?" },
    { key:"loi", prompt:"Once aligned, what would prevent LOI or ICPO from being issued?" },
    { key:"compliance", prompt:"Are there regulatory requirements we need to respect?" },
    { key:"other_products", prompt:"What other commodities are you regularly buying or selling?" },
    { key:"long_term", prompt:"If this works smoothly, are you open to long-term supply?" }

  ];

  /* =========================
     UTILITIES
  ========================== */

  const $ = id => document.getElementById(id);

  function esc(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function copy(text){
    navigator.clipboard?.writeText(text).catch(()=>{});
  }

  function computeScores(){
    const answered = Object.keys(state.answers).length;
    state.structural = Math.round((answered / QUESTIONS.length) * 100);

    let risk = 0;
    if(!state.answers.instrument) risk += 25;
    if(!state.answers.bank) risk += 25;
    if(!state.answers.price) risk += 20;
    if(state.temperature === "DEFENSIVE") risk += 10;
    if(state.temperature === "RESISTANT") risk += 20;

    state.risk = Math.min(risk,100);

    if(state.structural < 40) state.phase = "QUALIFY";
    else if(state.structural < 75) state.phase = "ALIGN";
    else state.phase = "LEVERAGE";
  }

  /* =========================
     STABILIZER LOGIC
  ========================== */

  function getStabilizer(){
    return [
      "It sounds like something here doesn’t feel right. What’s the main concern?",
      "Where are you feeling hesitation on this?",
      "What would make this feel safer for you?",
      "What’s the risk you’re trying to avoid?"
    ];
  }

  function getClose(){
    const closes = {
      CALM: "Perfect. I’ll structure the Soft Corporate Offer and send it for review.",
      GUARDED: "What would you need to see in writing to feel comfortable moving forward?",
      DEFENSIVE: "What concern would need to be resolved before progressing?",
      RESISTANT: "What would have to change for this to become actionable?"
    };
    return closes[state.temperature];
  }

  /* =========================
     RENDER
  ========================== */

  function renderDashboard(){
    computeScores();

    $("app").innerHTML = `
      <div class="wrap">
        <h2>Dashboard</h2>
        <div class="card">
          Phase: <b>${state.phase}</b><br>
          Structural: <b>${state.structural}</b>/100<br>
          Risk: <b>${state.risk}</b>/100<br>
          Temperature: <b>${state.temperature}</b>
        </div>
        <button class="btn" onclick="renderCallMode()">Open Call Mode</button>
      </div>
    `;
  }

  function renderCallMode(){
    computeScores();

    const q = QUESTIONS[state.idx];

    let stabilizerBlock = "";

    if(state.temperature === "DEFENSIVE" || state.temperature === "RESISTANT"){
      const s = getStabilizer();
      stabilizerBlock = `
        <div class="card">
          <b>Stabilizer</b><br>
          ${s.map(line=>`
            <div class="suggest" onclick="copy('${esc(line)}')">${esc(line)}</div>
          `).join("")}
        </div>
      `;
    }

    $("app").innerHTML = `
      <div class="wrap">

        <div class="muted">Call Mode • Question ${state.idx+1} of ${QUESTIONS.length}</div>

        <div class="card">
          <b>Opening Script</b>
          <div style="white-space:pre-wrap;">${esc(OPENING_SCRIPT)}</div>
        </div>

        ${stabilizerBlock}

        <div class="card">
          <div class="q">${q.prompt}</div>
          <input id="field" class="input" value="${esc(state.answers[q.key]||"")}" />
          <div style="margin-top:10px;">
            <button class="btn" onclick="backQ()">Back</button>
            <button class="btn" onclick="nextQ()">Next</button>
          </div>
        </div>

        <div class="card">
          <b>Temperature</b><br>
          ${TEMP_LEVELS.map(t=>`
            <button class="chip" onclick="setTemp('${t}')">${t}</button>
          `).join("")}
        </div>

        ${state.showClose ? `
          <div class="card">
            <b>Adaptive Close</b>
            <div class="suggest" onclick="copy('${esc(getClose())}')">${esc(getClose())}</div>
          </div>
        `:""}

      </div>
    `;
  }

  /* =========================
     ACTIONS
  ========================== */

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

  renderDashboard();

})();
