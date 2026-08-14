import { priorityEngine } from '../priorityEngine';

/**
 * Lightweight test suite validating Priority Intelligence Engine logic across 10 scenarios.
 */
export function runPriorityEngineTests() {
  const results: { name: string; passed: boolean; details: string }[] = [];

  function assert(name: string, condition: boolean, message: string) {
    results.push({
      name,
      passed: condition,
      details: condition ? `PASSED: ${message}` : `FAILED: ${message}`,
    });
  }

  // TEST 1: Minor medical incident
  const t1 = priorityEngine.calculatePriority({
    emergency_type: 'MEDICAL',
    people_affected: 1,
    injury_level: 'MINOR',
    severity: 30,
    location_risk: 'LOW',
  });
  assert('TEST 1: Minor medical incident', t1.level === 'LOW' || t1.level === 'MEDIUM', `Score=${t1.score}, Level=${t1.level}`);

  // TEST 2: Road accident with 4 people, severe injuries, high-risk location
  const t2 = priorityEngine.calculatePriority({
    emergency_type: 'ROAD_ACCIDENT',
    people_affected: 4,
    injury_level: 'SEVERE',
    severity: 85,
    location_risk: 'HIGH',
  });
  assert('TEST 2: Road accident severe', t2.level === 'HIGH' || t2.level === 'CRITICAL', `Score=${t2.score}, Level=${t2.level}`);

  // TEST 3: Building collapse with 10 people, severe injuries, critical location
  const t3 = priorityEngine.calculatePriority({
    emergency_type: 'BUILDING_COLLAPSE',
    people_affected: 10,
    injury_level: 'SEVERE',
    severity: 95,
    location_risk: 'CRITICAL',
  });
  assert('TEST 3: Building collapse', t3.level === 'CRITICAL', `Score=${t3.score}, Level=${t3.level}`);

  // TEST 4: Single minor injury
  const t4 = priorityEngine.calculatePriority({
    emergency_type: 'OTHER',
    people_affected: 1,
    injury_level: 'MINOR',
    severity: 20,
    location_risk: 'LOW',
  });
  assert('TEST 4: Single minor injury', t4.score < 50, `Score=${t4.score}, Level=${t4.level}`);

  // TEST 5: Large number of affected people (elevates priority)
  const t5a = priorityEngine.calculatePriority({ emergency_type: 'FLOOD', people_affected: 1, injury_level: 'MINOR' });
  const t5b = priorityEngine.calculatePriority({ emergency_type: 'FLOOD', people_affected: 25, injury_level: 'MINOR' });
  assert('TEST 5: Large affected count elevates score', t5b.score > t5a.score, `t5a=${t5a.score}, t5b=${t5b.score}`);

  // TEST 6: Long waiting time elevates score
  const nowISO = new Date().toISOString();
  const oldISO = new Date(Date.now() - 1000 * 60 * 35).toISOString(); // 35 min ago
  const t6a = priorityEngine.calculatePriority({ emergency_type: 'MEDICAL', reported_at: nowISO });
  const t6b = priorityEngine.calculatePriority({ emergency_type: 'MEDICAL', reported_at: oldISO });
  assert('TEST 6: Waiting time elevates score', t6b.score > t6a.score, `Fresh=${t6a.score}, Delayed=${t6b.score}`);

  // TEST 7: Missing fields handling (does not crash)
  let t7NoCrash = false;
  try {
    const t7 = priorityEngine.calculatePriority({});
    t7NoCrash = typeof t7.score === 'number' && Boolean(t7.level);
  } catch (err) {
    t7NoCrash = false;
  }
  assert('TEST 7: Missing fields graceful fallback', t7NoCrash, 'Engine handled empty input gracefully');

  // TEST 8: Boundary score around 29/30 (LOW vs MEDIUM)
  const t8Low = priorityEngine.calculatePriority({ severity: 20, people_affected: 0, injury_level: 'NONE', emergency_type: 'OTHER', location_risk: 'LOW' });
  const t8Med = priorityEngine.calculatePriority({ severity: 40, people_affected: 2, injury_level: 'MINOR', emergency_type: 'OTHER', location_risk: 'MEDIUM' });
  assert('TEST 8: Boundary score LOW vs MEDIUM', t8Low.level === 'LOW' && (t8Med.level === 'MEDIUM' || t8Med.level === 'HIGH'), `LowScore=${t8Low.score}, MedScore=${t8Med.score}`);

  // TEST 9: Boundary score around 59/60 (MEDIUM vs HIGH)
  const t9High = priorityEngine.calculatePriority({ severity: 75, people_affected: 4, injury_level: 'MODERATE', emergency_type: 'ROAD_ACCIDENT', location_risk: 'MEDIUM' });
  assert('TEST 9: Boundary score MEDIUM vs HIGH', t9High.level === 'HIGH' || t9High.level === 'CRITICAL', `HighScore=${t9High.score}, Level=${t9High.level}`);

  // TEST 10: Boundary score around 79/80 (HIGH vs CRITICAL)
  const t10Crit = priorityEngine.calculatePriority({ severity: 95, people_affected: 8, injury_level: 'SEVERE', emergency_type: 'BUILDING_COLLAPSE', location_risk: 'CRITICAL' });
  assert('TEST 10: Boundary score HIGH vs CRITICAL', t10Crit.level === 'CRITICAL', `CritScore=${t10Crit.score}, Level=${t10Crit.level}`);

  return results;
}
