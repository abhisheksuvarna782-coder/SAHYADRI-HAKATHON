"""
RouteRecover AI - Core Recovery Decision Engine

This module implements the deterministic recovery workflow:
1. Identify affected bookings
2. Generate alternative candidates
3. Apply hard constraints (reject infeasible options)
4. Score feasible alternatives
5. Calculate recovery itinerary
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Tuple
import json
import logging

logger = logging.getLogger(__name__)


# ─── Data classes (plain dicts for simplicity with ORM objects) ──────────────

class ImpactResult:
    """Result of booking impact analysis."""
    def __init__(self):
        self.directly_disrupted: List[Any] = []
        self.potentially_affected: List[Any] = []
        self.confirmed_unaffected: List[Any] = []
        self.needs_verification: List[Any] = []
        self.impact_descriptions: Dict[str, str] = {}


class ScoredAlternative:
    """A transport alternative with computed scores and constraint checks."""
    def __init__(self, alt, original_cost_inr: float):
        self.alt = alt  # ORM TransportAlternative object
        self.original_cost_inr = original_cost_inr
        self.additional_cost_inr = round(alt.price_inr - original_cost_inr, 2)

        # Hard constraint checks
        self.meets_deadline = True
        self.meets_budget = True
        self.meets_max_transfers = True
        self.meets_journey_duration = True
        self.meets_overnight = True
        self.meets_accessibility = True
        self.feasibility_issues: List[str] = []

        # Scores
        self.score = 0.0
        self.score_breakdown: Dict[str, float] = {}
        self.rank_label = ""
        self.rank = 0
        self.explanation = ""

    @property
    def is_feasible(self) -> bool:
        return (self.meets_deadline and self.meets_budget and
                self.meets_max_transfers and self.meets_journey_duration and
                self.meets_overnight and
                self.meets_accessibility)


class RejectedCandidate:
    def __init__(self, alt, reasons: List[str], original_cost: float):
        self.alt = alt
        self.reasons = reasons
        self.additional_cost_inr = round(alt.price_inr - original_cost, 2)


# ─── Step 1: Booking Impact Analyzer ────────────────────────────────────────

def identify_affected_bookings(
    disruption,
    bookings: List[Any],
    dependencies: List[Any],
) -> ImpactResult:
    """
    Classify all bookings in a trip by their disruption impact.
    Never auto-cancels downstream bookings; just classifies their risk.
    """
    result = ImpactResult()
    disrupted_ids = set()

    for booking in bookings:
        if disruption.affected_booking_id and booking.id == disruption.affected_booking_id:
            result.directly_disrupted.append(booking)
            disrupted_ids.add(booking.id)
            result.impact_descriptions[booking.id] = (
                f"This booking is directly disrupted by the {disruption.disruption_type.replace('_', ' ')}."
            )

    # Walk dependency graph
    for dep in dependencies:
        if dep.upstream_booking_id in disrupted_ids:
            downstream = next((b for b in bookings if b.id == dep.dependent_booking_id), None)
            if downstream and downstream.id not in disrupted_ids:
                dep_type = dep.dependency_type
                if dep_type == "connection":
                    # Check if connection time is tight
                    upstream = next((b for b in bookings if b.id == dep.upstream_booking_id), None)
                    if upstream and downstream.departure_time and upstream.arrival_time:
                        gap_minutes = (downstream.departure_time - upstream.arrival_time).total_seconds() / 60
                        if gap_minutes < 0:
                            result.potentially_affected.append(downstream)
                            result.impact_descriptions[downstream.id] = (
                                f"This connection is at risk: original arrival of disrupted segment "
                                f"is after this departure time."
                            )
                        else:
                            result.potentially_affected.append(downstream)
                            result.impact_descriptions[downstream.id] = (
                                f"This connecting journey may be affected depending on recovery timing. "
                                f"Original gap was {int(gap_minutes)} minutes."
                            )
                elif dep_type == "hotel_checkin":
                    result.potentially_affected.append(downstream)
                    result.impact_descriptions[downstream.id] = (
                        f"Hotel check-in time may be affected. Verify with the hotel if arriving later than planned."
                    )
                else:
                    result.needs_verification.append(downstream)
                    result.impact_descriptions[downstream.id] = (
                        f"This reservation may need provider verification due to the disruption."
                    )

    # Everything else is unaffected
    affected_ids = (
        {b.id for b in result.directly_disrupted} |
        {b.id for b in result.potentially_affected} |
        {b.id for b in result.needs_verification}
    )
    for booking in bookings:
        if booking.id not in affected_ids:
            result.confirmed_unaffected.append(booking)

    return result


# ─── Step 2: Generate Alternative Candidates ─────────────────────────────────

def find_alternative_candidates(
    disrupted_booking,
    all_alternatives: List[Any],
    service_date: Optional[str] = None,
) -> List[Any]:
    """
    Find alternatives from mock data that match origin/destination.
    Also accept day ±1 for flexibility.
    """
    if not disrupted_booking.origin or not disrupted_booking.destination:
        return []

    origin = disrupted_booking.origin.lower().strip()
    dest = disrupted_booking.destination.lower().strip()

    candidates = []
    for alt in all_alternatives:
        alt_origin = alt.origin.lower().strip()
        alt_dest = alt.destination.lower().strip()

        # Match origin/destination (partial or exact)
        origin_match = (
            alt_origin == origin or
            origin in alt_origin or
            alt_origin in origin or
            _city_match(alt_origin, origin)
        )
        dest_match = (
            alt_dest == dest or
            dest in alt_dest or
            alt_dest in dest or
            _city_match(alt_dest, dest)
        )

        if origin_match and dest_match:
            candidates.append(alt)

    return candidates


def _city_match(a: str, b: str) -> bool:
    """Simple keyword match for city names."""
    keywords_a = set(a.replace(",", " ").split())
    keywords_b = set(b.replace(",", " ").split())
    return bool(keywords_a & keywords_b)


# ─── Step 3: Apply Hard Constraints ─────────────────────────────────────────

def apply_hard_constraints(
    candidates: List[Any],
    original_cost_inr: float,
    constraint,  # TravellerConstraint ORM object or None
) -> Tuple[List[ScoredAlternative], List[RejectedCandidate]]:
    """
    Filter candidates against hard constraints. Returns (feasible, rejected).
    """
    feasible: List[ScoredAlternative] = []
    rejected: List[RejectedCandidate] = []

    for alt in candidates:
        scored = ScoredAlternative(alt, original_cost_inr)
        rejection_reasons: List[str] = []

        if constraint:
            # Hard: Latest arrival time
            if constraint.latest_arrival_time and alt.arrival_time:
                if alt.arrival_time > constraint.latest_arrival_time:
                    scored.meets_deadline = False
                    scored.feasibility_issues.append(
                        f"Arrives at {alt.arrival_time.strftime('%H:%M')} which is after "
                        f"the deadline of {constraint.latest_arrival_time.strftime('%H:%M')}"
                    )
                    rejection_reasons.append(
                        f"Arrives too late ({alt.arrival_time.strftime('%H:%M')} vs deadline {constraint.latest_arrival_time.strftime('%H:%M')})"
                    )

            # Hard: Max additional budget
            if constraint.max_additional_budget_inr is not None:
                if scored.additional_cost_inr > constraint.max_additional_budget_inr:
                    scored.meets_budget = False
                    scored.feasibility_issues.append(
                        f"Additional cost ₹{scored.additional_cost_inr:,.0f} exceeds budget limit of "
                        f"₹{constraint.max_additional_budget_inr:,.0f}"
                    )
                    rejection_reasons.append(
                        f"Exceeds budget (₹{scored.additional_cost_inr:,.0f} > ₹{constraint.max_additional_budget_inr:,.0f} limit)"
                    )

            # Hard: Max transfers
            if constraint.max_transfers is not None:
                if alt.stops > constraint.max_transfers:
                    scored.meets_max_transfers = False
                    scored.feasibility_issues.append(
                        f"Requires {alt.stops} stop(s); maximum allowed is {constraint.max_transfers}"
                    )
                    rejection_reasons.append(
                        f"Too many stops ({alt.stops} > {constraint.max_transfers} max)"
                    )

            # Hard: Maximum journey duration
            if constraint.max_journey_duration_hours is not None:
                max_duration_minutes = constraint.max_journey_duration_hours * 60
                if alt.duration_minutes > max_duration_minutes:
                    scored.meets_journey_duration = False
                    scored.feasibility_issues.append(
                        f"Journey duration {alt.duration_minutes} minutes exceeds "
                        f"the {constraint.max_journey_duration_hours:g}-hour maximum"
                    )
                    rejection_reasons.append(
                        f"Journey duration exceeds the {constraint.max_journey_duration_hours:g}-hour maximum"
                    )

            # Hard: Overnight travel
            if not constraint.overnight_travel_ok:
                dep_hour = alt.departure_time.hour if alt.departure_time else 12
                arr_hour = alt.arrival_time.hour if alt.arrival_time else 12
                # Overnight: departs evening and arrives next-day morning
                arr_date = alt.arrival_time.date() if alt.arrival_time else None
                dep_date = alt.departure_time.date() if alt.departure_time else None
                if arr_date and dep_date and arr_date > dep_date:
                    scored.meets_overnight = False
                    scored.feasibility_issues.append("This journey requires overnight travel, which you have disabled")
                    rejection_reasons.append("Overnight travel not acceptable")

            # Hard: Accessibility
            if constraint.requires_accessibility and not alt.has_accessibility:
                scored.meets_accessibility = False
                scored.feasibility_issues.append("Service does not have accessibility features")
                rejection_reasons.append("No accessibility features")

        if rejection_reasons:
            rejected.append(RejectedCandidate(alt, rejection_reasons, original_cost_inr))
        else:
            feasible.append(scored)

    return feasible, rejected


# ─── Step 4: Score Feasible Alternatives ─────────────────────────────────────

def score_alternatives(
    feasible: List[ScoredAlternative],
    original_cost_inr: float,
    constraint,
    original_arrival: Optional[datetime] = None,
) -> List[ScoredAlternative]:
    """
    Score feasible alternatives using a normalized, documented scoring function.
    Lower additional cost = better.
    Earlier arrival = better.
    Fewer stops = better.
    """
    if not feasible:
        return []

    # Collect raw values for normalization
    costs = [s.additional_cost_inr for s in feasible]
    arrivals = [s.alt.arrival_time for s in feasible if s.alt.arrival_time]
    durations = [s.alt.duration_minutes for s in feasible]
    stops_list = [s.alt.stops for s in feasible]

    min_cost = min(costs) if costs else 0
    max_cost = max(costs) if costs else 1
    cost_range = max_cost - min_cost if max_cost != min_cost else 1

    min_arr = min(arrivals) if arrivals else datetime.utcnow()
    max_arr = max(arrivals) if arrivals else datetime.utcnow()
    arr_range = (max_arr - min_arr).total_seconds() / 60 if max_arr != min_arr else 1

    min_dur = min(durations) if durations else 1
    max_dur = max(durations) if durations else 1
    dur_range = max_dur - min_dur if max_dur != min_dur else 1

    max_stops = max(stops_list) if stops_list else 1

    for scored in feasible:
        alt = scored.alt

        # Cost score: 0=cheapest, 1=most expensive (we want low cost = high score)
        cost_norm = (scored.additional_cost_inr - min_cost) / cost_range if cost_range > 0 else 0
        cost_score = 1.0 - cost_norm  # invert

        # Arrival score: 0=latest, 1=earliest
        if alt.arrival_time and arr_range > 0:
            arr_minutes = (alt.arrival_time - min_arr).total_seconds() / 60
            arr_norm = arr_minutes / arr_range
            arr_score = 1.0 - arr_norm
        else:
            arr_score = 0.5

        # Duration score
        dur_norm = (alt.duration_minutes - min_dur) / dur_range if dur_range > 0 else 0
        dur_score = 1.0 - dur_norm

        # Stops score
        stops_score = 1.0 - (alt.stops / max_stops) if max_stops > 0 else 1.0

        # Preference bonus
        pref_score = 0.0
        if constraint and constraint.preferred_transport_types:
            try:
                preferred = json.loads(constraint.preferred_transport_types)
            except Exception:
                preferred = constraint.preferred_transport_types if isinstance(constraint.preferred_transport_types, list) else []
            if alt.transport_type in preferred:
                pref_score = 0.2

        # Weights: cost=40%, arrival=30%, duration=20%, stops=10%
        total = (cost_score * 0.40 + arr_score * 0.30 + dur_score * 0.20 + stops_score * 0.10)
        total = min(1.0, total + pref_score * 0.10)

        scored.score = round(total, 4)
        scored.score_breakdown = {
            "cost_score": round(cost_score, 3),
            "arrival_score": round(arr_score, 3),
            "duration_score": round(dur_score, 3),
            "stops_score": round(stops_score, 3),
            "preference_bonus": round(pref_score, 3),
        }

    # Sort by overall score descending
    feasible.sort(key=lambda x: x.score, reverse=True)

    # Assign rank labels
    _assign_rank_labels(feasible)

    return feasible


def _assign_rank_labels(scored_list: List[ScoredAlternative]):
    """Assign best_overall, lowest_cost, fastest rank labels."""
    if not scored_list:
        return

    # Rank 1 = best overall (already sorted by score)
    for i, s in enumerate(scored_list):
        s.rank = i + 1
        if i == 0:
            s.rank_label = "best_overall"
        else:
            s.rank_label = "alternative"

    # Find lowest cost
    by_cost = sorted(scored_list, key=lambda x: x.additional_cost_inr)
    if by_cost[0].rank_label == "alternative":
        by_cost[0].rank_label = "lowest_cost"

    # Find fastest (earliest arrival)
    by_arrival = sorted(scored_list, key=lambda x: x.alt.arrival_time)
    if by_arrival[0].rank_label == "alternative":
        by_arrival[0].rank_label = "fastest"


# ─── Step 5: Calculate Recovery Itinerary ────────────────────────────────────

def calculate_itinerary(
    disruption,
    disrupted_booking,
    best_alternative: ScoredAlternative,
    all_bookings: List[Any],
    impact: ImpactResult,
) -> Dict[str, Any]:
    """
    Calculate the complete recovery itinerary with cost breakdown and actions.
    """
    original_cost = disrupted_booking.price_inr if disrupted_booking else 0.0
    replacement_cost = best_alternative.alt.price_inr
    additional_cost = round(replacement_cost - original_cost, 2)

    # Calculate segments
    segments = []

    # Segment 0: Disrupted original (for reference)
    segments.append({
        "segment_order": 0,
        "segment_type": "original_disrupted",
        "transport_type": disrupted_booking.transport_type if disrupted_booking else "flight",
        "provider": disrupted_booking.provider if disrupted_booking else "Unknown",
        "origin": disrupted_booking.origin if disrupted_booking else disruption.origin,
        "destination": disrupted_booking.destination if disrupted_booking else disruption.destination,
        "departure_time": disrupted_booking.departure_time if disrupted_booking else disruption.original_departure,
        "arrival_time": disrupted_booking.arrival_time if disrupted_booking else disruption.original_arrival,
        "price_inr": original_cost,
        "notes": "Original booking — disrupted",
    })

    alt = best_alternative.alt
    segments.append({
        "segment_order": 1,
        "segment_type": "transport",
        "transport_type": alt.transport_type,
        "provider": alt.provider,
        "origin": alt.origin,
        "destination": alt.destination,
        "departure_time": alt.departure_time,
        "arrival_time": alt.arrival_time,
        "duration_minutes": alt.duration_minutes,
        "price_inr": replacement_cost,
        "alternative_id": alt.id,
        "notes": f"Replacement: {alt.service_name}",
    })

    # Required actions
    actions = [
        f"Book replacement {alt.transport_type}: {alt.service_name} departing {alt.departure_time.strftime('%H:%M')} on {alt.departure_time.strftime('%d %b %Y')}.",
        f"Expected arrival at {alt.destination}: {alt.arrival_time.strftime('%H:%M')} on {alt.arrival_time.strftime('%d %b %Y')}.",
    ]

    if disrupted_booking and disrupted_booking.id in [b.id for b in impact.potentially_affected]:
        pass

    for pb in impact.potentially_affected:
        desc = impact.impact_descriptions.get(pb.id, "")
        if "hotel" in pb.booking_type.lower() or "hotel" in (pb.provider or "").lower():
            actions.append(
                f"Contact hotel ({pb.provider}) to inform of revised arrival time. Check-in may need rescheduling."
            )
        elif "connection" in desc.lower():
            actions.append(
                f"Review connecting journey (ref: {pb.reference}) — departure time may conflict with revised arrival."
            )
        else:
            actions.append(f"Verify reservation {pb.reference} ({pb.provider}) is not affected.")

    for nv in impact.needs_verification:
        actions.append(f"Contact provider for booking {nv.reference} to verify status.")

    # Unknowns
    unknowns = [
        "Cancellation fee or refund amount for original booking is unknown — contact the provider.",
        "Provider rebooking policy varies; confirm directly with the airline/operator.",
    ]

    return {
        "segments": segments,
        "original_cost_inr": original_cost,
        "replacement_cost_inr": replacement_cost,
        "additional_cost_inr": additional_cost,
        "revised_arrival_time": alt.arrival_time.isoformat() if alt.arrival_time else None,
        "required_actions": actions,
        "known_unknowns": unknowns,
        "directly_affected_count": len(impact.directly_disrupted),
        "potentially_affected_count": len(impact.potentially_affected),
    }


# ─── Step 6: Generate Deterministic Explanation ──────────────────────────────

def generate_deterministic_explanation(
    disruption,
    impact: ImpactResult,
    best: ScoredAlternative,
    rejected: List[RejectedCandidate],
    itinerary: Dict[str, Any],
    constraint,
) -> str:
    """
    Generate a readable explanation when no AI is available.
    All numbers come from the deterministic engine.
    """
    alt = best.alt
    lines = [
        f"## Recovery Summary",
        f"",
        f"**Disruption:** {disruption.disruption_type.replace('_', ' ').title()} affecting "
        f"{disruption.origin or 'origin'} → {disruption.destination or 'destination'}.",
        f"",
        f"**Impact Analysis:**",
        f"- {len(impact.directly_disrupted)} booking(s) directly disrupted.",
        f"- {len(impact.potentially_affected)} downstream reservation(s) may need attention.",
        f"- {len(impact.confirmed_unaffected)} booking(s) confirmed unaffected.",
        f"",
        f"**Recommended Option: {alt.service_name}** ({alt.transport_type.title()})",
        f"- Departs: {alt.departure_time.strftime('%H:%M on %d %b %Y')}",
        f"- Arrives: {alt.arrival_time.strftime('%H:%M on %d %b %Y')}",
        f"- Duration: {alt.duration_minutes // 60}h {alt.duration_minutes % 60}m",
        f"- Price: ₹{alt.price_inr:,.0f}",
        f"- Additional cost: ₹{best.additional_cost_inr:,.0f}",
        f"",
        f"**Why this option was selected:**",
        f"This option received the highest overall score ({best.score:.2f}/1.0) balancing cost, "
        f"arrival time, journey duration, and number of stops. "
        f"It passed the configured hard-constraint checks.",
        f"",
    ]

    if rejected:
        lines.append(f"**{len(rejected)} option(s) were rejected:**")
        for r in rejected[:5]:
            lines.append(f"- {r.alt.service_name} ({r.alt.transport_type}): {'; '.join(r.reasons)}")
        lines.append("")

    if impact.potentially_affected:
        lines.append("**Attention required:**")
        for pb in impact.potentially_affected:
            desc = impact.impact_descriptions.get(pb.id, "")
            lines.append(f"- {pb.provider} (ref: {pb.reference}): {desc}")
        lines.append("")

    lines.append("**Next Steps:**")
    for action in itinerary.get("required_actions", []):
        lines.append(f"- {action}")

    lines.append("")
    lines.append("*Note: Cancellation fees and refund amounts are subject to provider policy. "
                 "All booking changes in this demo are simulated and not confirmed with providers.*")

    return "\n".join(lines)


# ─── Processing Stages ────────────────────────────────────────────────────────

def build_processing_stages(
    impact: ImpactResult,
    candidates_count: int,
    feasible_count: int,
    rejected_count: int,
    has_constraint: bool,
) -> List[Dict[str, Any]]:
    stages = [
        {"stage": 1, "name": "Disruption Detected", "status": "complete",
         "detail": "Disruption event received and validated."},
        {"stage": 2, "name": "Affected Bookings Identified", "status": "complete",
         "detail": f"{len(impact.directly_disrupted)} directly disrupted, {len(impact.potentially_affected)} potentially affected."},
        {"stage": 3, "name": "Traveller Constraints Loaded", "status": "complete",
         "detail": "Constraints loaded." if has_constraint else "No constraints configured — using defaults."},
        {"stage": 4, "name": "Alternatives Evaluated", "status": "complete",
         "detail": f"{candidates_count} candidates found, {feasible_count} feasible after constraints, {rejected_count} rejected."},
        {"stage": 5, "name": "Recovery Itinerary Generated", "status": "complete",
         "detail": "Best option selected and itinerary compiled."},
        {"stage": 6, "name": "Awaiting Traveller Approval", "status": "pending",
         "detail": "Please review and approve or reject the proposed recovery plan."},
    ]
    return stages
