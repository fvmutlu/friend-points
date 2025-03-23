Hooks.on("preCreateActor", (actor, data, options, userId) => {
    if (actor.type === "character") {
        const flags = foundry.utils.getProperty(actor, "flags") || {};
        if (!flags.customFlag) {
            actor.setFlag("friend-points", "customResource", { "value": 0, "max": 3 });
            console.log(`Updated actor ${actor.name} with custom resource.`);
        }
    }
});

// Ensure existing actors get the resource
Hooks.once("ready", async () => {
    for (let actor of game.actors) {
        if (actor.type === "character") {
            const flags = foundry.utils.getProperty(actor, "flags") || {};
            if (!flags.customFlag) {
                await actor.setFlag("friend-points", "customResource", { "value": 0, "max": 3 });
                console.log(`Updated actor ${actor.name} with custom resource.`);
            }
        }
    }
});