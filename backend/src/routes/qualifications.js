const express = require('express');

const { requireAuth, requireRole, requireRoles } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

const { getQualificationsAdminAttentionController, createQualificationController, getQualificationController, patchQualificationController, putQualificationDocumentController,
    otherRouteController
 } = require("../controllers/qualifications");

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), getQualificationsAdminAttentionController);
router.post('/', requireAuth, requireRole('regular'), createQualificationController);

router.get('/:qualificationId', requireAuth, getQualificationController);
router.patch('/:qualificationId', requireAuth, requireRoles(["regular", "admin"]), patchQualificationController);
router.put('/:qualificationId/document', requireAuth, upload.single('file'), putQualificationDocumentController);

router.all('/:qualificationId/document', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/:qualificationId', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/*', otherRouteController);

module.exports = router;