const cron = require("node-cron");
const transporter = require("./mailer");

module.exports = (db) => {
  // Every day at 5:00 PM
  cron.schedule("0 17 * * *", () => {
    console.log("📦 Sending Daily Inventory Report...");

    db.query("SELECT * FROM products", (err, products) => {
      if (err) {
        console.log(err);
        return;
      }

      const totalProducts = products.length;

      const totalInventory = products.reduce(
        (sum, p) => sum + Number(p.inventory_available),
        0
      );

      const complied = products.filter(
        (p) => p.status === "Complied"
      ).length;

      const nonComplied = products.filter(
        (p) => p.status !== "Complied"
      ).length;

      const lowStock = products.filter(
        (p) => Number(p.inventory_available) < 50
      );

      const today = new Date().toLocaleDateString("en-IN");

      const mailOptions = {
        from: "dekuwaii45@gmail.com",
        to: "souriksasmal35@gmail.com",
        subject: "📦 Daily Inventory Summary",

        html: `
<div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:30px;">

<div style="max-width:700px;margin:auto;background:#ffffff;border-radius:15px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.15);">

<div style="background:linear-gradient(90deg,#5b21b6,#7c3aed);padding:25px;text-align:center;color:white;">
<h1 style="margin:0;">📦 Inventory Management System</h1>
<p style="margin-top:8px;">Daily Inventory Report</p>
</div>

<div style="padding:30px;">

<h2 style="color:#5b21b6;">Hello Admin 👋</h2>

<p>
This is your automated inventory report for <b>${today}</b>.
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
<td style="padding:12px;font-weight:bold;">🟢 Complied Products</td>
<td>${complied}</td>
</tr>

<tr style="background:#f7f7f7;">
<td style="padding:12px;font-weight:bold;">🔴 Non-Complied Products</td>
<td>${nonComplied}</td>
</tr>

<tr>
<td style="padding:12px;font-weight:bold;">⚠️ Low Stock Products</td>
<td>${lowStock.length}</td>
</tr>

</table>

<h3 style="margin-top:35px;color:#5b21b6;">
⚠️ Products Requiring Attention
</h3>

<table style="width:100%;border-collapse:collapse;">

<tr style="background:#5b21b6;color:white;">
<th style="padding:10px;">Product</th>
<th>Material No</th>
<th>Stock</th>
</tr>

${lowStock
  .map(
    (p) => `
<tr>
<td style="padding:10px;border-bottom:1px solid #ddd;">${p.product_name}</td>
<td style="border-bottom:1px solid #ddd;text-align:center;">${p.material_no}</td>
<td style="border-bottom:1px solid #ddd;text-align:center;color:red;font-weight:bold;">${p.inventory_available}</td>
</tr>
`
  )
  .join("")}

</table>

<p style="margin-top:35px;color:#666;">
This email was generated automatically by the
<b>Inventory Management System</b>.
</p>

</div>

<div style="background:#f4f4f4;padding:15px;text-align:center;color:#777;font-size:13px;">
React • Node.js • Express • MySQL • Gemini AI
</div>

</div>

</div>
`,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log("❌ Email Error:", err);
        } else {
          console.log("✅ Daily Report Sent Successfully");
        }
      });
    });
  });
};