const express = require('express');
const router = express.Router();

const { getFilteredCustomers,
        getCustomerDetail,
        updateCustomer,
        addCustomerNote,
        getCustomerNotes, 
        getCustomerActivity
    } = require('../controllers/CustomerManagementController');


const {auth, requiredRoles } = require('../middlewares/authMiddleware');
router.get('/',auth,requiredRoles("Admin"), getFilteredCustomers);
router.get("/:customerId",auth,requiredRoles("Admin"), getCustomerDetail);
router.put("/:customerId/update",auth,requiredRoles("Admin"), updateCustomer);
router.post("/:customerId/addnote",auth,requiredRoles("Admin"), addCustomerNote);
router.get("/:customerId/getnote",auth,requiredRoles("Admin"), getCustomerNotes);
router.get("/:customerId/activity",auth,requiredRoles("Admin"),getCustomerActivity)
    

module.exports = router;