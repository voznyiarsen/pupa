const ui = require('./tui')();

const nbt = require('prismarine-nbt');
const Item = require('prismarine-item')('1.12.2');

module.exports = function attach(bot) {
    class pupa_inventory {
        constructor(bot) {
            this.bot = bot;
        }

        async restoreInventory(slot = 0) {         
            const data = require(`./recording-${slot}.json`);
            
            for (const object of data) {
                while (this.bot.player.gamemode != 1) {
                    this.bot.chat('/gamemode 1');
                    await this.bot.waitForTicks(2);
                }
                try {
                    const item = new Item(object.type, object.count, object.metadata, object.nbt);
                    await this.bot.creative.setInventorySlot(object.slot, item);
                    await this.bot.waitForTicks(2);
                    ui.log(`{green-fg}[pupa_inventory]{/} Set slot ${object.slot} with ${object.type}`);
                } catch (error) {
                    ui.log(`{red-fg}[pupa_inventory]{/} Error setting slot ${object.slot}: ${error}`);
                }
            }
            
            ui.log(`{blue-fg}[pupa_inventory]{/} Processed ${data.length} items (slot ${slot})`);

            while (this.bot.player.gamemode != 0) {
                this.bot.chat('/gamemode 0');
                await this.bot.waitForTicks(2);
            }
        }

        async unequipAllItems() {
            const destinations = ['head', 'torso', 'legs', 'feet', 'off-hand'];
            for (const destination of destinations) {
                const slot = this.bot.getEquipmentDestSlot(destination);
                if (this.bot.inventory.slots[slot] !== null) {
                    await this.bot.waitForTicks(2);
                    await this.bot.unequip(destination);
                }
            }
        }

        async tossAllItems() {
            const items = this.bot.inventory.items();
            for (const item of items) {
                await this.bot.waitForTicks(2);
                await this.bot.toss(item.type, item.metadata, item.count);
            }
        }

        async equipArmor() {
            const materialStats = {
                leather: { helmet: { defense: 1, toughness: 0 }, chestplate: { defense: 3, toughness: 0 }, leggings: { defense: 2, toughness: 0 }, boots: { defense: 1, toughness: 0 } },
                gold: { helmet: { defense: 2, toughness: 0 }, chestplate: { defense: 5, toughness: 0 }, leggings: { defense: 3, toughness: 0 }, boots: { defense: 1, toughness: 0 } },
                chainmail: { helmet: { defense: 2, toughness: 0 }, chestplate: { defense: 5, toughness: 0 }, leggings: { defense: 4, toughness: 0 }, boots: { defense: 1, toughness: 0 } },
                iron: { helmet: { defense: 2, toughness: 0 }, chestplate: { defense: 6, toughness: 0 }, leggings: { defense: 5, toughness: 0 }, boots: { defense: 2, toughness: 0 } },
                diamond: { helmet: { defense: 3, toughness: 2 }, chestplate: { defense: 8, toughness: 2 }, leggings: { defense: 6, toughness: 2 }, boots: { defense: 3, toughness: 2 } },
                netherite: { helmet: { defense: 3, toughness: 3 }, chestplate: { defense: 8, toughness: 3 }, leggings: { defense: 6, toughness: 3 }, boots: { defense: 3, toughness: 3 } }
            };
        
            const slotMap = { head: 'helmet', torso: 'chestplate', legs: 'leggings', feet: 'boots' };
        
            const allArmorItems = this.bot.inventory.items().filter(item => 
                item.name.endsWith('_helmet') || item.name.endsWith('_chestplate') || 
                item.name.endsWith('_leggings') || item.name.endsWith('_boots')
            );
        
            const armorBySlot = { head: [], torso: [], legs: [], feet: [] };
        
            for (const item of allArmorItems) {
                const slot = Object.keys(slotMap).find(key => item.name.endsWith(`_${slotMap[key]}`));
                if (slot) armorBySlot[slot].push(item);
            }
        
            for (const [slot, items] of Object.entries(armorBySlot)) {
                if (items.length === 0) continue;

                const bestItem = items.reduce((best, item) => {
                    const bestScore = this._computeArmorScore(best, materialStats, slotMap[slot]);
                    const itemScore = this._computeArmorScore(item, materialStats, slotMap[slot]);
                    return itemScore > bestScore ? item : best;
                });
            
                const equipSlot = this.bot.getEquipmentDestSlot(slot);
                const currentArmor = this.bot.inventory.slots[equipSlot];
            
                const bestScore = this._computeArmorScore(bestItem, materialStats, slotMap[slot]);
                const currentScore = currentArmor ? this._computeArmorScore(currentArmor, materialStats, slotMap[slot]) : -1;
            
                if (bestScore > currentScore) {
                    ui.log(`{green-fg}[pupa_inventory]{/} Equipping ${bestItem.displayName} to ${slot} (score: ${bestScore})...`);
                    await this.bot.equip(bestItem, slot);
                    await this.bot.waitForTicks(2);
                }
            }
        }

        _computeArmorScore(item, materialStats, slotName) {
            if (!item?.name) return -1;
            
            const material = item.name.replace(/_(helmet|chestplate|leggings|boots)$/, '');
            const stats = materialStats[material]?.[slotName];
            
            if (!stats) return 0;
            
            let protectionLVL = 0;
            let otherEnchantWeight = 0;

            if (item.enchants && Array.isArray(item.enchants)) {
                const protection = item.enchants.find(e => e.name === 'protection');
                protectionLVL = protection ? (protection.lvl || 0) : 0;

                const nonProtection = item.enchants.filter(e => e.name !== 'protection');
                const bindingCurse = nonProtection.some(e => e.name === 'binding_curse');

                const usefulEnchants = nonProtection.filter(e => e.name !== 'binding_curse');
                otherEnchantWeight =  usefulEnchants.length * 0.1;

                if (bindingCurse) otherEnchantWeight -= 1;
            } 
            return stats.defense + stats.toughness + protectionLVL + otherEnchantWeight;
        }

        async equipGapple() {
            const inventory = [
              ...this.bot.inventory.items(),
              ...Object.values(this.bot.entity.equipment).filter(item => item != null)
            ];

            const gapples = inventory.filter(item => item.name === 'golden_apple');
            const gapple = gapples.find(item => item.metadata === 1) || 
                           gapples.find(item => item.metadata === 0);

            if (!gapple) return;

            const slot = this.bot.getEquipmentDestSlot('off-hand');
            const currentOffHand = this.bot.inventory.slots[slot];

            if (!currentOffHand || currentOffHand.type !== gapple.type || currentOffHand.metadata !== gapple.metadata) {
                ui.log(`{blue-fg}[pupa_inventory]{/} Equipping ${gapple.displayName} (metadata: ${gapple.metadata}) to off-hand...`);
                await this.bot.equip(gapple, 'off-hand');
                //await this.bot.waitForTicks(2);
            }
        
            const timeout = 2000;
            const startTime = performance.now();
            ui.log(`{blue-fg}[pupa_inventory]{/} Using ${gapple.displayName} (metadata: ${gapple.metadata})...`);
            this.bot.activateItem(true);
        
            while (!this.bot.entity.effects['10']) {
                if (performance.now() - startTime > timeout) {
                    ui.log(`{red-fg}[pupa_inventory]{/} Timeout reached while using ${gapple.displayName} (metadata: ${gapple.metadata})`);
                    this.bot.deactivateItem();
                    return;
                }
                await this.bot.waitForTicks(2);
            }
        
            ui.log(`{green-fg}[pupa_inventory]{/} ${gapple.displayName} used successfully`);
            this.bot.deactivateItem();
        }

        async equipFood() {
            const foods = this.bot.registry.foods;
            const inventory = [
                ...this.bot.inventory.items(),
                ...Object.values(this.bot.entity.equipment).filter(item => item != null)
            ];
        
            const foodItems = inventory.filter(item => foods[item.type] !== undefined);
        
            if (foodItems.length === 0) return;
        
            const bestFood = foodItems.reduce((best, current) =>
                foods[current.type].foodPoints > foods[best.type].foodPoints ? current : best
            );
        
            const slot = this.bot.getEquipmentDestSlot('off-hand');//
            const offHand = this.bot.inventory.slots[slot];
        
            if (!offHand || offHand.type !== bestFood.type || offHand.metadata !== bestFood.metadata) {
                ui.log(`{blue-fg}[pupa_inventory]{/} Equipping ${bestFood.displayName} to off-hand...`);
                await this.bot.equip(bestFood, 'off-hand');
            }
        
            ui.log(`{blue-fg}[pupa_inventory]{/} Using ${bestFood.displayName}...`);
            this.bot.activateItem(true);
        
            const timeout = 2000;
            const startTime = Date.now();
            const startCount = this.bot.inventory.slots[slot].count
        
            ui.log(this.bot.food,'then');
            while (this.bot.inventory.slots[slot].count >= startCount) {
                if (Date.now() - startTime > timeout) {
                    ui.log(`{red-fg}[pupa_inventory]{/} Timeout reached while using ${bestFood.displayName}`);
                    this.bot.deactivateItem();
                    return;
                }
                await this.bot.waitForTicks(2);
            }
        
            ui.log(`{green-fg}[pupa_inventory]{/} ${bestFood.displayName} used successfully.`);
            ui.log(this.bot.food,'now');
            this.bot.deactivateItem();
        }

        async equipBuff() {
            const buff = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.potion.id, null);
            if (!buff || nbt.simplify(buff.nbt).Potion != 'minecraft:strong_strength') return;

            while (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== buff.type) {
                ui.log(`{blue-fg}[pupa_inventory]{/} Equipping ${buff.displayName} to off-hand...`);
                await this.bot.equip(buff, 'off-hand');
                await this.bot.waitForTicks(2);
            }

            const timeout = 2000;
            const startTime = performance.now();

            ui.log(`{blue-fg}[pupa_inventory]{/} Using ${buff.displayName}...`);
            this.bot.activateItem(true);

            while (!this.bot.entity.effects['5']) {
                if (performance.now() - startTime > timeout) {
                    ui.log(`{red-fg}[pupa_inventory]{/} Timeout reached while using ${buff.displayName}`);
                    this.bot.deactivateItem();
                    return;
                }
                await this.bot.waitForTicks(2); 
            }

            ui.log(`{green-fg}[pupa_inventory]{/} ${buff.displayName} used successfully`);
            this.bot.deactivateItem();
        }

        async equipTotem() {
            const totem = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.totem_of_undying.id, null);
            if (!totem) return;
            while (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== totem.type) {
                ui.log(`{green-fg}[pupa_inventory]{/} Equipping ${totem.displayName} to off-hand...`);
                await this.bot.equip(totem, 'off-hand');
                await this.bot.waitForTicks(2);
            }
        }

        async equipPearl() {
            const pearl = this.bot.inventory.findInventoryItem(bot.registry.itemsByName.ender_pearl.id, null);
            if (!pearl) return;
            while (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== pearl.type) {
                ui.log(`{blue-fg}[pupa_inventory]{/} Equipping ${pearl.displayName} to off-hand...`);
                await this.bot.equip(pearl, 'off-hand');
                await this.bot.waitForTicks(2);
            }

            this.bot.activateItem(true);
            
            await this.bot.waitForTicks(1);

            ui.log(`{green-fg}[pupa_inventory]{/} ${pearl.displayName} tossed successfully`);
            this.bot.deactivateItem();
        }
            
        async equipWeapon() { // add axe support, (other tools?)
            const materialStats = {
                wooden_sword: { damage: 4 },
                stone_sword: { damage: 5 },
                gold_sword: { damage: 4 },
                iron_sword: { damage: 6 },
                diamond_sword: { damage: 7 },
                netherite_sword: { damage: 8 }
            };
        
            const swords = this.bot.inventory.items().filter(item => item.name.endsWith('_sword'));
            if (swords.length === 0) return;

            const sword = swords.reduce((best, sword) => {
                const score = this._computeSwordScore(sword, materialStats);
                return !best || score > this._computeSwordScore(best, materialStats) ? sword : best;
            }, null);
        
            const held = this.bot.heldItem;
            if (held?.type === sword.type && held.metadata === sword.metadata && held.nbt === sword.nbt) return;
        
            const currentScore = held ? this._computeSwordScore(held, materialStats) : -1;
            if (this._computeSwordScore(sword, materialStats) <= currentScore) return;

            if (this.bot.heldItem?.type !== sword.type || this.bot.heldItem.metadata !== sword.metadata || this.bot.heldItem.nbt !== sword.nbt) {
                ui.log(`{green-fg}[pupa_inventory]{/} Equipping ${sword.displayName} (score: ${this._computeSwordScore(sword, materialStats)}) to hand...`);
                await this.bot.equip(sword, 'hand');
                await this.bot.waitForTicks(2);  // try catch this
            }
        }

        _computeSwordScore(item, materialStats) {
            if (!item?.name) return -1;
        
            const stats = materialStats[item.name];
            if (!stats) return 0;
        
            let sharpnessLVL = 0;
            let enchantWeight = 0;
        
            if (item.enchants && Array.isArray(item.enchants)) {
                const sharpness = item.enchants.find(e => e.name === 'sharpness');
                sharpnessLVL = sharpness ? (sharpness.lvl || 0) : 0;
            
                const nonSharpness = item.enchants.filter(e => e.name !== 'sharpness');
                const vanishing = nonSharpness.some(e => e.name === 'vanishing_curse');
            
                const usefulEnchants = nonSharpness.filter(e => e.name !== 'vanishing_curse');
                enchantWeight = usefulEnchants.length * 0.1;
            
                if (vanishing) enchantWeight -= 0.1;
            }
            return stats.damage + (sharpnessLVL * 1.25) + enchantWeight;
        }

        async equipUtility() {
            const items = this.bot.inventory.items();
            const gapples = items.filter(item => item.name === 'golden_apple');

            const gapple = gapples.find(item => item.metadata === 1) ||
                           gapples.find(item => item.metadata === 0);

            if (!gapple) return;

            const slot = this.bot.getEquipmentDestSlot('off-hand');
            const offHand = this.bot.inventory.slots[slot];

            if (!offHand || offHand.type !== gapple.type && offHand.metadata !== gapple.metadata) {
                ui.log(offHand)
                ui.log(`{green-fg}[pupa_inventory]{/} Equipping ${gapple.displayName} to off-hand...`);
                await this.bot.equip(gapple, 'off-hand');
                await this.bot.waitForTicks(2);
            }
        }
    }

    bot.pupa_inventory = new pupa_inventory(bot)
    return bot;
}