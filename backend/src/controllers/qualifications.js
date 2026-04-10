const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { QualificationsService } = require("../services/qualifications");
const { PositionsService } = require("../services/positions");
const { UserService } = require("../services/users");
const { emitAccountNotification } = require("../socket");

const prisma = new PrismaClient();
const ADMIN_REVIEW_STATUSES = new Set(["created", "submitted", "revised"]);
const ADMIN_UPDATE_STATUSES = new Set(["approved", "rejected"]);

function buildAdminQualificationNotificationPayload(qualification, type) {
    const updatedAt = qualification?.updatedAt
        ? new Date(qualification.updatedAt).toISOString()
        : new Date().toISOString();
    const candidateName = `${qualification?.user?.regularProfile?.first_name || ""} ${qualification?.user?.regularProfile?.last_name || ""}`.trim();
    const positionTypeName = qualification?.position_type?.name || "";
    const status = qualification?.status || "";
    const scopeType = type || "qualification-updated";

    return {
        scope: "admin-bell",
        type: scopeType,
        id: `admin-qualification:${qualification?.user_qualification_id}:${scopeType}:${status}:${updatedAt}`,
        qualificationId: qualification?.user_qualification_id,
        candidateName,
        positionTypeName,
        status,
        message:
            scopeType === "qualification-needs-review"
                ? `${candidateName || "A candidate"} submitted a ${positionTypeName || "qualification"} update for review.`
                : `${candidateName || "A candidate"}'s ${positionTypeName || "qualification"} status is now ${status}.`,
        createdAt: updatedAt,
        updatedAt,
    };
}

async function emitAdminQualificationNotification(qualification, type, excludeUserId = null) {
    const admins = await prisma.user.findMany({
        where: {
            role: "admin",
            activated: true,
        },
        select: { id: true },
    });

    if (!admins.length) return;
    const payload = buildAdminQualificationNotificationPayload(qualification, type);
    admins.forEach((admin) => {
        if (excludeUserId && Number(admin.id) === Number(excludeUserId)) return;
        emitAccountNotification(admin.id, payload);
    });
}

async function getQualificationsAdminAttentionController(req, res) {
    try {
        const keyword = req.query.keyword;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

    const where = {
        // status: {
        //     in: ["submitted", "revised"]
        // }
    };

    if (keyword) {
        where.OR = [
            {
                user: {
                    regularProfile: {
                        first_name: { contains: keyword }
                    }
                }
            },
            {
                user: {
                    regularProfile: {
                        last_name: { contains: keyword }
                    }
                }
            },
            {
                user : {
                    regularProfile: {
                        postal_address: { contains: keyword }
                    }
                }
            },
            {
                user: {
                    email: { contains: keyword }
                }
            },
            {
                user: {
                    regularProfile: {
                        phone_number: { contains: keyword }
                    }
                }
            }
        ];
    }

        const skip = (page - 1) * limit;
        const take = limit;

        const { count, results } = await QualificationsService.get_admin_qualifications(where, skip, take);

        const filtered_results = results.map(qual => {
            return {
                id: qual.user_qualification_id,
                status: qual.status,
                user: {
                    id: qual.user.id,
                    first_name: qual.user.regularProfile.first_name,
                    last_name: qual.user.regularProfile.last_name
                },
                position_type: {
                    id: qual.position_type_id,
                    name: qual.position_type.name
                },
                updatedAt: qual.updatedAt
            }
        });

        return res.status(200).json({ count, results: filtered_results });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: `${err}`});
    }
}

async function createQualificationController(req, res) {
    try {
        const userId = req.auth.id;
        const { position_type_id, note } = req.body;

        if (!position_type_id) return res.status(400).json({ message: "position_type_id is required" });

        const position_exists = await PositionsService.position_exists(position_type_id);
        if (!position_exists) return res.status(404).json({ message: "Position Type doesn't exist"});

        const user = await UserService.get_user(userId);
        if (!user) return res.status(404).json({ message: "User doesn't exist" });

        if (user.role !== "regular") return res.status(403).json({ message: "Not a regular user" });

        const data = { user_id: userId, position_type_id };
        if (note !== undefined) data.note = note;

        const existingQual = await QualificationsService.qualification_exists(userId, position_type_id);
        if (existingQual) return res.status(409).json({ message: "Qualification already exists for this position" });

        const qual = await QualificationsService.create_qualification(data);

        if (ADMIN_REVIEW_STATUSES.has(qual.status)) {
            await emitAdminQualificationNotification(qual, "qualification-needs-review");
        }

        return res.status(201).json({
            id: qual.user_qualification_id,
            status: qual.status,
            note: qual.note,
            user: {
                id: qual.user.id,
                first_name: qual.user.regularProfile.first_name,
                last_name: qual.user.regularProfile.last_name
            },
            position_type: {
                id: qual.position_type.position_type_id,
                name: qual.position_type.name
            },
            updatedAt: qual.updatedAt
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: `${err}` });
    }
}

