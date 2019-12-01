const axios = require("axios");

module.exports = axios.create({
    baseURL: "https://economia.awesomeapi.com.br"
});
