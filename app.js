console.log("NSS v1 Engine Initialized");

const app = document.getElementById("app");
const dashboardBtn = document.getElementById("dashboardBtn");
const callBtn = document.getElementById("callBtn");

/* =============================
   DEAL STATE (Runtime Only)
============================= */

let deal = {
  phase: "QUALIFY",   // QUALIFY → ALIGN → LEVERAGE
  structuralScore: 0,
  authenticityRisk: 0,
  temperature: "CALM",  // CALM | GUARDED | DEFENSIVE | RESISTANT
  flags: []
};

/* =============================
   PHASE ENGINE
============================= */

function nextPhase() {
  if (deal.phase === "QUALIFY") deal.phase = "ALIGN";
  else if (deal.phase === "ALIGN") deal.phase = "LEVERAGE";
  renderCallMode();
}

/* =============================
   SCORING LOGIC
============================= */

function increaseStructure(points = 10) {
  deal.structuralScore += points;
  if (deal.structuralScore > 100) deal.structuralScore = 100;
}

function increaseRisk(points = 10) {
  deal.authenticityRisk += points;
  if (deal.authenticityRisk > 100) deal.authenticityRisk = 100;
}

function setTemperature(level) {
  deal.temperature = level;
}

/* =============================
   DASHBOARD
============================= */

function renderDashboard() {
  app.innerHTML = `
    <div style="padding:20px;">
      <h2>Dashboard Mode</h2>
      <p>Engine loaded. No persistence yet.</p>
      <p>Current Phase: <strong>${deal.phase}</strong></p>
    </div>
  `;
}

/* =============================
   CALL MODE (Split Screen)
============================= */

function renderCallMode() {
  app.innerHTML = `
    <div style="display:flex;gap:14px;padding:14px;">

      <div style="flex:2;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">
        <h3>Conversation Engine</h3>
        <p>Phase: <strong>${deal.phase}</strong></p>
        <p>“Before we go too far, would it be unreasonable to clarify a few structural points?”</p>

        <div style="margin-top:15px;">
          <button onclick="increaseStructure(15);renderCallMode();">+ Structure</button>
          <button onclick="increaseRisk(15);renderCallMode();">+ Risk</button>
          <button onclick="setTemperature('DEFENSIVE');renderCallMode();">Raise Temp</button>
          <button onclick="nextPhase()">Next Phase</button>
        </div>
      </div>

      <div style="flex:1;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">
        <h3>Situational Awareness</h3>

        <p><strong>Structural Score:</strong> ${deal.structuralScore}</p>
        <p><strong>Authenticity Risk:</strong> ${deal.authenticityRisk}</p>
        <p><strong>Temperature:</strong> ${deal.temperature}</p>

      </div>

    </div>
  `;
}

/* =============================
   NAVIGATION
============================= */

dashboardBtn.addEventListener("click", renderDashboard);
callBtn.addEventListener("click", renderCallMode);

renderDashboard();
