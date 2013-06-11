from anguine import JSONHandler, login_required
from wtforms import validators
from wtforms.fields.core import StringField
from wtforms.form import Form

class TaskForm(Form):
    description = StringField('Description', [validators.Required(), validators.Length(min=0, max=25)])
    label = StringField('Label', [validators.Required(), validators.Length(min=0, max=25)])


class NewTask(JSONHandler):
    urls = ['/rest/task/add']

    @login_required
    def updateModel(self, *args, **kargs):
        form = TaskForm(self.request.form)

        if (form.validate() and self.current_user):
            return self.ok_response()
        
        else:
            return self.error_response()


