"use strict";

const uuid = require("uuid");

const moment = require("moment");
moment.locale("pt");

const awsXRay = require("aws-xray-sdk");
const awsSdk = awsXRay.captureAWS(require("aws-sdk"));
const dynamoDb = new awsSdk.DynamoDB.DocumentClient();

const twitterApi = require("../api/twitter");
const economiaApi = require("../api/economiaApi");

const getTweetMessage = (dollarValue, now) =>
    ` No dia ${now.format("DD [de] MMMM [de] YYYY")} o dólar tá ${(
        (parseFloat(dollarValue.bid) + parseFloat(dollarValue.ask)) /
        2
    )
        .toFixed(2)
        .replace(".", ",")} reais 💰💵`;

const getDollarValue = async () => (await economiaApi.get("/USD-BRL/1")).data[0];

const tweetDollar = async () => {
    console.log("Started operation");
    try {
        const dollarValue = await getDollarValue();
        const now = moment();
        await dynamoDb
            .put({
                TableName: process.env.HIST_DOLLAR_TABLE,
                Item: {
                    id: uuid.v1(),
                    ...dollarValue
                }
            })
            .promise();
        console.log("Received dollarValue", dollarValue);
        const tweetMessage = getTweetMessage(dollarValue, now);
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
                body: await tweetDollar()
            };
        return { statusCode: 403, body: "Forbidden" };
    },
    job: async event => {
        return {
            statusCode: 200,
            body: await tweetDollar()
        };
    }
};
