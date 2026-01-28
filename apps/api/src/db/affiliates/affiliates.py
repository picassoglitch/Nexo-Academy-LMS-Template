from __future__ import annotations

from enum import Enum
from typing import Optional
from datetime import datetime

from sqlmodel import SQLModel, Field, Column, BigInteger, ForeignKey, String


class AffiliateAttributionModelEnum(str, Enum):
    LAST_CLICK = "last_click"
    FIRST_CLICK = "first_click"


class AffiliateStatusEnum(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"


class AffiliateCommissionStatusEnum(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    REVERSED = "reversed"


class AffiliateProgramBase(SQLModel):
    enabled: bool = True
    attribution_window_days: int = 30
    attribution_model: AffiliateAttributionModelEnum = AffiliateAttributionModelEnum.LAST_CLICK

    # Commission rules
    subscription_first_cycles: int = 6
    subscription_first_rate: float = 0.50
    subscription_recurring_rate: float = 0.20
    one_time_rate: float = 0.30


class AffiliateProgram(AffiliateProgramBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    creation_date: datetime = Field(default=datetime.now())
    update_date: datetime = Field(default=datetime.now())


class AffiliateBase(SQLModel):
    name: str = ""
    email: str = ""
    status: AffiliateStatusEnum = AffiliateStatusEnum.ACTIVE


class Affiliate(AffiliateBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    # Optional: link to a real platform user (if/when they create an account).
    user_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
    )
    creation_date: datetime = Field(default=datetime.now())
    update_date: datetime = Field(default=datetime.now())


class AffiliateCodeBase(SQLModel):
    code: str = Field(sa_column=Column(String, unique=True, index=True))
    status: AffiliateStatusEnum = AffiliateStatusEnum.ACTIVE


class AffiliateCode(AffiliateCodeBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    affiliate_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("affiliate.id", ondelete="CASCADE"))
    )
    creation_date: datetime = Field(default=datetime.now())


class AffiliateClickBase(SQLModel):
    landing_url: str = ""
    user_agent: str = ""
    ip_hash: str = ""


class AffiliateClick(AffiliateClickBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    affiliate_code_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("affiliatecode.id", ondelete="CASCADE"))
    )
    creation_date: datetime = Field(default=datetime.now())


class AffiliateAttributionBase(SQLModel):
    attributed_at: datetime = Field(default=datetime.now())
    expires_at: Optional[datetime] = None
    locked: bool = False
    locked_at: Optional[datetime] = None
    # For subscriptions: used to count cycles.
    provider_subscription_id: Optional[str] = None


class AffiliateAttribution(AffiliateAttributionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="CASCADE"))
    )
    affiliate_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("affiliate.id", ondelete="CASCADE"))
    )
    affiliate_code_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("affiliatecode.id", ondelete="SET NULL"), nullable=True),
        default=None,
    )
    affiliate_click_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("affiliateclick.id", ondelete="SET NULL"), nullable=True),
    )


class AffiliateCommissionBase(SQLModel):
    currency: str = "USD"
    amount_cents: int = 0
    rate_applied: float = 0.0
    cycle_number: int = 1
    status: AffiliateCommissionStatusEnum = AffiliateCommissionStatusEnum.PENDING
    provider_event_id: str = ""  # stripe event id or checkout session id
    provider_subscription_id: Optional[str] = None
    creation_date: datetime = Field(default=datetime.now())
    paid_at: Optional[datetime] = None
    reversed_at: Optional[datetime] = None


class AffiliateCommission(AffiliateCommissionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    org_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("organization.id", ondelete="CASCADE"))
    )
    affiliate_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("affiliate.id", ondelete="CASCADE"))
    )
    user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("user.id", ondelete="CASCADE"))
    )
    payment_user_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("paymentsuser.id", ondelete="SET NULL"), nullable=True),
    )
    product_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, ForeignKey("paymentsproduct.id", ondelete="SET NULL"), nullable=True),
    )


class AffiliateProgramUpdate(AffiliateProgramBase):
    pass


class AffiliateCreate(AffiliateBase):
    user_id: Optional[int] = None


class AffiliateRead(AffiliateBase):
    id: int
    org_id: int
    user_id: Optional[int]


class AffiliateCodeRead(AffiliateCodeBase):
    id: int
    affiliate_id: int
    org_id: int


class AffiliateStatsRead(SQLModel):
    affiliate_id: int
    clicks: int = 0
    signups: int = 0
    pending_amount_cents: int = 0
    paid_amount_cents: int = 0
    currency: str = "USD"

