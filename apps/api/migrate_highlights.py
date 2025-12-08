"""
简单的高亮表迁移脚本：
- 新增 rects 列用于存储规范化的高亮坐标（JSON 字符串）
- 新增 color 列用于存储高亮颜色

运行：python migrate_highlights.py
"""
import sqlite3
from typing import Tuple

from config import DB_PATH


def has_column(cursor: sqlite3.Cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info('{table}')")
    return any(row[1] == column for row in cursor.fetchall())


def add_column(cursor: sqlite3.Cursor, table: str, column: str, ddl: str) -> bool:
    if has_column(cursor, table, column):
        return False
    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")
    return True


def migrate_highlights(cursor: sqlite3.Cursor) -> Tuple[bool, bool]:
    rects_added = add_column(cursor, "highlights", "rects", "TEXT DEFAULT '[]'")
    if rects_added:
        cursor.execute("UPDATE highlights SET rects = '[]' WHERE rects IS NULL")

    color_added = add_column(cursor, "highlights", "color", "TEXT")
    return rects_added, color_added


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    rects_added, color_added = migrate_highlights(cursor)
    conn.commit()
    conn.close()

    print("迁移完成：")
    print(f"- rects 列新增: {rects_added}")
    print(f"- color 列新增: {color_added}")


if __name__ == "__main__":
    main()

