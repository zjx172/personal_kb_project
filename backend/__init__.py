# 兼容 Python 3.9 的新类型语法（必须在所有导入之前）
# 这个文件会在导入 backend 包时最先执行
try:
    import eval_type_backport  # noqa: F401
except ImportError:
    pass
