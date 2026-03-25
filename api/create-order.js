// api/create-order.js
// Vercel Serverless Function — creates a Cashfree payment session

export default async function handler(req, res) {
  // Allow CORS from your Hostinger domain
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    orderId,
    amount,
    customerName,
    customerPhone,
    customerEmail,
  } = req.body;

  // Validate required fields
  if (!orderId || !amount || !customerPhone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Get keys from environment variables (set in Vercel dashboard)
  const appId     = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const env       = process.env.CASHFREE_ENV || "sandbox"; // "sandbox" or "production"

  if (!appId || !secretKey) {
    return res.status(500).json({ error: "Cashfree credentials not configured" });
  }

  const baseUrl = env === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: `cust_${customerPhone}`,
          customer_name: customerName || "Customer",
          customer_phone: customerPhone,
          customer_email: customerEmail || "customer@prabanjas.shop",
        },
        order_meta: {
          return_url: `${process.env.SITE_URL}/payment-success?order_id={order_id}`,
          notify_url: `${process.env.VERCEL_URL}/api/webhook`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Cashfree error:", data);
      return res.status(400).json({ error: data.message || "Failed to create order" });
    }

    // Return the payment_session_id to frontend
    return res.status(200).json({
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status,
    });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
