const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");

const parseCookies = (cookieHeader) => {
  const cookies = {};

  if (!cookieHeader) {
    return cookies;
  }

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");

    if (!name) {
      return;
    }

    cookies[name] = decodeURIComponent(rest.join("="));
  });

  return cookies;
};

const socketAuth = (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    const cookies = parseCookies(cookieHeader);

    const token = cookies.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, jwtSecret);

    socket.user = decoded;

    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);

    next(new Error("Invalid or expired token"));
  }
};

module.exports = socketAuth;