/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var azurestorage = require('azure-storage');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Setup IoT Stuff
var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;
var connectionString = process.env.device01connection;
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

// Create Azure Table storage connections
var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);
var statusTableSvc = azurestorage.createTableService(process.env['AzureWebJobsStorage']);


// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

//Create Hero Card
function createHeroCardforGreeting(session, name) {
    return new builder.HeroCard(session)
        .title(`Hi ${name}!`)
        .subtitle('I am Homie - your personal digital assistant')
        .text('I can help you in your everyday\'s life\n\n Please tell me what you want me to do or click the button below for help:')
        .images([
			// Add an URL from your favourite Bot image here to change it
            builder.CardImage.create(session, 'http://www.cloudguy.pro/wp-content/uploads/2017/11/homie-1.png')
        ])
        .buttons([
            builder.CardAction.postBack(session, 'help', 'Help')
        ]);
}

// Helper Function for sending status output
function sendStatusOutput(session, rooms, num, status) {
    if(num == 1){
        session.send("The lights are currently %s in the %s ", status, rooms);
        session.endDialog();
    } if(num == 2) {
        session.send("The lights are currently %s here: %s ", status, rooms);
        session.endDialog();
    } if(num == 0) {
        if(status == "on"){
          session.send("No rooms are lighted up right now!");
            session.endDialog();  
        } else if(status == "off"){
            session.send("No rooms are dark right now!");
            session.endDialog();
        }
    }
}


// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
.matches('Greeting', (session) => {
    //session.send('You reached Greeting intent, you said \'%s\'.', session.message.text);
    bot.beginDialog(session.message.address, 'GreetingDiag');
})
.matches('Help', (session, results) => {
    //session.send('You reached Help intent, you said \'%s\'.', session.message.text);
    session.sendTyping();
    session.send("# **Here is what I can do for you:** \n\n \n\n ### To turn the lights on/off please write \n\n \*Turn the lights [on|off] in the living room* \n\n \n\n ### Regulate the heating system \n\n \n\n *Turn [on|off] the heater in the kitchen* \n\n \n\n ### Check in which rooms the lights are turned on/off \n\n \n\n *Where is the light [on|off] at the moment?*");
    session.endDialogWithResult(results);
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
            console.log(roomEntity['entity']);
            session.send("Ok, I will turn the %s on in the %s", deviceEntity['entity'], roomEntity['entity']);
            session.endDialog();
			if (deviceEntity['entity'] == "lights" && roomEntity['entity'] == "office"){
				var myCommand = "lightsOnOffice";
				var message = new Message(myCommand);
				message.ack = 'full';
				message.messageId = "My Message ID";
				console.log('Sending message: ' + message.getData());
				serviceClient.send(targetDevice, message);
                
                var entity = {
                    PartitionKey : 'office',
                    RowKey: '1',
                    Room: 'Office',
                    Status: 'On'
                };
                statusTableSvc.insertOrReplaceEntity('lightStatus', entity, function(error, result, response) {
                    if (!error) {
                        console.log("done writing to Azure Storage table");
                    } else {
                        console.log(error);
                    }
                });
			}
            
            else if (deviceEntity['entity'] == "lights" && roomEntity['entity'] == "living room"){
				var myCommand = "lightsOnLivingRoom";
				var message = new Message(myCommand);
				message.ack = 'full';
				message.messageId = "My Message ID";
				console.log('Sending message: ' + message.getData());
				serviceClient.send(targetDevice, message);
                
                var entity = {
                    PartitionKey : 'livingRoom',
                    RowKey: '2',
                    Room: 'Living Room',
                    Status: 'On'
                };
                statusTableSvc.insertOrReplaceEntity('lightStatus', entity, function(error, result, response) {
                    if (!error) {
                        console.log("done writing to Azure Storage table");
                    } else {
                        console.log(error);
                    }
                });
			}
        }
        
    }
})

