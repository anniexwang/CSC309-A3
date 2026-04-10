const express = require('express');

const { requireAuth, requireRole, requireRoles } = require('../middlewares/auth');

const { 
    getAvailabilityTimeoutController, getResetCooldownController,
    getJobStartWindowController, getNegotiationWindowController,
    updateAvailabilityTimeoutController, updateResetCooldownController, 
    updateJobStartWindowController, updateNegotiationWindowController,
    geocodeAddressController,
    otherRouteController 
} = require('../controllers/system');
const router = express.Router();

router.get('/geocode', requireAuth, geocodeAddressController);
router.get('/reset-cooldown', requireAuth, requireRole('admin'), getResetCooldownController);
router.get('/negotiation-window', requireAuth, requireRoles(["admin", "business"]), getNegotiationWindowController);
router.get('/job-start-window', requireAuth, requireRole('admin'), getJobStartWindowController);
router.get('/availability-timeout', requireAuth, requireRole('admin'), getAvailabilityTimeoutController);

router.patch('/reset-cooldown', requireAuth, requireRole('admin'), updateResetCooldownController);
router.patch('/negotiation-window', requireAuth, requireRoles(["admin", "business"]), updateNegotiationWindowController);
router.patch('/job-start-window', requireAuth, requireRole('admin'), updateJobStartWindowController);
router.patch('/availability-timeout', requireAuth, requireRole('admin'), updateAvailabilityTimeoutController);

router.all('/geocode', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/reset-cooldown', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/negotiation-window', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/job-start-window', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/availability-timeout', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/*', otherRouteController);

module.exports = router;
