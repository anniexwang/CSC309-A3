const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { 
  createNegotiationController, 
  listNegotiationsController,
  getNegotiationByIdController,
  getNegotiationController, 
  updateNegotiationDecisionController,
  otherRouteController
} = require('../controllers/negotiations');

const router = express.Router();

router.post('/', requireAuth, createNegotiationController);
router.get('/', requireAuth, listNegotiationsController);
router.get('/me', requireAuth, getNegotiationController);
router.get('/:negotiationId', requireAuth, getNegotiationByIdController);
router.patch('/me/decision', requireAuth, updateNegotiationDecisionController);
router.patch('/:negotiationId/decision', requireAuth, updateNegotiationDecisionController);

router.all('/', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/decision', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/:negotiationId', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/:negotiationId/decision', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/*', otherRouteController);

module.exports = router;