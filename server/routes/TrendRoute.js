const express = require('express');
const router = express.Router();

const { getTrends } = require('../controllers/TrendController');

const { auth } = require('../middlewares/authMiddleware');


router.get('/',auth , getTrends);

module.exports = router;