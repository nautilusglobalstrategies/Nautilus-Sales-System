console.log("NSS v1 Engine Initialized ✅");

const app = document.getElementById("app");
const dashboardBtn = document.getElementById("dashboardBtn");
const callBtn = document.getElementById("callBtn");

/* =============================
   DEAL STATE (Runtime Only)
============================= */
let deal = {
  phase: "QUALIFY",            // QUALIFY → ALIGN → LEVERAGE
  structuralScore: 0,          // 0–100
  authenticityRisk: 0,         // 0–100
  temperature: "CALM",         // CALM | GUARDED | DEFENSIVE | RESISTANT
  log: ["System ready."]
};

/* =============================
   HELPERS
============================= */
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function log(msg){
  const stamp = new Date().toLocaleTimeString();
  deal.log.unshift(`[${stamp}] ${msg}`);
  deal.log = deal.log.slice(0, 12);
}

function flash(){
  const el = document.getElementById("flash");
  if (!el) return;
  el.style.opacity = "1";
  setTimeout(() => el.style.opacity = "0", 180);
}

/* =============================
   ENGINES
============================= */
function nextPhase() {
  const prev = deal.phase;
  if (deal.phase === "QUALIFY") deal.phase = "ALIGN";
  else if (deal.phase === "ALIGN") deal.phase = "LEVERAGE";
  else deal.phase = "LEVERAGE";

  log(`Phase changed: ${prev} → ${deal.phase}`);
  flash();
  renderCallMode();
}

function increaseStructure(points = 10) {
  const prev = deal.structuralScore;
  deal.structuralScore = clamp(deal.structuralScore + points, 0, 100);
  log(`Structural score: ${prev} → ${deal.structuralScore}`);
  flash();
  renderCallMode();
}

function increaseRisk(points = 10) {
  const prev = deal.authenticityRisk;
  deal.authenticityRisk = clamp(deal.authenticityRisk + points, 0, 100);
  log(`Authenticity risk: ${prev} → ${deal.authenticityRisk}`);
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

/* Make functions available to inline onclick */
window.nextPhase = nextPhase;
window.increaseStructure = increaseStructure;
window.increaseRisk = increaseRisk;
window.cycleTemperature = cycleTemperature;

/* =============================
   VIEWS
============================= */
function renderDashboard() {
  app.innerHTML = `
    <div style="padding:20px;">
      <h2 style="margin:0 0 10px 0;">Dashboard Mode</h2>
      <p style="opacity:0.85;margin:0 0 14px 0;">Runtime engine only (no storage yet).</p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <div style="background:#132A3A;padding:14px;border-radius:10px;border:1px solid rgba(198,169,74,0.35);min-width:220px;">
          <div style="opacity:0.75;font-size:12px;">Current Phase</div>
          <div style="font-size:20px;font-weight:700;margin-top:6px;">${deal.phase}</div>
        </div>
        <div style="background:#132A3A;padding:14px;border-radius:10px;border:1px solid rgba(198,169,74,0.35);min-width:220px;">
          <div style="opacity:0.75;font-size:12px;">Structural</div>
          <div style="font-size:20px;font-weight:700;margin-top:6px;">${deal.structuralScore}/100</div>
        </div>
        <div style="background:#132A3A;padding:14px;border-radius:10px;border:1px solid rgba(198,169,74,0.35);min-width:220px;">
          <div style="opacity:0.75;font-size:12px;">Authenticity Risk</div>
          <div style="font-size:20px;font-weight:700;margin-top:6px;">${deal.authenticityRisk}/100</div>
        </div>
        <div style="background:#132A3A;padding:14px;border-radius:10px;border:1px solid rgba(198,169,74,0.35);min-width:220px;">
          <div style="opacity:0.75;font-size:12px;">Temperature</div>
          <div style="font-size:20px;font-weight:700;margin-top:6px;">${deal.temperature}</div>
        </div>
      </div>
    </div>
  `;
}

function bar(label, value, color){
  return `
    <div style="margin:10px 0;">
      <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;opacity:0.85;">
        <span>${label}</span><span><b>${value}</b>/100</span>
      </div>
      <div style="height:10px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;margin-top:6px;">
        <div style="height:100%;width:${value}%;background:${color};"></div>
      </div>
    </div>
  `;
}

function renderCallMode() {
  app.innerHTML = `
    <div id="flash" style="position:fixed;inset:0;background:rgba(198,169,74,0.10);opacity:0;pointer-events:none;transition:opacity 180ms ease;"></div>

    <div style="display:flex;gap:14px;padding:14px;align-items:stretch;">

      <div style="flex:2;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">
        <h3 style="margin:0 0 8px 0;">Conversation Engine</h3>
        <div style="opacity:0.85;margin:0 0 8px 0;">Phase: <b>${deal.phase}</b></div>

        <div style="background:rgba(11,28,45,0.55);border:1px solid rgba(255,255,255,0.08);padding:14px;border-radius:10px;">
          <div style="font-size:12px;opacity:0.75;margin-bottom:6px;">Primary Calibrated Question (demo)</div>
          <div style="font-size:16px;line-height:1.35;">
            “Before we go too far, would it be unreasonable to clarify a few structural points so we don’t waste your time?”
          </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
          <button onclick="increaseStructure(15)">+ Structure</button>
          <button onclick="increaseRisk(15)">+ Risk</button>
          <button onclick="cycleTemperature()">Cycle Temp</button>
          <button onclick="nextPhase()">Next Phase</button>
        </div>

        <div style="margin-top:14px;opacity:0.75;font-size:12px;">
          Tip: press buttons — you’ll see the right panel meters change and an activity log update.
        </div>
      </div>

      <div style="flex:1;background:#132A3A;border:1px solid rgba(198,169,74,0.45);padding:16px;border-radius:10px;">
        <h3 style="margin:0 0 8px 0;">Situational Awareness</h3>

        ${bar("Structural Integrity", deal.structuralScore, "#2AA198")}
        ${bar("Authenticity Risk", deal.authenticityRisk, "#D9534F")}

        <div style="margin-top:10px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(11,28,45,0.55);">
          <div style="font-size:12px;opacity:0.75;">Temperature</div>
          <div style="font-size:18px;font-weight:700;margin-top:4px;">${deal.temperature}</div>
        </div>

        <div style="margin-top:12px;">
          <div style="font-size:12px;opacity:0.75;margin-bottom:6px;">Activity Log</div>
          <div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
                      font-size:12px;line-height:1.35;max-height:220px;overflow:auto;
                      border:1px solid rgba(255,255,255,0.08);background:rgba(11,28,45,0.55);padding:10px;border-radius:10px;">
            ${deal.log.map(x => `<div style="margin-bottom:6px;">${x}</div>`).join("")}
          </div>
        </div>
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
