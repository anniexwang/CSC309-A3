const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

var jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_assignment";

class AuthService {

    static async get_user_by_email(email) {
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });
        return user;
    }

    static async request_token(email) {
        const resetToken = uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const user = await prisma.user.update({
            where: {
                email
            },
            data: {
                resetToken,
                expiresAt,
            }
        });
        return user;
    }

    static async get_reset_token(email) {
        const resetToken = await prisma.user.findUnique({
            where: {
                email
            },
            select: {
                resetToken: true,
                expiresAt: true
            }
        });
        return resetToken;
    }

    static async get_user_by_token(resetToken) {
        const user = await prisma.user.findUnique({
            where: {
                resetToken
            }
        });

        return user;
    }

    static async activate_account_or_reset_password(email, password) {
        const data = {
            activated: true,
            resetToken: null
        }

        if (password) {
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            data.password = passwordHash;
        }

        const user = await prisma.user.update({
            where: {
                email
            },
            data
        });

        return user;
    }

    static async authenticate_and_generate_token(email, password) {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) return null;

        const match = await bcrypt.compare(password, user.password);
        if (!match) return null;

        if (!user.activated) return "NOT_ACTIVATED";

        const token = jwt.sign({ email, role: user.role, id: user.id }, JWT_SECRET, { expiresIn: '30d' });
        const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await prisma.user.update({
            where: { email },
            data: { token, tokenExpiresAt }
        });

        return { token, tokenExpiresAt };
    }
}

module.exports = { AuthService };