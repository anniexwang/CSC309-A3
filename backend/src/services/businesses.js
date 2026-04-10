const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class UserAlreadyExistsError extends Error{
    constructor(message) {
        super(message);
        this.name = "UserAlreadyExistsError";
    }
}

class BusinessService {
    static async create(business_name, owner_name, email, 
        password, phone_number, postal_address, location) {
        
        const existingUser = await prisma.user.findUnique({ where: { email } });
    
        if (existingUser) {
            throw new UserAlreadyExistsError("User already exists");
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        const resetToken = uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const newUser = await prisma.$transaction(async (tx) => {
            const u = await tx.user.create({
                data: {
                    email: email,
                    password: passwordHash,
                    role: "business",
                    isAdmin: false,
                    activated: false,
                    resetToken: resetToken,
                    expiresAt: expiresAt,
                    lastActiveAt: new Date()
                }
            });

            await tx.businessProfile.create({
                data: {
                    user_id: u.id,
                    business_name: business_name,
                    owner_name: owner_name,
                    verified: false,
                    phone_number: phone_number,
                    postal_address: postal_address,
                    location: JSON.stringify(location)
                }
            });

            return u;
        });

        return newUser;
    }

    static async get_all(
        where, skip, take, orderBy, include
    ){
        const count = await prisma.user.count({ where });
        const businesses = await prisma.user.findMany({
            where,
            skip,
            take,
            orderBy,
            include
        });

        return { count, businesses };
    }

    static async get_me(where, include) {
        const b = await prisma.user.findUnique({
            where,
            include
        });

        return b;
    }

    static async patch_me(where, data) {
        const updated = await prisma.businessProfile.update({
            where,
            data
        });

        return updated;
    }

    static async update_avatar(where, data) {
        await prisma.businessProfile.update({
            where,
            data
        });
    }

    static async create_job_posting(data, include) {
        const job = await prisma.jobPosting.create({
            data,
            include
        });

        return job;
    }

    static async get_my_jobs(where, take, skip, include) {
        const count = await prisma.jobPosting.count({ where });
        const jobs = await prisma.jobPosting.findMany({
        where,
        skip,
        take,
        include
        });

        return { count, jobs };
    }

    static async findUniqueJob(where) {
        const job = await prisma.jobPosting.findUnique({ where });
        return job;
    }

    static async updateJobPosting(where, data) {
        await prisma.jobPosting.update({ where, data });
    }

    static async updateJobNegotiations(where, data) {
        await prisma.negotiation.updateMany({
            where,
            data
        });
    }

    static async countActiveNegotiations(where) {
        const activeNegotiations = await prisma.negotiation.count({
            where
        });

        return activeNegotiations;
    }

    static async deleteAllRelatedToJob(job_id) {
        await prisma.$transaction([
            prisma.negotiation.deleteMany({
                where: {
                    interest: {
                        job_id
                    }
                }
            }),
            prisma.jobInterest.deleteMany({
                where: { job_id }
            }),
            prisma.jobPosting.delete({
                where: { job_id }
            })
        ]);
    }

    static async updateBusinessProfile(where, data) {
        await prisma.businessProfile.update({
            where,
            data
        });
    }

    static async get_by_id(business_id) {
        return await prisma.businessProfile.findUnique({
            where: { business_id }
        });
    }
}

module.exports = { BusinessService, UserAlreadyExistsError };
