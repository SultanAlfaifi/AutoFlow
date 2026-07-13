function compareAmount(amount, operator, value) {
  const threshold = Number(value || 0);
  if (operator === "gte") return amount >= threshold;
  if (operator === "lte") return amount <= threshold;
  return true;
}

const WEEKDAY_FROM_SHORT = { Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat" };

function zonedClock(now, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    dayOfMonth: Number(parts.day),
    weekday: WEEKDAY_FROM_SHORT[parts.weekday],
  };
}

export function resolveScheduledCondition(condition, now = new Date()) {
  if (condition?.type !== "scheduled" || Number.isNaN(new Date(now).getTime())) return null;
  const schedule = condition.schedule || {};
  const clock = zonedClock(new Date(now), schedule.timezone);
  let matches = false;
  let occurrence = `${clock.date}T${schedule.time}`;

  if (schedule.mode === "once") {
    occurrence = `${schedule.date}T${schedule.time}`;
    matches = `${clock.date}T${clock.time}` >= occurrence;
  } else if (schedule.mode === "daily") {
    matches = clock.time === schedule.time;
  } else if (schedule.mode === "weekly") {
    matches = clock.time === schedule.time && schedule.weekdays?.includes(clock.weekday);
  } else if (schedule.mode === "monthly") {
    matches = clock.time === schedule.time && clock.dayOfMonth === Number(schedule.dayOfMonth);
  }

  if (!matches) return null;
  return { id: `scheduled-${schedule.mode}-${occurrence}`, type: "scheduled", amount: 0, label: `موعد ${occurrence}` };
}

function resolveCondition(condition, eventFacts, context) {
  if (condition.type === "scheduled") return resolveScheduledCondition(condition, context.now || new Date());
  if (condition.type === "balance-below") {
    const balance = Number(context.balance || 0);
    if (balance > Number(condition.value || 0)) return null;
    return { id: `balance-${balance}`, type: condition.type, amount: balance, label: `الرصيد أقل من ${condition.value}` };
  }

  const fact = eventFacts[condition.type];
  if (!fact) return null;
  if (!compareAmount(Number(fact.amount || 0), condition.operator, condition.value)) return null;
  if (condition.merchant && !String(fact.merchant || fact.label || "").toLowerCase().includes(condition.merchant.toLowerCase())) return null;
  return fact;
}

export function evaluateWorkflow(workflow, eventFacts, context, processedSignatures = []) {
  if (!workflow.active || !workflow.conditions.length || !workflow.actions.length) return null;
  const resolved = workflow.conditions.map((condition) => resolveCondition(condition, eventFacts, context));
  const matched = resolved.filter(Boolean);
  let isMatch = Boolean(resolved[0]);
  for (let index = 1; index < resolved.length; index += 1) {
    const fallbackJoin = workflow.match === "any" ? "or" : "and";
    const joinWith = workflow.conditions[index].joinWith || fallbackJoin;
    isMatch = joinWith === "or"
      ? isMatch || Boolean(resolved[index])
      : isMatch && Boolean(resolved[index]);
  }
  if (!isMatch) return null;

  const signature = `${workflow.id}:${matched.map((fact) => fact.id).sort().join("|")}`;
  if (processedSignatures.includes(signature)) return null;

  return {
    workflowId: workflow.id,
    workflowTitle: workflow.name,
    signature,
    facts: matched,
    primaryFact: matched[matched.length - 1],
    actions: workflow.actions,
  };
}

export function resolveActionAmount(action, run) {
  if (["notify", "pause", "categorize"].includes(action.type)) return 0;
  const baseAmount = Number(run.primaryFact?.amount || 0);
  return action.amountMode === "percent"
    ? baseAmount * (Number(action.value || 0) / 100)
    : Number(action.value || 0);
}

export function evaluateSafety(action, amount, context) {
  const failures = [];
  const safety = action.safety || {};
  const balance = Number(context.balance || 0);
  const todayTransfers = Number(context.todayTransfers || 0);
  const hour = new Date().getHours();

  if (safety.minBalanceOn && balance - amount < Number(safety.minBalance || 0)) failures.push("الحد الأدنى للرصيد");
  if (safety.maxAmountOn && amount > Number(safety.maxAmount || 0)) failures.push("الحد الأعلى للعملية");
  if (safety.dailyLimitOn && todayTransfers + amount > Number(safety.dailyLimit || 0)) failures.push("حد التحويل اليومي");
  if (safety.hoursOn && (hour < Number(safety.startHour || 6) || hour >= Number(safety.endHour || 23))) failures.push("وقت التنفيذ المسموح");
  return failures;
}

export function actionNeedsApproval(action, amount) {
  const approval = action.approval || { mode: "always" };
  if (approval.mode === "always") return true;
  if (approval.mode === "above") return amount >= Number(approval.threshold || 0);
  return false;
}
