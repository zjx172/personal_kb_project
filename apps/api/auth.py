from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from db import get_db
from models import User
from config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
import uuid

security = HTTPBearer(auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建 JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """验证 JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> User:
    """获取当前登录用户，支持从Authorization header或query参数中读取token"""
    # 优先从Authorization header读取，如果没有则从query参数读取
    auth_token = None
    if credentials:
        auth_token = credentials.credentials
    elif token:
        auth_token = token
    
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(auth_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_or_create_user(db: Session, google_id: str, email: str, name: Optional[str] = None, picture: Optional[str] = None) -> User:
    """获取或创建用户"""
    user = db.query(User).filter(User.google_id == google_id).first()
    if user is None:
        # 检查邮箱是否已存在
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            # 如果邮箱已存在但 Google ID 不同，更新 Google ID
            existing_user.google_id = google_id
            existing_user.name = name or existing_user.name
            existing_user.picture = picture or existing_user.picture
            existing_user.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing_user)
            return existing_user
        
        # 创建新用户
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            picture=picture,
            google_id=google_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # 为新用户创建默认知识库
        from models import KnowledgeBase
        default_kb = KnowledgeBase(
            user_id=user.id,
            name="默认知识库",
            description="系统自动创建的默认知识库",
        )
        db.add(default_kb)
        db.commit()
    else:
        # 更新用户信息
        user.email = email
        user.name = name or user.name
        user.picture = picture or user.picture
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
    return user

