# Fleet Insight Engine - Workflow Documentation

## Complete Diagnostic Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLEET INSIGHT ENGINE PIPELINE                     │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1: TESTER (Vehicle Diagnosis)
══════════════════════════════════════════════════════════════════════

  1. Record Vehicle Data
     ├─ Select vehicle from fleet
     ├─ Start OBD-II recording
     ├─ Monitor live telemetry:
     │  ├─ RPM (engine speed)
     │  ├─ Coolant temperature
     │  ├─ Engine load percentage
     │  └─ Speed (km/h)
     ├─ Recording completes (auto-stop at fault)
     └─ Results summary shown:
        ├─ Duration: X minutes
        ├─ Completeness: X%
        └─ Fault detected: Yes/No

  2. Export Data (NEW)
     ├─ Click "Export as CSV" ✨
     ├─ File downloads: session_[ID]_[TIME].csv
     └─ Contains all telemetry & metadata

  3. Send for Analysis
     ├─ Click "Confirm & choose analyzer"
     ├─ Select analyzer from team
     └─ Session sent to Analyzer queue


PHASE 2: ANALYZER (Diagnostic Analysis)
══════════════════════════════════════════════════════════════════════

  4. Review Session in Queue
     ├─ View incoming sessions
     ├─ Shows: Vehicle ID, DTC code, coverage %
     └─ Click to open Analysis Workspace

  5. Run AI Analysis (with retry logic ✨)
     ├─ View telemetry charts (4 parameters)
     ├─ Click "Run AI analysis"
     ├─ [NEW] Automatic retry if rate limited
     ├─ AI model generates:
     │  ├─ Deviation summary (2-3 sentences)
     │  ├─ Likely causes (with confidence %)
     │  │  ├─ Cause #1 (confidence)
     │  │  ├─ Cause #2 (confidence)
     │  │  └─ Cause #3 (confidence)
     │  └─ Recommended fix steps
     └─ Results displayed in AI Insight panel

  6. Review & Adjust
     ├─ Accept AI analysis
     ├─ Or: Click "Re-run" for different analysis
     └─ Click "Accept & draft report"

  7. Draft Report
     ├─ AI generates report with:
     │  ├─ Issue description
     │  ├─ Evidence from telemetry
     │  ├─ Recommended repair steps
     │  └─ Vehicle history notes
     ├─ Edit report if needed
     └─ Submit to Integrator


PHASE 3: INTEGRATOR (Field Verification)
══════════════════════════════════════════════════════════════════════

  8. Review Incoming Report
     ├─ View list of pending reports
     ├─ Click to open Report Review page
     └─ Shows: Issue, evidence, recommendations

  9. Schedule Field Check
     ├─ Read diagnostic recommendations
     ├─ Plan physical vehicle inspection
     └─ Note required tools/parts

  10. Perform Field Check
      ├─ Connect diagnostics to vehicle
      ├─ Verify issue exists
      ├─ Test recommended fix
      ├─ Confirm/reject fix success
      └─ Record findings

  11. Close or Dispute
      ├─ Mark case as "verified & complete"
      ├─ OR
      ├─ Mark as "disputed" with notes
      └─ Send back to analyzer for review


DATABASE FLOW
══════════════════════════════════════════════════════════════════════

Sessions Table:
├─ vehicle_id (FK to Vehicles)
├─ tester_id (FK to Users)
├─ samples (JSON telemetry array)
├─ dtc_code (Diagnostic Trouble Code)
├─ status: complete → sent → analyzed
└─ timestamps

Analyses Table:
├─ session_id (FK to Sessions)
├─ analyzer_id (FK to Users)
├─ deviation_summary (AI output)
├─ ai_suggested_causes (array of causes)
├─ status: draft → sent → disputed
└─ timestamps

Reports Table:
├─ analysis_id (FK to Analyses)
├─ integrator_id (FK to Users)
├─ issue (summary)
├─ evidence (from analysis)
├─ recommended_fix (steps)
├─ status: pending → verified → closed
└─ timestamps

Field Checks Table:
├─ report_id (FK to Reports)
├─ findings (physical inspection results)
├─ verified_fix (boolean)
└─ timestamps


ERROR HANDLING & RETRIES
══════════════════════════════════════════════════════════════════════

OpenAI API Calls:
┌─────────────────────────────────────┐
│ Start: runAnalyze() called          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Attempt 1: Send to OpenAI           │
│ Timeout: 30 seconds                 │
└────────────┬────────────────────────┘
             │
             ├─ Success? → Return result ✅
             │
             ├─ 429 Rate Limit? ┐
             │                  ├─ Wait 1s, retry
             │                  │  (Attempt 2)
             │
             ├─ 500+ Server Error? ┐
             │                      ├─ Wait 2s, retry
             │                      │  (Attempt 3)
             │
             └─ Auth (401/403)? ────► Show error ❌
                                      "Check API key"

