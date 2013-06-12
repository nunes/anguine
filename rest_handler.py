import os
import sys

root = os.path.split(__file__)[0]
sys.path.insert(0, os.path.join(root, 'lib'))

import rest
from application import models
from google.appengine.api import users
from google.appengine.ext import webapp


class OwnerAuthorizer(rest.Authorizer):

    def can_read(self, dispatcher, model):
        if(model.owner != users.get_current_user()):
            dispatcher.not_found()

    def filter_read(self, dispatcher, models):
        return self.filter_models(models)

    def check_query(self, dispatcher, query_expr, query_params):
        query_params.append(users.get_current_user())
        if(not query_expr):
            query_expr = 'WHERE owner = :%d' % (len(query_params))
        else:
            query_expr += ' AND owner = :%d' % (len(query_params))
        return query_expr

    def can_write(self, dispatcher, model, is_replace):
        if(not model.is_saved()):
            # creating a new model
            model.owner = users.get_current_user()
        elif(model.owner != users.get_current_user()):
            dispatcher.not_found()

    def filter_write(self, dispatcher, models, is_replace):
        return self.filter_models(models)

    def can_delete(self, dispatcher, model_type, model_key):
        query = model_type.all().filter("owner = ", users.get_current_user()).filter("__key__ = ", model_key)
        if(len(query.fetch(1)) == 0):
            dispatcher.not_found()

    def filter_models(self, models):
        cur_user = users.get_current_user()
        models[:] = [model for model in models if model.owner == cur_user]
        return models


application = webapp.WSGIApplication([('/rest/.*', rest.Dispatcher)])

rest.Dispatcher.base_url = "/rest"

rest.Dispatcher.add_models_from_module(models)

rest.Dispatcher.authorizer = OwnerAuthorizer()
