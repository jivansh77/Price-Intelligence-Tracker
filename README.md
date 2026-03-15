# Price Intelligence for D2C Brands

A prototype web application that helps Direct-to-Consumer (D2C) brands set optimal prices. Users enter their product's own price, a competitor's price, and a demand elasticity factor. The app calculates a **suggested optimal price band** and **markdown timing** based on configurable business rules.

---

## Tech Stack

| Layer    | Technology                              |
| -------- | --------------------------------------- |
| Frontend | React 18 (Create React App)             |
| Backend  | Node.js + Express                       |
| Database | AWS DynamoDB (in-memory fallback)       |
| Hosting  | S3 + CloudFront (frontend), EC2 (backend) |

---

## Project Structure

```
├── backend/
│   ├── server.js          # Express server with DynamoDB integration
│   ├── pricingLogic.js    # Core pricing business rules
│   ├── .env.example       # Environment variable template
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # Root component
│   │   ├── App.css
│   │   ├── index.js       # React entry point
│   │   ├── index.css      # Global styles
│   │   └── components/
│   │       ├── PricingForm.js   # Input form + API call
│   │       ├── PricingForm.css
│   │       ├── ResultCard.js    # Recommendation display
│   │       └── ResultCard.css
│   ├── .env.example       # Environment variable template
│   └── package.json
└── README.md
```

---

## Getting Started (Local Development)

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
cp .env.example .env   # edit if needed
npm start
```

The API server starts on **http://localhost:5000**. Without AWS credentials configured, it falls back to in-memory storage automatically.

### 3. Start the frontend

```bash
cd frontend
cp .env.example .env   # edit if needed
npm start
```

The React dev server starts on **http://localhost:3000**.

---

## API Reference

### `POST /api/price`

Calculate optimal pricing for a product.

**Request body** (JSON):

| Field            | Type   | Required | Default | Description                |
| ---------------- | ------ | -------- | ------- | -------------------------- |
| `productId`      | string | Yes      | –       | Unique product identifier  |
| `ownPrice`       | number | Yes      | –       | Your current price         |
| `competitorPrice`| number | Yes      | –       | Main competitor's price    |
| `elasticity`     | number | No       | 1.5     | Demand elasticity factor   |

**Response** (JSON):

```json
{
  "productId": "SKU-1234",
  "optimalPriceBand": 47.24,
  "markdownTiming": "Monitor"
}
```

### `GET /api/price/history`

Returns all pricing recommendations from DynamoDB (or in-memory if DynamoDB is unavailable).

### `GET /api/health`

Health check – returns `{ "status": "ok", "dynamo": true }`.

---

## Pricing Logic

| Condition                           | Optimal Price              | Markdown Timing |
| ----------------------------------- | -------------------------- | --------------- |
| Own > Competitor × 1.1             | Competitor × 1.05          | Immediate       |
| Own < Competitor × 0.9             | Own Price (hold)           | Hold            |
| Competitive range, elasticity > 1  | Competitor × 0.98          | Monitor         |
| Competitive range, elasticity ≤ 1  | Competitor × 1.02          | Monitor         |

---

## AWS Deployment Guide

All services below fall within the **AWS Free Tier** (12-month new-account limits).

### Architecture Overview

```
                 ┌──────────────┐
  User ────────► │  CloudFront  │ (CDN, HTTPS)
                 └──────┬───────┘
                        │ origin
                 ┌──────▼───────┐
                 │   S3 Bucket  │ (React build)
                 └──────────────┘

                 ┌──────────────┐
  React app ───► │   EC2 (API)  │ :5000
                 └──────┬───────┘
                        │
                 ┌──────▼───────┐
                 │   DynamoDB   │ PricingHistory table
                 └──────────────┘
```

---

### Step 1 — Create a DynamoDB Table

1. Go to **AWS Console → DynamoDB → Create table**.
2. **Table name**: `PricingHistory`
3. **Partition key**: `productId` (String)
4. **Sort key**: `timestamp` (String)
5. **Table settings**: Choose **Customize settings**.
6. **Read/Write capacity**: Select **On-demand** (free tier covers 25 WCU / 25 RCU provisioned, or use on-demand for simplicity under light load).
7. Click **Create table**.

> The backend reads the table name from the `DYNAMODB_TABLE` env var (default: `PricingHistory`).

---

### Step 2 — Launch an EC2 Instance (Backend)

#### 2a. Create an IAM Role for EC2

1. Go to **IAM → Roles → Create role**.
2. **Trusted entity**: AWS service → EC2.
3. Attach the policy **AmazonDynamoDBFullAccess** (or create a scoped policy for just the `PricingHistory` table).
4. **Role name**: `PriceIntelligenceEC2Role` → Create.

#### 2b. Launch the Instance

1. Go to **EC2 → Launch instance**.
2. **Name**: `price-intelligence-api`
3. **AMI**: Amazon Linux 2023 (free tier eligible).
4. **Instance type**: `t2.micro` (free tier).
5. **Key pair**: Create or select an existing key pair (for SSH).
6. **Network settings**:
   - Create a new security group.
   - Allow **SSH (port 22)** from your IP.
   - Add a rule for **Custom TCP – port 5000** from `0.0.0.0/0` (or restrict to CloudFront IPs).
7. **Advanced details → IAM instance profile**: Select `PriceIntelligenceEC2Role`.
8. Launch the instance.

#### 2c. Deploy the Backend Code

SSH into the instance and run:

```bash
# Install Node.js 18
sudo dnf install -y nodejs

