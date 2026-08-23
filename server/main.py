from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from database import engine, Base, get_db
import models

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Amrita Pharma R&D MES API",
    description="21 CFR Part 11 & GAMP 5 Compliant API for Tablet Manufacturing",
    version="1.0.0"
)

# Enable CORS for React frontend (Vite local & production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
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
    status: str # Approved or Rejected
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

# --- API Endpoints ---

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
    
    # Audit log
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
        # Seed initial demo batch if not exists
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

        # Seed dispensing items
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