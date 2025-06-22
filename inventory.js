const nbt = require('prismarine-nbt');

class Inventory {
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
        { destination: 'head', item: bot.inventory.findInventoryItem(bot.registry.itemsByName.diamond_helmet.id, null), minEnch: 8 },
        { destination: 'torso', item: bot.inventory.findInventoryItem(bot.registry.itemsByName.diamond_chestplate.id, null), minEnch: 6 },
        { destination: 'legs', item: bot.inventory.findInventoryItem(bot.registry.itemsByName.diamond_leggings.id, null), minEnch: 6 },
        { destination: 'feet', item: bot.inventory.findInventoryItem(bot.registry.itemsByName.diamond_boots.id, null), minEnch: 9 }
      ];

      for (const piece of armorPieces) {
        if (piece.item?.nbt && piece.item && piece.item.enchants.length >= piece.minEnch) {
          const equipSlot = bot.getEquipmentDestSlot(piece.destination);
          if (bot.inventory.slots[equipSlot] === null || bot.inventory.slots[equipSlot].type !== piece.item.type) {
            await this.bot.equip(piece.item.type, piece.destination);
          }
        }
      }
    }

    async equipGapple() {
        const gapple = bot.inventory.findInventoryItem(bot.registry.itemsByName.golden_apple.id) || bot.inventory.slots[bot.getEquipmentDestSlot('off-hand')];
        if (bot.inventory.slots[bot.getEquipmentDestSlot('off-hand')]?.type !== gapple.type) {
            await this.bot.equip(gapple.type, 'off-hand');
        }
    
        bot.activateItem(true);
        
        while (!bot.entity.effects['10']) {
            await bot.waitForTicks(2);
        }
    
        bot.deactivateItem();
    }

    async equipBuff() {
        const buff = bot.inventory.findInventoryItem(bot.registry.itemsByName.potion.id, null);
        if (nbt.simplify(buff.nbt).Potion != 'minecraft:strong_strength') return;

        if (bot.inventory.slots[bot.getEquipmentDestSlot('off-hand')]?.type !== buff.type) {
          await this.bot.equip(buff.type, 'off-hand');
        }
        
        bot.activateItem(true);

        while (!bot.entity.effects['5']) {
          await bot.waitForTicks(2); 
        }

        bot.deactivateItem();
    }

    async equipTotem() {
        const totem = bot.inventory.findInventoryItem(bot.registry.itemsByName.totem_of_undying.id, null);

        if (totem && bot.inventory.slots[bot.getEquipmentDestSlot('off-hand')]?.type !== totem.type && canEquip) {
            await this.bot.equip(totem.type, 'off-hand');
        }
    }

    async equipPassive() {
        const itemPieces = [
            { item: bot.inventory.findInventoryItem(bot.registry.itemsByName.golden_apple.id, null), slot: 'off-hand', slotCheck: bot.inventory.slots[bot.getEquipmentDestSlot('off-hand')] },
            { item: bot.inventory.findInventoryItem(bot.registry.itemsByName.diamond_sword.id, null), slot: 'hand', slotCheck: bot.heldItem }
        ];

        for (const piece of itemPieces) {
            if (piece.item && piece.slotCheck?.type !== piece.item.type && (piece.slot === 'off-hand' || piece.item.enchants.length >= 8)) {
                await this.bot.equip(piece.item.type, piece.slot);
            }
        }
    }

    async tossJunk() {
        const items = [
            bot.inventory.findInventoryItem(bot.registry.itemsByName.compass.id, null),
            bot.inventory.findInventoryItem(bot.registry.itemsByName.knowledge_book.id, null),
            bot.inventory.findInventoryItem(bot.registry.itemsByName.glass_bottle.id, null)
        ];

        for (const item of items) {
            if (item) await this.bot.toss(item.type, null, item.count);
        }
    }

}

module.exports = { Inventory };