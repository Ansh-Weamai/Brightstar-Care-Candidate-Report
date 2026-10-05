import dataclasses
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, ConfigDict, Field

from app.scoring import mockdata
from app.scoring.engine import (
    CandidateReadinessInputs,
    ScoringInputs,
    TerritoryViabilityInputs,
    score_deal,
)

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="BrightStar Deal Screen Console")

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.mount("/logos", StaticFiles(directory=BASE_DIR.parent / "logos"), name="logos")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


@app.get("/")
def index(request: Request):
    return templates.TemplateResponse(request, "tour.html")


# ---------------------------------------------------------------------------
# POST /api/territory
# ---------------------------------------------------------------------------


class TerritoryRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    zip_code: str = Field(alias="zip")


class TerritoryNote(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    label: str
    text: str
    flagged: bool
    type: str


class ComparablePerformance(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    median_revenue: float = Field(serialization_alias="medianRevenue")
    top_quartile_revenue: float = Field(serialization_alias="topQuartileRevenue")
    bottom_quartile_revenue: float = Field(serialization_alias="bottomQuartileRevenue")
    estimated_quartile: str = Field(serialization_alias="estimatedQuartile")


class CompetitorSentiment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    avg_star_rating: float = Field(serialization_alias="avgStarRating")
    review_volume: int = Field(serialization_alias="reviewVolume")


class TerritoryResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    zip: str
    population: int
    age_65_plus: int = Field(serialization_alias="age65Plus")
    distance_to_nearest_agency: float = Field(serialization_alias="distanceToNearestAgency")
    meets_standard_minimum: bool = Field(serialization_alias="meetsStandardMinimum")
    competing_agency_count: int = Field(serialization_alias="competingAgencyCount")
    labor_market: str = Field(serialization_alias="laborMarket")
    note: TerritoryNote
    cadence: str
    comparable_performance: ComparablePerformance = Field(serialization_alias="comparablePerformance")
    competitor_sentiment: CompetitorSentiment = Field(serialization_alias="competitorSentiment")


@app.post("/api/territory", response_model=TerritoryResponse, response_model_by_alias=True)
def post_territory(payload: TerritoryRequest):
    zip_code = payload.zip_code.strip()
    if not zip_code:
        raise HTTPException(status_code=422, detail="zip is required")
    return mockdata.get_territory_read(zip_code)


# ---------------------------------------------------------------------------
# POST /api/score
# ---------------------------------------------------------------------------


class CandidateReadinessRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    lead_heat_index_score: float = Field(alias="leadHeatIndexScore")
    liquid_capital: float = Field(alias="liquidCapital")
    distance_miles: float = Field(alias="distanceMiles")


class TerritoryViabilityRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    meets_standard_minimum: bool = Field(alias="meetsStandardMinimum")
    competing_agency_count: int = Field(alias="competingAgencyCount")
    labor_market: str = Field(alias="laborMarket")
    moratorium_flagged: bool = Field(alias="moratoriumFlagged")
    comparable_history_flagged: bool = Field(alias="comparableHistoryFlagged")
    estimated_quartile: str = Field(alias="estimatedQuartile")
    avg_star_rating: float = Field(alias="avgStarRating")


class ScoreRequest(BaseModel):
    candidate: CandidateReadinessRequest
    territory: TerritoryViabilityRequest


class FactorResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    sub_score: str = Field(serialization_alias="subScore")
    points: float
    max_points: float = Field(serialization_alias="maxPoints")


class SubScoreResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    score: float
    band: str
    factors: list[FactorResponse]
    raw_score: Optional[float] = Field(default=None, serialization_alias="rawScore")
    capped_by: Optional[str] = Field(default=None, serialization_alias="cappedBy")


class ScoreResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    overall_score: float = Field(serialization_alias="overallScore")
    overall_band: str = Field(serialization_alias="overallBand")
    candidate_readiness: SubScoreResponse = Field(serialization_alias="candidateReadiness")
    territory_viability: SubScoreResponse = Field(serialization_alias="territoryViability")
    factors: list[FactorResponse]


@app.post("/api/score", response_model=ScoreResponse, response_model_by_alias=True)
def post_score(payload: ScoreRequest):
    inputs = ScoringInputs(
        candidate=CandidateReadinessInputs(
            lead_heat_index_score=payload.candidate.lead_heat_index_score,
            liquid_capital=payload.candidate.liquid_capital,
            distance_miles=payload.candidate.distance_miles,
        ),
        territory=TerritoryViabilityInputs(
            meets_standard_minimum=payload.territory.meets_standard_minimum,
            competing_agency_count=payload.territory.competing_agency_count,
            labor_market=payload.territory.labor_market,
            moratorium_flagged=payload.territory.moratorium_flagged,
            comparable_history_flagged=payload.territory.comparable_history_flagged,
            estimated_quartile=payload.territory.estimated_quartile,
            avg_star_rating=payload.territory.avg_star_rating,
        ),
    )
    result = score_deal(inputs)
    return dataclasses.asdict(result)
