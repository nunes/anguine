from simpleMVC import TemplateView, login_required, utilString
import logging

"""
Application server side views
"""

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


class Main(TemplateView):
    """
    Main screen
    """
    urls = ['/main']

    @login_required
    def view(self, path=None):
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
    def view(self):
        return {'script': False}


class Contact(TemplateView):
    """
    Contact screen
    """
    urls = ['/contact']
    def view(self):
        return {'script': False}


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
