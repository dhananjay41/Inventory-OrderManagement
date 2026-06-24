from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models.product import Product
from ..models.customer import Customer
from ..models.order import Order, OrderItem
from ..schemas.order import OrderCreate, OrderStatusUpdate, OrderResponse

router = APIRouter(prefix="/orders", tags=["orders"])


def _load_order(order_id: int, db: Session) -> Order:
    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("", response_model=list[OrderResponse])
def list_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.items).joinedload(OrderItem.product),
        )
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("", response_model=OrderResponse, status_code=201)
def create_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    if not db.query(Customer).filter(Customer.id == order_data.customer_id).first():
        raise HTTPException(status_code=404, detail="Customer not found")

    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    # Validate stock and lock rows
    total_amount = 0.0
    resolved_items: list[tuple[Product, int]] = []

    for item in order_data.items:
        product = (
            db.query(Product)
            .filter(Product.id == item.product_id)
            .with_for_update()
            .first()
        )
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient stock for '{product.name}'. "
                    f"Available: {product.stock_quantity}, requested: {item.quantity}"
                ),
            )
        resolved_items.append((product, item.quantity))
        total_amount += float(product.price) * item.quantity

    # Persist order
    new_order = Order(
        customer_id=order_data.customer_id,
        total_amount=total_amount,
        status="pending",
    )
    db.add(new_order)
    db.flush()

    for product, quantity in resolved_items:
        db.add(
            OrderItem(
                order_id=new_order.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price,
            )
        )
        product.stock_quantity -= quantity

    db.commit()
    return _load_order(new_order.id, db)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return _load_order(order_id, db)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(order_id: int, status_update: OrderStatusUpdate, db: Session = Depends(get_db)):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Restore stock when cancelling a non-cancelled order
    if status_update.status == "cancelled" and order.status != "cancelled":
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock_quantity += item.quantity

    order.status = status_update.status
    db.commit()
    return _load_order(order_id, db)


@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Restore stock unless order was already cancelled or delivered
    if order.status not in ("cancelled", "delivered"):
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock_quantity += item.quantity

    db.delete(order)
    db.commit()
