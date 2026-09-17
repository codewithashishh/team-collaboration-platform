const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredVariables = ["DATABASE_URL", "JWT_SECRET"];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVariables.join(", ")}`
  );
}

try {
  const databaseUrl = new URL(process.env.DATABASE_URL);

  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    throw new Error("Invalid protocol");
  }
} catch (error) {
  throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
}

const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  port
};
