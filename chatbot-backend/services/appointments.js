const Slot = require("../modals/slots");
const Appointment = require("../modals/appointment");
const { confirmEmail } = require("./confirmEmail");

async function checkAvailability(date, time) {
  const slot = await Slot.findOne({ date, time });
  return !!slot && slot.available;
}

// Returns { booked: true, appointment, emailSent } or { booked: false, reason }
async function bookAppointment({ name, phone, email, date, time }) {
  // Atomically claim the slot so two people can't book the same one
  const slot = await Slot.findOneAndUpdate(
    { date, time, available: true },
    { available: false },
    { new: true },
  );
  if (!slot) {
    return { booked: false, reason: "Slot not available or does not exist" };
  }

  try {
    const appointment = await Appointment.create({
      name,
      phone,
      email,
      date,
      time,
      slot: slot._id,
    });
    const emailSent = await confirmEmail({ name, email, date, time });
    return { booked: true, appointment, emailSent };
  } catch (err) {
    // Release the slot if saving the appointment failed
    await Slot.updateOne({ _id: slot._id }, { available: true });
    throw err;
  }
}

module.exports = { checkAvailability, bookAppointment };
