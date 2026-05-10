// Determines the correct status for a task based on deadline and current status.
// A completed task stays completed even if the deadline has passed.
// A pending task becomes overdue if the deadline was yesterday or earlier.
function getTaskStatus(task) {
  if (task.status === 'Completed') return 'Completed';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);

  return deadline < today ? 'Overdue' : 'Pending';
}

module.exports = { getTaskStatus };
