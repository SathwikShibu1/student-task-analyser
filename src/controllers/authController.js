const User = require('../models/User');

const generateToken =
  require('../utils/token');

const {
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../utils/email');

/* COOKIE */

function setTokenCookie(
  res,
  token,
  remember
){

  res.cookie('token', token, {

    httpOnly:true,

    sameSite:
      process.env.NODE_ENV
      === 'production'
      ? 'strict'
      : 'lax',

    secure:
      process.env.NODE_ENV
      === 'production',

    maxAge:
      remember
      ? 30 * 24 * 60 * 60 * 1000
      : undefined
  });
}

/* SIGNUP */

async function signup(
  req,
  res,
  next
){

  try{

    const {
      name,
      email,
      password
    } = req.body;

    if(
      !name
      ||
      !email
      ||
      !password
    ){

      res.status(400);

      throw new Error(
        'Please fill all fields'
      );
    }

    const existing =
      await User.findOne({
        email
      });

    if(
      existing
      &&
      existing.isVerified
    ){

      res.status(409);

      throw new Error(
        'Account already exists'
      );
    }

    const otp =
      Math.floor(
        100000 + Math.random() * 900000
      ).toString();

    if(
      existing
      &&
      !existing.isVerified
    ){

      existing.name = name;

      existing.password =
        password;

      existing.emailOtp =
        otp;

      existing.emailOtpExpires =
        Date.now()
        + 10 * 60 * 1000;

      await existing.save();

    }else{

      await User.create({

        name,
        email,
        password,

        isVerified:false,

        emailOtp:otp,

        emailOtpExpires:
          Date.now()
          + 10 * 60 * 1000
      });
    }

    const user =
      await User.findOne({
        email
      });

    await sendVerificationEmail(
      user,
      otp
    );

    res.status(201).json({

      message:
        'OTP sent successfully'
    });

  }catch(err){

    next(err);
  }
}

/* VERIFY SIGNUP OTP */

async function verifyOtp(
  req,
  res,
  next
){

  try{

    const {
      email,
      otp
    } = req.body;

    const user =
      await User.findOne({

        email,

        emailOtp:otp,

        emailOtpExpires:{
          $gt:Date.now()
        }
      });

    if(!user){

      res.status(400);

      throw new Error(
        'Invalid or expired OTP'
      );
    }

    user.isVerified = true;

    user.emailOtp = null;

    user.emailOtpExpires = null;

    await user.save();
res.clearCookie('token');
    res.json({
      message:
        'Account verified successfully'
    });

  }catch(err){

    next(err);
  }
}

/* LOGIN */

async function login(
  req,
  res,
  next
){

  try{

    const {
      email,
      password,
      remember
    } = req.body;

    const user =
      await User.findOne({
        email
      });

    if(
      !user
      ||
      !(await user.matchPassword(
        password
      ))
    ){

      res.status(401);

      throw new Error(
        'Incorrect email or password'
      );
    }

    if(!user.isVerified){

      res.status(403);

      throw new Error(
        'Please verify your email first'
      );
    }

    const token =
      generateToken(user._id);

    setTokenCookie(
      res,
      token,
      remember
    );

    res.json({

      user:{
        _id:user._id,
        name:user.name,
        email:user.email
      }
    });

  }catch(err){

    next(err);
  }
}

/* LOGOUT */

async function logout(
  req,
  res
){

  res.clearCookie('token');

  res.json({
    message:
      'Logged out successfully'
  });
}

/* FORGOT PASSWORD */

async function forgotPassword(
  req,
  res,
  next
){

  try{

    const { email } =
      req.body;

    const user =
      await User.findOne({
        email
      });

    if(!user){

      return res.json({
        message:
          'If the account exists, OTP has been sent'
      });
    }

    const otp =
      Math.floor(
        100000 + Math.random() * 900000
      ).toString();

    user.resetOtp = otp;

    user.resetOtpExpiry =
      Date.now()
      + 10 * 60 * 1000;

    await user.save();
res.clearCookie('token');
    await sendPasswordResetEmail(
      user,
      otp
    );

    res.json({
      message:
        'OTP sent successfully'
    });

  }catch(err){

    next(err);
  }
}

/* VERIFY RESET OTP */

async function verifyResetOtp(
  req,
  res,
  next
){

  try{

    const {
      email,
      otp,
      password
    } = req.body;

    const user =
      await User.findOne({
        email
      });

if(
  !user
  ||
  !user.resetOtp
  ||
  !user.resetOtpExpiry
  ||
  user.resetOtp !== otp
  ||
  user.resetOtpExpiry < Date.now()
){

      res.status(400);

      throw new Error(
        'Invalid or expired OTP'
      );
    }

    user.password = password;

    user.resetOtp = null;

    user.resetOtpExpiry = null;

    await user.save();
    res.clearCookie('token');

    res.json({
      message:
        'Password reset successful'
    });

  }catch(err){

    next(err);
  }
}

module.exports = {

  signup,

  verifyOtp,

  login,

  logout,

  forgotPassword,

  verifyResetOtp
};