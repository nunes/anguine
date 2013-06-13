from google.appengine.ext import db
from anguine import GenericUser

class Task(db.Model):
    """
    Task model
    """
    description = db.StringProperty(required=True)
    label = db.StringProperty()
    owner = db.ReferenceProperty(GenericUser, required=True)
    created = db.DateTimeProperty(auto_now_add=True)
    edited = db.DateTimeProperty(auto_now=True)
