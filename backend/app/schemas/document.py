from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DocumentBase(BaseModel):
    document_type: str = "Other"
    description: Optional[str] = None


class DocumentCreate(DocumentBase):
    employee_id: Optional[int] = None


class DocumentResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department: Optional[str] = None
    file_name: str
    file_size: int
    document_type: str
    description: Optional[str] = None
    uploaded_at: datetime
    uploaded_by: Optional[int] = None
    uploader_name: Optional[str] = None
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
