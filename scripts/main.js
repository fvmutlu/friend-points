import { addIconToSheet } from "./add_icon.js";

Hooks.on("init", function () {
    console.log("friend-points: This code runs once the Foundry VTT software begins its initialization workflow.");
});

Hooks.on("ready", function () {
    console.log("friend-points: This code runs once core initialization is ready and game data is available.");
});

Hooks.on("renderCharacterSheetPF2e", (app, html, data) => { addIconToSheet(app, html, data); });