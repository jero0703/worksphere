"""phase4_experience_and_integrations

Revision ID: 7a1b92c43e5f
Revises: 0cca4adb8e64
Create Date: 2026-10-28 10:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1b92c43e5f'
down_revision: Union[str, Sequence[str], None] = '0cca4adb8e64'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to Phase 4."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Onboarding
    if 'onboarding' not in existing_tables:
        op.create_table(
            'onboarding',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('employee_id', sa.Integer(), nullable=False),
            sa.Column('task_name', sa.String(length=255), nullable=False),
            sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False),
            sa.Column('due_date', sa.Date(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_onboarding_id'), 'onboarding', ['id'], unique=False)
        op.create_index(op.f('ix_onboarding_employee_id'), 'onboarding', ['employee_id'], unique=False)
        op.create_index(op.f('ix_onboarding_status'), 'onboarding', ['status'], unique=False)

    # 2. Resignations
    if 'resignations' not in existing_tables:
        op.create_table(
            'resignations',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('employee_id', sa.Integer(), nullable=False),
            sa.Column('reason', sa.Text(), nullable=False),
            sa.Column('notice_period', sa.Integer(), nullable=False),
            sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False),
            sa.Column('reviewed_by', sa.Integer(), nullable=True),
            sa.Column('reviewed_at', sa.DateTime(), nullable=True),
            sa.Column('review_comment', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_resignations_id'), 'resignations', ['id'], unique=False)
        op.create_index(op.f('ix_resignations_employee_id'), 'resignations', ['employee_id'], unique=False)
        op.create_index(op.f('ix_resignations_status'), 'resignations', ['status'], unique=False)

    # 3. Announcements
    if 'announcements' not in existing_tables:
        op.create_table(
            'announcements',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('priority', sa.String(length=20), server_default='MEDIUM', nullable=False),
            sa.Column('created_by', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_announcements_id'), 'announcements', ['id'], unique=False)
        op.create_index(op.f('ix_announcements_priority'), 'announcements', ['priority'], unique=False)

    # 4. Tasks
    if 'tasks' not in existing_tables:
        op.create_table(
            'tasks',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('assigned_to', sa.Integer(), nullable=False),
            sa.Column('assigned_by', sa.Integer(), nullable=True),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('due_date', sa.Date(), nullable=True),
            sa.Column('priority', sa.String(length=20), server_default='MEDIUM', nullable=False),
            sa.Column('status', sa.String(length=20), server_default='PENDING', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['assigned_to'], ['employees.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)
        op.create_index(op.f('ix_tasks_assigned_to'), 'tasks', ['assigned_to'], unique=False)
        op.create_index(op.f('ix_tasks_status'), 'tasks', ['status'], unique=False)
        op.create_index(op.f('ix_tasks_priority'), 'tasks', ['priority'], unique=False)

    # 5. Feedback
    if 'feedback' not in existing_tables:
        op.create_table(
            'feedback',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('employee_id', sa.Integer(), nullable=True),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('category', sa.String(length=100), nullable=False),
            sa.Column('rating', sa.Integer(), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('is_anonymous', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('status', sa.String(length=20), server_default='NEW', nullable=False),
            sa.Column('hr_response', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_feedback_id'), 'feedback', ['id'], unique=False)
        op.create_index(op.f('ix_feedback_category'), 'feedback', ['category'], unique=False)
        op.create_index(op.f('ix_feedback_status'), 'feedback', ['status'], unique=False)

    # 6. User Settings
    if 'user_settings' not in existing_tables:
        op.create_table(
            'user_settings',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('email_notifications', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('in_app_notifications', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('task_reminders', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('announcement_alerts', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('theme', sa.String(length=20), server_default='light', nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id'),
        )
        op.create_index(op.f('ix_user_settings_id'), 'user_settings', ['id'], unique=False)

    # 7. Add address and emergency_contact to employees table if missing
    emp_columns = [col['name'] for col in inspector.get_columns('employees')]
    if 'address' not in emp_columns:
        op.add_column('employees', sa.Column('address', sa.String(length=255), nullable=True))
    if 'emergency_contact' not in emp_columns:
        op.add_column('employees', sa.Column('emergency_contact', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'user_settings' in existing_tables:
        op.drop_table('user_settings')
    if 'feedback' in existing_tables:
        op.drop_table('feedback')
    if 'tasks' in existing_tables:
        op.drop_table('tasks')
    if 'announcements' in existing_tables:
        op.drop_table('announcements')
    if 'resignations' in existing_tables:
        op.drop_table('resignations')
    if 'onboarding' in existing_tables:
        op.drop_table('onboarding')

    emp_columns = [col['name'] for col in inspector.get_columns('employees')]
    if 'emergency_contact' in emp_columns:
        op.drop_column('employees', 'emergency_contact')
    if 'address' in emp_columns:
        op.drop_column('employees', 'address')
