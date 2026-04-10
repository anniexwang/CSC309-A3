const { response } = require("express");
const { BusinessService, UserAlreadyExistsError } = require("../services/businesses");
const { getPagination } = require('../utils/pagination');
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function geocodeAddressToCoordinates(address) {
  const normalized = String(address || "").trim();
  if (!normalized) return null;

  const upstreamUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalized)}&limit=1`;
  const upstreamRes = await fetch(upstreamUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TempingPlatform/1.0 (contact@temping.local)"
    }
  });

  if (!upstreamRes.ok) return null;
  const payload = await upstreamRes.json();
  if (!Array.isArray(payload) || payload.length === 0) return null;

  const lat = Number(payload[0].lat);
  const lon = Number(payload[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

async function createBusinessController(req, res) {
    const { business_name, owner_name, email, password, phone_number, postal_address, location } = req.body;

  if (!business_name || !owner_name || !email || !password || !phone_number || !postal_address) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (location !== undefined && (
    typeof location.lon !== 'number' ||
    typeof location.lat !== 'number' ||
    location.lat < -90 || location.lat > 90 ||
    location.lon < -180 || location.lon > 180
  )) {
    return res.status(400).json({ error: "Invalid location format" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+~`|}{[\]:;?><,./-]).{8,20}$/;
  if (!passRegex.test(password)) {
    return res.status(400).json({ error: "Password does not meet requirements" });
  }

  try {
    const resolvedLocation = location ?? await geocodeAddressToCoordinates(postal_address);
    if (!resolvedLocation) {
      return res.status(400).json({ error: "Unable to determine location from postal address" });
    }

    const newUser = await BusinessService.create(
        business_name, owner_name, email, password, 
        phone_number, postal_address, resolvedLocation
    );

    res.status(201).json({
      id: newUser.id,
      business_name,
      owner_name,
      email,
      activated: false,
      verified: false,
      role: "business",
      phone_number,
      postal_address,
      location: resolvedLocation,
      createdAt: newUser.createdAt.toISOString(),
      resetToken: newUser.resetToken,
      expiresAt: newUser.expiresAt.toISOString()
    });

  } catch (error) {
    console.error(error);

    if (error instanceof UserAlreadyExistsError) {
        return res.status(409).json({ error: "Email already exists" });
    }
    
    res.status(500).json({ error: `${error}` });
  }
}

async function listBusinessesController(req, res) {
    const { keyword, activated, verified, sort, order } = req.query;
    const { skip, take } = getPagination(req);
    const isAdmin = req.auth && req.auth.role === 'admin';

    if (!isAdmin && (activated !== undefined || verified !== undefined || sort === 'owner_name')) {
      return res.status(400).json({ error: "Unauthorized access to admin-only filters" });
    }

    const where = { role: 'business' };

    if (keyword) {
      const kw = keyword;
      const orClauses = [
        { email: { contains: kw } },
        { businessProfile: { business_name: { contains: kw } } },
        { businessProfile: { postal_address: { contains: kw } } },
        { businessProfile: { phone_number: { contains: kw } } }
      ];
      if (isAdmin) {
        orClauses.push({ businessProfile: { owner_name: { contains: kw } } });
      }
      where.OR = orClauses;
    }

    if (isAdmin) {
      if (activated !== undefined) {
        where.activated = activated === 'true';
      }
      if (verified !== undefined) {
        where.businessProfile = where.businessProfile || {};
        where.businessProfile.verified = verified === 'true';
      }
    }

    let orderBy = {};
    if (sort) {
      const direction = (order === 'desc') ? 'desc' : 'asc';
      if (sort === 'email') {
        orderBy = { email: direction };
      } else if (sort === 'business_name') {
        orderBy = { businessProfile: { business_name: direction } };
      } else if (sort === 'owner_name' && isAdmin) {
        orderBy = { businessProfile: { owner_name: direction } };
      }
    }

  try {

    const orderByOption = Object.keys(orderBy).length > 0 ? orderBy : undefined;
    const include = { businessProfile: true };

    const { count, businesses } = await BusinessService.get_all(where, skip, take, orderByOption, include);

    const results = businesses.map(b => {
      const data = {
        id: b.id,
        business_name: b.businessProfile.business_name,
        email: b.email,
        role: "business",
        phone_number: b.businessProfile.phone_number,
        postal_address: b.businessProfile.postal_address,
      };

      if (isAdmin) {
        data.owner_name = b.businessProfile.owner_name;
        data.verified = b.businessProfile.verified;
        data.activated = b.activated;
      }
      return data;
    });

    res.status(200).json({ count, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `${err}` });
  }
}

