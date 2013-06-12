from google.appengine.ext import db

class Task(db.Model):
    """
    Task model
    """
    description = db.StringProperty(required=True)
    label = db.StringProperty()
    owner = db.UserProperty()
    created = db.DateTimeProperty(auto_now_add=True)
    edited = db.DateTimeProperty(auto_now=True)
