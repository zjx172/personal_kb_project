"""
监控系统配置
支持 Sentry 错误监控和 Prometheus 性能监控
"""
# 兼容 Python 3.9 的新类型语法
try:
    import eval_type_backport  # noqa: F401
except ImportError:
    pass

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Sentry 配置
SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")
SENTRY_ENVIRONMENT: str = os.getenv("SENTRY_ENVIRONMENT", "development")
SENTRY_TRACES_SAMPLE_RATE: float = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
SENTRY_PROFILES_SAMPLE_RATE: float = float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE", "0.1"))


def init_sentry():
    """初始化 Sentry 监控"""
    if not SENTRY_DSN:
        logger.warning("SENTRY_DSN 未配置，Sentry 监控未启用")
        return None
    
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            environment=SENTRY_ENVIRONMENT,
            traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
            profiles_sample_rate=SENTRY_PROFILES_SAMPLE_RATE,
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
                LoggingIntegration(
                    level=logging.INFO,  # 捕获 INFO 及以上级别的日志
                    event_level=logging.ERROR  # 只有 ERROR 及以上级别才会发送到 Sentry
                ),
            ],
            # 设置用户信息
            send_default_pii=True,  # 发送默认的 PII (Personally Identifiable Information)
            # 忽略某些异常
            ignore_errors=[
                KeyboardInterrupt,
            ],
        )
        logger.info("Sentry 监控已初始化")
        return sentry_sdk
    except ImportError:
        logger.warning("sentry-sdk 未安装，Sentry 监控未启用")
        return None
    except Exception as e:
        logger.error(f"Sentry 初始化失败: {str(e)}")
        return None


def init_prometheus():
    """初始化 Prometheus 监控"""
    try:
        from prometheus_client import Counter, Histogram, Gauge, generate_latest
        from fastapi import Response
        
        # 定义指标
        http_requests_total = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status']
        )
        
        http_request_duration_seconds = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint']
        )
        
        http_requests_in_progress = Gauge(
            'http_requests_in_progress',
            'HTTP requests currently in progress',
            ['method', 'endpoint']
        )
        
        logger.info("Prometheus 监控已初始化")
        return {
            'http_requests_total': http_requests_total,
            'http_request_duration_seconds': http_request_duration_seconds,
            'http_requests_in_progress': http_requests_in_progress,
            'generate_latest': generate_latest,
        }
    except ImportError:
        logger.warning("prometheus-client 未安装，Prometheus 监控未启用")
        return None
    except Exception as e:
        logger.error(f"Prometheus 初始化失败: {str(e)}")
        return None

