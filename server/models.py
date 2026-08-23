import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class InventoryLot(Base):
    __tablename__ = "inventory_lots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lot_number = Column(String(50), unique=True, index=True, nullable=False)
    material_code = Column(String(50), nullable=False)
    material_name = Column(String(200), nullable=False)
    material_type = Column(String(50), default="API") # API, Excipient, Solvent
    supplier = Column(String(150), nullable=False)
    supplier_lot = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    uom = Column(String(20), default="kg")
    storage_location = Column(String(100), nullable=False)
    status = Column(String(50), default="Quarantine") # Quarantine, Approved, Rejected
    expiry_date = Column(String(50), nullable=False)
    received_date = Column(DateTime, default=datetime.utcnow)
    released_by = Column(String(150), nullable=True)
    release_date = Column(String(50), nullable=True)

class ProductionBatch(Base):
    __tablename__ = "production_batches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_number = Column(String(50), unique=True, index=True, nullable=False)
    product_name = Column(String(200), nullable=False)
    batch_size_kg = Column(Float, nullable=False)
    target_tablet_count = Column(Integer, nullable=False)
    current_step_index = Column(Integer, default=0) # 0 to 9 (Steps 1 to 10)
    status = Column(String(50), default="In Progress")
    step_parameters = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    dispensing_items = relationship("BatchDispensingItem", back_populates="batch")

class BatchDispensingItem(Base):
    __tablename__ = "batch_dispensing_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_id = Column(String, ForeignKey("production_batches.id"))
    material_code = Column(String(50), nullable=False)
    material_name = Column(String(200), nullable=False)
    target_qty = Column(Float, nullable=False)
    tolerance_pct = Column(Float, default=0.5)
    uom = Column(String(20), default="kg")
    scanned_lot = Column(String(50), nullable=True)
    gross_weight = Column(Float, nullable=True)
    tare_weight = Column(Float, nullable=True)
    net_dispensed = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=False)

    batch = relationship("ProductionBatch", back_populates="dispensing_items")

class AuditLog(Base):
    __tablename__ = "audit_logs_21cfr"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_name = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    performed_by = Column(String(150), nullable=False)
    role = Column(String(100), default="Operator")
    signature_meaning = Column(String(150), nullable=False)
    details_json = Column(JSON, default=dict)
    timestamp_utc = Column(DateTime, default=datetime.utcnow)