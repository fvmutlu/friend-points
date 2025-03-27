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
            hint: game.i18n.localize("FRIEND-POINTS.settings.enable-friend-points.hint"),
            scope: "world",
            config: true,
            default: true,
            type: Boolean
        });
        game.settings.register(this.ID, "enable-debug-logs", {
            name: game.i18n.localize("FRIEND-POINTS.settings.enable-debug-logs.label"),
            hint: game.i18n.localize("FRIEND-POINTS.settings.enable-debug-logs.hint"),
            scope: "client",
            config: true,
            default: false,
            type: Boolean
        });
    }

    static log(force = false, ...args) {
        const shouldLog = force || game.settings.get(this.ID, "enable-debug-logs");

        if (shouldLog) {
            console.log(this.ID, '|', ...args);
        }
    }
}

class FriendPointsResource {
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

    static renderResource(app, html, data) {
        FriendPoints.log(false, "Rendering resource");

        if (!data.actor) {
            FriendPoints.log(false, "No actor found in data.");
            return;
        }
        if (!data.owner) {
            FriendPoints.log(false, "User is not the owner of the actor.");
            return;
        }

        let resource = this.getResource(data.actor);
        if (!resource) {
            FriendPoints.log(false, "No resource found for actor:", data.actor);
            return;
        }

        FriendPoints.log(false, "Resource found:", resource);

        let titleEl = html.closest(".app").find(".char-details .dots");
        const label = $(`<span class="label">${FriendPoints.LABEL_STRING}</span>`);
        // TODO: Fix this
        let rendered = renderTemplate(FriendPoints.TEMPLATES.FRIEND_POINTS, { value: resource.value });

        if (!app.minimized) {
            FriendPoints.log(false, "App is not minimized. Adding label and rendered template.");
            titleEl.append(label);
            titleEl.append(rendered);
        } else {
            FriendPoints.log(false, "App is minimized. Skipping rendering.");
        }
    }

    static getResource(actor) {
        FriendPoints.log(false, "Getting resource for actor:", actor);
        return actor.flags[FriendPoints.ID]?.[FriendPoints.RESOURCE_NAME];
    }

    static setResource(actor, value) {
        let resource = this.getResource(actor);
        if (!resource) return;
        resource.value = value;
        actor.setFlag(FriendPoints.ID, FriendPoints.RESOURCE_NAME, resource);
    }

    static incrementResource(actor) {
        let resource = this.getResource(actor);
        if (!resource) return;
        if (resource.value < resource.max) {
            resource.value++;
            actor.setFlag(FriendPoints.ID, FriendPoints.RESOURCE_NAME, resource);
        }
    }

    static decrementResource(actor) {
        let resource = this.getResource(actor);
        if (!resource) return;
        if (resource.value > 0) {
            resource.value--;
            actor.setFlag(FriendPoints.ID, FriendPoints.RESOURCE_NAME, resource);
        }
    }
}

Hooks.once('ready', () => {
    FriendPoints.init();
    FriendPointsResource.addResourceToAllActors();
});

// Data returned from the render hook is only data, the methods are not available
Hooks.on("renderCharacterSheetPF2e", (app, html, data) => { FriendPointsResource.renderResource(app, html, data); });