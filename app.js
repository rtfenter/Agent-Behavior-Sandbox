// Agent Behavior Sandbox
// Tiny deterministic "agent" to demonstrate how tasks, rules, and context
// shape behavior. Everything runs client-side.

const scenarioSelect = document.getElementById("scenario-select");
const loadScenarioBtn = document.getElementById("load-scenario-btn");
const runAgentBtn = document.getElementById("run-agent-btn");
const driftCheckbox = document.getElementById("simulate-drift");

const taskInput = document.getElementById("task-input");
const rulesInput = document.getElementById("rules-input");
const contextInput = document.getElementById("context-input");

const runStatusEl = document.getElementById("run-status");
const summaryEl = document.getElementById("summary");
const taskListEl = document.getElementById("task-interpretation");
const rulesListEl = document.getElementById("rules-applied");
const contextListEl = document.getElementById("context-signals");
const decisionListEl = document.getElementById("decision-rationale");
const rawTraceEl = document.getElementById("raw-trace");

// --- Example scenarios -------------------------------------------------------

const SCENARIOS = {
  triage: {
    task:
      "Prioritize incidents in the on-call queue for the next 2 hours and decide what to work on first.",
    rules: [
      "Must protect production traffic before anything else.",
      "Never ignore a P1 incident.",
      "Prefer resolving high-severity issues before low-severity ones.",
      "Avoid starting new feature work while there is an active P1."
    ].join("\n"),
    context:
      "High traffic. One P1 incident impacting paying customers. Two P3 feature requests from internal teams. SLA for P1 is 30 minutes. No current deployments running."
  },
  conflict: {
    task:
      "Plan what to do for the next sprint: handle incidents or ship a new feature launch.",
    rules: [
      "Must meet regulatory deadlines when they exist.",
      "Prefer shipping user-facing value when risk is low.",
      "Avoid risky changes right before high-traffic events.",
      "Never ignore known security vulnerabilities."
    ].join("\n"),
    context:
      "Upcoming marketing launch in 3 days. One known security bug marked as medium. Product is pushing for a new feature demo. No explicit regulatory dates mentioned."
  }
};

// --- Utility: HTML helpers ---------------------------------------------------

function clearList(listEl) {
  while (listEl.firstChild) {
    listEl.removeChild(listEl.firstChild);
  }
}

function addListItem(listEl, text) {
  const li = document.createElement("li");
  li.textContent = text;
  listEl.appendChild(li);
}

// --- Parsing helpers ---------------------------------------------------------

function extractLines(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function classifyRules(lines) {
  const hard = [];
  const soft = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (
      lower.includes("must") ||
      lower.includes("never") ||
      lower.includes("cannot") ||
      lower.includes("can't") ||
      lower.includes("do not") ||
      lower.includes("don't") ||
      lower.includes("avoid")
    ) {
      hard.push(line);
    } else {
      soft.push(line);
    }
  });

  return { hard, soft };
}

function extractSignalsFromContext(context) {
  const lower = context.toLowerCase();
  const signals = [];

  if (lower.includes("p1") || lower.includes("sev1") || lower.includes("severity 1")) {
    signals.push("High-severity incident present (P1/Sev1).");
  }
  if (lower.includes("p2") || lower.includes("sev2")) {
    signals.push("Medium-severity incident present (P2/Sev2).");
  }
  if (lower.includes("sla")) {
    signals.push("Explicit SLA or response-time constraint mentioned.");
  }
  if (lower.includes("traffic")) {
    signals.push("Traffic conditions are relevant (load/peak).");
  }
  if (lower.includes("launch") || lower.includes("release") || lower.includes("demo")) {
    signals.push("Upcoming launch/release pressure.");
  }
  if (lower.includes("security") || lower.includes("vulnerability")) {
    signals.push("Security risk present in context.");
  }
  if (lower.includes("internal") || lower.includes("feature")) {
    signals.push("Requests or pressure related to features/internal work.");
  }

  if (signals.length === 0 && context.trim().length > 0) {
    signals.push("Context provided but no obvious high-signal keywords detected.");
  }

  return signals;
}

function inferTaskFocus(task) {
  const lower = task.toLowerCase();
  const focus = [];

  if (lower.includes("incident") || lower.includes("on-call") || lower.includes("alert")) {
    focus.push("Operational / incident management.");
  }
  if (lower.includes("feature") || lower.includes("sprint") || lower.includes("backlog")) {
    focus.push("Feature planning / delivery.");
  }
  if (lower.includes("priority") || lower.includes("prioritize")) {
    focus.push("Priority setting / ordering work.");
  }
  if (lower.includes("decide") || lower.includes("choose")) {
    focus.push("Decision-making / strategy.");
  }

  if (focus.length === 0 && task.trim().length > 0) {
    focus.push("General task with no specific domain keywords detected.");
  }

  return focus;
}

