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
                    await this.bot.waitForTicks(1);
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
        // add auto restore, creative
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
            const enchantScores = {
                mending: 0,
                unbreaking: 1,
                respiration: 1,
                aqua_affinity: 1,
                thorns: 1,
                protection: 1,
                projectile_protection: 1,
                fire_protection: 1,
                blast_protection: 1,
                feather_falling: 1,
                depth_strider: 1,
                frost_walker: -99,
                vanishing_curse: 0,
                binding_curse: 0
            };

            function calculateEnchantScore(enchants, scores) {
                return enchants.reduce((score, enchant) => {
                    const weight = scores[enchant.name] ?? 0;
                    return score + (weight * enchant.lvl);
                }, 0);
            }

            const enchantWeights = [
                'mending',
                'feather_falling',
                'unbreaking',
                'depth_strider',
                'thorns',
                'frost_walker',
                'protection',
                'projectile_protection',
                'fire_protection',
                'blast_protection',
                'vanishing_curse',
                'binding_curse',
                'respiration',
                'aqua_affinity'
            ]

            const armorPieces = [
                { destination: 'head', item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_helmet.id, null), enchantWeights: ['mending', 'unbreaking', 'respiration', 'aqua_affinity', 'thorns', 'protection', 'projectile_protection', 'fire_protection', 'blast_protection', 'vanishing_curse', 'binding_curse'] },
                { destination: 'torso', item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_chestplate.id, null), enchantWeights: ['mending', 'unbreaking', 'thorns', 'protection', 'projectile_protection', 'fire_protection', 'blast_protection', 'vanishing_curse', 'binding_curse'] },
                { destination: 'legs', item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_leggings.id, null), enchantWeights: ['mending', 'unbreaking', 'thorns', 'protection', 'projectile_protection', 'fire_protection', 'blast_protection', 'vanishing_curse', 'binding_curse'] },
                { destination: 'feet', item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_boots.id, null), enchantWeights: ['mending', 'feather_falling', 'unbreaking', 'depth_strider', 'thorns', 'frost_walker', 'protection', 'projectile_protection', 'fire_protection', 'blast_protection', 'vanishing_curse', 'binding_curse'] }
            ];

            for (const piece of armorPieces) {
                if (piece.item && piece.item?.nbt) {
                    const currentScore = calculateEnchantScore(piece.item.enchants, piece.enchantWeights, enchantScores);
                    const equipSlot = this.bot.getEquipmentDestSlot(piece.destination);
                    const currentArmor = this.bot.inventory.slots[equipSlot];
                    
                    //const futureScore = calculateEnchantScore(currentArmor.enchants, piece.enchantWeights, enchantScores);

                    if (!currentArmor || calculateEnchantScore(currentArmor.enchants, piece.enchantWeights, enchantScores) < currentScore) {
                        if (currentArmor) {
                            await this.bot.waitForTicks(5);
                            await this.bot.unequip(piece.destination);
                        }
                        
                        ui.log(`{green-fg}[pupa_inventory]{/} Equipping ${piece.item.displayName} to ${piece.destination} (Score: ${currentScore})...`);
                        await this.bot.equip(piece.item.type, piece.destination);
                    }
                }
            }
        }



        async equipGapple() {
            const gapple = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.golden_apple.id) || this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')];
            if (!gapple) return;
            while (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== gapple.type) {
                ui.log(`{blue-fg}[pupa_inventory]{/} Equipping ${gapple.displayName} to off-hand...`);
                await this.bot.equip(gapple.type, 'off-hand');
                await this.bot.waitForTicks(2);
            }

            const t1 = performance.now();
            ui.log(`{blue-fg}[pupa_inventory]{/} Using ${gapple.displayName}...`);
            this.bot.activateItem(true);

            while (!this.bot.entity.effects['10']) {
                if (performance.now() - t1 > 2000) {
                    ui.log(`{red-fg}[pupa_inventory]{/} Timeout reached for ${gapple.displayName}`);
                    this.bot.deactivateItem();
                    return;
                }
                await this.bot.waitForTicks(2);
            }
        
            ui.log(`{green-fg}[pupa_inventory]{/} ${gapple.displayName} used successfully`);
            this.bot.deactivateItem();
        }

        async equipBuff() {
            const buff = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.potion.id, null);
            if (!buff || nbt.simplify(buff.nbt).Potion != 'minecraft:strong_strength') return;
            while (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== buff.type) {
                ui.log(`{blue-fg}[pupa_inventory]{/} Equipping ${buff.displayName} to off-hand...`);
                await this.bot.equip(buff.type, 'off-hand');
                await this.bot.waitForTicks(2);
            }

            const t1 = performance.now();
            ui.log(`{blue-fg}[pupa_inventory]{/} Using ${buff.displayName}...`);
            this.bot.activateItem(true);

            while (!this.bot.entity.effects['5']) {
                if (performance.now() - t1 > 2000) {
                    ui.log(`{red-fg}[pupa_inventory]{/} Timeout reached for ${buff.displayName}`);
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
                await this.bot.equip(totem.type, 'off-hand');
                await this.bot.waitForTicks(2);
            }
        }

        async equipPearl() {
            const pearl = this.bot.inventory.findInventoryItem(bot.registry.itemsByName.ender_pearl.id, null);
            if (!pearl) return;
            while (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== pearl.type) {
                ui.log(`{blue-fg}[pupa_inventory]{/} Equipping ${pearl.displayName} to off-hand...`);
                await this.bot.equip(pearl.type, 'off-hand');
                await this.bot.waitForTicks(2);
            }

            this.bot.activateItem(true);
            
            await this.bot.waitForTicks(1);

            ui.log(`{green-fg}[pupa_inventory]{/} ${pearl.displayName} tossed successfully`);
            this.bot.deactivateItem();
        }

        async equipHand() {
            const sword = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_sword.id, null);
            if (!sword) return;
            while (this.bot.heldItem.type !== sword.type && sword.enchants.length >= 6) {
                ui.log(`{green-fg}[pupa_inventory]{/} Equipping ${sword.displayName} to hand...`);
                await this.bot.equip(sword.type, 'hand');
                await this.bot.waitForTicks(2);
            }
        }

        async equipOffHand() {
            const gapple = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.golden_apple.id, null);
            if (!gapple) return;
            while (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== gapple.type) {
                ui.log(`{green-fg}[pupa_inventory]{/} Equipping ${gapple.displayName} to off-hand...`);
                await this.bot.equip(gapple.type, 'off-hand');
                await this.bot.waitForTicks(2);
            }
        }

        async tossJunk(junk) {
            for (const id of junk) {
                let item;
                while ((item = this.bot.inventory.findInventoryItem(id, null)) !== null) {
                    ui.log(`{green-fg}[pupa_inventory]{/} Tossing ${item.name} x${item.count}...`);
                    await this.bot.waitForTicks(2);
                    await this.bot.toss(item.type, null, item.count);
                    await this.bot.waitForTicks(2);
                }
            }
        }
    }

    bot.pupa_inventory = new pupa_inventory(bot)
    return bot;
}