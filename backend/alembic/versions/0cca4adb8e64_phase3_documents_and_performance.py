"""phase3_documents_and_performance

Revision ID: 0cca4adb8e64
Revises: 6ea91aadb7f3
Create Date: 2026-10-26 12:29:20.663328

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0cca4adb8e64'
down_revision: Union[str, Sequence[str], None] = '6ea91aadb7f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'documents' not in existing_tables:
        op.create_table(
            'documents',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('employee_id', sa.Integer(), nullable=False),
            sa.Column('file_name', sa.String(length=255), nullable=False),
            sa.Column('file_url', sa.String(length=500), nullable=False),
            sa.Column('file_size', sa.BigInteger(), server_default='0', nullable=False),
            sa.Column('document_type', sa.String(length=50), server_default='Other', nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('uploaded_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('uploaded_by', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)
        op.create_index(op.f('ix_documents_employee_id'), 'documents', ['employee_id'], unique=False)
        op.create_index(op.f('ix_documents_document_type'), 'documents', ['document_type'], unique=False)

    if 'performance' not in existing_tables:
        op.create_table(
            'performance',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('employee_id', sa.Integer(), nullable=False),
            sa.Column('review_period', sa.String(length=50), nullable=False),
            sa.Column('rating', sa.Numeric(precision=3, scale=1), nullable=False),
            sa.Column('feedback', sa.Text(), nullable=False),
            sa.Column('goals', sa.Text(), nullable=True),
            sa.Column('reviewer_id', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_performance_id'), 'performance', ['id'], unique=False)
        op.create_index(op.f('ix_performance_employee_id'), 'performance', ['employee_id'], unique=False)
        op.create_index(op.f('ix_performance_review_period'), 'performance', ['review_period'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_performance_review_period'), table_name='performance')
    op.drop_index(op.f('ix_performance_employee_id'), table_name='performance')
    op.drop_index(op.f('ix_performance_id'), table_name='performance')
    op.drop_table('performance')

    op.drop_index(op.f('ix_documents_document_type'), table_name='documents')
    op.drop_index(op.f('ix_documents_employee_id'), table_name='documents')
    op.drop_index(op.f('ix_documents_id'), table_name='documents')
    op.drop_table('documents')
