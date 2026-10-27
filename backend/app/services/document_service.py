import os
import re
import uuid
from typing import List, Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.document import Document
from app.models.employee import Employee
from app.models.user import User, UserRole

# Upload storage directory
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "documents"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "docx", "doc", "txt", "xlsx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def sanitize_filename(filename: str) -> str:
    # Strip any directory path components
    base = os.path.basename(filename)
    # Remove potentially dangerous characters
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', base)
    return clean or "unnamed_document"


def validate_file(file: UploadFile):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )


async def save_document(
    db: Session,
    current_user: User,
    file: UploadFile,
    employee_id: Optional[int] = None,
    document_type: str = "Other",
    description: Optional[str] = None,
) -> Document:
    validate_file(file)

    # Resolve target employee
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your user account is not linked to an active employee profile.",
            )
        target_employee_id = current_user.employee.id
        if employee_id and employee_id != target_employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employees cannot upload documents for other staff members.",
            )
    else:
        # HR or ADMIN
        if employee_id:
            emp = db.query(Employee).filter(Employee.id == employee_id).first()
            if not emp:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Employee with ID {employee_id} not found.",
                )
            target_employee_id = emp.id
        elif current_user.employee:
            target_employee_id = current_user.employee.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please specify an employee_id for this document.",
            )

    # Sanitize and create unique file storage path
    original_name = sanitize_filename(file.filename)
    unique_suffix = uuid.uuid4().hex[:12]
    stored_name = f"{unique_suffix}_{original_name}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)

    # Read and check size
    contents = await file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 10MB (file size: {file_size / (1024 * 1024):.2f}MB).",
        )

    # Write file to disk
    with open(file_path, "wb") as f:
        f.write(contents)

    # Store relative path or identifier in file_url
    doc = Document(
        employee_id=target_employee_id,
        file_name=original_name,
        file_url=stored_name,
        file_size=file_size,
        document_type=document_type or "Other",
        description=description,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_documents(
    db: Session,
    current_user: User,
    employee_id: Optional[int] = None,
    document_type: Optional[str] = None,
    search: Optional[str] = None,
) -> List[dict]:
    query = db.query(Document, Employee, User).join(
        Employee, Document.employee_id == Employee.id
    ).outerjoin(
        User, Document.uploaded_by == User.id
    )

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee:
            return []
        query = query.filter(Document.employee_id == current_user.employee.id)
    else:
        if employee_id:
            query = query.filter(Document.employee_id == employee_id)

    if document_type:
        query = query.filter(Document.document_type == document_type)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            (Document.file_name.ilike(search_filter))
            | (Employee.full_name.ilike(search_filter))
            | (Employee.employee_code.ilike(search_filter))
            | (Document.description.ilike(search_filter))
        )

    results = query.order_by(desc(Document.uploaded_at)).all()

    documents_out = []
    for doc, emp, uploader in results:
        documents_out.append({
            "id": doc.id,
            "employee_id": doc.employee_id,
            "employee_name": emp.full_name if emp else None,
            "employee_code": emp.employee_code if emp else None,
            "department": emp.department if emp else None,
            "file_name": doc.file_name,
            "file_size": doc.file_size,
            "document_type": doc.document_type,
            "description": doc.description,
            "uploaded_at": doc.uploaded_at,
            "uploaded_by": doc.uploaded_by,
            "uploader_name": (uploader.employee.full_name if (uploader and uploader.employee) else (uploader.username if uploader else "System")),
            "download_url": f"/api/documents/{doc.id}/download",
        })
    return documents_out


def get_document_file_for_download(db: Session, current_user: User, document_id: int):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Ownership check
    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee or doc.employee_id != current_user.employee.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to download this document.",
            )

    file_path = os.path.join(UPLOAD_DIR, doc.file_url)
    # Prevent traversal
    real_path = os.path.realpath(file_path)
    if not real_path.startswith(os.path.realpath(UPLOAD_DIR)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path.")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file missing on disk.")

    return file_path, doc.file_name


def delete_document(db: Session, current_user: User, document_id: int):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if current_user.role == UserRole.EMPLOYEE:
        if not current_user.employee or doc.employee_id != current_user.employee.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this document.",
            )

    # Remove file from disk
    file_path = os.path.join(UPLOAD_DIR, doc.file_url)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully."}
