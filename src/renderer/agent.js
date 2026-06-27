async function callClaude(apiKey, system, user) {
  // In Electron, route through IPC; in browser, call API directly
  if (window.electronAPI) {
    return window.electronAPI.callClaude({ apiKey, system, user });
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || '').join('');
}

// Phase 1 — Generate test cases from requirements
async function generateTestCases(apiKey, reqDoc, baseUrl) {
  return callClaude(apiKey,
    `You are a senior QA engineer. Generate structured, comprehensive test cases from
     a requirements document. Format:
     TC-N: [UI/API] Test Case Title
     Preconditions: ...
     Steps: 1. ... 2. ...
     Expected Result: ...
     Priority: High/Medium/Low`,
    `Requirements:\n${reqDoc}\n\nBase URL: ${baseUrl}\n\n
     Generate test cases for all user flows, edge cases, error scenarios,
     and API endpoints you can infer. Include both positive and negative tests.`
  );
}

// Phase 2 — Create Cypress framework scaffold
async function createCypressFramework(apiKey, baseUrl, testCases) {
  return callClaude(apiKey,
    `You are a test automation architect. Output a complete Cypress 13 project
     as annotated file contents. Include every file needed to run tests immediately.`,
    `Base URL: ${baseUrl}
     Test Cases Summary: ${testCases.substring(0, 800)}

     Generate:
     1. cypress.config.js — with baseUrl, retries, video, env vars
     2. package.json — all needed deps (cypress, @faker-js/faker, cypress-axe)
     3. cypress/support/commands.js — custom commands: cy.login(), cy.apiRequest(),
        cy.healLocator() for self-healing selector strategy
     4. cypress/support/e2e.js — global hooks, axe setup
     5. cypress/fixtures/users.json — test data
     6. cypress/pages/BasePage.js — page object base class with self-heal
     7. cypress/pages/LoginPage.js — example page object
     8. cypress/utils/selfHeal.js — selector healing utility that tries
        data-cy → aria-label → text → fallback chain
     9. .env.example
    10. README.md with setup and run instructions`
  );
}

// Phase 3 — Convert test cases to Cypress spec files
async function generateTestScripts(apiKey, testCases, framework, baseUrl) {
  return callClaude(apiKey,
    `You are a Cypress automation engineer. Convert test cases into complete,
     runnable Cypress spec files using the provided framework structure.
     Use page objects. Mock APIs with cy.intercept(). Add proper assertions.
     Include accessibility checks with cy.checkA11y() on key pages.`,
    `Test Cases:\n${testCases}

     Framework already created includes:
     - Custom commands: cy.login(), cy.apiRequest(), cy.healLocator()
     - Page objects in cypress/pages/
     - Self-heal utility in cypress/utils/selfHeal.js
     - Base URL: ${baseUrl}

     Generate spec files:
     - cypress/e2e/auth.cy.js
     - cypress/e2e/api.cy.js
     - cypress/e2e/ui-flows.cy.js
     Each file should have describe/it blocks matching the test cases.`
  );
}

// Phase 4 — Self-heal locators
async function selfHealLocators(apiKey, scripts) {
  return callClaude(apiKey,
    `You are a test resilience engineer. Analyze Cypress specs and produce
     a self-healing report. For each fragile locator found, output:
     STALE: <original selector>
     REASON: why it's fragile
     ✓ HEALED: <better selector>
     STRATEGY: data-cy | aria | text | composite
     Then output an updated selfHeal.js with a healSelector(page, key, fallbacks[])
     function that tries each strategy in order and logs which one worked.`,
    `Cypress specs to analyze:\n${scripts}

     Flag: CSS class selectors, nth-child, deeply nested selectors,
     brittle IDs, and any selector without a data-cy attribute.
     For each, propose a healing chain from most to least stable.`
  );
}

// Main orchestrator
async function runAgent({ apiKey, baseUrl, reqDoc, onProgress }) {
  onProgress(0, 'running');
  const testCases = await generateTestCases(apiKey, reqDoc, baseUrl);
  onProgress(0, 'done');

  onProgress(1, 'running');
  const framework = await createCypressFramework(apiKey, baseUrl, testCases);
  onProgress(1, 'done');

  onProgress(2, 'running');
  const scripts = await generateTestScripts(apiKey, testCases, framework, baseUrl);
  onProgress(2, 'done');

  onProgress(3, 'running');
  const healReport = await selfHealLocators(apiKey, scripts);
  onProgress(3, 'done');

  return { testCases, framework, scripts, healReport };
}