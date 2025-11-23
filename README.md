# Agent Behavior Sandbox  
[![Live Demo](https://img.shields.io/badge/Live%20Demo-000?style=for-the-badge)](https://rtfenter.github.io/Agent-Behavior-Sandbox/)

### A tiny sandbox to explore how an agent interprets tasks, applies rules, and changes behavior as signals drift.

This project is part of my **Applied Intelligence Systems Series**, exploring how intelligent systems behave beneath the UI layer — from signal ingestion to rule evaluation to action selection and feedback.

The goal of this sandbox is to provide a simple, interactive way to see how different variables affect an agent’s behavior:

- Task description  
- Rules and constraints  
- Context and input signals  
- Noise / drift in the environment  
- Execution trace and outcomes  

The simulation is intentionally small and easy to extend.

---

## Features (MVP)

The first version will include:

- Input fields for task, rules, and context  
- A simple agent “reasoning” trace (steps the agent takes)  
- Visual comparison of behavior under two different rule sets or contexts  
- Basic drift controls (e.g., add noise, change a constraint, toggle a rule)  
- Simple action flow: `Task → Interpret → Decide → Act → Log`

## Demo Screenshot

<img width="2804" height="2098" alt="Screenshot 2025-11-23 at 10-57-47 Agent Behavior Sandbox" src="https://github.com/user-attachments/assets/1e0f1da3-f9b2-4242-b0d9-7f96d2b80432" />


---

## Agent Behavior Flow Diagram

    [Task + Context + Rules]
                |
                v
         Input Normalization
        (clean, validate, shape)
                |
                v
         Interpretation Layer
     (what does this task mean?)
                |
                v
        Policy & Rule Engine
     (check constraints, priorities)
                |
                v
          Decision Selection
      (choose next action or plan)
                |
                v
            Execution Step
      (apply action to environment)
                |
                v
           Behavior Log / Trace
    (what the agent did and why)

---

## Purpose

Agent behavior often looks “mysterious,” but real systems depend on:

- Clear task definitions  
- Transparent rules and constraints  
- Stable, well-structured inputs  
- Explicit traces of what the agent decided and why  
- Awareness of how drift in signals changes outcomes  

This sandbox provides a small, understandable way to visualize these concepts without building a full agent framework.

---

## How This Maps to Real Intelligence Systems

Even though it's minimal, each part corresponds to real architecture:

### Task & Context  
In production systems, tasks arrive with partial context (user state, environment, permissions). Mis-specified tasks or missing context cause surprising behavior.

### Rules & Constraints  
Policies, guardrails, and business rules limit what an agent is allowed to do. Real engines implement this as policy checks, allow/deny lists, and safety filters.

### Interpretation Layer  
Before acting, intelligent systems interpret inputs: “what does this mean?” This is where prompt parsing, schema mapping, or semantic understanding lives.

### Decision Selection  
Agents often have multiple possible actions. Selection might depend on priority, cost, risk, or external constraints.

### Execution Trace  
A good system exposes why and how decisions were made. Traces are critical for debugging, audits, and governance.

### Drift & Noise  
When inputs, rules, or context drift slightly, behavior can shift dramatically. This sandbox makes that shift visible at a small scale.

This tool is a legible micro-version of how agent-like systems work under the hood.

---

## Part of the Applied Intelligence Systems Series

Main repo:  
https://github.com/rtfenter/Applied-Intelligence-Systems-Series

---

## Status  

MVP planned.  
This sandbox will focus on core mechanics required to demonstrate agent behavior under different rules and contexts, not on building a full production agent framework.

---

## Local Use

Everything will run client-side.

To run locally (once files are added):

1. Clone the repo  
2. Open `index.html` in your browser  

That’s it — static HTML + JS, no backend required.
