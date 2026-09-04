import csv
import io
import json
from dataclasses import dataclass
from datetime import date, datetime
from typing import Callable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode import code128
from sqlalchemy.orm import Session, selectinload

import models


@dataclass(frozen=True)
class ReportDefinition:
    title: str
    category: str
    description: str
    columns: list[tuple[str, str]]
    loader: Callable[[Session], list[dict]]


def _value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (dict, list)):
        return json.dumps(value, default=str, ensure_ascii=True)
    if value is None:
        return ""
    return value


def _model_rows(db: Session, model, fields: list[str], order_by=None):
    query = db.query(model)
    if order_by is not None:
        query = query.order_by(order_by)
    return [{field: _value(getattr(item, field, None)) for field in fields} for item in query.all()]


def _audit_rows(db: Session, entity_names=None):
    query = db.query(models.AuditLog)
    if entity_names:
        query = query.filter(models.AuditLog.entity_name.in_(entity_names))
    return [{
        "timestamp_utc": _value(item.timestamp_utc),
        "entity_name": item.entity_name,
        "entity_id": item.entity_id,
        "action": item.action,
        "performed_by": item.performed_by,
        "role": item.role,
        "signature_meaning": item.signature_meaning,
        "details": _value(item.details_json),
    } for item in query.order_by(models.AuditLog.timestamp_utc.desc()).all()]


def _specification_rows(db: Session):
    specs = db.query(models.SpecificationMaster).options(
        selectinload(models.SpecificationMaster.parameters)
    ).order_by(models.SpecificationMaster.spec_code).all()
    rows = []
    for spec in specs:
        if not spec.parameters:
            rows.append({
                "spec_code": spec.spec_code, "material_code": spec.material_code,
                "material_name": spec.material_name, "version": spec.version,
                "status": spec.status, "parameter_name": "", "test_method": "",
                "min_limit": "", "max_limit": "", "uom": "", "is_critical": "",
            })
        for parameter in spec.parameters:
            rows.append({
                "spec_code": spec.spec_code, "material_code": spec.material_code,
                "material_name": spec.material_name, "version": spec.version,
                "status": spec.status, "parameter_name": parameter.parameter_name,
                "test_method": parameter.test_method, "min_limit": parameter.min_limit,
                "max_limit": parameter.max_limit, "uom": parameter.uom,
                "is_critical": parameter.is_critical,
            })
    return rows


def _formulation_rows(db: Session):
    formulations = db.query(models.Formulation).options(
        selectinload(models.Formulation.ingredients)
    ).order_by(models.Formulation.formulation_code).all()
    rows = []
    for formulation in formulations:
        for ingredient in formulation.ingredients:
            rows.append({
                "formulation_code": formulation.formulation_code,
                "product_name": formulation.product_name,
                "bom_type": formulation.bom_type,
                "version": formulation.version,
                "status": formulation.status,
                "material_code": ingredient.material_code,
                "material_name": ingredient.material_name,
                "required_quantity": ingredient.required_quantity,
                "uom": ingredient.uom,
                "percentage_w_w": ingredient.percentage_w_w,
                "is_critical": ingredient.is_critical,
            })
    return rows


def _qc_rows(db: Session):
    lots = db.query(models.InventoryLot).order_by(models.InventoryLot.received_date.desc()).all()
    return [{
        "lot_number": lot.lot_number,
        "material_code": lot.material_code,
        "material_name": lot.material_name,
        "qc_status": lot.qc_status or lot.status,
        "inventory_status": lot.status,
        "qc_tested_by": lot.qc_tested_by,
        "qc_tested_at": _value(lot.qc_tested_at),
        "report_count": len(lot.qc_reports),
        "released_by": lot.released_by,
        "release_date": lot.release_date,
    } for lot in lots]


def _qc_document_rows(db: Session):
    return _model_rows(db, models.QCTestReport, [
        "lot_number", "original_filename", "content_type", "file_size", "sha256",
        "test_result", "notes", "uploaded_by", "uploaded_at",
    ], models.QCTestReport.uploaded_at.desc())


