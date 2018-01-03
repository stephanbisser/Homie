'use strict';

var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var connectionString = [INSERT YOUR IOT HUB CONNECTION STRING HERE];
var client = clientFromConnectionString(connectionString);

var max7219LedMatrix = require('node-max7219-led-matrix');
var max7219 = new max7219LedMatrix.max7219("/dev/spidev0.0");

// GPIO pin of the led
var configPin = 7;
// Blinking interval in usec
var configTimeout = 1000;

var isLedOn = 0;

function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
  };
}

var connectCallback = function (err) {
  if (err) {
    console.log('Could not connect: ' + err);
  } else {
    console.log('Client connected');
    client.on('message', function (msg) {
        if(msg.data == "lightsOnOffice"){
			isLedOn = +!isLedOn;
			max7219.showMessage('O');
			max7219.clear();
			console.log('\x1b[33m%s\x1b[0m', msg.data + " - turning the lights on in the office...");
        } else if(msg.data == "lightsOffOffice"){
			isLedOn = 0;
			max7219.showMessage(' ');
			max7219.clear();
			max7219.showMessage(' ');
			max7219.clear();           
			console.log('\x1b[31m%s\x1b[0m', msg.data + " - turning the lights off in the office...");
        } else if(msg.data == "lightsOnLivingRoom"){
			isLedOn = +!isLedOn;
			max7219.showMessage('O');
			max7219.clear();
			console.log('\x1b[33m%s\x1b[0m', msg.data + " - turning the lights on in the living room...");
        } else if(msg.data == "lightsOffLivingRoom"){
			isLedOn = 0;
			max7219.showMessage(' ');
			max7219.clear();
			max7219.showMessage(' ');
			max7219.clear();
			console.log('\x1b[31m%s\x1b[0m', msg.data + " - turning the lights off in the living room...");
        }
      client.complete(msg, printResultFor('completed'));
    });
  }
};

client.open(connectCallback);