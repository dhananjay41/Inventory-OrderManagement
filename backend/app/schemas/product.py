from datetime import datetime
from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    sku: str
    description: str | None = None
    price: float
    stock_quantity: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = None
    stock_quantity: int | None = None


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
