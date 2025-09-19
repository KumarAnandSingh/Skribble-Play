export type Environment = "development" | "staging" | "production";

export interface ServicePorts {
  web: number;
  gameServer: number;
  workerDash: number;
}

export interface SharedConfig {
  env: Environment;
  ports: ServicePorts;
  websocket: {
    path: string;
    pingIntervalMs: number;
  };
}

export const defaultConfig: SharedConfig = {
  env: "development",
  ports: {
    web: 3000,
    gameServer: 4000,
    workerDash: 4545,
  },
  websocket: {
    path: "/realtime",
    pingIntervalMs: 10_000,
  },
};
