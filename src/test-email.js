import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,
      subject: "Test Email",
      text: "This is a test",
    });
    console.log("✅ Test email sent", info.messageId);
  } catch (err) {
    console.error("❌ Test failed", err);
  }
}

main();
