console.log("NSS v1 Wizard (Core+Financial v1) loaded ✅");

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
  answers: {} // key -> { value, pending }
};

/* =======================
   QUESTION SET (13 total)
======================= */

const QUESTIONS = [
  // Core Intake (8)
  { key:"company_name", section:"Company", prompt:"What’s the exact registered company name on your documents?", type:"text", placeholder:"Registered Company Name" },
  { key:"country_address", section:"Company", prompt:"What’s the country of registration and business address tied to this deal?", type:"text", placeholder:"Country + Address" },
  { key:"contact_person", section:"Company", prompt:"Who’s the key contact — full name, title, phone/email?", type:"text", placeholder:"Name, role, phone, email" },

  { key:"role", section:"Profile", prompt:"Where do you sit in the chain — end buyer, distributor, trader, or agent?", type:"single", options:["End Buyer","Distributor","Trader","Agent"] },

  { key:"product", section:"Product", prompt:"What product are you targeting?", type:"text", placeholder:"Product name" },
  { key:"specs", section:"Product", prompt:"What specs/standards are required (grade, certifications, etc.)?", type:"text", placeholder:"Specs / standards" },
  { key:"quantity", section:"Product", prompt:"What quantity are you requesting?", type:"number", unitOptions:["MT","40ft containers","20ft containers"], placeholder:"Quantity number" },
  { key:"destination_port", section:"Logistics", prompt:"What destination port should we use?", type:"text", placeholder:"Destination port(s)" },

  // Financial Qualification (5)
  { key:"target_price", section:"Financial", prompt:"To keep us aligned — what target price range (USD/MT) are you trying to hit?", type:"text", placeholder:"Example: 820–860 USD/MT" },

  { key:"primary_instrument", section:"Financial", prompt:"What PRIMARY payment instrument will you use on this transaction?", type:"single",
    options:["LC","DLC","SBLC","TT","Escrow","Other"], allowText:true, placeholder:"If Other, type it" },

  { key:"secondary_instrument", section:"Financial", prompt:"Do you have a SECONDARY instrument available (backup option)?", type:"single",
    options:["None","LC","DLC","SBLC","TT","Escrow","Other"], allowText:true, placeholder:"If Other, type it" },

  { key:"issuing_bank", section:"Financial", prompt:"Which bank will be used for the instrument? (Bank name + country)", type:"text", placeholder:"Bank name + country" },

  { key:"loi_ready", section:"Engagement", prompt:"Once terms align, are you ready to issue an LOI or ICPO on letterhead?", type:"single",
    options:["Yes","Needs internal approval","No"], allowText:true, placeholder:"Notes (optional)" }
];

/* ====== Scoring Keys ====== */
const STRUCTURAL_KEYS = [
  "company_name","country_address","contact_person","role","product","specs","quantity","destination_port",
  "target_price","primary_instrument","issuing_bank","loi_ready"
];

function log(msg){
  const t = new Date().toLocaleTimeString();
  state.log.unshift(`[${t}] ${msg}`);
  state.log = state.log.slice(0,14);
}

function hasValue(v){
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return String(v).trim().length > 0;
}

function tempDotClass(){
  if (state.temperature === "CALM") return "dot--teal";
  if (state.temperature === "GUARDED") return "dot--amber";
  if (state.temperature === "DEFENSIVE") return "dot--amber";
  return "dot--red";
}

function computePhase(){
  const pct = Math.round(((state.idx + 1) / QUESTIONS.length) * 100);
  state.phase = pct < 50 ? "QUALIFY" : (pct < 80 ? "ALIGN" : "LEVERAGE");
}

function computeStructural(){
  let answered = 0;
  for (const k of STRUCTURAL_KEYS){
    const a = state.answers[k];
    if (a && !a.pending && hasValue(a.value)) answered++;
  }
  state.structural = Math.round((answered / STRUCTURAL_KEYS.length) * 100);
}

