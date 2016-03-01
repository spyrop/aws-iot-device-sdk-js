
function genericOperation( operation, state )
{
   console.log('calling operation "' + operation + '" on ' + thingName);
   
   var clientToken = thingShadows[operation]( thingName, state );

   if (clientToken === null)
   {
//
// The thing shadow operation can't be performed because another one
// is pending; if no other operation is pending, reschedule it after an 
// interval which is greater than the thing shadow operation timeout.
//
      if (currentTimeout !== null) {
         console.log('operation in progress, scheduling retry...');
         currentTimeout = setTimeout( 
            function() { genericOperation( operation, state ); }, 
                  operationTimeout * 2 );
      }
   }
   else
   {
//
// Save the client token so that we know when the operation completes.
//
      stack.push( clientToken );
   }
}

function deviceOp( thing, operation, arguments )
{
   console.log('calling operation "' + operation + '" args: ' + arguments.join());
   var func = thing[operation];  
   func.apply(null, arguments);

}

function set_events(thingShadows, _onconnect, _onmessage, rec) {
	thingShadows.on('connect', function() {
		console.log('connected to things instance');
		_onconnect(thingShadows);
});

thingShadows.on('close', function() {
    console.log('close');
    thingShadows.unregister( thingName );
	set_events(thingShadows, _onconnect, _onmessage);
});

thingShadows.on('reconnect', function() {
    console.log('reconnect');
	set_events(thingShadows, _onconnect, _onmessage);
});

thingShadows.on('offline', function() {
//
// If any timeout is currently pending, cancel it.
//
    if (currentTimeout !== null) 
    {
       clearTimeout(currentTimeout);
       currentTimeout=null;
    }
//
// If any operation is currently underway, cancel it.
//
    while (stack.length) {
       stack.pop();
    }
    console.log('offline');
});

thingShadows.on('error', function(error) {
    console.log('error', error);
});

thingShadows.on('message', function(topic, payload) {
	if (DEBUG)
		console.log('message', topic, payload.toString());
	var tokens = topic.split('/');
	var last_token = tokens[tokens.length - 1];
	_onmessage(topic, payload, last_token, last_token == thingName);
});

thingShadows.on('status', function(thingName, stat, clientToken, stateObject) {
    handleStatus( thingName, stat, clientToken, stateObject );
});

thingShadows.on('delta', function(thingName, stateObject) {
     handleDelta( thingName, stateObject );
});

thingShadows.on('timeout', function(thingName, clientToken) {
     handleTimeout( thingName, clientToken );
});
}

//
// Operation timeout in milliseconds
//
const operationTimeout = 10000;    

var currentTimeout = null;

//
// For convenience, use a stack to keep track of the current client 
// token; in this example app, this should never reach a depth of more 
// than a single element, but if your application uses multiple thing
// shadows simultaneously, you'll need some data structure to correlate 
// client tokens with their respective thing shadows.
//
var stack = [];

function mobileAppConnect()
{
   thingShadows.register( thingName, { ignoreDeltas: false,
                                       operationTimeout: operationTimeout } );
									   
   setTimeout( function() {						   
		genericOperation(thingShadows, 'get' );
   }, 5000 );
}

function deviceConnect()
{
   thingShadows.register( thingName, { ignoreDeltas: true,
                                       operationTimeout: operationTimeout } );
   genericOperation(thingShadows, 'update', generateRandomState() );
}

function handleConnections()
{
   if (args.testMode === 1) {
      mobileAppConnect();
   } else {
      deviceConnect();
   }
}

function handleStatus( thingName, stat, clientToken, stateObject )
{
   var expectedClientToken = stack.pop();

   if (expectedClientToken === clientToken) {
      console.log( 'got \''+stat+'\' status on: ' + 
		thingName + " " + JSON.stringify(stateObject) );
   }
   else {
      console.log('(status) client token mismtach on: '+thingName);
   }

   if (args.testMode === 2) {
      console.log('updated state to thing shadow');
//
// If no other operation is pending, restart it after 10 seconds.
//
      if (currentTimeout === null) {
         currentTimeout = setTimeout( function() {
            currentTimeout = null;
            genericOperation(thingShadows, 'update', generateRandomState());
         }, 10000 );
      }
   }
}

function handleDelta( thingName, stateObject )
{
   if (args.testMode === 2) {
      console.log('unexpected delta in device mode: ' + thingName );
   }
   else {
      console.log( 'delta on: '+thingName+JSON.stringify(stateObject) );
   }
}

function handleTimeout( thingName, clientToken )
{
   var expectedClientToken = stack.pop();

   if (expectedClientToken === clientToken) {
      console.log('timeout on: '+thingName);
   } 
   else {
      console.log('(timeout) client token mismtach on: '+thingName);
   }

   if (args.testMode === 2) {
      genericOperation(thingShadows, 'update', generateRandomState());
   }
}



function processTest( args ) {
//
// The device module exports an MQTT instance, which will attempt
// to connect to the AWS IoT endpoint configured in the arguments.
// Once connected, it will emit events which our application can
// handle.
//
const device = browser.device({
  keyPath: args.privateKey,
  certPath: args.clientCert,
  caPath: args.caCert,
  clientId: args.clientId,
  region: args.region,
  reconnectPeriod: args.reconnectPeriod,
  protocol: args.Protocol,
  port: args.Port,
  host: args.Host,
  debug: args.Debug,
  awsAccessId: args.awsAccessId,
  awsSecretKey: args.awsSecretKey
});

var timeout;
var count=0;
//
// Do a simple publish/subscribe demo based on the test-mode passed
// in the command line arguments.  If test-mode is 1, subscribe to
// 'topic_1' and publish to 'topic_2'; otherwise vice versa.  Publish
// a message every four seconds.
//
device
  .on('connect', function() {
    const minimumDelay=250;
    console.log('connect');
    if (args.testMode === 1)
    {
        device.subscribe('topic_1');
    }
    else
    {
        device.subscribe('topic_2');
    }
    if ((Math.max(args.delay,minimumDelay) ) !== args.delay)
    {
        console.log( 'substituting '+ minimumDelay + 'ms delay for ' + args.delay + 'ms...' );
    }
    timeout = setInterval( function() {
        count++;
   
        if (args.testMode === 1)
        {
            device.publish('topic_2', JSON.stringify({
            mode1Process: count }));
        }
        else
        {
            device.publish('topic_1', JSON.stringify({
            mode2Process: count }));
        }
    }, Math.max(args.delay,minimumDelay) );  // clip to minimum
    });
device 
  .on('close', function() {
    console.log('close');
    clearInterval( timeout );
    count=0;
  });
device 
  .on('reconnect', function() {
    console.log('reconnect');
  });
device 
  .on('offline', function() {
    console.log('offline');
    clearInterval( timeout );
    count=0;
  });
device
  .on('error', function(error) {
    console.log('error', error);
    clearInterval( timeout );
    count=0;
  });
device
  .on('message', function(topic, payload) {
    console.log('message', topic, payload.toString());
  });

}