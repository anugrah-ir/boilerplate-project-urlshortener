require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const bodyParser = require('body-parser');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/public', express.static(`${process.cwd()}/public`));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Schema & Model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

// POST: Create short URL
app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;
  
  let parsed;
  try {
    parsed = new URL(originalUrl);
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // Validate using dns.lookup
  dns.lookup(parsed.hostname, async (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    try {
      // Check if already exists
      let existing = await Url.findOne({ original_url: originalUrl });
      if (existing) {
        return res.json({
          original_url: existing.original_url,
          short_url: existing.short_url
        });
      }

      // Get current count for short_url
      const count = await Url.countDocuments({});
      const newUrl = new Url({
        original_url: originalUrl,
        short_url: count + 1
      });
      await newUrl.save();

      res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'server error' });
    }
  });
});

// GET: Redirect short URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = parseInt(req.params.short_url);

  try {
    const found = await Url.findOne({ short_url: shortUrl });
    if (!found) {
      return res.json({ error: 'No short URL found for the given input' });
    }
    res.redirect(found.original_url);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'server error' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});