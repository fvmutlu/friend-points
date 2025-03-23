import { addIconToSheet } from "./add_icon.js";

Hooks.on("renderCharacterSheetPF2e", (app, html, data) => { addIconToSheet(app, html, data); });