"""
AI-powered endpoints using OpenAI GPT-4o-mini.

- POST /ai/insights  — Analyze a baseline week and return structured insights
- POST /ai/advisor   — Conversational restaurant operations advisor
"""

import os
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List, Optional

from openai import OpenAI, RateLimitError, AuthenticationError, APIConnectionError, APIStatusError

from app.db.deps import get_db
from app.api.baseline import get_week_kpis, get_week_health

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_client() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    return OpenAI(api_key=key)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class InsightsRequest(BaseModel):
    baseline_week_id: int


class AiInsight(BaseModel):
    category: str  # "revenue", "costs", "operations", "demand", "staffing"
    severity: str  # "info", "warning", "critical", "opportunity"
    title: str
    text: str
    recommendation: str


class InsightsResponse(BaseModel):
    insights: List[AiInsight]
    model: str
    tokens_used: int


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AdvisorRequest(BaseModel):
    messages: List[ChatMessage]
    baseline_week_id: Optional[int] = None
    page_context: Optional[dict] = None  # Current page data snapshot from the frontend


class AdvisorResponse(BaseModel):
    reply: str
    tokens_used: int


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

INSIGHTS_SYSTEM = """You are an expert restaurant operations analyst specializing in Czech restaurant management.
You will receive KPI data and health metrics for a restaurant's baseline week.

Analyze the data and return EXACTLY 3-5 actionable insights as a JSON array.
Each insight must have these fields:
- "category": one of "revenue", "costs", "operations", "demand", "staffing"
- "severity": one of "info", "warning", "critical", "opportunity"
- "title": short headline (max 10 words)
- "text": 1-2 sentence analysis of the finding
- "recommendation": 1 concrete action step

Focus on:
1. Profit margin health and cost structure
2. Demand patterns (peak vs low periods)
3. Staffing efficiency
4. Revenue optimization opportunities
5. Operational bottlenecks

Return ONLY valid JSON array, no markdown, no explanation outside the array."""


ADVISOR_SYSTEM = """You are a friendly, expert restaurant management advisor for Czech restaurants.
You help restaurant owners optimize their operations, revenue, and costs.

Guidelines:
- Give specific, actionable advice
- Reference Czech market context when relevant (CZK currency, local dining habits)
- Keep responses concise (2-4 paragraphs max)
- Use numbers and percentages when possible
- If KPI data is provided in the conversation, reference it specifically
- Communicate in the same language the user writes in (Czech or English)"""


# ---------------------------------------------------------------------------
# POST /ai/insights
# ---------------------------------------------------------------------------

@router.post("/insights", response_model=InsightsResponse)
def ai_insights(req: InsightsRequest, db: Session = Depends(get_db)):
    client = _get_client()

    # Gather context
    try:
        kpi_data = get_week_kpis(req.baseline_week_id, db)
    except HTTPException:
        raise HTTPException(status_code=404, detail="Baseline week not found or has no data")

    health_data = None
    try:
        health_data = get_week_health(req.baseline_week_id, db)
    except Exception:
        pass

    # Build context message
    context = f"""## Restaurant KPIs for Baseline Week (ID: {req.baseline_week_id})

### Financial Metrics
{json.dumps({k: v for k, v in kpi_data.get('kpis', {}).items() if k.startswith('finance.')}, indent=2, default=str)}

### Demand Metrics
{json.dumps({k: v for k, v in kpi_data.get('kpis', {}).items() if k.startswith('demand.')}, indent=2, default=str)}

### Operations Metrics
{json.dumps({k: v for k, v in kpi_data.get('kpis', {}).items() if k.startswith('operations.')}, indent=2, default=str)}
"""
    if health_data:
        context += f"\n### Data Health\n{json.dumps(health_data, indent=2, default=str)}"

    # Call GPT-4o-mini
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": INSIGHTS_SYSTEM},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
            max_tokens=1500,
        )
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=f"OpenAI quota exceeded. Please add billing credits at platform.openai.com. ({e})")
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=f"OpenAI API key is invalid. Please check your key. ({e})")
    except APIConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to OpenAI API. ({e})")
    except APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {e}")

    raw = response.choices[0].message.content or "[]"
    tokens = response.usage.total_tokens if response.usage else 0

    # Parse JSON
    try:
        # Strip markdown fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        insights_raw = json.loads(cleaned)
    except json.JSONDecodeError:
        insights_raw = [{"category": "info", "severity": "info", "title": "Analysis complete", "text": raw, "recommendation": "Review the data manually."}]

    insights = [AiInsight(**i) for i in insights_raw[:5]]

    return InsightsResponse(
        insights=insights,
        model="gpt-4o-mini",
        tokens_used=tokens,
    )


# ---------------------------------------------------------------------------
# POST /ai/advisor
# ---------------------------------------------------------------------------

@router.post("/advisor", response_model=AdvisorResponse)
def ai_advisor(req: AdvisorRequest, db: Session = Depends(get_db)):
    client = _get_client()

    system_content = ADVISOR_SYSTEM

    # Optionally load KPI context
    if req.baseline_week_id:
        try:
            kpi_data = get_week_kpis(req.baseline_week_id, db)
            kpis = kpi_data.get("kpis", {})
            system_content += f"""

## Current Restaurant Data (Week ID: {req.baseline_week_id})
- Revenue: {kpis.get('finance.revenue', 'N/A')} CZK
- Profit: {kpis.get('finance.profit', 'N/A')} CZK
- Profit Margin: {kpis.get('finance.profit_margin', 'N/A')}
- COGS: {kpis.get('finance.cogs', 'N/A')} CZK
- Labor Cost: {kpis.get('finance.labor_cost', 'N/A')} CZK
- Fixed Costs: {kpis.get('finance.fixed_cost', 'N/A')} CZK
- Group Arrivals: {kpis.get('demand.arrivals_groups', 'N/A')}
- Avg Spend/Group: {kpis.get('demand.avg_spend_per_group', 'N/A')} CZK
- Turnaways: {kpis.get('demand.turnaways', 'N/A')}
- Avg Wait (table): {kpis.get('operations.avg_wait_min', 'N/A')} min
"""
        except Exception:
            pass

    # Inject page-level context if the frontend provided it
    if req.page_context:
        system_content += f"""

## Current Page Data (sent by the frontend)
The user is currently viewing this data in the application:
{json.dumps(req.page_context, indent=2, ensure_ascii=False, default=str)}

Use this data when the user asks about items visible on their current page.
"""

    messages = [{"role": "system", "content": system_content}]
    for m in req.messages[-10:]:  # Keep last 10 messages for context
        messages.append({"role": m.role, "content": m.content})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.5,
            max_tokens=1000,
        )
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=f"OpenAI quota exceeded. Please add billing credits at platform.openai.com. ({e})")
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=f"OpenAI API key is invalid. ({e})")
    except APIConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to OpenAI API. ({e})")
    except APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {e}")

    reply = response.choices[0].message.content or ""
    tokens = response.usage.total_tokens if response.usage else 0

    return AdvisorResponse(reply=reply, tokens_used=tokens)
