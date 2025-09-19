export type Environment = "development" | "staging" | "production";

export interface ServicePorts {
  web: number;
  gameServer: number;
  worker: number;
}

export interface RealtimeConfig {
  path: string;
  pingIntervalMs: number;
}

export interface FeatureFlags {
  enableVoice: boolean;
  enableVideo: boolean;
  enableMemeShare: boolean;
}

export interface SharedConfig {
  env: Environment;
  ports: ServicePorts;
  realtime: RealtimeConfig;
  flags: FeatureFlags;
  media: {
    sfuHost: string;
    turnUrls: string[];
  };
}

export const defaultConfig: SharedConfig = {
  env: "development",
  ports: {
    web: 3000,
    gameServer: 4000,
    worker: 4545
  },
  realtime: {
    path: "/realtime",
    pingIntervalMs: 10_000
  },
  flags: {
    enableVoice: true,
    enableVideo: false,
    enableMemeShare: false
  },
  media: {
    sfuHost: "http://localhost:7880",
    turnUrls: []
  }
};

export function resolveConfig(overrides: Partial<SharedConfig> = {}): SharedConfig {
  return {
    ...defaultConfig,
    ...overrides,
    ports: {
      ...defaultConfig.ports,
      ...overrides.ports
    },
    realtime: {
      ...defaultConfig.realtime,
      ...overrides.realtime
    },
    flags: {
      ...defaultConfig.flags,
      ...overrides.flags
    },
    media: {
      ...defaultConfig.media,
      ...overrides.media
    }
  };
}
