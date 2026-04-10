const express = require('express');

const { requireAuth, requireRole } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const {
  createRegularUserController,
  getAllRegularUsersController,
  getUserByIdController,
  patchUserSuspendedController,
  getCurrentUserController,
  patchCurrentUserController,
  patchCurrentUserAvailabilityController,
  putUserAvatarController,
  putUserResumeController,
  getCurrentUserInvitationsController,
  getCurrentUserInterestsController,
  getCurrentUserQualificationsController,
  getCurrentUserJobHistoryController,
  otherRouteController
} = require('../controllers/users');

const router = express.Router();

router.post('/', createRegularUserController);
router.get('/', requireAuth, requireRole('admin'), getAllRegularUsersController);

router.get('/me', requireAuth, requireRole('regular'), getCurrentUserController);
router.patch('/me', requireAuth, requireRole('regular'), patchCurrentUserController);

router.get('/me/invitations', requireAuth, requireRole('regular'), getCurrentUserInvitationsController);
router.get('/me/interests', requireAuth, requireRole('regular'), getCurrentUserInterestsController);
router.get('/me/qualifications', requireAuth, requireRole('regular'), getCurrentUserQualificationsController);
router.get('/me/history', requireAuth, requireRole('regular'), getCurrentUserJobHistoryController);

router.patch('/me/available', requireAuth, requireRole('regular'), patchCurrentUserAvailabilityController);
router.put('/me/avatar', requireAuth, requireRole('regular'), upload.single('file'), putUserAvatarController);
router.put('/me/resume', requireAuth, requireRole('regular'), upload.single('file'), putUserResumeController);

router.get('/:userId', requireAuth, requireRole('admin'), getUserByIdController);
router.patch('/:userId/suspended', requireAuth, requireRole('admin'), patchUserSuspendedController);

router.all('/me', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/available', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/avatar', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/resume', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/invitations', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/interests', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/qualifications', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/me/history', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/:userId', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/:userId/suspended', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/*', otherRouteController);

module.exports = router;
