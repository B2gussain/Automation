require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");
const { connectDB } = require("./config/db");
const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();

const chat = [
  {
    role: "system",
    content: "Act as a Lead Qualification AI Agent.",
  },
  {
    role: "user",
    content: "I need a website for my restaurant.",
  },
  {
    role: "assistant",
    content: "Sure! What features do you need?",
  },
  {
    role: "user",
    content: "I need online ordering and table booking.",
  },
];
async function startChat(content) {
  const chatCompletion = await getGroqChatCompletion(content);
  console.log(chatCompletion.choices[0]?.message?.content || "");
}

async function getGroqChatCompletion(content) {
  return groq.chat.completions.create({
    messages: chat,
    model: "openai/gpt-oss-20b",
  });
}

app.get("/", (req, res) => {
  res.send("Lead Qualification AI Agent Server Running...");
});
app.listen(4000, () => {
  console.log("server run on port 4000");
  startChat();
});
