const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174"
];

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : defaultOrigins;

module.exports = {
  allowedOrigins,
  isOriginAllowed: (origin) => !origin || allowedOrigins.includes(origin)
};
