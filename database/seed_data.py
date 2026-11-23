"""
Dr Lal PathLabs Franchise Analytics - Database Seeding Script
Populates PostgreSQL with collection centres, test catalog, 15,000 realistic sample orders,
and detailed sample status audit event histories.
"""

import os
import sys
from datetime import datetime, timedelta
import numpy as np
import psycopg2
import psycopg2.extras

# ------------------------------------------------------------------------------
# Configuration & Database Connection
# ------------------------------------------------------------------------------
PG_HOST = os.environ.get("PGHOST", "localhost")
PG_PORT = int(os.environ.get("PGPORT", "5432"))
PG_DATABASE = os.environ.get("PGDATABASE", "diagnostic_ops")
PG_USER = os.environ.get("PGUSER", "postgres")
PG_PASSWORD = os.environ.get("PGPASSWORD", "postgres")

# Fallback passwords to attempt in development environments
CANDIDATE_PASSWORDS = [PG_PASSWORD, "postgres", "Ankit@2002"]


def get_db_connection():
    """Attempts connection using configured password and local fallbacks."""
    last_err = None
    # Deduplicate while preserving order
    passwords = []
    for p in CANDIDATE_PASSWORDS:
        if p and p not in passwords:
            passwords.append(p)

    for pwd in passwords:
        try:
            conn = psycopg2.connect(
                host=PG_HOST,
                port=PG_PORT,
                dbname=PG_DATABASE,
                user=PG_USER,
                password=pwd,
            )
            return conn
        except psycopg2.OperationalError as e:
            last_err = e
            continue

    print(f"Error: Unable to connect to PostgreSQL database '{PG_DATABASE}' on {PG_HOST}:{PG_PORT}.")
    print(f"Details: {last_err}")
    sys.exit(1)


# ------------------------------------------------------------------------------
# Static Domain Data
# ------------------------------------------------------------------------------
COLLECTION_CENTRES = [
    {
        "centre_code": "DL-LP-01",
        "centre_name": "Lajpat Nagar Collection Centre",
        "city": "New Delhi",
        "hub_courier_cutoff_hour": 13,
    },
    {
        "centre_code": "DL-LP-02",
        "centre_name": "Saket Collection Centre",
        "city": "New Delhi",
        "hub_courier_cutoff_hour": 13,
    },
    {
        "centre_code": "DL-LP-03",
        "centre_name": "Kalkaji Collection Centre",
        "city": "New Delhi",
        "hub_courier_cutoff_hour": 13,
    },
]

