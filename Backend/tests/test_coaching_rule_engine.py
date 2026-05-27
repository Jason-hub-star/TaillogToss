from app.features.coaching import rule_engine


def test_rule_based_blocks_localize_ids_and_include_detailed_7_day_plan():
    blocks = rule_engine.generate_rule_based_blocks(
        dog_name="메이",
        issues=["barking"],
        triggers=["owner_leaves"],
        total_logs=4,
        avg_intensity=6.5,
    )

    assert "owner_leaves" not in " ".join(blocks.insight.key_patterns)
    assert "보호자 외출" in blocks.insight.key_patterns[0]
    assert len(blocks.next_7_days.days) == 7
    assert blocks.next_7_days.days[0].session_duration_minutes == 5
    assert blocks.next_7_days.days[0].environment
    assert blocks.next_7_days.days[0].tools
    assert "성공:" in blocks.next_7_days.days[0].tasks[0]
