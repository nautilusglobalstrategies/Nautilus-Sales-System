console.log("NSS CLEAN REBUILD LOADED");

let state = {
  idx: 0
};

const QUESTIONS = [
  "Company Name",
  "Country & Address",
  "Contact Person",
  "Role",
  "Product",
  "Specs",
  "Quantity",
  "Destination Port",
  "Target Price",
  "Primary Instrument",
  "Secondary Instrument",
  "Issuing Bank",
  "LOI Ready"
];

function renderDashboard() {
  document.getElementById("app").innerHTML = `
    <h2>Dashboard</h2>
    <p>Total Questions: ${QUESTIONS.length}</p>
  `;
}

function renderCallMode() {
  document.getElementById("app").innerHTML = `
    <h2>Call Mode</h2>
    <p>Question ${state.idx + 1} of ${QUESTIONS.length}</p>
    <p>${QUESTIONS[state.idx]}</p>
    <button onclick="next()">Next</button>
  `;
}

function next() {
  if (state.idx < QUESTIONS.length - 1) {
    state.idx++;
    renderCallMode();
  }
}

renderDashboard();
