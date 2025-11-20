"""
七乐彩 (QLC) 模块
"""

from .spider import QLCSpider
from .predictor import QLCPredictor, QLCStatistics
from .database import QLCDatabase

__all__ = ['QLCSpider', 'QLCPredictor', 'QLCStatistics', 'QLCDatabase']
