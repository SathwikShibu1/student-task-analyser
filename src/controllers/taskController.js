const Task = require('../models/Task');

const {
  getTaskStatus
} = require('../utils/taskStatus');

async function syncOverdueTasks(userId) {

  const tasks =
    await Task.find({
      userId,
      status: 'Pending'
    });

  const updates =
    tasks.map(task => {

      const correct =
        getTaskStatus(task);

      if (
        correct !== task.status
      ) {

        task.status = correct;

        return task.save();
      }

      return null;
    });

  await Promise.all(
    updates.filter(Boolean)
  );
}

const DEFAULT_PAGE = 1;

const DEFAULT_LIMIT = 20;

async function getTasks(
  req,
  res,
  next
) {

  try {

    const filter = {
      userId: req.user._id
    };

    if (req.query.search) {

      filter.title = {
        $regex:
          req.query.search,
        $options: 'i'
      };
    }

    if (req.query.subject) {
      filter.subject =
        req.query.subject;
    }

    if (req.query.status) {
      filter.status =
        req.query.status;
    }

    if (req.query.priority) {
      filter.priority =
        req.query.priority;
    }

    const sortOrder =
      req.query.sort ===
      'deadline_desc'
        ? { deadline: -1 }
        : { deadline: 1 };

    const page =
      Math.max(
        1,
        parseInt(req.query.page)
        || DEFAULT_PAGE
      );

    const limit =
      Math.min(
        100,
        parseInt(req.query.limit)
        || DEFAULT_LIMIT
      );

    const skip =
      (page - 1) * limit;

    const [
      tasks,
      totalFiltered
    ] = await Promise.all([

      Task.find(filter)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit),

      Task.countDocuments(filter)
    ]);

    const allTasks =
      await Task.find({
        userId: req.user._id
      });

    const completedCount =
      allTasks.filter(
        t =>
          t.status ===
          'Completed'
      ).length;

    const stats = {

      total:
        allTasks.length,

      completed:
        completedCount,

      pending:
        allTasks.filter(
          t =>
            t.status ===
            'Pending'
        ).length,

      overdue:
        allTasks.filter(
          t =>
            t.status ===
            'Overdue'
        ).length,

      completionRate:
        allTasks.length
          ? Math.round(
              (
                completedCount
                /
                allTasks.length
              ) * 100
            )
          : 0
    };

    const subjects = [
      ...new Set(
        allTasks
          .map(
            t => t.subject
          )
          .filter(Boolean)
      )
    ].sort();

    res.json({
      tasks,
      stats,
      subjects,

      pagination: {
        page,
        limit,
        total:
          totalFiltered,

        pages:
          Math.ceil(
            totalFiltered
            / limit
          )
      }
    });

  } catch (err) {

    next(err);
  }
}

async function getTaskById(
  req,
  res,
  next
) {

  try {

    const task =
      await Task.findOne({
        _id: req.params.id,
        userId: req.user._id
      });

    if (!task) {

      res.status(404);

      throw new Error(
        'Task not found'
      );
    }

    res.json(task);

  } catch (err) {

    next(err);
  }
}

async function createTask(
  req,
  res,
  next
) {

  try {

    const {
      title,
      description,
      subject,
      deadline,
      priority
    } = req.body;

    if (
      !title ||
      !subject ||
      !deadline
    ) {

      res.status(400);

      throw new Error(
        'Title, subject and deadline required'
      );
    }

    const task =
      new Task({

        userId:
          req.user._id,

        title,

        description,

        subject,

        deadline,

        priority:
          priority
          || 'Medium',

        status:
          'Pending',

        timerStartedAt:
          new Date(),

        accumulatedTime:
          0,

        isTimerRunning:
          true
      });

    task.status =
      getTaskStatus(task);

    const saved =
      await task.save();

    res.status(201)
      .json(saved);

  } catch (err) {

    next(err);
  }
}

async function updateTask(
  req,
  res,
  next
) {

  try {

    const task =
      await Task.findOne({
        _id: req.params.id,
        userId: req.user._id
      });

    if (!task) {

      res.status(404);

      throw new Error(
        'Task not found'
      );
    }

    const {
      action
    } = req.body;

    if (action === 'pause') {

      if (
        task.isTimerRunning
        &&
        task.timerStartedAt
      ) {

        task.accumulatedTime +=
          Date.now()
          -
          new Date(
            task.timerStartedAt
          ).getTime();

        task.timerStartedAt =
          null;

        task.isTimerRunning =
          false;
      }
    }

    else if (
      action === 'resume'
    ) {

      if (
        !task.isTimerRunning
      ) {

        task.timerStartedAt =
          new Date();

        task.isTimerRunning =
          true;
      }
    }

    else if (
      req.body.status ===
      'Completed'
    ) {

      if (
        task.isTimerRunning
        &&
        task.timerStartedAt
      ) {

        task.accumulatedTime +=
          Date.now()
          -
          new Date(
            task.timerStartedAt
          ).getTime();
      }

      task.timerStartedAt =
        null;

      task.isTimerRunning =
        false;

      task.status =
        'Completed';
    }

    const allowed = [
      'title',
      'description',
      'subject',
      'deadline',
      'priority'
    ];

    allowed.forEach(field => {

      if (
        req.body[field]
        !== undefined
      ) {

        task[field] =
          req.body[field];
      }
    });

    if (
      task.status !==
      'Completed'
    ) {

      task.status =
        getTaskStatus(task);
    }

    const updated =
      await task.save();

    res.json(updated);

  } catch (err) {

    next(err);
  }
}

async function deleteTask(
  req,
  res,
  next
) {

  try {

    const task =
      await Task.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id
      });

    if (!task) {

      res.status(404);

      throw new Error(
        'Task not found'
      );
    }

    res.json({
      message:
        'Task deleted'
    });

  } catch (err) {

    next(err);
  }
}

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  syncOverdueTasks
};