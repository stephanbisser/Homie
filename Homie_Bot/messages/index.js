/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-luis

git commit -am "Light Status"
git push origin master
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var request = require('request');
var azure = require('azure-storage');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })

// Ask the user for their name and greet them by name.
intents.matches('Greeting', function(session, args){ 
    bot.beginDialog(session.message.address, 'GreetingDiag');
});

intents.matches('Help', function(session, args){ 
    bot.beginDialog(session.message.address, 'help');
});

bot.dialog("GreetingDiag", [
    function(session, args, next){
        session.sendTyping();
        builder.Prompts.text(session, 'Hi! What is your name?');
        
    },
    
    function(session, results){
        session.sendTyping();
        session.send(`Hi **${results.response}**!`);
        var name = results.response;
        var card = createHeroCard2(session, name);
        // attach the card to the reply message
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
        session.endDialogWithResult(results);
    }]);



bot.dialog('help', [
    function (session, results) {
        session.sendTyping();
        session.send("# **Here is what I can do for you:** \n\n \n\n ### To turn the lights on/off please write \n\n \*Turn the lights [on|off] in the living room* \n\n \n\n ### Regulate the heating system \n\n \n\n *Turn [on|off] the heater in the kitchen* \n\n \n\n ### Check in which rooms the lights are turned on/off \n\n \n\n *Where is the light [on|off] at the moment?*");
        session.endDialogWithResult(results);
    }
]).triggerAction({ matches: /(help)\s.*help/i });


function createHeroCard(session, name) {
    return new builder.HeroCard(session)
        .title(`Hi ${name}!`)
        .subtitle('I am Homie - your personal digital assistant')
        .text('I can help you in your everyday\'s life\n\n Please tell me what you want me to do or click the button below for help:')
        .images([
            //builder.CardImage.create(session, 'https://maxcdn.icons8.com/Share/icon/ultraviolet/industry//robot_21600.png')
            builder.CardImage.create(session, 'http://www.cloudguy.pro/wp-content/uploads/2017/11/homie.png')
        ])
        .buttons([
            builder.CardAction.postBack(session, 'help', 'Help')
        ]);
}

function createHeroCard2(session, name) {
    return new builder.HeroCard(session)
        .title(`Hi ${name}!`)
        .subtitle('I am Homie - your personal digital assistant')
        .text('I can help you in your everyday\'s life\n\n Please tell me what you want me to do or click the button below for help:')
        .images([
            builder.CardImage.create(session, 'http://www.cloudguy.pro/wp-content/uploads/2017/11/homie-1.png')
        ])
        .buttons([
            builder.CardAction.postBack(session, 'help', 'Help')
        ]);
}
  /*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/

bot.dialog('/',intents); 
*/
intents.matches('HomeAutomation.TurnOn',function(session, args){ 
    session.sendTyping();
    if(args.entities[0]) {
        var deviceEntity = builder.EntityRecognizer.findEntity(args.entities, 'HomeAutomation.Device');
        var roomEntity = builder.EntityRecognizer.findEntity(args.entities, 'HomeAutomation.Room');
        if (roomEntity){
            session.send("Ok, I will turn the %s on in the %s", deviceEntity['entity'], roomEntity['entity']);
            session.endDialog();
            var myJSONObject = {
                "device": deviceEntity['entity'],
                "room": roomEntity['entity'],
                "action": "Turn on"
            };
            request({
                url: "https://sbhome-app.azurewebsites.net/api/sbhomeTrigger?code=uxLIGa6UFWGUMOsaVmvCXYPTZ2mCt5GElbEHOaarFx/sDmwXOaF7iA==",
                method: "POST",
                json: true,
                body: myJSONObject
            }, function (error, response, body){
                console.log(response);
            });
        }
        
    }
    
});

intents.matches('HomeAutomation.TurnOff',function(session, args){ 
    //session.send("I will turn the lights ON");
    session.sendTyping();
    if(args.entities[0]) {
        var deviceEntity = builder.EntityRecognizer.findEntity(args.entities, 'HomeAutomation.Device');
        var roomEntity = builder.EntityRecognizer.findEntity(args.entities, 'HomeAutomation.Room');
        console.log(roomEntity['entity']);
        if (roomEntity){
            session.send("Ok, I will turn the %s off in the %s", deviceEntity['entity'], roomEntity['entity']);
            session.endDialog();
            var myJSONObject = {
                "device": deviceEntity['entity'],
                "room": roomEntity['entity'],
                "action": "Turn off"
            };
            request({
                url: "https://sbhome-app.azurewebsites.net/api/sbhomeTrigger?code=uxLIGa6UFWGUMOsaVmvCXYPTZ2mCt5GElbEHOaarFx/sDmwXOaF7iA==",
                method: "POST",
                json: true,
                body: myJSONObject
            }, function (error, response, body){
                console.log(response);
            });
        }
        
    }
    
});

