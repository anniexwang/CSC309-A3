'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middlewares/auth');
const { NegotiationService } = require('./services/negotiations');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let ioInstance;
const negotiationMessageHistory = new Map();
const MAX_HISTORY_MESSAGES = 50;

function emitAccountNotification(userId, payload) {
  if (!ioInstance || !userId || !payload) return;
  ioInstance.to(`account:${userId}`).emit("notification:event", payload);
}

function appendNegotiationHistory(negotiationId, message) {
  const history = negotiationMessageHistory.get(negotiationId) || [];
  history.push(message);
  if (history.length > MAX_HISTORY_MESSAGES) {
    history.splice(0, history.length - MAX_HISTORY_MESSAGES);
  }
  negotiationMessageHistory.set(negotiationId, history);
}

function clearNegotiationHistory(negotiationId) {
  negotiationMessageHistory.delete(negotiationId);
}

function recordNegotiationSystemMessage(negotiationId, text, createdAt = new Date().toISOString(), eventKey) {
  appendNegotiationHistory(negotiationId, {
    negotiation_id: negotiationId,
    sender: { role: "system", id: null },
    text,
    createdAt,
    _eventKey: eventKey,
  });
}

async function getActiveNegotiationForUser(negotiationId, userId) {
  const negotiation = await NegotiationService.findUniqueNegotiation(
    { id: negotiationId },
    {
      interest: {
        include: {
          business: true,
          candidate: {
            include: {
              regularProfile: true,
            },
          },
          jobPosting: {
            include: {
              position_type: true,
              business: true,
            },
          },
        },
      },
    }
  );

  if (!negotiation || negotiation.status !== "active") {
    return null;
  }

  if (new Date() > new Date(negotiation.expiresAt)) {
    await NegotiationService.updateNegotiation(
      { id: negotiation.id },
      { status: "failed", updatedAt: new Date() }
    );
    await NegotiationService.updateJobInterest(
      { interest_id: negotiation.interest_id },
      { candidateInterested: null, businessInvitation: null }
    );
    return null;
  }

  const candidateId = negotiation.interest.candidate_id;
  const businessUserId = negotiation.interest.business.user_id;
  if (userId !== candidateId && userId !== businessUserId) {
    return false;
  }

  const userActiveNegCount = await NegotiationService.countActiveNegotiations({
    id: negotiationId,
    status: "active",
    expiresAt: { gt: new Date() },
    interest: {
      OR: [
        { candidate_id: userId },
        { business: { user_id: userId } }
      ]
    }
  });

  return userActiveNegCount > 0 ? negotiation : null;
}

function attach_sockets(server) {
  const io = new Server(server, { cors: { origin: '*' } });
  ioInstance = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.userId = decoded.id;
      socket.role = decoded.role;
      if (!socket.role && socket.userId) {
        try {
          const user = await prisma.user.findUnique({ where: { id: socket.userId } });
          if (user) socket.role = user.role;
        } catch (e) {}
      }
      next();
    });
  });

  io.on('connection', (socket) => {
    if (!socket.userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`account:${socket.userId}`);

    socket.on('negotiation:join', async (data, callback) => {
      try {
        const negotiationId = data?.negotiation_id;
        if (!negotiationId) {
          const payload = { error: "Negotiation not found (or not active)", message: "Missing negotiation_id" };
          if (typeof callback === "function") callback(payload);
          return socket.emit('negotiation:error', payload);
        }

        const negotiation = await getActiveNegotiationForUser(negotiationId, socket.userId);
        if (negotiation === false) {
          const payload = { error: "Not part of this negotiation", message: "You are not involved in this negotiation" };
          if (typeof callback === "function") callback(payload);
          return socket.emit('negotiation:error', payload);
        }
        if (!negotiation) {
          const payload = { error: "Negotiation mismatch", message: "Negotiation is not an active negotiation you are part of" };
          if (typeof callback === "function") callback(payload);
          return socket.emit('negotiation:error', payload);
        }

        socket.join(`negotiation:${negotiationId}`);
        const history = negotiationMessageHistory.get(negotiationId) || [];
        if (typeof callback === "function") {
          callback({
            negotiation_id: negotiationId,
            messages: history
          });
        } else if (history.length > 0) {
          socket.emit('negotiation:history', {
            negotiation_id: negotiationId,
            messages: history
          });
        }
      } catch (error) {
        console.error("Socket error:", error);
        const payload = { error: "Internal error", message: "An error occurred while joining the negotiation" };
        if (typeof callback === "function") callback(payload);
        socket.emit('negotiation:error', payload);
      }
    });

    socket.on('negotiation:message', async (data) => {
      try {
        if (!socket.userId) {
          return socket.emit('negotiation:error', { error: "Not authenticated", message: "User not authenticated" });
        }

        const negotiationId = data.negotiation_id;
        if (!negotiationId) {
          return socket.emit('negotiation:error', { error: "Negotiation not found (or not active)", message: "Missing negotiation_id" });
        }

        const negotiation = await getActiveNegotiationForUser(negotiationId, socket.userId);
        if (negotiation === false) {
          return socket.emit('negotiation:error', { error: "Not part of this negotiation", message: "You are not involved in this negotiation" });
        }
        if (!negotiation) {
          return socket.emit('negotiation:error', { error: "Negotiation mismatch", message: "Negotiation is not an active negotiation you are part of" });
        }
        
        socket.join(`negotiation:${negotiationId}`);

        const responsePayload = {
          negotiation_id: negotiationId,
          sender: {
            role: socket.role,
            id: socket.userId
          },
          text: data.text,
          createdAt: new Date().toISOString()
        };

        appendNegotiationHistory(negotiationId, responsePayload);

        io.to(`negotiation:${negotiationId}`).emit('negotiation:message', responsePayload);

        if (socket.role === "business") {
          const businessProfile = negotiation.interest.business;
          emitAccountNotification(negotiation.interest.candidate_id, {
            scope: "regular-chat",
            type: "negotiation-message",
            id: `negotiation-message:${negotiationId}:${responsePayload.createdAt}:${socket.userId}`,
            negotiationId,
            jobId: negotiation.interest.job_id,
            businessName: businessProfile?.business_name || "",
            positionTypeName: negotiation.interest.jobPosting?.position_type?.name || "",
            previewText: data.text,
            updatedAt: responsePayload.createdAt,
          });
        } else if (socket.role === "regular") {
          const candidateName = `${negotiation.interest.candidate?.regularProfile?.first_name || ""} ${negotiation.interest.candidate?.regularProfile?.last_name || ""}`.trim();
          emitAccountNotification(negotiation.interest.business.user_id, {
            scope: "business-negotiations",
            type: "negotiation-message",
            id: `business-negotiation-message:${negotiationId}:${responsePayload.createdAt}:${socket.userId}`,
            negotiationId,
            counterpartName: candidateName,
            previewText: data.text,
            updatedAt: responsePayload.createdAt,
          });
        }
      } catch (error) {
        console.error("Socket error:", error);
        socket.emit('negotiation:error', { error: "Internal error", message: "An error occurred while processing your message" });
      }
    });
  });

  return io;
}

function get_io() {
  return ioInstance;
}

module.exports = {
  attach_sockets,
  get_io,
  emitAccountNotification,
  clearNegotiationHistory,
  recordNegotiationSystemMessage,
};