TEST_CATALOG = [
    # In-House Tests (180 - 360 min standard SLA)
    {
        "test_code": "CBC",
        "test_name": "Complete Blood Count (CBC with ESR)",
        "department": "Hematology",
        "processing_type": "IN_HOUSE",
        "standard_sla_minutes": 180,
        "price_inr": 350.00,
        "weight": 0.20,
    },
    {
        "test_code": "HBA1C",
        "test_name": "Glycated Hemoglobin (HbA1c HPLC)",
        "department": "Biochemistry",
        "processing_type": "IN_HOUSE",
        "standard_sla_minutes": 240,
        "price_inr": 600.00,
        "weight": 0.12,
    },
    {
        "test_code": "LIPID",
        "test_name": "Lipid Profile Screen (Total Chol, HDL, LDL, Trig)",
        "department": "Biochemistry",
        "processing_type": "IN_HOUSE",
        "standard_sla_minutes": 240,
        "price_inr": 850.00,
        "weight": 0.12,
    },
    {
        "test_code": "LFT",
        "test_name": "Liver Function Test (LFT Comprehensive)",
        "department": "Biochemistry",
        "processing_type": "IN_HOUSE",
        "standard_sla_minutes": 240,
        "price_inr": 750.00,
        "weight": 0.10,
    },
    {
        "test_code": "KFT",
        "test_name": "Kidney Function Test (KFT with Electrolytes)",
        "department": "Biochemistry",
        "processing_type": "IN_HOUSE",
        "standard_sla_minutes": 240,
        "price_inr": 750.00,
        "weight": 0.10,
    },
    {
        "test_code": "TFT",
        "test_name": "Thyroid Profile Total (T3, T4, TSH Ultra)",
        "department": "Immunoassay",
        "processing_type": "IN_HOUSE",
        "standard_sla_minutes": 360,
        "price_inr": 650.00,
        "weight": 0.06,
    },
    # External Reference Hub Tests (720 - 1440 min standard SLA)
    {
        "test_code": "VITD",
        "test_name": "25-Hydroxy Vitamin D (CLIA)",
        "department": "Immunoassay",
        "processing_type": "EXTERNAL_HUB",
        "standard_sla_minutes": 720,
        "price_inr": 1400.00,
        "weight": 0.10,
    },
    {
        "test_code": "VITB12",
        "test_name": "Vitamin B12 Cyanocobalamin (CLIA)",
        "department": "Immunoassay",
        "processing_type": "EXTERNAL_HUB",
        "standard_sla_minutes": 720,
        "price_inr": 1100.00,
        "weight": 0.08,
    },
    {
        "test_code": "FERRITIN",
        "test_name": "Serum Ferritin (ECLIA)",
        "department": "Immunoassay",
        "processing_type": "EXTERNAL_HUB",
        "standard_sla_minutes": 720,
        "price_inr": 900.00,
        "weight": 0.04,
    },
    {
        "test_code": "CULTURE",
        "test_name": "Urine Aerobic Culture & Sensitivity (VITEK)",
        "department": "Microbiology",
        "processing_type": "EXTERNAL_HUB",
        "standard_sla_minutes": 1440,
        "price_inr": 800.00,
        "weight": 0.04,
    },
    {
        "test_code": "ANA",
        "test_name": "Antinuclear Antibodies (ANA by IFA)",
        "department": "Immunoassay",
        "processing_type": "EXTERNAL_HUB",
        "standard_sla_minutes": 1440,
        "price_inr": 1600.00,
        "weight": 0.02,
    },
    {
        "test_code": "AMH",
        "test_name": "Anti-Mullerian Hormone (AMH Gen II)",
        "department": "Immunoassay",
        "processing_type": "EXTERNAL_HUB",
        "standard_sla_minutes": 1440,
        "price_inr": 2200.00,
        "weight": 0.02,
    },
]


def execute_schema(conn, schema_path):
    """Executes the DDL schema SQL file."""
    print(f"-> Executing schema definitions from '{schema_path}'...")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with conn.cursor() as cur:
        cur.execute(schema_sql)
    conn.commit()
    print("✓ Schema executed successfully. Tables and indexes recreated.")


def seed_metadata(conn):
    """Seeds collection centres and test catalog records."""
    centre_map = {}
    print("-> Seeding collection centres and diagnostic test catalog...")

    with conn.cursor() as cur:
        for centre in COLLECTION_CENTRES:
            cur.execute(
                """
                INSERT INTO collection_centres (centre_code, centre_name, city, hub_courier_cutoff_hour)
                VALUES (%s, %s, %s, %s)
                RETURNING centre_id, centre_code;
                """,
                (
                    centre["centre_code"],
                    centre["centre_name"],
                    centre["city"],
                    centre["hub_courier_cutoff_hour"],
                ),
            )
            cid, code = cur.fetchone()
            centre_map[code] = cid

        for test in TEST_CATALOG:
            cur.execute(
                """
                INSERT INTO test_catalog (test_code, test_name, department, processing_type, standard_sla_minutes, price_inr)
                VALUES (%s, %s, %s, %s, %s, %s);
                """,
                (
                    test["test_code"],
                    test["test_name"],
                    test["department"],
                    test["processing_type"],
                    test["standard_sla_minutes"],
                    test["price_inr"],
                ),
            )

    conn.commit()
    print(f"✓ Seeded {len(centre_map)} centres and {len(TEST_CATALOG)} catalog tests.")
    return centre_map


