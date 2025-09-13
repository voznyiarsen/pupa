module.exports = function attach(bot) {
    class pupa_commands {
        constructor(bot) {
            this.bot = bot;
        }
        exec(data) { 
            const piece = data.split(' ');
            switch(true) {
                /* TOSS ITEMS */
                case /^ts \d+ \d+$/.test(data): // ITEM | COUNT
                    this.bot.toss(piece[1], null, piece[2]);
                    return true;
                case /^ts \w+$/.test(data): // ITEM | DESTINATION
                    this.bot.toss(piece[1]);
                    return true;
                case /^tsall$/.test(data):

                    this.bot.pupa_inventory.tossAllItems();
                    return true;
                /* EQUIP ITEMS */
                case /^eq \d+ [\w-]+$/.test(data): // ITEM | DESTINATION
                    this.bot.equip(piece[1], piece[2]);
                    return true;
                /* UNEQIUP ITEMS */
                case /^uneq [\w-]+$/.test(data): // DESTINATION
                    this.bot.unequip(piece[1]);
                    return true;
                case /^uneqall$/.test(data): 
                    this.bot.pupa_inventory.unequipAllItems();
                    return true;
                /* PATHFIND */
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
                    return true;
                /* CHANGE MODE */
                //case /^ieq$/.test(data):
                //    isAutoEquipping = !isAutoEquipping; 
                //    return true;
                case /^cm(\s[0-3])?$/.test(data):
                    this.bot.pupa_pvp.setMode(piece[1]);
                    return true;
                //case /^ice$/.test(data):
                //    isChatEnabled = !isChatEnabled;
                //    return true;
                //case /^il$/.test(data):
                //    isLogging = !isLogging;
                //    return true;
                //case /^ill$/.test(data):
                //    isLobbyLocked = !isLobbyLocked
                //    renderChatBox(`${status.ok}isLobbyLocked set to ${rateBoolValue(isLobbyLocked)}`);
                //    return true;
                //case /^is$/.test(data):
                //    isSilent = !isSilent;
                //    renderChatBox(`${status.ok}isSilent set to ${rateBoolValue(isSilent)}`);
                //   return true;
                /* ENABLE/DISABLE COMBAT */
                case /^g$/.test(data):
                    isCombatEnabled = !isCombatEnabled;
                    if (!isCombatEnabled) resetCombat();
                    return true;
                case /^fe$/.test(data): {
                        const player = this.bot.nearestEntity(e => e.type === 'player' && 
                        e.position.distanceTo(this.bot.entity.position) <= 128 &&
                        e.username === master);
                    }
                    return true;
                case /^s$/.test(data):
                    resetCombat();
                    return true;
                /* ALLY ADD/REMOVE */
                case /^aa \S+$/.test(data):
                    allies.push(command[1]);
                    return true;
                case /^ar \S+$/.test(data):
                    allies = allies.filter(item => item !== command[1]);
                    return true;
                case /^raa$/.test(data):
                    allies = [master, this.bot.username];
                    return true;
                /* RESTORE LOADOUT */
                case /^rep$/.test(data):
                    restoreLoadout();
                    return true;
                /* TARGET PLAYER */
                case /^trg \S+$/.test(data): 
                    targetPlayer = this.bot.players[command[1]];
                    sysCombatMode = 4;
                    return true;
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
                    return true;
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
                    return true;
                /* LIST ELEMENTS */
                case /^i$/.test(data):
                    getItems();
                    return true;
                case /^p$/.test(data):
                    getPlayers();
                    return true;
                /* QUIT */
                case /^q$/.test(data):
                    this.bot.end();
                    process.exit(0);
            }
        }
    }
    bot.pupa_commands = new pupa_commands(bot)
    return bot;
}