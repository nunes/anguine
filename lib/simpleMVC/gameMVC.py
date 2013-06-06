# -*- coding: utf-8 -*-
"""
    Game MVC application
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    :copyright: (c) 2010 by Nuño Pereira.
    :license: BSD.
"""

import inspect
import logging

from google.appengine.ext import db
from google.appengine.ext.db import polymodel

from google.appengine.api import channel

from simpleMVC import SimpleMVCApp, JSONHandler, GenericUser


class BaseGame(polymodel.PolyModel):
    start = db.DateTimeProperty(auto_now_add=True)
    owner = db.ReferenceProperty(GenericUser, required=True)
    ip_address = db.StringProperty()

    @property
    def screen_channel_id(self):
        return 'screen-' + str(self.key().id())
    

class BaseGamePlayer(polymodel.PolyModel):
    game = db.ReferenceProperty(BaseGame, required=True)
    player = db.ReferenceProperty(GenericUser, required=True)
    ai_player = db.BooleanProperty(required=True, default=False)
    
    @property
    def player_channel_id(self):
        return 'player-' + str(self.key().id()) + '-game-' + str(self.game.key().id())
    
    

class GameApp(SimpleMVCApp):
    """
    Simple game application.
    """
    event_urls = (
        '/event/<event>', 'event',
    )

    def __init__(self, view_module, event_handler):
        try:
            frame = inspect.currentframe()
            f_back = frame.f_back
            name = f_back.f_globals['__name__']
            app_folder = inspect.getframeinfo(f_back)[0]
            logging.info('!!!!!!!!!Initialize app: %s', name)
            self.name = name
          
        finally:
            del frame, f_back

        super(GameApp, self).__init__(view_module, GameApp.event_urls, app_folder)
        
        class event(JSONHandler):
            def updateModel(self, *args, **kargs):
                logging.info("event!!!!args: %s", kargs)
                
                gameEventHandler = event_handler(self.request, self.current_user)
                
                return gameEventHandler.handle(kargs['event'], kargs)
        
        self.views['event'] = event
        
        self.event_handler = event_handler


class GameEventHandler(object):
    def __init__(self, request, current_user, game_id=None):
        self.request = request
        if (game_id is None):
            self.game = BaseGame.get_by_id(self.request.form.get('game_id', -1, type=int))
        else:
            self.game = BaseGame.get_by_id(int(game_id))
        self.current_user = current_user

    def handle(self, event, params):
        logging.info("handle %s, %s", event, hasattr(self, event))
        if hasattr(self, event):
            return getattr(self, event)(params)
    
    def send_message_screen(self, message):
        try:
            channel.send_message(self.game.screen_channel_id, str(message))
        except Exception:
            pass
    
    def send_message_player(self, player, message):
        try:
            channel.send_message(player.player_channel_id, 
                      str(message))
            
        except Exception:
            pass
    
