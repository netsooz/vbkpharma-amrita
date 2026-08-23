print("######## MAIN.PY LOADED ########")
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from database import get_db, initialize_db
import models

initialize_db()

app = FastAPI(
    title="Amrita Pharma R&D MES API",
    description="21 CFR Part 11 & GAMP 5 Compliant API for Tablet Manufacturing",
    version="1.0.0"
)


def seed_demo_content(db: Session) -> dict:
    if db.query(models.Supplier).count() > 0:
        return {"message": "Master data already seeded", "seeded": False}

    supplier1 = models.Supplier(
        supplier_code="SUP-001",
        supplier_name="Apex Pharma Ingredients",
        supplier_type="API",
        qualification_status="Approved",
    )
    supplier2 = models.Supplier(
        supplier_code="SUP-002",
        supplier_name="Cellulose Labs Ltd",
        supplier_type="Excipient",
        qualification_status="Approved",
    )
    supplier3 = models.Supplier(
        supplier_code="SUP-003",
        supplier_name="Prime Pack Solutions",
        supplier_type="Packaging",
        qualification_status="Approved",
    )
    db.add_all([supplier1, supplier2, supplier3])
    db.flush()

    manufacturer1 = models.Manufacturer(
        manufacturer_code="MFR-001",
        manufacturer_name="Apex Pharma Pvt Ltd",
        site_location="Hyderabad",
        gmp_status="Approved",
    )
    db.add(manufacturer1)
    db.flush()

    storage1 = models.StorageLocation(
        location_code="WH-01",
        location_name="Warehouse A",
        area_type="Warehouse",
        room_condition="Controlled",
        is_quarantine=False,
    )
    storage2 = models.StorageLocation(
        location_code="QC-01",
        location_name="Quarantine Zone",
        area_type="QC Hold",
        room_condition="Controlled",
        is_quarantine=True,
    )
    db.add_all([storage1, storage2])
    db.flush()

    material1 = models.MaterialMaster(
        material_code="API-PCM-01",
        material_name="Paracetamol IP/USP",
        material_type="API",
        category="Active Pharma Ingredient",
        grade="USP",
        strength="500 mg",
        uom="kg",
        shelf_life_days=730,
        storage_condition="Controlled Room",
        status="Approved",
        supplier_id=supplier1.id,
        manufacturer_id=manufacturer1.id,
        storage_location_id=storage1.id,
        approved_by="QA Lead",
        approved_on=datetime.utcnow(),
    )
    material2 = models.MaterialMaster(
        material_code="EXC-MCC-02",
        material_name="Microcrystalline Cellulose PH-102",
        material_type="Excipient",
        category="Excipient",
        grade="Pharma Grade",
        uom="kg",
        shelf_life_days=540,
        storage_condition="Controlled Room",
        status="Approved",
        supplier_id=supplier2.id,
        storage_location_id=storage1.id,
        approved_by="QA Lead",
        approved_on=datetime.utcnow(),
    )
    db.add_all([material1, material2])
    db.flush()

    formulation = models.Formulation(
        formulation_code="MR-PCM-500ER",
        product_name="Paracetamol 500mg Extended Release",
        dosage_form="Tablet",
        strength="500 mg",
        version="v2.1",
        status="Approved",
        batch_size_kg=100.0,
        approved_by="Head of R&D",
        approved_on=datetime.utcnow(),
    )
    db.add(formulation)
    db.flush()

    db.add_all([
        models.FormulationIngredient(
            formulation_id=formulation.id,
            material_id=material1.id,
            material_code=material1.material_code,
            material_name=material1.material_name,
            material_type=material1.material_type,
            required_quantity=90.0,
            uom="kg",
            percentage_w_w=90.0,
            tolerance_pct=0.5,
            is_critical=True,
        ),
        models.FormulationIngredient(
            formulation_id=formulation.id,
            material_id=material2.id,
            material_code=material2.material_code,
            material_name=material2.material_name,
            material_type=material2.material_type,
            required_quantity=7.5,
            uom="kg",
            percentage_w_w=7.5,
            tolerance_pct=1.0,
            is_critical=False,
        ),
    ])

    equipment = models.EquipmentMaster(
        equipment_code="PRESS-36STN",
        equipment_name="36-Station Rotary Tablet Press",
        category="Tablet Press",
        model_number="Korsch XL-400",
        manufacturer="Korsch AG",
        room_location="Compression Suite A",
        calibration_date="2026-06-20",
        calibration_due_date="2026-12-20",
        status="Qualified & Available",
        last_line_clearance_batch="TAB-2026-004",
    )
    db.add(equipment)

    inventory_lot_1 = models.InventoryLot(
        lot_number="LOT-INV-001",
        material_code=material1.material_code,
        material_name=material1.material_name,
        material_type=material1.material_type,
        supplier=supplier1.supplier_name,
        supplier_lot="SUP-LOT-1001",
        quantity=120.0,
        uom="kg",
        storage_location="WH-01",
        expiry_date="2027-12-31",
        status="Quarantine",
    )
    inventory_lot_2 = models.InventoryLot(
        lot_number="LOT-INV-002",
        material_code=material2.material_code,
        material_name=material2.material_name,
        material_type=material2.material_type,
        supplier=supplier2.supplier_name,
        supplier_lot="SUP-LOT-2002",
        quantity=75.0,
        uom="kg",
        storage_location="WH-01",
        expiry_date="2028-06-30",
        status="Approved",
    )
    db.add_all([inventory_lot_1, inventory_lot_2])

    db.commit()
    return {"message": "Master data seeded successfully", "seeded": True}


