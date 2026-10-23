"""
RouteRecover AI - AI Explanation and Conversation Service

Supports:
- OpenAI (GPT-4o, GPT-4-turbo, GPT-3.5-turbo)
- Anthropic (Claude 3.5 Sonnet, etc.)
- Deterministic fallback (no API key needed)

All numerical values are grounded in deterministic backend results.
The LLM is only used for natural-language explanation, not for calculations.
"""
from __future__ import annotations
from typing import Optional, List, Dict, Any, Tuple
import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are RouteRecover AI's travel assistant. You help travellers understand their recovery options when travel is disrupted.

IMPORTANT RULES:
1. Never invent flight availability, seat numbers, booking confirmations, or live prices.
2. All numerical values (prices, times, durations) must come from the data provided to you — do not estimate or hallucinate.
3. When the user asks for a cheaper/faster alternative, acknowledge the constraint and note that regenerating the plan would apply it.
4. If a booking or price is unknown, say so clearly.
5. All booking changes in demo mode are simulated — never claim a real provider booking was made.
6. Be concise and helpful. Avoid repeating the same information.
7. Use INR (₹) for all prices.
8. If a request is ambiguous, ask ONE clarifying question.
"""


def _build_context_block(
    recovery_plan: Optional[Dict],
    trip: Optional[Dict],
) -> str:
    """Build a JSON context block to inject into the LLM prompt."""
    context: Dict[str, Any] = {}
    if trip:
        context["trip"] = {
            "name": trip.get("name"),
            "origin": trip.get("origin"),
            "destination": trip.get("destination"),
        }
    if recovery_plan:
        context["recovery_plan"] = {
            "status": recovery_plan.get("status"),
            "original_cost_inr": recovery_plan.get("original_cost_inr"),
            "proposed_cost_inr": recovery_plan.get("proposed_cost_inr"),
            "additional_cost_inr": recovery_plan.get("additional_cost_inr"),
            "top_alternatives": recovery_plan.get("alternatives", [])[:3],
            "ai_explanation": recovery_plan.get("ai_explanation", ""),
        }
    return json.dumps(context, indent=2, default=str)


def _call_openai(messages: List[Dict], context: str) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        full_messages = [
            {"role": "system", "content": SYSTEM_PROMPT + f"\n\nCurrent Context:\n{context}"},
        ] + messages
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=full_messages,
            max_tokens=800,
            temperature=0.3,
        )
        return response.choices[0].message.content or "I couldn't generate a response."
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        return None


def _call_anthropic(messages: List[Dict], context: str) -> str:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        system = SYSTEM_PROMPT + f"\n\nCurrent Context:\n{context}"
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=800,
            system=system,
            messages=messages,
        )
        return response.content[0].text if response.content else "I couldn't generate a response."
    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        return None


def _deterministic_chat_response(
    message: str,
    recovery_plan: Optional[Dict],
    trip: Optional[Dict],
    history: Optional[List[Dict]] = None,
) -> Tuple[str, Optional[Dict], bool]:
    """
    Deterministic fallback chat responses without an LLM.
    Returns (response_text, updated_constraints_dict, trigger_regenerate).
    """
    msg_lower = message.lower()

    # Cheapest / cheaper
    if any(k in msg_lower for k in ["cheap", "cheaper", "budget", "lowest cost", "less expensive"]):
        if recovery_plan and recovery_plan.get("alternatives"):
            alts = recovery_plan["alternatives"]
            by_cost = sorted(alts, key=lambda a: a.get("additional_cost_inr", 0))
            cheapest = by_cost[0] if by_cost else None
            if cheapest:
                return (
                    f"The lowest-cost option is **{cheapest['service_name']}** ({cheapest['transport_type']}) "
                    f"at ₹{cheapest['price_inr']:,.0f} (additional cost: ₹{cheapest['additional_cost_inr']:,.0f}). "
                    f"It departs at {cheapest['departure_time'][:16].replace('T', ' ')} and arrives at "
                    f"{cheapest['arrival_time'][:16].replace('T', ' ')}. "
                    f"Would you like to select this option?",
                    None, False
                )
        return "I don't have alternative pricing data available right now. Please generate a recovery plan first.", None, False

    # Fastest / earliest
    if any(k in msg_lower for k in ["fast", "fastest", "earliest", "quickest", "quick"]):
        if recovery_plan and recovery_plan.get("alternatives"):
            alts = recovery_plan["alternatives"]
            by_arrival = sorted(alts, key=lambda a: a.get("arrival_time", ""))
            fastest = by_arrival[0] if by_arrival else None
            if fastest:
                return (
                    f"The fastest option is **{fastest['service_name']}** ({fastest['transport_type']}) "
                    f"arriving at {fastest['arrival_time'][:16].replace('T', ' ')} "
                    f"(₹{fastest['price_inr']:,.0f}). "
                    f"This is {fastest['duration_minutes'] // 60}h {fastest['duration_minutes'] % 60}m total journey time.",
                    None, False
                )

    # Arrive before / deadline
    if "arrive before" in msg_lower or "must arrive" in msg_lower or "deadline" in msg_lower:
        return (
            "I understand you have an arrival deadline. You can update your constraints in the Constraints panel "
            "and click 'Regenerate Plan' to filter options that meet your deadline. "
            "What time must you arrive by?",
            None, False
        )

    # Hotel impact
    if "hotel" in msg_lower:
        if recovery_plan and recovery_plan.get("ai_explanation"):
            return (
                "Your hotel booking may be affected if the recovery journey changes your arrival time significantly. "
                "The recovery plan includes required actions — check the 'Required Actions' section. "
                "It is advisable to contact your hotel directly to inform them of your revised arrival time. "
                "Note: No hotel booking has been automatically changed — all changes are simulated.",
                None, False
            )
        return "I don't see hotel booking details in the current plan. Please run a recovery scenario first.", None, False

    # Compare options
    if "compar" in msg_lower:
        if recovery_plan and recovery_plan.get("alternatives"):
            alts = recovery_plan["alternatives"][:3]
            lines = ["Here is a comparison of the top options:\n"]
            for a in alts:
                lines.append(
                    f"**{a['service_name']}** — {a['transport_type']} | "
                    f"Arrives {a['arrival_time'][11:16]} | "
                    f"₹{a['price_inr']:,.0f} (+₹{a['additional_cost_inr']:,.0f}) | "
                    f"{a['duration_minutes'] // 60}h{a['duration_minutes'] % 60}m | "
                    f"Score: {a['score']:.2f}"
                )
            return "\n".join(lines), None, False

    # Why recommended
    if "why" in msg_lower and ("recommend" in msg_lower or "suggest" in msg_lower or "select" in msg_lower):
        if recovery_plan and recovery_plan.get("ai_explanation"):
            return (
                "The recommended option was selected based on a weighted score that balances:\n"
                "- **Cost (40%)**: Minimizing additional expenditure\n"
                "- **Arrival time (30%)**: Arriving as early as possible\n"
                "- **Journey duration (20%)**: Shorter travel time\n"
                "- **Fewer stops (10%)**: Simpler connections\n\n"
                "The top option achieved the highest combined score while satisfying all hard constraints "
                "(arrival deadline, budget limit, and transfer limits).",
                None, False
            )

    # Under X amount
    import re
    budget_match = re.search(r"under\s*[₹rs\s]*(\d+[\d,]*)", msg_lower)
    if budget_match:
        budget = int(budget_match.group(1).replace(",", ""))
        if recovery_plan and recovery_plan.get("alternatives"):
            matching = [a for a in recovery_plan["alternatives"] if a.get("price_inr", 99999) <= budget]
            if matching:
                a = matching[0]
                return (
                    f"There {'is' if len(matching)==1 else 'are'} {len(matching)} option(s) under ₹{budget:,}. "
                    f"The best is **{a['service_name']}** at ₹{a['price_inr']:,.0f} "
                    f"(arriving {a['arrival_time'][11:16]}).",
                    {"max_additional_budget_inr": float(budget)}, False
                )
            else:
                return f"Unfortunately, no alternatives are available under ₹{budget:,}. The lowest available option costs ₹{min(a['price_inr'] for a in recovery_plan['alternatives']):,.0f}.", None, False

    # Default response
    if not recovery_plan:
        return (
            "I'm your RouteRecover AI travel assistant. To get started, please run a recovery scenario from the dashboard. "
            "I can then help you compare options, understand the impact on your hotel booking, find cheaper alternatives, and more.",
            None, False
        )

    return (
        "I'm here to help with your travel disruption. You can ask me:\n"
        "- 'Why was this option recommended?'\n"
        "- 'Find a cheaper alternative'\n"
        "- 'What happens to my hotel booking?'\n"
        "- 'Compare the fastest and cheapest options'\n"
        "- 'Show me options under ₹4,000'",
        None, False
    )


async def get_ai_explanation(
    disruption_summary: str,
    alternatives_json: str,
    itinerary_summary: str,
    constraint_summary: str,
) -> str:
    """Generate an AI explanation for a recovery plan."""
    if settings.AI_PROVIDER == "none" or (not settings.OPENAI_API_KEY and not settings.ANTHROPIC_API_KEY):
        return None  # Will use deterministic explanation

    prompt = f"""A travel disruption has occurred. Generate a clear, helpful explanation for the traveller.

