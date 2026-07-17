# AutoFlow

![Hackathon Amd](docs/hackathon-banner.png)

**Automate your financial routine on your own terms.**

🔗 **Live demo:** [auto-flow-ecru.vercel.app](https://auto-flow-ecru.vercel.app/)
🎥 **Video walkthrough:** [How to use the prototype](https://www.youtube.com/shorts/ONA91pHLlJ0)

An interactive prototype of the Alinma Bank app featuring a new capability called **AutoFlow**: a financial automation hub that turns a plain-language idea into a clear, step-by-step automation you can review and adjust. The assistant receives only bounded, request-relevant context and cannot execute anything until you review and grant permission.

Built for **Hackathon Amd** (Alinma Bank × Tuwaiq Academy).

---

##  The Idea

Bank customers repeat the same financial actions every month: moving a percentage of their salary into savings, paying bills on time, making sure their balance never drops below a safe threshold... These tasks either get forgotten or require repeated manual effort.

**AutoFlow** solves this in three steps:

1. **Answer one simple question at a time**  when should it start, what should happen, is there a safety limit, and who approves it.
2. **Review a plain-language summary**, before saving, AutoFlow shows the whole automation as one clear sentence, e.g. "When your salary arrives, transfer 20% to your savings account, as long as your balance doesn't drop below 3,000 SAR, and it waits for your approval every time."
3. **Choose your trust level**,   fully automatic execution, approval required every time, or conditional approval only above a certain amount.

---

##  Highlights

- **Clear automation studio**: one prominent create button, simple event and execution blocks, and optional safety/approval controls kept under **Advanced options**.
- **Ready-made templates**: Salary Routine, Smart Bills, Balance Guard, and Month-End Surplus   start from a trusted template and tweak it.
- **Plain-language review**: every automation is summarized in one readable sentence before you save it, no jargon.
- **Full customization**: name and color per automation, instant activate/deactivate, and a running count of executions.
- **Bills and subscriptions**: trusted dropdowns and safe test scenarios for electricity, water, Xbox Game Pass, ChatGPT Plus, and Amazon Prime.
- **AI draft assistant**: turns an Arabic request into the exact workflow JSON used by the visual editor, asks only for essential missing financial values, and always opens an inactive draft for review.
- **Realtime voice assistant**: uses browser WebRTC for a low-latency Arabic conversation, supports interruption, shows a live transcript, and updates the same inactive draft used by text mode.
- **Privacy first**: the assistant receives only safe account metadata, backend-controlled destinations, and bounded request-relevant bill/transaction context—never credentials, card details, or the full banking dataset.
- **A complete bank app around the feature**: Home, Transfers, Payments, Store, and Services screens, with light/dark mode and a fully right-to-left Arabic interface.

---

##  Design References

The [`واجهات البنك`](./واجهات%20البنك) folder contains the light and dark mode interface designs this prototype was built from.

---

##  How the Automation Model Works

Every active AutoFlow Studio automation is represented by the workflow contract in [`src/automationContract.js`](./src/automationContract.js) and edited by [`src/AutoFlowStudio.jsx`](./src/AutoFlowStudio.jsx):

| Part | Purpose | Examples |
|---|---|---|
| Trigger/condition | When the automation starts | Salary arrives, incoming transfer, month end, bill due |
| Safety condition | Checked before execution | Minimum balance to keep after execution |
| Action | What happens | Transfer to savings, pay a bill, internal transfer, send a notification |
| Approval | Who decides execution | Automatic / requires my approval every time / conditional approval |

AI-generated workflows use the same object and arrays as the manual editor. Their review/source state is stored separately so no AI-only execution format is introduced.

---

##  Tech Stack

- **React 19** + **Vite 8**, UI and build tooling
- **lucide-react**, icons
- **Plain CSS** (no styling framework), [`src/styles.css`](./src/styles.css)
- **pnpm**  package management
- **OpenAI Responses API**   server-side structured draft generation using strict JSON Schema
- **OpenAI Realtime API**  direct browser WebRTC audio with server-side SDP exchange and a strict draft tool

> Note: this remains a prototype without a database or production identity/authorization layer. Workflow config, AI metadata, and conversation state are persisted in browser `localStorage`. The Vite/Vercel API routes provide server-side OpenAI calls, validation, and guarded publication authorization.

---

##  Running Locally

```bash
# install dependencies
pnpm install

# copy .env.example to .env, then set OPENAI_API_KEY on the server
# text defaults to OPENAI_AUTOMATION_MODEL=gpt-5.6-terra
# voice defaults to gpt-realtime-2.1, the cedar voice, and full gpt-4o-transcribe input transcription

# start the dev server (also exposed on the local network)
pnpm dev

# build the production bundle
pnpm build

# preview the production build
pnpm preview

# run the contract, security, API, and review-flow tests
pnpm test
```

### Saudi Open Banking data with Lean

AutoFlow now reads financial data through `/api/financial-data`, which selects a provider without changing the workflow engine:

- `FINANCIAL_DATA_PROVIDER=auto` uses Lean when its complete server configuration exists, otherwise it keeps the existing Plaid/demo path.
- `FINANCIAL_DATA_PROVIDER=lean` requests Lean first and falls back to Plaid/demo if Lean is unavailable.
- `FINANCIAL_DATA_PROVIDER=plaid` preserves the original Plaid integration.

Create a Saudi sandbox application at [dev.sa.leantech.me](https://dev.sa.leantech.me), then copy the Application ID, Client Secret, and Application Token from the Lean integration dashboard:

```env
FINANCIAL_DATA_PROVIDER=lean
LEAN_ENV=sandbox
LEAN_APPLICATION_ID=
LEAN_CLIENT_SECRET=
LEAN_APP_TOKEN=
LEAN_APP_USER_ID=autoflow-sandbox-user
```

Restart the server after changing environment variables. AutoFlow will then show **ربط الحساب**. The button requests a customer-scoped JWT from the backend and opens Lean LinkSDK in Arabic. The Client Secret never enters the browser; only the public Application Token, Lean customer ID, and short-lived customer access token are returned to the SDK.

The current prototype retrieves the latest active entity, accounts, balances, transactions, and beneficiaries, then normalizes them into the same snapshot contract previously supplied by Plaid. Plaid's sandbox event endpoint remains isolated for the visible **تجربة الأتمتات** tools; those buttons never create a real Lean transaction.

For a production deployment, store each authenticated user's Lean `customer_id` and `entity_id` in a server database instead of the optional environment variables below:

```env
LEAN_CUSTOMER_ID=
LEAN_ENTITY_ID=
```

Production also requires enabling the Lean application, switching to `LEAN_ENV=production`, registering verified webhook endpoints, processing `entity.data.refresh.updated` only after `FINISHED`, enforcing webhook signature/idempotency checks, and completing the applicable SAMA/Lean commercial and compliance onboarding. Do not put real customer identifiers or financial data in the Lean sandbox.

### Voice assistant configuration and local test

```env
OPENAI_API_KEY=
OPENAI_AUTOMATION_MODEL=gpt-5.6-terra
OPENAI_REALTIME_MODEL=gpt-realtime-2.1
OPENAI_REALTIME_VOICE=cedar
OPENAI_REALTIME_TRANSCRIPTION_MODEL=gpt-4o-transcribe
OPENAI_REALTIME_NOISE_REDUCTION=far_field
```

`cedar` is used for the clearer, deeper assistant voice. The browser automatically requests `near_field` noise reduction for detected headsets and `far_field` for laptop/room microphones. `gpt-4o-transcribe` favors transcript accuracy over the lower-cost mini transcription model; switch back to `gpt-4o-mini-transcribe` only when cost is more important than recognition quality.

`OPENAI_API_KEY` is read only by the API routes. It is never exposed through a Vite public variable, sent to the browser, or stored in `localStorage`. If the key is absent, text requests return a setup message and the voice start button stays disabled without crashing the AutoFlow screen.

To test voice locally:

1. Run `pnpm dev` and open the localhost URL in a current Chrome or Edge browser.
2. Open AutoFlow, choose **تحدث مع AutoFlow**, and press **بدء المحادثة**.
3. Accept microphone permission, describe an automation, then interrupt the assistant once to verify barge-in.
4. Confirm that the transcript and live draft preview update, switch to text and back, then press **مراجعة الأتمتة**.
5. Verify in the editor that the draft is still inactive and requires explicit review before publication.

Microphone capture is allowed on `localhost`. Any non-local deployment must use HTTPS. The voice session starts only after a user click and is closed immediately when stopped, reset, switched away, or unmounted. Raw audio and voice transcripts are not persisted; only the existing workflow draft and its review metadata are saved through the current local-storage mechanism.

### Voice architecture

Both input modes converge on one trusted draft path:

```text
Text / Responses API ─┐
                      ├─ server/automationDraftEngine.js
Voice / Realtime tool ┘          ↓
                         existing workflow schema
                                  ↓
                      validation + normalization
                                  ↓
                       current editor and review
```

The browser creates a microphone track and WebRTC offer. `POST /api/openai/realtime/session` exchanges that offer with OpenAI's unified `/v1/realtime/calls` interface using the server API key and returns only the SDP answer. The model can call `create_or_update_automation_draft`; the browser forwards that call to `POST /api/automation-draft`, where unknown fields are rejected and `active=false`, `generation_source=ai`, and `review_status=needs_review` are enforced before the shared draft is updated. The last two values remain in the existing separate metadata record so the manual workflow schema is not changed.

### Current prototype limits and future persistence

- There is no authentication, database, production bank connection, or durable server-side conversation state.
- Workflows and AI review metadata remain device-local. Clearing browser storage removes them.
- The UI can simulate financial actions, but the assistant never executes real money movement and never activates a draft automatically.
- Realtime availability still depends on the configured OpenAI account, model access, network, browser WebRTC support, and microphone permission.

To replace `localStorage` later without changing the workflow contract: add authenticated workflow and metadata repositories behind the existing save/load boundaries, move server-side draft/session ownership to user-scoped records, add optimistic versioning to prevent concurrent voice/manual edits, and migrate existing local workflows once per device. That migration is intentionally not implemented in this prototype.

---

##  Project Structure

```
AutoFlow/
├── index.html            HTML entry point (RTL/Arabic)
├── src/
│   ├── main.jsx                       Bank app shell and sandbox data
│   ├── AutoFlowStudio.jsx             Manual editor, AI chat, review, and publication UI
│   ├── VoiceAssistant.jsx              Voice controls, transcript, and live draft preview
│   ├── useRealtimeVoiceAssistant.js    WebRTC, microphone, Realtime events, tools, and cleanup
│   ├── realtimeVoiceEvents.js          Pure transcript/status event reducers
│   ├── automationContract.js          Shared workflow schema, enums, defaults, and validators
│   ├── automationAssistantPrompt.js   Server-side system prompt
│   └── styles.css / shortcut.css      Styles
├── api/
│   ├── automation-assistant.js        Responses API + Structured Outputs endpoint
│   ├── automation-draft.js            Shared trusted AI tool validation endpoint
│   ├── automation-publish.js          Editor-only manual publication guard
│   ├── financial-data.js               Provider selector with safe Lean → Plaid fallback
│   ├── lean-client.js                  Lean KSA OAuth, customer, entity, and data adapter
│   ├── lean-session.js                 Short-lived LinkSDK connection session
│   ├── openai/realtime/session.js      Secure unified WebRTC SDP exchange
│   └── plaid-snapshot.js              Plaid sandbox endpoint
├── server/                             Shared draft engine and server-only Realtime prompt
├── tests/                              Node test suite
├── واجهات البنك/          Light/dark mode design references
└── vite.config.js
```

---

##  The Hackathon

**AutoFlow** — submitted for **Hackathon Amd**, a partnership between **Alinma Bank** and **Tuwaiq Academy**.
