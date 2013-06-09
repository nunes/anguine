# -*- coding: utf-8 -*-
"""
    Anquine is a template application
    with Angular.js + Bootstrap fontend
    and app-engine python backend 
    --------------------------------

    :copyright: (c) 2013 Nuno Pereira
    :license: BSD
"""
import os
import sys

root = os.path.split(__file__)[0]
sys.path.insert(0, os.path.join(root, 'lib'))

import application

application = application.application
