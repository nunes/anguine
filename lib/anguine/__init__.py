# -*- coding: utf-8 -*-
"""
    anguine mvc
    ~~~~~~~~~
    Simple python app engine mvc framework

    :copyright: (c) 2013 by Nuño Pereira
"""
from anguine.anguineConstants import FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, \
    TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET_KEY
from anguine.applicationEvents import ON_USER_CREATED, ON_APP_START, ON_RENDER
from functools import wraps
from google.appengine.api import channel, users
from google.appengine.ext import db
from google.appengine.runtime.apiproxy_errors import ApplicationError
from jinja2 import Environment, FileSystemLoader, contextfunction
from os import path
from werkzeug.exceptions import HTTPException, MethodNotAllowed, NotImplemented, \
    NotFound
from werkzeug.local import Local
from werkzeug.routing import Map, Rule
from werkzeug.utils import redirect
from werkzeug.wrappers import BaseRequest, AcceptMixin, BaseResponse
import datetime
import hashlib
import inspect
import json
import logging
import re
import sys
import utilModel
import utilString


def login_required(func):
    """
    Login required decorator
    """
    @wraps(func)
    def decorated_view(self, *args, **kwargs):
        if not self.current_user:
            return {'redirect': 'login'}
        return func(self, *args, **kwargs)
    return decorated_view


def admin_required(func):
    """
    Admin required decorator
    """
    @wraps(func)
    def decorated_view(self, *args, **kwargs):
        if not self.current_user or not self.current_user.admin:
            return {'redirect': 'login'}
        return func(self, *args, **kwargs)
    return decorated_view


class GenericUser(db.Model):
    """
    Generic user saved as App Engine Model
    """
    name = db.StringProperty()
    nickname = db.StringProperty()
    email = db.StringProperty()
    enabled = db.BooleanProperty()
    fb_access_token = db.StringProperty()
    fb_id = db.StringProperty()
    twitter_id = db.StringProperty()
    created = db.DateTimeProperty(auto_now_add=True)
    updated = db.DateTimeProperty(auto_now=True)
    admin = db.BooleanProperty()
    last_login = db.DateTimeProperty(auto_now_add=True)

    twitter_login = False
    facebook_login = False
    google_login = False

    @property
    def is_admin(self):
        return self.admin

class Request(BaseRequest, AcceptMixin):
    """
    Encapsulates a request.
    """


class Response(BaseResponse):
    """
    Encapsulates a response.
    """


