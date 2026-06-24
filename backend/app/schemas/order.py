from datetime import datetime
from typing import Literal
from pydantic import BaseModel
from .product import ProductResponse
from .customer import CustomerResponse


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int


class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: float
    product: ProductResponse | None = None

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    customer_id: int
    items: list[OrderItemCreate]


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "shipped", "delivered", "cancelled"]


class OrderResponse(BaseModel):
    id: int
    customer_id: int
    status: str
    total_amount: float
    created_at: datetime
    updated_at: datetime | None = None
    customer: CustomerResponse | None = None
    items: list[OrderItemResponse] = []

    model_config = {"from_attributes": True}
