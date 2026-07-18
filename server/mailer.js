const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.log("MAILER ERROR");
    console.log(err);
  } else {
    console.log("Mailer Ready");
  }
});

module.exports = transporter;
