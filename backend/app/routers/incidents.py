from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import IncidentModel
from backend.app.schemas import IncidentSchema, IncidentCreate
from backend.app.services.incident_service import process_and_ingest_incident, PROVIDERS

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentSchema])
def list_incidents(
    verified_only: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    query = db.query(IncidentModel)
    if verified_only:
        query = query.filter(IncidentModel.verified == True)
    incidents = query.order_by(IncidentModel.id.desc()).all()
    return [
        IncidentSchema(
            id=inc.id,
            type=inc.type,
            severity=inc.severity,
            status=inc.status,
            location=inc.location,
            lat=inc.lat,
            lng=inc.lng,
            district=inc.district,
            state=inc.state,
            road=inc.road,
            description=inc.description,
            reportedBy=inc.reported_by,
            source=inc.source or "Field Officer",
            sourceUrl=inc.source_url,
            reportedAt=inc.reported_at or inc.timestamp,
            updatedAt=inc.updated_at or inc.timestamp,
            timestamp=inc.timestamp,
            verified=inc.verified if inc.verified is not None else True,
            confidence=inc.confidence or 90.0,
            expiresAt=inc.expires_at,
            affectedRoads=inc.affected_roads or [],
            affectedVehicles=inc.affected_vehicles or [],
            photoDataUrl=inc.photo_data_url,
            isDemo=inc.is_demo or False
        )
        for inc in incidents
    ]

@router.post("", response_model=IncidentSchema)
async def create_incident(inc: IncidentCreate, db: Session = Depends(get_db)):
    schema_out, _, _ = await process_and_ingest_incident(inc, db)
    return schema_out

@router.post("/field-reports", response_model=IncidentSchema)
async def submit_field_report(report: IncidentCreate, db: Session = Depends(get_db)):
    # Ensure source is marked as Field Officer
    report.source = "Field Officer"
    schema_out, _, _ = await process_and_ingest_incident(report, db)
    return schema_out

@router.post("/sources/{provider_name}", response_model=IncidentSchema)
async def ingest_from_provider(provider_name: str, payload: dict, db: Session = Depends(get_db)):
    if provider_name not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown incident provider: {provider_name}. Valid: {list(PROVIDERS.keys())}")
    provider = PROVIDERS[provider_name]
    parsed_inc = provider.fetch_or_parse(payload)
    schema_out, _, _ = await process_and_ingest_incident(parsed_inc, db)
    return schema_out
