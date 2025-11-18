"""
大乐透模块
"""

from .spider import DLTSpider
from .database import DLTDatabase
from .predictor import DLTPredictor, DLTStatistics
from .config import (
    FRONT_BALL_MIN, FRONT_BALL_MAX, FRONT_BALL_COUNT,
    BACK_BALL_MIN, BACK_BALL_MAX, BACK_BALL_COUNT,
    DATA_SOURCE_500COM, DATA_SOURCE_ZHCW,
    DRAW_DAYS, DRAW_TIME, START_YEAR
)

__all__ = [
    'DLTSpider',
    'DLTDatabase',
    'DLTPredictor',
    'DLTStatistics',
    'FRONT_BALL_MIN',
    'FRONT_BALL_MAX',
    'FRONT_BALL_COUNT',
    'BACK_BALL_MIN',
    'BACK_BALL_MAX',
    'BACK_BALL_COUNT',
    'DATA_SOURCE_500COM',
    'DATA_SOURCE_ZHCW',
    'DRAW_DAYS',
    'DRAW_TIME',
    'START_YEAR'
]

__version__ = '1.0.0'
