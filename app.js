console.log("Agent Behavior Sandbox loading...");

// --------- Scenarios ---------

const SCENARIOS = {
  oncall: {
    task:
      "Prioritize incidents in the on-call queue for the next 2 hours and decide what to work on first.",
    rules: [
      "Must protect production traffic before anything else.",
      "Never ignore a P1 incident.",
      "Avoid starting new feature work while there is an active P1.",
      "Prefer resolving high-severity issues before low-severity ones."
    ].join("\n"),
    context: [
      "P1 incident impacting 20% of production traffic.",
      "New feature launch scheduled for tomorrow.",
      "Error budget nearly exhausted for Service A."
    ].join("\n")
  },
  feature: {
    task:
      "Plan rollout for the new recommendation model while preserving reliability and user trust.",
    rules: [
      "Must not exceed agreed error budget for any core API.",
      "Never roll out to 100% traffic without a staged plan.",
      "Must provide a rollback path for every experiment.",
      "Avoid releasing changes during peak traffic windows."
    ].join("\n"),
    context: [
      "Model improves click-through rate in A/B tests.",
      "Baseline latency is already close to SLO for some regions.",
      "Several downstream teams consume the new signal."
    ].join("\n")
  }
};

// --------- DOM references ---------

const scenarioSelect = document.getElementById("scenario-select");
const loadScenarioBtn = document.getElementById("load-scenario-btn");
const runAgentBtn = document.getElementById("run-agent");

const taskInput = document.getElementById("task-input");
const rulesInput = document.getElementById("rules-input");
const contextInput = document.getElementById("context-input");
const driftCheckbox = document.getElementById("simulate-drift");
const parseStatus = document.getElementById("parse-status");

// Right side
const summaryBadge = document.getElementById("summary-badge");
const summaryBadgeLabel = document.getElementById("summary-badge-label");
const interpretedTaskEl = document.getElementById("interpreted-task");
const rulesAppliedEl = document.getElementById("rules-applied");
const contextSignalsEl = document.getElementById("context-signals");
const decisionEl = document.getElementById("decision");
const traceEl = document.getElementById("raw-trace");

// --------- Helpers ---------

function linesFromTextarea(value) {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function setBadgeIdle() {
  summaryBadge.className = "summary-badge summary-badge-idle";
  summaryBadgeLabel.textContent = "Agent has not been run yet.";
}

function setBadgeStable() {
  summaryBadge.className = "summary-badge summary-badge-ok";
  summaryBadgeLabel.textContent = "Stability-first behavior.";
}

function setBadgeDrifted() {
  summaryBadge.className = "summary-badge summary-badge-drifted";
  summaryBadgeLabel.textContent = "Drifted behavior simulated.";
}

// --------- Scenario loading ---------

loadScenarioBtn.addEventListener("click", () => {
  const key = scenarioSelect.value;

  if (key === "blank" || !SCENARIOS[key]) {
    taskInput.value = "";
    rulesInput.value = "";
    contextInput.value = "";
    parseStatus.textContent = "Blank scenario loaded.";
    setBadgeIdle();
    return;
  }

  const s = SCENARIOS[key];
  taskInput.value = s.task;
  rulesInput.value = s.rules;
  contextInput.value = s.context;
  parseStatus.textContent = "Scenario loaded. Click Run Agent to see behavior.";
  setBadgeIdle();
});

// --------- Run Agent ---------

runAgentBtn.addEventListener("click", () => {
  const task = taskInput.value.trim();
  const rules = linesFromTextarea(rulesInput.value);
  const ctx = linesFromTextarea(contextInput.value);
  const drifted = driftCheckbox.checked;

  if (!task) {
    parseStatus.textContent = "Please describe a task before running the agent.";
    return;
  }

  // Interpreted task: we keep this simple and textual
  interpretedTaskEl.textContent = task;

  // Rules applied list
  rulesAppliedEl.innerHTML = "";
  if (rules.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No explicit rules provided.";
    rulesAppliedEl.appendChild(li);
  } else {
    rules.forEach((r) => {
      const li = document.createElement("li");
      li.textContent = r;
      rulesAppliedEl.appendChild(li);
    });
  }

  // Context & drift signals list
  contextSignalsEl.innerHTML = "";
  if (ctx.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No context signals provided.";
    contextSignalsEl.appendChild(li);
  } else {
    ctx.forEach((c) => {
      const li = document.createElement("li");
      li.textContent = c;
      contextSignalsEl.appendChild(li);
    });
  }

  // Decide behavior style
  if (drifted) {
    setBadgeDrifted();
    decisionEl.textContent =
      "Under drift, the agent over-weights local or short-term signals. " +
      "It may chase speed or visible progress, even when that conflicts with hard constraints.";
  } else {
    setBadgeStable();
    decisionEl.textContent =
      "With stability-first parameters, the agent prioritizes protecting core constraints " +
      "and incident impact before pursuing feature work or secondary goals.";
  }

  // Build execution trace
  const traceLines = [];

  traceLines.push("STEP 1 — Read task");
  traceLines.push(`  • Task: ${task}`);
  traceLines.push("");

  traceLines.push("STEP 2 — Parse rules & constraints");
  if (rules.length === 0) {
    traceLines.push("  • No explicit rules. Agent falls back to default safety behavior.");
  } else {
    rules.forEach((r, idx) => traceLines.push(`  • Rule ${idx + 1}: ${r}`));
  }
  traceLines.push("");

  traceLines.push("STEP 3 — Parse context & drift signals");
  if (ctx.length === 0) {
    traceLines.push("  • No context provided.");
  } else {
    ctx.forEach((c, idx) => traceLines.push(`  • Signal ${idx + 1}: ${c}`));
  }
  traceLines.push("");

  traceLines.push("STEP 4 — Behavior mode");
  traceLines.push(
    drifted
      ? "  • Mode: DRIFTED — prioritizing short-term or misaligned objectives."
      : "  • Mode: STABILITY-FIRST — prioritizing safety and reliability constraints."
  );
  traceLines.push("");

  traceLines.push("STEP 5 — Decision sketch");
  traceLines.push(
    drifted
      ? "  • Likely to favor visible progress (e.g., moving feature work forward) even with unresolved risk."
      : "  • Likely to focus on the highest-impact risk (e.g., P1 or error-budget breach) before other work."
  );

  traceEl.textContent = traceLines.join("\n");

  parseStatus.textContent = "Agent run completed.";
});
