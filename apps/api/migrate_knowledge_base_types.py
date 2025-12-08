"""
数据库迁移脚本：为 knowledge_bases 表添加 type、data_source 和 data_source_config 字段
"""
import sqlite3
from pathlib import Path
from config import DB_PATH

def migrate_knowledge_base_types():
    """迁移数据库，为 knowledge_bases 表添加新字段"""
    db_path = Path(DB_PATH)
    
    if not db_path.exists():
        print(f"数据库文件不存在: {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 检查字段是否已存在
        cursor.execute("PRAGMA table_info(knowledge_bases)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # 添加 type 字段（如果不存在）
        if "type" not in columns:
            print("正在添加 type 字段...")
            cursor.execute("ALTER TABLE knowledge_bases ADD COLUMN type TEXT NOT NULL DEFAULT 'document'")
            print("✓ 已添加 type 字段")
        else:
            print("✓ type 字段已存在")
        
        # 添加 data_source 字段（如果不存在）
        if "data_source" not in columns:
            print("正在添加 data_source 字段...")
            cursor.execute("ALTER TABLE knowledge_bases ADD COLUMN data_source TEXT")
            print("✓ 已添加 data_source 字段")
        else:
            print("✓ data_source 字段已存在")
        
        # 添加 data_source_config 字段（如果不存在）
        if "data_source_config" not in columns:
            print("正在添加 data_source_config 字段...")
            cursor.execute("ALTER TABLE knowledge_bases ADD COLUMN data_source_config TEXT")
            print("✓ 已添加 data_source_config 字段")
        else:
            print("✓ data_source_config 字段已存在")
        
        conn.commit()
        print("\n✓ 数据库迁移完成")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ 数据库迁移失败: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_knowledge_base_types()

