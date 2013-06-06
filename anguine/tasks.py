from simpleMVC import TaskHandler
import logging


class TemplateTask(TaskHandler):
    """TemplateTask
    """
    urls = ['/task/templateTask']

    def execute(self):
        logging.info('begin TemplateTask')



