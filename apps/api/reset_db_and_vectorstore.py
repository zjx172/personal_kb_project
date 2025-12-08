"""
重新生成数据库和向量库
删除现有的数据库和向量库，然后重新创建
"""
import os
import shutil
import logging
from pathlib import Path

from db import Base, engine
from config import DB_PATH, VECTOR_STORE_DIR
import models  # noqa: F401 - 确保所有模型都被导入

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def reset_database():
    """删除并重新创建数据库"""
    logger.info("=" * 50)
    logger.info("开始重置数据库...")
    
    # 删除现有数据库文件
    if os.path.exists(DB_PATH):
        logger.info(f"删除现有数据库文件: {DB_PATH}")
        os.remove(DB_PATH)
        logger.info("数据库文件已删除")
    else:
        logger.info("数据库文件不存在，跳过删除")
    
    # 重新创建数据库表
    logger.info("创建数据库表...")
    Base.metadata.create_all(bind=engine)
    logger.info("数据库表创建完成")
    logger.info("=" * 50)


def reset_vectorstore():
    """删除并重新创建向量库"""
    logger.info("=" * 50)
    logger.info("开始重置向量库...")
    
    # 删除现有向量库目录
    vector_store_path = Path(VECTOR_STORE_DIR)
    if vector_store_path.exists():
        logger.info(f"删除现有向量库目录: {VECTOR_STORE_DIR}")
        shutil.rmtree(VECTOR_STORE_DIR)
        logger.info("向量库目录已删除")
    else:
        logger.info("向量库目录不存在，跳过删除")
    
    # 创建新的向量库目录
    logger.info("创建新的向量库目录...")
    vector_store_path.mkdir(parents=True, exist_ok=True)
    logger.info("向量库目录创建完成")
    
    # 初始化向量库（创建空的集合）
    try:
        from langchain_chroma import Chroma
        from langchain_openai import OpenAIEmbeddings
        from config import COLLECTION_NAME, OPENAI_API_KEY, OPENAI_BASE_URL
        
        logger.info("初始化向量库...")
        embeddings = OpenAIEmbeddings(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
            model="text-embedding-3-large",
        )
        
        vectordb = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
            persist_directory=VECTOR_STORE_DIR,
        )
        
        logger.info("向量库初始化完成")
        logger.info("=" * 50)
    except Exception as e:
        logger.error(f"向量库初始化失败: {str(e)}", exc_info=True)
        raise


def main():
    """主函数"""
    try:
        logger.info("开始重新生成数据库和向量库...")
        
        # 重置数据库
        reset_database()
        
        # 重置向量库
        reset_vectorstore()
        
        logger.info("=" * 50)
        logger.info("数据库和向量库重新生成完成！")
        logger.info("=" * 50)
        
    except Exception as e:
        logger.error(f"重置失败: {str(e)}", exc_info=True)
        raise


if __name__ == "__main__":
    main()

