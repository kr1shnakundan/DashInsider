const mongoose = require("mongoose");

const customerNoteSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    visibility: {
      type: String,
      enum: ["internal"],
      default: "internal",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerNote", customerNoteSchema);
