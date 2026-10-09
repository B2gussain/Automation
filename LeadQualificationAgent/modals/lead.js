const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    company: String,
    service: { type: String, required: true },
    projectDescription: { type: String, required: true },
    budget: { type: Number, required: true },
    timeline: { type: String, required: true },
    score: Number,
    status: {
      type: String,
      enum: ["New", "Potential", "Qualified", "Low Priority", "Contacted", "Converted", "Lost"],
      default: "New",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Lead", leadSchema);
