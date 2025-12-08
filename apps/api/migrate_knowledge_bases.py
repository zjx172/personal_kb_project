"""
数据库迁移脚本：创建 knowledge_bases 表并修改 conversations 表
"""
import sqlite3
from pathlib import Path
from config import DB_PATH

def migrate_knowledge_bases():
    """迁移数据库，创建 knowledge_bases 表并修改 conversations 表"""
    db_path = Path(DB_PATH)
    
    if not db_path.exists():
        print(f"数据库文件不存在: {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 检查 knowledge_bases 表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_bases'")
        if not cursor.fetchone():
            print("正在创建 knowledge_bases 表...")
            cursor.execute("""
                CREATE TABLE knowledge_bases (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_knowledge_bases_user_id ON knowledge_bases(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_knowledge_bases_updated_at ON knowledge_bases(updated_at)")
            print("✓ 已创建 knowledge_bases 表")
            
            # 为每个用户创建一个默认知识库
            print("正在为现有用户创建默认知识库...")
            cursor.execute("SELECT DISTINCT user_id FROM conversations")
            user_ids = cursor.fetchall()
            for (user_id,) in user_ids:
                import uuid
                kb_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO knowledge_bases (id, user_id, name, description)
                    VALUES (?, ?, ?, ?)
                """, (kb_id, user_id, "默认知识库", "系统自动创建的默认知识库"))
                print(f"  ✓ 为用户 {user_id} 创建默认知识库 {kb_id}")
        
        # 检查 conversations 表是否有 knowledge_base_id 列
        cursor.execute("PRAGMA table_info(conversations)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'knowledge_base_id' not in columns:
            print("正在为 conversations 表添加 knowledge_base_id 列...")
            # 先添加列（允许NULL，因为旧数据可能没有）
            cursor.execute("ALTER TABLE conversations ADD COLUMN knowledge_base_id TEXT")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_conversations_knowledge_base_id ON conversations(knowledge_base_id)")
            
            # 为每个用户的对话分配默认知识库
            print("正在为现有对话分配默认知识库...")
            cursor.execute("SELECT DISTINCT user_id FROM conversations")
            user_ids = cursor.fetchall()
            for (user_id,) in user_ids:
                # 获取该用户的默认知识库
                cursor.execute("""
                    SELECT id FROM knowledge_bases 
                    WHERE user_id = ? 
                    ORDER BY created_at ASC 
                    LIMIT 1
                """, (user_id,))
                result = cursor.fetchone()
                if result:
                    kb_id = result[0]
                    cursor.execute("""
                        UPDATE conversations 
                        SET knowledge_base_id = ? 
                        WHERE user_id = ? AND knowledge_base_id IS NULL
                    """, (kb_id, user_id))
                    print(f"  ✓ 为用户 {user_id} 的对话分配知识库 {kb_id}")
            
            # 将列设置为 NOT NULL（在分配完所有对话后）
            # SQLite 不支持直接修改列，需要重建表
            print("正在更新 conversations 表结构...")
            cursor.execute("""
                CREATE TABLE conversations_new (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    knowledge_base_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                INSERT INTO conversations_new (id, user_id, knowledge_base_id, title, created_at, updated_at)
                SELECT id, user_id, knowledge_base_id, title, created_at, updated_at
                FROM conversations
            """)
            cursor.execute("DROP TABLE conversations")
            cursor.execute("ALTER TABLE conversations_new RENAME TO conversations")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_conversations_knowledge_base_id ON conversations(knowledge_base_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_conversations_updated_at ON conversations(updated_at)")
            print("✓ 已更新 conversations 表结构")
        
        # 检查 markdown_docs 表是否有 knowledge_base_id 列
        cursor.execute("PRAGMA table_info(markdown_docs)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'knowledge_base_id' not in columns:
            print("正在为 markdown_docs 表添加 knowledge_base_id 列...")
            # 先添加列（允许NULL，因为旧数据可能没有）
            cursor.execute("ALTER TABLE markdown_docs ADD COLUMN knowledge_base_id TEXT")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_markdown_docs_knowledge_base_id ON markdown_docs(knowledge_base_id)")
            
            # 为每个用户的文档分配默认知识库
            print("正在为现有文档分配默认知识库...")
            cursor.execute("SELECT DISTINCT user_id FROM markdown_docs")
            user_ids = cursor.fetchall()
            for (user_id,) in user_ids:
                # 获取该用户的默认知识库
                cursor.execute("""
                    SELECT id FROM knowledge_bases 
                    WHERE user_id = ? 
                    ORDER BY created_at ASC 
                    LIMIT 1
                """, (user_id,))
                result = cursor.fetchone()
                if result:
                    kb_id = result[0]
                    cursor.execute("""
                        UPDATE markdown_docs 
                        SET knowledge_base_id = ? 
                        WHERE user_id = ? AND knowledge_base_id IS NULL
                    """, (kb_id, user_id))
                    print(f"  ✓ 为用户 {user_id} 的文档分配知识库 {kb_id}")
            
            # 将列设置为 NOT NULL（在分配完所有文档后）
            # SQLite 不支持直接修改列，需要重建表
            print("正在更新 markdown_docs 表结构...")
            cursor.execute("""
                CREATE TABLE markdown_docs_new (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    knowledge_base_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    doc_type TEXT,
                    summary TEXT,
                    tags TEXT,
                    pdf_file_path TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                INSERT INTO markdown_docs_new (id, user_id, knowledge_base_id, title, content, doc_type, summary, tags, pdf_file_path, created_at, updated_at)
                SELECT id, user_id, knowledge_base_id, title, content, doc_type, summary, tags, pdf_file_path, created_at, updated_at
                FROM markdown_docs
            """)
            cursor.execute("DROP TABLE markdown_docs")
            cursor.execute("ALTER TABLE markdown_docs_new RENAME TO markdown_docs")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_markdown_docs_user_id ON markdown_docs(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_markdown_docs_knowledge_base_id ON markdown_docs(knowledge_base_id)")
            print("✓ 已更新 markdown_docs 表结构")
        
        conn.commit()
        print("\n✓ 数据库迁移完成！")
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ 数据库迁移失败: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_knowledge_bases()