intents.matches('HomeAutomation.GetLightedUpRooms',function(session, args){ 
    session.sendTyping();
    var tableService = azure.createTableService("DefaultEndpointsProtocol=https;AccountName=sbhomie;AccountKey=NN6BvqHdUW81JfFoXbzfWnsFglvSqv0MHMABKvTqDXuJZHX33ND30E/Yx2gk7JXAcGGSY8GstDlfGoVkSfnDxA==;EndpointSuffix=core.windows.net");
    var query = new azure.TableQuery()
        .top(5)
        .where('Status eq ?', 'On');
    
    tableService.queryEntities('LightStatus', query, null, function(error, result, response) {
        if (!error) {
        var objNumber = Object.keys(result.entries).length;
        var numberIndicator = 0;
        var outStringRooms = "";
        if(objNumber > 1){
            
            result.entries.forEach(function(room) {
                var roomName = room.Room;
                outStringRooms += '\n\n';
                outStringRooms += roomName["_"];                
                numberIndicator = 2;
                sendStatusOutput(session, outStringRooms, numberIndicator);
            });
        } else {
            result.entries.forEach(function(room) {
                var roomName = room.Room;
                outStringRooms = roomName["_"];
                numberIndicator = 1;
                sendStatusOutput(session, outStringRooms, numberIndicator);
            });
        }
        
        } else {
            sendStatusOutput(session, outStringRooms, 0);
        }
    });
});

function sendStatusOutput(session, outputString, number) {
    if(number == 1){
        session.send("The lights are currently on in the %s ", outputString);
        session.endDialog();

    } if(number ==2) {
        session.send("The lights are currently on here: %s ", outputString);
        session.endDialog();
    } if(number ==0) {
        session.send("No rooms are lighted up right now!");
        session.endDialog();
    }
}


intents.matches('HomeAutomation.GetLightedOffRooms',function(session, args){ 
    session.sendTyping();
    
        
    var tableService = azure.createTableService("DefaultEndpointsProtocol=https;AccountName=sbhomie;AccountKey=NN6BvqHdUW81JfFoXbzfWnsFglvSqv0MHMABKvTqDXuJZHX33ND30E/Yx2gk7JXAcGGSY8GstDlfGoVkSfnDxA==;EndpointSuffix=core.windows.net");
    var query = new azure.TableQuery()
        .top(5)
        .where('Status eq ?', 'Off');
    
    tableService.queryEntities('LightStatus', query, null, function(error, result, response) {
        if (!error) {
        var objNumber = Object.keys(result.entries).length;
        var numberIndicator = 0;
        var outStringRooms = "";
        if(objNumber > 1){
            
            result.entries.forEach(function(room) {
                var roomName = room.Room;
                outStringRooms += '\n\n';
                outStringRooms += roomName["_"];
                numberIndicator = 2;
            });
        } else {
            result.entries.forEach(function(room) {
                var roomName = room.Room;
                outStringRooms = roomName["_"];
                numberIndicator = 1;
            });
        }
        sendStatusOutputOff(session, outStringRooms, numberIndicator);
        } else {
        sendStatusOutputOff(session, outStringRooms, 0);
        }
    });
});

function sendStatusOutputOff(session, outputString, number) {
    if(number == 1){
        session.send("The lights are currently off in the %s ", outputString);
        session.endDialog();

    } if(number ==2) {
        session.send("The lights are currently off here: %s ", outputString);
        session.endDialog();
    } if(number ==0) {
        session.send("No rooms are dark right now!");
        session.endDialog();
    }
}

intents.onDefault(function(session){ 
    session.send("Sorry...can you please rephrase?");
});
bot.dialog('/',intents); 

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    var listener = connector.listen();
    var withLogging = function(context, req) {
        console.log = context.log;
        listener(context, req);
    }
    module.exports = { default: withLogging }

    //module.exports = { default: connector.listen() }
}

