const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class PositionsService {
    static async position_exists(position_type_id) {
        const position_type = await prisma.positionType.findFirst({ where: { position_type_id, hidden: false }});
        
        if (!position_type) return false;
        return true;
    }
}

module.exports = { PositionsService };