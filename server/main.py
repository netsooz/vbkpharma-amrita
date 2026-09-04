print("######## MAIN.PY LOADED ########")
import uuid
import os
import hashlib
from fastapi import FastAPI, Depends, HTTPException, Query, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from database import SessionLocal, get_db, initialize_db
import models
from auth import create_access_token, decode_access_token, hash_password, verify_password
from reporting import REPORTS, generate_barcode_label, generate_csv, generate_pdf, report_catalog
from sqlalchemy.orm import selectinload

initialize_db()

app = FastAPI(
    title="Amrita Pharma R&D MES API",
    description="21 CFR Part 11 & GAMP 5 Compliant API for Tablet Manufacturing",
    version="1.0.0"
)

MODULE_PERMISSIONS = [
    "master_data",
    "transactions",
    "boms",
    "manufacturing",
    "ebpr",
    "reports",
    "user_management",
]

ROLE_TEMPLATES = {
    "Administrator": MODULE_PERMISSIONS,
    "QA Manager": ["master_data", "transactions", "boms", "manufacturing", "ebpr", "reports"],
    "Warehouse Manager": ["master_data", "transactions", "reports"],
    "Production Operator": ["transactions", "boms", "manufacturing"],
    "QC Analyst": ["master_data", "transactions", "ebpr", "reports"],
    "Auditor": ["ebpr", "reports"],
}


def serialize_user(user: models.AppUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "permissions": user.permissions or [],
        "is_active": user.is_active,
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
    }


def audit_event(
    entity_name: str,
    entity_id: str,
    action: str,
    performed_by: str,
    role: str = "System",
    signature_meaning: str = "System activity",
    details: Optional[dict] = None,
) -> None:
    db = SessionLocal()
    try:
        db.add(models.AuditLog(
            entity_name=entity_name,
            entity_id=entity_id,
            action=action,
            performed_by=performed_by,
            role=role,
            signature_meaning=signature_meaning,
            details_json=details or {},
        ))
        db.commit()
    except Exception as exc:
        db.rollback()
        print("Audit event write failed:", exc)
    finally:
        db.close()


def ensure_default_admin() -> None:
    db = SessionLocal()
    try:
        if db.query(models.AppUser).count() == 0:
            db.add(models.AppUser(
                username=os.getenv("ADMIN_INITIAL_USERNAME", "admin"),
                full_name="System Administrator",
                email=os.getenv("ADMIN_INITIAL_EMAIL", "admin@amritapharma.local"),
                password_hash=hash_password(os.getenv("ADMIN_INITIAL_PASSWORD", "Admin@123")),
                role="Administrator",
                permissions=MODULE_PERMISSIONS,
                is_active=True,
            ))
            db.commit()
    finally:
        db.close()


def permission_for_path(path: str) -> Optional[str]:
    path_permissions = (
        (("/api/users", "/api/access-control"), "user_management"),
        (("/api/inventory", "/api/transactions"), "transactions"),
        (("/api/formulations",), "boms"),
        (("/api/batch",), "manufacturing"),
        (("/api/audit-logs",), "ebpr"),
        (("/api/reports", "/api/storage-status"), "reports"),
        ((
            "/api/master-data", "/api/materials", "/api/suppliers",
            "/api/manufacturers", "/api/storage-locations", "/api/equipment",
            "/api/uom", "/api/specifications", "/api/customers", "/api/tax-codes",
        ), "master_data"),
    )
    for prefixes, permission in path_permissions:
        if path.startswith(prefixes):
            return permission
    return None


@app.middleware("http")
async def authenticate_api_request(request: Request, call_next):
    path = request.url.path
    if (
        request.method == "OPTIONS"
        or not path.startswith("/api/")
        or path in {"/api/health", "/api/auth/login"}
    ):
        return await call_next(request)

    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        audit_event("Authentication", request.url.path, "AUTHENTICATION_REQUIRED", "anonymous", details={"method": request.method, "ip": request.client.host if request.client else ""})
        return JSONResponse(status_code=401, content={"detail": "Authentication required"})

    try:
        token_data = decode_access_token(authorization.removeprefix("Bearer ").strip())
    except ValueError as exc:
        audit_event("Authentication", request.url.path, "TOKEN_REJECTED", "unknown", details={"method": request.method, "ip": request.client.host if request.client else "", "reason": str(exc)})
        return JSONResponse(status_code=401, content={"detail": str(exc)})

    db = SessionLocal()
    try:
        user = db.query(models.AppUser).filter(models.AppUser.id == token_data.get("sub")).first()
        if not user or not user.is_active:
            audit_event("Authentication", str(token_data.get("sub", "unknown")), "INACTIVE_USER_REJECTED", str(token_data.get("username", "unknown")), details={"path": path})
            return JSONResponse(status_code=401, content={"detail": "User is inactive or unavailable"})
        required_permission = permission_for_path(path)
        if required_permission and required_permission not in (user.permissions or []):
            audit_event("Authorization", path, "ACCESS_DENIED", user.username, user.role, details={"method": request.method, "required_permission": required_permission, "ip": request.client.host if request.client else ""})
            return JSONResponse(status_code=403, content={"detail": f"Access denied: {required_permission} permission required"})
        request.state.user_id = user.id
        request.state.username = user.username
        request.state.user_role = user.role
    finally:
        db.close()

    response = await call_next(request)
    audit_event(
        "APIActivity", path, f"{request.method}_{response.status_code}",
        request.state.username, request.state.user_role, "API request",
        {"method": request.method, "path": path, "status_code": response.status_code, "ip": request.client.host if request.client else ""},
    )
    return response


