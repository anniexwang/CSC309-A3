const { BusinessService } = require("../services/businesses");
const { JobService } = require("../services/jobs");
const { PositionTypeService } = require("../services/position-types");
const { QualificationsService } = require("../services/qualifications");
const { PrismaClient } = require('@prisma/client');
const { getPagination } = require('../utils/pagination');
const { emitAccountNotification } = require("../socket");

const prisma = new PrismaClient();

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371.2; // km
  const toRad = (x) => x * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function computeDistanceAndEta(userLat, userLon, bizLoc) {
  const distance = haversine(userLat, userLon, bizLoc.lat, bizLoc.lon);
  const eta = distance / 30;
  return { distance, eta };
}

const isDiscoverable = async (prisma, user, job) => {
  if (!user.activated || user.regularProfile?.suspended) return false;
  if (!user.regularProfile?.available) return false;
  const timeout = global.systemConfig?.availabilityTimeout || 300;
  if (!user.lastActiveAt) return false;
  const inactiveFor = (new Date().getTime() - user.lastActiveAt.getTime()) / 1000;
  if (inactiveFor > timeout) return false;
  const conflicts = await prisma.jobPosting.count({
    where: {
      worker_id: user.id,
      status: { in: ["filled"] },
      start_time: { lt: job.end_time },
      end_time: { gt: job.start_time }
    }
  });
  if (conflicts > 0) return false;
  return true;
};

