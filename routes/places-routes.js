const express = require("express");
const { check } = require("express-validator");
const placesControllers = require("../controllers/place-controllers");
const router = express.Router();
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

router.get("/:pid", placesControllers.getPlacesById);

router.get("/user/:uid", placesControllers.getPlaceByUserId);
router.use(checkAuth);
router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(), // Fix here by separating checks
    check("address").not().isEmpty(),
    check("description").isLength({ min: 7 }),
  ],
  placesControllers.createPlace
);
router.patch(
  "/:pid",
  [check("title").not().isEmpty()],
  placesControllers.updatePlace
);
router.delete("/:pid", placesControllers.deletePlace);

module.exports = router;
