const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class PositionTypeService {

    static async create(name, description, hidden) {
        const newPositionType = await prisma.positionType.create({
            data: {
                name,
                description,
                hidden
            }
        });
        
        return newPositionType;
    }

    static async retrieve(filters, skip, take, isAdmin) {
        const where = {};
        if (filters.keyword) {
            where.OR = [
                { name: {contains: filters.keyword }},
                { description: {contains: filters.keyword }}
            ];
        }

        if (filters.hidden !== undefined && filters.hidden !== null) {
            where.hidden = filters.hidden;
        }

        const count = await prisma.positionType.count({ where });
        const positions = await prisma.positionType.findMany({ where });

        const approvedCounts = await prisma.userQualification.groupBy({
            by: ["position_type_id"],
            where: {
                status: "approved",
                position_type_id: {
                    in: positions.map((position) => position.position_type_id),
                },
            },
            _count: {
                _all: true,
            },
        });

        const approvedCountByPositionId = approvedCounts.reduce((acc, item) => {
            acc[item.position_type_id] = item._count._all;
            return acc;
        }, {});

        const positionTypes = positions.map(position => ({
            position_type_id: position.position_type_id,
            name: position.name,
            description: position.description,
            hidden: position.hidden,
            num_qualified: approvedCountByPositionId[position.position_type_id] || 0
        }));

        positionTypes.sort((a, b) => {
            if (isAdmin) {
                const countDiff = (a.num_qualified || 0) - (b.num_qualified || 0);
                if (countDiff !== 0) {
                    return filters.numQualifiedOrder === "desc" ? -countDiff : countDiff;
                }
            }

            const nameCompare = a.name.localeCompare(b.name);
            return filters.nameOrder === "desc" ? -nameCompare : nameCompare;
        });

        return {
            positionTypes: positionTypes.slice(skip, skip + take),
            count,
        };
    }

    static async update(positionTypeId, data) {
        const updatedPositionType = await prisma.positionType.update({
            where: {
                position_type_id: positionTypeId
            },
            data
        });

        return updatedPositionType;
    }

    static async delete(positionTypeId) {
        const position = await prisma.positionType.findUnique({
            where: { position_type_id: positionTypeId },
            include: {
                _count: { select: {userQualifications: true } }
            }
        });

        if (!position) return null;

        if (position._count.userQualifications > 0) {
            return false;
        }

        await prisma.positionType.delete({
            where: { position_type_id: positionTypeId }
        });

        return true;
    }

    static async get_by_id(positionTypeId) {
        const positionType = await prisma.positionType.findUnique({
            where: {
                position_type_id: positionTypeId
            }
        });

        return positionType.num_qualified;
    }

    static async get_position(positionTypeId) {
        return await prisma.positionType.findUnique({
            where: { position_type_id: positionTypeId }
        });
    }
}

module.exports = { PositionTypeService};
