'use strict';

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "123123";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NEGOTIATION_WINDOW_SECONDS = 172800;
const JOB_START_WINDOW_HOURS = 168;
const DEMO_CANDIDATES_PER_POSITION = 12;

const COUNTS = {
  admins: 2,
  businesses: 12,
  regulars: 24,
  positionTypes: 12,
  jobs: 45,
};

const POSITION_TYPE_DATA = [
  ["Dental Hygienist", "Performs preventive cleanings and supports oral health care."],
  ["Dental Assistant", "Supports chairside procedures and patient preparation."],
  ["Office Receptionist", "Coordinates scheduling, patient intake, and front desk support."],
  ["Sterilization Technician", "Maintains sterile tools, rooms, and infection-control workflow."],
  ["Treatment Coordinator", "Explains treatment plans and helps patients with booking and follow-up."],
  ["Orthodontic Assistant", "Supports orthodontic procedures, records, and equipment prep."],
  ["Pediatric Dental Assistant", "Assists with child-focused appointments and family communication."],
  ["Dental Administrator", "Handles billing, insurance, filing, and daily office coordination."],
  ["Periodontal Assistant", "Supports periodontal procedures and post-op care instructions."],
  ["Endodontic Assistant", "Prepares rooms and materials for endodontic treatment."],
  ["Oral Surgery Assistant", "Supports oral surgery workflow, setup, and recovery coordination."],
  ["Patient Care Coordinator", "Manages patient communication and service follow-through."],
];

const BUSINESS_NAME_DATA = [
  ["North York Family Dental", "Dr. Amelia Grant"],
  ["Harbourfront Smile Studio", "Dr. Lucas Bennett"],
  ["Queen Street Dental Care", "Dr. Maya Patel"],
  ["Bloor West Oral Health", "Dr. Noah Kim"],
  ["Midtown Dental House", "Dr. Olivia Chen"],
  ["Riverdale Family Dentistry", "Dr. Ethan Walker"],
  ["Annex Dental Group", "Dr. Sophia Green"],
  ["Liberty Village Smiles", "Dr. Daniel Park"],
  ["Kingsway Dental Studio", "Dr. Chloe Morgan"],
  ["Bayview Dental Centre", "Dr. Henry Foster"],
  ["Danforth Community Dental", "Dr. Isla Carter"],
  ["St. Clair Dental Partners", "Dr. Leo Murphy"],
];

const FIRST_NAMES = [
  "Avery", "Jordan", "Taylor", "Morgan", "Casey", "Riley",
  "Parker", "Cameron", "Jamie", "Quinn", "Skyler", "Harper",
  "Logan", "Rowan", "Bailey", "Reese", "Alex", "Drew",
  "Kendall", "Sage", "Peyton", "Dakota", "Emerson", "Finley",
];

const LAST_NAMES = [
  "Johnson", "Lee", "Martinez", "Patel", "Brown", "Kim",
  "Garcia", "Singh", "Nguyen", "Wong", "Lopez", "Thompson",
  "Campbell", "Scott", "Young", "Turner", "Baker", "Reed",
  "Mitchell", "Price", "Cruz", "Ward", "Russell", "Diaz",
];

const STREET_NAMES = [
  "College St", "Bloor St W", "Yonge St", "Dundas St W", "Queen St W", "King St E",
  "Bathurst St", "Spadina Ave", "St. Clair Ave W", "Eglinton Ave W", "Bay St", "Jarvis St",
  "Front St W", "Kingston Rd", "Danforth Ave", "Richmond St W", "Adelaide St W", "Dupont St",
  "Parliament St", "Church St", "Sherbourne St", "Carlton St", "Ossington Ave", "Lansdowne Ave",
];

function locationJson(index) {
  const lat = Number((43.63 + index * 0.008).toFixed(4));
  const lon = Number((-79.42 + index * 0.006).toFixed(4));
  return JSON.stringify({ lat, lon });
}

