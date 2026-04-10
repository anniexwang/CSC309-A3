const express = require('express');

const {
    requestTokenController,
    activateOrResetController,
    authenticateAndGenerateTokenController,
    otherRouteController,
} = require('../controllers/auth');

const router = express.Router();

router.post('/resets', requestTokenController);
router.post('/resets/:resetToken', activateOrResetController);
router.post('/tokens', authenticateAndGenerateTokenController);

router.all('/resets', (_req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/resets/:resetToken', (_req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/tokens', (_req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/*', otherRouteController);

module.exports = router;
