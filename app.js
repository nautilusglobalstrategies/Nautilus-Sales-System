console.log("NSS v3 — Stable Working Build ✅");

const app = document.getElementById("app");
const dashboardBtn = document.getElementById("dashboardBtn");
const callBtn = document.getElementById("callBtn");

let state = {
  idx: 0,
  temperature: "CALM",
  answers: {},
  log: ["System ready."]
};

/* ========================
   QUESTION SET
======================== */

const QUESTIONS = [

  { key:"opening_time_check", section:"Opening",
    prompt:"Do you have a quick moment?",
    type:"single",
    options:["Yes — continue","No — schedule"] },

  { key:"authority", section:"Authority",
    prompt:"How does approval normally work on your side when a deal is ready to execute?",
    type:"single",
    options:["I have final signing authority","I influence but need approval","I represent a principal buyer"] },

  { key:"role", section:"Profile",
    prompt:"Where do you sit in the chain for this transaction?",
    type:"single",
    options:["End Buyer","Distributor","Trader","Agent"] },

  { key:"company_name", section:"Company",
    prompt:"What exact company name should appear on the offer so it matches your registration precisely?",
    type:"text", placeholder:"Registered company name" },

  { key:"country_address", section:"Company",
    prompt:"Which country is the buyer entity registered in, and what business address ties to this transaction?",
    type:"text", placeholder:"Country + address" },

  { key:"contact_person", section:"Company",
    prompt:"Who should be the primary operational contact once documentation moves?",
    type:"text", placeholder:"Name, title, phone, email" },

  { key:"product", section:"Product",
    prompt:"What exact product configuration are you looking to secure?",
    type:"text", placeholder:"Product name" },

  { key:"specs", section:"Product",
    prompt:"What specifications are non-negotiable for your internal approval?",
    type:"text", placeholder:"Grade / certifications" },

  { key:"quantity", section:"Product",
    prompt:"What volume are you positioned to move on this transaction?",
    type:"number", unitOptions:["MT","40ft containers","20ft containers"], placeholder:"Quantity" },

  { key:"delivery_terms", section:"Logistics",
    prompt:"Which delivery structure aligns best with your internal process?",
    type:"single",
    options:["FOB","CIF","CFR","EXW","DDP","Other"] },

  { key:"destination_port", section:"Logistics",
    prompt:"Which destination port should pricing be structured against?",
    type:"text", placeholder:"Destination port" },

  { key:"timeline", section:"Logistics",
    prompt:"What timeline are you operating under for delivery?",
    type:"single",
    options:["Immediate","Within 30 days","Within 60 days","Within 90 days","Long-term contract"] },

  { key:"target_price", section:"Financial",
    prompt:"What price range per MT keeps this commercially viable on your side?",
    type:"text", placeholder:"USD per MT" },

  { key:"primary_instrument", section:"Financial",
    prompt:"What payment instrument will you deploy for this transaction?",
    type:"single",
    options:["LC","DLC","SBLC","TT","Escrow","Other"] },

  { key:"issuing_bank", section:"Financial",
    prompt:"Which bank would be issuing the instrument so this is structured correctly from day one?",
    type:"text", placeholder:"Bank name + country" },

  { key:"loi_ready", section:"Engagement",
    prompt:"Once terms align, what would prevent this from moving directly to LOI or ICPO?",
    type:"single",
    options:["Nothing — ready","Needs internal review","Not ready"] },

  { key:"other_commodities", section:"Relationship",
    prompt:"Beyond this product, what other commodities are part of your regular trade cycle?",
    type:"text", placeholder:"Other commodities" }
];

/* ========================
   OPENING SCRIPT
======================== */

function openingScriptBlock() {
  return `
    <div style="margin-top:12px;padding:12px;background:#132A3A;border-radius:10px;">
      <div style="font-size:13px;margin-bottom:6px;"><b>Opening Script</b></div>
      <div style="white-space:pre-wrap;font-size:13px;line-height:1.4;">
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry and I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team has reviewed your inquiry and we can fulfill this through our verified supplier network.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
      </div>
    </div>
  `;
}

/* ========================
   RENDER
======================== */

function renderDashboard() {
  state.idx = 0;
  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Dashboard</h2>
      <button onclick="renderCallMode()">Open Call Mode</button>
    </div>
  `;
}

function renderCallMode() {
  const q = QUESTIONS[state.idx];
  const answer = state.answers[q.key]?.value || "";

  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Call Mode</h2>
      ${openingScriptBlock()}

      <div style="margin-top:16px;padding:12px;background:#132A3A;border-radius:10px;">
        <div style="font-size:12px;opacity:0.8;">${q.section}</div>
        <div style="margin-top:8px;font-size:16px;"><b>${q.prompt}</b></div>

        <div style="margin-top:12px;">
          ${renderInput(q,answer)}
        </div>

        <div style="margin-top:12px;">
          <button onclick="back()" ${state.idx===0?"disabled":""}>Back</button>
          <button onclick="next()">Next</button>
        </div>
      </div>
    </div>
  `;
}

function renderInput(q,val) {
  if (q.type === "text") {
    return `<input id="field" style="width:100%;padding:8px;" placeholder="${q.placeholder||""}" value="${val}" />`;
  }
  if (q.type === "number") {
    return `
      <input id="field" style="width:60%;padding:8px;" placeholder="${q.placeholder||""}" />
      <select id="unit">
        ${q.unitOptions.map(u=>`<option>${u}</option>`).join("")}
      </select>
    `;
  }
  if (q.type === "single") {
    return q.options.map(opt =>
      `<button onclick="pick('${q.key}','${opt}')">${opt}</button>`
    ).join(" ");
  }
}

/* ========================
   NAVIGATION
======================== */

function next() {
  const q = QUESTIONS[state.idx];
  if (q.type === "text" || q.type === "number") {
    const value = document.getElementById("field")?.value || "";
    state.answers[q.key] = { value };
  }
  if (state.idx < QUESTIONS.length - 1) state.idx++;
  renderCallMode();
}

function back() {
  if (state.idx > 0) state.idx--;
  renderCallMode();
}

function pick(key,value) {
  state.answers[key] = { value };
  if (key==="opening_time_check" && value==="No — schedule") return;
  next();
}

/* ========================
   TOP NAV BUTTONS
======================== */

dashboardBtn.addEventListener("click", renderDashboard);
callBtn.addEventListener("click", renderCallMode);

/* ========================
   INIT
======================== */

renderDashboard();
