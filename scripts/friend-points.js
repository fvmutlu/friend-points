class FriendPoints {
  // Module and resource properties
  static ID = "friend-points";
  static RESOURCE_NAME = "friend-points";
  static TEMPLATES = {
    FRIEND_POINTS: `modules/${this.ID}/templates/friend-points.hbs`,
  };

  // Constants
  static RESOURCE_LABEL = "Friend Points";

  // Logging methods
  static log(force = false, log_message_id, log_vars = {}) {
    const shouldLog = force || game.settings.get(this.ID, "enable-debug-logs");
    if (shouldLog) {
      console.log(this.ID, "|", game.i18n.format(log_message_id, log_vars));
    }
  }
  static throwUIError(log_message_id, log_vars = {}) {
    const errorMessage = `${this.ID} | ${game.i18n.format(
      log_message_id,
      log_vars
    )}`;
    ui.notifications.error(errorMessage);
  }
  static alwaysLoggedError(log_message_id, log_vars = {}) {
    this.log(true, log_message_id, log_vars);
    this.throwUIError(log_message_id, log_vars);
  }

  static init() {
    // Add setting for verbose logging.
    game.settings.register(this.ID, "enable-debug-logs", {
      name: game.i18n.format("FRIEND-POINTS.settings.enable-debug-logs.label"),
      hint: game.i18n.format(
        "FRIEND-POINTS.settings.enable-debug-logs.description"
      ),
      scope: "client",
      config: true,
      default: false,
      type: Boolean,
    });

    // Add friend points resource to all existing character actors.
    this.addResourceToAllActors();

    this.log(false, "FRIEND-POINTS.log-messages.module-initialized");
  }

  static async addResource(actor) {
    // Guard clauses
    if (actor.type !== "character") {
      this.log(false, "FRIEND-POINTS.log-messages.actor-not-character");
      return;
    }
    if (actor.getFlag(this.ID, this.RESOURCE_NAME)) {
      this.log(false, "FRIEND-POINTS.log-messages.resource-already-exists", {
        actorName: actor.name,
      });
      return;
    }

    const newFlag = { value: 0, max: 3 };
    try {
      const added = await actor.setFlag(this.ID, this.RESOURCE_NAME, newFlag);
      this.log(false, "FRIEND-POINTS.log-messages.resource-added", {
        actorName: actor.name,
      });
    } catch (error) {
      this.alwaysLoggedError(
        "FRIEND-POINTS.log-messages.resource-update-failed",
        {
          actorName: actor.name,
          errorMessage: error.message,
        }
      );
      return;
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
    return actor.flags[this.ID]?.[this.RESOURCE_NAME];
  }

  static async renderFriendPointsResource(app, html, data) {
    // Guard clauses
    if (!data.actor) {
      this.alwaysLoggedError("FRIEND-POINTS.log-messages.actor-not-found");
      return;
    }
    if (!data.owner) {
      this.alwaysLoggedError("FRIEND-POINTS.log-messages.user-not-owner");
      return;
    }
    if (data.actor.type != "character") {
      this.alwaysLoggedError("FRIEND-POINTS.log-messages.actor-not-character", {
        actorName: data.actor.name,
      });
      return;
    }

    const actor = game.actors.get(data.actor._id);

    let resource = this.getFriendPointsResource(actor);
    if (!resource) {
      this.log(false, "FRIEND-POINTS.log-messages.resource-not-found", {
        actorName: actor.name,
      });
      this.addResource(actor);
      resource = this.getFriendPointsResource(actor);
    }

    let titleEl = html.find(".char-details .dots");
    const label = $(
      `<span class="label" style="margin-left:10px;">${this.RESOURCE_LABEL}</span>`
    );

    const context = {
      filledCircles: [
        resource.value >= 1,
        resource.value >= 2,
        resource.value >= 3,
      ],
    };
    const rendered = await renderTemplate(
      this.TEMPLATES.FRIEND_POINTS,
      context
    );

    if (!app.minimized) {
      titleEl.append(label);
      titleEl.append(rendered);
      const resourcePipContainer = html[0].querySelector("#friend-points-pips");
      const resourcePips = Array.from(
        resourcePipContainer.querySelectorAll("i")
      );
      for (const pip of resourcePips) {
        pip.addEventListener("click", async (event) => {
          this.adjustFriendPointsResource(actor, 1);
        });
        pip.addEventListener("contextmenu", async (event) => {
          this.adjustFriendPointsResource(actor, -1);
        });
      }
    } else {
      this.log(false, "FRIEND-POINTS.log-messages.app-minimized");
    }
  }

  static async adjustFriendPointsResource(actor, change) {
    let resource = this.getFriendPointsResource(actor);
    if (!resource) {
      this.alwaysLoggedError("FRIEND-POINTS.log-messages.resource-not-found", {
        actorName: actor.name,
      });
      return;
    }

    const newValue = Math.clamp(resource.value + change, 0, resource.max);
    const newFlag = { value: newValue, max: resource.max };

    try {
      const updated = await actor.setFlag(this.ID, this.RESOURCE_NAME, newFlag);
      this.log(false, "FRIEND-POINTS.log-messages.resource-updated", {
        actorName: actor.name,
        newValue: newValue,
      });
    } catch (error) {
      this.alwaysLoggedError(
        "FRIEND-POINTS.log-messages.resource-update-failed",
        {
          actorName: actor.name,
          errorMessage: error.message,
        }
      );
      return;
    }
  }
}

Hooks.once("ready", () => {
  FriendPoints.init();
});

// Data returned from the render hook is only data, the methods are not available
Hooks.on("renderCharacterSheetPF2e", (app, html, data) => {
  FriendPoints.renderFriendPointsResource(app, html, data);
});