def ensure_demo_seed() -> None:
    db = next(get_db())
    try:
        seed_demo_content(db)
    finally:
        db.close()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_demo_seed()


class InventoryItemCreate(BaseModel):
    lot_number: str
    material_code: str
    material_name: str
    material_type: str
    supplier: str
    supplier_lot: str
    quantity: float
    uom: str
    storage_location: str
    expiry_date: str


class QCReleaseRequest(BaseModel):
    status: str
    signer_name: str
    signature_meaning: str
    password_verification: str


class DispenseVerifyRequest(BaseModel):
    dispensing_item_id: str
    scanned_lot: str
    gross_weight: float
    tare_weight: float
    signer_name: str


class AdvanceStageRequest(BaseModel):
    signer_name: str
    signature_meaning: str
    step_data: dict = {}


class SupplierCreate(BaseModel):
    supplier_code: str
    supplier_name: str
    supplier_type: str = "Raw Material"
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    qualification_status: str = "Approved"


class ManufacturerCreate(BaseModel):
    manufacturer_code: str
    manufacturer_name: str
    site_location: Optional[str] = None
    license_number: Optional[str] = None
    gmp_status: str = "Approved"


class StorageLocationCreate(BaseModel):
    location_code: str
    location_name: str
    area_type: str = "Warehouse"
    room_condition: str = "Controlled"
    is_quarantine: bool = False


class MaterialMasterCreate(BaseModel):
    material_code: str
    material_name: str
    material_type: str = "API"
    category: Optional[str] = None
    grade: Optional[str] = None
    strength: Optional[str] = None
    uom: str = "kg"
    shelf_life_days: int = 365
    storage_condition: str = "Controlled Room"
    status: str = "Approved"
    supplier_id: Optional[str] = None
    manufacturer_id: Optional[str] = None
    storage_location_id: Optional[str] = None
    approved_by: Optional[str] = None


class FormulationIngredientCreate(BaseModel):
    material_code: str
    material_name: str
    material_type: str = "API"
    required_quantity: float
    uom: str = "kg"
    percentage_w_w: float = 0.0
    tolerance_pct: float = 0.0
    is_critical: bool = False


class FormulationCreate(BaseModel):
    formulation_code: str
    product_name: str
    dosage_form: str = "Tablet"
    strength: str = "500 mg"
    version: str = "v1.0"
    status: str = "Draft"
    batch_size_kg: float = 100.0
    approved_by: Optional[str] = None
    ingredients: List[FormulationIngredientCreate] = []


class EquipmentCreate(BaseModel):
    equipment_code: str
    equipment_name: str
    category: str = "Tablet Press"
    model_number: Optional[str] = None
    manufacturer: Optional[str] = None
    room_location: Optional[str] = None
    calibration_date: Optional[str] = None
    calibration_due_date: Optional[str] = None
    status: str = "Qualified & Available"
    last_line_clearance_batch: Optional[str] = None


@app.get("/")
def root():
    return {"status": "ok", "service": "amrita-pharma-api", "docs": "/docs"}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "amrita-pharma-api"}


@app.get("/api/inventory")
def get_inventory(db: Session = Depends(get_db)):
    return db.query(models.InventoryLot).order_by(models.InventoryLot.received_date.desc()).all()