// --- Behavior classification --------------------------------------------------

function classifyBehavior({ hardRules, softRules, signals, taskFocus, drift }) {
  let mode = "balanced";
  let style = "neutral";
  const tags = [];

  const hasProdProtection = hardRules.some((r) =>
    r.toLowerCase().includes("protect production")
  );
  const hasNeverIgnoreP1 = hardRules.some(
    (r) =>
      r.toLowerCase().includes("never ignore") &&
      r.toLowerCase().includes("p1")
  );
  const hasSecurityRule = hardRules.some((r) =>
    r.toLowerCase().includes("security")
  );
  const hasShipValue = softRules.some(
    (r) =>
      r.toLowerCase().includes("ship") ||
      r.toLowerCase().includes("user-facing")
  );

  const hasLaunchPressure = signals.some((s) =>
    s.toLowerCase().includes("launch")
  );
  const hasHighSeverity = signals.some((s) =>
    s.toLowerCase().includes("high-severity")
  );

  if (hasHighSeverity || hasProdProtection || hasNeverIgnoreP1 || hasSecurityRule) {
    mode = "stability-first";
  }
  if (hasShipValue && !hasHighSeverity && !hasSecurityRule && !hasProdProtection) {
    mode = "delivery-first";
  }

  if (mode === "stability-first") {
    tags.push("risk-aware", "defensive");
  } else if (mode === "delivery-first") {
    tags.push("speed-biased");
  } else {
    tags.push("balanced");
  }

  if (hasLaunchPressure && hasShipValue) {
    style = "conflicted";
  } else if (drift) {
    style = "drifted";
  } else if (mode === "stability-first") {
    style = "cautious";
  } else if (mode === "delivery-first") {
    style = "assertive";
  }

  return { mode, style, tags };
}

// --- Agent simulation --------------------------------------------------------

function simulateAgent(task, rulesText, context, simulateDrift) {
  const traceLines = [];

  const ruleLines = extractLines(rulesText);
  const { hard: hardRules, soft: softRulesRaw } = classifyRules(ruleLines);
  let softRules = [...softRulesRaw];

  const taskFocus = inferTaskFocus(task);
  const signals = extractSignalsFromContext(context);

  traceLines.push("Step 1 — Read task:");
  traceLines.push(`  "${task.trim() || "(empty task)"}"`);
  traceLines.push("");

  traceLines.push("Step 2 — Parse rules into hard vs soft constraints:");
  if (hardRules.length === 0 && softRules.length === 0) {
    traceLines.push("  No rules specified.");
  } else {
    if (hardRules.length) {
      traceLines.push("  Hard constraints:");
      hardRules.forEach((r) => traceLines.push("    - " + r));
    }
    if (softRules.length) {
      traceLines.push("  Soft preferences:");
      softRules.forEach((r) => traceLines.push("    - " + r));
    }
  }
  traceLines.push("");

  let driftNote = null;
  if (simulateDrift && softRules.length > 0) {
    const dropped = softRules[softRules.length - 1];
    softRules = softRules.slice(0, -1);
    driftNote = `Simulated drift: agent ignores soft rule "${dropped}".`;
    traceLines.push("Step 3 — Apply drift:");
    traceLines.push("  " + driftNote);
    traceLines.push("");
  }

  traceLines.push("Step 4 — Interpret task focus:");
  if (taskFocus.length) {
    taskFocus.forEach((f) => traceLines.push("  - " + f));
  }
  traceLines.push("");

  traceLines.push("Step 5 — Extract context signals:");
  if (signals.length) {
    signals.forEach((s) => traceLines.push("  - " + s));
  } else {
    traceLines.push("  - No notable signals found.");
  }
  traceLines.push("");

  const behavior = classifyBehavior({
    hardRules,
    softRules,
    signals,
    taskFocus,
    drift: !!driftNote
  });

  // Decision heuristic
  let decisionSummary = "";
  const lowerTask = task.toLowerCase();

  if (behavior.mode === "stability-first") {
    if (signals.some((s) => s.toLowerCase().includes("high-severity"))) {
      decisionSummary =
        "Treat the high-severity incident as the top priority and address it before anything else.";
    } else if (signals.some((s) => s.toLowerCase().includes("security"))) {
      decisionSummary =
        "Focus on reducing security risk before pursuing new feature work.";
    } else {
      decisionSummary =
        "Keep risk low: choose work that has minimal impact on production stability.";
    }
  } else if (behavior.mode === "delivery-first") {
    if (lowerTask.includes("sprint") || lowerTask.includes("feature")) {
      decisionSummary =
        "Prioritize shipping user-visible feature work while monitoring for new risks.";
    } else {
      decisionSummary =
        "Bias toward tasks that create visible progress or user value.";
    }
  } else {
    decisionSummary =
      "Balance stability and delivery: address any obvious risks, then pick the highest-value task.";
  }

  traceLines.push("Step 6 — Choose action:");
  traceLines.push("  " + decisionSummary);
  traceLines.push("");
  traceLines.push("Step 7 — Behavior classification:");
  traceLines.push("  Mode: " + behavior.mode);
  traceLines.push("  Style: " + behavior.style);
  traceLines.push("  Tags: " + behavior.tags.join(", "));

  if (driftNote) {
    traceLines.push("");
    traceLines.push("Drift Note:");
    traceLines.push("  " + driftNote);
  }

  return {
    hardRules,
    softRules,
    signals,
    taskFocus,
    behavior,
    decisionSummary,
    driftNote,
    trace: traceLines.join("\n")
  };
}

