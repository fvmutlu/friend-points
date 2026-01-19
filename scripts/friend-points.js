class FriendPoints {
  // Module and resource properties
  static ID = "friend-points";
  static RESOURCE_NAME = "friend-points";
  static TEMPLATES = {
    FRIEND_POINTS: `modules/${this.ID}/templates/friend-points.hbs`,
    REROLL_WRAPPER: `modules/${this.ID}/templates/reroll-wrapper.hbs`,
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
      log_vars,
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
        "FRIEND-POINTS.settings.enable-debug-logs.description",
      ),
      scope: "client",
      config: true,
      default: false,
      type: Boolean,
    });

    const TargetClass = window.this.log(
      false,
      "FRIEND-POINTS.log-messages.module-initialized",
    );
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
        },
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

  static getPlayerActorsWithFriendPoints() {
    return game.actors.filter((actor) => {
      if (!actor) return false;
      if (actor.type !== "character") return false;
      if (!actor.hasPlayerOwner) return false;
      const resource = this.getFriendPointsResource(actor);
      return resource && resource.value > 0;
    });
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
      `<span class="label" style="margin-left:10px;">${this.RESOURCE_LABEL}</span>`,
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
      context,
    );

    if (!app.minimized) {
      titleEl.append(label);
      titleEl.append(rendered);
      const resourcePipContainer = html[0].querySelector("#friend-points-pips");
      const resourcePips = Array.from(
        resourcePipContainer.querySelectorAll("i"),
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
        },
      );
      return;
    }
  }

  static async promptForFriendPoint(actor, promptingPlayerName) {
    const acceptOrDecline = [
      {
        action: "accept",
        label: "Accept",
        icon: "fas fa-check",
        callback: () => true,
      },
      {
        action: "decline",
        label: "Decline",
        icon: "fas fa-times",
        callback: () => false,
      },
    ];
    const result = await foundry.applications.api.DialogV2.wait({
      title: "Friend Point Request",
      content: `<p>Would you like to give one of ${actor.name}'s Friend Points to ${promptingPlayerName}?</p>`,
      buttons: acceptOrDecline,
      rejectClose: false,
      modal: true,
    });
    if (result) {
      FriendPoints.adjustFriendPointsResource(game.actors.get(actor._id), -1);
    }

    return result;

    /* return new Promise((resolve) => {
      new Dialog({
        title: "Friend Point Request",
        content: `<p>Would you like to give one of ${actor.name}'s Friend Points to ${promptingPlayerName}?</p>`,
        buttons: {
          accept: {
            icon: '<i class="fas fa-check"></i>',
            label: "Accept",
            callback: () => resolve("accepted"),
          },
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
    }); */
  }

  static async promptForFriendPointRequestTarget() {
    const pcsWithFriendPoints = this.getPlayerActorsWithFriendPoints();
    const activePlayers = game.users.players.filter(
      (user) => user.active && user.id !== game.user.id,
    );

    const validPcs = pcsWithFriendPoints.filter((pc) => {
      const owners = activePlayers.filter(
        (player) => pc.getUserLevel(player) >= 3,
      );
      return owners.length === 1;
    });

    if (validPcs.length === 0) {
      await foundry.applications.api.DialogV2.wait({
        window: { title: "Friend Point Request" },
        content:
          "No player characters with a single active owner have Friend Points available to give. Press OK to continue.",
        buttons: [
          {
            action: "ok",
            label: "OK",
            icon: "fas fa-check",
          },
        ],
        rejectClose: false,
        modal: true,
      });
      return;
    }

    const pcToOwnerMap = validPcs.reduce((acc, actor) => {
      const owner = activePlayers.find(
        (player) => actor.getUserLevel(player) >= 3,
      );
      acc[actor.id] = owner;
      return acc;
    }, {});

    const pcChoices = [];
    validPcs.forEach((actor) => {
      pcChoices.push({
        action: actor.id,
        label: actor.name,
        icon: "fas fa-user",
        callback: () => ({ pc: actor, owner: pcToOwnerMap[actor.id] }),
      });
    });

    const result = await foundry.applications.api.DialogV2.wait({
      title: "Friend Point Request",
      content: "Select a player to request a Friend Point from:",
      buttons: pcChoices,
      rejectClose: false,
      modal: true,
    });
    return result;
  }

  static async queryFriendPointFromUser(socket, message) {
    const pcAndOwner = await this.promptForFriendPointRequestTarget();
    console.log(pcAndOwner);
    if (!pcAndOwner) {
      this.log(
        false,
        "No valid targets were found or user cancelled Friend Point request target selection.",
      );
      return;
    }

    const result = await socket.executeAsUser(
      "FriendPoints.promptForFriendPoint",
      pcAndOwner.owner.id,
      pcAndOwner.pc,
      game.actors.get(message.speaker.actor).name,
    );
    this.log(false, `User responded with: ${result}`);
    if (result) {
      this.handleFriendPointReroll(message);
    }
  }

  static async handleFriendPointReroll(originalMessage) {
    if (!originalMessage.rolls?.length) {
      this.alwaysLoggedError("No Roll data found to reroll.");
      return;
    }

    const originalRoll = originalMessage.rolls[0];
    const diceTerms = originalRoll.dice;
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
        "Multiple dice results found; only single-die rolls are supported.",
      );
      return;
    }
    const originalResult = results[0];

    if (originalResult.discarded) {
      this.alwaysLoggedError("Original die was discarded; cannot reroll.");
      return;
    }

    const newRoll = await originalRoll.reroll();

    const discardedRollHtml = await originalRoll.render();
    const newRollHtml = await newRoll.render();

    // Prepare data for the wrapper template
    const wrapperData = {
      discardedRollHtml: discardedRollHtml,
      newRollHtml: newRollHtml,
    };

    const newContent = await renderTemplate(
      this.TEMPLATES.REROLL_WRAPPER,
      wrapperData,
    );

    // Delete the original message (to achieve the replacement effect)
    const newMessageData = {
      rolls: [newRoll.toJSON()],
      flavor: `(Rerolled with Friend Point) ${originalMessage.flavor}`,
      content: newContent,
    };
    const newMessage = originalMessage.clone(newMessageData);
    await ChatMessage.create(newMessage);
    await originalMessage.delete();
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
    FriendPoints.promptForFriendPoint,
  );

  console.log(
    "Your Module: Socket and promptForFriendPoint function registered.",
  );
});

Hooks.on("getChatMessageContextOptions", (application, menuItems) => {
  menuItems.push({
    name: "Request Friend Point for Reroll",
    icon: "<i class='fas fa-users'></i>",
    condition: (li) => {
      // Condition to only show this option on a Roll ChatMessage
      const message = game.messages.get(li.dataset.messageId);
      // Only show if the message has an associated Roll (check the system for the exact data path)
      const isRollMessage = message?.rolls?.length > 0;
      // Only show if the roll belongs to the current user
      const isCorrectUser = message?.getUserLevel(game.user) >= 3;
      return isRollMessage && isCorrectUser;
    }, // Always show the option
    callback: (li) => {
      const messageId = li.dataset.messageId;
      const message = game.messages.get(messageId);

      // This is where the core logic goes
      FriendPoints.queryFriendPointFromUser(moduleSocket, message);
    },
  });
});