async function getQualificationController(req, res) {
    try {
        const userId = req.auth.id;
        const role = req.auth.role;

        const qualificationId = parseInt(req.params.qualificationId, 10);
        if (isNaN(qualificationId)) {
            return res.status(404).json({ message: "Qualification doesn't exist" });
        }

        const qualification = await QualificationsService.get_qualification(qualificationId);
        if (!qualification) return res.status(404).json({ message: "Qualification doesn't exist" });

        const user = await UserService.get_user(userId);
        if (!user) return res.status(404).json({ message: "User doesn't exist" });

        // regular users can only see their own
        if (role === "regular" && qualification.user_id !== userId) {
            return res.status(404).json({ message: "Qualification doesn't exist" });
        }

        // businesses can only see approved qualifications when the candidate
        // has an active interest on a matching position type for one of their jobs
        if (role === "business") {
            const hasValidInterest =
                qualification.status === "approved" &&
                await prisma.jobInterest.findFirst({
                    where: {
                        candidate_id: qualification.user_id,
                        candidateInterested: true,
                        business: {
                            user_id: userId,
                        },
                        jobPosting: {
                            position_type_id: qualification.position_type_id
                        }
                    }
                });

            if (!hasValidInterest) {
                return res.status(403).json({ message: "Forbidden" });
            }
        }
        
        const return_obj = {
            id: qualification.user_qualification_id,
            document: qualification.document,
            note: qualification.note,
            position_type: {
                id: qualification.position_type.position_type_id,
                name: qualification.position_type.name,
                description: qualification.position_type.description
            },
            updatedAt: qualification.updatedAt,
        }
        
        let userData = {}

        if (role !== "business") {
            userData = {
                id: qualification.user.id,
                first_name: qualification.user.regularProfile.first_name,
                last_name: qualification.user.regularProfile.last_name,
                role: "regular",
                avatar: qualification.user.regularProfile.avatar,
                resume: qualification.user.regularProfile.resume,
                biography: qualification.user.regularProfile.biography,
                email: qualification.user.email,
                phone_number: qualification.user.regularProfile.phone_number,
                postal_address: qualification.user.regularProfile.postal_address,
                birthday: qualification.user.regularProfile.birthday,
                activated: qualification.user.activated,
                suspended: qualification.user.regularProfile.suspended,
                createdAt: qualification.user.createdAt
            }

            return_obj.user = userData;
            return_obj.status = qualification.status;
        } else {
            userData = {
                id: qualification.user.id,
                first_name: qualification.user.regularProfile.first_name,
                last_name: qualification.user.regularProfile.last_name,
                role: "regular",
                avatar: qualification.user.regularProfile.avatar,
                resume: qualification.user.regularProfile.resume,
                biography: qualification.user.regularProfile.biography
            }

            return_obj.user = userData;
        }

        return res.status(200).json(return_obj);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" })
    }
}

