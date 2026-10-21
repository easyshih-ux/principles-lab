import { createSimplicityInitialArtwork, SIMPLICITY_CORE_ELEMENT_IDS } from './simplicity-initial-state.js';

const element = (id, values = {}) => ({
  id, shape: 'circle', x: 100, y: 300, size: 3, hue: 'blue',
  lightness: 3, rotation: 0, proportion: 1, ...values
});

const row = (prefix, values, field, positions = null) => values.map((value, index) => element(`${prefix}-${index}`, {
  x: positions?.[index] ?? 150 + index * 170,
  [field]: value
}));


const SYMMETRY_HUES = Object.freeze(['red', 'blue', 'yellow', 'green']);
const STEP_LOGICAL = Object.freeze({ 1: 36, 2: 45, 3: 57, 4: 71, 5: 89, 6: 111, 7: 140 });
const GRADATION_HUES = Object.freeze(['red', 'red-orange', 'orange', 'yellow-orange', 'yellow', 'yellow-green', 'green']);
const stepElement = (id, values = {}) => {
  const item = element(id, { stepSize: 4, stepLightness: 4, ...values });
  return { ...item, logicalSize: STEP_LOGICAL[item.stepSize] };
};
const stepLine = (prefix, values, fields, { dx = 135, dy = 0, x0 = 80, y0 = 300 } = {}) => values.map((value, index) => stepElement(`${prefix}-${index}`, {
  x: x0 + index * dx, y: y0 + index * dy, ...Object.fromEntries(fields.map((field) => [field, value]))
}));

const simplicityInitial = createSimplicityInitialArtwork();
const simplicityCore = () => createSimplicityInitialArtwork().filter((item) => SIMPLICITY_CORE_ELEMENT_IDS.includes(item.id));
const withoutSimplicity = (...ids) => createSimplicityInitialArtwork().filter((item) => !ids.includes(item.id));
const organized = (items) => items.map((item, index) => ({ ...item, x: 280 + (index % 4) * 150, y: 210 + Math.floor(index / 4) * 150 }));

