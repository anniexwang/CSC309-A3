const { UserService, UserAlreadyExistsError, UserNotFoundError } = require("../services/users");
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

function hasRegularProfile(user) {
    return !!(user && user.regularProfile);
}

async function createRegularUserController(req, res) {
    const { 
        first_name, last_name, email, password, 
        phone_number, postal_address, birthday
    } = req.body;

    if (first_name === undefined) return res.status(400).json({ message: "Invalid payload"});
    if (last_name === undefined) return res.status(400).json({ message: "Invalid payload"});
    if (email === undefined) return res.status(400).json({ message: "Invalid payload"});
    if (password === undefined) return res.status(400).json({ message: "Invalid payload"});

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+~`|}{[\]:;?><,./-]).{8,20}$/;
    if (!passRegex.test(password)) {
        return res.status(400).json({ error: "Password does not meet requirements" });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (birthday && !dateRegex.test(birthday)) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user_data = { 
        email, password: passwordHash, resetToken, expiresAt, role: "regular",
        isAdmin: false, activated: false
    };

    const profile_data = { 
        first_name, last_name, 
        suspended: false, available: false
    };

    if (postal_address !== undefined) profile_data.postal_address = postal_address;
    if (phone_number !== undefined) profile_data.phone_number = phone_number;
    if (birthday !== undefined) profile_data.birthday = birthday;

    try {
        const newUser = await UserService.create(email, user_data, profile_data);

        const returnData = { 
            id: newUser.id, first_name, last_name, email, activated: false,
            role: "regular", createdAt: newUser.createdAt, 
            resetToken: newUser.resetToken, expiresAt: newUser.expiresAt
        };

        returnData.phone_number = (phone_number === undefined) ? "" : phone_number;
        returnData.postal_address = (postal_address === undefined) ? "" : postal_address;
        returnData.birthday = (birthday === undefined) ? "1970-01-01" : birthday;

        return res.status(201).json(returnData);

    } catch (err) {
        if (err instanceof UserAlreadyExistsError ) {
            return res.status(409).json({ message: "User already exists" });
        }
        res.status(500).json({ message: `${err}` });
    }
}

async function getAllRegularUsersController(req, res) {
    const { keyword, activated, suspended, page: reqPage, limit: reqLimit } = req.query;
    const page = parseInt(reqPage) || 1;
    const limit = parseInt(reqLimit) || 10;

    const skip = (page - 1) * limit;
    const take = limit;

    const where = {};

    if (keyword !== undefined) {
        where.OR = [];

        where.OR.push({ email: { contains: keyword } });
        where.OR.push({ regularProfile: { is: { first_name: { contains: keyword } } } });
        where.OR.push({ regularProfile: { is: { last_name: { contains: keyword } } } });
        where.OR.push({ regularProfile: { is: { phone_number: { contains: keyword } } } });
    }

    if (activated !== undefined) where.activated = activated === "true";
    if (suspended !== undefined) {
        where.regularProfile = {
            ...(where.regularProfile || {}),
            is: {
                ...((where.regularProfile && where.regularProfile.is) || {}),
                suspended: suspended === "true",
            },
        };
    }

    where.role = "regular";

    const include = { regularProfile: true };

    try {
        const { count, users } = await UserService.get_all(where, include, skip, take);

        const results = users.map(user => {
            return {
                id: user.id, first_name: user.regularProfile.first_name,
                last_name: user.regularProfile.last_name, email: user.email,
                activated: user.activated,
                suspended: user.regularProfile.suspended, role: user.role,
                phone_number: user.regularProfile.phone_number,
                postal_address: user.regularProfile.postal_address
            }
        });

        return res.status(200).json({ count, results });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: `${err}` });
    }
}

async function getUserByIdController(req, res) {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) return res.status(404).json({ message: "User not found" });

        const user = await UserService.get_user(userId);
        if (!user || user.role !== "regular" || !user.regularProfile) {
            return res.status(404).json({ message: "User not found" });
        }

        const qualifications = await UserService.get_user_qualifications(userId);

        return res.status(200).json({
            id: user.id,
            first_name: user.regularProfile.first_name,
            last_name: user.regularProfile.last_name,
            email: user.email,
            activated: user.activated,
            suspended: user.regularProfile.suspended,
            role: "regular",
            phone_number: user.regularProfile.phone_number,
            postal_address: user.regularProfile.postal_address,
            birthday: user.regularProfile.birthday,
            createdAt: user.createdAt,
            avatar: user.regularProfile.avatar,
            resume: user.regularProfile.resume,
            biography: user.regularProfile.biography,
            qualifications,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function patchUserSuspendedController(req, res) {
    const isAdmin = req.auth && req.auth.role === 'admin';
    if (!isAdmin) return res.status(401).json({ message: "Not admin" });

    const userId = parseInt(req.params.userId);
    if (!userId) return res.status(404).json({ message: "User not found"});

    const { suspended } = req.body;
    if (typeof suspended !== 'boolean') return res.status(400).json({ message: "Invalid payload" });

    try {
        const updatedUser = await UserService.patch_suspended(userId, suspended);

        return res.status(200).json({
            id: userId,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            email: updatedUser.email,
            activated: updatedUser.activated,
            suspended: updatedUser.suspended,
            role: "regular",
            phone_number: updatedUser.phone_number,
            postal_address: updatedUser.postal_address
        });
    } catch (err) {
        console.log(err);
        if (err instanceof UserNotFoundError) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(500).json({ message: `${err}` });
    }
}

async function getCurrentUserController(req, res) {
    const authenticated = req.auth;
    const regular = req.auth.role;
    const userId = req.auth.id;

    if (!authenticated || !regular) return res.status(401).json({ message: "Not authenicated or regular user"});
    if (!userId) return res.status(404).json({ message: `User not found, id is: ${userId}`});
    
    try {
        const user = await UserService.get_current(userId);
        if (!hasRegularProfile(user)) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.regularProfile.avatar === undefined) user.regularProfile.avatar = null;
        if (user.regularProfile.resume === undefined) user.regularProfile.resume = null;

        return res.status(200).json({
            id: user.id, 
            first_name: user.regularProfile.first_name,
            last_name: user.regularProfile.last_name,
            email: user.email,
            activated: user.activated,
            suspended: user.regularProfile.suspended,
            available: user.regularProfile.available,
            role: "regular",
            phone_number: user.regularProfile.phone_number,
            postal_address: user.regularProfile.postal_address,
            birthday: user.regularProfile.birthday,
            createdAt: user.createdAt,
            avatar: user.regularProfile.avatar,
            resume: user.regularProfile.resume,
            biography: user.regularProfile.biography
        });
    } catch (err) {
        console.log(err);
        if (err instanceof UserNotFoundError) {
            return res.status(404).json({ message: "User not found"});
        }
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function patchCurrentUserController(req, res) {
    const authenticated = req.auth;
    const regular = req.auth.role;
    const userId = req.auth.id;

    if (!authenticated || !regular) return res.status(401).json({ message: "Not authenicated or regular user"});
    if (!userId) return res.status(404).json({ message: "User not found"});

    const user = await UserService.get_current(userId);

    if (!hasRegularProfile(user)) return res.status(404).json({ message: "User not found" });

    const { 
        first_name, last_name, phone_number, postal_address, birthday,
        avatar, biography
    } = req.body;

    const data = {}

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (first_name !== undefined) data.first_name = first_name;
    if (last_name !== undefined) data.last_name = last_name;
    if (phone_number !== undefined) data.phone_number = phone_number;
    if (postal_address !== undefined) data.postal_address = postal_address;
    if (birthday !== undefined && dateRegex.test(birthday)) data.birthday = birthday;
    if (avatar !== undefined) data.avatar = avatar;
    if (biography !== undefined) data.biography = biography;

    if (Object.keys(data).length === 0) res.status(400).json({ message: "Invalid payload"});

    try {
        await UserService.patch_current(userId, data);

        data.id = user.id;

        return res.status(200).json(data);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function patchCurrentUserAvailabilityController(req, res) {
    const authenticated = req.auth;
    const regular = req.auth.role;
    const userId = req.auth.id;

    if (!authenticated || !regular) return res.status(401).json({ message: "Not authenicated or regular user"});
    if (!userId) return res.status(404).json({ message: "User not found"});

    const user = await UserService.get_current(userId);

    if (!hasRegularProfile(user)) return res.status(404).json({ message: "User not found" });

    const { available } = req.body;

    if (available === undefined || typeof available !== "boolean") return res.status(400).json({ message: "Invalid payload" });

    if (available === true && (user.regularProfile.suspended === true || user.userQualifications.length === 0)) {
        return res.status(400).json({ message: "User suspended or has no qualifications"});
    }

    const data = { available };

    try {
        await UserService.patch_current(userId, data);

        return res.status(200).json(data);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error"});
    }
}

async function putUserAvatarController(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const allowed_types = ["image/png", "image/jpeg"];

    if (!allowed_types.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type" });
    } 

    const avatarUrl = `/uploads/users/${req.auth.id}/${req.file.filename}`;
    const data = { avatar: avatarUrl };

    try {
        await UserService.update_avatar(req.auth.id, avatarUrl);

        return res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function putUserResumeController(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const allowed_types = ["application/pdf"];

    if (!allowed_types.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type" });
    } 

    const resumeUrl = `/uploads/users/${req.auth.id}/${req.file.filename}`;
    const data = { resume: resumeUrl };

    try {
        await UserService.update_resume(req.auth.id, resumeUrl);

        return res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getCurrentUserInvitationsController(req, res) {
    const authenticated = req.auth;
    const regular = req.auth.role;
    const userId = req.auth.id;

    if (!authenticated || !regular) return res.status(401).json({ message: "Not authenicated or regular user"});
    if (!userId) return res.status(404).json({ message: "User not found"});

    const user = await UserService.get_current(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;
    const take = limit;

    try {
        const { count, results } = await UserService.get_currInvitations(userId, take, skip);

        return res.status(200).json({ count, results });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error"});
    }
}


async function getCurrentUserInterestsController(req, res) {
    // keyword - search for keyword in position type name or business name
    // mutual - filter by whether there is mutual interest
    // open - filter by where the job is open
    // position_type_id - filter by position type
    // business_id - filter by business
    // sort - sort by updatedAt, start_time, salary_min, salary_max, position_type name, business_name
    // order - asc or desc
    const { keyword, mutual, open, position_type_id, business_id, sort = "start_time", order = "asc"} = req.query;

    const valid_sorts = [
        "updatedAt", "start_time", "salary_min", "salary_max", "position_type_name", "business_name"
    ];

    const valid_orders = [
        "asc", "desc"
    ];

    if (!valid_sorts.includes(sort)) return res.status(400).json({ error: "Invalid payload" });

    if (!valid_orders.includes(order)) return res.status(400).json({ error: "Invalid payload" });

    try {
        const authenticated = req.auth;
        const userId = req.auth.id;

        if (!authenticated || req.auth.role !== "regular") return res.status(401).json({ message: "Not authenicated or regular user"});
        if (!userId) return res.status(404).json({ message: "User not found"});

        const user = await UserService.get_current(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        const where = {
            candidate_id: userId, 
            candidateInterested: true
        };

        let orderBy = {};

        if (sort === "position_type_name") {
            orderBy = { jobPosting: { position_type: { name: order } } };
        } else if (sort === "business_name") {
            orderBy = { jobPosting: { business: { business_name: order } } };
        } else {
            orderBy = { jobPosting: { [sort]: order } };
        }

        if (keyword) {
            const kw = keyword;
            const orClauses = [
                { jobPosting: { position_type: { name: { contains: kw } } } },
                { jobPosting: { business: { business_name: { contains: kw } } } },
            ];
            where.OR = orClauses;
        }

        if (position_type_id) {
            where.jobPosting = {
                ...where.jobPosting,
                position_type_id: parseInt(position_type_id)
            };
        }
        if (business_id) {
            where.jobPosting = {
                ...where.jobPosting,
                business: { user_id: parseInt(business_id) }
            };
        }

        if (mutual !== undefined) {
            if (mutual === "true") {
                where.businessInvitation = true;
            } else {
                where.businessInvitation = false;
            }
        }

        if (open !== undefined) {
            const status = open === "true" ? "open" : "expired";
            where.jobPosting = {
                ...where.jobPosting,
                status: status
            };
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;
        const take = limit;

        const { count, results } = await UserService.get_currInterests(where, orderBy, skip, take);

        return res.status(200).json({ count, results });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getCurrentUserQualificationsController(req, res) {
    try {
        const userId = req.auth.id;
        const qualifications = await UserService.get_user_qualifications(userId);
        return res.status(200).json({ results: qualifications });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getCurrentUserJobHistoryController(req, res) {
    try {
        const authenticated = req.auth;
        const userId = req.auth.id;

        if (!authenticated || req.auth.role !== "regular") return res.status(401).json({ message: "Not authenicated or regular user"});
        if (!userId) return res.status(404).json({ message: "User not found"});

        const user = await UserService.get_current(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const upcomingPage = Math.max(1, parseInt(req.query.upcoming_page, 10) || 1);
        const upcomingLimit = Math.max(1, parseInt(req.query.upcoming_limit, 10) || 10);
        const historyPage = Math.max(1, parseInt(req.query.history_page, 10) || 1);
        const historyLimit = Math.max(1, parseInt(req.query.history_limit, 10) || 10);

        const upcomingSkip = (upcomingPage - 1) * upcomingLimit;
        const historySkip = (historyPage - 1) * historyLimit;

        const [upcoming, history] = await Promise.all([
            UserService.get_upcomingHistory(userId, upcomingSkip, upcomingLimit),
            UserService.get_currHistory(userId, historySkip, historyLimit)
        ]);

        return res.status(200).json({
            upcoming: {
                count: upcoming.count,
                page: upcomingPage,
                limit: upcomingLimit,
                results: upcoming.results
            },
            history: {
                count: history.count,
                page: historyPage,
                limit: historyLimit,
                results: history.results
            }
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function otherRouteController(_req, res) {
  return res.status(404).json({ message: "Method Not Allowed" });
}

module.exports = {
    createRegularUserController, getAllRegularUsersController, 
    getUserByIdController, getCurrentUserController, patchUserSuspendedController, 
    patchCurrentUserController, patchCurrentUserAvailabilityController,
    putUserAvatarController, putUserResumeController,
    getCurrentUserInterestsController, getCurrentUserInvitationsController,
    getCurrentUserQualificationsController, getCurrentUserJobHistoryController,
    otherRouteController
};
