require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const userRoutes = require('./src/routes/userRoutes');
const errorHandler = require('./src/middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/user', userRoutes);

// FIX #8: Return JSON 404 for unknown /api routes instead of serving login.html
app.all('/api/*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Catch-all for client-side routes only (non-API)
app.get('*', (req, res, next) => {

  // Skip static files
  if (
    req.path.startsWith('/js/')
    ||
    req.path.startsWith('/css/')
    ||
    req.path.startsWith('/api/')
    ||
    req.path.includes('.')
  ) {
    return next();
  }

  res.sendFile(
    path.join(
      __dirname,
      'public',
      'login.html'
    )
  );
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});