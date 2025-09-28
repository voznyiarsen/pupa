require('dotenv').config();

const { Vec3 } = require('vec3');
const util = require('node:util');

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
    logErrors: false,
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

        ui.log(bot.pupa_utils.getJumpVelocity(new Vec3(419.5, 0, 163.5), new Vec3(420.5, 0, 163.5)));
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
        ui.log(`<${username}> ${message}`); /// [ 0, 0, 0, 1, 1, 1 ]

        ui.log(util.inspect(bot.blockAt(bot.entity.position.offset(0, -1.5, 0)),true,null,true)); // if length [x1, y1, z1, x2, y2, z2] if delta x and z is less than 0.5

        //ui.log(util.inspect(bot.pathfinder.movements.interactableBlocks,false,null,false))
        //ui.log(util.inspect(bot.pathfinder.movements.replaceables,false,null,false))

        ui.log(await bot.pupa_utils.isNearPassable(bot.entity.position));
        switch (true) {
            case message == 'gg':
                break;
        
            default:
                break;
        }
    });

    bot.on('physicTick', () => {
        // 

    });
}

ui.onInput(text => {
    if (!text.match(/^\s?$/)) {
        if (bot.pupa_commands.query(text) === false) {
            ui.log(`{green-fg}Sending:{/} "${text}"`);
            bot.chat(text);
        }
    }
});

process.on('uncaughtException', (err) => ui.log(`{yellow-fg}[Exception]{/} ${err}`));
process.on('warning', (warn) => ui.log(`{yellow-fg}[Warning]{/} ${warn}`));

(async () => {
    try {
        start_client();
    } catch (error) {
        ui.log(`{red-fg}[Error]{/} Bot initialization failed: '${error}'`);
    }
})();

