/*exports _G _R _V */

Event.observe(document, 'dom:loaded', function() {
    _G.initialize();

});

// _G: Global variables, functions and utilities holder
var _G = (function() {
    return {

        // Return global parent object
        global : (function() {
            return this;
        }()),

        initialize : function() {
            _G.initialized = false;

            _G.notification = $('notification');
            _G.notification_enabled = _G.notification != null;

            _G.loading_indicator = $('loading_indicator');
            _G.loading_indicator_enabled = _G.loading_indicator != null;

            _G.debug_enabled = _G.global.console != null;
            _G.console = _G.global.console;

            _G.channelOpened = false;

            _G.i18nInit();

            /* Document dimensions */
            _G.width = document.viewport.getDimensions().width;
            _G.height = document.viewport.getDimensions().height;

            /* Login initialization */
            $A(appConfig.socialLogins).each(function(socialNetworkName) {
                _G.debug('socialNetworkName: ' + socialNetworkName);
                if (_G.socialInitHandlers[socialNetworkName + 'LoginInit']) {
                    _G.debug('socialNetworkName,true: ' + socialNetworkName);
                    _G.socialInitHandlers[socialNetworkName + 'LoginInit']();
                }
            });

            _G.openChannel(appConfig.token);

            _G.debug('Application intialized');

            _G.initialized = true;

        },

        socialInitHandlers : {

            facebookLoginInit : function() {
                window.fbAsyncInit = function() {
                    FB.init({
                        appId : appConfig.facebook_app_id,
                        status : true,
                        cookie : true,
                        xfbml : true
                    });

                    FB.Event.subscribe('auth.logout', function(response) {
                        _G.eraseCookie('fbScreenName');
                        _G.eraseCookie('fbId');
                        _G.eraseCookie('fbEmail');

                        _G.windowReload();
                    });

                    FB.Event.subscribe('auth.login', function(response) {
                        FB.api('/me', function(response) {
                            _G.createSessionCookie('fbScreenName', response.name);
                            _G.createSessionCookie('fbId', response.id);
                            _G.createSessionCookie('fbEmail', response.email);

                            _G.windowReload();
                        });
                    });

                    FB.getLoginStatus(function(response) {
                        if (response.status === 'connected') {
                            $$('.facebook_logo_64').each(function(fbButton) {
                                $(fbButton).on('click', function(event) {
                                    FB.logout();
                                });
                            });
                        } else {
                            $$('.facebook_logo_64').each(function(fbButton) {
                                $(fbButton).on('click', function(event) {
                                    FB.login();
                                });
                            });
                        }
                    });

                };

                (function(d, debug) {
                    var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
                    if (d.getElementById(id)) {
                        return;
                    }
                    js = d.createElement('script');
                    js.id = id;
                    js.async = true;
                    js.src = "//connect.facebook.net/en_US/all" + (debug ? "/debug" : "") + ".js";
                    ref.parentNode.insertBefore(js, ref);
                }(document, false));
                
            },

            twitterLoginInit : function() {
                // TWITTER login initialization
                var login_button_buttons = $$('.twitter_logo');
                if (login_button_buttons != null) {
                    login_button_buttons.each(function(button) {
                        if (!button.id || button.id !== 'twitterLogout') {
                            twttr.anywhere(function(T) {
                                $(button).on('click', function() {
                                    T.signIn();
                                });
                            });
                        }
                    });
                }

                twttr.anywhere(function(T) {
                    T.bind("authComplete", function(e, user) {
                        var screenName = user.data('screen_name');
                        _G.createSessionCookie('twitterScreenName', screenName);
                        _G.windowReload();
                    });

                    T.bind("signOut", function(e) {
                        _G.eraseCookie('twitterScreenName');
                        _G.windowReload();
                    });
                });

                var twitterLogout = $('twitterLogout');
                if (twitterLogout) {
                    twitterLogout.on('click', function() {
                        twttr.anywhere.signOut();
                    });
                }

            },

            googleLoginInit : function() {
                // GOOGLE login initialization
                _G.debug('googleLoginInit');

                var login_button_buttons = $$('.login_button');
                if (login_button_buttons != null) {
                    login_button_buttons.each(function(button) {
                        if (button.id.indexOf('googleLogin') >= 0) {
                            button.on('click', function(event) {
                                window.location = appConfig.google_login_url;
                                Event.stop(event);
                            });
                        }
                    });
                }

                var googleLogout = $('googleLogout');
                if (googleLogout) {
                    googleLogout.on('click', function() {
                        window.location = appConfig.google_login_url;
                    });
                }
            },
        },

        i18nInit : function() {
            // i18n initialize
            if (typeof appConfig.app_language !== "undefined") {
                _G.app_language = appConfig.app_language;

            } else {
                _G.app_language = 'en';
            }

        },

        /* Debug function */
        debug : function(log_txt) {
            if (_G.debug_enabled) {
                _G.console.log(log_txt);
            }
        },

        notify : function(text, level) {
            if (_G.notification_enabled) {
                if (level) {
                    _G.notification.addClassName(level);
                }

                _G.notification.innerHTML = text;
                _G.notification.show();

                Effect.Fade.delay(0.5, _G.notification, {
                    duration : 1.0
                });

                Element.removeClassName.delay(2.0, _G.notification, level);
            }
        },

        indicator : function(enabled) {
            if (_G.loading_indicator_enabled) {
                if (enabled) {
                    _G.loading_indicator.show();

                } else {
                    _G.loading_indicator.hide();
                }
            }
        },

        windowReload : function() {
            _G.indicator(true);
            window.location.reload();
        },

        createCookie : function(cookieName, value, days) {
            if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                var expires = "; expires=" + date.toGMTString();
            } else
                var expires = "";
            document.cookie = cookieName + "=" + value + expires + "; path=/";
        },

        readCookie : function(cookieName) {
            var nameEQ = cookieName + "=";
            var ca = document.cookie.split(';');
            for ( var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ')
                    c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0)
                    return c.substring(nameEQ.length, c.length);
            }
            return null;
        },

        eraseCookie : function(cookieName) {
            _G.createCookie(cookieName, "", -1);
        },

        createSessionCookie : function(cookieName, value) {
            document.cookie = escape(cookieName) + "=" + escape(value) + "; path=/";
            return true;
        },

        readSessionCookie : function(cookieName) {
            var exp = new RegExp(escape(cookieName) + "=([^;]+)");
            if (exp.test(document.cookie + ";")) {
                exp.exec(document.cookie + ";");
                return unescape(RegExp.$1);
            } else
                return false;
        },

        trans : function(string) {
            var returnValue = '';
            if ((typeof _L !== "undefined") && (typeof _L[string] !== "undefined")) {
                _G.debug('translate: ' + _L['language']);
                returnValue = _L[string];

            } else {
                _G.debug('translate: no lang file');
                returnValue = string;

            }
            return returnValue;
        },

        generateId : function() {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for ( var i = 0; i < 5; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));

            return text;
        },

        extendWindowHandlers : function(myWindow) {
            myWindow.dialogs = $$('.formholder').collect(function(item) {
                return item.id;
            });
            myWindow = Object.extend(myWindow, _G.dialogHandlerFactory(myWindow.dialogs));

        },

        dialogHandlerFactory : function(myDialogs) {
            var dialogHandler = {};

            dialogHandler = {
                myDialogs : myDialogs,

                closeAllDialogs : function(except) {
                    var dialogs = $$('div.formholder');
                    dialogs.each(function(dialog) {
                        if (except !== dialog.id) {
                            dialogHandler.closeDialog(dialog.id);
                        }
                    });
                },

                closeDialog : function(dialog) {
                    Effect.Fade(dialog, {
                        duration : 0.5
                    });
                },

                anyDialogOpen : function(exceptDialog) {
                    var anyDialogOpen = false;
                    this.myDialogs.each(function(dialog) {
                        if (exceptDialog == null || exceptDialog != dialog) {
                            if ($(dialog)) {
                                anyDialogOpen = anyDialogOpen || $(dialog).visible();
                            }
                        }
                    });
                    return anyDialogOpen;
                },

                openDialog : function(openDialog, activate, inmediateOpen) {
                    myDialogs.each(function(dialog) {
                        if (openDialog !== dialog) {
                            $(dialog).hide();
                        }
                    });

                    if (inmediateOpen) {
                        delay = 0.0;
                    } else {
                        delay = 0.5;
                    }

                    Effect.Appear(openDialog, {
                        duration : delay,
                        afterFinish : function() {
                            var activateElement = $(activate);

                            if (activateElement) {
                                if (activateElement.focus) {
                                    activateElement.focus();
                                }

                                if (activateElement.setSelectionRange) {
                                    var len = activateElement.getValue().length * 2;
                                    activateElement.setSelectionRange(len, len);

                                } else {
                                    activateElement.setValue(activateElement.getValue());
                                }

                                this.scrollTop = 999999;

                            }
                        }
                    });

                }

            };

            return dialogHandler;
        },

        openChannel : function(mytoken) {
            if (typeof mytoken == 'undefined' || mytoken.length <= 0) {
                _G.debug('comunication token undefined or invalid');
                return;
            }

            var token = mytoken;

            _G.debug('openChannel: ' + mytoken);

            var channel = new goog.appengine.Channel(token);
            var handler = {
                'onopen' : function() {
                },
                'onmessage' : _G.onMessage,
                'onerror' : function() {
                },
                'onclose' : function() {
                }
            };
            var socket = channel.open(handler);
            socket.onopen = _G.onOpened;
            socket.onmessage = _G.onMessage;
        },

        onMessage : function(m) {
            Event.fire(window, 'channel:message', m);
        },

        onOpened : function() {
            _G.debug('opened channel');
            _G.channelOpened = true;
            Event.fire(window, 'channel:connected');
            Event.observe(window, 'channel:message', function(e) {
                _G.debug('channel message: ' + e.memo.data);
            });

        }

    };
}());

