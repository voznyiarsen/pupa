const ui = require('./tui')();

module.exports = function attach(bot) {
    class pupa_commands {
        constructor(bot) {
            this.bot = bot;
        }
        exec(data) { 
            const command = data.split(' ');
            switch(true) {
                /* TOSS ITEMS */
                case /^ts \d{1,3}(\s\d+)?$/.test(data): // ITEM | COUNT
                    if (command.length === 3) {
                        ui.log(`Tossing ${this.bot.registry.items[parseInt(command[1], 10)].displayName} x${parseInt(command[2], 10)}`);           
                        this.bot.toss(parseInt(command[1], 10), null, parseInt(command[2], 10));
                    } else {
                        ui.log(`Tossing ${this.bot.registry.items[parseInt(command[1], 10)].displayName}`);             
                        this.bot.toss(parseInt(command[1], 10));
                    }
                    break;
                case /^ts \w+(\s\d+)?$/.test(data): // ITEM | COUNT
                    if (command.length === 3) {
                        ui.log(`Tossing ${this.bot.registry.itemsByName[command[1]].displayName} x${parseInt(command[2], 10)}`);           
                        this.bot.toss(this.bot.registry.itemsByName[command[1]].id, null, parseInt(command[2], 10));
                    } else {
                        ui.log(`Tossing ${this.bot.registry.itemsByName[command[1]].displayName}`);             
                        this.bot.toss(this.bot.registry.itemsByName[command[1]].id);
                    }
                    break;
                case /^tsall$/.test(data):
                    this.bot.pupa_inventory.tossAllItems();
                    break;
                /* EQUIP ITEMS */
                case /^eq \d+ [\w-]+$/.test(data): // ITEM | DESTINATION
                    this.bot.equip(command[1], command[2]);
                    break;
                /* UNEQIUP ITEMS */
                case /^uneq [\w-]+$/.test(data): // DESTINATION
                    this.bot.unequip(command[1]);
                    break;
                case /^uneqall$/.test(data): 
                    this.bot.pupa_inventory.unequipAllItems();
                    break;
                /* PATHFIND */
                /*
                case /^goto -?\d*\s?-?\d*\s?-?\d*$/.test(data): 
                    if (piece.length === 4) {
                        let [x, y, z] = [piece[1], piece[2], piece[3]];
                        x = parseInt(x, 10);
                        y = parseInt(y, 10);
                        z = parseInt(z, 10);
                        
                        const goal = new GoalNear(x, y, z, 1);
                        this.bot.pathfinder.setGoal(goal);

                    } else if (piece.length === 3) {
                        let [x, z] = [piece[1], piece[2]];
                        x = parseInt(x, 10);
                        z = parseInt(z, 10);
                        
                        const goal = new GoalXZ(x, z);
                        this.bot.pathfinder.setGoal(goal);

                        return `Set goal to X: ${x} Z: ${z}`;
                    }
                    break;
                */
                /* CHANGE MODE */
                case /^cm(\s[0-3])?$/.test(data):
                    ui.log(command[1]);
                    this.bot.pupa_pvp.setMode(command[1]);
                    break;
                /* ENABLE/DISABLE COMBAT */
                case /^s$/.test(data):
                    bot.pupa_pvp.setMode(4);
                    break;
                case /^fe$/.test(data): {
                        const player = this.bot.nearestEntity(e => e.type === 'player' && 
                        e.position.distanceTo(this.bot.entity.position) <= 128 &&
                        e.username === master);
                    }
                    break;
                /* ALLY ADD/REMOVE */
                case /^aa \S+$/.test(data):
                    allies.push(command[1]);
                    break;
                case /^ar \S+$/.test(data):
                    allies = allies.filter(item => item !== command[1]);
                    break;
                case /^raa$/.test(data):
                    allies = [master, this.bot.username];
                    break;
                /* RESTORE LOADOUT */
                case /^rep$/.test(data):
                    restoreLoadout();
                    break;
                /* TARGET PLAYER */
                case /^trg \S+$/.test(data): 
                    targetPlayer = this.bot.players[command[1]];
                    sysCombatMode = 4;
                    break;
                /* CHECK PLAYER */
                case /^pdb \S+$/.test(data): {
                    const player = this.bot.players[command[1]];
                    if (player) {
                        renderChatBox(`${status.ok}Player found`);
                        renderChatBox(util.inspect(player, true, null, true));
                    } else {
                        renderChatBox(`${status.warn}No entry of player found`);
                    }
                }
                    break;
                /* CHECK ITEM IN SLOT */
                case /^sdb \d+$/.test(data): {
                    const item = this.bot.inventory.slots[command[1]];
                    if (item) {
                        renderChatBox(`${status.ok}Item found`);
                        renderChatBox(util.inspect(item, true, null, true));
                    } else {
                        renderChatBox(`${status.warn}No entry of item in slot ${command[1]} found`);
                    }
                }
                    break;
                /* LIST ELEMENTS */
                case /^i$/.test(data):
                    getItems();
                    break;
                case /^p$/.test(data):
                    getPlayers();
                    break;
                /* QUIT */
                case /^q$/.test(data):
                    this.bot.end();
                    process.exit(0);
                default:
                    return false;
            }
        }
    }
    bot.pupa_commands = new pupa_commands(bot)
    return bot;
}