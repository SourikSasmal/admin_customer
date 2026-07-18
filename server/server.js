require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is working!");
});

app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  const sql = `
        INSERT INTO customers(username,email,password)
        VALUES(?,?,?)
    `;

  db.query(sql, [username, email, password], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        message: "Database Error",
      });
    }

    res.json({
      message: "Signup Successful",
    });
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = `
        SELECT * FROM customers
        WHERE email = ? AND password = ?
    `;

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        message: "Database Error",
      });
    }

    if (result.length > 0) {
      res.json({
        success: true,
        message: "Login Successful",
        user: result[0],
      });
    } else {
      res.json({
        success: false,
        message: "Invalid Email or Password",
      });
    }
  });
});

app.get("/products", (req, res) => {
  const sql = `
        SELECT * FROM products
    `;

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Database Error",
      });
    }

    res.json(result);
  });
});

app.post("/place-order", (req, res) => {
  const { customer_id, product_id, quantity, delivery_date } = req.body;

  const insertOrder = `
    INSERT INTO orders
    (customer_id, product_id, quantity, order_date, delivery_date)
    VALUES (?, ?, ?, CURDATE(), ?)
  `;

  db.query(
    insertOrder,
    [customer_id, product_id, quantity, delivery_date],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          message: "Database Error",
        });
      }

      const updateStock = `
        UPDATE products
        SET inventory_available = inventory_available - ?
        WHERE product_id = ?
      `;

      db.query(updateStock, [quantity, product_id], (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            message: "Database Error",
          });
        }

        const updateStatus = `
          UPDATE products
          SET status =
          CASE
            WHEN inventory_available > 0 THEN 'Complied'
            ELSE 'Non-Complied'
          END
          WHERE product_id = ?
        `;

        db.query(updateStatus, [product_id], (err) => {
          if (err) {
            console.log(err);
            return res.status(500).json({
              message: "Database Error",
            });
          }

          res.json({
            message: "Order Placed Successfully",
          });
        });
      });
    },
  );
});

app.get("/orders/:customerId", (req, res) => {
  const customerId = req.params.customerId;

  const sql = `
        SELECT
             orders.order_id,
             products.product_name,
             orders.quantity,
             orders.order_date,
             orders.delivery_date

        FROM orders

        JOIN products
        ON orders.product_id = products.product_id

        WHERE orders.customer_id = ?
    `;

  db.query(sql, [customerId], (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        message: "Database Error",
      });
    }

    res.json(result);
  });
});

app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    //did this because theres only one admin
    return res.json({
      success: true,
      message: "Admin Login Successful",
    });
  }

  return res.json({
    success: false,
    message: "Invalid Username or Password",
  });
});

app.get("/admin/products", (req, res) => {
  const sql = "SELECT * FROM products";

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        message: "Database Error",
      });
    }

    res.json(result);
  });
});

app.post("/admin/add-product", (req, res) => {
  const { material_no, product_name, inventory_available, available_date } =
    req.body;

  const sql = `
    INSERT INTO products
    (material_no, product_name, inventory_available, available_date)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [material_no, product_name, inventory_available, available_date],
    (err) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          message: "Database Error",
        });
      }

      res.json({
        message: "Product Added Successfully",
      });
    },
  );
});

app.delete("/admin/delete-product/:id", (req, res) => {
  const id = req.params.id;

  const sql = `
    DELETE FROM products
    WHERE product_id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log(err);

      return res.status(400).json({
        message: "Cannot delete product. It has existing orders.",
      });
    }

    res.json({
      message: "Product Deleted Successfully",
    });
  });
});

