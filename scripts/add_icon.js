export function addIconToSheet(app, html, data) {
    console.log("friend-points: The character sheet was rendered.");
    if (!data.actor) return;
    console.log("friend-points: Checking if user is owner.");
    if (data.owner) {
        console.log("friend-points: The current user is an owner of the actor.");
        // TODO: Style this element
        const label = $(`<span class="label">Friend Points</span>`);
        // TODO: Model this after the Hero Points section
        const button = $(`<i class="fas fa-users"></i>`);
        let titleEl = html.closest(".app").find(".char-details .dots");
        // TODO: Add function for button clicks
        if (!app.minimized) {
            titleEl.append(label);
            titleEl.append(button);
        }
    }
}