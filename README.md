# AutoFlow

AutoFlow is an Arabic financial automation prototype for Hackathon Amd (Alinma Bank x Tuwaiq Academy).

It lets a customer build safe, multi-step banking routines in a Shortcuts-style editor. A routine starts from financial events, applies conditions, then runs ordered actions with safety rules and approval requirements.

## What It Demonstrates

- Financial event sandbox: salary, incoming transfer, bill due, large purchase, subscription, balance threshold, and month end.
- Multiple conditions joined with Arabic `و` (and) or `أو` (or).
- Ordered actions that can be moved up and down.
- Per-action safety rules: minimum balance, maximum action amount, daily transfer cap, and allowed hours.
- Per-action approval rules: automatic, always request approval, or request approval above a threshold.
- Fixed Plaid Sandbox beneficiaries, hypothetical internal transfers, and bill status updates across the Transfers and Payments screens.
- An in-product Arabic guide that explains how to build an automation.

## Prototype Boundary

Plaid is used only with Sandbox data. Transfers and payments are hypothetical records inside the prototype and do not move real bank money.

## Stack

- React 19
- Vite 8
- Lucide icons
- Plain CSS
- Plaid Sandbox API route

## Run Locally

```bash
npm install
npm run dev
```

To enable the Plaid Sandbox route, create a local `.env` file from `.env.example`. Do not commit `.env`.

## Build

```bash
npm run build
```

## Project Structure

```text
src/main.jsx             Main banking app and shared records
src/AutoFlowStudio.jsx  Shortcuts-style automation editor
src/workflowEngine.js   Conditions, safety, and approval evaluation
src/shortcut.css        Automation editor styles
api/plaid-snapshot.js   Plaid Sandbox snapshot and synthetic events
```
