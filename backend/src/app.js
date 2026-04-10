'use strict';

const express = require("express");
const cors = require("cors");
const multer = require("multer");

const businessRouter = require("./routes/businesses");
const jobRouter = require("./routes/jobs");
const positionTypesRouter = require("./routes/position-types");
const negotiationRouter = require("./routes/negotiations");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/users");
const qualificationsRouter = require("./routes/qualifications");
const systemRouter = require("./routes/system");

function create_app() {
    const app = express();
    app.use(express.json());
    app.use(cors({
        origin: ["http://localhost:5173", "http://localhost:5174"],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    }));
    global.systemConfig = { 
        negotiationWindow: 172800, // seconds (2 days)
        resetCooldown: 60, // seconds
        availabilityTimeout: 300, // seconds
        jobStartWindow: 168 // hours
    };

    app.use('/uploads', express.static('uploads'));

    app.use('/businesses', businessRouter);
    app.use('/jobs', jobRouter);
    app.use('/negotiations', negotiationRouter);
    app.use('/position-types', positionTypesRouter);
    app.use('/auth', authRouter);
    app.use('/users', userRouter);
    app.use('/qualifications', qualificationsRouter);
    app.use('/position-types', positionTypesRouter);
    app.use('/system', systemRouter);

    app.use((err, _req, res, next) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: "File too large. Maximum size is 5 MB." });
            }
            return res.status(400).json({ error: err.message || "Upload error" });
        }

        if (err && err.message === "Invalid file type") {
            return res.status(400).json({ error: "Invalid file type" });
        }

        return next(err);
    });

    app.use((err, _req, res, _next) => {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    });

    return app;
}

module.exports = { create_app };