console.log("NSS v1 Wizard (minimal) loaded ✅");

const app = document.getElementById("app");
const dashboardBtn = document.getElementById("dashboardBtn");
const callBtn = document.getElementById("callBtn");

if (!dashboardBtn || !callBtn || !app) {
  alert("Missing dashboardBtn/callBtn/app. Check index.html IDs.");
}

let state = {
  idx: 0,
  phase: "QUALIFY",
  temperature: "CALM",
  structural: 0,
  risk: 0,
  log: ["Wizard ready."]
};

const QUESTIONS = [
  { key:"company", section:"Company", prompt:"What’s the exact registered company name on your documents?", type:"text", placeholder:"Registered Company Name" },
  { key:"role", section:"Profile", prompt:"Where do you sit in the chain — end buyer, distributor, trader, or agent?", type:"single", options:["End Buyer","Distributor","Trader","Agent"] },
  { key:"product", section:"Product", prompt:"What product are you targeting?", type:"single", options:["Sunflower Oil","Urea N46","Wheat","Sugar","Other"], allowText:true, placeholder:"If Other, type it" }
];

function log(msg){
  const t = new Date().toLocaleTimeString();
  state.log.unshift(`[${t}] ${msg}`);
  state.log = state.log.slice(0,10);
}

function tempDotClass(){
  if (state.temperature === "CALM") return "dot--teal";
  if (state.temperature === "GUARDED") return "dot--amber";
  if (state.temperature === "DEFENSIVE") return "dot--amber";
  return "dot--red";
}

function renderDashboard(){
  app.innerHTML = `
    <div style="padding:20px;">
      <h2 style="margin:0 0 10px 0;">Dashboard Mode</h2>
      <div style="opacity:0.9;">This is the stable base. Call Mode runs the wizard.</div>
      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
        <div class="pill"><span class="dot ${tempDotClass()}"></span> Phase: <b>${state.phase}</b></div>
        <div class="pill">Structural: <b>${state.structural}</b></div>
        <div class="pill">Risk: <b>${state.risk}</b></div>
        <div class="pill"><span class="dot ${tempDotClass()}"></span> Temp: <b>${state.temperature}</b></div>
      </div>
    </div>
  `;
}

function renderCallMode(){
  const q = QUESTIONS[state.idx];
  app.innerHTML = `
    <div style="display:flex;gap:14px;align-items:stretch;">
      <div style="flex:2;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div>
            <div style="opacity:0.75;font-size:12px;">Section</div>
            <div style="font-weight:800;font-size:16px;margin-top:2px;">${q.section}</div>
          </div>
          <div class="pill"><span class="dot ${tempDotClass()}"></span> Phase: <b>${state.phase}</b></div>
        </div>

        <div style="margin-top:14px;background:rgba(11,28,45,0.55);border:1px solid rgba(255,255,255,0.08);padding:14px;border-radius:10px;">
          <div style="font-size:12px;opacity:0.75;margin-bottom:6px;">Question ${state.idx+1} of ${QUESTIONS.length}</div>
          <div style="font-size:16px;line-height:1.35;">${q.prompt}</div>
        </div>

        ${q.options ? `<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
          ${q.options.map(o=>`<button class="chip" type="button" onclick="window.pick(${JSON.stringify(o)})">${o}</button>`).join("")}
        </div>` : ""}

        ${q.type==="text" ? `<div style="margin-top:12px;">
          <input id="txt" class="nss-input" placeholder="${q.placeholder||""}">
        </div>` : ""}

        ${q.allowText ? `<div style="margin-top:12px;">
          <input id="other" class="nss-input" placeholder="${q.placeholder||"Optional"}">
        </div>` : ""}

        <!-- Temperature quick-pick (no cycling) -->
        <div style="margin-top:14px;">
          <div style="opacity:0.75;font-size:12px;margin-bottom:6px;">Psychological Temperature</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="chip ${state.temperature==="CALM" ? "chip--on" : ""}" type="button" onclick="window.setTemp('CALM')">Calm</button>
            <button class="chip ${state.temperature==="GUARDED" ? "chip--on" : ""}" type="button" onclick="window.setTemp('GUARDED')">Guarded</button>
            <button class="chip ${state.temperature==="DEFENSIVE" ? "chip--on" : ""}" type="button" onclick="window.setTemp('DEFENSIVE')">Defensive</button>
            <button class="chip ${state.temperature==="RESISTANT" ? "chip--on" : ""}" type="button" onclick="window.setTemp('RESISTANT')">Resistant</button>
          </div>
        </div>

        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;">
          <button class="btn2" type="button" onclick="window.back()" ${state.idx===0?"disabled":""}>Back</button>
          <button class="btn2 btn2--gold" type="button" onclick="window.next()">Next</button>
        </div>
      </div>

      <div style="flex:1;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">
        <h3 style="margin:0 0 8px 0;">Situational Awareness</h3>
        <div class="pill">Structural: <b>${state.structural}</b></div>
        <div style="height:10px;"></div>
        <div class="pill">Risk: <b>${state.risk}</b></div>
        <div style="height:10px;"></div>
        <div class="pill"><span class="dot ${tempDotClass()}"></span> Temp: <b>${state.temperature}</b></div>

        <div style="margin-top:12px;">
          <div style="font-size:12px;opacity:0.75;margin-bottom:6px;">Activity Log</div>
          <div class="monoBox">
            ${state.log.map(x=>`<div style="margin-bottom:6px;">${x}</div>`).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

window.setTemp = (t) => {
  const prev = state.temperature;
  state.temperature = t;
  log(`Temp: ${prev} → ${t}`);
  renderCallMode();
};

window.pick = (val) => {
  state.structural += 10;
  log(`Picked: ${val}`);
  renderCallMode();
};

window.next = () => {
  const txt = document.getElementById("txt");
  const other = document.getElementById("other");
  if (txt && txt.value.trim()){
    state.structural += 10;
    log(`Saved text: ${txt.value.trim()}`);
  }
  if (other && other.value.trim()){
    state.structural += 5;
    log(`Saved note: ${other.value.trim()}`);
  }

  state.idx = Math.min(state.idx + 1, QUESTIONS.length - 1);
  state.phase = (state.idx === 0) ? "QUALIFY" : (state.idx === 1 ? "ALIGN" : "LEVERAGE");
  renderCallMode();
};

window.back = () => {
  state.idx = Math.max(state.idx - 1, 0);
  state.phase = (state.idx === 0) ? "QUALIFY" : (state.idx === 1 ? "ALIGN" : "LEVERAGE");
  renderCallMode();
};

dashboardBtn.addEventListener("click", renderDashboard);
callBtn.addEventListener("click", renderCallMode);

renderDashboard();
