from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.services.conversion_wrapper import convert_output

from app.auth import get_current_user, require_role
from app.db import get_session
from app.model.news import News
from app.model.user import User
from app.schema.news import NewsCreate, NewsRead, NewsUpdate

router = APIRouter()


@router.get("/", response_model=list[NewsRead])
@convert_output
def list_published_news(
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    rows = session.exec(
        select(News)
        .where(News.is_published.is_(True))
        .order_by(News.published_at.desc(), News.created_at.desc())
    ).all()
    return rows


@router.get("/admin", response_model=list[NewsRead])
@convert_output
def list_all_news(
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    rows = session.exec(
        select(News).order_by(News.created_at.desc())
    ).all()
    return rows


@router.post("/", response_model=NewsRead)
def create_news(
    payload: NewsCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role("admin")),
):
    item = News(
        title=payload.title.strip(),
        body=payload.body.strip(),
        image_url=payload.image_url,
        is_published=bool(payload.is_published),
        created_by=user.email,
    )
    if item.is_published and not item.published_at:
        item.published_at = datetime.utcnow()
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.put("/{news_id}", response_model=NewsRead)
def update_news(
    news_id: int,
    payload: NewsUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    item = session.get(News, news_id)
    if not item:
        raise HTTPException(status_code=404, detail="News not found")

    data = payload.dict(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        data["title"] = data["title"].strip()
    if "body" in data and data["body"] is not None:
        data["body"] = data["body"].strip()

    if "is_published" in data:
        if data["is_published"] and not item.published_at:
            item.published_at = datetime.utcnow()
        if data["is_published"] is False:
            item.published_at = None

    for k, v in data.items():
        setattr(item, k, v)

    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{news_id}", status_code=204)
def delete_news(
    news_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin")),
):
    item = session.get(News, news_id)
    if not item:
        raise HTTPException(status_code=404, detail="News not found")
    session.delete(item)
    session.commit()
    return None
