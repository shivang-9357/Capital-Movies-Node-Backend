const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');


const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      'User exists already, please login instead.',
      422
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      'Could not create user, please try again.',
      500
    );
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    places: []
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      'Could not log you in, please check your credentials and try again.',
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    );
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token
  });
};

const addFavourite = async(req, res, next)=>{
  const { movieId } = req.body;
  const userId = req.params.uid;
  let existingUser;

  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
        const error = new HttpError(
      'Unauthorized Request',
      401
    );
    return next(error);
  }

  existingUser.favourites.push(movieId);
  try {
    await existingUser.save();
  } catch (error) {
    return new HttpError('Adding to favourites Failed, Please try Again.');
  }
  res.json({
    favourites: existingUser.favourites
  });
}

const getFavourite = async(req, res, next)=>{
  const userId = req.params.uid;
  let existingUser;

  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
        const error = new HttpError(
      'Unauthorized Request',
      401
    );
    return next(error);
  }

  res.json({
    favourites: existingUser.favourites
  });
}

const removeFavourite = async(req, res, next)=>{
  const userId = req.params.uid;
  const movieId = req.params.mid;
  let existingUser;

  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
        const error = new HttpError(
      'Unauthorized Request',
      401
    );
    return next(error);
  }
  existingUser.favourites = existingUser.favourites.filter(m=>m!==movieId.toString());

  try {
    await existingUser.save()
  } catch (error) {
    return new HttpError('Cannot remove from favourites, Please try again.', 501);
  }

  res.json({
    favourites: existingUser.favourites
  });
}


exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.addFavourite = addFavourite;
exports.getFavourite = getFavourite;
exports.removeFavourite = removeFavourite;
