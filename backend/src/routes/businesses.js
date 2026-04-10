const express = require('express');

const { requireAuth, optionalAuth, requireRole } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const {
  createBusinessController,
  listBusinessesController,
  getMeBusinessController,
  patchBusinessMeController,
  putBusinessAvatarController,
  createJobController,
  getMyJobsController,
  patchMyJobController,
  deleteMyJobPostingController,
  getBusinessWithId,
  patchBusinessVerifiedController,
  otherRouteController,
} = require('../controllers/businesses');

const router = express.Router();

router.post('/', createBusinessController);
router.get('/', optionalAuth, listBusinessesController);

router.get('/me', requireAuth, requireRole('business'), getMeBusinessController);
router.patch('/me', requireAuth, requireRole('business'), patchBusinessMeController);
router.put('/me/avatar', requireAuth, requireRole('business'), upload.single('file'), putBusinessAvatarController);

router.post('/me/jobs', requireAuth, requireRole('business'), createJobController);
router.get('/me/jobs', requireAuth, requireRole('business'), getMyJobsController);
router.patch('/me/jobs/:jobId', requireAuth, requireRole('business'), patchMyJobController);
router.delete('/me/jobs/:jobId', requireAuth, requireRole('business'), deleteMyJobPostingController);

router.get('/:businessId', optionalAuth, getBusinessWithId);
router.patch('/:businessId/verified', requireAuth, requireRole('admin'), patchBusinessVerifiedController);

router.all('/', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/avatar', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/jobs', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/jobs/:jobId', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/:businessId', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/:businessId/verified', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/*', otherRouteController);

module.exports = router;
