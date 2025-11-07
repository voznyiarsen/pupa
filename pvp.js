const ui = require('./tui')();
const { Vec3 } = require('vec3');

module.exports = function attach(bot) {
    class pupa_pvp {
        allies = [];
        enemies = [];
        debounce = false;
        lastDamage = 0;
        lastHealth = 20;
        strafePoint = null;
        lastDist = null;
        mode = 2;
        banner = { good: `{green-fg}[combat]{/}`, bad: `{red-fg}[combat]{/}`}

        constructor(bot) {
            this.bot = bot;
        }

        setMode(mode) {
            this.mode = mode ? mode : (this.mode + 1) % 3;
        }

        getTargetFilter = () => {
            const dist = e => e.position.distanceTo(this.bot.entity.position);
            switch (this.mode) {
                case 0: return e => e.type === 'mob' && e.kind === 'Hostile mobs' && dist(e) <= 128;
                case 1: return e => e.type === 'player' && this.bot.players[e.username]?.gamemode === 0 && !this.allies.includes(e.username) && dist(e) <= 128;
                case 2: return e => e.type === 'player' && !this.allies.includes(e.username) && dist(e) < 128;
                default: return null;
            }
        }

        getLastDamage = () => {
            const health = this.bot.health + (this.bot.entity.metadata[11] || 0);
            const delta = this.lastHealth - health;
            if (delta > 0) this.lastDamage = delta;
            this.lastHealth = health;
        };

        getHealthStatus = () => {
            const hp = this.bot.health;
            const ap = this.bot.entity.metadata[11] || 0;
            return { totalHealth: hp + ap, healthPoints: hp, absorbPoints: ap };
        };

        doDecide = async () => {
            this.updateTarget();
            if (this.bot.pvp.target) await this.doStrafe();
            this.doAvoid();
            if (this.debounce) return;
            this.debounce = true;

            await this.decideIfArmor();
            await this.decideIfTotem();
            await this.decideIfHeal();
            await this.decideIfBuff();
            await this.decideIfFood();
            //await this.decideIfPearl();
            await this.decideIfWeapon();
            await this.decideIfUtility();
            await this.decideIfToss();

            this.debounce = false;
        };

        decideIfArmor = async () => this.bot.pupa_inventory.equipArmor();

        decideIfTotem = async () => {
            const { totalHealth } = this.getHealthStatus();
            const hasTotems = this.bot.pupa_utils.hasItem('totem_of_undying');
            const hasGapple = this.bot.pupa_utils.hasItem('golden_apple');
            if (hasTotems && (totalHealth <= (this.lastDamage || 1)*2 || !hasGapple)) {
                return this.bot.pupa_inventory.equipTotem();
            }
        };

        decideIfHeal = async () => {
            const { totalHealth, healthPoints } = this.getHealthStatus();
            const regeneration = this.bot.entity.effects['10'];
            const hasGapple = this.bot.pupa_utils.hasItem('golden_apple');
            const hasTotems = this.bot.pupa_utils.hasItem('totem_of_undying');
            if (hasGapple && (totalHealth > (this.lastDamage || 1)*2 || !hasTotems) && healthPoints < 20 && !regeneration) {
                return this.bot.pupa_inventory.equipGapple();
            }
        };

        decideIfBuff = async () => {
            const { totalHealth } = this.getHealthStatus();
            const strength = this.bot.entity.effects['5'];
            const hasPotion = this.bot.pupa_utils.hasItem('potion');
            const hasTotems = this.bot.pupa_utils.hasItem('totem_of_undying');
            const hasGapple = this.bot.pupa_utils.hasItem('golden_apple');
            if (hasPotion && (totalHealth > 10 || (!hasTotems && !hasGapple)) && !strength) {
                return this.bot.pupa_inventory.equipBuff();
            }
        };

        decideIfFood = async () => {
            const { totalHealth } = this.getHealthStatus();
            const hasTotems = this.bot.pupa_utils.hasItem('totem_of_undying');
            if ((totalHealth > (this.lastDamage || 1)*2 || !hasTotems) && totalHealth > 15 && this.bot.food < 18) {
                return this.bot.pupa_inventory.equipFood();
            }
        };

        decideIfPearl = async () => {
            const { totalHealth } = this.getHealthStatus();
            const source = this.bot.entity.position;
            const target = this.bot.pvp.target?.position;
            if (!source || !target) return;

            const offset = this.bot.pupa_utils.getProjectileOffset(source, target);
            const projectile = this.bot.nearestEntity(e => e.type === 'object' && e.name === 'ender_pearl' && e.position.distanceTo(source) <= 50);

            if ((totalHealth > (this.lastDamage || 1)*2 || !this.bot.pupa_utils.hasItem('totem_of_undying')) && source.distanceTo(target) > 12 && offset && !projectile) {
                await this.bot.lookAt(target.offset(0, offset, 0), true);
                await this.bot.waitForTicks(1);
                return this.bot.pupa_inventory.equipPearl();
            }
        };

        decideIfWeapon = async () => this.bot.pupa_inventory.equipWeapon();

        decideIfUtility = async () => {
            const { totalHealth } = this.getHealthStatus();
            if (totalHealth > (this.lastDamage || 1)*2 || !this.bot.pupa_utils.hasItem('totem_of_undying')) {
                return this.bot.pupa_inventory.equipUtility();
            }
        };

        decideIfToss = async () => {
            const junk = [bot.registry.itemsByName.compass.id, bot.registry.itemsByName.knowledge_book.id, bot.registry.itemsByName.glass_bottle.id];
            for (const id of junk) {
                const item = this.bot.inventory.findInventoryItem(id, null);
                if (item) {
                    ui.log(`${this.banner.good} Tossing ${item.name} x${item.count}...`);
                    await this.bot.toss(item.type, item.metadata, item.count);
                    await this.bot.waitForTicks(2);
                    break;
                }
            }
        };

        doFloat = () => {
            if (this.bot.pupa_utils.isInLiquid(this.bot.entity.position)) {
                this.bot.entity.velocity.y = 0.01;
            }
        };

        doAvoid = () => {
            const unwanted = this.bot.pupa_utils.isInUnwanted(this.bot.entity.position);
            if (unwanted) {
                const velocity = this.bot.pupa_utils.getFlatVelocity(this.bot.entity.position, unwanted, 180);
                this.bot.entity.velocity.set(...Object.values(velocity));
            }
        };

        updateTarget = () => {
            const target = this.bot.nearestEntity(this.getTargetFilter());
            target ? this.bot.pvp.attack(target) : this.bot.pvp.forceStop();
        };

        doStrafe = async () => {
            const { position: source } = this.bot.entity;
            const target = this.bot.pvp?.target?.position;
            if (!source || !target) return;

            const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

            if (this.bot.entity.onGround && source.distanceTo(target) <= 3.5) {
                this.strafePoint = this.bot.pupa_utils.getStrafePoint(source, target);
                if (this.strafePoint) {
                    const velocity = this.bot.pupa_utils.getJumpVelocity(source, this.strafePoint);
                    if (velocity) {
                        this.bot.entity.velocity.set(0, 0, 0);
                        await this.bot.waitForTicks(1);
                        this.bot.entity.velocity.set(...Object.values(velocity));
                    }
                }
            }
        
            if (!this.bot.entity.onGround && this.strafePoint) {
                const dist = dist2D(source, this.strafePoint);
                if (dist < 1) {
                    if (this.lastDist !== undefined && dist > this.lastDist) {
                        ui.log(`${this.banner.good} Applying velocity towards ${this.strafePoint} from ${source}`)
                        const velocity = this.bot.pupa_utils.getFlatVelocity(source, this.strafePoint, 0, 0.05);
                        this.bot.entity.velocity.set(...Object.values(velocity));
                    }
                }
                this.lastDist = dist;
            }
        };
    }
    bot.pupa_pvp = new pupa_pvp(bot);
    return bot;
};