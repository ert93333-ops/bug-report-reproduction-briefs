(function () {
  const ANALYTICS_KEY = "bugreprobriefs_analytics_events";
  const INTENT_KEY = "bugreprobriefs_purchase_intents";
  const ISSUE_BASE = "https://github.com/ert93333-ops/bug-report-reproduction-briefs/issues/new";

  const SAMPLE_SYMPTOM_NOTES = [
    "Checkout is broken.",
    "Customer is angry.",
    "Please fix ASAP."
  ].join("\n");
  const SAMPLE_REPRO_NOTES = "It happens sometimes. I cannot reproduce.";
  const SAMPLE_EXPECTED_ACTUAL_NOTES = "Should work but does not.";
  const SAMPLE_ENVIRONMENT_NOTES = "Unknown.";
  const SAMPLE_EVIDENCE_NOTES = "No screenshot yet.";
  const SAMPLE_IMPACT_NOTES = "A customer complained.";
  const SAMPLE_SEVERITY_NOTES = "Urgent.";
  const SAMPLE_WORKAROUND_NOTES = "None.";
  const SAMPLE_OWNERSHIP_NOTES = "TBD after triage.";
  const SAMPLE_FOLLOWUP_NOTES = "Later.";

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function track(event, detail) {
    const payload = {
      event,
      detail: detail || {},
      path: window.location.pathname,
      query: window.location.search,
      timestamp: nowIso()
    };
    const events = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || "[]");
    events.push(payload);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(events.slice(-100)));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(selector, value) {
    const element = qs(selector);
    if (element) element.textContent = value;
  }

  function unique(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function has(pattern, value) {
    return pattern.test(String(value || ""));
  }

  function wordCount(value) {
    return String(value || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function analyze(input) {
    const raw = [
      input.symptomNotes,
      input.reproNotes,
      input.expectedActualNotes,
      input.environmentNotes,
      input.evidenceNotes,
      input.impactNotes,
      input.severityNotes,
      input.workaroundNotes,
      input.ownershipNotes,
      input.followupNotes,
      input.bugSurfaceType
    ].join("\n");

    const parseSummary = [
      "Bug report note characters: " + String(input.symptomNotes || "").length,
      "Bug surface type: " + (input.bugSurfaceType || "not provided"),
      "Public-safe reminder: remove secrets, source code, private logs, customer data, health data, legal data, billing data, employee data, and security-sensitive details before using pasted samples."
    ];

    const reproWarnings = [];
    const expectedActualWarnings = [];
    const environmentWarnings = [];
    const impactWarnings = [];
    const severityWarnings = [];
    const evidenceWarnings = [];
    const workaroundWarnings = [];
    const duplicateRegressionWarnings = [];
    const ownerWarnings = [];
    const vagueLanguageWarnings = [];
    const followUpWarnings = [];

    if (!has(/\b(step|steps|repro|reproduce|reproduction|click|open|go to|enter|select|submit|login|log in|checkout|refresh|navigate|start from|after)\b/i, input.reproNotes) || wordCount(input.reproNotes) < 8) {
      reproWarnings.push("missing reproduction steps: notes do not give a repeatable step-by-step path another person can follow.");
    }
    if (has(/\b(cannot reproduce|can't reproduce|sometimes|random|occasionally|intermittent|not sure|unclear)\b/i, input.reproNotes + "\n" + input.symptomNotes) && !has(/\b(frequency|rate|happened \d|times|every|always|once|twice|session|attempt)\b/i, input.reproNotes + "\n" + input.impactNotes)) {
      reproWarnings.push("missing reproduction steps: intermittent behavior is mentioned without frequency, attempt count, or last observed state.");
    }

    if (!has(/\b(expected|should|intended|actual|instead|observed|got|result|behavior|behaviour)\b/i, input.expectedActualNotes + "\n" + input.symptomNotes)) {
      expectedActualWarnings.push("missing expected versus actual behavior: notes do not separate what should happen from what happened instead.");
    } else if (!has(/\b(expected|should|intended)\b/i, input.expectedActualNotes) || !has(/\b(actual|instead|observed|got|happened)\b/i, input.expectedActualNotes)) {
      expectedActualWarnings.push("missing expected versus actual behavior: one side is present, but expected and actual outcomes are not both explicit.");
    }

    if (!has(/\b(chrome|safari|firefox|edge|ios|android|windows|mac|macos|linux|device|mobile|desktop|browser|os|version|v\d|build|staging|production|prod|region|account|tier|plan|feature flag|flag)\b/i, input.environmentNotes + "\n" + input.symptomNotes)) {
      environmentWarnings.push("missing environment or version details: notes do not include browser, device, OS, app version, environment, account tier, region, or feature flag.");
    }

    if (!has(/\b(customer|user|users|account|accounts|tenant|tenants|blocked|cannot|can't|failed|fails|revenue|checkout|payment|signup|workflow|frequency|daily|weekly|every|all|some|one|many|impact|affected|business)\b/i, input.impactNotes + "\n" + input.symptomNotes) || wordCount(input.impactNotes) < 6) {
      impactWarnings.push("missing customer impact or frequency: notes do not say who is affected, how often it occurs, or which workflow is blocked.");
    }

    if (!has(/\b(p0|p1|p2|p3|sev|severity|priority|high|medium|low|blocker|critical|major|minor|release blocker|escalat|urgent because|customer impact|revenue|security)\b/i, input.severityNotes + "\n" + input.impactNotes)) {
      severityWarnings.push("missing severity or priority rationale: notes do not justify priority with customer, business, release, or workflow impact.");
    } else if (has(/\b(urgent|asap|critical|blocker)\b/i, input.severityNotes + "\n" + input.symptomNotes) && wordCount(input.severityNotes + " " + input.impactNotes) < 8) {
      severityWarnings.push("missing severity or priority rationale: urgent language appears without enough impact detail.");
    }

    if (!has(/\b(screenshot|screen shot|recording|video|console|log|logs|error|stack|trace|request id|request-id|har|network|payload|response|status code|500|400|exception|message)\b/i, input.evidenceNotes + "\n" + input.symptomNotes)) {
      evidenceWarnings.push("missing logs, screenshot, or evidence summary: notes do not describe evidence an engineer can inspect.");
    } else if (has(/\b(no screenshot|no logs|none|not captured|missing)\b/i, input.evidenceNotes) && !has(/\b(error|message|request|console|recording|summary)\b/i, input.evidenceNotes)) {
      evidenceWarnings.push("missing logs, screenshot, or evidence summary: evidence is explicitly absent without a substitute summary.");
    }

    if (!has(/\b(workaround|mitigation|temporary|retry|refresh|rollback|fallback|manual|disable|feature flag|flag off|alternate|use instead|none known|no workaround)\b/i, input.workaroundNotes + "\n" + input.followupNotes)) {
      workaroundWarnings.push("missing workaround or mitigation note: notes do not say whether a customer can recover, retry, use a fallback, or whether no workaround is known.");
    }

    if (!has(/\b(duplicate|dupe|related issue|same as|regression|recent release|last known good|worked before|started after|release|deploy|version|component|area|module)\b/i, input.ownershipNotes + "\n" + input.environmentNotes + "\n" + input.symptomNotes)) {
      duplicateRegressionWarnings.push("duplicate or regression ambiguity: notes do not say whether this is new, recurring, related to a release, or connected to an existing issue.");
    }

    if (!has(/\b(owner|assigned|assignee|team|qa|engineering|eng|support|product|pm|triage|responsible|component|backend|frontend|mobile|platform|maintainer)\b/i, input.ownershipNotes + "\n" + input.followupNotes)) {
      ownerWarnings.push("unclear owner or engineering handoff: notes do not name the team, owner, component, assignee, or triage route.");
    }
    if (has(/\b(tbd|later|unknown|unassigned|no owner|not assigned)\b/i, input.ownershipNotes + "\n" + input.followupNotes)) {
      ownerWarnings.push("unclear owner or engineering handoff: ownership is explicitly unresolved.");
    }

    if (has(/\b(broken|not working|doesn't work|does not work|asap|urgent|customer is angry|bad|issue|problem|weird|buggy)\b/i, raw) && !has(/\b(expected|actual|steps|chrome|safari|version|impact|severity|screenshot|owner)\b/i, raw)) {
      vagueLanguageWarnings.push("vague urgency language: notes use broken, not working, urgent, or similar wording without concrete repro, environment, impact, evidence, or owner details.");
    } else if (has(/\b(broken|not working|doesn't work|does not work|asap|urgent|customer is angry|weird|buggy)\b/i, raw)) {
      vagueLanguageWarnings.push("vague urgency language: keep the urgency, but replace generic wording with observable behavior, steps, environment, impact, and owner details.");
    }

    if (!has(/\b(follow-up|follow up|reply|respond|update|next update|status|ask|more info|customer|support|triage decision|decision|by\s+\w+|today|tomorrow|eod|date|owner)\b/i, input.followupNotes + "\n" + input.ownershipNotes)) {
      followUpWarnings.push("missing customer follow-up decision: notes do not say who replies, what more info is needed, or when the next update happens.");
    }

    const issueCount =
      reproWarnings.length +
      expectedActualWarnings.length +
      environmentWarnings.length +
      impactWarnings.length +
      severityWarnings.length +
      evidenceWarnings.length +
      workaroundWarnings.length +
      duplicateRegressionWarnings.length +
      ownerWarnings.length +
      vagueLanguageWarnings.length +
      followUpWarnings.length;

    const status = issueCount === 0
      ? "Ready for engineering triage"
      : issueCount >= 6
        ? "Fix before engineering triage"
        : "Manual review";

    const engineeringHandoff = [
      "Bug surface type: " + (input.bugSurfaceType || "not provided"),
      "Symptom: " + (input.symptomNotes || "missing"),
      "Reproduction steps: " + (input.reproNotes || "missing"),
      "Expected vs actual: " + (input.expectedActualNotes || "missing"),
      "Environment: " + (input.environmentNotes || "missing"),
      "Evidence: " + (input.evidenceNotes || "missing"),
      "Impact/frequency: " + (input.impactNotes || "missing"),
      "Severity rationale: " + (input.severityNotes || "missing"),
      "Workaround: " + (input.workaroundNotes || "missing"),
      "Owner/duplicate/regression: " + (input.ownershipNotes || "missing"),
      "Follow-up decision: " + (input.followupNotes || "missing")
    ];

    const customerSummary = [
      "Customer/support follow-up summary",
      "",
      "Current status: " + (status === "Ready for engineering triage" ? "Ready to pass to engineering." : "Need more detail before a reliable engineering handoff."),
      "What we need next: " + (issueCount ? "fill the missing repro, environment, impact, evidence, owner, or follow-up fields flagged below." : "keep the customer updated after engineering triage."),
      "Do not promise root cause, compensation, SLA outcome, or release timing unless approved by company policy."
    ];

    return {
      status,
      issueCount,
      parseSummary: unique(parseSummary),
      reproWarnings: unique(reproWarnings),
      expectedActualWarnings: unique(expectedActualWarnings),
      environmentWarnings: unique(environmentWarnings),
      impactWarnings: unique(impactWarnings),
      severityWarnings: unique(severityWarnings),
      evidenceWarnings: unique(evidenceWarnings),
      workaroundWarnings: unique(workaroundWarnings),
      duplicateRegressionWarnings: unique(duplicateRegressionWarnings),
      ownerWarnings: unique(ownerWarnings),
      vagueLanguageWarnings: unique(vagueLanguageWarnings),
      followUpWarnings: unique(followUpWarnings),
      engineeringHandoff,
      customerSummary,
      handoffReminders: [
        "Remove secrets, source code, private logs, customer data, health data, legal data, billing data, employee data, and security-sensitive details before using pasted samples.",
        "Get internal approval before sending customer commitments, release timing, compensation, warranty, SLA, or contract-related statements.",
        "Treat this output as bug-report triage QA and handoff guidance, not debugging advice, root-cause diagnosis, legal advice, SLA advice, or a substitute for company policy."
      ]
    };
  }

  function listHtml(items, emptyText) {
    const list = items && items.length ? items : [emptyText];
    return "<ul>" + list.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>";
  }

  function briefToText(brief) {
    return [
      "Bug report reproduction brief",
      "Status: " + brief.status,
      "Checks needing attention: " + brief.issueCount,
      "",
      "Parse summary:",
      brief.parseSummary.join("\n"),
      "",
      "Reproduction warnings:",
      brief.reproWarnings.length ? brief.reproWarnings.join("\n") : "None found.",
      "",
      "Expected/actual warnings:",
      brief.expectedActualWarnings.length ? brief.expectedActualWarnings.join("\n") : "None found.",
      "",
      "Environment warnings:",
      brief.environmentWarnings.length ? brief.environmentWarnings.join("\n") : "None found.",
      "",
      "Impact warnings:",
      brief.impactWarnings.length ? brief.impactWarnings.join("\n") : "None found.",
      "",
      "Severity warnings:",
      brief.severityWarnings.length ? brief.severityWarnings.join("\n") : "None found.",
      "",
      "Evidence warnings:",
      brief.evidenceWarnings.length ? brief.evidenceWarnings.join("\n") : "None found.",
      "",
      "Workaround warnings:",
      brief.workaroundWarnings.length ? brief.workaroundWarnings.join("\n") : "None found.",
      "",
      "Duplicate/regression warnings:",
      brief.duplicateRegressionWarnings.length ? brief.duplicateRegressionWarnings.join("\n") : "None found.",
      "",
      "Owner warnings:",
      brief.ownerWarnings.length ? brief.ownerWarnings.join("\n") : "None found.",
      "",
      "Vague language warnings:",
      brief.vagueLanguageWarnings.length ? brief.vagueLanguageWarnings.join("\n") : "None found.",
      "",
      "Follow-up warnings:",
      brief.followUpWarnings.length ? brief.followUpWarnings.join("\n") : "None found.",
      "",
      "Engineering handoff:",
      brief.engineeringHandoff.join("\n"),
      "",
      "Customer/support summary:",
      brief.customerSummary.join("\n"),
      "",
      "Handoff reminders:",
      brief.handoffReminders.join("\n")
    ].join("\n");
  }

  function renderBrief(brief) {
    const output = qs("#brief-output");
    if (!output) return;
    output.innerHTML = [
      '<div class="brief-summary">',
      '<strong>' + escapeHtml(brief.status) + '</strong>',
      '<span>' + brief.issueCount + ' checks need attention</span>',
      "</div>",
      '<section class="brief-section"><h4>Parse summary</h4>' + listHtml(brief.parseSummary, "No parse notes found.") + "</section>",
      '<section class="brief-section"><h4>Reproduction warnings</h4>' + listHtml(brief.reproWarnings, "No reproduction warnings found.") + "</section>",
      '<section class="brief-section"><h4>Expected/actual warnings</h4>' + listHtml(brief.expectedActualWarnings, "No expected/actual warnings found.") + "</section>",
      '<section class="brief-section"><h4>Environment warnings</h4>' + listHtml(brief.environmentWarnings, "No environment warnings found.") + "</section>",
      '<section class="brief-section"><h4>Impact warnings</h4>' + listHtml(brief.impactWarnings, "No impact warnings found.") + "</section>",
      '<section class="brief-section"><h4>Severity warnings</h4>' + listHtml(brief.severityWarnings, "No severity warnings found.") + "</section>",
      '<section class="brief-section"><h4>Evidence warnings</h4>' + listHtml(brief.evidenceWarnings, "No evidence warnings found.") + "</section>",
      '<section class="brief-section"><h4>Workaround warnings</h4>' + listHtml(brief.workaroundWarnings, "No workaround warnings found.") + "</section>",
      '<section class="brief-section"><h4>Duplicate/regression warnings</h4>' + listHtml(brief.duplicateRegressionWarnings, "No duplicate or regression warnings found.") + "</section>",
      '<section class="brief-section"><h4>Owner warnings</h4>' + listHtml(brief.ownerWarnings, "No owner warnings found.") + "</section>",
      '<section class="brief-section"><h4>Vague language warnings</h4>' + listHtml(brief.vagueLanguageWarnings, "No vague language warnings found.") + "</section>",
      '<section class="brief-section"><h4>Customer follow-up warnings</h4>' + listHtml(brief.followUpWarnings, "No customer follow-up warnings found.") + "</section>",
      '<section class="brief-section"><h4>Engineering handoff</h4><pre>' + escapeHtml(brief.engineeringHandoff.join("\n")) + "</pre></section>",
      '<section class="brief-section"><h4>Customer/support summary</h4><pre>' + escapeHtml(brief.customerSummary.join("\n")) + "</pre></section>",
      '<section class="brief-section"><h4>Handoff reminders</h4>' + listHtml(brief.handoffReminders, "No handoff reminders found.") + "</section>"
    ].join("");
    setText("#output-title", "Bug reproduction brief ready");
    setText("#status-pill", brief.status);
    const outputPanel = qs("#output-panel");
    if (outputPanel) {
      outputPanel.classList.add("has-brief");
      outputPanel.classList.toggle("status-good", brief.status === "Ready for engineering triage");
      outputPanel.classList.toggle("status-warning", brief.status === "Manual review");
      outputPanel.classList.toggle("status-danger", brief.status === "Fix before engineering triage");
    }
    const copyButton = qs("#copy-brief");
    if (copyButton) copyButton.disabled = false;
    window.__latestBriefText = briefToText(brief);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  }

  function issueUrl(intent) {
    const body = [
      "Bug Report Reproduction Briefs early-access request",
      "",
      "Role: " + intent.role,
      "Bug workflow: " + intent.workflowType,
      "Current issue tracker: " + intent.issueTracker,
      "Plan interest: " + intent.plan,
      "Willingness to pay: " + intent.budget,
      "Purchase intent: " + (intent.purchaseIntent ? "yes" : "no"),
      "",
      "Current bug intake pain:",
      intent.pain,
      "",
      "Note: Email is intentionally omitted from this public issue body."
    ].join("\n");
    const params = new URLSearchParams({
      title: "Bug Report Reproduction Briefs early-access request",
      body,
      labels: "early-access,purchase-intent,demo-request",
      template: "demo_request.md"
    });
    return ISSUE_BASE + "?" + params.toString();
  }

  function requestDetails(intent) {
    return [
      "Bug Report Reproduction Briefs early-access request",
      "Email: " + intent.email,
      "Role: " + intent.role,
      "Bug workflow: " + intent.workflowType,
      "Current issue tracker: " + intent.issueTracker,
      "Plan interest: " + intent.plan,
      "Willingness to pay: " + intent.budget,
      "Purchase intent: " + (intent.purchaseIntent ? "yes" : "no"),
      "",
      "Pain:",
      intent.pain
    ].join("\n");
  }

  function init() {
    const symptomNotes = qs("#symptom-notes");
    const reproNotes = qs("#repro-notes");
    const expectedActualNotes = qs("#expected-actual-notes");
    const environmentNotes = qs("#environment-notes");
    const evidenceNotes = qs("#evidence-notes");
    const impactNotes = qs("#impact-notes");
    const severityNotes = qs("#severity-notes");
    const workaroundNotes = qs("#workaround-notes");
    const ownershipNotes = qs("#ownership-notes");
    const followupNotes = qs("#followup-notes");
    const bugSurfaceType = qs("#bug-surface-type");
    const error = qs("#workflow-error");
    const form = qs("#qa-form");
    const loadSample = qs("#load-sample");
    const copyBrief = qs("#copy-brief");
    const waitlistForm = qs("#waitlist-form");
    const handoffPanel = qs("#handoff-panel");
    const remoteLink = qs("#remote-intent-link");
    const copyRequest = qs("#copy-request");

    track("landing_viewed", { product: "Bug Report Reproduction Briefs" });

    const header = qs("[data-header]");
    const onScroll = () => {
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    qsa("[data-track-cta]").forEach((element) => {
      element.addEventListener("click", () => {
        track("cta_clicked", { cta: element.getAttribute("data-track-cta") || element.textContent.trim() });
      });
    });

    if (loadSample) {
      loadSample.addEventListener("click", () => {
        if (symptomNotes) symptomNotes.value = SAMPLE_SYMPTOM_NOTES;
        if (reproNotes) reproNotes.value = SAMPLE_REPRO_NOTES;
        if (expectedActualNotes) expectedActualNotes.value = SAMPLE_EXPECTED_ACTUAL_NOTES;
        if (environmentNotes) environmentNotes.value = SAMPLE_ENVIRONMENT_NOTES;
        if (evidenceNotes) evidenceNotes.value = SAMPLE_EVIDENCE_NOTES;
        if (impactNotes) impactNotes.value = SAMPLE_IMPACT_NOTES;
        if (severityNotes) severityNotes.value = SAMPLE_SEVERITY_NOTES;
        if (workaroundNotes) workaroundNotes.value = SAMPLE_WORKAROUND_NOTES;
        if (ownershipNotes) ownershipNotes.value = SAMPLE_OWNERSHIP_NOTES;
        if (followupNotes) followupNotes.value = SAMPLE_FOLLOWUP_NOTES;
        if (bugSurfaceType) bugSurfaceType.value = "Checkout or billing flow";
        if (error) error.textContent = "";
        track("sample_bug_report_notes_loaded");
      });
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        track("core_action_started", { workflow: "bug_report_reproduction" });
        if (error) error.textContent = "";
        const input = {
          symptomNotes: symptomNotes ? symptomNotes.value.trim() : "",
          reproNotes: reproNotes ? reproNotes.value.trim() : "",
          expectedActualNotes: expectedActualNotes ? expectedActualNotes.value.trim() : "",
          environmentNotes: environmentNotes ? environmentNotes.value.trim() : "",
          evidenceNotes: evidenceNotes ? evidenceNotes.value.trim() : "",
          impactNotes: impactNotes ? impactNotes.value.trim() : "",
          severityNotes: severityNotes ? severityNotes.value.trim() : "",
          workaroundNotes: workaroundNotes ? workaroundNotes.value.trim() : "",
          ownershipNotes: ownershipNotes ? ownershipNotes.value.trim() : "",
          followupNotes: followupNotes ? followupNotes.value.trim() : "",
          bugSurfaceType: bugSurfaceType ? bugSurfaceType.value.trim() : ""
        };
        if (!input.symptomNotes && !input.reproNotes && !input.expectedActualNotes && !input.environmentNotes && !input.impactNotes) {
          if (error) error.textContent = "Paste bug report notes, reproduction notes, or environment details before generating a brief.";
          track("core_action_failed", { reason: "empty_input" });
          return;
        }
        const brief = analyze(input);
        renderBrief(brief);
        track("core_action_completed", { status: brief.status, issueCount: brief.issueCount });
      });
    }

    if (copyBrief) {
      copyBrief.addEventListener("click", async () => {
        await copyText(window.__latestBriefText || "");
        setText("#copy-status", "Copied brief");
        track("brief_copied");
      });
    }

    qsa(".price-card").forEach((card) => {
      if (!("IntersectionObserver" in window)) return;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            track("pricing_viewed", { plan: card.querySelector("h3")?.textContent || "" });
            observer.disconnect();
          }
        });
      }, { threshold: 0.35 });
      observer.observe(card);
    });

    qsa(".plan-button").forEach((button) => {
      button.addEventListener("click", () => {
        const plan = button.getAttribute("data-plan") || "";
        const planSelect = qs("#plan");
        if (planSelect) planSelect.value = plan;
        track("checkout_started", { plan });
        qs("#waitlist")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    if (waitlistForm) {
      waitlistForm.addEventListener("submit", (event) => {
        event.preventDefault();
        track("signup_started", { form: "early_access" });
        const intent = {
          email: qs("#email")?.value.trim() || "",
          role: qs("#role")?.value || "",
          workflowType: qs("#workflow-type")?.value || "",
          issueTracker: qs("#issue-tracker")?.value || "",
          plan: qs("#plan")?.value || "",
          budget: qs("#budget")?.value || "",
          pain: qs("#pain")?.value.trim() || "",
          purchaseIntent: Boolean(qs("#purchase-intent")?.checked),
          timestamp: nowIso()
        };
        const intents = JSON.parse(localStorage.getItem(INTENT_KEY) || "[]");
        intents.push(intent);
        localStorage.setItem(INTENT_KEY, JSON.stringify(intents.slice(-20)));
        setText("#waitlist-status", "You are on the early access list. A public-safe GitHub demo request is ready.");
        if (remoteLink) remoteLink.href = issueUrl(intent);
        if (handoffPanel) handoffPanel.hidden = false;
        window.__latestRequestDetails = requestDetails(intent);
        track("waitlist_submitted", { role: intent.role, plan: intent.plan, purchaseIntent: intent.purchaseIntent });
        track("feedback_submitted", { field: "bug_intake_pain" });
        track("remote_intent_ready", { repo: "bug-report-reproduction-briefs" });
        if (intent.purchaseIntent) track("checkout_intent", { plan: intent.plan, budget: intent.budget });
      });
    }

    if (copyRequest) {
      copyRequest.addEventListener("click", async () => {
        await copyText(window.__latestRequestDetails || "");
        setText("#handoff-status", "Copied request details");
        track("remote_intent_copied");
      });
    }

    const revealItems = qsa(".reveal");
    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      }, { threshold: 0.12 });
      revealItems.forEach((item) => revealObserver.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
