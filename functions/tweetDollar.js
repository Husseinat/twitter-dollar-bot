"use strict";

const moment = require("moment");
moment.locale("pt");

const awsXRay = require("aws-xray-sdk");
const awsSdk = awsXRay.captureAWS(require("aws-sdk"));

const twitterApi = require("../api/twitter");
const economiaApi = require("../api/economiaApi");

const getTweetMessage = dollarValue =>
    ` No dia ${moment().format("DD [de] MMMM [de] YYYY")} o dólar tá ${(
        (parseFloat(dollarValue.high) + parseFloat(dollarValue.low)) /
        2
    )
        .toFixed(2)
        .replace(".", ",")} reais 💰💵`;

const getDollarValue = async () => (await economiaApi.get("/USD-BRL/1")).data[0];

const tweetBestMovies = async () => {
    try {
        console.log("Started operation");
        const dollarValue = await getDollarValue();
        console.log("Received dollarValue", dollarValue);
        const tweetMessage = getTweetMessage(dollarValue);
        console.log("Tweet message", tweetMessage);
        await twitterApi.post("statuses/update", { status: tweetMessage });
        console.log("Finished operation");
        return tweetMessage;
    } catch (e) {
        console.log("Error in operation", e);
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
