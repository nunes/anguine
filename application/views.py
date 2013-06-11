from anguine import TemplateView, login_required, utilString
import logging

"""
Application server side views
"""
from wtforms.form import Form
from wtforms.fields.simple import TextField, TextAreaField
from wtforms.fields.core import StringField
from google.appengine.api import mail
from anguine.anguineConstants import ADMIN_MAIN

class Login(TemplateView):
    """
    Login screen
    """
    urls = ['/login']

    def view(self):
        logging.info("view_login")
        if (self.current_user):
            return {'redirect': 'main'}

        else:
            return {}


class Index(TemplateView):
    """
    Index screen
    """
    urls = ['/']

    def view(self, folder=None):
        return {}


class About(TemplateView):
    """
    About screen
    """
    urls = ['/about']
    script = False

    def view(self):
        return {}


class Contact(TemplateView):
    """
    Contact screen
    """
    urls = ['/contact']

    class ContactForm(Form):
        email = StringField('Email', default='')
        name = StringField('Name', default='')
        message = TextAreaField('Message', default='')


    def view(self):
        return {}

    def update(self):
        form = Contact.ContactForm(self.request.form)

        if form.validate():

            message = mail.EmailMessage(sender=ADMIN_MAIN,
                                        subject="Contact form submit")

            message.to = ADMIN_MAIN
            message.body = "From User: %s\r\nEmail: %s\r\nUser message: %s \r\n" % (
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
    Main screen
    """
    urls = ['/main']

    @login_required
    def view(self, path=None):
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
