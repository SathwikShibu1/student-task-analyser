# Student Task Analyser

A full-stack web app for students to manage academic tasks, track deadlines, and stay on top of their workload.

## Features

- Signup and login with email and password
- Persistent login with HTTP-only cookies
- Add, edit, delete tasks
- Mark tasks as completed or reopen them
- Automatic overdue detection
- Dashboard with task statistics
- Search, filter by subject/status/priority, sort by deadline
- Profile update (name, email, password)
- Forgot password and reset password
- Dark mode (saved in browser)

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas with Mongoose
- **Auth**: bcryptjs for hashing, JWT for sessions, HTTP-only cookies

## Setup

1. Clone the repo and install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on `.env.example` and fill in your values.

3. Start the server:
   ```
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

## Project Structure

```
student-task-app/
├── server.js                  # App entry point
├── src/
│   ├── config/db.js           # MongoDB connection
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Task.js            # Task schema
│   ├── controllers/
│   │   ├── authController.js  # Signup, login, logout, password reset
│   │   ├── taskController.js  # CRUD for tasks
│   │   └── userController.js  # Profile read and update
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT verification
│   │   └── errorMiddleware.js # Global error handler
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── taskRoutes.js
│   │   └── userRoutes.js
│   └── utils/
│       ├── token.js           # JWT generation
│       ├── email.js           # Password reset email
│       └── taskStatus.js      # Overdue detection logic
└── public/
    ├── login.html
    ├── signup.html
    ├── dashboard.html
    ├── profile.html
    ├── forgot-password.html
    ├── reset-password.html
    ├── css/styles.css
    └── js/dashboard.js
```
