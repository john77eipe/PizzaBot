// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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

    constructor(userState, conversationState, orderingDialog) {

        super('userProfileDialog');

        this.userProfile = userState.createProperty(USER_PROFILE);

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
     * Second step in the waterfall.  This will use LUIS to attempt to extract the intent and order detils.
     * Then, it hands off to the orderingDialog child dialog to collect any remaining details.
     */
    async actStep(step) {
        if (step.result) {
            console.log(step.values.name);
            // Get the current profile object from user state.
            const userProfile = await this.userProfile.get(step.context, new UserProfile());
            userProfile.name = step.values.name;
            return await step.beginDialog('pizzaOrderDialog');  
        }
    }

    async nameStep(step) {
        return await step.prompt(NAME_PROMPT, `May I know your name, please?`);
    }

    async shiftToOrderConfirmStep(step) {
        
        step.values.name = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity(`Thanks ${ step.result }.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, {
            prompt:'Do you want to order a pizza?', 
            choices: ChoiceFactory.toChoices(['now', 'later'])
        });    
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
