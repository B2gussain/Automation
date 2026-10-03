const mongoose = require("mongoose");
const connectDB = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("mongodb conneted successfully");
    })
    .catch((error) => {
      console.log(error);
    });
};
module.exports = { connectDB };
