import os
import sys

root = os.path.split(__file__)[0]
sys.path.insert(0, os.path.join(root, 'lib'))


from application import models
import rest
from google.appengine.ext import webapp


application = webapp.WSGIApplication([('/rest/.*', rest.Dispatcher)])

rest.Dispatcher.base_url = "/rest"

rest.Dispatcher.add_models_from_module(models)
