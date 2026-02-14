const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Profile = require("../models/Profile");
const CustomerNote = require("../models/CustomerNote");
const mongoose = require("mongoose");
const { createAuditLog } = require("./AuditLogController");

const logAdminFailure = async (req, action, targetType, targetId, metadata, changes, errorMessage) => {
  await createAuditLog({
    actorId: req.user?.id,
    action,
    targetType,
    targetId,
    metadata,
    changes,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
    status: "failure",
    errorMessage
  });
};

/**
 * GET /admin/customers
 * List all customers with search, filters, and pagination
 * Query params:
 *  - q: search by name or email (case-insensitive)
 *  - status: filter by subscription status (Active, Canceled, Past_due)
 *  - plan: filter by subscription plan (Free, Pro, Premium)
 *  - page: page number (default 1)
 *  - limit: items per page (default 10)
 *  - sort: sort field (createdAt, lastActiveAt, default: createdAt)
 *  - order: sort order (asc, desc, default: desc)
 */
exports.getFilteredCustomers = async (req, res) => {
  try {
    const {
      q = "",
      status,
      plan,
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    // Build User query
    const userQuery = {};

    // Search by name or email
    if (q) {
      userQuery.$or = [
        { email: { $regex: q, $options: "i" } },
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
      ];
    }

    // Build Subscription query for filtering
    const subscriptionQuery = {};
    if (status) {
      subscriptionQuery.status = status;
    }
    if (plan) {
      subscriptionQuery.subscriptionType = plan;
    }

    // If subscription filters exist, find matching users first
    let matchingUserIds = null;
    if (status || plan) {
      const subscriptions = await Subscription.find(subscriptionQuery).select("userId");
      matchingUserIds = subscriptions.map((sub) => sub.userId);
      userQuery._id = { $in: matchingUserIds };
    }

    // Determine sort order
    const sortOrder = order === "asc" ? 1 : -1;
    const sortObj = { [sort]: sortOrder };

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    // Fetch customers with subscription info
    const customers = await User.find(userQuery)
      .select("firstName lastName email createdAt lastActiveAt accountType")
      .populate({
        path: "additionalDetails",
        select: "contactNumber profession",
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Enrich with subscription data
    const customerData = await Promise.all(
      customers.map(async (user) => {
        const subscription = await Subscription.findOne({ userId: user._id }).lean();
        return {
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          accountType: user.accountType,
          createdAt: user.createdAt,
          lastActiveAt: user.lastActiveAt,
          subscription: subscription || null,
          profile: user.additionalDetails || null,
        };
      })
    );

    // Get total count
    const total = await User.countDocuments(userQuery);

    return res.status(200).json({
      success: true,
      data: customerData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      message: "Customers fetched successfully",
    });
  } catch (error) {
    console.log("error in getCustomers..: ", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch customers",
    });
  }
};

/**
 * GET /admin/customers/:customerId
 * Get detailed view of a single customer
 */
exports.getCustomerDetail = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      await logAdminFailure(
        req,
        "user:update",
        "User",
        customerId,
        {
          endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`,
        },
        { before: null, after: null },
        "Invalid customer ID"
      );
      return res.status(400).json({
        success: false,
        auditLogged: true,
        message: "Invalid customer ID",
      });
    }

    const user = await User.findById(customerId)
      .populate("additionalDetails")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const subscription = await Subscription.findOne({ userId: customerId }).lean();

    const customerDetail = {
      _id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      accountType: user.accountType,
      image: user.image,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
      subscription,
      profile: user.additionalDetails,
    };

    return res.status(200).json({
      success: true,
      data: customerDetail,
      message: "Customer details fetched successfully",
    });
  } catch (error) {
    console.log("error in getCustomerDetail..: ", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch customer details",
    });
  }
};

/**
 * PUT /admin/customers/:customerId
 * Update customer profile/details (name, contactNumber, etc.)
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { firstName, lastName, contactNumber, profession } = req.body;
    const updates = {
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(contactNumber ? { contactNumber } : {}),
      ...(profession ? { profession } : {}),
    };

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const user = await User.findById(customerId).populate('additionalDetails');
    if (!user) {
      await logAdminFailure(
        req,
        "user:update",
        "User",
        customerId,
        {
          endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`,
          updates
        },
        { before: null, after: null },
        "Customer not found"
      );
      return res.status(404).json({
        success: false,
        auditLogged: true,
        message: "Customer not found",
      });
    }

    const profileId = user.additionalDetails?._id || user.additionalDetails;
    const profileBefore = profileId
      ? await Profile.findById(profileId).lean()
      : null;
    const beforeState = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      profile: profileBefore
        ? {
            contactNumber: profileBefore.contactNumber,
            profession: profileBefore.profession,
          }
        : null,
    };

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    await user.save();

    // Update profile if provided
    let profile = null;
    if (contactNumber || profession) {
        profile = await Profile.findByIdAndUpdate(
        profileId,
        { contactNumber, profession },
        { new: true, runValidators: true }
      );
    }

    const profileAfter = profile
      ? profile.toObject()
      : profileId
        ? await Profile.findById(profileId).lean()
        : null;
    const afterState = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      profile: profileAfter
        ? {
            contactNumber: profileAfter.contactNumber,
            profession: profileAfter.profession,
          }
        : null,
    };

    await createAuditLog({
      actorId: req.user?.id,
      action: "user:update",
      targetType: "User",
      targetId: user._id,
      metadata: {
        endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`,
        updates,
      },
      changes: { before: beforeState, after: afterState },
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "success",
    });

    return res.status(200).json({
      success: true,
      data: {
        user:user,
        profile:profile
      },
      auditLogged: true,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.log("error in updateCustomer..: ", error);
    await logAdminFailure(
      req,
      "user:update",
      "User",
      req.params?.customerId,
      {
        endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`,
      },
      { before: null, after: null },
      "Unable to update customer"
    );
    return res.status(500).json({
      success: false,
      auditLogged: true,
      message: "Unable to update customer",
    });
  }
};


