var Window = {
    dialogs : [ 'loginContainer' ],

    loginHandler : function(event) {
        Event.stop(event);

        Window.openDialog('loginContainer');

    },

    initialize : function() {
        _G.extendWindowHandlers(Window);

        /* Keyboard handlers */
        Event.on(document, 'keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Window.closeAllDialogs();
            }
        });

        $('loginButton').on('click', Window.loginHandler);

        $('loginUrl').on('click', Window.loginHandler);

        $('closeLogin').on('click', function() {
            Window.closeDialog('loginContainer');

        });

        $$('.home_right_column img').each(function(item) {
            item.on('click', function(event) {
                Event.stop(event);

                Window.openDialog('loginContainer');

            });
        });

    }

};

Event.on(document, 'dom:loaded', function() {

    Window.initialize();

});
