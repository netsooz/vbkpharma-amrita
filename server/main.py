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


# Raw material catalog sourced from Reference/2025-07-10 FDA Raw Material List.pdf
FDA_RAW_MATERIALS = [
    ("AC01", "Acetaminophen USP Dense Powder"),
    ("AC02", "Acacia NF Powder"),
    ("AC03", "Acetaminophen 90% Granular"),
    ("AL01", "Alcohol USP 95%"),
    ("AP02", "Apricot Peach Flavor #PFC8500 (F&J)"),
    ("AP03", "Apricot Flavor #5.1003 (Bell)"),
    ("BB01", "Blueberry Flavor Art #FC1027 (Ungerer)"),
    ("BB02", "Blueberry Flavor #0332 (MM)"),
    ("BE01", "Benzalkonium Chloride Solution NF 50%"),
    ("BE02", "Benzoic Acid USP"),
    ("BI01", "Bitter Masking Agent Art #14078 (Ungerer)"),
    ("BL01", "FD&C Blue #1 Dye Powder"),
    ("BL1L", "FD&C Blue #1 Aluminum Lake"),
    ("BPS2", "Bromfed Mixture #2 (6-60) SR Beads"),
    ("BPS3", "Bromfed Mixture #3 (6-60) SR Beads"),
    ("BR01", "Brompheniramine Maleate USP Fine Powder"),
    ("BR02", "Brompheniramine Maleate USP"),
    ("BU01", "Butylparaben USP/NF"),
    ("BU02", "Butalbital"),
    ("CA01", "Calcium Stearate NF Powder"),
    ("CA02", "Caffeine USP Anhydrous"),
    ("CA05", "Calcium Sulfate Anhydrous"),
    ("CA07", "Calcium Phosphate Dibasic USP Dihydrate"),
    ("CA08", "Caramel Color #AP100 (Sethness)"),
    ("CA09", "Carbinoxamine Maleate USP"),
    ("CA10", "Calcium Phosphate Dibasic USP Anhydrous"),
    ("CH01", "Chlorpheniramine Maleate USP Fine Powder"),
    ("CH02", "Chloroxylenol USP"),
    ("CH03", "Chlorpheniramine Maleate USP"),
    ("CHF1", "Cherry Blend #PFC8513 (F&J)"),
    ("CHF2", "Wild Cherry Flavor Art #DP657969 (C&K)"),
    ("CHF3", "Cherry Flavor Art #33.8371 (Bell)"),
    ("CI01", "Citric Acid USP Anhydrous"),
    ("CI02", "Cimetidine Hydrochloride"),
    ("CL02", "Clemastine Fumarate USP"),
    ("CM3S", "Chlorpheniramine 3.8% Pink SR Beads"),
    ("CM4S", "Chlorpheniramine 3.8% White SR Beads"),
    ("CO01", "Corn Syrup 42/43 NF"),
    ("CO03", "Codeine Phosphate USP"),
    ("CPS1", "Chlor-Pseudo Mixture #1 SR Beads"),
    ("DE01", "Dextromethorphan Hydrobromide USP"),
    ("DE03", "Dexbrompheniramine Maleate USP"),
    ("DI02", "Di-Pac Sugar NF"),
    ("ED01", "EDTA Disodium"),
    ("ER01", "Ergonovine Maleate USP"),
    ("ET01", "Ethocel 10 Premium"),
    ("EU03", "Eudragit NE 30 D"),
    ("GL01", "Glycerin USP"),
    ("GR03", "Grape Flavor Art #A1162800 (C&K)"),
    ("GRF1", "Grape Flavor Spray Dried #F9866 (F&J)"),
    ("GRLB", "Green Lake Blend"),
    ("GU01", "Guaifenesin USP"),
    ("HY01", "Hyoscyamine Sulfate USP"),
    ("HY02", "Hydrocodone Bitartrate USP"),
    ("HY03", "Hydrocortisone USP Micronized"),
    ("IS01", "Isopropyl Alcohol USP"),
    ("IS02", "Isometheptene Mucate USP"),
    ("LA01", "Lactose Monohydrate NF #310 (Regular)"),
    ("LA02", "Lactose Monohydrate NF #316 (Fast-Flo)"),
    ("LLF1", "Lemon-Lime Blend #PFC8406 (F&J)"),
    ("MA01", "Magnesium Stearate NF"),
    ("MA02", "Mannitol USP Powder"),
    ("MA06", "Magnesium Salicylate USP"),
    ("MA07", "Mannitol USP Granular 2080"),
    ("ME02", "Methyl Alcohol NF"),
    ("ME04", "Menthol USP"),
    ("ME05", "Methocel A4C Premium"),
    ("ME07", "Methscopolamine Nitrate"),
    ("ME08", "Methocel E4M Premium CR"),
    ("ME09", "Methocel K4M Premium"),
    ("MI02", "Microcrystalline Cellulose 102 NF"),
    ("MP01", "Methylparaben NF"),
    ("MT01", "Maltitol Solution NF"),
    ("OP01", "Orange Pineapple Flavor Nat & Art #7531 (MM)"),
    ("ORF2", "Orange Terpenless Blend #PFC9620 (F&J)"),
    ("PG01", "Pharmaceutical Glaze NF 4 lb."),
    ("PH01", "Phenylpropanolamine Hydrochloride USP"),
    ("PH02", "Phenylephrine Hydrochloride USP Fine Powder"),
    ("PH03", "Phenyltoloxamine Citrate"),
    ("PH06", "Phenylephrine Hydrochloride USP"),
    ("PH07", "Pheniramine Maleate USP"),
    ("PH09", "Phentermine Hydrochloride USP"),
    ("PMT1", "Peppermint Nat #113.10835"),
    ("PN01", "Pineapple Flavor Art #7520 (MM)"),
    ("PO01", "Polyethylene Glycol 400 NF"),
    ("PO02", "Potassium Guaiacolsulfonate USP"),
    ("PO03", "Polyethylene Glycol 300 NF"),
    ("PO30", "Povidone K-30 USP"),
    ("PP01", "Propylparaben NF"),
    ("PR01", "Propylene Glycol USP"),
    ("PR02", "Pramoxine Hydrochloride USP"),
    ("PR03", "Propylene Glycol Diacetate NF"),
    ("PS01", "Pseudoephedrine Hydrochloride USP Fine Powder"),
    ("PS03", "Pseudoephedrine Hydrochloride USP"),
    ("PS04", "Pseudoephedrine Sulfate USP"),
    ("PX01", "Poloxamer 188 NF"),
    ("PY01", "Pyrilamine Maleate USP"),
    ("R30L", "D&C Red #30 Aluminum Lake"),
    ("R40L", "FD&C Red #40 Aluminum Lake"),
    ("RA01", "Raspberry Flavor Nat & Art #WL22286 (H&R)"),
    ("RA02", "Raspberry Flavor Art #A1497600 (C&K)"),
    ("RA03", "Black Raspberry Flavor #7715 (MM)"),
    ("RB01", "Rootbeer Flavor #5517 (MM)"),
    ("RE33", "D&C Red #33 Dye Powder"),
    ("RE40", "FD&C Red #40 Dye Powder"),
    ("RELB", "Red Lake Blend"),
    ("RM01", "Rescon Mixture #1 (12-120) SR Beads"),
    ("SA01", "Saccharin Sodium USP"),
    ("SB01", "Strawberry Flavor Art #A1273400 (C&K)"),
    ("SI01", "Colloidal Silicon Dioxide NF"),
    ("SO01", "Sorbitol 70% USP"),
    ("SO04", "Sodium Citrate USP Dihydrate"),
    ("SO07", "Sodium Chloride FCC"),
    ("SRM1", "SR Mixture (Sovereign)"),
    ("SS20", "Sugar Spheres NF 20-25 Mesh"),
    ("SS30", "Sugar Spheres NF 30-35 Mesh"),
    ("SSR1", "Sugar Spheres NF Red 18-20 Mesh"),
    ("ST01", "Starch (Corn)"),
    ("ST02", "Sterotex"),
    ("ST03", "Starch 1500 (Pregelatinized Corn)"),
    ("ST04", "Stearic Acid NF"),
    ("SU01", "Sugar NF"),
    ("TA01", "Talc USP"),
    ("TH01", "Thymol Crystals NF"),
    ("TP01", "Tropical Fruit Punch Flavor Nat & Art #50432 (AFF)"),
    ("TR01", "Trimethobenzamide Hydrochloride USP"),
    ("VA01", "Vanillin NF"),
    ("WA01", "Purified Water"),
    ("Y10L", "D&C Yellow #10 Aluminum Lake"),
    ("YE06", "FD&C Yellow #6 Dye Powder"),
    ("YE10", "D&C Yellow #10 Dye Powder"),
    ("YEL6", "FD&C Yellow #6 Aluminum Lake"),
    ("YELB", "Yellow Lake Blend"),
    ("YO01", "Yohimbine Hydrochloride"),
]

