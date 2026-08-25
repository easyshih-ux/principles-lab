import { getShapeDimensions } from './geometry/bounds.js';
import { getDisplayColor } from './geometry/palette.js';
import { discoverQuestions } from './discover-questions.js';
import { advanceDiscoverCourse, applyDiscoverResult, currentDiscoverQuestion, setDiscoverSelection, startDiscoverCourse } from './discover-course-state.js';
import { validateDiscoverQuestion } from './discover-validators.js';
import { syncCourseCompletion } from './state.js';

export function discoverCompletionMarkup() {
  return `<section class="recognize-complete page-shell"><div><p class="section-label">分析完成</p><h1>第二關完成</h1><p class="recognize-complete-lead">你不只看得出來，也開始知道「為什麼」。</p><p>同一項形式原理，換了造形、位置、色彩或排列方式，你仍然能找到判斷的線索。</p><button class="primary-button" id="discover-experiment">前往第三關</button><button class="back-link recognize-wall-return" id="discover-wall">返回實驗室</button></div><div class="discover-complete-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div></section>`;
}

function shapeMarkup(item, selectable = false, selected = false) {
  const dimensions = getShapeDimensions(item);
  const height = item.displaySize ?? dimensions.height;
  const width = item.displaySize == null
    ? dimensions.width
    : item.displaySize * (item.shape === 'rectangle' ? 1.5 : 1);
  const tag = selectable ? 'button' : 'i';
  return `<${tag} ${selectable ? `type="button" data-selection-id="${item.id}"` : ''} class="discover-element composition-element shape-${item.shape} ${selected ? 'selected' : ''}" style="--x:${item.x/10}%;--y:${item.y/6}%;--w:${width/10}%;--h:${height/6}%;--rotation:${item.rotation}deg;--geometry-color:${item.displayColor ?? getDisplayColor(item.hue,item.lightness)};--layer:${item.layer}" ${selectable ? `aria-pressed="${selected}" aria-label="選擇幾何元素"` : 'aria-hidden="true"'}><span class="geometry-shape"></span></${tag}>`;
}

function board(question, elements, selection, selectable = false, gaps = []) {
  return `<div class="discover-composition">${(question.guides??[]).map((g)=>`<i class="composition-guide ${g.type}" style="--guide-x:${g.x/10}%"></i>`).join('')}${elements.map((item)=>shapeMarkup(item,selectable,selection===item.id)).join('')}${gaps.map((gap)=>{
    const left=elements.find((item)=>item.id===gap.left); const right=elements.find((item)=>item.id===gap.right);
    const x=(left.x+right.x)/2; const width=Math.max(60,right.x-left.x-36);
    return `<button type="button" class="discover-gap ${selection===gap.id?'selected':''}" data-selection-id="${gap.id}" aria-pressed="${selection===gap.id}" style="--x:${x/10}%;--gap-width:${width/10}%"><span>↔</span></button>`;
  }).join('')}</div>`;
}

function panelMarkup(question,panel,selection,multi=false){const selected=multi?selection?.includes(panel.id):selection===panel.id;return `<button type="button" class="discover-panel ${selected?'selected':''}" data-selection-id="${panel.id}" aria-pressed="${selected}"><strong>${panel.label}</strong>${board(question,panel.elements,null,false)}</button>`;}

function questionCanvas(question, selection) {
  if (question.interactionType==='element-select') return board(question,question.elements,selection,true);
  if (question.interactionType==='gap-select') return board(question,question.elements,selection,false,question.gaps);
  if (question.interactionType==='pairing') return `<div class="discover-panels pairing-panels">${question.comparisonPanels.map((panel)=>`<section><strong>${panel.label}</strong>${board(question,panel.elements,null,false)}<div class="pair-buttons">${question.pairingTargets.map((target)=>`<button type="button" data-pair-panel="${panel.id}" data-pair-value="${target}" class="${selection?.[panel.id]===target?'selected':''}">${target==='harmony'?'調和':'統一'}</button>`).join('')}</div></section>`).join('')}</div>`;
  const before=question.beforeState?`<div class="discover-before"><strong>Before</strong>${board(question,question.beforeState,null,false)}</div>`:'';
  return `${before}<div class="discover-panels">${question.comparisonPanels.map((panel)=>panelMarkup(question,panel,selection,question.interactionType==='multi-select-composition')).join('')}</div>`;
}

