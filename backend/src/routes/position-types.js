const express = require('express');

const { requireAuth, optionalAuth, requireRole } = require('../middlewares/auth');
const {
    createPositionTypeController,
    retrievePositionTypeController,
    updatePositionTypeController,
    deletePositionTypeController,
    otherRouteController
} = require('../controllers/position-types');

const router = express.Router();

router.post('/', requireAuth, requireRole('admin'), createPositionTypeController);
router.get('/', optionalAuth, retrievePositionTypeController);

router.patch('/:positionTypeId', requireAuth, requireRole('admin'), updatePositionTypeController);
router.delete('/:positionTypeId', requireAuth, requireRole('admin'), deletePositionTypeController);

router.all('/:positionTypeId', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});


router.all('/*', otherRouteController);

module.exports = router;