_API_CODES = {
    "AC01", "AC03", "BR01", "BR02", "BU02", "CA02", "CA09", "CH01", "CH03", "CI02", "CL02",
    "CO03", "DE01", "DE03", "ER01", "GU01", "HY01", "HY02", "HY03", "IS02", "MA06", "ME07",
    "PH01", "PH02", "PH03", "PH06", "PH07", "PH09", "PO02", "PR02", "PS01", "PS03", "PS04",
    "PY01", "TR01", "YO01",
}
_PRESERVATIVE_CODES = {"BE01", "BE02", "BU01", "CH02", "ED01", "MP01", "PP01", "SO04", "TH01"}
_SOLVENT_CODES = {"AL01", "IS01", "ME02", "WA01", "GL01"}
_LUBRICANT_CODES = {"CA01", "MA01", "SI01", "ST02", "ST04", "TA01"}
_COATING_CODES = {"PG01", "PO01", "PO03", "PR01", "PR03", "EU03", "ET01"}
_SWEETENER_CODES = {"CO01", "DI02", "MT01", "SA01", "SO01", "SU01", "SS20", "SS30", "SSR1"}
_INTERMEDIATE_CODES = {"BPS2", "BPS3", "CM3S", "CM4S", "CPS1", "RM01", "SRM1"}


