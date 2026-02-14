const Notification = require("../models/Notification");
const NotificationTemplate = require("../models/NotificationTemplate");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const mailSender = require("../utils/MailSender");

const replaceVariables = (template, variables) => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  });
  return result;
};

const logAudit = async (payload) => {
  try {
    await AuditLog.create(payload);
  } catch (error) {
    console.error("Audit log error:", error);
  }
};

// ============ POST /admin/customers/:id/notify ============
exports.notifySpecificCustomer = async (req, res) => {
  let adminId;
  let customerId;
  let templateId;
  let subject;
  let body;
  let channel;
  try {
    adminId = req.user.id;
    customerId = req.params.id;
    ({ templateId, subject, body, channel = "both" } = req.body);
    const { metadata = {} } = req.body;

    if (req.user.accountType !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin users can send notifications",
        auditLogged: true,
      });
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        auditLogged: true,
      });
    }

    let finalSubject = subject;
    let finalBody = body;
    let finalTemplateId = templateId;

    // If templateId provided, fetch and use template
    if (templateId) {
      const template = await NotificationTemplate.findOne({
        _id: templateId,
        isActive: true,
      });
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Notification template not found or inactive",
          auditLogged: true,
        });
      }

      // Prepare variables for template replacement
      const templateVariables = {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        fullName: `${customer.firstName} ${customer.lastName}`,
        ...metadata,
      };

      finalSubject = replaceVariables(template.subject, templateVariables);
      finalBody = replaceVariables(template.body, templateVariables);
    }

    if (!finalSubject || !finalBody) {
      return res.status(400).json({
        success: false,
        message: "Subject and body are required",
        auditLogged: true,
      });
    }

    if (![["email", "in_app", "both"]].flat().includes(channel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel. Must be 'email', 'in_app', or 'both'",
        auditLogged: true,
      });
    }

    const channels = channel === "both" ? ["email", "in_app"] : [channel];
    const createdNotifications = [];
    const errors = [];

    // Send via email if applicable
    if (channels.includes("email")) {
      try {
        await mailSender(customer.email, finalSubject, finalBody);

        const emailNotification = await Notification.create({
          recipientId: customerId,
          templateId: finalTemplateId || null,
          channel: "email",
          subject: finalSubject,
          title: finalSubject,
          body: finalBody,
          status: "sent",
          sentAt: new Date(),
          sentBy: adminId,
          metadata,
        });

        createdNotifications.push(emailNotification);
      } catch (error) {
        console.error("Email send error:", error);
        
        // Create a failed notification record
        const failedEmailNotif = await Notification.create({
          recipientId: customerId,
          templateId: finalTemplateId || null,
          channel: "email",
          subject: finalSubject,
          title: finalSubject,
          body: finalBody,
          status: "failed",
          error: error.message,
          sentBy: adminId,
          metadata,
        });

        createdNotifications.push(failedEmailNotif);
        errors.push(`Email failed: ${error.message}`);
      }
    }

    // Store in-app notification if applicable
    if (channels.includes("in_app")) {
      try {
        const inAppNotification = await Notification.create({
          recipientId: customerId,
          templateId: finalTemplateId || null,
          channel: "in_app",
          title: finalSubject,
          body: finalBody,
          status: "sent",
          sentAt: new Date(),
          sentBy: adminId,
          metadata,
        });

        createdNotifications.push(inAppNotification);
      } catch (error) {
        console.error("In-app notification error:", error);
        errors.push(`In-app notification failed: ${error.message}`);
      }
    }

    // Create audit log
    try {
      await AuditLog.create({
        actorId: adminId,
        action: "notification:send",
        targetType: "User",
        targetId: customerId,
        metadata: {
          templateId: finalTemplateId,
          channels: channels,
          subject: finalSubject,
        },
        status: errors.length === 0 ? "success" : "failure",
        errorMessage: errors.length > 0 ? errors.join(", ") : undefined,
      });
    } catch (error) {
      console.error("Audit log error:", error);
    }

    return res.status(200).json({
      success: errors.length === 0,
      message: errors.length === 0
        ? "Notification sent successfully"
        : "Notification sent with some errors",
      auditLogged: true,
      data: {
        notifications: createdNotifications,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Error in notifySpecificCustomer:", error);
    await logAudit({
      actorId: adminId,
      action: "notification:send",
      targetType: "User",
      targetId: customerId || adminId,
      status: "failure",
      errorMessage: error.message,
      metadata: {
        templateId: templateId,
        channel: channel,
        subject: subject,
      },
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      auditLogged: true,
    });
  }
};

// ============ POST /admin/notifications/send ============
// Send manual notification to multiple users
exports.sendNotifications = async (req, res) => {
  let adminId;
  let templateId;
  let subject;
  let body;
  let channel;
  try {
    adminId = req.user.id;
    ({ templateId, subject, body, channel = "both" } = req.body);
    const { userIds, metadata = {} } = req.body;

    if (req.user.accountType !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin users can send notifications",
        auditLogged: true,
      });
    }

    if (!templateId && !subject) {
      return res.status(400).json({
        success: false,
        message: "Either templateId or subject is required",
        auditLogged: true,
      });
    }

    if (!templateId && !body) {
      return res.status(400).json({
        success: false,
        message: "Either templateId or body is required",
        auditLogged: true,
      });
    }

    if (![["email", "in_app", "both"]].flat().includes(channel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel. Must be 'email', 'in_app', or 'both'",
        auditLogged: true,
      });
    }

    let template = null;
    if (templateId) {
      template = await NotificationTemplate.findOne({
        _id: templateId,
        isActive: true,
      });
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Notification template not found or inactive",
          auditLogged: true,
        });
      }
    }

    const channels = channel === "both" ? ["email", "in_app"] : [channel];

    let users;
    if (userIds && userIds.length > 0) {
      users = await User.find({ _id: { $in: userIds } });
    } else {
      // If no userIds provided, send to all users
      users = await User.find({});
    }

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found to notify",
        auditLogged: true,
      });
    }

    const createdNotifications = [];
    const failedRecipients = [];
    let emailSendCount = 0;
    let inAppSendCount = 0;

    // Send to each user
    for (const user of users) {
      try {
        const templateVariables = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          fullName: `${user.firstName} ${user.lastName}`,
          ...metadata,
        };

        const finalSubject = template
          ? replaceVariables(template.subject, templateVariables)
          : subject;

        const finalBody = template
          ? replaceVariables(template.body, templateVariables)
          : body;

        // Send via email if applicable
        if (channels.includes("email")) {
          try {
            await mailSender(user.email, finalSubject, finalBody);

            const emailNotification = await Notification.create({
              recipientId: user._id,
              templateId: templateId || null,
              channel: "email",
              subject: finalSubject,
              title: finalSubject,
              body: finalBody,
              status: "sent",
              sentAt: new Date(),
              sentBy: adminId,
              metadata,
            });

            createdNotifications.push(emailNotification);
            emailSendCount++;
          } catch (error) {
            console.error(`Email send error for ${user.email}:`, error);

            const failedEmailNotif = await Notification.create({
              recipientId: user._id,
              templateId: templateId || null,
              channel: "email",
              subject: finalSubject,
              title: finalSubject,
              body: finalBody,
              status: "failed",
              error: error.message,
              sentBy: adminId,
              metadata,
            });

            createdNotifications.push(failedEmailNotif);
            failedRecipients.push({
              userId: user._id,
              email: user.email,
              channel: "email",
              error: error.message,
            });
          }
        }

        // Store in-app notification if applicable
        if (channels.includes("in_app")) {
          try {
            const inAppNotification = await Notification.create({
              recipientId: user._id,
              templateId: templateId || null,
              channel: "in_app",
              title: finalSubject,
              body: finalBody,
              status: "sent",
              sentAt: new Date(),
              sentBy: adminId,
              metadata,
            });

            createdNotifications.push(inAppNotification);
            inAppSendCount++;
          } catch (error) {
            console.error(`In-app notification error for ${user._id}:`, error);
            failedRecipients.push({
              userId: user._id,
              email: user.email,
              channel: "in_app",
              error: error.message,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing user ${user._id}:`, error);
        failedRecipients.push({
          userId: user._id,
          email: user.email,
          error: error.message,
        });
      }
    }

    await logAudit({
      actorId: adminId,
      action: "notification:bulk-send",
      targetType: "User",
      targetId: adminId,
      metadata: {
        templateId: templateId,
        channels: channels,
        subject: template ? template.subject : subject,
        recipientCount: users.length,
        successCount: createdNotifications.length,
        failureCount: failedRecipients.length,
      },
      status: failedRecipients.length === 0 ? "success" : "failure",
      errorMessage: failedRecipients.length > 0
        ? `Failed to send to ${failedRecipients.length} recipients`
        : undefined,
    });

    return res.status(200).json({
      success: failedRecipients.length === 0,
      message: failedRecipients.length === 0
        ? "Notifications sent successfully to all recipients"
        : `Notifications sent with errors. ${failedRecipients.length} failed.`,
      auditLogged: true,
      data: {
        totalRecipients: users.length,
        successCount: createdNotifications.length,
        failureCount: failedRecipients.length,
        emailSentCount: emailSendCount,
        inAppSentCount: inAppSendCount,
        failedRecipients: failedRecipients.length > 0 ? failedRecipients : undefined,
      },
    });
  } catch (error) {
    console.error("Error in sendNotifications:", error);
    await logAudit({
      actorId: adminId,
      action: "notification:bulk-send",
      targetType: "User",
      targetId: adminId,
      status: "failure",
      errorMessage: error.message,
      metadata: {
        templateId: templateId,
        channel: channel,
        subject: subject,
      },
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      auditLogged: true,
    });
  }
};

// ============ POST /admin/notifications/templates ============
// Create a new notification template
exports.createNotificationTemplate = async (req, res) => {
  let adminId;
  let name;
  let channel;

  try {
    adminId = req.user.id;
    ({ name, channel = "both" } = req.body);
    const { subject, body, variables = [], description } = req.body;

    if (req.user.accountType !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin users can create notification templates",
        auditLogged: true,
      });
    }

    if (!name || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: "Name, subject, and body are required",
        auditLogged: true,
      });
    }

    if (![["email", "in_app", "both"]].flat().includes(channel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel. Must be 'email', 'in_app', or 'both'",
        auditLogged: true,
      });
    }

    const existingTemplate = await NotificationTemplate.findOne({ name });
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: "Template with this name already exists",
        auditLogged: true,
      });
    }

    // Create template
    const newTemplate = await NotificationTemplate.create({
      name,
      subject,
      body,
      channel,
      variables: Array.isArray(variables) ? variables : [],
      description,
      createdBy: adminId,
    });

    await logAudit({
      actorId: adminId,
      action: "notification:template-create",
      targetType: "NotificationTemplate",
      targetId: newTemplate._id,
      status: "success",
      metadata: {
        name,
        channel,
      },
    });

    // Populate createdBy
    const populatedTemplate = await NotificationTemplate.findById(newTemplate._id)
      .populate("createdBy", "firstName lastName email");

    return res.status(201).json({
      success: true,
      message: "Notification template created successfully",
      auditLogged: true,
      data: {
        template: populatedTemplate,
      },
    });
  } catch (error) {
    console.error("Error in createNotificationTemplate:", error);
    await logAudit({
      actorId: adminId,
      action: "notification:template-create",
      targetType: "NotificationTemplate",
      targetId: adminId,
      status: "failure",
      errorMessage: error.message,
      metadata: {
        name,
        channel,
      },
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      auditLogged: true,
    });
  }
};

// ============ PATCH /admin/notifications/templates/:id/deactivate ============
exports.deactivateNotificationTemplate = async (req, res) => {
  let adminId;
  let id;
  try {
    adminId = req.user.id;
    ({ id } = req.params);

    if (req.user.accountType !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin users can deactivate notification templates",
        auditLogged: true,
      });
    }

    const template = await NotificationTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Notification template not found",
        auditLogged: true,
      });
    }

    if (!template.isActive) {
      return res.status(200).json({
        success: true,
        message: "Notification template is already inactive",
        auditLogged: true,
        data: { template },
      });
    }

    template.isActive = false;
    template.lastModifiedBy = adminId;
    await template.save();

    await logAudit({
      actorId: adminId,
      action: "notification:template-deactivate",
      targetType: "NotificationTemplate",
      targetId: template._id,
      status: "success",
      metadata: {
        name: template.name,
      },
    });

    const populatedTemplate = await NotificationTemplate.findById(id)
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email");

    return res.status(200).json({
      success: true,
      message: "Notification template deactivated successfully",
      auditLogged: true,
      data: { template: populatedTemplate },
    });
  } catch (error) {
    console.error("Error in deactivateNotificationTemplate:", error);
    await logAudit({
      actorId: adminId,
      action: "notification:template-deactivate",
      targetType: "NotificationTemplate",
      targetId: id || adminId,
      status: "failure",
      errorMessage: error.message,
      metadata: {
        templateId: id,
      },
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
      auditLogged: true,
    });
  }
};

// ============ GET /admin/notifications/templates ============
// Get all active notification templates
exports.getNotificationTemplates = async (req, res) => {
  try {
    if (req.user.accountType !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin users can access notification templates",
      });
    }

    const { channel, isActive } = req.query;
    const isActiveValue = isActive === undefined ? true : isActive === "true" || isActive === true;

    const filter = { isActive: isActiveValue };
    if (channel && ["email", "in_app", "both"].includes(channel)) {
      filter.channel = channel;
    }

    // Fetch templates
    const templates = await NotificationTemplate.find(filter)
      .populate("createdBy", "firstName lastName email")
      .populate("lastModifiedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Notification templates fetched successfully",
      data: {
        count: templates.length,
        templates,
      },
    });
  } catch (error) {
    console.error("Error in getNotificationTemplates:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = exports;
