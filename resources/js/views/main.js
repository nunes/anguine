/*global _G _R _C  Validate unescape*/

/*exports Window */

Event.observe(document, 'dom:loaded', function() {
    if (_G.initialized) {
        Window.initialize();

    } else {
        Window.initialize.delay(0.1);

    }
});

/* Main window handler */

var Window = {

    currentFolder : 0,

    currentPath : '',

    parentFolder : 0,

    installedSearchServices : {},

    installedSearchServicesAlias : {},

    searchService : null,

    initialize : function() {
        _G.debug('>>initialize');

        Modernizr.load({
            test : Modernizr.borderradius && Modernizr.boxshadow,
            nope : '/css/style-borderradius-polyfill.css'
        });

        _G.extendWindowHandlers(Window);

        Window.initializeForms();

        Window.initializeTabs();

        if (typeof appConfig.current_folder_id !== "undefined") {
            Window.currentFolder = appConfig.current_folder_id;
        }

        Window.getUserPreferences();

        Window.updateDashboard(true);

        _G.debug('<<initialize');
    },

    addApplicationFormSubmit : function(event) {
        $('applicationFolder').value = Window.currentFolder;

        var url = $('url').getValue();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }

        $('_url').setValue(url);

        _R.submitForm('addApplicationForm', function(responseJSON) {
            Window.closeAllDialogs();
            _G.notify.delay(0.7, 'Application installed', 'normal');
            Form.reset.delay(1.0, $('addApplicationForm'));
            Window.updateDashboard(false, false);
        });

    },

    folderFormSubmit : function(event) {
        $('parentFolder').value = Window.currentFolder;

        var resultMessage = $('folderForm').readAttribute('result');

        _R.submitForm('folderForm', function() {
            Window.closeAllDialogs();
            _G.notify.delay(0.2, resultMessage, 'normal');

            Form.reset.delay(1.0, $('folderForm'));
            Window.updateDashboard(false, false);
            Window.getInstalledSearchServices();

        }, function(result) {
            _G.notify.delay(0.2, 'Error: ' + result.responseJSON['ERROR_MSG'], 'error');
        });

    },

    searchApplicationFormSubmit : function(event) {
        _G.debug('>>searchApplicationFormSubmit');
        _R.submitForm('searchApplicationForm', function(responseJSON) {

            _G.debug('pendingRequestsOfMethod: '
                    + $H(_R.pendingRequestsOfMethod('searchApplicationForm')).keys().size());

            if ($H(_R.pendingRequestsOfMethod('searchApplicationForm')).keys().size() <= 0) {
                _G.debug('searchApplicationForm: createAppsTable');
                Window.createAppsTable(responseJSON['applications'], responseJSON['installed_applications']);

            } else {
                _G.debug('searchApplicationForm: update');
                $('searchResults').update();

            }
        });
        _G.debug('>>searchApplicationFormSubmit');

    },

    deleteFormSubmit : function(event) {
        var resultMessage = $('deleteForm').readAttribute('resultMessage');
        _R.invoke('delete', {}, {
            url : $('deleteForm').readAttribute('action'),
            successHandler : function() {
                Window.closeAllDialogs();
                _G.notify.delay(0.7, resultMessage, 'normal');
                Window.updateDashboard(false, false);

            }
        });
    },

    searchDashboardItemsFormSubmit : function(event) {
        _G.debug('>>searchDashboardItemsFormSubmit');

        var searchText = $('searchText').getValue();

        if (Window.searchService && searchText.split(" ").length > 0) {
            _G.debug('>>searchServiceName: ' + Window.searchService.name);

            var searchForm = $('searchForm' + Window.searchService.name);

            var formInput = new Element('input', {
                'type' : 'hidden',
                'name' : Window.searchService.form_input_name,
                'value' : searchText,
            });

            if (!searchForm) {
                searchForm = new Element('form', {
                    'action' : Window.searchService.form_action,
                    'method' : Window.searchService.form_method,
                    'target' : '_blank',
                    'display' : 'none',
                    'id' : 'searchForm' + Window.searchService.name
                });

                searchForm.insert(formInput);

                document.body.insert(searchForm);

            } else {
                searchForm.getInputs().each(function(formInput) {
                    formInput.remove();
                });

                searchForm.insert(formInput);

            }

            searchForm.submit();

            $('searchText').setValue('');

            Window.searchService = null;

        } else {
            Window.openDashboardItem(event);

        }

        _G.debug('<<searchDashboardItemsFormSubmit');

    },

    searchDashboardItems : function(event) {
        _G.debug('>>searchDashboardItems');

        var searchTextValue = $('searchText').getValue();

        if (searchTextValue == null || searchTextValue.length <= 0) {
            return;
        }

        var searchEngine = Window.getSearchEngine();

        if (searchEngine && !Window.searchService) {
            if (!$('searchEngineLabel')) {
                var element = new Element('div', {
                    id : 'searchEngineLabel'
                });
                document.body.appendChild(element);
                element.innerHTML = _G.trans("Press TAB to search on ") + searchEngine.name;
                element.clonePosition($('searchText'), {
                    offsetTop : 30
                });
            }
        }

        if (Window.searchService) {
            return;
        }

        var dashboardAnimation = $$('.searchResults').length <= 0;

        if (dashboardAnimation) {
            Element.setOpacity('dashBoard', 0.5);
        }

        _R.submitForm('searchDashboardItemsForm', function(responseJSON) {
            _G.debug('>>searchDashboardItems: responseOK');
            _G.debug('pendingRequestsOfMethod: '
                    + $H(_R.pendingRequestsOfMethod('searchDashboardItemsForm')).keys().size());

            if ($H(_R.pendingRequestsOfMethod('searchDashboardItemsForm')).keys().size() <= 0) {
                _G.debug('searchDashboardItemsForm: createAppsTable');

                if (dashboardAnimation) {
                    $('dashBoard').hide();

                    Element.setOpacity('dashBoard', 1.0);

                }

                Window.createAppsTable(responseJSON['applications'], responseJSON['installed_applications'],
                        'dashBoard', -1, true);

                if (dashboardAnimation) {
                    $('dashBoard').appear({
                        duration : 0.3
                    });

                }

            } else {
                $('searchResults').update();

            }
        });

        _G.debug('<<searchDashboardItems');

    },

    installApp : function(id, folder) {
        _A.installApp(id, folder, function() {
            Window.closeAllDialogs();

            _G.notify.delay(0.7, _G.trans('App installed'), 'normal');

            Form.reset.delay(1.0, $('searchApplicationForm'));

            Element.update.delay(1.0, $('searchResults'));

            Window.updateDashboard(false, false);
        }, null);

    },

    moveElement : function(elementId, destinationFolderId) {
        _A.moveElement(elementId, destinationFolderId, function() {
            _G.notify.delay(0.7, _G.trans('Element moved'), 'normal');
            Window.updateDashboard(false, false);

        }, function(result) {
            _G.notify.delay(0.7, 'Element not moved: ' + result.responseJSON['ERROR_MSG'], 'error');
            Window.updateDashboard();

        });
    },

    updatePreferences : function(event) {
        _R.submitForm('preferencesForm', function(responseJSON) {
            var previousLanguage = Window.userPreferences['language'];
            Window.userPreferences = responseJSON['user_preferences'];

            Window.closeAllDialogs();
            _G.notify.delay(0.7, 'Preferences updated', 'normal');

            Form.reset.delay(1.0, $('preferencesForm'));
            if (previousLanguage != Window.userPreferences['language']) {
                window.location.reload();
            }

        });
    },

    getInstalledSearchServices : function() {
        _G.debug('>>getInstalledSearchServices');

        _R.invoke.delay(0.2, 'installedSearchServices', {}, {
            url : '/installedSearchServices',
            method : 'get',
            successHandler : function(responseJSON) {
                Window.installedSearchServices = {};
                Window.installedSearchServicesAlias = {};

                $A(responseJSON['searchServices']).each(function(item) {
                    _G.debug('search service: ' + item['name']);

                    Window.installedSearchServices[item['name']] = item;
                    Window.installedSearchServicesAlias[item['alias']] = item;

                });
            }
        });
    },

    searchEngineFormSubmit : function(event) {
        var searchForm = new Element('form', {
            'action' : '/updateInstalledSearchEngines',
            'id' : 'updateInstalledSearchEngines',
            'method' : 'post'
        });

        searchForm.setStyle({
            display : 'none',
            visibility : 'hidden'
        });

        seachEnginesCtrlHolder.select('input[type="checkbox"][checked]').each(function(item) {
            var formInput = new Element('input', {
                'type' : 'text',
                'name' : 'searchId',
                'display' : 'none',
                'visibility' : 'hidden',
                'value' : item.getAttribute('data-search-id'),
            });

            formInput.setStyle({
                display : 'none',
                visibility : 'hidden'
            });

            searchForm.insert(formInput);

        });

        document.body.insert(searchForm);

        _R.submitForm('updateInstalledSearchEngines', function(responseJSON) {
            Window.closeAllDialogs();

            searchForm.remove();

            _G.notify.delay(0.7, _G.trans('Search engines updated'), 'normal');

            Window.getInstalledSearchServices();

        });

    },

    getSearchEngine : function() {
        _G.debug('>>getSearchEngine');

        var searchTextValue = $('searchText').getValue();
        var searchItems = searchTextValue.split(" ");

        _G.debug('>>searchItems: ' + searchItems.length);

        var searchService = null;

        if (searchItems.length > 0) {
            searchService = Window.installedSearchServicesAlias[searchItems[0]];

        }

        _G.debug('<<getSearchEngine: false');
        return searchService;

    },

    changeSearchButton : function() {
        if (Window.searchService) {
            var manageSearchButton = $('manageSearchButton');

            if (manageSearchButton) {
                var str = 'url(\'/images/binocular_arrow.png\')';

                if (Window.searchService['favicon_url']) {
                    str = 'url(\'' + Window.searchService['favicon_url'] + '\')';

                }

                manageSearchButton.setStyle({
                    backgroundImage : str,
                    backgroundPosition : '0px 0px',
                    backgroundSize : '32px 32px'
                });
            }

            var searchText = $('searchText');
            if (searchText) {
                searchText.addClassName('wide');
            }

            searchText.value = searchText.value
                    .substring(Window.searchService['alias'].length, searchText.value.length);

            $$('.hideSearch').each(function(element) {
                element.hide();
            });

        }
    },

    cleanSearchFavicon : function() {
        var manageSearchButton = $('manageSearchButton');
        _G.debug('clean favicon');

        manageSearchButton.setStyle({
            backgroundImage : null,
            backgroundSize : null,
            backgroundPosition : null
        });

        if ($('searchEngineLabel')) {
            $('searchEngineLabel').remove();
        }

        var searchText = $('searchText');
        if (searchText) {
            searchText.removeClassName('wide');
        }

        $$('.hideSearch').each(function(element) {
            element.show();
        });

    },

    getUserPreferences : function() {
        _A.getUserPreferences(function(response) {
            Window.userPreferences = response['user_preferences'];
        });
    },

    importFileFormSubmit : function() {
        _G.debug(">>importFileFormSubmit");

        Window.closeAllDialogs();

        Form.reset.delay(1.0, $('importFileForm'));

        Window.updateDashboard(false, false);

        _G.notify.delay(0.5, _G
                .trans('Started importing your links, you will receive a mail when the import has finished'), 'normal');

        _G.debug("<<importFileFormSubmit");
    },

    initializeForms : function() {
        window.onpopstate = function(event) {
            if (event.state) {
                Window.currentFolder = event.state["currentFolder"];
                Window.updateDashboard();
            }
        };

        /* searchApplicationForm */
        $('searchApplicationForm').on('submit',
                _V.buildSubmitHandler('searchApplicationForm', Window.searchApplicationFormSubmit));

        $('cancelSearchAplication').on('click', function() {
            Window.closeDialog('applicationFormHolder');
            Element.update.delay(1.0, $('searchResults'));

        });

        Event.on($('searchApplicationForm'), 'keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Element.update.delay(1.0, $('searchResults'));
            }
        });

        Event.on($('submitSearchApplication'), 'keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                $('searchResults').update();
            }
        });

        /* addApplicationForm */
        $('addApplicationForm').on('submit',
                _V.buildSubmitHandler('addApplicationForm', Window.addApplicationFormSubmit));

        var nameValidation = _V.field('name');

        nameValidation.add(Validate.Presence, {
            failureMessage : _G.trans('Application name is required')
        });

        var urlValidation = _V.field('url');
        urlValidation.add(Validate.Presence, {
            failureMessage : _G.trans('Application url is required')
        });

        urlValidation.add(Validate.Custom, {
            failureMessage : _G.trans('Application url is not valid'),
            against : function(value, args) {
                var testValue = value;
                if (!testValue.startsWith('http://') && !testValue.startsWith('https://')) {
                    testValue = 'http://' + testValue;
                }
                return /^(http:\/\/|https:\/\/|ftp:\/\/|www.){1}([0-9A-Za-z]+\.)/.test(testValue);
            }
        });

        $('addApplication').on('click', function(event) {
            Window.openDialog('applicationFormHolder', 'nameSearch');
            Event.stop(event);
            return false;
        });

        $('addApplication').on('keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Window.openDialog('applicationFormHolder', 'nameSearch');
                Event.stop(event);
                return false;
            }
        });

        $('cancelAddAplication').on('click', function() {
            Window.closeDialog('applicationFormHolder');

        });

        /* folderForm */

        $('folderForm').on('submit', _V.buildSubmitHandler('folderForm', Window.folderFormSubmit));

        var folderNameValidation = _V.field('folderName', true);
        folderNameValidation.add(Validate.Presence, {
            failureMessage : 'Folder name is required'
        });

        $('addFolder').on('click', function(event) {
            $('folderForm').writeAttribute('action', '/addFolder');
            $('folderForm').writeAttribute('result', _G.trans('Folder created'));
            $('folderFormTitle').innerHTML = _G.trans('New folder');
            $('folderName').value = '';
            $('folderNameLabel').innerHTML = _G.trans('Folder name');
            $('folderNameFormHont').innerHTML = _G.trans('Folder name.');

            Window.openDialog('folderContainer', 'folderName');
            Event.stop(event);
            return false;
        });

        $('cancelFolder').on('click', function() {
            Window.closeDialog('folderContainer');

        });

        /* preferencesForm */
        $('preferencesForm').on('submit', _V.buildSubmitHandler('preferencesForm', Window.updatePreferences));

        $('preferencesLink').on('click', function(event) {
            _A.getUserPreferences(function(response) {
                Window.openDialog('preferencesContainer', 'cancelPreferences');

                var openAppsSameWindowInput = $('openAppsSameWindow');

                if (openAppsSameWindowInput) {
                    if (response['user_preferences']['openAppsSameWindow']) {
                        openAppsSameWindowInput.writeAttribute('checked', 'true');
                    } else {
                        openAppsSameWindowInput.writeAttribute('checked', null);

                    }
                }

                if (response['user_preferences']['language'] || 'en' == language || 'es' == language) {
                    var language = response['user_preferences']['language'];
                    if ('en' == language) {
                        $('languageEnglish').setAttribute('checked', true);
                        $('languageSpanish').removeAttribute('checked');

                    } else if ('es' == language) {
                        $('languageSpanish').setAttribute('checked', true);
                        $('languageEnglish').removeAttribute('checked');

                    }

                } else {
                    $('languageEnglish').setAttribute('checked', true);
                    $('languageSpanish').removeAttribute('checked');
                }

            });
            Event.stop(event);
            return false;
        });

        $('cancelPreferences').on('click', function() {
            Window.closeDialog('preferencesContainer');

        });

        $('cancelPreferences').on('keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Window.closeDialog('preferencesContainer');
            }

        });

        /* deleteForm */
        $('deleteForm').on('submit', _V.buildSubmitHandler('deleteForm', Window.deleteFormSubmit));

        $('cancelDelete').on('click', function() {
            Window.closeDialog('deleteContainer');

        });

        $('cancelDelete').on('keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Window.closeDialog('deleteContainer');
            }
        });

        /* searchInstalledApp */
        $('searchButton').on('click', function(event) {
            Window.searchDashboardItems();
            Event.stop(event);
            return false;
        });

        $('searchDashboardItemsForm').on('submit',
                _V.buildSubmitHandler('searchDashboardItemsForm', Window.searchDashboardItemsFormSubmit));

        $('searchDashboardItemsForm').on('keyup', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Window.cleanSearchResults();
                Window.hideSearchDashboardItems();

            }
        });

        $('searchDashboardItemsForm').on('click', function(event) {
            Event.stop(event);
            return false;
        });

        new Form.Element.Observer('searchText', 0.1, function(el, value) {
            var callDelay = (value.split(" ").length > 1) ? 0.4 : 1.0;

            var callable = function() {
                var textValue = $('searchText').value;

                if (textValue == value) {
                    if (value.length > 0) {
                        _G.debug('search for: ' + value);
                        Window.searchDashboardItems();

                    } else if (!Window.searchService) {
                        Window.cleanSearchResults();
                        Window.hideSearchDashboardItems();
                        Window.applications = [];
                    }
                }
            }

            callable.delay(callDelay);
        });

        /* home */
        $('home').on('click', function(event) {
            Window.navigateToFolder(0, '/-/');
        });

        Droppables.add($('home'), {
            accept : 'draggable',
            hoverclass : 'draggableHover',
            onDrop : function(draggable, droppable, overlapping) {

                var elementId = '';
                var appLauncherMenu = draggable.down('.appLauncherMenu');
                if (appLauncherMenu != null && appLauncherMenu.id != null) {
                    elementId = appLauncherMenu.id.split('_')[1];
                }
                if (appLauncherMenu == null) {
                    var folderMenu = draggable.down('.folderMenu');
                    if (folderMenu != null && folderMenu.id != null) {
                        elementId = folderMenu.id.split('_')[2];
                    }
                }

                var folderId = '0';

                if (elementId != null && folderId != null) {
                    Window.moveElement(elementId, folderId);
                    draggable.hide();
                }
            }
        });

        /* up */
        $('up').on('click', function(event) {
            Window.navigateToFolder(-1, null);
        });

        /* Keyboard handlers */
        Event.on(document, 'keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Window.closeAllDialogs();
            }
        });

        Event.on(document, 'keydown', function(event) {

            var keyCode = String.fromCharCode(event.which);

            if (Object.isUndefined(keyCode)) {
                keyCode = event.keyCode;
            }

            if (event.keyCode === Event.KEY_TAB) {
                Event.stop(event);
                Window.searchService = Window.getSearchEngine();

                Window.cleanSearchFavicon();
                Window.changeSearchButton();

            }

            if (/[a-zA-Z0-9-_ ]/.test(keyCode) && !event.ctrlKey) {
                if (!Window.anyDialogOpen() && $$('#searchText:focus').length <= 0) {
                    $('searchText').focus();
                }
            }
        });

        Event.on(document, 'keypress', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Window.closeAllDialogs();

            } else if (event.keyCode === Event.KEY_RETURN) {
                // Do nothing here

            } else {
                if (!Window.anyDialogOpen('searchDashboardItems')) {

                    Window.applications = [];

                }
            }
        });

        $(document).on('click', function(event) {
            $$('.appLauncherMenu, .folderMenu').each(function(element) {
                if (element.visible()) {
                    Effect.SlideLeft(element, {
                        duration : 0.2
                    });
                }
            });

        });

        /* searchEnginesForm */
        $('cancelSearchEngine').on('click', function() {
            Window.closeDialog('searchEngineContainer');

        });

        $('cancelSearchEngine').on('keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Window.closeDialog('searchEngineContainer');
            }

        });

        $('manageSearchButton').on('click', function(event) {

            _A.getDashboardSearchServices(function(response) {

                var seachEnginesCtrlHolder = $('seachEnginesCtrlHolder');

                seachEnginesCtrlHolder.update();

                response['searchServices'].each(function(item, index) {
                    var label = new Element('label').update(item['name']);

                    seachEnginesCtrlHolder.insert(label);

                    var input = new Element('input', {
                        'class' : 'textInput',
                        'type' : 'checkbox',
                        'data-search-id' : item['id'],
                    });

                    if (Window.installedSearchServices[item['name']]) {
                        input.setAttribute('checked', true);

                    }

                    seachEnginesCtrlHolder.insert(input);

                    seachEnginesCtrlHolder.insert(new Element('p', {
                        'class' : 'formHint'
                    }).update(_G.trans('Search engine enabled/disabled')));

                    seachEnginesCtrlHolder.insert(new Element('br'));

                });

                Window.openDialog('searchEngineContainer', 'cancelSearchEngine');
            });

        });

        $('searchEngineForm').on('submit', _V.buildSubmitHandler('searchEngineForm', Window.searchEngineFormSubmit));

        Window.getInstalledSearchServices();

        /* importFileForm */
        var fileValidation = _V.field('importFile');

        fileValidation.add(Validate.Presence, {
            failureMessage : _G.trans('Import file is required')
        });

        $('importFileForm').on('submit', _V.buildSubmitHandler('importFileForm', Window.importFileFormSubmit, true));

        $('importLinks').on('click', function(event) {
            Window.openDialog('importFileContainer', 'cancelImportFile');
            Event.stop(event);
            return false;
        });

        $('cancelImportFile').on('keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                Window.closeDialog('importFileContainer');
            }

        });

        $('cancelImportFile').on('click', function() {
            Window.closeDialog('importFileContainer');

        });

    },

    initializeTabs : function() {
        new Control.Tabs('tabs_addApplication');

    },

    createAppsTable : function(applications, installed_applications, searchResultsName, results, hideDetails) {
        if (!searchResultsName) {
            searchResultsName = 'searchResults';
        }
        var searchResults = $(searchResultsName);

        if (!results) {
            results = -1;
        }

        Window.applications = applications;

        if (applications.length > 0) {

            searchResults.update();

            var list = new Element('ul', {
                'class' : 'searchResults'
            });

            applications.each(function(application, index) {
                if (results < 0 || index < results) {
                    var isAppInstalled = (installed_applications.indexOf(parseInt(application['id'])) < 0);
                    var isFolder = application['isFolder'];

                    var element = new Element('li', {
                        'appUrl' : application['url']
                    });

                    var href = application['url'];
                    if (isFolder) {
                        href = application['name'];
                    }

                    var title = new Element('a', {
                        'href' : href,
                    }).update(application['name']);

                    if (isFolder) {
                        title.observe('click', function(event) {
                            Window.openFolderInstalled(application['id'], application['name']);
                            Event.stop(event);
                            return false;
                        });

                    } else {
                        title.observe('click', function(event) {
                            Event.stop(event);
                            Window.openApplicationInstalled(application['url'], event.ctrlKey);
                        });
                    }

                    element.insert(new Element('p').update(title));

                    var img = null;
                    if (application['favicon_url'] && application['favicon_url'].length > 0) {
                        img = new Element('img', {
                            'src' : application['favicon_url'],
                            'class' : 'appLauncherIcon imageButton'
                        });
                        element.insert(img);

                    } else {
                        if (isFolder) {
                            img = new Element('div', {
                                'class' : 'appLauncherIcon imageButton sprite sprite-folder leftFloat'
                            });
                            element.insert(img);

                        } else {
                            img = new Element('div', {
                                'class' : 'appLauncherIcon imageButton sprite sprite-application leftFloat'
                            });
                            element.insert(img);
                        }

                    }

                    if (img && isFolder) {
                        img.observe('click', function(event) {
                            Window.openFolderInstalled(application['id'], application['name']);
                        });
                    } else {
                        img.observe('click', function(event) {
                            Window.openApplicationInstalled(application['url'], event.ctrlKey);
                        });
                    }

                    if (!hideDetails) {
                        if (isAppInstalled) {
                            var installButton = new Element('button', {
                                'type' : 'button',
                                'class' : 'primaryAction'
                            }).update('Install');

                            installButton.on('click', function(event) {
                                Window.installApp(application['id'],

                                Window.currentFolder);
                            });

                        } else {
                            var installButton = new Element('button', {
                                'type' : 'button',
                                'class' : 'installed'
                            }).update('Installed');
                        }
                    }

                    element.insert(new Element('div', {
                        'class' : 'searchButtonContainer buttonHolder'
                    }).insert(installButton));
                    list.insert(element);

                }
            });

            searchResults.insert(list);

        } else {
            if ($('searchText').getValue().empty()) {
                Window.cleanSearchResults();
                Window.hideSearchDashboardItems();

            } else {
                searchResults.update();
                searchResults.insert(new Element('p', {
                    'class' : 'searchResults'
                }).update('No apps found'));
            }
        }

    },

    openDeleteFolder : function(folder) {
        $('deleteFormTitle').update(_G.trans('Delete folder ') + folder['name'] + '?');
        $('deleteForm').writeAttribute('action', '/deleteFolder/' + folder['id']);
        $('deleteForm').writeAttribute('resultMessage', _G.trans('Folder deleted'));
        Window.openDialog('deleteContainer', 'cancelDelete');

    },

    openRenameFolder : function(id, name) {
        $('folderForm').writeAttribute('action', '/renameFolder/' + id);
        $('folderForm').writeAttribute('result', _G.trans('Folder renamed'));
        $('folderFormTitle').innerHTML = _G.trans('Rename Folder');
        $('folderName').value = name;
        $('folderNameLabel').innerHTML = _G.trans('Folder name');
        $('folderNameFormHont').innerHTML = _G.trans('Folder name.');

        Window.openDialog('folderContainer', 'folderName');

    },

    openRenameAppLauncher : function(id, name) {
        $('folderForm').writeAttribute('action', '/renameAppLauncher/' + id);
        $('folderForm').writeAttribute('result', 'Application launcher renamed');
        $('folderFormTitle').innerHTML = _G.trans('Rename application launcher');
        $('folderName').value = name;
        $('folderNameLabel').innerHTML = _G.trans('Laucher name');
        $('folderNameFormHont').innerHTML = _G.trans('Laucher name.');

        Window.openDialog('folderContainer', 'folderName');

    },

    navigateToFolder : function(id, path) {
        _G.debug('navigate to folder, id: ' + id + ', path: ' + path);

        if (id < 0) {
            var url = new Element('a');
            url.href = window.location.href;

            _G.debug('Window.parentFolder: ' + Window.parentFolder);
            _G.debug('Window.currentFolder: ' + Window.currentFolder);
            // back to previous folder

            var doHistoryBack = Window.currentFolder !== Window.parentFolder;

            Window.currentFolder = Window.parentFolder;

            if (doHistoryBack) {
                var newPath = url.pathname.substring(0, url.pathname.lastIndexOf('/'));

                if (!newPath || newPath.length <= 0 || newPath === '/-') {
                    newPath = '/-/';
                }

                _G.debug('newPath 0: ' + newPath + ' url.pathname: ' + url.pathname);

                Window.updateDashboard(true);

            } else {
                Window.updateDashboard(true);

            }

        } else {
            // Go to folder or home
            _G.debug('goto page: ' + id);

            var doPushState = Window.currentFolder != id;

            Window.currentFolder = id;

            var mypath = path;
            if (!mypath.startsWith('/')) {
                mypath = mypath + "/";
            }

            Window.updateDashboard(doPushState);

        }

    },

    updateDashboard : function(doPushState, animateTransition) {
        var currentFolder = Window.currentFolder;

        _G.debug('>>updateDashboard');

        doPushState = typeof doPushState !== 'undefined' ? doPushState : false;
        animateTransition = typeof animateTransition !== 'undefined' ? animateTransition : true;

        if (animateTransition) {
            Element.setOpacity('dashBoard', 0.5);

        }

        _R.invoke.delay(0.2, 'updateDashboard', {}, {
            url : '/updateDashboard/' + currentFolder,
            method : 'get',
            successHandler : function(responseJSON) {

                _G.debug('))updateDashboard');

                Window.hideSearchDashboardItems();

                $('dashBoard').update();

                if (animateTransition) {
                    Element.setOpacity('dashBoard', 1.0);
                    $('dashBoard').hide();

                }

                Window.parentFolder = responseJSON['parentFolderId'];

                Window.currentPath = responseJSON['currentPath'];

                Window.dashboardFolders = responseJSON['dashboardFolders'];

                Window.dashboardAppLaunchers = responseJSON['dashboardAppLaunchers'];

                Window.drawFolders(responseJSON['dashboardFolders']);

                Window.drawAppLaunchers(responseJSON['dashboardAppLaunchers']);

                if (animateTransition) {
                    $('dashBoard').appear({
                        duration : 0.3
                    });
                }

                Window.updateUpIcon();

                Window.drawPath(responseJSON['folderPath']);

                if (doPushState && Modernizr.history) {
                    history.pushState({
                        'currentFolder' : Window.currentFolder,
                        'parentFolder' : Window.parentFolder
                    }, null, Window.currentPath);
                }

                _G.debug('((updateDashboard');
            }
        });

        _G.debug('<<updateDashboard');

    },

    drawFolders : function(folders) {
        folders.each(function(folder) {

            var folderElement = new Element('div', {
                'class' : 'folder draggable'
            });

            $('dashBoard').insert(folderElement);

            new Draggable(folderElement, {
                revert : true,
                onStart : function(draggable, mouseEvent) {
                    folderElement.addClassName('been_dragged');
                }
            });

            Droppables.add(folderElement, {
                accept : 'draggable',
                hoverclass : 'draggableHover',
                onDrop : function(draggable, droppable, overlapping) {
                    _G.debug("onDrop: " + draggable);

                    var elementId = '';
                    var appLauncherMenu = draggable.down('.appLauncherMenu');
                    if (appLauncherMenu != null && appLauncherMenu.id != null) {
                        elementId = appLauncherMenu.id.split('_')[1];
                    }
                    if (appLauncherMenu == null) {
                        var folderMenu = draggable.down('.folderMenu');
                        if (folderMenu != null && folderMenu.id != null) {
                            elementId = folderMenu.id.split('_')[2];
                        }
                    }

                    var folderId = '';
                    var folderMenu = droppable.down('.folderMenu');
                    if (folderMenu != null && folderMenu.id != null) {
                        folderId = folderMenu.id.split('_')[2];
                    }

                    if (elementId != null && folderId != null) {
                        Window.moveElement(elementId, folderId);
                        draggable.hide();
                    }
                }

            });

            var folderIcon = new Element('div', {
                'alt' : folder['name'],
                'class' : 'imageButton sprite sprite-folder'
            });

            folderElement.insert({
                top : folderIcon
            });

            folderIcon.on('click', function(event) {
                Event.stop(event);
                if (!folderElement.hasClassName('been_dragged')) {
                    Window.navigateToFolder(folder['id'], folder['name']);
                } else {
                    event.preventDefault();
                    folderElement.removeClassName('been_dragged');
                }

            });

            var folderName = new Element('span').update(folder['name']);
            folderElement.insert(folderName);
            folderName.on('click', function(event) {
                Event.stop(event);
                if (!folderElement.hasClassName('been_dragged')) {
                    Window.navigateToFolder(folder['id'], folder['name']);
                } else {
                    event.preventDefault();
                    folderElement.removeClassName('been_dragged');
                }

            });

            var folderMenu = new Element('div', {
                'id' : 'folder_menu_' + folder['id'],
                'class' : 'folderMenu',
                'style' : 'display: none;'
            });

            folderElement.insert({
                top : folderMenu
            });

            var renameFolder = new Element('div', {
                'alt' : 'edit',
                'title' : _G.trans('edit'),
                'class' : 'toolImg sprite sprite-edit'
            });

            renameFolder.on('click', function(event) {
                Window.openRenameFolder(folder['id'], folder['name']);

            });

            folderMenu.insert({
                top : renameFolder
            });

            var deleteFolder = new Element('div', {
                'alt' : 'delete',
                'title' : _G.trans('delete'),
                'class' : 'toolImg sprite sprite-delete'
            });

            deleteFolder.on('click', function(event) {
                Window.openDeleteFolder(folder);

            });

            folderMenu.insert({
                top : deleteFolder
            });

            var configureFolderButton = new Element('button', {
                'alt' : 'configure',
                'title' : _G.trans('configure'),
                'class' : 'toolImg sprite sprite-wrench'
            });

            configureFolderButton.on('click', function(event) {
                _G.debug('click configureFolderButton');
                _G.debug($('folder_menu_' + folder['id']).visible());
                if (!$('folder_menu_' + folder['id']).visible()) {
                    Event.stop(event);
                    Effect.SlideRight('folder_menu_' + folder['id'], {
                        duration : 0.2
                    });
                }

            });

            folderElement.insert({
                top : configureFolderButton
            });

        });

    },

    drawAppLaunchers : function(appLaunchers) {
        _G.debug('>>drawAppLaunchers');
        appLaunchers.each(function(appLauncher, index) {

            var appLauncherElement = new Element('div', {
                'class' : 'applicationLauncher draggable'
            });

            new Draggable(appLauncherElement, {
                revert : true,
                onStart : function(draggable, mouseEvent) {
                    appLauncherElement.addClassName('been_dragged');
                }
            });

            var appLauncherText = new Element('span').update(appLauncher['name']);
            appLauncherElement.update(appLauncherText);
            appLauncherText.on('click', function(event) {
                if (!appLauncherElement.hasClassName('been_dragged')) {
                    Window.openApplication(appLauncher, event.ctrlKey);
                } else {
                    event.preventDefault();
                    appLauncherElement.removeClassName('been_dragged');
                }
            });

            var iconUrl = appLauncher['favicon_url'];
            if (!iconUrl || iconUrl.length <= 0) {
                iconUrl = '/images/application.png';
            }

            var appLauncherIcon = new Element('img', {
                'alt' : appLauncher['name'],
                'src' : iconUrl,
                'class' : 'appLauncherIcon imageButton'
            });

            appLauncherIcon.on('click', function(event) {
                if (!appLauncherElement.hasClassName('been_dragged')) {
                    Window.openApplication(appLauncher, event.ctrlKey);
                } else {
                    event.preventDefault();
                    appLauncherElement.removeClassName('been_dragged');
                }
            });

            appLauncherElement.insert({
                top : appLauncherIcon
            });

            var appLauncherMenu = new Element('div', {
                'id' : 'menu_' + appLauncher['id'],
                'class' : 'appLauncherMenu',
                'style' : 'display: none;'
            });

            appLauncherElement.insert({
                top : appLauncherMenu
            });

            var deleteAppLauncherButton = new Element('button', {
                'alt' : 'delete',
                'title' : _G.trans('delete'),
                'class' : 'toolImg sprite sprite-delete'
            });

            appLauncherMenu.insert({
                top : deleteAppLauncherButton
            });

            deleteAppLauncherButton.on('click', function(event) {
                _G.debug('click uninstallApp');

                $('deleteFormTitle').update(_G.trans('Uninstall application ') + appLauncher['name'] + '?');
                $('deleteForm').writeAttribute('action', '/uninstallApp/' + appLauncher['id']);
                $('deleteForm').writeAttribute('resultMessage', _G.trans('App uninstalled'));
                Window.openDialog('deleteContainer', 'cancelDelete');

            });

            var renameAppLauncherButton = new Element('button', {
                'alt' : 'rename',
                'title' : _G.trans('rename'),
                'class' : 'toolImg sprite sprite-edit'
            });

            appLauncherMenu.insert({
                top : renameAppLauncherButton
            });

            renameAppLauncherButton.on('click', function(event) {
                Window.openRenameAppLauncher(appLauncher['id'], appLauncher['name']);

            });

            var viewAppLauncherButton = new Element('button', {
                'alt' : 'view',
                'title' : _G.trans('view'),
                'class' : 'toolImg sprite sprite-info'
            });

            appLauncherMenu.insert({
                top : viewAppLauncherButton
            });

            viewAppLauncherButton.on('click', function(event) {
                window.location = appLauncher['view_app_url'];

            });

            var configureAppLauncherButton = new Element('button', {
                'alt' : 'configure',
                'title' : _G.trans('configure'),
                'class' : 'toolImg sprite sprite-wrench'
            });

            configureAppLauncherButton.on('click', function(event) {
                _G.debug('click configureAppLauncherButton');
                _G.debug($('menu_' + appLauncher['id']).visible());
                if (!$('menu_' + appLauncher['id']).visible()) {
                    Event.stop(event);
                    Effect.SlideRight('menu_' + appLauncher['id'], {
                        duration : 0.2
                    });
                }

            });

            appLauncherElement.insert({
                top : configureAppLauncherButton
            });

            $('dashBoard').insert(appLauncherElement);

            if (index === 0) {
                if (appLauncherElement.activate) {
                    appLauncherElement.activate();
                }

            }

        });

        _G.debug('<<drawAppLaunchers');
    },

    updateUpIcon : function() {
        if (Window.parentFolder === Window.currentFolder) {
            $('up').addClassName('sprite-up_disabled');
            $('up').removeClassName('sprite-up');

        } else {
            $('up').addClassName('sprite-up');
            $('up').removeClassName('sprite-up_disabled');

        }

    },

    drawPath : function(folderPath) {

        var path = $('path');

        path.update();
        path.insert('> ');

        $(folderPath).each(function(folder, index) {
            _G.debug('path folder: ' + folder.name + ', id: ' + folder.id);
            if (folder.id > 0) {
                var element = new Element('span', {
                    'class' : 'pathElement'
                }).update(unescape(folder.name));

                element.on('click', function(event) {
                    Window.navigateToFolder(folder.id, folder.name);
                });

                Droppables.add(element, {
                    accept : 'draggable',
                    hoverclass : 'draggableHover',
                    onDrop : function(draggable, droppable, overlapping) {
                        _G.debug("onDrop: " + draggable);

                        var elementId = '';
                        var appLauncherMenu = draggable.down('.appLauncherMenu');
                        if (appLauncherMenu != null && appLauncherMenu.id != null) {
                            elementId = appLauncherMenu.id.split('_')[1];
                        }

                        if (elementId == null || elementId.length == 0) {
                            var folderMenu = draggable.down('.folderMenu');
                            if (folderMenu != null && folderMenu.id != null) {
                                elementId = folderMenu.id.split('_')[2];
                            }
                        }

                        var folderId = folder.id;

                        _G.debug("elementId: " + elementId);
                        _G.debug("folderId: " + folderId);

                        if (elementId != null && folderId != null) {
                            Window.moveElement(elementId, folderId);
                            draggable.hide();
                        }
                    }

                });

                if (index > 1) {
                    path.insert(' > ');
                }
                path.insert(element);
            }
        });

    },

    openApplicationUrl : function(appUrl, openNewWindow) {
        _G.debug('>>openApplicationUrl, openNewWindow: ' + openNewWindow);
        if (!appUrl.startsWith('http') && !appUrl.startsWith('https')) {
            appUrl = 'http://' + appUrl;
        }

        if (appUrl.lastIndexOf('.') <= 0) {
            appUrl = appUrl + '.com';
        }

        if (Window.userPreferences['openAppsSameWindow'] === true || openNewWindow) {
            _G.debug('open parent: ' + appUrl);
            window.open(appUrl, '_parent');

        } else {
            _G.debug('open blank: ' + appUrl);
            window.open(appUrl, '_blank');

        }
        _G.debug('<<openApplicationUrl');
    },

    openApplication : function(appLauncher, openNewWindow) {
        var appUrl = appLauncher['url'];
        return Window.openApplicationUrl(appUrl, openNewWindow);

    },

    cleanSearchResults : function() {
        var dashboardItemsSearchResults = $$('.searchResults');

        if (dashboardItemsSearchResults != null && dashboardItemsSearchResults.length > 0) {
            Window.updateDashboard();
        }
    },

    openApplicationInstalled : function(url, openNewWindow) {
        _G.debug('>>openApplicationInstalled url: ' + url);
        Window.closeAllDialogs();
        Window.openApplicationUrl(url, openNewWindow);

        Window.cleanSearchResults();
        Window.hideSearchDashboardItems();
        _G.debug('<<openApplicationInstalled');
    },

    openFolderInstalled : function(folderId, folderName) {
        Window.closeAllDialogs();
        Window.navigateToFolder(folderId, folderName);
        Window.hideSearchDashboardItems();
    },

    hideSearchDashboardItems : function() {
        _G.debug('>>hideSearchDashboardItems: ' + $('searchText').getValue());

        $('searchText').setValue('');
        $('searchResults').update();
        Window.applications = [];

        Window.cleanSearchFavicon();

        Window.searchService = null;

        _G.debug('<<hideSearchDashboardItems');
    },

    openDashboardItem : function(event) {
        _G.debug('>>openDashboardItem');
        if (Window.applications && Window.applications.length > 0) {
            var application = Window.applications[0];

            if (application['isFolder']) {
                Window.openFolderInstalled(application['id'], application['name']);
                Window.hideSearchDashboardItems();

            } else {
                var url = application['url'];
                _G.debug('>>url: ' + url);
                if (url != null && url.length > 0) {
                    _G.debug('>>call openApplicationInstalled: ' + event);
                    Window.openApplicationInstalled(url, event.ctrlKey);
                    Window.hideSearchDashboardItems();

                }

            }
        } else {
            if ($('searchText') && !$('searchText').getValue().empty()) {
                Window.searchDashboardItems(event);
            }
        }
        _G.debug('<<openDashboardItem');
    }

};
