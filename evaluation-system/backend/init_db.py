"""
初始化数据库
"""
from db import engine, Base
from models import (
    EvaluationDataset,
    EvaluationDataItem,
    EvaluationRun,
    EvaluationResult,
)

def init_db():
    """创建所有表"""
    Base.metadata.create_all(bind=engine)
    print("数据库表创建成功！")
    print("已创建的表：")
    print("  - evaluation_datasets (评估数据集)")
    print("  - evaluation_data_items (评估数据项)")
    print("  - evaluation_runs (评估运行记录)")
    print("  - evaluation_results (评估结果详情)")

if __name__ == "__main__":
    init_db()

