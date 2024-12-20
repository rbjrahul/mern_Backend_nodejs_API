const express = require("express");

const { check } = require("express-validator");
const usersControllers = require("../controllers/user-controllers");
const fileUpload = require("../middleware/file-upload");
const { emit } = require("nodemon");
const router = express.Router();

router.get("/", usersControllers.getUsers);
router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],

  usersControllers.signup
);
router.post(
  "/login",
  [
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  usersControllers.login
);

module.exports = router;
