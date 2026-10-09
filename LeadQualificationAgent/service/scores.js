const budgetScore = (budget) => {
  if (budget > 100000) return 4;
  if (budget >= 50000) return 3;
  if (budget >= 20000) return 2;
  return 1;
};

// Free-text timeline ("this month", "2 months", "6 weeks") -> score
const timelineScore = (timeline = "") => {
  const text = timeline.toLowerCase();
  if (/(immediate|asap|now|today|this month)/.test(text)) return 4;

  const match = text.match(/(\d+)\s*(day|week|month|year)/);
  if (!match) return /next month/.test(text) ? 3 : 1;

  const months =
    { day: 1 / 30, week: 1 / 4, month: 1, year: 12 }[match[2]] * match[1];
  if (months > 6) return 1;
  if (months >= 3) return 2;
  return 3;
};

// Rough clarity guess from description length
const clarityScore = (description = "") => {
  const words = description.trim().split(/\s+/).filter(Boolean).length;
  if (words < 3) return 1;
  if (words < 6) return 2;
  return 3;
};

const calculateLeadScore = ({ budget, timeline, projectDescription }) => {
  const score =
    budgetScore(budget) +
    timelineScore(timeline) +
    clarityScore(projectDescription);

  let status = "Low Priority";
  if (score >= 8) status = "Qualified";
  else if (score >= 5) status = "Potential";

  return { score, status };
};

module.exports = { calculateLeadScore };