async function getMeBusinessController(req, res) {
  try {

    const where = { id: req.auth.id, role: 'business' };
    const include = { businessProfile: true };

    const b = await BusinessService.get_me(where, include);

    if (!b) return res.status(404).json({ error: "Business profile not found" });

    res.status(200).json({
      id: b.id,
      owner_name: b.businessProfile.owner_name,
      business_name: b.businessProfile.business_name,
      email: b.email,
      role: "business",
      phone_number: b.businessProfile.phone_number,
      postal_address: b.businessProfile.postal_address,
      location: b.businessProfile.location ? JSON.parse(b.businessProfile.location) : null,
      avatar: b.businessProfile.avatar,
      biography: b.businessProfile.biography,
      activated: b.activated,
      verified: b.businessProfile.verified,
      createdAt: b.createdAt.toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function patchBusinessMeController(req, res) {
  try {
    const { business_name, owner_name, phone_number, postal_address, location, avatar, biography } = req.body;
    
    const updateData = {};
    if (business_name !== undefined) updateData.business_name = business_name;
    if (owner_name !== undefined) updateData.owner_name = owner_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (postal_address !== undefined) updateData.postal_address = postal_address;
    if (location !== undefined) updateData.location = JSON.stringify(location);
    if (avatar !== undefined) updateData.avatar = avatar;
    if (biography !== undefined) updateData.biography = biography;

    if (location !== undefined && (typeof location.lon !== 'number' || typeof location.lat !== 'number' || location.lat < -90 || location.lat > 90 || location.lon < -180 || location.lon > 180)) {
      return res.status(400).json({ error: "Invalid location format" });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const where = { user_id: req.auth.id };

    const updated = await BusinessService.patch_me(where, updateData);

    const responseData = { id: updated.user_id };
    if (business_name !== undefined) responseData.business_name = updated.business_name;
    if (owner_name !== undefined) responseData.owner_name = updated.owner_name;
    if (phone_number !== undefined) responseData.phone_number = updated.phone_number;
    if (postal_address !== undefined) responseData.postal_address = updated.postal_address;
    if (location !== undefined) responseData.location = updated.location ? JSON.parse(updated.location) : null;
    if (avatar !== undefined) responseData.avatar = updated.avatar;
    if (biography !== undefined) responseData.biography = updated.biography;

    res.status(200).json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `${err}` });
  }
}

async function putBusinessAvatarController(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const allowed_types = ["image/png", "image/jpeg"];

    if (!allowed_types.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type" });
    } 

    const avatarUrl = `/uploads/businesses/${req.auth.id}/${req.file.filename}`;
    const data = { avatar: avatarUrl };
    const where = { user_id: req.auth.id };


    await BusinessService.update_avatar(where, data);

    res.status(200).json({ avatar: avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function createJobController(req, res) {
  try {
    const where = { id: req.auth.id, role: 'business' };
    const include = { businessProfile: true };

    const b = await BusinessService.get_me(where, include);

    if (!b || !b.businessProfile.verified) {
      return res.status(403).json({ error: "Forbidden: business not verified" });
    }

    const { position_type_id, salary_min, salary_max, start_time, end_time, note } = req.body;

    if (position_type_id === undefined || typeof salary_min !== 'number' || typeof salary_max !== 'number' || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pt = await prisma.positionType.findUnique({
      where: { position_type_id }
    });

    if (!pt || pt.hidden) {
      return res.status(400).json({ error: "Invalid position_type_id" });
    }

    if (salary_min < 0 || salary_max < salary_min) {
      return res.status(400).json({ error: "Invalid salary range" });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    const now = new Date();

    if (start <= now || end <= start) {
      return res.status(400).json({ error: "Invalid time range" });
    }

    // Constraints logic: negotiation window and job start window
    const jobStartWindowHours = global.systemConfig?.jobStartWindow || 168; // 1 week default
    const maxStart = new Date(now.getTime() + jobStartWindowHours * 60 * 60 * 1000);
    if (start > maxStart) {
      return res.status(400).json({ error: "Start time too far in the future" });
    }

    const negWindowSec = global.systemConfig?.negotiationWindow || 900;

    if (start.getTime() - now.getTime() < negWindowSec * 1000) {
      return res.status(400).json({ error: "Not enough time left for a full negotiation window" });
    }

    const job_data = {
      business_id: b.businessProfile.business_id,
      position_type_id: position_type_id,
      salary_min: salary_min,
      salary_max: salary_max,
      start_time: start,
      end_time: end,
      note: note || "",
      status: "open",
    };

    const job_include = { position_type: true, business: { include: { user: true } } };


    const job = await BusinessService.create_job_posting(job_data, job_include);

    res.status(201).json({
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
      worker: null,
      note: job.note,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time.toISOString(),
      end_time: job.end_time.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `${err}` });
  }
}

async function getMyJobsController(req, res) {
  try {
    const { position_type_id, salary_min, salary_max, start_time, end_time, status } = req.query;
    const { skip, take } = getPagination(req);
    const now = new Date();

    const business = await BusinessService.get_me(
      { id: req.auth.id, role: 'business' },
      { businessProfile: true }
    );

    if (!business || !business.businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    const where = { business_id: business.businessProfile.business_id };

    if (position_type_id) where.position_type_id = parseInt(position_type_id, 10);
    if (salary_min) where.salary_min = { gte: parseInt(salary_min, 10) };
    if (salary_max) where.salary_max = { gt: parseInt(salary_max, 10) };
    if (start_time) where.start_time = { gt: new Date(start_time) };
    if (end_time) where.end_time = { lt: new Date(end_time) };

    const requestedStatuses = status ? (Array.isArray(status) ? status : [status]) : [];
    if (requestedStatuses.length > 0) {
      const dbStatuses = new Set();

      requestedStatuses.forEach((value) => {
        if (value === "expired" || value === "open") {
          dbStatuses.add("open");
        } else {
          dbStatuses.add(value);
        }
      });

      where.status = { in: Array.from(dbStatuses) };
    }

    const include = { position_type: true, worker: { include: { regularProfile: true } } };

    const { jobs } = await BusinessService.get_my_jobs(where, undefined, undefined, include);

    const normalizedJobs = jobs.map(job => {
      const derivedStatus = job.status !== "open"
        ? job.status
        : (now >= job.start_time ? "expired" : "open");

      return {
      id: job.job_id,
      status: derivedStatus,
      position_type: { id: job.position_type_id, name: job.position_type.name },
      business_id: job.business_id,
      worker: job.worker ? {
        id: job.worker.id,
        first_name: job.worker.regularProfile.first_name,
        last_name: job.worker.regularProfile.last_name
      } : null,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time.toISOString(),
      end_time: job.end_time.toISOString(),
      updatedAt: job.updatedAt.toISOString()
      };
    });

    const filteredJobs = requestedStatuses.length > 0
      ? normalizedJobs.filter((job) => requestedStatuses.includes(job.status))
      : normalizedJobs;

    const results = filteredJobs.slice(skip, skip + take);

    res.status(200).json({ count: filteredJobs.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function patchMyJobController(req, res) {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    if (isNaN(jobId)) return res.status(400).json({ error: "Invalid job ID" });
    const where_job = { job_id: jobId };

    const job = await BusinessService.findUniqueJob(where_job);
    const business = await BusinessService.get_me(
      { id: req.auth.id, role: 'business' },
      { businessProfile: true }
    );

    if (!business || !business.businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    if (!job || job.business_id !== business.businessProfile.business_id) {
      return res.status(404).json({ error: "Job not found" });
    }

    const { salary_min, salary_max, start_time, end_time, note, status } = req.body;
    const updateData = {};

    if (salary_min !== undefined) updateData.salary_min = salary_min;
    if (salary_max !== undefined) updateData.salary_max = salary_max;
    if (note !== undefined) updateData.note = note;

    const now = new Date();
    const negWindowSec = global.systemConfig?.negotiationWindow || 900;

    let newStart = start_time ? new Date(start_time) : job.start_time;
    let newEnd = end_time ? new Date(end_time) : job.end_time;

    if (status !== undefined) {
      if (status !== "completed") {
        return res.status(400).json({ error: "Unsupported status update" });
      }

      if (job.status !== "filled") {
        return res.status(409).json({ error: "Only filled jobs can be completed" });
      }

      if (now < job.end_time) {
        return res.status(409).json({ error: "Job cannot be completed before the shift ends" });
      }

      const where_jobPosting = { job_id: jobId };
      await BusinessService.updateJobPosting(where_jobPosting, { status: "completed" });
      const updatedJob = await BusinessService.findUniqueJob(where_jobPosting);

      return res.status(200).json({
        id: updatedJob.job_id,
        status: updatedJob.status,
        updatedAt: updatedJob.updatedAt.toISOString()
      });
    }

    if (start_time !== undefined) updateData.start_time = newStart;
    if (end_time !== undefined) updateData.end_time = newEnd;

    if (start_time !== undefined || end_time !== undefined) {
      if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      if (newStart <= now || newEnd <= newStart) {
        return res.status(400).json({ error: "Invalid time range" });
      }

      const jobStartWindowHours = global.systemConfig?.jobStartWindow || 168;
      const maxStart = new Date(now.getTime() + jobStartWindowHours * 60 * 60 * 1000);

      if (newStart > maxStart) {
        return res.status(400).json({ error: "Start time too far in the future" });
      }

      if (newStart.getTime() - now.getTime() < negWindowSec * 1000) {
        return res.status(400).json({ error: "Not enough time left for a full negotiation window" });
      }
    }

    if (job.status !== "open" || now >= job.start_time) {
      return res.status(409).json({ error: "Job is not open or expired" });
    }

    if (updateData.salary_min !== undefined || updateData.salary_max !== undefined) {
      const min = updateData.salary_min !== undefined ? updateData.salary_min : job.salary_min;
      const max = updateData.salary_max !== undefined ? updateData.salary_max : job.salary_max;
      if (min < 0 || max < min) return res.status(400).json({ error: "Invalid salary range" });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const where_jobPosting = { job_id: jobId };

    await BusinessService.updateJobPosting(where_jobPosting, updateData);

    const updatedJob = await BusinessService.findUniqueJob(where_job);

    const responseData = { id: updatedJob.job_id, updatedAt: updatedJob.updatedAt.toISOString() };
    if (salary_min !== undefined) responseData.salary_min = updatedJob.salary_min;
    if (salary_max !== undefined) responseData.salary_max = updatedJob.salary_max;
    if (start_time !== undefined) responseData.start_time = updatedJob.start_time.toISOString();
    if (end_time !== undefined) responseData.end_time = updatedJob.end_time.toISOString();
    if (note !== undefined) responseData.note = updatedJob.note;

    res.status(200).json(responseData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteMyJobPostingController(req, res) {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    if (isNaN(jobId)) return res.status(400).json({ error: "Invalid job ID" });

    const where = { job_id: jobId };

    const job = await BusinessService.findUniqueJob(where);
    const business = await BusinessService.get_me(
      { id: req.auth.id, role: 'business' },
      { businessProfile: true }
    );

    if (!business || !business.businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    if (!job || job.business_id !== business.businessProfile.business_id) {
      return res.status(404).json({ error: "Job not found" });
    }

    let isExpired = false;
    if (job.status === "open") {
      const start = job.start_time.getTime();
      const now = new Date().getTime();
      const negWindowSec = global.systemConfig?.negotiationWindow || 900;
      
      // Expired if not enough time for a full negotiation window
      if (start - now < negWindowSec * 1000) {
        isExpired = true;
      }
    }

    if (job.status !== "open" && !(job.status === "expired" || (job.status === "open" && isExpired))) {
      return res.status(409).json({ error: "Job is not open or expired" });
    }

    const where_negotiations = {
      status: "active",
      interest: {
        job_id: jobId
      }
    };

    const activeNegotiations = await BusinessService.countActiveNegotiations(where_negotiations);
    if (activeNegotiations > 0) {
      return res.status(409).json({ error: "Cannot delete job with active negotiation" });
    }

    await BusinessService.deleteAllRelatedToJob(jobId);

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getBusinessWithId(req, res) {
  try {
    const business_id = parseInt(req.params.businessId, 10);
    if (isNaN(business_id)) return res.status(404).json({ error: "Invalid business id" });

    const isAdmin = req.auth && req.auth.role === 'admin';
    const where = { id: business_id, role: 'business' };
    const include = { businessProfile: true };

    const b = await BusinessService.get_me(where, include);

    if (!b) return res.status(404).json({ error: "Business not found" });

    const data = {
      id: b.id,
      business_name: b.businessProfile.business_name,
      email: b.email,
      role: "business",
      phone_number: b.businessProfile.phone_number,
      postal_address: b.businessProfile.postal_address,
      location: b.businessProfile.location ? JSON.parse(b.businessProfile.location) : null,
      avatar: b.businessProfile.avatar,
      biography: b.businessProfile.biography
    };

    if (isAdmin) {
      data.owner_name = b.businessProfile.owner_name;
      data.activated = b.activated;
      data.verified = b.businessProfile.verified;
      data.createdAt = b.createdAt.toISOString();
    }

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function patchBusinessVerifiedController(req, res) {
  try {
    const business_id = parseInt(req.params.businessId, 10);
    if (isNaN(business_id)) return res.status(404).json({ error: "Invalid business id" });

    const { verified } = req.body;
    if (typeof verified !== 'boolean') {
      return res.status(400).json({ error: "Verified must be boolean" });
    }

    const where = { id: business_id, role: 'business' };
    const include = { businessProfile: true };

    const existing = await BusinessService.get_me(where, include);
    if (!existing) return res.status(404).json({ error: "Business not found" });

    const where_profile = { user_id: business_id };
    const data_profile = { verified };

    await BusinessService.updateBusinessProfile(where_profile, data_profile);

    res.status(200).json({
      id: existing.id,
      business_name: existing.businessProfile.business_name,
      owner_name: existing.businessProfile.owner_name,
      email: existing.email,
      activated: existing.activated,
      verified: verified,
      role: "business",
      phone_number: existing.businessProfile.phone_number,
      postal_address: existing.businessProfile.postal_address
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `${err}` });
  }
}

async function otherRouteController(_req, res) {
  return res.status(404).json({ message: "Method Not Allowed" });
}

module.exports = { 
  createBusinessController, listBusinessesController, getMeBusinessController,
  patchBusinessMeController, putBusinessAvatarController, createJobController,
  getMyJobsController, patchMyJobController, deleteMyJobPostingController, getBusinessWithId,
  patchBusinessVerifiedController, otherRouteController
};
