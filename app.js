console.log("NSS v2 — Full Voss Calibration Active ✅");

let state = {
  mode: "dashboard",
  idx: 0,
  temperature: "CALM",
  path: null,
  answers: {},
  flow: [],
  risk: 0,
  momentum: 40,
  showIntel: false,
  log: ["System ready."]
};

/* =========================
   QUESTION DEFINITIONS
========================= */

const QUESTIONS = {

  opening_time_check: q({
    section: "Opening",
    type: "single",
    options: ["Yes — continue", "No — schedule"]
  }),

  authority: q({
    section: "Authority",
    type: "single",
    options: [
      "I have final signing authority",
      "I influence but require approval",
      "I represent a principal buyer"
    ]
  }),

  role: q({
    section: "Profile",
    type: "single",
    options: ["End Buyer","Distributor","Trader","Agent"]
  }),

  company_name: q({ section:"Company", type:"text", placeholder:"Registered company name" }),
  country_address: q({ section:"Company", type:"text", placeholder:"Country + address" }),
  contact_person: q({ section:"Company", type:"text", placeholder:"Name, title, phone, email" }),

  product: q({ section:"Product", type:"text", placeholder:"Product name" }),
  specs: q({ section:"Product", type:"text", placeholder:"Specs / standards" }),
  quantity: q({ section:"Product", type:"text", placeholder:"Quantity (MT or containers)" }),

  incoterms: q({
    section:"Logistics",
    type:"single",
    options:["FOB","CIF","CFR","EXW","Other"]
  }),

  destination_port: q({ section:"Logistics", type:"text", placeholder:"Destination port" }),
  timeline: q({ section:"Logistics", type:"text", placeholder:"Delivery timeline" }),

  target_price: q({ section:"Financial", type:"text", placeholder:"Target USD/MT" }),
  primary_instrument: q({
    section:"Financial",
    type:"single",
    options:["LC","DLC","SBLC","TT","Escrow","Other"]
  }),
  issuing_bank: q({ section:"Financial", type:"text", placeholder:"Bank name + country" }),

  loi_ready: q({
    section:"Engagement",
    type:"single",
    options:["Ready to issue LOI","Needs internal review","Not ready"]
  }),

  other_commodities: q({
    section:"Relationship",
    type:"text",
    placeholder:"Other commodities"
  }),

  closing: q({
    section:"Closing",
    type:"single",
    options:["Finish"]
  })
};

/* =========================
   FLOW
========================= */

function buildFlow() {
  state.flow = [
    "opening_time_check",
    "authority",
    "role",
    "company_name",
    "country_address",
    "contact_person",
    "product",
    "specs",
    "quantity",
    "incoterms",
    "destination_port",
    "timeline",
    "target_price",
    "primary_instrument",
    "issuing_bank",
    "loi_ready",
    "other_commodities",
    "closing"
  ];
}

/* =========================
   TRUE VOSS CALIBRATED PROMPTS
========================= */

function vossPrompt(key) {

  if (key === "opening_time_check")
    return "Do you have a quick moment?";

  if (key === "closing")
    return "Select the closing that best fits the tone of the conversation.";

  const MAP = {

    authority:
      "How does approval normally work on your side when a contract is ready to execute?",

    role:
      "Where do you sit in this transaction — are you buying directly, distributing, trading, or representing someone else?",

    company_name:
      "What exact name should appear on the contract so it matches your registration precisely?",

    country_address:
      "In which jurisdiction is the buyer entity registered, and what address ties to this deal?",

    contact_person:
      "Who should be included operationally so nothing slows down once documents move?",

    product:
      "What exact product configuration are you looking to secure?",

    specs:
      "What specifications are non-negotiable for internal approval?",

    quantity:
      "What volume are you positioned to move on this transaction?",

    incoterms:
      "Which delivery structure aligns best with your internal risk tolerance?",

    destination_port:
      "Which destination port should pricing be structured against?",

    timeline:
      "What timeline are you operating under for delivery?",

    target_price:
      "What price range per metric ton keeps this commercially viable on your side?",

    primary_instrument:
      "What payment instrument will you deploy for this transaction?",

    issuing_bank:
      "Which bank would be issuing the instrument so we structure this correctly from day one?",

    loi_ready:
      "Once terms align, what would prevent this from moving directly to LOI or ICPO?",

    other_commodities:
      "Beyond this product, what other commodities are part of your regular trade cycle?"
  };

  return MAP[key] || "How would you like this structured on your side?";
}

/* =========================
   OPENING SCRIPT (always visible)
========================= */

function openingScriptBlock() {
  return `
    <div style="margin-top:12px;padding:12px;background:#132A3A;border-radius:10px;">
      <div style="font-size:13px;margin-bottom:6px;"><b>Opening Script</b></div>
      <div style="white-space:pre-wrap;font-size:13px;line-height:1.4;">
Hi [Name], this is [Your Name] calling from the Commodity Resource Center.
You recently submitted an inquiry and I’m calling to review your request and move this forward.

Do you have a quick moment?

Perfect. Our procurement team has reviewed your inquiry and we can fulfill this through our verified network of suppliers.

To prepare your Soft Corporate Offer accurately, I just need to confirm a few details on your side. This usually only takes a few minutes.
      </div>
    </div>
  `;
}

/* =========================
   RENDER
========================= */

function renderDashboard() {
  state.mode = "dashboard";
  buildFlow();
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Dashboard</h2>
      <button onclick="renderCallMode()">Open Call Mode</button>
      <button onclick="resetDeal()">Start New Deal</button>
    </div>
  `;
}

function renderCallMode() {
  state.mode = "call";
  buildFlow();

  const key = state.flow[state.idx];
  const Q = QUESTIONS[key];
  const A = state.answers[key] || { value:"" };
  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Call Mode</h2>
      ${openingScriptBlock()}

      <div style="margin-top:16px;padding:12px;background:#132A3A;border-radius:10px;">
        <div style="font-size:12px;opacity:0.8;">${Q.section}</div>
        <div style="margin-top:8px;font-size:16px;"><b>${vossPrompt(key)}</b></div>

        <div style="margin-top:12px;">
          ${renderInput(key,Q,A)}
        </div>

        <div style="margin-top:12px;">
          <button onclick="back()" ${state.idx===0?"disabled":""}>Back</button>
          <button onclick="next()">Next</button>
        </div>
      </div>
    </div>
  `;
}

function renderInput(key,Q,A) {
  if (Q.type === "text") {
    return `<input id="field" style="width:100%;padding:8px;" placeholder="${Q.placeholder||""}" value="${A.value||""}" />`;
  }
  if (Q.type === "single") {
    return Q.options.map(opt =>
      `<button onclick="pick('${key}','${opt}')">${opt}</button>`
    ).join(" ");
  }
  return "";
}

/* =========================
   NAV
========================= */

function next() {
  if (state.idx < state.flow.length-1) state.idx++;
  renderCallMode();
}

function back() {
  if (state.idx>0) state.idx--;
  renderCallMode();
}

function pick(key,value) {
  state.answers[key] = { value };
  if (key==="opening_time_check" && value==="No — schedule") return;
  next();
}

function resetDeal() {
  state.idx = 0;
  state.answers = {};
  renderDashboard();
}

/* =========================
   INIT
========================= */

buildFlow();
renderDashboard();
window.renderCallMode = renderCallMode;
window.renderDashboard = renderDashboard;
window.next = next;
window.back = back;
window.pick = pick;
window.resetDeal = resetDeal;
