require('dotenv').config()

const util = require('node:util')

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;

const ui = require('./tui')();

const pupa_inventory = require('./inventory');
const pupa_pvp = require('./pvp');
const pupa_commands = require('./commands');
const pupa_utils = require('./utils');
/*
const { Inventory } = require('./inventory');
const { Pvp } = require('./pvp');
//use as plugins instead

let pupa_inventory;
let pupa_pvp;
*/

const config = {
    host: process.argv[2] || process.env.PUPA_HOST,
    port: process.argv[3] || process.env.PUPA_PORT,
    username: process.argv[4] || process.env.PUPA_NAME,
    version: process.argv[5] || process.env.PUPA_VERSION,
    logErrors: false,
    hideErrors: false,
}

let bot;

function start_client() {
    bot = mineflayer.createBot(config);

    bot.on('login', () => {
        ui.log("[Client] Successfully logged into account");
        //module.exports = { bot };
        
        bot.loadPlugin(pathfinder);
        bot.loadPlugin(pvp);

        pupa_inventory(bot);
        pupa_pvp(bot);
        pupa_commands(bot);
        pupa_utils(bot);
        // Module loading
        //require('./pvp');
        //pupa_inventory = new Inventory(bot);
    });
      
    bot.on('kicked', (reason) =>  {
        ui.log(`[Client] Bot kicked from ${config.host}:${config.port}, reason: '${reason}'`);
    });
    
    bot.on('end', (reason) => {
        ui.log(`[Client] Bot ended from ${config.host}:${config.port}, reason: '${reason}'`);
        setTimeout(() => {
            start_client();  
        }, 6000)
    });
    
    bot.on('error', ui.log);

    bot.on('chat', async (username, message) => {
        ui.log(`<${username}> ${message}`);
        ui.log(util.inspect(bot.registry.items[2],true,null,true))
        ui.log(`BOT Position ${bot.entity.position}`);
        ui.log(`TARGET Position ${bot.players['Patr10t'].entity.position}`)
        ui.log(`Arc: ${bot.pupa_utils.getOffset(bot.entity.position, bot.players['Patr10t'].entity.position)}`);

        bot.lookAt(bot.players['Patr10t'].entity.position.offset(0, bot.pupa_utils.getOffset(bot.entity.position, bot.players['Patr10t'].entity.position)[1], 0), true);
        await bot.waitForTicks(5);
        bot.pupa_inventory.equipPearl();

        switch (true) {
            case message == 'gg':
                break;
        
            default:
                break;
        }
    });
}

ui.onInput(text => {
    if (!text.match(/^\s?$/)) {
        if (bot.pupa_commands.exec(text) == false) {
            ui.log(`{green-fg}Sending:{/} "${text}"`);
            bot.chat(text);
        }
    }
});

process.on('uncaughtException', (err) => ui.log(`[Exception] ${err}`));
process.on('warning', (warn) => ui.log(`[Warning] ${warn}`));

(async () => {
    try {
        start_client();
    } catch (error) {
        ui.log(`[Error] Bot initialization failed: '${error}'`);
    }
})();