exports.addCustomerNote = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { body } = req.body;
    const authorId = req.user?.id;

    if (!authorId) {
      await logAdminFailure(
        req,
        "customer:note-add",
        "User",
        customerId,
        {
          endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`
        },
        { before: null, after: null },
        "Unauthorized"
      );
      return res.status(401).json({
        success: false,
        auditLogged: true,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      await logAdminFailure(
        req,
        "customer:note-add",
        "User",
        customerId,
        {
          endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`
        },
        { before: null, after: null },
        "Invalid customer ID"
      );
      return res.status(400).json({
        success: false,
        auditLogged: true,
        message: "Invalid customer ID",
      });
    }

    if (!body || !body.trim()) {
      await logAdminFailure(
        req,
        "customer:note-add",
        "User",
        customerId,
        {
          endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`
        },
        { before: null, after: null },
        "Note body is required"
      );
      return res.status(400).json({
        success: false,
        auditLogged: true,
        message: "Note body is required",
      });
    }

    const customer = await User.findById(customerId).select("_id");
    if (!customer) {
      await logAdminFailure(
        req,
        "customer:note-add",
        "User",
        customerId,
        {
          endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`
        },
        { before: null, after: null },
        "Customer not found"
      );
      return res.status(404).json({
        success: false,
        auditLogged: true,
        message: "Customer not found",
      });
    }

    const customerNote = await CustomerNote.create({
      customerId,
      authorId,
      body: body.trim(),
    });

    await createAuditLog({
      actorId: req.user?.id,
      action: "customer:note-add",
      targetType: "User",
      targetId: customerId,
      metadata: {
        noteId: customerNote._id,
        endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`,
      },
      changes: { before: null, after: { body: customerNote.body } },
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "success",
    });

    return res.status(201).json({
      success: true,
      data: customerNote,
      auditLogged: true,
      message: "Customer note created successfully",
    });
  } catch (error) {
    console.log("error in addCustomerNote..: ", error);
    await logAdminFailure(
      req,
      "customer:note-add",
      "User",
      req.params?.customerId,
      {
        endpoint: `${req.method} ${req.baseUrl}${req.route?.path}`
      },
      { before: null, after: null },
      "Unable to add customer note"
    );
    return res.status(500).json({
      success: false,
      auditLogged: true,
      message: "Unable to add customer note",
    });
  }
};


/**
 * GET /admin/customers/:customerId/notes
 * Get all notes for a specific customer
 */
exports.getCustomerNotes = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await User.findById(customerId).select("_id");
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const customerNotes = await CustomerNote.find({ customerId })
      .populate({
        path: "authorId",
        select: "firstName lastName email",
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: customerNotes,
      message: "Customer notes fetched successfully",
    });
  } catch (error) {
    console.log("Error while getting customerNotes...", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch customer notes",
    });
  }
};

/**
 * GET /admin/customers/:customerId/activity
 * Get subscription and payment activity history for a customer
 */
exports.getCustomerActivity = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await User.findById(customerId).select("_id createdAt");
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const subscription = await Subscription.findOne({ userId: customerId }).lean();

    const activity = [];

    // Add account creation event
    activity.push({
      type: "account_created",
      date: customer.createdAt,
      description: "Account created",
    });

    if (subscription) {
      // Add subscription start event
      activity.push({
        type: "subscription_started",
        date: subscription.startedDate,
        description: "Subscription started",
      });

      // Add payment history events
      if (subscription.paymentHistory && subscription.paymentHistory.length > 0) {
        subscription.paymentHistory.forEach((payment) => {
          activity.push({
            type: payment.paymentStatus === "success" ? "payment_success" : "payment_failed",
            date: payment.date,
            description:
              payment.paymentStatus === "success"
                ? `Payment of ₹${payment.amount} successful`
                : `Payment of ₹${payment.amount} failed`,
            amount: payment.amount,
            status: payment.paymentStatus,
            razorpayPaymentId: payment.razorpayPaymentId,
            failureReason: payment.failureReason,
            event: payment.event,
          });
        });
      }

      // Add pending upgrade event
      if (subscription.pendingUpgrade && subscription.pendingUpgrade.requestedAt) {
        activity.push({
          type: "upgrade_requested",
          date: subscription.pendingUpgrade.requestedAt,
          description: `Upgrade to ${subscription.pendingUpgrade.planType} plan requested`,
          plan: subscription.pendingUpgrade.planType,
          amount: subscription.pendingUpgrade.expectedAmount,
        });
      }

      // Add pending downgrade event
      if (subscription.pendingDowngrade && subscription.pendingDowngrade.effectiveDate) {
        activity.push({
          type: "downgrade_scheduled",
          date: subscription.pendingDowngrade.effectiveDate,
          description: `Downgrade to ${subscription.pendingDowngrade.planType} plan scheduled`,
          plan: subscription.pendingDowngrade.planType,
        });
      }

      // Add cancellation event
      if (subscription.cancellationDate) {
        activity.push({
          type: "subscription_canceled",
          date: subscription.cancellationDate,
          description: "Subscription canceled",
        });
      }

      // Add past due event
      if (subscription.pastDueSince) {
        activity.push({
          type: "past_due",
          date: subscription.pastDueSince,
          description: "Subscription marked as past due",
          graceUntil: subscription.graceUntil,
        });
      }

      // Add current status
      activity.push({
        type: "current_status",
        date: subscription.updatedAt || new Date(),
        description: `Current status: ${subscription.status}`,
        status: subscription.status,
        plan: subscription.subscriptionType,
      });
    }

    // Sort by date ascending (oldest first - chronological timeline)
    activity.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({
      success: true,
      data: {
        customerId: customer._id,
        activity,
        totalEvents: activity.length,
      },
      message: "Customer activity fetched successfully",
    });
  } catch (error) {
    console.log("Error while getting customer activity...", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch customer activity",
    });
  }
};