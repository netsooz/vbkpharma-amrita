import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class AppUser(Base):
    __tablename__ = "app_users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(80), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=True)
    password_hash = Column(String(300), nullable=False)
    role = Column(String(50), default="Operator")
    permissions = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    supplier_code = Column(String(50), unique=True, index=True, nullable=False)
    supplier_name = Column(String(200), nullable=False)
    supplier_type = Column(String(100), default="Raw Material")
    contact_person = Column(String(150), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(150), nullable=True)
    address = Column(Text, nullable=True)
    qualification_status = Column(String(50), default="Approved")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    materials = relationship("MaterialMaster", back_populates="supplier")


class Manufacturer(Base):
    __tablename__ = "manufacturers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    manufacturer_code = Column(String(50), unique=True, index=True, nullable=False)
    manufacturer_name = Column(String(200), nullable=False)
    site_location = Column(String(200), nullable=True)
    license_number = Column(String(100), nullable=True)
    gmp_status = Column(String(50), default="Approved")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    materials = relationship("MaterialMaster", back_populates="manufacturer")


class StorageLocation(Base):
    __tablename__ = "storage_locations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    location_code = Column(String(50), unique=True, index=True, nullable=False)
    location_name = Column(String(200), nullable=False)
    area_type = Column(String(100), default="Warehouse")
    room_condition = Column(String(100), default="Controlled")
    is_quarantine = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    materials = relationship("MaterialMaster", back_populates="storage_location")


class MaterialMaster(Base):
    __tablename__ = "material_masters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    material_code = Column(String(50), unique=True, index=True, nullable=False)
    material_name = Column(String(200), nullable=False)
    material_type = Column(String(50), default="API")
    category = Column(String(100), nullable=True)
    grade = Column(String(100), nullable=True)
    strength = Column(String(100), nullable=True)
    uom = Column(String(50), default="kg")
    shelf_life_days = Column(Integer, default=365)
    storage_condition = Column(String(100), default="Controlled Room")
    status = Column(String(50), default="Approved")
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    manufacturer_id = Column(String, ForeignKey("manufacturers.id"), nullable=True)
    storage_location_id = Column(String, ForeignKey("storage_locations.id"), nullable=True)
    approved_by = Column(String(150), nullable=True)
    approved_on = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="materials")
    manufacturer = relationship("Manufacturer", back_populates="materials")
    storage_location = relationship("StorageLocation", back_populates="materials")
    formulation_links = relationship("FormulationIngredient", back_populates="material")


class InventoryLot(Base):
    __tablename__ = "inventory_lots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lot_number = Column(String(50), unique=True, index=True, nullable=False)
    material_code = Column(String(50), nullable=False)
    material_name = Column(String(200), nullable=False)
    material_type = Column(String(50), default="API")
    supplier = Column(String(150), nullable=False)
    supplier_lot = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    uom = Column(String(20), default="kg")
    storage_location = Column(String(100), nullable=False)
    status = Column(String(50), default="Quarantine")
    expiry_date = Column(String(50), nullable=False)
    received_date = Column(DateTime, default=datetime.utcnow)
    released_by = Column(String(150), nullable=True)
    release_date = Column(String(50), nullable=True)
    barcode = Column(String(100), nullable=True)


class Formulation(Base):
    __tablename__ = "formulations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    formulation_code = Column(String(50), unique=True, index=True, nullable=False)
    product_name = Column(String(200), nullable=False)
    bom_type = Column(String(20), default="Manufacturing")
    dosage_form = Column(String(50), default="Tablet")
    strength = Column(String(100), nullable=True)
    version = Column(String(20), default="v1.0")
    status = Column(String(50), default="Draft")
    batch_size_kg = Column(Float, default=100.0)
    unit_weight_mg = Column(Float, nullable=True)
    units_per_pack = Column(Integer, nullable=True)
    approved_by = Column(String(150), nullable=True)
    approved_on = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ingredients = relationship("FormulationIngredient", back_populates="formulation", cascade="all, delete-orphan")


