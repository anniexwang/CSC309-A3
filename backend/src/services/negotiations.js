const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class NegotiationService {
    static async countActiveNegotiations(where) {
        return await prisma.negotiation.count({ where });
    }

    static async countNegotiations(where) {
        return await prisma.negotiation.count({ where });
    }

    static async findFirstNegotiation(where, include) {
        return await prisma.negotiation.findFirst({ where, include });
    }

    static async findUniqueNegotiation(where, include) {
        return await prisma.negotiation.findUnique({ where, include });
    }

    static async findUniqueInterest(where, include) {
        return await prisma.jobInterest.findUnique({ where, include });
    }

    static async findManyNegotiations(where, include, options = {}) {
        return await prisma.negotiation.findMany({ where, include, ...options });
    }

    static async createNegotiation(data) {
        return await prisma.negotiation.create({ data });
    }

    static async updateNegotiation(where, data) {
        return await prisma.negotiation.update({ where, data });
    }

    static async updateJobPosting(where, data) {
        return await prisma.jobPosting.update({ where, data });
    }

    static async updateUser(where, data) {
        return await prisma.user.update({ where, data });
    }

    static async updateJobInterest(where, data) {
        return await prisma.jobInterest.update({
            where,
            data: {
                ...data,
                updatedAt: data.updatedAt || new Date()
            }
        });
    }
}

module.exports = { NegotiationService };