class BaseUrlHandler(object):
    """
    Baseclass for views.
    """

    def __init__(self, app, req):
        name = self.__class__.__name__
        logging.info('!!!!!!!!!Initialize view: %s', name)
        self.name = name

        self.app = app
        self.request = req

    def get(self):
        raise MethodNotAllowed()
    post = delete = put = get

    def head(self):
        return self.get()

    def renderText(self, text=None):
        """
        Render text, left for debugging purposes
        """
        return Response(text)

    def on_user_created(self):
        if self.app.app_event_handlers and ON_USER_CREATED in self.app.app_event_handlers:
            self.app.app_event_handlers[ON_USER_CREATED](self._current_user)
        pass

    def on_render(self):
        if (self.app.app_event_handlers and ON_RENDER in self.app.app_event_handlers):
            result = self.app.app_event_handlers[ON_RENDER](self)
            return result if result else {}
        else:
            logging.info("no render handler")
            return {}

    @property
    def current_user(self):
        """
        Get current user
        """
        if not hasattr(self, "_current_user"):
            self._current_user = None

            google_user = users.get_current_user()

            if google_user:
                logging.info("google_user")
                self._current_user = GenericUser.all().filter("email = ", google_user.email()).get()
                if (not self._current_user):
                    self._current_user = GenericUser(\
                                email=google_user.email(), enabled=True,
                                name=google_user.nickname(), nickname=google_user.nickname(),
                                admin=users.is_current_user_admin())
                    self._current_user.put()
                    self.on_user_created()
                self._current_user.google_login = True
                self._current_user.myLogin = True

            fb_cookie = self.request.cookies.get("fbsr_" + self.app.facebook_options[FACEBOOK_APP_ID], "")
            fb_id = self.request.cookies.get('fbId', "")

            if fb_cookie and fb_id:
                logging.info("fb_user")
                if not self._current_user:
                    self._current_user = GenericUser.gql("WHERE fb_id = :1", fb_id).get()

                if not self._current_user:
                    nickname = None
                    email = None

                    if 'fbScreenName' in self.request.cookies:
                        nickname = self.request.cookies['fbScreenName']

                    if 'fbEmail' in self.request.cookies:
                        email = self.request.cookies['fbEmail']

                    self._current_user = GenericUser(
                                fb_id=str(fb_id),
                                name=nickname,
                                email=email,
                                enabled=True,
                                nickname=nickname,
                                fb_access_token=None,
                                admin=False)
                    self._current_user.put()
                    self.on_user_created()

                if self._current_user:
                    self._current_user.facebook_login = True

            else:
                twitter_cookie = None
                twitter_cookie = self.request.cookies.get('twitter_anywhere_identity')

                if twitter_cookie:
                    logging.info("twitter_user")
                    logging.info("twitter_cookie: %s", twitter_cookie)

                    if len(twitter_cookie.partition(":")) > 2:

                        twitter_consumer_secret_key = self.app.twitter_options[TWITTER_CONSUMER_SECRET_KEY]

                        twitter_id = str(twitter_cookie.partition(":")[0])

                        twitter__hash_base = twitter_id + twitter_consumer_secret_key
                        user_hash = hashlib.sha1(twitter__hash_base).hexdigest()

                        cookie_hash = twitter_cookie.partition(":")[2]

                        cookie_valid = user_hash == cookie_hash

                        if cookie_valid:
                            if not self._current_user:
                                self._current_user = GenericUser.gql("WHERE twitter_id = :1", twitter_id).get()

                            if not self._current_user:
                                if 'twitterScreenName' in self.request.cookies:
                                    twitterScreenName = self.request.cookies['twitterScreenName']
                                if 'twitterScreenName' not in self.request.cookies or not twitterScreenName:
                                    twitterScreenName = twitter_id
                                self._current_user = GenericUser(
                                    twitter_id=twitter_id,
                                    enabled=True,
                                    nickname=twitterScreenName,
                                    admin=False)
                                self._current_user.put()
                                self.on_user_created()

                            if self._current_user:
                                self._current_user.twitter_login = True
            if (self._current_user):
                if ((datetime.datetime.now() - self._current_user.last_login) > datetime.timedelta(days=1)):
                    self._current_user.last_login = datetime.datetime.now()
                    self._current_user.put()
                    logging.info("user login!!!!!!!!!")

        return self._current_user

    def render(self):
        raise NotImplemented()

    def send_message(self, message):
        if self.current_user and self.current_user.nickname:
            channel.send_message(self.current_user.nickname, json.dumps(message))


class JSONHandler(BaseUrlHandler):
    """
    JSON base class for our views.
    """

    AJAX_RESULT = 'result'

    RESULT_OK = 'OK'

    RESULT_ERROR = 'ERROR'

    ERROR_MSG = 'ERROR_MSG'

    ERROR_CODE = 'ERROR_CODE'

    def ok_response(self, params=None):
        result = {self.AJAX_RESULT: self.RESULT_OK}
        if params:
            result.update(params)
        return result

    def error_response(self, errorMsg="", errorCode='0'):
        return {self.AJAX_RESULT: self.RESULT_ERROR,
                    self.ERROR_MSG: errorMsg,
                    self.ERROR_CODE: errorCode}

    def getModel(self, *args, **kargs):
        raise NotImplemented()

    def updateModel(self, *args, **kargs):
        raise NotImplemented()

    def post(self, *args, **kargs):
        return self.render(self.updateModel(*args, **kargs))

    def get(self, *args, **kargs):
        return self.render(self.getModel(*args, **kargs))

    def render(self, my_object=None):
        # return Response(_(text))
        return Response(json.dumps(my_object), content_type="application/json")


