from anguine import TemplateView, login_required, utilString
from anguine.anguineConstants import ADMIN_MAIN
from google.appengine.api import mail
from wtforms.fields.core import StringField
from wtforms.fields.simple import TextAreaField
from wtforms.form import Form
import logging
from gaesessions import get_current_session

"""
Application server side views
"""

class Login(TemplateView):
    """
    Login view
    """
    urls = ['/login']

    def view(self):
        if (self.current_user):
            return {'redirect': 'main'}

        else:
            return {}


class Index(TemplateView):
    """
    Index view
    """
    urls = ['/']

    def view(self, folder=None):
        return {}


class About(TemplateView):
    """
    About view
    """
    urls = ['/about']
    script = False

    def view(self):
        return {}


class Contact(TemplateView):
    """
    Contact view
    """
    urls = ['/contact']

    class ContactForm(Form):
        email = StringField('Email', default='')
        name = StringField('Name', default='')
        message = TextAreaField('Message', default='')


    def view(self):
        form = Contact.ContactForm()
        return {'form': form}

    def update(self):
        form = Contact.ContactForm(self.request.form)

        if form.validate():

            message = mail.EmailMessage(sender=form.email.data,
                                        subject="Contact form submit")

            message.to = ADMIN_MAIN
            message.body = "From User: %s\nEmail: %s\nUser message: %s\n" % (
                                form.name.data,
                                form.email.data,
                                form.message.data)
            
            logging.info("message: %s", message.body);

            message.send()

            return {'redirect': 'contact'}
        else:
            return {'errors': form.errors}


class Main(TemplateView):
    """
    Main view
    """
    urls = ['/main']

    @login_required
    def view(self, path=None):
        self.current_user
        session = get_current_session()
        logging.warning("session: %s", session.sid)
        return {}


class Sitemap(TemplateView):
    """
    Generate Sitemap.xml
    """
    urls = ['/sitemap.xml']
    content_type = 'text/xml'

    @property
    def template_name(self):
        template_name_str = utilString.lower_first_camel_word(self.__class__.__name__) + '.xml'
        logging.info(template_name_str)
        return template_name_str

    def view(self):
        host_name = self.request.headers['host']
        urls = []

        return {'urls' : urls, 'host_name' : host_name}
