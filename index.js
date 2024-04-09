const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
let bodyParser = require('body-parser');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


app.use(bodyParser.urlencoded({extended: true}));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Mongoose
const userSchema = new mongoose.Schema({
  username: String,
})

const exerciseSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now },
});

// Mongoose models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Create and save a new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });
  newUser.save((err, data) => {
    if (err) return console.error(err);
    res.json({ username: data.username, _id: data._id });
  });
});

// Get a list of all users
app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err) return console.error(err);
    const userList = users.map(user => ({ username: user.username, _id: user._id }));
    res.json(userList);
  });
});

// Add an exercise for a specific user
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  const newExercise = new Exercise({
    userId: _id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date(),
  });
  newExercise.save((err, data) => {
    if (err) return console.error(err);
    User.findById(_id, (err, user) => {
      if (err) return console.error(err);
      res.json({
        _id: user._id,
        username: user.username,
        date: data.date.toDateString(),
        duration: data.duration,
        description: data.description,
      });
    });
  });
});

// Get the full exercise log of a user with optional parameters
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  let { from, to, limit } = req.query;

  const query = { userId: _id };
  if (from && to) {
    query.date = { $gte: new Date(from), $lte: new Date(to) };
  }

  let exerciseQuery = Exercise.find(query);
  if (limit) {
    limit = parseInt(limit);
    if (!isNaN(limit)) {
      exerciseQuery = exerciseQuery.limit(limit);
    }
  }

  exerciseQuery.exec((err, exercises) => {
    if (err) return console.error(err);
    User.findById(_id, (err, user) => {
      if (err) return console.error(err);
      const logs = exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
      }));
      res.json({
        _id: user._id,
        username: user.username,
        count: exercises.length,
        log: logs,
      });
    });
  });
});




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