ensure_default_admin()


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
        unit_weight_mg=500.0,
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
        unit_weight_mg=500.0,
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
        units_per_pack=100,
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
        qc_status="Quarantine",
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
        qc_status="Pass",
        qc_tested_by="QC Manager",
        qc_tested_at=datetime.utcnow(),
    )
    db.add_all([inventory_lot_1, inventory_lot_2])
    db.flush()

    # Units of Measure Master
    uom_records = [
        ("KG", "Kilogram", "Weight", None, 1.0),
        ("G", "Gram", "Weight", "KG", 0.001),
        ("MG", "Milligram", "Weight", "KG", 0.000001),
        ("L", "Litre", "Volume", None, 1.0),
        ("ML", "Millilitre", "Volume", "L", 0.001),
        ("EACH", "Each", "Count", None, 1.0),
        ("CASE", "Case (24 units)", "Count", "EACH", 24.0),
    ]
    for code, name, category, base, factor in uom_records:
        db.add(models.UnitOfMeasure(
            uom_code=code,
            uom_name=name,
            uom_category=category,
            base_uom_code=base,
            conversion_factor=factor,
            status="Active",
        ))

    # Customer Master
    customer1 = models.Customer(
        customer_code="CUST-001",
        customer_name="MedPlus Pharma Distributors",
        customer_type="Distributor",
        gstin="29AAAPL1234C1ZV",
        contact_person="Anita Rao",
        phone="+91-9876543210",
        email="orders@medplus-example.com",
        address="Hyderabad, Telangana, India",
        credit_limit=500000.0,
        status="Active",
    )
    customer2 = models.Customer(
        customer_code="CUST-002",
        customer_name="Apollo Health City Pharmacy",
        customer_type="Institutional",
        gstin="36AAAPL5678D1ZQ",
        contact_person="Ravi Kumar",
        phone="+91-9876500000",
        email="procurement@apollo-example.com",
        address="Chennai, Tamil Nadu, India",
        credit_limit=1000000.0,
        status="Active",
    )
    db.add_all([customer1, customer2])

    # Tax / HSN Code Master
    db.add_all([
        models.TaxCode(
            hsn_code="30049099",
            description="Medicaments (Tablets) - Other",
            tax_percentage=12.0,
            tax_type="GST",
            status="Active",
        ),
        models.TaxCode(
            hsn_code="29420090",
            description="Active Pharmaceutical Ingredients - Other Organic Compounds",
            tax_percentage=18.0,
            tax_type="GST",
            status="Active",
        ),
    ])

    # Specification Master (QC test parameters for the primary API)
    specification = models.SpecificationMaster(
        spec_code="SPEC-API-PCM-01",
        material_code=material1.material_code,
        material_name=material1.material_name,
        version="v1.0",
        status="Approved",
        approved_by="QC Manager",
        approved_on=datetime.utcnow(),
    )
    db.add(specification)
    db.flush()
    db.add_all([
        models.SpecificationParameter(
            specification_id=specification.id,
            parameter_name="Assay (HPLC)",
            test_method="USP <621>",
            min_limit="98.0",
            max_limit="102.0",
            uom="% w/w",
            is_critical=True,
        ),
        models.SpecificationParameter(
            specification_id=specification.id,
            parameter_name="Loss on Drying",
            test_method="USP <731>",
            min_limit="0.0",
            max_limit="0.5",
            uom="% w/w",
            is_critical=False,
        ),
        models.SpecificationParameter(
            specification_id=specification.id,
            parameter_name="Heavy Metals",
            test_method="USP <231>",
            min_limit="0",
            max_limit="20",
            uom="ppm",
            is_critical=True,
        ),
    ])

    # Sample Stock Transactions covering the standard pharma movement types
    transaction_samples = [
        ("GOODS_INWARD", "GRN-0001", material1.material_code, material1.material_name, inventory_lot_1.lot_number,
         120.0, "kg", None, "WH-01", supplier1.supplier_name, "PO-2026-0456", None, "Warehouse Supervisor"),
        ("GOODS_RETURN_SUPPLIER", "GRS-0001", material2.material_code, material2.material_name, inventory_lot_2.lot_number,
         5.0, "kg", "WH-01", None, supplier2.supplier_name, "DEBIT-NOTE-0012", "Damaged packaging on receipt", "QA Officer"),
        ("MATERIAL_ISSUE", "MIS-0001", material1.material_code, material1.material_name, inventory_lot_1.lot_number,
         10.0, "kg", "WH-01", "Granulation Suite A", "Production", "BMR-TAB-2026-004", None, "Production Supervisor"),
        ("MATERIAL_RETURN", "MRT-0001", material1.material_code, material1.material_name, inventory_lot_1.lot_number,
         1.5, "kg", "Granulation Suite A", "WH-01", "Production", "BMR-TAB-2026-004", "Excess dispensed quantity", "Production Supervisor"),
        ("STOCK_TRANSFER", "STR-0001", material2.material_code, material2.material_name, inventory_lot_2.lot_number,
         20.0, "kg", "WH-01", "WH-02", None, None, "Warehouse consolidation", "Warehouse Supervisor"),
        ("STOCK_ADJUSTMENT", "ADJ-0001", material2.material_code, material2.material_name, inventory_lot_2.lot_number,
         -0.8, "kg", "WH-01", "WH-01", None, "CYCLE-COUNT-0007", "Physical count variance", "Inventory Controller"),
        ("MATERIAL_REJECTION", "REJ-0001", material1.material_code, material1.material_name, inventory_lot_1.lot_number,
         2.0, "kg", "WH-01", "Quarantine Zone", None, "QC-DEV-0031", "QC rejected due to OOS assay result", "QA Officer"),
        ("SAMPLE_WITHDRAWAL", "SPL-0001", material1.material_code, material1.material_name, inventory_lot_1.lot_number,
         0.05, "kg", "WH-01", "QC Laboratory", None, "STAB-STUDY-2026-01", "Stability study sample pull", "QC Analyst"),
    ]
    for (txn_type, code, mcode, mname, lot, qty, uom, from_loc, to_loc, party, ref, reason, performer) in transaction_samples:
        db.add(models.StockTransaction(
            transaction_code=code,
            transaction_type=txn_type,
            material_code=mcode,
            material_name=mname,
            lot_number=lot,
            quantity=qty,
            uom=uom,
            from_location=from_loc,
            to_location=to_loc,
            related_party=party,
            reference_doc=ref,
            reason=reason,
            performed_by=performer,
            signature_meaning=f"{txn_type.replace('_', ' ').title()} Authorization",
            status="Completed",
        ))

    db.commit()
    return {"message": "Master data seeded successfully", "seeded": True}


