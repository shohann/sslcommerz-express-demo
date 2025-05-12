# 🔐 Express + SSLCommerz Quick Start Demo

This is a simple Express.js application that demonstrates how to integrate the [SSLCommerz](https://www.sslcommerz.com/) payment gateway, including initiating payments, handling success/fail/cancel callbacks, IPN (Instant Payment Notification), and refund operations.

## 📦 Features

- Product purchase with sample products
- Payment initialization with SSLCommerz
- Handling success, fail, cancel, and IPN callbacks
- Refund initiation and refund status query
- Transaction status query by tran ID or session ID

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/shohann/sslcommerz-express-demo.git
cd sslcommerz-express-demo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create a `.env` File

```env
STORE_ID=your_store_id_here
STORE_PASSWORD=your_store_password_here
```

Make sure to use your **sandbox credentials** from SSLCommerz for testing.

### 4. Run the App

```bash
node app.js
```

The server will start on: `http://localhost:3000`

---

## 🛒 Sample Products

```json
[
  { "id": 1, "name": "Laptop", "price": 1200 },
  { "id": 2, "name": "Smartphone", "price": 800 }
]
```

You can initiate a payment using a `POST` request to `/payment/initiate` with the following body:

```json
{
  "productId": 1,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "017xxxxxxxx",
  "customerAddress": "Dhaka"
}
```

---

## 🌐 IPN (Instant Payment Notification) with Ngrok

Since SSLCommerz needs to reach your IPN URL, and your localhost is not public, you can use [ngrok](https://ngrok.com/) to expose your local server.

### Step-by-Step Guide:

1. **Install ngrok** (if not already installed):

```bash
npm install -g ngrok
```

2. **Start your server locally:**

```bash
node app.js
```

3. **Expose your local port (3000) to the internet:**

```bash
ngrok http 3000
```

4. **Copy your public HTTPS URL**, something like:

```
https://e8a7-103-146-42-109.ngrok-free.app
```

5. **Update the `ipn_url` in your app code** (temporarily) to:

```js
ipn_url: "https://e8a7-103-146-42-109.ngrok-free.app/payment/ipn";
```

Alternatively, use an environment variable and dynamically set it.

> Now SSLCommerz can send IPN data to your local machine through the public ngrok URL.

---

## 📮 Callback Endpoints

| Route                                   | Method | Description                         |
| --------------------------------------- | ------ | ----------------------------------- |
| `/payment/initiate`                     | POST   | Initiate a new payment              |
| `/payment/success`                      | POST   | Payment success callback            |
| `/payment/fail`                         | GET    | Payment failure callback            |
| `/payment/cancel`                       | GET    | Payment cancellation callback       |
| `/payment/ipn`                          | POST   | IPN notification (via ngrok)        |
| `/payment/refund`                       | POST   | Initiate a refund                   |
| `/payment/refund/status`                | GET    | Query refund status                 |
| `/payment/transaction/status/tranid`    | POST   | Query transaction status by ID      |
| `/payment/transaction/status/sessionid` | GET    | Query transaction status by session |

---

## 📂 Folder Structure

```
.
├── app.js
├── package.json
├── .env
└── README.md
```

---

## ✅ Notes

- This app uses the [sslcommerz-lts](https://www.npmjs.com/package/sslcommerz-lts) NPM package.
- Be sure to set `is_live: true` and use real credentials when deploying to production.
- For testing refunds, use transactions that are already validated and successful.

---

## 📃 License

MIT – feel free to use, modify, and learn from this project!

---

## 👨‍💻 Author

Built with ❤️ for learning purposes.

---
