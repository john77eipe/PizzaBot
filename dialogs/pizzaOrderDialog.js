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

const { Pizza } = require('../pizza');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const PIZZA_ORDER_WATERFALL_DIALOG = 'PIZZA_ORDER_WATERFALL_DIALOG';
const PIZZA_ORDER = 'PIZZA_ORDER';
const USER_PROFILE = 'USER_PROFILE';
const mainDialog = require('./mainDialog');


class PizzaOrderDialog extends ComponentDialog {

    constructor(userState, conversationState) {
        super('pizzaOrderDialog');
        this.pizzaOrder = conversationState.createProperty(PIZZA_ORDER);

        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));

        this.addDialog(new WaterfallDialog(PIZZA_ORDER_WATERFALL_DIALOG, [

            this.pizzaBaseStep.bind(this),
            this.pizzaToppingStep.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = PIZZA_ORDER_WATERFALL_DIALOG;
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

    async pizzaBaseStep(stepContext) {

        return await stepContext.prompt(CHOICE_PROMPT, {
            prompt:'Please select the type of pizza base?', 
            choices: ChoiceFactory.toChoices(['crust', 'thick'])
        });  
    }

    async pizzaToppingStep(stepContext) {
        console.log("Pizza base selection received: ", stepContext.result.value);
        stepContext.values.pizzaBase = stepContext.result.value;

        console.log("mainDialog.MainDialog.userProfileAccessor::: " + mainDialog.userProfileAccessor.name);

        console.log("stepContext.values.userInfo::: " + stepContext.values.userInfo);

        // We can send messages to the user at any point in the WaterfallStep.
        await stepContext.context.sendActivity(`Thanks ${ mainDialog.userProfileAccessor.name }.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await stepContext.prompt(CHOICE_PROMPT, {
            prompt:'Please select the toppings that you would like?', 
            choices: ChoiceFactory.toChoices(['tomato', 'onions', 'mushrooms'])
        });    
    }

    async summaryStep(stepContext) {
        if (stepContext.result) {
            
            stepContext.values.pizzaTopping = stepContext.result.value;

            const pizzaOrder = await this.pizzaOrder.get(stepContext.context, new Pizza());

            pizzaOrder.pizzaBase = stepContext.values.pizzaBase;
            pizzaOrder.pizzaTopping = stepContext.values.pizzaTopping;

            let msg = `I have your order of pizza with base ${ pizzaOrder.pizzaBase } and with toppings ${ pizzaOrder.pizzaTopping }.`;
            
            await stepContext.context.sendActivity(msg);
        } else {
            await stepContext.context.sendActivity('Thanks. Your order has not been placed.');
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
        return await step.endDialog();
    }
}

module.exports.PizzaOrderDialog = PizzaOrderDialog;