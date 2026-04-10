const { NegotiationService } = require("../services/negotiations");
const { PrismaClient } = require("@prisma/client");
const { clearNegotiationHistory, emitAccountNotification, get_io, recordNegotiationSystemMessage } = require('../socket');

const prisma = new PrismaClient();

const NEGOTIATION_INCLUDE = {
  interest: {
    include: {
      business: true,
      jobPosting: { include: { position_type: true, business: true } },
      candidate: { include: { regularProfile: true } }
    }
  }
};

function buildUserInterestWhere(userId) {
  return {
    OR: [
      { candidate_id: userId },
      { business: { user_id: userId } }
    ]
  };
}

function serializeNegotiation(negotiation) {
  const job = negotiation.interest.jobPosting;
  const candidate = negotiation.interest.candidate;
  const profile = candidate.regularProfile;

  return {
    id: negotiation.id,
    interest_id: negotiation.interest_id,
    status: negotiation.status,
    createdAt: negotiation.createdAt,
    expiresAt: negotiation.expiresAt,
    updatedAt: negotiation.updatedAt,
    job: {
      id: job.job_id,
      status: job.status,
      position_type: {
        id: job.position_type.position_type_id,
        name: job.position_type.name
      },
      business: {
        id: job.business.user_id,
        business_profile_id: job.business.business_id,
        business_name: job.business.business_name
      },
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time,
      end_time: job.end_time,
      updatedAt: job.updatedAt
    },
    user: {
      id: candidate.id,
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || ""
    },
    decisions: {
      candidate: negotiation.candidateDecision,
      business: negotiation.businessDecision
    }
  };
}

function isNegotiationParticipant(role, userId, negotiation) {
  return (role === 'regular' && negotiation.interest.candidate_id === userId) ||
    (role === 'business' && negotiation.interest.business.user_id === userId);
}

function emitRegularBellNotification(userId, payload) {
  emitAccountNotification(userId, {
    scope: "regular-bell",
    ...payload,
  });
}

function buildNegotiationNotificationBase(negotiation) {
  return {
    negotiationId: negotiation.id,
    jobId: negotiation.interest.jobPosting.job_id,
    businessName: negotiation.interest.jobPosting.business.business_name,
    positionTypeName: negotiation.interest.jobPosting.position_type.name,
  };
}

async function expireNegotiation(negotiation) {
  if (negotiation.status !== "active") return;
  await NegotiationService.updateNegotiation(
    { id: negotiation.id },
    {
      status: "failed",
      updatedAt: new Date()
    }
  );
  await NegotiationService.updateJobInterest(
    { interest_id: negotiation.interest_id },
    { candidateInterested: null, businessInvitation: null }
  );
}

async function expireActiveNegotiationsForUser(userId) {
  const now = new Date();
  const expiredNegotiations = await NegotiationService.findManyNegotiations(
    {
      status: "active",
      expiresAt: { lte: now },
      interest: buildUserInterestWhere(userId)
    },
    { interest: { include: { business: true } } }
  );

  for (const negotiation of expiredNegotiations) {
    await expireNegotiation(negotiation);
  }
}

