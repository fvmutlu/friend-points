export function addIconToSheet(app, html, data) {
    console.log("friend-points: The character sheet was rendered.");
    if (!data.actor) return;
    console.log("friend-points: Checking if user is owner.");
    if (data.owner) {
        console.log("friend-points: The current user is an owner of the actor.");
        // TODO: Style this element
        const button = $(`<a title="myButton"><i class="fas fa-users"></i> MYBUTTON</a>`);
        // TODO: Find correct place to place the element
        let titleEl = html.closest(".app").find(".window-title");
        // TODO: Add function for button clicks here
        if (!app.minimized) button.insertAfter(titleEl);
    }
}