function computeRisk(){
  let r = 0;

  const prim = state.answers.primary_instrument?.value || "";
  const bank = state.answers.issuing_bank?.value || "";
  const loi  = state.answers.loi_ready?.value || "";
  const price = state.answers.target_price?.value || "";

  if (!hasValue(price)) r += 10;
  if (!hasValue(prim)) r += 25;
  if (!hasValue(bank)) r += 25;

  if (String(loi).toLowerCase().includes("no")) r += 30;
  if (String(loi).toLowerCase().includes("internal")) r += 10;

  state.risk = Math.min(r, 100);
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
   AUTOSAVE CURRENT
======================= */
function autosave(){
  const q = QUESTIONS[state.idx];
  if (!q) return;

  const a = state.answers[q.key] || { value:"", pending:false };

  if (q.type === "text" || q.allowText){
    const el = document.getElementById("textInput");
    if (el && el.value.trim()) a.value = el.value.trim();
  }

  if (q.type === "number"){
    const n = (document.getElementById("numInput")?.value || "").trim();
    const u = (document.getElementById("unitSelect")?.value || "").trim();
    if (n) a.value = `${n} ${u}`;
  }

  state.answers[q.key] = a;
  computePhase();
  computeStructural();
  computeRisk();
}

/* =======================
   RENDER
======================= */
function renderDashboard(){
  computePhase();
  computeStructural();
  computeRisk();

  app.innerHTML = `
    <div style="padding:20px;">
      <h2 style="margin:0 0 10px 0;">Dashboard Mode</h2>
      <div style="opacity:0.9;">Core + Financial Wizard (13 Questions)</div>

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
        <div class="pill"><span class="dot ${tempDotClass()}"></span> Phase: <b>${state.phase}</b></div>
        <div class="pill">Structural: <b>${state.structural}</b>/100</div>
        <div class="pill">Risk: <b>${state.risk}</b>/100</div>
        <div class="pill"><span class="dot ${tempDotClass()}"></span> Temp: <b>${state.temperature}</b></div>
      </div>

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn2 btn2--gold" type="button" onclick="renderCallMode()">Open Call Mode</button>
        <button class="btn2" type="button" onclick="window.resetDeal()">Start New Deal</button>
      </div>

      <div style="margin-top:14px;">
        <div style="font-size:12px;opacity:0.75;margin-bottom:6px;">Activity Log</div>
        <div class="monoBox">
          ${state.log.map(x=>`<div style="margin-bottom:6px;">${escapeHtml(x)}</div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderCallMode(){
  computePhase();
  computeStructural();
  computeRisk();

  const q = QUESTIONS[state.idx];
  const a = state.answers[q.key] || { value:"", pending:false };

  app.innerHTML = `
    <div style="display:flex;gap:14px;align-items:stretch;">
      <div style="flex:2;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div>
            <div style="opacity:0.75;font-size:12px;">Section</div>
            <div style="font-weight:800;font-size:16px;margin-top:2px;">${escapeHtml(q.section)}</div>
            <div style="opacity:0.75;font-size:12px;margin-top:6px;">Question ${state.idx+1} of ${QUESTIONS.length}</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <div class="pill"><span class="dot ${tempDotClass()}"></span> Phase: <b>${state.phase}</b></div>
            <div class="pill">Structural: <b>${state.structural}</b>/100</div>
            <div class="pill">Risk: <b>${state.risk}</b>/100</div>
          </div>
        </div>

        <div style="margin-top:14px;background:rgba(11,28,45,0.55);border:1px solid rgba(255,255,255,0.08);padding:14px;border-radius:10px;">
          <div style="font-size:16px;line-height:1.35;">${escapeHtml(q.prompt)}</div>
        </div>

        ${q.options ? `<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
          ${q.options.map(o=>`<button class="chip ${String(a.value)===String(o) ? "chip--on":""}" type="button" onclick="window.pick(${JSON.stringify(o)})">${escapeHtml(o)}</button>`).join("")}
        </div>` : ""}

        ${renderInput(q, a)}

        <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between;">
          <label style="display:flex;align-items:center;gap:8px;opacity:0.9;">
            <input type="checkbox" ${a.pending ? "checked":""} onchange="window.setPending(this.checked)" />
            Mark Pending
          </label>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn2" type="button" onclick="window.back()" ${state.idx===0?"disabled":""}>Back</button>
            <button class="btn2 btn2--gold" type="button" onclick="window.next()">Next</button>
          </div>
        </div>

        <div style="margin-top:14px;">
          <div style="opacity:0.75;font-size:12px;margin-bottom:6px;">Psychological Temperature</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${["CALM","GUARDED","DEFENSIVE","RESISTANT"].map(t=>`
              <button class="chip ${state.temperature===t ? "chip--on":""}" type="button" onclick="window.setTemp('${t}')">${t[0]+t.slice(1).toLowerCase()}</button>
            `).join("")}
          </div>
        </div>

        <div style="margin-top:14px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <button class="btn2" type="button" onclick="window.finish()">Finish (back to Dashboard)</button>
        </div>
      </div>

      <div style="flex:1;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">
        <h3 style="margin:0 0 8px 0;">Call Snapshot</h3>
        <div class="pill">Structural: <b>${state.structural}</b>/100</div>
        <div style="height:10px;"></div>
        <div class="pill">Risk: <b>${state.risk}</b>/100</div>
        <div style="height:10px;"></div>
        <div class="pill"><span class="dot ${tempDotClass()}"></span> Temp: <b>${state.temperature}</b></div>

        <div style="margin-top:12px;">
          <div style="font-size:12px;opacity:0.75;margin-bottom:6px;">Activity Log</div>
          <div class="monoBox">
            ${state.log.map(x=>`<div style="margin-bottom:6px;">${escapeHtml(x)}</div>`).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderInput(q, a){
  if (q.type === "text"){
    return `<div style="margin-top:12px;"><input id="textInput" class="nss-input" placeholder="${escapeHtml(q.placeholder||"")}" value="${escapeHtml(a.value||"")}"></div>`;
  }
  if (q.type === "number"){
    const unitOptions = q.unitOptions || ["MT"];
    let n = "", u = unitOptions[0];
    if (typeof a.value === "string" && a.value.includes(" ")){
      const parts = a.value.split(" ");
      n = parts[0] || "";
      u = parts.slice(1).join(" ") || u;
    }
    return `
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
        <input id="numInput" class="nss-input" style="max-width:220px;" inputmode="decimal"
          placeholder="${escapeHtml(q.placeholder||"Enter number")}" value="${escapeHtml(n)}" />
        <select id="unitSelect" class="nss-select">
          ${unitOptions.map(x=>`<option value="${escapeHtml(x)}" ${x===u?"selected":""}>${escapeHtml(x)}</option>`).join("")}
        </select>
      </div>
    `;
  }
  if (q.allowText){
    return `<div style="margin-top:12px;"><input id="textInput" class="nss-input" placeholder="${escapeHtml(q.placeholder||"Optional")}" value=""></div>`;
  }
  return "";
}

/* =======================
   ACTIONS
======================= */
window.setTemp = (t) => {
  const prev = state.temperature;
  state.temperature = t;
  log(`Temp: ${prev} → ${t}`);
  renderCallMode();
};

window.setPending = (checked) => {
  const q = QUESTIONS[state.idx];
  const a = state.answers[q.key] || { value:"", pending:false };
  a.pending = checked;
  state.answers[q.key] = a;
  log(`${q.key} marked ${checked ? "PENDING" : "ANSWERED"}`);
  renderCallMode();
};

window.pick = (val) => {
  const q = QUESTIONS[state.idx];
  const a = state.answers[q.key] || { value:"", pending:false };
  a.value = val;
  a.pending = false;
  state.answers[q.key] = a;
  log(`Selected: ${val}`);
  renderCallMode();
};

window.next = () => {
  autosave();
  state.idx = Math.min(state.idx + 1, QUESTIONS.length - 1);
  renderCallMode();
};

window.back = () => {
  autosave();
  state.idx = Math.max(state.idx - 1, 0);
  renderCallMode();
};

window.finish = () => {
  autosave();
  log("Finished intake (returned to Dashboard).");
  renderDashboard();
};

window.resetDeal = () => {
  state.idx = 0;
  state.phase = "QUALIFY";
  state.temperature = "CALM";
  state.structural = 0;
  state.risk = 0;
  state.answers = {};
  state.log = ["New deal started."];
  renderDashboard();
};

/* =======================
   NAV
======================= */
dashboardBtn.addEventListener("click", renderDashboard);
callBtn.addEventListener("click", renderCallMode);

renderDashboard();
