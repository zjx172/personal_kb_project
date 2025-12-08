"""
存储服务适配器
支持本地存储和 OSS（对象存储）两种方式
根据环境变量自动选择
"""
import os
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# 环境配置
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
USE_OSS = os.getenv("USE_OSS_STORAGE", "false").lower() == "true" or ENVIRONMENT == "production"


class StorageInterface(ABC):
    """存储接口"""
    
    @abstractmethod
    def upload_file(
        self,
        file_content: bytes,
        file_path: str,
        content_type: Optional[str] = None,
    ) -> str:
        """
        上传文件
        
        Args:
            file_content: 文件内容（字节）
            file_path: 文件路径（相对路径）
            content_type: 文件 MIME 类型
        
        Returns:
            文件访问 URL 或路径
        """
        pass
    
    @abstractmethod
    def download_file(self, file_path: str) -> bytes:
        """
        下载文件
        
        Args:
            file_path: 文件路径（相对路径或 URL）
        
        Returns:
            文件内容（字节）
        """
        pass
    
    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """
        删除文件
        
        Args:
            file_path: 文件路径（相对路径或 URL）
        
        Returns:
            是否删除成功
        """
        pass
    
    @abstractmethod
    def file_exists(self, file_path: str) -> bool:
        """
        检查文件是否存在
        
        Args:
            file_path: 文件路径（相对路径或 URL）
        
        Returns:
            文件是否存在
        """
        pass
    
    @abstractmethod
    def get_file_url(self, file_path: str) -> str:
        """
        获取文件访问 URL
        
        Args:
            file_path: 文件路径（相对路径）
        
        Returns:
            文件访问 URL
        """
        pass
    
    @abstractmethod
    def upload_chunk(
        self,
        upload_id: str,
        chunk_index: int,
        chunk_data: bytes,
    ) -> bool:
        """
        上传分片
        
        Args:
            upload_id: 上传ID
            chunk_index: 分片索引
            chunk_data: 分片数据
        
        Returns:
            是否上传成功
        """
        pass
    
    @abstractmethod
    def complete_chunk_upload(
        self,
        upload_id: str,
        final_path: str,
        total_chunks: int,
        content_type: Optional[str] = None,
    ) -> str:
        """
        完成分片上传，合并所有分片
        
        Args:
            upload_id: 上传ID
            final_path: 最终文件路径
            total_chunks: 总分片数
            content_type: 文件 MIME 类型
        
        Returns:
            文件访问 URL 或路径
        """
        pass
    
    @abstractmethod
    def cleanup_chunks(self, upload_id: str) -> bool:
        """
        清理分片数据
        
        Args:
            upload_id: 上传ID
        
        Returns:
            是否清理成功
        """
        pass