def generate_samples_and_events(centre_map, total_target=15000, active_target=60):
    """
    Generates realistic sample orders across past 180 days with:
    - Morning fasting rush (07:00 - 10:30 AM)
    - Day of week surge (Mon/Sat +25-35%, Sun -30%)
    - Cutoff logistics delays for external hub samples collected after 13:00
    - 60 pending samples today for real-time SLA breach triage
    """
    print(f"-> Synthesizing {total_target:,} diagnostic orders with operational dynamics...")
    np.random.seed(42)

    now = datetime.now()
    today = now.date()
    start_date = today - timedelta(days=180)
    historical_target = total_target - active_target

    test_lookup = {t["test_code"]: t for t in TEST_CATALOG}
    test_codes = [t["test_code"] for t in TEST_CATALOG]
    test_probs = np.array([t["weight"] for t in TEST_CATALOG])
    test_probs = test_probs / test_probs.sum()

    centres = list(centre_map.keys())
    centre_probs = [0.36, 0.34, 0.30]  # Lajpat Nagar, Saket, Kalkaji

    # 1. Distribute volume over 180 historical days based on Day of Week
    day_list = [start_date + timedelta(days=i) for i in range(180)]
    day_weights = []
    for d in day_list:
        dow = d.weekday()
        if dow == 0:  # Monday
            w = 1.32
        elif dow == 5:  # Saturday
            w = 1.25
        elif dow == 6:  # Sunday
            w = 0.70
        else:  # Tue - Fri
            w = 1.00
        # Add small random operational fluctuation
        w *= np.random.uniform(0.92, 1.08)
        day_weights.append(w)

    day_weights = np.array(day_weights) / sum(day_weights)
    daily_sample_counts = np.random.multinomial(historical_target, day_weights)

    samples = []
    sample_events_map = []  # will hold list of (sample_idx, event_tuple)

    global_counter = 1

    # --- Phase A: Historical Completed Orders (14,940) ---
    for day_idx, d in enumerate(day_list):
        count_for_day = daily_sample_counts[day_idx]
        for _ in range(count_for_day):
            c_code = np.random.choice(centres, p=centre_probs)
            c_id = centre_map[c_code]
            t_code = np.random.choice(test_codes, p=test_probs)
            test_info = test_lookup[t_code]
            is_in_house = (test_info["processing_type"] == "IN_HOUSE")
            sla_mins = test_info["standard_sla_minutes"]

            # Urgent STAT probability: ~7%
            is_stat = bool(np.random.random() < 0.07)

            # Collection hour distribution:
            # 58% Morning Fasting (07:00 - 10:30)
            # 24% Midday (10:30 - 14:00)
            # 18% Evening (14:00 - 19:30)
            time_slot = np.random.choice(["morning", "midday", "evening"], p=[0.58, 0.24, 0.18])
            if time_slot == "morning":
                # Between 07:00 and 10:30
                minute_offset = np.random.randint(0, 210)
                collected_at = datetime(d.year, d.month, d.day, 7, 0, 0) + timedelta(minutes=minute_offset)
                is_rush_hour = True
            elif time_slot == "midday":
                # Between 10:30 and 14:00
                minute_offset = np.random.randint(0, 210)
                collected_at = datetime(d.year, d.month, d.day, 10, 30, 0) + timedelta(minutes=minute_offset)
                is_rush_hour = False
            else:
                # Between 14:00 and 19:30
                minute_offset = np.random.randint(0, 330)
                collected_at = datetime(d.year, d.month, d.day, 14, 0, 0) + timedelta(minutes=minute_offset)
                is_rush_hour = False

            # Add random second noise
            collected_at += timedelta(seconds=int(np.random.randint(0, 60)))
            expected_ready_at = collected_at + timedelta(minutes=sla_mins)

            # Turnaround Time (TAT) Calculation
            if is_in_house:
                # Base factor between 0.65 and 0.88 of SLA
                base_factor = np.random.uniform(0.68, 0.88)
                # Morning rush congestion adds 15% to 35% delay
                rush_factor = np.random.uniform(1.15, 1.35) if is_rush_hour else 1.0
                # STAT priority accelerates processing by 25%
                stat_factor = 0.75 if is_stat else 1.0

                tat_calc = sla_mins * base_factor * rush_factor * stat_factor

                # Unforeseen equipment recalibration or sample hemolyzation rerun (6.5% chance)
                if np.random.random() < 0.065:
                    tat_calc += np.random.uniform(50, 150)

                actual_tat_minutes = max(35, int(round(tat_calc)))
            else:
                # External Hub logistics
                cutoff_hour = 13  # 1:00 PM courier dispatch cutoff
                is_after_cutoff = (collected_at.hour >= cutoff_hour)

                base_tat = sla_mins * np.random.uniform(0.70, 0.95)
                if is_stat:
                    base_tat *= 0.82

                if is_after_cutoff:
                    # Stored in temperature-controlled cooler overnight until next day's 13:30 courier
                    # This adds roughly 18 to 24 hours (1080 - 1440 min)
                    overnight_delay = np.random.uniform(1100, 1400)
                    actual_tat_minutes = int(round(base_tat + overnight_delay))
                else:
                    # On-time courier transit to hub
                    if np.random.random() < 0.08:  # courier transit traffic / hub queue spike
                        actual_tat_minutes = int(round(base_tat + np.random.uniform(120, 360)))
                    else:
                        actual_tat_minutes = int(round(base_tat))

            actual_ready_at = collected_at + timedelta(minutes=actual_tat_minutes)
            is_breached = bool(actual_tat_minutes > sla_mins)

            # Completed samples: ~92% DELIVERED, ~8% REPORT_GENERATED
            status = "DELIVERED" if np.random.random() < 0.92 else "REPORT_GENERATED"
            barcode = f"LPL-{c_code}-{collected_at.strftime('%y%m%d')}-{global_counter:05d}"

            sample_record = {
                "barcode": barcode,
                "centre_id": c_id,
                "test_code": t_code,
                "is_stat_urgent": is_stat,
                "current_status": status,
                "collected_at": collected_at,
                "expected_ready_at": expected_ready_at,
                "actual_ready_at": actual_ready_at,
                "tat_minutes": actual_tat_minutes,
                "is_sla_breached": is_breached,
                "processing_type": test_info["processing_type"],
            }
            samples.append(sample_record)

            # Build Event Chain
            events = []
            ev_t1 = collected_at
            events.append((ev_t1, "COLLECTED", "Sample drawn and barcoded at phlebotomy station"))

            ev_t2 = ev_t1 + timedelta(minutes=int(np.random.randint(12, 25)))
            events.append((ev_t2, "ACCESSIONED", "Centrifuged, verified, and accessioned into LIMS"))

            if is_in_house:
                ev_t3 = ev_t2 + timedelta(minutes=int(np.random.randint(15, 35)))
                events.append((ev_t3, "IN_HOUSE_PROCESSING", f"Rack loaded on {test_info['department']} analyzer"))
            else:
                ev_t3 = ev_t2 + timedelta(minutes=int(np.random.randint(45, 120)))
                events.append((ev_t3, "DISPATCHED_TO_HUB", "Transferred into cold-chain box; dispatched with route courier"))

            ev_t4 = actual_ready_at - timedelta(minutes=int(np.random.randint(10, 20)))
            if ev_t4 < ev_t3:
                ev_t4 = ev_t3 + timedelta(minutes=15)
            events.append((ev_t4, "REPORT_GENERATED", "Pathologist reviewed, digitally verified and signed report"))

            if status == "DELIVERED":
                events.append((actual_ready_at, "DELIVERED", "Report dispatched to patient portal & sent via WhatsApp/SMS"))

            sample_events_map.append(events)
            global_counter += 1

    # --- Phase B: Active Pending Orders Today (60) ---
    # Realistic operational spread across today for real-time SLA triage display
    active_statuses = (
        ["COLLECTED"] * 12 +
        ["ACCESSIONED"] * 16 +
        ["IN_HOUSE_PROCESSING"] * 20 +
        ["DISPATCHED_TO_HUB"] * 12
    )
    np.random.shuffle(active_statuses)

    for i in range(active_target):
        c_code = np.random.choice(centres, p=centre_probs)
        c_id = centre_map[c_code]
        assigned_status = active_statuses[i]

        # Enforce appropriate test processing type for status
        if assigned_status == "IN_HOUSE_PROCESSING":
            in_house_codes = [t["test_code"] for t in TEST_CATALOG if t["processing_type"] == "IN_HOUSE"]
            t_code = np.random.choice(in_house_codes)
        elif assigned_status == "DISPATCHED_TO_HUB":
            ext_codes = [t["test_code"] for t in TEST_CATALOG if t["processing_type"] == "EXTERNAL_HUB"]
            t_code = np.random.choice(ext_codes)
        else:
            t_code = np.random.choice(test_codes, p=test_probs)

        test_info = test_lookup[t_code]
        is_in_house = (test_info["processing_type"] == "IN_HOUSE")
        sla_mins = test_info["standard_sla_minutes"]
        is_stat = bool(np.random.random() < 0.15)  # slightly higher stat proportion in active queue

        # Collection hours earlier today (between 07:00 and current time)
        # Staggered so some are already past SLA, some close, some brand new
        minutes_ago = np.random.randint(20, min(14 * 60, int((now - datetime(today.year, today.month, today.day, 7, 0, 0)).total_seconds() / 60) if (now - datetime(today.year, today.month, today.day, 7, 0, 0)).total_seconds() > 1200 else 600))
        collected_at = now - timedelta(minutes=minutes_ago)
        expected_ready_at = collected_at + timedelta(minutes=sla_mins)

        # In-flight active sample has no actual_ready_at or tat_minutes yet
        actual_ready_at = None
        tat_minutes = None

        # Check if already breached expected_ready_at
        is_breached = bool(now > expected_ready_at)

        barcode = f"LPL-{c_code}-{today.strftime('%y%m%d')}-{global_counter:05d}"
        sample_record = {
            "barcode": barcode,
            "centre_id": c_id,
            "test_code": t_code,
            "is_stat_urgent": is_stat,
            "current_status": assigned_status,
            "collected_at": collected_at,
            "expected_ready_at": expected_ready_at,
            "actual_ready_at": actual_ready_at,
            "tat_minutes": tat_minutes,
            "is_sla_breached": is_breached,
            "processing_type": test_info["processing_type"],
        }
        samples.append(sample_record)

        events = []
        ev_t1 = collected_at
        events.append((ev_t1, "COLLECTED", "Sample drawn and barcoded at phlebotomy station"))

        if assigned_status in ["ACCESSIONED", "IN_HOUSE_PROCESSING", "DISPATCHED_TO_HUB"]:
            ev_t2 = ev_t1 + timedelta(minutes=int(np.random.randint(10, 20)))
            events.append((ev_t2, "ACCESSIONED", "Centrifuged and accessioned into LIMS"))

            if assigned_status == "IN_HOUSE_PROCESSING":
                ev_t3 = ev_t2 + timedelta(minutes=int(np.random.randint(10, 25)))
                events.append((ev_t3, "IN_HOUSE_PROCESSING", f"Active on {test_info['department']} analyzer"))
            elif assigned_status == "DISPATCHED_TO_HUB":
                ev_t3 = ev_t2 + timedelta(minutes=int(np.random.randint(30, 60)))
                events.append((ev_t3, "DISPATCHED_TO_HUB", "In transit via cold-chain hub logistics"))

        sample_events_map.append(events)
        global_counter += 1

    return samples, sample_events_map


