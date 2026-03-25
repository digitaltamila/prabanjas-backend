// api/webhook.js
// Cashfree sends payment status updates here

import crypto from "crypto";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

    // Verify webhook signature
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const signedPayload = `${timestamp}${rawBody}`;
    const expectedSig = crypto
      .createHmac("sha256", secretKey)
      .update(signedPayload)
      .digest("base64");

    if (signature !== expectedSig) {
      console.error("Webhook signature mismatch");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { data, type } = req.body;

    if (type === "PAYMENT_SUCCESS_WEBHOOK") {
      const { order, payment } = data;
      console.log("Payment success:", order.order_id, payment.cf_payment_id);
      // You can update Firestore here if needed
      // e.g., mark order as paid using Firebase Admin SDK
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
