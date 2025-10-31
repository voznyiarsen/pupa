require('dotenv').config();

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;

const ui = require('./tui')();

const pupa_inventory = require('./inventory');
const pupa_pvp = require('./pvp');
const pupa_commands = require('./commands');
const pupa_utils = require('./utils');

const config = {
    host: process.argv[2] || process.env.PUPA_HOST,
    port: process.argv[3] || process.env.PUPA_PORT,
    username: process.argv[4] || process.env.PUPA_NAME,
    version: process.argv[5] || process.env.PUPA_VERSION,
    logErrors: true,
    hideErrors: false,
}

let bot;

function start_client() {
    bot = mineflayer.createBot(config);

    bot.on('login', () => {
        ui.log("{green-fg}[Client]{/} Successfully logged into account");
        
        bot.loadPlugin(pathfinder);
        bot.loadPlugin(pvp);

        pupa_inventory(bot);
        pupa_pvp(bot);
        pupa_commands(bot);
        pupa_utils(bot);

        bot.pvp.movements.infiniteLiquidDropdownDistance = true;
        bot.pvp.movements.allowEntityDetection = true;
        bot.pvp.movements.allowFreeMotion = true;
        bot.pvp.movements.allowParkour = true;
        bot.pvp.movements.maxDropDown = 256;
        
        bot.pvp.movements.allow1by1towers = false;
        bot.pvp.movements.canOpenDoors = false;
        bot.pvp.movements.canDig = false;
        
        bot.pvp.movements.scafoldingBlocks = [null];
        
        bot.pvp.attackRange = 3.5;
        bot.pvp.followRange = 3.45;
        
        bot.pvp.viewDistance = 128;
    });
      
    bot.on('kicked', (reason) =>  {
        ui.log(`{red-fg}[Client]{/} Bot kicked from ${config.host}:${config.port}, reason: '${reason}'`);
    });
    
    bot.on('end', (reason) => {
        ui.log(`{red-fg}[Client]{/} Bot ended from ${config.host}:${config.port}, reason: '${reason}'`);
        ui.log(`{red-fg}[Client]{/} Attempting reconnect in 6s...`)
        setTimeout(() => {
            start_client();  
        }, 6000)
    });
    
    bot.on('error', ui.log);

    bot.on('chat', async (username, message) => {
        ui.log(`<${username}> ${message}`);
        switch (true) {
            case message == 'gg':
                break;
            default:
                break;
        }
    });
    
    bot.on('entityHurt', async (entity) => {
        if (entity.type === 'player' && entity.username === bot.username) {
            await bot.waitForTicks(1);
            bot.pupa_pvp.getLastDamage();
            ui.log(bot.health, bot.food)
        }
    });

    bot.on('health', async () => {
        
    })
    //bot.on('playerCollect', async (collector) => {});

    // AKB
    //bot._client.on('entity_velocity', () => bot.entity.velocity.set(0,bot.entity.velocity.y,0));
}

ui.onInput(text => {
    if (!text.match(/^\s?$/)) {
        if (bot.pupa_commands.query(text) === false) {
            ui.log(`{green-fg}Sending:{/} "${text}"`);
            bot.chat(text);
        }
    }
});

process.on('uncaughtException', (err, origin) => ui.log(`{yellow-fg}[Exception]{/} ${err} at origin: ${origin}`));
process.on('warning', (warn) => ui.log(`{yellow-fg}[Warning]{/} ${warn}`));

(async () => {
    try {
        start_client();
    } catch (error) {
        ui.log(`{red-fg}[Client]{/} Bot initialization failed: '${error}'`);
    }
})();