class TemplateView(BaseUrlHandler):
    """
    Template base class for our views.
    """

    @property
    def screen_name(self):
        return utilString.lower_first_camel_word(self.__class__.__name__)

    @property
    def script_name(self):
        return 'views/' + self.screen_name + '.js'

    @property
    def processing_name(self):
        return self.screen_name + '.pjs'

    @property
    def template_name(self):
        return utilString.lower_first_camel_word(self.__class__.__name__) + '.html'

    def view(self, *args, **kargs):
        raise NotImplemented()

    def update(self, *args, **kargs):
        raise NotImplemented()

    def post(self, *args, **kargs):
        params = self.update(*args, **kargs)
        if params.has_key('redirect'):
            return self.redirect(**params)
        else:
            return self.render(params)

    def get(self, *args, **kargs):
        params = self.view(*args, **kargs)
        if params.has_key('redirect'):
            return self.redirect(**params)
        else:
            return self.render(params)

    def redirect(self, **kargs):
        url_name = kargs['redirect']
        kargs['redirect'] = None
        return redirect(self.app.url_for(url_name, **kargs))

    def render(self, params):
        g_user = users.get_current_user()

        generic_user = self.current_user

        if g_user:
            url = users.create_logout_url(self.request.url)
            url_linktext = 'logout'

            generic_user = GenericUser.all().filter("email = ", g_user.email()).get()

        else:
            url = users.create_login_url(self.request.url)
            url_linktext = 'login / register'

        script = None
        if not hasattr(self, 'script') or self.script:
            script = self.script_name
        logging.error("script: %s", script)

        if params.has_key('processing'):
            processing = params['processing']
        else:
            processing = False

        if processing:
            processing = self.processing_name

        self.token = None
        if self.current_user:
            self.user_hash = self.current_user.nickname

        logging.info("call render_values")
        params.update(self.on_render())

        logging.info("languages: %s", self.app.available_languages)
        logging.info("default: %s", self.app.default_language)

        language = params['user_language'] if 'user_language' in params else None
        logging.info("language, from user_language: %s", language)

        language = self.request.accept_languages.best[0:2] if not language and self.request.accept_languages.best else language
        logging.info("language, from accept_languages: %s", language)

        hostname = self.request.headers['host']
        hostname_tld = hostname[hostname.rfind('.') + 1:]
        hostname_tld = hostname_tld[:hostname_tld.rfind(':')] if hostname_tld.rfind(':') > 0 else hostname_tld

        language = hostname_tld if not language else language
        logging.info("language, from hostname_tld: %s", language)

        language = self.app.default_language if language not in self.app.available_languages else language
        logging.info("language, check with available: %s", language)

        logging.info("language: %s", language)

        render_template_values = {
              'url': url,
              'url_linktext': url_linktext,
              'user': generic_user,
              'facebook_app_id': self.app.facebook_options[FACEBOOK_APP_ID],
              'twitter_consumer_key': self.app.twitter_options[TWITTER_CONSUMER_KEY],
              'script': script,
              'processing': processing,
              'version': self.app.version,
              'user_language': language,
        }

        if self.token:
            render_template_values.update({'token': self.token})

        params.update(render_template_values)

        if (not hasattr(self, 'content_type')):
            self.content_type = 'text/html'

        return Response(self.app.jinja_env.get_template(self.template_name)\
                        .render(LANGUAGE=language, **params), \
                                mimetype=self.content_type)


class TaskHandler(BaseUrlHandler):
    """
    Task base class for tasks url handlers.
    """

    def post(self, *args, **kargs):
        self.execute(*args, **kargs)
        return self.render()

    def get(self, *args, **kargs):
        raise NotImplemented()

    @admin_required
    def execute(self, *args, **kargs):
        raise NotImplemented()

    def render(self):
        return Response()


