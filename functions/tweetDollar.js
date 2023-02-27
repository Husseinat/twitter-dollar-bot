"use strict";

const moment = require("moment");
moment.locale("pt");

const twitterApi = require("../api/twitter");
const economiaApi = require("../api/economiaApi");

const getTodaysValueFromSequence = (dollarCloseSequence) => dollarCloseSequence[0];

const avgBidAsk = (dollarCloseDay) => (parseFloat(dollarCloseDay.bid) + parseFloat(dollarCloseDay.ask)) / 2;

const nDaysHighest = (dollarCloseSequence) => {
    let i = 1, todaysValue = getTodaysValueFromSequence(dollarCloseSequence);
    while (avgBidAsk(todaysValue) > avgBidAsk(dollarCloseSequence[i]) && i < dollarCloseSequence.length)
    {
        ++i;
    }
    return i - 1;
}

const nDaysLowest = (dollarCloseSequence) => {
    let i = 1, todaysValue = getTodaysValueFromSequence(dollarCloseSequence);
    while (avgBidAsk(todaysValue) < (dollarCloseSequence[i]) && i < dollarCloseSequence.length)
    {
        ++i;
    }
    return i - 1;
}

const nDaysToBeRelevant = 3;

const getTweetMessage = (dollarCloseSequence, nDaysHighest, nDaysLowest, now) =>
    ` No dia ${now.format("DD [de] MMMM [de] YYYY")} o dólar tá ${
        avgBidAsk(getTodaysValueFromSequence(dollarCloseSequence))
        .toFixed(2)
        .replace(".", ",")} reais 💰💵` +
    (nDaysHighest >= nDaysToBeRelevant && nDaysHighest != dollarCloseSequence.length ? `\n\n⚠️ Hoje o dólar atingiu a máxima dos últimos ${nDaysHighest} dias úteis`:"" ) + 
    (nDaysLowest >= nDaysToBeRelevant && nDaysLowest != dollarCloseSequence.length ? `\n\n⚠️ Hoje o dólar atingiu a minima dos últimos ${nDaysLowest} dias úteis`:"" ) +
    (nDaysHighest == dollarCloseSequence.length ? `\n\n⚠️ Hoje o dólar atingiu a máxima desde que temos registros(${dollarCloseSequence.length} dias úteis)`:"" ) +
    (nDaysLowest == dollarCloseSequence.length ? `\n\n⚠️ Hoje o dólar atingiu a mínima desde que temos registros(${dollarCloseSequence.length} dias úteis)`:"" );

const getDollarSequence = async () => (await economiaApi.get("/json/daily/USD-BRL/99999999")).data;

const tweetDollar = async (now) => {
    console.log("Started operation", now);
    try {
        const dollarCloseSequence = await getDollarSequence();
        console.log("Received sequence");
        const tweetMessage = getTweetMessage(dollarCloseSequence, nDaysHighest(dollarCloseSequence), nDaysLowest(dollarCloseSequence), now);
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
                body: await tweetDollar(moment.utc(event.requestContext.requestTimeEpoch))
            };
        return { statusCode: 403, body: "Forbidden" };
    },
    job: async event => {
        return {
            statusCode: 200,
            body: await tweetDollar(moment.utc(event.requestContext.requestTimeEpoch))
        };
    }
};
