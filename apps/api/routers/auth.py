"""
认证相关路由
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import secrets
from urllib.parse import urlencode, quote

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
async def google_callback(code: str = None, error: str = None, state: str = None, db: Session = Depends(get_db)):
    """Google OAuth 回调处理（异步）"""
    import logging
    logger = logging.getLogger(__name__)
    
    # 如果 Google 返回了错误
    if error:
        logger.error(f"Google OAuth 返回错误: {error}")
        error_url = f"http://localhost:5173/auth/callback?error={quote(f'Google OAuth error: {error}')}"
        return RedirectResponse(url=error_url, status_code=302)
    
    if not code:
        logger.error("OAuth 回调缺少 code 参数")
        error_url = f"http://localhost:5173/auth/callback?error={quote('Missing authorization code')}"
        return RedirectResponse(url=error_url, status_code=302)
    
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
        
        # 使用异步 httpx 客户端，避免阻塞
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 获取 access token
            try:
                token_response = await client.post(GOOGLE_TOKEN_URL, data=token_data)
                
                # 如果请求失败，记录详细的错误信息
                if not token_response.is_success:
                    error_text = token_response.text
                    logger.error(f"Google token 请求失败: {token_response.status_code}")
                    logger.error(f"错误响应: {error_text}")
                    try:
                        error_json = token_response.json()
                        error_description = error_json.get("error_description", error_json.get("error", "Unknown error"))
                        logger.error(f"错误详情: {error_description}")
                    except (ValueError, KeyError):
                        pass
                
                token_response.raise_for_status()
                token = token_response.json()
                logger.info("成功获取 access token")

                # 获取用户信息，使用异步请求
                logger.info("正在获取用户信息...")
                try:
                    user_info_response = await client.get(
                        GOOGLE_USERINFO_URL,
                        headers={"Authorization": f"Bearer {token['access_token']}"},
                    )
                    logger.info(f"用户信息请求完成，状态码: {user_info_response.status_code}")
                    user_info_response.raise_for_status()
                    user_info = user_info_response.json()
                    logger.info(f"成功获取用户信息: {user_info.get('email')}")
                except httpx.TimeoutException:
                    logger.error("获取用户信息超时")
                    raise
                except Exception as e:
                    logger.error(f"获取用户信息失败: {str(e)}", exc_info=True)
                    raise
            except httpx.TimeoutException:
                logger.error("请求 Google API 超时")
                error_url = f"http://localhost:5173/auth/callback?error={quote('Request timeout')}"
                return RedirectResponse(url=error_url, status_code=302)
            except httpx.HTTPStatusError as e:
                error_detail = f"HTTP error: {e.response.status_code}"
                if e.response.text:
                    try:
                        error_json = e.response.json()
                        error_detail = error_json.get("error_description", error_detail)
                    except (ValueError, KeyError):
                        error_detail = e.response.text[:200]
                logger.error(f"OAuth 认证失败: {error_detail}", exc_info=True)
                error_url = f"http://localhost:5173/auth/callback?error={quote(error_detail)}"
                return RedirectResponse(url=error_url, status_code=302)

        # 获取或创建用户
        logger.info("开始获取或创建用户...")
        try:
            user = get_or_create_user(
                db=db,
                google_id=user_info["id"],
                email=user_info["email"],
                name=user_info.get("name"),
                picture=user_info.get("picture"),
            )
            logger.info(f"用户已创建/获取: {user.id}")
        except Exception as e:
            logger.error(f"获取或创建用户失败: {str(e)}", exc_info=True)
            raise

        # 创建 JWT token
        access_token = create_access_token(data={"sub": user.id})
        logger.info("JWT token 已创建")

        # 重定向到前端，携带 token
        frontend_url = f"http://localhost:5173/auth/callback?token={quote(access_token)}"
        logger.info(f"重定向到前端: {frontend_url}")
        return RedirectResponse(url=frontend_url, status_code=302)

    except Exception as e:
        logger.error(f"OAuth 认证异常: {str(e)}", exc_info=True)
        # 重定向到前端并携带错误信息
        error_url = f"http://localhost:5173/auth/callback?error={quote(str(e))}"
        return RedirectResponse(url=error_url, status_code=302)


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