After 3 attempts:
├─ Success → Return AI result ✅
├─ Still failing → Show retry message ⏱️
└─ User can click "Re-run" to try again


CSV EXPORT FORMAT
══════════════════════════════════════════════════════════════════════

Header Row:
"Vehicle ID","DTC Code","Sample Count","Recording Duration(min)"

Data Rows (telemetry):
"Timestamp(s)","RPM","Coolant Temp(°C)","Engine Load(%)","Speed(km/h)"
"0.00","800","85.5","15.2","0"
"10.00","850","86.1","16.0","5"
"20.00","920","87.2","18.5","12"
...

Example Import to Excel:
1. Open Excel
2. File → Open → Select CSV file
3. Data imports with telemetry
4. Create charts/graphs as needed


USER ROLES & PERMISSIONS
══════════════════════════════════════════════════════════════════════

TESTER
├─ Can: Record vehicles, export CSV, view own recordings
├─ Cannot: Analyze, approve fixes
└─ Dashboard: Total sessions, sent, completed

ANALYZER
├─ Can: Run AI analysis, draft reports, view queue
├─ Cannot: Record, approve fixes
└─ Dashboard: Incoming queue, completed analyses

INTEGRATOR
├─ Can: Review reports, perform field checks, close cases
├─ Cannot: Record, run analysis, overrule AI
└─ Dashboard: Pending reports, closed cases

ADMIN
├─ Can: Access everything, manage users, view all data
└─ Dashboard: System-wide metrics


STATUS FLOW
══════════════════════════════════════════════════════════════════════

Session Status:
  idle → recording → complete → sent → analyzed

Analysis Status:
  draft → review → sent → complete

Report Status:
  pending → in-review → verified OR disputed → resolved

Field Check Status:
  scheduled → in-progress → verified → closed


TELEMETRY METRICS EXPLAINED
══════════════════════════════════════════════════════════════════════

RPM (Engine Speed)
├─ Unit: Revolutions per minute
├─ Normal: 600-3000 RPM (idle to highway)
├─ Alert: Sudden spikes/drops
└─ Fault cause: Misfire, fuel delivery, ignition

Coolant Temperature
├─ Unit: Degrees Celsius
├─ Normal: 80-95°C (operating range)
├─ Alert: Over 100°C or under 70°C
└─ Fault cause: Thermostat, cooling fan, head gasket

Engine Load
├─ Unit: Percentage (%)
├─ Normal: 10-60% (varies by speed/condition)
├─ Alert: Constant >90% or constant <5%
└─ Fault cause: Sensor error, turbo issue, intake leak

Speed (Vehicle Speed)
├─ Unit: Kilometers per hour
├─ Normal: Correlates with RPM
├─ Alert: Mismatches with RPM
└─ Fault cause: Transmission slip, wheel speed sensor


COMMON DTC CODES
══════════════════════════════════════════════════════════════════════

P0101 - Mass Air Flow Sensor Range/Performance
  └─ Usual cause: Dirty air filter, sensor malfunction

P0103 - Mass Air Flow Sensor High Input
  └─ Usual cause: Vacuum leak, sensor error

P0300 - Random Cylinder Misfire
  └─ Usual cause: Spark plugs, fuel injector, timing

P1000 - OBD System Not Ready
  └─ Usual cause: Recently cleared codes, test not run

P2097 - Post-Combustion Fuel Trim System Low
  └─ Usual cause: Fuel pressure, injector pattern


PERFORMANCE BENCHMARKS
══════════════════════════════════════════════════════════════════════

Recording (Tester):
├─ Start recording: < 100ms
├─ Telemetry update: ~120ms (8x real-time)
├─ Save session: 500ms - 2s (depends on sample count)
└─ CSV export: < 1s (for 1000-5000 samples)

Analysis (Analyzer):
├─ Open workspace: 1-2s (load session data)
├─ Run AI analysis: 5-15s (varies by API)
├─ Generate report: 3-8s (with retries if needed)
└─ Submit report: 500ms (database insert)

Field Check (Integrator):
├─ Load report: 1-2s
├─ Close case: 500ms
└─ Export summary: < 1s


NEXT STEPS FOR USERS
══════════════════════════════════════════════════════════════════════

New to the system?
1. Read QUICK_START.md (this gives 5-minute overview)
2. Login and explore dashboard
3. Try your role's primary workflow
4. Reference TROUBLESHOOTING.md if issues arise

Experiencing issues?
1. Check browser console (F12 → Console tab)
2. Look for messages starting with "[v0]"
3. Search TROUBLESHOOTING.md for your error
4. Verify .env variables are correct

Want to understand more?
1. This file (WORKFLOW.md) - workflow diagrams
2. CHANGES_SUMMARY.md - technical changes
3. QUICK_START.md - quick reference
4. Source code in src/routes/

═══════════════════════════════════════════════════════════════════════

**System**: Fleet Insight Engine v1.0.0  
**Last Updated**: Jan 7, 2025  
**Components**: Tester | Analyzer | Integrator | Admin
