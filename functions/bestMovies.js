"use strict";

const moment = require("moment");

const awsXRay = require("aws-xray-sdk");
const awsSdk = awsXRay.captureAWS(require("aws-sdk"));

const twitterApi = require("../api/twitter");
const theMovieDbApi = require("../api/theMovieDb");

const getTweetMessage = movies =>
    ` 🔝🎥 ${moment().format("MM/DD/YYYY")} BEST MOVIES 🎞🎬\n\n${movies
        .slice(0, 5)
        .map((m, i) => `${i + 1}🏅   ${m.vote_average}⭐ ${m.title}`)
        .join("\n")}\n\n\nsource: themoviedb.org`;

const getMovies = async () =>
    (await theMovieDbApi.get("/trending/movie/day", { params: { api_key: process.env.TMDB_API_KEY } })).data.results;

const tweetBestMovies = async () => {
    try {
        console.log("Started operation");
        const movies = await getMovies();
        console.log("Received movies", movies);
        const tweetMessage = getTweetMessage(movies);
        console.log("Tweet message", tweetMessage);
        await twitterApi.post("statuses/update", { status: tweetMessage });
        console.log("Finished operation");
        return tweetMessage;
    } catch (e) {
        console.log("Error in best movies operation", e);
        return e.toString();
    }
};

module.exports = {
    endpoint: async event => {
        if (event.queryStringParameters && event.queryStringParameters.key === process.env.API_CALL_KEY)
            return {
                statusCode: 200,
                body: await tweetBestMovies()
            };
        return { statusCode: 403, body: "Forbidden" };
    },
    job: async event => {
        return {
            statusCode: 200,
            body: await tweetBestMovies()
        };
    }
};
