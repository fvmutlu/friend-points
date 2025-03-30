class FriendPoints {
    static ID = 'friend-points';

    static LABEL_STRING = 'Friend Points';

    static RESOURCE_NAME = "friend-points";

    static TEMPLATES = {
        FRIEND_POINTS: `modules/${this.ID}/templates/friend-points.hbs`
    }

    static async init() {
        game.settings.register(this.ID, "enable", {
            name: game.i18n.localize("FRIEND-POINTS.settings.enable-friend-points.label"),
            hint: game.i18n.localize("FRIEND-POINTS.settings.enable-friend-points.description"),
            scope: "world",
            config: true,
            default: true,
            type: Boolean
        });
        game.settings.register(this.ID, "enable-debug-logs", {
            name: game.i18n.localize("FRIEND-POINTS.settings.enable-debug-logs.label"),
            hint: game.i18n.localize("FRIEND-POINTS.settings.enable-debug-logs.description"),
            scope: "client",
            config: true,
            default: false,
            type: Boolean
        });
        this.addResourceToAllActors();
    }

    static log(force = false, ...args) {
        const shouldLog = force || game.settings.get(this.ID, "enable-debug-logs");

        if (shouldLog) {
            console.log(this.ID, '|', ...args);
        }
    }

    static throwUIError(...args) {
        const errorMessage = `${this.ID} | ${args.join(' ')}`;
        ui.notifications.error(errorMessage);
    };

    static alwaysLoggedError(...args) {
        this.log(true, ...args);
        this.throwUIError(...args);
    }

    static addResource(actor) {
        if (!actor.getFlag(FriendPoints.ID, FriendPoints.RESOURCE_NAME)) {
            actor.setFlag(FriendPoints.ID, FriendPoints.RESOURCE_NAME, { "value": 0, "max": 3 });
            FriendPoints.log(false, `Updated actor ${actor.name} with custom resource.`);
        }
    }

    static addResourceToAllActors() {
        for (let actor of game.actors) {
            if (actor.type === "character") {
                this.addResource(actor);
            }
        }
    }

    static getFriendPointsResource(actor) {
        this.log(false, "Getting resource for actor:", actor.name);
        return actor.flags[FriendPoints.ID]?.[FriendPoints.RESOURCE_NAME];
    }

    static async renderFriendPointsResource(app, html, data) {
        this.log(false, "Trying to render Friend Points resource on actor sheet.");
        if (!data.actor) {
            this.alwaysLoggedError("FRIEND-POINTS.log-messages.actor-not-found");
            return;
        }
        if (!data.owner) {
            this.alwaysLoggedError("FRIEND-POINTS.log-messages.user-not-owner");
            return;
        }
        if (data.actor.type != "character") {
            this.alwaysLoggedError("FRIEND-POINTS.log-messages.actor-not-character");
            return;
        }

        let resource = this.getFriendPointsResource(data.actor);
        if (!resource) {
            this.alwaysLoggedError("FRIEND-POINTS.log-messages.resource-not-found", data.actor.name);
            return;
        }
        this.log(false, "Resource found:", resource);

        let titleEl = html.find(".char-details .dots");
        const label = $(`<span class="label">${this.LABEL_STRING}</span>`);

        const context = {
            filledCircles: [resource.value >= 1, resource.value >= 2, resource.value >= 3],
        }
        const rendered = await renderTemplate(this.TEMPLATES.FRIEND_POINTS, context);

        if (!app.minimized) {
            this.log(false, "App is not minimized. Adding label and rendered template.");
            titleEl.append(label);
            titleEl.append(rendered);
            const resourcePipContainer = html[0].querySelector("#friend-points-pips");
            const resourcePips = Array.from(resourcePipContainer.querySelectorAll("i"));
            for (const pip of resourcePips) {
                pip.addEventListener("click", (event) => {
                    this.adjustFriendPointsResource(data.actor, 1);
                    app.render();
                });
                pip.addEventListener("contextmenu", (event) => {
                    this.adjustFriendPointsResource(data.actor, -1);
                    app.render();
                });
            }
            this.log(false, "Added friend points label, resource, and event listeners.");
        } else {
            this.log(false, "App is minimized. Skipping rendering.");
        }
    }

    static adjustFriendPointsResource(actor, change) {
        this.log(false, "Adjusting resource for actor:", actor.name);
        let resource = this.getFriendPointsResource(actor);
        if (!resource) {
            this.log(false, "No resource found for actor:", actor.name);
            this.throwUIError("No resource found for actor:", actor.name);
            return;
        }

        const newValue = Math.clamp(resource.value + change, 0, resource.max);
        this.log(false, "New value:", newValue);

        actor.flags[FriendPoints.ID][FriendPoints.RESOURCE_NAME].value = newValue;
        this.log(false, "Updated resource:", actor.flags[FriendPoints.ID][FriendPoints.RESOURCE_NAME]);
    }
}

Hooks.once('ready', () => {
    FriendPoints.init();
});

// Data returned from the render hook is only data, the methods are not available
Hooks.on("renderCharacterSheetPF2e", (app, html, data) => { FriendPoints.renderFriendPointsResource(app, html, data); });