const ui = require('./tui')();

const nbt = require('prismarine-nbt');
const Item = require('prismarine-item')('1.12.2');

module.exports = function attach(bot) {
    class pupa_inventory {
        constructor(bot) {
            this.bot = bot;
            this.banner = { good: `{green-fg}[inventory]{/}`, bad: `{red-fg}[inventory]{/}` };
        }

        async clearInventory() {
            await this.setGamemode(1);
            try {
                await this.bot.creative.clearInventory();
                ui.log(`${this.banner.good} Inventory cleared`);
            } catch (error) {
                ui.log(`${this.banner.bad} Failed to clear inventory: ${error}`);
            }
            await this.setGamemode(0);
        }
        
        async recordInventory(slot = 0) {
            const fs = require('node:fs');
            const array = this.bot.inventory.slots.filter(item => item?.type);
            const data = array.map(({ type, count, metadata, nbt, name, displayName, slot }) => 
                ({ type, count, metadata, nbt, name, displayName, slot })
            );
            const filename = `./recording-${slot}.json`;
            fs.writeFile(filename, JSON.stringify(data, null, 2), (error) =>
                error ? ui.log(`${this.banner.bad} Failed to record inventory: ${error}`) : 
                       ui.log(`${this.banner.good} ${data.length} items recorded into slot ${slot}`)
            );
        }
        
        async restoreInventory(slot = 0) {
            const data = require(`./recording-${slot}.json`);
            await this.setGamemode(1);
            
            for (const item of data) {
                try {
                    const newItem = new Item(item.type, item.count, item.metadata, item.nbt);
                    await this.bot.creative.setInventorySlot(item.slot, newItem);
                    await this.bot.waitForTicks(2);
                    ui.log(`${this.banner.good} Slot ${item.slot} (item: ${item.displayName})`);
                } catch (error) {
                    ui.log(`${this.banner.bad} Failed to set slot ${item.slot}: ${error}`);
                }
            }
            
            ui.log(`${this.banner.good} Processed ${data.length} items (slot ${slot})`);
            await this.setGamemode(0);
        }
        
        async setGamemode(mode, timeout = 1000) {
            const t0 = Date.now();
            while (this.bot.player.gamemode !== mode) {
                if (Date.now() - t0 > timeout) {
                    ui.log(`${this.banner.bad} Timeout reached while setting gamemode to ${mode}`);
                    return;
                }
                ui.log(`${this.banner.good} Current gamemode: ${this.bot.player.gamemode}, setting to ${mode}`);
                await this.bot.chat(`/gamemode ${mode}`);
                await this.bot.waitForTicks(2);
            }
        }

        async unequipAllItems() {
            const destinations = ['head', 'torso', 'legs', 'feet', 'off-hand'];  // bot.entity.equipment list?
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
                    ui.log(`${this.banner.good} Equipping ${bestItem.displayName} to ${slot} (score: ${bestScore})...`);
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

            const timeout = 2000;
            let t0 = Date.now();

            while (this.bot.inventory.slots[slot]?.type !== gapple.type || this.bot.inventory.slots[slot].metadata !== gapple.metadata) {
                if (Date.now() - t0 > timeout) {
                    ui.log(`${this.banner.bad} Timeout reached while equipping ${gapple.displayName} (#${gapple.type}/${gapple.metadata})`)
                    return;
                }
                ui.log(`${this.banner.good} Equipping ${gapple.displayName} (#${gapple.type}/${gapple.metadata}) to off-hand...`);
                await this.bot.equip(gapple, 'off-hand');
                await this.bot.waitForTicks(2);
            }
        
            ui.log(`${this.banner.good} Using ${gapple.displayName} (#${gapple.type}/${gapple.metadata})...`);
            this.bot.activateItem(true);
        
            t0 = Date.now();
            while (!this.bot.entity.effects['10']) {
                if (Date.now() - t0 > timeout) {
                    ui.log(`${this.banner.bad} Timeout reached while using ${gapple.displayName} (#${gapple.type}/${gapple.metadata})`);
                    this.bot.deactivateItem();
                    return;
                }
                await this.bot.waitForTicks(2);
            }
        
            ui.log(`${this.banner.good} Used ${gapple.displayName} (#${gapple.type}/${gapple.metadata}) successfully`);
            this.bot.deactivateItem();
        }

        async equipFood() {
            const foods = this.bot.registry.foods;
            const inventory = [
                ...this.bot.inventory.items(),
                ...Object.values(this.bot.entity.equipment).filter(item => item != null)
            ];
        
            const items = inventory.filter(item => foods[item.type] !== undefined);
            if (items.length === 0) return;
        
            const food = items.reduce((best, current) => foods[current.type].foodPoints > foods[best.type].foodPoints ? current : best);
            if (!food) return;

            const slot = this.bot.getEquipmentDestSlot('off-hand');
        
            const timeout = 2000;
            let t0 = Date.now();
    
            while (this.bot.inventory.slots[slot]?.type !== food.type || this.bot.inventory.slots[slot].metadata !== food.metadata) {
                if (Date.now() - t0 > timeout) {
                    ui.log(`${this.banner.bad} Timeout reached while equipping ${food.displayName} (#${food.type}/${food.metadata})`)
                    return;
                }
                ui.log(`${this.banner.good} Equipping ${food.displayName} (#${food.type}/${food.metadata}) to off-hand...`);
                await this.bot.equip(food, 'off-hand');
                await this.bot.waitForTicks(2);
            }
        
            const expectedHunger = this.bot.food + foods[food.type].foodPoints;

            ui.log(`${this.banner.good} Using ${food.displayName} #${food.type}/${food.metadata})...`);
            this.bot.activateItem(true);

            t0 = Date.now();
            while (this.bot.food < expectedHunger && this.bot.food < 20) {
                if (Date.now() - t0 > timeout) {
                    ui.log(`${this.banner.bad} Timeout reached while using ${food.displayName} (#${food.type}/${food.metadata})`);
                    this.bot.deactivateItem();
                    return;
                }
                await this.bot.waitForTicks(2);
            }
        
            ui.log(`${this.banner.good} Used ${food.displayName} (#${food.type}/${food.metadata}) successfully`);
            this.bot.deactivateItem();
        }

        async equipBuff() {
            const inventory = [
              ...this.bot.inventory.items(),
              ...Object.values(this.bot.entity.equipment).filter(item => item != null)
            ];

            const potions = inventory.filter(item => item.name === 'potion');
            const potion = potions.find(item => nbt.simplify(item.nbt).Potion === 'minecraft:strong_strength') || 
                           potions.find(item => nbt.simplify(item.nbt).Potion === 'minecraft:strength');

            if (!potion) return;

            const slot = this.bot.getEquipmentDestSlot('off-hand');

            const timeout = 2000;
            let t0 = Date.now();

            while (this.bot.inventory.slots[slot]?.type !== potion.type) {
                if (Date.now() - t0 > timeout) {
                    ui.log(`${this.banner.bad} Timeout reached while equipping ${potion.displayName} (#${potion.type}/${potion.metadata})`)
                    return;
                }
                ui.log(`${this.banner.good} Equipping ${potion.displayName} (#${potion.type}/${potion.metadata}) to off-hand...`);
                await this.bot.equip(potion, 'off-hand');
                await this.bot.waitForTicks(2);
            }

            ui.log(`${this.banner.good} Using ${potion.displayName} (#${potion.type}/${potion.metadata})...`);
            this.bot.activateItem(true);

            t0 = Date.now();
            while (!this.bot.entity.effects['5']) {
                if (Date.now() - t0 > timeout) {
                    ui.log(`${this.banner.bad} Timeout reached while using ${potion.displayName} (#${potion.type}/${potion.metadata})`);
                    this.bot.deactivateItem();
                    return;
                }
                await this.bot.waitForTicks(2); 
            }

            ui.log(`${this.banner.good} Used ${potion.displayName} (#${potion.type}/${potion.metadata}) successfully`);
            this.bot.deactivateItem();
        }

        async equipTotem() {
            const totem = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.totem_of_undying.id, null);

            if (!totem) return;

            const timeout = 1000;
            const t0 = Date.now();

            while (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== totem.type) {
                if (Date.now - t0 > timeout) {
                    ui.log(`${this.banner.bad} Timeout reached while equipping ${totem.displayName} (#${totem.type}/${totem.metadata})`)
                    return;
                }
                ui.log(`${this.banner.good} Equipping ${totem.displayName} (#${totem.type}/${totem.metadata}) to off-hand...`);
                await this.bot.equip(totem, 'off-hand');
                await this.bot.waitForTicks(2);
            }
        }

        async equipPearl() {
            const inventory = [
              ...this.bot.inventory.items(),
              ...Object.values(this.bot.entity.equipment).filter(item => item != null)
            ];

            const pearl = inventory.find(item => item.name === 'ender_pearl');

            if (!pearl) return;

            const slot = this.bot.getEquipmentDestSlot('off-hand');

            const timeout = 1000;
            const t0 = Date.now();

            while (this.bot.inventory.slots[slot]?.type !== pearl.type) {
                if (Date.now() - t0 > timeout) {
                    ui.log(`${this.banner.bad} Timeout reached while equipping ${pearl.displayName} (#${pearl.type}/${pearl.metadata})`)
                    return;
                }
                ui.log(`${this.banner.good} Equipping ${pearl.displayName} to off-hand...`);
                await this.bot.equip(pearl, 'off-hand');
                await this.bot.waitForTicks(2);
            }

            this.bot.activateItem(true);
            
            await this.bot.waitForTicks(1);

            ui.log(`${this.banner.good} Tossed ${pearl.displayName} successfully`);
            this.bot.deactivateItem();
        }
            
        async equipWeapon() {
            const materialStats = {
                wooden_sword: { damage: 4, speed: 1.6 },
                stone_sword: { damage: 5, speed: 1.6 },
                gold_sword: { damage: 4, speed: 1.6 },
                iron_sword: { damage: 6, speed: 1.6 },
                diamond_sword: { damage: 7, speed: 1.6 },
                netherite_sword: { damage: 8, speed: 1.6 },
            
                wooden_axe: { damage: 7, speed: 0.8 },
                stone_axe: { damage: 9, speed: 0.8 },
                gold_axe: { damage: 7, speed: 1.0 },
                iron_axe: { damage: 9, speed: 0.9 },
                diamond_axe: { damage: 9, speed: 1.0 },
                netherite_axe: { damage: 10, speed: 1.0 },
            
                wooden_pickaxe: { damage: 2, speed: 1.2 },
                stone_pickaxe: { damage: 3, speed: 1.2 },
                gold_pickaxe: { damage: 2, speed: 1.2 },
                iron_pickaxe: { damage: 4, speed: 1.2 },
                diamond_pickaxe: { damage: 5, speed: 1.2 },
                netherite_pickaxe: { damage: 6, speed: 1.2 },
            
                wooden_shovel: { damage: 2.5, speed: 1.0 },
                stone_shovel: { damage: 3.5, speed: 1.0 },
                gold_shovel: { damage: 2.5, speed: 1.0 },
                iron_shovel: { damage: 4.5, speed: 1.0 },
                diamond_shovel: { damage: 5.5, speed: 1.0 },
                netherite_shovel: { damage: 6.5, speed: 1.0 },
            
                wooden_hoe: { damage: 1, speed: 1.0 },
                stone_hoe: { damage: 1, speed: 2.0 },
                gold_hoe: { damage: 1, speed: 1.0 },
                iron_hoe: { damage: 1, speed: 3.0 },
                diamond_hoe: { damage: 1, speed: 4.0 },
                netherite_hoe: { damage: 1, speed: 6.0 }
            };
        
            const weapons = this.bot.inventory.items().filter(item => 
                item.name.endsWith('_sword') || 
                item.name.endsWith('_axe') || 
                item.name.endsWith('_pickaxe') || 
                item.name.endsWith('_shovel') || 
                item.name.endsWith('_hoe')
            );

            if (weapons.length === 0) return;
        
            const weapon = weapons.reduce((best, item) => {
                const score = this._computeWeaponScore(item, materialStats);
                return !best || score > this._computeWeaponScore(best, materialStats) ? item : best;
            }, null);
        
            const held = this.bot.heldItem;
            if (held?.type === weapon.type && held.metadata === weapon.metadata && held.nbt === weapon.nbt) return;
        
            const currentScore = held ? this._computeWeaponScore(held, materialStats) : -1;
            if (this._computeWeaponScore(weapon, materialStats) <= currentScore) return;
        
            if (this.bot.heldItem?.type !== weapon.type || this.bot.heldItem.metadata !== weapon.metadata || this.bot.heldItem.nbt !== weapon.nbt) {
                ui.log(`${this.banner.good} Equipping ${weapon.displayName} (#${weapon.type}) (DPS: ${this._computeWeaponScore(weapon, materialStats).toFixed(2)}) to hand...`);
                await this.bot.equip(weapon, 'hand');
                await this.bot.waitForTicks(2);
            }
        }

        _computeWeaponScore(item, materialStats) {
            if (!item?.name) return -1;
        
            const stats = materialStats[item.name];
            if (!stats) return 0;
        
            const baseDPS = stats.damage * stats.speed;
        
            let sharpnessBonus = 0;
            if (item.enchants && Array.isArray(item.enchants)) {
                const sharpness = item.enchants.find(e => e.name === 'sharpness');
                if (sharpness) {
                    sharpnessBonus = (sharpness.lvl || 0) * 1.25 * stats.speed;
                }
            }
        
            return baseDPS + sharpnessBonus;
        }

        async equipUtility() {
            const items = this.bot.inventory.items();
            const gapples = items.filter(item => item.name === 'golden_apple');

            const gapple = gapples.find(item => item.metadata === 1) ||
                           gapples.find(item => item.metadata === 0);

            if (!gapple) return;

            const slot = this.bot.getEquipmentDestSlot('off-hand');
            const offHand = this.bot.inventory.slots[slot];

            if (!offHand || offHand.type === gapple.type && offHand.metadata !== gapple.metadata) {//|| offHand.type !== gapple.type && offHand.metadata !== gapple.metadata) {
                ui.log(`${this.banner.good} Equipping utility ${gapple.displayName} (#${gapple.type}/${gapple.metadata}) to off-hand...`);
                await this.bot.equip(gapple, 'off-hand');
                await this.bot.waitForTicks(2);
            }
        }
    }

    bot.pupa_inventory = new pupa_inventory(bot)
    return bot;
}