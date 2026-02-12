const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Profile = require("../models/Profile");
const mongoose = require("mongoose");

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
exports.getCustomers = async (req, res) => {
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
      return res.status(400).json({
        success: false,
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

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const user = await User.findById(customerId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    await user.save();

    // Update profile if provided
    if (contactNumber || profession) {
      const profile = await Profile.findByIdAndUpdate(
        user.additionalDetails,
        { contactNumber, profession },
        { new: true, runValidators: true }
      );
    }

    return res.status(200).json({
      success: true,
      data: user,
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.log("error in updateCustomer..: ", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update customer",
    });
  }
};