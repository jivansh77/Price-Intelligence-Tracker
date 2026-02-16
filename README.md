# Price Intelligence for D2C Brands

A prototype web application that helps Direct-to-Consumer (D2C) brands set optimal prices. Users enter their product's own price, a competitor's price, and a demand elasticity factor. The app calculates a **suggested optimal price band** and **markdown timing** based on configurable business rules.

---

## Tech Stack

| Layer    | Technology                  |
| -------- | --------------------------- |
| Frontend | React 18 (Create React App) |
| Backend  | Node.js + Express           |
| Database | In-memory (demo)            |

### Vercel Deployment

To deploy the frontend to Vercel:

1. **Set Root Directory**: In your Vercel project settings, go to **Settings → General → Root Directory** and set it to `frontend`. (The repo root has no build; the React app lives in `frontend/`.)
2. **Build settings** (usually auto-detected): Build Command `npm run build`, Output Directory `build`.
3. Redeploy after updating the Root Directory.

### Future AWS Integration

- **DynamoDB** – Replace in-memory storage with persistent NoSQL database.
- **EC2** – Deploy the Express backend on a `t2.micro` instance.
- **S3** – Host the production React build as a static website.

---

## Project Structure

```
├── backend/
│   ├── server.js          # Express server with /api/price endpoint
│   ├── pricingLogic.js    # Core pricing business rules
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # Root component
│   │   ├── App.css
│   │   ├── index.js        # React entry point
│   │   ├── index.css        # Global styles
│   │   └── components/
│   │       ├── PricingForm.js   # Input form + API call
│   │       ├── PricingForm.css
│   │       ├── ResultCard.js    # Recommendation display
│   │       └── ResultCard.css
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 16
- **npm** >= 8

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start the backend

```bash
cd backend
npm start
```

The API server starts on **http://localhost:5000**.

### 3. Start the frontend

In a separate terminal:

```bash
cd frontend
npm start
```

The React dev server starts on **http://localhost:3000** and will automatically open in your browser.

---

## API Reference

### `POST /api/price`

Calculate optimal pricing for a product.

**Request body** (JSON):

| Field            | Type   | Required | Default | Description                     |
| ---------------- | ------ | -------- | ------- | ------------------------------- |
| `productId`      | string | Yes      | –       | Unique product identifier       |
| `ownPrice`       | number | Yes      | –       | Your current price              |
| `competitorPrice`| number | Yes      | –       | Main competitor's price         |
| `elasticity`     | number | No       | 1.5     | Demand elasticity factor        |

**Response** (JSON):

```json
{
  "productId": "SKU-1234",
  "optimalPriceBand": 47.24,
  "markdownTiming": "Monitor"
}
```

### `GET /api/price/history`

Returns all pricing recommendations from the current session (in-memory).

### `GET /api/health`

Health check – returns `{ "status": "ok" }`.

---

## Pricing Logic

| Condition                           | Optimal Price              | Markdown Timing |
| ----------------------------------- | -------------------------- | --------------- |
| Own > Competitor × 1.1             | Competitor × 1.05          | Immediate       |
| Own < Competitor × 0.9             | Own Price (hold)           | Hold            |
| Competitive range, elasticity > 1  | Competitor × 0.98          | Monitor         |
| Competitive range, elasticity ≤ 1  | Competitor × 1.02          | Monitor         |

---

## License

This project is a prototype for educational and demonstration purposes.