def ensure_demo_seed() -> None:
    db = next(get_db())
    try:
        seed_demo_content(db)
        for lot in db.query(models.InventoryLot).all():
            expected_qc_status = {
                "Approved": "Pass",
                "Rejected": "Fail",
                "Quarantine": "Quarantine",
            }.get(lot.status, lot.qc_status or "Quarantine")
            if lot.qc_status != expected_qc_status:
                lot.qc_status = expected_qc_status
        db.commit()
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
    unit_weight_mg: Optional[float] = None
    units_per_pack: Optional[int] = None
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


class UnitOfMeasureCreate(BaseModel):
    uom_code: str
    uom_name: str
    uom_category: str = "Weight"
    base_uom_code: Optional[str] = None
    conversion_factor: float = 1.0
    status: str = "Active"


class SpecificationParameterCreate(BaseModel):
    parameter_name: str
    test_method: Optional[str] = None
    min_limit: Optional[str] = None
    max_limit: Optional[str] = None
    uom: Optional[str] = None
    is_critical: bool = False


class SpecificationCreate(BaseModel):
    spec_code: str
    material_code: str
    material_name: str
    version: str = "v1.0"
    status: str = "Approved"
    approved_by: Optional[str] = None
    parameters: List[SpecificationParameterCreate] = []


class CustomerCreate(BaseModel):
    customer_code: str
    customer_name: str
    customer_type: str = "Distributor"
    gstin: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    credit_limit: float = 0.0
    status: str = "Active"


class TaxCodeCreate(BaseModel):
    hsn_code: str
    description: str
    tax_percentage: float = 0.0
    tax_type: str = "GST"
    status: str = "Active"


class StockTransactionCreate(BaseModel):
    transaction_type: str
    material_code: str
    material_name: str
    lot_number: Optional[str] = None
    quantity: float = 0.0
    uom: str = "kg"
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    related_party: Optional[str] = None
    reference_doc: Optional[str] = None
    reason: Optional[str] = None
    performed_by: str
    signature_meaning: Optional[str] = None
    scanned_value: Optional[str] = None
    expiry_date: Optional[str] = None
    supplier_lot: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    password: str
    role: str = "Production Operator"
    permissions: Optional[List[str]] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: str
    email: Optional[str] = None
    role: str
    permissions: List[str]
    is_active: bool


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    new_password: str


def validate_permissions(permissions: List[str]) -> List[str]:
    invalid = sorted(set(permissions) - set(MODULE_PERMISSIONS))
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unknown permissions: {', '.join(invalid)}")
    return list(dict.fromkeys(permissions))


def validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must contain at least 8 characters")