// --- UI glue -----------------------------------------------------------------

function renderSummary(behavior, driftNote) {
  summaryEl.innerHTML = "";

  const badge = document.createElement("div");
  badge.className = "summary-badge";

  const modePill = document.createElement("span");
  modePill.className = "summary-pill summary-pill-mode";
  modePill.textContent =
    behavior.mode === "stability-first"
      ? "Stability-first"
      : behavior.mode === "delivery-first"
      ? "Delivery-first"
      : "Balanced";

  const stylePill = document.createElement("span");
  stylePill.className = "summary-pill summary-pill-style";
  stylePill.textContent =
    behavior.style.charAt(0).toUpperCase() + behavior.style.slice(1);

  const textSpan = document.createElement("span");
  const modeLabel =
    behavior.mode === "stability-first"
      ? "Protects stability before speed."
      : behavior.mode === "delivery-first"
      ? "Optimizes for speed and user-visible progress."
      : "Balances stability and delivery based on context.";
  textSpan.textContent = modeLabel;

  badge.appendChild(modePill);
  badge.appendChild(stylePill);
  badge.appendChild(textSpan);

  if (driftNote) {
    const driftSpan = document.createElement("span");
    driftSpan.className = "summary-pill summary-pill-mode";
    driftSpan.textContent = "Drift simulated";
    badge.appendChild(driftSpan);
  }

  summaryEl.appendChild(badge);
}

function renderLists(result) {
  clearList(taskListEl);
  clearList(rulesListEl);
  clearList(contextListEl);
  clearList(decisionListEl);

  // Task interpretation
  if (result.taskFocus.length === 0) {
    addListItem(taskListEl, "No specific task focus detected.");
  } else {
    result.taskFocus.forEach((f) => addListItem(taskListEl, f));
  }

  // Rules
  if (result.hardRules.length === 0 && result.softRules.length === 0) {
    addListItem(rulesListEl, "No rules provided.");
  } else {
    if (result.hardRules.length) {
      addListItem(rulesListEl, "Hard constraints:");
      result.hardRules.forEach((r) => addListItem(rulesListEl, "• " + r));
    }
    if (result.softRules.length) {
      addListItem(rulesListEl, "Soft preferences:");
      result.softRules.forEach((r) => addListItem(rulesListEl, "• " + r));
    }
  }

  // Context signals
  if (result.signals.length === 0) {
    addListItem(contextListEl, "No notable signals found in context.");
  } else {
    result.signals.forEach((s) => addListItem(contextListEl, s));
  }

  // Decision & rationale
  addListItem(decisionListEl, result.decisionSummary);
  const tagsLine = "Behavior tags: " + result.behavior.tags.join(", ");
  addListItem(decisionListEl, tagsLine);
}

// Scenario loading
loadScenarioBtn.addEventListener("click", () => {
  const value = scenarioSelect.value;

  if (value === "none") {
    taskInput.value = "";
    rulesInput.value = "";
    contextInput.value = "";
    runStatusEl.textContent = "Cleared fields for a blank scenario.";
    return;
  }

  const scenario = SCENARIOS[value];
  if (!scenario) {
    runStatusEl.textContent = "Unknown scenario selected.";
    return;
  }

  taskInput.value = scenario.task;
  rulesInput.value = scenario.rules;
  contextInput.value = scenario.context;
  runStatusEl.textContent = "Scenario loaded. Adjust as needed, then run the agent.";
});

// Run agent
runAgentBtn.addEventListener("click", () => {
  const task = taskInput.value.trim();
  const rulesText = rulesInput.value;
  const context = contextInput.value;

  if (!task && !rulesText && !context) {
    runStatusEl.textContent = "Add a task, rules, or context before running the agent.";
    return;
  }

  const simulateDrift = driftCheckbox.checked;

  const result = simulateAgent(task, rulesText, context, simulateDrift);

  renderSummary(result.behavior, result.driftNote);
  renderLists(result);

  rawTraceEl.textContent = result.trace;
  runStatusEl.textContent = "Agent run completed.";
});