function phoneNumber(prefix, index) {
  return `${prefix}-${String(1000 + index).padStart(4, "0")}`;
}

function birthday(index) {
  const month = String((index % 12) + 1).padStart(2, "0");
  const day = String((index % 27) + 1).padStart(2, "0");
  return `199${index % 10}-${month}-${day}`;
}

function salaryRange(index) {
  const min = 2200 + index * 75;
  return { salary_min: min, salary_max: min + 650 };
}

async function hash(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.negotiation.deleteMany(),
    prisma.jobInterest.deleteMany(),
    prisma.jobPosting.deleteMany(),
    prisma.userQualification.deleteMany(),
    prisma.businessProfile.deleteMany(),
    prisma.regularProfile.deleteMany(),
    prisma.positionType.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createAdmins(passwordHash) {
  const admins = [];
  for (let i = 1; i <= COUNTS.admins; i += 1) {
    admins.push(await prisma.user.create({
      data: {
        email: `admin${i}@csc309.utoronto.ca`,
        password: passwordHash,
        role: "admin",
        isAdmin: true,
        activated: true,
      },
    }));
  }
  return admins;
}

async function createBusinesses(passwordHash) {
  const businesses = [];
  for (let i = 1; i <= COUNTS.businesses; i += 1) {
    const [business_name, owner_name] = BUSINESS_NAME_DATA[i - 1];
    const verified = i <= 10;
    const created = await prisma.user.create({
      data: {
        email: `business${i}@csc309.utoronto.ca`,
        password: passwordHash,
        role: "business",
        activated: true,
        lastActiveAt: new Date(),
        businessProfile: {
          create: {
            business_name,
            owner_name,
            verified,
            phone_number: phoneNumber("647-555", i),
            postal_address: `${120 + i * 15} ${STREET_NAMES[(i - 1) % STREET_NAMES.length]}, Toronto, ON`,
            location: locationJson(i),
            biography: `${business_name} provides reliable dental staffing support across Toronto clinics.`,
          },
        },
      },
      include: { businessProfile: true },
    });
    businesses.push(created);
  }
  return businesses;
}

async function createRegularUsers(passwordHash) {
  const regulars = [];
  for (let i = 1; i <= COUNTS.regulars; i += 1) {
    const first_name = FIRST_NAMES[i - 1];
    const last_name = LAST_NAMES[i - 1];
    const created = await prisma.user.create({
      data: {
        email: `regular${i}@csc309.utoronto.ca`,
        password: passwordHash,
        role: "regular",
        activated: true,
        lastActiveAt: new Date(),
        regularProfile: {
          create: {
            first_name,
            last_name,
            phone_number: phoneNumber("416-555", i),
            postal_address: `${300 + i * 7} ${STREET_NAMES[(i - 1) % STREET_NAMES.length]}, Toronto, ON`,
            birthday: birthday(i),
            biography: `${first_name} ${last_name} is available for short-notice clinic coverage.`,
            available: i !== 24,
            suspended: i === 24,
          },
        },
      },
      include: { regularProfile: true },
    });
    regulars.push(created);
  }
  return regulars;
}

async function createPositionTypes() {
  const positionTypes = [];
  for (const [name, description] of POSITION_TYPE_DATA) {
    positionTypes.push(await prisma.positionType.create({
      data: { name, description, hidden: false },
    }));
  }
  return positionTypes;
}

async function createQualifications(regularUsers, positionTypes) {
  const qualifications = [];
  const approvedByPosition = new Map();

  async function addQualification(user, positionType, status, note) {
    const created = await prisma.userQualification.create({
      data: {
        user_id: user.id,
        position_type_id: positionType.position_type_id,
        status,
        note,
      },
    });
    qualifications.push(created);
    if (status === "approved") {
      const curr = approvedByPosition.get(positionType.position_type_id) || [];
      curr.push(user);
      approvedByPosition.set(positionType.position_type_id, curr);
    }
  }

  const regular1Statuses = [
    "approved", "approved", "approved", "approved",
    "approved", "approved", "approved", "approved",
    "submitted", "revised", "approved", "rejected",
  ];

  for (let i = 0; i < positionTypes.length; i += 1) {
    await addQualification(
      regularUsers[0],
      positionTypes[i],
      regular1Statuses[i],
      `Seeded qualification for ${positionTypes[i].name}.`
    );
  }

  for (let i = 1; i <= 14; i += 1) {
    await addQualification(
      regularUsers[i],
      positionTypes[0],
      "approved",
      "Approved for hygienist coverage."
    );
  }

  for (let i = 15; i <= 19; i += 1) {
    const positionType = positionTypes[(i % 2) + 1];
    await addQualification(
      regularUsers[i],
      positionType,
      "approved",
      "Approved for support staffing."
    );
  }

  const mixedStatuses = ["created", "submitted", "rejected", "revised"];
  for (let i = 20; i < regularUsers.length; i += 1) {
    await addQualification(
      regularUsers[i],
      positionTypes[(i - 8) % positionTypes.length],
      mixedStatuses[(i - 20) % mixedStatuses.length],
      "Pending follow-up or review."
    );
  }

  for (let i = 1; i <= 4; i += 1) {
    await addQualification(
      regularUsers[i],
      positionTypes[i + 1],
      i % 2 === 0 ? "approved" : "submitted",
      "Additional seeded qualification for pagination coverage."
    );
  }

  for (let i = 0; i < 8; i += 1) {
    await addQualification(
      regularUsers[i + 1],
      positionTypes[i + 3],
      "approved",
      "Approved specialty coverage qualification."
    );
  }

  return { qualifications, approvedByPosition };
}

async function createJobs(verifiedBusinesses, positionTypes, approvedByPosition) {
  const jobs = [];
  const openJobs = [];
  const expiredJobs = [];
  const employeeJobs = [];
  const employeeAssignments = [];
  const now = Date.now();
  const assignmentCursorByPosition = new Map();

  async function addJob(data) {
    const created = await prisma.jobPosting.create({ data });
    jobs.push(created);
    return created;
  }

  function pickQualifiedWorker(position_type_id) {
    const candidates = (approvedByPosition.get(position_type_id) || [])
      .filter((candidate) => (
        candidate.activated &&
        candidate.regularProfile?.available &&
        !candidate.regularProfile?.suspended
      ));

    if (candidates.length === 0) {
      throw new Error(`No approved worker available for position_type_id=${position_type_id}`);
    }

    const cursor = assignmentCursorByPosition.get(position_type_id) || 0;
    const worker = candidates[cursor % candidates.length];
    assignmentCursorByPosition.set(position_type_id, cursor + 1);
    return worker;
  }

  for (let i = 0; i < 24; i += 1) {
    const business = i < 12 ? verifiedBusinesses[0] : verifiedBusinesses[(i - 12) % verifiedBusinesses.length];
    const positionType = positionTypes[i % 9];
    const startOffsetHours = 12 + (i % 7) * 20 + (i % 3) * 2;
    const start = new Date(now + startOffsetHours * HOUR);
    const job = await addJob({
      business_id: business.businessProfile.business_id,
      position_type_id: positionType.position_type_id,
      ...salaryRange(i + 1),
      start_time: start,
      end_time: new Date(start.getTime() + (6 + (i % 3)) * HOUR),
      status: "open",
      note: `Open shift for ${positionType.name}.`,
    });
    openJobs.push(job);
  }

  for (let i = 0; i < 6; i += 1) {
    const business = verifiedBusinesses[(i + 1) % verifiedBusinesses.length];
    const positionType = positionTypes[(i + 2) % positionTypes.length];
    const start = new Date(now - (i + 2) * DAY);
    const job = await addJob({
      business_id: business.businessProfile.business_id,
      position_type_id: positionType.position_type_id,
      ...salaryRange(i + 30),
      start_time: start,
      end_time: new Date(start.getTime() + 8 * HOUR),
      status: "open",
      note: "Past shift left open to demonstrate expired listings.",
    });
    expiredJobs.push(job);
  }

  for (let i = 0; i < 8; i += 1) {
    const positionType = positionTypes[i % 4];
    const start = i === 0 ? new Date(now - 2 * HOUR) : new Date(now - (i + 1) * DAY);
    const end = i === 0 ? new Date(now + 4 * HOUR) : new Date(start.getTime() + 8 * HOUR);
    const worker = pickQualifiedWorker(positionType.position_type_id);
    const job = await addJob({
      business_id: verifiedBusinesses[0].businessProfile.business_id,
      position_type_id: positionType.position_type_id,
      ...salaryRange(i + 40),
      start_time: start,
      end_time: end,
      worker_id: worker.id,
      status: "filled",
      filledAt: new Date(start.getTime() - 12 * HOUR),
      note: i === 0 ? "Currently active filled shift for no-show testing." : "Filled shift history.",
    });
    employeeJobs.push(job);
    employeeAssignments.push({
      job_id: job.job_id,
      worker_id: worker.id,
      finalStatus: "filled",
      noShow: false,
    });
  }

  for (let i = 0; i < 4; i += 1) {
    const positionType = positionTypes[(i + 4) % positionTypes.length];
    const start = new Date(now - (10 + i) * DAY);
    const worker = pickQualifiedWorker(positionType.position_type_id);
    const job = await addJob({
      business_id: verifiedBusinesses[0].businessProfile.business_id,
      position_type_id: positionType.position_type_id,
      ...salaryRange(i + 50),
      start_time: start,
      end_time: new Date(start.getTime() + 7 * HOUR),
      worker_id: worker.id,
      status: "filled",
      filledAt: new Date(start.getTime() - 18 * HOUR),
      note: "Completed seeded shift.",
    });
    employeeJobs.push(job);
    employeeAssignments.push({
      job_id: job.job_id,
      worker_id: worker.id,
      finalStatus: "completed",
      noShow: false,
    });
  }

  for (let i = 0; i < 3; i += 1) {
    const positionType = positionTypes[(i + 7) % positionTypes.length];
    const start = new Date(now - (15 + i) * DAY);
    const worker = pickQualifiedWorker(positionType.position_type_id);
    const isNoShowSeed = i < 2;
    const job = await addJob({
      business_id: verifiedBusinesses[0].businessProfile.business_id,
      position_type_id: positionType.position_type_id,
      ...salaryRange(i + 60),
      start_time: start,
      end_time: new Date(start.getTime() + 6 * HOUR),
      worker_id: worker.id,
      status: "filled",
      filledAt: new Date(start.getTime() - 24 * HOUR),
      note: isNoShowSeed ? "Cancelled after no-show report." : "Cancelled seeded shift.",
    });
    employeeJobs.push(job);
    employeeAssignments.push({
      job_id: job.job_id,
      worker_id: worker.id,
      finalStatus: "canceled",
      noShow: isNoShowSeed,
    });
  }

  return { jobs, openJobs, expiredJobs, employeeJobs, employeeAssignments };
}

async function createWorkflowData(openJobs, employeeJobs, employeeAssignments, approvedByPosition) {
  const interests = [];
  const negotiations = [];
  const interestByKey = new Map();
  const negotiationWindowMs = NEGOTIATION_WINDOW_SECONDS * 1000;

  function pickQualifiedCandidate(job, offset = 0) {
    const candidates = (approvedByPosition.get(job.position_type_id) || [])
      .filter((candidate) => candidate.activated && candidate.regularProfile?.available && !candidate.regularProfile?.suspended);
    if (candidates.length === 0) {
      throw new Error(`No approved candidate available for job ${job.job_id}`);
    }
    return candidates[offset % candidates.length];
  }

  async function addInterest(job, candidate, data) {
    const key = `${job.job_id}:${candidate.id}`;
    if (interestByKey.has(key)) {
      return interestByKey.get(key);
    }
    const created = await prisma.jobInterest.create({
      data: {
        job_id: job.job_id,
        candidate_id: candidate.id,
        business_id: job.business_id,
        candidateInterested: data.candidateInterested ?? null,
        businessInvitation: data.businessInvitation ?? null,
        invitationStatus: data.invitationStatus || "open",
      },
    });
    interestByKey.set(key, created);
    interests.push(created);
    return created;
  }

  async function addNegotiation(interest, data) {
    const created = await prisma.negotiation.create({
      data: {
        interest_id: interest.interest_id,
        status: data.status,
        candidateDecision: data.candidateDecision ?? null,
        businessDecision: data.businessDecision ?? null,
        expiresAt: data.expiresAt,
      },
    });
    negotiations.push(created);
    return created;
  }

  const flagshipJob = openJobs[0];
  const flagshipCandidates = (approvedByPosition.get(flagshipJob.position_type_id) || [])
    .filter((candidate) => candidate.activated && candidate.regularProfile?.available && !candidate.regularProfile?.suspended);

  if (flagshipCandidates.length < 13) {
    throw new Error("Not enough qualified candidates for flagship invitation seed.");
  }

  for (let i = 0; i < 12; i += 1) {
    await addInterest(flagshipJob, flagshipCandidates[i], {
      candidateInterested: true,
      businessInvitation: i < 5 ? true : null,
      invitationStatus: i < 5 ? "invited" : "open",
    });
  }
  await addInterest(flagshipJob, flagshipCandidates[12], {
    candidateInterested: false,
    businessInvitation: true,
    invitationStatus: "invited",
  });

  let genericInterestSeed = 0;
  for (const job of [...openJobs, ...openJobs.slice(0, 8)]) {
    const candidates = approvedByPosition.get(job.position_type_id) || [];
    for (let i = 0; i < Math.min(3, candidates.length); i += 1) {
      const candidate = candidates[(genericInterestSeed + i) % candidates.length];
      await addInterest(job, candidate, {
        candidateInterested: i !== 1,
        businessInvitation: i === 1 || i === 2 ? true : null,
        invitationStatus: i === 1 || i === 2 ? "invited" : "open",
      });
    }
    genericInterestSeed += 1;
  }

  for (const assignment of employeeAssignments) {
    const job = employeeJobs.find((item) => item.job_id === assignment.job_id);
    if (!job) continue;

    const worker = await prisma.user.findUnique({
      where: { id: assignment.worker_id },
      include: { regularProfile: true },
    });
    if (!worker) {
      throw new Error(`Assigned worker ${assignment.worker_id} not found for job ${assignment.job_id}`);
    }

    const interest = await addInterest(job, worker, {
      candidateInterested: true,
      businessInvitation: true,
      invitationStatus: "invited",
    });

    await addNegotiation(interest, {
      status: "success",
      candidateDecision: "accept",
      businessDecision: "accept",
      expiresAt: new Date(job.start_time.getTime() - 4 * HOUR),
    });

    if (assignment.finalStatus !== "filled") {
      await prisma.jobPosting.update({
        where: { job_id: job.job_id },
        data: { status: assignment.finalStatus },
      });
    }

    if (assignment.noShow) {
      await prisma.regularProfile.update({
        where: { user_id: worker.id },
        data: { suspended: true, available: false },
      });
    }
  }

  for (let i = 0; i < 4; i += 1) {
    const job = openJobs[13 + i];
    const candidate = pickQualifiedCandidate(job, i + 1);
    const interest = await addInterest(job, candidate, {
      candidateInterested: true,
      businessInvitation: true,
      invitationStatus: "invited",
    });
    await addNegotiation(interest, {
      status: "active",
      expiresAt: new Date(Date.now() + negotiationWindowMs - i * 2 * HOUR),
    });
  }

  for (let i = 0; i < 4; i += 1) {
    const job = openJobs[17 + i];
    const candidate = pickQualifiedCandidate(job, i + 2);
    const interest = await addInterest(job, candidate, {
      candidateInterested: true,
      businessInvitation: true,
      invitationStatus: "invited",
    });
    await addNegotiation(interest, {
      status: "failed",
      candidateDecision: "decline",
      businessDecision: null,
      expiresAt: new Date(Date.now() + DAY),
    });
    await prisma.jobInterest.update({
      where: { interest_id: interest.interest_id },
      data: { candidateInterested: null, businessInvitation: null },
    });
  }

  for (let i = 0; i < 4; i += 1) {
    const job = openJobs[9 + i];
    const candidate = pickQualifiedCandidate(job, i + 3);
    const interest = await addInterest(job, candidate, {
      candidateInterested: true,
      businessInvitation: true,
      invitationStatus: "invited",
    });
    await addNegotiation(interest, {
      status: "failed",
      candidateDecision: null,
      businessDecision: null,
      expiresAt: new Date(Date.now() - (i + 1) * DAY),
    });
    await prisma.jobInterest.update({
      where: { interest_id: interest.interest_id },
      data: { candidateInterested: null, businessInvitation: null },
    });
  }

  return { interests, negotiations };
}

async function keepDemoCandidatesDiscoverable(approvedByPosition) {
  const stableCandidateIds = new Set();

  for (const candidates of approvedByPosition.values()) {
    candidates
      .filter((candidate) => (
        candidate.activated &&
        candidate.regularProfile?.available &&
        !candidate.regularProfile?.suspended
      ))
      .slice(0, DEMO_CANDIDATES_PER_POSITION)
      .forEach((candidate) => stableCandidateIds.add(candidate.id));
  }

  if (stableCandidateIds.size === 0) return 0;

  // Keep a visible demo pool active for grading; otherwise all seeded
  // candidates age out after 5 minutes and the business candidate lists empty.
  await prisma.user.updateMany({
    where: {
      id: { in: [...stableCandidateIds] },
    },
    data: {
      lastActiveAt: new Date(Date.now() + 30 * DAY),
    },
  });

  return stableCandidateIds.size;
}

async function validateSeedData() {
  const violations = [];
  const now = new Date();

  const assignedJobs = await prisma.jobPosting.findMany({
    where: { worker_id: { not: null } },
    include: {
      worker: {
        include: {
          regularProfile: true,
          userQualifications: true,
        },
      },
    },
  });

  for (const job of assignedJobs) {
    const hasApprovedQualification = !!job.worker?.userQualifications?.some(
      (qualification) => (
        qualification.status === "approved" &&
        qualification.position_type_id === job.position_type_id
      )
    );

    if (!hasApprovedQualification) {
      violations.push(`Job ${job.job_id} has worker ${job.worker_id} without approved qualification.`);
    }
  }

  const pendingInvitations = await prisma.jobInterest.findMany({
    where: {
      businessInvitation: true,
      candidateInterested: { not: true },
    },
    include: { jobPosting: true },
  });

  for (const invitation of pendingInvitations) {
    const isClosed = invitation.jobPosting.status !== "open" || invitation.jobPosting.start_time <= now;
    if (isClosed) {
      violations.push(`Interest ${invitation.interest_id} is an invitation on closed job ${invitation.job_id}.`);
    }
  }

  const historicalAssignedJobs = await prisma.jobPosting.findMany({
    where: {
      worker_id: { not: null },
      OR: [
        { status: { in: ["completed", "canceled"] } },
        { status: "filled", end_time: { lte: now } },
      ],
    },
  });

  for (const job of historicalAssignedJobs) {
    const interest = await prisma.jobInterest.findFirst({
      where: {
        job_id: job.job_id,
        candidate_id: job.worker_id,
      },
    });

    if (!interest) {
      violations.push(`Job ${job.job_id} has no matching worker interest.`);
      continue;
    }

    const successNegotiation = await prisma.negotiation.findFirst({
      where: {
        interest_id: interest.interest_id,
        status: "success",
      },
    });

    if (!successNegotiation) {
      violations.push(`Job ${job.job_id} has no successful negotiation for its worker.`);
    }
  }

  const noShowCanceledJobs = await prisma.jobPosting.findMany({
    where: {
      status: "canceled",
      note: { contains: "no-show" },
    },
    include: {
      worker: { include: { regularProfile: true } },
    },
  });

  for (const job of noShowCanceledJobs) {
    if (!job.worker || !job.worker.regularProfile?.suspended || job.worker.regularProfile.available) {
      violations.push(`No-show cancellation job ${job.job_id} is missing worker suspension side effects.`);
    }
  }

  const invalidFutureOpenJobs = await prisma.jobPosting.count({
    where: {
      status: "open",
      start_time: { gt: new Date(now.getTime() + JOB_START_WINDOW_HOURS * HOUR) },
    },
  });

  if (invalidFutureOpenJobs > 0) {
    violations.push(`${invalidFutureOpenJobs} open jobs are outside the job start window.`);
  }

  const invalidActiveNegotiations = await prisma.negotiation.count({
    where: {
      status: "active",
      expiresAt: { gt: new Date(now.getTime() + NEGOTIATION_WINDOW_SECONDS * 1000) },
    },
  });

  if (invalidActiveNegotiations > 0) {
    violations.push(`${invalidActiveNegotiations} active negotiations exceed the configured negotiation window.`);
  }

  if (violations.length > 0) {
    throw new Error(`Seed validation failed:\n- ${violations.join("\n- ")}`);
  }
}

async function seedData() {
  const passwordHash = await hash(DEFAULT_PASSWORD);
  await resetDatabase();

  const admins = await createAdmins(passwordHash);
  const businesses = await createBusinesses(passwordHash);
  const regularUsers = await createRegularUsers(passwordHash);
  const positionTypes = await createPositionTypes();
  const { qualifications, approvedByPosition } = await createQualifications(regularUsers, positionTypes);
  const verifiedBusinesses = businesses.filter((business) => business.businessProfile.verified);
  const { jobs, openJobs, expiredJobs, employeeJobs, employeeAssignments } = await createJobs(
    verifiedBusinesses,
    positionTypes,
    approvedByPosition
  );
  const { interests, negotiations } = await createWorkflowData(
    openJobs,
    employeeJobs,
    employeeAssignments,
    approvedByPosition
  );
  const stableCandidates = await keepDemoCandidatesDiscoverable(approvedByPosition);
  await validateSeedData();

  console.log("\n=== Seed complete ===");
  console.log(`Admins: ${admins.length}`);
  console.log(`Businesses: ${businesses.length}`);
  console.log(`Regular users: ${regularUsers.length}`);
  console.log(`Position types: ${positionTypes.length}`);
  console.log(`Job postings: ${jobs.length} (${openJobs.length} future open, ${expiredJobs.length} derived expired, ${employeeJobs.length} filled/completed/canceled)`);
  console.log(`Qualifications: ${qualifications.length}`);
  console.log(`Job interests: ${interests.length}`);
  console.log(`Negotiations: ${negotiations.length}`);
  console.log(`Pinned discoverable demo candidates: ${stableCandidates}`);
  console.log(`Shared password for all seeded accounts: ${DEFAULT_PASSWORD}`);
  console.log("Featured logins:");
  console.log("  Admin:    admin1@csc309.utoronto.ca / 123123");
  console.log("  Business: business1@csc309.utoronto.ca / 123123");
  console.log("  Regular:  regular1@csc309.utoronto.ca / 123123");
}

seedData()
  .catch((err) => {
    console.error("Seed failed:", err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
