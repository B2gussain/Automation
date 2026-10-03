const express = require("express");
const router = express.Router();
const { bookAppointment } = require("../services/appointments");

// POST /api/appointments  { "name": "Ravi", "phone": "9876543210", "email": "ravi@example.com", "date": "2026-10-05", "time": "10:00" }
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, date, time } = req.body;

    if (!name || !phone || !email || !date || !time) {
      return res
        .status(400)
        .json({ message: "name, phone, email, date and time are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "email is not valid" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "date must be YYYY-MM-DD" });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return res.status(400).json({ message: "time must be 24-hour HH:MM" });
    }

    const result = await bookAppointment({ name, phone, email, date, time });
    if (!result.booked) {
      return res.status(409).json({ message: result.reason });
    }
    res.status(201).json({
      message: "Appointment booked",
      appointment: result.appointment,
      emailSent: result.emailSent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