// _R: Remoting functions and utilities holder
var _R = (function() {
    return {
        AJAX_RESPONSE : 'result',

        RESULT_OK : 'OK',

        RESULT_ERROR : 'ERROR',

        pendingRequests : {},

        checkAjaxResponse : function(result) {
            return result.responseJSON && result.responseJSON[_R.AJAX_RESPONSE] === _R.RESULT_OK;
        },

        pendingRequestsOfMethod : function(methodName) {
            _G.debug('>>pendingRequestsOfMethod: ' + methodName);
            var result = {};

            _G.debug('this.pendingRequests: ' + methodName + ", " + JSON.stringify(_R.pendingRequests));

            $H(_R.pendingRequests).keys().each(function(requestId) {
                _G.debug('check: ' + requestId + ', ' + requestId.indexOf(methodName));
                if (requestId.indexOf(methodName) >= 0) {
                    _G.debug('set result: ' + requestId);
                    result[requestId] = true
                }
            });

            _G.debug('<<pendingRequestsOfMethod: ' + JSON.stringify(result));
            return result;
        },

        invoke : function(methodName, params, config) {
            var _methodName = methodName;

            var _config = config || {};

            var url = _config['url'];
            if (!url || url.length <= 0) {
                url = _methodName;
            }

            var successHandler = _config['successHandler'];

            var errorHandler = _config['errorHandler'];

            var method = _config['method'];
            if (!method || method.length <= 0) {
                method = 'post';
            }

            var requestId = _G.generateId();

            _G.debug('add to this.pendingRequests: ' + _methodName);

            _R.pendingRequests[_methodName + "_" + requestId] = true;

            _G.indicator(true);

            new Ajax.Request(url, {
                method : method,

                parameters : params,

                onFailure : function(result) {
                    _G.debug('ajax ' + _methodName + ' ERROR!!');

                    delete _R.pendingRequests[_methodName + "_" + requestId];

                    if ($H(_R.pendingRequests).keys().size() <= 0) {
                        _G.indicator(false);

                    }

                    if (errorHandler) {
                        errorHandler(result);
                    }

                },

                onSuccess : function(result) {
                    delete _R.pendingRequests[_methodName + "_" + requestId];

                    if ($H(_R.pendingRequests).keys().size() <= 0) {
                        _G.indicator(false);

                    }

                    if (_R.checkAjaxResponse(result)) {
                        _G.debug('ajax ' + _methodName + ' OK');
                        if (successHandler) {
                            successHandler(result.responseJSON);
                        }
                    } else {
                        _G.debug('ajax ' + _methodName + ' ERROR!!');
                        if (errorHandler) {
                            errorHandler(result);
                        }
                    }
                }
            });
        },

        formSubmit : function(params) {
            var formName = params['form'];

            var _methodName = params['name'];
            if (!_methodName || _methodName.length === 0) {
                _methodName = formName;
            }

            var successHandler = params['successHandler'];

            var errorHandler = params['errorHandler'];

            _G.debug('add to this.pendingRequests: ' + _methodName);

            var requestId = _G.generateId();

            _R.pendingRequests[_methodName + "_" + requestId] = true;

            _G.indicator(true);

            _G.debug('submit form: ' + formName);

            $(formName).request({
                onFailure : function(result) {
                    _G.debug('ajax ' + _methodName + ' ERROR!!');

                    delete _R.pendingRequests[_methodName + "_" + requestId];

                    if ($H(_R.pendingRequests).keys().size() <= 0) {
                        _G.indicator(false);

                    }

                    if (errorHandler) {
                        errorHandler(result);
                    }

                },

                onSuccess : function(result) {
                    _G.debug('ajax ' + _methodName + ' success');

                    delete _R.pendingRequests[_methodName + "_" + requestId];

                    if ($H(_R.pendingRequests).keys().size() <= 0) {
                        _G.indicator(false);

                    }

                    if (_R.checkAjaxResponse(result)) {

                        _G.debug('ajax ' + _methodName + ' OK');

                        if (successHandler) {
                            successHandler(result.responseJSON);
                        }

                    } else {
                        _G.debug('ajax ' + _methodName + ' ERROR!!');
                        if (errorHandler) {
                            errorHandler(result);
                        }
                    }

                }
            });
        },

        submitForm : function(formId, successHandler, errorHandler) {
            _R.formSubmit({
                form : formId,
                successHandler : successHandler,
                errorHandler : errorHandler
            });
        }

    };
}());

