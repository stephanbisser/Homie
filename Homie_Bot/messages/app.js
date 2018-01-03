/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Setup IoT Stuff
var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;
var connectionString = [INSERT YOUR IOT HUB CONNECTION STRING HERE];
var targetDevice = 'Homie-Device01';
var serviceClient = Client.fromConnectionString(connectionString);
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
.matches('Greeting', (session) => {
    session.send('You reached Greeting intent, you said \'%s\'.', session.message.text);
})
.matches('Help', (session) => {
    session.send('You reached Help intent, you said \'%s\'.', session.message.text);
})
.matches('Cancel', (session) => {
    session.send('You reached Cancel intent, you said \'%s\'.', session.message.text);
})

// Intent for turning on the lights
.matches('HomeAutomation.TurnOn', (session, args) => {
    session.sendTyping();
    if(args.entities[0]) {
        var deviceEntity = builder.EntityRecognizer.findEntity(args.entities, 'HomeAutomation.Device');
        var roomEntity = builder.EntityRecognizer.findEntity(args.entities, 'HomeAutomation.Room');
        if (roomEntity){
            session.send("Ok, I will turn the %s on in the %s", deviceEntity['entity'], roomEntity['entity']);
            session.endDialog();
			if (deviceEntity['entity'] == "lights" && roomEntity['entity'] == "office"){
				var myCommand = "lightsOnOffice";
				var message = new Message(myCommand);
				message.ack = 'full';
				message.messageId = "My Message ID";
				console.log('Sending message: ' + message.getData());
				serviceClient.send(targetDevice, message);
			}
        }
        
    }
})
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog('/', intents);    

