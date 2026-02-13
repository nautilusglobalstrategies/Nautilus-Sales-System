console.log("NSS v1 Wizard Loaded ✅");

const app = document.getElementById("app");
const dashboardBtn = document.getElementById("dashboardBtn");
const callBtn = document.getElementById("callBtn");

/* =============================
   RUNTIME STATE (No persistence)
============================= */
const CRITICAL_FIELDS = [
  "company_name",
  "country_address",
  "contact_person",
  "role",
  "product",
  "specs",
  "quantity",
  "incoterms",
  "destination_port",
  "timeline",
  "payment_instruments",
  "bank_name_location",
  "loi_icpo_ready"
];

let deal = {
  phase: "QUALIFY",              // QUALIFY → ALIGN → LEVERAGE
  temperature: "CALM",           // CALM | GUARDED | DEFENSIVE | RESISTANT
  structuralScore: 0,            // 0–100
  authenticityRisk: 0,           // 0–100
  currentIdx: 0,
  answers: {},                   // { key: { value, pending, notes } }
  log: ["Wizard ready."]
};

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function log(msg){
  const stamp = new Date().toLocaleTimeString();
  deal.log.unshift(`[${stamp}] ${msg}`);
  deal.log = deal.log.slice(0, 12);
}

function flash(){
  const el = document.getElementById("flash");
  if (!el) return;
  el.style.opacity = "1";
  setTimeout(() => el.style.opacity = "0", 160);
}

function setPhaseByProgress(){
  // Simple heuristic: progress through wizard drives phase
  const pct = Math.round(((deal.currentIdx + 1) / QUESTIONS.length) * 100);
  const prev = deal.phase;
  if (pct < 40) deal.phase = "QUALIFY";
  else if (pct < 75) deal.phase = "ALIGN";
  else deal.phase = "LEVERAGE";
  if (prev !== deal.phase) log(`Phase suggestion: ${prev} → ${deal.phase}`);
}

/* =============================
   VOSS-STYLE QUESTION BANK
   (Includes every original question)
============================= */

