const mongoose = require("mongoose");
const Lead = require("../modals/lead");

const getLead = async ({ leadId }) => {
  if (!mongoose.isValidObjectId(leadId)) {
    return { success: false, message: "Invalid leadId" };
  }

  const lead = await Lead.findById(leadId).lean();
  if (!lead) return { success: false, message: "Lead not found" };

  const { _id, __v, ...rest } = lead;
  return { success: true, lead: { id: _id.toString(), ...rest } };
};

module.exports = { getLead };
