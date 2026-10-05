const crypto = require("crypto");
const express = require("express");
const app = express();

require("dotenv").config();
const { connectDB } = require("./config/db");
const Groq = require("groq-sdk");
const Conversation = require("./modals/conversation");
const {
  checkAvailability,
  bookAppointment,
} = require("./services/appointments");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
connectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/slots", require("./routes/slots.route"));
app.use("/api/appointments", require("./routes/appointment.route"));

app.get("/", (req, res) => {
  res.send("backend for ai chatbot is running....");
});

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
  {
    type: "function",

    function: {
      name: "bookAppointment",

      description:
        "Book an appointment slot. Only call this after the user has confirmed the date and time and has given their name, phone number and email. Ask for any missing detail first.",

      parameters: {
        type: "object",

        properties: {
          name: { type: "string", description: "Customer's full name." },
          phone: { type: "string", description: "Customer's phone number." },
          email: { type: "string", description: "Customer's email address." },
          date: {
            type: "string",
            description: "Appointment date in YYYY-MM-DD format.",
          },
          time: {
            type: "string",
            description: "Appointment time in 24-hour HH:MM format.",
          },
        },

        required: ["name", "phone", "email", "date", "time"],
      },
    },
  },
  {
    type: "function",

    function: {
      name: "confirmEmail",

      description:
        "Confirmation Email. Only call this after the booking is confirmed and pass date and time , name and email . ",

      parameters: {
        type: "object",

        properties: {
          name: { type: "string", description: "Customer's full name." },
          email: { type: "string", description: "Customer's email number." },
          date: {
            type: "string",
            description: "Appointment date in YYYY-MM-DD format.",
          },
          time: {
            type: "string",
            description: "Appointment time in 24-hour HH:MM format.",
          },
        },

        required: ["name", "email", "date", "time"],
      },
    },
  },
];

// Run a tool requested by the AI and return a JSON-serialisable result
async function runTool(name, args) {
  if (name === "checkAvailability") {
    const available = await checkAvailability(args.date, args.time);
    return { available, date: args.date, time: args.time };
  }

  if (name === "bookAppointment") {
    const result = await bookAppointment(args);
    return result.booked
      ? {
          booked: true,
          name: args.name,
          date: args.date,
          time: args.time,
          confirmationEmailSent: result.emailSent,
        }
      : { booked: false, reason: result.reason };
  }

  return { error: `Unknown tool: ${name}` };
}

// ----------------------------------
// Conversation history
// ----------------------------------

// The system prompt is rebuilt on every call (so "today" is always correct)
// and is not stored; only the user/assistant/tool messages go to MongoDB.
function systemMessage() {
  const today = new Date().toISOString().split("T")[0];

  return {
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
- To book, first make sure the slot is available, then collect the user's name, phone number and email, confirm, and use the bookAppointment tool.
- A confirmation email is sent automatically when a booking succeeds. Never ask the user whether they want one; just tell them it was sent to their email if confirmationEmailSent is true, or that it could not be sent if false.
- Never say an appointment is booked unless bookAppointment returned booked: true.
`,
  };
}

async function loadHistory(conversationId) {
  const conversation = await Conversation.findOne({ conversationId }).lean();
  return conversation ? conversation.messages : [];
}

async function saveHistory(conversationId, messages) {
  await Conversation.updateOne(
    { conversationId },
    { messages },
    { upsert: true },
  );
}

// ----------------------------------
// Send message to Groq
// ----------------------------------

async function getGroqChatCompletion(chatHistory, prompt, model) {
  chatHistory.push({
    role: "user",
    content: prompt,
  });

  return groq.chat.completions.create({
    messages: [systemMessage(), ...chatHistory],
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

    // Each user/browser keeps its own sessionId; a new one is issued if missing
    const sessionId = req.body.sessionId || crypto.randomUUID();
    const chatHistory = await loadHistory(sessionId);

    // ----------------------------------
    // First AI call
    // ----------------------------------

    const chatCompletion = await getGroqChatCompletion(
      chatHistory,
      prompt,
      model,
    );

    const message = chatCompletion.choices[0]?.message;

    console.log("AI message:", message);

    // ----------------------------------
    // Check if AI wants to call a tool
    // ----------------------------------

    if (message?.tool_calls?.length) {
      // Add AI's tool request to history
      chatHistory.push(message);

      // Run every requested tool and answer each tool_call_id
      const toolResults = [];

      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);

        console.log("Tool requested:", toolCall.function.name, args);

        const result = await runTool(toolCall.function.name, args);

        console.log("Tool result:", result);

        toolResults.push({ tool: toolCall.function.name, args, result });

        chatHistory.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // ----------------------------------
      // Second AI call
      // ----------------------------------

      const finalCompletion = await groq.chat.completions.create({
        messages: [systemMessage(), ...chatHistory],

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

      await saveHistory(sessionId, chatHistory);

      res.json({
        sessionId,

        prompt: prompt,

        tools: toolResults,

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

    await saveHistory(sessionId, chatHistory);

    res.json({
      sessionId,

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
