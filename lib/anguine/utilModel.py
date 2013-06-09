import datetime
import time
import logging


from google.appengine.ext import db

SIMPLE_TYPES = (int, long, float, bool, dict, basestring, list)


class DerivedProperty(db.Property):
    def __init__(self, derive_func, *args, **kwargs):
        super(DerivedProperty, self).__init__(*args, **kwargs)
        self.derive_func = derive_func

    def __get__(self, model_instance, model_class):
        if model_instance is None:
            return self
        return self.derive_func(model_instance)

    def __set__(self, model_instance, value):
        raise db.DerivedPropertyError("Cannot assign to a DerivedProperty")


def to_dict(model, fields = []):
    output = {}
    
    includeFields = len(fields) > 0

    for key, prop in model.properties().iteritems():
        value = getattr(model, key) if hasattr(model, key) else None
            
        if (value is not None):
            if (isinstance(value, db.Model) or key=="_class" or (includeFields and key not in fields)):
                pass
                
            elif value is None or isinstance(value, SIMPLE_TYPES):
                output[key] = value
                
            elif isinstance(value, datetime.date):
                # Convert date/datetime to ms-since-epoch ("new Date()").
                ms = time.mktime(value.utctimetuple()) * 1000
                ms += getattr(value, 'microseconds', 0) / 1000
                output[key] = int(ms)
                
            elif isinstance(value, db.Key):
                output[key] = str(value.id())
            
            else:
                output[key] = str(value)

    if model.key:
        output['id'] = str(model.key().id())
    
    return output

def to_dict_list(modelList, fields = []):
    output = []
    
    logging.info('modelList: %s',len(modelList))
    
    for model in modelList:
        output.append(to_dict(model, fields))

    return output


def remove_duplicates(my_list):
    #Remove duplicates
    d = {}
    for x in my_list:
        d[x.key()] = x
    my_list = list(d.values())
    return my_list
            
    
