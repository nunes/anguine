# -*- coding: utf-8 -*-
"""
    Anquine template application
    ----------------------------

    :copyright: (c) 2013 Nuño Pereira.
    :license: BSD.
"""

from languages import languages
from simpleMVC import SimpleMVCApp
from simpleMVC.applicationEvents import ON_USER_CREATED, ON_APP_START, ON_RENDER
from simpleMVC.simpleMVCConstants import FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, \
    TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET_KEY
import logging
import os
import tasks
import views

facebook_config = {
                   FACEBOOK_APP_ID: "166096493488014",
                   FACEBOOK_APP_SECRET: "dd8db8070f560c2ea71197e3cf246f9a"
                   }

twitter_config = {
                  TWITTER_CONSUMER_KEY: "n5FqwElIFc2fpGQL5tSLHw",
                  TWITTER_CONSUMER_SECRET_KEY: "duJrNQOIXcPUFAWrEw1KeKAL3xaP2HhIBaiSDGGRQc"
                  }

version_str = 'v0.' + os.environ['CURRENT_VERSION_ID'][:os.environ['CURRENT_VERSION_ID'].index('.')]

url_handler_modules = [views, tasks]

application_events_config = {  # ON_USER_CREATED: templateBoard.create_dashboard,
                                 # ON_APP_START: start.initialize_app,
                                 # ON_RENDER: render.render_url_handler
                                 }

application = SimpleMVCApp(url_handler_modules=url_handler_modules,
                            facebook_social_config=facebook_config,
                            twitter_social_config=twitter_config,
                            application_events_config=application_events_config,
                            languages_config=languages,
                            version=version_str
                            )
