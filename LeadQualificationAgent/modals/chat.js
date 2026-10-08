const mongoose = require("mongoose");

// Only the fields Groq accepts are stored, so saved messages can be replayed as-is
const messageSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    content: { type: String, default: null },
    tool_calls: { type: mongoose.Schema.Types.Mixed }, // assistant tool requests
    tool_call_id: { type: String }, // tool results
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, unique: true },
    messages: [messageSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Conversation", conversationSchema);
