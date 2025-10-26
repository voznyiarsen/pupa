const ui = require('./tui')();

const nbt = require('prismarine-nbt');

module.exports = function attach(bot) {
    class pupa_inventory {
        constructor(bot) {
            this.bot = bot;
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
          const armorPieces = [
            { destination: 'head', item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_helmet.id, null), minEnch: 8 },
            { destination: 'torso', item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_chestplate.id, null), minEnch: 6 },
            { destination: 'legs', item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_leggings.id, null), minEnch: 6 },
            { destination: 'feet', item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_boots.id, null), minEnch: 9 }
          ];

          for (const piece of armorPieces) {
            if (piece.item?.nbt && piece.item && piece.item.enchants.length >= piece.minEnch) {
              const equipSlot = this.bot.getEquipmentDestSlot(piece.destination);
              if (this.bot.inventory.slots[equipSlot] === null || this.bot.inventory.slots[equipSlot].type !== piece.item.type) {
                await this.bot.equip(piece.item.type, piece.destination);
              }
            }
          }
        }

        async equipGapple() {
            const gapple = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.golden_apple.id) || this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')];
            while (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== gapple.type) {
                await this.bot.equip(gapple.type, 'off-hand');
                await this.bot.waitForTicks(2);
            }
        
            this.bot.activateItem(true);

            while (!this.bot.entity.effects['10']) {
                await this.bot.waitForTicks(2);
            }
        
            this.bot.deactivateItem();
        }

        async equipBuff() {
            const buff = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.potion.id, null);
            if (nbt.simplify(buff.nbt).Potion != 'minecraft:strong_strength') return;

            if (this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== buff.type) {
              await this.bot.equip(buff.type, 'off-hand');
            }

            this.bot.activateItem(true);

            while (!this.bot.entity.effects['5']) {
              await this.bot.waitForTicks(2); 
            }

            this.bot.deactivateItem();
        }

        async equipTotem() {
            const totem = this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.totem_of_undying.id, null);
            if (totem && this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')]?.type !== totem.type) {
                await this.bot.equip(totem.type, 'off-hand');
            }
        }

        async equipPearl() {
            const pearl = bot.inventory.findInventoryItem(bot.registry.itemsByName.ender_pearl.id, null);
            if (!pearl) return;
            if (bot.inventory.slots[bot.getEquipmentDestSlot('off-hand')]?.type !== pearl.type) {
                await bot.equip(pearl.type, 'off-hand');
            }
        
            await bot.waitForTicks(1);
            bot.activateItem(true);
            await bot.waitForTicks(1);
            bot.deactivateItem();
        }

        async equipPassive() {
            const itemPieces = [
                { item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.golden_apple.id, null), slot: 'off-hand', slotCheck: this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')] },
                { item: this.bot.inventory.findInventoryItem(this.bot.registry.itemsByName.diamond_sword.id, null), slot: 'hand', slotCheck: this.bot.heldItem }
            ];

            for (const piece of itemPieces) {
                if (piece.item && piece.slotCheck?.type !== piece.item.type && (piece.slot === 'off-hand' || piece.item.enchants.length >= 8)) {
                    await this.bot.equip(piece.item.type, piece.slot);
                }
            }
        }

        async tossJunk(junk) {
            for (const id of junk) {
                let item;
                while ((item = this.bot.inventory.findInventoryItem(id, null)) !== null) {
                    ui.log(`{green-fg}[pupa_inventory]{/} Tossing ${item.name} x${item.count}`);
                    await this.bot.toss(item.type, null, item.count);
                    await this.bot.waitForTicks(1);
                }
            }
        }
    }

    bot.pupa_inventory = new pupa_inventory(bot)
    return bot;
}