const QUESTIONS = [
  // Company Information
  q("company_name","Company Information",
    "So I don’t make assumptions — what’s the exact registered company name on your documents?",
    { type:"text", placeholder:"Registered Company Name" }),

  q("country_address","Company Information",
    "What’s the country of registration and the business address you want tied to this transaction?",
    { type:"text", placeholder:"Country of registration + business address" }),

  q("company_website","Company Information",
    "Where should we verify your company online — what’s your website?",
    { type:"text", placeholder:"Company website (if none, type N/A)" }),

  q("year_established","Company Information",
    "Just so I calibrate who I’m speaking with — what year was the company established?",
    { type:"number", placeholder:"Year Established (e.g., 2017)" }),

  q("entity_type","Company Information",
    "How is the business structured legally — LLC, corporation, partnership… what are we working with?",
    { type:"single", options:["LLC","Corporation","Partnership","Sole Proprietor","Other"], allowText:true, placeholder:"If Other, type here" }),

  q("contact_person","Company Information",
    "Who’s the best point of contact on your side — name, position, and the best direct number/email?",
    { type:"text", placeholder:"Full name, role/title, phone, email" }),

  // Business Profile
  q("core_activity","Business Profile",
    "Help me understand your lane — what’s your company’s core business activity?",
    { type:"text", placeholder:"Core business activity" }),

  q("role","Business Profile",
    "Where do you sit in the chain on this one — end buyer, distributor, trader, or agent?",
    { type:"single", options:["End Buyer","Distributor","Trader","Agent"], allowText:true, placeholder:"If different, type here" }),

  q("licenses","Business Profile",
    "Do you already have the import/export licenses needed for this product in your country?",
    { type:"single", options:["Yes","No","In process","Not required / unsure"], allowText:true, placeholder:"Notes (optional)" }),

  // Product Requirements
  q("product","Product Requirements",
    "What product(s) are you targeting — and what’s the primary one for this deal?",
    { type:"multi", options:["Sunflower Oil","Soybean Oil","Palm Oil","Urea N46","Wheat","Sugar","Rice","Corn","Other"], allowText:true, placeholder:"If Other, type product(s)" }),

  q("specs","Product Requirements",
    "What specifications must be met — grade, quality, certifications, or standards?",
    { type:"text", placeholder:"Specs / standards required" }),

  q("quantity","Product Requirements",
    "What volume are you looking to move — MT or container basis? What’s the exact quantity?",
    { type:"number", placeholder:"Quantity (number only)" , unitOptions:["MT","40ft containers","20ft containers"] }),

  q("packaging","Product Requirements",
    "How do you want it packaged — bulk, flexitank, bottled, bagged… what’s the preference?",
    { type:"single", options:["Bulk","Flexitank","Bottled","Bagged","Drums","Other"], allowText:true, placeholder:"Packaging notes" }),

  q("incoterms","Logistics & Delivery",
    "Which delivery terms are you working under — FOB, CIF, CFR… what’s ideal?",
    { type:"single", options:["FOB","CIF","CFR","EXW","DDP","Other"], allowText:true, placeholder:"If Other, type incoterms" }),

  q("destination_port","Logistics & Delivery",
    "What’s the destination port (or ports) — where should this land?",
    { type:"text", placeholder:"Destination port(s)" }),

  q("timeline","Logistics & Delivery",
    "What timeline are you operating on — immediate, 30/60/90 days, or a long-term contract?",
    { type:"single", options:["Immediate","Within 30 days","Within 60 days","Within 90 days","Long-term contract (6–12+ months)"], allowText:true, placeholder:"Timeline notes" }),

  // Financial & Transactional Details
  q("target_price","Financial & Transactional",
    "To keep this realistic — what target price range (USD/MT) are you trying to land at?",
    { type:"text", placeholder:"Target price range USD/MT (e.g., 820–860)" ,
      labelHints:[
        "It sounds like you may already have a number in mind.",
        "It seems like price is a sensitive lever here."
      ],
      followups:[
        "What number would make this an easy yes for you?",
        "How are you benchmarking the price right now?"
      ]
    }),

  q("payment_instruments","Financial & Transactional",
    "What payment instrument(s) can your company provide — LC, DLC, SBLC, TT… what’s actually available?",
    { type:"multi", options:["LC","DLC","SBLC","TT","Escrow","Other"], allowText:true, placeholder:"If Other, type instrument" ,
      labelHints:["It sounds like you want to move fast but keep risk controlled."],
      followups:["Which bank issues the instrument?","What format do you typically use (MT700, etc.)?"]
    }),

  q("guarantees","Financial & Transactional",
    "If the supplier requires it, are you open to performance bond, escrow, or financial guarantees?",
    { type:"single", options:["Yes","No","Depends on terms"], allowText:true, placeholder:"Conditions (optional)" }),

  // Experience & Readiness (between pricing/payment and logistics already handled above; still included here for continuity)
  q("past_imports","Experience & Readiness",
    "Have you executed imports of this product before? If yes, what were the past details (product, volume, origin)?",
    { type:"single", options:["Yes","No"], allowText:true, placeholder:"If Yes, paste details" }),

  // Trade Finance & Documentation
  q("finance_assistance","Trade Finance & Documentation",
    "Do you require trade finance support — LC issuance, SBLC/DLC, payment guarantees?",
    { type:"single", options:["Yes","No","Maybe"], allowText:true, placeholder:"What kind of assistance?" }),

  q("bank_name_location","Trade Finance & Documentation",
    "To route this correctly: who do you bank with for trade instruments — bank name and location?",
    { type:"text", placeholder:"Bank name + city/country" ,
      labelHints:[
        "It seems like banking details can feel sensitive.",
        "It sounds like you want confidentiality protected."
      ],
      followups:[
        "What’s the best way for us to verify instrument capability without creating friction on your side?",
        "Who’s the right person at your bank to coordinate with if needed?"
      ]
    }),

  q("docs_available","Trade Finance & Documentation",
    "If requested, can you provide a Company Profile, Buyer CIS, or BCL/POF?",
    { type:"single", options:["Yes","No","Can provide some","Depends"], allowText:true, placeholder:"What can you provide?" }),

  // Engagement & Compliance
  q("loi_icpo_ready","Engagement & Compliance",
    "Once terms align, are you ready to issue an LOI or ICPO to initiate the process?",
    { type:"single", options:["Yes","No","Need internal approval","Depends"], allowText:true, placeholder:"Notes" ,
      labelHints:["It sounds like internal approvals might be part of your process."],
      followups:["What does your approval process look like?","Who besides you needs to sign off?"]
    }),

  q("contract_preference","Engagement & Compliance",
    "Are you looking for long-term supply contracts, or only spot transactions right now?",
    { type:"single", options:["Long-term contract","Spot only","Both"], allowText:true, placeholder:"Notes" }),

  q("mandate","Engagement & Compliance",
    "Do you have a designated mandate/representative we should liaise with, or should we work directly with you?",
    { type:"single", options:["Work directly with me","We have a mandate/rep"], allowText:true, placeholder:"Rep name/contact if applicable" }),

  q("compliance_requirements","Engagement & Compliance",
    "Any specific compliance or regulatory requirements in your country for this product that we should factor in now?",
    { type:"text", placeholder:"Compliance/regulatory requirements (or None)" }),

  // Closing relationship expansion
  q("other_commodities","Relationship Expansion",
    "Before we wrap: besides what we discussed today, what other commodities are you regularly buying or selling so we can watch for additional opportunities?",
    { type:"text", placeholder:"Other commodities of interest" })
];

