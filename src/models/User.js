const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    xp: {
      type: Number,
      default: 0
    },

    level: {
      type: Number,
      default: 1
    },

    streak: {
      type: Number,
      default: 0
    },

    totalFocusHours: {
      type: Number,
      default: 0
    },

    emailOtp: {
      type: String,
      default: null
    },

    emailOtpExpires: {
      type: Date,
      default: null
    },

resetOtp: {
  type: String,
  default: null
},

resetOtpExpiry: {
  type: Date,
  default: null
},
  },

  {
    timestamps: true
  }
);

userSchema.pre(
  'save',
  async function (next) {

    if (
      !this.isModified(
        'password'
      )
    ) {
      return next();
    }

    const salt =
      await bcrypt.genSalt(10);

    this.password =
      await bcrypt.hash(
        this.password,
        salt
      );

    next();
  }
);

userSchema.methods.matchPassword =
  function (enteredPassword) {

    return bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

module.exports =
  mongoose.model(
    'User',
    userSchema
  );