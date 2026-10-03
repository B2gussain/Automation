const express = require("express");
const router = express.Router();
const Slot = require("../modals/slots");

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const toTime = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

// POST /api/slots  { "date": "2026-10-05", "startTime": "09:00", "endTime": "22:00" }
// Saves 1-hour slots for that date: 09:00, 10:00, ... 21:00
router.post("/", async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;

    if (!date || !startTime || !endTime) {
      return res
        .status(400)
        .json({ message: "date, startTime and endTime are required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "date must be YYYY-MM-DD" });
    }
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRe.test(startTime) || !timeRe.test(endTime)) {
      return res.status(400).json({ message: "times must be 24-hour HH:MM" });
    }

    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start >= end) {
      return res
        .status(400)
        .json({ message: "endTime must be after startTime" });
    }

    const slots = [];
    for (let t = start; t + 60 <= end; t += 60) {
      slots.push({ date, time: toTime(t), available: true });
    }

    // ordered:false skips slots that already exist (unique date+time index)
    let created = slots.length;
    try {
      await Slot.insertMany(slots, { ordered: false });
    } catch (err) {
      if (err.code !== 11000 && !err.writeErrors) throw err;
      created = err.insertedDocs ? err.insertedDocs.length : 0;
    }

    res.status(201).json({
      message: "Slots saved",
      date,
      created,
      skippedExisting: slots.length - created,
      slots: slots.map((s) => s.time),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/slots?date=2026-10-05            -> all available slots for the date
// GET /api/slots?date=2026-10-05&time=10:00 -> is that specific slot available?
router.get("/", async (req, res) => {
  try {
    const { date, time } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "date (YYYY-MM-DD) is required" });
    }

    if (time) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
        return res.status(400).json({ message: "time must be 24-hour HH:MM" });
      }
      const slot = await Slot.findOne({ date, time });
      return res.json({
        date,
        time,
        available: !!slot && slot.available,
      });
    }

    const slots = await Slot.find({ date, available: true }).sort("time");
    res.json({
      date,
      availableSlots: slots.map((s) => s.time),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
