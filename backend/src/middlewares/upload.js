const multer = require("multer");
const fs = require("fs");
const path = require("path");

function sanitizeDocumentName(originalName) {
  const ext = path.extname(originalName).toLowerCase() || ".pdf";
  const baseName = path
    .basename(originalName, path.extname(originalName))
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim();

  return `${baseName || "document"}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destPath = path.join(__dirname, "../../uploads");
    if (req.auth) {
      const type = req.auth.role === "business" ? "businesses" : "users";
      destPath = path.join(destPath, type, String(req.auth.id));
      if (req.params.qualificationId) {
        destPath = path.join(destPath, "qualification", String(req.params.qualificationId));
      }
    }
    fs.mkdirSync(destPath, { recursive: true });
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, sanitizeDocumentName(file.originalname));
    } else {
      const ext = file.mimetype === "image/png" ? ".png" : ".jpg";
      cb(null, `avatar${ext}`);
    }
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/jpeg", "image/png"];
  const allowedDocumentTypes = ["application/pdf"];

  if (allowedImageTypes.includes(file.mimetype) || allowedDocumentTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = {
  upload
};
