"""
数据库迁移脚本：创建 data_sources 表
"""
import sqlite3
from pathlib import Path
from config import DB_PATH

def migrate_data_sources():
    """迁移数据库，创建 data_sources 表"""
    db_path = Path(DB_PATH)
    
    if not db_path.exists():
        print(f"数据库文件不存在: {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 检查 data_sources 表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='data_sources'")
        if not cursor.fetchone():
            print("正在创建 data_sources 表...")
            cursor.execute("""
                CREATE TABLE data_sources (
                    id TEXT PRIMARY KEY,
                    knowledge_base_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    config TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_data_sources_knowledge_base_id ON data_sources(knowledge_base_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_data_sources_created_at ON data_sources(created_at)")
            print("✓ 已创建 data_sources 表")
        else:
            print("✓ data_sources 表已存在")
        
        conn.commit()
        print("\n✓ 数据库迁移完成")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ 数据库迁移失败: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_data_sources()