function q(key, section, prompt, opts){
  return { key, section, prompt, ...opts };
}

/* =============================
   SCORING / RISK HEURISTICS (simple v1)
============================= */
function recomputeScores(){
  // Structural score: % of critical fields answered (not pending)
  let answered = 0;
  for (const k of CRITICAL_FIELDS){
    const a = deal.answers[k];
    if (a && !a.pending && a.value !== "" && a.value != null) answered++;
  }
  const pct = Math.round((answered / CRITICAL_FIELDS.length) * 100);
  deal.structuralScore = clamp(pct, 0, 100);

  // Authenticity risk: pending on banking/instrument/LOI increases risk slightly
  let risk = 0;
  const riskyKeys = ["payment_instruments","bank_name_location","loi_icpo_ready","docs_available"];
  for (const k of riskyKeys){
    const a = deal.answers[k];
    if (a && a.pending) risk += 15;
    if (a && typeof a.value === "string" && a.value.toLowerCase().includes("unsure")) risk += 5;
  }
  // Also if target price missing while other fields filled, slight friction
  const tp = deal.answers["target_price"];
  if (!tp || tp.pending || !tp.value) risk += 5;

  deal.authenticityRisk = clamp(risk, 0, 100);

  setPhaseByProgress();
}

function missingCriticals(){
  const missing = [];
  for (const k of CRITICAL_FIELDS){
    const a = deal.answers[k];
    if (!a || a.pending || a.value === "" || a.value == null) missing.push(k);
  }
  return missing;
}

function keyLabel(k){
  const map = {
    company_name:"Company name",
    country_address:"Country & address",
    contact_person:"Contact person",
    role:"Role (buyer/distributor/trader/agent)",
    product:"Product",
    specs:"Specifications",
    quantity:"Quantity",
    incoterms:"Delivery terms (Incoterms)",
    destination_port:"Destination port",
    timeline:"Delivery timeline",
    payment_instruments:"Payment instrument",
    bank_name_location:"Bank name & location",
    loi_icpo_ready:"LOI/ICPO readiness"
  };
  return map[k] || k;
}

/* =============================
   WIZARD INPUT HANDLING
============================= */
function currentQuestion(){
  return QUESTIONS[deal.currentIdx];
}

function setAnswer(key, value, pending=false){
  deal.answers[key] = {
    value,
    pending,
    updatedAt: Date.now()
  };
  recomputeScores();
}

function togglePending(key){
  const a = deal.answers[key] || { value:"", pending:false };
  a.pending = !a.pending;
  deal.answers[key] = a;
  log(`${keyLabel(key)} marked ${a.pending ? "PENDING" : "ANSWERED"}`);
  recomputeScores();
}