def insert_records(conn, samples, sample_events_map):
    """Performs bulk inserts of sample orders and status events into PostgreSQL."""
    print("-> Inserting 15,000 sample orders into 'sample_orders'...")

    insert_order_sql = """
        INSERT INTO sample_orders (
            barcode, centre_id, test_code, is_stat_urgent, current_status,
            collected_at, expected_ready_at, actual_ready_at, tat_minutes, is_sla_breached
        ) VALUES %s
        RETURNING sample_id;
    """

    order_tuples = [
        (
            s["barcode"],
            s["centre_id"],
            s["test_code"],
            s["is_stat_urgent"],
            s["current_status"],
            s["collected_at"],
            s["expected_ready_at"],
            s["actual_ready_at"],
            s["tat_minutes"],
            s["is_sla_breached"],
        )
        for s in samples
    ]

    with conn.cursor() as cur:
        sample_ids = psycopg2.extras.execute_values(
            cur,
            insert_order_sql,
            order_tuples,
            page_size=2500,
            fetch=True,
        )
        sample_id_list = [row[0] for row in sample_ids]

        print(f"✓ Inserted {len(sample_id_list):,} sample orders.")
        print("-> Inserting audit trail history into 'sample_status_events'...")

        insert_event_sql = """
            INSERT INTO sample_status_events (sample_id, status, changed_at, remarks)
            VALUES %s;
        """

        event_tuples = []
        for sample_id, ev_list in zip(sample_id_list, sample_events_map):
            for changed_at, status, remarks in ev_list:
                event_tuples.append((sample_id, status, changed_at, remarks))

        psycopg2.extras.execute_values(
            cur,
            insert_event_sql,
            event_tuples,
            page_size=5000,
        )
        print(f"✓ Inserted {len(event_tuples):,} status audit events.")

    conn.commit()


