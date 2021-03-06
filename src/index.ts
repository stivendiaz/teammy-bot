// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { get } from 'config';
import { config } from 'dotenv';
import * as path from 'path';
import * as restify from 'restify';

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import { BotFrameworkAdapter, MiddlewareSet } from 'botbuilder';
import { SlackMiddelware } from './middlewares';

// This bot's main dialog.
import { MyBot } from './bot';
import { DatabaseConfig } from './repository/config/database.config';

const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

// Create Db Tables and config
const databaseConfig = DatabaseConfig.getDynamoDb();

// Create HTTP server.
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
  console.log(`\nSee https://aka.ms/connect-to-bot for more information`);
});

server.use(restify.plugins.bodyParser());
// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new BotFrameworkAdapter({
  appId: get('azure.microsoft_app_id'),
  appPassword: get('azure.microsoft_app_password'),
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
  console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
  await context.sendActivity(`Oops. Something went wrong!`);
};

// Middelware for slack mentions
const slackMiddelware = new SlackMiddelware();
adapter.use(slackMiddelware.isMentioned);

// Create the main dialog.
const myBot = new MyBot();

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
  adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
    await myBot.run(context);
  });
});
