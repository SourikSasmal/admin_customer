const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

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

  const sql = `
        INSERT INTO orders
        (customer_id, product_id, quantity, delivery_date)
        VALUES (?, ?, ?, ?)
    `;

  db.query(
    sql,
    [customer_id, product_id, quantity, delivery_date],
    (err, result) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          message: "Database Error",
        });
      }

      res.json({
        message: "Order Placed Successfully",
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
      orders.delivery_date

    FROM orders

    JOIN customers
      ON orders.customer_id = customers.customer_id

    JOIN products
      ON orders.product_id = products.product_id
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

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
