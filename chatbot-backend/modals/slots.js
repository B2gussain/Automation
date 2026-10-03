const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD
    required: true,
  },
  time: {
    type: String, // 24-hour HH:MM
    required: true,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

slotSchema.index({ date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model("Slot", slotSchema);
