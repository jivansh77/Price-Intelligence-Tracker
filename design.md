# Price Intelligence – Architecture & Design

## Overview

Price Intelligence is a prototype web application that helps Direct-to-Consumer (D2C) brands set optimal prices. Users submit their product's own price, a competitor's price, and an optional demand elasticity factor. The system calculates a **suggested optimal price band** and **markdown timing** based on configurable business rules.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER (Browser)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React SPA)                             │
│  • Create React App                                                      │
│  • Single-page application at /                                          │
│  • Communicates with backend via REST API                                │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP POST /api/price
                                      │ HTTP GET  /api/price/history
                                      │ HTTP GET  /api/health
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Node.js + Express)                      │
│  • REST API server (port 5000)                                           │
│  • CORS enabled for frontend origin                                      │
│  • Routes requests to pricing logic + in-memory storage                  │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         STORAGE (In-Memory)                              │
│  • Demo only: pricingHistory array                                        │
│  • Future: DynamoDB                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend (React)

```
src/
├── index.js          # Entry point; mounts App into #root
├── index.css         # Global styles
├── App.js            # Root component (layout: header, main, footer)
├── App.css
└── components/
    ├── PricingForm.js   # Form UI + API orchestration
    ├── PricingForm.css
    ├── ResultCard.js    # Displays recommendation
    └── ResultCard.css
```

**Component Hierarchy:**

```
App
└── header (title, subtitle)
└── main
    └── PricingForm
        ├── form (productId, ownPrice, competitorPrice, elasticity)
        ├── submit button
        ├── error message (conditional)
        └── ResultCard (conditional, when result exists)
```

**Data Flow (Frontend):**

1. User fills form → state held in `PricingForm` (useState)
2. On submit → `handleSubmit` builds payload, calls `POST /api/price`
3. On success → `result` state updated → `ResultCard` renders
4. On error → `error` state updated → error message displayed

---

## Backend Architecture

```
backend/
├── server.js         # Express app: routes, middleware, server
├── pricingLogic.js   # Pure business logic (calculatePricing)
└── package.json
```

**Layers:**

| Layer          | File            | Responsibility                                  |
|----------------|-----------------|--------------------------------------------------|
| HTTP / Routes  | `server.js`     | Request parsing, validation, response handling  |
| Business Logic | `pricingLogic.js` | Optimal price & markdown timing rules           |
| Storage        | `server.js`     | In-memory `pricingHistory` array (demo only)     |

**Middleware Chain:**

```
Request → CORS → bodyParser.json → Route Handler → Response
```

---

## API Design

| Method | Endpoint             | Description                                      |
|--------|----------------------|--------------------------------------------------|
| POST   | `/api/price`         | Calculate optimal pricing (returns price band + markdown timing) |
| GET    | `/api/price/history` | Return all recommendations from current session  |
| GET    | `/api/health`        | Health check (`{ "status": "ok" }`)              |

### POST /api/price

**Request (JSON):**

| Field            | Type   | Required | Default | Description               |
|------------------|--------|----------|---------|---------------------------|
| productId        | string | Yes      | –       | Unique product identifier |
| ownPrice         | number | Yes      | –       | Brand's current price     |
| competitorPrice  | number | Yes      | –       | Competitor's price        |
| elasticity       | number | No       | 1.5     | Demand elasticity factor  |

**Response (JSON):**

```json
{
  "productId": "SKU-1234",
  "optimalPriceBand": 47.24,
  "markdownTiming": "Immediate"
}
```

---

## Business Logic (Pricing Rules)

Defined in `pricingLogic.js`:

| Condition                         | Optimal Price          | Markdown Timing |
|-----------------------------------|------------------------|-----------------|
| ownPrice > competitorPrice × 1.1  | competitorPrice × 1.05 | Immediate       |
| ownPrice < competitorPrice × 0.9  | ownPrice (hold)        | Hold            |
| Else, elasticity > 1              | competitorPrice × 0.98 | Monitor         |
| Else, elasticity ≤ 1              | competitorPrice × 1.02 | Monitor         |

Thresholds: ±10% of competitor price define “competitive range.”

---

## Deployment Architecture

### Current (Local / Vercel)

```
┌──────────────────┐     ┌──────────────────┐
│  Vercel          │     │  Local / EC2     │
│  (Frontend SPA)  │ ──► │  (Backend API)   │
│  build/ served   │     │  port 5000       │
└──────────────────┘     └──────────────────┘
```

- **Frontend**: Static build hosted on Vercel (root dir: `frontend/`)
- **Backend**: Express server; currently run locally or on EC2 (not on Vercel)

### Future (AWS)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  S3         │     │  EC2        │     │  DynamoDB   │
│  Static     │ ──► │  Express    │ ──► │  Pricing    │
│  Hosting    │     │  API        │     │  History    │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Tech Stack Summary

| Layer    | Technology                |
|----------|---------------------------|
| Frontend | React 18, Create React App |
| Backend  | Node.js, Express          |
| Storage  | In-memory (demo)          |
| Styling  | Plain CSS                 |

---

## Security Considerations

- **CORS**: Backend allows `http://localhost:3000` for local dev; production needs the deployed frontend origin.
- **Validation**: Server validates `productId`, `ownPrice`, `competitorPrice`, `elasticity` before processing.
- **No auth**: Prototype has no authentication; suitable for demo/educational use only.
