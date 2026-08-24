const element = (id, values = {}) => ({
  id, shape: 'circle', x: 100, y: 300, size: 3, hue: 'blue',
  lightness: 3, rotation: 0, proportion: 1, ...values
});

const row = (prefix, values, field, positions = null) => values.map((value, index) => element(`${prefix}-${index}`, {
  x: positions?.[index] ?? 150 + index * 170,
  [field]: value
}));

export const phase6cFixtures = Object.freeze({
  repetition: {
    pass: {
      single: [element('rs-1', { x: 150 }), element('rs-2', { x: 430, y: 220 }), element('rs-3', { x: 790, y: 370 })],
      group: [0, 1, 2].flatMap((index) => [
        element(`rg-c-${index}`, { x: 170 + index * 300, y: 300 }),
        element(`rg-t-${index}`, { shape: 'triangle', x: 225 + index * 300, y: 300, hue: 'red', size: 2 })
      ])
    },
    fail: {
      two: [element('r2-1', { x: 240 }), element('r2-2', { x: 650 })],
      inconsistent: ['circle', 'square', 'triangle', 'rectangle', 'semicircle'].map((shape, index) => element(`ri-${index}`, { shape, x: 130 + index * 180, hue: index % 2 ? 'red' : 'blue', size: (index % 5) + 1 }))
    }
  },
  gradation: {
    pass: {
      size: row('gs', [1, 2, 3, 4, 5], 'size'),
      descending: row('gd', [5, 4, 3, 2, 1], 'size'),
      nonEqual: row('gn', [1, 2, 4, 5], 'size'),
      lightness: row('gl', [1, 2, 3, 4, 5], 'lightness'),
      spacing: row('gp', [3, 3, 3, 3, 3], 'size', [100, 210, 350, 520, 720]),
      multiple: row('gm', [1, 2, 3, 4, 5], 'size', [100, 210, 350, 520, 720])
    },
    fail: {
      directionBreak: row('gb', [1, 3, 2, 5], 'size'),
      tooFew: row('gf', [1, 3, 5], 'size')
    }
  },
  balance: {
    pass: {
      symmetrical: [element('bs-l', { x: 300 }), element('bs-r', { x: 700 })],
      asymmetrical: [
        element('ba-l', { x: 300, size: 4, hue: 'red' }),
        element('ba-r1', { shape: 'square', x: 620, y: 180, size: 2 }),
        element('ba-r2', { shape: 'square', x: 700, y: 300, size: 2 }),
        element('ba-r3', { shape: 'square', x: 780, y: 420, size: 2 })
      ]
    },
    fail: {
      oneSide: [element('bo-1', { x: 200 }), element('bo-2', { x: 320 })],
      leftHeavy: [element('bl-l', { x: 180, size: 5 }), element('bl-r', { x: 650, size: 1 })],
      rightHeavy: [element('br-l', { x: 350, size: 1 }), element('br-r', { x: 820, size: 5 })],
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
    pass: {
      vertical: [element('sv1',{shape:'triangle',x:300,y:220,rotation:45}),element('sv2',{shape:'triangle',x:700,y:220,rotation:315})],
      horizontal: [element('sh1',{shape:'semicircle',x:360,y:180,rotation:0}),element('sh2',{shape:'semicircle',x:360,y:420,rotation:180})],
      cross: [[300,180],[700,180],[300,420],[700,420]].map(([x,y],i)=>element('sc' + i,{x,y})),
      axis: [element('sa',{shape:'circle',x:500,y:300})],
      directional: [element('sd1',{shape:'triangle',x:300,y:220,rotation:45}),element('sd2',{shape:'triangle',x:700,y:220,rotation:315})]
    },
    fail: {
      missing: [element('sm1',{x:300,y:220})],
      position: [element('sp1',{x:300,y:220}),element('sp2',{x:720,y:220})],
      attribute: [element('st1',{x:300,y:220}),element('st2',{shape:'square',x:700,y:220})],
      crossIncomplete: [element('sx1',{x:300,y:220}),element('sx2',{x:700,y:220})]
    }
  },
  contrast: {
    pass: {
      'contrast-two-elements-strong-size': [
        element('ct-small', { x: 300, size: 1 }),
        element('ct-large', { x: 700, size: 5 })
      ],
      size: [1,1,1,5].map((size,i)=>element('cz' + i,{x:180+i*180,size})),
      color: ['blue','blue','blue','orange'].map((hue,i)=>element('cc' + i,{x:180+i*180,hue})),
      shape: ['circle','circle','circle','triangle'].map((shape,i)=>element('cs' + i,{x:180+i*180,shape})),
      multiple: [0,1,2,3].map((i)=>element('cm' + i,{x:180+i*180,size:i===3?5:1,hue:i===3?'orange':'blue'}))
    },
    fail: {
      twoWeak: [element('ct-weak-a', { x: 300, size: 3 }), element('ct-weak-b', { x: 700, size: 4 })],
      identical: [element('ct-same-a', { x: 300, size: 3 }), element('ct-same-b', { x: 700, size: 3 })],
      weak: [3,3,3,4].map((size,i)=>element('cw' + i,{x:180+i*180,size})),
      unrelated: ['circle','square','triangle','rectangle','semicircle'].map((shape,i)=>element('cu' + i,{x:100+i*190,shape,size:i+1,hue:['red','orange','yellow','green','blue'][i]}))
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
  }
});