function goNext(){
  if (deal.currentIdx < QUESTIONS.length) deal.currentIdx++;
  if (deal.currentIdx >= QUESTIONS.length) deal.currentIdx = QUESTIONS.length; // end screen
  flash();
  renderCallMode();
}

function goBack(){
  if (deal.currentIdx > 0) deal.currentIdx--;
  flash();
  renderCallMode();
}

function cycleTemperature(){
  const order = ["CALM","GUARDED","DEFENSIVE","RESISTANT"];
  const i = order.indexOf(deal.temperature);
  const next = order[(i + 1) % order.length];
  const prev = deal.temperature;
  deal.temperature = next;
  log(`Temperature: ${prev} → ${deal.temperature}`);
  flash();
  renderCallMode();
}

window.goNext = goNext;
window.goBack = goBack;
window.cycleTemperature = cycleTemperature;
window.togglePending = togglePending;

/* =============================
   RENDER
============================= */
function renderDashboard(){
  const miss = missingCriticals();
  app.innerHTML = `
    <div style="padding:20px;">
      <h2 style="margin:0 0 10px 0;">Dashboard Mode</h2>
      <p style="opacity:0.85;margin:0 0 14px 0;">Wizard + scoring engine (runtime only). No storage yet.</p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <tile label="Phase" value="${deal.phase}"></tile>
        <tile label="Structural" value="${deal.structuralScore}/100"></tile>
        <tile label="Authenticity Risk" value="${deal.authenticityRisk}/100"></tile>
        <tile label="Temperature" value="${deal.temperature}"></tile>
        <tile label="Missing Criticals" value="${miss.length}"></tile>
      </div>

      <div style="margin-top:16px;opacity:0.85;">
        <b>Next:</b> Open <b>Call Mode</b> to run the step-by-step buyer intake wizard.
      </div>
    </div>
  `;
}

function tileHtml(label, value){
  return `
    <div style="background:#132A3A;padding:14px;border-radius:10px;border:1px solid rgba(198,169,74,0.35);min-width:220px;">
      <div style="opacity:0.75;font-size:12px;">${label}</div>
      <div style="font-size:20px;font-weight:700;margin-top:6px;">${value}</div>
    </div>
  `;
}

// Custom element-like helper for template readability
customElements.define("tile", class extends HTMLElement {
  connectedCallback(){
    const label = this.getAttribute("label") || "";
    const value = this.getAttribute("value") || "";
    this.outerHTML = tileHtml(label, value);
  }
});

function renderCallMode(){
  const miss = missingCriticals();
  const end = (deal.currentIdx >= QUESTIONS.length);

  app.innerHTML = `
    <div id="flash" style="position:fixed;inset:0;background:rgba(198,169,74,0.10);opacity:0;pointer-events:none;transition:opacity 160ms ease;"></div>

    <div style="display:flex;gap:14px;padding:14px;align-items:stretch;">
      ${end ? renderEndScreen() : renderWizardCard(currentQuestion())}
      ${renderRightPanel(miss)}
    </div>
  `;
}

