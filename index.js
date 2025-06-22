require('dotenv').config()

const mineflayer = require('mineflayer');
const ui = require('./tui')();

const { Inventory } = require('./inventory');
//const { Pvp } = require('./pvp');
// use as plugins instead

let pupa_inventory;
let pupa_pvp;

const config = {
    host: process.env.PUPA_HOST,
    port: process.env.PUPA_PORT,
    username: process.env.PUPA_NAME,
    version: process.env.PUPA_VERSION,
    logErrors: false,
    hideErrors: false,
}

let bot;

function start_client() {
    bot = mineflayer.createBot(config);

    bot.on('login', () => {
        ui.log("[Client] Successfully logged into account");
        module.exports = { bot };
        
        // Module loading
        //require('./pvp');
        pupa_inventory = new Inventory(bot);
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

    bot.on('chat', (message) => {
        switch (true) {
            case value:
                
                break;
        
            default:
                break;
        }
    });
}

ui.onInput(text => {
    if (!text.match(/^\s?$/)) {
        ui.log(`{green-fg}Sending:{/} ${text}`);
        bot.chat(text);
        pupa_inventory.tossAllItems();
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

