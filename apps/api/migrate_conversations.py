"""
数据库迁移脚本：创建 conversations 表并修改 search_history 表
"""
import sqlite3
from pathlib import Path
from config import DB_PATH

def migrate_conversations():
    """迁移数据库，创建 conversations 表并修改 search_history 表"""
    db_path = Path(DB_PATH)
    
    if not db_path.exists():
        print(f"数据库文件不存在: {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        migrations_applied = []
        
        # 检查 conversations 表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'")
        if not cursor.fetchone():
            print("正在创建 conversations 表...")
            cursor.execute("""
                CREATE TABLE conversations (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_conversations_updated_at ON conversations(updated_at)")
            migrations_applied.append("conversations table")
            print("✓ 已创建 conversations 表")
        
        # 检查 search_history 表是否有 conversation_id 列
        cursor.execute("PRAGMA table_info(search_history)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'conversation_id' not in columns:
            print("正在为 search_history 表添加 conversation_id 列...")
            # 先创建一个临时列
            cursor.execute("ALTER TABLE search_history ADD COLUMN conversation_id_temp TEXT")
            
            # 为现有记录创建默认对话
            cursor.execute("SELECT DISTINCT user_id FROM search_history")
            user_ids = [row[0] for row in cursor.fetchall()]
            
            for user_id in user_ids:
                # 为每个用户创建一个默认对话
                import uuid
                default_conv_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (default_conv_id, user_id, "默认对话"))
                
                # 将该用户的所有消息关联到这个对话
                cursor.execute("""
                    UPDATE search_history 
                    SET conversation_id_temp = ?
                    WHERE user_id = ?
                """, (default_conv_id, user_id))
            
            # 删除临时列并添加正式列
            # SQLite 不支持直接重命名列，需要重建表
            cursor.execute("""
                CREATE TABLE search_history_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    conversation_id TEXT NOT NULL,
                    query TEXT NOT NULL,
                    answer TEXT,
                    citations TEXT,
                    sources_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                INSERT INTO search_history_new 
                (id, user_id, conversation_id, query, answer, citations, sources_count, created_at)
                SELECT id, user_id, conversation_id_temp, query, answer, citations, sources_count, created_at
                FROM search_history
            """)
            cursor.execute("DROP TABLE search_history")
            cursor.execute("ALTER TABLE search_history_new RENAME TO search_history")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_search_history_user_id ON search_history(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_search_history_conversation_id ON search_history(conversation_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_search_history_created_at ON search_history(created_at)")
            migrations_applied.append("search_history.conversation_id")
            print("✓ 已添加 conversation_id 列到 search_history 表")
        
        if migrations_applied:
            conn.commit()
            print(f"\n✓ 迁移完成！已应用 {len(migrations_applied)} 个迁移：")
            for migration in migrations_applied:
                print(f"  - {migration}")
        else:
            print("✓ 数据库已是最新版本，无需迁移")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("开始迁移 conversations 表...")
    migrate_conversations()
    print("\n迁移完成！")

