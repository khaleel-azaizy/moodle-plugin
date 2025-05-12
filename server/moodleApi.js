const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });
const MOODLE_API_URL  = 'https://localhost/webservice/rest/server.php';
const TOKEN = 'ab7b57c021d33ec52acc2eff756ddb58'; 


const moodleApi = async (functionName, params = {}) => {
  return await axios.get(MOODLE_API_URL, {
    httpsAgent: agent,
    params: {
      wstoken: TOKEN,
      wsfunction: functionName,
      moodlewsrestformat: 'json',
      ...params,
    },
  }).then(res => res.data)
    .catch(err => {
      console.error('❌ Moodle API error:', err.response?.data || err.message);
      throw err;
    });
};
module.exports = moodleApi;