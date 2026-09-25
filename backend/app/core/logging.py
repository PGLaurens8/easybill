import logging

from pythonjsonlogger.json import JsonFormatter


def configure_logging() -> None:
    root_logger = logging.getLogger()
    if root_logger.handlers:
        return

    handler = logging.StreamHandler()
    handler.setFormatter(
        JsonFormatter('%(asctime)s %(levelname)s %(name)s %(message)s %(exc_info)s')
    )

    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(handler)
