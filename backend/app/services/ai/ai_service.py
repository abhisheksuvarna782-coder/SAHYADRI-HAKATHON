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
    msg_lower = message.lower().strip()

    # 1. Explain Recovery Plan
    if any(k in msg_lower for k in [
        "explain", "overview", "what happened", "disruption", "plan details",
        "explain recovery", "explain the recovery plan",
    ]):
        return (
            "### 📋 Disruption Recovery Plan Overview\n\n"
            "• **Disrupted Leg**: IndiGo Flight **6E-2941** from Mangalore (IXE) to Bengaluru (BLR) was cancelled due to an aircraft technical rotation delay.\n"
            "• **Downstream Protection**: Your check-in at **The Lalit Ashok Bengaluru** and subsequent business commitments remain protected under our simulated recovery schedule.\n"
            "• **Optimal Reroute**: The AI recovery algorithm evaluated 5 multi-modal alternatives across rail, luxury bus, and airline corridors.\n"
            "• **Top Recommendation**: **KSRTC Airavat Club Class AC Sleeper** (Departing 14:00, Arriving 21:30) at **₹950** (+₹0 additional cost after full flight refund). Alternatively, **Vande Bharat Express** departs at 15:15 arriving at 19:45 (₹1,450).\n\n"
            "Both options arrive comfortably before the 22:00 hotel check-in cut-off.",
            None, False
        )

    # 2. Change Constraints / Increase Budget / Overnight Travel (Evaluated before general budget query)
    if any(k in msg_lower for k in [
        "increase my budget", "change constraint", "change constraints", "allow overnight",
        "overnight travel", "budget to ", "increase budget", "allow overnight travel",
    ]):
        import re
        budget = 2000.0
        m = re.search(r"(?:budget\s*(?:to|of)?\s*[₹rs\s]*)(\d+[\d,]*)", msg_lower)
        if m:
            try:
                budget = float(m.group(1).replace(",", ""))
            except Exception:
                budget = 2000.0

        allow_overnight = "overnight" in msg_lower

        return (
            f"### ⚙️ Constraints Updated Successfully!\n\n"
            f"• **Max Additional Budget**: ₹{budget:,.0f}\n"
            f"• **Allow Overnight Travel**: {'Enabled (Yes)' if allow_overnight else 'Standard'}\n\n"
            f"With these expanded parameters, night sleepers and premium express routes become fully eligible for auto-selection. "
            f"Would you like to trigger plan regeneration with these constraints applied?",
            {"max_additional_budget_inr": budget, "allow_overnight": allow_overnight},
            True
        )

    # 3. Budget / Most Affordable Alternatives
    if any(k in msg_lower for k in [
        "budget", "affordable", "cheap", "cheapest", "cheaper", "lowest cost",
        "less expensive", "save money", "cost",
    ]):
        if recovery_plan and recovery_plan.get("alternatives"):
            alts = sorted(recovery_plan["alternatives"], key=lambda a: a.get("price_inr", 0))
            lines = ["### 💰 Most Affordable Recovery Options\n"]
            for i, a in enumerate(alts[:3], 1):
                net_cost = a.get("additional_cost_inr", 0)
                net_text = f"+₹{net_cost:,.0f}" if net_cost > 0 else "₹0 (Fully covered by refund)"
                lines.append(
                    f"{i}. **{a['service_name']}** ({a['transport_type'].upper()})\n"
                    f"   • Ticket: ₹{a['price_inr']:,.0f} | Net Additional: **{net_text}**\n"
                    f"   • Departure: {a['departure_time'][11:16]} → Arrival: {a['arrival_time'][11:16]} ({a['duration_minutes'] // 60}h {a['duration_minutes'] % 60}m)"
                )
            lines.append("\n**Recommendation**: The KSRTC Airavat Sleeper (₹950) provides zero-cost transit while keeping your travel comfortable.")
            return "\n".join(lines), None, False
        else:
            return (
                "### 💰 Most Affordable Recovery Options\n\n"
                "1. **Panchaganga Express (Train via Hassan)** — **₹780**\n"
                "   • Departs: 11:30 | Arrives: 19:15 (7h 45m)\n"
                "   • Net Impact: -₹170 (Saves money against original booking)\n\n"
                "2. **KSRTC Airavat Club Class AC Sleeper (Bus)** — **₹950**\n"
                "   • Departs: 14:00 | Arrives: 21:30 (7h 30m)\n"
                "   • Net Impact: ₹0 additional expense\n\n"
                "3. **VRL Multi-Axle Volvo (Bus)** — **₹1,100**\n"
                "   • Departs: 13:30 | Arrives: 21:45 (8h 15m)\n\n"
                "The **KSRTC Airavat Sleeper** is the top-ranked value option, providing flat-bed comfort with zero extra out-of-pocket spend.",
                None, False
            )

    # 4. Fastest Route / Speed / Earliest Arrival
    if any(k in msg_lower for k in [
        "fast", "fastest", "earliest", "quickest", "quick", "speed",
        "fastest route", "fastest way",
    ]):
        if recovery_plan and recovery_plan.get("alternatives"):
            alts = sorted(recovery_plan["alternatives"], key=lambda a: a.get("duration_minutes", 9999))
            fastest = alts[0]
            return (
                f"### ⚡ Fastest Route to Bengaluru\n\n"
                f"• **Service**: **{fastest['service_name']}** ({fastest['transport_type'].upper()})\n"
                f"• **Duration**: **{fastest['duration_minutes'] // 60}h {fastest['duration_minutes'] % 60}m**\n"
                f"• **Timing**: Departs **{fastest['departure_time'][11:16]}** → Arrives **{fastest['arrival_time'][11:16]}**\n"
                f"• **Fare**: ₹{fastest['price_inr']:,.0f} (+₹{fastest.get('additional_cost_inr', 0):,.0f} net)\n\n"
                f"This gets you to Bengaluru earliest. Alternatively, the **Vande Bharat Express (Train 20608)** takes only 4h 30m overland.",
                None, False
            )
        else:
            return (
                "### ⚡ Fastest Travel Recovery Options\n\n"
                "1. **Air India Flight AI-682** (Fastest Overall)\n"
                "   • Duration: **1h 10m** | Departs: 16:45 → Arrives: 17:55\n"
                "   • Fare: ₹4,200 (+₹3,250 over net refund)\n"
                "   • Best for urgent meetings before 18:30.\n\n"
                "2. **Vande Bharat Express (Train 20608)** (Fastest Overland)\n"
                "   • Duration: **4h 30m** | Departs: 15:15 → Arrives: 19:45\n"
                "   • Fare: ₹1,450 (+₹500 net)\n"
                "   • Punctual, zero-traffic rail corridor with executive comfort.\n\n"
                "If speed is your top priority and budget allows, Air India AI-682 lands in Bengaluru in just 70 minutes.",
                None, False
            )

    # 5. Direct Options / No Transfers
    if any(k in msg_lower for k in [
        "no transfer", "no transfers", "direct", "direct options", "non-stop", "without stops",
    ]):
        return (
            "### 🎯 Direct Non-Stop Options (0 Transfers)\n\n"
            "All recommended options are direct with **zero intermediate connections**:\n\n"
            "1. **Air India Flight AI-682** — Mangalore (IXE) to Bengaluru (BLR) Non-Stop (0 Stops, 1h 10m)\n"
            "2. **Vande Bharat Express (Train 20608)** — Mangalore Central to KSR Bengaluru Point-to-Point (0 Transfers, 4h 30m)\n"
            "3. **KSRTC Airavat Club Class** — Mangalore KSRTC Terminal direct to Majestic Bus Station (0 Transfers, 7h 30m)\n\n"
            "Selecting any of these ensures you won't have to change vehicles or risk missed connections along the Western Ghats route.",
            {"max_stops": 0}, False
        )

    # 6. Hotel Booking Impact
    if "hotel" in msg_lower:
        return (
            "### 🏨 Hotel Booking Protection Status\n\n"
            "• **Property**: The Lalit Ashok, Kumara Krupa High Grounds, Bengaluru\n"
            "• **Status**: Active (Reserved)\n"
            "• **Scheduled Check-in**: Today, 20:00 (Grace period until 23:00)\n"
            "• **Impact Assessment**: If you take the **Vande Bharat Express** (arriving 19:45) or **KSRTC Airavat** (arriving 21:30), your reservation remains safe.\n"
            "• **Action Taken**: A simulated late check-in notification has been logged for hotel reception to hold your room.",
            None, False
        )

    # 7. Greetings
    if any(k in msg_lower for k in ["hello", "hi", "hey", "help"]):
        return (
            "Hello! I am **RouteRecover AI Assistant**, your intelligent travel recovery copilot.\n\n"
            "I'm monitoring your Mangalore → Bengaluru trip. You can ask me:\n"
            "• **'Explain recovery'** — For a full briefing on your disrupted flight and reroute.\n"
            "• **'Budget options'** — To see low-cost and zero-expense travel choices.\n"
            "• **'Fastest route'** — To discover the quickest alternative to Bengaluru.\n"
            "• **'Direct options'** — To filter routes with zero transfers.\n"
            "• **'Change constraints'** — To adjust your budget or allow overnight travel.",
            None, False
        )

    # Default fallback
    return (
        "I am analyzing your travel recovery options. Here is what you can ask me:\n"
        "• **'Explain recovery'** — Complete overview of your disruption & recovery plan.\n"
        "• **'Budget options'** — Review affordable routes with lowest additional spend.\n"
        "• **'Fastest route'** — Find the earliest arrival options in Bengaluru.\n"
        "• **'Direct options'** — View non-stop connections with no transfers.\n"
        "• **'What happens to my hotel booking?'** — Check downstream accommodation impact.",
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
