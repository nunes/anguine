
import os
import sys

root = os.path.split(__file__)[0]
sys.path.insert(0, os.path.join(root, 'lib'))

from gaesessions import SessionMiddleware
import datetime

def webapp_add_wsgi_middleware(app):
    app = SessionMiddleware(app, cookie_key="h6VQNpqa5Ym16mqmfSWsiINlNvSae2YPn3aFttnB",
                            lifetime=datetime.timedelta(hours=2))
    return app

