from app.core.database import build_engine_kwargs


def test_supabase_pooler_uses_small_pool_without_statement_cache():
    options = build_engine_kwargs(
        "postgresql+asyncpg://postgres:pass@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"
    )

    assert options["connect_args"] == {"statement_cache_size": 0}
    assert options["pool_size"] == 5
    assert options["max_overflow"] == 5
    assert options["pool_timeout"] == 10
    assert options["pool_recycle"] == 300
    assert "poolclass" not in options


def test_direct_database_keeps_larger_pool():
    options = build_engine_kwargs(
        "postgresql+asyncpg://postgres:pass@db.example.supabase.co:5432/postgres"
    )

    assert options["pool_size"] == 20
    assert options["max_overflow"] == 10
    assert "connect_args" not in options
