import { validateExperiment } from './experiment-validators.js';
import { validatorLabFixtures } from './validator-fixtures.js';

function list(items, emptyText) {
  return items.length
    ? `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : `<p>${emptyText}</p>`;
}

export function renderValidatorLab({ app, navigate }) {
  const principleIds = Object.keys(validatorLabFixtures);
  app.innerHTML = `
    <section class="validator-lab page-shell">
      <header class="validator-lab-header">
        <button class="back-link" id="validator-lab-back">← 回到入口</button>
        <div>
          <p class="section-label">開發驗收工具・非學生關卡</p>
          <h1>Validator Lab</h1>
        </div>
      </header>
      <div class="validator-lab-controls">
        <label>形式原理
          <select id="validator-principle">
            ${principleIds.map((id) => `<option value="${id}">${validatorLabFixtures[id].label}</option>`).join('')}
          </select>
        </label>
        <fieldset>
          <legend>案例</legend>
          <label><input type="radio" name="validator-case" value="pass" checked> 明確通過案例</label>
          <label><input type="radio" name="validator-case" value="fail"> 明確失敗案例</label>
        </fieldset>
        <button type="button" class="primary-button compact" id="run-validator">執行 Validator</button>
      </div>
      <div class="validator-lab-output" id="validator-output" aria-live="polite"></div>
    </section>`;

  const renderResult = () => {
    const principleId = document.querySelector('#validator-principle').value;
    const caseName = document.querySelector('[name="validator-case"]:checked').value;
    const fixture = validatorLabFixtures[principleId];
    const validation = validateExperiment(fixture.validatorId, fixture[caseName]);
    document.querySelector('#validator-output').innerHTML = `
      <section class="validator-status ${validation.passed ? 'passed' : 'failed'}">
        <p>passed</p><strong>${validation.passed}</strong>
      </section>
      <section>
        <h2>fulfilledConditions</h2>
        ${list(validation.fulfilledConditions, '目前沒有已完成條件')}
      </section>
      <section>
        <h2>missingConditions</h2>
        ${list(validation.missingConditions, '沒有缺少條件')}
      </section>
      <section class="validator-metrics">
        <h2>metrics</h2>
        <pre>${JSON.stringify(validation.metrics, null, 2)}</pre>
      </section>`;
  };

  document.querySelector('#validator-lab-back').addEventListener('click', () => navigate('#home'));
  document.querySelector('#run-validator').addEventListener('click', renderResult);
  document.querySelector('#validator-principle').addEventListener('change', renderResult);
  document.querySelectorAll('[name="validator-case"]').forEach((radio) => {
    radio.addEventListener('change', renderResult);
  });
  renderResult();
}
