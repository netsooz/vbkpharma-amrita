print("######## MAIN.PY LOADED ########")
import uuid
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from database import get_db, initialize_db
import models
from sqlalchemy.orm import selectinload

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


@app.get("/api/transactions")
def list_transactions(transaction_type: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(models.StockTransaction)
    if transaction_type:
        query = query.filter(models.StockTransaction.transaction_type == transaction_type.upper())
    return query.order_by(models.StockTransaction.transaction_date.desc()).all()


@app.post("/api/transactions")
def create_transaction(item: StockTransactionCreate, db: Session = Depends(get_db)):
    txn_type = item.transaction_type.upper()
    if txn_type not in VALID_TRANSACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported transaction type: {item.transaction_type}")
    if txn_type not in _QUANTITY_EXEMPT_TYPES and item.quantity == 0:
        raise HTTPException(status_code=400, detail="Quantity must be non-zero")
    if txn_type in ("BARCODE_GENERATION", "BARCODE_VALIDATION") and not item.lot_number:
        raise HTTPException(status_code=400, detail="Lot number is required for barcode operations")

    prefix = TRANSACTION_CODE_PREFIXES[txn_type]
    existing_count = db.query(models.StockTransaction).filter(models.StockTransaction.transaction_type == txn_type).count()
    transaction_code = f"{prefix}-{existing_count + 1:04d}"

    lot = None
    if item.lot_number:
        lot = db.query(models.InventoryLot).filter(models.InventoryLot.lot_number == item.lot_number).first()
        if not lot:
            raise HTTPException(status_code=404, detail=f"Lot {item.lot_number} not found")

    txn_status = "Completed"
    reference_doc = item.reference_doc
    reason = item.reason

    if txn_type == "BARCODE_GENERATION":
        generated_barcode = f"BC-{lot.material_code}-{lot.lot_number}-{uuid.uuid4().hex[:6].upper()}"
        lot.barcode = generated_barcode
        reference_doc = generated_barcode
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
        lot_number=item.lot_number,
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
            "lot_number": item.lot_number,
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
