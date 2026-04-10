class SystemService {
    static async get_availability_timeout() {
        return global.systemConfig.availabilityTimeout;
    }

    static async get_reset_cooldown() {
        return global.systemConfig.resetCooldown;
    }

    static async get_negotiation_window() {
        return global.systemConfig.negotiationWindow;
    }

    static async get_job_start_window() {
        return global.systemConfig.jobStartWindow;
    }

    static async update_availability_timeout(new_timeout) {
        global.systemConfig.availabilityTimeout = new_timeout;
    }

    static async update_reset_cooldown(new_cooldown) {
        global.systemConfig.resetCooldown = new_cooldown;
    }

    static async update_negotiation_window(new_window) {
        global.systemConfig.negotiationWindow = new_window;
    }

    static async update_job_start_window(new_window) {
        global.systemConfig.jobStartWindow = new_window;
    }
}

module.exports = { SystemService };