class LocalStorage(StorageInterface):
    """本地存储实现"""
    
    def __init__(self, base_dir: str):
        """
        初始化本地存储
        
        Args:
            base_dir: 基础存储目录
        """
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"本地存储初始化，基础目录: {self.base_dir}")
    
    def upload_file(
        self,
        file_content: bytes,
        file_path: str,
        content_type: Optional[str] = None,
    ) -> str:
        """上传文件到本地"""
        full_path = self.base_dir / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, "wb") as f:
            f.write(file_content)
        
        logger.info(f"文件已保存到本地: {full_path}")
        return str(full_path)
    
    def download_file(self, file_path: str) -> bytes:
        """从本地下载文件"""
        # file_path 可能是完整路径或相对路径
        if Path(file_path).is_absolute():
            full_path = Path(file_path)
        else:
            full_path = self.base_dir / file_path
        
        if not full_path.exists():
            raise FileNotFoundError(f"文件不存在: {full_path}")
        
        with open(full_path, "rb") as f:
            return f.read()
    
    def delete_file(self, file_path: str) -> bool:
        """删除本地文件"""
        if Path(file_path).is_absolute():
            full_path = Path(file_path)
        else:
            full_path = self.base_dir / file_path
        
        try:
            if full_path.exists():
                full_path.unlink()
                logger.info(f"已删除文件: {full_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"删除文件失败: {e}")
            return False
    
    def file_exists(self, file_path: str) -> bool:
        """检查本地文件是否存在"""
        if Path(file_path).is_absolute():
            full_path = Path(file_path)
        else:
            full_path = self.base_dir / file_path
        return full_path.exists()
    
    def get_file_url(self, file_path: str) -> str:
        """获取本地文件路径（用于开发环境）"""
        if Path(file_path).is_absolute():
            return str(file_path)
        return str(self.base_dir / file_path)
    
    def upload_chunk(
        self,
        upload_id: str,
        chunk_index: int,
        chunk_data: bytes,
    ) -> bool:
        """上传分片到本地"""
        chunks_dir = self.base_dir / "chunks" / upload_id
        chunks_dir.mkdir(parents=True, exist_ok=True)
        
        chunk_path = chunks_dir / f"chunk_{chunk_index}"
        with open(chunk_path, "wb") as f:
            f.write(chunk_data)
        
        logger.debug(f"分片已保存: {chunk_path}")
        return True
    
    def complete_chunk_upload(
        self,
        upload_id: str,
        final_path: str,
        total_chunks: int,
        content_type: Optional[str] = None,
    ) -> str:
        """合并所有分片"""
        chunks_dir = self.base_dir / "chunks" / upload_id
        final_file_path = self.base_dir / final_path
        final_file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 按索引顺序合并分片
        with open(final_file_path, "wb") as final_file:
            for i in range(total_chunks):
                chunk_path = chunks_dir / f"chunk_{i}"
                if not chunk_path.exists():
                    raise FileNotFoundError(f"分片 {i} 不存在: {chunk_path}")
                
                with open(chunk_path, "rb") as chunk_file:
                    shutil.copyfileobj(chunk_file, final_file)
        
        # 清理分片目录
        shutil.rmtree(chunks_dir, ignore_errors=True)
        logger.info(f"分片上传完成，文件已合并: {final_file_path}")
        
        return str(final_file_path)
    
    def cleanup_chunks(self, upload_id: str) -> bool:
        """清理分片数据"""
        chunks_dir = self.base_dir / "chunks" / upload_id
        try:
            if chunks_dir.exists():
                shutil.rmtree(chunks_dir)
                logger.info(f"已清理分片目录: {chunks_dir}")
            return True
        except Exception as e:
            logger.error(f"清理分片失败: {e}")
            return False


class OSSStorage(StorageInterface):
    """OSS 存储实现（支持阿里云 OSS）"""
    
    def __init__(
        self,
        access_key_id: str,
        access_key_secret: str,
        endpoint: str,
        bucket_name: str,
        base_url: Optional[str] = None,
    ):
        """
        初始化 OSS 存储
        
        Args:
            access_key_id: OSS Access Key ID
            access_key_secret: OSS Access Key Secret
            endpoint: OSS Endpoint（如：oss-cn-hangzhou.aliyuncs.com）
            bucket_name: OSS Bucket 名称
            base_url: 自定义访问域名（可选，用于 CDN）
        """
        try:
            import oss2
        except ImportError:
            raise ImportError(
                "OSS 存储需要安装 oss2 库: pip install oss2"
            )
        
        self.bucket_name = bucket_name
        self.base_url = base_url
        
        # 初始化 OSS 客户端
        auth = oss2.Auth(access_key_id, access_key_secret)
        self.bucket = oss2.Bucket(auth, endpoint, bucket_name)
        
        logger.info(f"OSS 存储初始化，Bucket: {bucket_name}, Endpoint: {endpoint}")
    
    def upload_file(
        self,
        file_content: bytes,
        file_path: str,
        content_type: Optional[str] = None,
    ) -> str:
        """上传文件到 OSS"""
        try:
            # 设置请求头
            headers = {}
            if content_type:
                headers["Content-Type"] = content_type
            
            # 上传文件
            result = self.bucket.put_object(
                file_path,
                file_content,
                headers=headers if headers else None,
            )
            
            if result.status == 200:
                # 返回文件 URL
                url = self.get_file_url(file_path)
                logger.info(f"文件已上传到 OSS: {file_path}, URL: {url}")
                return url
            else:
                raise Exception(f"OSS 上传失败，状态码: {result.status}")
        except Exception as e:
            logger.error(f"OSS 上传失败: {e}", exc_info=True)
            raise
    
    def download_file(self, file_path: str) -> bytes:
        """从 OSS 下载文件"""
        try:
            result = self.bucket.get_object(file_path)
            content = result.read()
            logger.info(f"文件已从 OSS 下载: {file_path}")
            return content
        except Exception as e:
            logger.error(f"OSS 下载失败: {e}", exc_info=True)
            raise
    
    def delete_file(self, file_path: str) -> bool:
        """删除 OSS 文件"""
        try:
            result = self.bucket.delete_object(file_path)
            if result.status == 204:
                logger.info(f"文件已从 OSS 删除: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"OSS 删除失败: {e}", exc_info=True)
            return False
    
    def file_exists(self, file_path: str) -> bool:
        """检查 OSS 文件是否存在"""
        try:
            return self.bucket.object_exists(file_path)
        except Exception as e:
            logger.error(f"检查 OSS 文件存在性失败: {e}", exc_info=True)
            return False
    
    def get_file_url(self, file_path: str) -> str:
        """获取 OSS 文件访问 URL"""
        if self.base_url:
            # 使用自定义域名（CDN）
            return f"{self.base_url.rstrip('/')}/{file_path}"
        else:
            # 使用 OSS 默认域名
            return f"https://{self.bucket_name}.{self.bucket.endpoint}/{file_path}"
    
    def upload_chunk(
        self,
        upload_id: str,
        chunk_index: int,
        chunk_data: bytes,
    ) -> bool:
        """上传分片到 OSS"""
        try:
            chunk_path = f"chunks/{upload_id}/chunk_{chunk_index}"
            result = self.bucket.put_object(chunk_path, chunk_data)
            if result.status == 200:
                logger.debug(f"分片已上传到 OSS: {chunk_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"OSS 分片上传失败: {e}")
            return False
    
    def complete_chunk_upload(
        self,
        upload_id: str,
        final_path: str,
        total_chunks: int,
        content_type: Optional[str] = None,
    ) -> str:
        """合并所有分片（OSS 使用 multipart upload）"""
        try:
            import oss2
            
            # 初始化分片上传
            upload_id_oss = self.bucket.init_multipart_upload(
                final_path,
                headers={"Content-Type": content_type} if content_type else None
            ).upload_id
            
            parts = []
            for i in range(total_chunks):
                chunk_path = f"chunks/{upload_id}/chunk_{i}"
                # 下载分片
                chunk_obj = self.bucket.get_object(chunk_path)
                chunk_data = chunk_obj.read()
                
                # 上传分片
                part = self.bucket.upload_part(
                    final_path,
                    upload_id_oss,
                    i + 1,  # part number 从 1 开始
                    chunk_data
                )
                parts.append(oss2.models.PartInfo(i + 1, part.etag))
            
            # 完成分片上传
            self.bucket.complete_multipart_upload(
                final_path,
                upload_id_oss,
                parts
            )
            
            # 清理分片
            self.cleanup_chunks(upload_id)
            
            logger.info(f"OSS 分片上传完成: {final_path}")
            return self.get_file_url(final_path)
        except Exception as e:
            logger.error(f"OSS 分片合并失败: {e}", exc_info=True)
            raise
    
    def cleanup_chunks(self, upload_id: str) -> bool:
        """清理 OSS 分片数据"""
        try:
            # 列出所有分片
            prefix = f"chunks/{upload_id}/"
            for obj in oss2.ObjectIterator(self.bucket, prefix=prefix):
                self.bucket.delete_object(obj.key)
            
            logger.info(f"已清理 OSS 分片: {prefix}")
            return True
        except Exception as e:
            logger.error(f"清理 OSS 分片失败: {e}")
            return False


def create_storage() -> StorageInterface:
    """
    根据配置创建存储实例
    
    Returns:
        存储实例（LocalStorage 或 OSSStorage）
    """
    if USE_OSS:
        # OSS 配置
        access_key_id = os.getenv("OSS_ACCESS_KEY_ID", "")
        access_key_secret = os.getenv("OSS_ACCESS_KEY_SECRET", "")
        endpoint = os.getenv("OSS_ENDPOINT", "")
        bucket_name = os.getenv("OSS_BUCKET_NAME", "")
        base_url = os.getenv("OSS_BASE_URL", "")  # 可选，用于 CDN
        
        if not all([access_key_id, access_key_secret, endpoint, bucket_name]):
            logger.warning(
                "OSS 配置不完整，回退到本地存储。"
                "需要设置: OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_ENDPOINT, OSS_BUCKET_NAME"
            )
            # 回退到本地存储
            from config import BASE_DIR
            return LocalStorage(base_dir=str(Path(BASE_DIR) / "uploads"))
        
        logger.info("使用 OSS 存储（生产环境）")
        return OSSStorage(
            access_key_id=access_key_id,
            access_key_secret=access_key_secret,
            endpoint=endpoint,
            bucket_name=bucket_name,
            base_url=base_url if base_url else None,
        )
    else:
        # 本地存储配置
        from config import BASE_DIR
        uploads_dir = os.getenv("UPLOADS_DIR", str(Path(BASE_DIR) / "uploads"))
        logger.info(f"使用本地存储（开发环境），目录: {uploads_dir}")
        return LocalStorage(base_dir=uploads_dir)


# 全局存储实例
storage = create_storage()

