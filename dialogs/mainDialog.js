
const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');

const { UserProfile } = require('../userProfile');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const MAIN_WATERFALL_DIALOG = 'MAIN_WATERFALL_DIALOG';

class MainDialog extends ComponentDialog {

    constructor(userState, conversationState, orderingDialog, luisRecognizer) {

        super('userProfileDialog');

        if (!luisRecognizer) throw new Error('[MainDialog]: Missing parameter \'luisRecognizer\' is required');
        this.luisRecognizer = luisRecognizer;


        this.userProfileAccessor = userState.createProperty(USER_PROFILE);
        

        if (!orderingDialog) throw new Error('[MainDialog]: Missing parameter \'orderingDialog\' is required');

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        this.addDialog(new TextPrompt(NAME_PROMPT))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(orderingDialog)
            .addDialog(new WaterfallDialog(MAIN_WATERFALL_DIALOG, [
                this.nameStep.bind(this),
                this.shiftToOrderConfirmStep.bind(this),
                this.actStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = MAIN_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    /**
     * Step (1)
     * @param {stepContext} stepContext 
     */
    async nameStep(stepContext) {
        stepContext.values.userInfo = new UserProfile();
        return await stepContext.prompt(NAME_PROMPT, `May I know your name, please?`);
    }

    /**
     * Step (2)
     * Stores the name in userProfile
     * @param {stepContext} stepContext 
     */
    async shiftToOrderConfirmStep(stepContext) {
        
        console.log("User name received:::" + stepContext.result)

        stepContext.values.userInfo.name = stepContext.result;
        
        // Get the current profile object from user state.
        this.userProfileAccessor = await this.userProfileAccessor.get(stepContext.context, new UserProfile());
        this.userProfileAccessor.name = stepContext.result;
        exports.userProfileAccessor = this.userProfileAccessor;

        const bookingDetails = {};

        if (this.luisRecognizer.isConfigured) {

        

            // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
            const luisResult = await this.luisRecognizer.executeLuisQuery(stepContext.context);
            switch (LuisRecognizer.topIntent(luisResult)) {
            case 'BuyPizza':
                // Extract the values for the composite entities from the LUIS result.
                const entities = this.luisRecognizer.getEntities(luisResult);
                

                // Show a warning for base and topping if we can't resolve them.
                

                // Initialize Pizza with any entities we may have found in the response.
                bookingDetails = new Pizza();
                // Run the BookingDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
                return await stepContext.beginDialog('pizzaOrderDialog', bookingDetails);

            default:
                // Catch all for unhandled intents
                const didntUnderstandMessageText = `Sorry, I didn't get that. Please try asking in a different way (intent was ${ LuisRecognizer.topIntent(luisResult) })`;
                await stepContext.context.sendActivity(didntUnderstandMessageText, didntUnderstandMessageText, InputHints.IgnoringInput);
            }
        } else {
            
            // We can send messages to the user at any point in the WaterfallStep.
            await stepContext.context.sendActivity(`Thanks ${ stepContext.result }.`);

            // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
            return await stepContext.prompt(CHOICE_PROMPT, {
                prompt:'Do you want to order a pizza?', 
                choices: ChoiceFactory.toChoices(['now', 'later'])
            });  
        }  
    }

    /**
     * Step (3) in the waterfall.  This will use LUIS to attempt to extract the intent and order detils.
     * Then, it hands off to the orderingDialog child dialog to collect any remaining details.
     */
    async actStep(stepContext) {
        console.log("User choice received for order:::" + stepContext.result.value);
        stepContext.values.userInfo.immediateOrder = stepContext.result.value;
        this.userProfileAccessor.immediateOrder = stepContext.result.value;

        if (stepContext.result.value === 'now') {
            
            return await stepContext.beginDialog('pizzaOrderDialog');  
        }
    }


    

    /**
     * This is the final step in the main waterfall dialog.
     * 
     */
    async finalStep(stepContext) {
        // If the child dialog ("orderingDialog") was cancelled or the user failed to confirm, the Result here will be null.
        if (stepContext.result) {
            const result = stepContext.result;
            // Now we have all the order details.

            // This is where calls to the ordering API service or database would go.

            // If the call to the ordering service was successful tell the user.
            const msg = `Thank you for your order! Your pizza is now being personally hand crafted by legendary pizza chef John Eipe`;
            await stepContext.context.sendActivity(msg, msg, InputHints.IgnoringInput);
        }
    }
}

module.exports.MainDialog = MainDialog;
module.exports.userProfileAccessor = exports.userProfileAccessor;