export function createDiscoverCourseRenderers({app,state,navigate}) {
  const course=state.discoverCourse;
  function start(){app.innerHTML=`<section class="recognize-intro page-shell"><div><p class="section-label">分析・判斷</p><h1><span>第二關｜</span><span>哪裡不對勁？</span></h1><p class="recognize-intro-lead">換一張圖、換一個條件，你還判斷得出來嗎？</p><button class="primary-button" id="begin-discover">開始判斷</button></div><div class="discover-intro-art" aria-hidden="true"><i></i><i></i><i></i><i></i></div></section>`;document.querySelector('#begin-discover').addEventListener('click',()=>{startDiscoverCourse(course,discoverQuestions);navigate('#level/discover/question');});}
  function question(){if(!course.started){navigate('#level/discover/start');return;}const q=currentDiscoverQuestion(course,discoverQuestions);if(!q){navigate('#level/discover/complete');return;}const qs=course.questions[q.id];app.innerHTML=`<section class="recognize-question-page discover-question-page page-shell"><header class="recognize-question-header"><button class="back-link" id="discover-exit">← 返回實驗室</button><h1>第二關｜哪裡不對勁？</h1><strong>${String(course.currentIndex+1).padStart(2,'0')} / 16</strong></header><div class="discover-artboard">${questionCanvas(q,qs.selection)}</div><div class="recognize-question-copy"><h2>${q.prompt}</h2></div><footer class="recognize-feedback-row"><div class="recognize-feedback ${qs.completed?'success':''}" role="status" aria-live="polite">${qs.feedback?`<strong>${qs.completed?'✓ 找到線索了！':'再觀察一下'}</strong><span>${qs.feedback}${qs.completed&&q.successNote?` <em>${q.successNote}</em>`:''}</span>`:'<span>觀察構圖後完成選擇。</span>'}</div><div class="recognize-actions">${qs.completed?`<button class="primary-button compact" id="discover-next">${course.currentIndex===15?'完成第二關':'下一題'}</button>`:'<button class="secondary-button compact" id="discover-hint">提示</button><button class="primary-button compact" id="discover-check">確認答案</button>'}</div></footer></section>`;
    document.querySelector('#discover-exit').addEventListener('click',()=>navigate('#principles'));
    document.querySelectorAll('[data-selection-id]').forEach((node)=>node.addEventListener('click',()=>{const id=node.dataset.selectionId;let next=id;if(q.interactionType==='multi-select-composition'){const current=qs.selection??[];next=current.includes(id)?current.filter((value)=>value!==id):[...current,id];}setDiscoverSelection(course,q.id,next);question();}));
    document.querySelectorAll('[data-pair-panel]').forEach((node)=>node.addEventListener('click',()=>{setDiscoverSelection(course,q.id,{...(qs.selection??{}),[node.dataset.pairPanel]:node.dataset.pairValue});question();}));
    document.querySelector('#discover-hint')?.addEventListener('click',()=>{qs.feedback=q.hints[Math.min(qs.attempts,q.hints.length-1)];question();});
    document.querySelector('#discover-check')?.addEventListener('click',()=>{applyDiscoverResult(course,q,validateDiscoverQuestion(q,qs.selection));question();});
    document.querySelector('#discover-next')?.addEventListener('click',()=>{advanceDiscoverCourse(course,discoverQuestions);navigate(course.completed?'#level/discover/complete':'#level/discover/question');});
  }
  function complete(){
    if(!course.completed){
      navigate(course.started?'#level/discover/question':'#level/discover/start');
      return;
    }
    syncCourseCompletion(state);
    app.innerHTML=discoverCompletionMarkup();
    document.querySelector('#discover-experiment').addEventListener('click',()=>navigate('#level/experiment/start'));
    document.querySelector('#discover-wall').addEventListener('click',()=>navigate('#principles'));
  }
  function dev(){app.innerHTML=`<section class="validator-lab page-shell"><header class="validator-lab-header"><div><p class="section-label">Phase 5 開發驗收</p><h1>16題快速檢查</h1></div><button class="back-link" id="dev-back">← 返回實驗室</button></header><div class="phase5-dev-list">${discoverQuestions.map((q,i)=>`<button data-dev-index="${i}">${String(i+1).padStart(2,'0')}｜${q.principleId}<small>${q.interactionType}・${q.overlapPolicy}</small></button>`).join('')}</div><div id="phase5-dev-preview"></div></section>`;document.querySelector('#dev-back').addEventListener('click',()=>navigate('#principles'));document.querySelectorAll('[data-dev-index]').forEach((node)=>node.addEventListener('click',()=>{const q=discoverQuestions[Number(node.dataset.devIndex)];document.querySelector('#phase5-dev-preview').innerHTML=`<h2>${q.prompt}</h2>${questionCanvas(q,null)}<p><strong>${q.interactionType}</strong>・overlap ${q.overlapPolicy}</p><p>提示1：${q.hints[0]}</p><p>提示2：${q.hints[1]}</p><p>成功：${q.successFeedback}</p>`;}));document.querySelector('[data-dev-index="0"]')?.click();}
  return {start,question,complete,dev};
}
