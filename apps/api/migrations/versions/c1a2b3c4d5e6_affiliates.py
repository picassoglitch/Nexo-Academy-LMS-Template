"""Affiliates program (codes, attributions, commissions)

Revision ID: c1a2b3c4d5e6
Revises: eb10d15465b3
Create Date: 2026-01-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c1a2b3c4d5e6"
down_revision: Union[str, None] = "eb10d15465b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "affiliateprogram",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("org_id", sa.BigInteger(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("attribution_window_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("attribution_model", sa.String(), nullable=False, server_default="last_click"),
        sa.Column("subscription_first_cycles", sa.Integer(), nullable=False, server_default="6"),
        sa.Column("subscription_first_rate", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("subscription_recurring_rate", sa.Float(), nullable=False, server_default="0.2"),
        sa.Column("one_time_rate", sa.Float(), nullable=False, server_default="0.3"),
        sa.Column("creation_date", sa.DateTime(), nullable=True),
        sa.Column("update_date", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_affiliateprogram_org_id", "affiliateprogram", ["org_id"])

    op.create_table(
        "affiliate",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("org_id", sa.BigInteger(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(), nullable=False, server_default=""),
        sa.Column("email", sa.String(), nullable=False, server_default=""),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("creation_date", sa.DateTime(), nullable=True),
        sa.Column("update_date", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_affiliate_org_id", "affiliate", ["org_id"])

    op.create_table(
        "affiliatecode",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("org_id", sa.BigInteger(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("affiliate_id", sa.BigInteger(), sa.ForeignKey("affiliate.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("creation_date", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_affiliatecode_code", "affiliatecode", ["code"], unique=True)
    op.create_index("ix_affiliatecode_org_id", "affiliatecode", ["org_id"])

    op.create_table(
        "affiliateclick",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("org_id", sa.BigInteger(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("affiliate_code_id", sa.BigInteger(), sa.ForeignKey("affiliatecode.id", ondelete="CASCADE"), nullable=False),
        sa.Column("landing_url", sa.String(), nullable=False, server_default=""),
        sa.Column("user_agent", sa.String(), nullable=False, server_default=""),
        sa.Column("ip_hash", sa.String(), nullable=False, server_default=""),
        sa.Column("creation_date", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_affiliateclick_org_id", "affiliateclick", ["org_id"])

    op.create_table(
        "affiliateattribution",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("org_id", sa.BigInteger(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("affiliate_id", sa.BigInteger(), sa.ForeignKey("affiliate.id", ondelete="CASCADE"), nullable=False),
        sa.Column("affiliate_code_id", sa.BigInteger(), sa.ForeignKey("affiliatecode.id", ondelete="SET NULL"), nullable=True),
        sa.Column("affiliate_click_id", sa.BigInteger(), sa.ForeignKey("affiliateclick.id", ondelete="SET NULL"), nullable=True),
        sa.Column("attributed_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("locked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("locked_at", sa.DateTime(), nullable=True),
        sa.Column("provider_subscription_id", sa.String(), nullable=True),
    )
    op.create_index("ix_affiliateattribution_org_user", "affiliateattribution", ["org_id", "user_id"], unique=True)

    op.create_table(
        "affiliatecommission",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("org_id", sa.BigInteger(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("affiliate_id", sa.BigInteger(), sa.ForeignKey("affiliate.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payment_user_id", sa.BigInteger(), sa.ForeignKey("paymentsuser.id", ondelete="SET NULL"), nullable=True),
        sa.Column("product_id", sa.BigInteger(), sa.ForeignKey("paymentsproduct.id", ondelete="SET NULL"), nullable=True),
        sa.Column("currency", sa.String(), nullable=False, server_default="USD"),
        sa.Column("amount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rate_applied", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cycle_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("provider_event_id", sa.String(), nullable=False, server_default=""),
        sa.Column("provider_subscription_id", sa.String(), nullable=True),
        sa.Column("creation_date", sa.DateTime(), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("reversed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_affiliatecommission_org_id", "affiliatecommission", ["org_id"])
    op.create_index("ix_affiliatecommission_event", "affiliatecommission", ["payment_user_id", "provider_event_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_affiliatecommission_event", table_name="affiliatecommission")
    op.drop_index("ix_affiliatecommission_org_id", table_name="affiliatecommission")
    op.drop_table("affiliatecommission")

    op.drop_index("ix_affiliateattribution_org_user", table_name="affiliateattribution")
    op.drop_table("affiliateattribution")

    op.drop_index("ix_affiliateclick_org_id", table_name="affiliateclick")
    op.drop_table("affiliateclick")

    op.drop_index("ix_affiliatecode_org_id", table_name="affiliatecode")
    op.drop_index("ix_affiliatecode_code", table_name="affiliatecode")
    op.drop_table("affiliatecode")

    op.drop_index("ix_affiliate_org_id", table_name="affiliate")
    op.drop_table("affiliate")

    op.drop_index("ix_affiliateprogram_org_id", table_name="affiliateprogram")
    op.drop_table("affiliateprogram")

