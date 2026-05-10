const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: '',
      trim: true
    },

    subject: {
      type: String,
      required: true,
      trim: true
    },

    deadline: {
      type: Date,
      required: true
    },

    priority: {
      type: String,
      enum: [
        'High',
        'Medium',
        'Low'
      ],
      default: 'Medium'
    },

    status: {
      type: String,
      enum: [
        'Pending',
        'Completed',
        'Overdue'
      ],
      default: 'Pending'
    },

    accumulatedTime: {
      type: Number,
      default: 0
    },

    isTimerRunning: {
      type: Boolean,
      default: false
    },

    timerStartedAt: {
      type: Date,
      default: null
    },

    studySessions: {
      type: Number,
      default: 0
    }
  },

  {
    timestamps: true
  }
);

module.exports =
  mongoose.model(
    'Task',
    taskSchema
  );