@app.post("/api/inventory/inward")
def create_goods_inward(item: InventoryItemCreate, db: Session = Depends(get_db)):
    new_lot = models.InventoryLot(
        lot_number=item.lot_number,
        material_code=item.material_code,
        material_name=item.material_name,
        material_type=item.material_type,
        supplier=item.supplier,
        supplier_lot=item.supplier_lot,
        quantity=item.quantity,
        uom=item.uom,
        storage_location=item.storage_location,
        expiry_date=item.expiry_date,
        status="Quarantine"
    )
    db.add(new_lot)

    audit = models.AuditLog(
        entity_name="InventoryLot",
        entity_id=new_lot.lot_number,
        action="GOODS_INWARD_RECEIPT",
        performed_by="System Inward",
        signature_meaning="Goods Receipt Authorization",
        details_json={"quantity": item.quantity, "uom": item.uom}
    )
    db.add(audit)
    db.commit()
    db.refresh(new_lot)
    return new_lot


@app.post("/api/inventory/{lot_number}/qc-release")
def qc_release_lot(lot_number: str, req: QCReleaseRequest, db: Session = Depends(get_db)):
    lot = db.query(models.InventoryLot).filter(models.InventoryLot.lot_number == lot_number).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    lot.status = req.status
    lot.released_by = f"{req.signer_name} ({req.signature_meaning})"
    lot.release_date = datetime.utcnow().strftime("%Y-%m-%d")

    audit = models.AuditLog(
        entity_name="InventoryLot",
        entity_id=lot.lot_number,
        action=f"QC_STATUS_CHANGE_TO_{req.status.upper()}",
        performed_by=req.signer_name,
        signature_meaning=req.signature_meaning,
        details_json={"new_status": req.status}
    )
    db.add(audit)
    db.commit()
    return {"message": f"Lot {lot_number} successfully updated to {req.status}", "lot": lot}


@app.get("/api/batch/{batch_number}")
def get_batch(batch_number: str, db: Session = Depends(get_db)):
    batch = db.query(models.ProductionBatch).filter(models.ProductionBatch.batch_number == batch_number).first()
    if not batch:
        batch = models.ProductionBatch(
            batch_number=batch_number,
            product_name="Paracetamol 500mg Extended Release",
            batch_size_kg=100.0,
            target_tablet_count=180000,
            current_step_index=0,
            status="In Progress"
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)

        items = [
            models.BatchDispensingItem(batch_id=batch.id, material_code="API-PCM-01", material_name="Paracetamol IP/USP", target_qty=90.0),
            models.BatchDispensingItem(batch_id=batch.id, material_code="EXC-MCC-02", material_name="Microcrystalline Cellulose", target_qty=7.5),
            models.BatchDispensingItem(batch_id=batch.id, material_code="EXC-PVP-04", material_name="Povidone (PVP K-30)", target_qty=2.0),
            models.BatchDispensingItem(batch_id=batch.id, material_code="EXC-MGST-03", material_name="Magnesium Stearate", target_qty=0.5),
        ]
        db.add_all(items)
        db.commit()

    return {
        "batch": batch,
        "dispensing_items": db.query(models.BatchDispensingItem).filter(models.BatchDispensingItem.batch_id == batch.id).all()
    }


@app.get("/api/audit-logs")
def get_audit_trail(db: Session = Depends(get_db)):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp_utc.desc()).all()


@app.get("/api/master-data")
def get_master_data(db: Session = Depends(get_db)):
    materials = db.query(models.MaterialMaster).all()
    suppliers = db.query(models.Supplier).all()
    manufacturers = db.query(models.Manufacturer).all()
    locations = db.query(models.StorageLocation).all()
    formulations = db.query(models.Formulation).all()
    equipment = db.query(models.EquipmentMaster).all()
    return {
        "materials": materials,
        "suppliers": suppliers,
        "manufacturers": manufacturers,
        "locations": locations,
        "formulations": formulations,
        "equipment": equipment,
    }


@app.get("/api/materials")
def list_materials(db: Session = Depends(get_db)):
    return db.query(models.MaterialMaster).order_by(models.MaterialMaster.material_name.asc()).all()