@app.post("/api/auth/login")
def login(item: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.AppUser).filter(
        models.AppUser.username == item.username.strip().lower()
    ).first()
    if not user or not user.is_active or not verify_password(item.password, user.password_hash):
        audit_event("Authentication", item.username.strip().lower() or "unknown", "LOGIN_FAILED", item.username.strip().lower() or "unknown", details={"ip": request.client.host if request.client else ""})
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user.last_login_at = datetime.utcnow()
    db.commit()
    audit_event("Authentication", user.id, "LOGIN_SUCCEEDED", user.username, user.role, details={"ip": request.client.host if request.client else ""})
    return {
        "access_token": create_access_token(user.id, user.username, user.permissions or []),
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@app.get("/api/auth/me")
def current_user(request: Request, db: Session = Depends(get_db)):
    user = db.query(models.AppUser).filter(models.AppUser.id == request.state.user_id).first()
    return serialize_user(user)


@app.post("/api/auth/logout")
def logout(request: Request):
    audit_event("Authentication", request.state.user_id, "LOGOUT", request.state.username, request.state.user_role)
    return {"message": "Logout recorded"}


@app.post("/api/auth/change-password")
def change_password(item: PasswordChangeRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.AppUser).filter(models.AppUser.id == request.state.user_id).first()
    if not verify_password(item.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    validate_password(item.new_password)
    user.password_hash = hash_password(item.new_password)
    db.commit()
    audit_event("UserAccount", user.id, "PASSWORD_CHANGED", user.username, user.role, "Password change")
    return {"message": "Password changed successfully"}


@app.get("/api/access-control")
def access_control_metadata():
    return {"permissions": MODULE_PERMISSIONS, "role_templates": ROLE_TEMPLATES}


@app.get("/api/users")
def list_users(db: Session = Depends(get_db)):
    return [serialize_user(user) for user in db.query(models.AppUser).order_by(models.AppUser.username).all()]


@app.post("/api/users")
def create_user(item: UserCreate, db: Session = Depends(get_db)):
    username = item.username.strip().lower()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if db.query(models.AppUser).filter(models.AppUser.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if item.email and db.query(models.AppUser).filter(models.AppUser.email == item.email.strip().lower()).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    validate_password(item.password)
    permissions = item.permissions if item.permissions is not None else ROLE_TEMPLATES.get(item.role, [])

    user = models.AppUser(
        username=username,
        full_name=item.full_name.strip(),
        email=item.email.strip().lower() if item.email else None,
        password_hash=hash_password(item.password),
        role=item.role,
        permissions=validate_permissions(permissions),
        is_active=item.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    audit_event("UserAccount", user.id, "USER_CREATED", user.username, user.role, details={"permissions": user.permissions, "active": user.is_active})
    return serialize_user(user)


@app.put("/api/users/{user_id}")
def update_user(user_id: str, item: UserUpdate, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.AppUser).filter(models.AppUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == request.state.user_id and not item.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    if item.email:
        duplicate = db.query(models.AppUser).filter(
            models.AppUser.email == item.email.strip().lower(), models.AppUser.id != user_id
        ).first()
        if duplicate:
            raise HTTPException(status_code=400, detail="Email already exists")

    user.full_name = item.full_name.strip()
    user.email = item.email.strip().lower() if item.email else None
    user.role = item.role
    user.permissions = validate_permissions(item.permissions)
    user.is_active = item.is_active
    db.commit()
    db.refresh(user)
    audit_event("UserAccount", user.id, "USER_UPDATED", request.state.username, request.state.user_role, details={"target_username": user.username, "role": user.role, "permissions": user.permissions, "active": user.is_active})
    return serialize_user(user)


@app.post("/api/users/{user_id}/reset-password")
def reset_user_password(user_id: str, item: PasswordResetRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.AppUser).filter(models.AppUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    validate_password(item.new_password)
    user.password_hash = hash_password(item.new_password)
    db.commit()
    audit_event("UserAccount", user.id, "PASSWORD_RESET", request.state.username, request.state.user_role, "Administrative password reset", {"target_username": user.username})
    return {"message": "Password reset successfully"}


@app.delete("/api/users/{user_id}")
def deactivate_user(user_id: str, request: Request, db: Session = Depends(get_db)):
    if user_id == request.state.user_id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    user = db.query(models.AppUser).filter(models.AppUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    audit_event("UserAccount", user.id, "USER_DEACTIVATED", request.state.username, request.state.user_role, details={"target_username": user.username})
    return {"message": f"User {user.username} deactivated"}


@app.get("/")
def root():
    return {"status": "ok", "service": "amrita-pharma-api", "docs": "/docs"}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "amrita-pharma-api"}


@app.get("/api/inventory")
def get_inventory(db: Session = Depends(get_db)):
    lots = db.query(models.InventoryLot).order_by(models.InventoryLot.received_date.desc()).all()
    return [{
        **{column.name: getattr(lot, column.name) for column in models.InventoryLot.__table__.columns},
        "qc_report_count": len(lot.qc_reports),
    } for lot in lots]


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
    new_lot.barcode = new_lot_barcode(new_lot)
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

    txn_count = db.query(models.StockTransaction).filter(models.StockTransaction.transaction_type == "GOODS_INWARD").count()
    transaction = models.StockTransaction(
        transaction_code=f"GRN-{txn_count + 1:04d}",
        transaction_type="GOODS_INWARD",
        material_code=item.material_code,
        material_name=item.material_name,
        lot_number=item.lot_number,
        quantity=item.quantity,
        uom=item.uom,
        to_location=item.storage_location,
        related_party=item.supplier,
        reference_doc=item.supplier_lot,
        reason="Goods receipt via Raw Materials & Quarantine intake form",
        performed_by="Warehouse Receiving",
        signature_meaning="Goods Receipt Authorization",
        status="Completed",
    )
    db.add(transaction)

    db.commit()
    db.refresh(new_lot)
    return new_lot


@app.post("/api/inventory/{lot_number}/qc-release")
def qc_release_lot(lot_number: str, req: QCReleaseRequest, request: Request, db: Session = Depends(get_db)):
    lot = db.query(models.InventoryLot).filter(models.InventoryLot.lot_number == lot_number).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    user = db.query(models.AppUser).filter(models.AppUser.id == request.state.user_id).first()
    if not verify_password(req.password_verification, user.password_hash):
        audit_event("ElectronicSignature", lot_number, "SIGNATURE_REJECTED", user.username, user.role, req.signature_meaning, {"reason": "Password verification failed"})
        raise HTTPException(status_code=401, detail="Electronic signature password verification failed")
    if req.status not in {"Approved", "Rejected", "Quarantine"}:
        raise HTTPException(status_code=400, detail="QC status must be Approved, Rejected, or Quarantine")

    lot.status = req.status
    lot.qc_status = {"Approved": "Pass", "Rejected": "Fail", "Quarantine": "Quarantine"}[req.status]
    lot.qc_tested_by = user.username
    lot.qc_tested_at = datetime.utcnow()
    lot.released_by = f"{user.full_name} [{user.username}] ({req.signature_meaning})"
    lot.release_date = datetime.utcnow().strftime("%Y-%m-%d")

    audit = models.AuditLog(
        entity_name="InventoryLot",
        entity_id=lot.lot_number,
        action=f"QC_STATUS_CHANGE_TO_{req.status.upper()}",
        performed_by=user.username,
        role=user.role,
        signature_meaning=req.signature_meaning,
        details_json={"new_status": req.status, "qc_status": lot.qc_status, "typed_signer": req.signer_name}
    )
    db.add(audit)
    db.commit()
    db.refresh(lot)
    lot_payload = {column.name: getattr(lot, column.name) for column in models.InventoryLot.__table__.columns}
    return {"message": f"Lot {lot_number} successfully updated to {req.status}", "lot": lot_payload}


@app.get("/api/inventory/{lot_number}/qc-reports")
def list_qc_reports(lot_number: str, db: Session = Depends(get_db)):
    reports = db.query(models.QCTestReport).filter(models.QCTestReport.lot_number == lot_number).order_by(models.QCTestReport.uploaded_at.desc()).all()
    return [{
        "id": report.id, "lot_number": report.lot_number,
        "original_filename": report.original_filename, "content_type": report.content_type,
        "file_size": report.file_size, "sha256": report.sha256,
        "test_result": report.test_result, "notes": report.notes,
        "uploaded_by": report.uploaded_by, "uploaded_at": report.uploaded_at,
    } for report in reports]


def new_lot_barcode(lot: models.InventoryLot) -> str:
    return f"AMR-{lot.material_code}-{lot.lot_number}-{uuid.uuid4().hex[:8].upper()}"


@app.post("/api/inventory/{lot_number}/barcode")
def generate_lot_barcode(lot_number: str, request: Request, db: Session = Depends(get_db)):
    lot = db.query(models.InventoryLot).filter(models.InventoryLot.lot_number == lot_number).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    if not lot.barcode:
        lot.barcode = new_lot_barcode(lot)
        db.commit()
        db.refresh(lot)
        action = "BARCODE_GENERATED"
    else:
        action = "BARCODE_REPRINT_REQUESTED"
    audit_event("InventoryLot", lot.id, action, request.state.username, request.state.user_role, "Lot barcode control", {"lot_number": lot.lot_number, "material_code": lot.material_code, "barcode": lot.barcode})
    return {"lot_number": lot.lot_number, "material_code": lot.material_code, "barcode": lot.barcode}


@app.get("/api/inventory/{lot_number}/barcode-label.pdf")
def download_lot_barcode_label(lot_number: str, request: Request, db: Session = Depends(get_db)):
    lot = db.query(models.InventoryLot).filter(models.InventoryLot.lot_number == lot_number).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    if not lot.barcode:
        raise HTTPException(status_code=400, detail="Generate a barcode before printing the label")
    audit_event("InventoryLot", lot.id, "BARCODE_LABEL_PRINTED", request.state.username, request.state.user_role, "Controlled label print", {"lot_number": lot.lot_number, "barcode": lot.barcode})
    filename = f"lot-label-{lot.lot_number}.pdf"
    return Response(generate_barcode_label(lot), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.post("/api/inventory/{lot_number}/qc-reports")
async def upload_qc_report(
    lot_number: str,
    request: Request,
    file: UploadFile = File(...),
    test_result: str = Form("Pending Review"),
    notes: str = Form(""),
    db: Session = Depends(get_db),
):
    lot = db.query(models.InventoryLot).filter(models.InventoryLot.lot_number == lot_number).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    allowed_types = {"application/pdf", "image/png", "image/jpeg", "image/tiff"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="QC evidence must be a PDF, PNG, JPEG, or TIFF file")
    content = await file.read()
    if not content or len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="QC evidence must be between 1 byte and 10 MB")
    if test_result not in {"Pass", "Fail", "Quarantine", "Pending Review"}:
        raise HTTPException(status_code=400, detail="Invalid QC result")
    report = models.QCTestReport(
        inventory_lot_id=lot.id, lot_number=lot.lot_number,
        original_filename=file.filename or "qc-report", content_type=file.content_type,
        file_size=len(content), sha256=hashlib.sha256(content).hexdigest(), file_content=content,
        test_result=test_result, notes=notes or None, uploaded_by=request.state.username,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    audit_event("QCTestReport", report.id, "QC_EVIDENCE_UPLOADED", request.state.username, request.state.user_role, "QC evidence attachment", {"lot_number": lot_number, "filename": report.original_filename, "sha256": report.sha256, "result": test_result})
    return {"id": report.id, "filename": report.original_filename, "sha256": report.sha256, "test_result": report.test_result}


@app.get("/api/inventory/qc-reports/{report_id}/download")
def download_qc_report(report_id: str, request: Request, db: Session = Depends(get_db)):
    report = db.query(models.QCTestReport).filter(models.QCTestReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="QC report not found")
    audit_event("QCTestReport", report.id, "QC_EVIDENCE_DOWNLOADED", request.state.username, request.state.user_role, details={"lot_number": report.lot_number, "filename": report.original_filename})
    safe_name = report.original_filename.replace('"', "")
    return Response(report.file_content, media_type=report.content_type, headers={"Content-Disposition": f'attachment; filename="{safe_name}"', "X-Content-SHA256": report.sha256})


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


@app.get("/api/reports")
def list_reports():
    return report_catalog()


@app.get("/api/reports/{report_key}.{file_format}")
def export_report(report_key: str, file_format: str, request: Request, db: Session = Depends(get_db)):
    if report_key not in REPORTS:
        raise HTTPException(status_code=404, detail="Unknown report")
    if file_format not in {"csv", "pdf"}:
        raise HTTPException(status_code=400, detail="Report format must be csv or pdf")
    content = generate_csv(db, report_key) if file_format == "csv" else generate_pdf(db, report_key, request.state.username)
    media_type = "text/csv; charset=utf-8" if file_format == "csv" else "application/pdf"
    filename = f"{report_key}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.{file_format}"
    audit_event("Report", report_key, f"REPORT_EXPORTED_{file_format.upper()}", request.state.username, request.state.user_role, "Regulatory report generation", {"filename": filename})
    return Response(content, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/api/storage-status")
def storage_status():
    from database import DATABASE_URL
    is_ephemeral_sqlite = DATABASE_URL.startswith("sqlite") and os.getenv("RENDER") == "true"
    return {
        "backend": "sqlite" if DATABASE_URL.startswith("sqlite") else "postgresql",
        "durable": not is_ephemeral_sqlite,
        "qc_evidence_storage": "database",
        "warning": (
            "Render web-service SQLite storage is ephemeral. QC evidence and database records may be lost on restart. "
            "Use the managed PostgreSQL DATABASE_URL or external object storage before production use."
            if is_ephemeral_sqlite else None
        ),
    }


@app.get("/api/master-data")
def get_master_data(db: Session = Depends(get_db)):
    materials = db.query(models.MaterialMaster).all()
    suppliers = db.query(models.Supplier).all()
    manufacturers = db.query(models.Manufacturer).all()
    locations = db.query(models.StorageLocation).all()
    formulations = db.query(models.Formulation).options(selectinload(models.Formulation.ingredients)).all()
    equipment = db.query(models.EquipmentMaster).all()
    uom = db.query(models.UnitOfMeasure).order_by(models.UnitOfMeasure.uom_code.asc()).all()
    specifications = (
        db.query(models.SpecificationMaster)
        .options(selectinload(models.SpecificationMaster.parameters))
        .order_by(models.SpecificationMaster.spec_code.asc())
        .all()
    )
    customers = db.query(models.Customer).order_by(models.Customer.customer_name.asc()).all()
    tax_codes = db.query(models.TaxCode).order_by(models.TaxCode.hsn_code.asc()).all()
    return {
        "materials": materials,
        "suppliers": suppliers,
        "manufacturers": manufacturers,
        "locations": locations,
        "formulations": formulations,
        "equipment": equipment,
        "uom": uom,
        "specifications": specifications,
        "customers": customers,
        "tax_codes": tax_codes,
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
    return (
        db.query(models.Formulation)
        .options(selectinload(models.Formulation.ingredients))
        .order_by(models.Formulation.product_name.asc())
        .all()
    )


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
        unit_weight_mg=item.unit_weight_mg,
        units_per_pack=item.units_per_pack,
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


@app.get("/api/uom")
def list_uom(db: Session = Depends(get_db)):
    return db.query(models.UnitOfMeasure).order_by(models.UnitOfMeasure.uom_code.asc()).all()


@app.post("/api/uom")
def create_uom(item: UnitOfMeasureCreate, db: Session = Depends(get_db)):
    existing = db.query(models.UnitOfMeasure).filter(models.UnitOfMeasure.uom_code == item.uom_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="UOM code already exists")
    db_item = models.UnitOfMeasure(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/specifications")
def list_specifications(db: Session = Depends(get_db)):
    return (
        db.query(models.SpecificationMaster)
        .options(selectinload(models.SpecificationMaster.parameters))
        .order_by(models.SpecificationMaster.spec_code.asc())
        .all()
    )


@app.post("/api/specifications")
def create_specification(item: SpecificationCreate, db: Session = Depends(get_db)):
    existing = db.query(models.SpecificationMaster).filter(models.SpecificationMaster.spec_code == item.spec_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Specification code already exists")

    spec = models.SpecificationMaster(
        spec_code=item.spec_code,
        material_code=item.material_code,
        material_name=item.material_name,
        version=item.version,
        status=item.status,
        approved_by=item.approved_by,
    )
    db.add(spec)
    db.flush()

    for param in item.parameters:
        db.add(models.SpecificationParameter(
            specification_id=spec.id,
            parameter_name=param.parameter_name,
            test_method=param.test_method,
            min_limit=param.min_limit,
            max_limit=param.max_limit,
            uom=param.uom,
            is_critical=param.is_critical,
        ))

    db.commit()
    db.refresh(spec)
    return spec


@app.get("/api/customers")
def list_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).order_by(models.Customer.customer_name.asc()).all()


@app.post("/api/customers")
def create_customer(item: CustomerCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Customer).filter(models.Customer.customer_code == item.customer_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer code already exists")
    db_item = models.Customer(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/tax-codes")
def list_tax_codes(db: Session = Depends(get_db)):
    return db.query(models.TaxCode).order_by(models.TaxCode.hsn_code.asc()).all()


@app.post("/api/tax-codes")
def create_tax_code(item: TaxCodeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.TaxCode).filter(models.TaxCode.hsn_code == item.hsn_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="HSN/Tax code already exists")
    db_item = models.TaxCode(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


VALID_TRANSACTION_TYPES = {
    "GOODS_INWARD",
    "GOODS_RETURN_SUPPLIER",
    "MATERIAL_ISSUE",
    "MATERIAL_RETURN",
    "STOCK_TRANSFER",
    "STOCK_ADJUSTMENT",
    "MATERIAL_REJECTION",
    "SAMPLE_WITHDRAWAL",
    "BARCODE_GENERATION",
    "BARCODE_VALIDATION",
}

TRANSACTION_CODE_PREFIXES = {
    "GOODS_INWARD": "GRN",
    "GOODS_RETURN_SUPPLIER": "GRS",
    "MATERIAL_ISSUE": "MIS",
    "MATERIAL_RETURN": "MRT",
    "STOCK_TRANSFER": "STR",
    "STOCK_ADJUSTMENT": "ADJ",
    "MATERIAL_REJECTION": "REJ",
    "SAMPLE_WITHDRAWAL": "SPL",
    "BARCODE_GENERATION": "BCG",
    "BARCODE_VALIDATION": "BCV",
}

# Transaction types that consume/reduce a lot's on-hand quantity
_QUANTITY_REDUCING_TYPES = {"MATERIAL_ISSUE", "GOODS_RETURN_SUPPLIER", "MATERIAL_REJECTION", "SAMPLE_WITHDRAWAL"}
# Transaction types where quantity is not applicable (barcode operations reference a lot, not a movement)
_QUANTITY_EXEMPT_TYPES = {"BARCODE_GENERATION", "BARCODE_VALIDATION"}
_SCAN_REQUIRED_TYPES = {
    "GOODS_RETURN_SUPPLIER", "MATERIAL_ISSUE", "MATERIAL_RETURN", "STOCK_TRANSFER",
    "STOCK_ADJUSTMENT", "MATERIAL_REJECTION", "SAMPLE_WITHDRAWAL",
}


@app.get("/api/transactions")
def list_transactions(transaction_type: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(models.StockTransaction)
    if transaction_type:
        query = query.filter(models.StockTransaction.transaction_type == transaction_type.upper())
    return query.order_by(models.StockTransaction.transaction_date.desc()).all()


@app.post("/api/transactions")
def create_transaction(item: StockTransactionCreate, request: Request, db: Session = Depends(get_db)):
    txn_type = item.transaction_type.upper()
    if txn_type not in VALID_TRANSACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported transaction type: {item.transaction_type}")
    if txn_type not in _QUANTITY_EXEMPT_TYPES and item.quantity == 0:
        raise HTTPException(status_code=400, detail="Quantity must be non-zero")
    if txn_type in ("BARCODE_GENERATION", "BARCODE_VALIDATION") and not item.lot_number:
        raise HTTPException(status_code=400, detail="Lot number is required for barcode operations")
    if txn_type in _SCAN_REQUIRED_TYPES and not item.lot_number:
        raise HTTPException(status_code=400, detail="Lot number is required for this controlled material movement")

    prefix = TRANSACTION_CODE_PREFIXES[txn_type]
    existing_count = db.query(models.StockTransaction).filter(models.StockTransaction.transaction_type == txn_type).count()
    transaction_code = f"{prefix}-{existing_count + 1:04d}"

    lot = None
    if item.lot_number:
        lot = db.query(models.InventoryLot).filter(models.InventoryLot.lot_number == item.lot_number).first()
        if not lot and txn_type != "GOODS_INWARD":
            raise HTTPException(status_code=404, detail=f"Lot {item.lot_number} not found")

    if txn_type in _SCAN_REQUIRED_TYPES:
        if not lot.barcode:
            raise HTTPException(status_code=400, detail="This lot has no barcode. Generate and label the lot before movement")
        if not item.scanned_value or item.scanned_value != lot.barcode:
            audit_event("BarcodeVerification", lot.id, "BARCODE_SCAN_FAILED", request.state.username, request.state.user_role, "Material identity verification", {"transaction_type": txn_type, "lot_number": lot.lot_number, "expected_material": lot.material_code, "supplied_material": item.material_code})
            raise HTTPException(status_code=400, detail="Scanned barcode does not match the selected lot")
        if item.material_code != lot.material_code:
            audit_event("BarcodeVerification", lot.id, "MATERIAL_MISMATCH", request.state.username, request.state.user_role, "Material identity verification", {"transaction_type": txn_type, "lot_material": lot.material_code, "selected_material": item.material_code})
            raise HTTPException(status_code=400, detail="Selected material does not match the scanned lot")
        if txn_type == "MATERIAL_ISSUE":
            if lot.status != "Approved" or lot.qc_status != "Pass":
                raise HTTPException(status_code=400, detail="Only QC Pass/Approved lots may be issued to production")
            try:
                if datetime.fromisoformat(lot.expiry_date).date() < datetime.utcnow().date():
                    raise HTTPException(status_code=400, detail="Expired/retest-due lot cannot be issued")
            except ValueError:
                raise HTTPException(status_code=400, detail="Lot expiry/retest date is invalid")
        audit_event("BarcodeVerification", lot.id, "BARCODE_SCAN_PASSED", request.state.username, request.state.user_role, "Material identity verification", {"transaction_type": txn_type, "lot_number": lot.lot_number, "material_code": lot.material_code})

    txn_status = "Completed"
    reference_doc = item.reference_doc
    reason = item.reason
    new_lot_number = item.lot_number

    if txn_type == "BARCODE_GENERATION":
        lot.barcode = lot.barcode or new_lot_barcode(lot)
        reference_doc = lot.barcode
        reason = reason or "Barcode generated and assigned to lot"
    elif txn_type == "BARCODE_VALIDATION":
        if not item.scanned_value:
            raise HTTPException(status_code=400, detail="Scanned barcode value is required for validation")
        if lot.barcode and lot.barcode == item.scanned_value:
            txn_status = "Passed"
            reason = reason or "Scanned barcode matches lot record"
        else:
            txn_status = "Failed"
            reason = reason or "Scanned barcode does not match lot record"
        reference_doc = item.scanned_value
    elif txn_type == "GOODS_INWARD" and not lot:
        # First-time receipt: no existing lot to top up, so create a new quarantined lot.
        if not item.expiry_date:
            raise HTTPException(status_code=400, detail="Expiry date is required when receiving a new lot")
        new_lot_number = item.lot_number or f"LOT-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        lot = models.InventoryLot(
            lot_number=new_lot_number,
            material_code=item.material_code,
            material_name=item.material_name,
            material_type=(
                db.query(models.MaterialMaster.material_type)
                .filter(models.MaterialMaster.material_code == item.material_code)
                .scalar()
                or "API"
            ),
            supplier=item.related_party or "Unknown Supplier",
            supplier_lot=item.supplier_lot or "",
            quantity=item.quantity,
            uom=item.uom,
            storage_location=item.to_location or "WH-01",
            expiry_date=item.expiry_date,
            status="Quarantine",
        )
        lot.barcode = new_lot_barcode(lot)
        db.add(lot)
        db.flush()
        reason = reason or "New lot received and placed in quarantine"
    elif lot:
        if txn_type in _QUANTITY_REDUCING_TYPES:
            if lot.quantity < item.quantity:
                raise HTTPException(status_code=400, detail="Insufficient lot quantity for this transaction")
            lot.quantity -= item.quantity
            if txn_type == "MATERIAL_REJECTION":
                lot.status = "Rejected"
        elif txn_type in ("MATERIAL_RETURN", "GOODS_INWARD"):
            lot.quantity += item.quantity
        elif txn_type == "STOCK_ADJUSTMENT":
            new_qty = lot.quantity + item.quantity
            if new_qty < 0:
                raise HTTPException(status_code=400, detail="Adjustment would result in negative stock")
            lot.quantity = new_qty
        elif txn_type == "STOCK_TRANSFER" and item.to_location:
            lot.storage_location = item.to_location

    signature_meaning = item.signature_meaning or f"{txn_type.replace('_', ' ').title()} Authorization"

    transaction = models.StockTransaction(
        transaction_code=transaction_code,
        transaction_type=txn_type,
        material_code=item.material_code,
        material_name=item.material_name,
        lot_number=new_lot_number,
        quantity=item.quantity,
        uom=item.uom,
        from_location=item.from_location,
        to_location=item.to_location,
        related_party=item.related_party,
        reference_doc=reference_doc,
        reason=reason,
        performed_by=item.performed_by,
        signature_meaning=signature_meaning,
        status=txn_status,
    )
    db.add(transaction)

    audit = models.AuditLog(
        entity_name="StockTransaction",
        entity_id=transaction_code,
        action=txn_type,
        performed_by=item.performed_by,
        signature_meaning=signature_meaning,
        details_json={
            "material_code": item.material_code,
            "quantity": item.quantity,
            "uom": item.uom,
            "lot_number": new_lot_number,
            "from_location": item.from_location,
            "to_location": item.to_location,
            "status": txn_status,
        },
    )
    db.add(audit)

    db.commit()
    db.refresh(transaction)
    return transaction


@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db)):
    transaction = db.query(models.StockTransaction).filter(models.StockTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    txn_type = transaction.transaction_type
    lot = None
    if transaction.lot_number:
        lot = db.query(models.InventoryLot).filter(models.InventoryLot.lot_number == transaction.lot_number).first()

    # Reverse the stock effect this transaction originally applied, so deleting keeps stock consistent.
    if lot:
        if txn_type in _QUANTITY_REDUCING_TYPES:
            lot.quantity += transaction.quantity
        elif txn_type in ("MATERIAL_RETURN", "GOODS_INWARD"):
            if lot.quantity - transaction.quantity < 0:
                raise HTTPException(status_code=400, detail="Cannot delete: reversing this transaction would result in negative stock")
            lot.quantity -= transaction.quantity
        elif txn_type == "STOCK_ADJUSTMENT":
            lot.quantity -= transaction.quantity
        elif txn_type == "STOCK_TRANSFER" and transaction.from_location:
            lot.storage_location = transaction.from_location
        elif txn_type == "BARCODE_GENERATION" and lot.barcode == transaction.reference_doc:
            lot.barcode = None

    audit = models.AuditLog(
        entity_name="StockTransaction",
        entity_id=transaction.transaction_code,
        action=f"DELETE_{txn_type}",
        performed_by="System",
        signature_meaning="Transaction Deletion / Reversal",
        details_json={
            "material_code": transaction.material_code,
            "quantity": transaction.quantity,
            "lot_number": transaction.lot_number,
        },
    )
    db.add(audit)
    db.delete(transaction)
    db.commit()
    return {"message": f"Transaction {transaction.transaction_code} deleted and stock effect reversed"}


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
