const ui = require('./tui')();

const { Vec3 } = require('vec3');

module.exports = function attach(bot) {
    class pupa_pvp {
        allies = [];
        enemies = [];

        mode = 2;

        strafePoint = null;
        distanceOld = null;

        constructor(bot) {
            this.bot = bot;
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
        averageDPS = 0;

        decideIfTotem = () => {
            const healthPoints = this.bot.health;
            const absorbPoints = this.bot.entity.metadata[11] || 0;

            const hasTotems = this.bot.pupa_utils.getItemCount('totem_of_undying') > 0;
            const hasGapple = this.bot.pupa_utils.getItemCount('golden_apple') > 0;

            const shouldTotem = hasTotems && 
                                healthPoints + absorbPoints <= (this.averageDPS || 1)*1.6 || !hasGapple;
            if (shouldTotem) {
                ui.log('TOTEM');
                this.bot.pupa_inventory.equipTotem();
            }
        }
        decideIfHeal = async () => {
            const healthPoints = this.bot.health;
            const absorbPoints = this.bot.entity.metadata[11] || 0;

            const regeneration = this.bot.entity.effects['10'];
            const resistance = this.bot.entity.effects['11'];
            const resistanceFire = this.bot.entity.effects['12'];
            
            const hasTotems = this.bot.pupa_utils.getItemCount('totem_of_undying') > 0;
            const hasGapple = this.bot.pupa_utils.getItemCount('golden_apple') > 0;
        
            const shouldHeal = hasGapple && healthPoints + absorbPoints > (this.averageDPS || 0)*1.6 && 
                               ((!resistance || !resistanceFire)     ||
                               (healthPoints < 19 && !regeneration)  || 
                               ((absorbPoints < 16 && absorbPoints > 0) && !regeneration)) || !hasTotems;
            if (shouldHeal) {
                ui.log(` ${healthPoints} ${absorbPoints}`);
                this.bot.pupa_inventory.equipGapple();
            }
        }

        doDecide = async () => {
            this.updateTarget();
            if (!this.bot.pvp.target) return;
            
            this.doStrafe();
            this.doAvoid();
            this.doFloat();
        
            await this.bot.pupa_inventory.equipArmor();

            await this.decideIfHeal(); // ok
            await this.decideIfTotem();
            //this.bot.pupa_inventory.equipBuff();
            //this.bot.pupa_inventory.equipPearl();
            //this.bot.pupa_inventory.equipPassive();
         // + 16 absorb + 30 seconds of 0.4 per second + 20% resist
            
            // average damage recieved + 
            
            /*                 but not < average dps                                                                                                                  ++                                                                                           
            do dynamic calc based on DPS

            Fire Aspect adds 80 fire-ticks (4 seconds of burning) per level to the target, formula: (level × 4) – 1 #### FIRE RESIST nullifies, no need

            Sweep form  1 + Attack_Damage × (Sweeping_Edge_Level / (Sweeping_Edge_Level + 1)), rounded to the nearest integer
            assume max ench   sharp formula 0.5 * level + 0.5
            5 sharp sword
            nether  	11 (15) 
            diamond     10 (13.5) 
            iron        9 (12) 
            stone       8 (10.5) 
            wood/gold   7 (9) 
            */
            /*    

      if (canHeal && (isAboveMinHealth && hasTotem || !hasTotem) && (gapple && gapple.type === bot.registry.itemsByName.golden_apple.id)) 
            */

            //if ()

        }

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
            if (target) this.bot.pvp.attack(target); else this.bot.pvp.forceStop();
        }
        


        doStrafe = () => {
            const source = this.bot.entity.position;
            const target = this.bot.pvp.target.position;

            function distance2D(a, b) {
                return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
            }

            if (!source || !target) return;

            if (this.bot.entity.onGround && source.distanceTo(target) <= 3.5) {
                this.strafePoint = this.bot.pupa_utils.getStrafePoint(source, target);
                
                const velocity = this.bot.pupa_utils.getJumpVelocity(source, this.strafePoint);
                if (velocity) {
                    this.bot.entity.velocity.set(0,0,0);
                    this.bot.entity.velocity.set(...Object.values(velocity));
                }
            }

                
            if (!this.bot.entity.onGround && this.strafePoint && distance2D(source, this.strafePoint) < 0.5) {
                if (distance2D(source, this.strafePoint) > this.distanceOld) {
                    const velocity = this.bot.pupa_utils.getFlatVelocity(source, this.strafePoint, 0, 0.05);
                    this.bot.entity.velocity.set(...Object.values(velocity));
                }
                this.lastDist = distance2D(source, this.strafePoint);
            }
        }
    } // add worker threads    
    bot.pupa_pvp = new pupa_pvp(bot)
    return bot;
}
/*
function combatMovement() {
    if (!this.entity) return;

    if (this.isOverLiquid && !this.bot.pathfinder?.isMoving()) {
      this.bot.setControlState('forward', true);
    }

    if (this.bot.entity.isInWeb) {
      this.bot.setControlState('jump', false);
    }

    this.strafeMovement(this.entity);
  }

function combatTargeting() {
    if (!this.entity) return;

    if (this.entity.position.distanceTo(this.bot.entity.position) <= this.bot.pvp.attackRange && !this.bot.pathfinder?.isMoving()) {
      this.bot.lookAt(this.entity.position.offset(0, this.entity.eyeHeight, 0), true);
    }
  }

function combatLoop() {
    this.updateEntity();
    this.combatMovement();
    this.combatTargeting(); 
    this.combatAttacking(); 
  }*/