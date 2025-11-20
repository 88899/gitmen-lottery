"""
七星彩 (QXC) 模块
"""

from .spider import QXCSpider
from .predictor import QXCPredictor, QXCStatistics
from .database import QXCDatabase

__all__ = ['QXCSpider', 'QXCPredictor', 'QXCStatistics', 'QXCDatabase']