def _user_rows(db: Session):
    return [{
        "username": user.username, "full_name": user.full_name, "email": user.email,
        "role": user.role, "permissions": _value(user.permissions), "is_active": user.is_active,
        "created_at": _value(user.created_at), "last_login_at": _value(user.last_login_at),
    } for user in db.query(models.AppUser).order_by(models.AppUser.username).all()]


REPORTS = {
    "audit-trail": ReportDefinition("System Audit Trail", "21 CFR Part 11", "Chronological, computer-generated audit trail of data and system activity.", [("timestamp_utc", "Timestamp UTC"), ("entity_name", "Entity"), ("entity_id", "Entity ID"), ("action", "Action"), ("performed_by", "User"), ("role", "Role"), ("signature_meaning", "Meaning"), ("details", "Details")], lambda db: _audit_rows(db)),
    "authentication-activity": ReportDefinition("Authentication & Authorization Activity", "21 CFR Part 11", "Successful/failed logins, session checks, access denials, and account security activity.", [("timestamp_utc", "Timestamp UTC"), ("entity_name", "Event Type"), ("entity_id", "Subject"), ("action", "Action"), ("performed_by", "User"), ("role", "Role"), ("details", "Details")], lambda db: _audit_rows(db, ["Authentication", "Authorization", "UserAccount"])),
    "electronic-signatures": ReportDefinition("Electronic Signatures", "21 CFR Part 11", "Electronic signatures with signer identity, timestamp, and signature meaning.", [("timestamp_utc", "Timestamp UTC"), ("entity_name", "Entity"), ("entity_id", "Entity ID"), ("action", "Action"), ("performed_by", "Signer"), ("role", "Role"), ("signature_meaning", "Signature Meaning")], lambda db: [row for row in _audit_rows(db) if row["signature_meaning"] not in ("", "API request")]),
    "user-access-matrix": ReportDefinition("User Access Matrix", "21 CFR Part 11", "Current accounts, roles, module permissions, activity state, and last login.", [("username", "Username"), ("full_name", "Full Name"), ("email", "Email"), ("role", "Role"), ("permissions", "Module Permissions"), ("is_active", "Active"), ("created_at", "Created"), ("last_login_at", "Last Login")], _user_rows),
    "qc-status": ReportDefinition("QC Pass / Fail / Quarantine", "Quality Control", "Current QC disposition for every inventory lot and linked evidence count.", [("lot_number", "Lot"), ("material_code", "Material Code"), ("material_name", "Material"), ("qc_status", "QC Status"), ("inventory_status", "Inventory Status"), ("qc_tested_by", "Tested By"), ("qc_tested_at", "Tested At"), ("report_count", "Evidence Files"), ("released_by", "Released By"), ("release_date", "Release Date")], _qc_rows),
    "qc-documents": ReportDefinition("QC Evidence Register", "Quality Control", "Controlled register of uploaded QC scans with integrity hashes.", [("lot_number", "Lot"), ("original_filename", "File"), ("content_type", "Content Type"), ("file_size", "Bytes"), ("sha256", "SHA-256"), ("test_result", "Result"), ("notes", "Notes"), ("uploaded_by", "Uploaded By"), ("uploaded_at", "Uploaded At")], _qc_document_rows),
    "inventory": ReportDefinition("Inventory & Lot Register", "Operations", "Inventory quantities, storage, expiry, barcode, and QC disposition.", [(field, field.replace("_", " ").title()) for field in ["lot_number", "material_code", "material_name", "material_type", "supplier", "supplier_lot", "quantity", "uom", "storage_location", "status", "qc_status", "expiry_date", "received_date", "barcode"]], lambda db: _model_rows(db, models.InventoryLot, ["lot_number", "material_code", "material_name", "material_type", "supplier", "supplier_lot", "quantity", "uom", "storage_location", "status", "qc_status", "expiry_date", "received_date", "barcode"], models.InventoryLot.received_date.desc())),
    "transactions": ReportDefinition("Stock Transaction Ledger", "Operations", "Complete material movement ledger.", [(field, field.replace("_", " ").title()) for field in ["transaction_code", "transaction_type", "transaction_date", "material_code", "material_name", "lot_number", "quantity", "uom", "from_location", "to_location", "related_party", "reference_doc", "performed_by", "status"]], lambda db: _model_rows(db, models.StockTransaction, ["transaction_code", "transaction_type", "transaction_date", "material_code", "material_name", "lot_number", "quantity", "uom", "from_location", "to_location", "related_party", "reference_doc", "performed_by", "status"], models.StockTransaction.transaction_date.desc())),
    "materials": ReportDefinition("Material Master", "Master Data", "Approved APIs, excipients, and packaging components.", [(field, field.replace("_", " ").title()) for field in ["material_code", "material_name", "material_type", "category", "grade", "strength", "uom", "shelf_life_days", "storage_condition", "status", "approved_by", "approved_on"]], lambda db: _model_rows(db, models.MaterialMaster, ["material_code", "material_name", "material_type", "category", "grade", "strength", "uom", "shelf_life_days", "storage_condition", "status", "approved_by", "approved_on"], models.MaterialMaster.material_code)),
    "suppliers": ReportDefinition("Supplier Master", "Master Data", "Qualified supplier register.", [(field, field.replace("_", " ").title()) for field in ["supplier_code", "supplier_name", "supplier_type", "contact_person", "phone", "email", "address", "qualification_status"]], lambda db: _model_rows(db, models.Supplier, ["supplier_code", "supplier_name", "supplier_type", "contact_person", "phone", "email", "address", "qualification_status"], models.Supplier.supplier_code)),
    "manufacturers": ReportDefinition("Manufacturer Master", "Master Data", "Approved manufacturer and GMP site register.", [(field, field.replace("_", " ").title()) for field in ["manufacturer_code", "manufacturer_name", "site_location", "license_number", "gmp_status"]], lambda db: _model_rows(db, models.Manufacturer, ["manufacturer_code", "manufacturer_name", "site_location", "license_number", "gmp_status"], models.Manufacturer.manufacturer_code)),
    "storage-locations": ReportDefinition("Storage Location Master", "Master Data", "Warehouse, production, and quarantine locations.", [(field, field.replace("_", " ").title()) for field in ["location_code", "location_name", "area_type", "room_condition", "is_quarantine"]], lambda db: _model_rows(db, models.StorageLocation, ["location_code", "location_name", "area_type", "room_condition", "is_quarantine"], models.StorageLocation.location_code)),
    "equipment": ReportDefinition("Equipment Master", "Master Data", "Equipment qualification and calibration register.", [(field, field.replace("_", " ").title()) for field in ["equipment_code", "equipment_name", "category", "model_number", "manufacturer", "room_location", "calibration_date", "calibration_due_date", "status"]], lambda db: _model_rows(db, models.EquipmentMaster, ["equipment_code", "equipment_name", "category", "model_number", "manufacturer", "room_location", "calibration_date", "calibration_due_date", "status"], models.EquipmentMaster.equipment_code)),
    "uom": ReportDefinition("Unit of Measure Master", "Master Data", "Canonical units and conversion factors.", [(field, field.replace("_", " ").title()) for field in ["uom_code", "uom_name", "uom_category", "base_uom_code", "conversion_factor", "status"]], lambda db: _model_rows(db, models.UnitOfMeasure, ["uom_code", "uom_name", "uom_category", "base_uom_code", "conversion_factor", "status"], models.UnitOfMeasure.uom_code)),
    "specifications": ReportDefinition("Specification Master", "Master Data", "Material specifications and QC acceptance criteria.", [(field, field.replace("_", " ").title()) for field in ["spec_code", "material_code", "material_name", "version", "status", "parameter_name", "test_method", "min_limit", "max_limit", "uom", "is_critical"]], _specification_rows),
    "customers": ReportDefinition("Customer Master", "Master Data", "Approved customer register.", [(field, field.replace("_", " ").title()) for field in ["customer_code", "customer_name", "customer_type", "gstin", "contact_person", "phone", "email", "address", "credit_limit", "status"]], lambda db: _model_rows(db, models.Customer, ["customer_code", "customer_name", "customer_type", "gstin", "contact_person", "phone", "email", "address", "credit_limit", "status"], models.Customer.customer_code)),
    "tax-codes": ReportDefinition("Tax / HSN Master", "Master Data", "Tax and HSN classification register.", [(field, field.replace("_", " ").title()) for field in ["hsn_code", "description", "tax_percentage", "tax_type", "status"]], lambda db: _model_rows(db, models.TaxCode, ["hsn_code", "description", "tax_percentage", "tax_type", "status"], models.TaxCode.hsn_code)),
    "boms": ReportDefinition("BOM & Formulation Master", "Master Data", "Manufacturing and packaging BOM components.", [(field, field.replace("_", " ").title()) for field in ["formulation_code", "product_name", "bom_type", "version", "status", "material_code", "material_name", "required_quantity", "uom", "percentage_w_w", "is_critical"]], _formulation_rows),
}


