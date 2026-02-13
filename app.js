console.log("NSS v1 Wizard (Financial Qualification Upgrade) loaded ✅");

const app = document.getElementById("app");
const dashboardBtn = document.getElementById("dashboardBtn");
const callBtn = document.getElementById("callBtn");

let state = {
  idx: 0,
  phase: "QUALIFY",
  temperature: "CALM",
  structural: 0,
  risk: 0,
  log: ["Wizard ready."],
  answers: {}
};

/* =======================
   CORE + FINANCIAL KEYS
======================= */

const CORE_KEYS = [
  "company_name",
  "country_address",
  "contact_person",
  "role",
  "product",
  "specs",
  "quantity",
  "destination_port",
  "target_price",
  "primary_instrument",
  "issuing_bank",
  "loi_ready"
];

const QUESTIONS = [

  /* ===== Company ===== */
  { key:"company_name", section:"Company", prompt:"What’s the exact registered company name on your documents?", type:"text", placeholder:"Registered Company Name" },
  { key:"country_address", section:"Company", prompt:"What’s the country of registration and business address tied to this deal?", type:"text", placeholder:"Country + Address" },
  { key:"contact_person", section:"Company", prompt:"Who’s the key contact — full name, title, phone/email?", type:"text", placeholder:"Name, role, phone, email" },

  /* ===== Profile ===== */
  { key:"role", section:"Profile", prompt:"Where do you sit in the chain — end buyer, distributor, trader, or agent?", type:"single", options:["End Buyer","Distributor","Trader","Agent"] },

  /* ===== Product ===== */
  { key:"product", section:"Product", prompt:"What product are you targeting?", type:"text", placeholder:"Product name" },
  { key:"specs", section:"Product", prompt:"What specs/standards are required?", type:"text", placeholder:"Specs / grade" },
  { key:"quantity", section:"Product", prompt:"What quantity are you requesting?", type:"number", unitOptions:["MT","40ft containers","20ft containers"], placeholder:"Quantity number" },
  { key:"destination_port", section:"Logistics", prompt:"What destination port should we use?", type:"text", placeholder:"Destination port" },

  /* ===== Financial ===== */
  { key:"target_price", section:"Financial", prompt:"What target price range (USD/MT) are you working within?", type:"text", placeholder:"Target USD/MT" },

  { key:"primary_instrument", section:"Financial", prompt:"What primary payment instrument will be used?", type:"single",
    options:["LC","DLC","SBLC","TT"] },

  { key:"secondary_instrument", section:"Financial", prompt:"Any secondary instrument available?", type:"singleOptional",
    options:["None","LC","DLC","SBLC","TT"] },

  { key:"issuing_bank", section:"Financial", prompt:"Which bank will be issuing the instrument? (Bank name + country)", type:"text", placeholder:"Bank name + country" },

  { key:"trade_finance_needed", section:"Financial", prompt:"Do you require trade finance assistance?", type:"single",
    options:["Yes","No"] },

  { key:"loi_ready", section:"Engagement", prompt:"Are you ready to issue an LOI or ICPO once terms align?", type:"single",
    options:["Yes","Needs internal approval","No"] }
];

/* =======================
   HELPERS
======================= */

function log(msg){
  const t = new Date().toLocaleTimeString();
  state.log.unshift(`[${t}] ${msg}`);
  state.log = state.log.slice(0,15);
}

function hasValue(v){
  if (!v) return false;
  return String(v).trim().length > 0;
}

function computeStructural(){
  let answered = 0;
  for (const k of CORE_KEYS){
    const a = state.answers[k];
    if (a && !a.pending && hasValue(a.value)) answered++;
  }
  state.structural = Math.round((answered / CORE_KEYS.length) * 100);
}

function computeRisk(){
  let risk = 0;

  if (!hasValue(state.answers.primary_instrument?.value)) risk += 20;
  if (!hasValue(state.answers.issuing_bank?.value)) risk += 25;
  if (state.answers.loi_ready?.value === "No") risk += 30;
  if (state.answers.loi_ready?.value === "Needs internal approval") risk += 10;

  state.risk = Math.min(risk,100);
}

function tempDotClass(){
  if (state.temperature === "CALM") return "dot--teal";
  if (state.temperature === "GUARDED") return "dot--amber";
  if (state.temperature === "DEFENSIVE") return "dot--amber";
  return "dot--red";
}

