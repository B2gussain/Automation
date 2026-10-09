const Lead = require("../modals/lead");
const { calculateLeadScore } = require("./scores");

const saveLead = async (data) => {
  const { score, status } = calculateLeadScore(data);
  const lead = await Lead.create({ ...data, score, status });

  return {
    success: true,
    leadId: lead._id.toString(),
    message: "Lead saved successfully",
  };
};

module.exports = { saveLead };
