from gaesessions import get_current_session
import rest
from google.appengine.ext import webapp

class OwnerAuthorizer(rest.Authorizer):
    """
    Owner authorizer for REST
    """

    def can_read(self, dispatcher, model):
        session = get_current_session()
        if(model.owner.key() != session["current_user"].key()):
            dispatcher.not_found()

    def filter_read(self, dispatcher, models):
        return self.filter_models(models)

    def check_query(self, dispatcher, query_expr, query_params):
        session = get_current_session()
        query_params.append(session["current_user"].key())
        if(not query_expr):
            query_expr = 'WHERE owner = :%d' % (len(query_params))
        else:
            query_expr += ' AND owner = :%d' % (len(query_params))
        return query_expr

    def can_write(self, dispatcher, model, is_replace):
        session = get_current_session()

        if(not model.is_saved()):
            # creating a new model
            model.owner = session["current_user"]

        elif(model.owner.key() != session["current_user"].key()):
            dispatcher.not_found()

    def filter_write(self, dispatcher, models, is_replace):
        return self.filter_models(models)

    def can_delete(self, dispatcher, model_type, model_key):
        session = get_current_session()
        query = model_type.all().filter("owner = ", session["current_user"].key()).filter("__key__ = ", model_key)
        if(len(query.fetch(1)) == 0):
            dispatcher.not_found()

    def filter_models(self, models):
        session = get_current_session()
        current_user = session["current_user"]
        models[:] = [model for model in models if model.owner.key() == current_user.key()]
        return models


class RestApplication(webapp.WSGIApplication):
    """
    Rest application handler
    """
    def __init__(self, models=None):
        rest.Dispatcher.base_url = "/rest"
        
        rest.Dispatcher.add_models_from_module(models)
        
        rest.Dispatcher.authorizer = OwnerAuthorizer()
        
        webapp.WSGIApplication.__init__(self, [('/rest/.*', rest.Dispatcher)])
