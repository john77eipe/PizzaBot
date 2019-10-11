// Import required packages
const restify = require('restify');
const path = require('path');


// Import required bot services. See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, ConversationState, UserState, MemoryStorage } = require('botbuilder');

const { PizzaBot } = require('./bots/pizzaBot');
const { MainDialog } = require('./dialogs/mainDialog');
const { PizzaOrderDialog } = require('./dialogs/pizzaOrderDialog');

// Read botFilePath and botFileSecret from .env file
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

// Create bot adapter.
// See https://aka.ms/about-bot-adapter to learn more about bot adapter.
// The adapter, an integrated component of the SDK, is the core of the SDK runtime. 
// The activity is carried as JSON in the HTTP POST body. 
// This JSON is deserialized to create the Activity object that is then handed to the adapter with a call to process activity method. 
// On receiving the activity, the adapter creates a turn context and calls the middleware.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppID,
    appPassword: process.env.MicrosoftAppPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
    // Clear out state
    await conversationState.delete(context);
};

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
});

// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.

// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone.
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create the main dialog.
const orderingDialog = new PizzaOrderDialog(userState, conversationState);
const mainDialog = new MainDialog(userState, conversationState, orderingDialog);
const pizzaBot = new PizzaBot(conversationState, userState, mainDialog);

// Listen for incoming activities and route them to your bot main dialog.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // route to main dialog.
        await pizzaBot.run(context);
    });
});
