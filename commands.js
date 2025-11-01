const ui = require('./tui')();

const util = require('node:util');

module.exports = function attach(bot) {
    class pupa_commands {
        constructor(bot) {
            this.bot = bot;
            this.autosend = false;
            this.banner = { good: `{green-fg}[commands]{/}`, bad: `{red-fg}[commands]{/}` };
        }
        
        async query(data) { 
            const command = data.split(' ');
            switch(true) {
                case /^as$/.test(data):
                    this.autosend = !this.autosend;
                    ui.log(`${this.autosend ? `${this.banner.good} Autosending enabled` : `${this.banner.bad} Autosending disabled`}`);
                break;
                /* TOSS ITEMS */
                case /^ts [\d\w_]+\s?\d*$/.test(data): // ITEM | COUNT
                    if (command.length === 3) {
                        const item = this.bot.registry.items[parseInt(command[1])] || this.bot.registry.itemsByName[command[1]];
                        const count = parseInt(command[2]);

                        await this.bot.toss(item.id, null, count)
                                      .then(() => ui.log(`${this.banner.good} Tossed ${item.displayName} x${count}`))
                                      .catch(error => ui.log(`${this.banner.bad} Failed to toss ${item.displayName}: ${error}`));
                    } else {
                        const item = this.bot.registry.items[parseInt(command[1])] || this.bot.registry.itemsByName[command[1]];

                        await this.bot.toss(item.id)
                                      .then(() => ui.log(`${this.banner.good} Tossed ${item.displayName} x1`))
                                      .catch(error => ui.log(`${this.banner.bad} Failed to toss ${item.displayName}: ${error}`));
                    }
                break;
                case /^tsall$/.test(data): {
                    const count = this.bot.inventory.slots.filter(Boolean).length;
                    this.bot.pupa_inventory.tossAllItems()
                                           .then(() => ui.log(`${this.banner.good} Tossed ${count} ${count === 1 ? 'item' : 'items'}`))
                                           .catch(error => ui.log(`${this.banner.bad} Failed to toss ${count} ${count === 1 ? 'item' : 'items'}: ${error}`));
                } break;
                /* EQUIP ITEMS */
                case /^eq [\d\w_]+ [\w-]+$/.test(data): { // ITEM | DESTINATION
                    const destination = command[2];
                    const slot = this.bot.getEquipmentDestSlot(destination);
                    const item = this.bot.registry.items[parseInt(command[1])] || this.bot.registry.itemsByName[command[1]];

                    this.bot.equip(parseInt(item.id), destination)
                            .then(() => ui.log(`${this.banner.good} Eqipped ${item.displayName} to ${destination} (${slot})`))
                            .catch(error => ui.log(`${this.banner.bad} Failed to equip ${item.displayName} to ${destination} (${slot}): ${error}`));
                } break;
                /* UNEQUIP ITEMS */
                case /^uneq [\w-]+$/.test(data): {
                    const destination = command[1];
                    const slot = this.bot.getEquipmentDestSlot(destination);
                    const item = this.bot.inventory.slots[slot];

                    this.bot.unequip(destination)
                            .then(() => ui.log(`${this.banner.good} Unequipped ${item.displayName} from ${destination} (${slot})`))
                            .catch(error => ui.log(`${this.banner.bad} Failed to unequip ${item.displayName} from ${destination} (${slot}): ${error}`));
                } break;
                case /^uneqall$/.test(data): {
                    const count = this.bot.entity.equipment.filter(Boolean).length;
                    this.bot.pupa_inventory.unequipAllItems()
                                           .then(() => ui.log(`${this.banner.good} Unequipped ${count} ${count === 1 ? 'item' : 'items'}`))
                                           .catch(error => ui.log(`${this.banner.bad} Failed to unequip ${count} ${count === 1 ? 'item' : 'items'}: ${error}`));
                } break;
                case /^v(er(sion)?)?$/.test(data):
                    ui.log(this.bot.version);
                break
                case /^res(tore)?\s?[\d\w-_]*$/.test(data): {
                    const slot = command[1] ? command[1] : 0;
                    await this.bot.pupa_inventory.restoreInventory(slot);
                } break;
                case /^rec(ord)?\s?[\d\w-_]*$/.test(data): {
                    const slot = command[1] ? command[1] : 0;
                    await this.bot.pupa_inventory.recordInventory(slot);
                } break;
                case /^clear$/.test(data):
                    await this.bot.pupa_inventory.clearInventory();
                break;   
                case /^com(bat)?$/.test(data): {
                    const listener = this.bot.pupa_pvp.doDecide;
                    if (this.bot.listenerCount('physicsTick', listener) > 0) {
                        ui.log(`${this.banner.bad} Combat disabled`);
                        this.bot.off('physicsTick', listener);
                        this.bot.pvp.stop();
                    } else {
                        ui.log(`${this.banner.good} Combat enabled`);
                        this.bot.on('physicsTick', listener);
                    }
                } break;             
                case /^t1$/.test(data): {
                    const source = this.bot.entity.position;
                    const target = this.bot.players['Patr10t'].entity.position;

                    const offset = bot.pupa_utils.getPOffset(source, target);

                    ui.log(`[test] Sending pearl from ${source} to ${target} Offset: ${offset}b`);
                    this.bot.lookAt(target.offset(0, offset, 0), true);
                    this.bot.pupa_inventory.equipPearl();
                } break;
                case /^t2$/.test(data): {
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
                } break;
                case /^t3$/.test(data): {
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
                } break;
                case /^t4$/.test(data): {
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
                } break;
                case /^t5$/.test(data): {
                        // round up this.bot.entity.position and vel to it
                        const source = this.bot.entity.position;
                        const target = this.bot.entity.position.offset(3, 0, 0);

                        const velocity = this.bot.pupa_utils.getJumpVelocity(source, target);
                        if (velocity) this.bot.entity.velocity.set(...Object.values(velocity));

                        ui.log(` 
{green-fg}[pupa_utils]{/} Target: ${target}
{green-fg}[pupa_utils]{/} Velocity: ${velocity}
{green-fg}[pupa_utils]{/} Jump displacement: ${source.distanceTo(this.bot.entity.position)}`);
                } break;
                case /^t6$/.test(data): {
                        const fs = require('fs');

                        const items = [
                            this.bot.registry.itemsByName.diamond_helmet.id,
                            this.bot.registry.itemsByName.diamond_chestplate.id,
                            this.bot.registry.itemsByName.diamond_leggings.id,
                            this.bot.registry.itemsByName.diamond_boots.id
                        ];

                        const itemData = items.map(id => this.bot.inventory.findInventoryItem(id, null));


                        // Single console output
                        itemData.forEach((item, index) => {
                            ui.log(util.inspect(item.enchants, true, null, true));
                            fs.appendFile('example.txt', util.inspect(item.enchants, true, null, false) + '\n', (err) => {
                                if (err) ui.log('Error writing to file:', err);
                                else ui.log('All enchants written successfully!');
                            });
                        });

                } break;
                case /^t7$/.test(data): {
                        const source = this.bot.entity.position;
                        const unwanted = this.bot.pupa_utils.isInUnwanted(source);
                        ui.log(`{blue-fg}[pupa_utils]{/} isInUnwanted: ${unwanted}`);
                        if (unwanted) {
                            const flat = this.bot.pupa_utils.getFlatVelocity(source, unwanted, 180, 0.1); 
                            ui.log(`{green-fg}[pupa_utils]{/} Applying vel: ${flat}`);
                            this.bot.entity.velocity.set(...Object.values(flat));
                        }
                } break;
                case /^t8$/.test(data): {
                    const source = this.bot.entity.position;
                    const target = this.bot.players['Patr10t'].entity.position;

                    const velocity = this.bot.pupa_utils.getFlatVelocity(source, target, 180, 0.6);
                    ui.log(`{green-fg}[pupa_utils]{/} getFlatVelocity: ${velocity}`);
                    if (velocity) this.bot.entity.velocity.set(...Object.values(velocity));
                } break;
                case /^t9$/.test(data): {
                    ui.log(util.inspect(this.bot.inventory.slots,true,null,true));
                    ui.log(this.bot.registry.items[this.bot.registry.itemsByName.golden_sword.id])
                } break;
                case /^t11$/.test(data): {
                    const foods = this.bot.registry.foods;

                    ui.log(foods)
                    ui.log(foods[436])
                } break;
                case /^t12$/.test(data): {
                    this.bot.pupa_inventory.equipFood();
                    
                } break;
                /* CHANGE MODE */
                case /^cm(\s[0-3])?$/.test(data):
                    this.bot.pupa_pvp.setMode(parseInt(command[1], 10));
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
                } break;
                /* LIST ELEMENTS */
                case /^i$/.test(data):

                break;
                case /^p$/.test(data): 
                
                break;    
                /* QUIT */
                case /^q$/.test(data):
                    this.bot.end();
                    process.exit(0);
                default:
                    ui.log(`${this.banner.bad} Command ${data} not found, ${this.autosend ? "sending as message..." : "not sending as a message"} `);
                    if (this.autosend) bot.chat(data);
            }
        }
    }
    bot.pupa_commands = new pupa_commands(bot)
    return bot;
}