def report_catalog():
    return [{"key": key, "title": value.title, "category": value.category, "description": value.description} for key, value in REPORTS.items()]


def generate_csv(db: Session, key: str) -> bytes:
    definition = REPORTS[key]
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow([label for _, label in definition.columns])
    for row in definition.loader(db):
        writer.writerow([_value(row.get(field)) for field, _ in definition.columns])
    return output.getvalue().encode("utf-8-sig")


def generate_pdf(db: Session, key: str, generated_by: str) -> bytes:
    definition = REPORTS[key]
    rows = definition.loader(db)
    buffer = io.BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=10 * mm, leftMargin=10 * mm, topMargin=10 * mm, bottomMargin=10 * mm)
    styles = getSampleStyleSheet()
    story = [Paragraph(definition.title, styles["Title"]), Paragraph(definition.description, styles["BodyText"]), Paragraph(f"Generated UTC: {datetime.utcnow().isoformat()} | Generated by: {generated_by} | Records: {len(rows)}", styles["BodyText"]), Spacer(1, 4 * mm)]
    table_data = [[Paragraph(label, styles["BodyText"]) for _, label in definition.columns]]
    for row in rows:
        table_data.append([Paragraph(str(_value(row.get(field)))[:500], styles["BodyText"]) for field, _ in definition.columns])
    if not rows:
        table_data.append([Paragraph("No records", styles["BodyText"])] + [""] * (len(definition.columns) - 1))
    table = Table(table_data, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(table)
    document.build(story)
    return buffer.getvalue()


def generate_barcode_label(lot: models.InventoryLot) -> bytes:
    buffer = io.BytesIO()
    width, height = 100 * mm, 60 * mm
    pdf = canvas.Canvas(buffer, pagesize=(width, height))
    pdf.setTitle(f"Lot Label {lot.lot_number}")
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(8 * mm, 52 * mm, "AMRITA PHARMA R&D - CONTROLLED LOT LABEL")
    pdf.setFont("Helvetica", 8)
    pdf.drawString(8 * mm, 46 * mm, f"Material: {lot.material_code} - {lot.material_name[:45]}")
    pdf.drawString(8 * mm, 41 * mm, f"Lot: {lot.lot_number}   Supplier lot: {lot.supplier_lot}")
    pdf.drawString(8 * mm, 36 * mm, f"Expiry/Retest: {lot.expiry_date}   QC: {lot.qc_status or lot.status}")
    pdf.drawString(8 * mm, 31 * mm, f"Storage: {lot.storage_location}   Qty: {lot.quantity:g} {lot.uom}")
    barcode = code128.Code128(lot.barcode, barHeight=15 * mm, barWidth=0.32 * mm, humanReadable=True)
    barcode.drawOn(pdf, 8 * mm, 10 * mm)
    pdf.setFont("Helvetica", 6)
    pdf.drawRightString(96 * mm, 4 * mm, f"Generated UTC {datetime.utcnow().isoformat()}")
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