# Clone the repo (or use scp to copy files)
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>/backend

# Install dependencies
npm install --production

# Create the .env file
cat > .env << 'EOF'
PORT=5000
AWS_REGION=us-east-1
DYNAMODB_TABLE=PricingHistory
CORS_ORIGIN=https://<YOUR_CLOUDFRONT_DOMAIN>,http://localhost:3000
EOF

# Start the server (use pm2 for production persistence)
npm install -g pm2
pm2 start server.js --name price-api
pm2 startup   # follow the printed command to enable auto-start on reboot
pm2 save
```

#### 2d. Verify

```bash
curl http://localhost:5000/api/health
# Expected: {"status":"ok","dynamo":true}
```

Also test from your machine using the **EC2 Public IP**:

```
http://<EC2_PUBLIC_IP>:5000/api/health
```

---

### Step 3 — Build & Upload Frontend to S3

#### 3a. Create an S3 Bucket

1. Go to **S3 → Create bucket**.
2. **Bucket name**: `price-intelligence-frontend` (must be globally unique — add a suffix if needed).
3. **Region**: Same as your EC2 / DynamoDB (e.g. `us-east-1`).
4. **Uncheck** "Block all public access" (you'll serve via CloudFront, but the bucket policy needs to allow CloudFront access).
5. Leave other settings as default → **Create bucket**.

#### 3b. Build the React App

On your local machine:

```bash
cd frontend

# Point the frontend to your EC2 backend
echo "REACT_APP_BACKEND_URL=http://<EC2_PUBLIC_IP>:5000" > .env

npm run build
```

This creates a `build/` directory with the production-ready files.

#### 3c. Upload to S3

```bash
# Using AWS CLI (install from https://aws.amazon.com/cli/ if needed)
aws s3 sync build/ s3://price-intelligence-frontend --delete
```

Or via the AWS Console: open the bucket → **Upload** → drag the contents of `build/`.

#### 3d. Enable Static Website Hosting (optional, for direct S3 access)

1. Go to the bucket → **Properties** → **Static website hosting** → **Enable**.
2. **Index document**: `index.html`
3. **Error document**: `index.html` (for React Router support).
4. Save.

---

### Step 4 — Set Up CloudFront (CDN)

#### 4a. Create a CloudFront Distribution

1. Go to **CloudFront → Create distribution**.
2. **Origin domain**: Select your S3 bucket (`price-intelligence-frontend.s3.amazonaws.com`).
3. **Origin access**: Choose **Origin access control (OAC)**.
   - Click **Create new OAC** → use defaults → Create.
   - CloudFront will prompt you to update the S3 bucket policy (do this in step 4b).
4. **Default cache behavior**:
   - **Viewer protocol policy**: Redirect HTTP to HTTPS.
   - **Allowed HTTP methods**: GET, HEAD.
   - **Cache policy**: `CachingOptimized` (recommended).
5. **Default root object**: `index.html`
6. **Custom error responses** (important for React SPA routing):
   - Add a custom error response for HTTP **403**:
     - **Response page path**: `/index.html`
     - **HTTP response code**: `200`
   - Add the same for HTTP **404**.
7. Leave other settings as defaults → **Create distribution**.

CloudFront will assign a domain like `d1234abcdef.cloudfront.net`. Note this value.

#### 4b. Update S3 Bucket Policy

CloudFront will show a banner to copy the bucket policy. Apply it:

1. Go to **S3 → your bucket → Permissions → Bucket policy**.
2. Paste the policy CloudFront provided. It will look like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::price-intelligence-frontend/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
        }
      }
    }
  ]
}
```

3. Save.

#### 4c. Update Backend CORS

SSH into your EC2 instance and update the `CORS_ORIGIN` in `backend/.env`:

```
CORS_ORIGIN=https://d1234abcdef.cloudfront.net,http://localhost:3000
```

Then restart:

```bash
pm2 restart price-api
```

#### 4d. Verify

Open `https://d1234abcdef.cloudfront.net` in your browser. The React app should load and API calls should reach your EC2 backend.

---

### Summary of Environment Variables

#### Backend (`backend/.env`)

| Variable         | Description                                 | Example                                                  |
| ---------------- | ------------------------------------------- | -------------------------------------------------------- |
| `PORT`           | Server port                                 | `5000`                                                   |
| `CORS_ORIGIN`    | Comma-separated allowed origins             | `https://d1234abcdef.cloudfront.net,http://localhost:3000`|
| `AWS_REGION`     | AWS region for DynamoDB                     | `us-east-1`                                              |
| `DYNAMODB_TABLE` | DynamoDB table name                         | `PricingHistory`                                         |

#### Frontend (`frontend/.env`)

| Variable                  | Description            | Example                              |
| ------------------------- | ---------------------- | ------------------------------------ |
| `REACT_APP_BACKEND_URL`  | Backend API base URL   | `http://<EC2_PUBLIC_IP>:5000`        |

---

### Free Tier Limits to Watch

| Service    | Free Tier Allowance                                              |
| ---------- | ---------------------------------------------------------------- |
| EC2        | 750 hrs/month of `t2.micro` (12 months)                         |
| DynamoDB   | 25 GB storage, 25 WCU, 25 RCU provisioned (always free)         |
| S3         | 5 GB storage, 20K GET, 2K PUT requests/month (12 months)        |
| CloudFront | 1 TB data transfer out, 10M requests/month (12 months)          |

---

## License

This project is a prototype for educational and demonstration purposes.
