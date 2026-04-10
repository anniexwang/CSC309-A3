const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class QualificationsService{
    static async get_admin_qualifications(where, skip, take) {
        const count = await prisma.userQualification.count({ where });
        const results = await prisma.userQualification.findMany({ 
            where, skip, take,
            include: {
                user: {
                    include: { regularProfile: true }
                },
                position_type: true
            },
        });

        return { count, results };
    }

    static async create_qualification(data) {
        const qualification = await prisma.userQualification.create({
            data, include: { position_type: true, user: {include: {regularProfile: true}} }
        });

        return qualification;
    }

    static async get_qualification(qualificationId) {
        const qualification = await prisma.userQualification.findUnique({ 
            where: { user_qualification_id: qualificationId }, 
            include: {position_type: true, user: {include: {regularProfile: true}}} 
        });

        return qualification;
    }

    static async patch_qualification(where, data) {
        const updatedQual = await prisma.userQualification.update({
            where,
            data,
            include: {
                position_type: true,
                user: { 
                    include: { regularProfile: true }
                }
            }
        });

        return updatedQual;
    }

    static async put_document(where, data) {
        await prisma.userQualification.update({
            where, 
            data
        });
    }

    static async find_first(where) {
        return await prisma.userQualification.findFirst({
            where
        });
    }

    static async qualification_exists(user_id, position_type_id) {
        return await prisma.userQualification.findFirst({
            where: {
                user_id,
                position_type_id
            }
        });
    }
}

module.exports = { QualificationsService };