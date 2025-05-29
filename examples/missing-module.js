const axios = require('axios');

async function fetchData() {
  const response = await axios.get('https://api.github.com');
  console.log(response.data);
}

fetchData();