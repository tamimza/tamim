// const adminAuth = basicAuth({
//   users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASSWORD },
//   challenge: true,
// });
const basicAuth = require("express-basic-auth");

const adminAuth = basicAuth({
  users: { admin: "P4ssword" },
  challenge: true,
});

module.exports = adminAuth;
