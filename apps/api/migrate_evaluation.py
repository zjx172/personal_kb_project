"""
评估功能数据库迁移脚本
添加评估相关的表
"""
from db import engine
from models import (
    EvaluationDataset,
    EvaluationDataItem,
    EvaluationRun,
    EvaluationResult,
)

def migrate():
    """执行迁移"""
    print("[*] 开始创建评估相关表...")
    
    # 创建评估相关表
    EvaluationDataset.__table__.create(engine, checkfirst=True)
    EvaluationDataItem.__table__.create(engine, checkfirst=True)
    EvaluationRun.__table__.create(engine, checkfirst=True)
    EvaluationResult.__table__.create(engine, checkfirst=True)
    
    print("[*] 评估相关表创建完成！")
    print("[*] 已创建以下表：")
    print("  - evaluation_datasets (评估数据集)")
    print("  - evaluation_data_items (评估数据项)")
    print("  - evaluation_runs (评估运行记录)")
    print("  - evaluation_results (评估结果详情)")

if __name__ == "__main__":
    migrate()