export const phase6cFixtures = Object.freeze({
  repetition: {
    pass: {
      // Teacher sample: teal triangle + red circle + orange square, overlapping, repeated five times.
      group: [[240,300],[440,300],[640,160],[600,480],[820,400]].flatMap(([x,y],index)=>[
        element(`ru-t-${index}`, { shape: 'triangle', x, y, hue: 'blue-green', size: 5 }),
        element(`ru-c-${index}`, { x: x - 40, y: y - 20, hue: 'red', size: 3 }),
        element(`ru-s-${index}`, { shape: 'square', x: x + 20, y: y + 80, hue: 'yellow-orange', size: 1 })
      ]),
      turnedUnits: [[240,300,0,false],[460,300,90,false],[680,160,0,true],[620,470,180,false],[840,420,270,true]].flatMap(([x,y,angle,flip],index)=>{
        const place = (dx, dy) => { const fx = flip ? -dx : dx; const r = angle * Math.PI / 180; return { x: Math.round(x + fx * Math.cos(r) - dy * Math.sin(r)), y: Math.round(y + fx * Math.sin(r) + dy * Math.cos(r)) }; };
        return [
          element(`rt-t-${index}`, { shape: 'triangle', ...place(0, 0), hue: 'blue-green', size: 5, rotation: angle }),
          element(`rt-c-${index}`, { ...place(-40, -20), hue: 'red', size: 3 }),
          element(`rt-s-${index}`, { shape: 'square', ...place(20, 80), hue: 'yellow-orange', size: 1 })
        ];
      }),
      concentric: [[140,150],[480,140],[840,160],[300,440],[700,450]].flatMap(([x,y],index)=>[
        element(`rk-s-${index}`, { shape: 'square', x, y, hue: 'blue', size: 4 }),
        element(`rk-c-${index}`, { x, y, hue: 'yellow', size: 2 })
      ]),
      directionUnit: [[140,150,0],[480,140,0],[840,160,90],[300,440,0],[700,450,90]].flatMap(([x,y,rotation],index)=>[
        element(`rd-a-${index}`, { shape: 'triangle', x, y, hue: 'red', size: 2, rotation }),
        element(`rd-b-${index}`, { shape: 'triangle', x: x + (rotation ? 0 : 50), y: y + (rotation ? 50 : 0), hue: 'red', size: 2, rotation: rotation + 180 })
      ])
    },
    fail: {
      // The same fifteen shapes scattered, each on its own: repeated, but not grouped into units.
      scattered: [
        ['triangle',100,110,'blue-green',5],['circle',330,90,'red',3],['square',520,120,'yellow-orange',1],['triangle',730,110,'blue-green',5],['circle',920,80,'red',3],
        ['square',90,300,'yellow-orange',1],['triangle',300,300,'blue-green',5],['circle',520,310,'red',3],['square',700,290,'yellow-orange',1],['triangle',900,320,'blue-green',5],
        ['circle',110,510,'red',3],['square',290,520,'yellow-orange',1],['triangle',500,500,'blue-green',5],['circle',700,520,'red',3],['square',900,530,'yellow-orange',1]
      ].map(([shape,x,y,hue,size],index)=>element(`rx-${index}`, { shape, x, y, hue, size })),
      singleKind: [[120,180],[250,390],[390,150],[520,430],[650,210],[790,370],[900,120]].map(([x,y],index)=>element(`rs-${index}`, { x, y })),
      two: [element('r2-1', { x: 240 }), element('r2-2', { x: 650 })],
      inconsistent: ['circle', 'square', 'triangle', 'rectangle', 'semicircle'].map((shape, index) => element(`ri-${index}`, { shape, x: 130 + index * 180, hue: index % 2 ? 'red' : 'blue', size: (index % 5) + 1 }))
    }
  },
  gradation: {
    // Gate 4: seven or more stages, two changes together, any path. Uses the gradation-only seven-step scale.
    pass: {
      sizeLightness: stepLine('gsl', [1, 2, 3, 4, 5, 6, 7], ['stepSize', 'stepLightness']),
      descending: stepLine('gde', [7, 6, 5, 4, 3, 2, 1], ['stepSize', 'stepLightness']),
      singlePeak: stepLine('gpk', [1, 2, 3, 4, 3, 2, 1], ['stepSize', 'stepLightness']),
      longPeak: stepLine('glp', [1, 2, 3, 4, 5, 4, 3, 2, 1], ['stepSize', 'stepLightness'], { dx: 105, x0: 70 }),
      singleValley: stepLine('gvl', [4, 3, 2, 1, 2, 3, 4], ['stepSize', 'stepLightness']),
      sizeHue: stepLine('gsh', [1, 2, 3, 4, 5, 6, 7], ['stepSize']).map((item, index) => ({ ...item, hue: GRADATION_HUES[index] })),
      hueSpacing: [0, 40, 100, 180, 280, 400, 540].map((x, index) => stepElement(`ghs-${index}`, { x: 60 + x, stepSize: 1, hue: GRADATION_HUES[index] })),
      threeChanges: stepLine('g3c', [1, 2, 3, 4, 5, 6, 7], ['stepSize', 'stepLightness']).map((item, index) => ({ ...item, hue: GRADATION_HUES[index] })),
      vertical: stepLine('gvt', [1, 2, 3, 4, 5, 6, 7], ['stepSize', 'stepLightness'], { dx: 0, dy: 85, x0: 500, y0: 40 }),
      diagonal: stepLine('gdg', [1, 2, 3, 4, 5, 6, 7], ['stepSize', 'stepLightness'], { dx: 120, dy: 75, x0: 100, y0: 60 }),
      arc: [0, 1, 2, 3, 4, 5, 6].map((index) => { const angle = Math.PI * (0.1 + (0.8 * index) / 6); return stepElement(`gar-${index}`, { x: Math.round(500 - 420 * Math.cos(angle)), y: Math.round(560 - 420 * Math.sin(angle)), stepSize: index + 1, stepLightness: index + 1 }); }),
      sCurve: [[80, 120], [220, 90], [360, 140], [480, 280], [600, 430], [740, 480], [880, 450]].map(([x, y], index) => stepElement(`gsc-${index}`, { x, y, stepSize: index + 1, stepLightness: index + 1 })),
      ring: [2, 3, 4, 5, 6, 7, 5, 3].map((value, index) => { const angle = (2 * Math.PI * index) / 8; return stepElement(`grg-${index}`, { x: Math.round(500 + 230 * Math.cos(angle)), y: Math.round(300 + 230 * Math.sin(angle)), stepSize: value, stepLightness: value }); })
    },
    fail: {
      onlySize: stepLine('gos', [1, 2, 3, 4, 5, 6, 7], ['stepSize']),
      stopsAtFourth: stepLine('gst', [1, 2, 3, 3, 5, 6, 7], ['stepSize', 'stepLightness']),
      manyPeaks: stepLine('gmp', [1, 2, 1, 2, 1, 2, 1], ['stepSize', 'stepLightness']),
      sixStages: stepLine('g6s', [1, 2, 3, 4, 5, 6], ['stepSize', 'stepLightness']),
      decoration: [...stepLine('gdc', [1, 2, 3, 4, 5, 6, 7], ['stepSize', 'stepLightness']), stepElement('gdc-extra', { x: 500, y: 560, stepSize: 1 })],
      scattered: [[100, 100], [800, 500], [300, 450], [600, 80], [900, 150], [150, 520], [500, 300]].map(([x, y], index) => stepElement(`gsx-${index}`, { x, y, stepSize: index + 1, stepLightness: index + 1 })),
      hueJump: stepLine('ghj', [1, 2, 3, 4, 5, 6, 7], ['stepSize']).map((item, index) => ({ ...item, hue: ['red', 'red-orange', 'orange', 'green', 'blue-green', 'blue', 'blue-violet'][index] })),
      ringBreak: [2, 3, 4, 4, 6, 7, 5, 3].map((value, index) => { const angle = (2 * Math.PI * index) / 8; return stepElement(`grb-${index}`, { x: Math.round(500 + 230 * Math.cos(angle)), y: Math.round(300 + 230 * Math.sin(angle)), stepSize: value, stepLightness: value }); })
    }
  },
  balance: {
    pass: {
      asymmetrical: [
        element('ba-l', { x: 300, size: 4, hue: 'red' }),
        element('ba-r1', { shape: 'square', x: 620, y: 180, size: 2 }),
        element('ba-r2', { shape: 'square', x: 700, y: 300, size: 2 }),
        element('ba-r3', { shape: 'square', x: 780, y: 420, size: 2 })
      ],
      borderlineLargeAgainstTwoSmall: [
        element('bb-a-left', { x: 250, y: 300, size: 4, hue: 'red' }),
        element('bb-a-right-1', { shape: 'square', x: 600, y: 220, size: 2 }),
        element('bb-a-right-2', { shape: 'square', x: 680, y: 390, size: 2 })
      ],
      borderlineUnevenPositions: [
        element('bb-b-left-1', { x: 260, y: 220, size: 3 }),
        element('bb-b-left-2', { x: 380, y: 410, size: 3 }),
        element('bb-b-right-1', { shape: 'triangle', x: 600, y: 180, size: 2 }),
        element('bb-b-right-2', { shape: 'triangle', x: 680, y: 310, size: 2 }),
        element('bb-b-right-3', { shape: 'triangle', x: 800, y: 430, size: 2 })
      ],
      largeAgainstMediumAndThreeSmall: [
        element('bb-c-left', { x: 260, y: 300, size: 5, hue: 'red' }),
        element('bb-c-right-medium', { shape: 'square', x: 610, y: 250, size: 3 }),
        element('bb-c-right-small-1', { shape: 'circle', x: 650, y: 150, size: 1 }),
        element('bb-c-right-small-2', { shape: 'triangle', x: 710, y: 330, size: 1 }),
        element('bb-c-right-small-3', { shape: 'square', x: 770, y: 440, size: 1 })
      ],
      reportedLargeAgainstGroup: [
        element('bb-d-left', { shape: 'square', x: 280, y: 300, size: 5 }),
        element('bb-d-right-medium', { shape: 'triangle', x: 640, y: 360, size: 3 }),
        element('bb-d-right-small-1', { shape: 'triangle', x: 580, y: 270, size: 1 }),
        element('bb-d-right-small-2', { shape: 'triangle', x: 700, y: 220, size: 1 })
      ],
      reportedLargeAgainstGroupShifted: [
        element('bb-e-left', { shape: 'square', x: 260, y: 300, size: 5 }),
        element('bb-e-right-medium', { shape: 'triangle', x: 660, y: 360, size: 3 }),
        element('bb-e-right-small-1', { shape: 'triangle', x: 600, y: 270, size: 1 }),
        element('bb-e-right-small-2', { shape: 'triangle', x: 720, y: 220, size: 1 })
      ],
      equalCountDifferentSize: [
        element('bd-s-left', { x: 350, y: 300, size: 4 }),
        element('bd-s-right', { x: 770, y: 300, size: 3 })
      ],
      equalCountDifferentPositions: [
        element('bd-p-left-1', { x: 300, y: 180, size: 3 }),
        element('bd-p-left-2', { x: 380, y: 420, size: 3 }),
        element('bd-p-right-1', { x: 620, y: 180, size: 3 }),
        element('bd-p-right-2', { x: 700, y: 320, size: 3 })
      ]
    },
    fail: {
      symmetrical: [element('bs-l', { shape: 'square', x: 300, y: 300 }), element('bs-r', { shape: 'square', x: 708, y: 312 })],
      symmetricalPairs: [
        element('bs2-l1', { shape: 'square', x: 300, y: 200, size: 3 }),
        element('bs2-l2', { shape: 'circle', x: 380, y: 400, size: 2 }),
        element('bs2-r1', { shape: 'square', x: 704, y: 212, size: 3 }),
        element('bs2-r2', { shape: 'circle', x: 624, y: 388, size: 2 })
      ],
      oneSide: [element('bo-1', { x: 200 }), element('bo-2', { x: 320 })],
      oneSideRight: [element('bo-r1', { x: 680 }), element('bo-r2', { x: 800 })],
      leftHeavy: [element('bl-l', { x: 180, size: 5 }), element('bl-r', { x: 650, size: 1 })],
      rightHeavy: [element('br-l', { x: 350, size: 1 }), element('br-r', { x: 820, size: 5 })],
      extremeLeftHeavy: [element('be-l-large', { x: 140, size: 5 }), element('be-l-small', { x: 590, size: 1 })],
      extremeRightHeavy: [element('be-r-small', { x: 410, size: 1 }), element('be-r-large', { x: 860, size: 5 })],
      severalLargeAgainstTiny: [
        element('bx-l-1', { x: 160, y: 160, size: 5 }),
        element('bx-l-2', { shape: 'square', x: 260, y: 320, size: 5 }),
        element('bx-l-3', { shape: 'triangle', x: 360, y: 440, size: 5 }),
        element('bx-r-tiny', { x: 760, y: 300, size: 1 })
      ],
      centered: [element('bc-1', { x: 485 }), element('bc-2', { x: 515 })]
    }
  },
  rhythm: {
    pass: {
      regular: row('yr', [300, 200, 140, 200, 300], 'y'),
      irregular: row('yi', [430, 370, 295, 205, 110], 'y'),
      rotation: row('yt', [0, 45, 90, 135, 90], 'rotation'),
      size: row('yz', [1, 2, 3, 4, 5], 'size'),
      spacing: row('yp', [3, 3, 3, 3, 3], 'size', [100, 210, 350, 520, 720]),
      mixed: [0, 1, 2, 3, 4].map((index) => element(`ym-${index}`, { x: 120 + index * 175, y: 420 - index * 70, size: index + 1 })),
      noRepetition: ['circle', 'square', 'triangle', 'rectangle', 'semicircle'].map((shape, index) => element(`yn-${index}`, { shape, x: 120 + index * 180, y: 430 - index * 75, hue: index % 2 ? 'red' : 'blue' })),
      'rhythm-irregular-wave-size-flow': [
        [90, 350, 1], [170, 310, 2], [255, 200, 4], [345, 340, 2], [440, 430, 1], [530, 410, 2],
        [625, 300, 4], [715, 270, 2], [810, 170, 3], [900, 350, 2], [970, 390, 1]
      ].map(([x, y, size], index) => element(`rhythm-irregular-wave-size-flow-${index}`, { x, y, size }))
    },
    fail: {
      static: row('ys', [300, 300, 300, 300, 300], 'y'),
      random: [
        element('yx-1', { x: 100, y: 100, size: 5, rotation: 0 }),
        element('yx-2', { x: 260, y: 500, size: 1, rotation: 135 }),
        element('yx-3', { x: 390, y: 220, size: 4, rotation: 45 }),
        element('yx-4', { x: 650, y: 470, size: 2, rotation: 90 }),
        element('yx-5', { x: 900, y: 130, size: 3, rotation: 0 })
      ],
      weak: row('yw', [300, 295, 305, 298, 302], 'y'),
      unclear: [
        [100, 300, 2, 0], [260, 300, 3, 45], [430, 300, 2, 0], [580, 300, 3, 45], [750, 300, 2, 0]
      ].map(([x, y, size, rotation], index) => element(`yu-${index}`, { x, y, size, rotation }))
    }
  },
  symmetry: {
    // Gate 4: colour is free; at least four shape + colour combinations among mirrored shapes.
    pass: {
      vertical: [[260,120],[360,220],[300,360],[400,480]].flatMap(([x,y],i)=>[
        element(`sv-l${i}`,{shape:'triangle',x,y,rotation:45,hue:SYMMETRY_HUES[i]}), element(`sv-r${i}`,{shape:'triangle',x:1000-x,y,rotation:315,hue:SYMMETRY_HUES[i]})
      ]),
      horizontal: [[180,140],[380,180],[620,120],[820,220]].flatMap(([x,y],i)=>[
        element(`sh-t${i}`,{shape:'semicircle',x,y,rotation:0,hue:SYMMETRY_HUES[i]}), element(`sh-b${i}`,{shape:'semicircle',x,y:600-y,rotation:180,hue:SYMMETRY_HUES[i]})
      ]),
      // Teacher example: two four-way groups, each using two colours, already make four combinations.
      cross: [[300,170],[390,240]].flatMap(([x,y],i)=>[[x,y],[1000-x,y],[x,600-y],[1000-x,600-y]].map(([px,py],j)=>element(`sc${i}-${j}`,{x:px,y:py,shape:i?'square':'circle',hue:SYMMETRY_HUES[i*2+(j===0||j===3?0:1)]}))),
      directional: [[260,120],[360,220],[300,360],[400,480]].flatMap(([x,y],i)=>[
        element(`sd-l${i}`,{shape:['triangle','rectangle','square','circle'][i],x,y,rotation:45}), element(`sd-r${i}`,{shape:['triangle','rectangle','square','circle'][i],x:1000-x,y,rotation:[315,135,45,45][i]})
      ]),
      colourFree: [[260,120],[360,220],[300,360],[400,480]].flatMap(([x,y],i)=>[
        element(`sf-l${i}`,{shape:'circle',x,y,hue:'red'}), element(`sf-r${i}`,{shape:'circle',x:1000-x,y,hue:SYMMETRY_HUES[i]})
      ]),
      axisShapes: [...[[260,120],[360,220],[300,360],[400,480]].flatMap(([x,y],i)=>[
        element(`sx-l${i}`,{shape:'circle',x,y,hue:SYMMETRY_HUES[i]}), element(`sx-r${i}`,{shape:'circle',x:1000-x,y,hue:SYMMETRY_HUES[i]})
      ]), element('sx-a1',{shape:'triangle',x:500,y:120,rotation:0}), element('sx-a2',{shape:'triangle',x:500,y:480,rotation:180}), element('sx-a3',{shape:'square',x:500,y:300,rotation:45})],
      // Teacher screenshot: left-right symmetric (5 pairs, 4 combinations) with two red rectangles on the centre line.
      teacherLeftRight: [
        element('tl-rt', { shape: 'rectangle', x: 500, y: 120, rotation: 90, hue: 'red' }), element('tl-rb', { shape: 'rectangle', x: 500, y: 460, rotation: 90, hue: 'red' }),
        element('tl-c1', { x: 240, y: 220, hue: 'blue-green' }), element('tl-c2', { x: 760, y: 220, hue: 'blue-green' }),
        element('tl-s1', { shape: 'square', x: 280, y: 260, hue: 'red' }), element('tl-s2', { shape: 'square', x: 720, y: 260, hue: 'red' }),
        element('tl-u1', { shape: 'triangle', x: 400, y: 200, hue: 'red' }), element('tl-u2', { shape: 'triangle', x: 600, y: 200, hue: 'red' }),
        element('tl-d1', { shape: 'triangle', x: 400, y: 380, rotation: 180, hue: 'red' }), element('tl-d2', { shape: 'triangle', x: 600, y: 380, rotation: 180, hue: 'red' }),
        element('tl-o1', { shape: 'rectangle', x: 260, y: 360, hue: 'yellow-orange' }), element('tl-o2', { shape: 'rectangle', x: 740, y: 360, hue: 'yellow-orange' })
      ]
    },
    fail: {
      axis: [element('sa',{shape:'circle',x:500,y:300})],
      missing: [element('sm1',{x:300,y:220})],
      position: [element('sp1',{x:300,y:220}),element('sp2',{x:720,y:220})],
      attribute: [element('st1',{x:300,y:220}),element('st2',{shape:'square',x:700,y:220})],
      crossIncomplete: [element('sx1',{x:300,y:220}),element('sx2',{x:700,y:220})],
      oneColour: [[260,120],[360,220],[300,360],[400,480]].flatMap(([x,y],i)=>[
        element(`so-l${i}`,{shape:'triangle',x,y,rotation:45}), element(`so-r${i}`,{shape:'triangle',x:1000-x,y,rotation:315})
      ]),
      diamond: [[260,120],[360,220],[300,360],[400,480]].flatMap(([x,y],i)=>[
        element(`sq-l${i}`,{shape:'square',x,y,hue:SYMMETRY_HUES[i]}), element(`sq-r${i}`,{shape:'square',x:1000-x,y,hue:SYMMETRY_HUES[i],rotation:i===3?45:0})
      ]),
      tiltedOnAxis: [...[[260,120],[360,220],[300,360],[400,480]].flatMap(([x,y],i)=>[
        element(`sb-l${i}`,{shape:'circle',x,y,hue:SYMMETRY_HUES[i]}), element(`sb-r${i}`,{shape:'circle',x:1000-x,y,hue:SYMMETRY_HUES[i]})
      ]), element('sb-axis',{shape:'triangle',x:500,y:300,rotation:90,hue:'red'})],
      crossAxisAlone: [...[[300,170],[390,240]].flatMap(([x,y],i)=>[[x,y],[1000-x,y],[x,600-y],[1000-x,600-y]].map(([px,py],j)=>element(`sk${i}-${j}`,{x:px,y:py,shape:i?'square':'circle',hue:SYMMETRY_HUES[i*2+(j===0||j===3?0:1)]}))),
        element('sk-axis',{shape:'triangle',x:500,y:80,rotation:0,hue:'yellow'})]
    }
  },
  contrast: {
    pass: {
      dual: [0,1,2,3,4,5].map((i)=>element('cd' + i,{x:130+i*150,y:i%2?390:210,size:i<3?5:1,hue:i<3?'red':'blue'})),
      multiple: [0,1,2,3,4,5].map((i)=>element('cm' + i,{x:130+i*150,y:i%2?390:210,size:i<3?5:1,hue:i<3?'red':'blue',shape:i<3?'triangle':'circle'}))
    },
    fail: {
      tooFewDual: [0,1,2,3,4].map((i)=>element('ctf' + i,{x:150+i*170,size:i<2?5:1,hue:i<2?'red':'blue'})),
      sizeOnly: [0,1,2,3,4,5].map((i)=>element('cso' + i,{x:130+i*150,size:i<3?5:1,hue:'blue'})),
      colorOnly: [0,1,2,3,4,5].map((i)=>element('cco' + i,{x:130+i*150,size:3,hue:i<3?'red':'blue'})),
      shapeOnly: [0,1,2,3,4,5].map((i)=>element('cho' + i,{x:130+i*150,shape:i<3?'triangle':'circle'})),
      extremeWithNoise: [element('cen-a',{x:100,size:5,hue:'red'}),element('cen-b',{x:260,size:1,hue:'blue'}),...['square','triangle','rectangle','semicircle'].map((shape,i)=>element('cen-'+i,{x:420+i*140,shape,size:(i%3)+2,hue:['orange','yellow','green','violet'][i]}))],
      twoWeak: [element('ct-weak-a', { x: 300, size: 3 }), element('ct-weak-b', { x: 700, size: 4 })],
      identical: [element('ct-same-a', { x: 300, size: 3 }), element('ct-same-b', { x: 700, size: 3 })],
      weak: [3,3,3,4].map((size,i)=>element('cw' + i,{x:180+i*180,size})),
      unrelated: ['circle','square','triangle','rectangle','semicircle','line'].map((shape,i)=>element('cu' + i,{x:80+i*165,shape,size:(i%5)+1,hue:['red','orange','yellow','green','blue','violet'][i]}))
    }
  },
  proportion: {
    pass: {
      ordered: [1,2,3,1,2,3].map((proportion,i)=>element('po' + i,{x:120+i*150,proportion,shape:'circle'})),
      unordered: [3,1,2,3,1,2].map((proportion,i)=>element('pu' + i,{x:120+i*150,proportion,shape:'square'})),
      mixedShapes: ['circle','square','triangle'].flatMap((shape,shapeIndex)=>[1,2,3].map((proportion,ratioIndex)=>element('pm-'+shape+'-'+proportion,{x:150+ratioIndex*260,y:150+shapeIndex*150,proportion,shape})))
    },
    fail: {
      incomplete: [1,2,1,2,1,2].map((proportion,i)=>element('pi' + i,{x:120+i*150,proportion})),
      tooFew: [1,2,3].map((proportion,i)=>element('pf' + i,{x:250+i*220,proportion}))
    }
  },
  unity: {
    pass: {
      color: ['circle','square','triangle','rectangle','semicircle','circle','square'].map((shape,i)=>element('uc'+i,{shape,x:110+i*130,y:220+(i%2)*150,hue:'blue',size:(i%3)+1})),
      rotation: ['triangle','rectangle','semicircle','triangle','rectangle','semicircle','triangle'].map((shape,i)=>element('ur'+i,{shape,x:110+i*130,y:220+(i%2)*150,hue:['red','yellow','blue','green','orange','violet','red'][i],rotation:45,size:(i%2)+2})),
      shapeFeature: [1,2,3,4,5,2,3].map((size,i)=>element('uf'+i,{shape:'square',x:110+i*130,y:220+(i%2)*150,hue:i===6?'red':'blue',size})),
      sixOfSeven: [0,1,2,3,4,5,6].map((i)=>element('us'+i,{shape:i===6?'triangle':'circle',x:110+i*130,y:220+(i%2)*150,hue:i%2?'blue':'red',size:(i%3)+1})),
      multiple: [0,1,2,3,4,5,6].map((i)=>element('um'+i,{shape:'triangle',x:110+i*130,y:220+(i%2)*150,hue:'red-orange',rotation:i===6?90:45,size:(i%2)+2}))
    },
    fail: {
      identical: [0,1,2,3,4,5,6].map((i)=>element('ui'+i,{x:110+i*130,y:220+(i%2)*150,shape:'circle',hue:'blue',size:3,rotation:0})),
      fiveOfSeven: [0,1,2,3,4,5,6].map((i)=>element('u5'+i,{shape:i<5?'circle':i===5?'square':'triangle',x:110+i*130,hue:i<5?'blue':i===5?'red':'yellow',size:(i%3)+1,rotation:i*45})),
      weak: ['red','red','blue','green','yellow'].map((hue,i)=>element('uw'+i,{shape:['circle','square','triangle','rectangle','semicircle'][i],x:120+i*190,hue,rotation:i*45})),
      unrelated: ['circle','square','triangle','rectangle','semicircle'].map((shape,i)=>element('ux'+i,{shape,x:120+i*190,hue:['red','yellow','green','blue','violet'][i],rotation:i*45}))
    }
  },
  harmony: {
    pass: {
      sameHueLightness: [1,2,3,4,5,3].map((lightness,i)=>element('hs'+i,{shape:['circle','square','triangle','rectangle','semicircle','circle'][i],x:120+i*150,hue:'blue-green',lightness})),
      neighborHue: ['red','red-orange','red','red-orange','red','red-orange'].map((hue,i)=>element('hn'+i,{x:120+i*150,hue,lightness:3})),
      wrapNeighbor: ['red','red-violet','red','red-violet','red','red-violet'].map((hue,i)=>element('hw'+i,{x:120+i*150,hue,lightness:3})),
      mixed: [1,2,3,4,5,3].map((lightness,i)=>element('hm'+i,{x:120+i*150,hue:i===5?'blue-violet':'blue',lightness}))
    },
    fail: {
      far: ['red','yellow','green','blue-violet'].map((hue,i)=>element('hf'+i,{x:170+i*210,hue})),
      isolatedPair: ['red','red-orange','green','blue','violet'].map((hue,i)=>element('hi'+i,{x:120+i*190,hue})),
      identical: [0,1,2,3].map((i)=>element('hh'+i,{x:170+i*210,hue:'green',lightness:3}))
    }
  },
  simplicity: {
    initial: simplicityInitial,
    pass: {
      reduce: organized(withoutSimplicity('simplicity-decoration-dot-1','simplicity-decoration-dot-2')),
      organize: organized(createSimplicityInitialArtwork()),
      simplifyVariety: createSimplicityInitialArtwork().map((item)=>({ ...item, hue:item.isCore?item.hue:'red', size:item.isCore?item.size:2 })),
      mixed: organized(withoutSimplicity('simplicity-decoration-dot-1','simplicity-decoration-dot-2')).map((item)=>({ ...item, hue:item.isCore?item.hue:'red' }))
    },
    fail: {
      notSimplified: createSimplicityInitialArtwork(),
      coreMissing: createSimplicityInitialArtwork().filter((item)=>item.id!=='simplicity-core-center'),
      stillDisorganized: withoutSimplicity('simplicity-decoration-dot-1','simplicity-decoration-dot-2').map((item,index)=>({ ...item, x:[90,260,470,780,930,170,620,850][index], y:[90,510,150,470,80,360,540,270][index], ...(index===0?{hue:'blue',size:1}:{}) })),
      overReduced: simplicityCore()
    }
  }
});
