const app = document.getElementById("app");
const dashboardBtn = document.getElementById("dashboardBtn");
const callBtn = document.getElementById("callBtn");

function renderDashboard() {
  app.innerHTML = `
    <h2>Dashboard Mode</h2>
    <p>Pipeline, prioritization, and counterparty intelligence will live here.</p>
  `;
}

function renderCallMode() {
  app.innerHTML = `
    <div style="display:flex;gap:20px;">
      <div style="flex:2;background:#132A3A;padding:20px;">
        <h3>Conversation Engine</h3>
        <p>Voss-style buyer questions will appear here.</p>
      </div>
      <div style="flex:1;background:#132A3A;padding:20px;">
        <h3>Situational Awareness</h3>
        <p>Structural score, authenticity, temperature, flags.</p>
      </div>
    </div>
  `;
}

dashboardBtn.onclick = renderDashboard;
callBtn.onclick = renderCallMode;

renderDashboard();