def print_summary(conn):
    """Queries and displays a formatted summary of the seeded database."""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM collection_centres;")
        centre_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM test_catalog;")
        test_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM sample_orders;")
        total_orders = cur.fetchone()[0]

        cur.execute("""
            SELECT t.processing_type, COUNT(s.sample_id)
            FROM sample_orders s
            JOIN test_catalog t ON s.test_code = t.test_code
            GROUP BY t.processing_type;
        """)
        proc_counts = dict(cur.fetchall())
        in_house_count = proc_counts.get("IN_HOUSE", 0)
        ext_hub_count = proc_counts.get("EXTERNAL_HUB", 0)

        cur.execute("""
            SELECT current_status, COUNT(*)
            FROM sample_orders
            GROUP BY current_status
            ORDER BY count DESC;
        """)
        status_counts = dict(cur.fetchall())

        cur.execute("SELECT COUNT(*) FROM sample_orders WHERE is_sla_breached = TRUE;")
        total_breaches = cur.fetchone()[0]

        cur.execute("""
            SELECT t.processing_type,
                   COUNT(s.sample_id) as total,
                   COUNT(s.sample_id) FILTER (WHERE s.is_sla_breached = TRUE) as breached
            FROM sample_orders s
            JOIN test_catalog t ON s.test_code = t.test_code
            GROUP BY t.processing_type;
        """)
        breach_by_type = cur.fetchall()

        cur.execute("SELECT COUNT(*) FROM sample_status_events;")
        total_events = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM sample_orders
            WHERE actual_ready_at IS NULL;
        """)
        active_orders = cur.fetchone()[0]

    border = "=" * 70
    print("\n" + border)
    print(" DR LAL PATHLABS FRANCHISE ANALYTICS - SEED DATA SUMMARY")
    print(border)
    print(f" Database Target               : {PG_DATABASE} ({PG_HOST}:{PG_PORT})")
    print(f" Total Collection Centres      : {centre_count}")
    print(f" Total Diagnostic Catalog Tests: {test_count}")
    print(f" Total Sample Orders Generated : {total_orders:,}")
    print(f"   ├─ In-House Processing      : {in_house_count:,} ({in_house_count / total_orders * 100:.1f}%)")
    print(f"   └─ External Hub Processing  : {ext_hub_count:,} ({ext_hub_count / total_orders * 100:.1f}%)")
    print(f" Active Orders In-Flight Today : {active_orders:,} (Pending live triage)")
    print(f" Overall SLA Breached Count    : {total_breaches:,} ({total_breaches / total_orders * 100:.2f}%)")

    print("\n SLA Breach Rate by Processing Type:")
    for p_type, t_cnt, b_cnt in breach_by_type:
        pct = (b_cnt / t_cnt * 100) if t_cnt > 0 else 0
        print(f"   ├─ {p_type:<14} : {b_cnt:,} / {t_cnt:,} ({pct:.2f}%)")

    print("\nCurrent Sample Status Distribution:")
    for st, cnt in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   ├─ {st:<20} : {cnt:,}")

    print(f"\n Total Audit Status Events     : {total_events:,}")
    print(border + "\n")


def main():
    print("==================================================================")
    print(" Starting Diagnostic Ops Database Seeding Pipeline")
    print("==================================================================")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.join(script_dir, "schema.sql")

    conn = get_db_connection()
    try:
        execute_schema(conn, schema_path)
        centre_map = seed_metadata(conn)
        samples, events = generate_samples_and_events(centre_map, total_target=15000, active_target=60)
        insert_records(conn, samples, events)
        print_summary(conn)
        print("✓ All database operations completed successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
