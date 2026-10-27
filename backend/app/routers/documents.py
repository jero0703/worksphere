from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_active_user
from app.schemas.document import DocumentResponse
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    employee_id: Optional[int] = Form(None),
    document_type: str = Form("Other"),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload an employee document with validation and RBAC protection.
    """
    doc = await document_service.save_document(
        db=db,
        current_user=current_user,
        file=file,
        employee_id=employee_id,
        document_type=document_type,
        description=description,
    )

    # Resolve details for response
    emp = doc.employee
    uploader_name = current_user.employee.full_name if current_user.employee else current_user.username
    return DocumentResponse(
        id=doc.id,
        employee_id=doc.employee_id,
        employee_name=emp.full_name if emp else None,
        employee_code=emp.employee_code if emp else None,
        department=emp.department if emp else None,
        file_name=doc.file_name,
        file_size=doc.file_size,
        document_type=doc.document_type,
        description=doc.description,
        uploaded_at=doc.uploaded_at,
        uploaded_by=doc.uploaded_by,
        uploader_name=uploader_name,
        download_url=f"/api/documents/{doc.id}/download",
    )


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    employee_id: Optional[int] = Query(None),
    document_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    List employee documents. Employees only see their own; HR and Admin can filter by any employee.
    """
    return document_service.get_documents(
        db=db,
        current_user=current_user,
        employee_id=employee_id,
        document_type=document_type,
        search=search,
    )


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Stream and download document with ownership verification.
    """
    file_path, original_filename = document_service.get_document_file_for_download(
        db=db,
        current_user=current_user,
        document_id=document_id,
    )
    return FileResponse(
        path=file_path,
        filename=original_filename,
        media_type="application/octet-stream",
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Delete document from storage and database.
    """
    return document_service.delete_document(
        db=db,
        current_user=current_user,
        document_id=document_id,
    )
