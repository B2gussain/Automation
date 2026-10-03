const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:MM
    slot: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Appointment", appointmentSchema);
