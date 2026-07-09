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