@app.post("/api/materials")
def create_material(item: MaterialMasterCreate, db: Session = Depends(get_db)):
    existing = db.query(models.MaterialMaster).filter(models.MaterialMaster.material_code == item.material_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Material code already exists")

    db_item = models.MaterialMaster(
        material_code=item.material_code,
        material_name=item.material_name,
        material_type=item.material_type,
        category=item.category,
        grade=item.grade,
        strength=item.strength,
        uom=item.uom,
        shelf_life_days=item.shelf_life_days,
        storage_condition=item.storage_condition,
        status=item.status,
        supplier_id=item.supplier_id,
        manufacturer_id=item.manufacturer_id,
        storage_location_id=item.storage_location_id,
        approved_by=item.approved_by,
        approved_on=datetime.utcnow(),
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/suppliers")
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(models.Supplier).order_by(models.Supplier.supplier_name.asc()).all()


@app.post("/api/suppliers")
def create_supplier(item: SupplierCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Supplier).filter(models.Supplier.supplier_code == item.supplier_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Supplier code already exists")
    db_item = models.Supplier(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/manufacturers")
def list_manufacturers(db: Session = Depends(get_db)):
    return db.query(models.Manufacturer).order_by(models.Manufacturer.manufacturer_name.asc()).all()


@app.post("/api/manufacturers")
def create_manufacturer(item: ManufacturerCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Manufacturer).filter(models.Manufacturer.manufacturer_code == item.manufacturer_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Manufacturer code already exists")
    db_item = models.Manufacturer(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/storage-locations")
def list_storage_locations(db: Session = Depends(get_db)):
    return db.query(models.StorageLocation).order_by(models.StorageLocation.location_name.asc()).all()


@app.post("/api/storage-locations")
def create_storage_location(item: StorageLocationCreate, db: Session = Depends(get_db)):
    existing = db.query(models.StorageLocation).filter(models.StorageLocation.location_code == item.location_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Storage location code already exists")
    db_item = models.StorageLocation(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/formulations")
def list_formulations(db: Session = Depends(get_db)):
    return db.query(models.Formulation).order_by(models.Formulation.product_name.asc()).all()


@app.post("/api/formulations")
def create_formulation(item: FormulationCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Formulation).filter(models.Formulation.formulation_code == item.formulation_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Formulation code already exists")

    formulation = models.Formulation(
        formulation_code=item.formulation_code,
        product_name=item.product_name,
        dosage_form=item.dosage_form,
        strength=item.strength,
        version=item.version,
        status=item.status,
        batch_size_kg=item.batch_size_kg,
        approved_by=item.approved_by,
    )
    db.add(formulation)
    db.flush()

    for ing in item.ingredients:
        material = db.query(models.MaterialMaster).filter(models.MaterialMaster.material_code == ing.material_code).first()
        if not material:
            material = models.MaterialMaster(
                material_code=ing.material_code,
                material_name=ing.material_name,
                material_type=ing.material_type,
                uom=ing.uom,
                status="Approved",
            )
            db.add(material)
            db.flush()

        db.add(models.FormulationIngredient(
            formulation_id=formulation.id,
            material_id=material.id,
            material_code=material.material_code,
            material_name=material.material_name,
            material_type=material.material_type,
            required_quantity=ing.required_quantity,
            uom=ing.uom,
            percentage_w_w=ing.percentage_w_w,
            tolerance_pct=ing.tolerance_pct,
            is_critical=ing.is_critical,
        ))

    db.commit()
    db.refresh(formulation)
    return formulation


@app.get("/api/equipment")
def list_equipment(db: Session = Depends(get_db)):
    return db.query(models.EquipmentMaster).order_by(models.EquipmentMaster.equipment_name.asc()).all()


@app.post("/api/equipment")
def create_equipment(item: EquipmentCreate, db: Session = Depends(get_db)):
    existing = db.query(models.EquipmentMaster).filter(models.EquipmentMaster.equipment_code == item.equipment_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Equipment code already exists")
    db_item = models.EquipmentMaster(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/master-data/seed")
def seed_master_data(db: Session = Depends(get_db)):
    return seed_demo_content(db)


@app.get("/api/master-data/dashboard")
def get_master_data_dashboard(db: Session = Depends(get_db)):
    return {
        "total_materials": db.query(models.MaterialMaster).count(),
        "total_suppliers": db.query(models.Supplier).count(),
        "total_formulations": db.query(models.Formulation).count(),
        "total_equipment": db.query(models.EquipmentMaster).count(),
        "approved_materials": db.query(models.MaterialMaster).filter(models.MaterialMaster.status == "Approved").count(),
        "quarantine_lots": db.query(models.InventoryLot).filter(models.InventoryLot.status == "Quarantine").count(),
    }