class AnguineApp(object):
    """
    An interface to application.
    """

    def __init__(self, url_handler_modules=[], application_events_config={}, facebook_social_config={}, twitter_social_config={},
                    languages_config={}, version='0.1'):
        app_folder = None
        try:
            frame = inspect.currentframe()
            f_back = frame.f_back
            name = f_back.f_globals['__name__']
            app_folder = inspect.getframeinfo(f_back)[0]
            logging.info('!!!!!!!!!Initialize app: %s', name)
            self.name = name

        finally:
            del frame, f_back

        self.version = version

        self.local = Local()

        self._urls = []

        self.views = {}

        self.facebook_options = facebook_social_config
        self.twitter_options = twitter_social_config

        for url_handler_module in url_handler_modules:
            self.add_url_handler_module(url_handler_module)

        self.urls = {}
        for i in xrange(0, len(self._urls), 2):
            self.urls[self._urls[i + 1]] = self._urls[i]

        self.template_path = path.join(path.dirname(app_folder), '../resources/templates')

        self.jinja_env = Environment(loader=FileSystemLoader(self.template_path),
                                     extensions=['jinja2.ext.i18n'])

        self.language_path = path.dirname(app_folder)
        sys.path.append(self.language_path)
        logging.info("language_path: %s", self.language_path)

        languages = languages_config
        self.languages = languages
        self.available_languages = languages.keys()
        self.available_languages.remove('default')
        self.default_language = languages.get('default', 'en')

        @contextfunction
        def gettext(context, string):
            language = context.get('LANGUAGE', 'en')

            return languages.get(language, {}).get(string, string)


        @contextfunction
        def ngettext(context, s, p, n):
            language = context.get('LANGUAGE', 'en')

            if n != 1:
                return languages.get(language, {}).get(p, p)
            return languages.get(language, {}).get(s, s)

        self.jinja_env.install_gettext_callables(gettext, ngettext, newstyle=True)


        def url_for(endpoint, _external=False, **values):
            return self.local.url_adapter.build(endpoint, values, force_external=_external)
        self.jinja_env.globals['url_for'] = url_for
        self.url_for = url_for

        def url_image(_external=False, **values):
            return self.local.url_adapter.build('images', values, force_external=_external)
        self.jinja_env.globals['url_image'] = url_image
        self.url_image = url_image


        self.url_map = Map([
            Rule('/css/<file>', endpoint='css', build_only=True),
            Rule('/js/<file>', endpoint='js', build_only=True),
            Rule('/img/<file>', endpoint='images', build_only=True),
            Rule('/processing/<file>', endpoint='processing', build_only=True),
            Rule('/flash/<file>', endpoint='flash', build_only=True),
            Rule('/sound/<file>', endpoint='sound', build_only=True),

        ])

        url_map = [(self._urls[i], self._urls[i + 1])
                     for i in xrange(0, len(self._urls), 2)]

        for key, view in self.views.iteritems():
            if (hasattr(view, 'urls')):
                logging.info('add view.urls: %s', view.urls)
                for url in view.urls:
                    url_map.append((url, key))

        for regex, view in url_map:
            logging.info("regex: %s, view: %s", regex, view)
            self.url_map.add(Rule(regex, endpoint=view))

        self.app_event_handlers = application_events_config

        self.on_app_start()


    def on_app_start(self):
        if self.app_event_handlers and ON_APP_START in self.app_event_handlers:
            self.app_event_handlers[ON_APP_START](self)
        pass


    def handle_not_found(self, request=None):
        resp = Response('Not found')
        resp.status_code = 404
        return resp


    def handle_other_error(self, request=None):
        resp = Response('Other error')
        resp.status_code = 500
        return resp


    def add_url_handler_module(self, url_handler_module):
        views = [view_class
                     for (name, view_class) in inspect.getmembers(url_handler_module, inspect.isclass)
                        if (issubclass(view_class, TemplateView) or issubclass(view_class, JSONHandler)
                            or issubclass(view_class, TaskHandler))]

        for view in views:
            if (hasattr(view, '__name__')):
                self.views[view.__name__[0].lower() + view.__name__[1:]] = view


    def __call__(self, environ, start_response):
        req = None

        try:
            req = Request(environ)
            self.local.url_adapter = self.url_map.bind_to_environ(environ)

            endpoint, args = self.local.url_adapter.match()
            logging.info("endpoint: %s, args: %s", endpoint, args)

            if endpoint is not None:
                if req.method not in ('GET', 'HEAD', 'POST',
                                      'DELETE', 'PUT'):
                    raise NotImplemented()
                view = self.views[endpoint](self, req)
                resp = getattr(view, req.method.lower())(**args)

            else:
                raise NotFound()

        except NotFound:
            logging.info("NotFound")
            resp = self.handle_not_found(req)

        except HTTPException:
            logging.info("HTTPException")
            resp = self.handle_other_error(req)

        return resp(environ, start_response)