function renderWizardCard(Q){
  const a = deal.answers[Q.key] || { value:"", pending:false };
  const pending = a.pending ? "checked" : "";
  const val = a.value ?? "";

  // Build quick chips
  const chips = (Q.options || []).map(opt => {
    const selected = isSelected(Q, val, opt);
    return `
      <button class="chip ${selected ? "chip--on" : ""}" type="button"
        onclick="window.__selectChip('${Q.key}', ${JSON.stringify(opt)})">${opt}</button>
    `;
  }).join("");

  // Input block (based on type)
  let inputHtml = "";

  if (Q.type === "text"){
    inputHtml = `
      <input class="nss-input" id="textInput" value="${escapeHtml(val)}"
        placeholder="${escapeHtml(Q.placeholder || "")}" />
    `;
  } else if (Q.type === "number"){
    const unitOptions = (Q.unitOptions || ["MT"]);
    inputHtml = `
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <input class="nss-input" id="numInput" inputmode="decimal" value="${escapeHtml(String(val || ""))}"
          placeholder="${escapeHtml(Q.placeholder || "Enter number")}" style="max-width:220px;" />
        <select class="nss-select" id="unitSelect">
          ${unitOptions.map(u => `<option value="${u}">${u}</option>`).join("")}
        </select>
      </div>
      <div style="opacity:0.7;font-size:12px;margin-top:8px;">Tip: enter the number, choose unit, then Save.</div>
    `;
  } else if (Q.type === "single" || Q.type === "multi"){
    inputHtml = Q.allowText ? `
      <input class="nss-input" id="textInput" value="" placeholder="${escapeHtml(Q.placeholder || "Optional notes")}" />
    ` : `
      <div style="opacity:0.7;font-size:12px;">Select using chips. (You can also type notes below.)</div>
      <input class="nss-input" id="textInput" value="" placeholder="Optional notes" />
    `;
  }

  const labelHints = (Q.labelHints || []).map(x => `<div class="hint">• ${escapeHtml(x)}</div>`).join("");
  const followups = (Q.followups || []).map(x => `<div class="hint">→ ${escapeHtml(x)}</div>`).join("");

  return `
    <div style="flex:2;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">

      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div style="opacity:0.75;font-size:12px;">Section</div>
          <div style="font-weight:800;font-size:16px;margin-top:2px;">${escapeHtml(Q.section)}</div>
        </div>
        <div class="pill">
          <span class="dot ${tempDotClass(deal.temperature)}"></span>
          Phase: <b>${deal.phase}</b>
        </div>
      </div>

      <div style="margin-top:14px;background:rgba(11,28,45,0.55);border:1px solid rgba(255,255,255,0.08);padding:14px;border-radius:10px;">
        <div style="font-size:12px;opacity:0.75;margin-bottom:6px;">Question ${deal.currentIdx + 1} of ${QUESTIONS.length}</div>
        <div style="font-size:16px;line-height:1.35;">${escapeHtml(Q.prompt)}</div>
      </div>

      ${chips ? `<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">${chips}</div>` : ""}

      <div style="margin-top:12px;">
        ${inputHtml}
      </div>

      <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:8px;opacity:0.85;">
          <input type="checkbox" ${pending} onchange="togglePending('${Q.key}')" />
          Mark Pending
        </label>

        <button class="btn2" type="button" onclick="window.__saveAnswer('${Q.key}')">Save</button>
        <button class="btn2" type="button" onclick="cycleTemperature()">Cycle Temp</button>
      </div>

      ${(labelHints || followups) ? `
        <div style="margin-top:14px;">
          <div style="opacity:0.75;font-size:12px;margin-bottom:6px;">Voss Assist (if resistance appears)</div>
          <div class="assistBox">
            ${labelHints || ""}
            ${followups ? `<div style="height:8px;"></div>${followups}` : ""}
          </div>
        </div>
      ` : ""}

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;">
        <button class="btn2" type="button" onclick="goBack()" ${deal.currentIdx===0 ? "disabled" : ""}>Back</button>
        <button class="btn2 btn2--gold" type="button" onclick="goNext()">Next</button>
      </div>

    </div>
  `;
}

function renderRightPanel(miss){
  const closePct = clamp(Math.round((deal.structuralScore - deal.authenticityRisk) * 0.9), 0, 100);
  return `
    <div style="flex:1;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">

      <h3 style="margin:0 0 8px 0;">Situational Awareness</h3>

      ${bar("Structural Integrity", deal.structuralScore, "#2AA198")}
      ${bar("Authenticity Risk", deal.authenticityRisk, "#D9534F")}

      <div style="margin-top:10px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(11,28,45,0.55);">
        <div style="font-size:12px;opacity:0.75;">Temperature</div>
        <div style="font-size:18px;font-weight:800;margin-top:4px;">${deal.temperature}</div>
      </div>

      <div style="margin-top:10px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(11,28,45,0.55);">
        <div style="font-size:12px;opacity:0.75;">Close Probability (v1 heuristic)</div>
        <div style="font-size:18px;font-weight:800;margin-top:4px;">${closePct}%</div>
      </div>

      <div style="margin-top:12px;">
        <div style="font-size:12px;opacity:0.75;margin-bottom:6px;">Missing Criticals</div>
        <div class="assistBox">
          ${miss.length ? miss.map(k => `<div class="hint">• ${escapeHtml(keyLabel(k))}</div>`).join("") : `<div class="hint">✅ Critical minimums captured.</div>`}
        </div>
      </div>

      <div style="margin-top:12px;">
        <div style="font-size:12px;opacity:0.75;margin-bottom:6px;">Activity Log</div>
        <div class="monoBox">
          ${deal.log.map(x => `<div style="margin-bottom:6px;">${escapeHtml(x)}</div>`).join("")}
        </div>
      </div>

    </div>
  `;
}

function renderEndScreen(){
  const summary = buildSummary();
  return `
    <div style="flex:2;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">
      <h3 style="margin:0 0 10px 0;">Deal Summary (Generated)</h3>

      <div class="assistBox" style="white-space:pre-wrap;">${escapeHtml(summary)}</div>

      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;">
        <button class="btn2" type="button" onclick="deal.currentIdx=${QUESTIONS.length-1}; renderCallMode();">Back</button>
        <button class="btn2 btn2--gold" type="button" onclick="window.__copySummary()">Copy Summary</button>
      </div>
    </div>
  `;
}

function buildSummary(){
  const get = (k) => {
    const a = deal.answers[k];
    if (!a) return "";
    if (a.pending) return "[PENDING]";
    if (Array.isArray(a.value)) return a.value.join(", ");
    return String(a.value || "");
  };

  const lines = [];
  lines.push("NAUTILUS SALES SYSTEM – VERSION 1");
  lines.push("Buyer Intake Summary");
  lines.push("");
  lines.push(`Phase: ${deal.phase}`);
  lines.push(`Structural: ${deal.structuralScore}/100`);
  lines.push(`Authenticity Risk: ${deal.authenticityRisk}/100`);
  lines.push(`Temperature: ${deal.temperature}`);
  lines.push("");
  lines.push("Company Info");
  lines.push(`- Company: ${get("company_name")}`);
  lines.push(`- Country/Address: ${get("country_address")}`);
  lines.push(`- Website: ${get("company_website")}`);
  lines.push(`- Established: ${get("year_established")}`);
  lines.push(`- Entity: ${get("entity_type")}`);
  lines.push(`- Contact: ${get("contact_person")}`);
  lines.push("");
  lines.push("Profile");
  lines.push(`- Core activity: ${get("core_activity")}`);
  lines.push(`- Role: ${get("role")}`);
  lines.push(`- Licenses: ${get("licenses")}`);
  lines.push("");
  lines.push("Product");
  lines.push(`- Product(s): ${get("product")}`);
  lines.push(`- Specs: ${get("specs")}`);
  lines.push(`- Quantity: ${get("quantity")}`);
  lines.push(`- Packaging: ${get("packaging")}`);
  lines.push("");
  lines.push("Logistics");
  lines.push(`- Terms: ${get("incoterms")}`);
  lines.push(`- Destination port(s): ${get("destination_port")}`);
  lines.push(`- Timeline: ${get("timeline")}`);
  lines.push("");
  lines.push("Financial");
  lines.push(`- Target price (USD/MT): ${get("target_price")}`);
  lines.push(`- Payment instruments: ${get("payment_instruments")}`);
  lines.push(`- Open to guarantees/escrow: ${get("guarantees")}`);
  lines.push("");
  lines.push("Finance/Docs");
  lines.push(`- Trade finance assistance: ${get("finance_assistance")}`);
  lines.push(`- Banking partner: ${get("bank_name_location")}`);
  lines.push(`- Docs available (CIS/BCL/POF): ${get("docs_available")}`);
  lines.push("");
  lines.push("Engagement");
  lines.push(`- LOI/ICPO ready: ${get("loi_icpo_ready")}`);
  lines.push(`- Contract vs spot: ${get("contract_preference")}`);
  lines.push(`- Mandate/rep: ${get("mandate")}`);
  lines.push(`- Compliance requirements: ${get("compliance_requirements")}`);
  lines.push("");
  lines.push("Relationship Expansion");
  lines.push(`- Other commodities: ${get("other_commodities")}`);
  lines.push("");
  lines.push("Next Steps (Suggested)");
  lines.push("- If terms align, request LOI/ICPO on letterhead.");
  lines.push("- Confirm payment instrument type + issuing bank capability.");
  lines.push("- Confirm destination port + incoterms + delivery timeline.");
  lines.push("- If required, request CIS/BCL/POF and company profile.");
  return lines.join("\n");
}

/* =============================
   CHIP / SAVE handlers
============================= */
window.__selectChip = (key, opt) => {
  const Q = QUESTIONS.find(x => x.key === key);
  const a = deal.answers[key] || { value: Q?.type === "multi" ? [] : "" , pending:false };

  if (Q.type === "multi"){
    const arr = Array.isArray(a.value) ? a.value : [];
    const idx = arr.indexOf(opt);
    if (idx >= 0) arr.splice(idx,1);
    else arr.push(opt);
    a.value = arr;
  } else {
    a.value = opt;
  }

  a.pending = false;
  deal.answers[key] = a;

  log(`${keyLabel(key)} selected`);
  recomputeScores();
  flash();
  renderCallMode();
};

window.__saveAnswer = (key) => {
  const Q = QUESTIONS.find(x => x.key === key);
  const existing = deal.answers[key] || { value:"", pending:false };

  if (Q.type === "text"){
    const input = document.getElementById("textInput");
    const v = input ? input.value.trim() : "";
    existing.value = v;
    existing.pending = false;
    deal.answers[key] = existing;
    log(`${keyLabel(key)} saved`);
  }

  if (Q.type === "number"){
    const numInput = document.getElementById("numInput");
    const unitSelect = document.getElementById("unitSelect");
    const n = numInput ? numInput.value.trim() : "";
    const unit = unitSelect ? unitSelect.value : "";
    const v = n ? `${n} ${unit}` : "";
    existing.value = v;
    existing.pending = false;
    deal.answers[key] = existing;
    log(`${keyLabel(key)} saved`);
  }

  if (Q.type === "single" || Q.type === "multi"){
    const input = document.getElementById("textInput");
    const note = input ? input.value.trim() : "";
    // store notes by appending if they typed something
    if (note){
      if (Array.isArray(existing.value)){
        // keep value array, add note to log only (v1 simplicity)
        log(`${keyLabel(key)} note: ${note}`);
      } else {
        // if existing is empty and they typed, use typed
        if (!existing.value) existing.value = note;
        else log(`${keyLabel(key)} note: ${note}`);
      }
    }
    existing.pending = false;
    deal.answers[key] = existing;
  }

  recomputeScores();
  flash();
  renderCallMode();
};

window.__copySummary = async () => {
  const text = buildSummary();
  try{
    await navigator.clipboard.writeText(text);
    log("Summary copied to clipboard");
  }catch(e){
    log("Copy failed (browser blocked). You can manually select and copy.");
  }
  renderCallMode();
};

/* =============================
   UI helpers
============================= */
function bar(label, value, color){
  return `
    <div style="margin:10px 0;">
      <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;opacity:0.85;">
        <span>${escapeHtml(label)}</span><span><b>${value}</b>/100</span>
      </div>
      <div style="height:10px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;margin-top:6px;">
        <div style="height:100%;width:${value}%;background:${color};"></div>
      </div>
    </div>
  `;
}

function tempDotClass(t){
  if (t === "CALM") return "dot--teal";
  if (t === "GUARDED") return "dot--amber";
  if (t === "DEFENSIVE") return "dot--amber";
  return "dot--red";
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function isSelected(Q, val, opt){
  if (Q.type === "multi") return Array.isArray(val) && val.includes(opt);
  return String(val) === String(opt);
}

/* =============================
   NAVIGATION
============================= */
dashboardBtn.addEventListener("click", () => { renderDashboard(); });
callBtn.addEventListener("click", () => { renderCallMode(); });

recomputeScores();
renderDashboard();
