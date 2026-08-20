import { experimentValidatorIds } from './experiment-validators.js';

function element(id, values = {}) {
  return {
    id,
    shape: 'circle',
    x: 100,
    y: 300,
    size: 3,
    hue: 'blue',
    lightness: 3,
    rotation: 0,
    proportion: 1,
    ...values
  };
}

function row(values, property = 'size') {
  return values.map((value, index) => element(`e-${index}`, {
    x: 120 + index * 140,
    [property]: value
  }));
}

const fixtures = {
  repetition: {
    label: '反覆', validatorId: experimentValidatorIds.repetition,
    pass: {
      elements: [element('a'), element('b'), element('c'), element('d', { shape: 'square' })],
      spec: { targetElementId: 'a', minimumOccurrences: 3 }
    },
    fail: {
      elements: [element('a'), element('b'), element('c', { shape: 'square' })],
      spec: { targetElementId: 'a', minimumOccurrences: 3 }
    }
  },
  gradation: {
    label: '漸層', validatorId: experimentValidatorIds.gradation,
    pass: { elements: row([1, 2, 3, 4, 5]), spec: { gradationMode: 'size', minimumStages: 3 } },
    fail: { elements: row([1, 3, 2, 5]), spec: { gradationMode: 'size', minimumStages: 3 } }
  },
  symmetry: {
    label: '對稱', validatorId: experimentValidatorIds.symmetry,
    pass: {
      elements: [element('a', { x: 300, y: 220 }), element('b', { x: 700, y: 220 })],
      spec: { symmetryAxis: 500 }
    },
    fail: {
      elements: [element('a', { x: 300, y: 220 }), element('b', { x: 700, y: 220 }), element('c', { x: 250, y: 400 })],
      spec: { symmetryAxis: 500 }
    }
  },
  balance: {
    label: '均衡', validatorId: experimentValidatorIds.balance,
    pass: {
      elements: [
        element('a', { x: 300, size: 4, shape: 'circle' }),
        element('b', { x: 650, size: 3, shape: 'square', y: 220 }),
        element('c', { x: 750, size: 3, shape: 'square', y: 380 })
      ],
      spec: { symmetryAxis: 500, balanceTolerance: 0.25 }
    },
    fail: {
      elements: [element('a', { x: 200, size: 5 }), element('b', { x: 700, size: 1 })],
      spec: { symmetryAxis: 500, balanceTolerance: 0.2 }
    }
  },
  rhythm: {
    label: '律動', validatorId: experimentValidatorIds.rhythm,
    pass: {
      elements: [300, 200, 300, 400, 300, 200].map((y, index) => element(`r-${index}`, { x: 100 + index * 140, y })),
      spec: { minimumElements: 5, minimumTurns: 2, minimumYRange: 100, minimumDelta: 20 }
    },
    fail: {
      elements: [300, 300, 300, 300, 300].map((y, index) => element(`r-${index}`, { x: 100 + index * 140, y })),
      spec: { minimumElements: 5, minimumTurns: 2, minimumYRange: 100, minimumDelta: 20 }
    }
  },
  harmony: {
    label: '調和', validatorId: experimentValidatorIds.harmony,
    pass: {
      elements: [
        element('a', { shape: 'circle', lightness: 1 }),
        element('b', { shape: 'square', lightness: 3 }),
        element('c', { shape: 'triangle', lightness: 5 })
      ],
      spec: { minimumShapes: 3, minimumLightnessLevels: 3 }
    },
    fail: {
      elements: [element('a'), element('b', { shape: 'square' }), element('c', { shape: 'triangle' })],
      spec: { minimumShapes: 3, minimumLightnessLevels: 3 }
    }
  },
  unity: {
    label: '統一', validatorId: experimentValidatorIds.unity,
    pass: {
      elements: [element('a', { shape: 'circle', hue: 'yellow' }), element('b', { shape: 'square', hue: 'yellow' }), element('c', { shape: 'triangle', hue: 'yellow' })],
      spec: { unityMode: 'color', targetHue: 'yellow', minimumShapes: 3, requiredUnityRatio: 0.8 }
    },
    fail: {
      elements: [element('a', { shape: 'circle', hue: 'yellow' }), element('b', { shape: 'square', hue: 'red' }), element('c', { shape: 'triangle', hue: 'blue' })],
      spec: { unityMode: 'color', targetHue: 'yellow', minimumShapes: 3, requiredUnityRatio: 0.8 }
    }
  },
  contrast: {
    label: '對比', validatorId: experimentValidatorIds.contrast,
    pass: {
      elements: [element('a', { size: 1 }), element('b', { size: 5 })],
      spec: { contrastMode: 'size', minimumSizeDifference: 3 }
    },
    fail: {
      elements: [element('a', { size: 2, hue: 'red', shape: 'circle' }), element('b', { size: 3, hue: 'green', shape: 'triangle' })],
      spec: { contrastMode: 'size', minimumSizeDifference: 3 }
    }
  },
  proportion: {
    label: '比例', validatorId: experimentValidatorIds.proportion,
    pass: {
      elements: [1, 2, 3, 1, 2, 3].map((proportion, index) => element(`p-${index}`, { proportion })),
      spec: { requiredRatios: [1, 2, 3], minimumElements: 6 }
    },
    fail: {
      elements: [1, 3, 1, 3, 1, 3].map((proportion, index) => element(`p-${index}`, { proportion })),
      spec: { requiredRatios: [1, 2, 3], minimumElements: 6 }
    }
  },
  simplicity: {
    label: '單純', validatorId: experimentValidatorIds.simplicity,
    pass: {
      beforeState: [
        element('core'),
        element('decoration', { shape: 'triangle', hue: 'red', isDecoration: true }),
        element('extra', { shape: 'square', hue: 'yellow' })
      ],
      afterState: [element('core')],
      spec: { coreElementIds: ['core'], minimumActions: 2 }
    },
    fail: {
      beforeState: [element('core'), element('decoration', { isDecoration: true })],
      afterState: [element('decoration', { isDecoration: true })],
      spec: { coreElementIds: ['core'], minimumActions: 1 }
    }
  }
};

export const validatorLabFixtures = Object.freeze(fixtures);
