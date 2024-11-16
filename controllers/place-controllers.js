const fs = require("fs");
const json = require("body-parser/lib/types/json");
const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const { v4: uuidv4 } = require("uuid");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");

// let Dummy_places = [
//   {
//     id: "p1",
//     title: "raj pat",
//     discription: "One of the Most famous/uniqe sky scrapers in World",
//     // name: "Place 1",
//     // imageUrl:
//     //   "https://upload.wikimedia.org/wikipedia/commons/1/17/India_Gate_from_Rajpath.jpg",
//     address: "Kartavya Path, India Gate, New Delhi, Delhi 110001",
//     location: {
//       lat: "28.613835016548503",
//       lng: "77.22925220795096",
//     },
//     creator: "u1",
//   },
//   {
//     id: "p2",
//     title: "Empire State Building",
//     discription: "One of the Most famous/uniqe sky scrapers in World",
//     // name: "Place 1",
//     // imageUrl:
//     //   "https://upload.wikimedia.org/wikipedia/commons/1/17/India_Gate_from_Rajpath.jpg",
//     address: "Kartavya Path, India Gate, New Delhi, Delhi 110001",
//     location: {
//       lat: "28.613835016548503",
//       lng: "77.22925220795096",
//     },
//     creator: "u2",
//   },
// ];

// const getPlaceBy id =()=>{} or
async function getPlacesById(req, res, next) {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,could not find the Place.",
      500
    );
    return next(error);
  }
  // const place = Dummy_places.find((p) => {
  //   return p.id === placeId;
  // });
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id",
      404
    );
    throw error;
  }
  res.json({ place: place.toObject({ getters: true }) });
}

async function getPlaceByUserId(req, res, next) {
  const userId = req.params.uid;
  //let places;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError("Fetching place failed,please try again.", 500);
    return next(error);
  }
  // const places = Dummy_places.filter((p) => {
  //   return p.creator === userId;
  // });
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find a place for the provided user id", 404)
    );
  }
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
}

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    // "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRfwxHn8xDEMExLXeG1b4Vv33h8yHF98PhMaA&s", // => File Upload module, will be replaced with real image url
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }
  if (!user) {
    const error = new HttpError("Could not find user for provided id.", 404);
    return next(error);
  }

  console.log(user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating place failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

async function updatePlace(req, res, next) {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed , plase check your data.", 422)
    );
  }
  const { title, description } = req.body;
  console.log(description);
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,could not update the Place.",
      500
    );
    return next(error);
  }
  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allow to edit this place.", 401);
    return next(error);
  }
  // const updatePlace = { ...Dummy_places.find((p) => p.id === placeId) };
  // const placeIndex = Dummy_places.findIndex((p) => p.id === placeId);
  place.title = title;
  place.description = description;
  // Dummy_places[placeIndex] = updatePlace;
  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,could not update the Place.",
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
}
async function deletePlace(req, res, next) {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,could not delete the Place1.",
      500
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError("Couldn't find the place for this id.", 404);
    return next(error);
  }
  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError("You are not allow to delete this place.", 401);
    return next(error);
  }
  const imagePath = place.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save();
    sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Something went wrong,could not delete the Place2.",
      500
    );
    return next(error);
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  // Dummy_places = Dummy_places.filter((p) => p.id !== placeId);
  res.status(200).json({ message: "Deleted place." });
}
exports.getPlacesById = getPlacesById;
exports.getPlaceByUserId = getPlaceByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