function setPhase(){
  const pct = Math.round(((state.idx + 1) / QUESTIONS.length) * 100);
  state.phase = pct < 50 ? "QUALIFY" : (pct < 80 ? "ALIGN" : "LEVERAGE");
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* =======================
   RENDER
======================= */

function renderDashboard(){
  computeStructural();
  computeRisk();

  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Dashboard</h2>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
        <div class="pill"><span class="dot ${tempDotClass()}"></span> Phase: <b>${state.phase}</b></div>
        <div class="pill">Structural: <b>${state.structural}</b>/100</div>
        <div class="pill">Risk: <b>${state.risk}</b>/100</div>
      </div>

      <div style="margin-top:15px;">
        <button class="btn2 btn2--gold" onclick="renderCallMode()">Open Call Mode</button>
        <button class="btn2" onclick="resetDeal()">Start New Deal</button>
      </div>

      <div style="margin-top:15px;">
        <div class="monoBox">
          ${state.log.map(x=>`<div>${escapeHtml(x)}</div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderCallMode(){
  computeStructural();
  computeRisk();
  setPhase();

  const q = QUESTIONS[state.idx];
  const a = state.answers[q.key] || { value:"", pending:false };

  app.innerHTML = `
  <div style="display:flex;gap:14px;">
    <div style="flex:2;background:#132A3A;padding:16px;border-radius:10px;">

      <div style="display:flex;justify-content:space-between;">
        <div>
          <div style="font-size:12px;opacity:0.7;">Section</div>
          <div style="font-weight:700;">${q.section}</div>
        </div>
        <div class="pill">Q ${state.idx+1}/${QUESTIONS.length}</div>
      </div>

      <div style="margin-top:12px;">${escapeHtml(q.prompt)}</div>

      ${renderInput(q,a)}

      <div style="margin-top:12px;display:flex;justify-content:space-between;">
        <button class="btn2" onclick="back()" ${state.idx===0?"disabled":""}>Back</button>
        <button class="btn2 btn2--gold" onclick="next()">Next</button>
      </div>

      <div style="margin-top:12px;">
        ${["CALM","GUARDED","DEFENSIVE","RESISTANT"].map(t=>`
          <button class="chip ${state.temperature===t?"chip--on":""}" onclick="setTemp('${t}')">${t}</button>
        `).join("")}
      </div>

    </div>

    <div style="flex:1;background:#132A3A;padding:16px;border-radius:10px;">
      <h4>Deal Snapshot</h4>
      <div>Structural: ${state.structural}/100</div>
      <div>Risk: ${state.risk}/100</div>
      <div>Phase: ${state.phase}</div>
    </div>
  </div>
  `;
}

function renderInput(q,a){
  if (q.type==="text"){
    return `<input id="inputField" class="nss-input" value="${escapeHtml(a.value)}" placeholder="${escapeHtml(q.placeholder||"")}" />`;
  }
  if (q.type==="number"){
    return `
      <input id="numField" class="nss-input" placeholder="${q.placeholder}" />
      <select id="unitField" class="nss-select">
        ${q.unitOptions.map(x=>`<option>${x}</option>`).join("")}
      </select>
    `;
  }
  if (q.type==="single" || q.type==="singleOptional"){
    return q.options.map(o=>`
      <button class="chip ${a.value===o?"chip--on":""}" onclick="pick('${o}')">${o}</button>
    `).join("");
  }
  return "";
}

/* =======================
   ACTIONS
======================= */

function next(){
  autosave();
  state.idx = Math.min(state.idx+1, QUESTIONS.length-1);
  renderCallMode();
}

function back(){
  autosave();
  state.idx = Math.max(state.idx-1,0);
  renderCallMode();
}

function autosave(){
  const q = QUESTIONS[state.idx];
  let val = "";

  if (q.type==="text"){
    val = document.getElementById("inputField")?.value;
  }
  if (q.type==="number"){
    const n = document.getElementById("numField")?.value;
    const u = document.getElementById("unitField")?.value;
    if (n) val = `${n} ${u}`;
  }

  if (val) state.answers[q.key] = { value:val, pending:false };
}

function pick(v){
  const q = QUESTIONS[state.idx];
  state.answers[q.key] = { value:v, pending:false };
  renderCallMode();
}

function setTemp(t){
  state.temperature = t;
  renderCallMode();
}

function resetDeal(){
  state.idx=0;
  state.answers={};
  state.structural=0;
  state.risk=0;
  state.temperature="CALM";
  state.log=["New deal started."];
  renderDashboard();
}

/* =======================
   INIT
======================= */

dashboardBtn.addEventListener("click", renderDashboard);
callBtn.addEventListener("click", renderCallMode);

renderDashboard();
