const ui = require('./tui')();

const { Vec3 } = require('vec3');

module.exports = function attach(bot) {
    class pupa_pvp {
        allies = [];
        enemies = [];

        constructor(bot) {
            this.bot = bot;
            this.debounce = false;

            this.lastDamage = 0;
            this.lastHealth = 20;

            this.strafePoint = null;
            this.lastDist = null;

            this.mode = 2;
        }

        setMode(mode) {
            this.mode++;
            if (this.mode > 2) this.mode = 0;
            if (mode) this.mode = mode;
        }
        
        getTargetFilter = () => {
            switch (this.mode) {
                case 0:
                    return e => e.type === 'mob' &&
                                e.kind === 'Hostile mobs' &&
                                e.position.distanceTo(this.bot.entity.position) <= 128;
                case 1: 
                    return e => e.type === 'player' && 
                                this.bot.players[e.username]?.gamemode === 0 &&
                                !this.allies.includes(e.username) &&
                                e.position.distanceTo(this.bot.entity.position) <= 128;
                case 2: 
                    return e => e.type === 'player' &&
                                !this.allies.includes(e.username) &&
                                e.position.distanceTo(this.bot.entity.position) < 128;
                default:
                    return null;
            }
        }

        getLastDamage = () => {
            const health = this.bot.health + (this.bot.entity.metadata[11] || 0);
            const delta = this.lastHealth - health;
            
            if (delta > 0) this.lastDamage = delta;
            this.lastHealth = health;
        };

        getHealthStatus = () => {
            const healthPoints = this.bot.health;
            const absorbPoints = this.bot.entity.metadata[11] || 0;
            return { totalHealth: healthPoints + absorbPoints, healthPoints, absorbPoints };
        };

        doDecide = async () => {
            this.updateTarget();
            if (!this.bot.pvp.target) return;
            
            try {
                this.doStrafe();
                //this.doAvoid();
                //this.doFloat();
            } catch (error) {
                ui.log(`{red-fg}[pupa_pvp]{/} Non-blocking chain failed: ${error}`);
            }
             
            if (this.debounce) return;
            this.debounce = true;

            try {
                await this.decideIfArmor();
                await this.decideIfTotem();
                await this.decideIfHeal();
                await this.decideIfBuff();

                await this.decideIfWeapon();
                await this.decideIfUtility();

                await this.decideIfToss();
            } catch (error) {
                ui.log(`{red-fg}[pupa_pvp]{/} Chain failed: ${error}`);
            }
            this.debounce = false;
        };

        decideIfArmor = async () => {
            const shouldArmor = true;
            if (shouldArmor) {
                return this.bot.pupa_inventory.equipArmor();
            }
        }

        decideIfTotem = async () => {
            const { totalHealth } = this.getHealthStatus();

            const hasTotems = this.bot.pupa_utils.hasItem('totem_of_undying');
            const hasGapple = this.bot.pupa_utils.hasItem('golden_apple');

            if (!hasTotems) return;

            const shouldTotem = (totalHealth <= (this.lastDamage || 1)*1.6 || !hasGapple);
            if (shouldTotem) {
                return this.bot.pupa_inventory.equipTotem();
            }
        };
        
        decideIfHeal = async () => {
            const { totalHealth, healthPoints } = this.getHealthStatus();

            const regeneration = this.bot.entity.effects['10'];
            
            const hasTotems = this.bot.pupa_utils.hasItem('totem_of_undying');
            const hasGapple = this.bot.pupa_utils.hasItem('golden_apple');
        
            if (!hasGapple) return;

            const shouldHeal = (totalHealth > (this.lastDamage || 1)*1.6 || !hasTotems) && 
                               (healthPoints < 20 && !regeneration);
            if (shouldHeal) {
                return this.bot.pupa_inventory.equipGapple();
            }
        }

        decideIfBuff = async () => {
            const { totalHealth } = this.getHealthStatus();

            const strength = this.bot.entity.effects['5'];

            const hasTotems = this.bot.pupa_utils.hasItem('totem_of_undying');
            const hasGapple = this.bot.pupa_utils.hasItem('golden_apple');
            const hasPotion = this.bot.pupa_utils.hasItem('potion');

            if (!hasPotion) return;

            const shouldBuff = (totalHealth > 10 || (!hasTotems && !hasGapple)) && !strength;
            if (shouldBuff) {
                return this.bot.pupa_inventory.equipBuff();
            }
        }

        decideIfFood = async () => {
            const { totalHealth } = this.getHealthStatus();

            const hasTotems = this.bot.pupa_utils.hasItem('totem_of_undying');

            const shouldFood = totalHealth > (this.lastDamage || 1)*1.6 || !hasTotems;
            if (shouldFood) {
                return this.bot.pupa_inventory.equipFood();
            }   
        }

        decideIfUtility = async () => {
            const { totalHealth } = this.getHealthStatus();

            const hasTotems = this.bot.pupa_utils.hasItem('totem_of_undying');

            const shouldUtility = totalHealth > (this.lastDamage || 1)*1.6 || !hasTotems;
            if (shouldUtility) {
                return this.bot.pupa_inventory.equipUtility();
            }
        }

        decideIfWeapon = async () => {
            const shouldWeapon = true;
            if (shouldWeapon) {
                return this.bot.pupa_inventory.equipWeapon();
            }
        }
        
        decideIfToss = async () => {
            const junk = new Set([
              bot.registry.itemsByName.compass.id,
              bot.registry.itemsByName.knowledge_book.id,
              bot.registry.itemsByName.glass_bottle.id
            ]);

            for (const id of junk) {
              const item = this.bot.inventory.findInventoryItem(id, null);
              if (item) {
                ui.log(`{green-fg}[pupa_inventory]{/} Tossing ${item.name} x${item.count}...`);
                await this.bot.toss(item.type, item.metadata, item.count);
                await this.bot.waitForTicks(2);
                break; // toss only the first matching item
              }
            }
        };

        doFloat = () => {
            const liquid = this.bot.pupa_utils.isInLiquid(this.bot.entity.position);
            if (liquid) {
              this.bot.entity.velocity.set(this.bot.entity.velocity.x,0.01,this.bot.entity.velocity.z);
            } 
        }
/*
###
WURST 
MinecraftClient = MC
net.minecraft.client.MinecraftClient is fabric
###
0.04 to float up
CHECK submerged, + touching

submerged = 1.62 height water 
*/


        doAvoid = () => {
            const unwanted = this.bot.pupa_utils.isInUnwanted(this.bot.entity.position);
            if (unwanted) {
                const velocity = this.bot.pupa_utils.getFlatVelocity(this.bot.entity.position, unwanted, 180);
                this.bot.entity.velocity.set(...Object.values(velocity));
            }
        }

        updateTarget = () => {
            const target = this.bot.nearestEntity(this.getTargetFilter(this.mode));
            target ? this.bot.pvp.attack(target) : this.bot.pvp.forceStop();
        }

        doStrafe = () => {
          const { position: source } = this.bot.entity;
          const target = this.bot.pvp?.target?.position;
          if (!source || !target) return;
        
          const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
        
          // Ground phase: find strafe point and jump
          if (this.bot.entity.onGround && source.distanceTo(target) <= 3.5) {
            this.strafePoint = this.bot.pupa_utils.getStrafePoint(source, target);
            if (this.strafePoint) {
              const velocity = this.bot.pupa_utils.getJumpVelocity(source, this.strafePoint);
              if (velocity) {
                this.bot.entity.velocity.set(0, 0, 0);
                this.bot.entity.velocity.set(...Object.values(velocity));
              }
            }
          }
      
          // Air phase: adjust velocity while approaching strafe point
          if (!this.bot.entity.onGround && this.strafePoint) {
            const dist = dist2D(source, this.strafePoint);
            if (dist < 0.5 && dist > (this.lastDist ?? -1)) {
              const velocity = this.bot.pupa_utils.getFlatVelocity(source, this.strafePoint, 0, 0.05);
              this.bot.entity.velocity.set(...Object.values(velocity));
            }
            this.lastDist = dist;
          }
        };
    } // add worker threads    
    bot.pupa_pvp = new pupa_pvp(bot)
    return bot;
}