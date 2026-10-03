const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "Appointments <onboarding@resend.dev>";

// Never throws: a failed email must not undo a booking. Returns true if sent.
async function confirmEmail({ name, email, date, time }) {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Appointment Confirmation",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 10px;">
      
      <h2 style="margin-bottom: 10px;">
        Appointment Confirmed 🎉
      </h2>

      <p style="color: #555;">
        Hi ${name},
      </p>

      <p style="color: #555;">
        Your appointment has been successfully booked.
      </p>

      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 8px 0;">
          <strong>Name:</strong> ${name}
        </p>

        <p style="margin: 8px 0;">
          <strong>Date:</strong> ${date}
        </p>

        <p style="margin: 8px 0;">
          <strong>Time:</strong> ${time}
        </p>
      </div>

      <p style="color: #555;">
        Please make sure you are available at the scheduled time.
      </p>

      <p style="margin-top: 30px;">
        Thank you,<br>
        <strong>Appointment Team</strong>
      </p>

    </div>
  `,
    });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error("Confirmation email failed:", err.message);
    return false;
  }
}
module.exports = { confirmEmail };
