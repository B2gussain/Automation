require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");
const { connectDB } = require("./config/db");
const Conversation = require("./modals/chat");
const { tools, runTool } = require("./service/tools");
const Lead = require("./modals/lead");
const { getLead } = require("./service/getLead");
const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();

const SYSTEM_PROMPT = {
  role: "system",
  content: `You are a Lead Qualification AI Agent for a software company.

Services we offer: Website Development, Web Application Development, Mobile App Development, AI Chatbot Development, AI Automation, Custom Software Development.

Your job is to talk naturally with potential customers and collect:
- name (required)
- email (required)
- service (required)
- projectDescription (required)
- budget (required)
- timeline (required)
- phone and company (optional, only if the customer offers them)

Rules:
- Be friendly, short and conversational.
- Ask for only one or two missing details at a time, never everything at once.
- Never ask for something the customer already told you. Read the whole conversation first.
- Never invent or assume a budget, email, phone number, name or any other customer detail, and never change what the customer said.
- Never make up prices, discounts or company policies. If asked about pricing, say the team will discuss it after reviewing the project.
- If the request is outside our services, say so politely.
- When all required details are collected, summarize them and ask the customer to confirm they are correct.
- After the customer confirms, call calculateLeadScore, then saveLead. Never call saveLead with missing or guessed details.
- Never say the lead was submitted unless saveLead returned success. If it failed, ask the customer for the missing or corrected details.
- Do not tell the customer their score. You cannot notify the team yet, so just say the team will review the details.
- Use getLead only when the customer gives you a leadId.`,
};

async function getGroqChatCompletion(messages) {
  return groq.chat.completions.create({
    messages: [
      SYSTEM_PROMPT,
      ...messages
        .filter((m) => m.role !== "system")
        .map(({ role, content, tool_calls, tool_call_id }) => ({
          role,
          content,
          tool_calls,
          tool_call_id,
        })),
    ],
    model: "openai/gpt-oss-120b",
    tools,
  });
}

app.get("/", (req, res) => {
  res.send("Lead Qualification AI Agent Server Running...");
});

app.post("/ai", async (req, res) => {
  const { conversationId, content } = req.body;

  let chat = await Conversation.findOne({ conversationId });
  if (!chat) chat = new Conversation({ conversationId, messages: [] });

  chat.messages.push({ role: "user", content });

  let reply = "";
  for (let i = 0; i < 5; i++) {
    const completion = await getGroqChatCompletion(chat.messages);
    const message = completion.choices[0].message;
    chat.messages.push({
      role: "assistant",
      content: message.content,
      tool_calls: message.tool_calls,
    });

    if (!message.tool_calls?.length) {
      reply = message.content;
      break;
    }
    for (const call of message.tool_calls) {
      const result = await runTool(call.function.name, call.function.arguments);
      chat.messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }
  await chat.save();

  res.json({ reply });
});

app.get("/api/leads", async (req, res) => {
  const leads = await Lead.find().sort({ createdAt: -1 });
  res.json({ success: true, count: leads.length, leads });
});

app.get("/api/leads/:id", async (req, res) => {
  const result = await getLead({ leadId: req.params.id });
  res.status(result.success ? 200 : 404).json(result);
});

app.listen(4000, () => {
  console.log("server run on port 4000");
});
