const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { type } = require('express/lib/response');

mongoose.connect(process.env.DATABASE_URI);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String },
  _user: { type: mongoose.Types.ObjectId, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())
app.use(express.static('public'))

// ROUTE GET /
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// ROUTE GET /api/resetall
app.get('/api/resetall', async (req, res) => {
  try {
    await User.deleteMany({});
    await Exercise.deleteMany({});
    res.json({ message: 'Database reset, done!' });
  } catch (err) {
    res.json({ error: 'Database reset, failed...' });
    return console.error(err)
  }
});

// ROUTE GET /api/users
app.get('/api/users', (req, res) => {
  let users = User.find({}).exec()
    .then((data) => { res.json(data); })
    .catch(err => console.error(err));
});

// ROUTE POST /api/users
app.post('/api/users',
  bodyParser.urlencoded({ extended: false }), (req, res) => {
    let username = req.body['username'];
    User.create({ username })
      .then((user) => { res.json(user); })
      .catch(err => console.error(err));
  })

// ROUTE POST /api/users/:_id/exercises
app.post('/api/users/:_id/exercises',
  bodyParser.urlencoded({ extended: false }), async (req, res) => {
    const id = req.params['_id'];
    let { description, duration, date } = req.body;

    const dateString = new Date(date).toDateString();

    try {
      let user = await User.findById(id).exec();
      let exercise = await Exercise.create({
        _user: id,
        description: description,
        duration: duration,
        date: dateString
      });

      return res.json({
        _id: id,
        username: user.username,
        date: exercise.date,
        duration: exercise.duration,
        description: exercise.description
      });
    } catch (err) {
      return res.json({ error: err });
    }
  });

// ROUTE /api/users/:_id/logs
// GET /api/users/:_id/logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const id = req.params['_id'];
  let user = await User.findById(id).exec()
    .catch(err => console.error('unable to get user: ', err));
  let exercises = await Exercise.find({ _user: id }).exec()
    .catch(err => console.error('unable to get exercises', err));

  const {from, to, limit} = req.query;

  try {
    const logsObj = { _id: id, username: user.username, count: exercises.length };
    logsObj.log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: String(ex.date)
    }));

    logsObj.log.sort((a, b) => (new Date(b.date)) - (new Date(a.date)));

    if(from){
      let fromDate = new Date(from);
      logsObj.log = [...logsObj.log].filter(ex => new Date(ex.date) >= fromDate)
    }

    if(to){
      let toDate = new Date(to);
      logsObj.log = [...logsObj.log].filter(ex => new Date(ex.date) <= toDate)
    }

    if(limit){
      logsObj.log = [...logsObj.log].slice(0, limit);
    }

    return res.json(logsObj);
  } catch (err) {
    return res.json({ error: `unable to get logs for user with id '${id}'\n${err}` });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})