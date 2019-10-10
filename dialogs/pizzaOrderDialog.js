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
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const PIZZA_ORDER = 'PIZZA_ORDER';

class PizzaOrderDialog extends ComponentDialog {
    constructor(userState) {
        super('pizzaOrderDialog');

        this.pizzaOrder = userState.createProperty(PIZZA_ORDER);

        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [

            this.pizzaBaseStep.bind(this),
            this.pizzaToppingStep.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
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

    async pizzaBaseStep(step) {

        step.values.pizzaBase = step.result;

        return await step.prompt(CHOICE_PROMPT, {
            prompt:'Please select the type of pizza base?', 
            choices: ChoiceFactory.toChoices(['crust', 'thick'])
        });  
    }

    async pizzaToppingStep(step) {

        step.values.pizzaTopping = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity(`Thanks ${ step.result }.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CHOICE_PROMPT, {
            prompt:'Please select the toppings that you would like?', 
            choices: ChoiceFactory.toChoices(['tomato', 'onions', 'mushrooms'])
        });    
    }

    async summaryStep(step) {
        if (step.result) {
            
            const pizzaOrder = await this.pizzaOrder.get(step.context, new Pizza());

            pizzaOrder.pizzaBase = step.values.pizzaBase;
            pizzaOrder.pizzaTopping = step.values.pizzaTopping;

            let msg = `I have your order of pizza with base ${ pizzaOrder.pizzaBase } and with toppings ${ pizzaOrder.pizzaTopping }.`;
            
            await step.context.sendActivity(msg);
        } else {
            await step.context.sendActivity('Thanks. Your order has not been placed.');
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
        return await step.endDialog();
    }
}

module.exports.PizzaOrderDialog = PizzaOrderDialog;