'use strict';

var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var connectionString = 'HostName=sbhome.azure-devices.net;DeviceId=sbhome-device02;SharedAccessKey=iPOau4Es7E8zd5WL4ex3B9tfikEY84VRhteYctGV14o=';
var client = clientFromConnectionString(connectionString);
//var wpi = require('wiring-pi');

var max7219LedMatrix = require('node-max7219-led-matrix');
var max7219 = new max7219LedMatrix.max7219("/dev/spidev0.0");

// GPIO pin of the led
var configPin = 7;
// Blinking interval in usec
var configTimeout = 1000;

//wpi.setup('wpi');
//wpi.pinMode(configPin, wpi.OUTPUT);

var isLedOn = 0;

function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    //if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}
/* Send DATA

var connectCallback = function (err) {
  if (err) {
    console.log('Could not connect: ' + err);
  } else {
    console.log('Client connected');

    // Create a message and send it to the IoT Hub every second
    setInterval(function(){
        var temperature = 20 + (Math.random() * 15);
        var humidity = 60 + (Math.random() * 20);            
        var data = JSON.stringify({ deviceId: 'myFirstNodeDevice', temperature: temperature, humidity: humidity });
        var message = new Message(data);
        message.properties.add('temperatureAlert', (temperature > 30) ? 'true' : 'false');
        console.log("Sending message: " + message.getData());
        client.sendEvent(message, printResultFor('send'));
    }, 1000);
  }
};
client.open(connectCallback);
*/

var connectCallback = function (err) {
  if (err) {
    console.log('Could not connect: ' + err);
  } else {
    console.log('Client connected');
    client.on('message', function (msg) {
        if(msg.data == "lightsOnOffice"){
		isLedOn = +!isLedOn;
		//isLedOn = !isLedOn;
		//wpi.digitalWrite(configPin, isLedOn );  
		max7219.showMessage('O');
		max7219.clear();
         
		console.log('\x1b[33m%s\x1b[0m', msg.data + " - turning the lights on in the office...");
        } else if(msg.data == "lightsOffOffice"){
		isLedOn = 0;
	        //wpi.digitalWrite(configPin, isLedOn );
		max7219.showMessage(' ');
		max7219.clear();
		max7219.showMessage(' ');
		max7219.clear();           
		console.log('\x1b[31m%s\x1b[0m', msg.data + " - turning the lights off in the office...");
        } else if(msg.data == "lightsOnLivingRoom"){
            	isLedOn = +!isLedOn;
		//isLedOn = !isLedOn;
		//wpi.digitalWrite(configPin, isLedOn );
		max7219.showMessage('O');
		max7219.clear();
		console.log('\x1b[33m%s\x1b[0m', msg.data + " - turning the lights on in the living room...");
        } else if(msg.data == "lightsOffLivingRoom"){
            	isLedOn = 0;
	        //wpi.digitalWrite(configPin, isLedOn );
		console.log('\x1b[31m%s\x1b[0m', msg.data + " - turning the lights off in the living room...");
        }
      
      //console.log('\x1b[33m%s\x1b[0m', 'Id: ' + msg.messageId + ' Body: ' + msg.data);
      client.complete(msg, printResultFor('completed'));
    });
    // Create a message and send it to the IoT Hub every second
    setInterval(function(){
        var temperature = 20 + (Math.random() * 15);
        var humidity = 60 + (Math.random() * 20);            
        var data = JSON.stringify({ deviceId: 'sbhome-device02', temperature: temperature, humidity: humidity });
        var message = new Message(data);
        message.properties.add('temperatureAlert', (temperature > 30) ? 'true' : 'false');
        //console.log("Sending message: " + message.getData());
        client.sendEvent(message, printResultFor('send'));
    }, 1000);
  }
};

client.open(connectCallback);