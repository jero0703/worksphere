from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, BigInteger, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    document_type = Column(String(50), nullable=False, default="Other", index=True)  # ID, Certificate, Contract, Resume, Other
    description = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now(), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])
