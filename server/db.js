const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "3108",
  database: "inventory_system",
});

db.connect((err) => {
  if (err) {
    console.log("Database Connection Failed");
    console.log(err);
    return;
  }

  console.log("MySQL Connected");
});

module.exports = db;
