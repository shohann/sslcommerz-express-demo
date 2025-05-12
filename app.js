const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const SSLCommerzPayment = require("sslcommerz-lts");
require("dotenv").config();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const products = [
  { id: 1, name: "Laptop", price: 1200 },
  { id: 2, name: "Smartphone", price: 800 },
];

const orders = [];
let nextOrderId = 1;

const sslcz = {
  store_id: process.env.STORE_ID,
  store_passwd: process.env.STORE_PASSWORD,
  is_live: false,
  success_url: "http://localhost:3000/payment/success",
  cancel_url: "http://localhost:3000/payment/cancel",
  ipn_url: "http://localhost:3000/payment/ipn",
  fail_url: "http://localhost:3000/payment/fail",
};

function generateTransactionId() {
  return (
    "SSLCZ_Tran_" +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

const sslcommerPayment = new SSLCommerzPayment(
  sslcz.store_id,
  sslcz.store_passwd,
  sslcz.is_live
);

app.post("/payment/initiate", async (req, res) => {
  const {
    productId,
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
  } = req.body;

  const product = products.find((p) => p.id === parseInt(productId));

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const transactionId = generateTransactionId();
  const amount = product.price;

  const order = {
    id: nextOrderId++,
    productId: product.id,
    amount: amount,
    transactionId: transactionId,
    status: "pending",
    customerInfo: {
      name: customerName || "Test Customer",
      email: customerEmail || "test@example.com",
      phone: customerPhone || "01XXXXXXXXX",
      address: customerAddress || "Test Address",
    },
  };
  orders.push(order);

  const data = {
    total_amount: amount,
    currency: "BDT",
    tran_id: transactionId,
    success_url:
      sslcz.success_url + `?tran_id=${transactionId}&order_id=${order.id}`,
    fail_url: sslcz.fail_url + `?tran_id=${transactionId}&order_id=${order.id}`,
    cancel_url:
      sslcz.cancel_url + `?tran_id=${transactionId}&order_id=${order.id}`,
    ipn_url: sslcz.ipn_url,
    store_id: sslcz.store_id,
    store_passwd: sslcz.store_passwd,
    cus_name: order.customerInfo.name,
    cus_email: order.customerInfo.email,
    cus_add1: order.customerInfo.address,
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: order.customerInfo.phone,
    shipping_method: "NO",
    product_name: product.name,
    product_category: "Ecommerce",
    product_profile: "general",
    opt_a: order.id.toString(),
    version: "4",
  };

  try {
    const response = await sslcommerPayment.init(data);

    res.json(response);
  } catch (error) {
    console.error("SSLCommerz Error:", error);
    res
      .status(500)
      .json({ error: "Failed to initiate payment: " + error.message });
    orders.pop();
  }
});

app.post("/payment/success", async (req, res) => {
  console.log(req.body.val_id);
  const { tran_id, order_id } = req.query;

  const order = orders.find(
    (o) => o.id === parseInt(order_id) && o.transactionId === tran_id
  );

  if (order && order.status === "pending") {
    order.status = "success";

    const validationData = {
      val_id: req.body.val_id,
    };

    try {
      const validationResponse = await sslcommerPayment.validate(
        validationData
      );

      if (validationResponse && validationResponse.status === "VALIDATED") {
        //  Update order status, send success message, etc.
        res.send(
          `<h2>Payment Successful!</h2><p>Transaction ID: ${tran_id}</p><p>Order ID: ${order_id}</p><p>Validation Status: VALID</p>`
        );
      } else {
        //  Handle invalid payment
        order.status = "failed";
        res
          .status(400)
          .send(
            `<h2>Payment Successful, but Validation Failed!</h2><p>Transaction ID: ${tran_id}</p><p>Order ID: ${order_id}</p><p>Validation Status: INVALID</p><p>Reason: ${
              validationResponse.error || "Unknown"
            }</p>`
          );
      }
    } catch (validationError) {
      console.error("SSLCommerz Validation Error:", validationError);
      res
        .status(500)
        .send(
          `<h2>Payment Successful, but Validation Error!</h2><p>Transaction ID: ${tran_id}</p><p>Order ID: ${order_id}</p><p>Error: ${validationError.message}</p>`
        );
    }
  } else {
    res.status(400).send("<h2>Invalid Payment Success Callback</h2>");
  }
});

app.post("/payment/ipn", async (req, res) => {
  try {
    const validationResponse = await sslcommerPayment.validate({
      val_id: req.body.val_id,
    });

    res.send(validationResponse);
  } catch (error) {
    console.error("SSLCommerz IPN Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to handle payment failure
app.get("/payment/fail", (req, res) => {
  const { tran_id, order_id } = req.query;
  console.log("Fail Callback: tran_id:", tran_id, "order_id:", order_id);
  const order = orders.find(
    (o) => o.id === parseInt(order_id) && o.transactionId === tran_id
  );
  if (order && order.status === "pending") {
    order.status = "failed";
    res
      .status(400)
      .send(
        `<h2>Payment Failed!</h2><p>Transaction ID: ${tran_id}</p><p>Order ID: ${order_id}</p>`
      );
  } else {
    res.status(400).send("<h2>Invalid Payment Failure Callback</h2>");
  }
});

// Optional: Route to handle payment cancellation
app.get("/payment/cancel", (req, res) => {
  const { tran_id, order_id } = req.query;
  console.log("Cancel Callback: tran_id:", tran_id, "order_id:", order_id);
  const order = orders.find(
    (o) => o.id === parseInt(order_id) && o.transactionId === tran_id
  );
  if (order && order.status === "pending") {
    order.status = "cancelled";
    res.send(
      `<h2>Payment Cancelled!</h2><p>Transaction ID: ${tran_id}</p><p>Order ID: ${order_id}</p>`
    );
  } else {
    res.status(400).send("<h2>Invalid Payment Cancellation Callback</h2>");
  }
});

// Route to initiate a refund
app.post("/payment/refund", async (req, res) => {
  const { refund_amount, refund_remarks, bank_tran_id, refe_id } = req.body;

  const data = {
    refund_amount: refund_amount,
    refund_remarks: refund_remarks,
    bank_tran_id: bank_tran_id,
    refe_id: refe_id,
  };

  try {
    const response = await sslcommerPayment.initiateRefund(data);
    console.log("Refund Response:", response);
    res.json(response);
  } catch (error) {
    console.error("SSLCommerz Refund Error:", error);
    res
      .status(500)
      .json({ error: "Failed to initiate refund: " + error.message });
  }
});

// Route to query refund status
app.get("/payment/refund/status", async (req, res) => {
  const { refund_ref_id } = req.query;

  const data = {
    refund_ref_id: refund_ref_id,
  };

  try {
    const response = await sslcommerPayment.refundQuery(data);
    console.log("Refund Query Response:", response);
    res.json(response);
  } catch (error) {
    console.error("SSLCommerz Refund Query Error:", error);
    res
      .status(500)
      .json({ error: "Failed to query refund status: " + error.message });
  }
});

// Route to query transaction status by transaction ID
app.post("/payment/transaction/status/tranid", async (req, res) => {
  const { tran_id } = req.query;

  const data = {
    tran_id: tran_id,
  };

  try {
    const response = await sslcommerPayment.transactionQueryByTransactionId(
      data
    );
    console.log("Transaction Status Response (by tran_id):", response);
    res.json(response);
  } catch (error) {
    console.error("SSLCommerz Transaction Query Error (by tran_id):", error);
    res
      .status(500)
      .json({ error: "Failed to query transaction status: " + error.message });
  }
});

// Route to query transaction status by session ID
app.get("/payment/transaction/status/sessionid", async (req, res) => {
  const { sessionkey } = req.query;

  const data = {
    sessionkey: sessionkey,
  };

  try {
    const response = await sslcommerPayment.transactionQueryBySessionId(data);
    console.log("Transaction Status Response (by session ID):", response);
    res.json(response);
  } catch (error) {
    console.error("SSLCommerz Transaction Query Error (by session ID):", error);
    res
      .status(500)
      .json({ error: "Failed to query transaction status: " + error.message });
  }
});

const port = 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