def _classify_raw_material(code: str, name: str) -> str:
    upper_name = name.upper()
    if code in _API_CODES:
        return "API"
    if "FLAVOR" in upper_name or code == "BI01":
        return "Flavor"
    if "DYE" in upper_name or "LAKE" in upper_name or "COLOR" in upper_name:
        return "Colorant"
    if code in _PRESERVATIVE_CODES:
        return "Preservative"
    if code in _SOLVENT_CODES:
        return "Solvent"
    if code in _LUBRICANT_CODES:
        return "Lubricant/Glidant"
    if code in _COATING_CODES:
        return "Coating Agent"
    if code in _SWEETENER_CODES:
        return "Sweetener"
    if code in _INTERMEDIATE_CODES or "SR BEADS" in upper_name or "MIXTURE" in upper_name:
        return "Intermediate"
    return "Excipient"


# Packaging components are not part of the FDA raw material list and are added separately
# so a representative Packaging BOM can reference real primary/secondary pack items.
PACKAGING_COMPONENTS = [
    ("PKG-BTL-60HD", "60cc Round HDPE Bottle (White)", "Primary Container"),
    ("PKG-CAP-38CR", "38mm Child-Resistant Closure Cap", "Closure"),
    ("PKG-SEAL-38", "38mm Induction Heat Seal Liner", "Tamper-Evident Seal"),
    ("PKG-DES-1G", "1g Silica Gel Desiccant Canister", "Desiccant"),
    ("PKG-COT-COIL", "Rayon Coil Filler", "Void Filler"),
    ("PKG-LBL-FRONT", "Pressure-Sensitive Label - Front Panel", "Label"),
    ("PKG-PI-LEAF", "Package Insert / Patient Information Leaflet", "Literature"),
    ("PKG-CTN-SHIP", "Corrugated Shipper Carton (12x8x6, 24-Bottle)", "Secondary Packaging"),
]


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

    # Bulk-load the FDA raw material catalog (Reference/2025-07-10 FDA Raw Material List.pdf)
    raw_materials_by_code = {}
    for code, name in FDA_RAW_MATERIALS:
        material = models.MaterialMaster(
            material_code=code,
            material_name=name,
            material_type=_classify_raw_material(code, name),
            category="FDA Raw Material Catalog",
            uom="kg",
            shelf_life_days=730,
            storage_condition="Controlled Room",
            status="Approved",
            storage_location_id=storage1.id,
            approved_by="Regulatory Affairs",
            approved_on=datetime.utcnow(),
        )
        db.add(material)
        raw_materials_by_code[code] = material

    # Packaging components used to build the sample Packaging BOM below
    packaging_by_code = {}
    for code, name, function in PACKAGING_COMPONENTS:
        component = models.MaterialMaster(
            material_code=code,
            material_name=name,
            material_type="Packaging Component",
            category=function,
            uom="each",
            shelf_life_days=1825,
            storage_condition="Ambient",
            status="Approved",
            supplier_id=supplier3.id,
            storage_location_id=storage1.id,
            approved_by="Packaging Engineering",
            approved_on=datetime.utcnow(),
        )
        db.add(component)
        packaging_by_code[code] = component

    db.flush()

    formulation = models.Formulation(
        formulation_code="MR-PCM-500ER",
        product_name="Paracetamol 500mg Extended Release",
        bom_type="Manufacturing",
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

    # Sample Manufacturing BOM built entirely from the FDA raw material catalog
    mfg_bom = models.Formulation(
        formulation_code="MFG-BOM-ACM500",
        product_name="Acetaminophen 500mg Tablets (Immediate Release)",
        bom_type="Manufacturing",
        dosage_form="Tablet",
        strength="500 mg",
        version="v1.0",
        status="Approved",
        batch_size_kg=100.0,
        approved_by="Head of R&D",
        approved_on=datetime.utcnow(),
    )
    db.add(mfg_bom)
    db.flush()

    mfg_bom_lines = [
        ("AC01", 71.4, 0.5, True),
        ("LA01", 14.3, 1.0, False),
        ("MI02", 8.6, 1.0, False),
        ("PO30", 3.0, 0.5, False),
        ("ST03", 1.5, 0.5, False),
        ("MA01", 0.7, 0.2, False),
        ("SI01", 0.3, 0.2, False),
        ("PG01", 0.2, 0.2, False),
    ]
    for code, pct, tolerance, is_critical in mfg_bom_lines:
        raw = raw_materials_by_code[code]
        db.add(models.FormulationIngredient(
            formulation_id=mfg_bom.id,
            material_id=raw.id,
            material_code=raw.material_code,
            material_name=raw.material_name,
            material_type=raw.material_type,
            required_quantity=round(pct / 100 * 100.0, 3),
            uom="kg",
            percentage_w_w=pct,
            tolerance_pct=tolerance,
            is_critical=is_critical,
        ))

    # Sample Packaging BOM for the same product, using dedicated packaging components
    pkg_bom = models.Formulation(
        formulation_code="PKG-BOM-ACM500-100CT",
        product_name="Acetaminophen 500mg Tablets - 100 Count HDPE Bottle Pack",
        bom_type="Packaging",
        dosage_form="Tablet",
        strength="500 mg",
        version="v1.0",
        status="Approved",
        batch_size_kg=1.0,
        approved_by="Packaging Engineering",
        approved_on=datetime.utcnow(),
    )
    db.add(pkg_bom)
    db.flush()

    pkg_bom_lines = [
        ("PKG-BTL-60HD", 1.0, False),
        ("PKG-CAP-38CR", 1.0, True),
        ("PKG-SEAL-38", 1.0, True),
        ("PKG-DES-1G", 1.0, False),
        ("PKG-COT-COIL", 1.0, False),
        ("PKG-LBL-FRONT", 1.0, True),
        ("PKG-PI-LEAF", 1.0, True),
        ("PKG-CTN-SHIP", 0.0417, False),
    ]
    for code, qty_per_unit, is_critical in pkg_bom_lines:
        pkg = packaging_by_code[code]
        db.add(models.FormulationIngredient(
            formulation_id=pkg_bom.id,
            material_id=pkg.id,
            material_code=pkg.material_code,
            material_name=pkg.material_name,
            material_type=pkg.material_type,
            required_quantity=qty_per_unit,
            uom="each",
            percentage_w_w=0.0,
            tolerance_pct=0.0,
            is_critical=is_critical,
        ))

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
    bom_type: str = "Manufacturing"
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
        bom_type=item.bom_type,
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
