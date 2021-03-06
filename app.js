/**
 * Webhook
 *
 * Your webhook is the core of your Messenger bot experience. This is where your
 * code lives, and where you will receive, process, and send messages.
 *
 * To deploy a live webhook that can receive webhook events from the Messenger
 * Platform, your code must be hosted on a public HTTPS server that meets has
 * the following:
 * - HTTPS support, Self-signed certificates are not supported
 * - A valid SSL certificate
 * - An open port that accepts GET and POST requests
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/webhook-setup
 */

// Put in the strict mode
'use strict';

// Import dependencies and set up http server
const
  express = require('express'),
  // { urlencoded, json } = require('body-parser'),
  config = require('./services/config'),
  Receive = require("./services/receive"),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json());;  // Creates express http server

// Parse application/x-www-form-urlencoded
// app.use(urlencoded({extended: true}));

/**
 * Adds support for GET requests to our webhook for verification
 * Verification step:
 * - Create a verify token. This is a random string of your choosing,
 *   hardcoded into your webhook.
 * - Provide your verify token to the Messenger Platform when you subscribe your
 *   webhook to receive webhook events for an app.
 * - The Messenger Platform sends a GET request to your webhook with the token
 *   in the hub.verify parameter of the query string.
 * - You verify the token sent matches your verify token, and respond with
 * hub.challenge parameter from the request.
 * - The Messenger Platform subscribes your webhook to the app.
 */
app.get('/webhook', (req, res) => {

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === config.verifyToken) {

        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);

      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
      }
    }
  });

/**
 * Creates the endpoint for our webhook that accepts POST requests,
 * checks the request is a webhook event, then parses the message.
 * This endpoint is where the Messenger Platform will send all webhook events.
 * Note that the endpoint returns a 200 OK response, which tells the Messenger
 * Platform the event has been received and does not need to be resent.
 * Normally, you will not send this response until you have completed
 * processing the event.
 */
app.post('/webhook', (req, res) => {
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      let webhookEvent = entry.messaging[0];
      console.log(webhookEvent);

      // Get sender PSID
      let senderPSID = webhookEvent.sender.id;
      // console.log('Sender PSID: ' + senderPSID);

      // Do nothing if webhookEvent is message_deliveries
      if ('delivery' in webhookEvent) {
        return;
      }

      // Handle the received message
      let receiveMessage = new Receive(senderPSID, webhookEvent);
      return receiveMessage.handleMessage();
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

/**
 * Set profile for the app
 */
app.get("/profile", (req, res) => {
  let token = req.query["verify_token"];
  let mode = req.query["mode"];

  if (!config.webhookUrl.startsWith("https://")) {
    res.status(200).send("ERROR - Need a proper APP_URL in the .env file");
  }
  var Profile = require("./services/profile.js");
  Profile = new Profile();

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    if (token === config.verifyToken) {
      if (mode == "webhook" || mode == "all") {
        Profile.setWebhook();
        res.write(
          `<p>Set app ${config.appId} call to ${config.webhookUrl}</p>`
        );
      }
      res.status(200).end();
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    // Returns a '404 Not Found' if mode or token are missing
    res.sendStatus(404);
  }
});

// Sets server port and logs message on success
var listener = app.listen(config.port, () => console.log("Your app is listening on port " + listener.address().port));
