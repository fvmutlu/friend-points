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

  static async promptForFriendPoint(promptText) {
    return new Promise((resolve) => {
      new Dialog({
        title: "Remote Query",
        content: `<p><strong>${promptText}</strong></p>
                     <p>You were prompted by ${game.user.name}</p>`,
        buttons: {
          // Key 'accept' is the return value
          accept: {
            icon: '<i class="fas fa-check"></i>',
            label: "Accept",
            callback: () => resolve("accepted"),
          },
          // Key 'decline' is the return value
          decline: {
            icon: '<i class="fas fa-times"></i>',
            label: "Decline",
            callback: () => resolve("declined"),
          },
        },
        default: "accept",
        // Resolve with null if the dialog is closed without clicking a button
        close: () => resolve(null),
      }).render(true);
    });
  }

  static async queryFriendPointFromUser(socket, message) {
    const targetUser = game.users.getName("Player2");
    const result = await socket.executeAsUser(
      "FriendPoints.promptForFriendPoint",
      targetUser.id,
      "Would you like to give a Friend Point?"
    );
    this.log(false, `User responded with: ${result}`);
    if (result === "accepted") {
      this.handleFriendPointReroll(message);
    }
  }

  static async handleFriendPointReroll(originalMessage) {
    // Guard clauses
    if (!originalMessage.rolls?.length) {
      this.alwaysLoggedError("No Roll data found to reroll.");
      return;
    }

    const roll = originalMessage.rolls[0];
    //const diceTerms = roll.terms.filter((t) => t instanceof DiceTerm);
    const diceTerms = roll.dice;
    if (diceTerms.length === 0) {
      this.alwaysLoggedError("No DiceTerm found in the original roll.");
      return;
    }
    const diceTerm = diceTerms[0];

    if (!diceTerm.results || diceTerm.results.length === 0) {
      this.alwaysLoggedError("No results found in the DiceTerm.");
      return;
    }
    const results = diceTerm.results;

    if (results.length > 1) {
      this.alwaysLoggedError(
        "Multiple dice results found; only single-die rolls are supported."
      );
      return;
    }
    const originalResult = results[0];

    if (originalResult.discarded) {
      this.alwaysLoggedError("Original die was discarded; cannot reroll.");
      return;
    }

    this.log(false, "Original dice roll: {diceRoll}.", {
      diceRoll: originalResult.result,
    });
  }
}

Hooks.once("init", () => {
  FriendPoints.init();
});

// Data returned from the render hook is only data, the methods are not available
Hooks.on("renderCharacterSheetPF2e", (app, html, data) => {
  FriendPoints.renderFriendPointsResource(app, html, data);
});

// A static variable to hold our socket
let moduleSocket;

/**
 * Hook to register our socket when socketlib is ready.
 */
Hooks.once("socketlib.ready", () => {
  // 1. Register a unique system name (use your module's ID)
  moduleSocket = socketlib.registerModule(FriendPoints.ID);

  // 2. Register the function that will open the dialog on the target client
  moduleSocket.register(
    "FriendPoints.promptForFriendPoint",
    FriendPoints.promptForFriendPoint
  );

  console.log(
    "Your Module: Socket and promptForFriendPoint function registered."
  );
});

Hooks.on("getChatLogEntryContext", (html, options) => {
  options.push({
    name: "Prompt for Friend Point",
    icon: "<i class='fas fa-users'></i>", // Proper FontAwesome icon syntax
    condition: (li) => {
      // Condition to only show this option on a Roll ChatMessage
      const message = game.messages.get(li.data("messageId"));
      // Only show if the message has an associated Roll (check the system for the exact data path)
      return message?.rolls?.length > 0;
    }, // Always show the option
    callback: (li) => {
      const messageId = li.data("messageId");
      const message = game.messages.get(messageId);

      // This is where the core logic goes
      FriendPoints.queryFriendPointFromUser(moduleSocket, message);
    },
  });
});
