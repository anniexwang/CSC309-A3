const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeJobStatus(job) {
    const now = new Date();
    return job.status !== "open" ? job.status : (now >= job.start_time ? "expired" : "open");
}

class UserAlreadyExistsError extends Error{
    constructor(message) {
        super(message);
        this.name = "UserAlreadyExistsError";
    }
}

class UserNotFoundError extends Error{
    constructor(message) {
        super(message);
        this.name = "UserNotFoundError";
    }
}

class UserService {
    static mapHistoryJob(job) {
        return {
            id: job.job_id,
            status: normalizeJobStatus(job),
            position_type: {
                id: job.position_type.position_type_id,
                name: job.position_type.name
            },
            business: {
                id: job.business.user_id,
                business_name: job.business.business_name
            },
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            start_time: job.start_time.toISOString(),
            end_time: job.end_time.toISOString(),
            filledAt: job.filledAt ? job.filledAt.toISOString() : null,
            updatedAt: job.updatedAt.toISOString()
        };
    }

    static async create(email, user_data, profile_data) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
    
        if (existingUser) {
            throw new UserAlreadyExistsError("User already exists");
        }

        const newUser = await prisma.$transaction(async (tx) => {
            const u = await tx.user.create({
                data: user_data
            });

            profile_data.user_id = u.id;

            await tx.regularProfile.create({
                data: profile_data
            });

            return u;
        });

        return newUser;
    };

    static async get_all(where, include, skip, take) {
        const count = await prisma.user.count({ where });
        const users = await prisma.user.findMany({ where, include, skip, take});

        return { count, users };
    }

    static async patch_suspended(user_id, suspended) {
        const user = await prisma.regularProfile.findUnique({
            where: { user_id }
        });

        if (!user) throw new UserNotFoundError("User not found");

        const updatedUser = await prisma.regularProfile.update({
            where: { user_id },
            data: { suspended }
        });

        return updatedUser;
    }

    static async get_current(userId) {
        const user = prisma.user.findUnique({ 
            where: { id: userId },
            include: { regularProfile: true, userQualifications: true }
        });

        return user;
    }

    static async patch_current(userId, data) {
        const updated = await prisma.regularProfile.update({
            where: { user_id: userId },
            data
        });

        return updated;
    }

    static async update_avatar(id, avatarUrl) {
        await prisma.regularProfile.update({
            where: { user_id: id },
            data: { avatar: avatarUrl }
        });
    }

    static async update_resume(id, resumeUrl) {
        await prisma.regularProfile.update({
            where: { user_id: id },
            data: { resume: resumeUrl }
        });
    }

    static async get_currInvitations(userId, take, skip) {
        const whereClause = { 
            candidate_id: userId,
            businessInvitation: true,
            candidateInterested: { not: true }
        };
        const count = await prisma.jobInterest.count({
            where: whereClause
        });
        const interests = await prisma.jobInterest.findMany({
            where: whereClause,
            orderBy: { updatedAt: "desc" },
            take, skip,
            include: {
                jobPosting: {
                    include: {
                        position_type: true,
                        business: true
                    }
                }
            }
        });

        const results = interests.map(i => {
            const j = i.jobPosting;
            const status = normalizeJobStatus(j);
            return {
                id: j.job_id,
                interest_id: i.interest_id,
                status,
                position_type: {
                    id: j.position_type.position_type_id,
                    name: j.position_type.name
                },
                business: {
                    id: j.business.user_id,
                    business_name: j.business.business_name
                },
                salary_min: j.salary_min,
                salary_max: j.salary_max,
                start_time: j.start_time.toISOString(),
                end_time: j.end_time.toISOString(),
                updatedAt: j.updatedAt.toISOString(),
                interestUpdatedAt: i.updatedAt.toISOString()
            };
        });

        return { count, results };
    }

    // static async get_currInterests(userId, where, sort, order, skip, take) {
    static async get_currInterests(where, orderBy, skip, take) {

        const count = await prisma.jobInterest.count({
            where
        });

        const interests = await prisma.jobInterest.findMany({
            where,
            orderBy,
            skip, take,
            include: {
                jobPosting: {
                    include: {
                        position_type: true,
                        business: true
                    }
                }
            }
        });


        const results = interests.map(i => {
            const j = i.jobPosting;
            const status = normalizeJobStatus(j);
            return {
                interest_id: i.interest_id,
                mutual: !!(i.candidateInterested && i.businessInvitation),
                updatedAt: i.updatedAt.toISOString(),
                job: {
                    id: j.job_id,
                    status: status,
                    position_type: {
                        id: j.position_type.position_type_id,
                        name: j.position_type.name
                    },
                    business: {
                        id: j.business.user_id,
                        business_name: j.business.business_name
                    },
                    salary_min: j.salary_min,
                    salary_max: j.salary_max,
                    start_time: j.start_time.toISOString(),
                    end_time: j.end_time.toISOString(),
                    updatedAt: j.updatedAt.toISOString()
                }
            };
        });

        return { count, results };
    }

    static async get_currHistory(userId, skip, take) {
        const now = new Date();
        const whereClause = {
            worker_id: userId,
            OR: [
                { status: { in: ["completed", "canceled"] } },
                { status: "filled", end_time: { lte: now } }
            ]
        };

        const count = await prisma.jobPosting.count({ where: whereClause });
        const jobs = await prisma.jobPosting.findMany({
            where: whereClause,
            orderBy: [{ end_time: "desc" }, { updatedAt: "desc" }],
            skip,
            take,
            include: {
                position_type: true,
                business: true
            }
        });

        const results = jobs.map((j) => UserService.mapHistoryJob(j));

        return { count, results };
    }

    static async get_upcomingHistory(userId, skip, take) {
        const now = new Date();
        const whereClause = {
            worker_id: userId,
            status: "filled",
            end_time: { gt: now }
        };

        const count = await prisma.jobPosting.count({ where: whereClause });
        const jobs = await prisma.jobPosting.findMany({
            where: whereClause,
            orderBy: [{ start_time: "asc" }, { end_time: "asc" }],
            skip,
            take,
            include: {
                position_type: true,
                business: true
            }
        });

        const results = jobs.map((j) => UserService.mapHistoryJob(j));

        return { count, results };
    }

    static async get_user(user_id) {
        return await prisma.user.findUnique({
            where: {id: user_id},
            include: { regularProfile: true }
        });
    }

    static async get_user_qualifications(userId) {
        const qualifications = await prisma.userQualification.findMany({
            where: { user_id: userId },
            include: { position_type: true },
            orderBy: { updatedAt: "desc" },
        });
        return qualifications.map((q) => ({
            id: q.user_qualification_id,
            position_type_id: q.position_type_id,
            position_type_name: q.position_type.name,
            status: q.status,
            updatedAt: q.updatedAt,
        }));
    }
}

module.exports = { UserService, UserAlreadyExistsError, UserNotFoundError };