/* Global validation functions */
var _V = (function() {
    return {
        validMessage : "Ok",

        field : function(fieldName, onlyOnSubmit) {
            if (!onlyOnSubmit) {
                onlyOnSubmit = false;
            }
            return new LiveValidation(fieldName, {
                validMessage : this.validMessage,
                onlyOnSubmit : onlyOnSubmit
            });

        },

        buildSubmitHandler : function(formName, handler, allowEventPropagation) {
            return function(event) {

                if (!allowEventPropagation) {
                    Event.stop(event);
                }

                var form = LiveValidationForm.instances[formName];

                if (!form || LiveValidation.massValidate(form.fields)) {
                    if (handler) {
                        handler(event);
                    } else {
                        _G.debug('submit!!');
                    }
                }

                return false;
            };
        }
    }
}());

// script.aculo.us Custom SlideLeft Effect (like Horizontal SlideUpFades away)
Effect.SlideLeft = function(element) {
    element = $(element).cleanWhitespace();
    var oldInnerRight = element.down().getStyle('right');
    var elementDimensions = element.getDimensions();
    return new Effect.Scale(element, window.opera ? 0 : 1, Object.extend({
        scaleContent : false,
        scaleX : true,
        scaleY : false,
        scaleMode : 'box',
        scaleFrom : 100,
        scaleMode : {
            originalHeight : elementDimensions.height,
            originalWidth : elementDimensions.width
        },
        restoreAfterFinish : true,
        afterSetup : function(effect) {
            effect.element.makePositioned();
            effect.element.down().makePositioned();
            if (window.opera) {
                effect.element.setStyle({
                    left : ''
                });
            }
            effect.element.makeClipping().show();
        },
        afterUpdateInternal : function(effect) {
            effect.element.down().setStyle({
                right : (effect.dims[1] - effect.element.clientWidth) + 'px'
            });
        },
        afterFinishInternal : function(effect) {
            effect.element.hide().undoClipping().undoPositioned();
            effect.element.down().undoPositioned().setStyle({
                right : oldInnerRight
            });
        }
    }, arguments[1] || {}));
};

