from google.appengine.ext import db

class Task(db.Model):
    """
    Task model
    """
    description = db.StringProperty()
    label = db.StringProperty()