class FormulationIngredient(Base):
    __tablename__ = "formulation_ingredients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    formulation_id = Column(String, ForeignKey("formulations.id"), nullable=False)
    material_id = Column(String, ForeignKey("material_masters.id"), nullable=False)
    material_code = Column(String(50), nullable=False)
    material_name = Column(String(200), nullable=False)
    material_type = Column(String(50), default="API")
    required_quantity = Column(Float, nullable=False)
    uom = Column(String(50), default="kg")
    percentage_w_w = Column(Float, default=0.0)
    tolerance_pct = Column(Float, default=0.0)
    is_critical = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    formulation = relationship("Formulation", back_populates="ingredients")
    material = relationship("MaterialMaster", back_populates="formulation_links")


class EquipmentMaster(Base):
    __tablename__ = "equipment_masters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_code = Column(String(50), unique=True, index=True, nullable=False)
    equipment_name = Column(String(200), nullable=False)
    category = Column(String(100), default="Tablet Press")
    model_number = Column(String(100), nullable=True)
    manufacturer = Column(String(200), nullable=True)
    room_location = Column(String(200), nullable=True)
    calibration_date = Column(String(50), nullable=True)
    calibration_due_date = Column(String(50), nullable=True)
    status = Column(String(100), default="Qualified & Available")
    last_line_clearance_batch = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProductionBatch(Base):
    __tablename__ = "production_batches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    batch_number = Column(String(50), unique=True, index=True, nullable=False)
    product_name = Column(String(200), nullable=False)
    batch_size_kg = Column(Float, nullable=False)
    target_tablet_count = Column(Integer, nullable=False)
    current_step_index = Column(Integer, default=0)
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


class UnitOfMeasure(Base):
    __tablename__ = "units_of_measure"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    uom_code = Column(String(20), unique=True, index=True, nullable=False)
    uom_name = Column(String(100), nullable=False)
    uom_category = Column(String(50), default="Weight")
    base_uom_code = Column(String(20), nullable=True)
    conversion_factor = Column(Float, default=1.0)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


class SpecificationMaster(Base):
    __tablename__ = "specification_masters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    spec_code = Column(String(50), unique=True, index=True, nullable=False)
    material_code = Column(String(50), nullable=False)
    material_name = Column(String(200), nullable=False)
    version = Column(String(20), default="v1.0")
    status = Column(String(50), default="Approved")
    approved_by = Column(String(150), nullable=True)
    approved_on = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    parameters = relationship("SpecificationParameter", back_populates="specification", cascade="all, delete-orphan")


class SpecificationParameter(Base):
    __tablename__ = "specification_parameters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    specification_id = Column(String, ForeignKey("specification_masters.id"), nullable=False)
    parameter_name = Column(String(150), nullable=False)
    test_method = Column(String(150), nullable=True)
    min_limit = Column(String(50), nullable=True)
    max_limit = Column(String(50), nullable=True)
    uom = Column(String(20), nullable=True)
    is_critical = Column(Boolean, default=False)

    specification = relationship("SpecificationMaster", back_populates="parameters")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_code = Column(String(50), unique=True, index=True, nullable=False)
    customer_name = Column(String(200), nullable=False)
    customer_type = Column(String(100), default="Distributor")
    gstin = Column(String(50), nullable=True)
    contact_person = Column(String(150), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(150), nullable=True)
    address = Column(Text, nullable=True)
    credit_limit = Column(Float, default=0.0)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


class TaxCode(Base):
    __tablename__ = "tax_codes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    hsn_code = Column(String(20), unique=True, index=True, nullable=False)
    description = Column(String(200), nullable=False)
    tax_percentage = Column(Float, default=0.0)
    tax_type = Column(String(50), default="GST")
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_code = Column(String(50), unique=True, index=True, nullable=False)
    transaction_type = Column(String(50), nullable=False)
    material_code = Column(String(50), nullable=False)
    material_name = Column(String(200), nullable=False)
    lot_number = Column(String(50), nullable=True)
    quantity = Column(Float, nullable=False)
    uom = Column(String(20), default="kg")
    from_location = Column(String(100), nullable=True)
    to_location = Column(String(100), nullable=True)
    related_party = Column(String(200), nullable=True)
    reference_doc = Column(String(150), nullable=True)
    reason = Column(String(250), nullable=True)
    performed_by = Column(String(150), nullable=False)
    signature_meaning = Column(String(150), nullable=True)
    status = Column(String(50), default="Completed")
    transaction_date = Column(DateTime, default=datetime.utcnow)