// script.aculo.us Custom SlideRight Effect (like Horizontal SlideDownAppears
// in)
Effect.SlideRight = function(element) {
    element = $(element).cleanWhitespace();
    // SlideRight need to have the content of the element wrapped in a container
    // element with fixed height!
    var oldInnerRight = element.down().getStyle('right');
    var elementDimensions = element.getDimensions();
    return new Effect.Scale(element, 100, Object.extend({
        scaleContent : false,
        scaleX : true,
        scaleY : false,
        scaleFrom : window.opera ? 0 : 1,
        scaleMode : {
            originalHeight : elementDimensions.height,
            originalWidth : elementDimensions.width
        },
        restoreAfterFinish : true,
        afterSetup : function(effect) {
            effect.element.makePositioned();
            effect.element.down().makePositioned();
            if (window.opera) {
                effect.element.setStyle({
                    left : ''
                });
            }
            effect.element.makeClipping().setStyle({
                width : '0px'
            }).show();
        },
        afterUpdateInternal : function(effect) {
            effect.element.down().setStyle({
                right : (effect.dims[1] - effect.element.clientWidth) + 'px'
            });
        },
        afterFinishInternal : function(effect) {
            effect.element.undoClipping().undoPositioned();
            effect.element.down().undoPositioned().setStyle({
                right : oldInnerRight
            });
        }
    }, arguments[1] || {}));
};