async function patchQualificationController(req, res) {
    try {
        const userId = req.auth.id;
        const role = req.auth.role;
        const { status, note } = req.body;

        const admin_allowed = ["approved", "rejected"];
        const regular_allowed = ["submitted", "revised"];

        const qualificationId = parseInt(req.params.qualificationId, 10);
        if (isNaN(qualificationId)) {
            return res.status(404).json({ message: "Qualification doesn't exist" });
        }

        if (!status && !note) return res.status(400).json({ message: `Invalid payload: status: ${status}, note: ${note}` });

        if (status && ((role === "regular" && admin_allowed.includes(status)) || (role === "admin" && regular_allowed.includes(status)))) {
            return res.status(403).json({ message: "Attempting to change status with incorrect role" });
        }

        if (status && ((role === "admin" && !admin_allowed.includes(status)) || (role === "regular" && !regular_allowed.includes(status)))) {
            return res.status(403).json({ message: "Invalid payload" });
        }

        const user = await UserService.get_user(userId);
        if (!user) return res.status(404).json({ message: "User doesn't exist" });
        
        const qualification = await QualificationsService.get_qualification(qualificationId);
        if (!qualification) return res.status(404).json({ message: "Qualification doesn't exist" });

        if (role === "regular" && (qualification.user_id !== user.id)) return res.status(403).json({ message: "Cannot change diff user's qual" });

        const curr_status = qualification.status;

        if (role === "regular" && status) {
            if ((curr_status === "created" && status !== "submitted")) return res.status(400).json({ message: "Invalid payload"});
            if ((curr_status === "approved" || curr_status === "rejected") && status !== "revised") return res.status(403).json({ message: "Invalid payload" });
        }

        if (role === "admin" && status) {
            if ((curr_status === "created" || curr_status === "submitted" || curr_status === "revised") &&
                (status !== "approved" && status !== "rejected")) {
                return res.status(403).json({ message: "Invalid payload" });
            }
        }

        const where = { user_qualification_id: qualificationId };
        const data = {};

        if (status) data.status = status;
        if (note) data.note = note;
        data.updatedAt = new Date();

        const updatedQual = await QualificationsService.patch_qualification(where, data);

        if (status && ADMIN_REVIEW_STATUSES.has(status)) {
            await emitAdminQualificationNotification(updatedQual, "qualification-needs-review");
        } else if (status && ADMIN_UPDATE_STATUSES.has(status)) {
            const excludeUserId = role === "admin" ? userId : null;
            await emitAdminQualificationNotification(updatedQual, "qualification-updated", excludeUserId);
        }

        return res.status(200).json({
            id: updatedQual.user_qualification_id,
            status: updatedQual.status,
            document: updatedQual.document,
            note: updatedQual.note,
            user: {
                id: updatedQual.user.id,
                first_name: updatedQual.user.regularProfile.first_name,
                last_name: updatedQual.user.regularProfile.last_name
            },
            position_type: {
                id: updatedQual.position_type.position_type_id,
                description: updatedQual.position_type.description,
                name: updatedQual.position_type.name
            },
            updatedAt: updatedQual.updatedAt
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function putQualificationDocumentController(req, res) {
    try {
        const userId = req.auth.id;
        const role = req.auth.role;

        const qualificationId = parseInt(req.params.qualificationId, 10);
        if (isNaN(qualificationId)) {
            return res.status(404).json({ message: "Qualification not found" });
        }

        const qualification = await QualificationsService.get_qualification(qualificationId);
        if (!qualification) return res.status(404).json({ message: "Qualification not found" });

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const allowed_types = ["application/pdf"];

        if (!allowed_types.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Invalid file type" });
        } 

        if (role !== "regular") {
            return res.status(403).json({ message: "Forbidden" });
        }

        const user = await UserService.get_user(userId);
        if (!user) return res.status(404).json({ message: "User doesn't exist" });

        if (qualification.user_id !== userId) {
            return res.status(403).json({ message: "Qualification not found" });
        }

        const uploadsRoot = path.join(__dirname, "../../uploads");
        const finalDir = path.join(
            uploadsRoot,
            "users",
            String(userId),
            "position_type",
            String(qualification.position_type_id)
        );
        const finalPath = path.join(finalDir, req.file.filename);

        fs.mkdirSync(finalDir, { recursive: true });

        if (req.file.path !== finalPath) {
            if (fs.existsSync(finalPath)) {
                fs.unlinkSync(finalPath);
            }
            fs.renameSync(req.file.path, finalPath);
        }

        const documentUrl = `/uploads/users/${userId}/position_type/${qualification.position_type_id}/${req.file.filename}`;
        const data = { document: documentUrl };
        const where = { user_qualification_id: qualificationId };

        await QualificationsService.put_document(where, data);

        return res.status(200).json({ document: documentUrl });
    } catch (err) {
        if (err && err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File too large. Maximum size is 5 MB." });
        }
        if (err && err.message === "Invalid file type") {
            return res.status(400).json({ error: "Invalid file type" });
        }
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function otherRouteController(_req, res) {
  return res.status(404).json({ message: "Method Not Allowed" });
}

module.exports = { 
    getQualificationsAdminAttentionController, createQualificationController, getQualificationController,
    patchQualificationController, putQualificationDocumentController,
    otherRouteController
};
