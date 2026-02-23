export interface ConnectorDescription {
  inputConnectors: string;
  ethernetOutput: string;
  opticalFiberOutput?: string;
}

const CONNECTOR_MAP: Record<string, ConnectorDescription> = {
  'VX1': {
    inputConnectors: '5 Input Connectors',
    ethernetOutput: '2 Ethernet Output',
  },
  'VX400': {
    inputConnectors: '4 Input Connectors',
    ethernetOutput: '4 Gigabit Ethernet Output',
    opticalFiberOutput: '2 Optical Fiber Output',
  },
  'VX400 Pro': {
    inputConnectors: '4 Input Connectors',
    ethernetOutput: '4 Ethernet Output',
    opticalFiberOutput: '2 Optical Fiber Output',
  },
  'VX600': {
    inputConnectors: '4 Input Connectors',
    ethernetOutput: '6 Gigabit Ethernet Output',
    opticalFiberOutput: '2 Optical Fiber Output',
  },
  'VX600 Pro': {
    inputConnectors: '4 Input Connectors',
    ethernetOutput: '6 Ethernet Output',
    opticalFiberOutput: '2 Optical Fiber Output',
  },
  'VX1000': {
    inputConnectors: '5 Input Connectors',
    ethernetOutput: '10 Gigabit Ethernet Output',
    opticalFiberOutput: '2 Optical Fiber Output',
  },
  'VX1000 Pro': {
    inputConnectors: '4 Input Connectors',
    ethernetOutput: '10 Gigabit Ethernet Output',
    opticalFiberOutput: '2 Optical Fiber Output',
  },
  'VX16S': {
    inputConnectors: '7 Input Connectors',
    ethernetOutput: '16 Gigabit Ethernet Output',
  },
  'VX2000 Pro': {
    inputConnectors: '8 Input Connectors',
    ethernetOutput: '20 Gigabit Ethernet Output',
    opticalFiberOutput: '4 Optical Fiber Output',
  },
  'TB40': {
    inputConnectors: '1 Input Connector',
    ethernetOutput: '2 Gigabit Ethernet Output',
  },
  'TB60': {
    inputConnectors: '1 Input Connector',
    ethernetOutput: '4 Gigabit Ethernet Output',
  },
  'TU15 Pro': {
    inputConnectors: '2 Input Connectors',
    ethernetOutput: '4 Ethernet Output',
  },
  'TU20 Pro': {
    inputConnectors: '2 Input Connectors',
    ethernetOutput: '6 Ethernet Output',
  },
  'TU4K Pro': {
    inputConnectors: '4 Input Connectors',
    ethernetOutput: '20 Ethernet Output',
    opticalFiberOutput: '10 Optical Fiber Output',
  },
};

const FALLBACK: ConnectorDescription = {
  inputConnectors: 'As per specification',
  ethernetOutput: 'As per specification',
};

const normalize = (name: string): string => name.toLowerCase().replace(/\s+/g, '');

const normalizedMap: Record<string, ConnectorDescription> = Object.fromEntries(
  Object.entries(CONNECTOR_MAP).map(([key, value]) => [normalize(key), value])
);

export function getConnectorDescriptions(controllerName: string | null | undefined): ConnectorDescription {
  if (!controllerName) return FALLBACK;
  return normalizedMap[normalize(controllerName)] ?? FALLBACK;
}
