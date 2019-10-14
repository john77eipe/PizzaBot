// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { LuisRecognizer } = require('botbuilder-ai');

class PizzaOrderLuisService {
    constructor(config) {
        const luisIsConfigured = config && config.applicationId && config.endpointKey && config.endpoint;
        if (luisIsConfigured) {
            this.recognizer = new LuisRecognizer(config, {}, true);
        }
    }

    get isConfigured() {
        return (this.recognizer !== undefined);
    }

    /**
     * Returns an object with preformatted LUIS results for the bot's dialogs to consume.
     * @param {TurnContext} context
     */
    async executeLuisQuery(context) {
        return await this.recognizer.recognize(context);
    }

    getEntities(result) {
        let pizzaBaseValue, pizzaToppingValue;
        if (result.entities.$instance.pizza_base) {
            pizzaBaseValue = result.entities.$instance.pizza_base;
        }
        if (pizzaToppingValue && result.entities.pizza_topping) {
            pizzaToppingValue = result.entities.pizza_topping;
        }

        return { pizzaBase: pizzaBaseValue, pizzaTopping: pizzaToppingValue };
    }
}

module.exports.PizzaOrderLuisService = PizzaOrderLuisService;