async function createNegotiationController(req, res) {
  try {
    const role = req.auth.role;
    if (role !== 'regular' && role !== 'business') {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { interest_id } = req.body;
    if (!interest_id) return res.status(400).json({ error: "interest_id is required" });

    const interest = await NegotiationService.findUniqueInterest(
      { interest_id },
      {
        jobPosting: { include: { position_type: true, business: true } },
        candidate: { include: { regularProfile: true } }
      }
    );

    if (!interest) return res.status(404).json({ error: "Interest not found" });

    if (role === 'regular' && interest.candidate_id !== req.auth.id) return res.status(404).json({ error: "Not part of this interest" });
    if (role === 'business' && interest.jobPosting.business.user_id !== req.auth.id) return res.status(404).json({ error: "Not part of this interest" });

    if (!interest.candidateInterested || !interest.businessInvitation) {
      return res.status(403).json({ error: "Interest is not mutual" });
    }

    const job = interest.jobPosting;
    if (job.status !== 'open' && job.status !== 'expired') {
      return res.status(409).json({ error: "Job no longer available for negotiation" });
    }

    await expireActiveNegotiationsForUser(interest.candidate_id);
    await expireActiveNegotiationsForUser(job.business.user_id);

    const now = new Date();
    // Regular users can only be in one active negotiation at a time.
    // Businesses are allowed to handle multiple negotiations concurrently.
    const activeCandidateNegs = await NegotiationService.countActiveNegotiations({
      status: "active",
      expiresAt: { gt: now },
      interest: {
        candidate_id: interest.candidate_id
      }
    });

    if (activeCandidateNegs > 0) {
      const existing = await NegotiationService.findFirstNegotiation(
        { interest_id, status: "active", expiresAt: { gt: now } },
        NEGOTIATION_INCLUDE
      );
      if (existing) {
        return res.status(200).json(serializeNegotiation(existing));
      }

      return res.status(409).json({ error: "Candidate is already in an active negotiation" });
    }

    const isDiscoverable = interest.candidate.activated && !interest.candidate.regularProfile?.suspended;
    if (!isDiscoverable) return res.status(403).json({ error: "Candidate not discoverable" });

    const timeoutSecs = global.systemConfig?.negotiationWindow || 900;
    const expiresAt = new Date(Date.now() + timeoutSecs * 1000);

    const existingNegotiation = await NegotiationService.findFirstNegotiation(
      { interest_id },
      undefined
    );

    const negotiation = existingNegotiation
      ? await NegotiationService.updateNegotiation(
          { id: existingNegotiation.id },
          {
            status: "active",
            candidateDecision: null,
            businessDecision: null,
            expiresAt,
            updatedAt: new Date()
          }
        )
      : await NegotiationService.createNegotiation({
          interest_id,
          status: "active",
          expiresAt
        });

    const negotiationRecord = await NegotiationService.findUniqueNegotiation(
      { id: negotiation.id },
      NEGOTIATION_INCLUDE
    );

    const responseObj = serializeNegotiation(negotiationRecord);

    clearNegotiationHistory(negotiation.id);
    recordNegotiationSystemMessage(
      negotiation.id,
      "Negotiation session started.",
      new Date().toISOString(),
      `started:${negotiation.id}`
    );

    const io = get_io();
    if (io) {
      io.in(`account:${interest.candidate_id}`).socketsJoin(`negotiation:${negotiation.id}`);
      io.in(`account:${job.business.user_id}`).socketsJoin(`negotiation:${negotiation.id}`);
      
      io
        .to(`account:${interest.candidate_id}`)
        .to(`account:${job.business.user_id}`)
        .emit('negotiation:started', { negotiation_id: negotiation.id });
    }

    if (role === "business") {
      emitRegularBellNotification(interest.candidate_id, {
        type: "negotiation-started",
        id: `negotiation-started:${negotiation.id}:${negotiationRecord.updatedAt.toISOString()}`,
        ...buildNegotiationNotificationBase(negotiationRecord),
        updatedAt: negotiationRecord.updatedAt.toISOString(),
      });
    }

    res.status(201).json(responseObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function listNegotiationsController(req, res) {
  try {
    const role = req.auth.role;
    if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: "Forbidden" });

    await expireActiveNegotiationsForUser(req.auth.id);

    const status = req.query.status;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: "Invalid pagination" });
    }

    const validStatuses = ["active", "success", "failed"];
    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const where = {
      interest: buildUserInterestWhere(req.auth.id)
    };

    if (status) {
      where.status = status;
      if (status === "active") {
        where.expiresAt = { gt: new Date() };
      }
    }

    const skip = (page - 1) * limit;
    const [count, negotiations] = await Promise.all([
      NegotiationService.countNegotiations(where),
      NegotiationService.findManyNegotiations(where, NEGOTIATION_INCLUDE, {
        skip,
        take: limit,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }]
      })
    ]);

    return res.status(200).json({
      count,
      results: negotiations.map(serializeNegotiation)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getNegotiationByIdController(req, res) {
  try {
    const role = req.auth.role;
    if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: "Forbidden" });

    const negotiationId = parseInt(req.params.negotiationId, 10);
    if (isNaN(negotiationId)) {
      return res.status(404).json({ error: "Invalid negotiation ID" });
    }

    let negotiation = await NegotiationService.findUniqueNegotiation(
      { id: negotiationId },
      NEGOTIATION_INCLUDE
    );

    if (!negotiation) return res.status(404).json({ error: "Negotiation not found" });
    if (!isNegotiationParticipant(role, req.auth.id, negotiation)) {
      return res.status(404).json({ error: "Negotiation not found" });
    }

    if (negotiation.status === "active" && new Date() > new Date(negotiation.expiresAt)) {
      await expireNegotiation(negotiation);
      negotiation = await NegotiationService.findUniqueNegotiation(
        { id: negotiationId },
        NEGOTIATION_INCLUDE
      );
    }

    return res.status(200).json(serializeNegotiation(negotiation));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getNegotiationController(req, res) {
  try {
    const role = req.auth.role;
    if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: "Forbidden" });

    await expireActiveNegotiationsForUser(req.auth.id);

    const negotiations = await NegotiationService.findManyNegotiations(
      {
        status: "active",
        expiresAt: { gt: new Date() },
        interest: buildUserInterestWhere(req.auth.id)
      },
      NEGOTIATION_INCLUDE,
      {
        take: 2,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }]
      }
    );

    if (negotiations.length === 0) {
      return res.status(404).json({ error: "Not involved in an active negotiation" });
    }

    if (role === "business" && negotiations.length > 1) {
      return res.status(409).json({
        error: "Multiple active negotiations found",
        message: "Use GET /negotiations or a specific negotiation detail endpoint."
      });
    }

    return res.status(200).json(serializeNegotiation(negotiations[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function updateNegotiationDecisionController(req, res) {
  try {
    const role = req.auth.role;
    if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: "Forbidden" });

    const { decision, negotiation_id } = req.body;
    const negotiationId = parseInt(req.params.negotiationId || negotiation_id, 10);
    if (decision !== 'accept' && decision !== 'decline') {
      return res.status(400).json({ error: "Decision must be 'accept' or 'decline'" });
    }
    if (isNaN(negotiationId)) return res.status(400).json({ error: "negotiation_id is required" });

    let negotiation = await NegotiationService.findUniqueNegotiation(
      { id: negotiationId },
      NEGOTIATION_INCLUDE
    );

    if (!negotiation) return res.status(404).json({ error: "Negotiation not found" });

    if (!isNegotiationParticipant(role, req.auth.id, negotiation)) {
      return res.status(404).json({ error: "Not involved in this negotiation" });
    }

    if (negotiation.status !== "active") {
      return res.status(409).json({ error: "Negotiation is not active" });
    }

    if (new Date() > new Date(negotiation.expiresAt)) {
      await expireNegotiation(negotiation);
      const expiredAt = new Date().toISOString();
      const io = get_io();
      const eventKey = `${negotiation.id}:${expiredAt}:expired`;

      recordNegotiationSystemMessage(
        negotiation.id,
        "Negotiation expired before both parties accepted.",
        expiredAt,
        eventKey
      );

      if (io) {
        io
          .to(`account:${negotiation.interest.candidate_id}`)
          .to(`account:${negotiation.interest.business.user_id}`)
          .to(`negotiation:${negotiationId}`)
          .emit("negotiation:status", {
            eventKey,
            negotiation_id: negotiation.id,
            status: "failed",
            updatedAt: expiredAt,
            decisions: {
              candidate: negotiation.candidateDecision,
              business: negotiation.businessDecision,
            },
            message: "Negotiation expired before both parties accepted.",
          });
      }

      emitRegularBellNotification(negotiation.interest.candidate_id, {
        type: "negotiation-status",
        id: `negotiation-status:${negotiation.id}:${expiredAt}:failed`,
        ...buildNegotiationNotificationBase(negotiation),
        status: "failed",
        message: "Negotiation expired before both parties accepted.",
        updatedAt: expiredAt,
      });
      return res.status(409).json({ error: "Negotiation expired" });
    }

    let candDec = role === 'regular' ? decision : negotiation.candidateDecision;
    let busDec = role === 'business' ? decision : negotiation.businessDecision;
    let newStatus = "active";

    if (decision === 'decline') {
      newStatus = "failed";
    } else if (candDec === 'accept' && busDec === 'accept') {
      newStatus = "success";
    }

    const now = new Date();
    let siblingClosures = [];

    if (newStatus === "success") {
      const txResult = await prisma.$transaction(async (tx) => {
        const current = await tx.negotiation.findUnique({
          where: { id: negotiationId },
          include: {
            interest: {
              include: {
                business: true,
                jobPosting: true
              }
            }
          }
        });

        if (!current) {
          return { kind: "missing" };
        }

        if (current.status !== "active") {
          return { kind: "inactive" };
        }

        if (now > new Date(current.expiresAt)) {
          await tx.negotiation.update({
            where: { id: negotiationId },
            data: { status: "failed", updatedAt: now }
          });
          await tx.jobInterest.update({
            where: { interest_id: current.interest_id },
            data: {
              candidateInterested: null,
              businessInvitation: null,
              updatedAt: now
            }
          });
          return { kind: "expired" };
        }

        const job = current.interest.jobPosting;
        if (job.status !== "open" && job.status !== "expired") {
          await tx.negotiation.update({
            where: { id: negotiationId },
            data: { status: "failed", updatedAt: now }
          });
          await tx.jobInterest.update({
            where: { interest_id: current.interest_id },
            data: {
              candidateInterested: null,
              businessInvitation: null,
              updatedAt: now
            }
          });
          return { kind: "job_unavailable" };
        }

        const siblings = await tx.negotiation.findMany({
          where: {
            status: "active",
            id: { not: negotiationId },
            interest: { job_id: current.interest.job_id }
          },
          include: {
            interest: {
              include: {
                business: true
              }
            }
          }
        });

        await tx.negotiation.update({
          where: { id: negotiationId },
          data: {
            candidateDecision: candDec,
            businessDecision: busDec,
            status: "success",
            updatedAt: now
          }
        });

        await tx.jobPosting.update({
          where: { job_id: current.interest.job_id },
          data: {
            status: "filled",
            worker_id: current.interest.candidate_id,
            filledAt: now,
            updatedAt: now
          }
        });

        await tx.user.update({
          where: { id: current.interest.candidate_id },
          data: { lastActiveAt: now }
        });

        if (siblings.length > 0) {
          const siblingIds = siblings.map((sibling) => sibling.id);
          const siblingInterestIds = siblings.map((sibling) => sibling.interest_id);

          await tx.negotiation.updateMany({
            where: { id: { in: siblingIds } },
            data: {
              status: "failed",
              updatedAt: now
            }
          });

          await tx.jobInterest.updateMany({
            where: { interest_id: { in: siblingInterestIds } },
            data: {
              candidateInterested: null,
              businessInvitation: null,
              updatedAt: now
            }
          });
        }

        return {
          kind: "updated",
          siblingClosures: siblings.map((sibling) => ({
            id: sibling.id,
            candidate_id: sibling.interest.candidate_id,
            business_user_id: sibling.interest.business.user_id,
            candidateDecision: sibling.candidateDecision,
            businessDecision: sibling.businessDecision
          }))
        };
      });

      if (txResult.kind === "missing") {
        return res.status(404).json({ error: "Negotiation not found" });
      }

      if (txResult.kind === "inactive") {
        return res.status(409).json({ error: "Negotiation is not active" });
      }

      if (txResult.kind === "expired") {
        return res.status(409).json({ error: "Negotiation expired" });
      }

      if (txResult.kind === "job_unavailable") {
        return res.status(409).json({ error: "Job is no longer available" });
      }

      siblingClosures = txResult.siblingClosures;
    } else {
      await NegotiationService.updateNegotiation(
        { id: negotiationId },
        {
          candidateDecision: candDec,
          businessDecision: busDec,
          status: newStatus,
          updatedAt: now
        }
      );

      if (newStatus === "failed") {
        await NegotiationService.updateJobInterest(
          { interest_id: negotiation.interest_id },
          { candidateInterested: null, businessInvitation: null, updatedAt: now }
        );
        await NegotiationService.updateUser(
          { id: negotiation.interest.candidate_id },
          { lastActiveAt: now }
        );
      }
    }

    const updated = await NegotiationService.findUniqueNegotiation(
      { id: negotiationId },
      NEGOTIATION_INCLUDE
    );

    const actorLabel = role === "business" ? "Business" : "Candidate";
    let statusMessage = `${actorLabel} accepted. Waiting for the other party...`;
    if (decision === "decline") {
      statusMessage = `${actorLabel} declined the negotiation.`;
    } else if (newStatus === "success") {
      statusMessage = "Both parties accepted — job filled!";
    }

    const eventKey = `${updated.id}:${updated.updatedAt.toISOString()}:${decision}:${role}`;
    recordNegotiationSystemMessage(
      updated.id,
      statusMessage,
      updated.updatedAt.toISOString(),
      eventKey
    );

    const io = get_io();
    if (io) {
      io
        .to(`account:${negotiation.interest.candidate_id}`)
        .to(`account:${negotiation.interest.business.user_id}`)
        .to(`negotiation:${negotiationId}`)
        .emit("negotiation:status", {
          eventKey,
          negotiation_id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt.toISOString(),
          decision,
          actor: {
            id: req.auth.id,
            role,
          },
          decisions: {
            candidate: updated.candidateDecision,
            business: updated.businessDecision,
          },
          message: statusMessage,
        });

      if (newStatus === "success") {
        const siblingMessage = "This negotiation ended because the job was filled through another negotiation.";
        const siblingUpdatedAt = updated.updatedAt.toISOString();

        for (const sibling of siblingClosures) {
          const siblingEventKey = `${sibling.id}:${siblingUpdatedAt}:superseded`;
          recordNegotiationSystemMessage(
            sibling.id,
            siblingMessage,
            siblingUpdatedAt,
            siblingEventKey
          );

          io
            .to(`account:${sibling.candidate_id}`)
            .to(`account:${sibling.business_user_id}`)
            .to(`negotiation:${sibling.id}`)
            .emit("negotiation:status", {
              eventKey: siblingEventKey,
              negotiation_id: sibling.id,
              status: "failed",
              updatedAt: siblingUpdatedAt,
              decisions: {
                candidate: sibling.candidateDecision,
                business: sibling.businessDecision,
              },
              message: siblingMessage,
            });
        }
      }
    }

    if (role === "business") {
      emitRegularBellNotification(negotiation.interest.candidate_id, {
        type: "negotiation-status",
        id: `negotiation-status:${updated.id}:${updated.updatedAt.toISOString()}:${updated.status}`,
        ...buildNegotiationNotificationBase(updated),
        status: updated.status,
        message: statusMessage,
        updatedAt: updated.updatedAt.toISOString(),
      });
    }

    if (newStatus === "success") {
      const siblingUpdatedAt = updated.updatedAt.toISOString();
      for (const sibling of siblingClosures) {
        emitRegularBellNotification(sibling.candidate_id, {
          type: "negotiation-status",
          id: `negotiation-status:${sibling.id}:${siblingUpdatedAt}:failed`,
          negotiationId: sibling.id,
          jobId: updated.interest.jobPosting.job_id,
          businessName: updated.interest.jobPosting.business.business_name,
          positionTypeName: updated.interest.jobPosting.position_type.name,
          status: "failed",
          message: "This negotiation ended because the job was filled through another negotiation.",
          updatedAt: siblingUpdatedAt,
        });
      }
    }

    return res.status(200).json(serializeNegotiation(updated));

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function otherRouteController(_req, res) {
  return res.status(404).json({ message: "Method Not Allowed" });
}

module.exports = {
  createNegotiationController,
  listNegotiationsController,
  getNegotiationByIdController,
  getNegotiationController,
  updateNegotiationDecisionController,
  otherRouteController
};