async function getAllJobsController(req, res) {
  if (!req.auth || req.auth.role !== 'regular') {
    return res.status(403).json({ error: "Forbidden" });
  }

  const now = new Date();
  const { sort = "start_time", order = "asc" } = req.query;
  const qualified_only = req.query.qualified_only === "true";

  const position_type_id = parseInt(req.query.position_type_id);
  const business_id = parseInt(req.query.business_id);

  if (req.query.position_type_id !== undefined && isNaN(position_type_id)) {
    return res.status(400).json({ error: "Invalid position_type_id" });
  }

  if (req.query.business_id !== undefined && isNaN(business_id)) {
    return res.status(400).json({ error: "Invalid business_id" });
  }

  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (req.query.lat !== undefined && isNaN(lat)) {
    return res.status(400).json({ error: "Invalid lat" });
  }

  if (req.query.lon !== undefined && isNaN(lon)) {
    return res.status(400).json({ error: "Invalid lon" });
  }

  if ((req.query.lat !== undefined && req.query.lon === undefined) ||
      (req.query.lon !== undefined && req.query.lat === undefined)) {
    return res.status(400).json({ error: "Both lat and lon are required" });
  }

  if (req.query.qualified_only !== undefined &&
      req.query.qualified_only !== "true" &&
      req.query.qualified_only !== "false") {
    return res.status(400).json({ error: "Invalid qualified_only" });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1 || limit < 1) {
    return res.status(400).json({ error: "Invalid pagination" });
  }

  const valid_sorts = [
    "updatedAt", "start_time", "salary_min", "salary_max", "distance", "eta"
  ];

  const valid_orders = [
    "asc", "desc"
  ];

  if (!valid_sorts.includes(sort)) return res.status(400).json({ error: "Invalid payload" });

  if (!valid_orders.includes(order)) return res.status(400).json({ error: "Invalid payload" });

  if ((sort === "distance" || sort === "eta") &&
    (req.query.lat === undefined || req.query.lon === undefined)) {
    return res.status(400).json({
      error: "lat and lon are required for distance or eta sorting"
    });
  }

  const skip = (page - 1) * limit;
  const take = limit;

  const where = {
    status: "open",
    start_time: { gt: now }
  };
  let orderBy = {};

  if (sort !== "distance" && sort !== "eta") {
    orderBy = { [sort]: order };
  }

  if (position_type_id) where.position_type_id = position_type_id;
  if (business_id) where.business_id = business_id;

  const hasCoords = req.query.lat !== undefined && req.query.lon !== undefined;

  try {
    if (qualified_only) {
      const approvedQualifications = await prisma.userQualification.findMany({
        where: {
          user_id: req.auth.id,
          status: "approved"
        },
        select: { position_type_id: true }
      });

      const approvedPositionTypeIds = [...new Set(approvedQualifications.map((q) => q.position_type_id))];
      if (approvedPositionTypeIds.length === 0) {
        return res.status(200).json({ count: 0, results: [] });
      }

      if (req.query.position_type_id !== undefined) {
        if (!approvedPositionTypeIds.includes(position_type_id)) {
          return res.status(200).json({ count: 0, results: [] });
        }
      } else {
        where.position_type_id = { in: approvedPositionTypeIds };
      }
    }

    if (req.query.position_type_id !== undefined) {
      const position_type = await PositionTypeService.get_position(position_type_id);

      if (!position_type) return res.status(404).json({ error: "Position invalid" });
    }

    if (req.query.business_id !== undefined) {
      const businessUser = await BusinessService.get_me(
        { id: business_id, role: 'business' },
        { businessProfile: true }
      );

      if (!businessUser || !businessUser.businessProfile) {
        return res.status(404).json({ error: "Business invalid" });
      }

      where.business_id = businessUser.businessProfile.business_id;
    }

    if (sort === "distance" || sort === "eta") {
      const { count, results } = await JobService.getAll(where);

      const sorted = results.map(job => {
        const busLoc = typeof job.business.location === 'string'
          ? JSON.parse(job.business.location) : job.business.location;
        const distance = haversine(lat, lon, busLoc.lat, busLoc.lon);
        const eta = distance / 30;

        return {...job, distance, eta};
      });

      sorted.sort((a, b) => {
          return order === "asc"
              ? a[sort] - b[sort]
              : b[sort] - a[sort];
      });

      const paginated = sorted.slice(skip, skip + take);

      const responseData = paginated.map(job => {
        return {
          id: job.job_id,
          status: job.status,
          position_type: { id: job.position_type.position_type_id, name: job.position_type.name },
          business: { id: job.business.user_id, business_name: job.business.business_name },
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          start_time: job.start_time,
          end_time: job.end_time,
          updatedAt: job.updatedAt,
          distance: job.distance,
          eta: job.eta
        };
      });

      return res.status(200).json({
        count,
        results: responseData
      });
    } else {
      const { count, results } = await JobService.getAllJobs(where, orderBy, skip, take);

      const responseData = results.map(job => {
        const item = {
          id: job.job_id,
          status: job.status,
          position_type: { id: job.position_type.position_type_id, name: job.position_type.name },
          business: { id: job.business.user_id, business_name: job.business.business_name },
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          start_time: job.start_time,
          end_time: job.end_time,
          updatedAt: job.updatedAt
        };

        if (hasCoords) {
          const busLoc = typeof job.business.location === 'string'
            ? JSON.parse(job.business.location) : job.business.location;
          const dist = haversine(lat, lon, busLoc.lat, busLoc.lon);
          item.distance = dist;
          item.eta = dist / 30;
        }

        return item;
      });

      return res.status(200).json({
        count,
        results: responseData
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getJobByIdController(req, res) {
  try {

    const jobId = parseInt(req.params.jobId, 10);
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Invalid job ID" });
    }

    const role = req.auth?.role;

    if (role !== 'business' && role !== 'regular') {
      return res.status(403).json({ error: "Forbidden" });
    }

    const lat = req.query.lat !== undefined ? parseFloat(req.query.lat) : undefined;
    const lon = req.query.lon !== undefined ? parseFloat(req.query.lon) : undefined;

    if (req.query.lat !== undefined && isNaN(lat)) {
      return res.status(400).json({ error: "Invalid lat" });
    }

    if (req.query.lon !== undefined && isNaN(lon)) {
      return res.status(400).json({ error: "Invalid lon" });
    }

    if ((req.query.lat !== undefined && req.query.lon === undefined) ||
        (req.query.lon !== undefined && req.query.lat === undefined)) {
      return res.status(400).json({ error: "Both lat and lon are required" });
    }

    if (lat !== undefined && (lat < -90 || lat > 90)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }
    if (lon !== undefined && (lon < -180 || lon > 180)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    if (role === 'business' &&
        (req.query.lat !== undefined || req.query.lon !== undefined)) {
      return res.status(400).json({ error: "Businesses cannot specify lat/lon" });
    }

    const where = { job_id: jobId };
    const include = {
      position_type: true,
      business: true,
      worker: {
        include: { regularProfile: true }
      }
    };

    const job = await JobService.get_with_id(where, include);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (role === 'business') {
      if (job.business.user_id !== req.auth.id) {
        return res.status(404).json({ error: "Job not found" });
      }
    }

    if (role === 'regular') {
      const allowedStatuses = ["open"];

      if (job.worker_id === req.auth.id) {
        allowedStatuses.push("filled", "canceled", "completed");
      }

      if (!allowedStatuses.includes(job.status)) {
        return res.status(404).json({ error: "Job not found or inaccessible" });
      }

      const qualWhere = { 
        user_id: req.auth.id,
        position_type_id: job.position_type_id,
        status: "approved"
      };

      const qual = await QualificationsService.find_first(qualWhere);

      if (!qual) {
        return res.status(403).json({ error: "Not qualified for this job" });
      }
    }

    const response = {
      id: job.job_id,
      status: job.status,
      position_type: {
        id: job.position_type.position_type_id,
        name: job.position_type.name
      },
      business: {
        id: job.business.user_id,
        business_name: job.business.business_name
      },
      worker: job.worker ? {
        id: job.worker.regularProfile?.user_id,
        first_name: job.worker.regularProfile?.first_name,
        last_name: job.worker.regularProfile?.last_name
      } : null,
      note: job.note,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time.toISOString(),
      end_time: job.end_time.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    };

    if (role === 'regular' &&
        req.query.lat !== undefined &&
        req.query.lon !== undefined) {

      try {
        const busLoc = typeof job.business.location === 'string'
          ? JSON.parse(job.business.location) : job.business.location;

        const { distance, eta } = computeDistanceAndEta(lat, lon, busLoc);
        response.distance = distance;
        response.eta = eta;

      } catch (err) {
        // optional: ignore silently
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function patchJobInterestController(req, res) {
  try {
    const { interested } = req.body;
    if (typeof interested !== 'boolean') {
      return res.status(400).json({ error: "interested must be a boolean" });
    }

    const jobId = parseInt(req.params.jobId, 10);
    if (isNaN(jobId)) return res.status(404).json({ error: "Invalid job ID" });

    const job = await JobService.findUniqueJob({ job_id: jobId }, { business: true });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const now = new Date();

    if (job.status !== "open" || now >= job.start_time) {
        return res.status(409).json({ error: "Job is no longer open" });
    }

    const qualification = await JobService.findFirstQualification({
      user_id: req.auth.id,
      position_type_id: job.position_type_id,
      status: "approved"
    });
    if (!qualification) return res.status(403).json({ error: "Not qualified" });

    let interest = await JobService.findFirstInterest({ job_id: jobId, candidate_id: req.auth.id });

    if (!interested) {
      if (!interest || !interest.candidateInterested) {
        return res.status(400).json({ error: "Not currently interested" });
      }

      const negotiation = await JobService.findFirstNegotiation({
        interest_id: interest.interest_id,
        status: "active",
        expiresAt: { gt: new Date() }
      });
      if (negotiation) return res.status(409).json({ error: "Currently in negotiation" });

      interest = await JobService.updateInterest({ interest_id: interest.interest_id }, { candidateInterested: false });
    } else {
      // if (job.status !== "open" && job.status === "expired") {
      console.log("job status ", job.status);
      if (job.status !== "open") {
        return res.status(409).json({ error: "Job is no longer available" });
      }

      const negotiation = await JobService.findFirstNegotiation({
        interest: { job_id: jobId, candidate_id: req.auth.id },
        status: "active",
        expiresAt: { gt: new Date() }
      });
      if (negotiation) return res.status(409).json({ error: "Currently in negotiation" });

      if (interest) {
        interest = await JobService.updateInterest({ interest_id: interest.interest_id }, { candidateInterested: true });
      } else {
        interest = await JobService.createInterest({
          job_id: jobId,
          candidate_id: req.auth.id,
          business_id: job.business_id,
          candidateInterested: true,
          businessInvitation: null
        });
      }

      await JobService.updateUser({ id: req.auth.id }, { lastActiveAt: new Date() });
    }

    res.status(200).json({
      id: interest.interest_id,
      job_id: interest.job_id,
      candidate: {
        id: interest.candidate_id,
        interested: interest.candidateInterested
      },
      business: {
        id: interest.business_id,
        interested: interest.businessInvitation
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function patchJobNoShowController(req, res) {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    if (isNaN(jobId)) return res.status(404).json({ error: "Invalid job ID" });

    const job = await JobService.get(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.business.user_id !== req.auth.id) return res.status(403).json({ error: "Forbidden" });

    const now = new Date();
    if (job.status !== "filled" || now < job.start_time || now >= job.end_time) {
      return res.status(409).json({ error: "Job is not filled, or not in progress" });
    }

    if (!job.worker) {
      return res.status(409).json({ error: "Job has no worker assigned" });
    }

    const user_id = job.worker_id;
    const job_id = job.job_id;

    await JobService.patch_no_show(job_id, user_id);

    const updatedJob = await JobService.get(jobId);

    const resStatus = updatedJob.status === "canceled" ? "cancelled" : updatedJob.status;

    res.status(200).json({
      id: updatedJob.job_id,
      status: resStatus,
      updatedAt: updatedJob.updatedAt.toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getJobCandidatesController(req, res) {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    if (isNaN(jobId)) return res.status(404).json({ error: "Invalid job ID" });
    const { skip, take } = getPagination(req);

    const job = await JobService.get(jobId);
    if (!job || job.business.user_id !== req.auth.id) return res.status(404).json({ error: "Job not found" });

    const qualifications = await JobService.get_qualifications(job.position_type_id, jobId);

    const uniqueUsers = Array.from(
      new Map(qualifications.map(q => [q.user.id, q.user])).values()
    );

    const flags = await Promise.all(
      uniqueUsers.map(u => isDiscoverable(prisma, u, job))
    );

    const discoverableCandidates = uniqueUsers.filter((_u, i) => flags[i]);

    const paginated = discoverableCandidates.slice(skip, skip + take);

    const results = paginated.map(u => ({
      id: u.id,
      first_name: u.regularProfile.first_name,
      last_name: u.regularProfile.last_name,
      invited: u.jobInterests.length > 0
    }));

    res.status(200).json({ count: discoverableCandidates.length, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `${error}`});
  }
}

// Doesn't use service

async function getUserQualificationController(req, res) {
  try {
    const job_id = parseInt(req.params.jobId, 10);
    const user_id = parseInt(req.params.userId, 10);
    if (isNaN(job_id) || isNaN(user_id)) return res.status(404).json({ error: "Invalid ID" });

    const job = await prisma.jobPosting.findUnique({
      where: { job_id },
      include: { position_type: true, business: true }
    });
    if (!job || job.business.user_id !== req.auth.id) return res.status(404).json({ error: "Job not found" });

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: { regularProfile: true }
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const qual = await prisma.userQualification.findFirst({
      where: { user_id, position_type_id: job.position_type_id, status: "approved" }
    });
    if (!qual) return res.status(403).json({ error: "User not qualified for this job" });

    const isFilledByThisUser = job.worker_id === user_id;
    const hasExpressedInterest = await prisma.jobInterest.findFirst({
      where: {
        job_id,
        candidate_id: user_id,
        candidateInterested: true
      }
    });

    if (!isFilledByThisUser && !hasExpressedInterest && !(await isDiscoverable(prisma, user, job))) {
      return res.status(403).json({ error: "User is not discoverable" });
    }

    const response = {
      user: {
        id: user.id,
        first_name: user.regularProfile.first_name,
        last_name: user.regularProfile.last_name,
        avatar: user.regularProfile.avatar,
        resume: user.regularProfile.resume,
        biography: user.regularProfile.biography,
        qualification: {
          id: qual.user_qualification_id,
          position_type_id: qual.position_type_id,
          document: qual.document,
          note: qual.note,
          updatedAt: qual.updatedAt.toISOString()
        }
      },
      job: {
        id: job.job_id,
        status: job.status,
        position_type: {
          id: job.position_type.position_type_id,
          name: job.position_type.name,
          description: job.position_type.description
        },
        start_time: job.start_time.toISOString(),
        end_time: job.end_time.toISOString()
      }
    };

    if (isFilledByThisUser) {
      response.user.email = user.email;
      response.user.phone_number = user.regularProfile.phone_number;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function patchCandidatesInterestedController(req, res) {
  try {
    const job_id = parseInt(req.params.jobId, 10);
    const user_id = parseInt(req.params.userId, 10);
    if (isNaN(job_id) || isNaN(user_id)) return res.status(404).json({ error: "Invalid ID" });

    const { interested } = req.body;
    if (typeof interested !== 'boolean') return res.status(400).json({ error: "Interested must be a boolean" });

    const job = await prisma.jobPosting.findUnique({
      where: { job_id },
      include: { business: true, position_type: true }
    });
    if (!job || job.business.user_id !== req.auth.id) return res.status(404).json({ error: "Job not found" });

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: { regularProfile: true }
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Must be qualified for this job
    const qual = await prisma.userQualification.findFirst({
      where: { user_id, position_type_id: job.position_type_id, status: "approved" }
    });
    if (!qual) return res.status(403).json({ error: "User is not qualified" });

    if (!(await isDiscoverable(prisma, user, job))) {
      return res.status(403).json({ error: "User is not discoverable" });
    }

    if (job.status !== "open") {
      return res.status(409).json({ error: "Job is not open" });
    }

    let interest = await prisma.jobInterest.findFirst({
      where: { job_id, candidate_id: user_id }
    });

    if (!interested) {
      if (!interest || !interest.businessInvitation) {
        return res.status(400).json({ error: "Cannot withdraw, no previous invitation" });
      }
      interest = await prisma.jobInterest.update({
        where: { interest_id: interest.interest_id },
        data: {
          businessInvitation: false,
          updatedAt: new Date()
        }
      });
    } else {
      if (interest) {
        interest = await prisma.jobInterest.update({
          where: { interest_id: interest.interest_id },
          data: {
            businessInvitation: true,
            updatedAt: new Date()
          }
        });
      } else {
        interest = await prisma.jobInterest.create({
          data: {
            job_id,
            candidate_id: user_id,
            business_id: job.business_id,
            candidateInterested: false,
            businessInvitation: true,
            invitationStatus: "invited"
          }
        });
      }
    }

    if (interest.candidateInterested && interest.businessInvitation) {
      emitAccountNotification(user_id, {
        scope: "regular-bell",
        type: "mutual-interest",
        id: `mutual-interest:${interest.interest_id}:${interest.updatedAt.toISOString()}`,
        interestId: interest.interest_id,
        jobId: job.job_id,
        businessName: job.business.business_name,
        positionTypeName: job.position_type.name,
        updatedAt: interest.updatedAt.toISOString(),
      });
    } else if (interest.candidateInterested && !interest.businessInvitation) {
      emitAccountNotification(user_id, {
        scope: "regular-bell",
        type: "mutual-interest-cleared",
        id: `mutual-interest-cleared:${interest.interest_id}:${interest.updatedAt.toISOString()}`,
        interestId: interest.interest_id,
        jobId: job.job_id,
        updatedAt: interest.updatedAt.toISOString(),
      });
    }

    const response = {
      id: interest.interest_id,
      job_id: job.job_id,
      candidate: {
        id: user_id,
        // Assignment indicates "interested: null /* this means not yet decided */"
        // so if the DB stores false by default or it's not explicitly true, return null
        interested: interest.candidateInterested ? true : null
      },
      business: {
        id: job.business_id,
        interested: interest.businessInvitation
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getAllJobInterestsController(req, res) {
  try {
    const job_id = parseInt(req.params.jobId, 10);
    if (isNaN(job_id)) return res.status(404).json({ error: "Invalid job ID" });
    const { skip, take } = getPagination(req);

    const job = await prisma.jobPosting.findUnique({
      where: { job_id },
      include: { business: true }
    });
    if (!job || job.business.user_id !== req.auth.id) return res.status(404).json({ error: "Job not found" });

    const interests = await prisma.jobInterest.findMany({
      where: { job_id, candidateInterested: true },
      skip,
      take,
      include: {
        candidate: {
          include: { regularProfile: true }
        }
      }
    });

    const count = await prisma.jobInterest.count({
      where: { job_id, candidateInterested: true }
    });

    const results = interests.map(i => ({
      interest_id: i.interest_id,
      mutual: !!(i.candidateInterested && i.businessInvitation),
      user: {
        id: i.candidate.id,
        first_name: i.candidate.regularProfile.first_name,
        last_name: i.candidate.regularProfile.last_name
      }
    }));

    res.status(200).json({ count, results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function otherRouteController(_req, res) {
  return res.status(405).json({ message: "Method Not Allowed" });
}

module.exports = {
  patchJobInterestController,
  otherRouteController,
  getAllJobInterestsController, 
  patchCandidatesInterestedController, 
  getUserQualificationController,
  getJobCandidatesController,
  patchJobNoShowController,
  getJobByIdController,
  getAllJobsController
};
