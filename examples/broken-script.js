// This script has an intentional error for demonstration
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Missing closing parenthesis - syntax error
app.listen(3000, () => {
  console.log('Server running on port 3000';
});