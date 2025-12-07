"""
认证相关路由
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import requests
import secrets
from urllib.parse import urlencode

from db import get_db
from models import User
from auth import get_current_user, get_or_create_user, create_access_token
from config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
)
from schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

# Google OAuth 配置
GOOGLE_AUTHORIZATION_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google")
def google_login():
    """启动 Google OAuth 登录流程"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    # 生成 state 参数用于防止 CSRF 攻击
    state = secrets.token_urlsafe(32)

    # 构建授权 URL
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    authorization_url = f"{GOOGLE_AUTHORIZATION_BASE_URL}?{urlencode(params)}"

    return {"authorization_url": authorization_url, "state": state}


@router.get("/google/callback")
def google_callback(code: str, state: str = None, db: Session = Depends(get_db)):
    """Google OAuth 回调处理"""
    import logging
    logger = logging.getLogger(__name__)
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        logger.error("Google OAuth not configured")
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    try:
        logger.info(f"收到 OAuth 回调，code: {code[:20]}...")
        
        # 使用 requests 直接获取 token
        token_data = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        logger.info(f"请求 token，redirect_uri: {GOOGLE_REDIRECT_URI}")
        
        token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)
        token_response.raise_for_status()
        token = token_response.json()
        logger.info("成功获取 access token")

        # 获取用户信息
        user_info_response = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token['access_token']}"},
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()
        logger.info(f"成功获取用户信息: {user_info.get('email')}")

        # 获取或创建用户
        user = get_or_create_user(
            db=db,
            google_id=user_info["id"],
            email=user_info["email"],
            name=user_info.get("name"),
            picture=user_info.get("picture"),
        )
        logger.info(f"用户已创建/获取: {user.id}")

        # 创建 JWT token
        access_token = create_access_token(data={"sub": user.id})
        logger.info("JWT token 已创建")

        # 重定向到前端，携带 token
        frontend_url = f"http://localhost:5173/auth/callback?token={access_token}"
        logger.info(f"重定向到前端: {frontend_url}")
        return RedirectResponse(url=frontend_url)

    except requests.exceptions.HTTPError as e:
        error_detail = f"HTTP error: {e.response.status_code}"
        if e.response.text:
            try:
                error_json = e.response.json()
                error_detail = error_json.get("error_description", error_detail)
            except:
                error_detail = e.response.text[:200]
        logger.error(f"OAuth 认证失败: {error_detail}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Authentication failed: {error_detail}")
    except Exception as e:
        logger.error(f"OAuth 认证异常: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture,
    )


@router.post("/logout")
def logout():
    """登出（客户端删除 token 即可）"""
    return {"message": "Logged out successfully"}

