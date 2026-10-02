const express = require("express");
const app = express();

require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("backend for ai chatbot is running....");
});

// ----------------------------------
// Available appointment slots
// ----------------------------------

const availableSlots = [
  { date: "2026-10-02", time: "16:00" },
  { date: "2026-10-02", time: "17:00" },
  { date: "2026-10-03", time: "10:00" },
];

// ----------------------------------
// Actual JavaScript function
// ----------------------------------

function checkAvailability(date, time) {
  return availableSlots.some((slot) => {
    return slot.date === date && slot.time === time;
  });
}

// ----------------------------------
// Get today's date dynamically
// ----------------------------------

const today = new Date().toISOString().split("T")[0];

console.log("Today's date:", today);

// ----------------------------------
// Tell AI about our function
// ----------------------------------

const tools = [
  {
    type: "function",

    function: {
      name: "checkAvailability",

      description:
        "Check whether an appointment slot is available. The date must be YYYY-MM-DD and the time must be 24-hour HH:MM.",

      parameters: {
        type: "object",

        properties: {
          date: {
            type: "string",
            description:
              "Appointment date in YYYY-MM-DD format. Resolve words like today and tomorrow using the current date provided in the system message.",
          },

          time: {
            type: "string",
            description:
              "Appointment time in 24-hour HH:MM format. Example: 10 PM = 22:00, 4 PM = 16:00.",
          },
        },

        required: ["date", "time"],
      },
    },
  },
];

// ----------------------------------
// Conversation history
// ----------------------------------

const chatHistory = [
  {
    role: "system",

    content: `
You are an appointment assistant.

Today's date is ${today}.

When the user asks about an appointment:

- Convert the requested date to YYYY-MM-DD.
- Convert the requested time to 24-hour HH:MM format.
- "today" means ${today}.
- "tomorrow" means the day after ${today}.
- 10 PM = 22:00.
- 10 AM = 10:00.
- 4 PM = 16:00.
- Never guess or change the user's requested date or time.
- When the user asks about availability, use the checkAvailability tool.
`,
  },
];

// ----------------------------------
// Send message to Groq
// ----------------------------------

async function getGroqChatCompletion(prompt, model) {
  chatHistory.push({
    role: "user",
    content: prompt,
  });

  return groq.chat.completions.create({
    messages: chatHistory,
    model: model,

    tools: tools,

    tool_choice: "auto",
  });
}

// ----------------------------------
// /ai route
// ----------------------------------

app.post("/ai", async (req, res) => {
  try {
    const { prompt, model } = req.body;

    // ----------------------------------
    // First AI call
    // ----------------------------------

    const chatCompletion = await getGroqChatCompletion(prompt, model);

    const message = chatCompletion.choices[0]?.message;

    console.log("AI message:", message);

    // ----------------------------------
    // Check if AI wants to call a tool
    // ----------------------------------

    if (message?.tool_calls?.length) {
      const toolCall = message.tool_calls[0];

      console.log("Tool requested:", toolCall.function.name);

      // Get arguments from AI
      const args = JSON.parse(toolCall.function.arguments);

      console.log("Tool arguments:", args);

      // ----------------------------------
      // Execute our actual JavaScript function
      // ----------------------------------

      const result = checkAvailability(args.date, args.time);

      console.log("Tool result:", result);

      // ----------------------------------
      // Add AI's tool request to history
      // ----------------------------------

      chatHistory.push(message);

      // ----------------------------------
      // Add tool result to history
      // ----------------------------------

      chatHistory.push({
        role: "tool",

        tool_call_id: toolCall.id,

        content: JSON.stringify({
          available: result,
          date: args.date,
          time: args.time,
        }),
      });

      // ----------------------------------
      // Second AI call
      // ----------------------------------

      const finalCompletion = await groq.chat.completions.create({
        messages: chatHistory,

        model: model,

        tools: tools,

        tool_choice: "auto",
      });

      const finalMessage = finalCompletion.choices[0]?.message;

      console.log("Final AI message:", finalMessage);

      // Save final AI response
      chatHistory.push({
        role: "assistant",
        content: finalMessage?.content || "",
      });

      // ----------------------------------
      // Send final response
      // ----------------------------------

      res.json({
        prompt: prompt,

        tool: toolCall.function.name,

        arguments: args,

        availability: result ? "available" : "unavailable",

        response: finalMessage?.content || "Something went wrong😭",

        success: true,
      });

      return;
    }

    // ----------------------------------
    // Normal AI response
    // ----------------------------------

    const aiResponse = message?.content || "Something went wrong😭";

    chatHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    res.json({
      prompt: prompt,

      response: aiResponse,

      success: true,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      prompt: req.body.prompt,

      response: error.message || "Server Error😭",

      success: false,
    });
  }
});

// ----------------------------------
// Start server
// ----------------------------------

app.listen(4000, () => {
  console.log("backend is running on port:4000");
});