Disruption: {disruption_summary}

Alternatives evaluated:
{alternatives_json}

Itinerary summary:
{itinerary_summary}

Traveller constraints:
{constraint_summary}

Write a concise explanation (max 250 words) covering:
1. Why the recommended option was chosen
2. What constraints it satisfies
3. Estimated additional costs
4. Which reservations need attention
5. Next steps for the traveller

Use ₹ for INR. Be factual and grounded in the data provided."""

    messages = [{"role": "user", "content": prompt}]
    context = f"Disruption: {disruption_summary}"

    if settings.AI_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        result = _call_openai(messages, context)
        if result:
            return result

    if settings.AI_PROVIDER == "anthropic" and settings.ANTHROPIC_API_KEY:
        result = _call_anthropic(messages, context)
        if result:
            return result

    return None


async def chat_with_assistant(
    message: str,
    history: List[Dict],
    recovery_plan: Optional[Dict],
    trip: Optional[Dict],
) -> Tuple[str, Optional[Dict], bool]:
    """
    Handle a chat message. Returns (response, updated_constraints, trigger_regenerate).
    """
    context = _build_context_block(recovery_plan, trip)

    if settings.AI_PROVIDER != "none" and (settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY):
        messages = []
        for h in history[-8:]:  # Keep last 8 messages
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        result = None
        if settings.AI_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            result = _call_openai(messages, context)
        elif settings.AI_PROVIDER == "anthropic" and settings.ANTHROPIC_API_KEY:
            result = _call_anthropic(messages, context)

        if result:
            return result, None, False

    # Fallback to deterministic
    return _deterministic_chat_response(message=message, recovery_plan=recovery_plan, trip=trip, history=history)
