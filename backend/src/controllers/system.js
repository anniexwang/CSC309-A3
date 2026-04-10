const { SystemService } = require("../services/system");

async function getNegotiationWindowController(_req, res) {
    try {
        const negotiation_window = await SystemService.get_negotiation_window();

        return res.status(200).json({ negotiation_window });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getResetCooldownController(_req, res) {
    try {
        const reset_cooldown = await SystemService.get_reset_cooldown();

        return res.status(200).json({ reset_cooldown });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getAvailabilityTimeoutController(_req, res) {
    try {
        const availability_timeout = await SystemService.get_availability_timeout();

        return res.status(200).json({ availability_timeout });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getJobStartWindowController(_req, res) {
    try {
        const job_start_window = await SystemService.get_job_start_window();

        return res.status(200).json({ job_start_window });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function updateNegotiationWindowController(req, res) {
    const negotiation_window = parseInt(req.body.negotiation_window) || 0;

    if (negotiation_window <= 0) return res.status(400).json({ message: "Invalid payload" });

    try {
        await SystemService.update_negotiation_window(negotiation_window);

        return res.status(200).json({ negotiation_window });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function updateResetCooldownController(req, res) {
    const reset_cooldown = parseInt(req.body.reset_cooldown) || 0;

    if (reset_cooldown <= 0) return res.status(400).json({ message: "Invalid payload" });

    try {
        await SystemService.update_reset_cooldown(reset_cooldown);

        return res.status(200).json({ reset_cooldown });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function updateAvailabilityTimeoutController(req, res) {
    const availability_timeout = parseInt(req.body.availability_timeout) || 0;

    if (availability_timeout <= 0) return res.status(400).json({ message: "Invalid payload" });

    try {
        await SystemService.update_availability_timeout(availability_timeout);

        return res.status(200).json({ availability_timeout });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function updateJobStartWindowController(req, res) {
    const job_start_window = parseInt(req.body.job_start_window) || 0;

    if (job_start_window <= 0) return res.status(400).json({ message: "Invalid payload" });

    try {
        await SystemService.update_job_start_window(job_start_window);

        return res.status(200).json({ job_start_window });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function geocodeAddressController(req, res) {
    try {
        const address = String(req.query.address || "").trim();
        if (!address) {
            return res.status(400).json({ error: "address is required" });
        }

        const upstreamUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const upstreamRes = await fetch(upstreamUrl, {
            headers: {
                Accept: "application/json",
                "User-Agent": "TempingPlatform/1.0 (contact@temping.local)"
            }
        });

        if (!upstreamRes.ok) {
            return res.status(502).json({ error: "Unable to geocode address right now" });
        }

        const payload = await upstreamRes.json();
        if (!Array.isArray(payload) || payload.length === 0) {
            return res.status(404).json({ error: "Address could not be located" });
        }

        return res.status(200).json({
            lat: Number(payload[0].lat),
            lon: Number(payload[0].lon)
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function otherRouteController(_req, res) {
  return res.status(404).json({ message: "Method Not Allowed" });
}

module.exports = { updateAvailabilityTimeoutController, updateResetCooldownController, updateJobStartWindowController, updateNegotiationWindowController,
    getAvailabilityTimeoutController, getResetCooldownController, getJobStartWindowController, getNegotiationWindowController,
    geocodeAddressController,
    otherRouteController
 };
