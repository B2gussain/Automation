const { calculateLeadScore } = require("./scores");
const { saveLead } = require("./saveLead");
const { getLead } = require("./getLead");

const leadFields = {
  name: { type: "string", description: "Customer's full name" },
  email: { type: "string", description: "Customer's email address" },
  phone: { type: "string", description: "Customer's phone number (optional)" },
  company: { type: "string", description: "Customer's company (optional)" },
  service: { type: "string", description: "Service the customer needs" },
  projectDescription: {
    type: "string",
    description: "Short description of the project",
  },
  budget: {
    type: "number",
    description: "Budget in INR as a number, e.g. 80000",
  },
  timeline: {
    type: "string",
    description: "When the customer wants to start, e.g. 'This month'",
  },
};

const { budget, timeline, projectDescription } = leadFields;

const tools = [
  {
    type: "function",
    function: {
      name: "calculateLeadScore",
      description:
        "Calculate the lead score and status from budget, timeline and project description.",
      parameters: {
        type: "object",
        properties: { budget, timeline, projectDescription },
        required: ["budget", "timeline", "projectDescription"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "saveLead",
      description:
        "Save the lead to the database. Only call after the customer confirmed all details. Never call with missing required fields.",
      parameters: {
        type: "object",
        properties: leadFields,
        required: [
          "name",
          "email",
          "service",
          "projectDescription",
          "budget",
          "timeline",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLead",
      description: "Retrieve a saved lead by its leadId.",
      parameters: {
        type: "object",
        properties: {
          leadId: { type: "string", description: "The lead's id" },
        },
        required: ["leadId"],
      },
    },
  },
];

const handlers = {
  calculateLeadScore: async (args) => calculateLeadScore(args),
  saveLead,
  getLead,
};

// Always returns a JSON string so the model can read it, even on failure
const runTool = async (name, rawArgs) => {
  try {
    if (!handlers[name])
      return JSON.stringify({
        success: false,
        message: `Unknown tool ${name}`,
      });
    return JSON.stringify(await handlers[name](JSON.parse(rawArgs || "{}")));
  } catch (err) {
    return JSON.stringify({ success: false, message: err.message });
  }
};

module.exports = { tools, runTool };
