const { AuthService } = require("../services/auth");

const resetRequests = new Map();

async function requestTokenController(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }

  try {
    const user = await AuthService.get_user_by_email(email);

    console.log(user);

    // 404 User not found
    if (!user) {
      return res.status(404).json({ error: "Not Found" });
    }

    const ip = req.ip;
    const now = Date.now();
    const cooldown = global.systemConfig.resetCooldown || 0;

    // 429 Too Many Requests error
    if (resetRequests.has(ip)) {
      const lastTimestamp = resetRequests.get(ip);
      if (now - lastTimestamp < cooldown * 1000) {
        return res.status(429).json({ error: "Too Many Requests" });
      }
    }

    const token = await AuthService.request_token(email);

    resetRequests.set(ip, now);

    res.status(202).json({
      expiresAt: token.expiresAt,
      resetToken: token.resetToken
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function activateOrResetController(req, res) {
  const { resetToken } = req.params;
  const { email, password } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }
    if (!password) {
      return res.status(400).json({ error: "Missing password" });
    }

    const user = await AuthService.get_user_by_token(resetToken);

    if (!user || user.resetToken === null) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "Gone" });
    }

    if (user.email !== email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+~`|}{[\]:;?><,./-]).{8,20}$/;
    if (!passRegex.test(password)) {
      return res.status(400).json({ error: "Password does not meet requirements" });
    }

    await AuthService.activate_account_or_reset_password(email, password);

    return res.status(200).json({ activated: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }   
}

async function authenticateAndGenerateTokenController(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }
  
  try {
    const result = await AuthService.authenticate_and_generate_token(email, password);

    if (!result) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (result === "NOT_ACTIVATED") {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json({
      token: result.token,
      expiresAt: result.tokenExpiresAt
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function otherRouteController(_req, res) {
  res.status(404).json({ error: "Method Not Allowed" });
}

module.exports = { 
  requestTokenController,
  activateOrResetController,
  authenticateAndGenerateTokenController,
  otherRouteController
};