const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const uniqeValidator = require("mongoose-unique-validator");

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 7 },
  image: { type: String, required: true },
  places: [{ type: mongoose.Types.ObjectId, required: true, ref: "Place" }],
});
userSchema.plugin(uniqeValidator);

module.exports = mongoose.model("User", userSchema);