app.get("/admin/orders", (req, res) => {
  const sql = `
    SELECT
      orders.order_id,
      customers.username,
      products.product_name,
      orders.quantity,
      orders.order_date,
      orders.delivery_date

    FROM orders

    JOIN customers
      ON orders.customer_id = customers.customer_id

    JOIN products
      ON orders.product_id = products.product_id

    ORDER BY orders.order_id DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        message: "Database Error",
      });
    }

    res.json(result);
  });
});

const startDailyReport = require("./dailyReport");

startDailyReport(db);

app.post("/chatbot", (req, res) => {
  const { message } = req.body;

  const sql = `
    SELECT
      product_name,
      material_no,
      inventory_available,
      available_date,
      status
    FROM products
  `;

  db.query(sql, async (err, products) => {
    if (err) {
      return res.status(500).json({
        reply: "Database Error",
      });
    }

    try {
      const inventory = products
        .map(
          (p) =>
            `Product: ${p.product_name}
Material No: ${p.material_no}
Available: ${p.inventory_available}
Status: ${p.status}
Available Date: ${new Date(p.available_date).toLocaleDateString()}`,
        )
        .join("\n\n");

      const prompt = `
You are an Inventory Management Assistant.

Rules:
- If the user says "hi", "hello", "hey", or greets you, greet them back politely.
- If the user asks about inventory, product availability, material number, stock, status, or delivery, answer using ONLY the inventory information below.
- If the answer is not present in the inventory, say "I couldn't find that product."
- If the user asks something completely unrelated (like jokes, weather, coding, movies, etc.), reply:
"I can only answer questions related to inventory and products."

Inventory:

${inventory}

User Question:
${message}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({
        reply: response.text,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        reply: "Gemini Error",
      });
    }
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});


//for femo report
app.get("/send-demo-report", (req, res) => {
  db.query("SELECT * FROM products", (err, products) => {
    if (err) {
      return res.send(err);
    }

    const totalProducts = products.length;

    const totalInventory = products.reduce(
      (sum, p) => sum + Number(p.inventory_available),
      0,
    );

    const complied = products.filter((p) => p.status === "Complied").length;

    const nonComplied = products.filter((p) => p.status !== "Complied").length;

    const lowStock = products.filter((p) => p.inventory_available < 50).length;

    const transporter = require("./mailer");

    transporter.sendMail(
      {
        from: "dekuwaii45@gmail.com",
        to: "souriksasmal35@gmail.com",
        subject: "📦 Daily Inventory Report",
        html: `
<div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px;">

<div style="max-width:650px;margin:auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,.15);">

<div style="background:linear-gradient(90deg,#5b21b6,#7c3aed);padding:25px;text-align:center;color:white;">
<h1 style="margin:0;">📦 Inventory Management System</h1>
<p style="margin-top:8px;">Daily Inventory Report</p>
</div>

<div style="padding:30px;">

<h2 style="color:#5b21b6;">Hello Admin 👋</h2>

<p>
Here is today's inventory summary generated automatically.
</p>

<table style="width:100%;border-collapse:collapse;margin-top:20px;">

<tr>
<td style="padding:12px;font-weight:bold;">📦 Total Products</td>
<td>${totalProducts}</td>
</tr>

<tr style="background:#f7f7f7;">
<td style="padding:12px;font-weight:bold;">📊 Total Inventory</td>
<td>${totalInventory} Units</td>
</tr>

<tr>
<td style="padding:12px;font-weight:bold;">🟢 Complied</td>
<td>${complied}</td>
</tr>

<tr style="background:#f7f7f7;">
<td style="padding:12px;font-weight:bold;">🔴 Non-Complied</td>
<td>${nonComplied}</td>
</tr>

<tr>
<td style="padding:12px;font-weight:bold;">⚠ Low Stock</td>
<td>${lowStock}</td>
</tr>

</table>

<h3 style="margin-top:35px;color:#5b21b6;">
⚠ Low Stock Products
</h3>

<table style="width:100%;border-collapse:collapse;">

<tr style="background:#5b21b6;color:white;">
<th style="padding:10px;">Product</th>
<th>Material</th>
<th>Stock</th>
<th>Status</th>
</tr>

${products
  .filter((p) => p.inventory_available < 50)
  .map(
    (p) => `
<tr>
<td style="padding:10px;border-bottom:1px solid #ddd;">${p.product_name}</td>
<td style="border-bottom:1px solid #ddd;">${p.material_no}</td>
<td style="border-bottom:1px solid #ddd;">${p.inventory_available}</td>
<td style="color:red;font-weight:bold;border-bottom:1px solid #ddd;">Low</td>
</tr>
`,
  )
  .join("")}

</table>

<p style="margin-top:35px;color:#666;">
This report was generated automatically by the
<b>Inventory Management System</b>.
</p>

</div>

<div style="background:#f7f7f7;padding:15px;text-align:center;color:#777;font-size:13px;">
React • Node.js • Express • MySQL
</div>

</div>

</div>
`,
      },
      (err, info) => {
        if (err) {
          console.log(err);
          return res.status(500).send(err.message);
        }

        console.log(info.response);
        res.send("Email Sent Successfully");
      },
    );
  });
});
