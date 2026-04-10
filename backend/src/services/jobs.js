const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class JobService {
    static async findUniqueJob(where, include) {
        return await prisma.jobPosting.findUnique({ where, include });
    }

    static async findFirstQualification(where) {
        return await prisma.userQualification.findFirst({ where });
    }

    static async findFirstInterest(where) {
        return await prisma.jobInterest.findFirst({ where });
    }

    static async findFirstNegotiation(where) {
        return await prisma.negotiation.findFirst({ where });
    }

    static async updateInterest(where, data) {
        return await prisma.jobInterest.update({
            where,
            data: {
                ...data,
                updatedAt: data.updatedAt || new Date()
            }
        });
    }

    static async createInterest(data) {
        return await prisma.jobInterest.create({ data });
    }

    static async updateUser(where, data) {
        return await prisma.user.update({ where, data });
    }

    static async getAllJobs(where, orderBy, skip, take) {
        const count = await prisma.jobPosting.count({ where });
        const results = await prisma.jobPosting.findMany({
            where,
            orderBy,
            skip,
            take,
            include: {
                position_type: true,
                business: true
            }
        });

        return { count, results };
    }

    static async getAll(where) {
        const count = await prisma.jobPosting.count({ where });
        const results = await prisma.jobPosting.findMany({
            where,
            include: {
                position_type: true,
                business: true
            }
        });

        return { count, results };
    }

    static async get_with_id(where, include) {
        return await prisma.jobPosting.findUnique({ where, include });
    }

    static async patch_no_show(job_id, user_id) {
        await prisma.$transaction([
            prisma.jobPosting.update({
                where: { job_id },
                data: { status: "canceled", updatedAt: new Date() }
            }),
            prisma.regularProfile.update({
                where: { user_id },
                data: { suspended: true, available: false }
            })
        ]);
    }

    static async get(job_id) {
        return await prisma.jobPosting.findUnique({
            where: { job_id },
            include: { worker: true, business: true }
        });
    }

    static async get_qualifications(position_type_id, job_id) {
        return await prisma.userQualification.findMany({
            where: { position_type_id, status: "approved" },
            include: {
                user: {
                    include: {
                        regularProfile: true,
                        jobInterests: {
                            where: { 
                                job_id,
                                businessInvitation: true
                            }
                        }
                    }
                }
            }
        });
    }
}

module.exports = { JobService };
