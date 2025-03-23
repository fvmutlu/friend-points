Hooks.on("getChatLogEntryContext", (html, options) => {
    options.push({
        name: "My Module's First Function",
        icon: "<i class='fas fa-users'></i>", // Proper FontAwesome icon syntax
        condition: (li) => true, // Always show the option
        callback: (li) => {
            console.log("My Module's First Function clicked on:", li);
        }
    });
});
