const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotificationTemplate",
    },
    channel: {
      type: String,
      required: true,
      enum: ["email", "in_app"],
    },
    subject: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["queued", "sent", "failed"],
      default: "queued",
      index: true,
    },
    sentAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    seenAt: {
      type: Date,
    },
    error: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ channel: 1, createdAt: -1 });
notificationSchema.index({ readAt: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
