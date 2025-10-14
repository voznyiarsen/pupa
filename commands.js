const ui = require('./tui')();

const util = require('node:util');
const vm = require('vm');

let doTest;

module.exports = function attach(bot) {
    class pupa_commands {
        constructor(bot) {
            this.bot = bot;
        }
        async exec(codeString) {
            const context = {
                console: console,
                require: require,
                process: process,
                setTimeout,
                setInterval,
                setImmediate,
                clearTimeout,
                clearInterval,
                clearImmediate,
                ui,
                bot
            };

            vm.createContext(context);
        
            try {
                const script = new vm.Script(codeString, { 
                    filename: 'command.vm',
                    displayErrors: true 
                });

                const result = script.runInContext(context, { 
                    displayErrors: true,
                    timeout: 5000 
                });

                if (result instanceof Promise) {
                    return await result;
                }
                return result;
            } catch (error) {
                if (error.name === 'SyntaxError' || 
                    error.name === 'ReferenceError' || 
                    error.name === 'TypeError') {
                    throw new Error(`Execution error: ${error.message}`);
                }
                throw error;
            }
        }
        async query(data) { 
            const command = data.split(' ');
            switch(true) {
                case /^x .+$/.test(data):
                    this.exec(command[1]);
                    break;
                /* TOSS ITEMS */
                case /^ts \d{1,3}(\s\d+)?$/.test(data): // ITEM | COUNT
                    if (command.length === 3) {
                        ui.log(`{green-fg}[pupa_inventory]{/} Tossing ${this.bot.registry.items[parseInt(command[1])].displayName} x${parseInt(command[2])}`);           
                        this.bot.toss(parseInt(command[1]), null, parseInt(command[2]));
                    } else {
                        ui.log(`{green-fg}[pupa_inventory]{/} Tossing ${this.bot.registry.items[parseInt(command[1])].displayName}`);             
                        this.bot.toss(parseInt(command[1]));
                    }
                    break;
                case /^ts \w+(\s\d+)?$/.test(data): // ITEM | COUNT
                    if (command.length === 3) {
                        ui.log(`{green-fg}[pupa_inventory]{/} Tossing ${this.bot.registry.itemsByName[command[1]].displayName} x${parseInt(command[2])}`);           
                        this.bot.toss(this.bot.registry.itemsByName[command[1]].id, null, parseInt(command[2]));
                    } else {
                        ui.log(`{green-fg}[pupa_inventory]{/} Tossing ${this.bot.registry.itemsByName[command[1]].displayName}`);             
                        this.bot.toss(this.bot.registry.itemsByName[command[1]].id);
                    }
                    break;
                case /^tsall$/.test(data):
                    ui.log(`{green-fg}[pupa_inventory]{/} Tossing ${this.bot.inventory.slots.filter(Boolean).length} ${this.bot.inventory.slots.filter(Boolean).length === 1 ? 'item' : 'items'}`);
                    this.bot.pupa_inventory.tossAllItems();
                    break;
                /* EQUIP ITEMS */
                case /^eq \d+ [\w-]+$/.test(data): // ITEM | DESTINATION
                    ui.log(`{green-fg}[pupa_inventory]{/} Equipping ${this.bot.registry.items[parseInt(command[1])].displayName} to ${command[2]}`);
                    this.bot.equip(parseInt(command[1]), command[2]); // improve ts to take word input
                    break;
                /* UNEQIUP ITEMS */
                case /^uneq [\w-]+$/.test(data): // DESTINATION
                    ui.log(`{green-fg}[pupa_inventory]{/} Unequipping ${this.bot.inventory.slots[this.bot.getEquipmentDestSlot(command[1])].displayName} from ${command[1]}`);
                    this.bot.unequip(command[1]);
                    break;
                case /^uneqall$/.test(data): 
                    ui.log(`{green-fg}[pupa_inventory]{/} Unequipping all equipped items...`);
                    this.bot.pupa_inventory.unequipAllItems();
                    break;
                case /^testp$/.test(data): {
                    const source = this.bot.entity.position;
                    const target = this.bot.players['Patr10t'].entity.position;

                    const offset = bot.pupa_utils.getPOffset(source, target);

                    ui.log(`[test] Sending pearl from ${source} to ${target} Offset: ${offset}b`);
                    this.bot.lookAt(target.offset(0, offset, 0), true);
                    this.bot.pupa_inventory.equipPearl();
                    }
                    break;
                case /^testa$/.test(data): {
                    const source = this.bot.entity.position;
                    const target = this.bot.players['Patr10t'].entity.position;

                    try {
                        const velocity = this.bot.pupa_utils.getJumpVelocity(source, target);
                        ui.log(`
{green-fg}[pupa_utils]{/} getJumpVelocity: ${velocity} 
{green-fg}[pupa_utils]{/} Source: ${source}
{green-fg}[pupa_utils]{/} Target: ${target}`);

                          this.bot.entity.velocity.set(...Object.values(velocity));
                    } catch (error) {
                        ui.log(`
{red-fg}[pupa_utils]{/} getJumpVelocity failed!
{red-fg}[pupa_utils]{/} Source: ${source}
{red-fg}[pupa_utils]{/} Target: ${target}`);
                    }
                    }
                    break;
                case /^testb$/.test(data): {
                    const source = this.bot.entity.position;
                    const target = this.bot.players['Patr10t'].entity.position;

                    try {
                        const solidsS = this.bot.pupa_utils.getSolidBlocks(source);
                        const solidsT = this.bot.pupa_utils.getSolidBlocks(target);
                        ui.log(`
{green-fg}[pupa_utils]{/} getSolidBlocks: ${solidsS} (${solidsS.length})
{green-fg}[pupa_utils]{/} Source: ${source}
{blue-fg}[pupa_utils]{/} getSolidBlocks: ${solidsT} (${solidsT.length})
{blue-fg}[pupa_utils]{/} Target: ${target}`);
                    } catch (error) {
                        ui.log(`
{red-fg}[pupa_utils]{/} getSolidBlocks failed!
{red-fg}[pupa_utils]{/} Source: ${source}
{blue-fg}[pupa_utils]{/} Target: ${target}`);
                    }
                    }
                    break;
                case /^testc$/.test(data): {
                    const source = this.bot.entity.position;
                    const target = this.bot.players['Patr10t'].entity.position;

                    try {
                        const strafe = this.bot.pupa_utils.getStrafePoint(source, target);
                        ui.log(`
{green-fg}[pupa_utils]{/} getStrafePoint: ${strafe}
{green-fg}[pupa_utils]{/} Source: ${source}
{green-fg}[pupa_utils]{/} Target: ${target}`);
                        //this.bot.chat(`/tp ${strafe.x} ${strafe.y} ${strafe.z}`)
                        const velocity = this.bot.pupa_utils.getJumpVelocity(source, strafe);
                        ui.log(`
{green-fg}[pupa_utils]{/} getJumpVelocity: ${velocity} 
{green-fg}[pupa_utils]{/} Source: ${source}
{green-fg}[pupa_utils]{/} Target: ${target}`);

                        //this.bot.entity.velocity.set(1,0.42,1);
                        this.bot.entity.velocity.set(...Object.values(velocity));

                        await this.bot.waitForTicks(20);
                        const newSource = this.bot.entity.position;

                        ui.log(`
{blue-fg}[pupa_utils]{/} Source    : ${source}
{blue-fg}[pupa_utils]{/} Strafe    : ${strafe}
{blue-fg}[pupa_utils]{/} New Source: ${newSource} 
{blue-fg}[pupa_utils]{/} distance < 1?: ${this.bot.entity.position.distanceTo(strafe) < 1} (${this.bot.entity.position.distanceTo(strafe)})
{blue-fg}[pupa_utils]{/} overshooting?: ${source.distanceTo(strafe) + 0.5 < source.distanceTo(newSource)}`);

                    } catch (error) {
                        ui.log(`
{red-fg}[pupa_utils]{/} getStrafePoint failed!
{red-fg}[pupa_utils]{/} Source: ${source}
{red-fg}[pupa_utils]{/} Target: ${target}`);
                    }
                    }
                    break;
                    case /^testd$/.test(data): {
                        this.bot.chat(`/tp 0 4 0`);

                        const source = this.bot.entity.position;
                        const target = this.bot.entity.position.offset(3, 0, 0);

                        const velocity = this.bot.pupa_utils.getJumpVelocity(source, target);
                        this.bot.entity.velocity.set(...Object.values(velocity));

                        ui.log(` 
{green-fg}[pupa_utils]{/} Target: ${target}
{green-fg}[pupa_utils]{/} Velocity: ${velocity}
{green-fg}[pupa_utils]{/} Jump displacement: ${source.distanceTo(this.bot.entity.position)}`);
                    } break;
                    case /^testf$/.test(data): {
                        if (this.combatMock) {
                            this.bot.removeListener('physicsTick', this.combatMock);
                            this.combatMock = null;
                            this.bot.pvp.forceStop();
                            ui.log(`{red-fg}[pupa_pvp]{/} Mock combat stopped`);
                            break;
                        }
                        ui.log(`{green-fg}[pupa_pvp]{/} Mock combat started`);

                        const target = this.bot.players['Patr10t'].entity;
                        this.bot.pvp.attack(target);

                        let oldSource = null;
                        let strafe = null;
                        let reset = false;
                        this.combatMock = async () => {
                            const newSource = this.bot.entity.position;
                            const target = this.bot.players['Patr10t'].entity.position;

                            if (this.bot.entity.onGround && newSource.distanceTo(target) <= 3.5) {
                                if (oldSource) ui.log(`
{blue-fg}[pupa_utils]{/} distance < 1?: ${newSource.distanceTo(strafe) < 1} (${newSource.distanceTo(strafe)})
{blue-fg}[pupa_utils]{/} overshooting?: ${oldSource.distanceTo(strafe) + 0.5 < oldSource.distanceTo(newSource)}`);

                                oldSource = newSource;
                                strafe = this.bot.pupa_utils.getStrafePoint(newSource, target);

                                const velocity = this.bot.pupa_utils.getJumpVelocity(newSource, strafe);
                                ui.log(`
{yellow-fg}[pupa_pvp]{/} Source  : ${newSource}       
{yellow-fg}[pupa_pvp]{/} Strafe  : ${strafe}
{yellow-fg}[pupa_pvp]{/} Displace: ${newSource.distanceTo(strafe)}
{yellow-fg}[pupa_pvp]{/} Velocity: ${velocity}`);

                                this.bot.entity.velocity.set(...Object.values(velocity));
                                await bot.waitForTicks(11);



                                reset = false;
                            }
                            if (strafe && !reset) {
                                const pointDistance = Math.sqrt((strafe.x - newSource.x) ** 2 + (strafe.z - newSource.z) ** 2);

                                const strOldDist = Math.sqrt((strafe.x - oldSource.x) ** 2 + (strafe.z - oldSource.z) ** 2);
                                const newOldDist = Math.sqrt((newSource.x - oldSource.x) ** 2 + (newSource.z - oldSource.z) ** 2);

                                if (pointDistance < 1 && strOldDist - newOldDist < 0) { // dist source -> point - source -> newsource < 0 and dist < 1 
                                    ui.log(`\r
{blue-fg}[pupa_pvp]{/} Strafe  : ${strafe}                          
{blue-fg}[pupa_pvp]{/} Distance to point     : ${pointDistance}
{blue-fg}[pupa_pvp]{/} Strafe to Old distance: ${strOldDist}
{blue-fg}[pupa_pvp]{/} New to Old distance   : ${newOldDist}
{blue-fg}[pupa_pvp]{/} Distance difference   : ${strOldDist - newOldDist < 0} (${strOldDist - newOldDist})`);
                                    this.bot.entity.velocity.set(0,this.bot.entity.velocity.y,0);
                                    reset = true;
                                }
                            }
                        };
                    
                        this.bot.on('physicsTick', this.combatMock);
                    }
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
                    this.bot.pupa_pvp.setMode(command[1]);
                    ui.log(`{green-fg}[pupa_pvp]{/} Mode changed to ${this.bot.pupa_pvp.mode}`);
                    break;
                /* ENABLE/DISABLE COMBAT */
                case /^s$/.test(data):
                    ui.log(`{green-fg}[pupa_pvp]{/} Pacifying bot...`);
                    bot.pupa_pvp.setMode(4);
                    break;
                /* ALLY ADD/REMOVE */
                case /^aa \S+$/.test(data): // rework,   rework
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
                    const player = this.bot.players[command[1]];

                    break;
                /* CHECK PLAYER */
                case /^pdb \S+$/.test(data): {
                    const player = this.bot.players[command[1]];
                    if (player) {
                        ui.log(`{green-fg}[pupa_commands]{/} NBT Data of player "${player.username}":`);
                        ui.log(util.inspect(player, true, null, true));
                    } else {
                        ui.log(`{red-fg}[pupa_commands]{/} NBT Data of player ${command[1]} not found`);
                    }
                }
                    break;
                /* CHECK ITEM IN SLOT nbt */
                case /^sdb \d+$/.test(data): {
                    const item = this.bot.inventory.slots[command[1]];
                    // find items + slot instead
                    if (item) {
                        ui.log(`{green-fg}[pupa_commands]{/} NBT Data of item "${item.displayName}":`);
                        ui.log(util.inspect(item, true, null, true));
                    } else {
                        ui.log(`{red-fg}[pupa_commands]{/} NBT Data of item ${command[1]} not found`);
                    }
                }
                    break;
                /* LIST ELEMENTS */
                case /^i$/.test(data):


                    getItems();
                    break;
                case /^p$/.test(data): {
                    const players = this.bot.players 

                    
                    }
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