// Intent for turning off the lights
.matches('HomeAutomation.TurnOff', (session, args) => {
    session.sendTyping();
    if(args.entities[0]) {
        var deviceEntity = builder.EntityRecognizer.findEntity(args.entities, 'HomeAutomation.Device');
        var roomEntity = builder.EntityRecognizer.findEntity(args.entities, 'HomeAutomation.Room');
        if (roomEntity){
            session.send("Ok, I will turn the %s off in the %s", deviceEntity['entity'], roomEntity['entity']);
            session.endDialog();
			if (deviceEntity['entity'] == "lights" && roomEntity['entity'] == "office"){
				var myCommand = "lightsOffOffice";
				var message = new Message(myCommand);
				message.ack = 'full';
				message.messageId = "My Message ID";
				console.log('Sending message: ' + message.getData());
				serviceClient.send(targetDevice, message);
                
                var entity = {
                    PartitionKey : 'office',
                    RowKey: '1',
                    Room: 'Office',
                    Status: 'Off'
                };
                statusTableSvc.insertOrReplaceEntity('lightStatus', entity, function(error, result, response) {
                    if (!error) {
                        console.log("done writing to Azure Storage table");
                    } else {
                        console.log(error);
                    }
                });
			}
            
            else if (deviceEntity['entity'] == "lights" && roomEntity['entity'] == "living room"){
				var myCommand = "lightsOffLivingRoom";
				var message = new Message(myCommand);
				message.ack = 'full';
				message.messageId = "My Message ID";
				console.log('Sending message: ' + message.getData());
				serviceClient.send(targetDevice, message);
                
                var entity = {
                    PartitionKey : 'livingRoom',
                    RowKey: '2',
                    Room: 'Living Room',
                    Status: 'Off'
                };
                statusTableSvc.insertOrReplaceEntity('lightStatus', entity, function(error, result, response) {
                    if (!error) {
                        console.log("done writing to Azure Storage table");
                    } else {
                        console.log(error);
                    }
                });
			}
        }
        
    }
})

.matches('HomeAutomation.GetLightedUpRooms',function(session, args){ 
    session.sendTyping();
    var query = new azurestorage.TableQuery()
        .top(5)
        .where('Status eq ?', 'On');
    statusTableSvc.queryEntities('lightStatus', query, null, function(error, result, response) {
        if (!error) {
            var objNumber = Object.keys(result.entries).length;
            var numberIndicator = 0;
            var outStringRooms = "";
            if(objNumber == 0){
                console.log(1);
                sendStatusOutput(session, "none", 0, "on");
            }
            else if(objNumber > 1){
                console.log(2);
                result.entries.forEach(function(room) {
                    var roomName = room.Room;
                    outStringRooms += '\n\n';
                    outStringRooms += roomName["_"];                
                    numberIndicator = 2;
                });
                sendStatusOutput(session, outStringRooms, numberIndicator, "on");
            } else {
                console.log(3);
                result.entries.forEach(function(room) {
                    var roomName = room.Room;
                    outStringRooms = roomName["_"];
                    numberIndicator = 1;
                });
                sendStatusOutput(session, outStringRooms, numberIndicator, "on");
            }
        }
    });
})

.matches('HomeAutomation.GetLightedOffRooms',function(session, args){ 
    session.sendTyping();
    var query = new azurestorage.TableQuery()
        .top(5)
        .where('Status eq ?', 'Off');
    statusTableSvc.queryEntities('lightStatus', query, null, function(error, result, response) {
        if (!error) {
            var objNumber = Object.keys(result.entries).length;
            var numberIndicator = 0;
            var outStringRooms = "";
            if(objNumber == 0){
                sendStatusOutput(session, "none", 0, "off");
            }
            else if(objNumber > 1){
                result.entries.forEach(function(room) {
                    var roomName = room.Room;
                    outStringRooms += '\n\n';
                    outStringRooms += roomName["_"];                
                    numberIndicator = 2;
                });
                sendStatusOutput(session, outStringRooms, numberIndicator, "off");
            } else {
                result.entries.forEach(function(room) {
                    var roomName = room.Room;
                    outStringRooms = roomName["_"];
                    numberIndicator = 1;
                });
                sendStatusOutput(session, outStringRooms, numberIndicator, "off");
            }
        }
    });
})

/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog("GreetingDiag", [
    function(session, args, next){
        session.sendTyping();
        builder.Prompts.text(session, 'Hi! What is your name?');
        
    },
    
    function(session, results){
        session.sendTyping();
        //session.send(`Hi **${results.response}**!`);
        var name = results.response;
        var card = createHeroCardforGreeting(session, name);
        // attach the card to the reply message
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
        session.endDialogWithResult(results);
    }]
);

bot.dialog('/', intents);    

