const express = require('express');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { patchJobInterestController, patchCandidatesInterestedController, patchJobNoShowController, getJobCandidatesController, getUserQualificationController, getAllJobInterestsController, getJobByIdController, getAllJobsController } = require('../controllers/jobs');

const router = express.Router();
const JOB_ID_PARAM = ':jobId(\\d+)';
const USER_ID_PARAM = ':userId(\\d+)';

router.get('/', requireAuth, getAllJobsController);

router.patch(`/${JOB_ID_PARAM}/no-show`, requireAuth, requireRole('business'), patchJobNoShowController);

router.get(`/${JOB_ID_PARAM}/candidates`, requireAuth, requireRole('business'), getJobCandidatesController);

router.get(`/${JOB_ID_PARAM}/candidates/${USER_ID_PARAM}`, requireAuth, requireRole('business'), getUserQualificationController);

router.patch(`/${JOB_ID_PARAM}/candidates/${USER_ID_PARAM}/interested`, requireAuth, requireRole('business'), patchCandidatesInterestedController);

router.get(`/${JOB_ID_PARAM}/interests`, requireAuth, requireRole('business'), getAllJobInterestsController);

router.patch(`/${JOB_ID_PARAM}/interested`, requireAuth, requireRole('regular'), patchJobInterestController);

router.get(`/${JOB_ID_PARAM}`, requireAuth, getJobByIdController);

router.all(`/${JOB_ID_PARAM}/no-show`, (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all(`/${JOB_ID_PARAM}/candidates`, (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all(`/${JOB_ID_PARAM}/candidates/${USER_ID_PARAM}`, (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all(`/${JOB_ID_PARAM}/candidates/${USER_ID_PARAM}/interested`, (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all(`/${JOB_ID_PARAM}/interests`, (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all(`/${JOB_ID_PARAM}/interested`, (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all(`/${JOB_ID_PARAM}`, (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/', (_req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

router.all('/*', (_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

module.exports = router;
